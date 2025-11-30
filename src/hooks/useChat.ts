import { useState, useRef, useCallback } from 'react';
import { Message, Attachment, ToolCall, ToolStatus } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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

            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    attachments,
                    conversationHistory,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            // Don't create assistant message until we have content
            let assistantMessageCreated = false;
            const ensureAssistantMessage = () => {
                if (!assistantMessageCreated) {
                    assistantMessageCreated = true;
                    setMessages(prev => [
                        ...prev,
                        {
                            id: assistantMessageId,
                            role: 'assistant',
                            content: '',
                            timestamp: new Date(),
                            toolCalls: [],
                        },
                    ]);
                }
            };

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentContent = '';
            let buffer = '';
            let toolCallsState: ToolCall[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                let currentEvent = '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            switch (currentEvent) {
                                case 'thinking':
                                    setThinkingText(data.status);
                                    break;

                                case 'tool_start': {
                                    ensureAssistantMessage();
                                    const newTool: ToolCall = {
                                        id: data.id || uuidv4(),
                                        name: data.name,
                                        args: data.args,
                                        status: 'running',
                                        startTime: new Date(),
                                    };
                                    toolCallsState = [...toolCallsState, newTool];
                                    setActiveTools(toolCallsState);
                                    setThinkingText(`Running ${data.name}...`);
                                    updateMessage(assistantMessageId, { toolCalls: toolCallsState });
                                    break;
                                }

                                case 'tool_end': {
                                    toolCallsState = toolCallsState.map(t =>
                                        t.id === data.id
                                            ? {
                                                ...t,
                                                status: (data.error ? 'error' : 'completed') as ToolStatus,
                                                result: data.result,
                                                endTime: new Date(),
                                            }
                                            : t
                                    );
                                    setActiveTools(toolCallsState);
                                    updateMessage(assistantMessageId, { toolCalls: toolCallsState });
                                    break;
                                }

                                case 'stream':
                                    ensureAssistantMessage();
                                    setIsThinking(false);
                                    setIsStreaming(true);
                                    currentContent += data.token;
                                    updateMessage(assistantMessageId, { content: currentContent });
                                    break;

                                case 'message':
                                    // Final complete message (fallback if stream didn't work)
                                    if (!currentContent && data.content) {
                                        ensureAssistantMessage();
                                        currentContent = data.content;
                                        updateMessage(assistantMessageId, { content: currentContent });
                                    }
                                    break;

                                case 'complete':
                                    setIsStreaming(false);
                                    setActiveTools([]);
                                    break;

                                case 'error':
                                    console.error('Stream error:', data.message);
                                    setError(data.message);
                                    updateMessage(assistantMessageId, {
                                        content: currentContent || 'Sorry, I encountered an error.',
                                    });
                                    break;
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
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
