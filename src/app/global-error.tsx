'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
          <Card className="max-w-2xl w-full p-6 shadow-lg">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Application Error</h2>
                <p className="text-muted-foreground">
                  Something went wrong! The application encountered an unexpected error.
                </p>
                {process.env.NODE_ENV === 'development' && error.message && (
                  <div className="mt-4 rounded-md bg-muted p-3 text-left">
                    <p className="text-sm font-mono text-destructive">
                      {error.message}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={reset} variant="default" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  variant="outline" 
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </body>
    </html>
  );
}