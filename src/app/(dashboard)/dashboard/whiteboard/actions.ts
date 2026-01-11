/**
 * ============================================================================
 * DISCOVER: Whiteboard Server Actions
 * Description: Server actions for whiteboard operations
 * ============================================================================
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { CreateWhiteboardInput, UpdateWhiteboardInput } from './types';

/**
 * Create a new whiteboard
 */
export async function createWhiteboard(input?: CreateWhiteboardInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: whiteboard, error } = await supabase
    .from('whiteboards')
    .insert({
      user_id: user.id,
      name: input?.name || 'Untitled Whiteboard',
      description: input?.description,
      is_public: input?.is_public || false,
      allow_public_edit: input?.allow_public_edit || false,
      background_color: input?.background_color || '#171717',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create whiteboard:', error);
    throw new Error('Failed to create whiteboard');
  }

  revalidatePath('/dashboard/whiteboard');
  return whiteboard;
}

/**
 * Update a whiteboard
 */
export async function updateWhiteboard(id: string, updates: UpdateWhiteboardInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Verify ownership or admin access
  const { data: whiteboard } = await supabase
    .from('whiteboards')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!whiteboard) {
    throw new Error('Whiteboard not found');
  }

  const isOwner = whiteboard.user_id === user.id;

  if (!isOwner) {
    const { data: collaborator } = await supabase
      .from('whiteboard_collaborators')
      .select('role')
      .eq('whiteboard_id', id)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .not('accepted_at', 'is', null)
      .single();

    if (!collaborator) {
      throw new Error('Access denied');
    }
  }

  const { data: updatedWhiteboard, error } = await supabase
    .from('whiteboards')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update whiteboard:', error);
    throw new Error('Failed to update whiteboard');
  }

  revalidatePath('/dashboard/whiteboard');
  revalidatePath(`/dashboard/whiteboard/${id}`);
  return updatedWhiteboard;
}

/**
 * Delete a whiteboard
 */
export async function deleteWhiteboard(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const { data: whiteboard } = await supabase
    .from('whiteboards')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!whiteboard || whiteboard.user_id !== user.id) {
    throw new Error('Only the owner can delete this whiteboard');
  }

  const { error } = await supabase
    .from('whiteboards')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete whiteboard:', error);
    throw new Error('Failed to delete whiteboard');
  }

  revalidatePath('/dashboard/whiteboard');
  redirect('/dashboard/whiteboard');
}

/**
 * Archive a whiteboard
 */
export async function archiveWhiteboard(id: string) {
  return updateWhiteboard(id, { is_archived: true });
}

/**
 * Unarchive a whiteboard
 */
export async function unarchiveWhiteboard(id: string) {
  return updateWhiteboard(id, { is_archived: false });
}

/**
 * Toggle whiteboard public status
 */
export async function toggleWhiteboardPublic(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: whiteboard } = await supabase
    .from('whiteboards')
    .select('is_public, user_id')
    .eq('id', id)
    .single();

  if (!whiteboard || whiteboard.user_id !== user.id) {
    throw new Error('Access denied');
  }

  return updateWhiteboard(id, { is_public: !whiteboard.is_public });
}

/**
 * Duplicate a whiteboard
 */
export async function duplicateWhiteboard(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get original whiteboard
  const { data: original } = await supabase
    .from('whiteboards')
    .select('*')
    .eq('id', id)
    .single();

  if (!original) {
    throw new Error('Whiteboard not found');
  }

  // Create duplicate
  const { data: duplicate, error } = await supabase
    .from('whiteboards')
    .insert({
      user_id: user.id,
      name: `${original.name} (Copy)`,
      description: original.description,
      is_public: false,
      allow_public_edit: false,
      background_color: original.background_color,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to duplicate whiteboard:', error);
    throw new Error('Failed to duplicate whiteboard');
  }

  // Optionally copy strokes
  const { data: strokes } = await supabase
    .from('whiteboard_strokes')
    .select('*')
    .eq('whiteboard_id', id)
    .order('stroke_order', { ascending: true });

  if (strokes && strokes.length > 0) {
    const duplicateStrokes = strokes.map((stroke, index) => ({
      whiteboard_id: duplicate.id,
      user_id: user.id,
      stroke_data: stroke.stroke_data,
      color: stroke.color,
      line_width: stroke.line_width,
      tool: stroke.tool,
      stroke_order: index + 1,
    }));

    await supabase.from('whiteboard_strokes').insert(duplicateStrokes);
  }

  revalidatePath('/dashboard/whiteboard');
  return duplicate;
}
