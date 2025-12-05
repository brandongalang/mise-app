"use client";

import { motion } from "framer-motion";
import { useState } from "react";

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
}

interface RecipeDetailProps {
    recipe: Recipe;
    onClose: () => void;
    onDelete: () => void;
    onToggleFavorite: () => void;
}

export default function RecipeDetail({
    recipe,
    onClose,
    onDelete,
    onToggleFavorite,
}: RecipeDetailProps) {
    const [activeTab, setActiveTab] = useState<"ingredients" | "steps">(
        "ingredients"
    );
    const [notes, setNotes] = useState(recipe.notes || "");
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const saveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await fetch(`/api/v1/recipes/${recipe.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            });
        } catch (error) {
            console.error("Failed to save notes:", error);
        } finally {
            setIsSavingNotes(false);
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
                className="w-full bg-cream rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Handle */}
                <div className="flex justify-center py-2">
                    <div className="w-12 h-1 bg-clay/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 pb-3 border-b border-clay/20">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-display font-semibold text-charcoal">
                                {recipe.title}
                            </h2>
                            <div className="flex items-center gap-3 mt-1 text-sm text-charcoal/60">
                                {recipe.timeMinutes && <span>⏱️ {recipe.timeMinutes} min</span>}
                                <span>👥 {recipe.servings} servings</span>
                            </div>
                        </div>
                        <button onClick={onToggleFavorite} className="text-2xl">
                            {recipe.isFavorite ? "⭐" : "☆"}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-clay/20">
                    <button
                        onClick={() => setActiveTab("ingredients")}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === "ingredients"
                                ? "text-herb border-b-2 border-herb"
                                : "text-charcoal/60"
                            }`}
                    >
                        Ingredients
                    </button>
                    <button
                        onClick={() => setActiveTab("steps")}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === "steps"
                                ? "text-herb border-b-2 border-herb"
                                : "text-charcoal/60"
                            }`}
                    >
                        Steps
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === "ingredients" ? (
                        <div className="whitespace-pre-wrap text-charcoal leading-relaxed">
                            {recipe.ingredients}
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap text-charcoal leading-relaxed">
                            {recipe.steps}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="mt-6 pt-4 border-t border-clay/20">
                        <label className="block text-sm font-medium text-charcoal/60 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            onBlur={saveNotes}
                            placeholder="Add cooking notes..."
                            className="w-full p-3 rounded-lg border border-clay/30 bg-white text-charcoal resize-none focus:outline-none focus:ring-2 focus:ring-herb/50"
                            rows={3}
                        />
                        {isSavingNotes && (
                            <p className="text-xs text-charcoal/40 mt-1">Saving...</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-clay/20 flex gap-3">
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 rounded-lg border border-tomato/30 text-tomato text-sm font-medium"
                    >
                        Delete
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg bg-herb text-white font-medium"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
