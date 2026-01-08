/**
 * ============================================================================
 * DISCOVER: Analyze Form
 * Description: Client-side form for repository analysis
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Github, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const popularRepos = [
  { owner: 'facebook', name: 'react', description: 'React JavaScript Library' },
  { owner: 'vercel', name: 'next.js', description: 'The React Framework' },
  { owner: 'microsoft', name: 'vscode', description: 'Visual Studio Code' },
  { owner: 'tailwindlabs', name: 'tailwindcss', description: 'Utility-first CSS' },
  { owner: 'supabase', name: 'supabase', description: 'Firebase alternative' },
];

function parseRepoInput(input: string): { owner: string; name: string } | null {
  // Remove whitespace
  const cleaned = input.trim();

  // Try to parse as URL
  const urlMatch = cleaned.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s]+)/i
  );
  if (urlMatch) {
    return { owner: urlMatch[1], name: urlMatch[2].replace(/\.git$/, '') };
  }

  // Try to parse as owner/name
  const slashMatch = cleaned.match(/^([^\/\s]+)\/([^\/\s]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], name: slashMatch[2] };
  }

  return null;
}

export function AnalyzeForm() {
  const router = useRouter();
  const [input, setInput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseRepoInput(input);
    if (!parsed) {
      setError('Please enter a valid GitHub repository URL or owner/name');
      return;
    }

    setIsLoading(true);
    router.push(`/repos/${parsed.owner}/${parsed.name}`);
  };

  const handleQuickSelect = (owner: string, name: string) => {
    setIsLoading(true);
    router.push(`/repos/${owner}/${name}`);
  };

  return (
    <div className="space-y-8">
      {/* Search Form */}
      <Card variant="elevated" padding="lg">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter GitHub URL or owner/name (e.g., facebook/react)"
              leftIcon={<Github className="h-4 w-4" />}
              error={error || undefined}
              disabled={isLoading}
              inputSize="lg"
            />

            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                loadingText="Analyzing..."
                disabled={!input.trim()}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Analyze Repository
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Popular Repos */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Popular Repositories
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularRepos.map((repo) => (
            <button
              key={`${repo.owner}/${repo.name}`}
              onClick={() => handleQuickSelect(repo.owner, repo.name)}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg',
                'bg-secondary/50 hover:bg-secondary',
                'border border-border hover:border-primary/50',
                'transition-colors text-left group',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Github className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {repo.owner}/{repo.name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {repo.description}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <Card variant="default" padding="md">
        <CardContent className="p-0">
          <h3 className="font-semibold text-foreground mb-2">Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Paste a full GitHub URL: https://github.com/owner/repo</li>
            <li>• Or use the short format: owner/repo</li>
            <li>• Analysis includes health scores, activity metrics, and more</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
