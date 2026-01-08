/**
 * ============================================================================
 * DISCOVER: Compare Form
 * Description: Client-side form for comparing repositories
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Github, Plus, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface RepoEntry {
  id: string;
  value: string;
  parsed: { owner: string; name: string } | null;
}

function parseRepoInput(input: string): { owner: string; name: string } | null {
  const cleaned = input.trim();
  
  const urlMatch = cleaned.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s]+)/i
  );
  if (urlMatch) {
    return { owner: urlMatch[1], name: urlMatch[2].replace(/\.git$/, '') };
  }

  const slashMatch = cleaned.match(/^([^\/\s]+)\/([^\/\s]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], name: slashMatch[2] };
  }

  return null;
}

export function CompareForm() {
  const router = useRouter();
  const [repos, setRepos] = React.useState<RepoEntry[]>([
    { id: '1', value: '', parsed: null },
    { id: '2', value: '', parsed: null },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);

  const updateRepo = (id: string, value: string) => {
    setRepos((prev) =>
      prev.map((repo) =>
        repo.id === id
          ? { ...repo, value, parsed: parseRepoInput(value) }
          : repo
      )
    );
  };

  const addRepo = () => {
    if (repos.length < 5) {
      setRepos((prev) => [
        ...prev,
        { id: Date.now().toString(), value: '', parsed: null },
      ]);
    }
  };

  const removeRepo = (id: string) => {
    if (repos.length > 2) {
      setRepos((prev) => prev.filter((repo) => repo.id !== id));
    }
  };

  const handleCompare = () => {
    const validRepos = repos.filter((r) => r.parsed !== null);
    if (validRepos.length < 2) return;

    setIsLoading(true);
    const repoParams = validRepos
      .map((r) => `${r.parsed!.owner}/${r.parsed!.name}`)
      .join(',');
    router.push(`/compare?repos=${encodeURIComponent(repoParams)}`);
  };

  const validCount = repos.filter((r) => r.parsed !== null).length;
  const canCompare = validCount >= 2;

  return (
    <div className="space-y-6">
      <Card variant="elevated" padding="lg">
        <CardContent className="p-0 space-y-4">
          {repos.map((repo, index) => (
            <div key={repo.id} className="flex items-start gap-3">
              <div className="flex-1">
                <Input
                  value={repo.value}
                  onChange={(e) => updateRepo(repo.id, e.target.value)}
                  placeholder={`Repository ${index + 1} (e.g., owner/name)`}
                  leftIcon={<Github className="h-4 w-4" />}
                  disabled={isLoading}
                  variant={
                    repo.value && !repo.parsed
                      ? 'error'
                      : repo.parsed
                      ? 'success'
                      : 'default'
                  }
                />
                {repo.parsed && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ {repo.parsed.owner}/{repo.parsed.name}
                  </p>
                )}
              </div>
              {repos.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRepo(repo.id)}
                  disabled={isLoading}
                  className="mt-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            {repos.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRepo}
                disabled={isLoading}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Repository
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="primary"
              onClick={handleCompare}
              disabled={!canCompare || isLoading}
              isLoading={isLoading}
              loadingText="Loading..."
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Compare ({validCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preset Comparisons */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Popular Comparisons
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: 'React vs Vue vs Angular',
              repos: ['facebook/react', 'vuejs/vue', 'angular/angular'],
            },
            {
              title: 'Next.js vs Nuxt vs SvelteKit',
              repos: ['vercel/next.js', 'nuxt/nuxt', 'sveltejs/kit'],
            },
            {
              title: 'Express vs Fastify vs Hono',
              repos: ['expressjs/express', 'fastify/fastify', 'honojs/hono'],
            },
            {
              title: 'Tailwind vs Bootstrap',
              repos: ['tailwindlabs/tailwindcss', 'twbs/bootstrap'],
            },
          ].map((preset) => (
            <button
              key={preset.title}
              onClick={() => {
                setIsLoading(true);
                router.push(
                  `/compare?repos=${encodeURIComponent(preset.repos.join(','))}`
                );
              }}
              disabled={isLoading}
              className={cn(
                'p-4 rounded-lg text-left',
                'bg-secondary/50 hover:bg-secondary',
                'border border-border hover:border-primary/50',
                'transition-colors group',
                'disabled:opacity-50'
              )}
            >
              <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                {preset.title}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {preset.repos.length} repositories
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
