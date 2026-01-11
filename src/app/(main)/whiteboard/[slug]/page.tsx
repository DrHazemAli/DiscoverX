/**
 * ============================================================================
 * DISCOVER: Public Whiteboard View Page
 * Description: Public page to view shared whiteboards
 * ============================================================================
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PublicWhiteboardViewer } from '../PublicWhiteboardViewer';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: whiteboard } = await supabase
    .from('whiteboards')
    .select('name, description')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single();

  if (!whiteboard) {
    return {
      title: 'Whiteboard Not Found',
    };
  }

  return {
    title: `${whiteboard.name} | Discover Whiteboard`,
    description: whiteboard.description || 'A collaborative whiteboard on Discover',
    openGraph: {
      title: whiteboard.name,
      description: whiteboard.description || 'A collaborative whiteboard on Discover',
      type: 'website',
    },
  };
}

export default async function PublicWhiteboardPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get whiteboard by public slug
  const { data: whiteboard, error } = await supabase
    .from('whiteboards')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !whiteboard) {
    notFound();
  }

  // Check if user is logged in (optional)
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    userProfile = {
      id: user.id,
      fullName: profile?.full_name || user.user_metadata?.full_name || 'User',
      avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
    };
  }

  return (
    <PublicWhiteboardViewer
      whiteboard={whiteboard}
      user={userProfile}
    />
  );
}
