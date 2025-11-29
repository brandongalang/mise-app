'use client';

import { Message, RecipeCard } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { RecipePreviewCard } from './RecipePreviewCard';
import { motion } from 'framer-motion';
import { User, ChefHat } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
    onRecipeExpand?: (recipe: RecipeCard) => void;
}

export function MessageBubble({ message, onRecipeExpand }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <div className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
            {/* Avatar for assistant */}
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-terracotta/20 to-marigold/20 flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-terracotta" />
                </div>
            )}

            <div className="max-w-[80%] space-y-2">
                {/* Message Bubble */}
                <motion.div
                    className={cn(
                        "px-4 py-3 shadow-sm",
                        isUser
                            ? "bg-terracotta text-white rounded-2xl rounded-tr-md"
                            : "bg-warm-white border border-clay/15 text-espresso rounded-2xl rounded-tl-md"
                    )}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {message.attachments.map((att, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "relative w-20 h-20 rounded-lg overflow-hidden",
                                        isUser ? "border border-white/20" : "border border-clay/20"
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
                    <div className={cn(
                        "whitespace-pre-wrap text-[15px] leading-relaxed",
                        isUser ? "text-white" : "text-espresso"
                    )}>
                        {message.content}
                    </div>
                </motion.div>

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
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-terracotta/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-terracotta" />
                </div>
            )}
        </div>
    );
}
