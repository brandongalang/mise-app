# API Reference

Complete reference for all API endpoints in the Mise application.

## Base URL

**Development**: `http://localhost:3000/api/v1`  
**Production**: `https://your-domain.com/api/v1`

---

## Authentication

Currently, the API uses **session-based authentication** tied to the household ID from the authenticated user. Future implementations may use:
- Supabase Auth (JWT tokens)
- NextAuth.js
- Custom JWT

All endpoints assume a valid household context.

---

## Endpoints

### Chat

#### `POST /api/v1/chat`

**Purpose**: Stream AI agent responses using Server-Sent Events (SSE).

**Request Body**:
```typescript
{
  message: string | null;
  attachments?: Array<{
    type: 'image';
    data: string;        // base64-encoded image
    mimeType: string;    // e.g., 'image/jpeg'
  }>;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    attachments?: Array<{
      type: 'image';
      data: string;
      mimeType: string;
    }>;
  }>;
}
```

**Response**: SSE stream with events:

**Event Types**:

1. **`thinking`**
   ```json
   event: thinking
   data: { "status": "Looking at your image..." }
   ```

2. **`tool_start`**
   ```json
   event: tool_start
   data: {
     "id": "tool_1_1234567890",
     "name": "searchInventory",
     "args": { "query": "milk" }
   }
   ```

3. **`tool_end`**
   ```json
   event: tool_end
   data: {
     "id": "tool_1_1234567890",
     "name": "searchInventory",
     "result": { "count": 2, "items": [...] },
     "error": null
   }
   ```

4. **`stream`**
   ```json
   event: stream
   data: { "token": "I", "index": 1 }
   ```

5. **`message`** (fallback for non-streaming clients)
   ```json
   event: message
   data: { "content": "I found 2 items in your inventory..." }
   ```

6. **`actions`** (summary of tools used)
   ```json
   event: actions
   data: { "actions": ["searchInventory", "addInventory"] }
   ```

7. **`complete`**
   ```json
   event: complete
   data: { "success": true }
   ```

8. **`error`**
   ```json
   event: error
   data: { "message": "OpenRouter API key not configured" }
   ```

**Example Usage** (browser):
```typescript
const response = await fetch('/api/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What can I cook tonight?',
    conversationHistory: []
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n\n');
  
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      const eventType = line.replace('event: ', '').trim();
      const dataLine = lines[lines.indexOf(line) + 1];
      const data = JSON.parse(dataLine.replace('data: ', ''));
      
      console.log(eventType, data);
    }
  }
}
```

**Status Codes**:
- `200 OK` - SSE stream started
- `400 Bad Request` - Invalid request body
- `500 Internal Server Error` - Agent error

**Configuration**:
- Max duration: 60 seconds
- Streaming: Yes (SSE)
- Retries: Client-side retry logic recommended

---

### Inventory

#### `GET /api/v1/inventory/summary`

**Purpose**: Get a summary of household inventory grouped by category.

**Query Parameters**: None

**Response**:
```typescript
{
  expiringSoon: InventoryItem[];      // Items expiring within 3 days
  categories: Record<IngredientCategory, {
    count: number;
    items: InventoryItem[];
  }>;
  leftovers: InventoryItem[];         // Cooked dishes
  totalCount: number;                 // Total active items
}
```

**InventoryItem Type**:
```typescript
{
  id: string;
  containerId: string;
  masterId: string | null;
  name: string;
  category: string | null;
  quantity: number;
  remainingQty: number;
  unit: string;
  status: 'SEALED' | 'OPEN' | 'LOW' | 'EMPTY' | 'DELETED';
  purchaseUnit: string | null;
  expiresAt: Date | null;
  daysUntilExpiry: number;
  isLeftover: boolean;
  dishName: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  source: 'vision' | 'manual' | 'cooked';
  createdAt: Date;
}
```

**Example Response**:
```json
{
  "expiringSoon": [
    {
      "id": "c_milk_001",
      "name": "Milk",
      "quantity": 0.5,
      "unit": "gal",
      "status": "OPEN",
      "daysUntilExpiry": 2,
      "expiresAt": "2024-12-06T00:00:00Z"
    }
  ],
  "categories": {
    "dairy": {
      "count": 3,
      "items": [...]
    },
    "produce": {
      "count": 5,
      "items": [...]
    }
  },
  "leftovers": [
    {
      "id": "c_leftover_001",
      "dishName": "Chicken Stir Fry",
      "quantity": 3,
      "unit": "portion",
      "daysUntilExpiry": 4
    }
  ],
  "totalCount": 24
}
```

**Status Codes**:
- `200 OK` - Success
- `500 Internal Server Error` - Database error

**Caching**: Consider caching this endpoint (e.g., 30 seconds) for dashboard views.

---

## Agent Tool Functions

These are not direct API endpoints but are called by the AI agent via tool calling. They are documented here for reference.

### Inventory Tools

#### `searchInventory(filters)`

**Purpose**: Search/filter inventory items.

**Parameters**:
```typescript
{
  query?: string;                    // Text search
  masterId?: string;                 // Filter by ingredient
  category?: IngredientCategory;     // Filter by category
  status?: ContainerStatus[];        // Filter by status
  expiringWithinDays?: number;       // Items expiring soon
  includeLeftovers?: boolean;        // Include leftover dishes
  limit?: number;                    // Max results
}
```

**Returns**: `InventoryItem[]`

---

#### `addInventory(items)`

**Purpose**: Add new items to inventory.

**Parameters**:
```typescript
{
  items: Array<{
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
    source: 'vision' | 'manual' | 'cooked';
    confidence?: 'high' | 'medium' | 'low';
    visionJobId?: string;
  }>
}
```

**Returns**:
```typescript
{
  created: number;
  containers: Container[];
}
```

---

#### `addLeftover(input)`

**Purpose**: Add a leftover dish to inventory.

**Parameters**:
```typescript
{
  dishName: string;
  recipeId?: string;
  quantity: number;
  unit: string;
  expiresInDays?: number;  // Default: 4
}
```

**Returns**:
```typescript
{
  containerId: string;
}
```

---

#### `deductInventory(input)`

**Purpose**: Deduct/consume ingredients from inventory.

**Parameters**:
```typescript
{
  masterId: string;
  quantity: number;
  unit: string;
  reason: string;
}
```

**Returns**:
```typescript
{
  success: boolean;
  deducted: number;
  unit: string;
  containerId: string;
  remainingAfter: number;
  containerStatus: ContainerStatus;
  warning?: string;  // e.g., "Low stock"
}
```

---

#### `updateInventory(input)`

**Purpose**: Update existing inventory item.

**Parameters**:
```typescript
{
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
```

**Returns**:
```typescript
{
  success: boolean;
}
```

---

#### `deleteInventory(containerId, reason)`

**Purpose**: Remove/discard an inventory item.

**Parameters**:
- `containerId: string`
- `reason: string` (e.g., "expired", "threw away")

**Returns**:
```typescript
{
  success: boolean;
}
```

---

#### `mergeInventory(sourceId, targetId)`

**Purpose**: Merge two containers of the same ingredient.

**Parameters**:
- `sourceId: string` (container to empty)
- `targetId: string` (container to add to)

**Returns**:
```typescript
{
  success: boolean;
  newQty: number;
}
```

---

#### `getExpiringItems(withinDays)`

**Purpose**: Get items expiring soon.

**Parameters**:
- `withinDays: number` (default: 3)

**Returns**: `InventoryItem[]`

---

#### `resolveIngredient(name, categoryHint?)`

**Purpose**: Resolve a raw ingredient name to a canonical ingredient.

**Parameters**:
- `name: string`
- `categoryHint?: IngredientCategory`

**Returns**:
```typescript
{
  matchType: 'exact' | 'alias' | 'fuzzy' | 'none';
  masterId: string | null;
  canonicalName: string | null;
  confidence: number;
  alternatives: Array<{
    masterId: string;
    name: string;
    confidence: number;
  }>;
}
```

---

### Recipe Tools

#### `generateRecipe(inventory, expiring, constraints)`

**Purpose**: Generate a recipe using available ingredients.

**Parameters**:
```typescript
{
  inventory: InventoryItem[];
  expiring: InventoryItem[];
  constraints?: {
    maxTimeMins?: number;
    servings?: number;
    dietary?: string[];
  };
}
```

**Returns**:
```typescript
{
  title: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    inStock: boolean;
    availableQty?: number;
  }>;
  steps: string[];
  timeEstimateMins: number;
  usesExpiring: string[];
}
```

---

## Error Handling

All API endpoints return errors in this format:

```json
{
  "error": "Descriptive error message"
}
```

**Common Error Messages**:
- `"Message or attachment required"` - Empty chat request
- `"OPENROUTER_API_KEY environment variable is not set"` - Missing API key
- `"Could not find <ingredient> in inventory"` - Ingredient not found
- `"Internal server error"` - Database or agent error

**Client-Side Error Handling**:
```typescript
try {
  const response = await fetch('/api/v1/inventory/summary');
  if (!response.ok) {
    const { error } = await response.json();
    console.error('API Error:', error);
  }
} catch (err) {
  console.error('Network Error:', err);
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding:
- IP-based rate limiting (e.g., 100 requests/minute)
- Household-based rate limiting for chat endpoint
- Tool call rate limiting (prevent abuse)

**Recommended Libraries**:
- `express-rate-limit`
- `upstash/ratelimit` (for edge runtime)

---

## Webhooks

Future feature: Webhooks for inventory events.

**Potential Events**:
- `inventory.item_added`
- `inventory.item_expiring` (daily cron)
- `inventory.item_low`
- `recipe.cooked`

---

## SDK/Client Libraries

**TypeScript Client** (recommended):
```typescript
// src/lib/api-client.ts
export async function getChatStream(
  message: string,
  conversationHistory: Message[]
): Promise<ReadableStream> {
  const response = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory })
  });
  return response.body;
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const response = await fetch('/api/v1/inventory/summary');
  return response.json();
}
```

---

## Versioning

API is currently at **v1**. Future breaking changes will increment the version (e.g., `/api/v2/chat`).

**Versioning Strategy**:
- `/api/v1` - Current stable version
- `/api/v2` - Future version with breaking changes
- Maintain v1 for at least 6 months after v2 release

---

## Related Documentation

- [Database Schema](./database-schema.md) - Understand the data models
- [Agent System](./agent-system.md) - How the AI agent works
- [Component Guide](./component-guide.md) - Frontend integration patterns
