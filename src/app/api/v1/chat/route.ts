import { NextRequest } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat/completions";

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

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Mise Kitchen Assistant",
  },
});

const systemPrompt = `You are Mise, a helpful kitchen assistant. Your role is to:
- Help users manage their kitchen inventory
- Suggest recipes based on available ingredients
- Provide cooking tips and techniques
- Analyze food from images (receipts, fridge contents, etc.)
- Track expiry dates and food safety

Be friendly, practical, and focused on helping them use their ingredients effectively.
Use markdown formatting for better readability when appropriate (lists, bold, headers).`;

function buildUserContent(
  message: string,
  imageBase64?: string,
  imageMimeType: string = "image/jpeg"
): string | ChatCompletionContentPart[] {
  if (!imageBase64) {
    return message;
  }

  return [
    {
      type: "text",
      text: message,
    },
    {
      type: "image_url",
      image_url: {
        url: `data:${imageMimeType};base64,${imageBase64}`,
      },
    },
  ];
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

    // Build messages array
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...(body.conversationHistory || []).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: buildUserContent(
          body.message || "Process this image",
          imageBase64,
          imageMimeType
        ),
      },
    ];

    // Create SSE stream with token-by-token streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Send thinking status
          sendEvent("thinking", {
            status: imageBase64 ? "Analyzing your image..." : "Thinking...",
          });

          // Create streaming completion
          const streamResponse = await client.chat.completions.create({
            model: "x-ai/grok-4.1-fast:free",
            max_tokens: 1024,
            messages,
            stream: true,
          });

          let fullContent = "";
          let tokenCount = 0;

          // Stream tokens as they arrive
          for await (const chunk of streamResponse) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              tokenCount++;

              // Send each token as a stream event
              sendEvent("stream", { token: delta, index: tokenCount });
            }

            // Check for finish reason
            if (chunk.choices[0]?.finish_reason) {
              break;
            }
          }

          // Send final complete message
          sendEvent("message", { content: fullContent });

          // Send actions taken (for debugging/transparency)
          sendEvent("actions", { actions: ["streamed-grok-response"] });

          // Complete
          sendEvent("complete", { success: true, tokenCount });
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
