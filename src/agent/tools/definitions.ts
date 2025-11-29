import type { AxFunction, AxFunctionJSONSchema } from "@ax-llm/ax";
import {
  searchInventory,
  addInventory,
  addLeftover,
  updateInventory,
  deductInventory,
  deleteInventory,
  mergeInventory,
  getExpiringItems,
  resolveIngredient,
} from "./inventory";
// parseImage is still available if needed, but not used in tool calls
// since the multimodal agent handles images directly
import { parseImage } from "../signatures/parseImage";
import { generateRecipe } from "../signatures/generateRecipe";
import type { IngredientCategory, ContainerStatus } from "@/lib/types";

// ============================================
// JSON SCHEMAS FOR TOOL PARAMETERS
// ============================================

const categoryEnum = [
  "produce",
  "protein",
  "dairy",
  "pantry",
  "frozen",
  "beverage",
  "condiment",
  "grain",
  "spice",
  "unknown",
];

const statusEnum = ["SEALED", "OPEN", "LOW", "EMPTY", "DISCARDED", "USED"];

// ============================================
// INVENTORY TOOL DEFINITIONS
// ============================================

export const searchInventoryTool: AxFunction = {
  name: "searchInventory",
  description:
    "Search the kitchen inventory. Use this to find items by name, category, or status. Returns matching items with quantities and expiry info.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term to match against item names",
      },
      category: {
        type: "string",
        enum: categoryEnum,
        description: "Filter by ingredient category",
      },
      status: {
        type: "array",
        items: { type: "string", enum: statusEnum },
        description: "Filter by container status (e.g., SEALED, OPEN, LOW)",
      },
      expiringWithinDays: {
        type: "number",
        description: "Only return items expiring within this many days",
      },
      includeLeftovers: {
        type: "boolean",
        description: "Whether to include leftover dishes (default: true)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return",
      },
    },
    required: [],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const results = await searchInventory({
      query: args?.query,
      category: args?.category as IngredientCategory,
      status: args?.status as ContainerStatus[],
      expiringWithinDays: args?.expiringWithinDays,
      includeLeftovers: args?.includeLeftovers,
      limit: args?.limit,
    });
    return {
      count: results.length,
      items: results.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.remainingQty,
        unit: item.unit,
        category: item.category,
        status: item.status,
        expiresAt: item.expiresAt?.toISOString(),
        daysUntilExpiry: item.daysUntilExpiry,
        isLeftover: item.isLeftover,
        dishName: item.dishName,
      })),
    };
  },
};

export const addInventoryTool: AxFunction = {
  name: "addInventory",
  description:
    "Add new items to the kitchen inventory. Use after scanning a receipt or when user mentions buying groceries.",
  parameters: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Item name" },
            quantity: { type: "number", description: "Amount to add" },
            unit: { type: "string", description: "Unit of measurement (e.g., count, lb, oz, ml)" },
            category: { type: "string", enum: categoryEnum, description: "Ingredient category" },
            expiresInDays: { type: "number", description: "Days until expiry" },
            source: { type: "string", description: "Where this came from (e.g., receipt, manual)" },
          },
          required: ["name", "quantity", "unit"],
        },
        description: "Array of items to add",
      },
    },
    required: ["items"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const items = (args?.items || []).map((item: any) => ({
      name: item.name,
      category: item.category || "unknown",
      source: item.source || "manual",
      confidence: 1.0,
      container: {
        status: "SEALED" as ContainerStatus,
        unit: item.unit,
      },
      contents: {
        quantity: item.quantity,
        unit: item.unit,
      },
      expiresAt: item.expiresInDays
        ? new Date(Date.now() + item.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
    }));

    const result = await addInventory(items);
    return {
      success: true,
      created: result.created,
      message: `Added ${result.created} item(s) to inventory`,
    };
  },
};

export const addLeftoverTool: AxFunction = {
  name: "addLeftover",
  description:
    "Add a leftover dish to inventory. Use when user mentions they cooked something and have leftovers.",
  parameters: {
    type: "object",
    properties: {
      dishName: { type: "string", description: "Name of the dish (e.g., 'Chicken Stir Fry')" },
      quantity: { type: "number", description: "Number of portions/servings" },
      unit: { type: "string", description: "Unit (e.g., 'portion', 'serving', 'container')" },
      expiresInDays: { type: "number", description: "Days until it should be eaten (default: 4)" },
    },
    required: ["dishName", "quantity", "unit"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const result = await addLeftover({
      dishName: args?.dishName,
      quantity: args?.quantity,
      unit: args?.unit,
      expiresInDays: args?.expiresInDays,
    });
    return {
      success: true,
      containerId: result.containerId,
      message: `Added "${args?.dishName}" to inventory`,
    };
  },
};

export const deductInventoryTool: AxFunction = {
  name: "deductInventory",
  description:
    "Deduct/use items from inventory. Use when user says they used, consumed, or cooked with an ingredient.",
  parameters: {
    type: "object",
    properties: {
      ingredientName: { type: "string", description: "Name of the ingredient to deduct" },
      quantity: { type: "number", description: "Amount to deduct" },
      unit: { type: "string", description: "Unit of measurement" },
      reason: { type: "string", description: "Why it's being deducted (e.g., 'cooked dinner', 'used in recipe')" },
    },
    required: ["ingredientName", "quantity", "unit"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    // First resolve the ingredient name to a master ID
    const resolved = await resolveIngredient(args?.ingredientName);
    if (!resolved.masterId) {
      return {
        success: false,
        error: `Could not find "${args?.ingredientName}" in inventory`,
      };
    }

    try {
      const result = await deductInventory({
        masterId: resolved.masterId,
        quantity: args?.quantity,
        unit: args?.unit,
        reason: args?.reason || "used",
      });
      return {
        success: true,
        deducted: result.deducted,
        unit: result.unit,
        remainingAfter: result.remainingAfter,
        warning: result.warning,
        message: `Deducted ${result.deducted} ${result.unit} of ${resolved.canonicalName}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to deduct",
      };
    }
  },
};

export const updateInventoryTool: AxFunction = {
  name: "updateInventory",
  description:
    "Update an existing inventory item. Use to correct quantities, change status, or update expiry dates.",
  parameters: {
    type: "object",
    properties: {
      containerId: { type: "string", description: "ID of the container to update" },
      updates: {
        type: "object",
        properties: {
          remainingQty: { type: "number", description: "New quantity" },
          unit: { type: "string", description: "New unit" },
          status: { type: "string", enum: statusEnum, description: "New status" },
          expiresAt: { type: "string", description: "New expiry date (ISO string)" },
        },
        description: "Fields to update",
      },
      reason: { type: "string", description: "Reason for the update" },
    },
    required: ["containerId", "updates"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const result = await updateInventory({
      containerId: args?.containerId,
      updates: {
        remainingQty: args?.updates?.remainingQty,
        unit: args?.updates?.unit,
        status: args?.updates?.status as ContainerStatus,
        expiresAt: args?.updates?.expiresAt ? new Date(args.updates.expiresAt) : undefined,
      },
      reason: args?.reason,
    });
    return { success: result.success, message: "Inventory updated" };
  },
};

export const deleteInventoryTool: AxFunction = {
  name: "deleteInventory",
  description:
    "Remove/discard an item from inventory. Use when user says they threw something away or it went bad.",
  parameters: {
    type: "object",
    properties: {
      containerId: { type: "string", description: "ID of the container to delete" },
      reason: { type: "string", description: "Why it's being removed (e.g., 'expired', 'threw away', 'went bad')" },
    },
    required: ["containerId", "reason"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const result = await deleteInventory(args?.containerId, args?.reason);
    return { success: result.success, message: "Item removed from inventory" };
  },
};

export const mergeInventoryTool: AxFunction = {
  name: "mergeInventory",
  description:
    "Merge two containers of the same ingredient into one. Use when user consolidates packages.",
  parameters: {
    type: "object",
    properties: {
      sourceId: { type: "string", description: "ID of container to merge from (will be emptied)" },
      targetId: { type: "string", description: "ID of container to merge into" },
    },
    required: ["sourceId", "targetId"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const result = await mergeInventory(args?.sourceId, args?.targetId);
    return {
      success: result.success,
      newQuantity: result.newQty,
      message: "Containers merged successfully",
    };
  },
};

export const getExpiringItemsTool: AxFunction = {
  name: "getExpiringItems",
  description:
    "Get items expiring soon. Use when user asks 'what's expiring?' or 'what should I use first?'",
  parameters: {
    type: "object",
    properties: {
      withinDays: { type: "number", description: "Number of days to look ahead (default: 3)" },
    },
    required: [],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const items = await getExpiringItems(args?.withinDays || 3);
    return {
      count: items.length,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.remainingQty,
        unit: item.unit,
        daysUntilExpiry: item.daysUntilExpiry,
        expiresAt: item.expiresAt?.toISOString(),
        isLeftover: item.isLeftover,
        dishName: item.dishName,
      })),
    };
  },
};

export const resolveIngredientTool: AxFunction = {
  name: "resolveIngredient",
  description:
    "Resolve a raw ingredient name to a canonical name. Use to check if an ingredient exists or find similar items.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Raw ingredient name to resolve" },
      categoryHint: { type: "string", enum: categoryEnum, description: "Optional category hint" },
    },
    required: ["name"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const result = await resolveIngredient(args?.name, args?.categoryHint);
    return {
      matchType: result.matchType,
      masterId: result.masterId,
      canonicalName: result.canonicalName,
      confidence: result.confidence,
      alternatives: result.alternatives,
    };
  },
};

export const parseImageTool: AxFunction = {
  name: "parseImage",
  description:
    "Analyze an image of a receipt, groceries, or fridge contents to extract food items. Use when user sends a photo.",
  parameters: {
    type: "object",
    properties: {
      imageBase64: { type: "string", description: "Base64-encoded image data" },
      sourceHint: {
        type: "string",
        enum: ["receipt", "fridge", "groceries"],
        description: "Hint about what the image shows",
      },
    },
    required: ["imageBase64"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    const result = await parseImage(args?.imageBase64, args?.sourceHint);
    return {
      sourceType: result.sourceType,
      items: result.items,
      notes: result.notes,
    };
  },
};

export const generateRecipeTool: AxFunction = {
  name: "generateRecipe",
  description:
    "Generate a recipe using available inventory items. Prioritizes items expiring soon. Use when user asks 'what can I cook?' or 'give me a recipe'.",
  parameters: {
    type: "object",
    properties: {
      maxTimeMins: { type: "number", description: "Maximum cooking time in minutes" },
      servings: { type: "number", description: "Number of servings needed" },
      dietary: {
        type: "array",
        items: { type: "string" },
        description: "Dietary restrictions (e.g., vegetarian, gluten-free)",
      },
    },
    required: [],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    // Get current inventory and expiring items
    const [inventory, expiring] = await Promise.all([
      searchInventory({ status: ["SEALED", "OPEN", "LOW"] }),
      getExpiringItems(5),
    ]);

    const recipe = await generateRecipe(inventory, expiring, {
      maxTimeMins: args?.maxTimeMins,
      servings: args?.servings,
      dietary: args?.dietary,
    });

    return {
      title: recipe.title,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      timeEstimateMins: recipe.timeEstimateMins,
      usesExpiring: recipe.usesExpiring,
    };
  },
};

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const inventoryTools: AxFunction[] = [
  searchInventoryTool,
  addInventoryTool,
  addLeftoverTool,
  deductInventoryTool,
  updateInventoryTool,
  deleteInventoryTool,
  mergeInventoryTool,
  getExpiringItemsTool,
  resolveIngredientTool,
  generateRecipeTool,
];

// Note: parseImageTool is exported but not included in inventoryTools
// because image analysis is now done directly by the multimodal agent
