"use client";

import { useState } from "react";
import { Check, Cloud, CloudOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface SaveStatusIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  onClear?: () => void;
  className?: string;
}

export function SaveStatusIndicator({
  status,
  lastSaved,
  onClear,
  className,
}: SaveStatusIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false);

  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'saved':
        return <Check className="h-4 w-4" />;
      case 'error':
        return <CloudOff className="h-4 w-4" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving draft...';
      case 'saved':
        return 'Draft saved';
      case 'error':
        return 'Failed to save';
      default:
        return lastSaved ? 'Draft available' : 'No draft';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return 'text-blue-500';
      case 'saved':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-2 text-xs",
            getStatusColor(),
            className
          )}
        >
          {getStatusIcon()}
          <span className="hidden sm:inline">{getStatusText()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Draft Status</h4>
            <p className="text-sm text-muted-foreground">
              {status === 'saved' && lastSaved
                ? `Last saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
                : status === 'error'
                ? 'Failed to save draft to browser storage'
                : status === 'saving'
                ? 'Saving your changes...'
                : 'Your work is automatically saved as you type'}
            </p>
          </div>

          {lastSaved && onClear && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClear();
                  setShowPopover(false);
                }}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear draft
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>Drafts are stored locally in your browser and expire after 30 days.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}