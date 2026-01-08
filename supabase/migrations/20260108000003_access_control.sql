-- ============================================================================
-- DISCOVER: Access Control System
-- Description: User roles, permissions, and admin functionality
-- ============================================================================

-- ============================================================================
-- USER ROLES ENUM
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');

-- ============================================================================
-- USER PROFILES TABLE
-- Extended user information with roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one profile per user
  CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- ============================================================================
-- PERMISSIONS TABLE
-- Granular permissions for roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  -- Repository permissions
  ('repos.view', 'View repository details', 'repositories'),
  ('repos.create', 'Add new repositories', 'repositories'),
  ('repos.update', 'Update repository information', 'repositories'),
  ('repos.delete', 'Delete repositories', 'repositories'),
  ('repos.refresh', 'Trigger repository refresh', 'repositories'),
  
  -- Rankings permissions
  ('rankings.view', 'View rankings', 'rankings'),
  ('rankings.compute', 'Trigger ranking computation', 'rankings'),
  
  -- User permissions
  ('users.view', 'View user list', 'users'),
  ('users.create', 'Create new users', 'users'),
  ('users.update', 'Update user information', 'users'),
  ('users.delete', 'Delete users', 'users'),
  ('users.change_role', 'Change user roles', 'users'),
  
  -- System permissions
  ('system.view_logs', 'View system logs', 'system'),
  ('system.view_jobs', 'View background jobs', 'system'),
  ('system.manage_jobs', 'Manage background jobs', 'system'),
  ('system.settings', 'Manage system settings', 'system'),
  
  -- Admin permissions
  ('admin.access', 'Access admin dashboard', 'admin'),
  ('admin.reports', 'View admin reports', 'admin')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROLE PERMISSIONS TABLE
-- Maps roles to permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique role-permission pairs
  CONSTRAINT role_permissions_unique UNIQUE (role, permission_id)
);

-- Index for fast lookups
CREATE INDEX idx_role_permissions_role ON role_permissions(role);

-- Assign permissions to roles
-- User role: basic view permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions WHERE name IN (
  'repos.view',
  'rankings.view'
);

-- Moderator role: user permissions + moderation
INSERT INTO role_permissions (role, permission_id)
SELECT 'moderator', id FROM permissions WHERE name IN (
  'repos.view',
  'repos.update',
  'repos.refresh',
  'rankings.view',
  'users.view',
  'admin.access'
);

-- Admin role: moderator + most admin functions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE name IN (
  'repos.view',
  'repos.create',
  'repos.update',
  'repos.delete',
  'repos.refresh',
  'rankings.view',
  'rankings.compute',
  'users.view',
  'users.create',
  'users.update',
  'system.view_logs',
  'system.view_jobs',
  'system.manage_jobs',
  'admin.access',
  'admin.reports'
);

-- Super Admin role: all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions;

-- ============================================================================
-- AUDIT LOG TABLE
-- Track important actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- API KEYS TABLE
-- For programmatic access
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
  rate_limit INTEGER NOT NULL DEFAULT 1000, -- Requests per hour
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique key hash
  CONSTRAINT api_keys_hash_unique UNIQUE (key_hash)
);

-- Index for lookups
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================================================
-- SITE SETTINGS TABLE
-- Global configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO site_settings (key, value, description) VALUES
  ('site.name', '"Discover"', 'Site name'),
  ('site.description', '"GitHub Repository Analytics Platform"', 'Site description'),
  ('site.maintenance_mode', 'false', 'Enable maintenance mode'),
  ('github.rate_limit', '5000', 'GitHub API rate limit per hour'),
  ('rankings.auto_compute', 'true', 'Automatically compute rankings'),
  ('rankings.compute_interval', '"daily"', 'Ranking computation interval')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- User profiles: users can view their own, admins can view all
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Users cannot change their own role
    role = (SELECT role FROM user_profiles WHERE user_id = auth.uid())
  );

-- Permissions: read-only for authenticated
CREATE POLICY "Anyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- Role permissions: read-only for authenticated
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Audit logs: admins only
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

-- API keys: users see own, admins see all
CREATE POLICY "Users can manage own API keys"
  ON api_keys FOR ALL
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

-- Site settings: admins only for write, all for read
CREATE POLICY "Anyone can view settings"
  ON site_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON site_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Get user's role
  SELECT role INTO v_role
  FROM user_profiles
  WHERE user_id = p_user_id AND is_active = true;
  
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if role has permission
  RETURN EXISTS (
    SELECT 1 
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = v_role AND p.name = p_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name
  FROM user_profiles up
  JOIN role_permissions rp ON rp.role = up.role
  JOIN permissions p ON p.id = rp.permission_id
  WHERE up.user_id = p_user_id AND up.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    details, ip_address, user_agent
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
