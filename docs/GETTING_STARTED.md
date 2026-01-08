# Getting Started

This guide will help you set up DiscoverX for local development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 20.x or later | JavaScript runtime |
| [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/) | Latest | Package manager |
| [Git](https://git-scm.com/) | Latest | Version control |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Latest | Database management (optional) |

### Optional Tools

- [Docker](https://www.docker.com/) - For running Supabase locally
- [VS Code](https://code.visualstudio.com/) - Recommended editor
- [GitHub CLI](https://cli.github.com/) - For GitHub operations

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/DrHazemAli/DiscoverX.git
cd DiscoverX
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using pnpm
pnpm install
```

### 3. Copy Environment File

```bash
cp env.example .env.local
```

---

## Environment Setup

### Required Environment Variables

Edit `.env.local` with your credentials:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-side only (Required for full functionality)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting Supabase Credentials

#### Option A: Supabase Cloud (Recommended for beginners)

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

#### Option B: Local Supabase (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase (requires Docker)
supabase start

# Output will show local credentials
# API URL: http://localhost:54321
# anon key: eyJ...
# service_role key: eyJ...
```

### Optional Environment Variables

```bash
# Internal API Protection
INTERNAL_API_SECRET=your-secret-key-here

# GitHub Integration (for data fetching)
GITHUB_TOKEN=ghp_your_personal_access_token

# Feature Flags
FEATURE_REDIS=0           # Enable Redis caching
FEATURE_RATE_LIMIT=0      # Enable rate limiting

# Redis (if FEATURE_REDIS=1)
REDIS_URL=redis://localhost:6379
```

### Getting a GitHub Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Select scopes: `public_repo`, `read:user`
4. Copy the token to `GITHUB_TOKEN`

---

## Database Setup

### Running Migrations

#### Using Supabase Cloud

```bash
# Push migrations to your Supabase project
npx supabase db push --project-ref your-project-ref
```

Or manually run the SQL files in the Supabase SQL Editor:

1. Go to your Supabase project → **SQL Editor**
2. Run migrations in order:
   - `supabase/migrations/20260108000001_initial_schema.sql`
   - `supabase/migrations/20260108000002_job_queue_functions.sql`
   - `supabase/migrations/20260108000003_access_control.sql`
   - `supabase/migrations/20260108000004_user_features.sql`

#### Using Local Supabase

```bash
# Migrations are auto-applied when you start local Supabase
supabase start

# Or manually push migrations
supabase db push
```

### Verifying Setup

Run the following SQL to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Expected tables:
- `repositories`
- `repository_snapshots`
- `repository_scores`
- `repository_rankings`
- `repository_signals`
- `job_queue`
- `reports`
- `user_profiles`
- `permissions`
- `role_permissions`
- `audit_logs`

---

## Running the Application

### Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (with Turbopack) |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Development URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Main application |
| `http://localhost:3000/api/v1/search` | Search API endpoint |
| `http://localhost:3000/api/v1/rankings` | Rankings API endpoint |
| `http://localhost:54321` | Local Supabase Studio (if running locally) |

---

## Development Workflow

### Project Structure Overview

```
src/
├── app/                    # Pages and API routes
│   ├── (auth)/            # Login, signup, etc.
│   ├── (main)/            # Public pages
│   └── api/               # API endpoints
├── components/            # React components
├── core/                  # Domain logic
├── dal/                   # Database queries
├── server/                # Server utilities
├── lib/                   # Shared utilities
└── contracts/             # Validation schemas
```

### Making Changes

#### Adding a New Page

1. Create file in `src/app/(main)/your-page/page.tsx`
2. Use server components for data fetching
3. Use client components for interactivity

```tsx
// src/app/(main)/example/page.tsx
export default async function ExamplePage() {
  // Fetch data on server
  const data = await fetchData();
  
  return (
    <div>
      <h1>Example Page</h1>
      <ClientComponent data={data} />
    </div>
  );
}
```

#### Adding a New API Endpoint

1. Create file in `src/app/api/v1/your-endpoint/route.ts`
2. Define Zod schemas in `src/contracts/`
3. Implement use case in `src/application/usecases/`

```tsx
// src/app/api/v1/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ExampleRequestSchema } from '@/contracts';

export async function GET(request: NextRequest) {
  const params = ExampleRequestSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  
  // Call use case
  const result = await exampleUseCase.execute(params);
  
  return NextResponse.json(result);
}
```

#### Adding a New Component

1. Create component in `src/components/ui/`
2. Export from `src/components/ui/index.ts`
3. Use Radix UI primitives for accessibility
4. Style with Tailwind CSS

```tsx
// src/components/ui/MyComponent.tsx
'use client';

import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({ className, children }: MyComponentProps) {
  return (
    <div className={cn('p-4 rounded-lg border', className)}>
      {children}
    </div>
  );
}
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (configured in `.prettierrc`)
- **Linting**: ESLint with Next.js config
- **Imports**: Use `@/` path alias

```typescript
// ✅ Good
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

// ❌ Avoid
import { Button } from '../../../components/ui/Button';
```

---

## Troubleshooting

### Common Issues

#### "Cannot find module" Error

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

#### Supabase Connection Error

1. Verify environment variables are set correctly
2. Check Supabase project is running
3. Ensure you're using the correct keys (anon vs service_role)

```bash
# Test connection
curl -X GET 'https://your-project.supabase.co/rest/v1/' \
  -H "apikey: your-anon-key"
```

#### TypeScript Errors

```bash
# Check for type errors
npx tsc --noEmit
```

#### Build Failures

```bash
# Check for lint errors
npm run lint

# Try clean build
rm -rf .next
npm run build
```

### Getting Help

- Check [GitHub Issues](https://github.com/DrHazemAli/DiscoverX/issues)
- Review [Architecture Documentation](./ARCHITECTURE.md)
- Join the CognitionX Community

---

## Next Steps

Once you have the project running:

1. 📖 Read the [Architecture Guide](./ARCHITECTURE.md)
2. 🗄️ Understand the [Database Schema](./DATABASE.md)
3. 🔌 Explore the [API Reference](./API.md)
4. 🔒 Review [Security Guidelines](./SECURITY.md)
5. 🤝 Check [Contributing Guide](./CONTRIBUTING.md)

---

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**
