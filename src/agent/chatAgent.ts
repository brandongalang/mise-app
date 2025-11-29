import { ai, type AxChatResponse, type AxFunction } from "@ax-llm/ax";
import { inventoryTools } from "./tools/definitions";

// Multimodal content types for chat messages
type TextContent = { type: "text"; text: string };
type ImageContent = {
  type: "image";
  image: string; // base64 data or data URL
  mimeType: string;
  details?: "high" | "low" | "auto";
};
type MessageContent = string | (TextContent | ImageContent)[];

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: MessageContent;
}

// Lazy-load OpenRouter client to avoid build-time initialization
let _llm: ReturnType<typeof ai> | null = null;
function getLlm() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  if (!_llm) {
    _llm = ai({
      name: "openrouter",
      apiKey,
      config: {
        model: "x-ai/grok-4-fast",
      },
      referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      title: "Mise Kitchen Assistant",
    });
  }
  return _llm;
}

// System instructions (set via setInstruction to avoid signature parsing issues)
const SYSTEM_PROMPT = `You are Mise, a helpful kitchen assistant with vision capabilities. Your role is to:
- Help users manage their kitchen inventory using the available tools
- Suggest recipes based on available ingredients
- Provide cooking tips and techniques
- Analyze food from images (you can see images directly!)
- Track expiry dates and food safety

REASONING APPROACH:
Think step-by-step before acting. Consider what the user needs, what information you have, and which tools will help. If unsure, gather information first.

IMAGE ANALYSIS (You are multimodal - you can see images directly!):
When the user shares an image, analyze it and determine what action they likely want:

1. RECEIPT PHOTO: Extract food items, ask user to confirm, then add to inventory
   - Parse quantities like "24CT" (24 count), "1.5LB" (1.5 lb)
   - Skip non-food items (bags, tax, totals)
   - List what you found and ask "Would you like me to add these to your inventory?"

2. GROCERIES/FRIDGE PHOTO: Identify visible food items, ask to add to inventory
   - Estimate quantities based on what you see
   - Categorize items (produce, protein, dairy, etc.)
   - Ask before adding to inventory

3. MEAL/RESTAURANT PHOTO: This is likely NOT for inventory tracking!
   - Compliment the meal, ask what they'd like to do
   - Offer options: "Would you like me to suggest a similar recipe?" or "Is this a leftover you want to track?"
   - If they confirm it's leftovers, use addLeftover with portion estimates
   - If they want a recipe, offer to help them recreate it using their inventory

4. COOKED DISH/LEFTOVERS: Ask if they want to track it
   - Use addLeftover (not addInventory) for prepared dishes
   - Ask about portion count and when it should be eaten by

Always describe what you see in the image briefly, then ask what the user wants to do with it.

READ BEFORE WRITE (Critical):
ALWAYS search or check inventory BEFORE any add/update/deduct action to avoid duplicates:
- Before addInventory: use searchInventory to check if item already exists
- Before deductInventory: use searchInventory to verify item exists and has sufficient quantity
- Before updateInventory: use searchInventory to confirm current state
- If an item already exists, ask user if they want to add more to existing stock or update quantity

TOOL WORKFLOWS:
- Adding groceries: searchInventory (check existing) then addInventory (only new items) or updateInventory (increase existing)
- Using ingredients: searchInventory (verify exists) then deductInventory
- Image with groceries: Analyze the image directly, list what you see, then searchInventory (check each) then addInventory (confirmed new items only)
- Recipe suggestions: getExpiringItems + searchInventory then generateRecipe
- Leftovers: addLeftover (these are unique dishes, no duplicate check needed)

QUANTITY INTERPRETATION:
- a couple means 2, a few means 3, some means estimate 4-5
- Parse units: 2 lbs means 2 lb, dozen means 12 count
- When unclear, ask for clarification

ERROR HANDLING:
- If a tool returns an error or not found, explain clearly and suggest alternatives
- If deduct fails due to insufficient quantity, show what is available

CONFIRMATIONS:
- Confirm before bulk additions (more than 5 items)
- Confirm before deleting items
- After analyzing images, list what you found and ask for user approval before adding

Be friendly, practical, and focused on helping them use their ingredients effectively.
Use markdown formatting for better readability when appropriate (lists, bold, headers).`;

export interface ChatAgentInput {
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface ToolEvent {
  type: "tool_start" | "tool_end";
  id: string;
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ChatAgentResult {
  response: string;
  toolEvents: ToolEvent[];
}

/**
 * Build a multimodal user message with text and optional image
 */
function buildUserMessage(
  text: string,
  imageBase64?: string,
  imageMimeType?: string
): MessageContent {
  if (!imageBase64) {
    return text || "What's in this image?";
  }

  // Build data URL if not already one
  const imageData = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`;

  // Build multimodal content array with text and image
  const content: (TextContent | ImageContent)[] = [
    { type: "text", text: text || "What's in this image?" },
    {
      type: "image",
      image: imageData,
      mimeType: imageMimeType || "image/jpeg",
      details: "high", // Use high detail for better food/receipt analysis
    },
  ];

  return content;
}

/**
 * Run the chat agent with tool calling support.
 * Returns the response and all tool events that occurred.
 */
export async function runChatAgent(input: ChatAgentInput): Promise<ChatAgentResult> {
  const toolEvents: ToolEvent[] = [];
  let toolCounter = 0;

  // Wrap the tools to capture events
  const wrappedTools = inventoryTools.map((tool) => ({
    ...tool,
    func: async (args: any, extra: any) => {
      const toolId = `tool_${++toolCounter}_${Date.now()}`;

      // Emit tool_start
      toolEvents.push({
        type: "tool_start",
        id: toolId,
        name: tool.name,
        args,
      });

      try {
        const result = await tool.func(args, extra);

        // Emit tool_end
        toolEvents.push({
          type: "tool_end",
          id: toolId,
          name: tool.name,
          result,
        });

        return result;
      } catch (error) {
        // Emit tool_end with error
        toolEvents.push({
          type: "tool_end",
          id: toolId,
          name: tool.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  }));

  // Build chat messages for direct llm.chat() call with multimodal support
  const chatPrompt: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Add conversation history
  if (input.conversationHistory) {
    for (const msg of input.conversationHistory) {
      chatPrompt.push({ role: msg.role, content: msg.content });
    }
  }

  // Add current user message with multimodal content if image present
  const userContent = buildUserMessage(
    input.message,
    input.imageBase64,
    input.imageMimeType
  );
  chatPrompt.push({ role: "user", content: userContent });

  // Use direct llm.chat() - bypasses signature parsing
  const llm = getLlm();
  const response = await llm.chat(
    {
      chatPrompt: chatPrompt as any, // Cast needed for multimodal content arrays
      functions: wrappedTools,
      functionCall: "auto",
    },
    { stream: false }
  );

  // Extract content from response
  const content = (response as AxChatResponse).results?.[0]?.content || "";

  return {
    response: content,
    toolEvents,
  };
}

/**
 * Stream the chat agent response with real-time tool events.
 * Uses native multimodal vision - sends images directly to the LLM.
 */
export async function* streamChatAgent(
  input: ChatAgentInput
): AsyncGenerator<
  | { type: "thinking"; status: string }
  | { type: "tool_start"; id: string; name: string; args?: Record<string, unknown> }
  | { type: "tool_end"; id: string; name: string; result?: unknown; error?: string }
  | { type: "stream"; token: string; index: number }
  | { type: "complete"; success: boolean }
  | { type: "error"; message: string }
> {
  let toolCounter = 0;
  let tokenIndex = 0;

  yield {
    type: "thinking",
    status: input.imageBase64 ? "Looking at your image..." : "Thinking...",
  };

  // Store tool events for yielding
  const pendingEvents: Array<
    | { type: "tool_start"; id: string; name: string; args?: Record<string, unknown> }
    | { type: "tool_end"; id: string; name: string; result?: unknown; error?: string }
  > = [];

  // Wrap tools to capture events
  const wrappedTools = inventoryTools.map((tool) => ({
    ...tool,
    func: async (args: any, extra: any) => {
      const toolId = `tool_${++toolCounter}_${Date.now()}`;

      pendingEvents.push({
        type: "tool_start",
        id: toolId,
        name: tool.name,
        args,
      });

      try {
        const result = await tool.func(args, extra);

        pendingEvents.push({
          type: "tool_end",
          id: toolId,
          name: tool.name,
          result,
        });

        return result;
      } catch (error) {
        pendingEvents.push({
          type: "tool_end",
          id: toolId,
          name: tool.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  }));

  try {
    // Build chat messages with native multimodal support
    const chatPrompt: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history
    if (input.conversationHistory) {
      for (const msg of input.conversationHistory) {
        chatPrompt.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user message with multimodal content if image present
    const userContent = buildUserMessage(
      input.message,
      input.imageBase64,
      input.imageMimeType
    );
    chatPrompt.push({ role: "user", content: userContent });

    // Use direct llm.chat() with multimodal support
    const llm = getLlm();

    const response = await llm.chat(
      {
        chatPrompt: chatPrompt as any, // Cast needed for multimodal content arrays
        functions: wrappedTools,
        functionCall: "auto",
      },
      { stream: false }
    );

    // Yield any pending tool events
    while (pendingEvents.length > 0) {
      yield pendingEvents.shift()!;
    }

    // Extract content from response
    const chatResponse = response as AxChatResponse;
    const content = chatResponse.results?.[0]?.content || "";

    // Stream character by character to the client
    if (content) {
      for (const char of content) {
        yield { type: "stream", token: char, index: ++tokenIndex };
      }
    }

    // Yield any remaining tool events
    while (pendingEvents.length > 0) {
      yield pendingEvents.shift()!;
    }

    yield { type: "complete", success: true };
  } catch (error) {
    console.error("Chat agent error:", error);

    // Yield any pending events
    while (pendingEvents.length > 0) {
      yield pendingEvents.shift()!;
    }

    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    console.error("Yielding error to client:", errorMessage);

    yield {
      type: "error",
      message: errorMessage,
    };
  }
}
