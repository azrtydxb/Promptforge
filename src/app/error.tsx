'use client';

import { useEffect } from 'react';
import { ServerErrorFallback, DevelopmentErrorFallback } from '@/components/error-boundary/error-fallbacks';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App error:', error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    return <DevelopmentErrorFallback error={error} onReset={reset} />;
  }

  return <ServerErrorFallback onReset={reset} />;
}