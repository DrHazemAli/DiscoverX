-- ============================================================================
-- DISCOVER: User Features Tables
-- Description: Tables for saved repos, user activity, and comparisons
-- ============================================================================

-- ============================================================================
-- SAVED REPOSITORIES TABLE
-- User's bookmarked repositories
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique user-repo pairs
  CONSTRAINT saved_repos_unique UNIQUE (user_id, repo_id)
);

-- Indexes
CREATE INDEX idx_saved_repos_user_id ON saved_repos(user_id);
CREATE INDEX idx_saved_repos_repo_id ON saved_repos(repo_id);
CREATE INDEX idx_saved_repos_created_at ON saved_repos(created_at DESC);

-- ============================================================================
-- USER ACTIVITY TABLE
-- Track user actions for history
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'analyze', 'compare', 'save', 'view'
  action TEXT NOT NULL,
  repo_name TEXT,
  repo_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_type ON user_activity(type);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at DESC);

-- ============================================================================
-- SAVED COMPARISONS TABLE
-- User's saved comparison sets
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  repo_ids UUID[] NOT NULL, -- Array of repository IDs (references repositories.id)
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_saved_comparisons_user_id ON saved_comparisons(user_id);
CREATE INDEX idx_saved_comparisons_share_token ON saved_comparisons(share_token);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE saved_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_comparisons ENABLE ROW LEVEL SECURITY;

-- Saved repos: users can only access their own
CREATE POLICY "Users can manage own saved repos"
  ON saved_repos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User activity: users can only see their own
CREATE POLICY "Users can view own activity"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Saved comparisons: users can manage own, view public
CREATE POLICY "Users can manage own comparisons"
  ON saved_comparisons FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view public comparisons"
  ON saved_comparisons FOR SELECT
  USING (is_public = true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_saved_comparisons_updated_at
  BEFORE UPDATE ON saved_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_type TEXT,
  p_action TEXT,
  p_repo_name TEXT DEFAULT NULL,
  p_repo_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO user_activity (user_id, type, action, repo_name, repo_id, metadata)
  VALUES (p_user_id, p_type, p_action, p_repo_name, p_repo_id, p_metadata)
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;
