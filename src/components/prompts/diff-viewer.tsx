"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  computeDiff, 
  computeSideBySideDiff, 
  getChangeStats,
  type DiffMode,
  type DiffGranularity 
} from "@/lib/diff-utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  oldTitle?: string;
  newTitle?: string;
  mode?: DiffMode;
  granularity?: DiffGranularity;
  className?: string;
  showLineNumbers?: boolean;
}

export function DiffViewer({
  oldContent,
  newContent,
  oldTitle = "Original",
  newTitle = "Modified",
  mode = "side-by-side",
  granularity = "lines",
  className,
  showLineNumbers = true,
}: DiffViewerProps) {
  const diff = useMemo(
    () => computeDiff(oldContent, newContent, granularity),
    [oldContent, newContent, granularity]
  );

  const sideBySideData = useMemo(
    () => mode === "side-by-side" ? computeSideBySideDiff(oldContent, newContent) : null,
    [oldContent, newContent, mode]
  );

  const stats = getChangeStats(diff);

  if (mode === "side-by-side" && sideBySideData) {

    return (
      <div className={cn("border rounded-lg overflow-hidden", className)}>
        <div className="flex border-b bg-gray-100">
          <div className="flex-1 px-4 py-2 font-medium text-sm">
            {oldTitle}
          </div>
          <div className="border-l" />
          <div className="flex-1 px-4 py-2 font-medium text-sm">
            {newTitle}
          </div>
        </div>
        
        <div className="flex text-xs text-muted-foreground px-4 py-1 border-b bg-gray-50">
          {stats}
        </div>

        <div className="flex divide-x">
          <ScrollArea className="flex-1 h-[500px]">
            <div className="font-mono text-sm">
              {sideBySideData.leftLines.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    item.type === "removed" && "bg-red-100",
                    item.type === "empty" && "bg-gray-50"
                  )}
                >
                  {showLineNumbers && (
                    <div className="px-2 py-1 text-muted-foreground select-none text-right min-w-[3ch]">
                      {item.lineNumber > 0 ? item.lineNumber : ""}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex-1 px-2 py-1 whitespace-pre-wrap break-all",
                      item.type === "removed" && "text-red-600"
                    )}
                  >
                    {item.line || "\u00A0"}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <ScrollArea className="flex-1 h-[500px]">
            <div className="font-mono text-sm">
              {sideBySideData.rightLines.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    item.type === "added" && "bg-green-100",
                    item.type === "empty" && "bg-gray-50"
                  )}
                >
                  {showLineNumbers && (
                    <div className="px-2 py-1 text-muted-foreground select-none text-right min-w-[3ch]">
                      {item.lineNumber > 0 ? item.lineNumber : ""}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex-1 px-2 py-1 whitespace-pre-wrap break-all",
                      item.type === "added" && "text-green-600"
                    )}
                  >
                    {item.line || "\u00A0"}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Inline or unified diff view
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <div className="px-4 py-2 border-b bg-gray-100">
        <div className="font-medium text-sm">{newTitle}</div>
        <div className="text-xs text-muted-foreground">{stats}</div>
      </div>
      
      <ScrollArea className="h-[500px]">
        <div className="font-mono text-sm">
          {diff.segments.map((segment, index) => {
            const lines = segment.value.split('\n').filter(line => line !== '');
            return lines.map((line, lineIndex) => (
              <div
                key={`${index}-${lineIndex}`}
                className={cn(
                  "px-4 py-1 whitespace-pre-wrap break-all",
                  segment.added && "bg-green-100 text-green-600",
                  segment.removed && "bg-red-100 text-red-600"
                )}
              >
                <span className="select-none mr-2">
                  {segment.added ? "+" : segment.removed ? "-" : " "}
                </span>
                {line}
              </div>
            ));
          })}
        </div>
      </ScrollArea>
    </div>
  );
}