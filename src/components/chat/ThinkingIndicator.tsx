'use client';

import { motion } from 'framer-motion';
import { ChefHat } from 'lucide-react';

interface ThinkingIndicatorProps {
    text?: string;
}

export function ThinkingIndicator({ text = "Thinking..." }: ThinkingIndicatorProps) {
    return (
        <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-terracotta/20 to-marigold/20 flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-terracotta" />
            </div>

            {/* Thinking bubble */}
            <motion.div
                className="bg-warm-white border border-clay/15 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="flex items-center gap-3">
                    {/* Animated wave dots */}
                    <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-gradient-to-r from-terracotta to-marigold"
                                animate={{
                                    y: [0, -6, 0],
                                    opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: i * 0.15
                                }}
                            />
                        ))}
                    </div>
                    <span className="text-sm font-medium text-latte">{text}</span>
                </div>
            </motion.div>
        </div>
    );
}
