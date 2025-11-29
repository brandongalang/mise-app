import { NextRequest } from "next/server";
import { runAgent } from "@/agent";

export const maxDuration = 60; // Allow up to 60 seconds for vision processing

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
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Send thinking status
          sendEvent("thinking", { status: imageBase64 ? "Analyzing your image..." : "Thinking..." });

          // Run the agent
          const result = await runAgent({
            message: body.message || "Process this image",
            imageBase64,
            imageMimeType,
            conversationHistory: body.conversationHistory,
          });

          // Send the response
          sendEvent("message", { content: result.response });

          // Send actions taken (for debugging/transparency)
          if (result.actionsTaken && result.actionsTaken.length > 0) {
            sendEvent("actions", { actions: result.actionsTaken });
          }

          // Complete
          sendEvent("complete", { success: true });
        } catch (error) {
          console.error("Agent error:", error);
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
