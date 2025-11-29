'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { QuickActionChips } from './QuickActionChips';
import { ThinkingIndicator } from './ThinkingIndicator';
import { RecipeCard } from '@/lib/types';
import { InventorySheet } from '@/components/inventory/InventorySheet';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Sparkles } from 'lucide-react';

interface ChatContainerProps {
    className?: string;
}

export function ChatContainer({ className }: ChatContainerProps) {
    const { messages, isThinking, thinkingText, sendMessage } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleQuickAction = (action: 'scan' | 'recipe' | 'inventory') => {
        switch (action) {
            case 'scan':
                break;
            case 'recipe':
                sendMessage("What can I cook with my current inventory?");
                break;
            case 'inventory':
                setIsInventoryOpen(true);
                break;
        }
    };

    const handleRecipeExpand = (recipe: RecipeCard) => {
        console.log('Expand recipe:', recipe);
    };

    return (
        <div className={`flex flex-col h-full bg-ivory ${className}`}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {messages.length === 0 ? (
                        <motion.div
                            key="empty-state"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center justify-center h-full text-center px-8 py-12"
                        >
                            {/* Animated icon */}
                            <motion.div
                                className="relative mb-6"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-terracotta/20 to-marigold/20 flex items-center justify-center">
                                    <ChefHat className="w-10 h-10 text-terracotta" strokeWidth={1.5} />
                                </div>
                                <motion.div
                                    className="absolute -top-1 -right-1"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 10, -10, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <Sparkles className="w-6 h-6 text-marigold" />
                                </motion.div>
                            </motion.div>

                            {/* Welcome text */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            >
                                <h2 className="font-display text-2xl font-bold text-espresso mb-2">
                                    Welcome to Mise
                                </h2>
                                <p className="text-latte max-w-xs mx-auto leading-relaxed">
                                    Your kitchen companion. Scan receipts, track what's fresh, and discover what to cook.
                                </p>
                            </motion.div>

                            {/* Decorative line */}
                            <motion.div
                                className="mt-6 mb-2 w-12 h-0.5 rounded-full bg-gradient-to-r from-terracotta to-marigold"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                            />

                            {/* Hint text */}
                            <motion.p
                                className="text-sm text-warm-gray font-accent text-lg"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                            >
                                Try asking "What's expiring soon?"
                            </motion.p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="messages"
                            className="p-4 space-y-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: index * 0.05
                                    }}
                                >
                                    <MessageBubble
                                        message={msg}
                                        onRecipeExpand={handleRecipeExpand}
                                    />
                                </motion.div>
                            ))}

                            {isThinking && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <ThinkingIndicator text={thinkingText} />
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Section - Quick Actions & Input */}
            <div className="relative z-10">
                {/* Gradient fade */}
                <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-ivory to-transparent pointer-events-none" />

                <div className="bg-ivory pt-2 pb-safe-bottom">
                    <AnimatePresence>
                        {messages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.3 }}
                                className="mb-3"
                            >
                                <QuickActionChips onAction={handleQuickAction} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <ChatInput onSend={sendMessage} disabled={isThinking} />
                </div>
            </div>

            <InventorySheet
                open={isInventoryOpen}
                onClose={() => setIsInventoryOpen(false)}
            />
        </div>
    );
}
