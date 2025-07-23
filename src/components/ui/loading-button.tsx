import * as React from "react"
import { Button, ButtonProps } from "./button"
import { Spinner } from "./spinner"
import { cn } from "@/lib/utils"

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

export function LoadingButton({ 
  loading = false, 
  loadingText,
  children, 
  disabled,
  className,
  ...props 
}: LoadingButtonProps) {
  return (
    <Button
      disabled={loading || disabled}
      className={cn(
        "relative",
        loading && "text-transparent",
        className
      )}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" className="text-current" />
          {loadingText && (
            <span className="ml-2 text-current">{loadingText}</span>
          )}
        </div>
      )}
      {children}
    </Button>
  )
}