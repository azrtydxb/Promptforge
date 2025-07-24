"use client";

import { useState } from "react";
import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pinPrompt } from "@/app/actions/prompt.actions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PinButtonProps {
  promptId: string;
  isPinned: boolean;
  className?: string;
  showLabel?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function PinButton({ 
  promptId, 
  isPinned: initialIsPinned, 
  className,
  showLabel = false,
  size = "icon",
  variant = "ghost"
}: PinButtonProps) {
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    try {
      const result = await pinPrompt(promptId);
      
      if (result.success) {
        setIsPinned(result.isPinned);
        toast({
          title: result.isPinned ? "Prompt pinned" : "Prompt unpinned",
          description: result.isPinned 
            ? "This prompt will appear at the top of your list" 
            : "This prompt has been unpinned",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update pin status",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update pin status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleTogglePin}
      disabled={isLoading}
      className={cn(
        isPinned && "text-primary",
        className
      )}
      title={isPinned ? "Unpin prompt" : "Pin prompt"}
    >
      {isPinned ? (
        <>
          <Pin className={cn("h-4 w-4", showLabel && "mr-2")} fill="currentColor" />
          {showLabel && "Pinned"}
        </>
      ) : (
        <>
          <Pin className={cn("h-4 w-4", showLabel && "mr-2")} />
          {showLabel && "Pin"}
        </>
      )}
    </Button>
  );
}