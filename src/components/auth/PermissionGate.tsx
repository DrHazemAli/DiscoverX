/**
 * ============================================================================
 * DISCOVER: Permission Gate Component
 * Description: Server component for permission-based rendering
 * ============================================================================
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasPermission, hasRole } from '@/server/auth';
import type { Permission, UserRole } from '@/server/security/types';

interface PermissionGateProps {
  children: React.ReactNode;
  /** Required permission */
  permission?: Permission;
  /** Required roles (any of) */
  roles?: UserRole[];
  /** Where to redirect if not authorized */
  redirectTo?: string;
  /** Custom fallback component */
  fallback?: React.ReactNode;
}

/**
 * Server component that gates content based on permissions or roles
 * 
 * @example
 * ```tsx
 * <PermissionGate permission="admin.access">
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * <PermissionGate roles={['admin', 'super_admin']} fallback={<AccessDenied />}>
 *   <SecretContent />
 * </PermissionGate>
 * ```
 */
export async function PermissionGate({
  children,
  permission,
  roles,
  redirectTo,
  fallback,
}: PermissionGateProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not authenticated
  if (!user) {
    if (redirectTo) {
      redirect(redirectTo);
    }
    return fallback ?? null;
  }

  // Check permission
  if (permission) {
    const allowed = await hasPermission(user.id, permission);
    if (!allowed) {
      if (redirectTo) {
        redirect(redirectTo);
      }
      return fallback ?? null;
    }
  }

  // Check roles
  if (roles && roles.length > 0) {
    const allowed = await hasRole(user.id, ...roles);
    if (!allowed) {
      if (redirectTo) {
        redirect(redirectTo);
      }
      return fallback ?? null;
    }
  }

  return <>{children}</>;
}

/**
 * Simple admin gate - shorthand for admin/super_admin role check
 */
export async function AdminGate({
  children,
  redirectTo = '/dashboard',
  fallback,
}: Omit<PermissionGateProps, 'permission' | 'roles'>) {
  return (
    <PermissionGate
      roles={['admin', 'super_admin']}
      redirectTo={redirectTo}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Moderator gate - moderators and above
 */
export async function ModeratorGate({
  children,
  redirectTo = '/dashboard',
  fallback,
}: Omit<PermissionGateProps, 'permission' | 'roles'>) {
  return (
    <PermissionGate
      roles={['moderator', 'admin', 'super_admin']}
      redirectTo={redirectTo}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}
