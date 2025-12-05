import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedRecipes } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// Temporary hardcoded household ID until auth is implemented
const HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/recipes - List all saved recipes
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const favoritesOnly = searchParams.get("favorites") === "true";

        let query = db
            .select()
            .from(savedRecipes)
            .where(eq(savedRecipes.householdId, HOUSEHOLD_ID))
            .orderBy(desc(savedRecipes.createdAt));

        if (favoritesOnly) {
            query = db
                .select()
                .from(savedRecipes)
                .where(
                    and(
                        eq(savedRecipes.householdId, HOUSEHOLD_ID),
                        eq(savedRecipes.isFavorite, true)
                    )
                )
                .orderBy(desc(savedRecipes.createdAt));
        }

        const recipes = await query;

        return NextResponse.json({
            recipes,
            count: recipes.length,
        });
    } catch (error) {
        console.error("Error fetching recipes:", error);
        return NextResponse.json(
            { error: "Failed to fetch recipes" },
            { status: 500 }
        );
    }
}

// POST /api/v1/recipes - Save a new recipe
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, ingredients, steps, timeMinutes, servings, tags } = body;

        if (!title || !ingredients || !steps) {
            return NextResponse.json(
                { error: "Missing required fields: title, ingredients, steps" },
                { status: 400 }
            );
        }

        const newRecipe = {
            id: `recipe_${nanoid(12)}`,
            householdId: HOUSEHOLD_ID,
            title,
            description: description || null,
            ingredients,
            steps,
            timeMinutes: timeMinutes || null,
            servings: servings || 4,
            tags: tags ? JSON.stringify(tags) : null,
            notes: null,
            isFavorite: false,
            timesCooked: 0,
            createdAt: new Date(),
            lastCookedAt: null,
        };

        await db.insert(savedRecipes).values(newRecipe);

        return NextResponse.json({ recipe: newRecipe }, { status: 201 });
    } catch (error) {
        console.error("Error saving recipe:", error);
        return NextResponse.json(
            { error: "Failed to save recipe" },
            { status: 500 }
        );
    }
}
