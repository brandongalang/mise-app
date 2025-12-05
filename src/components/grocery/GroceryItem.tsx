"use client";

interface GroceryItemType {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    isChecked: boolean;
}

interface GroceryItemProps {
    item: GroceryItemType;
    onToggle: (checked: boolean) => void;
    onDelete: () => void;
}

export default function GroceryItem({
    item,
    onToggle,
    onDelete,
}: GroceryItemProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <button
                onClick={() => onToggle(!item.isChecked)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.isChecked
                        ? "bg-herb border-herb text-white"
                        : "border-clay/40"
                    }`}
            >
                {item.isChecked && "✓"}
            </button>

            <div className="flex-1 min-w-0">
                <span
                    className={`${item.isChecked ? "line-through text-charcoal/40" : "text-charcoal"
                        }`}
                >
                    {item.name}
                </span>
                <span className="text-charcoal/40 ml-2">
                    {item.quantity} {item.unit}
                </span>
            </div>

            <button onClick={onDelete} className="text-charcoal/30 hover:text-tomato">
                ✕
            </button>
        </div>
    );
}
