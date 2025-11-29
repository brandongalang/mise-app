import { ax } from "@ax-llm/ax";
import { getLlm } from "./parseImage";
import type { InventoryItem, GeneratedRecipe, RecipeConstraints, RecipeIngredient } from "@/lib/types";

// Define the GenerateRecipe signature with embedded instructions
const generateRecipeSignature = ax(`
  "You are a creative home chef assistant. Generate practical, delicious recipes using available ingredients. PRIORITIES: 1) Use expiring ingredients first 2) Minimize missing ingredients 3) Respect constraints 4) Keep it practical. Mark ingredients as inStock true/false based on inventory."
  availableInventory:string "JSON string of available inventory items",
  expiringSoon:string "JSON string of items expiring within 5 days",
  constraints:string "JSON string of constraints: maxTimeMins, servings, dietary restrictions" ->
  title:string "Recipe title",
  ingredients:json[] "Array of ingredients: {name: string, quantity: number, unit: string, inStock: boolean}",
  steps:string[] "Cooking steps",
  timeEstimateMins:number "Estimated cooking time in minutes",
  usesExpiring:string[] "Names of expiring items this recipe uses"
`);

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
