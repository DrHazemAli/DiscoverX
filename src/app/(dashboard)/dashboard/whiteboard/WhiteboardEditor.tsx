/**
 * ============================================================================
 * DISCOVER: Whiteboard Editor Client Component
 * Description: Main whiteboard editor with canvas, chat, and presence
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft, PanelRightClose, PanelRight } from 'lucide-react';
import Link from 'next/link';
import {
  WhiteboardCanvas,
  WhiteboardToolbar,
  WhiteboardChat,
  WhiteboardPresence,
  WhiteboardShareModal,
} from './components';
import {
  useWhiteboardPresence,
  useWhiteboardDrawing,
  useWhiteboardChat,
  useWhiteboardCursors,
} from './hooks';
import type { Whiteboard, StrokeTool, DrawBroadcast } from './types';

interface WhiteboardEditorProps {
  /** Whiteboard data */
  whiteboard: Whiteboard;
  /** Current user info */
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  /** Whether user can edit */
  canEdit?: boolean;
  /** Update whiteboard handler */
  onUpdate?: (updates: Partial<Whiteboard>) => Promise<void>;
}

export function WhiteboardEditor({
  whiteboard,
  user,
  canEdit = true,
  onUpdate,
}: WhiteboardEditorProps) {
  // Drawing state
  const [color, setColor] = useState('#3ecf8e');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<StrokeTool>('pen');

  // UI state
  const [showChat, setShowChat] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  // Canvas refs
  const clearCanvasRef = useRef<(() => void) | null>(null);
  const remoteDrawRef = useRef<((data: DrawBroadcast) => void) | null>(null);

  // Presence hook
  const { users: presenceUsers } = useWhiteboardPresence({
    whiteboardId: whiteboard.id,
    userId: user.id,
    username: user.fullName,
    avatarUrl: user.avatarUrl,
  });

  // Drawing broadcast hook
  const {
    broadcastDrawBatch,
    broadcastClear,
    isConnected: drawingConnected,
  } = useWhiteboardDrawing({
    whiteboardId: whiteboard.id,
    userId: user.id,
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
    userId: user.id,
    username: user.fullName,
    avatarUrl: user.avatarUrl,
  });

  // Cursor hook
  const { cursors, broadcastCursor } = useWhiteboardCursors({
    whiteboardId: whiteboard.id,
    userId: user.id,
  });

  // Handlers
  const handleClear = useCallback(() => {
    clearCanvasRef.current?.();
    broadcastClear();
  }, [broadcastClear]);

  const handleCursorMove = useCallback(
    (x: number, y: number) => {
      broadcastCursor(x, y);
    },
    [broadcastCursor]
  );

  const handleUpdate = async (updates: Partial<Whiteboard>) => {
    if (onUpdate) {
      await onUpdate(updates);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = whiteboard.public_slug
    ? `${baseUrl}/whiteboard/${whiteboard.public_slug}`
    : undefined;

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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/whiteboard"
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-semibold text-foreground">{whiteboard.name}</h1>
            {whiteboard.description && (
              <p className="text-sm text-muted-foreground">
                {whiteboard.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Presence */}
          <WhiteboardPresence
            users={presenceUsers}
            currentUserId={user.id}
            showCount={false}
          />

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
          {/* Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <WhiteboardToolbar
              color={color}
              onColorChange={setColor}
              tool={tool}
              onToolChange={setTool}
              lineWidth={lineWidth}
              onLineWidthChange={setLineWidth}
              onClear={handleClear}
              onShare={() => setShowShareModal(true)}
              isPublic={whiteboard.is_public}
              shareUrl={shareUrl}
              canEdit={canEdit}
            />
          </div>

          {/* Canvas */}
          <div className="flex-1">
            <WhiteboardCanvas
              canDraw={canEdit}
              color={color}
              lineWidth={lineWidth}
              tool={tool}
              backgroundColor={whiteboard.background_color}
              onDrawBatch={broadcastDrawBatch}
              onClear={handleClear}
              onCursorMove={handleCursorMove}
              remoteCursors={remoteCursors}
              clearRef={clearCanvasRef}
              remoteDrawRef={remoteDrawRef}
            />
          </div>

          {/* Connection status */}
          {!drawingConnected && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-500 text-sm">
              Connecting...
            </div>
          )}
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-80 border-l border-border">
            <WhiteboardChat
              messages={messages}
              currentUserId={user.id}
              onSendMessage={sendMessage}
              isConnected={chatConnected}
              isOpen={showChat}
              onToggle={() => setShowChat(false)}
            />
          </div>
        )}
      </div>

      {/* Share modal */}
      <WhiteboardShareModal
        whiteboard={whiteboard}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onUpdate={handleUpdate}
        baseUrl={baseUrl}
      />
    </div>
  );
}

export default WhiteboardEditor;
