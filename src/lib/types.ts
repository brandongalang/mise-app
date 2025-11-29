// Inventory types
export type ContainerStatus = "SEALED" | "OPEN" | "LOW" | "EMPTY" | "DELETED";
export type IngredientCategory = "produce" | "protein" | "dairy" | "pantry" | "frozen" | "beverage" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type Source = "vision" | "manual" | "cooked";

// Search filters
export interface SearchInventoryFilters {
  query?: string;
  masterId?: string;
  category?: IngredientCategory;
  status?: ContainerStatus[];
  expiringWithinDays?: number;
  includeLeftovers?: boolean;
  limit?: number;
}

// Inventory item with joined data
export interface InventoryItem {
  id: string; // Added id (mapped from containerId)
  containerId: string;
  masterId: string | null;
  name: string;
  category: string | null;
  quantity: number; // Added quantity (mapped from remainingQty)
  remainingQty: number;
  unit: string;
  status: ContainerStatus;
  purchaseUnit: string | null;
  expiresAt: Date | null;
  daysUntilExpiry: number; // Changed from number | null to number (handled by API/hook)
  isLeftover: boolean;
  dishName: string | null;
  confidence: Confidence | null;
  source: Source;
  createdAt: Date;
}

// Add inventory input
export interface AddInventoryItem {
  masterId?: string;
  name: string;
  category?: IngredientCategory;
  defaultUnit?: string;
  defaultShelfLifeDays?: number;
  container: {
    unit: string;
    quantity?: number;
    status?: ContainerStatus;
  };
  contents: {
    quantity: number;
    unit: string;
  };
  expiresAt?: Date;
  source: Source;
  confidence?: Confidence;
  visionJobId?: string;
}

// Add leftover input
export interface AddLeftoverInput {
  dishName: string;
  recipeId?: string;
  quantity: number;
  unit: string;
  expiresInDays?: number;
}

// Update inventory input
export interface UpdateInventoryInput {
  containerId: string;
  updates: {
    remainingQty?: number;
    unit?: string;
    status?: ContainerStatus;
    expiresAt?: Date;
    masterId?: string;
    name?: string;
  };
  reason?: string;
}

// Deduct inventory input
export interface DeductInventoryInput {
  masterId: string;
  quantity: number;
  unit: string;
  reason: string;
}

// Deduct result
export interface DeductResult {
  success: boolean;
  deducted: number;
  unit: string;
  containerId: string;
  remainingAfter: number;
  containerStatus: ContainerStatus;
  warning?: string;
}

// Vision extraction types
export interface VisionItem {
  name: string;
  quantity: number;
  unit: string;
  confidence: Confidence;
  needsReview: boolean;
  rawText: string;
  categoryHint: IngredientCategory;
}

export interface VisionExtractionResult {
  sourceType: "receipt" | "photo" | "mixed";
  items: VisionItem[];
  notes?: string;
}

// Recipe types
export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  inStock: boolean;
  availableQty?: number;
}

export interface GeneratedRecipe {
  title: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  timeEstimateMins: number;
  usesExpiring: string[];
}

export interface RecipeConstraints {
  maxTimeMins?: number;
  servings?: number;
  dietary?: string[];
}

// Chat types
export interface Attachment {
  type: 'image';
  data: string; // base64
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  actionCard?: RecipeCard | ConfirmationCard;
}

export interface RecipeCard {
  type: 'recipe';
  title: string;
  timeEstimateMins: number;
  usesExpiring: string[];
  ingredients: Array<{ name: string; inStock: boolean }>;
  steps: string[];
}

export interface ConfirmationCard {
  type: 'confirmation';
  action: 'add' | 'deduct' | 'delete';
  items: Array<{ name: string; quantity: number; unit: string }>;
  confirmed: boolean;
}

export interface InventorySummary {
  expiringSoon: InventoryItem[];
  categories: Record<IngredientCategory, { count: number; items: InventoryItem[] }>;
  leftovers: InventoryItem[];
  totalCount: number;
}
