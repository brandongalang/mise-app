import { useState, useRef, useCallback } from 'react';
import { Message, Attachment, ToolCall, ToolStatus } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { parseSSEStream } from '@/lib/sse-parser';
import { api as apiClient } from '@/lib/api-client';

interface UseChatReturn {
    messages: Message[];
    isThinking: boolean;
    isStreaming: boolean;
    thinkingText: string;
    activeTools: ToolCall[];
    error: string | null;
    sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
    clearHistory: () => void;
    clearError: () => void;
}

export function useChat(): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [thinkingText, setThinkingText] = useState('');
    const [activeTools, setActiveTools] = useState<ToolCall[]>([]);
    const [error, setError] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    // Use ref to avoid stale closure issues with messages in sendMessage
    const messagesRef = useRef<Message[]>([]);
    messagesRef.current = messages;

    const clearHistory = useCallback(() => {
        setMessages([]);
        setActiveTools([]);
        setError(null);
        localStorage.removeItem('chat_history');
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Helper to update a specific message by ID
    const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            )
        );
    }, []);

    const sendMessage = useCallback(async (text: string, attachments: Attachment[] = []) => {
        if (!text.trim() && attachments.length === 0) return;

        setError(null);

        const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: text,
            timestamp: new Date(),
            attachments,
        };

        setMessages(prev => [...prev, userMessage]);
        setIsThinking(true);
        setActiveTools([]);
        setThinkingText(attachments.length > 0 ? 'Analyzing image...' : 'Thinking...');

        // Abort any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const assistantMessageId = uuidv4();

        try {
            // Use ref to get current messages for conversation history
            // Include attachments so multimodal context is preserved across messages
            const conversationHistory = messagesRef.current.map(m => ({
                role: m.role,
                content: m.content,
                attachments: m.attachments,
            }));

            // ... (imports)

            // ... (inside useChat)

            // Map to API message format
            const apiMessages = conversationHistory.map(msg => {
                const contentParts: (string | { type: string; image_url: { url: string } })[] = [{ type: 'text', text: msg.content }];
                if (msg.attachments && msg.attachments.length > 0) {
                    msg.attachments.forEach(att => {
                        if (att.type === 'image' && att.data) {
                            // Construct data URI
                            const dataUri = att.data.startsWith('data:')
                                ? att.data
                                : `data:${att.mimeType};base64,${att.data}`;

                            contentParts.push({ type: 'image_url', image_url: { url: dataUri } });
                        }
                    });
                }
                return {
                    role: msg.role,
                    content: contentParts,
                };
            });

            // ... (rest of the function)

            const response = await apiClient.fetchRaw('/api/v1/chat', {
                method: 'POST',
                body: JSON.stringify({
                    messages: apiMessages,
                    model: 'gpt-4o',
                }),
                signal: abortControllerRef.current?.signal,
                retries: 2
            });

            if (!response.body) throw new Error('No response body');

            // Handle SSE stream
            await parseSSEStream({
                stream: response.body,
                signal: abortControllerRef.current?.signal,
                onThinking: (text: string) => {
                    setIsThinking(true);
                    setThinkingText(text);
                },
                onContent: (content: string) => {
                    ensureAssistantMessage();
                    setIsThinking(false);
                    setThinkingText(''); // Clear thinking text once content starts
                    setIsStreaming(true);

                    // Accumulate content for the current message
                    currentContent += content;

                    updateMessage(assistantMessageId, { content: currentContent });
                },
                onToolCall: (toolCall: ToolCall) => {
                    ensureAssistantMessage();
                    setIsThinking(false);
                    setThinkingText(''); // Clear thinking text once tool call starts
                    setIsStreaming(true); // Tool calls are part of streaming response

                    // Update tool calls state
                    const existingCallIndex = toolCallsState.findIndex(tc => tc.id === toolCall.id);

                    if (existingCallIndex >= 0) {
                        // Update existing tool call
                        toolCallsState[existingCallIndex] = toolCall;
                    } else {
                        // Add new tool call
                        toolCallsState.push(toolCall);
                    }
                    setActiveTools([...toolCallsState]); // Update active tools for UI
                    updateMessage(assistantMessageId, { toolCalls: [...toolCallsState] });
                },
                onToolCallFinished: async (toolCall: ToolCall) => {
                    // Update the specific tool call with its final status and result
                    toolCallsState = toolCallsState.map(t =>
                        t.id === toolCall.id
                            ? { ...t, status: toolCall.status, result: toolCall.result, endTime: new Date() }
                            : t
                    );
                    setActiveTools([...toolCallsState]);
                    updateMessage(assistantMessageId, { toolCalls: [...toolCallsState] });
                },
                onComplete: () => {
                    setIsStreaming(false);
                    setActiveTools([]);
                },
                onError: (message: string) => {
                    console.error('Stream error:', message);
                    setError(message);
                    updateMessage(assistantMessageId, {
                        content: currentContent || 'Sorry, I encountered an error during streaming.',
                    });
                }
            });
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // Request was aborted, don't show error
                return;
            }

            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            console.error('Chat error:', err);
            setError(errorMessage);

            // Update or add error message
            setMessages(prev => {
                const hasAssistantMessage = prev.some(m => m.id === assistantMessageId);
                if (hasAssistantMessage) {
                    return prev.map(m =>
                        m.id === assistantMessageId
                            ? { ...m, content: 'Sorry, I encountered an error. Please try again.' }
                            : m
                    );
                }
                return [
                    ...prev,
                    {
                        id: assistantMessageId,
                        role: 'assistant' as const,
                        content: 'Sorry, I encountered an error. Please try again.',
                        timestamp: new Date(),
                    },
                ];
            });
        } finally {
            setIsThinking(false);
            setIsStreaming(false);
            setThinkingText('');
            setActiveTools([]);
            abortControllerRef.current = null;
        }
    }, [updateMessage]); // No messages dependency - uses ref instead

    return {
        messages,
        isThinking,
        isStreaming,
        thinkingText,
        activeTools,
        error,
        sendMessage,
        clearHistory,
        clearError,
    };
}
