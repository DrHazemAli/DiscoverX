/**
 * ============================================================================
 * DISCOVER: Whiteboard Chat Messages API Routes
 * Description: API for persisting chat messages
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/whiteboards/[id]/chat - Get chat messages for a whiteboard
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const before = searchParams.get('before'); // ISO timestamp for pagination

    // Check whiteboard access
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

    let query = supabase
      .from('whiteboard_chat_messages')
      .select('*')
      .eq('whiteboard_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching chat messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Return in ascending order for display
    return NextResponse.json({ data: messages?.reverse() || [] });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/whiteboards/[id]/chat - Post a chat message
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check whiteboard exists and is accessible
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

    // Anyone can chat on public whiteboards, only owner/collaborators on private
    if (!isOwner && !whiteboard.is_public) {
      if (user) {
        const { data: collaborator } = await supabase
          .from('whiteboard_collaborators')
          .select('id')
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

    const body = await request.json();
    const { message, username, avatar_url, guest_id } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const { data: chatMessage, error } = await supabase
      .from('whiteboard_chat_messages')
      .insert({
        whiteboard_id: id,
        user_id: user?.id || null,
        guest_id: user ? null : guest_id,
        username: username || (user?.user_metadata?.full_name) || 'Anonymous',
        avatar_url: avatar_url || user?.user_metadata?.avatar_url || null,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error posting chat message:', error);
      return NextResponse.json(
        { error: 'Failed to post message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: chatMessage }, { status: 201 });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
