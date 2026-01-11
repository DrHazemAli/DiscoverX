/**
 * ============================================================================
 * DISCOVER: Whiteboard Strokes API Routes
 * Description: API for saving and retrieving whiteboard strokes
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/whiteboards/[id]/strokes - Get all strokes for a whiteboard
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // First check if whiteboard is accessible
    const { data: whiteboard } = await supabase
      .from('whiteboards')
      .select('id, is_public, user_id')
      .eq('id', id)
      .single();

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user && whiteboard.user_id === user.id;

    if (!isOwner && !whiteboard.is_public) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get strokes ordered by stroke_order
    const { data: strokes, error } = await supabase
      .from('whiteboard_strokes')
      .select('*')
      .eq('whiteboard_id', id)
      .order('stroke_order', { ascending: true });

    if (error) {
      console.error('Error fetching strokes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch strokes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: strokes });
  } catch (error) {
    console.error('Strokes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/whiteboards/[id]/strokes - Save a new stroke
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check whiteboard access
    const { data: whiteboard } = await supabase
      .from('whiteboards')
      .select('id, is_public, allow_public_edit, user_id')
      .eq('id', id)
      .single();

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user && whiteboard.user_id === user.id;
    const canEdit = isOwner || (whiteboard.is_public && whiteboard.allow_public_edit);

    // Check collaborator access if not owner and not public edit
    if (!canEdit && user) {
      const { data: collaborator } = await supabase
        .from('whiteboard_collaborators')
        .select('role')
        .eq('whiteboard_id', id)
        .eq('user_id', user.id)
        .in('role', ['editor', 'admin'])
        .not('accepted_at', 'is', null)
        .single();

      if (!collaborator) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    } else if (!canEdit) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { stroke_data, color, line_width, tool, guest_id } = body;

    // Get next stroke order
    const { data: maxOrder } = await supabase
      .rpc('get_next_stroke_order', { p_whiteboard_id: id });

    const { data: stroke, error } = await supabase
      .from('whiteboard_strokes')
      .insert({
        whiteboard_id: id,
        user_id: user?.id || null,
        guest_id: user ? null : guest_id,
        stroke_data,
        color: color || '#ffffff',
        line_width: line_width || 5,
        tool: tool || 'pen',
        stroke_order: maxOrder || 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving stroke:', error);
      return NextResponse.json(
        { error: 'Failed to save stroke' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: stroke }, { status: 201 });
  } catch (error) {
    console.error('Strokes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/whiteboards/[id]/strokes - Clear all strokes
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only owner can clear all strokes
    const { data: whiteboard } = await supabase
      .from('whiteboards')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!whiteboard || whiteboard.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the owner can clear strokes' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('whiteboard_strokes')
      .delete()
      .eq('whiteboard_id', id);

    if (error) {
      console.error('Error clearing strokes:', error);
      return NextResponse.json(
        { error: 'Failed to clear strokes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Strokes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
