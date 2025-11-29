import { ax, ai } from "@ax-llm/ax";
import { inventoryTools } from "./tools/definitions";

// Lazy-load OpenRouter client to avoid build-time initialization
let _llm: ReturnType<typeof ai> | null = null;
function getLlm() {
  if (!_llm) {
    _llm = ai({
      name: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY!,
      config: {
        model: "x-ai/grok-4.1-fast:free",
      },
      referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      title: "Mise Kitchen Assistant",
    });
  }
  return _llm;
}

// System instructions embedded in the signature
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
- Adding groceries: searchInventory (check existing) → addInventory (only new items) or updateInventory (increase existing)
- Using ingredients: searchInventory (verify exists) → deductInventory
- Image processing: parseImage → review items with user → searchInventory (check each) → addInventory (confirmed new items only)
- Recipe suggestions: getExpiringItems + searchInventory → generateRecipe
- Leftovers: addLeftover (these are unique dishes, no duplicate check needed)

QUANTITY INTERPRETATION:
- "a couple" = 2, "a few" = 3, "some" = estimate 4-5
- Parse units: "2 lbs" = 2 lb, "dozen" = 12 count
- When unclear, ask for clarification

ERROR HANDLING:
- If a tool returns an error or "not found", explain clearly and suggest alternatives
- If deduct fails due to insufficient quantity, show what's available

CONFIRMATIONS:
- Confirm before bulk additions (>5 items)
- Confirm before deleting items
- After image parsing, list extracted items for user approval before adding

Be friendly, practical, and focused on helping them use their ingredients effectively.
Use markdown formatting for better readability when appropriate (lists, bold, headers).`;

// Define the chat signature with functions
const chatSignature = ax(
  `"${SYSTEM_PROMPT}"
  userMessage:string "The user's message or question",
  conversationContext?:string "Previous conversation context for continuity",
  hasImage?:boolean "Whether the user attached an image" ->
  response:string "Your helpful response to the user"`,
  { functions: inventoryTools }
);

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

  // Create signature with wrapped tools
  const wrappedSignature = ax(
    `"${SYSTEM_PROMPT}"
    userMessage:string "The user's message or question",
    conversationContext?:string "Previous conversation context for continuity",
    hasImage?:boolean "Whether the user attached an image" ->
    response:string "Your helpful response to the user"`,
    { functions: wrappedTools }
  );

  // Run the agent
  const result = await wrappedSignature.forward(getLlm(), {
    userMessage: messageWithImage,
    conversationContext,
    hasImage: !!input.imageBase64,
  });

  return {
    response: result.response,
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

  const messageWithImage = input.imageBase64
    ? `${input.message || "Please analyze this image"}\n\n[User attached an image - call parseImage to analyze it]`
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
    const wrappedSignature = ax(
      `"${SYSTEM_PROMPT}"
      userMessage:string "The user's message or question",
      conversationContext?:string "Previous conversation context for continuity",
      hasImage?:boolean "Whether the user attached an image" ->
      response:string "Your helpful response to the user"`,
      { functions: wrappedTools }
    );

    // Use streaming mode
    const stream = wrappedSignature.streamingForward(getLlm(), {
      userMessage: messageWithImage,
      conversationContext,
      hasImage: !!input.imageBase64,
    });

    for await (const chunk of stream) {
      // Yield any pending tool events first
      while (pendingEvents.length > 0) {
        yield pendingEvents.shift()!;
      }

      // Stream the response tokens - use partial for accumulated value
      const partialResponse = chunk.partial?.response || chunk.delta?.response;
      if (partialResponse && typeof partialResponse === "string") {
        // ax streams the full value each time, so we need to track what's new
        const newContent = partialResponse.slice(tokenIndex);
        if (newContent) {
          for (const char of newContent) {
            yield { type: "stream", token: char, index: ++tokenIndex };
          }
        }
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
