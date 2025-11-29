import { NextRequest } from "next/server";
import { streamChatAgent } from "@/agent/chatAgent";

export const maxDuration = 60; // Allow up to 60 seconds for tool execution

interface ChatRequest {
  message: string | null;
  attachments?: Array<{
    type: "image";
    data: string; // base64
    mimeType: string;
  }>;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();

    // Validate request
    if (!body.message && (!body.attachments || body.attachments.length === 0)) {
      return Response.json(
        { error: "Message or attachment required" },
        { status: 400 }
      );
    }

    // Extract image if present
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    if (body.attachments && body.attachments.length > 0) {
      const imageAttachment = body.attachments.find((a) => a.type === "image");
      if (imageAttachment) {
        // Strip data URL prefix if present
        imageBase64 = imageAttachment.data.replace(/^data:image\/\w+;base64,/, "");
        // Extract or use provided MIME type
        const dataUrlMatch = imageAttachment.data.match(/^data:(image\/\w+);base64,/);
        imageMimeType = dataUrlMatch ? dataUrlMatch[1] : imageAttachment.mimeType || "image/jpeg";
      }
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Stream agent responses
          const agentStream = streamChatAgent({
            message: body.message || "Please analyze this image",
            conversationHistory: body.conversationHistory,
            imageBase64,
            imageMimeType,
          });

          let fullContent = "";
          const toolsUsed: string[] = [];

          for await (const event of agentStream) {
            switch (event.type) {
              case "thinking":
                sendEvent("thinking", { status: event.status });
                break;

              case "tool_start":
                sendEvent("tool_start", {
                  id: event.id,
                  name: event.name,
                  args: event.args,
                });
                toolsUsed.push(event.name);
                break;

              case "tool_end":
                sendEvent("tool_end", {
                  id: event.id,
                  name: event.name,
                  result: event.result,
                  error: event.error,
                });
                break;

              case "stream":
                fullContent += event.token;
                sendEvent("stream", { token: event.token, index: event.index });
                break;

              case "complete":
                // Send final message for fallback
                sendEvent("message", { content: fullContent });
                // Send actions taken for transparency
                sendEvent("actions", { actions: toolsUsed });
                sendEvent("complete", { success: true });
                break;

              case "error":
                console.error("Agent error:", event.message);
                sendEvent("error", { message: event.message });
                break;
            }
          }
        } catch (error) {
          console.error("Chat API error:", error);
          sendEvent("error", {
            message: error instanceof Error ? error.message : "An error occurred",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
