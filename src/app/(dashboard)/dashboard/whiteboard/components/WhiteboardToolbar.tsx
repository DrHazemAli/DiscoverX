/**
 * ============================================================================
 * DISCOVER: Whiteboard Toolbar Component
 * Description: Drawing tools and color palette for whiteboard
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Pencil,
  Eraser,
  Trash2,
  Share2,
  Copy,
  Check,
  Minus,
  Plus,
} from 'lucide-react';
import type { StrokeTool } from '../types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/Tooltip';

interface WhiteboardToolbarProps {
  /** Current color */
  color: string;
  /** Color change handler */
  onColorChange: (color: string) => void;
  /** Current tool */
  tool: StrokeTool;
  /** Tool change handler */
  onToolChange: (tool: StrokeTool) => void;
  /** Current line width */
  lineWidth: number;
  /** Line width change handler */
  onLineWidthChange: (width: number) => void;
  /** Clear canvas handler */
  onClear: () => void;
  /** Share handler */
  onShare?: () => void;
  /** Whether the whiteboard is public */
  isPublic?: boolean;
  /** Public share URL */
  shareUrl?: string;
  /** Whether user can edit */
  canEdit?: boolean;
  className?: string;
}

const COLORS = [
  '#3ecf8e', // Supabase green
  '#f43f5e', // Red
  '#60a5fa', // Blue
  '#a78bfa', // Purple
  '#fbbf24', // Yellow
  '#ffffff', // White
  '#94a3b8', // Gray
  '#000000', // Black
];

const LINE_WIDTHS = [2, 5, 10, 15];

export function WhiteboardToolbar({
  color,
  onColorChange,
  tool,
  onToolChange,
  lineWidth,
  onLineWidthChange,
  onClear,
  onShare,
  isPublic,
  shareUrl,
  canEdit = true,
  className,
}: WhiteboardToolbarProps) {
  const [copied, setCopied] = React.useState(false);

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!canEdit) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="text-sm text-muted-foreground">View only</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-4 p-2 rounded-lg',
          'bg-background/80 backdrop-blur-sm border border-border',
          className
        )}
      >
        {/* Tools */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToolChange('pen')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  tool === 'pen'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Pen</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToolChange('eraser')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  tool === 'eraser'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                <Eraser className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Eraser</TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <Tooltip key={c}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onColorChange(c)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                    color === c ? 'border-white' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              </TooltipTrigger>
              <TooltipContent>{c}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Line Width */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  const currentIndex = LINE_WIDTHS.indexOf(lineWidth);
                  const prevIndex = Math.max(0, currentIndex - 1);
                  onLineWidthChange(LINE_WIDTHS[prevIndex]);
                }}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Minus className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Decrease size</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-1">
            {LINE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => onLineWidthChange(w)}
                className={cn(
                  'rounded-full transition-all',
                  lineWidth === w
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : ''
                )}
                style={{
                  width: w + 8,
                  height: w + 8,
                  backgroundColor: color,
                }}
              />
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  const currentIndex = LINE_WIDTHS.indexOf(lineWidth);
                  const nextIndex = Math.min(LINE_WIDTHS.length - 1, currentIndex + 1);
                  onLineWidthChange(LINE_WIDTHS[nextIndex]);
                }}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Increase size</TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onClear}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear canvas</TooltipContent>
          </Tooltip>

          {onShare && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onShare}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isPublic
                      ? 'bg-green-500/10 text-green-500'
                      : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isPublic ? 'Public - Click to manage' : 'Share'}
              </TooltipContent>
            </Tooltip>
          )}

          {shareUrl && isPublic && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={copyShareUrl}
                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? 'Copied!' : 'Copy share link'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default WhiteboardToolbar;
