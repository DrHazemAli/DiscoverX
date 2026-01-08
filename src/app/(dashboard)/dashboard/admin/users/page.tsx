/**
 * ============================================================================
 * DISCOVER: Admin Users Management
 * Description: View and manage user accounts
 * ============================================================================
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/server/auth';
import { Users, Shield, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { UserActions } from './user-actions';

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage user accounts',
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; role?: string; search?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  const canViewUsers = await hasPermission(user.id, 'users.view');
  if (!canViewUsers) {
    redirect('/dashboard/admin?message=You do not have permission to view users');
  }

  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from('user_profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (params.role) {
    query = query.eq('role', params.role);
  }

  if (params.search) {
    query = query.or(`email.ilike.%${params.search}%,full_name.ilike.%${params.search}%`);
  }

  const { data: users, count } = await query;
  const totalPages = Math.ceil((count || 0) / pageSize);

  const canChangeRole = await hasPermission(user.id, 'users.change_role');

  const getRoleBadgeVariant = (role: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (role) {
      case 'super_admin':
        return 'danger';
      case 'admin':
        return 'primary';
      case 'moderator':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">
              {count || 0} total users
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card variant="default" padding="md">
        <CardContent className="p-0">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  name="search"
                  defaultValue={params.search}
                  placeholder="Search by email or name..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <select
              name="role"
              defaultValue={params.role}
              className="px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Apply Filters
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card variant="default" padding="none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users?.map((u: { id: string; user_id: string; email: string; full_name: string | null; avatar_url: string | null; role: string; is_active: boolean; created_at: string }) => (
                  <tr key={u.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <Image
                            src={u.avatar_url}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {u.full_name || 'Unnamed'}
                          </p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleBadgeVariant(u.role)}>
                        {u.role === 'super_admin' && <Shield className="h-3 w-3 mr-1" />}
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          u.is_active
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserActions
                        userId={u.user_id}
                        currentRole={u.role}
                        isActive={u.is_active}
                        canChangeRole={canChangeRole}
                      />
                    </td>
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
                    href={`?page=${page - 1}${params.role ? `&role=${params.role}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                    className="px-3 py-1 rounded border border-border hover:bg-secondary text-sm"
                  >
                    Previous
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`?page=${page + 1}${params.role ? `&role=${params.role}` : ''}${params.search ? `&search=${params.search}` : ''}`}
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
