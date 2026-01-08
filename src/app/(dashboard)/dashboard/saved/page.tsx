/**
 * ============================================================================
 * DISCOVER: Saved Repositories Page
 * Description: User's saved repositories list
 * ============================================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Bookmark, ExternalLink, Star, GitFork } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RemoveSavedRepo } from './remove-button';

export const metadata: Metadata = {
  title: 'Saved Repositories',
  description: 'Your saved GitHub repositories',
};

export default async function SavedReposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Define the type for saved repo data
interface SavedRepoData {
  id: string;
  created_at: string;
  repositories: {
    id: string;
    owner: string;
    name: string;
    description: string | null;
    stars_count: number;
    forks_count: number;
    language: string | null;
  } | null;
}

// Get user's saved repos
  const { data: savedRepos } = await supabase
    .from('saved_repos')
    .select(`
      id,
      created_at,
      repositories (
        id,
        owner,
        name,
        description,
        stars_count,
        forks_count,
        language
      )
    `)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false }) as { data: SavedRepoData[] | null };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Saved Repositories</h1>
          <p className="text-muted-foreground mt-1">
            {savedRepos?.length || 0} repositories saved
          </p>
        </div>
        <Link href="/dashboard/analyze">
          <Button variant="primary" size="sm">
            Add Repository
          </Button>
        </Link>
      </div>

      {savedRepos && savedRepos.length > 0 ? (
        <div className="grid gap-4">
          {savedRepos.map((saved) => {
            const repo = saved.repositories;
            if (!repo) return null;

            return (
              <Card key={saved.id} variant="default" padding="md">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/repos/${repo.owner}/${repo.name}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {repo.owner}/{repo.name}
                        </Link>
                        {repo.language && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground">
                            {repo.language}
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {repo.stars_count?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-4 w-4" />
                          {repo.forks_count?.toLocaleString() || 0}
                        </span>
                        <span className="text-xs">
                          Saved {new Date(saved.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://github.com/${repo.owner}/${repo.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <RemoveSavedRepo savedId={saved.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card variant="default" padding="lg">
          <CardContent className="p-0 text-center py-12">
            <Bookmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground">No saved repositories</h2>
            <p className="text-muted-foreground mt-1">
              Save repositories to quickly access them later.
            </p>
            <Link href="/dashboard/analyze">
              <Button variant="primary" className="mt-4">
                Analyze a Repository
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
