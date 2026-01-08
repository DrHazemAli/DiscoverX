# Architecture

This document describes the architecture of DiscoverX, a GitHub repository analytics platform built with clean architecture principles.

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [System Architecture](#system-architecture)
- [Layer Responsibilities](#layer-responsibilities)
- [Data Flow](#data-flow)
- [Background Processing](#background-processing)
- [Performance Optimizations](#performance-optimizations)
- [Deployment Architecture](#deployment-architecture)

---

## Overview

DiscoverX follows a **Single-Bundle Architecture** - one Next.js application that handles both the web interface and background processing. This approach simplifies deployment while maintaining clean code organization through strict folder boundaries.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DiscoverX                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Web UI    │  │  REST API   │  │  Internal   │                 │
│  │  (React)    │  │  (Routes)   │  │   Jobs      │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                 │                        │
│         └────────────────┼─────────────────┘                        │
│                          │                                          │
│  ┌───────────────────────┴────────────────────────┐                │
│  │              Application Layer                  │                │
│  │            (Use Cases & Services)               │                │
│  └───────────────────────┬────────────────────────┘                │
│                          │                                          │
│  ┌──────────┬────────────┼──────────────┬─────────┐                │
│  │   DAL    │   Server   │    Core      │  Lib    │                │
│  │ (Repos)  │ (Adapters) │  (Domain)    │(Utils)  │                │
│  └────┬─────┴─────┬──────┴──────┬───────┴────┬────┘                │
│       │           │             │            │                      │
└───────┼───────────┼─────────────┼────────────┼──────────────────────┘
        │           │             │            │
        ▼           ▼             │            │
   ┌─────────┐ ┌─────────┐        │            │
   │Supabase │ │ GitHub  │        │            │
   │Postgres │ │   API   │        │            │
   └─────────┘ └─────────┘        │            │
                                  │            │
                           Pure Functions  Utilities
```

---

## Design Principles

### 1. Clean Architecture

The codebase is organized in layers with strict dependency rules:

```
                    ┌──────────────────┐
                    │    Contracts     │
                    │  (Zod Schemas)   │
                    └────────┬─────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │   Core   │◄─────│   App    │─────►│   DAL    │
    │ (Domain) │      │(UseCases)│      │ (Repos)  │
    └──────────┘      └──────────┘      └──────────┘
         ▲                 │                  │
         │                 │                  │
         │                 ▼                  ▼
         │          ┌──────────┐       ┌──────────┐
         │          │  Server  │       │ Supabase │
         │          │(Adapters)│       │    DB    │
         │          └──────────┘       └──────────┘
         │                │
         │                ▼
    Pure Functions   External APIs
```

**Dependency Rules:**
- `Core` has **no external dependencies** (pure TypeScript)
- `DAL` depends on `Core` types only
- `Application` orchestrates `Core` and `DAL`
- `Server` adapters wrap external services
- Route handlers (controllers) compose everything

### 2. Server/Client Boundary

Strict enforcement of server-only code:

```typescript
// ❌ NOT ALLOWED: Client importing server code
import { db } from '@/dal/db';  // Error in client component

// ✅ CORRECT: Server-only imports marked
// In dal/db.ts
import 'server-only';
```

**Import Restrictions (enforced by ESLint):**

| From | Cannot Import |
|------|---------------|
| `src/components/**` | `src/server/**`, `src/dal/**` |
| `src/core/**` | `src/dal/**`, `src/server/**`, `next/*`, `react/*` |
| `app/**` (client) | `src/server/**`, `src/dal/**` |

### 3. Single Source of Truth

- **Contracts** define all data shapes (Zod schemas)
- **Types** inferred from contracts, not duplicated
- **Validation** happens at system boundaries

---

## System Architecture

### Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup, etc.)
│   ├── (dashboard)/       # Protected admin pages
│   ├── (main)/            # Public pages (search, repos, rankings)
│   └── api/
│       ├── v1/            # Public REST API
│       │   ├── search/
│       │   ├── repos/
│       │   ├── rankings/
│       │   └── compare/
│       └── internal/      # Protected internal endpoints
│           └── jobs/
│
├── core/                   # Domain Layer (Pure Functions)
│   ├── scoring/           # Health score computation
│   ├── ranking/           # Ranking algorithms
│   ├── alternatives/      # Alternative suggestions
│   └── types.ts           # Domain types
│
├── application/           # Application Layer
│   └── usecases/          # Business logic orchestration
│       ├── search.ts
│       ├── repository.ts
│       ├── rankings.ts
│       ├── compare.ts
│       └── timeseries.ts
│
├── dal/                   # Data Access Layer
│   ├── db.ts             # Supabase client
│   ├── repos.repo.ts     # Repository queries
│   ├── scores.repo.ts    # Score queries
│   ├── rankings.repo.ts  # Ranking queries
│   ├── snapshots.repo.ts # Snapshot queries
│   └── jobs.repo.ts      # Job queue queries
│
├── server/                # Server Adapters
│   ├── auth/             # Authentication utilities
│   ├── cache/            # Cache provider (Redis optional)
│   ├── rateLimit/        # Rate limiting
│   ├── github/           # GitHub API client
│   ├── jobs/             # Job handlers
│   ├── http/             # HTTP helpers
│   └── security/         # Security headers
│
├── contracts/            # Zod Schemas & DTOs
│   ├── repos.ts
│   ├── rankings.ts
│   ├── common.ts
│   └── errors.ts
│
├── components/           # React Components
│   ├── ui/              # Base UI components
│   ├── auth/            # Auth-related components
│   ├── layout/          # Layout components
│   └── providers/       # Context providers
│
├── lib/                  # Shared Utilities
│   ├── utils.ts         # General utilities (cn, etc.)
│   ├── env.ts           # Environment config
│   ├── logger.ts        # Logging
│   ├── api/             # API client (for client-side)
│   ├── query/           # React Query setup
│   └── supabase/        # Supabase clients
│
└── contexts/            # React Contexts
```

---

## Layer Responsibilities

### Core Layer (`src/core/`)

**Purpose:** Domain logic as pure functions. No side effects, no I/O.

```typescript
// core/scoring/index.ts
export function computeHealthScore(input: ScoreInput): ScoreResult {
  // Pure computation - no database, no API calls
  const activityScore = calculateActivityScore(input);
  const communityScore = calculateCommunityScore(input);
  // ...
  return {
    overallScore: weightedAverage(scores, WEIGHTS),
    breakdown: { activity, community, maintenance, popularity, quality },
    algorithmVersion: SCORING_ALGORITHM_VERSION,
  };
}
```

**Key Characteristics:**
- Zero external dependencies
- Deterministic outputs for same inputs
- Easy to test in isolation
- Can be executed anywhere (server, worker, edge)

### Application Layer (`src/application/`)

**Purpose:** Orchestrate domain logic and data access. Implement use cases.

```typescript
// application/usecases/repository.ts
export class GetRepoProfileUseCase {
  constructor(
    private reposRepo: ReposRepository,
    private scoresRepo: ScoresRepository,
    private snapshotsRepo: SnapshotsRepository,
  ) {}

  async execute(owner: string, name: string): Promise<RepoProfile> {
    // Orchestrate data fetching
    const repo = await this.reposRepo.findByOwnerAndName(owner, name);
    const score = await this.scoresRepo.getLatestForRepo(repo.id);
    const snapshots = await this.snapshotsRepo.getRecent(repo.id, 30);
    
    // Use domain logic
    const trend = analyzeTrend(snapshots);
    
    return { repo, score, trend };
  }
}
```

### Data Access Layer (`src/dal/`)

**Purpose:** Encapsulate all database queries. Provide typed repositories.

```typescript
// dal/repos.repo.ts
import 'server-only';
import { createServerClient } from '@/lib/supabase/server';

export async function findByOwnerAndName(
  owner: string, 
  name: string
): Promise<Repository | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('owner', owner)
    .eq('name', name)
    .single();
    
  if (error) throw new DatabaseError(error);
  return data;
}
```

**Key Rules:**
- Marked as `server-only`
- Only place SQL/Supabase queries exist
- Returns typed models
- Handles database errors

### Server Layer (`src/server/`)

**Purpose:** Adapters for external services and infrastructure concerns.

```
server/
├── auth/           # Session, audit, internal auth
├── cache/          # CacheProvider interface + implementations
├── rateLimit/      # RateLimiter interface + implementations
├── github/         # GitHub API wrapper
├── jobs/           # Background job handlers
├── http/           # Request/response helpers
└── security/       # Security headers, CSP, etc.
```

**Cache Provider Pattern:**

```typescript
// server/cache/index.ts
interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

// Default: NullCache (no-op)
// Optional: RedisCache (when FEATURE_REDIS=1)
```

### Contracts Layer (`src/contracts/`)

**Purpose:** Define data shapes with Zod. Single source of truth for validation.

```typescript
// contracts/repos.ts
import { z } from 'zod';

export const RepositorySchema = z.object({
  id: z.string().uuid(),
  owner: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  language: z.string().nullable(),
  starsCount: z.number().int().nonnegative(),
  // ...
});

export type Repository = z.infer<typeof RepositorySchema>;

// Request/Response DTOs
export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(200),
  language: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

---

## Data Flow

### API Request Flow

```
┌──────────┐    ┌────────────┐    ┌───────────┐    ┌─────────┐    ┌────────┐
│  Client  │───►│Route Handler│───►│  UseCase  │───►│   DAL   │───►│   DB   │
│          │◄───│(Controller) │◄───│           │◄───│         │◄───│        │
└──────────┘    └────────────┘    └───────────┘    └─────────┘    └────────┘
                      │
                      ├── Validate input (Zod)
                      ├── Rate limit check
                      ├── Auth check (if needed)
                      └── Return DTO response
```

**Example: Search Endpoint**

```typescript
// app/api/v1/search/route.ts
export async function GET(request: NextRequest) {
  // 1. Parse & validate input
  const params = SearchRequestSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  
  // 2. Rate limit check
  const limited = await rateLimiter.check(getClientIP(request));
  if (limited) return RateLimitResponse();
  
  // 3. Execute use case
  const result = await searchUseCase.execute(params);
  
  // 4. Return validated response
  return NextResponse.json(SearchResponseSchema.parse(result));
}
```

### Rendering Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        Page Load                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Server Component (RSC)                         │  │
│  │  - Initial data fetch                                     │  │
│  │  - SEO metadata                                           │  │
│  │  - Hydration payload                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Client Islands (Interactive)                     │  │
│  │  - Search filters                                         │  │
│  │  - Chart interactions                                     │  │
│  │  - Save/bookmark actions                                  │  │
│  │  - Pagination                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Background Processing

### Job Queue Architecture

DiscoverX uses a **database-backed job queue** instead of a separate worker service:

```
┌────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Trigger   │────►│   job_queue DB   │────►│  Job Runner   │
│ (Cron/API) │     │     (Postgres)   │     │ (Internal API)│
└────────────┘     └──────────────────┘     └───────┬───────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │  Job Handlers │
                                            │ - repo.refresh│
                                            │ - repo.score  │
                                            │ - rankings    │
                                            └───────────────┘
```

### Job Types

| Job Type | Description | Schedule |
|----------|-------------|----------|
| `repo.refresh` | Update repository metadata | On-demand |
| `repo.daily_snapshot` | Capture daily metrics | Daily |
| `repo.signals` | Fetch releases, advisories | Hourly |
| `repo.score` | Compute health scores | After snapshot |
| `rankings.compute` | Generate rankings | Daily/Weekly/Monthly |

### Concurrent Processing

The job runner uses `FOR UPDATE SKIP LOCKED` for safe concurrency:

```sql
-- Dequeue jobs safely (multiple workers can run in parallel)
BEGIN;
SELECT * FROM job_queue 
WHERE status = 'queued' 
  AND run_at <= NOW()
ORDER BY priority, run_at
LIMIT 10
FOR UPDATE SKIP LOCKED;

-- Mark as running
UPDATE job_queue SET status = 'running', locked_at = NOW(), locked_by = $1
WHERE id IN (...);
COMMIT;
```

---

## Performance Optimizations

### 1. Pre-computed Rankings

Rankings are computed in background jobs, not on request:

```typescript
// Fast API response - just reads precomputed data
GET /api/v1/rankings?period=weekly&type=overall

// Background job does the heavy computation
// rankings.compute job runs on schedule
```

### 2. React Query Configuration

```typescript
// lib/query/hooks.ts
export function useRepository(owner: string, name: string) {
  return useQuery({
    queryKey: ['repository', owner, name],
    staleTime: 30 * 1000,           // Consider fresh for 30s
    placeholderData: keepPreviousData, // Avoid flicker
    refetchOnWindowFocus: false,
  });
}
```

### 3. Response Shaping

```typescript
// List view: minimal DTO
interface RepoListItem {
  id: string;
  fullName: string;
  description: string | null;
  language: string | null;
  starsCount: number;
  overallScore: number;
}

// Detail view: full DTO
interface RepoProfile {
  // ... all fields
  snapshots: Snapshot[];
  scoreBreakdown: ScoreBreakdown;
}
```

### 4. Caching Strategy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────►│   CDN/Edge  │────►│   Origin    │
│   Cache     │     │   Cache     │     │   (Redis)   │
│   (SWR)     │     │  (optional) │     │  (optional) │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Cache-Control Headers:**
- Public endpoints: `max-age=60, stale-while-revalidate=300`
- Rankings: `max-age=300` (5 minutes)
- User-specific: `private, no-store`

---

## Deployment Architecture

### Single Bundle Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Vercel / Node.js Server / Docker Container      │   │
│  │                                                  │   │
│  │  - Public routes      (/search, /repos, etc.)   │   │
│  │  - API routes         (/api/v1/*)               │   │
│  │  - Internal routes    (/api/internal/*)         │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │ Supabase │  │  GitHub  │  │ Redis/Upstash│
    │ Postgres │  │   API    │  │  (Optional)  │
    └──────────┘  └──────────┘  └──────────────┘
```

### Environment Configuration

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-only

# Internal Security
INTERNAL_API_SECRET=xxx           # For /api/internal/*

# GitHub Integration
GITHUB_TOKEN=ghp_xxx              # For API calls

# Optional Features
FEATURE_REDIS=0                   # Enable Redis cache
FEATURE_RATE_LIMIT=0              # Enable rate limiting
REDIS_URL=redis://...             # If FEATURE_REDIS=1
```

---

## Related Documentation

- [Database Schema](./DATABASE.md)
- [API Reference](./API.md)
- [Security](./SECURITY.md)
- [Getting Started](./GETTING_STARTED.md)

---

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**
