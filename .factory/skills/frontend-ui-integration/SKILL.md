---
name: frontend-ui-integration
description: Implement or extend a user-facing workflow in a web application, integrating with existing backend APIs. Use when the feature is primarily a UI/UX change backed by existing APIs, affects only the web frontend, and requires following design system, routing, and testing conventions.
---
# Skill: Frontend UI integration

## Purpose

Implement or extend a user-facing workflow in our primary web application, integrating with **existing backend APIs** and following our **design system, routing, and testing conventions**.

## When to use this skill

- The feature is primarily a **UI/UX change** backed by one or more existing APIs.
- The backend contracts, auth model, and core business rules **already exist**.
- The change affects **only** the web frontend (no schema or service ownership changes).

## Inputs

- **Feature description**: short narrative of the user flow and outcomes.
- **Relevant APIs**: endpoints, request/response types, and links to source definitions.
- **Target routes/components**: paths, component names, or feature modules.
- **Design references**: Figma links or existing screens to mirror.
- **Guardrails**: performance limits, accessibility requirements, and any security constraints.

## Out of scope

- Creating new backend services or changing persistent data models.
- Modifying authentication/authorization flows.
- Introducing new frontend frameworks or design systems.

## Conventions

- **Framework**: React with TypeScript.
- **Routing**: use the existing router and route layout patterns.
- **Styling**: use the in-house design system components (Buttons, Inputs, Modals, Toasts, etc.).
- **State management**: prefer the existing state libraries (e.g., React Query, Redux, Zustand) and follow established patterns.

## Required behavior

1. Implement the UI changes with **strong typing** for all props and API responses.
2. Handle loading, empty, error, and success states using existing primitives.
3. Ensure the UI is **keyboard accessible** and screen-reader friendly.
4. Respect feature flags and rollout mechanisms where applicable.

## Required artifacts

- Updated components and hooks in the appropriate feature module.
- **Unit tests** for core presentation logic.
- **Integration or component tests** for the new flow (e.g., React Testing Library, Cypress, Playwright) where the repo already uses them.
- Minimal **CHANGELOG or PR description text** summarizing the behavior change (to be placed in the PR, not this file).

## Implementation checklist

1. Locate the relevant feature module and existing components.
2. Confirm the backend APIs and types, updating shared TypeScript types if needed.
3. Implement the UI, wiring in API calls via the existing data layer.
4. Add or update tests to cover the new behavior and edge cases.
5. Run the required validation commands (see below).

## Verification

Run the following (adjust commands to match the project):

- `npm run lint`
- `npm test`
- `npm run build`

The skill is complete when:

- All tests, linters, and type checks pass.
- The new UI behaves as specified across normal, error, and boundary cases.
- No unrelated files or modules are modified.

## Safety and escalation

- If the requested change requires backend contract changes, **stop** and request a backend-focused task instead.
- If design references conflict with existing accessibility standards, favor accessibility and highlight the discrepancy in the PR description.

## Implementation Workflow

### Discovery Phase
1. Understand the feature requirements and acceptance criteria
2. Explore codebase structure:
   - Use `Glob` to find similar components and patterns
   - Use `Grep` to understand naming conventions and implementations
   - Use `Read` to examine relevant files and type definitions
3. Check API contracts and backend code
4. Map requirements to component architecture

### Implementation Loop
1. **Plan Phase**: 
   - Identify which components need creation vs modification
   - Map API contracts to component props and state
   - Plan component hierarchy (parent → child)
   - Document any new types needed in `lib/types.ts`

2. **Build Phase**:
   - Create files with proper TypeScript typing
   - Import from existing design system and shared utilities
   - Wire API calls via existing data layer (hooks)
   - Follow established naming conventions (PascalCase components, camelCase functions)
   - Build lower-level components first, then compose upward

3. **Verify Phase**:
   - Run `npm run build` to check TypeScript compilation
   - Run `npm run lint` to catch style issues
   - Verify no console errors in output
   - Test interactive behavior if applicable

4. **Review Phase**:
   - Review changes for completeness against requirements
   - Ensure all acceptance criteria are met
   - Check component interfaces are clean and typed
   - Verify styling matches design system

### Multi-Component Features
For features spanning multiple components:
1. Build lower-level components first (primitives, reusable UI)
2. Compose them in container/page-level components
3. Test integration with existing pages
4. Keep component responsibilities focused and single-purpose

## Meal App Specifics

### Backend APIs
- **Chat**: `POST /api/v1/chat` with SSE streaming
  - Request: `{ message: string, imageBase64?: string, conversationHistory?: Message[] }`
  - Response: SSE events (thinking, message, actions, complete, error)
- **Inventory Summary**: `GET /api/v1/inventory/summary`
  - Response: `{ containers: Container[], contents: Content[], stats: InventoryStats }`

### Design System
- **Colors** (CSS variables): `--color-cream`, `--color-herb`, `--color-tomato`, `--color-citrus`, `--color-clay`
- **Typography**: `--font-display` (Playfair), `--font-body` (Source Sans)
- **Components**: Custom React components (not ShadCN - using Framer Motion for animations)
- **Spacing**: `--space-4` (1rem), `--space-6` (1.5rem), etc.

### State Management Pattern
```typescript
// Hook pattern (preferred)
function useSomething() {
  const [state, setState] = useState<Type>(initial);
  const handleAction = useCallback(() => { /* ... */ }, []);
  return { state, handleAction };
}

// Avoid: Context unless multiple levels of prop drilling
// Avoid: Redux/Zustand - keep state local to components when possible
```

### Component Organization
```
src/components/
├── chat/           # Chat-related components
│   ├── ChatContainer.tsx
│   ├── ChatInput.tsx
│   ├── MessageBubble.tsx
│   └── ThinkingIndicator.tsx
├── dashboard/      # Dashboard views
├── inventory/      # Inventory management
├── layout/         # Layout wrappers
├── ui/             # Primitive/reusable UI
└── alerts/         # Toast/alert components
```

### Testing Strategy
- Component rendering: React Testing Library snapshots
- User interactions: fireEvent or userEvent
- API integration: Mock fetch responses in tests
- Check test patterns in existing test files before writing new ones

### Common Patterns

**SSE Streaming Hook**:
```typescript
async function* streamFromAPI(endpoint: string, body: any) {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    // Parse SSE format: "event: type\ndata: json\n\n"
    yield parseSSEEvent(text);
  }
}
```

**API Error Handling**:
```typescript
try {
  // API call
} catch (error) {
  if (error instanceof Error) {
    // Handle with toast or error state
  }
}
```

### Keyboard & Accessibility
- All inputs must be focusable with Tab key
- Buttons need :focus-visible outline
- Use semantic HTML (button, input, textarea, etc.)
- Test with screen readers for interactive components
- Ensure color contrast meets WCAG AA standards

### Performance Considerations
- Use `useCallback` for event handlers passed to child components
- Memoize expensive computations with `useMemo`
- Keep component tree shallow to avoid deep re-renders
- Lazy load heavy components (images, modals) when possible
- Monitor bundle size with `npm run build` analysis
