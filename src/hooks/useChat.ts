import { useState, useRef, useCallback } from 'react';
import { Message, Attachment } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface UseChatReturn {
    messages: Message[];
    isThinking: boolean;
    thinkingText: string;
    sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
    clearHistory: () => void;
}

export function useChat(): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingText, setThinkingText] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);

    const clearHistory = useCallback(() => {
        setMessages([]);
        localStorage.removeItem('chat_history');
    }, []);

    const sendMessage = useCallback(async (text: string, attachments: Attachment[] = []) => {
        if (!text.trim() && attachments.length === 0) return;

        const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: text,
            timestamp: new Date(),
            attachments,
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsThinking(true);
        setThinkingText(attachments.length > 0 ? 'Analyzing image...' : 'Thinking...');

        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    attachments,
                    conversationHistory: messages,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessageId = uuidv4();
            let currentContent = '';
            let buffer = '';

            // Initialize assistant message
            setMessages((prev) => [
                ...prev,
                {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                },
            ]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last incomplete line

                let currentEvent = '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (currentEvent === 'thinking') {
                                setThinkingText(data.status);
                            } else if (currentEvent === 'message') {
                                currentContent += data.content;
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: currentContent }
                                            : msg
                                    )
                                );
                            } else if (currentEvent === 'actions') {
                                // Handle actions if needed, e.g. show a card
                                // For now, we might want to map specific actions to cards
                                // But the API seems to return a list of tool calls
                            } else if (currentEvent === 'complete') {
                                // Stream finished
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error('Chat error:', error);
                // Optionally add error message to chat
            }
        } finally {
            setIsThinking(false);
            setThinkingText('');
            abortControllerRef.current = null;
        }
    }, [messages]);

    return {
        messages,
        isThinking,
        thinkingText,
        sendMessage,
        clearHistory,
    };
}
