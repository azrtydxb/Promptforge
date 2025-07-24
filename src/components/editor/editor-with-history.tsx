"use client";

import { useEffect, useCallback } from "react";
import { Editor } from "./editor";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2 } from "lucide-react";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EditorWithHistoryProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  className?: string;
  showHistoryControls?: boolean;
}

export function EditorWithHistory({
  value,
  onChange,
  language,
  className,
  showHistoryControls = true,
}: EditorWithHistoryProps) {
  const {
    value: currentValue,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
  } = useUndoRedo(value, {
    maxHistorySize: 50,
    debounceDelay: 500,
  });

  // Sync external value changes
  useEffect(() => {
    if (value !== currentValue) {
      set(value);
    }
  }, [value, currentValue, set]);

  // Handle editor changes
  const handleChange = useCallback((newValue: string) => {
    set(newValue);
    onChange(newValue);
  }, [set, onChange]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const previousValue = history.past[history.past.length - 1];
    if (previousValue !== undefined) {
      undo();
      onChange(previousValue);
    }
  }, [undo, onChange, history.past]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const nextValue = history.future[0];
    if (nextValue !== undefined) {
      redo();
      onChange(nextValue);
    }
  }, [redo, onChange, history.future]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (canUndo) handleUndo();
      } else if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") ||
        ((e.metaKey || e.ctrlKey) && e.key === "y")
      ) {
        e.preventDefault();
        if (canRedo) handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo]);

  return (
    <div className={cn("relative h-full", className)}>
      {showHistoryControls && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Undo (⌘Z)</p>
                {canUndo && (
                  <p className="text-xs text-muted-foreground">
                    {history.pastCount} changes
                  </p>
                )}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleRedo}
                  disabled={!canRedo}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Redo (⌘⇧Z)</p>
                {canRedo && (
                  <p className="text-xs text-muted-foreground">
                    {history.futureCount} changes
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="ml-1 border-l pl-1">
            <KeyboardShortcuts />
          </div>
        </div>
      )}
      
      <Editor
        value={currentValue}
        onChange={handleChange}
        language={language}
      />
    </div>
  );
}