# Configuration Guide

Complete guide to configuring and deploying the Mise application.

## Environment Variables

### Required Variables

#### Database Connection

```bash
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**Format**: PostgreSQL connection string  
**Provider**: Vercel Postgres, Supabase, Railway, etc.  
**Example**: `postgresql://user:pass@db.example.com:5432/mise`

**Local Development**:
```bash
# Use local PostgreSQL
DATABASE_URL="postgresql://localhost:5432/mise_dev"

# Or use a cloud database
DATABASE_URL="postgresql://..."
```

---

#### AI Provider

```bash
OPENROUTER_API_KEY="sk-or-v1-..."
```

**Provider**: [OpenRouter](https://openrouter.ai/)  
**Cost**: Pay-per-token (varies by model)  
**Models**: See [OpenRouter models](https://openrouter.ai/models)

**Getting an API Key**:
1. Sign up at [openrouter.ai](https://openrouter.ai/)
2. Add credits to your account
3. Generate an API key
4. Add to `.env.local`

---

### Optional Variables

#### Application URL

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Purpose**: OpenRouter referer header, webhooks, etc.  
**Development**: `http://localhost:3000`  
**Production**: `https://mise.yourdomain.com`

---

#### Supabase (if using auth)

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

**Purpose**: Authentication, real-time subscriptions  
**Provider**: [Supabase](https://supabase.com/)  
**Required**: Only if using Supabase Auth

---

## Environment Files

### `.env.local` (Development)

```bash
# Database
DATABASE_URL="postgresql://localhost:5432/mise_dev"

# AI Provider
OPENROUTER_API_KEY="sk-or-v1-..."

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

**Security**: Do NOT commit to git (in `.gitignore`)

---

### `.env` (Production - Vercel)

Set environment variables in Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add each variable:
   - `DATABASE_URL` (Database connection string)
   - `OPENROUTER_API_KEY` (API key)
   - `NEXT_PUBLIC_APP_URL` (Production URL)

**Auto-Deploy**: Vercel automatically uses these when deploying.

---

## Database Setup

### Initial Setup

1. **Create PostgreSQL Database**:
   ```bash
   # Vercel Postgres
   vercel postgres create

   # Or use Supabase, Railway, etc.
   ```

2. **Set DATABASE_URL**:
   ```bash
   # Add to .env.local
   echo 'DATABASE_URL="postgresql://..."' >> .env.local
   ```

3. **Run Migrations**:
   ```bash
   npx drizzle-kit push
   ```

---

### Schema Migrations

**Generate Migration**:
```bash
# After modifying src/db/schema.ts
npx drizzle-kit generate
```

**Push to Database**:
```bash
# Development: Push schema directly
npx drizzle-kit push

# Production: Run migrations via Drizzle Kit
npx drizzle-kit migrate
```

**View Current Schema**:
```bash
npx drizzle-kit introspect
```

---

### Seed Data

**Run Seeder**:
```bash
npm run seed
```

**Seeder Location**: `src/db/seed.ts`

**What It Seeds**:
- Example household
- Sample profiles
- Master ingredients catalog
- Sample inventory items

---

## Application Configuration

### Next.js Config

**File**: `next.config.ts`

```typescript
export default {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Image domains for external images
  images: {
    domains: ['your-cdn.com']
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  }
};
```

---

### TypeScript Config

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Path Aliases**:
- `@/components/*` → `src/components/*`
- `@/lib/*` → `src/lib/*`
- `@/db/*` → `src/db/*`
- `@/agent/*` → `src/agent/*`

---

### Tailwind Config

**File**: `tailwind.config.ts`

```typescript
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FDF6E3',
        clay: '#D4A574',
        tomato: '#E63946',
        citrus: '#FF8C42',
        herb: '#2D5016',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      }
    }
  }
};
```

---

## Deployment

### Vercel (Recommended)

**Prerequisites**:
- Vercel account
- PostgreSQL database (Vercel Postgres, Supabase, etc.)
- OpenRouter API key

**Steps**:

1. **Connect GitHub Repository**:
   ```bash
   vercel link
   ```

2. **Set Environment Variables** (Vercel Dashboard):
   - `DATABASE_URL`
   - `OPENROUTER_API_KEY`
   - `NEXT_PUBLIC_APP_URL`

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Run Migrations**:
   ```bash
   # SSH into Vercel build
   vercel env pull .env.production.local
   npx drizzle-kit push
   ```

**Auto-Deploy**: Enabled by default for `main` branch.

---

### Docker

**Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**Build**:
```bash
docker build -t mise-app .
```

**Run**:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e OPENROUTER_API_KEY="sk-or-v1-..." \
  mise-app
```

---

### Railway

1. **Create New Project** on Railway
2. **Add PostgreSQL Service**
3. **Connect GitHub Repository**
4. **Set Environment Variables**:
   - `DATABASE_URL` (auto-populated from PostgreSQL service)
   - `OPENROUTER_API_KEY`
5. **Deploy**: Automatic on push to `main`

---

## Performance

### Optimize Build

```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

### Edge Runtime

Some API routes can run on edge:

```typescript
// src/app/api/v1/inventory/summary/route.ts
export const runtime = 'edge';  // Faster cold starts
```

**Limitations**: No access to Node.js APIs, larger binary size.

---

### Caching

**API Routes**:
```typescript
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate'
    }
  });
}
```

**Static Assets**:
- Images: Automatic optimization via `next/image`
- Fonts: Self-hosted via `@fontsource`

---

## Monitoring

### Error Tracking

**Recommended**: Sentry, LogRocket, or Datadog

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

---

### Analytics

**Recommended**: Vercel Analytics, Plausible, or PostHog

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

### Database Monitoring

**Tools**:
- **Vercel Postgres**: Built-in dashboard
- **Supabase**: Database insights
- **Prisma Accelerate**: Connection pooling + caching

---

## Security

### Environment Variables

- ✅ Use `.env.local` for secrets
- ✅ Never commit `.env` files to git
- ✅ Use `NEXT_PUBLIC_*` prefix only for client-side vars
- ❌ Never expose API keys to client-side

---

### Database

- ✅ Use connection pooling (e.g., PgBouncer)
- ✅ Enable SSL for production connections
- ✅ Use parameterized queries (Drizzle ORM handles this)
- ❌ Never use string interpolation for SQL

---

### API Routes

- ✅ Validate all inputs
- ✅ Use rate limiting
- ✅ Sanitize user content
- ❌ Never trust client-side data

---

## Troubleshooting

### Database Connection Issues

**Error**: `Connection refused`

**Fix**:
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

---

### OpenRouter API Errors

**Error**: `OPENROUTER_API_KEY not set`

**Fix**:
```bash
# Verify environment variable
echo $OPENROUTER_API_KEY

# Check .env.local
cat .env.local | grep OPENROUTER_API_KEY
```

---

### Build Failures

**Error**: `Module not found`

**Fix**:
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

---

## Related Documentation

- [Database Schema](./database-schema.md) - Schema and migrations
- [API Reference](./api-reference.md) - API endpoints and authentication
- [Component Guide](./component-guide.md) - Frontend setup
- [Architecture Overview](./README.md) - System design
