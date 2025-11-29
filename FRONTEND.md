# Mise - Frontend Implementation Spec

> Kitchen inventory assistant with chat-first interface
> Target: Mobile-first, evolving to dashboard

## Quick Start

```bash
# Install dependencies
npm install framer-motion @fontsource/fraunces @fontsource/dm-sans

# Optional: shadcn for Drawer component
npx shadcn@latest init
npx shadcn@latest add drawer

# Start dev server
npm run dev
```

Open http://localhost:3000

---

## 1. Design System

### Color Palette

Add to `globals.css`:

```css
:root {
  /* Base */
  --color-cream: #FDF6E3;
  --color-cream-dark: #F5ECD3;
  --color-clay: #D4A574;
  --color-clay-light: #E8C9A8;

  /* Accents */
  --color-tomato: #E63946;
  --color-tomato-dark: #C62B38;
  --color-herb: #2D5016;
  --color-herb-light: #4A7A2A;
  --color-citrus: #FF8C42;
  --color-eggplant: #5B2C6F;

  /* Neutrals */
  --color-charcoal: #2C3E50;
  --color-warm-gray: #8B8680;
  --color-warm-gray-light: #B8B4AE;

  /* Semantic */
  --color-expiry-urgent: var(--color-tomato);
  --color-expiry-soon: var(--color-citrus);
  --color-expiry-ok: var(--color-herb);

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(44, 62, 80, 0.08);
  --shadow-md: 0 4px 12px rgba(44, 62, 80, 0.12);
  --shadow-lg: 0 8px 24px rgba(44, 62, 80, 0.16);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 9999px;
}
```

### Typography

In `layout.tsx`, import fonts:
```typescript
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
```

In `globals.css`:
```css
:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;

  /* Scale */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 2rem;      /* 32px */
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-charcoal);
  background: var(--color-cream);
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 600;
}
```

### Spacing

```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
}
```

---

## 2. Component Specifications

### Approach: Hybrid shadcn + Custom

| Component | Approach | Reason |
|-----------|----------|--------|
| BottomSheet/Drawer | **shadcn (Vaul)** | Gesture handling, accessibility |
| Dialog/Modal | **shadcn** | Focus trap, escape handling |
| MessageBubble | **Custom** | Full aesthetic control |
| ChatInput | **Custom** | Simple, custom styling |
| RecipeCard | **Custom** | Unique design |
| InventoryItem | **Custom** | Custom expiry colors |
| ExpiringBanner | **Custom** | Simple alert |

---

### 2.1 ChatContainer

**File**: `src/components/chat/ChatContainer.tsx`

**Purpose**: Main wrapper for the chat interface. Manages message state and SSE connection.

```typescript
interface ChatContainerProps {
  className?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    type: 'image';
    data: string;
    mimeType: string;
  }>;
  actionCard?: RecipeCard | ConfirmationCard;
}

interface RecipeCard {
  type: 'recipe';
  title: string;
  timeEstimateMins: number;
  usesExpiring: string[];
  ingredients: Array<{ name: string; inStock: boolean }>;
  steps: string[];
}

interface ConfirmationCard {
  type: 'confirmation';
  action: 'add' | 'deduct' | 'delete';
  items: Array<{ name: string; quantity: number; unit: string }>;
  confirmed: boolean;
}
```

**State**:
- `messages: Message[]` - conversation history
- `isThinking: boolean` - show loading indicator
- `thinkingText: string` - "Thinking..." or "Analyzing image..."

**Behavior**:
- Scroll to bottom on new message
- Persist conversation in localStorage (optional)
- Handle SSE reconnection on error

---

### 2.2 MessageBubble

**File**: `src/components/chat/MessageBubble.tsx`

```typescript
interface MessageBubbleProps {
  message: Message;
  onRecipeExpand?: (recipe: RecipeCard) => void;
}
```

**Styling**:
- User bubble: `bg-herb text-white rounded-lg rounded-br-sm`
- Assistant bubble: `bg-cream-dark border border-clay-light rounded-lg rounded-bl-sm`
- Max width: 85% of container
- Padding: `var(--space-3) var(--space-4)`

**Image attachments**: Show as thumbnail (64x64) with rounded corners, tap to view full.

---

### 2.3 ChatInput

**File**: `src/components/chat/ChatInput.tsx`

```typescript
interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

**Layout**:
```
┌──────────────────────────────────┐
│ [📷] [  Type a message...  ] [→] │
└──────────────────────────────────┘
```

**Behavior**:
- Camera button opens native picker (camera + gallery)
- When image selected, show thumbnail preview above input
- Send button disabled when empty
- Submit on Enter (unless Shift+Enter for newline)
- Auto-resize textarea up to 4 lines

**Styling**:
- Sticky to bottom with `safe-area-inset-bottom` padding
- Background: `var(--color-cream)` with top border
- Input: `bg-white rounded-full px-4 py-3`

---

### 2.4 QuickActionChips

**File**: `src/components/chat/QuickActionChips.tsx`

```typescript
interface QuickActionChipsProps {
  onAction: (action: 'scan' | 'recipe' | 'inventory') => void;
  visible: boolean; // hide when keyboard open
}
```

**Chips**:
- 📸 Scan Receipt/Fridge
- 🥗 What Can I Cook?
- 📦 View Inventory

**Styling**:
- Horizontal scroll, no wrap
- Each chip: `bg-white border border-clay rounded-full px-4 py-2`
- Active state: `bg-clay text-white`

---

### 2.5 ThinkingIndicator

**File**: `src/components/chat/ThinkingIndicator.tsx`

```typescript
interface ThinkingIndicatorProps {
  text?: string; // "Thinking..." | "Analyzing your image..."
}
```

**Animation**: Three bouncing dots with staggered delay (Framer Motion)

```typescript
const dotVariants = {
  bounce: {
    y: [0, -8, 0],
    transition: { duration: 0.6, repeat: Infinity }
  }
};
```

---

### 2.6 RecipePreviewCard

**File**: `src/components/chat/RecipePreviewCard.tsx`

```typescript
interface RecipePreviewCardProps {
  recipe: RecipeCard;
  onExpand: () => void;
  expanded?: boolean;
}
```

**Collapsed State**:
```
┌─────────────────────────────┐
│ 🍳 Spinach Frittata         │
│ 25 min • Uses: spinach,     │
│ eggs, cheese                │
│ [View Full Recipe →]        │
└─────────────────────────────┘
```

**Expanded State** (inline or panel):
- Full ingredient list with checkmarks for in-stock items
- Numbered steps
- "I cooked this!" button to deduct ingredients

**Styling**:
- Card: `bg-white rounded-lg shadow-md p-4`
- Title: `font-display text-lg`
- Time badge: `bg-citrus/20 text-citrus rounded-full px-2`

---

### 2.7 InventorySheet

**File**: `src/components/inventory/InventorySheet.tsx`

```typescript
interface InventorySheetProps {
  open: boolean;
  onClose: () => void;
}
```

**Implementation**: Use shadcn Drawer (Vaul) for:
- Slide up from bottom
- Drag handle at top
- Initial height: 50vh, expandable to 90vh
- Swipe down to dismiss

**Uses**: `useInventory()` hook to fetch from `/api/v1/inventory/summary`

---

### 2.8 InventoryItem

**File**: `src/components/inventory/InventoryItem.tsx`

```typescript
interface InventoryItemProps {
  item: InventoryItem; // from lib/types.ts
  onTap?: () => void;
}
```

**Layout**:
```
┌────────────────────────────────┐
│ 🥬  Spinach              2 days│
│     1 bunch • OPEN             │
└────────────────────────────────┘
```

**Expiry color coding**:
- `daysUntilExpiry <= 2`: `text-tomato` + red dot
- `daysUntilExpiry <= 5`: `text-citrus` + orange dot
- `daysUntilExpiry > 5`: `text-herb` + green dot

**Status badge**: SEALED (green), OPEN (yellow), LOW (red)

---

### 2.9 ExpiringBanner

**File**: `src/components/alerts/ExpiringBanner.tsx`

```typescript
interface ExpiringBannerProps {
  items: InventoryItem[];
  onTap: () => void;
  onDismiss: () => void;
}
```

**Condition**: Show when `items.length > 0` and not dismissed today

**Layout**:
```
┌─────────────────────────────────────┐
│ ⚠️ 3 items expiring soon     [✕]   │
│    Milk expires tomorrow            │
└─────────────────────────────────────┘
```

**Styling**: `bg-citrus/10 border-l-4 border-citrus`

---

## 3. API Integration

### useChat Hook

**File**: `src/hooks/useChat.ts`

```typescript
interface UseChatReturn {
  messages: Message[];
  isThinking: boolean;
  thinkingText: string;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  clearHistory: () => void;
}

export function useChat(): UseChatReturn {
  // SSE connection to POST /api/v1/chat
  // Handle events: 'thinking', 'message', 'actions', 'complete', 'error'
}
```

**SSE Event Handling**:
```typescript
// Use fetch with ReadableStream (NOT EventSource - need POST):
const response = await fetch('/api/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, attachments, conversationHistory })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Parse SSE format: "event: {type}\ndata: {json}\n\n"
  // Update state based on event type
}
```

### useInventory Hook

**File**: `src/hooks/useInventory.ts`

```typescript
interface UseInventoryReturn {
  summary: InventorySummary | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface InventorySummary {
  expiringSoon: InventoryItem[];
  categories: Record<IngredientCategory, { count: number; items: InventoryItem[] }>;
  leftovers: InventoryItem[];
  totalCount: number;
}
```

---

## 4. File Structure

```
src/
├── app/
│   ├── page.tsx              # MODIFY: Main chat interface
│   ├── layout.tsx            # MODIFY: Add font imports
│   └── globals.css           # MODIFY: Add design system
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx     # CREATE
│   │   ├── MessageBubble.tsx     # CREATE
│   │   ├── ChatInput.tsx         # CREATE
│   │   ├── QuickActionChips.tsx  # CREATE
│   │   ├── ThinkingIndicator.tsx # CREATE
│   │   └── RecipePreviewCard.tsx # CREATE
│   ├── inventory/
│   │   ├── InventorySheet.tsx    # CREATE
│   │   ├── InventoryItem.tsx     # CREATE
│   │   └── CategoryTabs.tsx      # CREATE
│   ├── alerts/
│   │   └── ExpiringBanner.tsx    # CREATE
│   └── ui/
│       └── Badge.tsx             # CREATE
├── hooks/
│   ├── useChat.ts                # CREATE
│   └── useInventory.ts           # CREATE
├── lib/
│   ├── types.ts                  # EXISTS (use existing types)
│   └── image-utils.ts            # CREATE (resize helper)
```

---

## 5. Implementation Order

Follow `bd ready` to see unblocked work. Current order:

1. **meal-12: Design System Setup** (P0)
   - Install fonts, update globals.css, layout.tsx

2. **meal-14: useChat Hook** (P0)
   - SSE parsing, message state management

3. **meal-9: Chat UI Component** (P0) - blocked by 12, 14
   - ChatContainer, MessageBubble, ChatInput, ThinkingIndicator, QuickActionChips

4. **meal-11: Image Upload Handling** (P1) - blocked by 9
   - Camera picker, resize, preview in ChatInput

5. **meal-15: useInventory Hook** (P1)
   - Fetch inventory summary

6. **meal-10: Dashboard UI Component** (P1) - blocked by 9, 15
   - InventorySheet, InventoryItem, CategoryTabs, ExpiringBanner

7. **meal-13: Recipe Preview Card** (P1) - blocked by 9
   - Expandable card in chat

---

## 6. Testing Checklist

- [ ] Mobile Safari (iOS 15+)
- [ ] Mobile Chrome (Android)
- [ ] Desktop Chrome (responsive mode)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] VoiceOver/TalkBack screen reader
- [ ] Lighthouse performance > 90
- [ ] No layout shift on message load
- [ ] Camera works on iOS and Android
- [ ] Safe area insets respected (notch, home indicator)
