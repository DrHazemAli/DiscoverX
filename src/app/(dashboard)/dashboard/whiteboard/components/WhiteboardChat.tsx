/**
 * ============================================================================
 * DISCOVER: Whiteboard Chat Component
 * Description: Realtime chat panel for whiteboard collaboration
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Send, MessageCircle, X } from 'lucide-react';
import type { ChatBroadcast } from '../types';

interface WhiteboardChatProps {
  /** Chat messages */
  messages: ChatBroadcast[];
  /** Current user ID */
  currentUserId: string;
  /** Send message handler */
  onSendMessage: (message: string) => void;
  /** Whether chat is connected */
  isConnected?: boolean;
  /** Whether chat panel is open */
  isOpen?: boolean;
  /** Toggle chat panel */
  onToggle?: () => void;
  className?: string;
}

export function WhiteboardChat({
  messages,
  currentUserId,
  onSendMessage,
  isConnected = true,
  isOpen = true,
  onToggle,
  className,
}: WhiteboardChatProps) {
  const [newMessage, setNewMessage] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    onSendMessage(newMessage);
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Collapsed chat button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          'fixed bottom-4 right-4 p-3 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'hover:bg-primary/90 transition-colors',
          'flex items-center gap-2',
          className
        )}
      >
        <MessageCircle className="h-5 w-5" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {messages.length > 99 ? '99+' : messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        'bg-background border-l border-border',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Chat</h3>
          {!isConnected && (
            <span className="text-xs text-yellow-500">Connecting...</span>
          )}
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showHeader = !prevMsg || prevMsg.user_id !== msg.user_id;
            const isCurrentUser = msg.user_id === currentUserId;

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  isCurrentUser ? 'items-end' : 'items-start'
                )}
              >
                {showHeader && (
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span
                      className={cn(
                        'font-medium',
                        isCurrentUser
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {isCurrentUser ? 'You' : msg.username}
                    </span>
                    <span className="text-muted-foreground">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] px-3 py-2 rounded-xl text-sm',
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  )}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={!isConnected}
          className={cn(
            'flex-1 px-4 py-2 rounded-full text-sm',
            'bg-secondary text-foreground',
            'border border-border',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'placeholder:text-muted-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <button
          type="submit"
          disabled={!isConnected || !newMessage.trim()}
          className={cn(
            'p-2 rounded-full',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default WhiteboardChat;
