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

// System prompt for image parsing
const IMAGE_PARSE_PROMPT = `You are a food inventory extraction assistant. Extract food items from images accurately.

For RECEIPTS: parse OCR text, quantities like 24CT/1.5LB, interpret abbreviations.
For PHOTOS: identify visible items, estimate quantities.

Use lowercase singular names. Set confidence to high, medium, or low. Set needsReview to true when uncertain.`;

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
