import { useState, useCallback, useRef } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  debounceDelay?: number;
}

export function useUndoRedo<T>(
  initialValue: T,
  options: UseUndoRedoOptions = {}
) {
  const { maxHistorySize = 50, debounceDelay = 500 } = options;
  
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: [],
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<T>(initialValue);

  // Set a new value and clear the future
  const set = useCallback((newValue: T) => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the history update
    debounceTimeoutRef.current = setTimeout(() => {
      setHistory((prevHistory) => {
        // Don't add to history if value hasn't changed
        if (JSON.stringify(newValue) === JSON.stringify(prevHistory.present)) {
          return prevHistory;
        }

        const newPast = [...prevHistory.past, prevHistory.present];
        
        // Limit history size
        if (newPast.length > maxHistorySize) {
          newPast.shift();
        }

        return {
          past: newPast,
          present: newValue,
          future: [],
        };
      });
      lastValueRef.current = newValue;
    }, debounceDelay);

    // Update present value immediately for UI responsiveness
    setHistory((prevHistory) => ({
      ...prevHistory,
      present: newValue,
    }));
  }, [maxHistorySize, debounceDelay]);

  // Undo to previous state
  const undo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.past.length === 0) {
        return prevHistory;
      }

      const previous = prevHistory.past[prevHistory.past.length - 1];
      const newPast = prevHistory.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [prevHistory.present, ...prevHistory.future],
      };
    });
  }, []);

  // Redo to next state
  const redo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.future.length === 0) {
        return prevHistory;
      }

      const next = prevHistory.future[0];
      const newFuture = prevHistory.future.slice(1);

      return {
        past: [...prevHistory.past, prevHistory.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // Reset history
  const reset = useCallback((newValue?: T) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    setHistory({
      past: [],
      present: newValue ?? initialValue,
      future: [],
    });
  }, [initialValue]);

  // Get current state
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    value: history.present,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    history: {
      past: history.past,
      future: history.future,
      pastCount: history.past.length,
      futureCount: history.future.length,
    },
  };
}