# Database Documentation

This document describes the database schema, relationships, and data model for DiscoverX.

## Table of Contents

- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Core Tables](#core-tables)
- [Access Control Tables](#access-control-tables)
- [Indexes & Performance](#indexes--performance)
- [Row Level Security](#row-level-security)
- [Migrations](#migrations)
- [Maintenance](#maintenance)

---

## Overview

DiscoverX uses **PostgreSQL** via Supabase with the following characteristics:

- **UUID primary keys** for all tables
- **Row Level Security (RLS)** enabled on all tables
- **Timestamptz** for all date/time fields
- **JSONB** for flexible data storage
- **Trigram indexes** for fuzzy text search

### Database Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Fuzzy text search
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REPOSITORY ANALYTICS                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│   repositories   │       │ repository_snapshots │       │repository_scores│
├──────────────────┤       ├──────────────────────┤       ├─────────────────┤
│ id (PK)          │◄──────│ repository_id (FK)   │       │ id (PK)         │
│ github_id        │       │ snapshot_date        │       │ repository_id   │──┐
│ owner            │       │ stars_count          │       │ overall_score   │  │
│ name             │       │ forks_count          │       │ activity_score  │  │
│ full_name        │       │ commits_last_30d     │       │ community_score │  │
│ description      │       │ prs_opened_last_30d  │       │ maintenance_... │  │
│ language         │       │ ...                  │       │ score_breakdown │  │
│ topics[]         │       └──────────────────────┘       └─────────────────┘  │
│ stars_count      │                                                           │
│ ...              │◄──────────────────────────────────────────────────────────┘
└────────┬─────────┘
         │
         │       ┌──────────────────────┐       ┌─────────────────────┐
         │       │ repository_rankings  │       │ repository_signals  │
         │       ├──────────────────────┤       ├─────────────────────┤
         └──────►│ repository_id (FK)   │       │ repository_id (FK)  │◄──┐
                 │ period               │       │ signal_type         │   │
                 │ as_of                │       │ signal_data         │   │
                 │ ranking_type         │       │ occurred_at         │   │
                 │ rank                 │       └─────────────────────┘   │
                 │ score                │                                 │
                 └──────────────────────┘                                 │
                                                                          │
┌─────────────────────────────────────────────────────────────────────────┘
│
│  ┌──────────────────┐       ┌──────────────────┐
│  │     reports      │       │    job_queue     │
│  ├──────────────────┤       ├──────────────────┤
└─►│ repository_ids[] │       │ id (PK)          │
   │ title            │       │ type             │
   │ is_public        │       │ payload          │
   │ share_token      │       │ status           │
   │ created_by       │       │ priority         │
   └──────────────────┘       │ run_at           │
                              │ locked_at        │
                              └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ACCESS CONTROL                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  user_profiles   │       │   permissions    │       │role_permissions │
├──────────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)          │       │ id (PK)          │◄──────│ permission_id   │
│ user_id (FK)     │──┐    │ name             │       │ role            │
│ email            │  │    │ description      │       └─────────────────┘
│ role             │  │    │ category         │
│ is_active        │  │    └──────────────────┘
└──────────────────┘  │
                      │    ┌──────────────────┐
                      │    │   audit_logs     │
                      │    ├──────────────────┤
                      └───►│ user_id (FK)     │
                           │ action           │
                           │ resource_type    │
                           │ details          │
                           └──────────────────┘
```

---

## Core Tables

### repositories

Stores GitHub repository metadata and cached statistics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `github_id` | BIGINT | GitHub's repository ID (unique) |
| `owner` | VARCHAR(255) | Repository owner/organization |
| `name` | VARCHAR(255) | Repository name |
| `full_name` | VARCHAR(512) | Generated: `owner/name` |
| `description` | TEXT | Repository description |
| `homepage_url` | TEXT | Project homepage |
| `language` | VARCHAR(100) | Primary programming language |
| `topics` | TEXT[] | Repository topics/tags |
| `stars_count` | INTEGER | Number of stars |
| `forks_count` | INTEGER | Number of forks |
| `watchers_count` | INTEGER | Number of watchers |
| `open_issues_count` | INTEGER | Open issues count |
| `is_fork` | BOOLEAN | Whether repo is a fork |
| `is_archived` | BOOLEAN | Whether repo is archived |
| `is_template` | BOOLEAN | Whether repo is a template |
| `has_wiki` | BOOLEAN | Wiki enabled |
| `has_issues` | BOOLEAN | Issues enabled |
| `has_discussions` | BOOLEAN | Discussions enabled |
| `license_key` | VARCHAR(100) | SPDX license identifier |
| `license_name` | VARCHAR(255) | Human-readable license name |
| `github_created_at` | TIMESTAMPTZ | When repo was created on GitHub |
| `github_updated_at` | TIMESTAMPTZ | Last GitHub update |
| `github_pushed_at` | TIMESTAMPTZ | Last push to repo |
| `created_at` | TIMESTAMPTZ | When we first indexed |
| `updated_at` | TIMESTAMPTZ | Our last update |
| `last_synced_at` | TIMESTAMPTZ | Last sync with GitHub |

**Constraints:**
- `UNIQUE (owner, name)`
- `UNIQUE (github_id)`

---

### repository_snapshots

Daily snapshots of repository metrics for time-series analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `repository_id` | UUID | FK to repositories |
| `snapshot_date` | DATE | Snapshot date |
| `stars_count` | INTEGER | Stars at snapshot time |
| `forks_count` | INTEGER | Forks at snapshot time |
| `watchers_count` | INTEGER | Watchers at snapshot time |
| `open_issues_count` | INTEGER | Open issues at snapshot |
| `commits_count` | INTEGER | Total commits |
| `contributors_count` | INTEGER | Unique contributors |
| `releases_count` | INTEGER | Total releases |
| `commits_last_30d` | INTEGER | Commits in last 30 days |
| `prs_opened_last_30d` | INTEGER | PRs opened (30d) |
| `prs_merged_last_30d` | INTEGER | PRs merged (30d) |
| `issues_opened_last_30d` | INTEGER | Issues opened (30d) |
| `issues_closed_last_30d` | INTEGER | Issues closed (30d) |
| `created_at` | TIMESTAMPTZ | Snapshot creation time |

**Constraints:**
- `UNIQUE (repository_id, snapshot_date)` - One snapshot per repo per day

---

### repository_scores

Computed health and quality scores.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `repository_id` | UUID | FK to repositories |
| `computed_at` | TIMESTAMPTZ | When score was computed |
| `overall_score` | DECIMAL(5,2) | Composite score (0-100) |
| `activity_score` | DECIMAL(5,2) | Development activity |
| `community_score` | DECIMAL(5,2) | Community engagement |
| `maintenance_score` | DECIMAL(5,2) | Maintenance quality |
| `popularity_score` | DECIMAL(5,2) | Popularity metrics |
| `quality_score` | DECIMAL(5,2) | Code quality signals |
| `score_breakdown` | JSONB | Detailed breakdown |
| `algorithm_version` | VARCHAR(20) | Scoring algorithm version |
| `created_at` | TIMESTAMPTZ | Record creation time |

**Score Breakdown JSONB Structure:**
```json
{
  "activity": {
    "normalizedScore": 75.5,
    "factors": [
      {"name": "Recent Commits", "rawValue": 45, "score": 80, "weight": 0.4},
      {"name": "PR Activity", "rawValue": 12, "score": 70, "weight": 0.3}
    ]
  },
  "community": { ... },
  "maintenance": { ... },
  "popularity": { ... },
  "quality": { ... }
}
```

---

### repository_rankings

Precomputed rankings for fast API responses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `period` | VARCHAR(20) | `daily`, `weekly`, `monthly` |
| `as_of` | DATE | Period start date |
| `ranking_type` | VARCHAR(50) | `overall`, `activity`, `community`, etc. |
| `language` | VARCHAR(100) | Language filter (NULL = all) |
| `repository_id` | UUID | FK to repositories |
| `rank` | INTEGER | Position in ranking |
| `score` | DECIMAL(5,2) | Score at ranking time |
| `rank_change` | INTEGER | Change from previous period |
| `ranking_explanation` | JSONB | Why this rank |
| `created_at` | TIMESTAMPTZ | When ranking was computed |

**Constraints:**
- `UNIQUE (period, as_of, ranking_type, language, repository_id)`

---

### repository_signals

Events and signals from GitHub (releases, advisories, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `repository_id` | UUID | FK to repositories |
| `signal_type` | VARCHAR(50) | `release`, `security_advisory`, etc. |
| `signal_data` | JSONB | Signal-specific data |
| `github_id` | VARCHAR(255) | GitHub's ID for this signal |
| `occurred_at` | TIMESTAMPTZ | When signal occurred |
| `created_at` | TIMESTAMPTZ | When we recorded it |

**Constraints:**
- `UNIQUE (repository_id, signal_type, github_id)`

---

### job_queue

Background job queue for async processing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `type` | VARCHAR(100) | Job type (e.g., `repo.refresh`) |
| `payload` | JSONB | Job-specific data |
| `status` | VARCHAR(20) | `queued`, `running`, `done`, `failed` |
| `priority` | INTEGER | 1 (highest) to 5 (lowest) |
| `run_at` | TIMESTAMPTZ | Scheduled execution time |
| `locked_at` | TIMESTAMPTZ | When job was locked |
| `locked_by` | VARCHAR(100) | Worker ID |
| `attempt` | INTEGER | Current attempt number |
| `max_attempts` | INTEGER | Maximum retry attempts |
| `last_error` | TEXT | Last error message |
| `result` | JSONB | Job result (if completed) |
| `created_at` | TIMESTAMPTZ | Job creation time |
| `started_at` | TIMESTAMPTZ | When processing started |
| `completed_at` | TIMESTAMPTZ | When processing finished |

**Job Types:**
| Type | Description |
|------|-------------|
| `repo.refresh` | Update repository metadata |
| `repo.daily_snapshot` | Create daily snapshot |
| `repo.signals` | Fetch releases, advisories |
| `repo.score` | Compute health score |
| `rankings.compute` | Generate rankings |

---

### reports

User-generated comparison reports.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | VARCHAR(255) | Report title |
| `description` | TEXT | Report description |
| `repository_ids` | UUID[] | Repos in this report |
| `config` | JSONB | Report configuration |
| `is_public` | BOOLEAN | Publicly accessible |
| `share_token` | VARCHAR(64) | Token for private sharing |
| `created_by` | UUID | Creator user ID |
| `view_count` | INTEGER | Number of views |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Access Control Tables

### user_profiles

Extended user information with roles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to auth.users |
| `email` | TEXT | User email |
| `full_name` | TEXT | Display name |
| `avatar_url` | TEXT | Profile picture URL |
| `role` | user_role | `user`, `moderator`, `admin`, `super_admin` |
| `is_active` | BOOLEAN | Account active status |
| `last_login_at` | TIMESTAMPTZ | Last login time |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### permissions

Granular permissions definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Permission name (unique) |
| `description` | TEXT | Human-readable description |
| `category` | TEXT | Permission category |
| `created_at` | TIMESTAMPTZ | Creation time |

**Default Permissions:**
| Name | Category | Description |
|------|----------|-------------|
| `repos.view` | repositories | View repository details |
| `repos.create` | repositories | Add new repositories |
| `repos.update` | repositories | Update repository info |
| `repos.delete` | repositories | Delete repositories |
| `repos.refresh` | repositories | Trigger repository refresh |
| `rankings.view` | rankings | View rankings |
| `rankings.compute` | rankings | Trigger ranking computation |
| `users.view` | users | View user list |
| `users.create` | users | Create new users |
| `users.update` | users | Update user info |
| `users.delete` | users | Delete users |
| `users.change_role` | users | Change user roles |
| `system.view_logs` | system | View system logs |
| `system.view_jobs` | system | View background jobs |
| `system.manage_jobs` | system | Manage background jobs |
| `system.settings` | system | Manage system settings |
| `admin.access` | admin | Access admin dashboard |
| `admin.reports` | admin | View admin reports |

---

### role_permissions

Maps roles to permissions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `role` | user_role | The role |
| `permission_id` | UUID | FK to permissions |
| `created_at` | TIMESTAMPTZ | Creation time |

**Role Permission Matrix:**

| Permission | user | moderator | admin | super_admin |
|------------|:----:|:---------:|:-----:|:-----------:|
| repos.view | ✅ | ✅ | ✅ | ✅ |
| repos.create | ❌ | ❌ | ✅ | ✅ |
| repos.update | ❌ | ✅ | ✅ | ✅ |
| repos.delete | ❌ | ❌ | ✅ | ✅ |
| repos.refresh | ❌ | ✅ | ✅ | ✅ |
| rankings.view | ✅ | ✅ | ✅ | ✅ |
| rankings.compute | ❌ | ❌ | ✅ | ✅ |
| users.* | ❌ | view | most | ✅ |
| system.* | ❌ | ❌ | most | ✅ |
| admin.* | ❌ | ✅ | ✅ | ✅ |

---

### audit_logs

Track important security-relevant actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to auth.users |
| `action` | TEXT | Action performed |
| `resource_type` | TEXT | Type of resource affected |
| `resource_id` | TEXT | ID of affected resource |
| `details` | JSONB | Additional details |
| `ip_address` | INET | Client IP address |
| `user_agent` | TEXT | Client user agent |
| `created_at` | TIMESTAMPTZ | When action occurred |

---

## Indexes & Performance

### Repository Indexes

```sql
-- Full-text search
CREATE INDEX idx_repositories_full_name ON repositories (full_name);
CREATE INDEX idx_repositories_description_trgm 
  ON repositories USING GIN (description gin_trgm_ops);

-- Common filters
CREATE INDEX idx_repositories_language ON repositories (language);
CREATE INDEX idx_repositories_stars ON repositories (stars_count DESC);
CREATE INDEX idx_repositories_updated ON repositories (updated_at DESC);
CREATE INDEX idx_repositories_topics ON repositories USING GIN (topics);
```

### Snapshot Indexes

```sql
-- Time-series queries
CREATE INDEX idx_snapshots_repo_date 
  ON repository_snapshots (repository_id, snapshot_date DESC);
CREATE INDEX idx_snapshots_date 
  ON repository_snapshots (snapshot_date DESC);
```

### Score Indexes

```sql
CREATE INDEX idx_scores_repo ON repository_scores (repository_id);
CREATE INDEX idx_scores_overall ON repository_scores (overall_score DESC);
CREATE INDEX idx_scores_computed ON repository_scores (computed_at DESC);
```

### Ranking Indexes

```sql
-- Primary lookup pattern
CREATE INDEX idx_rankings_lookup 
  ON repository_rankings (period, as_of, ranking_type, language, rank);
CREATE INDEX idx_rankings_repo ON repository_rankings (repository_id);
```

### Job Queue Indexes

```sql
-- Dequeue query optimization
CREATE INDEX idx_jobs_dequeue 
  ON job_queue (status, run_at, priority) WHERE status = 'queued';
CREATE INDEX idx_jobs_locked 
  ON job_queue (locked_at) WHERE status = 'running';
```

---

## Row Level Security

All tables have RLS enabled with appropriate policies:

### Public Read Access (Analytics Tables)

```sql
-- Anyone can read repository data
CREATE POLICY "Public read access for repositories"
  ON repositories FOR SELECT USING (true);

CREATE POLICY "Public read access for snapshots"
  ON repository_snapshots FOR SELECT USING (true);

CREATE POLICY "Public read access for scores"
  ON repository_scores FOR SELECT USING (true);

CREATE POLICY "Public read access for rankings"
  ON repository_rankings FOR SELECT USING (true);
```

### Report Access Control

```sql
-- Public reports visible to all
CREATE POLICY "Public reports are visible to all"
  ON reports FOR SELECT USING (is_public = true);

-- Private reports require share token or ownership
CREATE POLICY "Private reports with token"
  ON reports FOR SELECT USING (
    share_token IS NOT NULL 
    AND share_token = current_setting('app.share_token', true)
  );
```

### User Profile Access

```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT 
  USING (auth.uid() = user_id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
```

---

## Migrations

Migrations are located in `supabase/migrations/` and should be run in order:

| Migration | Description |
|-----------|-------------|
| `20260108000001_initial_schema.sql` | Core tables (repos, snapshots, scores, rankings, jobs) |
| `20260108000002_job_queue_functions.sql` | Job queue helper functions |
| `20260108000003_access_control.sql` | Users, roles, permissions |
| `20260108000004_user_features.sql` | User-specific features |

### Running Migrations

```bash
# With Supabase CLI
supabase db push

# Or manually in SQL editor (in order)
```

### Creating New Migrations

```bash
# Generate timestamp
date +%Y%m%d%H%M%S

# Create migration file
# supabase/migrations/20260109120000_your_migration.sql
```

---

## Maintenance

### Vacuuming

```sql
-- Regular maintenance (run weekly)
VACUUM ANALYZE repositories;
VACUUM ANALYZE repository_snapshots;
VACUUM ANALYZE repository_scores;
VACUUM ANALYZE repository_rankings;
```

### Cleanup Old Data

```sql
-- Remove old job records (keep 30 days)
DELETE FROM job_queue 
WHERE status IN ('done', 'failed') 
AND completed_at < NOW() - INTERVAL '30 days';

-- Archive old snapshots (keep 1 year of daily data)
-- Consider moving to cold storage
```

### Index Maintenance

```sql
-- Rebuild indexes if fragmented
REINDEX TABLE repositories;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Monitoring Queries

```sql
-- Table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [API Reference](./API.md) - REST API endpoints
- [Getting Started](./GETTING_STARTED.md) - Setup guide

---

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**
