"use client";

interface Recipe {
    id: string;
    title: string;
    description?: string;
    timeMinutes?: number;
    servings: number;
    isFavorite: boolean;
    timesCooked: number;
    tags?: string;
}

interface RecipeCardProps {
    recipe: Recipe;
    onTap: () => void;
    onToggleFavorite: () => void;
}

export default function RecipeCard({
    recipe,
    onTap,
    onToggleFavorite,
}: RecipeCardProps) {
    const tags = recipe.tags ? JSON.parse(recipe.tags) : [];

    return (
        <div
            onClick={onTap}
            className="bg-white rounded-xl p-4 border border-clay/20 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className="font-display font-medium text-charcoal text-lg truncate">
                        {recipe.title}
                    </h3>
                    {recipe.description && (
                        <p className="text-sm text-charcoal/60 line-clamp-2 mt-1">
                            {recipe.description}
                        </p>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite();
                    }}
                    className="ml-2 text-2xl"
                >
                    {recipe.isFavorite ? "⭐" : "☆"}
                </button>
            </div>

            <div className="flex items-center gap-3 mt-3 text-sm text-charcoal/60">
                {recipe.timeMinutes && (
                    <span className="flex items-center gap-1">
                        ⏱️ {recipe.timeMinutes} min
                    </span>
                )}
                <span className="flex items-center gap-1">
                    👥 {recipe.servings} servings
                </span>
                {recipe.timesCooked > 0 && (
                    <span className="flex items-center gap-1">
                        🍳 Made {recipe.timesCooked}x
                    </span>
                )}
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {tags.slice(0, 3).map((tag: string) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 bg-cream rounded-full text-xs text-charcoal/60"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
