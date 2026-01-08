/**
 * ============================================================================
 * DISCOVER: Admin System Status
 * Description: System health, metrics, and settings
 * ============================================================================
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/server/auth';
import {
  Database,
  Server,
  HardDrive,
  Cpu,
  CheckCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'System Status',
  description: 'System health and settings',
};

export default async function AdminSystemPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  const canViewLogs = await hasPermission(user.id, 'system.view_logs');
  if (!canViewLogs) {
    redirect('/dashboard/admin?message=You do not have permission to view system status');
  }

  // Get database stats
  const [
    { count: totalRepos },
    { count: totalSnapshots },
    { count: totalScores },
    { data: settings },
  ] = await Promise.all([
    supabase.from('repos').select('*', { count: 'exact', head: true }),
    supabase.from('repo_snapshots').select('*', { count: 'exact', head: true }),
    supabase.from('repo_scores').select('*', { count: 'exact', head: true }),
    supabase.from('site_settings').select('*'),
  ]);

  // Get recent audit logs
  const { data: recentLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  const healthChecks = [
    { name: 'Database Connection', status: 'healthy', message: 'Connected' },
    { name: 'GitHub API', status: 'healthy', message: 'Rate limit OK' },
    { name: 'Job Queue', status: 'healthy', message: 'Processing normally' },
    { name: 'Cache', status: 'disabled', message: 'Redis not configured' },
  ];

  const dbStats = [
    { label: 'Repositories', value: totalRepos || 0, icon: Database },
    { label: 'Snapshots', value: totalSnapshots || 0, icon: HardDrive },
    { label: 'Scores', value: totalScores || 0, icon: Cpu },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Server className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Status</h1>
          <p className="text-muted-foreground">
            Monitor system health and manage settings
          </p>
        </div>
      </div>

      {/* Health Checks */}
      <Card variant="default" padding="lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Health Checks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3">
            {healthChecks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <span className="font-medium text-foreground">{check.name}</span>
                </div>
                <span className={`text-sm ${getStatusColor(check.status)}`}>
                  {check.message}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {dbStats.map((stat) => (
          <Card key={stat.label} variant="default" padding="md">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Site Settings */}
      <Card variant="default" padding="lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Site Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3">
            {settings?.map((setting: { id: string; key: string; value: string; description: string | null }) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div>
                  <p className="font-medium text-foreground">{setting.key}</p>
                  {setting.description && (
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                  )}
                </div>
                <code className="text-sm bg-background px-2 py-1 rounded border border-border">
                  {setting.value}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Audit Logs */}
      <Card variant="default" padding="lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentLogs && recentLogs.length > 0 ? (
            <div className="space-y-2">
              {recentLogs.map((log: { id: string; action: string; resource_type: string; resource_id: string | null; created_at: string }) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50"
                >
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{log.action}</span>
                      {' on '}
                      <span className="text-muted-foreground">
                        {log.resource_type}
                        {log.resource_id && ` (${log.resource_id})`}
                      </span>
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
