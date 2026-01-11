/**
 * ============================================================================
 * DISCOVER: Single Whiteboard API Routes
 * Description: REST API for individual whiteboard operations
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/whiteboards/[id] - Get a single whiteboard
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // First try to get the whiteboard
    const { data: whiteboard, error } = await supabase
      .from('whiteboards')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    const isOwner = user && whiteboard.user_id === user.id;
    const isPublic = whiteboard.is_public;

    if (!isOwner && !isPublic) {
      // Check if user is a collaborator
      if (user) {
        const { data: collaborator } = await supabase
          .from('whiteboard_collaborators')
          .select('role')
          .eq('whiteboard_id', id)
          .eq('user_id', user.id)
          .not('accepted_at', 'is', null)
          .single();

        if (!collaborator) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ data: whiteboard });
  } catch (error) {
    console.error('Whiteboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/whiteboards/[id] - Update a whiteboard
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Check ownership or admin role
    const { data: whiteboard } = await supabase
      .from('whiteboards')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      );
    }

    const isOwner = whiteboard.user_id === user.id;

    if (!isOwner) {
      // Check if user is an admin collaborator
      const { data: collaborator } = await supabase
        .from('whiteboard_collaborators')
        .select('role')
        .eq('whiteboard_id', id)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .not('accepted_at', 'is', null)
        .single();

      if (!collaborator) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const allowedFields = [
      'name',
      'description',
      'is_public',
      'allow_public_edit',
      'background_color',
      'is_archived',
    ];

    // Filter to only allowed fields
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const { data: updatedWhiteboard, error } = await supabase
      .from('whiteboards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating whiteboard:', error);
      return NextResponse.json(
        { error: 'Failed to update whiteboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedWhiteboard });
  } catch (error) {
    console.error('Whiteboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/whiteboards/[id] - Delete a whiteboard
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

    // Check ownership
    const { data: whiteboard } = await supabase
      .from('whiteboards')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      );
    }

    if (whiteboard.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the owner can delete this whiteboard' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('whiteboards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting whiteboard:', error);
      return NextResponse.json(
        { error: 'Failed to delete whiteboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Whiteboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
