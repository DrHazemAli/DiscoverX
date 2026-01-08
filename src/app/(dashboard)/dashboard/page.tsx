/**
 * ============================================================================
 * DISCOVER: User Dashboard Home
 * Description: Main dashboard page with overview and quick actions
 * ============================================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Search,
  GitCompare,
  Bookmark,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Discover dashboard',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's saved repos count
  const { count: savedCount } = await supabase
    .from('saved_repos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id);

  // Get user's recent activity
  const { data: recentActivity } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const quickActions = [
    {
      href: '/dashboard/analyze',
      icon: Search,
      title: 'Analyze Repository',
      description: 'Get health scores and insights for any GitHub repo',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      href: '/dashboard/compare',
      icon: GitCompare,
      title: 'Compare Repos',
      description: 'Compare multiple repositories side by side',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      href: '/dashboard/saved',
      icon: Bookmark,
      title: 'Saved Repos',
      description: 'View and manage your saved repositories',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      href: '/rankings',
      icon: TrendingUp,
      title: 'Rankings',
      description: 'Explore top repositories by health score',
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
  ];

  const stats = [
    { label: 'Saved Repos', value: savedCount || 0, icon: Bookmark },
    { label: 'Comparisons', value: 0, icon: GitCompare },
    { label: 'Analyses', value: 0, icon: Search },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover and analyze GitHub repositories with powerful insights.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} variant="default" padding="md">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card
                variant="default"
                padding="md"
                className="h-full hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <Card variant="default" padding="md">
          <CardContent className="p-0">
            {recentActivity && recentActivity.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentActivity.map((activity: { id: string; action: string; repo_name?: string; created_at: string }) => (
                  <li key={activity.id} className="py-3 flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {activity.action}
                        {activity.repo_name && (
                          <span className="text-primary ml-1">{activity.repo_name}</span>
                        )}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start by analyzing a repository
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
