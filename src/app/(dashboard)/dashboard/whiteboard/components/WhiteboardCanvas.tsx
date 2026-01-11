/**
 * ============================================================================
 * DISCOVER: Whiteboard Canvas Component
 * Description: Interactive drawing canvas with realtime collaboration
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { StrokePoint, StrokeTool, DrawBroadcast } from '../types';

interface WhiteboardCanvasProps {
  /** Whether the user can draw */
  canDraw?: boolean;
  /** Current drawing color */
  color: string;
  /** Current line width */
  lineWidth: number;
  /** Current drawing tool */
  tool: StrokeTool;
  /** Background color */
  backgroundColor?: string;
  /** Callback when drawing occurs locally */
  onDraw?: (points: StrokePoint[], color: string, lineWidth: number, tool: StrokeTool) => void;
  /** Callback for batched drawing points */
  onDrawBatch?: (points: StrokePoint[], color: string, lineWidth: number, tool: StrokeTool) => void;
  /** Callback when canvas is cleared */
  onClear?: () => void;
  /** Callback for cursor movement */
  onCursorMove?: (x: number, y: number) => void;
  /** Remote cursors to display */
  remoteCursors?: Array<{
    user_id: string;
    username: string;
    color: string;
    x: number;
    y: number;
  }>;
  /** Reference to external clear function */
  clearRef?: React.MutableRefObject<(() => void) | null>;
  /** Reference to handle remote drawing */
  remoteDrawRef?: React.MutableRefObject<((data: DrawBroadcast) => void) | null>;
  className?: string;
}

export function WhiteboardCanvas({
  canDraw = true,
  color,
  lineWidth,
  tool,
  backgroundColor = '#171717',
  onDraw,
  onDrawBatch,
  onClear,
  onCursorMove,
  remoteCursors = [],
  clearRef,
  remoteDrawRef,
  className,
}: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsBufferRef = useRef<StrokePoint[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialSetupRef = useRef(true);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();

      // Set canvas dimensions with pixel density scaling
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Get and configure context
      const context = canvas.getContext('2d');
      if (!context) return;

      context.scale(dpr, dpr);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = lineWidth;
      context.strokeStyle = color;
      contextRef.current = context;

      // Only fill background on initial setup
      if (isInitialSetupRef.current) {
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        isInitialSetupRef.current = false;
      }
    };

    setupCanvas();

    const resizeObserver = new ResizeObserver(() => {
      setupCanvas();
    });

    const container = canvas.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', setupCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', setupCanvas);
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
      }
    };
    // Note: color and lineWidth are intentionally excluded - they're handled in a separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundColor]);

  // Update stroke style when color/lineWidth changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth]);

  // Clear canvas function
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    onClear?.();
  }, [backgroundColor, onClear]);

  // Expose clear function via ref
  useEffect(() => {
    if (clearRef) {
      clearRef.current = clearCanvas;
    }
  }, [clearRef, clearCanvas]);

  // Handle remote drawing
  const handleRemoteDraw = useCallback((data: DrawBroadcast) => {
    const context = contextRef.current;
    if (!context || !data.points || data.points.length === 0) return;

    const currentStrokeStyle = context.strokeStyle;
    const currentLineWidth = context.lineWidth;

    context.strokeStyle = data.color || '#ffffff';
    context.lineWidth = data.line_width || 5;

    if (data.tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
    }

    let isNewPath = true;

    for (const point of data.points) {
      if (point.type === 'start' || isNewPath) {
        context.beginPath();
        context.moveTo(point.x, point.y);
        isNewPath = false;
      } else if (point.type === 'move') {
        context.lineTo(point.x, point.y);
        context.stroke();
      }
    }

    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = currentStrokeStyle;
    context.lineWidth = currentLineWidth;
  }, []);

  // Expose remote draw handler via ref
  useEffect(() => {
    if (remoteDrawRef) {
      remoteDrawRef.current = handleRemoteDraw;
    }
  }, [remoteDrawRef, handleRemoteDraw]);

  // Send batched points
  const sendBatchedPoints = useCallback(() => {
    if (pointsBufferRef.current.length === 0) return;

    onDrawBatch?.(
      [...pointsBufferRef.current],
      color,
      lineWidth,
      tool
    );

    pointsBufferRef.current = [];
  }, [onDrawBatch, color, lineWidth, tool]);

  // Get coordinates from mouse/touch event
  const getCoordinates = useCallback(
    (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in event) {
        if (event.touches.length === 0) return null;
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  // Start drawing
  const startDrawing = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!canDraw) return;

      const coords = getCoordinates(event);
      if (!coords) return;

      const context = contextRef.current;
      if (!context) return;

      if (tool === 'eraser') {
        context.globalCompositeOperation = 'destination-out';
      } else {
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = color;
      }

      context.beginPath();
      context.moveTo(coords.x, coords.y);
      setIsDrawing(true);

      // Add start point to buffer
      pointsBufferRef.current = [{ type: 'start', x: coords.x, y: coords.y }];

      // Start batch timer
      if (!batchTimerRef.current) {
        batchTimerRef.current = setInterval(sendBatchedPoints, 16); // ~60fps
      }

      // Broadcast start point
      onDraw?.(
        [{ type: 'start', x: coords.x, y: coords.y }],
        color,
        lineWidth,
        tool
      );
    },
    [canDraw, getCoordinates, tool, color, lineWidth, onDraw, sendBatchedPoints]
  );

  // Continue drawing
  const draw = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      const coords = getCoordinates(event);
      if (!coords) return;

      // Always update cursor position
      onCursorMove?.(coords.x, coords.y);

      if (!isDrawing || !canDraw) return;

      const context = contextRef.current;
      if (!context) return;

      context.lineTo(coords.x, coords.y);
      context.stroke();

      // Add point to buffer
      pointsBufferRef.current.push({ type: 'move', x: coords.x, y: coords.y });
    },
    [isDrawing, canDraw, getCoordinates, onCursorMove]
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    const context = contextRef.current;
    if (context) {
      context.closePath();
      context.globalCompositeOperation = 'source-over';
    }

    setIsDrawing(false);

    // Send remaining points
    sendBatchedPoints();

    // Clear batch timer
    if (batchTimerRef.current) {
      clearInterval(batchTimerRef.current);
      batchTimerRef.current = null;
    }
  }, [isDrawing, sendBatchedPoints]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className={cn(
          'w-full h-full touch-none',
          canDraw ? 'cursor-crosshair' : 'cursor-default'
        )}
        style={{ backgroundColor }}
      />

      {/* Remote cursors */}
      {remoteCursors.map((cursor) => (
        <div
          key={cursor.user_id}
          className="absolute pointer-events-none transition-all duration-75"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor dot */}
          <div
            className="w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: cursor.color }}
          />
          {/* Username label */}
          <div
            className="absolute left-4 top-0 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.username}
          </div>
        </div>
      ))}
    </div>
  );
}

export default WhiteboardCanvas;
