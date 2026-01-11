/**
 * ============================================================================
 * DISCOVER: Whiteboard API Routes
 * Description: REST API for whiteboard CRUD operations
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/v1/whiteboards - List user's whiteboards
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('archived') === 'true';

    let query = supabase
      .from('whiteboards')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data: whiteboards, error } = await query;

    if (error) {
      console.error('Error fetching whiteboards:', error);
      return NextResponse.json(
        { error: 'Failed to fetch whiteboards' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: whiteboards });
  } catch (error) {
    console.error('Whiteboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/whiteboards - Create a new whiteboard
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name = 'Untitled Whiteboard',
      description,
      is_public = false,
      allow_public_edit = false,
      background_color = '#171717',
    } = body;

    const { data: whiteboard, error } = await supabase
      .from('whiteboards')
      .insert({
        user_id: user.id,
        name,
        description,
        is_public,
        allow_public_edit,
        background_color,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating whiteboard:', error);
      return NextResponse.json(
        { error: 'Failed to create whiteboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: whiteboard }, { status: 201 });
  } catch (error) {
    console.error('Whiteboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
