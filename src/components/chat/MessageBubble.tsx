'use client';

import React from 'react';

import { Message, RecipeCard } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { RecipePreviewCard } from './RecipePreviewCard';
import { ToolCallsContainer } from './ToolCall';
import { motion } from 'framer-motion';
import { User, ChefHat } from 'lucide-react';
import { Streamdown } from 'streamdown';

interface MessageBubbleProps {
    message: Message;
    isStreaming?: boolean;
    onRecipeExpand?: (recipe: RecipeCard) => void;
}

export const MessageBubble = React.memo(function MessageBubble({ message, isStreaming = false, onRecipeExpand }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const hasToolCalls = !isUser && message.toolCalls && message.toolCalls.length > 0;
    const hasContent = message.content && message.content.trim().length > 0;

    return (
        <div className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
            {/* Avatar for assistant */}
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cream-dark border border-clay-light flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-clay" />
                </div>
            )}

            <div className="max-w-[85%] space-y-2">
                {/* Tool Calls (shown before message content) */}
                {hasToolCalls && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <ToolCallsContainer tools={message.toolCalls!} />
                    </motion.div>
                )}

                {/* Message Bubble */}
                {(hasContent || isUser || message.attachments?.length) && (
                    <motion.div
                        className={cn(
                            "px-4 py-3 shadow-sm relative overflow-hidden",
                            isUser
                                ? "bg-herb text-white rounded-2xl rounded-tr-sm"
                                : "bg-white border border-clay-light text-charcoal rounded-2xl rounded-tl-sm"
                        )}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap relative z-10">
                                {message.attachments.map((att, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "relative w-16 h-16 rounded-lg overflow-hidden shadow-sm",
                                            isUser ? "border border-white/20" : "border border-clay-light"
                                        )}
                                    >
                                        <Image
                                            src={att.data}
                                            alt="Attachment"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Message Content */}
                        {hasContent && (
                            <div className={cn(
                                "text-[16px] leading-relaxed relative z-10 font-body",
                                isUser ? "text-white whitespace-pre-wrap font-medium" : "text-charcoal"
                            )}>
                                {isUser ? (
                                    // Plain text for user messages
                                    message.content
                                ) : (
                                    // Streamdown for assistant messages - handles streaming markdown
                                    <div className="streamdown-content">
                                        <Streamdown
                                            mode={isStreaming ? "streaming" : "static"}
                                            parseIncompleteMarkdown={isStreaming}
                                        >
                                            {message.content}
                                        </Streamdown>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Recipe Card */}
                {message.actionCard && message.actionCard.type === 'recipe' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <RecipePreviewCard
                            recipe={message.actionCard}
                            onExpand={() => onRecipeExpand?.(message.actionCard as RecipeCard)}
                        />
                    </motion.div>
                )}
            </div>

            {/* Avatar for user */}
            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-herb/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-herb" />
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
        prevProps.isStreaming === nextProps.isStreaming &&
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.content === nextProps.message.content &&
        prevProps.message.toolCalls?.length === nextProps.message.toolCalls?.length &&
        prevProps.message.actionCard === nextProps.message.actionCard
    );
});
