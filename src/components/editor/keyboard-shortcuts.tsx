"use client";

import { Keyboard } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const shortcuts = [
  { keys: ["⌘", "Z"], description: "Undo" },
  { keys: ["⌘", "⇧", "Z"], description: "Redo" },
  { keys: ["⌘", "Y"], description: "Redo (alternative)" },
  { keys: ["⌘", "F"], description: "Find" },
  { keys: ["⌘", "G"], description: "Find next" },
  { keys: ["⌘", "⇧", "G"], description: "Find previous" },
  { keys: ["⌘", "H"], description: "Replace" },
  { keys: ["⌘", "A"], description: "Select all" },
  { keys: ["⌘", "D"], description: "Select next occurrence" },
  { keys: ["⌘", "["], description: "Outdent" },
  { keys: ["⌘", "]"], description: "Indent" },
  { keys: ["⌘", "/"], description: "Toggle comment" },
];

export function KeyboardShortcuts() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm mb-3">Keyboard Shortcuts</h4>
          <div className="space-y-2">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex}>
                      {keyIndex > 0 && (
                        <span className="text-muted-foreground mx-1">+</span>
                      )}
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground pt-3 border-t">
            Note: Use Ctrl instead of ⌘ on Windows/Linux
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}