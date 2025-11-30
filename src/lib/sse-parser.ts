import { Message, ToolCall, ToolStatus } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export interface ParseSSEStreamOptions {
    stream: ReadableStream<Uint8Array>;
    signal?: AbortSignal;
    onThinking: (text: string) => void;
    onContent: (content: string) => void;
    onToolCall: (toolCall: ToolCall) => void;
    onToolCallFinished: (toolCall: ToolCall) => void;
    onComplete: () => void;
    onError: (message: string) => void;
}

export async function parseSSEStream({
    stream,
    signal,
    onThinking,
    onContent,
    onToolCall,
    onToolCallFinished,
    onComplete,
    onError
}: ParseSSEStreamOptions) {
    const reader = stream.getReader();
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
                                onThinking(data.status);
                                break;

                            case 'tool_start':
                                onToolCall({
                                    id: data.id || uuidv4(),
                                    name: data.name,
                                    args: data.args,
                                    status: 'running',
                                    startTime: new Date(),
                                });
                                break;

                            case 'tool_end':
                                onToolCallFinished({
                                    id: data.id,
                                    name: 'unknown',
                                    status: (data.error ? 'error' : 'completed') as ToolStatus,
                                    result: data.result,
                                    endTime: new Date()
                                });
                                break;

                            case 'stream':
                                onContent(data.token);
                                break;

                            case 'message':
                                if (data.content) {
                                    // This might be the final message or a chunk?
                                    // If we use 'stream' for chunks, 'message' might be the full content.
                                    // But useChat accumulates content from onContent.
                                    // If we receive 'message', should we call onContent?
                                    // Yes, if it's the full content and we haven't streamed it.
                                    // But usually we stream.
                                    // Let's assume 'message' event is redundant if we stream, or it's for non-streaming.
                                    // But we are parsing a stream.
                                    // Let's ignore 'message' if we are streaming tokens.
                                    // Or call onContent with it?
                                    // Let's leave it for now.
                                }
                                break;

                            case 'complete':
                                onComplete();
                                break;

                            case 'error':
                                onError(data.message);
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
