import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedRecipes } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/v1/recipes/:id - Get recipe details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const recipe = await db
            .select()
            .from(savedRecipes)
            .where(eq(savedRecipes.id, id))
            .limit(1);

        if (recipe.length === 0) {
            return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
        }

        return NextResponse.json({ recipe: recipe[0] });
    } catch (error) {
        console.error("Error fetching recipe:", error);
        return NextResponse.json(
            { error: "Failed to fetch recipe" },
            { status: 500 }
        );
    }
}

// PATCH /api/v1/recipes/:id - Update recipe
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const allowedFields = [
            "title",
            "description",
            "ingredients",
            "steps",
            "timeMinutes",
            "servings",
            "tags",
            "notes",
            "isFavorite",
        ];

        const updates: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field === "tags" && Array.isArray(body[field])) {
                    updates[field] = JSON.stringify(body[field]);
                } else {
                    updates[field] = body[field];
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        await db.update(savedRecipes).set(updates).where(eq(savedRecipes.id, id));

        const updated = await db
            .select()
            .from(savedRecipes)
            .where(eq(savedRecipes.id, id))
            .limit(1);

        return NextResponse.json({ recipe: updated[0] });
    } catch (error) {
        console.error("Error updating recipe:", error);
        return NextResponse.json(
            { error: "Failed to update recipe" },
            { status: 500 }
        );
    }
}

// DELETE /api/v1/recipes/:id - Delete recipe
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await db.delete(savedRecipes).where(eq(savedRecipes.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting recipe:", error);
        return NextResponse.json(
            { error: "Failed to delete recipe" },
            { status: 500 }
        );
    }
}
