import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { plannedMeals, savedRecipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST /api/v1/meal-plans/:id/meals - Add meal to plan
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: mealPlanId } = await params;
        const body = await request.json();
        const { date, mealType, recipeId, quickMeal, servings } = body;

        if (!date || !mealType) {
            return NextResponse.json(
                { error: "Missing required fields: date, mealType" },
                { status: 400 }
            );
        }

        if (!recipeId && !quickMeal) {
            return NextResponse.json(
                { error: "Must provide either recipeId or quickMeal" },
                { status: 400 }
            );
        }

        const newMeal = {
            id: `meal_${nanoid(12)}`,
            mealPlanId,
            date: new Date(date),
            mealType,
            recipeId: recipeId || null,
            quickMeal: quickMeal || null,
            servings: servings || 2,
            status: "planned",
            cookedAt: null,
            createdAt: new Date(),
        };

        await db.insert(plannedMeals).values(newMeal);

        // If linked to a recipe, fetch recipe details
        let recipe = null;
        if (recipeId) {
            const recipeResult = await db
                .select()
                .from(savedRecipes)
                .where(eq(savedRecipes.id, recipeId))
                .limit(1);
            recipe = recipeResult[0] || null;
        }

        return NextResponse.json(
            {
                meal: {
                    ...newMeal,
                    recipeTitle: recipe?.title,
                    recipeTimeMinutes: recipe?.timeMinutes,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error adding meal to plan:", error);
        return NextResponse.json(
            { error: "Failed to add meal to plan" },
            { status: 500 }
        );
    }
}
