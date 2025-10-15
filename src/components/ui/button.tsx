import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--primary))] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[hsl(var(--primary))]/90 active:scale-[0.98]",
        primary: "bg-[hsl(var(--primary))] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[hsl(var(--primary))]/90 active:scale-[0.98]",
        destructive:
          "bg-[hsl(var(--destructive))] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[hsl(var(--destructive))]/90",
        outline:
          "border border-input bg-background hover:bg-muted hover:text-accent-foreground shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted shadow-sm",
        ghost: "hover:bg-muted hover:text-accent-foreground",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
        success: "bg-[hsl(var(--success))] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[hsl(var(--success))]/90",
        warning: "bg-[hsl(var(--warning))] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[hsl(var(--warning))]/90",
        info: "bg-[hsl(var(--info))] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[hsl(var(--info))]/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded px-3 text-xs",
        lg: "h-10 rounded px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }