/**
 * ============================================================================
 * DISCOVER: Whiteboard Share Modal Component
 * Description: Modal for sharing whiteboard settings
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, Copy, Check, Globe, Lock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Whiteboard } from '../types';

interface WhiteboardShareModalProps {
  /** Whiteboard data */
  whiteboard: Whiteboard;
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal handler */
  onClose: () => void;
  /** Update whiteboard handler */
  onUpdate: (updates: Partial<Whiteboard>) => Promise<void>;
  /** Base URL for sharing */
  baseUrl: string;
}

export function WhiteboardShareModal({
  whiteboard,
  isOpen,
  onClose,
  onUpdate,
  baseUrl,
}: WhiteboardShareModalProps) {
  const [isPublic, setIsPublic] = React.useState(whiteboard.is_public);
  const [allowPublicEdit, setAllowPublicEdit] = React.useState(whiteboard.allow_public_edit);
  const [copied, setCopied] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const shareUrl = whiteboard.public_slug
    ? `${baseUrl}/whiteboard/${whiteboard.public_slug}`
    : null;

  const handleTogglePublic = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({ is_public: !isPublic });
      setIsPublic(!isPublic);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTogglePublicEdit = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({ allow_public_edit: !allowPublicEdit });
      setAllowPublicEdit(!allowPublicEdit);
    } finally {
      setIsUpdating(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background rounded-xl border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Share Whiteboard
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Public toggle */}
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'p-2 rounded-lg',
                isPublic ? 'bg-green-500/10 text-green-500' : 'bg-secondary text-muted-foreground'
              )}
            >
              {isPublic ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">
                  {isPublic ? 'Public' : 'Private'}
                </h3>
                <button
                  onClick={handleTogglePublic}
                  disabled={isUpdating}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    isPublic ? 'bg-green-500' : 'bg-secondary',
                    isUpdating && 'opacity-50'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      isPublic ? 'left-6' : 'left-1'
                    )}
                  />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isPublic
                  ? 'Anyone with the link can view this whiteboard'
                  : 'Only you and collaborators can access'}
              </p>
            </div>
          </div>

          {/* Public edit toggle (only shown when public) */}
          {isPublic && (
            <div className="flex items-start gap-4 pl-12">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">
                    Allow public editing
                  </h3>
                  <button
                    onClick={handleTogglePublicEdit}
                    disabled={isUpdating}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      allowPublicEdit ? 'bg-green-500' : 'bg-secondary',
                      isUpdating && 'opacity-50'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        allowPublicEdit ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {allowPublicEdit
                    ? 'Anyone can draw on this whiteboard'
                    : 'Viewers can only watch, not draw'}
                </p>
              </div>
            </div>
          )}

          {/* Share link (only shown when public) */}
          {isPublic && shareUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Share link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm',
                    'bg-secondary text-foreground',
                    'border border-border',
                    'focus:outline-none'
                  )}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyShareUrl}
                  leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          )}

          {/* Open in new tab */}
          {isPublic && shareUrl && (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-2 text-sm',
                'text-primary hover:underline'
              )}
            >
              <ExternalLink className="h-4 w-4" />
              Open public view in new tab
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WhiteboardShareModal;
