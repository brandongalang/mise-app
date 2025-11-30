'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { api } from '@/db/supabase'; // Direct DB access for simplicity in MVP
import { addInventoryTool } from '@/agent/tools/definitions'; // Re-use the add logic indirectly via API call mapping

interface InventoryItemDraft {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  confidence?: number;
}

interface InventoryReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItems: InventoryItemDraft[];
  onSave: (items: InventoryItemDraft[]) => Promise<void>;
}

const CATEGORIES = [
  "produce", "protein", "dairy", "pantry", "frozen", "beverage", "condiment", "grain", "spice", "unknown"
];

export function InventoryReviewSheet({ open, onOpenChange, initialItems, onSave }: InventoryReviewSheetProps) {
  const [items, setItems] = useState<InventoryItemDraft[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateItem = (index: number, field: keyof InventoryItemDraft, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setItems([...items, { name: "", quantity: 1, unit: "count", category: "unknown" }]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(items);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save items:", error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-ivory flex flex-col rounded-t-[10px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 focus:outline-none shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="p-4 bg-ivory rounded-t-[10px] flex-1 flex flex-col overflow-hidden">
            {/* Handle */}
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-stone-300 mb-6" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 px-2">
              <Drawer.Title className="font-display font-bold text-2xl text-espresso">
                Review Items
              </Drawer.Title>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-stone-500" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-24">
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm relative group"
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-4 mb-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Item Name</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                            className="w-full text-lg font-display font-semibold text-espresso border-none p-0 focus:ring-0 placeholder:text-stone-300"
                            placeholder="e.g. Bananas"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteItem(index)}
                          className="text-stone-300 hover:text-cayenne transition-colors p-1"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Qty</label>
                           <input
                             type="number"
                             value={item.quantity}
                             onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value))}
                             className="w-full bg-parchment/50 rounded-lg px-3 py-2 text-sm font-bold text-espresso border-transparent focus:border-terracotta focus:ring-0"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Unit</label>
                           <input
                             type="text"
                             value={item.unit}
                             onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                             className="w-full bg-parchment/50 rounded-lg px-3 py-2 text-sm font-bold text-espresso border-transparent focus:border-terracotta focus:ring-0"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Category</label>
                           <select
                             value={item.category}
                             onChange={(e) => handleUpdateItem(index, 'category', e.target.value)}
                             className="w-full bg-parchment/50 rounded-lg px-3 py-2 text-sm font-bold text-espresso border-transparent focus:border-terracotta focus:ring-0 appearance-none"
                           >
                             {CATEGORIES.map(cat => (
                               <option key={cat} value={cat}>{cat}</option>
                             ))}
                           </select>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <button
                onClick={handleAddItem}
                className="w-full mt-4 py-3 border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center gap-2 text-stone-500 font-bold hover:border-terracotta hover:text-terracotta transition-colors"
              >
                <Plus className="w-5 h-5" /> Add Item manually
              </button>
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200">
              <button
                onClick={handleSave}
                disabled={isSaving || items.length === 0}
                className="w-full py-3.5 bg-terracotta text-white rounded-xl font-bold text-lg shadow-lg shadow-terracotta/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-terracotta-dark transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Save {items.length} Items
                  </>
                )}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
