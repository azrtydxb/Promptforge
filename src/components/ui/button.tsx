import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-[12.5px] font-[550] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent-500 text-white shadow-[0_1px_2px_rgba(94,106,210,0.35)] hover:bg-[#4F5AC4]",
        primary:
          "bg-accent-500 text-white shadow-[0_1px_2px_rgba(94,106,210,0.35)] hover:bg-[#4F5AC4]",
        destructive: "bg-danger text-white hover:opacity-90",
        outline:
          "border border-line-200 bg-surface-card text-ink-700 hover:bg-surface-muted",
        secondary: "bg-surface-muted text-ink-700 hover:bg-line-150",
        ghost: "text-ink-600 hover:bg-surface-muted hover:text-ink-900",
        link: "text-accent-700 underline-offset-4 hover:text-accent-500 hover:underline",
        success: "bg-success text-white hover:opacity-90",
        warning: "bg-warning text-white hover:opacity-90",
        info: "bg-accent-500 text-white hover:bg-[#4F5AC4]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[7px] px-3 text-[11.5px]",
        lg: "h-11 rounded-[9px] px-6 text-[13px]",
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