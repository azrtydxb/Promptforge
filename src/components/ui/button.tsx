import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:from-blue-700 hover:to-purple-700",
        primary: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:from-blue-700 hover:to-purple-700",
        destructive:
          "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:from-red-700 hover:to-rose-700",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-[1.01] active:scale-[0.99]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline hover:text-[hsl(var(--primary))]/80",
        success: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:from-emerald-700 hover:to-teal-700",
        warning: "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:from-amber-700 hover:to-orange-700",
        info: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:from-cyan-700 hover:to-blue-700",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
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