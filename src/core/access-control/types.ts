/**
 * ============================================================================
 * DISCOVER: Access Control Types
 * Description: Types for user management and permissions
 * ============================================================================
 */

// ============================================================================
// USER ROLE TYPES
// ============================================================================

export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PERMISSION
// ============================================================================

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: Date;
}

// ============================================================================
// ROLE PERMISSION
// ============================================================================

export interface RolePermission {
  id: string;
  role: UserRole;
  permissionId: string;
  createdAt: Date;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ============================================================================
// API KEY
// ============================================================================

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

// ============================================================================
// SITE SETTING
// ============================================================================

export interface SiteSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: Date;
}

// ============================================================================
// PERMISSION CATEGORIES
// ============================================================================

export const PERMISSION_CATEGORIES = {
  repositories: 'Repositories',
  rankings: 'Rankings',
  users: 'Users',
  system: 'System',
  admin: 'Admin',
} as const;

// ============================================================================
// ROLE HIERARCHY
// Order matters: higher index = more permissions
// ============================================================================

export const ROLE_HIERARCHY: UserRole[] = [
  'user',
  'moderator',
  'admin',
  'super_admin',
];

/**
 * Check if role A is higher or equal to role B
 */
export function isRoleHigherOrEqual(roleA: UserRole, roleB: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(roleA) >= ROLE_HIERARCHY.indexOf(roleB);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    user: 'User',
    moderator: 'Moderator',
    admin: 'Admin',
    super_admin: 'Super Admin',
  };
  return names[role];
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    user: 'bg-secondary text-secondary-foreground',
    moderator: 'bg-blue-500/10 text-blue-500',
    admin: 'bg-amber-500/10 text-amber-500',
    super_admin: 'bg-red-500/10 text-red-500',
  };
  return colors[role];
}
