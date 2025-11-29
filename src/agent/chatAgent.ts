import { ai, type AxChatResponse, type AxFunction } from "@ax-llm/ax";
import { inventoryTools } from "./tools/definitions";

// Lazy-load OpenRouter client to avoid build-time initialization
let _llm: ReturnType<typeof ai> | null = null;
function getLlm() {
  if (!_llm) {
    _llm = ai({
      name: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY!,
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
const SYSTEM_PROMPT = `You are Mise, a helpful kitchen assistant. Your role is to:
- Help users manage their kitchen inventory using the available tools
- Suggest recipes based on available ingredients
- Provide cooking tips and techniques
- Analyze food from images (receipts, fridge contents, etc.)
- Track expiry dates and food safety

REASONING APPROACH:
Think step-by-step before acting. Consider what the user needs, what information you have, and which tools will help. If unsure, gather information first.

READ BEFORE WRITE (Critical):
ALWAYS search or check inventory BEFORE any add/update/deduct action to avoid duplicates:
- Before addInventory: use searchInventory to check if item already exists
- Before deductInventory: use searchInventory to verify item exists and has sufficient quantity
- Before updateInventory: use searchInventory to confirm current state
- If an item already exists, ask user if they want to add more to existing stock or update quantity

TOOL WORKFLOWS:
- Adding groceries: searchInventory (check existing) then addInventory (only new items) or updateInventory (increase existing)
- Using ingredients: searchInventory (verify exists) then deductInventory
- Image processing: parseImage then review items with user then searchInventory (check each) then addInventory (confirmed new items only)
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
- After image parsing, list extracted items for user approval before adding

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
 * Run the chat agent with tool calling support.
 * Returns the response and all tool events that occurred.
 */
export async function runChatAgent(input: ChatAgentInput): Promise<ChatAgentResult> {
  const toolEvents: ToolEvent[] = [];
  let toolCounter = 0;

  // Build conversation context from history
  const conversationContext = input.conversationHistory
    ?.map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n")
    .slice(-2000); // Keep last ~2000 chars for context

  // If there's an image, we need to handle it specially
  // For now, we'll describe that an image was attached
  const messageWithImage = input.imageBase64
    ? `${input.message || "Please analyze this image"}\n\n[User attached an image]`
    : input.message;

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
        // If this is parseImage and we have an image, inject it
        let actualArgs = args;
        if (tool.name === "parseImage" && input.imageBase64) {
          actualArgs = {
            ...args,
            imageBase64: input.imageBase64,
          };
        }

        const result = await tool.func(actualArgs, extra);

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

  // Build chat messages for direct llm.chat() call
  const chatPrompt: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Add conversation history
  if (input.conversationHistory) {
    for (const msg of input.conversationHistory) {
      chatPrompt.push({ role: msg.role, content: msg.content });
    }
  }

  // Add current user message
  chatPrompt.push({ role: "user", content: messageWithImage });

  // Use direct llm.chat() - bypasses signature parsing
  const llm = getLlm();
  const response = await llm.chat(
    {
      chatPrompt,
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
 * Yields events as they happen for SSE streaming.
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

  yield { type: "thinking", status: input.imageBase64 ? "Analyzing your image..." : "Thinking..." };

  // Build conversation context
  const conversationContext = input.conversationHistory
    ?.map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n")
    .slice(-2000);

  // If there's an image, process it automatically first
  let imageAnalysisContext = "";
  if (input.imageBase64) {
    const toolId = `tool_${++toolCounter}_${Date.now()}`;

    yield {
      type: "tool_start",
      id: toolId,
      name: "parseImage",
      args: { sourceHint: "auto" },
    };

    try {
      const { parseImage } = await import("./signatures/parseImage");
      const result = await parseImage(input.imageBase64);

      yield {
        type: "tool_end",
        id: toolId,
        name: "parseImage",
        result,
      };

      // Build context from parsed image
      const itemsList = result.items.map((item: any) =>
        `- ${item.name}: ${item.quantity} ${item.unit} (${item.confidence} confidence)`
      ).join("\n");

      imageAnalysisContext = `\n\n[Image Analysis Result - ${result.sourceType}]\nItems found:\n${itemsList}${result.notes ? `\nNotes: ${result.notes}` : ""}`;
    } catch (error) {
      yield {
        type: "tool_end",
        id: toolId,
        name: "parseImage",
        error: error instanceof Error ? error.message : "Failed to analyze image",
      };
    }
  }

  const messageWithContext = input.imageBase64
    ? `${input.message || "Please analyze this image"}${imageAnalysisContext}\n\nBased on the image analysis above, help the user with their request. If they want to add items to inventory, use addInventory with the parsed items.`
    : input.message;

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
        let actualArgs = args;
        if (tool.name === "parseImage" && input.imageBase64) {
          actualArgs = { ...args, imageBase64: input.imageBase64 };
        }

        const result = await tool.func(actualArgs, extra);

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
    // Build chat messages for direct llm.chat() call
    const chatPrompt: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history
    if (input.conversationHistory) {
      for (const msg of input.conversationHistory) {
        chatPrompt.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user message
    chatPrompt.push({ role: "user", content: messageWithContext });

    // Use direct llm.chat() - bypasses signature parsing
    const llm = getLlm();

    // Use non-streaming mode for simpler response handling
    // Then stream character by character to the client
    const response = await llm.chat(
      {
        chatPrompt,
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
    // Yield any pending events
    while (pendingEvents.length > 0) {
      yield pendingEvents.shift()!;
    }

    yield {
      type: "error",
      message: error instanceof Error ? error.message : "An error occurred",
    };
  }
}
