'use client';

import { useEffect } from 'react';
import { DatabaseErrorFallback } from '@/components/error-boundary/error-fallbacks';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return <DatabaseErrorFallback onReset={reset} />;
}