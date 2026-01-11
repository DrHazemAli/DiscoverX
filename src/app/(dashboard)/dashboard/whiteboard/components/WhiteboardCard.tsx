/**
 * ============================================================================
 * DISCOVER: Whiteboard Card Component
 * Description: Card component with actions for whiteboard list
 * ============================================================================
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Globe,
  Lock,
  MoreVertical,
  Trash2,
  Copy,
  Archive,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  deleteWhiteboard,
  archiveWhiteboard,
  duplicateWhiteboard,
} from '../actions';
import type { Whiteboard } from '../types';

interface WhiteboardCardProps {
  whiteboard: Whiteboard;
  isOwner?: boolean;
  collaboratorRole?: string;
}

export function WhiteboardCard({
  whiteboard,
  isOwner = false,
  collaboratorRole,
}: WhiteboardCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this whiteboard?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWhiteboard(whiteboard.id);
    } catch (error) {
      console.error('Failed to delete whiteboard:', error);
      setIsDeleting(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await archiveWhiteboard(whiteboard.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to archive whiteboard:', error);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const duplicate = await duplicateWhiteboard(whiteboard.id);
      router.push(`/dashboard/whiteboard/${duplicate.id}`);
    } catch (error) {
      console.error('Failed to duplicate whiteboard:', error);
    }
  };

  const publicUrl = whiteboard.public_slug
    ? `/whiteboard/${whiteboard.public_slug}`
    : null;

  return (
    <div className="relative group">
      <Link href={`/dashboard/whiteboard/${whiteboard.id}`}>
        <Card
          variant="default"
          padding="none"
          className={cn(
            'hover:border-primary/50 transition-colors cursor-pointer overflow-hidden',
            isDeleting && 'opacity-50 pointer-events-none'
          )}
        >
          {/* Preview area */}
          <div
            className="h-32 w-full relative"
            style={{ backgroundColor: whiteboard.background_color || '#171717' }}
          >
            {/* Preview placeholder - could add canvas thumbnail here */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Pencil className="h-8 w-8 text-white/20" />
            </div>
          </div>

          {/* Info */}
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground truncate">
                  {whiteboard.name}
                </h3>
                {whiteboard.description && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {whiteboard.description}
                  </p>
                )}
              </div>

              {/* Status icons */}
              <div className="flex items-center gap-1 shrink-0">
                {whiteboard.is_public ? (
                  <Globe className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              {collaboratorRole && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                  {collaboratorRole}
                </span>
              )}
              <span>Updated {formatRelativeTime(whiteboard.updated_at)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Actions dropdown */}
      {isOwner && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.preventDefault()}
                className={cn(
                  'p-1.5 rounded-lg',
                  'bg-background/80 backdrop-blur-sm',
                  'border border-border',
                  'hover:bg-secondary',
                  'text-muted-foreground hover:text-foreground'
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>

              {publicUrl && (
                <DropdownMenuItem asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open public link
                  </a>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default WhiteboardCard;
