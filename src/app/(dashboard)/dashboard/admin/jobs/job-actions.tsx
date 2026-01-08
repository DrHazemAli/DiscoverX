/**
 * ============================================================================
 * DISCOVER: Job Actions Component
 * Description: Client-side actions for job management
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Play, Trash2, RotateCcw, MoreVertical } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface JobActionsProps {
  action: 'trigger' | 'job';
  jobId?: string;
  jobStatus?: string;
}

export function JobActions({ action, jobId, jobStatus }: JobActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTriggerJobs = async () => {
    setIsLoading(true);
    try {
      // Call the internal job runner endpoint
      const response = await fetch('/api/internal/jobs/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET || '',
        },
        body: JSON.stringify({ batchSize: 10 }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to trigger jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryJob = async () => {
    if (!jobId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('job_queue')
        .update({
          status: 'queued',
          attempt: 0,
          locked_at: null,
          locked_by: null,
          last_error: null,
        })
        .eq('id', jobId);
      router.refresh();
    } catch (error) {
      console.error('Failed to retry job:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobId) return;
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('job_queue').delete().eq('id', jobId);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete job:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  if (action === 'trigger') {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={handleTriggerJobs}
        isLoading={isLoading}
        loadingText="Running..."
        leftIcon={<Play className="h-4 w-4" />}
      >
        Run Jobs
      </Button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'hover:bg-secondary text-muted-foreground hover:text-foreground',
          'disabled:opacity-50'
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 w-40 z-50',
            'bg-background border border-border rounded-lg shadow-lg',
            'py-1'
          )}
        >
          {(jobStatus === 'failed' || jobStatus === 'done') && (
            <button
              onClick={handleRetryJob}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
            >
              <RotateCcw className="h-4 w-4" />
              Retry Job
            </button>
          )}
          <button
            onClick={handleDeleteJob}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete Job
          </button>
        </div>
      )}
    </div>
  );
}
