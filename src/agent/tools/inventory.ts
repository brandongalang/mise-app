import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/db/supabase";
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
function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: get or create master ingredient
async function getOrCreateMaster(item: AddInventoryItem): Promise<string> {
  if (item.masterId) {
    const { data: existing } = await supabase
      .from("master_ingredients")
      .select("id")
      .eq("id", item.masterId)
      .single();
    if (existing) return existing.id;
  }

  const id = slugify(item.name);

  // Check if exists
  const { data: existing } = await supabase
    .from("master_ingredients")
    .select("id")
    .eq("id", id)
    .single();
  if (existing) return existing.id;

  // Create new
  await supabase.from("master_ingredients").insert({
    id,
    canonical_name: item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase(),
    category: item.category || "unknown",
    default_unit: item.defaultUnit || item.contents.unit,
    default_shelf_life_days: item.defaultShelfLifeDays,
  });

  return id;
}

// Helper: convert units
async function convertUnits(fromQty: number, fromUnit: string, toUnit: string): Promise<number | null> {
  if (fromUnit === toUnit) return fromQty;

  const { data: conversion } = await supabase
    .from("global_unit_conversions")
    .select("factor")
    .eq("from_unit", fromUnit)
    .eq("to_unit", toUnit)
    .single();

  if (conversion) {
    return fromQty * conversion.factor;
  }

  // Try reverse
  const { data: reverseConversion } = await supabase
    .from("global_unit_conversions")
    .select("factor")
    .eq("from_unit", toUnit)
    .eq("to_unit", fromUnit)
    .single();

  if (reverseConversion) {
    return fromQty / reverseConversion.factor;
  }

  return null;
}

// SEARCH INVENTORY
export async function searchInventory(filters: SearchInventoryFilters = {}): Promise<InventoryItem[]> {
  let query = supabase
    .from("containers")
    .select(`
      *,
      contents (*),
      master_ingredients (*)
    `)
    .neq("status", "DELETED");

  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters.masterId) {
    query = query.eq("master_id", filters.masterId);
  }

  if (filters.includeLeftovers === false) {
    query = query.is("dish_name", null);
  }

  if (filters.expiringWithinDays !== undefined) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
    query = query.lte("expires_at", futureDate.toISOString()).not("expires_at", "is", null);
  }

  query = query.limit(filters.limit || 100);

  const { data: results, error } = await query;

  if (error) {
    console.error("Search inventory error:", error);
    return [];
  }

  let items: InventoryItem[] = (results || [])
    .filter((r: any) => r.contents && r.contents.length > 0)
    .map((r: any) => {
      const content = r.contents[0];
      const master = r.master_ingredients;
      return {
        id: r.id,
        containerId: r.id,
        masterId: master?.id || r.master_id,
        name: r.dish_name || master?.canonical_name || "Unknown",
        category: master?.category || null,
        quantity: content.remaining_qty,
        remainingQty: content.remaining_qty,
        unit: content.unit,
        status: r.status as ContainerStatus,
        purchaseUnit: r.purchase_unit,
        expiresAt: r.expires_at ? new Date(r.expires_at) : null,
        daysUntilExpiry: daysUntilExpiry(r.expires_at) ?? 0,
        isLeftover: !!r.dish_name,
        dishName: r.dish_name,
        confidence: r.confidence,
        source: r.source,
        createdAt: new Date(r.created_at),
      };
    });

  // Filter by query (name search)
  if (filters.query) {
    const queryLower = filters.query.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(queryLower) ||
        item.dishName?.toLowerCase().includes(queryLower)
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
    await supabase.from("containers").insert({
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
    await supabase.from("contents").insert({
      id: contentId,
      container_id: containerId,
      remaining_qty: item.contents.quantity,
      unit: item.contents.unit,
    });

    // Log transaction
    await supabase.from("transactions").insert({
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

// ADD LEFTOVER
export async function addLeftover(input: AddLeftoverInput): Promise<{ containerId: string }> {
  const containerId = uuidv4();
  const contentId = uuidv4();
  const transactionId = uuidv4();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 4));

  await supabase.from("containers").insert({
    id: containerId,
    master_id: null,
    dish_name: input.dishName,
    cooked_from_recipe_id: input.recipeId,
    status: "OPEN",
    source: "cooked",
    expires_at: expiresAt.toISOString(),
  });

  await supabase.from("contents").insert({
    id: contentId,
    container_id: containerId,
    remaining_qty: input.quantity,
    unit: input.unit,
  });

  await supabase.from("transactions").insert({
    id: transactionId,
    container_id: containerId,
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
  const { data: current, error } = await supabase
    .from("containers")
    .select(`*, contents (*)`)
    .eq("id", containerId)
    .single();

  if (error || !current) {
    throw new Error(`Container ${containerId} not found`);
  }

  // Update container if needed
  if (updates.status || updates.expiresAt || updates.masterId) {
    await supabase
      .from("containers")
      .update({
        status: updates.status,
        expires_at: updates.expiresAt?.toISOString(),
        master_id: updates.masterId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", containerId);
  }

  // Update contents if needed
  if (updates.remainingQty !== undefined || updates.unit) {
    const content = current.contents?.[0];
    const oldQty = content?.remaining_qty || 0;
    const newQty = updates.remainingQty ?? oldQty;

    await supabase
      .from("contents")
      .update({
        remaining_qty: newQty,
        unit: updates.unit,
        updated_at: new Date().toISOString(),
      })
      .eq("container_id", containerId);

    // Log adjustment transaction
    const delta = newQty - oldQty;
    if (delta !== 0) {
      await supabase.from("transactions").insert({
        id: uuidv4(),
        container_id: containerId,
        operation: "ADJUST",
        delta,
        unit: updates.unit || content?.unit,
        reason: reason || "manual_adjustment",
      });
    }
  }

  // If name changed, might need to update/create master
  if (updates.name && updates.masterId) {
    // Get old master
    const { data: oldMaster } = await supabase
      .from("master_ingredients")
      .select("canonical_name")
      .eq("id", current.master_id)
      .single();

    if (oldMaster) {
      // Register alias from old name to new master
      await supabase
        .from("ingredient_aliases")
        .upsert({
          alias: oldMaster.canonical_name.toLowerCase(),
          master_id: updates.masterId,
          source: "user_correction",
        }, { onConflict: "alias" });
    }
  }

  return { success: true };
}

// DEDUCT INVENTORY (FIFO)
export async function deductInventory(input: DeductInventoryInput): Promise<DeductResult> {
  const { masterId, quantity, unit, reason } = input;

  // Find open containers for this ingredient (FIFO by created date)
  const { data: availableContainers, error } = await supabase
    .from("containers")
    .select(`*, contents (*)`)
    .eq("master_id", masterId)
    .in("status", ["SEALED", "OPEN", "LOW"])
    .order("created_at", { ascending: true });

  if (error || !availableContainers || availableContainers.length === 0) {
    throw new Error(`No available inventory for ${masterId}`);
  }

  // Try to find container with matching or convertible unit
  const targetContainer = availableContainers[0];
  const targetContent = targetContainer.contents?.[0];

  if (!targetContent) {
    throw new Error(`No contents found for container`);
  }

  let deductQty = quantity;

  // Try unit conversion if needed
  if (targetContent.unit !== unit) {
    const converted = await convertUnits(quantity, unit, targetContent.unit);
    if (converted !== null) {
      deductQty = converted;
    } else {
      console.warn(`Cannot convert ${unit} to ${targetContent.unit}, using as-is`);
    }
  }

  const currentQty = targetContent.remaining_qty;
  const newQty = Math.max(0, currentQty - deductQty);
  const actualDeducted = currentQty - newQty;

  // If container was SEALED, open it
  if (targetContainer.status === "SEALED") {
    await supabase
      .from("containers")
      .update({ status: "OPEN", updated_at: new Date().toISOString() })
      .eq("id", targetContainer.id);

    await supabase.from("transactions").insert({
      id: uuidv4(),
      container_id: targetContainer.id,
      operation: "STATUS_CHANGE",
      reason: "opened_for_use",
    });
  }

  // Update contents
  await supabase
    .from("contents")
    .update({ remaining_qty: newQty, updated_at: new Date().toISOString() })
    .eq("container_id", targetContainer.id);

  // Determine new status based on remaining quantity
  let newStatus: ContainerStatus = "OPEN";
  let warning: string | undefined;

  if (newQty === 0) {
    newStatus = "EMPTY";
  } else {
    // Calculate percentage remaining
    const { data: initialAdd } = await supabase
      .from("transactions")
      .select("delta")
      .eq("container_id", targetContainer.id)
      .eq("operation", "ADD")
      .single();

    const initialQty = initialAdd?.delta || currentQty;
    const remainingPct = newQty / initialQty;

    if (remainingPct <= LOW_THRESHOLD) {
      newStatus = "LOW";
      warning = `LOW_INVENTORY: ${Math.round(remainingPct * 100)}% remaining`;
    }
  }

  // Update status if changed
  if (newStatus !== targetContainer.status) {
    await supabase
      .from("containers")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", targetContainer.id);
  }

  // Log deduction transaction
  await supabase.from("transactions").insert({
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

// DELETE INVENTORY (soft delete)
export async function deleteInventory(containerId: string, reason: string): Promise<{ success: boolean }> {
  await supabase
    .from("containers")
    .update({ status: "DELETED", updated_at: new Date().toISOString() })
    .eq("id", containerId);

  await supabase.from("transactions").insert({
    id: uuidv4(),
    container_id: containerId,
    operation: "DELETE",
    reason,
  });

  return { success: true };
}

// MERGE INVENTORY
export async function mergeInventory(sourceId: string, targetId: string): Promise<{ success: boolean; newQty: number }> {
  const { data: source } = await supabase
    .from("containers")
    .select(`*, contents (*)`)
    .eq("id", sourceId)
    .single();

  const { data: target } = await supabase
    .from("containers")
    .select(`*, contents (*)`)
    .eq("id", targetId)
    .single();

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
    const converted = await convertUnits(addQty, sourceContent.unit, targetContent.unit);
    if (converted !== null) {
      addQty = converted;
    }
  }

  const newQty = targetContent.remaining_qty + addQty;

  // Update target
  await supabase
    .from("contents")
    .update({ remaining_qty: newQty, updated_at: new Date().toISOString() })
    .eq("container_id", targetId);

  // Soft delete source
  await supabase
    .from("containers")
    .update({ status: "DELETED", updated_at: new Date().toISOString() })
    .eq("id", sourceId);

  // Log transactions
  await supabase.from("transactions").insert([
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
    const { data: sameJob } = await supabase
      .from("containers")
      .select("id")
      .eq("master_id", masterId)
      .eq("vision_job_id", visionJobId)
      .single();

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
  await supabase
    .from("ingredient_aliases")
    .upsert({
      alias: alias.toLowerCase(),
      master_id: masterId,
      source,
    }, { onConflict: "alias" });

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
  const { data: exactMaster } = await supabase
    .from("master_ingredients")
    .select("id, canonical_name")
    .eq("id", slugify(normalized))
    .single();

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
  const { data: alias } = await supabase
    .from("ingredient_aliases")
    .select(`*, master_ingredients (id, canonical_name)`)
    .eq("alias", normalized)
    .single();

  if (alias && alias.master_ingredients) {
    return {
      matchType: "alias",
      masterId: alias.master_ingredients.id,
      canonicalName: alias.master_ingredients.canonical_name,
      confidence: 0.95,
      alternatives: [],
    };
  }

  // Fuzzy search - get all masters and score
  const { data: allMasters } = await supabase
    .from("master_ingredients")
    .select("id, canonical_name");

  if (!allMasters) {
    return { matchType: "unknown", confidence: 0, alternatives: [] };
  }

  const scored = allMasters
    .map((m) => ({
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
