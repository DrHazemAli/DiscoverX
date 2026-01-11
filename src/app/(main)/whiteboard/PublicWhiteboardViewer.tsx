/**
 * ============================================================================
 * DISCOVER: Public Whiteboard Viewer Client Component
 * Description: View-only or collaborative whiteboard for public users
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MessageCircle, PanelRightClose, PanelRight, Users } from 'lucide-react';
import Link from 'next/link';
import {
  WhiteboardCanvas,
  WhiteboardToolbar,
  WhiteboardChat,
  WhiteboardPresence,
} from '../dashboard/whiteboard/components';
import {
  useWhiteboardPresence,
  useWhiteboardDrawing,
  useWhiteboardChat,
  useWhiteboardCursors,
  generateGuestId,
  generateGuestName,
} from '../dashboard/whiteboard/hooks';
import type { Whiteboard, StrokeTool, DrawBroadcast } from '../dashboard/whiteboard/types';

interface PublicWhiteboardViewerProps {
  /** Whiteboard data */
  whiteboard: Whiteboard;
  /** Authenticated user info (if logged in) */
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
}

export function PublicWhiteboardViewer({
  whiteboard,
  user,
}: PublicWhiteboardViewerProps) {
  // Guest identity (generated once per session)
  const [guestInfo] = useState(() => ({
    id: user?.id || generateGuestId(),
    name: user?.fullName || generateGuestName(),
    avatarUrl: user?.avatarUrl || null,
  }));

  // Drawing state
  const [color, setColor] = useState('#3ecf8e');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<StrokeTool>('pen');

  // UI state
  const [showChat, setShowChat] = useState(true);

  // Canvas refs
  const clearCanvasRef = useRef<(() => void) | null>(null);
  const remoteDrawRef = useRef<((data: DrawBroadcast) => void) | null>(null);

  const canEdit = whiteboard.allow_public_edit;

  // Presence hook
  const { users: presenceUsers, isConnected: presenceConnected } = useWhiteboardPresence({
    whiteboardId: whiteboard.id,
    userId: guestInfo.id,
    username: guestInfo.name,
    avatarUrl: guestInfo.avatarUrl,
  });

  // Drawing broadcast hook
  const {
    broadcastDraw,
    broadcastDrawBatch,
    broadcastClear,
    isConnected: drawingConnected,
  } = useWhiteboardDrawing({
    whiteboardId: whiteboard.id,
    userId: guestInfo.id,
    enabled: canEdit,
    onRemoteDraw: (data) => {
      remoteDrawRef.current?.(data);
    },
    onRemoteClear: () => {
      clearCanvasRef.current?.();
    },
  });

  // Subscribe to drawings even if can't edit (to see others' drawings)
  const { isConnected: viewerConnected } = useWhiteboardDrawing({
    whiteboardId: whiteboard.id,
    userId: guestInfo.id,
    enabled: !canEdit,
    onRemoteDraw: (data) => {
      remoteDrawRef.current?.(data);
    },
    onRemoteClear: () => {
      clearCanvasRef.current?.();
    },
  });

  // Chat hook
  const {
    messages,
    sendMessage,
    isConnected: chatConnected,
  } = useWhiteboardChat({
    whiteboardId: whiteboard.id,
    userId: guestInfo.id,
    username: guestInfo.name,
    avatarUrl: guestInfo.avatarUrl,
    guestId: user ? null : guestInfo.id,
  });

  // Cursor hook
  const { cursors, broadcastCursor } = useWhiteboardCursors({
    whiteboardId: whiteboard.id,
    userId: guestInfo.id,
    enabled: canEdit,
  });

  // Handlers
  const handleClear = useCallback(() => {
    if (!canEdit) return;
    clearCanvasRef.current?.();
    broadcastClear();
  }, [canEdit, broadcastClear]);

  const handleCursorMove = useCallback(
    (x: number, y: number) => {
      if (canEdit) {
        broadcastCursor(x, y);
      }
    },
    [canEdit, broadcastCursor]
  );

  // Map cursors with user info
  const remoteCursors = cursors.map((c) => {
    const presenceUser = presenceUsers.find((u) => u.user_id === c.user_id);
    return {
      user_id: c.user_id,
      username: presenceUser?.username || c.username || 'Unknown',
      color: presenceUser?.color || c.color || '#ffffff',
      x: c.x,
      y: c.y,
    };
  });

  const isConnected = canEdit ? drawingConnected : viewerConnected;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-semibold text-foreground">{whiteboard.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {canEdit ? 'Public whiteboard - Anyone can draw' : 'View only'}
              </span>
              {!user && (
                <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">
                  Viewing as {guestInfo.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Presence */}
          <WhiteboardPresence
            users={presenceUsers}
            currentUserId={guestInfo.id}
            showCount={false}
          />

          {/* Login prompt */}
          {!user && (
            <Link
              href="/login"
              className="text-sm text-primary hover:underline"
            >
              Sign in
            </Link>
          )}

          {/* Chat toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showChat
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {showChat ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col relative">
          {/* Toolbar (only for editors) */}
          {canEdit && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <WhiteboardToolbar
                color={color}
                onColorChange={setColor}
                tool={tool}
                onToolChange={setTool}
                lineWidth={lineWidth}
                onLineWidthChange={setLineWidth}
                onClear={handleClear}
                canEdit={canEdit}
              />
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1">
            <WhiteboardCanvas
              canDraw={canEdit}
              color={color}
              lineWidth={lineWidth}
              tool={tool}
              backgroundColor={whiteboard.background_color}
              onDrawBatch={canEdit ? broadcastDrawBatch : undefined}
              onClear={canEdit ? handleClear : undefined}
              onCursorMove={handleCursorMove}
              remoteCursors={remoteCursors}
              clearRef={clearCanvasRef}
              remoteDrawRef={remoteDrawRef}
            />
          </div>

          {/* Connection status */}
          {!isConnected && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-500 text-sm">
              Connecting...
            </div>
          )}

          {/* View only indicator */}
          {!canEdit && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Watching live
            </div>
          )}
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-80 border-l border-border">
            <WhiteboardChat
              messages={messages}
              currentUserId={guestInfo.id}
              onSendMessage={sendMessage}
              isConnected={chatConnected}
              isOpen={showChat}
              onToggle={() => setShowChat(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicWhiteboardViewer;
