"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Recipe {
    id: string;
    title: string;
    timeMinutes?: number;
    servings: number;
}

interface AddMealSheetProps {
    mealType: string;
    date: Date;
    onAdd: (recipeId?: string, quickMeal?: string, servings?: number) => void;
    onClose: () => void;
}

const QUICK_OPTIONS = [
    { label: "Leftovers", value: "leftovers" },
    { label: "Eating Out", value: "eating_out" },
    { label: "Skip", value: "skip" },
];

export default function AddMealSheet({
    mealType,
    date,
    onAdd,
    onClose,
}: AddMealSheetProps) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [servings, setServings] = useState(2);

    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchRecipes = async () => {
        try {
            const res = await fetch("/api/v1/recipes");
            const data = await res.json();
            setRecipes(data.recipes || []);
        } catch (error) {
            console.error("Failed to fetch recipes:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-cream rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
                {/* Handle */}
                <div className="flex justify-center py-2">
                    <div className="w-12 h-1 bg-clay/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 pb-3 border-b border-clay/20">
                    <h2 className="text-xl font-display font-semibold text-charcoal capitalize">
                        Add {mealType}
                    </h2>
                    <p className="text-sm text-charcoal/60">
                        {date.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                        })}
                    </p>
                </div>

                {/* Servings */}
                <div className="px-4 py-3 border-b border-clay/20 flex items-center justify-between">
                    <span className="text-charcoal">Servings</span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setServings(Math.max(1, servings - 1))}
                            className="w-8 h-8 rounded-full bg-clay/20 text-lg"
                        >
                            −
                        </button>
                        <span className="w-8 text-center font-medium">{servings}</span>
                        <button
                            onClick={() => setServings(servings + 1)}
                            className="w-8 h-8 rounded-full bg-clay/20 text-lg"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Quick Options */}
                <div className="px-4 py-3 border-b border-clay/20">
                    <p className="text-sm text-charcoal/60 mb-2">Quick options</p>
                    <div className="flex gap-2">
                        {QUICK_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => onAdd(undefined, opt.value, servings)}
                                className="px-4 py-2 rounded-full bg-white border border-clay/30 text-sm text-charcoal"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recipes */}
                <div className="flex-1 overflow-y-auto p-4">
                    <p className="text-sm text-charcoal/60 mb-2">From your library</p>
                    {loading ? (
                        <div className="animate-pulse text-charcoal/40">Loading...</div>
                    ) : recipes.length === 0 ? (
                        <p className="text-charcoal/40 text-sm">
                            No recipes saved yet. Generate one in chat!
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recipes.map((recipe) => (
                                <button
                                    key={recipe.id}
                                    onClick={() => onAdd(recipe.id, undefined, servings)}
                                    className="w-full p-3 rounded-lg bg-white border border-clay/20 text-left hover:border-herb transition-colors"
                                >
                                    <p className="font-medium text-charcoal">{recipe.title}</p>
                                    <p className="text-xs text-charcoal/40">
                                        {recipe.timeMinutes && `⏱️ ${recipe.timeMinutes} min · `}
                                        {recipe.servings} servings
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cancel */}
                <div className="p-4 border-t border-clay/20">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl border border-clay/30 text-charcoal font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
