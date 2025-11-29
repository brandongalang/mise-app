import { useState, useRef, useCallback } from 'react';
import { Message, Attachment, ToolCall, ToolStatus } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface UseChatReturn {
    messages: Message[];
    isThinking: boolean;
    isStreaming: boolean;
    thinkingText: string;
    activeTools: ToolCall[];
    sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
    clearHistory: () => void;
}

export function useChat(): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [thinkingText, setThinkingText] = useState('');
    const [activeTools, setActiveTools] = useState<ToolCall[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    const clearHistory = useCallback(() => {
        setMessages([]);
        setActiveTools([]);
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
        setActiveTools([]);
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
                    conversationHistory: messages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
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
            const assistantMessageId = uuidv4();
            let currentContent = '';
            let buffer = '';
            let toolCalls: ToolCall[] = [];

            // Initialize assistant message
            setMessages((prev) => [
                ...prev,
                {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    toolCalls: [],
                },
            ]);

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

                            if (currentEvent === 'thinking') {
                                setThinkingText(data.status);
                            } else if (currentEvent === 'tool_start') {
                                // Tool started
                                const newTool: ToolCall = {
                                    id: data.id || uuidv4(),
                                    name: data.name,
                                    args: data.args,
                                    status: 'running',
                                    startTime: new Date(),
                                };
                                toolCalls = [...toolCalls, newTool];
                                setActiveTools(toolCalls);
                                setThinkingText(`Running ${data.name}...`);

                                // Update message with tool calls
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, toolCalls }
                                            : msg
                                    )
                                );
                            } else if (currentEvent === 'tool_end') {
                                // Tool completed
                                toolCalls = toolCalls.map((t) =>
                                    t.id === data.id
                                        ? {
                                            ...t,
                                            status: data.error ? 'error' as ToolStatus : 'completed' as ToolStatus,
                                            result: data.result,
                                            endTime: new Date(),
                                        }
                                        : t
                                );
                                setActiveTools(toolCalls);

                                // Update message with tool calls
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, toolCalls }
                                            : msg
                                    )
                                );
                            } else if (currentEvent === 'stream') {
                                // Handle streaming tokens
                                setIsThinking(false);
                                setIsStreaming(true);
                                currentContent += data.token;
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: currentContent }
                                            : msg
                                    )
                                );
                            } else if (currentEvent === 'message') {
                                // Final complete message
                                if (!currentContent) {
                                    currentContent = data.content;
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === assistantMessageId
                                                ? { ...msg, content: currentContent }
                                                : msg
                                        )
                                    );
                                }
                            } else if (currentEvent === 'complete') {
                                setIsStreaming(false);
                                setActiveTools([]);
                            } else if (currentEvent === 'error') {
                                console.error('Stream error:', data.message);
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: `Error: ${data.message}` }
                                            : msg
                                    )
                                );
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
                setMessages((prev) => [
                    ...prev,
                    {
                        id: uuidv4(),
                        role: 'assistant',
                        content: 'Sorry, I encountered an error. Please try again.',
                        timestamp: new Date(),
                    },
                ]);
            }
        } finally {
            setIsThinking(false);
            setIsStreaming(false);
            setThinkingText('');
            setActiveTools([]);
            abortControllerRef.current = null;
        }
    }, [messages]);

    return {
        messages,
        isThinking,
        isStreaming,
        thinkingText,
        activeTools,
        sendMessage,
        clearHistory,
    };
}
