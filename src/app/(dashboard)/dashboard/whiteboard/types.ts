/**
 * ============================================================================
 * DISCOVER: Whiteboard Types
 * Description: Type definitions for the whiteboard feature
 * ============================================================================
 */

export interface Whiteboard {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  public_slug: string | null;
  allow_public_edit: boolean;
  background_color: string;
  canvas_width: number;
  canvas_height: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface WhiteboardStroke {
  id: string;
  whiteboard_id: string;
  user_id: string | null;
  guest_id: string | null;
  stroke_data: StrokePoint[];
  color: string;
  line_width: number;
  tool: StrokeTool;
  stroke_order: number;
  created_at: string;
}

export interface StrokePoint {
  x: number;
  y: number;
  type: 'start' | 'move' | 'end';
}

export type StrokeTool = 'pen' | 'eraser' | 'highlighter';

export interface WhiteboardChatMessage {
  id: string;
  whiteboard_id: string;
  user_id: string | null;
  guest_id: string | null;
  username: string;
  avatar_url: string | null;
  message: string;
  is_system_message: boolean;
  created_at: string;
}

export interface WhiteboardCollaborator {
  id: string;
  whiteboard_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export type CollaboratorRole = 'viewer' | 'editor' | 'admin';

// Realtime types
export interface PresenceUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  color: string;
  cursor?: { x: number; y: number };
  online_at: number;
}

export interface DrawBroadcast {
  type: 'draw' | 'draw_batch' | 'clear' | 'undo';
  user_id: string;
  points?: StrokePoint[];
  color?: string;
  line_width?: number;
  tool?: StrokeTool;
}

export interface CursorBroadcast {
  user_id: string;
  x: number;
  y: number;
}

export interface ChatBroadcast {
  id: string;
  user_id: string;
  guest_id: string | null;
  username: string;
  avatar_url: string | null;
  message: string;
  created_at: number;
}

// Canvas state
export interface CanvasState {
  isDrawing: boolean;
  currentColor: string;
  lineWidth: number;
  tool: StrokeTool;
}

// Form types
export interface CreateWhiteboardInput {
  name: string;
  description?: string;
  is_public?: boolean;
  allow_public_edit?: boolean;
  background_color?: string;
}

export interface UpdateWhiteboardInput {
  name?: string;
  description?: string;
  is_public?: boolean;
  allow_public_edit?: boolean;
  background_color?: string;
  is_archived?: boolean;
}
