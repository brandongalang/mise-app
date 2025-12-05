"use client";

interface PlannedMeal {
    id: string;
    mealType: string;
    recipeId?: string;
    quickMeal?: string;
    servings: number;
    status: string;
    recipeTitle?: string;
    recipeTimeMinutes?: number;
}

interface MealSlotProps {
    mealType: string;
    meal?: PlannedMeal;
    onAdd: () => void;
    onDelete?: () => void;
    onMarkCooked?: () => void;
}

const MEAL_ICONS: Record<string, string> = {
    breakfast: "🍳",
    lunch: "🥗",
    dinner: "🍽️",
};

export default function MealSlot({
    mealType,
    meal,
    onAdd,
    onDelete,
    onMarkCooked,
}: MealSlotProps) {
    if (!meal) {
        return (
            <button
                onClick={onAdd}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-cream/50 transition-colors"
            >
                <span className="text-xl opacity-40">{MEAL_ICONS[mealType]}</span>
                <span className="text-charcoal/40 capitalize">{mealType}</span>
                <span className="ml-auto text-charcoal/30">+ Add</span>
            </button>
        );
    }

    return (
        <div className="px-4 py-3 flex items-center gap-3">
            <span className="text-xl">{MEAL_ICONS[mealType]}</span>
            <div className="flex-1 min-w-0">
                <p
                    className={`font-medium truncate ${meal.status === "cooked" ? "text-charcoal/40 line-through" : "text-charcoal"
                        }`}
                >
                    {meal.recipeTitle || meal.quickMeal || "Meal"}
                </p>
                {meal.recipeTimeMinutes && (
                    <p className="text-xs text-charcoal/40">
                        ⏱️ {meal.recipeTimeMinutes} min · {meal.servings} servings
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2">
                {meal.status === "cooked" ? (
                    <span className="text-herb">✓</span>
                ) : (
                    onMarkCooked && (
                        <button
                            onClick={onMarkCooked}
                            className="text-xs px-2 py-1 rounded bg-herb/10 text-herb"
                        >
                            Done
                        </button>
                    )
                )}
                {onDelete && (
                    <button onClick={onDelete} className="text-charcoal/30">
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}
