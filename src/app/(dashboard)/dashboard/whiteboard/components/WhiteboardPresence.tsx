/**
 * ============================================================================
 * DISCOVER: Whiteboard Presence Component
 * Description: Shows online users in the whiteboard
 * ============================================================================
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/Tooltip';
import type { PresenceUser } from '../types';

interface WhiteboardPresenceProps {
  /** List of online users */
  users: PresenceUser[];
  /** Current user ID */
  currentUserId: string;
  /** Maximum avatars to show before collapsing */
  maxVisible?: number;
  /** Whether to show user count */
  showCount?: boolean;
  className?: string;
}

export function WhiteboardPresence({
  users,
  currentUserId,
  maxVisible = 5,
  showCount = true,
  className,
}: WhiteboardPresenceProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - maxVisible);

  if (users.length === 0) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No one else online</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {showCount && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{users.length} online</span>
          </div>
        )}

        <div className="flex -space-x-2">
          {visibleUsers.map((user) => {
            const isCurrentUser = user.user_id === currentUserId;

            return (
              <Tooltip key={user.user_id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'relative w-8 h-8 rounded-full',
                      'flex items-center justify-center',
                      'text-xs font-medium text-white',
                      'border-2 border-background',
                      'cursor-default overflow-hidden'
                    )}
                    style={{ backgroundColor: user.color }}
                  >
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.username}
                        width={32}
                        height={32}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{user.username.charAt(0).toUpperCase()}</span>
                    )}

                    {/* Online indicator */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isCurrentUser ? 'You' : user.username}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Hidden users count */}
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'w-8 h-8 rounded-full',
                    'flex items-center justify-center',
                    'text-xs font-medium',
                    'bg-secondary text-muted-foreground',
                    'border-2 border-background'
                  )}
                >
                  +{hiddenCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {users.slice(maxVisible).map((user) => (
                    <div key={user.user_id} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: user.color }}
                      />
                      <span>
                        {user.user_id === currentUserId ? 'You' : user.username}
                      </span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact presence indicator for toolbar
 */
interface PresenceDotsProps {
  users: PresenceUser[];
  currentUserId: string;
  className?: string;
}

export function PresenceDots({
  users,
  currentUserId,
  className,
}: PresenceDotsProps) {
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {users.map((user) => (
          <Tooltip key={user.user_id}>
            <TooltipTrigger asChild>
              <div
                className="w-3 h-3 rounded-full border border-background"
                style={{ backgroundColor: user.color }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {user.user_id === currentUserId ? 'You' : user.username}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export default WhiteboardPresence;
