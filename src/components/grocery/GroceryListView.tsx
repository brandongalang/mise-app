"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GroceryItem from "./GroceryItem";

interface GroceryItemType {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category?: string;
    isChecked: boolean;
    source: string;
}

interface GroceryListType {
    id: string;
    status: string;
    mealPlanId?: string;
    createdAt: string;
}

const CATEGORY_ORDER = [
    "produce",
    "protein",
    "dairy",
    "bakery",
    "pantry",
    "frozen",
    "other",
];

const CATEGORY_LABELS: Record<string, string> = {
    produce: "🥬 Produce",
    protein: "🍗 Protein",
    dairy: "🥛 Dairy",
    bakery: "🍞 Bakery",
    pantry: "🥫 Pantry",
    frozen: "❄️ Frozen",
    other: "📦 Other",
};

export default function GroceryListView() {
    const [groceryList, setGroceryList] = useState<GroceryListType | null>(null);
    const [items, setItems] = useState<GroceryItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingItem, setAddingItem] = useState(false);
    const [newItemName, setNewItemName] = useState("");

    useEffect(() => {
        fetchGroceryList();
    }, []);

    const fetchGroceryList = async () => {
        try {
            const res = await fetch("/api/v1/grocery-lists");
            const data = await res.json();
            setGroceryList(data.groceryList);
            setItems(data.items || []);
        } catch (error) {
            console.error("Failed to fetch grocery list:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleItem = async (itemId: string, isChecked: boolean) => {
        try {
            await fetch(`/api/v1/grocery-items/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isChecked }),
            });
            setItems(
                items.map((item) =>
                    item.id === itemId ? { ...item, isChecked } : item
                )
            );
        } catch (error) {
            console.error("Failed to toggle item:", error);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        try {
            await fetch(`/api/v1/grocery-items/${itemId}`, { method: "DELETE" });
            setItems(items.filter((item) => item.id !== itemId));
        } catch (error) {
            console.error("Failed to delete item:", error);
        }
    };

    const handleAddItem = async () => {
        if (!newItemName.trim() || !groceryList) return;

        try {
            const res = await fetch(`/api/v1/grocery-lists/${groceryList.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newItemName.trim() }),
            });
            const data = await res.json();
            setItems([...items, data.item]);
            setNewItemName("");
            setAddingItem(false);
        } catch (error) {
            console.error("Failed to add item:", error);
        }
    };

    const handleCompleteShopping = async () => {
        if (!groceryList) return;

        const checkedCount = items.filter((i) => i.isChecked).length;
        if (checkedCount === 0) {
            alert("Check off items you bought first!");
            return;
        }

        if (
            !confirm(
                `Add ${checkedCount} items to your inventory and complete shopping?`
            )
        )
            return;

        try {
            await fetch(`/api/v1/grocery-lists/${groceryList.id}`, {
                method: "POST",
            });
            // Refresh to show empty list
            fetchGroceryList();
        } catch (error) {
            console.error("Failed to complete shopping:", error);
        }
    };

    const groupedItems = CATEGORY_ORDER.map((cat) => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        items: items.filter((i) => (i.category || "other") === cat),
    })).filter((g) => g.items.length > 0);

    const checkedCount = items.filter((i) => i.isChecked).length;
    const totalCount = items.length;

    return (
        <div className="flex flex-col h-full bg-cream">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-cream border-b border-clay/20 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-display font-semibold text-charcoal">
                        Grocery List
                    </h1>
                    {totalCount > 0 && (
                        <span className="text-sm text-charcoal/60">
                            {checkedCount}/{totalCount}
                        </span>
                    )}
                </div>

                {/* Progress bar */}
                {totalCount > 0 && (
                    <div className="h-1.5 bg-clay/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-herb transition-all"
                            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-pulse text-charcoal/40">Loading...</div>
                    </div>
                ) : !groceryList || items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <div className="text-4xl mb-3">🛒</div>
                        <p className="text-charcoal/60 mb-2">No grocery list</p>
                        <p className="text-sm text-charcoal/40">
                            Plan your meals and generate a list
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedItems.map((group) => (
                            <div key={group.category}>
                                <h3 className="text-sm font-medium text-charcoal/60 mb-2">
                                    {group.label}
                                </h3>
                                <div className="bg-white rounded-xl border border-clay/20 divide-y divide-clay/10">
                                    {group.items.map((item) => (
                                        <GroceryItem
                                            key={item.id}
                                            item={item}
                                            onToggle={(checked: boolean) => handleToggleItem(item.id, checked)}
                                            onDelete={() => handleDeleteItem(item.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Item */}
            <AnimatePresence>
                {addingItem && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-clay/20 bg-white px-4 py-3"
                    >
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="Item name..."
                                className="flex-1 px-3 py-2 rounded-lg border border-clay/30 focus:outline-none focus:ring-2 focus:ring-herb/50"
                                autoFocus
                            />
                            <button
                                onClick={handleAddItem}
                                className="px-4 py-2 rounded-lg bg-herb text-white font-medium"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => setAddingItem(false)}
                                className="px-3 py-2 text-charcoal/60"
                            >
                                ✕
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions */}
            {groceryList && items.length > 0 && (
                <div className="p-4 border-t border-clay/20 flex gap-3">
                    <button
                        onClick={() => setAddingItem(true)}
                        className="px-4 py-3 rounded-xl border border-clay/30 text-charcoal font-medium"
                    >
                        + Add Item
                    </button>
                    <button
                        onClick={handleCompleteShopping}
                        className="flex-1 py-3 rounded-xl bg-herb text-white font-medium disabled:opacity-50"
                        disabled={checkedCount === 0}
                    >
                        ✓ Done Shopping
                    </button>
                </div>
            )}
        </div>
    );
}
