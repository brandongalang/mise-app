import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { plannedMeals, savedRecipes } from "@/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/v1/planned-meals/:id - Update meal (status, swap recipe, etc)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const allowedFields = ["recipeId", "quickMeal", "servings", "status", "cookedAt"];
        const updates: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field === "cookedAt" && body[field]) {
                    updates[field] = new Date(body[field]);
                } else {
                    updates[field] = body[field];
                }
            }
        }

        // If marking as cooked, set cookedAt if not provided
        if (body.status === "cooked" && !updates.cookedAt) {
            updates.cookedAt = new Date();
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        await db.update(plannedMeals).set(updates).where(eq(plannedMeals.id, id));

        // Fetch updated meal with recipe details
        const updated = await db
            .select({
                id: plannedMeals.id,
                date: plannedMeals.date,
                mealType: plannedMeals.mealType,
                recipeId: plannedMeals.recipeId,
                quickMeal: plannedMeals.quickMeal,
                servings: plannedMeals.servings,
                status: plannedMeals.status,
                cookedAt: plannedMeals.cookedAt,
                recipeTitle: savedRecipes.title,
                recipeTimeMinutes: savedRecipes.timeMinutes,
            })
            .from(plannedMeals)
            .leftJoin(savedRecipes, eq(plannedMeals.recipeId, savedRecipes.id))
            .where(eq(plannedMeals.id, id))
            .limit(1);

        // If marking as cooked, increment timesCooked on the recipe
        if (body.status === "cooked" && updated[0]?.recipeId) {
            const recipe = await db
                .select()
                .from(savedRecipes)
                .where(eq(savedRecipes.id, updated[0].recipeId))
                .limit(1);

            if (recipe[0]) {
                await db
                    .update(savedRecipes)
                    .set({
                        timesCooked: (recipe[0].timesCooked || 0) + 1,
                        lastCookedAt: new Date(),
                    })
                    .where(eq(savedRecipes.id, updated[0].recipeId));
            }
        }

        return NextResponse.json({ meal: updated[0] });
    } catch (error) {
        console.error("Error updating planned meal:", error);
        return NextResponse.json(
            { error: "Failed to update planned meal" },
            { status: 500 }
        );
    }
}

// DELETE /api/v1/planned-meals/:id - Remove meal from plan
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await db.delete(plannedMeals).where(eq(plannedMeals.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting planned meal:", error);
        return NextResponse.json(
            { error: "Failed to delete planned meal" },
            { status: 500 }
        );
    }
}
