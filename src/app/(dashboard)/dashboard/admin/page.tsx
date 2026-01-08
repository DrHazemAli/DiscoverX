/**
 * ============================================================================
 * DISCOVER: Admin Dashboard Home
 * Description: Admin overview with stats and quick actions
 * ============================================================================
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/server/auth';
import {
  Users,
  Activity,
  Database,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin overview and management',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check admin permission
  const canAccess = await hasPermission(user.id, 'admin.access');
  if (!canAccess) {
    redirect('/dashboard?message=You do not have permission to access the admin area');
  }

  // Get stats
  const [
    { count: usersCount },
    { count: reposCount },
    { data: pendingJobs },
    { data: failedJobs },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('repos').select('*', { count: 'exact', head: true }),
    supabase
      .from('job_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued'),
    supabase
      .from('job_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
  ]);

  const stats = [
    {
      label: 'Total Users',
      value: usersCount || 0,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      href: '/dashboard/admin/users',
    },
    {
      label: 'Repositories',
      value: reposCount || 0,
      icon: Database,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      href: '/dashboard/admin/system',
    },
    {
      label: 'Pending Jobs',
      value: pendingJobs?.length || 0,
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      href: '/dashboard/admin/jobs',
    },
    {
      label: 'Failed Jobs',
      value: failedJobs?.length || 0,
      icon: AlertCircle,
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      href: '/dashboard/admin/jobs?status=failed',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      href: '/dashboard/admin/users',
      icon: Users,
    },
    {
      title: 'Job Queue',
      description: 'Monitor and manage background jobs',
      href: '/dashboard/admin/jobs',
      icon: Activity,
    },
    {
      title: 'System Status',
      description: 'View system health and metrics',
      href: '/dashboard/admin/system',
      icon: Database,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and management
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card
              variant="default"
              padding="md"
              className="hover:border-primary/50 transition-colors cursor-pointer"
            >
              <CardContent className="p-0">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
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
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card
                variant="default"
                padding="md"
                className="h-full hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                      <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card variant="default" padding="lg">
        <CardHeader className="pb-4">
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-foreground">All systems operational</p>
                <p className="text-sm text-muted-foreground">
                  Last checked: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
