import { NextRequest } from "next/server";
import { searchInventory, getExpiringItems } from "@/agent/tools/inventory";
import type { InventoryItem, IngredientCategory } from "@/lib/types";

interface CategorySummary {
  count: number;
  items: InventoryItem[];
}

interface InventorySummary {
  expiringSoon: InventoryItem[];
  categories: Record<IngredientCategory, CategorySummary>;
  leftovers: InventoryItem[];
  totalCount: number;
}

export async function GET(req: NextRequest) {
  try {
    // Get all active inventory
    const allItems = await searchInventory({
      status: ["SEALED", "OPEN", "LOW"],
      includeLeftovers: true,
    });

    // Get expiring items (within 3 days)
    const expiringSoon = await getExpiringItems(3);

    // Separate leftovers
    const leftovers = allItems.filter((item) => item.isLeftover);
    const ingredients = allItems.filter((item) => !item.isLeftover);

    // Group by category
    const categories: Record<IngredientCategory, CategorySummary> = {
      produce: { count: 0, items: [] },
      protein: { count: 0, items: [] },
      dairy: { count: 0, items: [] },
      pantry: { count: 0, items: [] },
      frozen: { count: 0, items: [] },
      beverage: { count: 0, items: [] },
      unknown: { count: 0, items: [] },
    };

    for (const item of ingredients) {
      const category = (item.category as IngredientCategory) || "unknown";
      if (categories[category]) {
        categories[category].count++;
        categories[category].items.push(item);
      }
    }

    const summary: InventorySummary = {
      expiringSoon,
      categories,
      leftovers,
      totalCount: allItems.length,
    };

    return Response.json(summary);
  } catch (error) {
    console.error("Inventory summary error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
