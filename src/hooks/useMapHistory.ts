import { useCallback, useState, useRef } from 'react';
import { Sector } from '@/types/mapStudio';

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  past: Sector[][];
  present: Sector[];
  future: Sector[][];
}

export function useMapHistory(initialState: Sector[] = []) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  const isUndoingRef = useRef(false);

  // Push novo estado para o histórico
  const push = useCallback((newState: Sector[]) => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
      return;
    }

    setHistory(prev => {
      // Limita o tamanho do histórico
      const newPast = [...prev.past, prev.present].slice(-MAX_HISTORY_SIZE);
      
      return {
        past: newPast,
        present: JSON.parse(JSON.stringify(newState)),
        future: [],
      };
    });
  }, []);

  // Undo
  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;

      const newPast = prev.past.slice(0, -1);
      const newPresent = prev.past[prev.past.length - 1];
      
      isUndoingRef.current = true;

      return {
        past: newPast,
        present: JSON.parse(JSON.stringify(newPresent)),
        future: [prev.present, ...prev.future].slice(0, MAX_HISTORY_SIZE),
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;

      const newFuture = prev.future.slice(1);
      const newPresent = prev.future[0];
      
      isUndoingRef.current = true;

      return {
        past: [...prev.past, prev.present].slice(-MAX_HISTORY_SIZE),
        present: JSON.parse(JSON.stringify(newPresent)),
        future: newFuture,
      };
    });
  }, []);

  // Reset histórico
  const reset = useCallback((newState: Sector[]) => {
    setHistory({
      past: [],
      present: JSON.parse(JSON.stringify(newState)),
      future: [],
    });
  }, []);

  return {
    state: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    push,
    undo,
    redo,
    reset,
  };
}
