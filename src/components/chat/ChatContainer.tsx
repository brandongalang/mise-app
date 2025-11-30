'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useInventory } from '@/hooks/useInventory';
import { ChatInput, ChatInputHandle } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { QuickActionChips } from './QuickActionChips';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ToolCallsContainer } from './ToolCall';
import { RecipeCard } from '@/lib/types';
import { InventorySheet } from '@/components/inventory/InventorySheet';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Sparkles, AlertCircle, X } from 'lucide-react';
import { InventoryReviewCard } from './InventoryReviewCard';
import { InventoryReviewSheet, InventoryItemDraft } from './InventoryReviewSheet';

interface ChatContainerProps {
    className?: string;
    intent?: 'scan';
    onIntentHandled?: () => void;
}

export function ChatContainer({ className, intent, onIntentHandled }: ChatContainerProps) {
    const { messages, isThinking, isStreaming, thinkingText, activeTools, error, sendMessage, clearError } = useChat();
    const { addItemsOptimistically } = useInventory();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<ChatInputHandle>(null);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);

    // Handle intents
    useEffect(() => {
        if (intent === 'scan' && chatInputRef.current) {
            chatInputRef.current.openCamera();
            onIntentHandled?.();
        }
    }, [intent, onIntentHandled]);

    // Review Sheet State
    const [isReviewSheetOpen, setIsReviewSheetOpen] = useState(false);
    const [reviewItems, setReviewItems] = useState<InventoryItemDraft[]>([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking, isStreaming, activeTools]);

    const handleQuickAction = (text: string, openCamera?: boolean) => {
        chatInputRef.current?.setText(text);
        if (openCamera) {
            chatInputRef.current?.openCamera();
        }
    };

    const handleRecipeExpand = (recipe: RecipeCard) => {
        console.log('Expand recipe:', recipe);
    };

    const handleReviewClick = (items: InventoryItemDraft[]) => {
        setReviewItems(items);
        setIsReviewSheetOpen(true);
    };

    const handleSaveInventory = async (items: InventoryItemDraft[]) => {
        // Use the addInventory tool logic to save to DB
        // Map draft items to the expected AddInventoryItem format
        const itemsToAdd = items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category as any, // TODO: Fix strict type check here by validating category against allowed values
            confidence: 'high' as const,
            source: 'manual' as const,
            container: {
                status: 'SEALED' as const,
                unit: item.unit
            },
            contents: {
                quantity: item.quantity,
                unit: item.unit
            }
        }));

        try {
            await addItemsOptimistically(itemsToAdd);

            // Send confirmation message to chat to close the loop with the agent
            const summary = items.map(i => `${i.quantity} ${i.unit} ${i.name}`).join(', ');
            await sendMessage(`I reviewed the list and confirmed adding these items: ${summary}`);
        } catch (err) {
            console.error("Failed to save inventory:", err);
            // Error toast is handled in useInventory
        }
    };

    // Find the last assistant message for streaming indicator
    const lastAssistantIndex = messages.findLastIndex(m => m.role === 'assistant');
    const hasActiveTools = activeTools.length > 0;

    return (
        <div className={`flex flex-col h-full bg-bg-primary ${className}`}>
            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-cayenne/10 border-b border-cayenne/20 px-4 py-3 flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-cayenne flex-shrink-0" />
                        <p className="text-sm text-cayenne flex-1">{error}</p>
                        <button
                            onClick={clearError}
                            className="p-1 rounded-full hover:bg-cayenne/10 transition-colors"
                        >
                            <X className="w-4 h-4 text-cayenne" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                className="relative mb-8"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <div className="w-24 h-24 rounded-3xl bg-bg-secondary shadow-lg flex items-center justify-center texture-paper border border-border-subtle">
                                    <ChefHat className="w-12 h-12 text-terracotta" strokeWidth={1.5} />
                                </div>
                                <motion.div
                                    className="absolute -top-2 -right-2"
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
                                    <Sparkles className="w-8 h-8 text-marigold" />
                                </motion.div>
                            </motion.div>

                            {/* Welcome text */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="space-y-3"
                            >
                                <h2 className="font-display text-4xl font-bold text-text-primary">
                                    Mise
                                </h2>
                                <p className="text-text-secondary max-w-xs mx-auto leading-relaxed font-body text-lg">
                                    Your personal kitchen assistant.
                                </p>
                            </motion.div>

                            {/* Decorative line */}
                            <motion.div
                                className="mt-8 mb-4 w-16 h-1 rounded-full bg-gradient-to-r from-terracotta to-marigold"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                            />

                            {/* Hint text */}
                            <motion.p
                                className="text-text-tertiary font-accent text-xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                            >
                                &quot;What&apos;s expiring soon?&quot;
                            </motion.p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="messages"
                            className="p-4 space-y-6"
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
                                        isStreaming={isStreaming && index === lastAssistantIndex}
                                        onRecipeExpand={handleRecipeExpand}
                                    />

                                    {/* Generative UI for Tool Calls */}
                                    {msg.role === 'assistant' && msg.toolCalls?.map(tool => {
                                        if (tool.name === 'proposeInventory' && tool.status === 'completed' && tool.args?.items) {
                                            return (
                                                <div key={tool.id} className="ml-12 mt-2 mb-4 max-w-[85%]">
                                                    <InventoryReviewCard
                                                        items={tool.args!.items as InventoryItemDraft[]}
                                                        onReview={() => handleReviewClick(tool.args!.items as InventoryItemDraft[])}
                                                    />
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </motion.div>
                            ))}

                            {/* Active Tool Calls (shown while processing) */}
                            {hasActiveTools && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-bg-secondary flex items-center justify-center border border-border-subtle">
                                        <ChefHat className="w-4 h-4 text-terracotta" />
                                    </div>
                                    <div className="flex-1 max-w-[80%]">
                                        <ToolCallsContainer tools={activeTools} />
                                    </div>
                                </motion.div>
                            )}

                            {/* Thinking Indicator (shown before tools or response) */}
                            {isThinking && !hasActiveTools && (
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
                <div className="absolute -top-12 left-0 right-0 h-12 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none" />

                <div className="bg-bg-primary pt-2 pb-safe-bottom">
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

                    <ChatInput onSend={sendMessage} disabled={isThinking || isStreaming} ref={chatInputRef} />
                </div>
            </div>

            <InventorySheet
                open={isInventoryOpen}
                onClose={() => setIsInventoryOpen(false)}
            />

            <InventoryReviewSheet
                open={isReviewSheetOpen}
                onOpenChange={setIsReviewSheetOpen}
                initialItems={reviewItems}
                onSave={handleSaveInventory}
            />
        </div>
    );
}
