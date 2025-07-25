import * as React from "react"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./spinner"

interface LoadingOverlayProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
  spinnerClassName?: string
  label?: string
  blur?: boolean
}

export function LoadingOverlay({ 
  loading = false, 
  children, 
  className,
  spinnerClassName,
  label
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {loading && (
        <>
          <div 
            className={cn(
              "absolute inset-0 z-10 bg-white"
            )} 
          />
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <LoadingSpinner 
              label={label} 
              className={spinnerClassName}
            />
          </div>
        </>
      )}
    </div>
  )
}