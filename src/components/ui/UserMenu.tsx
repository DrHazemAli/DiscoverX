/**
 * ============================================================================
 * DISCOVER: User Menu Component
 * Description: Authentication status and user dropdown for header
 * ============================================================================
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  LogIn,
  LogOut,
  Settings,
  LayoutDashboard,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact = false }: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = React.useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = React.useState<{
    fullName?: string;
    avatarUrl?: string;
    role?: string;
  } | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Fetch user profile
  const fetchProfile = React.useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url, role')
      .eq('user_id', userId)
      .single();

    if (data) {
      setUserProfile({
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        role: data.role,
      });
    }
  }, []);

  // Fetch user on mount
  React.useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push('/');
    router.refresh();
  };

  const isAdmin =
    userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-xl bg-secondary/50 animate-pulse',
          compact ? 'h-8 w-8' : 'h-10 w-10'
        )}
      />
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className={cn(
            'flex items-center gap-2 rounded-xl font-medium transition-all',
            'text-muted-foreground hover:text-foreground hover:bg-secondary',
            compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'
          )}
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
        <Link
          href="/signup"
          className={cn(
            'hidden sm:flex items-center gap-2 rounded-xl font-medium transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'
          )}
        >
          Get Started
        </Link>
      </div>
    );
  }

  // Logged in
  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-xl transition-all',
          'hover:bg-secondary border border-transparent hover:border-border',
          compact ? 'p-1' : 'p-1.5'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {userProfile?.avatarUrl || user.user_metadata?.avatar_url ? (
          <Image
            src={userProfile?.avatarUrl || user.user_metadata?.avatar_url}
            alt=""
            width={compact ? 28 : 32}
            height={compact ? 28 : 32}
            className="rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              'rounded-full bg-primary/10 flex items-center justify-center',
              compact ? 'h-7 w-7' : 'h-8 w-8'
            )}
          >
            <User className="h-4 w-4 text-primary" />
          </div>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform hidden sm:block',
            isOpen && 'rotate-180'
          )}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute right-0 top-full mt-2 w-64 z-50',
              'bg-background border border-border rounded-xl shadow-lg',
              'overflow-hidden'
            )}
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <p className="font-medium text-foreground truncate">
                {userProfile?.fullName ||
                  user.user_metadata?.full_name ||
                  'User'}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  <Shield className="h-3 w-3" />
                  {userProfile?.role}
                </span>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              {isAdmin && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              )}
            </div>

            {/* Sign Out */}
            <div className="border-t border-border py-2">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserMenu;
