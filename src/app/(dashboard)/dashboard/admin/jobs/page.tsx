/**
 * ============================================================================
 * DISCOVER: Admin Jobs Management
 * Description: View and manage background jobs
 * ============================================================================
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/server/auth';
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { JobActions } from './job-actions';

export const metadata: Metadata = {
  title: 'Job Queue',
  description: 'Manage background jobs',
};

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  const canViewJobs = await hasPermission(user.id, 'system.view_jobs');
  if (!canViewJobs) {
    redirect('/dashboard/admin?message=You do not have permission to view jobs');
  }

  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from('job_queue')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.type) {
    query = query.eq('type', params.type);
  }

  const { data: jobs, count } = await query;
  const totalPages = Math.ceil((count || 0) / pageSize);

  // Get job stats
  const [
    { count: queuedCount },
    { count: runningCount },
    { count: doneCount },
    { count: failedCount },
  ] = await Promise.all([
    supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
  ]);

  const canManageJobs = await hasPermission(user.id, 'system.manage_jobs');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'done':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'running':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'done':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'failed':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  const stats = [
    { label: 'Queued', count: queuedCount || 0, color: 'text-amber-600' },
    { label: 'Running', count: runningCount || 0, color: 'text-blue-600' },
    { label: 'Done', count: doneCount || 0, color: 'text-green-600' },
    { label: 'Failed', count: failedCount || 0, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Job Queue</h1>
            <p className="text-muted-foreground">
              {count || 0} total jobs
            </p>
          </div>
        </div>
        {canManageJobs && (
          <JobActions action="trigger" />
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <a
            key={stat.label}
            href={`?status=${stat.label.toLowerCase()}`}
            className="block"
          >
            <Card
              variant="default"
              padding="md"
              className={`hover:border-primary/50 transition-colors ${
                params.status === stat.label.toLowerCase() ? 'border-primary' : ''
              }`}
            >
              <CardContent className="p-0 flex items-center justify-between">
                <span className="text-muted-foreground">{stat.label}</span>
                <span className={`text-2xl font-bold ${stat.color}`}>
                  {stat.count.toLocaleString()}
                </span>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Jobs Table */}
      <Card variant="default" padding="none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Attempts
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Created
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Run At
                  </th>
                  {canManageJobs && (
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs?.map((job: { id: string; type: string; status: string; priority: number; attempt: number; created_at: string; run_at: string; last_error: string | null }) => (
                  <tr key={job.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-secondary px-2 py-1 rounded">
                        {job.type}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}
                      >
                        {getStatusIcon(job.status)}
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {job.priority}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {job.attempt}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(job.run_at).toLocaleString()}
                    </td>
                    {canManageJobs && (
                      <td className="px-4 py-3 text-right">
                        <JobActions
                          action="job"
                          jobId={job.id}
                          jobStatus={job.status}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`?page=${page - 1}${params.status ? `&status=${params.status}` : ''}${params.type ? `&type=${params.type}` : ''}`}
                    className="px-3 py-1 rounded border border-border hover:bg-secondary text-sm"
                  >
                    Previous
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`?page=${page + 1}${params.status ? `&status=${params.status}` : ''}${params.type ? `&type=${params.type}` : ''}`}
                    className="px-3 py-1 rounded border border-border hover:bg-secondary text-sm"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
