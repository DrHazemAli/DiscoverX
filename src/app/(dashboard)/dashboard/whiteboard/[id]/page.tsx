/**
 * ============================================================================
 * DISCOVER: Whiteboard Detail Page
 * Description: View and edit a specific whiteboard
 * ============================================================================
 */

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WhiteboardEditor } from '../WhiteboardEditor';
import { updateWhiteboard } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: whiteboard } = await supabase
    .from('whiteboards')
    .select('name, description')
    .eq('id', id)
    .single();

  return {
    title: whiteboard?.name || 'Whiteboard',
    description: whiteboard?.description || 'Collaborative whiteboard',
  };
}

export default async function WhiteboardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?message=Please sign in to access whiteboards');
  }

  // Get whiteboard
  const { data: whiteboard, error } = await supabase
    .from('whiteboards')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !whiteboard) {
    notFound();
  }

  // Check access
  const isOwner = whiteboard.user_id === user.id;
  let canEdit = isOwner;

  if (!isOwner) {
    // Check if user is a collaborator
    const { data: collaborator } = await supabase
      .from('whiteboard_collaborators')
      .select('role')
      .eq('whiteboard_id', id)
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .single();

    if (collaborator) {
      canEdit = collaborator.role === 'editor' || collaborator.role === 'admin';
    } else if (!whiteboard.is_public) {
      // Not a collaborator and not public - redirect
      notFound();
    }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const userProfile = {
    id: user.id,
    email: user.email || '',
    fullName: profile?.full_name || user.user_metadata?.full_name || 'User',
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
  };

  // Update last accessed
  await supabase
    .from('whiteboards')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', id);

  // Server action wrapper for updates
  async function handleUpdate(updates: Partial<typeof whiteboard>) {
    'use server';
    await updateWhiteboard(id, updates);
  }

  return (
    <WhiteboardEditor
      whiteboard={whiteboard}
      user={userProfile}
      canEdit={canEdit}
      onUpdate={handleUpdate}
    />
  );
}
