'use client';

import { useEffect } from 'react';
import { NetworkErrorFallback } from '@/components/error-boundary/error-fallbacks';

export default function SharedPromptsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Shared prompts error:', error);
  }, [error]);

  return <NetworkErrorFallback onReset={reset} />;
}