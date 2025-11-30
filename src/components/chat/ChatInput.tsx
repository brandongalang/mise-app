'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Camera, Send, X, ImagePlus } from 'lucide-react';
import { Attachment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { resizeImage, ImageValidationError } from '@/lib/image-utils';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraCapture } from './CameraCapture';

export interface ChatInputHandle {
    setText: (text: string) => void;
    openCamera: () => void;
}

interface ChatInputProps {
    onSend: (message: string, attachments?: Attachment[]) => void;
    disabled?: boolean;
    placeholder?: string;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
    { onSend, disabled, placeholder = "Ask about your kitchen..." },
    ref
) {
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        setText: (newText: string) => {
            setText(newText);
            // Focus the textarea after setting text
            setTimeout(() => textareaRef.current?.focus(), 0);
        },
        openCamera: () => {
            setIsCameraOpen(true);
        },
    }));

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
        setError(null);
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
                setTimeout(() => setError(null), 5000);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCameraCapture = (imageData: string, mimeType: string) => {
        setAttachments(prev => [...prev, {
            type: 'image',
            data: imageData,
            mimeType
        }]);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <>
            <div className="px-4 pb-2">
                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-3 p-3 bg-tomato/10 border border-tomato/20 rounded-xl flex items-center gap-2"
                        >
                            <span className="text-tomato text-sm flex-1">{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="text-tomato/60 hover:text-tomato transition-colors"
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
                                        className="object-cover rounded-xl border border-clay-light"
                                    />
                                    <button
                                        onClick={() => removeAttachment(i)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-tomato text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
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
                        "flex items-end gap-2 bg-white rounded-3xl p-2 transition-all duration-200",
                        "border shadow-sm",
                        isFocused
                            ? "border-clay shadow-md"
                            : "border-clay-light hover:border-clay"
                    )}
                    animate={{
                        scale: isFocused ? 1.01 : 1
                    }}
                    transition={{ duration: 0.15 }}
                >
                    <motion.button
                        onClick={() => setIsCameraOpen(true)}
                        className={cn(
                            "p-2.5 rounded-full transition-all",
                            "text-warm-gray hover:text-charcoal hover:bg-cream"
                        )}
                        disabled={disabled}
                        whileTap={{ scale: 0.9 }}
                        title="Take photo"
                        aria-label="Take photo"
                    >
                        <Camera size={22} strokeWidth={1.5} />
                    </motion.button>

                    <motion.button
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "p-2.5 rounded-full transition-all",
                            "text-warm-gray hover:text-charcoal hover:bg-cream"
                        )}
                        disabled={disabled}
                        whileTap={{ scale: 0.9 }}
                        title="Upload image"
                        aria-label="Upload image"
                    >
                        <ImagePlus size={22} strokeWidth={1.5} />
                    </motion.button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                        aria-hidden="true"
                        tabIndex={-1}
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
                            "resize-none text-base text-charcoal font-body",
                            "placeholder:text-warm-gray-light"
                        )}
                        aria-label="Message input"
                    />

                    {/* Send Button */}
                    <motion.button
                        onClick={handleSend}
                        disabled={!hasContent || disabled}
                        className={cn(
                            "p-2.5 rounded-full transition-all duration-200",
                            hasContent && !disabled
                                ? "bg-tomato text-white shadow-md hover:bg-tomato-dark"
                                : "text-warm-gray bg-transparent"
                        )}
                        whileTap={{ scale: 0.9 }}
                        animate={{
                            scale: hasContent ? 1 : 0.95,
                            opacity: hasContent ? 1 : 0.5
                        }}
                        aria-label="Send message"
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
                <p className="text-center text-xs text-warm-gray-light mt-2 font-body">
                    Press Enter to send • Shift+Enter for new line
                </p>
            </div >

            {/* Camera Capture Modal */}
            < CameraCapture
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handleCameraCapture}
            />
        </>
    );
});
