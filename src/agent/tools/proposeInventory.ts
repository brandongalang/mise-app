import type { AxFunction, AxFunctionJSONSchema } from "@ax-llm/ax";

const categoryEnum = [
  "produce",
  "protein",
  "dairy",
  "pantry",
  "frozen",
  "beverage",
  "condiment",
  "grain",
  "spice",
  "unknown",
];

export const proposeInventoryTool: AxFunction = {
  name: "proposeInventory",
  description:
    "Propose a list of items to add to inventory. Use this when you identify items from an image (receipt, fridge photo, etc.) or user text. This DOES NOT save to the database; it presents a review UI to the user.",
  parameters: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Item name" },
            quantity: { type: "number", description: "Amount" },
            unit: { type: "string", description: "Unit (e.g., count, lb, oz)" },
            category: { type: "string", enum: categoryEnum, description: "Category" },
            confidence: { type: "number", description: "Confidence score (0-1)" },
          },
          required: ["name", "quantity", "unit"],
        },
        description: "List of items found",
      },
      source: {
        type: "string",
        description: "Source of the items (e.g., 'receipt', 'fridge', 'manual')",
      },
    },
    required: ["items"],
  } as AxFunctionJSONSchema,
  func: async (args) => {
    // Server-side, this tool does nothing but return the args.
    // The magic happens in the client-side UI which intercepts this tool call.
    return {
      status: "proposed",
      items: args?.items,
      source: args?.source,
      message: "Draft created. Waiting for user review.",
    };
  },
};
