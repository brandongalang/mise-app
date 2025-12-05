"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface Recipe {
    id: string;
    title: string;
    ingredients: string;
    steps: string;
    timeMinutes?: number;
    servings: number;
}

interface CookModeProps {
    recipe: Recipe;
    servings: number;
    onComplete: (portions?: number) => void;
    onClose: () => void;
}

export default function CookMode({
    recipe,
    servings,
    onComplete,
    onClose,
}: CookModeProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [showComplete, setShowComplete] = useState(false);
    const [leftoverPortions, setLeftoverPortions] = useState(0);

    const steps = recipe.steps
        .split(/\n(?=\d+\.|Step)/i)
        .filter((s) => s.trim())
        .map((s) => s.replace(/^\d+\.\s*/, "").trim());

    const ingredients = recipe.ingredients.split("\n").filter((i) => i.trim());

    const handleComplete = () => {
        onComplete(leftoverPortions > 0 ? leftoverPortions : undefined);
    };

    if (showComplete) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-cream flex flex-col"
            >
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-display font-semibold text-charcoal mb-2">
                        Done Cooking!
                    </h2>
                    <p className="text-charcoal/60 mb-8">
                        How many portions of leftovers?
                    </p>

                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => setLeftoverPortions(Math.max(0, leftoverPortions - 1))}
                            className="w-12 h-12 rounded-full bg-clay/20 text-xl font-bold"
                        >
                            −
                        </button>
                        <span className="text-4xl font-display font-semibold w-16 text-center">
                            {leftoverPortions}
                        </span>
                        <button
                            onClick={() => setLeftoverPortions(leftoverPortions + 1)}
                            className="w-12 h-12 rounded-full bg-clay/20 text-xl font-bold"
                        >
                            +
                        </button>
                    </div>

                    <p className="text-sm text-charcoal/40 mb-4">
                        {leftoverPortions === 0
                            ? "No leftovers"
                            : `${leftoverPortions} portion${leftoverPortions > 1 ? "s" : ""} saved`}
                    </p>
                </div>

                <div className="p-4 flex gap-3">
                    <button
                        onClick={() => setShowComplete(false)}
                        className="px-4 py-3 rounded-xl border border-clay/30 text-charcoal font-medium"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleComplete}
                        className="flex-1 py-3 rounded-xl bg-herb text-white font-medium"
                    >
                        ✅ Save & Close
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-cream flex flex-col"
        >
            {/* Header */}
            <div className="bg-herb text-white px-4 py-3 flex items-center justify-between">
                <button onClick={onClose} className="text-white/80">
                    ✕ Exit
                </button>
                <h1 className="font-display font-semibold truncate mx-4">
                    {recipe.title}
                </h1>
                <span className="text-sm text-white/80">
                    {currentStep === 0 ? "Prep" : `${currentStep}/${steps.length}`}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {currentStep === 0 ? (
                    /* Ingredients View */
                    <div className="p-4">
                        <h2 className="text-lg font-display font-semibold text-charcoal mb-4">
                            Ingredients
                            <span className="text-sm font-normal text-charcoal/60 ml-2">
                                ({servings} servings)
                            </span>
                        </h2>
                        <div className="space-y-2">
                            {ingredients.map((ing, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-clay/20"
                                >
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-clay/30"
                                    />
                                    <span className="text-charcoal">{ing}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Step View */
                    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
                        <div className="text-sm text-charcoal/40 mb-2">
                            Step {currentStep} of {steps.length}
                        </div>
                        <p className="text-xl text-charcoal text-center leading-relaxed max-w-md">
                            {steps[currentStep - 1]}
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="p-4 border-t border-clay/20 flex gap-3">
                {currentStep > 0 && (
                    <button
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="px-6 py-3 rounded-xl border border-clay/30 text-charcoal font-medium"
                    >
                        ← Back
                    </button>
                )}

                {currentStep < steps.length ? (
                    <button
                        onClick={() => setCurrentStep(currentStep + 1)}
                        className="flex-1 py-3 rounded-xl bg-herb text-white font-medium"
                    >
                        {currentStep === 0 ? "Start Cooking →" : "Next Step →"}
                    </button>
                ) : (
                    <button
                        onClick={() => setShowComplete(true)}
                        className="flex-1 py-3 rounded-xl bg-herb text-white font-medium"
                    >
                        ✅ Done Cooking
                    </button>
                )}
            </div>
        </motion.div>
    );
}
