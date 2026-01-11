/**
 * ============================================================================
 * DISCOVER: Whiteboard Realtime Hooks
 * Description: Custom hooks for Supabase Realtime functionality
 * ============================================================================
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  PresenceUser,
  DrawBroadcast,
  ChatBroadcast,
  StrokePoint,
  StrokeTool,
} from './types';

// ============================================================================
// PRESENCE HOOK
// ============================================================================

interface UseWhiteboardPresenceOptions {
  whiteboardId: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  enabled?: boolean;
}

interface UseWhiteboardPresenceReturn {
  users: PresenceUser[];
  isConnected: boolean;
  updateCursor: (x: number, y: number) => void;
}

export function useWhiteboardPresence({
  whiteboardId,
  userId,
  username,
  avatarUrl,
  enabled = true,
}: UseWhiteboardPresenceOptions): UseWhiteboardPresenceReturn {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userColorRef = useRef<string>(getRandomColor());

  useEffect(() => {
    if (!enabled || !whiteboardId) return;

    const supabase = createClient();
    const channelName = `whiteboard-presence:${whiteboardId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const presenceList: PresenceUser[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          presenceList.push(...presences);
        });

        setUsers(presenceList);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            username,
            avatar_url: avatarUrl,
            color: userColorRef.current,
            online_at: Date.now(),
          });
          setIsConnected(true);
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [whiteboardId, userId, username, avatarUrl, enabled]);

  const updateCursor = useCallback((x: number, y: number) => {
    if (channelRef.current) {
      channelRef.current.track({
        user_id: userId,
        username,
        avatar_url: avatarUrl,
        color: userColorRef.current,
        cursor: { x, y },
        online_at: Date.now(),
      });
    }
  }, [userId, username, avatarUrl]);

  return { users, isConnected, updateCursor };
}

// ============================================================================
// DRAWING BROADCAST HOOK
// ============================================================================

interface UseWhiteboardDrawingOptions {
  whiteboardId: string;
  userId: string;
  enabled?: boolean;
  onRemoteDraw?: (data: DrawBroadcast) => void;
  onRemoteClear?: () => void;
}

interface UseWhiteboardDrawingReturn {
  broadcastDraw: (points: StrokePoint[], color: string, lineWidth: number, tool: StrokeTool) => void;
  broadcastDrawBatch: (points: StrokePoint[], color: string, lineWidth: number, tool: StrokeTool) => void;
  broadcastClear: () => void;
  isConnected: boolean;
}

export function useWhiteboardDrawing({
  whiteboardId,
  userId,
  enabled = true,
  onRemoteDraw,
  onRemoteClear,
}: UseWhiteboardDrawingOptions): UseWhiteboardDrawingReturn {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !whiteboardId) return;

    const supabase = createClient();
    const channelName = `whiteboard-draw:${whiteboardId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'draw' }, ({ payload }) => {
        if (payload.user_id !== userId && onRemoteDraw) {
          onRemoteDraw(payload as DrawBroadcast);
        }
      })
      .on('broadcast', { event: 'draw_batch' }, ({ payload }) => {
        if (payload.user_id !== userId && onRemoteDraw) {
          onRemoteDraw({ ...payload, type: 'draw_batch' } as DrawBroadcast);
        }
      })
      .on('broadcast', { event: 'clear' }, ({ payload }) => {
        if (payload.user_id !== userId && onRemoteClear) {
          onRemoteClear();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [whiteboardId, userId, enabled, onRemoteDraw, onRemoteClear]);

  const broadcastDraw = useCallback(
    (points: StrokePoint[], color: string, lineWidth: number, tool: StrokeTool) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'draw',
          payload: {
            type: 'draw',
            user_id: userId,
            points,
            color,
            line_width: lineWidth,
            tool,
          },
        });
      }
    },
    [userId]
  );

  const broadcastDrawBatch = useCallback(
    (points: StrokePoint[], color: string, lineWidth: number, tool: StrokeTool) => {
      if (channelRef.current && points.length > 0) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'draw_batch',
          payload: {
            type: 'draw_batch',
            user_id: userId,
            points,
            color,
            line_width: lineWidth,
            tool,
          },
        });
      }
    },
    [userId]
  );

  const broadcastClear = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'clear',
        payload: {
          type: 'clear',
          user_id: userId,
        },
      });
    }
  }, [userId]);

  return { broadcastDraw, broadcastDrawBatch, broadcastClear, isConnected };
}

// ============================================================================
// CHAT BROADCAST HOOK
// ============================================================================

interface UseWhiteboardChatOptions {
  whiteboardId: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  guestId?: string | null;
  enabled?: boolean;
}

interface UseWhiteboardChatReturn {
  messages: ChatBroadcast[];
  sendMessage: (text: string) => void;
  isConnected: boolean;
}

export function useWhiteboardChat({
  whiteboardId,
  userId,
  username,
  avatarUrl,
  guestId,
  enabled = true,
}: UseWhiteboardChatOptions): UseWhiteboardChatReturn {
  const [messages, setMessages] = useState<ChatBroadcast[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !whiteboardId) return;

    const supabase = createClient();
    const channelName = `whiteboard-chat:${whiteboardId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as ChatBroadcast]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [whiteboardId, enabled]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !channelRef.current) return;

      const message: ChatBroadcast = {
        id: crypto.randomUUID(),
        user_id: userId,
        guest_id: guestId || null,
        username,
        avatar_url: avatarUrl || null,
        message: text.trim(),
        created_at: Date.now(),
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: message,
      });

      // Add to local state immediately for sender
      setMessages((prev) => [...prev, message]);
    },
    [userId, username, avatarUrl, guestId]
  );

  return { messages, sendMessage, isConnected };
}

// ============================================================================
// CURSOR BROADCAST HOOK
// ============================================================================

interface UseWhiteboardCursorsOptions {
  whiteboardId: string;
  userId: string;
  enabled?: boolean;
}

interface RemoteCursor {
  user_id: string;
  username: string;
  color: string;
  x: number;
  y: number;
  lastUpdate: number;
}

interface UseWhiteboardCursorsReturn {
  cursors: RemoteCursor[];
  broadcastCursor: (x: number, y: number) => void;
  isConnected: boolean;
}

export function useWhiteboardCursors({
  whiteboardId,
  userId,
  enabled = true,
}: UseWhiteboardCursorsOptions): UseWhiteboardCursorsReturn {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !whiteboardId) return;

    const supabase = createClient();
    const channelName = `whiteboard-cursors:${whiteboardId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.user_id !== userId) {
          setCursors((prev) => {
            const existing = prev.findIndex((c) => c.user_id === payload.user_id);
            const cursor: RemoteCursor = {
              ...payload,
              lastUpdate: Date.now(),
            };

            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = cursor;
              return updated;
            }
            return [...prev, cursor];
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    // Clean up stale cursors every 3 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => prev.filter((c) => now - c.lastUpdate < 5000));
    }, 3000);

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      clearInterval(cleanupInterval);
    };
  }, [whiteboardId, userId, enabled]);

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      // Throttle cursor updates to 30fps
      if (throttleRef.current) return;

      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
      }, 33);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            user_id: userId,
            x,
            y,
          },
        });
      }
    },
    [userId]
  );

  return { cursors, broadcastCursor, isConnected };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const COLORS = [
  '#3ecf8e', // Green
  '#f43f5e', // Red
  '#60a5fa', // Blue
  '#a78bfa', // Purple
  '#fbbf24', // Yellow
  '#f97316', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function generateGuestId(): string {
  return `guest_${crypto.randomUUID().slice(0, 8)}`;
}

export function generateGuestName(): string {
  const adjectives = ['Happy', 'Clever', 'Brave', 'Bright', 'Kind', 'Swift', 'Calm', 'Bold'];
  const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Fox', 'Wolf', 'Bear', 'Hawk'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}
