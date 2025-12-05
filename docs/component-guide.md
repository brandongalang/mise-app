# Component Architecture Guide

Complete reference for the UI component system in the Mise application.

## Design Philosophy

The component architecture follows these principles:

1. **Composition over Configuration**: Small, focused components that compose together
2. **Separation of Concerns**: UI components separate from business logic
3. **Mobile-First**: Optimized for touch interactions and small screens
4. **Type Safety**: Fully typed with TypeScript
5. **Accessibility**: Keyboard navigation, ARIA labels, screen reader support

---

## Component Structure

```
src/components/
├── chat/              # Chat interface components
├── inventory/         # Inventory management UI
├── dashboard/         # Dashboard views
├── alerts/            # Notification components
├── layout/            # Navigation and shell
├── profiles/          # Profile management
├── ui/                # Base UI primitives
└── skeletons/         # Loading states
```

---

## Core Components

### Chat Components

#### `ChatContainer` 
**File**: `src/components/chat/ChatContainer.tsx`

**Purpose**: Main chat interface orchestrator.

**State Management**:
```typescript
{
  messages: Message[];
  isThinking: boolean;
  toolCalls: ToolCall[];
}
```

**Key Features**:
- SSE streaming via `useChat` hook
- Auto-scroll to bottom on new messages
- Conversation history persistence (localStorage)
- Tool call visualization

**Usage**:
```tsx
<ChatContainer className="h-full" />
```

---

#### `MessageBubble`
**File**: `src/components/chat/MessageBubble.tsx`

**Props**:
```typescript
{
  message: Message;
  onRecipeExpand?: (recipe: RecipeCard) => void;
}
```

**Styling**:
- User messages: Right-aligned, herb background
- Assistant messages: Left-aligned, cream background
- Image attachments: Rounded thumbnails
- Markdown rendering via `streamdown`

**Example**:
```tsx
<MessageBubble 
  message={{
    id: '1',
    role: 'assistant',
    content: 'I found **3 items** expiring soon...',
    timestamp: new Date()
  }}
/>
```

---

#### `ChatInput`
**File**: `src/components/chat/ChatInput.tsx`

**Props**:
```typescript
{
  onSend: (message: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

**Features**:
- Textarea with auto-resize (up to 4 lines)
- Camera button for image upload
- Image preview with removal
- Submit on Enter (Shift+Enter for newline)
- Disabled state during agent thinking

**Mobile Considerations**:
- Sticky to bottom with safe area insets
- Keyboard dismissal on submit
- Haptic feedback on button press

---

#### `ThinkingIndicator`
**File**: `src/components/chat/ThinkingIndicator.tsx`

**Props**:
```typescript
{
  text?: string;  // Default: "Thinking..."
}
```

**Animation**: Three bouncing dots using Framer Motion.

```tsx
<ThinkingIndicator text="Looking at your image..." />
```

---

#### `ToolCall`
**File**: `src/components/chat/ToolCall.tsx`

**Props**:
```typescript
{
  toolCall: ToolCall;
  expanded?: boolean;
}
```

**UI**:
```
┌─────────────────────────────────────┐
│ 🔍 searchInventory        ▸        │
│   Args: { query: "milk" }          │
│   Result: 2 items found            │
└─────────────────────────────────────┘
```

**States**:
- `pending`: Gray, spinner
- `running`: Blue, animated
- `completed`: Green, check icon
- `error`: Red, error icon

---

#### `RecipePreviewCard`
**File**: `src/components/chat/RecipePreviewCard.tsx`

**Props**:
```typescript
{
  recipe: RecipeCard;
  onExpand: () => void;
  expanded?: boolean;
}
```

**Collapsed State**:
```
┌─────────────────────────────────────┐
│ 🍳 Spinach Frittata                │
│ 25 min • Uses: spinach, eggs       │
│ [View Full Recipe →]               │
└─────────────────────────────────────┘
```

**Expanded State**:
- Full ingredient list with stock status (✅/❌)
- Numbered cooking steps
- "I cooked this!" confirmation button

---

#### `QuickActionChips`
**File**: `src/components/chat/QuickActionChips.tsx`

**Props**:
```typescript
{
  onAction: (action: 'scan' | 'recipe' | 'inventory') => void;
  visible: boolean;
}
```

**Chips**:
- 📸 Scan Receipt/Fridge
- 🥗 What Can I Cook?
- 📦 View Inventory

**Behavior**: Horizontal scroll, hide when keyboard is open

---

### Inventory Components

#### `InventorySheet`
**File**: `src/components/inventory/InventorySheet.tsx`

**Props**:
```typescript
{
  open: boolean;
  onClose: () => void;
}
```

**Implementation**: Uses Vaul drawer (shadcn).

**Features**:
- Slide up from bottom
- Drag handle at top
- Initial height: 50vh
- Swipe down to dismiss
- Expandable to 90vh

**Data Fetching**: Via `useInventory` hook.

---

#### `InventoryItem`
**File**: `src/components/inventory/InventoryItem.tsx`

**Props**:
```typescript
{
  item: InventoryItem;
  onTap?: () => void;
}
```

**Layout**:
```
┌────────────────────────────────┐
│ 🥬  Spinach          2 days    │
│     1 bunch • OPEN             │
└────────────────────────────────┘
```

**Expiry Color Coding**:
- ≤ 2 days: Red (tomato)
- ≤ 5 days: Orange (citrus)
- \> 5 days: Green (herb)

**Status Badges**:
- SEALED: Green
- OPEN: Yellow
- LOW: Red

---

#### `CategoryTabs`
**File**: `src/components/inventory/CategoryTabs.tsx`

**Props**:
```typescript
{
  categories: IngredientCategory[];
  activeCategory: IngredientCategory;
  onCategoryChange: (category: IngredientCategory) => void;
}
```

**Categories**:
- Produce 🥬
- Protein 🍗
- Dairy 🥛
- Pantry 🍞
- Frozen ❄️
- Beverage 🥤

---

### Dashboard Components

#### `DashboardView`
**File**: `src/components/dashboard/DashboardView.tsx`

**Purpose**: Main dashboard orchestrator.

**Sections**:
1. **Expiring Banner** (if items expiring < 3 days)
2. **Eat First Section** (leftovers + expiring items)
3. **Inventory Summary** (by category)

**Data**:
```typescript
const { summary, isLoading } = useInventory();
```

---

#### `EatFirstSection`
**File**: `src/components/dashboard/EatFirstSection.tsx`

**Purpose**: Highlight items to prioritize.

**Data Sources**:
- Leftovers (sorted by expiry)
- Items expiring within 3 days

**UI**: Grid of `InventoryItem` cards.

---

#### `LeftoverCard`
**File**: `src/components/dashboard/LeftoverCard.tsx`

**Props**:
```typescript
{
  leftover: InventoryItem;
  onTap?: () => void;
}
```

**Layout**:
```
┌─────────────────────────────────────┐
│ 🍲 Chicken Stir Fry                │
│    3 portions • Expires in 4 days  │
└─────────────────────────────────────┘
```

---

### Alert Components

#### `ExpiringBanner`
**File**: `src/components/alerts/ExpiringBanner.tsx`

**Props**:
```typescript
{
  items: InventoryItem[];
  onTap: () => void;
  onDismiss: () => void;
}
```

**Condition**: Show when `items.length > 0` and not dismissed today.

**Layout**:
```
┌─────────────────────────────────────┐
│ ⚠️ 3 items expiring soon      [✕]  │
│    Milk expires tomorrow            │
└─────────────────────────────────────┘
```

**Styling**: Orange background with left border.

---

### Layout Components

#### `MainLayout`
**File**: `src/components/layout/MainLayout.tsx`

**Purpose**: Root layout with navigation.

**Structure**:
```tsx
<MainLayout>
  <Header />
  <main>{children}</main>
  <BottomNav />
</MainLayout>
```

**Safe Area**: Handles notch, home indicator on mobile.

---

#### `BottomNav`
**File**: `src/components/layout/BottomNav.tsx`

**Tabs**:
- 🏠 Kitchen (Dashboard)
- 💬 Assistant (Chat)

**State**: Managed in `MainLayout` or via URL routing.

---

#### `Header`
**File**: `src/components/layout/Header.tsx`

**Elements**:
- App logo/title
- Profile switcher button (right)
- Optional back button (left)

---

### Profile Components

#### `ProfileSwitcher`
**File**: `src/components/profiles/ProfileSwitcher.tsx`

**Purpose**: Netflix-style profile selector.

**UI**: Grid of profile cards with avatars.

**Features**:
- PIN protection (if set)
- Create new profile
- Edit existing profiles

---

#### `ProfileCard`
**File**: `src/components/profiles/ProfileCard.tsx`

**Props**:
```typescript
{
  profile: Profile;
  onSelect: () => void;
  onEdit?: () => void;
}
```

**Layout**:
```
┌───────────────┐
│   👤          │
│   Brandon     │
└───────────────┘
```

**Avatar Colors**: terracotta, sage, mustard, plum, etc.

---

#### `PinModal`
**File**: `src/components/profiles/PinModal.tsx`

**Purpose**: Prompt for PIN when selecting protected profile.

**UI**: 4-digit numeric input with keypad.

---

### UI Primitives

#### `Badge`
**File**: `src/components/ui/Badge.tsx`

**Props**:
```typescript
{
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}
```

**Usage**:
```tsx
<Badge variant="warning">LOW</Badge>
<Badge variant="success">SEALED</Badge>
```

---

#### `Skeleton`
**File**: `src/components/ui/Skeleton.tsx`

**Purpose**: Loading state placeholder.

**Variants**:
- `SkeletonCard` (for inventory items)
- `SkeletonList` (for lists)
- `DashboardSkeleton` (for full dashboard)

---

## Hooks

### `useChat`
**File**: `src/hooks/useChat.ts`

**Purpose**: Manage chat state and SSE streaming.

**Returns**:
```typescript
{
  messages: Message[];
  isThinking: boolean;
  thinkingText: string;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  clearHistory: () => void;
}
```

**SSE Event Handling**:
```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Parse SSE: "event: {type}\ndata: {json}\n\n"
  
  switch (eventType) {
    case 'thinking':
      setIsThinking(true);
      setThinkingText(data.status);
      break;
    case 'stream':
      updateCurrentMessage(data.token);
      break;
    case 'complete':
      setIsThinking(false);
      break;
  }
}
```

**Persistence**: Save conversation to localStorage.

---

### `useInventory`
**File**: `src/hooks/useInventory.ts`

**Purpose**: Fetch inventory summary.

**Returns**:
```typescript
{
  summary: InventorySummary | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Implementation**:
```typescript
const [summary, setSummary] = useState<InventorySummary | null>(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetch('/api/v1/inventory/summary')
    .then(res => res.json())
    .then(setSummary)
    .finally(() => setIsLoading(false));
}, []);
```

**Refetch Trigger**: Call `refetch()` after inventory changes.

---

## Styling System

### Design Tokens

**Colors** (`globals.css`):
```css
:root {
  --color-cream: #FDF6E3;
  --color-clay: #D4A574;
  --color-tomato: #E63946;
  --color-citrus: #FF8C42;
  --color-herb: #2D5016;
  --color-charcoal: #2C3E50;
}
```

**Typography**:
```css
:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-display);
}
```

**Spacing**:
```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
}
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile-first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
```

### Mobile Optimizations

- **Safe Area Insets**: `padding-bottom: env(safe-area-inset-bottom)`
- **Touch Targets**: Minimum 44x44px for buttons
- **Swipe Gestures**: Vaul drawer, horizontal chip scrolling
- **Viewport Height**: Use `100dvh` (dynamic viewport height)

---

## Accessibility

### Keyboard Navigation

- **Tab order**: Logical flow (top to bottom, left to right)
- **Enter/Space**: Activate buttons
- **Escape**: Close modals/drawers
- **Arrow keys**: Navigate lists/tabs

### ARIA Labels

```tsx
<button aria-label="Send message">
  <SendIcon />
</button>

<input aria-label="Type a message" placeholder="Type a message..." />
```

### Screen Reader Support

- **Live regions**: Announce chat messages
- **Status updates**: Tool call progress
- **Form labels**: All inputs have associated labels

---

## Testing

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';

test('renders user message', () => {
  render(<MessageBubble message={{
    id: '1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date()
  }} />);
  
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Integration Tests

```typescript
test('chat flow', async () => {
  const { user } = render(<ChatContainer />);
  
  await user.type(screen.getByPlaceholderText('Type a message...'), 'Hello');
  await user.click(screen.getByLabelText('Send message'));
  
  expect(await screen.findByText(/thinking/i)).toBeInTheDocument();
});
```

---

## Component Patterns

### Compound Components

```tsx
<InventorySheet open={isOpen} onClose={handleClose}>
  <CategoryTabs categories={categories} />
  <InventoryList items={items} />
</InventorySheet>
```

### Render Props

```tsx
<InventoryItem
  item={item}
  renderActions={(item) => (
    <button onClick={() => handleEdit(item)}>Edit</button>
  )}
/>
```

### Custom Hooks

```tsx
function useExpiringItems() {
  const { summary } = useInventory();
  return summary?.expiringSoon || [];
}
```

---

## Future Enhancements

- **Virtualized Lists**: React Window for large inventories
- **Optimistic Updates**: Update UI before server response
- **Offline Support**: Service worker + IndexedDB
- **Animations**: Framer Motion for page transitions
- **Dark Mode**: CSS custom properties for themes

---

## Related Documentation

- [API Reference](./api-reference.md) - Data contracts for components
- [Agent System](./agent-system.md) - Chat integration details
- [Database Schema](./database-schema.md) - Data models
