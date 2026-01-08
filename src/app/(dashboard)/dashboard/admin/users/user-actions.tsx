/**
 * ============================================================================
 * DISCOVER: User Actions Component
 * Description: Client-side actions for user management
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Shield, Ban, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface UserActionsProps {
  userId: string;
  currentRole: string;
  isActive: boolean;
  canChangeRole: boolean;
}

const roles = ['user', 'moderator', 'admin', 'super_admin'] as const;

export function UserActions({
  userId,
  currentRole,
  isActive,
  canChangeRole,
}: UserActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
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

  const handleRoleChange = async (newRole: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId);
      router.refresh();
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleToggleActive = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('user_profiles')
        .update({ is_active: !isActive })
        .eq('user_id', userId);
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

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
            'absolute right-0 top-full mt-1 w-48 z-50',
            'bg-background border border-border rounded-lg shadow-lg',
            'py-1'
          )}
        >
          {canChangeRole && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                Change Role
              </div>
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  disabled={role === currentRole}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm',
                    'hover:bg-secondary transition-colors text-left',
                    role === currentRole && 'bg-secondary text-primary'
                  )}
                >
                  <Shield className="h-4 w-4" />
                  {role}
                  {role === currentRole && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      current
                    </span>
                  )}
                </button>
              ))}
              <div className="border-t border-border my-1" />
            </>
          )}
          
          <button
            onClick={handleToggleActive}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm',
              'hover:bg-secondary transition-colors text-left',
              isActive ? 'text-destructive' : 'text-green-600 dark:text-green-400'
            )}
          >
            {isActive ? (
              <>
                <Ban className="h-4 w-4" />
                Deactivate User
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Activate User
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
