/**
 * ============================================================================
 * DISCOVER: Whiteboard List Page
 * Description: Dashboard page to list and manage whiteboards
 * ============================================================================
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Plus, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WhiteboardCard } from './components/WhiteboardCard';
import { createWhiteboard } from './actions';

export const metadata: Metadata = {
  title: 'Whiteboards',
  description: 'Manage your collaborative whiteboards',
};

export default async function WhiteboardListPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?message=Please sign in to access whiteboards');
  }

  // Get user's whiteboards
  const { data: whiteboards } = await supabase
    .from('whiteboards')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  // Get whiteboards user is collaborating on
  const { data: collaborations } = await supabase
    .from('whiteboard_collaborators')
    .select(`
      role,
      whiteboards (*)
    `)
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null);

  const collaboratorWhiteboards = collaborations
    ?.map((c) => ({
      ...c.whiteboards,
      collaboratorRole: c.role,
    }))
    .filter(Boolean) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Whiteboards</h1>
          <p className="text-muted-foreground mt-1">
            Create and collaborate on whiteboards in real-time
          </p>
        </div>
        <form action={handleCreateWhiteboard}>
          <Button type="submit" leftIcon={<Plus className="h-4 w-4" />}>
            New Whiteboard
          </Button>
        </form>
      </div>

      {/* My Whiteboards */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          My Whiteboards
        </h2>
        {whiteboards && whiteboards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whiteboards.map((wb) => (
              <WhiteboardCard key={wb.id} whiteboard={wb} isOwner />
            ))}
          </div>
        ) : (
          <Card variant="default" padding="lg">
            <CardContent className="p-0 flex flex-col items-center justify-center text-center">
              <Pencil className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">
                No whiteboards yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first whiteboard to start collaborating
              </p>
              <form action={handleCreateWhiteboard}>
                <Button type="submit" variant="primary" size="sm">
                  Create Whiteboard
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Shared with me */}
      {collaboratorWhiteboards.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Shared with me
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collaboratorWhiteboards.map((wb: any) => (
              <WhiteboardCard
                key={wb.id}
                whiteboard={wb}
                collaboratorRole={wb.collaboratorRole}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Server action to create whiteboard and redirect
async function handleCreateWhiteboard() {
  'use server';

  const whiteboard = await createWhiteboard();
  redirect(`/dashboard/whiteboard/${whiteboard.id}`);
}
