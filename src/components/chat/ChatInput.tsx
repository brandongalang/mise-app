'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, Mic } from 'lucide-react';
import { Attachment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { resizeImage, ImageValidationError } from '@/lib/image-utils';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
    onSend: (message: string, attachments?: Attachment[]) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Ask about your kitchen..." }: ChatInputProps) {
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasContent = text.trim() || attachments.length > 0;

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [text]);

    const handleSend = () => {
        if (!hasContent || disabled) return;
        onSend(text, attachments);
        setText('');
        setAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null); // Clear any previous errors
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const base64 = await resizeImage(file, 800, 0.7);
                setAttachments(prev => [...prev, {
                    type: 'image',
                    data: base64,
                    mimeType: file.type
                }]);
            } catch (err) {
                if (err instanceof ImageValidationError) {
                    setError(err.message);
                } else {
                    setError("Failed to process image. Please try again.");
                    console.error("Failed to process image", err);
                }
                // Auto-dismiss error after 5 seconds
                setTimeout(() => setError(null), 5000);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="px-4 pb-2">
            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-3 p-3 bg-cayenne/10 border border-cayenne/20 rounded-xl flex items-center gap-2"
                    >
                        <span className="text-cayenne text-sm flex-1">{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="text-cayenne/60 hover:text-cayenne transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Attachments Preview */}
            <AnimatePresence>
                {attachments.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar"
                    >
                        {attachments.map((att, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="relative w-16 h-16 shrink-0 group"
                            >
                                <Image
                                    src={att.data}
                                    alt="Preview"
                                    fill
                                    className="object-cover rounded-xl border-2 border-clay/20"
                                />
                                <button
                                    onClick={() => removeAttachment(i)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-cayenne text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Container */}
            <motion.div
                className={cn(
                    "flex items-end gap-2 bg-warm-white rounded-2xl p-2 transition-all duration-200",
                    "border-2 shadow-sm",
                    isFocused
                        ? "border-terracotta/40 shadow-glow"
                        : "border-clay/15 hover:border-clay/25"
                )}
                animate={{
                    scale: isFocused ? 1.01 : 1
                }}
                transition={{ duration: 0.15 }}
            >
                {/* Camera Button */}
                <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "p-2.5 rounded-xl transition-all",
                        "text-latte hover:text-espresso hover:bg-parchment"
                    )}
                    disabled={disabled}
                    whileTap={{ scale: 0.9 }}
                >
                    <Camera size={22} strokeWidth={1.5} />
                </motion.button>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                />

                {/* Text Input */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className={cn(
                        "flex-1 bg-transparent border-0 focus:ring-0 p-2 min-h-[44px] max-h-[120px]",
                        "resize-none text-base text-espresso",
                        "placeholder:text-warm-gray-light"
                    )}
                />

                {/* Send Button */}
                <motion.button
                    onClick={handleSend}
                    disabled={!hasContent || disabled}
                    className={cn(
                        "p-2.5 rounded-xl transition-all duration-200",
                        hasContent && !disabled
                            ? "bg-terracotta text-white shadow-md hover:bg-terracotta-dark"
                            : "text-warm-gray-light bg-transparent"
                    )}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                        scale: hasContent ? 1 : 0.95,
                        opacity: hasContent ? 1 : 0.5
                    }}
                >
                    <Send
                        size={20}
                        className={cn(
                            "transition-transform",
                            hasContent && "translate-x-0.5"
                        )}
                    />
                </motion.button>
            </motion.div>

            {/* Hint text */}
            <p className="text-center text-xs text-warm-gray mt-2">
                Press Enter to send • Shift+Enter for new line
            </p>
        </div>
    );
}
