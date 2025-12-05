import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
    groceryLists,
    groceryItems,
    mealPlans,
    plannedMeals,
    savedRecipes,
    containers,
    contents,
    masterIngredients,
} from "@/db/schema";
import { eq, and, inArray, notInArray } from "drizzle-orm";
import { nanoid } from "nanoid";

const HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001";

// Category mapping for common items
const categoryMap: Record<string, string> = {
    chicken: "protein",
    beef: "protein",
    pork: "protein",
    fish: "protein",
    salmon: "protein",
    shrimp: "protein",
    egg: "protein",
    eggs: "protein",
    tofu: "protein",
    milk: "dairy",
    cheese: "dairy",
    butter: "dairy",
    yogurt: "dairy",
    cream: "dairy",
    apple: "produce",
    banana: "produce",
    lettuce: "produce",
    tomato: "produce",
    onion: "produce",
    garlic: "produce",
    carrot: "produce",
    broccoli: "produce",
    spinach: "produce",
    rice: "pantry",
    pasta: "pantry",
    flour: "pantry",
    sugar: "pantry",
    salt: "pantry",
    oil: "pantry",
    bread: "bakery",
};

function guessCategory(itemName: string): string {
    const lower = itemName.toLowerCase();
    for (const [keyword, category] of Object.entries(categoryMap)) {
        if (lower.includes(keyword)) {
            return category;
        }
    }
    return "other";
}

// GET /api/v1/grocery-lists - Get active grocery list
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "active";

        const lists = await db
            .select()
            .from(groceryLists)
            .where(
                and(
                    eq(groceryLists.householdId, HOUSEHOLD_ID),
                    eq(groceryLists.status, status)
                )
            )
            .orderBy(groceryLists.createdAt);

        if (lists.length === 0) {
            return NextResponse.json({ groceryList: null, items: [] });
        }

        const list = lists[0];
        const items = await db
            .select()
            .from(groceryItems)
            .where(eq(groceryItems.listId, list.id))
            .orderBy(groceryItems.category, groceryItems.name);

        return NextResponse.json({ groceryList: list, items });
    } catch (error) {
        console.error("Error fetching grocery list:", error);
        return NextResponse.json(
            { error: "Failed to fetch grocery list" },
            { status: 500 }
        );
    }
}

// POST /api/v1/grocery-lists/generate - Generate from meal plan
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mealPlanId } = body;

        if (!mealPlanId) {
            return NextResponse.json(
                { error: "mealPlanId is required" },
                { status: 400 }
            );
        }

        // Get all planned meals with recipes
        const meals = await db
            .select({
                recipeId: plannedMeals.recipeId,
                servings: plannedMeals.servings,
                ingredients: savedRecipes.ingredients,
                recipeServings: savedRecipes.servings,
            })
            .from(plannedMeals)
            .leftJoin(savedRecipes, eq(plannedMeals.recipeId, savedRecipes.id))
            .where(
                and(
                    eq(plannedMeals.mealPlanId, mealPlanId),
                    eq(plannedMeals.status, "planned")
                )
            );

        // Parse ingredients from all recipes
        // For free-text format, we'll do basic parsing
        const ingredientMap = new Map<
            string,
            { quantity: number; unit: string; category: string }
        >();

        for (const meal of meals) {
            if (!meal.ingredients) continue;

            // Scale factor based on servings
            const scaleFactor =
                meal.recipeServings && meal.recipeServings > 0
                    ? meal.servings / meal.recipeServings
                    : 1;

            // Basic parsing of free-text ingredients
            // Format expected: "1 cup flour", "2 eggs", "500g chicken breast"
            const lines = meal.ingredients.split("\n").filter((l) => l.trim());

            for (const line of lines) {
                // Simple regex to extract quantity, unit, and name
                const match = line.match(/^([\d.\/]+)?\s*(\w+)?\s+(.+)$/);
                if (match) {
                    const quantity = match[1] ? parseFloat(match[1]) * scaleFactor : 1 * scaleFactor;
                    const unit = match[2] || "count";
                    const name = match[3].trim();
                    const key = name.toLowerCase();

                    if (ingredientMap.has(key)) {
                        const existing = ingredientMap.get(key)!;
                        existing.quantity += quantity;
                    } else {
                        ingredientMap.set(key, {
                            quantity,
                            unit,
                            category: guessCategory(name),
                        });
                    }
                } else {
                    // Couldn't parse, add as-is
                    const key = line.trim().toLowerCase();
                    if (!ingredientMap.has(key)) {
                        ingredientMap.set(key, {
                            quantity: 1,
                            unit: "count",
                            category: guessCategory(line),
                        });
                    }
                }
            }
        }

        // Get current inventory to subtract
        const inventory = await db
            .select({
                name: masterIngredients.canonicalName,
                quantity: contents.remainingQty,
                unit: contents.unit,
            })
            .from(containers)
            .leftJoin(masterIngredients, eq(containers.masterId, masterIngredients.id))
            .leftJoin(contents, eq(containers.id, contents.containerId))
            .where(
                and(
                    eq(containers.householdId, HOUSEHOLD_ID),
                    notInArray(containers.status, ["EMPTY", "DELETED"])
                )
            );

        // Simple subtraction (same-unit only for now)
        for (const item of inventory) {
            if (!item.name) continue;
            const key = item.name.toLowerCase();
            if (ingredientMap.has(key)) {
                const needed = ingredientMap.get(key)!;
                needed.quantity = Math.max(0, needed.quantity - (item.quantity || 0));
                if (needed.quantity === 0) {
                    ingredientMap.delete(key);
                }
            }
        }

        // Create grocery list
        const newList = {
            id: `list_${nanoid(12)}`,
            householdId: HOUSEHOLD_ID,
            mealPlanId,
            status: "active",
            createdAt: new Date(),
            completedAt: null,
        };

        await db.insert(groceryLists).values(newList);

        // Create grocery items
        const items: Array<{
            id: string;
            listId: string;
            name: string;
            quantity: number;
            unit: string;
            category: string;
            isChecked: boolean;
            source: string;
            createdAt: Date;
        }> = [];

        for (const [name, data] of ingredientMap) {
            if (data.quantity > 0) {
                items.push({
                    id: `item_${nanoid(12)}`,
                    listId: newList.id,
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    quantity: Math.round(data.quantity * 100) / 100,
                    unit: data.unit,
                    category: data.category,
                    isChecked: false,
                    source: "recipe",
                    createdAt: new Date(),
                });
            }
        }

        if (items.length > 0) {
            await db.insert(groceryItems).values(items);
        }

        return NextResponse.json(
            { groceryList: newList, items, itemCount: items.length },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error generating grocery list:", error);
        return NextResponse.json(
            { error: "Failed to generate grocery list" },
            { status: 500 }
        );
    }
}
