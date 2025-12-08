import { useCallback, useRef, useState } from 'react';
import { Sector, Seat, VenueElement, Vertex } from '@/types/mapStudio';

interface CanvasState {
  isPanning: boolean;
  isDrawing: boolean;
  isDragging: boolean;
  isDraggingElement: boolean;
  isBoxSelecting: boolean;
  isDraggingVertex: boolean;
  activeVertexIndex: number | null;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function useCanvasInteraction(zoom: number, pan: { x: number; y: number }) {
  const [state, setState] = useState<CanvasState>({
    isPanning: false,
    isDrawing: false,
    isDragging: false,
    isDraggingElement: false,
    isBoxSelecting: false,
    isDraggingVertex: false,
    activeVertexIndex: null,
  });

  const [dragState, setDragState] = useState<DragState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Converte coordenadas do mouse para coordenadas do canvas
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const startPan = useCallback((x: number, y: number) => {
    setState(prev => ({ ...prev, isPanning: true }));
    setDragState(prev => ({ ...prev, startX: x, startY: y }));
  }, []);

  const endPan = useCallback(() => {
    setState(prev => ({ ...prev, isPanning: false }));
  }, []);

  const startDraw = useCallback((x: number, y: number) => {
    setState(prev => ({ ...prev, isDrawing: true }));
    setDragState({ startX: x, startY: y, currentX: x, currentY: y });
  }, []);

  const updateDraw = useCallback((x: number, y: number) => {
    setDragState(prev => ({ ...prev, currentX: x, currentY: y }));
  }, []);

  const endDraw = useCallback(() => {
    setState(prev => ({ ...prev, isDrawing: false }));
  }, []);

  const startBoxSelect = useCallback((x: number, y: number) => {
    setState(prev => ({ ...prev, isBoxSelecting: true }));
    setDragState({ startX: x, startY: y, currentX: x, currentY: y });
  }, []);

  const updateBoxSelect = useCallback((x: number, y: number) => {
    setDragState(prev => ({ ...prev, currentX: x, currentY: y }));
  }, []);

  const endBoxSelect = useCallback(() => {
    setState(prev => ({ ...prev, isBoxSelecting: false }));
  }, []);

  const startDrag = useCallback((x: number, y: number) => {
    setState(prev => ({ ...prev, isDragging: true }));
    setDragState(prev => ({ ...prev, startX: x, startY: y }));
  }, []);

  const endDrag = useCallback(() => {
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const startVertexDrag = useCallback((index: number) => {
    setState(prev => ({ ...prev, isDraggingVertex: true, activeVertexIndex: index }));
  }, []);

  const endVertexDrag = useCallback(() => {
    setState(prev => ({ ...prev, isDraggingVertex: false, activeVertexIndex: null }));
  }, []);

  return {
    canvasRef,
    state,
    dragState,
    screenToCanvas,
    startPan,
    endPan,
    startDraw,
    updateDraw,
    endDraw,
    startBoxSelect,
    updateBoxSelect,
    endBoxSelect,
    startDrag,
    endDrag,
    startVertexDrag,
    endVertexDrag,
  };
}

// Hook para debounce de valores
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateValue = useCallback((newValue: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(newValue);
    }, delay);
  }, [delay]);

  // Atualiza imediatamente se o valor mudou
  if (value !== debouncedValue && !timeoutRef.current) {
    updateValue(value);
  }

  return debouncedValue;
}

// Verifica se ponto está dentro de bounds
export function isPointInBounds(point: { x: number; y: number }, bounds: { x: number; y: number; width: number; height: number }): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

// Encontra assento em uma posição
export function findSeatAtPosition(
  pos: { x: number; y: number },
  sectors: Sector[],
  seatSize: number = 12
): Seat | null {
  for (const sector of sectors) {
    if (!sector.visible) continue;
    for (const seat of sector.seats) {
      const dx = pos.x - seat.x;
      const dy = pos.y - seat.y;
      if (dx >= 0 && dx <= seatSize && dy >= 0 && dy <= seatSize) {
        return seat;
      }
    }
  }
  return null;
}

// Encontra elemento em uma posição
export function findElementAtPosition(
  pos: { x: number; y: number },
  elements: VenueElement[]
): VenueElement | null {
  for (const el of elements) {
    if (isPointInBounds(pos, el.bounds)) {
      return el;
    }
  }
  return null;
}
