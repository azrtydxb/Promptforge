'use client';

import React from 'react';
import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SaveStatus } from '@/hooks/use-auto-save';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved: Date | null;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  className,
}: AutoSaveIndicatorProps) {
  const getStatusContent = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Saving...',
          color: 'text-blue-500',
        };
      case 'saved':
        return {
          icon: <Check className="w-4 h-4" />,
          text: 'Saved',
          color: 'text-green-500',
        };
      case 'error':
        return {
          icon: <CloudOff className="w-4 h-4" />,
          text: 'Error',
          color: 'text-red-500',
        };
      default:
        return {
          icon: <Cloud className="w-4 h-4" />,
          text: 'Auto-save enabled',
          color: 'text-muted-foreground',
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-2 text-sm ${statusContent.color} ${className || ''}`}
          >
            {statusContent.icon}
            <span>{statusContent.text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">Auto-save Status</p>
            {lastSaved && (
              <p className="text-sm">
                Last saved{' '}
                {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </p>
            )}
            {!lastSaved && status === 'idle' && (
              <p className="text-sm">Changes will be saved automatically</p>
            )}
            {status === 'error' && (
              <p className="text-sm text-red-400">
                Failed to save. Please try again.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
