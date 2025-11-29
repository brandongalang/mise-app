import { v4 as uuidv4 } from "uuid";
import { eq, and, or, like, lte, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import { db, containers, contents, masterIngredients, ingredientAliases, transactions, globalUnitConversions } from "@/db";
import type {
  SearchInventoryFilters,
  InventoryItem,
  AddInventoryItem,
  AddLeftoverInput,
  UpdateInventoryInput,
  DeductInventoryInput,
  DeductResult,
  ContainerStatus,
} from "@/lib/types";

const LOW_THRESHOLD = 0.20;

// Helper: slugify name to create ID
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Helper: calculate days until expiry
function daysUntilExpiry(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: get or create master ingredient
async function getOrCreateMaster(item: AddInventoryItem): Promise<string> {
  if (item.masterId) {
    const existing = await db.query.masterIngredients.findFirst({
      where: eq(masterIngredients.id, item.masterId),
    });
    if (existing) return existing.id;
  }

  const id = slugify(item.name);

  // Check if exists
  const existing = await db.query.masterIngredients.findFirst({
    where: eq(masterIngredients.id, id),
  });
  if (existing) return existing.id;

  // Create new
  await db.insert(masterIngredients).values({
    id,
    canonicalName: item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase(),
    category: item.category || "unknown",
    defaultUnit: item.defaultUnit || item.contents.unit,
    defaultShelfLifeDays: item.defaultShelfLifeDays,
  });

  return id;
}

// Helper: convert units
async function convertUnits(fromQty: number, fromUnit: string, toUnit: string): Promise<number | null> {
  if (fromUnit === toUnit) return fromQty;

  const conversion = await db.query.globalUnitConversions.findFirst({
    where: and(
      eq(globalUnitConversions.fromUnit, fromUnit),
      eq(globalUnitConversions.toUnit, toUnit)
    ),
  });

  if (conversion) {
    return fromQty * conversion.factor;
  }

  // Try reverse
  const reverseConversion = await db.query.globalUnitConversions.findFirst({
    where: and(
      eq(globalUnitConversions.fromUnit, toUnit),
      eq(globalUnitConversions.toUnit, fromUnit)
    ),
  });

  if (reverseConversion) {
    return fromQty / reverseConversion.factor;
  }

  return null;
}

// SEARCH INVENTORY
export async function searchInventory(filters: SearchInventoryFilters = {}): Promise<InventoryItem[]> {
  const conditions = [];

  // Exclude deleted by default
  if (!filters.status?.includes("DELETED")) {
    conditions.push(sql`${containers.status} != 'DELETED'`);
  }

  if (filters.status && filters.status.length > 0) {
    conditions.push(inArray(containers.status, filters.status));
  }

  if (filters.masterId) {
    conditions.push(eq(containers.masterId, filters.masterId));
  }

  if (filters.includeLeftovers === false) {
    conditions.push(isNull(containers.dishName));
  }

  if (filters.expiringWithinDays !== undefined) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
    conditions.push(lte(containers.expiresAt, futureDate));
    conditions.push(isNotNull(containers.expiresAt));
  }

  const results = await db
    .select({
      container: containers,
      content: contents,
      master: masterIngredients,
    })
    .from(containers)
    .leftJoin(contents, eq(containers.id, contents.containerId))
    .leftJoin(masterIngredients, eq(containers.masterId, masterIngredients.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(filters.limit || 100);

  let items: InventoryItem[] = results
    .filter((r) => r.content) // Must have contents
    .map((r) => ({
      id: r.container.id,
      containerId: r.container.id,
      masterId: r.master?.id || r.container.masterId,
      name: r.container.dishName || r.master?.canonicalName || "Unknown",
      category: r.master?.category || null,
      quantity: r.content!.remainingQty,
      remainingQty: r.content!.remainingQty,
      unit: r.content!.unit,
      status: r.container.status as ContainerStatus,
      purchaseUnit: r.container.purchaseUnit,
      expiresAt: r.container.expiresAt,
      daysUntilExpiry: daysUntilExpiry(r.container.expiresAt) ?? 0, // Fallback to 0 if null
      isLeftover: !!r.container.dishName,
      dishName: r.container.dishName,
      confidence: r.container.confidence as any,
      source: r.container.source as any,
      createdAt: r.container.createdAt!,
    }));

  // Filter by query (name search)
  if (filters.query) {
    const query = filters.query.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.dishName?.toLowerCase().includes(query)
    );
  }

  // Filter by category
  if (filters.category) {
    items = items.filter((item) => item.category === filters.category);
  }

  return items;
}

// ADD INVENTORY
export async function addInventory(items: AddInventoryItem[]): Promise<{ containerIds: string[]; created: number }> {
  const containerIds: string[] = [];

  for (const item of items) {
    const masterId = await getOrCreateMaster(item);
    const containerId = uuidv4();
    const contentId = uuidv4();
    const transactionId = uuidv4();

    // Create container
    await db.insert(containers).values({
      id: containerId,
      masterId,
      status: item.container.status || "SEALED",
      purchaseUnit: item.container.unit,
      source: item.source,
      confidence: item.confidence,
      visionJobId: item.visionJobId,
      expiresAt: item.expiresAt,
    });

    // Create contents
    await db.insert(contents).values({
      id: contentId,
      containerId,
      remainingQty: item.contents.quantity,
      unit: item.contents.unit,
    });

    // Log transaction
    await db.insert(transactions).values({
      id: transactionId,
      containerId,
      operation: "ADD",
      delta: item.contents.quantity,
      unit: item.contents.unit,
      reason: `${item.source}_ingest`,
    });

    containerIds.push(containerId);
  }

  return { containerIds, created: containerIds.length };
}

// ADD LEFTOVER
export async function addLeftover(input: AddLeftoverInput): Promise<{ containerId: string }> {
  const containerId = uuidv4();
  const contentId = uuidv4();
  const transactionId = uuidv4();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 4));

  await db.insert(containers).values({
    id: containerId,
    masterId: null,
    dishName: input.dishName,
    cookedFromRecipeId: input.recipeId,
    status: "OPEN",
    source: "cooked",
    expiresAt,
  });

  await db.insert(contents).values({
    id: contentId,
    containerId,
    remainingQty: input.quantity,
    unit: input.unit,
  });

  await db.insert(transactions).values({
    id: transactionId,
    containerId,
    operation: "ADD",
    delta: input.quantity,
    unit: input.unit,
    reason: `leftover:${input.recipeId || "manual"}`,
  });

  return { containerId };
}

// UPDATE INVENTORY
export async function updateInventory(input: UpdateInventoryInput): Promise<{ success: boolean }> {
  const { containerId, updates, reason } = input;

  // Get current state
  const current = await db.query.containers.findFirst({
    where: eq(containers.id, containerId),
    with: { contents: true },
  });

  if (!current) {
    throw new Error(`Container ${containerId} not found`);
  }

  // Update container if needed
  if (updates.status || updates.expiresAt || updates.masterId) {
    await db.update(containers)
      .set({
        status: updates.status,
        expiresAt: updates.expiresAt,
        masterId: updates.masterId,
        updatedAt: new Date(),
      })
      .where(eq(containers.id, containerId));
  }

  // Update contents if needed
  if (updates.remainingQty !== undefined || updates.unit) {
    const oldQty = current.contents?.remainingQty || 0;
    const newQty = updates.remainingQty ?? oldQty;

    await db.update(contents)
      .set({
        remainingQty: newQty,
        unit: updates.unit,
        updatedAt: new Date(),
      })
      .where(eq(contents.containerId, containerId));

    // Log adjustment transaction
    const delta = newQty - oldQty;
    if (delta !== 0) {
      await db.insert(transactions).values({
        id: uuidv4(),
        containerId,
        operation: "ADJUST",
        delta,
        unit: updates.unit || current.contents?.unit,
        reason: reason || "manual_adjustment",
      });
    }
  }

  // If name changed, might need to update/create master
  if (updates.name && updates.masterId) {
    // Register alias from old name to new master
    const oldMaster = await db.query.masterIngredients.findFirst({
      where: eq(masterIngredients.id, current.masterId!),
    });
    if (oldMaster) {
      await db.insert(ingredientAliases)
        .values({
          alias: oldMaster.canonicalName.toLowerCase(),
          masterId: updates.masterId,
          source: "user_correction",
        })
        .onConflictDoNothing();
    }
  }

  return { success: true };
}

// DEDUCT INVENTORY (FIFO)
export async function deductInventory(input: DeductInventoryInput): Promise<DeductResult> {
  const { masterId, quantity, unit, reason } = input;

  // Find open containers for this ingredient (FIFO by created date)
  const availableContainers = await db
    .select({
      container: containers,
      content: contents,
    })
    .from(containers)
    .innerJoin(contents, eq(containers.id, contents.containerId))
    .where(
      and(
        eq(containers.masterId, masterId),
        inArray(containers.status, ["SEALED", "OPEN", "LOW"])
      )
    )
    .orderBy(containers.createdAt);

  if (availableContainers.length === 0) {
    throw new Error(`No available inventory for ${masterId}`);
  }

  // Try to find container with matching or convertible unit
  let targetContainer = availableContainers[0];
  let deductQty = quantity;

  // Try unit conversion if needed
  if (targetContainer.content.unit !== unit) {
    const converted = await convertUnits(quantity, unit, targetContainer.content.unit);
    if (converted !== null) {
      deductQty = converted;
    } else {
      console.warn(`Cannot convert ${unit} to ${targetContainer.content.unit}, using as-is`);
    }
  }

  const currentQty = targetContainer.content.remainingQty;
  const newQty = Math.max(0, currentQty - deductQty);
  const actualDeducted = currentQty - newQty;

  // If container was SEALED, open it
  if (targetContainer.container.status === "SEALED") {
    await db.update(containers)
      .set({ status: "OPEN", updatedAt: new Date() })
      .where(eq(containers.id, targetContainer.container.id));

    await db.insert(transactions).values({
      id: uuidv4(),
      containerId: targetContainer.container.id,
      operation: "STATUS_CHANGE",
      reason: "opened_for_use",
    });
  }

  // Update contents
  await db.update(contents)
    .set({ remainingQty: newQty, updatedAt: new Date() })
    .where(eq(contents.containerId, targetContainer.container.id));

  // Determine new status based on remaining quantity
  let newStatus: ContainerStatus = "OPEN";
  let warning: string | undefined;

  if (newQty === 0) {
    newStatus = "EMPTY";
  } else {
    // Calculate percentage remaining (need initial qty - estimate from first transaction)
    const initialAdd = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.containerId, targetContainer.container.id),
        eq(transactions.operation, "ADD")
      ),
    });
    const initialQty = initialAdd?.delta || currentQty;
    const remainingPct = newQty / initialQty;

    if (remainingPct <= LOW_THRESHOLD) {
      newStatus = "LOW";
      warning = `LOW_INVENTORY: ${Math.round(remainingPct * 100)}% remaining`;
    }
  }

  // Update status if changed
  if (newStatus !== targetContainer.container.status) {
    await db.update(containers)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(containers.id, targetContainer.container.id));
  }

  // Log deduction transaction
  await db.insert(transactions).values({
    id: uuidv4(),
    containerId: targetContainer.container.id,
    operation: "DEDUCT",
    delta: -actualDeducted,
    unit: targetContainer.content.unit,
    reason,
  });

  return {
    success: true,
    deducted: actualDeducted,
    unit: targetContainer.content.unit,
    containerId: targetContainer.container.id,
    remainingAfter: newQty,
    containerStatus: newStatus,
    warning,
  };
}

// DELETE INVENTORY (soft delete)
export async function deleteInventory(containerId: string, reason: string): Promise<{ success: boolean }> {
  await db.update(containers)
    .set({ status: "DELETED", updatedAt: new Date() })
    .where(eq(containers.id, containerId));

  await db.insert(transactions).values({
    id: uuidv4(),
    containerId,
    operation: "DELETE",
    reason,
  });

  return { success: true };
}

// MERGE INVENTORY
export async function mergeInventory(sourceId: string, targetId: string): Promise<{ success: boolean; newQty: number }> {
  const source = await db.query.containers.findFirst({
    where: eq(containers.id, sourceId),
    with: { contents: true },
  });

  const target = await db.query.containers.findFirst({
    where: eq(containers.id, targetId),
    with: { contents: true },
  });

  if (!source || !target) {
    throw new Error("Source or target container not found");
  }

  if (source.masterId !== target.masterId) {
    throw new Error("Cannot merge containers with different ingredients");
  }

  // Convert source qty to target unit if needed
  let addQty = source.contents!.remainingQty;
  if (source.contents!.unit !== target.contents!.unit) {
    const converted = await convertUnits(addQty, source.contents!.unit, target.contents!.unit);
    if (converted !== null) {
      addQty = converted;
    }
  }

  const newQty = target.contents!.remainingQty + addQty;

  // Update target
  await db.update(contents)
    .set({ remainingQty: newQty, updatedAt: new Date() })
    .where(eq(contents.containerId, targetId));

  // Soft delete source
  await db.update(containers)
    .set({ status: "DELETED", updatedAt: new Date() })
    .where(eq(containers.id, sourceId));

  // Log transactions
  await db.insert(transactions).values([
    {
      id: uuidv4(),
      containerId: targetId,
      operation: "MERGE",
      delta: addQty,
      unit: target.contents!.unit,
      reason: `merged_from:${sourceId}`,
    },
    {
      id: uuidv4(),
      containerId: sourceId,
      operation: "MERGE",
      delta: -source.contents!.remainingQty,
      unit: source.contents!.unit,
      reason: `merged_into:${targetId}`,
    },
  ]);

  return { success: true, newQty };
}

// GET EXPIRING ITEMS
export async function getExpiringItems(withinDays: number = 3): Promise<InventoryItem[]> {
  return searchInventory({
    expiringWithinDays: withinDays,
    status: ["SEALED", "OPEN", "LOW"],
  });
}

// CHECK DUPLICATES
export async function checkDuplicates(
  masterId: string,
  visionJobId?: string,
  contentsQty?: number
): Promise<{
  duplicateType: "DEFINITE" | "LIKELY" | "POSSIBLE" | "NONE";
  existingContainers: InventoryItem[];
  recommendation: "SKIP" | "MERGE" | "ADD_NEW" | "ASK_USER";
}> {
  const fourHoursAgo = new Date();
  fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

  const existing = await searchInventory({
    masterId,
    status: ["SEALED", "OPEN", "LOW"],
  });

  if (existing.length === 0) {
    return { duplicateType: "NONE", existingContainers: [], recommendation: "ADD_NEW" };
  }

  // Check for same vision job
  if (visionJobId) {
    const sameJob = await db.query.containers.findFirst({
      where: and(
        eq(containers.masterId, masterId),
        eq(containers.visionJobId, visionJobId)
      ),
    });
    if (sameJob) {
      return { duplicateType: "DEFINITE", existingContainers: existing, recommendation: "SKIP" };
    }
  }

  // Check for recently added (within 4 hours)
  const recent = existing.filter((e) => e.createdAt > fourHoursAgo);
  if (recent.length > 0) {
    return { duplicateType: "LIKELY", existingContainers: recent, recommendation: "ASK_USER" };
  }

  // Check for similar quantity (±20%)
  if (contentsQty) {
    const similar = existing.filter((e) => {
      const diff = Math.abs(e.remainingQty - contentsQty) / contentsQty;
      return diff <= 0.2;
    });
    if (similar.length > 0) {
      return { duplicateType: "POSSIBLE", existingContainers: similar, recommendation: "ASK_USER" };
    }
  }

  return { duplicateType: "NONE", existingContainers: existing, recommendation: "ADD_NEW" };
}

// REGISTER ALIAS
export async function registerAlias(alias: string, masterId: string, source: "agent" | "user_correction" = "agent"): Promise<{ success: boolean }> {
  await db.insert(ingredientAliases)
    .values({
      alias: alias.toLowerCase(),
      masterId,
      source,
    })
    .onConflictDoUpdate({
      target: ingredientAliases.alias,
      set: { masterId, source },
    });

  return { success: true };
}

// RESOLVE INGREDIENT (fuzzy match)
export async function resolveIngredient(
  rawName: string,
  categoryHint?: string
): Promise<{
  matchType: "exact" | "alias" | "fuzzy" | "created" | "ambiguous" | "unknown";
  masterId?: string;
  canonicalName?: string;
  confidence: number;
  alternatives: { masterId: string; canonicalName: string; score: number }[];
}> {
  const normalized = rawName.toLowerCase().trim();

  // Check exact match on master
  const exactMaster = await db.query.masterIngredients.findFirst({
    where: eq(masterIngredients.id, slugify(normalized)),
  });
  if (exactMaster) {
    return {
      matchType: "exact",
      masterId: exactMaster.id,
      canonicalName: exactMaster.canonicalName,
      confidence: 1.0,
      alternatives: [],
    };
  }

  // Check alias
  const alias = await db.query.ingredientAliases.findFirst({
    where: eq(ingredientAliases.alias, normalized),
    with: { master: true },
  });
  if (alias) {
    return {
      matchType: "alias",
      masterId: alias.masterId,
      canonicalName: alias.master.canonicalName,
      confidence: 0.95,
      alternatives: [],
    };
  }

  // Fuzzy search - get all masters and score
  const allMasters = await db.query.masterIngredients.findMany();
  const scored = allMasters
    .map((m) => ({
      masterId: m.id,
      canonicalName: m.canonicalName,
      score: similarityScore(normalized, m.canonicalName.toLowerCase()),
    }))
    .filter((m) => m.score > 0.5)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0].score > 0.85) {
    return {
      matchType: "fuzzy",
      masterId: scored[0].masterId,
      canonicalName: scored[0].canonicalName,
      confidence: scored[0].score,
      alternatives: scored.slice(1, 4),
    };
  }

  if (scored.length > 1) {
    return {
      matchType: "ambiguous",
      confidence: scored[0]?.score || 0,
      alternatives: scored.slice(0, 4),
    };
  }

  return {
    matchType: "unknown",
    confidence: 0,
    alternatives: [],
  };
}

// Simple similarity score (Jaccard on character bigrams)
function similarityScore(a: string, b: string): number {
  const bigramsA = new Set<string>();
  const bigramsB = new Set<string>();

  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

  const intersection = [...bigramsA].filter((x) => bigramsB.has(x)).length;
  const union = new Set([...bigramsA, ...bigramsB]).size;

  return union === 0 ? 0 : intersection / union;
}
