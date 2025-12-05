"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RecipeCard from "./RecipeCard";
import RecipeDetail from "./RecipeDetail";

interface Recipe {
    id: string;
    title: string;
    description?: string;
    ingredients: string;
    steps: string;
    timeMinutes?: number;
    servings: number;
    tags?: string;
    notes?: string;
    isFavorite: boolean;
    timesCooked: number;
    createdAt: string;
    lastCookedAt?: string;
}

export default function RecipeLibrary() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "favorites">("all");
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    useEffect(() => {
        fetchRecipes();
    }, [filter]);

    const fetchRecipes = async () => {
        try {
            const url =
                filter === "favorites"
                    ? "/api/v1/recipes?favorites=true"
                    : "/api/v1/recipes";
            const res = await fetch(url);
            const data = await res.json();
            setRecipes(data.recipes || []);
        } catch (error) {
            console.error("Failed to fetch recipes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFavorite = async (recipe: Recipe) => {
        try {
            await fetch(`/api/v1/recipes/${recipe.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isFavorite: !recipe.isFavorite }),
            });
            fetchRecipes();
        } catch (error) {
            console.error("Failed to toggle favorite:", error);
        }
    };

    const handleDeleteRecipe = async (recipeId: string) => {
        if (!confirm("Delete this recipe?")) return;
        try {
            await fetch(`/api/v1/recipes/${recipeId}`, { method: "DELETE" });
            setSelectedRecipe(null);
            fetchRecipes();
        } catch (error) {
            console.error("Failed to delete recipe:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-cream">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-cream border-b border-clay/20 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-2xl font-display font-semibold text-charcoal">
                        Recipes
                    </h1>
                    <span className="text-sm text-charcoal/60">
                        {recipes.length} saved
                    </span>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === "all"
                                ? "bg-herb text-white"
                                : "bg-white text-charcoal border border-clay/30"
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("favorites")}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === "favorites"
                                ? "bg-herb text-white"
                                : "bg-white text-charcoal border border-clay/30"
                            }`}
                    >
                        ⭐ Favorites
                    </button>
                </div>
            </div>

            {/* Recipe Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-pulse text-charcoal/40">Loading...</div>
                    </div>
                ) : recipes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <div className="text-4xl mb-3">📖</div>
                        <p className="text-charcoal/60">
                            {filter === "favorites"
                                ? "No favorite recipes yet"
                                : "No recipes saved yet"}
                        </p>
                        <p className="text-sm text-charcoal/40 mt-1">
                            Generate recipes in chat and save them here
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        <AnimatePresence>
                            {recipes.map((recipe) => (
                                <motion.div
                                    key={recipe.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <RecipeCard
                                        recipe={recipe}
                                        onTap={() => setSelectedRecipe(recipe)}
                                        onToggleFavorite={() => handleToggleFavorite(recipe)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Recipe Detail Modal */}
            <AnimatePresence>
                {selectedRecipe && (
                    <RecipeDetail
                        recipe={selectedRecipe}
                        onClose={() => setSelectedRecipe(null)}
                        onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
                        onToggleFavorite={() => handleToggleFavorite(selectedRecipe)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
