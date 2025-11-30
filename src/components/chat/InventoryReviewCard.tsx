'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Check, ArrowRight } from 'lucide-react';

interface InventoryReviewCardProps {
  items: any[];
  onReview: () => void;
}

export function InventoryReviewCard({ items, onReview }: InventoryReviewCardProps) {
  const itemCount = items.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-sm bg-white rounded-xl border border-terracotta/20 shadow-sm overflow-hidden mt-2"
    >
      <div className="p-4 flex items-center justify-between">
        <div>
          <h4 className="font-display font-semibold text-espresso">
            Items Detected
          </h4>
          <p className="text-sm text-latte">
            I found {itemCount} item{itemCount !== 1 ? 's' : ''} in your image.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
          <Edit2 className="w-5 h-5 text-terracotta" />
        </div>
      </div>

      <div className="bg-parchment/30 px-4 py-3 border-t border-terracotta/10 flex items-center justify-between">
        <div className="flex -space-x-2">
           {/* Stacked previews if we had images, for now just simple indicators */}
           {[...Array(Math.min(3, itemCount))].map((_, i) => (
             <div key={i} className="w-6 h-6 rounded-full bg-terracotta/20 border-2 border-white flex items-center justify-center text-[10px] text-terracotta font-bold">
               {i + 1}
             </div>
           ))}
           {itemCount > 3 && (
             <div className="w-6 h-6 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-[10px] text-stone-500 font-bold">
               +{itemCount - 3}
             </div>
           )}
        </div>

        <button
          onClick={onReview}
          className="flex items-center gap-2 text-sm font-bold text-terracotta hover:text-cayenne transition-colors"
        >
          Review & Save <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
