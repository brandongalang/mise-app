import { ax } from "@ax-llm/ax";
import { getLlm } from "./parseImage";
import type { InventoryItem, GeneratedRecipe, RecipeConstraints, RecipeIngredient } from "@/lib/types";

// System prompt for recipe generation
const RECIPE_PROMPT = `You are a creative home chef assistant. Generate practical, delicious recipes using available ingredients.

PRIORITIES:
1) Use expiring ingredients first
2) Minimize missing ingredients
3) Respect constraints (time, servings, dietary)
4) Keep it practical

Mark each ingredient as inStock true or false based on the available inventory.`;

// Define the GenerateRecipe signature - use setInstruction to avoid signature parsing issues
const generateRecipeSignature = ax(
  `availableInventory:string, expiringSoon:string, constraints:string -> title:string, ingredients:json[], steps:string[], timeEstimateMins:number, usesExpiring:string[]`
);
generateRecipeSignature.setInstruction(RECIPE_PROMPT);

export async function generateRecipe(
  availableInventory: InventoryItem[],
  expiringSoon: InventoryItem[],
  constraints: RecipeConstraints
): Promise<GeneratedRecipe> {
  // Convert to strings for the signature
  const inventoryStr = JSON.stringify(
    availableInventory.map((i) => ({
      name: i.name,
      quantity: i.remainingQty,
      unit: i.unit,
      category: i.category,
      daysUntilExpiry: i.daysUntilExpiry,
    }))
  );

  const expiringStr = JSON.stringify(
    expiringSoon.map((i) => ({
      name: i.name,
      quantity: i.remainingQty,
      unit: i.unit,
      daysUntilExpiry: i.daysUntilExpiry,
    }))
  );

  const constraintsStr = JSON.stringify(constraints);

  const result = await generateRecipeSignature.forward(
    getLlm(),
    {
      availableInventory: inventoryStr,
      expiringSoon: expiringStr,
      constraints: constraintsStr,
    }
  );

  // Transform result
  const ingredients: RecipeIngredient[] = (result.ingredients as any[]).map((ing: any) => ({
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    inStock: ing.inStock ?? true,
  }));

  return {
    title: result.title,
    ingredients,
    steps: result.steps as string[],
    timeEstimateMins: result.timeEstimateMins,
    usesExpiring: result.usesExpiring as string[],
  };
}
