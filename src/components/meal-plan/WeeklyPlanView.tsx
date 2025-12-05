"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MealSlot from "./MealSlot";
import AddMealSheet from "./AddMealSheet";

interface PlannedMeal {
    id: string;
    date: string;
    mealType: string;
    recipeId?: string;
    quickMeal?: string;
    servings: number;
    status: string;
    recipeTitle?: string;
    recipeTimeMinutes?: number;
}

interface MealPlan {
    id: string;
    weekStart: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyPlanView() {
    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [meals, setMeals] = useState<PlannedMeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState<Date>(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    });
    const [addingMeal, setAddingMeal] = useState<{
        date: Date;
        mealType: string;
    } | null>(null);

    useEffect(() => {
        fetchMealPlan();
    }, [weekStart]);

    const fetchMealPlan = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/v1/meal-plans?week=${weekStart.toISOString()}`
            );
            const data = await res.json();
            setMealPlan(data.mealPlan);
            setMeals(data.meals || []);
        } catch (error) {
            console.error("Failed to fetch meal plan:", error);
        } finally {
            setLoading(false);
        }
    };

    const createMealPlan = async () => {
        try {
            const res = await fetch("/api/v1/meal-plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ weekStart: weekStart.toISOString() }),
            });
            const data = await res.json();
            setMealPlan(data.mealPlan);
        } catch (error) {
            console.error("Failed to create meal plan:", error);
        }
    };

    const handleAddMeal = async (
        recipeId?: string,
        quickMeal?: string,
        servings = 2
    ) => {
        if (!addingMeal || !mealPlan) return;

        try {
            const res = await fetch(`/api/v1/meal-plans/${mealPlan.id}/meals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: addingMeal.date.toISOString(),
                    mealType: addingMeal.mealType,
                    recipeId,
                    quickMeal,
                    servings,
                }),
            });
            const data = await res.json();
            setMeals([...meals, data.meal]);
            setAddingMeal(null);
        } catch (error) {
            console.error("Failed to add meal:", error);
        }
    };

    const handleDeleteMeal = async (mealId: string) => {
        try {
            await fetch(`/api/v1/planned-meals/${mealId}`, { method: "DELETE" });
            setMeals(meals.filter((m) => m.id !== mealId));
        } catch (error) {
            console.error("Failed to delete meal:", error);
        }
    };

    const handleMarkCooked = async (mealId: string) => {
        try {
            await fetch(`/api/v1/planned-meals/${mealId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "cooked" }),
            });
            setMeals(
                meals.map((m) => (m.id === mealId ? { ...m, status: "cooked" } : m))
            );
        } catch (error) {
            console.error("Failed to mark cooked:", error);
        }
    };

    const changeWeek = (delta: number) => {
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() + delta * 7);
        setWeekStart(newDate);
    };

    const getDates = () => {
        return DAYS.map((_, i) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            return date;
        });
    };

    const getMealForSlot = (date: Date, mealType: string) => {
        return meals.find((m) => {
            const mealDate = new Date(m.date);
            return (
                mealDate.toDateString() === date.toDateString() &&
                m.mealType === mealType
            );
        });
    };

    const dates = getDates();

    return (
        <div className="flex flex-col h-full bg-cream">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-cream border-b border-clay/20 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={() => changeWeek(-1)}
                        className="p-2 text-charcoal/60"
                    >
                        ← Prev
                    </button>
                    <h1 className="text-lg font-display font-semibold text-charcoal">
                        {weekStart.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                        })}{" "}
                        -{" "}
                        {dates[6].toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                        })}
                    </h1>
                    <button onClick={() => changeWeek(1)} className="p-2 text-charcoal/60">
                        Next →
                    </button>
                </div>

                {/* Summary */}
                <div className="text-center text-sm text-charcoal/60">
                    {meals.filter((m) => m.status === "planned").length} planned ·{" "}
                    {meals.filter((m) => m.status === "cooked").length} cooked
                </div>
            </div>

            {/* Week Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-pulse text-charcoal/40">Loading...</div>
                    </div>
                ) : !mealPlan ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <div className="text-4xl mb-3">📅</div>
                        <p className="text-charcoal/60 mb-4">No plan for this week yet</p>
                        <button
                            onClick={createMealPlan}
                            className="px-6 py-2 rounded-xl bg-herb text-white font-medium"
                        >
                            Start Planning
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {dates.map((date, dayIndex) => (
                            <div
                                key={dayIndex}
                                className="bg-white rounded-xl border border-clay/20 overflow-hidden"
                            >
                                <div className="px-4 py-2 bg-cream border-b border-clay/10 flex items-center justify-between">
                                    <span className="font-medium text-charcoal">
                                        {DAYS[dayIndex]}
                                    </span>
                                    <span className="text-sm text-charcoal/60">
                                        {date.toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </span>
                                </div>
                                <div className="divide-y divide-clay/10">
                                    {MEAL_TYPES.map((mealType) => {
                                        const meal = getMealForSlot(date, mealType);
                                        return (
                                            <MealSlot
                                                key={mealType}
                                                mealType={mealType}
                                                meal={meal}
                                                onAdd={() => setAddingMeal({ date, mealType })}
                                                onDelete={meal ? () => handleDeleteMeal(meal.id) : undefined}
                                                onMarkCooked={
                                                    meal && meal.status === "planned"
                                                        ? () => handleMarkCooked(meal.id)
                                                        : undefined
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Meal Sheet */}
            <AnimatePresence>
                {addingMeal && (
                    <AddMealSheet
                        mealType={addingMeal.mealType}
                        date={addingMeal.date}
                        onAdd={handleAddMeal}
                        onClose={() => setAddingMeal(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
