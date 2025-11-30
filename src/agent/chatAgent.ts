import { ai, type AxChatResponse, type AxFunction } from "@ax-llm/ax";
import { inventoryTools } from "./tools/definitions";

// Multimodal content types for chat messages
type TextContent = { type: "text"; text: string };
type ImageUrlContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "high" | "low" | "auto";
  };
};

type MessageContent = string | (TextContent | ImageUrlContent)[];

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

RESPONSE FORMATTING (Important!):
Use markdown strategically to make responses scannable and user-friendly:
- Use **bold** for item names, quantities, and key actions
- Use bullet lists for multiple items (not numbered unless order matters)
- Use ### headers only for major sections (like "Items Found" or "Ready to Add")
- Keep responses concise - avoid walls of text
- Don't overuse formatting - plain text is fine for conversational responses

IMAGE ANALYSIS - BE PROACTIVE ABOUT INVENTORY:
When the user shares a food-related image, your PRIMARY goal is to help them track it in their inventory. Be proactive!

1. GROCERIES/PRODUCE/FRIDGE PHOTO (Most Common):
   Immediately identify items and PROACTIVELY suggest adding them:

   Example response format:
   "I can see some fresh groceries! Here's what I found:

   ### Ready to Add
   | Item | Qty | Unit | Category |
   |------|-----|------|----------|
   | **Broccoli** | 2 | heads | Produce |
   | **Bell Peppers** | 3 | count | Produce |
   | **Chicken Breast** | 1 | lb | Protein |

   **Want me to add these to your inventory?** Just say 'yes' or let me know any changes!"

2. RECEIPT PHOTO:
   Parse items and suggest adding:
   - Extract quantities like "24CT" → 24 count, "1.5LB" → 1.5 lb
   - Skip non-food items (bags, tax, totals)
   - Present in same table format, ask for confirmation

3. MEAL/RESTAURANT PHOTO:
   This is likely NOT for inventory - but still offer options:
   - Briefly compliment or describe the dish
   - Ask: "Is this **leftovers to track**, or would you like a **recipe to recreate it**?"
   - If leftovers: use addLeftover with portion estimates
   - If recipe: offer to help using their current inventory

4. COOKED DISH/LEFTOVERS:
   Proactively offer to track:
   "Looks delicious! Want me to **add this as leftovers**? I'd estimate about **2-3 portions** - let me know the actual amount and when you'd like to eat it by."

PROACTIVE INVENTORY SUGGESTIONS:
When showing items to add, ALWAYS:
- Present items in a clear table or list with: **Name**, **Quantity**, **Unit**, **Category**
- Provide your best estimates for quantities
- Ask user to confirm OR modify before adding
- Make it easy: "Say 'yes' to add all, or tell me what to change"

READ BEFORE WRITE (Critical):
ALWAYS search or check inventory BEFORE any add/update/deduct action to avoid duplicates:
- Before addInventory: use searchInventory to check if item already exists
- Before deductInventory: use searchInventory to verify item exists and has sufficient quantity
- Before updateInventory: use searchInventory to confirm current state
- If item exists: "You already have **2 apples**. Want me to add these 3 more (total: 5)?"

TOOL WORKFLOWS:
- Adding groceries: searchInventory (check existing) → addInventory (new) or updateInventory (existing)
- Using ingredients: searchInventory (verify exists) → deductInventory
- Image with groceries: Analyze → present table → wait for confirmation → searchInventory → add
- Recipe suggestions: getExpiringItems + searchInventory → generateRecipe
- Leftovers: addLeftover (unique dishes, no duplicate check needed)

QUANTITY INTERPRETATION:
- "a couple" = 2, "a few" = 3, "some" = 4-5
- Parse units: "2 lbs" = 2 lb, "dozen" = 12 count
- When unclear, provide your best estimate and ask user to confirm

ERROR HANDLING:
- If a tool returns an error, explain clearly and suggest alternatives
- If deduct fails: "You only have **1 egg** but need 3. Want to update your shopping list?"

Be friendly, practical, and focused on helping them track and use their ingredients effectively.`;

interface HistoryAttachment {
  type: "image";
  data: string; // base64 or data URL
  mimeType: string;
}

export interface ChatAgentInput {
  message: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
    attachments?: HistoryAttachment[];
  }>;
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

  // Ensure data URL format
  let dataUrl = imageBase64;
  if (!imageBase64.startsWith("data:")) {
    dataUrl = `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`;
  }

  // Build multimodal content array with text and image
  const content: (TextContent | ImageUrlContent)[] = [
    { type: "text", text: text || "What's in this image?" },
    {
      type: "image_url",
      image_url: {
        url: dataUrl,
        detail: "high", // Use high detail for better food/receipt analysis
      },
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

  // Add conversation history with multimodal support
  if (input.conversationHistory) {
    for (const msg of input.conversationHistory) {
      // Check if this history message has image attachments
      const imageAttachment = msg.attachments?.find(a => a.type === "image");
      if (imageAttachment && msg.role === "user") {
        // Rebuild multimodal content for user messages with images
        const historyContent = buildUserMessage(
          msg.content,
          imageAttachment.data,
          imageAttachment.mimeType
        );
        chatPrompt.push({ role: msg.role, content: historyContent });
      } else {
        chatPrompt.push({ role: msg.role, content: msg.content });
      }
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

    // Add conversation history with multimodal support
    if (input.conversationHistory) {
      for (const msg of input.conversationHistory) {
        // Check if this history message has image attachments
        const imageAttachment = msg.attachments?.find(a => a.type === "image");
        if (imageAttachment && msg.role === "user") {
          // Rebuild multimodal content for user messages with images
          const historyContent = buildUserMessage(
            msg.content,
            imageAttachment.data,
            imageAttachment.mimeType
          );
          chatPrompt.push({ role: msg.role, content: historyContent });
        } else {
          chatPrompt.push({ role: msg.role, content: msg.content });
        }
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