'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
      onOpenChange?.(newOpen);
    }
  }, [isControlled, onOpenChange]);

  const contextValue = React.useMemo(() => ({
    open: isOpen,
    onOpenChange: handleOpenChange,
  }), [isOpen, handleOpenChange]);

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export function DialogTrigger({ asChild, children }: DialogTriggerProps) {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('DialogTrigger must be used within a Dialog');
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{onClick?: (e: React.MouseEvent) => void}>, {
      onClick: (e: React.MouseEvent) => {
        (children.props as {onClick?: (e: React.MouseEvent) => void}).onClick?.(e);
        context.onOpenChange(true);
      },
    });
  }

  return (
    <button onClick={() => context.onOpenChange(true)}>
      {children}
    </button>
  );
}

export interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogContent({ className, children }: DialogContentProps) {
  const context = React.useContext(DialogContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  if (!context) {
    throw new Error('DialogContent must be used within a Dialog');
  }

  // Handle focus trap and keyboard navigation
  useFocusTrap(contentRef as React.RefObject<HTMLElement>, context.open);

  // Handle Escape key
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && context.open) {
        event.preventDefault();
        context.onOpenChange(false);
      }
    };

    if (context.open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [context]);

  if (!context.open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-black/70" 
        onClick={() => context.onOpenChange(false)}
        aria-hidden="true"
      />
      
      {/* Dialog Container */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-2 sm:p-4 pointer-events-none" role="dialog" aria-modal="true">
        <div
          ref={contentRef}
          className={cn(
            "relative bg-background rounded-lg shadow-2xl border-2 border-border w-full max-w-[calc(100vw-1rem)] sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto",
            className
          )}
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
        <button
          onClick={() => context.onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none text-muted-foreground hover:text-foreground"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
      </div>
    </>
  );
}

export interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-4", className)}>
      {children}
    </div>
  );
}

export interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4", className)}>
      {children}
    </div>
  );
}

export interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  const dialogTitleId = React.useId();
  
  React.useEffect(() => {
    const dialogElement = document.querySelector('[role="dialog"]');
    if (dialogElement) {
      dialogElement.setAttribute('aria-labelledby', dialogTitleId);
    }
  }, [dialogTitleId]);
  
  return (
    <h2 id={dialogTitleId} className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}>
      {children}
    </h2>
  );
}

export interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogDescription({ className, children }: DialogDescriptionProps) {
  const dialogDescId = React.useId();
  
  React.useEffect(() => {
    const dialogElement = document.querySelector('[role="dialog"]');
    if (dialogElement) {
      const currentDesc = dialogElement.getAttribute('aria-describedby');
      if (!currentDesc) {
        dialogElement.setAttribute('aria-describedby', dialogDescId);
      }
    }
  }, [dialogDescId]);
  
  return (
    <p id={dialogDescId} className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}