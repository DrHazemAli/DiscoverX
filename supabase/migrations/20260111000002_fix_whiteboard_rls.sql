-- ============================================================================
-- DISCOVER: Fix Whiteboard RLS Infinite Recursion
-- Description: Fixes infinite recursion in whiteboard policies
-- Version: 1.0.1
-- Created: 2026-01-11
-- ============================================================================

-- The problem: Policies on whiteboard_collaborators reference whiteboards table,
-- and vice versa, causing infinite recursion when inserting into whiteboards.
-- 
-- Solution: Use SECURITY DEFINER functions to check ownership/access without
-- triggering the RLS policies recursively.

-- ============================================================================
-- DROP EXISTING PROBLEMATIC POLICIES
-- ============================================================================

-- Drop whiteboard policies that may cause issues
DROP POLICY IF EXISTS "Users can view own whiteboards" ON whiteboards;
DROP POLICY IF EXISTS "Collaborators can view whiteboards" ON whiteboards;
DROP POLICY IF EXISTS "Anyone can view public whiteboards" ON whiteboards;
DROP POLICY IF EXISTS "Users can create whiteboards" ON whiteboards;
DROP POLICY IF EXISTS "Users can update own whiteboards" ON whiteboards;
DROP POLICY IF EXISTS "Admins can update whiteboards" ON whiteboards;
DROP POLICY IF EXISTS "Users can delete own whiteboards" ON whiteboards;

-- Drop collaborator policies
DROP POLICY IF EXISTS "Users can view collaborators on own whiteboards" ON whiteboard_collaborators;
DROP POLICY IF EXISTS "Owners can add collaborators" ON whiteboard_collaborators;
DROP POLICY IF EXISTS "Owners can update collaborators" ON whiteboard_collaborators;
DROP POLICY IF EXISTS "Collaborators can accept invitations" ON whiteboard_collaborators;
DROP POLICY IF EXISTS "Owners can delete collaborators" ON whiteboard_collaborators;

-- Drop strokes policies
DROP POLICY IF EXISTS "Anyone can view strokes on public whiteboards" ON whiteboard_strokes;
DROP POLICY IF EXISTS "Users can view strokes on accessible whiteboards" ON whiteboard_strokes;
DROP POLICY IF EXISTS "Users can insert strokes on editable whiteboards" ON whiteboard_strokes;
DROP POLICY IF EXISTS "Anon can insert strokes on public editable whiteboards" ON whiteboard_strokes;
DROP POLICY IF EXISTS "Owners can delete strokes" ON whiteboard_strokes;

-- Drop chat policies
DROP POLICY IF EXISTS "Anyone can view chat on public whiteboards" ON whiteboard_chat_messages;
DROP POLICY IF EXISTS "Users can view chat on accessible whiteboards" ON whiteboard_chat_messages;
DROP POLICY IF EXISTS "Users can post chat on accessible whiteboards" ON whiteboard_chat_messages;
DROP POLICY IF EXISTS "Anon can post chat on public whiteboards" ON whiteboard_chat_messages;

-- ============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- These functions run with the privileges of the function owner (postgres)
-- and bypass RLS, preventing infinite recursion
-- ============================================================================

-- Check if user owns a whiteboard (bypasses RLS)
CREATE OR REPLACE FUNCTION is_whiteboard_owner(p_whiteboard_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM whiteboards
        WHERE id = p_whiteboard_id
        AND user_id = p_user_id
    );
$$;

-- Check if whiteboard is public (bypasses RLS)
CREATE OR REPLACE FUNCTION is_whiteboard_public(p_whiteboard_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_public FROM whiteboards WHERE id = p_whiteboard_id),
        FALSE
    );
$$;

-- Check if whiteboard allows public editing (bypasses RLS)
CREATE OR REPLACE FUNCTION is_whiteboard_public_editable(p_whiteboard_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_public AND allow_public_edit FROM whiteboards WHERE id = p_whiteboard_id),
        FALSE
    );
$$;

-- Check if user is a collaborator (bypasses RLS)
CREATE OR REPLACE FUNCTION is_whiteboard_collaborator(p_whiteboard_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM whiteboard_collaborators
        WHERE whiteboard_id = p_whiteboard_id
        AND user_id = p_user_id
        AND accepted_at IS NOT NULL
    );
$$;

-- Check if user is a collaborator with edit permissions (bypasses RLS)
CREATE OR REPLACE FUNCTION is_whiteboard_editor(p_whiteboard_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM whiteboard_collaborators
        WHERE whiteboard_id = p_whiteboard_id
        AND user_id = p_user_id
        AND role IN ('editor', 'admin')
        AND accepted_at IS NOT NULL
    );
$$;

-- Check if user is a collaborator with admin permissions (bypasses RLS)
CREATE OR REPLACE FUNCTION is_whiteboard_admin(p_whiteboard_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM whiteboard_collaborators
        WHERE whiteboard_id = p_whiteboard_id
        AND user_id = p_user_id
        AND role = 'admin'
        AND accepted_at IS NOT NULL
    );
$$;

-- Check if user can view a whiteboard (owner, collaborator, or public)
CREATE OR REPLACE FUNCTION can_view_whiteboard(p_whiteboard_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        is_whiteboard_public(p_whiteboard_id)
        OR is_whiteboard_owner(p_whiteboard_id, p_user_id)
        OR is_whiteboard_collaborator(p_whiteboard_id, p_user_id);
$$;

-- Check if user can edit a whiteboard
CREATE OR REPLACE FUNCTION can_edit_whiteboard(p_whiteboard_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        is_whiteboard_owner(p_whiteboard_id, p_user_id)
        OR is_whiteboard_editor(p_whiteboard_id, p_user_id);
$$;

-- ============================================================================
-- NEW WHITEBOARDS POLICIES (using helper functions)
-- ============================================================================

-- Users can view their own whiteboards (simple, no recursion)
CREATE POLICY "whiteboards_select_owner"
    ON whiteboards FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can view whiteboards they're collaborators on (using helper function)
CREATE POLICY "whiteboards_select_collaborator"
    ON whiteboards FOR SELECT
    TO authenticated
    USING (is_whiteboard_collaborator(id, auth.uid()));

-- Anyone can view public whiteboards (simple, no recursion)
CREATE POLICY "whiteboards_select_public"
    ON whiteboards FOR SELECT
    TO anon, authenticated
    USING (is_public = TRUE);

-- Users can create their own whiteboards (simple, no recursion)
CREATE POLICY "whiteboards_insert_owner"
    ON whiteboards FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own whiteboards (simple, no recursion)
CREATE POLICY "whiteboards_update_owner"
    ON whiteboards FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can update whiteboards (using helper function)
CREATE POLICY "whiteboards_update_admin"
    ON whiteboards FOR UPDATE
    TO authenticated
    USING (is_whiteboard_admin(id, auth.uid()));

-- Users can delete their own whiteboards (simple, no recursion)
CREATE POLICY "whiteboards_delete_owner"
    ON whiteboards FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- NEW WHITEBOARD_COLLABORATORS POLICIES
-- ============================================================================

-- Users can view collaborators on whiteboards they own (using helper function)
CREATE POLICY "collaborators_select_owner"
    ON whiteboard_collaborators FOR SELECT
    TO authenticated
    USING (is_whiteboard_owner(whiteboard_id, auth.uid()));

-- Users can view their own collaboration records
CREATE POLICY "collaborators_select_self"
    ON whiteboard_collaborators FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Whiteboard owners can add collaborators (using helper function)
CREATE POLICY "collaborators_insert_owner"
    ON whiteboard_collaborators FOR INSERT
    TO authenticated
    WITH CHECK (is_whiteboard_owner(whiteboard_id, auth.uid()));

-- Whiteboard owners can update collaborators (using helper function)
CREATE POLICY "collaborators_update_owner"
    ON whiteboard_collaborators FOR UPDATE
    TO authenticated
    USING (is_whiteboard_owner(whiteboard_id, auth.uid()));

-- Collaborators can update their own record (to accept invitations)
CREATE POLICY "collaborators_update_self"
    ON whiteboard_collaborators FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Whiteboard owners can delete collaborators (using helper function)
CREATE POLICY "collaborators_delete_owner"
    ON whiteboard_collaborators FOR DELETE
    TO authenticated
    USING (is_whiteboard_owner(whiteboard_id, auth.uid()));

-- Users can remove themselves as collaborators
CREATE POLICY "collaborators_delete_self"
    ON whiteboard_collaborators FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- NEW WHITEBOARD_STROKES POLICIES
-- ============================================================================

-- Anyone can view strokes on public whiteboards (using helper function)
CREATE POLICY "strokes_select_public"
    ON whiteboard_strokes FOR SELECT
    TO anon, authenticated
    USING (is_whiteboard_public(whiteboard_id));

-- Users can view strokes on whiteboards they can access (using helper function)
CREATE POLICY "strokes_select_accessible"
    ON whiteboard_strokes FOR SELECT
    TO authenticated
    USING (can_view_whiteboard(whiteboard_id, auth.uid()));

-- Users can insert strokes on whiteboards they can edit (using helper function)
CREATE POLICY "strokes_insert_editor"
    ON whiteboard_strokes FOR INSERT
    TO authenticated
    WITH CHECK (can_edit_whiteboard(whiteboard_id, auth.uid()));

-- Anonymous users can insert strokes on public editable whiteboards
CREATE POLICY "strokes_insert_public"
    ON whiteboard_strokes FOR INSERT
    TO anon
    WITH CHECK (is_whiteboard_public_editable(whiteboard_id));

-- Whiteboard owners can delete strokes (using helper function)
CREATE POLICY "strokes_delete_owner"
    ON whiteboard_strokes FOR DELETE
    TO authenticated
    USING (is_whiteboard_owner(whiteboard_id, auth.uid()));

-- Users can delete their own strokes
CREATE POLICY "strokes_delete_self"
    ON whiteboard_strokes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- NEW WHITEBOARD_CHAT_MESSAGES POLICIES
-- ============================================================================

-- Anyone can view chat on public whiteboards (using helper function)
CREATE POLICY "chat_select_public"
    ON whiteboard_chat_messages FOR SELECT
    TO anon, authenticated
    USING (is_whiteboard_public(whiteboard_id));

-- Users can view chat on whiteboards they can access (using helper function)
CREATE POLICY "chat_select_accessible"
    ON whiteboard_chat_messages FOR SELECT
    TO authenticated
    USING (can_view_whiteboard(whiteboard_id, auth.uid()));

-- Authenticated users can post chat on accessible whiteboards or public ones
CREATE POLICY "chat_insert_authenticated"
    ON whiteboard_chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        can_view_whiteboard(whiteboard_id, auth.uid())
        OR is_whiteboard_public(whiteboard_id)
    );

-- Anonymous users can post chat on public whiteboards
CREATE POLICY "chat_insert_public"
    ON whiteboard_chat_messages FOR INSERT
    TO anon
    WITH CHECK (is_whiteboard_public(whiteboard_id));

-- Users can delete their own messages
CREATE POLICY "chat_delete_self"
    ON whiteboard_chat_messages FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Whiteboard owners can delete any message (using helper function)
CREATE POLICY "chat_delete_owner"
    ON whiteboard_chat_messages FOR DELETE
    TO authenticated
    USING (is_whiteboard_owner(whiteboard_id, auth.uid()));

-- ============================================================================
-- GRANT EXECUTE ON HELPER FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_whiteboard_owner(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_whiteboard_public(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_whiteboard_public_editable(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_whiteboard_collaborator(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_whiteboard_editor(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_whiteboard_admin(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_view_whiteboard(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_edit_whiteboard(UUID, UUID) TO authenticated, anon;
