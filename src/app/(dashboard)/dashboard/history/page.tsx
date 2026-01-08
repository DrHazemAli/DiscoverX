/**
 * ============================================================================
 * DISCOVER: User History Page
 * Description: User's analysis and comparison history
 * ============================================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Clock, Search, GitCompare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'History',
  description: 'Your analysis and comparison history',
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's activity history
  const { data: history } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'analyze':
        return Search;
      case 'compare':
        return GitCompare;
      default:
        return Clock;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">History</h1>
        <p className="text-muted-foreground mt-1">
          Your recent activity and analysis history
        </p>
      </div>

      {history && history.length > 0 ? (
        <Card variant="default" padding="none">
          <CardContent className="p-0 divide-y divide-border">
            {history.map((item: { id: string; type: string; action: string; repo_name?: string; metadata?: Record<string, unknown>; created_at: string }) => {
              const Icon = getActivityIcon(item.type);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-secondary">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      {item.action}
                      {item.repo_name && (
                        <Link
                          href={`/repos/${item.repo_name}`}
                          className="text-primary hover:underline ml-1"
                        >
                          {item.repo_name}
                        </Link>
                      )}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card variant="default" padding="lg">
          <CardContent className="p-0 text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground">No history yet</h2>
            <p className="text-muted-foreground mt-1">
              Start analyzing repositories to build your history.
            </p>
            <Link
              href="/dashboard/analyze"
              className="inline-block mt-4 text-primary hover:underline"
            >
              Analyze a Repository →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
