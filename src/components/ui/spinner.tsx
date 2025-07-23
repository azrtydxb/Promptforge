import * as React from "react"
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3"
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-solid border-primary border-r-transparent",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

interface LoadingSpinnerProps extends SpinnerProps {
  label?: string
}

export function LoadingSpinner({ label, size = "md", className, ...props }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)} {...props}>
      <Spinner size={size} />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  )
}

interface FullPageSpinnerProps extends LoadingSpinnerProps {}

export function FullPageSpinner(props: FullPageSpinnerProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner size="lg" {...props} />
    </div>
  )
}

interface InlineSpinnerProps extends SpinnerProps {
  label?: string
}

export function InlineSpinner({ label, size = "sm", className, ...props }: InlineSpinnerProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <Spinner size={size} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}