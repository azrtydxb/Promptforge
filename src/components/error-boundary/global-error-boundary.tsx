'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import { ServerErrorFallback, DevelopmentErrorFallback } from './error-fallbacks';
import { ReactNode } from 'react';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <ErrorBoundary
      level="page"
      fallback={
        isDevelopment ? (
          <DevelopmentErrorFallback error={new Error('Application Error')} />
        ) : (
          <ServerErrorFallback />
        )
      }
      onError={(error, errorInfo) => {
        // Log to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
          console.error('Global error boundary caught:', {
            error: error.toString(),
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
          });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}