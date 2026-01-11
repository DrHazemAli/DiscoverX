-- ============================================================================
-- DISCOVER: Whiteboard Feature Schema
-- Description: Tables for realtime collaborative whiteboards with chat & presence
-- Version: 1.0.0
-- Created: 2026-01-11
-- ============================================================================

-- ============================================================================
-- WHITEBOARDS TABLE
-- Description: Stores whiteboard metadata and settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS whiteboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Owner information
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Whiteboard details
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Whiteboard',
    description TEXT,
    
    -- Sharing settings
    is_public BOOLEAN DEFAULT FALSE,
    public_slug VARCHAR(64) UNIQUE,
    allow_public_edit BOOLEAN DEFAULT FALSE,  -- If true, public viewers can also draw
    
    -- Canvas settings
    background_color VARCHAR(20) DEFAULT '#171717',
    canvas_width INTEGER DEFAULT 1920,
    canvas_height INTEGER DEFAULT 1080,
    
    -- Status
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for whiteboards
CREATE INDEX idx_whiteboards_user_id ON whiteboards(user_id);
CREATE INDEX idx_whiteboards_public_slug ON whiteboards(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_whiteboards_is_public ON whiteboards(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_whiteboards_created_at ON whiteboards(created_at DESC);

-- ============================================================================
-- WHITEBOARD_STROKES TABLE
-- Description: Stores drawing strokes for persistence (optional persistence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS whiteboard_strokes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    
    -- Stroke creator
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_id VARCHAR(64),  -- For anonymous/guest users
    
    -- Stroke data
    stroke_data JSONB NOT NULL,  -- Array of points with x, y, type
    color VARCHAR(20) NOT NULL DEFAULT '#3ecf8e',
    line_width INTEGER DEFAULT 5,
    tool VARCHAR(20) DEFAULT 'pen',  -- pen, eraser, highlighter, etc.
    
    -- Order for replay
    stroke_order INTEGER NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for strokes
CREATE INDEX idx_whiteboard_strokes_whiteboard_id ON whiteboard_strokes(whiteboard_id);
CREATE INDEX idx_whiteboard_strokes_order ON whiteboard_strokes(whiteboard_id, stroke_order);

-- ============================================================================
-- WHITEBOARD_CHAT_MESSAGES TABLE
-- Description: Stores chat messages for each whiteboard (with persistence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS whiteboard_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    
    -- Message sender
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_id VARCHAR(64),  -- For anonymous users
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    
    -- Message content
    message TEXT NOT NULL,
    
    -- Message metadata
    is_system_message BOOLEAN DEFAULT FALSE,  -- For join/leave notifications
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat messages
CREATE INDEX idx_whiteboard_chat_whiteboard_id ON whiteboard_chat_messages(whiteboard_id);
CREATE INDEX idx_whiteboard_chat_created_at ON whiteboard_chat_messages(whiteboard_id, created_at DESC);

-- ============================================================================
-- WHITEBOARD_COLLABORATORS TABLE
-- Description: Stores invited collaborators for private whiteboards
-- ============================================================================
CREATE TABLE IF NOT EXISTS whiteboard_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Permission level
    role VARCHAR(20) DEFAULT 'viewer',  -- viewer, editor, admin
    
    -- Invitation status
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_whiteboard_collaborator UNIQUE (whiteboard_id, user_id)
);

-- Indexes for collaborators
CREATE INDEX idx_whiteboard_collaborators_whiteboard ON whiteboard_collaborators(whiteboard_id);
CREATE INDEX idx_whiteboard_collaborators_user ON whiteboard_collaborators(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_strokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_collaborators ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WHITEBOARDS POLICIES
-- ============================================================================

-- Users can view their own whiteboards
CREATE POLICY "Users can view own whiteboards"
    ON whiteboards FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can view whiteboards they're collaborators on
CREATE POLICY "Collaborators can view whiteboards"
    ON whiteboards FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboard_collaborators
            WHERE whiteboard_id = whiteboards.id
            AND user_id = auth.uid()
            AND accepted_at IS NOT NULL
        )
    );

-- Anyone can view public whiteboards
CREATE POLICY "Anyone can view public whiteboards"
    ON whiteboards FOR SELECT
    TO anon, authenticated
    USING (is_public = TRUE);

-- Users can create their own whiteboards
CREATE POLICY "Users can create whiteboards"
    ON whiteboards FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own whiteboards
CREATE POLICY "Users can update own whiteboards"
    ON whiteboards FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can update whiteboards they're admin on
CREATE POLICY "Admins can update whiteboards"
    ON whiteboards FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboard_collaborators
            WHERE whiteboard_id = whiteboards.id
            AND user_id = auth.uid()
            AND role = 'admin'
            AND accepted_at IS NOT NULL
        )
    );

-- Users can delete their own whiteboards
CREATE POLICY "Users can delete own whiteboards"
    ON whiteboards FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- WHITEBOARD_STROKES POLICIES
-- ============================================================================

-- Anyone can view strokes on public whiteboards
CREATE POLICY "Anyone can view strokes on public whiteboards"
    ON whiteboard_strokes FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_strokes.whiteboard_id
            AND is_public = TRUE
        )
    );

-- Authenticated users can view strokes on accessible whiteboards
CREATE POLICY "Users can view strokes on accessible whiteboards"
    ON whiteboard_strokes FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards w
            LEFT JOIN whiteboard_collaborators wc ON wc.whiteboard_id = w.id
            WHERE w.id = whiteboard_strokes.whiteboard_id
            AND (
                w.user_id = auth.uid()
                OR (wc.user_id = auth.uid() AND wc.accepted_at IS NOT NULL)
            )
        )
    );

-- Users can insert strokes on whiteboards they can edit
CREATE POLICY "Users can insert strokes on editable whiteboards"
    ON whiteboard_strokes FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM whiteboards w
            LEFT JOIN whiteboard_collaborators wc ON wc.whiteboard_id = w.id
            WHERE w.id = whiteboard_strokes.whiteboard_id
            AND (
                w.user_id = auth.uid()
                OR (wc.user_id = auth.uid() AND wc.role IN ('editor', 'admin') AND wc.accepted_at IS NOT NULL)
            )
        )
    );

-- Anonymous users can insert strokes on public editable whiteboards
CREATE POLICY "Anon can insert strokes on public editable whiteboards"
    ON whiteboard_strokes FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_strokes.whiteboard_id
            AND is_public = TRUE
            AND allow_public_edit = TRUE
        )
    );

-- Whiteboard owners can delete strokes
CREATE POLICY "Owners can delete strokes"
    ON whiteboard_strokes FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_strokes.whiteboard_id
            AND user_id = auth.uid()
        )
    );

-- ============================================================================
-- WHITEBOARD_CHAT_MESSAGES POLICIES
-- ============================================================================

-- Anyone can view chat on public whiteboards
CREATE POLICY "Anyone can view chat on public whiteboards"
    ON whiteboard_chat_messages FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_chat_messages.whiteboard_id
            AND is_public = TRUE
        )
    );

-- Users can view chat on accessible whiteboards
CREATE POLICY "Users can view chat on accessible whiteboards"
    ON whiteboard_chat_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards w
            LEFT JOIN whiteboard_collaborators wc ON wc.whiteboard_id = w.id
            WHERE w.id = whiteboard_chat_messages.whiteboard_id
            AND (
                w.user_id = auth.uid()
                OR (wc.user_id = auth.uid() AND wc.accepted_at IS NOT NULL)
            )
        )
    );

-- Authenticated users can post chat on accessible whiteboards
CREATE POLICY "Users can post chat on accessible whiteboards"
    ON whiteboard_chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM whiteboards w
            LEFT JOIN whiteboard_collaborators wc ON wc.whiteboard_id = w.id
            WHERE w.id = whiteboard_chat_messages.whiteboard_id
            AND (
                w.user_id = auth.uid()
                OR w.is_public = TRUE
                OR (wc.user_id = auth.uid() AND wc.accepted_at IS NOT NULL)
            )
        )
    );

-- Anonymous users can post chat on public whiteboards
CREATE POLICY "Anon can post chat on public whiteboards"
    ON whiteboard_chat_messages FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_chat_messages.whiteboard_id
            AND is_public = TRUE
        )
    );

-- ============================================================================
-- WHITEBOARD_COLLABORATORS POLICIES
-- ============================================================================

-- Users can view collaborators on their whiteboards
CREATE POLICY "Users can view collaborators on own whiteboards"
    ON whiteboard_collaborators FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_collaborators.whiteboard_id
            AND user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- Whiteboard owners can add collaborators
CREATE POLICY "Owners can add collaborators"
    ON whiteboard_collaborators FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_collaborators.whiteboard_id
            AND user_id = auth.uid()
        )
    );

-- Whiteboard owners and admins can update collaborators
CREATE POLICY "Owners can update collaborators"
    ON whiteboard_collaborators FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_collaborators.whiteboard_id
            AND user_id = auth.uid()
        )
    );

-- Collaborators can update their own record (to accept invitations)
CREATE POLICY "Collaborators can accept invitations"
    ON whiteboard_collaborators FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Whiteboard owners can delete collaborators
CREATE POLICY "Owners can delete collaborators"
    ON whiteboard_collaborators FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards
            WHERE id = whiteboard_collaborators.whiteboard_id
            AND user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- ============================================================================
-- REALTIME CONFIGURATION
-- Enable realtime for necessary tables
-- ============================================================================

-- Note: Run these in Supabase dashboard or via supabase CLI
-- ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_strokes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_chat_messages;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a unique public slug
CREATE OR REPLACE FUNCTION generate_whiteboard_slug()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate slug when whiteboard is made public
CREATE OR REPLACE FUNCTION set_whiteboard_public_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate slug when whiteboard is made public and doesn't have one
    IF NEW.is_public = TRUE AND (NEW.public_slug IS NULL OR NEW.public_slug = '') THEN
        NEW.public_slug := generate_whiteboard_slug();
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM whiteboards WHERE public_slug = NEW.public_slug AND id != NEW.id) LOOP
            NEW.public_slug := generate_whiteboard_slug();
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_whiteboard_public_slug
    BEFORE INSERT OR UPDATE ON whiteboards
    FOR EACH ROW
    EXECUTE FUNCTION set_whiteboard_public_slug();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_whiteboard_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whiteboard_timestamp
    BEFORE UPDATE ON whiteboards
    FOR EACH ROW
    EXECUTE FUNCTION update_whiteboard_timestamp();

-- Function to get next stroke order
CREATE OR REPLACE FUNCTION get_next_stroke_order(p_whiteboard_id UUID)
RETURNS INTEGER AS $$
DECLARE
    max_order INTEGER;
BEGIN
    SELECT COALESCE(MAX(stroke_order), 0) + 1
    INTO max_order
    FROM whiteboard_strokes
    WHERE whiteboard_id = p_whiteboard_id;
    RETURN max_order;
END;
$$ LANGUAGE plpgsql;
