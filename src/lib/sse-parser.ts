import { Message, ToolCall, ToolStatus } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export interface ChatStreamCallbacks {
    onThinking: (text: string) => void;
    onToolStart: (tool: ToolCall) => void;
    onToolEnd: (toolId: string, result: any, status: ToolStatus) => void;
    onStream: (content: string) => void;
    onMessage: (content: string) => void;
    onComplete: () => void;
    onError: (message: string) => void;
}

export async function parseSSEStream(
    response: Response,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
) {
    if (!response.body) {
        throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            if (signal?.aborted) {
                reader.cancel();
                break;
            }

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
                                callbacks.onThinking(data.status);
                                break;

                            case 'tool_start':
                                callbacks.onToolStart({
                                    id: data.id || uuidv4(),
                                    name: data.name,
                                    args: data.args,
                                    status: 'running',
                                    startTime: new Date(),
                                });
                                break;

                            case 'tool_end':
                                callbacks.onToolEnd(
                                    data.id,
                                    data.result,
                                    (data.error ? 'error' : 'completed') as ToolStatus
                                );
                                break;

                            case 'stream':
                                callbacks.onStream(data.token);
                                break;

                            case 'message':
                                if (data.content) {
                                    callbacks.onMessage(data.content);
                                }
                                break;

                            case 'complete':
                                callbacks.onComplete();
                                break;

                            case 'error':
                                callbacks.onError(data.message);
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
            return;
        }
        throw err;
    } finally {
        reader.releaseLock();
    }
}
