# Mise - Kitchen Inventory Assistant

A personal kitchen assistant application that helps you track inventory, reduce food waste, and discover recipes using AI vision and chat.

**Target**: Mobile-first, evolving to dashboard.

## Overview

Mise combines a chat-first interface with a visual inventory dashboard to make kitchen management effortless. It leverages AI to recognize ingredients from photos (receipts, fridge, pantry) and suggests recipes based on what you have, prioritizing items expiring soon.

## Features

*   **AI Chat Assistant**: Interact with your kitchen via text or voice (coming soon). Ask "What can I cook?", "Add milk to my list", or "Scan this receipt".
*   **Visual Inventory Tracking**:
    *   **Dashboard**: View your pantry at a glance.
    *   **Category Filtering**: Filter by Produce, Protein, Dairy, etc.
    *   **Expiry Tracking**: Visual indicators for items expiring soon (Red = Urgent, Orange = Soon, Green = OK).
    *   **Leftovers Management**: Dedicated tracking for cooked meals.
*   **Smart Scanning**:
    *   **Receipt Scanning**: Extract items and quantities automatically from grocery receipts.
    *   **Fridge/Pantry Photo**: Identify ingredients directly from photos.
*   **Recipe Generation**: Get personalized recipe suggestions based on your available inventory and dietary constraints.
*   **Multi-Profile Support**: Switch between household members with PIN protection.

## Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript
*   **Database**: PostgreSQL (Supabase) + Drizzle ORM
*   **Styling**: Tailwind CSS v4
*   **UI Components**: Custom components + Framer Motion for animations + Vaul (Drawer) + Lucide React (Icons)
*   **AI/LLM**: Ax LLM Client (OpenRouter/Grok-4-Vision)
*   **State Management**: React Context (Session) + Custom Hooks

## Getting Started

### Prerequisites

*   Node.js 20+
*   npm or pnpm
*   Supabase project (PostgreSQL)
*   OpenRouter API Key (for AI features)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd mise
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file in the root directory and add the following variables:

    ```env
    # Database
    DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres

    # Supabase (Client-side)
    NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]

    # AI / LLM
    OPENROUTER_API_KEY=[YOUR-OPENROUTER-KEY]

    # App
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

4.  **Database Migration:**
    Push the schema to your Supabase database:
    ```bash
    npx drizzle-kit push
    # or
    npm run db:push
    ```
    *(Note: Ensure you have `drizzle-kit` configured in `drizzle.config.ts`)*

5.  **Seed Data (Optional):**
    Seed initial unit conversions:
    ```bash
    npx tsx src/db/seed.ts
    ```

### Running Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/             # API Endpoints (Chat, Inventory)
│   ├── profiles/        # Profile selection page
│   ├── globals.css      # Global styles (Tailwind + Variables)
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page (Dashboard/Chat switcher)
├── agent/               # AI Agent Logic
│   ├── signatures/      # Ax signatures (prompts/inputs/outputs)
│   ├── tools/           # Tool definitions (addInventory, search, etc.)
│   └── chatAgent.ts     # Main chat agent orchestration
├── components/          # React Components
│   ├── auth/            # Auth/Profile components
│   ├── chat/            # Chat interface (Input, Bubble, Tools)
│   ├── dashboard/       # Dashboard widgets (Eat First, Leftovers)
│   ├── inventory/       # Inventory lists and items
│   ├── layout/          # Layout wrappers (Header, BottomNav)
│   └── ui/              # Generic UI (Badge, Skeleton)
├── contexts/            # React Contexts (SessionContext)
├── db/                  # Database Configuration
│   ├── schema.ts        # Drizzle Schema Definitions
│   └── supabase.ts      # Supabase Client
├── hooks/               # Custom React Hooks (useChat, useInventory)
└── lib/                 # Utilities and Types
    ├── api-client.ts    # Fetch wrapper
    ├── constants.ts     # Global constants
    └── types.ts         # TypeScript interfaces
```

## Usage Guide

### Main Navigation
*   **Kitchen (Dashboard)**: View your inventory stats, expiring items, and browse by category.
*   **Assistant (Chat)**: Talk to Mise. Click the camera icon to scan items or type your request.

### Adding Inventory
*   **Scan**: Click the "Scan" button on the dashboard or the camera icon in chat. Take a photo of a receipt or groceries. The AI will parse the image and propose items to add.
*   **Chat**: Type "I bought 2 apples and a gallon of milk".
*   **Manual**: Use the "Add Item manually" button in the inventory sheet (Dashboard > Pantry).

### Cooking & Recipes
*   **Suggest**: Click "Cook" on the dashboard or ask "What can I cook?". Mise will check your inventory and suggest recipes using expiring items first.
*   **Deduct**: When you cook, tell Mise "I made the omelet" or "Deduct 3 eggs".

### Profiles
*   Manage multiple users under one household.
*   Secure profiles with a 4-digit PIN.
*   Switch profiles from the header dropdown.

## Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## License

[MIT](LICENSE)
