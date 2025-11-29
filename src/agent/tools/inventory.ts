import { v4 as uuidv4 } from "uuid";
import { api } from "@/db/supabase";
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

// ============================================
// CONSTANTS
// ============================================

const LOW_THRESHOLD = 0.20;
const DEFAULT_LEFTOVER_DAYS = 4;
const DUPLICATE_CHECK_HOURS = 4;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Jaccard similarity on character bigrams
function similarityScore(a: string, b: string): number {
  const bigramsA = new Set<string>();
  const bigramsB = new Set<string>();

  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

  const intersection = [...bigramsA].filter((x) => bigramsB.has(x)).length;
  const union = new Set([...bigramsA, ...bigramsB]).size;

  return union === 0 ? 0 : intersection / union;
}

// Transform raw container data to InventoryItem
function toInventoryItem(raw: any): InventoryItem {
  const content = raw.contents?.[0];
  const master = raw.master_ingredients;

  return {
    id: raw.id,
    containerId: raw.id,
    masterId: master?.id || raw.master_id,
    name: raw.dish_name || master?.canonical_name || "Unknown",
    category: master?.category || null,
    quantity: content?.remaining_qty || 0,
    remainingQty: content?.remaining_qty || 0,
    unit: content?.unit || "",
    status: raw.status as ContainerStatus,
    purchaseUnit: raw.purchase_unit,
    expiresAt: raw.expires_at ? new Date(raw.expires_at) : null,
    daysUntilExpiry: daysUntilExpiry(raw.expires_at) ?? 0,
    isLeftover: !!raw.dish_name,
    dishName: raw.dish_name,
    confidence: raw.confidence,
    source: raw.source,
    createdAt: new Date(raw.created_at),
  };
}

// ============================================
// MASTER INGREDIENT MANAGEMENT
// ============================================

async function getOrCreateMaster(item: AddInventoryItem): Promise<string> {
  // Check if masterId provided and exists
  if (item.masterId) {
    const existing = await api.masterIngredients.findById(item.masterId);
    if (existing) return existing.id;
  }

  const id = slugify(item.name);

  // Check if exists
  const existing = await api.masterIngredients.findById(id);
  if (existing) return existing.id;

  // Create new master ingredient
  await api.masterIngredients.create({
    id,
    canonical_name: capitalize(item.name),
    category: item.category || "unknown",
    default_unit: item.defaultUnit || item.contents.unit,
    default_shelf_life_days: item.defaultShelfLifeDays,
  });

  return id;
}

// ============================================
// SEARCH INVENTORY
// ============================================

export async function searchInventory(filters: SearchInventoryFilters = {}): Promise<InventoryItem[]> {
  const expiringBefore = filters.expiringWithinDays !== undefined
    ? new Date(Date.now() + filters.expiringWithinDays * 24 * 60 * 60 * 1000)
    : undefined;

  const results = await api.containers.findActive({
    masterId: filters.masterId,
    statuses: filters.status,
    expiringBefore,
    isDishOnly: filters.includeLeftovers === false ? false : undefined,
    limit: filters.limit || 100,
  });

  // Transform and filter
  let items = results
    .filter((r: any) => r.contents && r.contents.length > 0)
    .map(toInventoryItem);

  // Name/query search
  if (filters.query) {
    const queryLower = filters.query.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(queryLower) ||
        item.dishName?.toLowerCase().includes(queryLower)
    );
  }

  // Category filter
  if (filters.category) {
    items = items.filter((item) => item.category === filters.category);
  }

  return items;
}

// ============================================
// ADD INVENTORY
// ============================================

export async function addInventory(items: AddInventoryItem[]): Promise<{ containerIds: string[]; created: number }> {
  const containerIds: string[] = [];

  for (const item of items) {
    const masterId = await getOrCreateMaster(item);
    const containerId = uuidv4();
    const contentId = uuidv4();
    const transactionId = uuidv4();

    // Create container
    await api.containers.create({
      id: containerId,
      master_id: masterId,
      status: item.container.status || "SEALED",
      purchase_unit: item.container.unit,
      source: item.source,
      confidence: item.confidence,
      vision_job_id: item.visionJobId,
      expires_at: item.expiresAt?.toISOString(),
    });

    // Create contents
    await api.contents.create({
      id: contentId,
      container_id: containerId,
      remaining_qty: item.contents.quantity,
      unit: item.contents.unit,
    });

    // Log transaction
    await api.transactions.create({
      id: transactionId,
      container_id: containerId,
      operation: "ADD",
      delta: item.contents.quantity,
      unit: item.contents.unit,
      reason: `${item.source}_ingest`,
    });

    containerIds.push(containerId);
  }

  return { containerIds, created: containerIds.length };
}

// ============================================
// ADD LEFTOVER
// ============================================

export async function addLeftover(input: AddLeftoverInput): Promise<{ containerId: string }> {
  const containerId = uuidv4();
  const contentId = uuidv4();
  const transactionId = uuidv4();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || DEFAULT_LEFTOVER_DAYS));

  // Create container for leftover
  await api.containers.create({
    id: containerId,
    master_id: undefined,
    status: "OPEN",
    source: "cooked",
    expires_at: expiresAt.toISOString(),
    dish_name: input.dishName,
    cooked_from_recipe_id: input.recipeId,
  });

  // Create contents
  await api.contents.create({
    id: contentId,
    container_id: containerId,
    remaining_qty: input.quantity,
    unit: input.unit,
  });

  // Log transaction
  await api.transactions.create({
    id: transactionId,
    container_id: containerId,
    operation: "ADD",
    delta: input.quantity,
    unit: input.unit,
    reason: `leftover:${input.recipeId || "manual"}`,
  });

  return { containerId };
}

// ============================================
// UPDATE INVENTORY
// ============================================

export async function updateInventory(input: UpdateInventoryInput): Promise<{ success: boolean }> {
  const { containerId, updates, reason } = input;

  // Get current state
  const current = await api.containers.findById(containerId);
  if (!current) {
    throw new Error(`Container ${containerId} not found`);
  }

  // Update container fields
  if (updates.status || updates.expiresAt || updates.masterId) {
    await api.containers.update(containerId, {
      ...(updates.status && { status: updates.status }),
      ...(updates.expiresAt && { expires_at: updates.expiresAt.toISOString() }),
      ...(updates.masterId && { master_id: updates.masterId }),
    });
  }

  // Update contents if needed
  if (updates.remainingQty !== undefined || updates.unit) {
    const content = current.contents?.[0];
    const oldQty = content?.remaining_qty || 0;
    const newQty = updates.remainingQty ?? oldQty;

    await api.contents.update(containerId, {
      remaining_qty: newQty,
      ...(updates.unit && { unit: updates.unit }),
    });

    // Log adjustment transaction if quantity changed
    const delta = newQty - oldQty;
    if (delta !== 0) {
      await api.transactions.create({
        id: uuidv4(),
        container_id: containerId,
        operation: "ADJUST",
        delta,
        unit: updates.unit || content?.unit,
        reason: reason || "manual_adjustment",
      });
    }
  }

  // Handle name correction with alias registration
  if (updates.name && updates.masterId) {
    const oldMaster = await api.masterIngredients.findById(current.master_id);
    if (oldMaster) {
      await api.aliases.upsert(
        oldMaster.canonical_name.toLowerCase(),
        updates.masterId,
        "user_correction"
      );
    }
  }

  return { success: true };
}

// ============================================
// DEDUCT INVENTORY (FIFO)
// ============================================

export async function deductInventory(input: DeductInventoryInput): Promise<DeductResult> {
  const { masterId, quantity, unit, reason } = input;

  // Find available containers (FIFO by created date)
  const availableContainers = await api.containers.findByMasterId(
    masterId,
    ["SEALED", "OPEN", "LOW"]
  );

  if (availableContainers.length === 0) {
    throw new Error(`No available inventory for ${masterId}`);
  }

  const targetContainer = availableContainers[0];
  const targetContent = targetContainer.contents?.[0];

  if (!targetContent) {
    throw new Error(`No contents found for container`);
  }

  // Convert units if needed
  let deductQty = quantity;
  if (targetContent.unit !== unit) {
    const converted = await api.conversions.convert(quantity, unit, targetContent.unit);
    if (converted !== null) {
      deductQty = converted;
    } else {
      console.warn(`Cannot convert ${unit} to ${targetContent.unit}, using as-is`);
    }
  }

  const currentQty = targetContent.remaining_qty;
  const newQty = Math.max(0, currentQty - deductQty);
  const actualDeducted = currentQty - newQty;

  // Open sealed container
  if (targetContainer.status === "SEALED") {
    await api.containers.update(targetContainer.id, { status: "OPEN" });
    await api.transactions.create({
      id: uuidv4(),
      container_id: targetContainer.id,
      operation: "STATUS_CHANGE",
      reason: "opened_for_use",
    });
  }

  // Update contents
  await api.contents.update(targetContainer.id, { remaining_qty: newQty });

  // Determine new status based on remaining quantity
  let newStatus: ContainerStatus = "OPEN";
  let warning: string | undefined;

  if (newQty === 0) {
    newStatus = "EMPTY";
  } else {
    const initialAdd = await api.transactions.findFirstAdd(targetContainer.id);
    const initialQty = initialAdd?.delta || currentQty;
    const remainingPct = newQty / initialQty;

    if (remainingPct <= LOW_THRESHOLD) {
      newStatus = "LOW";
      warning = `LOW_INVENTORY: ${Math.round(remainingPct * 100)}% remaining`;
    }
  }

  // Update status if changed
  if (newStatus !== targetContainer.status) {
    await api.containers.update(targetContainer.id, { status: newStatus });
  }

  // Log deduction transaction
  await api.transactions.create({
    id: uuidv4(),
    container_id: targetContainer.id,
    operation: "DEDUCT",
    delta: -actualDeducted,
    unit: targetContent.unit,
    reason,
  });

  return {
    success: true,
    deducted: actualDeducted,
    unit: targetContent.unit,
    containerId: targetContainer.id,
    remainingAfter: newQty,
    containerStatus: newStatus,
    warning,
  };
}

// ============================================
// DELETE INVENTORY (Soft Delete)
// ============================================

export async function deleteInventory(containerId: string, reason: string): Promise<{ success: boolean }> {
  await api.containers.softDelete(containerId);

  await api.transactions.create({
    id: uuidv4(),
    container_id: containerId,
    operation: "DELETE",
    reason,
  });

  return { success: true };
}

// ============================================
// MERGE INVENTORY
// ============================================

export async function mergeInventory(sourceId: string, targetId: string): Promise<{ success: boolean; newQty: number }> {
  const source = await api.containers.findById(sourceId);
  const target = await api.containers.findById(targetId);

  if (!source || !target) {
    throw new Error("Source or target container not found");
  }

  if (source.master_id !== target.master_id) {
    throw new Error("Cannot merge containers with different ingredients");
  }

  const sourceContent = source.contents?.[0];
  const targetContent = target.contents?.[0];

  if (!sourceContent || !targetContent) {
    throw new Error("Missing contents");
  }

  // Convert source qty to target unit if needed
  let addQty = sourceContent.remaining_qty;
  if (sourceContent.unit !== targetContent.unit) {
    const converted = await api.conversions.convert(addQty, sourceContent.unit, targetContent.unit);
    if (converted !== null) {
      addQty = converted;
    }
  }

  const newQty = targetContent.remaining_qty + addQty;

  // Update target
  await api.contents.update(targetId, { remaining_qty: newQty });

  // Soft delete source
  await api.containers.softDelete(sourceId);

  // Log transactions
  await api.transactions.createMany([
    {
      id: uuidv4(),
      container_id: targetId,
      operation: "MERGE",
      delta: addQty,
      unit: targetContent.unit,
      reason: `merged_from:${sourceId}`,
    },
    {
      id: uuidv4(),
      container_id: sourceId,
      operation: "MERGE",
      delta: -sourceContent.remaining_qty,
      unit: sourceContent.unit,
      reason: `merged_into:${targetId}`,
    },
  ]);

  return { success: true, newQty };
}

// ============================================
// GET EXPIRING ITEMS
// ============================================

export async function getExpiringItems(withinDays: number = 3): Promise<InventoryItem[]> {
  return searchInventory({
    expiringWithinDays: withinDays,
    status: ["SEALED", "OPEN", "LOW"],
  });
}

// ============================================
// CHECK DUPLICATES
// ============================================

export async function checkDuplicates(
  masterId: string,
  visionJobId?: string,
  contentsQty?: number
): Promise<{
  duplicateType: "DEFINITE" | "LIKELY" | "POSSIBLE" | "NONE";
  existingContainers: InventoryItem[];
  recommendation: "SKIP" | "MERGE" | "ADD_NEW" | "ASK_USER";
}> {
  const checkHoursAgo = new Date();
  checkHoursAgo.setHours(checkHoursAgo.getHours() - DUPLICATE_CHECK_HOURS);

  const existing = await searchInventory({
    masterId,
    status: ["SEALED", "OPEN", "LOW"],
  });

  if (existing.length === 0) {
    return { duplicateType: "NONE", existingContainers: [], recommendation: "ADD_NEW" };
  }

  // Check for same vision job
  if (visionJobId) {
    const containers = await api.containers.findByMasterId(masterId);
    const sameJob = containers.find((c: any) => c.vision_job_id === visionJobId);
    if (sameJob) {
      return { duplicateType: "DEFINITE", existingContainers: existing, recommendation: "SKIP" };
    }
  }

  // Check for recently added
  const recent = existing.filter((e) => e.createdAt > checkHoursAgo);
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

// ============================================
// REGISTER ALIAS
// ============================================

export async function registerAlias(
  alias: string,
  masterId: string,
  source: "agent" | "user_correction" = "agent"
): Promise<{ success: boolean }> {
  await api.aliases.upsert(alias.toLowerCase(), masterId, source);
  return { success: true };
}

// ============================================
// RESOLVE INGREDIENT (Fuzzy Match)
// ============================================

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
  const exactMaster = await api.masterIngredients.findById(slugify(normalized));
  if (exactMaster) {
    return {
      matchType: "exact",
      masterId: exactMaster.id,
      canonicalName: exactMaster.canonical_name,
      confidence: 1.0,
      alternatives: [],
    };
  }

  // Check alias
  const alias = await api.aliases.findByAlias(normalized);
  if (alias?.master_ingredients) {
    return {
      matchType: "alias",
      masterId: alias.master_ingredients.id,
      canonicalName: alias.master_ingredients.canonical_name,
      confidence: 0.95,
      alternatives: [],
    };
  }

  // Fuzzy search - get all masters and score
  const allMasters = await api.masterIngredients.findAll();
  if (!allMasters.length) {
    return { matchType: "unknown", confidence: 0, alternatives: [] };
  }

  const scored = allMasters
    .map((m: any) => ({
      masterId: m.id,
      canonicalName: m.canonical_name,
      score: similarityScore(normalized, m.canonical_name.toLowerCase()),
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
