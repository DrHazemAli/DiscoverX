/**
 * ============================================================================
 * DISCOVER: Remove Saved Repo Button
 * Description: Client-side button to remove a saved repository
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface RemoveSavedRepoProps {
  savedId: string;
}

export function RemoveSavedRepo({ savedId }: RemoveSavedRepoProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this repository?')) {
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('saved_repos').delete().eq('id', savedId);
      router.refresh();
    } catch (error) {
      console.error('Failed to remove saved repo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isLoading}
      className={cn(
        'p-2 rounded-lg transition-colors',
        'hover:bg-destructive/10 text-muted-foreground hover:text-destructive',
        'disabled:opacity-50'
      )}
      title="Remove from saved"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
