import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans, plannedMeals, savedRecipes } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

const HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001";

// Helper to get Monday of a given week
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// GET /api/v1/meal-plans - Get current week's plan or specific week
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const weekParam = searchParams.get("week");

        const weekStart = weekParam ? new Date(weekParam) : getWeekStart(new Date());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Find existing plan for this week
        const existingPlan = await db
            .select()
            .from(mealPlans)
            .where(
                and(
                    eq(mealPlans.householdId, HOUSEHOLD_ID),
                    gte(mealPlans.weekStart, weekStart),
                    lte(mealPlans.weekStart, weekEnd)
                )
            )
            .limit(1);

        if (existingPlan.length === 0) {
            return NextResponse.json({
                mealPlan: null,
                meals: [],
                weekStart: weekStart.toISOString(),
            });
        }

        const plan = existingPlan[0];

        // Get all planned meals for this plan with recipe details
        const meals = await db
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
            .where(eq(plannedMeals.mealPlanId, plan.id))
            .orderBy(plannedMeals.date);

        return NextResponse.json({
            mealPlan: plan,
            meals,
            weekStart: weekStart.toISOString(),
        });
    } catch (error) {
        console.error("Error fetching meal plan:", error);
        return NextResponse.json(
            { error: "Failed to fetch meal plan" },
            { status: 500 }
        );
    }
}

// POST /api/v1/meal-plans - Create new week plan
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { weekStart: weekStartParam } = body;

        const weekStart = weekStartParam
            ? getWeekStart(new Date(weekStartParam))
            : getWeekStart(new Date());

        // Check if plan already exists
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const existing = await db
            .select()
            .from(mealPlans)
            .where(
                and(
                    eq(mealPlans.householdId, HOUSEHOLD_ID),
                    gte(mealPlans.weekStart, weekStart),
                    lte(mealPlans.weekStart, weekEnd)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({
                mealPlan: existing[0],
                message: "Plan already exists for this week",
            });
        }

        const newPlan = {
            id: `plan_${nanoid(12)}`,
            householdId: HOUSEHOLD_ID,
            weekStart,
            createdAt: new Date(),
        };

        await db.insert(mealPlans).values(newPlan);

        return NextResponse.json({ mealPlan: newPlan }, { status: 201 });
    } catch (error) {
        console.error("Error creating meal plan:", error);
        return NextResponse.json(
            { error: "Failed to create meal plan" },
            { status: 500 }
        );
    }
}
