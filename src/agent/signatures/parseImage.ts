import { ax, ai } from "@ax-llm/ax";
import type { VisionExtractionResult, VisionItem } from "@/lib/types";

// Lazy-load OpenRouter with Grok 4 for vision
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
      title: "Mise Image Parser",
    });
  }
  return _llm;
}

// System prompt for image parsing with explicit structure
const IMAGE_PARSE_PROMPT = `You are a food inventory extraction assistant. Extract ALL food items from images accurately.

TASK: Analyze the image and extract every food item you can identify.

For RECEIPTS:
- Read ALL line items carefully
- Parse quantities like "24CT" (24 count), "1.5LB" (1.5 lb), "2PK" (2 pack)
- Interpret abbreviations: "ORG" = organic, "GRN" = green, "CHK" = chicken
- Skip non-food items (bags, tax, total, etc.)

For PHOTOS (fridge, groceries, pantry):
- Identify all visible food items
- Estimate quantities based on what you see
- Note brand names in rawText if visible

OUTPUT FORMAT for each item:
{
  "name": "lowercase singular name (e.g., 'apple' not 'Apples')",
  "quantity": number (e.g., 2, 1.5, 12),
  "unit": "count|lb|oz|g|kg|ml|l|bunch|bag|box|can|bottle|container|pack|dozen",
  "confidence": "high|medium|low",
  "needsReview": true if uncertain about name or quantity,
  "rawText": "original text from receipt or description",
  "categoryHint": "produce|protein|dairy|pantry|frozen|beverage|condiment|grain|spice|unknown"
}

CATEGORIES:
- produce: fruits, vegetables, herbs
- protein: meat, poultry, fish, eggs, tofu
- dairy: milk, cheese, yogurt, butter, cream
- pantry: canned goods, pasta, rice, oils, sauces
- frozen: frozen foods, ice cream
- beverage: drinks, juice, soda, water
- condiment: sauces, dressings, spreads
- grain: bread, cereal, flour, oats
- spice: spices, seasonings, salt, pepper
- unknown: when category is unclear

IMPORTANT: Extract EVERY food item. Do not skip items. Return an empty array only if there are no food items.`;

// Define the ParseImage signature - use setInstruction to avoid signature parsing issues
const parseImageSignature = ax(
  `imageData:image, sourceHint?:string -> sourceType:string, items:json[], notes?:string`
);
parseImageSignature.setInstruction(IMAGE_PARSE_PROMPT);

// Helper to parse base64 image data into the format expected by ax
function parseImageData(imageBase64: string): { mimeType: string; data: string } {
  // Check if it's a data URL (e.g., "data:image/jpeg;base64,/9j/...")
  const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }
  // Otherwise assume it's raw base64 and default to JPEG
  return {
    mimeType: "image/jpeg",
    data: imageBase64,
  };
}

export async function parseImage(
  imageBase64: string,
  sourceHint?: "receipt" | "fridge" | "groceries"
): Promise<VisionExtractionResult> {
  const imageData = parseImageData(imageBase64);

  const result = await parseImageSignature.forward(
    getLlm(),
    {
      imageData,
      sourceHint: sourceHint || undefined,
    }
  );

  // Transform the result to our typed structure
  const items: VisionItem[] = (result.items as any[]).map((item: any) => ({
    name: item.name?.toLowerCase() || "unknown",
    quantity: typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity) || 1,
    unit: item.unit || "count",
    confidence: (item.confidence || "medium") as "high" | "medium" | "low",
    needsReview: item.needsReview ?? item.confidence === "low",
    rawText: item.rawText || item.name,
    categoryHint: (item.categoryHint || "unknown") as VisionItem["categoryHint"],
  }));

  return {
    sourceType: result.sourceType as "receipt" | "photo" | "mixed",
    items,
    notes: result.notes,
  };
}

export { getLlm };
