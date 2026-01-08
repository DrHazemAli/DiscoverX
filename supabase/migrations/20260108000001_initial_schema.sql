-- ============================================================================
-- DISCOVER: Initial Database Schema
-- Description: Core tables for GitHub repository analytics platform
-- Version: 1.0.0
-- Created: 2026-01-08
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- REPOSITORIES TABLE
-- Description: Stores GitHub repository metadata and basic information
-- ============================================================================
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- GitHub identifiers
    github_id BIGINT UNIQUE NOT NULL,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(512) GENERATED ALWAYS AS (owner || '/' || name) STORED,
    
    -- Basic metadata
    description TEXT,
    homepage_url TEXT,
    language VARCHAR(100),
    topics TEXT[] DEFAULT '{}',
    
    -- Repository stats (cached from GitHub)
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    open_issues_count INTEGER DEFAULT 0,
    
    -- Repository attributes
    is_fork BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    has_wiki BOOLEAN DEFAULT FALSE,
    has_issues BOOLEAN DEFAULT FALSE,
    has_discussions BOOLEAN DEFAULT FALSE,
    
    -- License information
    license_key VARCHAR(100),
    license_name VARCHAR(255),
    
    -- Dates from GitHub
    github_created_at TIMESTAMPTZ,
    github_updated_at TIMESTAMPTZ,
    github_pushed_at TIMESTAMPTZ,
    
    -- Our tracking timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,
    
    -- Unique constraint on owner/name combination
    CONSTRAINT unique_owner_name UNIQUE (owner, name)
);

-- Indexes for common queries
CREATE INDEX idx_repositories_full_name ON repositories (full_name);
CREATE INDEX idx_repositories_language ON repositories (language);
CREATE INDEX idx_repositories_stars ON repositories (stars_count DESC);
CREATE INDEX idx_repositories_updated ON repositories (updated_at DESC);
CREATE INDEX idx_repositories_topics ON repositories USING GIN (topics);
CREATE INDEX idx_repositories_description_trgm ON repositories USING GIN (description gin_trgm_ops);

-- ============================================================================
-- REPOSITORY SNAPSHOTS TABLE
-- Description: Daily snapshots of repository metrics for time-series analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS repository_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    
    -- Snapshot date (one per day per repo)
    snapshot_date DATE NOT NULL,
    
    -- Core metrics at snapshot time
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    open_issues_count INTEGER DEFAULT 0,
    
    -- Derived metrics (calculated from GitHub API)
    commits_count INTEGER DEFAULT 0,           -- Total commits
    contributors_count INTEGER DEFAULT 0,       -- Unique contributors
    releases_count INTEGER DEFAULT 0,           -- Total releases
    
    -- Activity metrics (within snapshot period)
    commits_last_30d INTEGER DEFAULT 0,
    prs_opened_last_30d INTEGER DEFAULT 0,
    prs_merged_last_30d INTEGER DEFAULT 0,
    issues_opened_last_30d INTEGER DEFAULT 0,
    issues_closed_last_30d INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One snapshot per repo per day
    CONSTRAINT unique_repo_snapshot_date UNIQUE (repository_id, snapshot_date)
);

-- Indexes for time-series queries
CREATE INDEX idx_snapshots_repo_date ON repository_snapshots (repository_id, snapshot_date DESC);
CREATE INDEX idx_snapshots_date ON repository_snapshots (snapshot_date DESC);

-- ============================================================================
-- REPOSITORY SCORES TABLE
-- Description: Computed health and quality scores for repositories
-- ============================================================================
CREATE TABLE IF NOT EXISTS repository_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    
    -- Score computation date
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Overall composite score (0-100)
    overall_score DECIMAL(5, 2) NOT NULL,
    
    -- Individual dimension scores (0-100)
    activity_score DECIMAL(5, 2) NOT NULL,      -- Commit frequency, PR activity
    community_score DECIMAL(5, 2) NOT NULL,     -- Contributors, discussions, stars growth
    maintenance_score DECIMAL(5, 2) NOT NULL,   -- Issue response time, release frequency
    popularity_score DECIMAL(5, 2) NOT NULL,    -- Stars, forks, watchers
    quality_score DECIMAL(5, 2) NOT NULL,       -- Code quality signals, documentation
    
    -- Score breakdown/explanation (for transparency)
    score_breakdown JSONB DEFAULT '{}',
    
    -- Version of scoring algorithm used
    algorithm_version VARCHAR(20) DEFAULT '1.0.0',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Keep only latest score per repo (can query historical via computed_at)
    CONSTRAINT unique_repo_latest_score UNIQUE (repository_id, computed_at)
);

-- Indexes for score queries
CREATE INDEX idx_scores_repo ON repository_scores (repository_id);
CREATE INDEX idx_scores_overall ON repository_scores (overall_score DESC);
CREATE INDEX idx_scores_computed ON repository_scores (computed_at DESC);

-- ============================================================================
-- REPOSITORY RANKINGS TABLE
-- Description: Precomputed rankings for fast API responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS repository_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ranking period and type
    period VARCHAR(20) NOT NULL,                -- 'daily', 'weekly', 'monthly'
    as_of DATE NOT NULL,                        -- Period start date
    ranking_type VARCHAR(50) NOT NULL,          -- 'overall', 'activity', 'community', etc.
    
    -- Optional filters
    language VARCHAR(100),                      -- NULL means all languages
    
    -- Ranking data
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score DECIMAL(5, 2) NOT NULL,
    
    -- Movement from previous period
    rank_change INTEGER DEFAULT 0,              -- Positive = moved up, negative = moved down
    
    -- Explanation for this ranking position
    ranking_explanation JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique ranking per repo per period/type/language combination
    CONSTRAINT unique_ranking UNIQUE (period, as_of, ranking_type, language, repository_id)
);

-- Indexes for ranking queries
CREATE INDEX idx_rankings_lookup ON repository_rankings (period, as_of, ranking_type, language, rank);
CREATE INDEX idx_rankings_repo ON repository_rankings (repository_id);

-- ============================================================================
-- JOB QUEUE TABLE
-- Description: Background job queue for async processing
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Job type and payload
    type VARCHAR(100) NOT NULL,                 -- 'repo.refresh', 'repo.daily_snapshot', etc.
    payload JSONB DEFAULT '{}',
    
    -- Job status
    status VARCHAR(20) NOT NULL DEFAULT 'queued',  -- 'queued', 'running', 'done', 'failed'
    priority INTEGER DEFAULT 3,                 -- 1 (highest) to 5 (lowest)
    
    -- Scheduling
    run_at TIMESTAMPTZ DEFAULT NOW(),           -- When to run this job
    
    -- Locking (for concurrent workers)
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),                     -- Worker ID that locked this job
    
    -- Retry tracking
    attempt INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    
    -- Result storage
    result JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Ensure status is valid
    CONSTRAINT valid_status CHECK (status IN ('queued', 'running', 'done', 'failed'))
);

-- Indexes for job queue operations
CREATE INDEX idx_jobs_dequeue ON job_queue (status, run_at, priority) 
    WHERE status = 'queued';
CREATE INDEX idx_jobs_locked ON job_queue (locked_at) 
    WHERE status = 'running';
CREATE INDEX idx_jobs_type ON job_queue (type);
CREATE INDEX idx_jobs_status ON job_queue (status);

-- ============================================================================
-- REPOSITORY SIGNALS TABLE
-- Description: Stores various signals/events from GitHub (releases, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS repository_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    
    -- Signal type and data
    signal_type VARCHAR(50) NOT NULL,           -- 'release', 'security_advisory', 'milestone', etc.
    signal_data JSONB NOT NULL DEFAULT '{}',
    
    -- Signal metadata
    github_id VARCHAR(255),                     -- GitHub's ID for this signal
    occurred_at TIMESTAMPTZ NOT NULL,           -- When this signal occurred
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate signals
    CONSTRAINT unique_signal UNIQUE (repository_id, signal_type, github_id)
);

-- Indexes for signal queries
CREATE INDEX idx_signals_repo_type ON repository_signals (repository_id, signal_type);
CREATE INDEX idx_signals_occurred ON repository_signals (occurred_at DESC);

-- ============================================================================
-- REPORTS TABLE
-- Description: User-generated comparison reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Report metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Repositories included in this report
    repository_ids UUID[] NOT NULL,
    
    -- Report configuration
    config JSONB DEFAULT '{}',
    
    -- Sharing settings
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,             -- For private sharing
    
    -- Creator (optional, for anonymous reports)
    created_by UUID,                            -- References auth.users if needed
    
    -- View tracking
    view_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for report queries
CREATE INDEX idx_reports_public ON reports (is_public, created_at DESC) WHERE is_public = TRUE;
CREATE INDEX idx_reports_share_token ON reports (share_token) WHERE share_token IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_repositories_updated_at
    BEFORE UPDATE ON repositories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Public read access for analytics tables (repositories, snapshots, scores, rankings)
CREATE POLICY "Public read access for repositories"
    ON repositories FOR SELECT
    USING (true);

CREATE POLICY "Public read access for snapshots"
    ON repository_snapshots FOR SELECT
    USING (true);

CREATE POLICY "Public read access for scores"
    ON repository_scores FOR SELECT
    USING (true);

CREATE POLICY "Public read access for rankings"
    ON repository_rankings FOR SELECT
    USING (true);

CREATE POLICY "Public read access for signals"
    ON repository_signals FOR SELECT
    USING (true);

-- Reports: public reports visible to all, private reports need share token or owner
CREATE POLICY "Public reports are visible to all"
    ON reports FOR SELECT
    USING (is_public = true);

-- Job queue: Only service role can access (handled via server-side client)
CREATE POLICY "Service role access for job_queue"
    ON job_queue FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE repositories IS 'GitHub repository metadata and basic information';
COMMENT ON TABLE repository_snapshots IS 'Daily snapshots of repository metrics for time-series analysis';
COMMENT ON TABLE repository_scores IS 'Computed health and quality scores for repositories';
COMMENT ON TABLE repository_rankings IS 'Precomputed rankings for fast API responses';
COMMENT ON TABLE job_queue IS 'Background job queue for async processing';
COMMENT ON TABLE repository_signals IS 'Various signals/events from GitHub repositories';
COMMENT ON TABLE reports IS 'User-generated comparison reports';
