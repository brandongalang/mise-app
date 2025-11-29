import { ax, ai, AxAIGoogleGeminiModel } from "@ax-llm/ax";
import type { VisionExtractionResult, VisionItem } from "@/lib/types";

// Lazy-load Gemini to avoid build-time initialization
let _llm: ReturnType<typeof ai> | null = null;
function getLlm() {
  if (!_llm) {
    _llm = ai({
      name: "google-gemini",
      apiKey: process.env.GOOGLE_API_KEY!,
      config: {
        model: AxAIGoogleGeminiModel.Gemini25Flash,
      },
    });
  }
  return _llm;
}

// Define the ParseImage signature with embedded instructions
const parseImageSignature = ax(`
  "You are a food inventory extraction assistant. Extract food items from images accurately. For RECEIPTS: parse OCR text, quantities like 24CT/1.5LB, interpret abbreviations. For PHOTOS: identify visible items, estimate quantities. Use lowercase singular names. Set confidence high/medium/low. Set needsReview=true when uncertain."
  imageData:image "Image of receipt, groceries, or fridge contents",
  sourceHint?:string "Optional hint: receipt, fridge, or groceries" ->
  sourceType:class "receipt, photo, mixed" "What type of image this is",
  items:json[] "Array of extracted food items with structure: {name: string, quantity: number, unit: string, confidence: 'high'|'medium'|'low', needsReview: boolean, rawText: string, categoryHint: 'produce'|'protein'|'dairy'|'pantry'|'frozen'|'beverage'|'unknown'}",
  notes?:string "Any issues with image quality, partial visibility, or extraction problems"
`);

export async function parseImage(
  imageBase64: string,
  sourceHint?: "receipt" | "fridge" | "groceries"
): Promise<VisionExtractionResult> {
  const result = await parseImageSignature.forward(
    getLlm(),
    {
      imageData: imageBase64,
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
