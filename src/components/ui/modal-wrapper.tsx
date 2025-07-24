"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "sm:max-w-[425px]",
  md: "sm:max-w-[525px]",
  lg: "sm:max-w-[725px]",
  xl: "sm:max-w-[925px]",
};

export function ModalWrapper({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  size = "sm",
}: ModalWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeMap[size], "p-0", className)}>
        <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <DialogFooter className="px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}