'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  AlertCircle, 
  RefreshCw, 
  Home, 
  Wifi, 
  Database,
  Lock,
  FileQuestion,
  ServerCrash,
  Bug
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BaseErrorFallbackProps {
  onReset?: () => void;
  error?: Error;
}

// Network Error Fallback
export function NetworkErrorFallback({ onReset }: BaseErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-yellow-100 p-3">
            <Wifi className="h-8 w-8 text-warning" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Connection Issue</h3>
            <p className="text-sm text-muted-foreground">
              Unable to connect to the server. Please check your internet connection and try again.
            </p>
          </div>
          <Button onClick={onReset} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Database Error Fallback
export function DatabaseErrorFallback({ onReset }: BaseErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <Database className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Database Error</h3>
            <p className="text-sm text-muted-foreground">
              We&apos;re having trouble accessing data. Our team has been notified.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={onReset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <HomeButton variant="outline" />
          </div>
        </div>
      </Card>
    </div>
  );
}

// Authentication Error Fallback
export function AuthErrorFallback({ error }: BaseErrorFallbackProps) {
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-yellow-100 p-3">
            <Lock className="h-8 w-8 text-warning" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Authentication Required</h3>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'You need to be signed in to access this content.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => router.push('/sign-in')} 
              variant="default"
            >
              Sign In
            </Button>
            <HomeButton variant="outline" />
          </div>
        </div>
      </Card>
    </div>
  );
}

// Not Found Error Fallback
export function NotFoundErrorFallback({ onReset }: BaseErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-muted p-3">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Not Found</h3>
            <p className="text-sm text-muted-foreground">
              The content you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>
          <div className="flex gap-3">
            {onReset && (
              <Button onClick={onReset} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <HomeButton variant={onReset ? "outline" : "default"} />
          </div>
        </div>
      </Card>
    </div>
  );
}

// Server Error Fallback
export function ServerErrorFallback({ onReset }: BaseErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <ServerCrash className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Server Error</h3>
            <p className="text-sm text-muted-foreground">
              Something went wrong on our end. We&apos;re working to fix it.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={onReset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <HomeButton variant="outline" />
          </div>
        </div>
      </Card>
    </div>
  );
}

// Development Error Fallback (shows more details)
export function DevelopmentErrorFallback({ error, onReset }: BaseErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-2xl w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <Bug className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Development Error</h3>
            {error && (
              <div className="text-left space-y-2 mt-4">
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-mono text-destructive">
                    {error.toString()}
                  </p>
                </div>
                {error.stack && (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">
                      Stack Trace
                    </summary>
                    <div className="mt-2 rounded-md bg-muted p-3 overflow-x-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
          <Button onClick={onReset} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Minimal Error Fallback for small components
export function MinimalErrorFallback({ onReset }: BaseErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-4 border border-red-300 rounded-md bg-red-50">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm">Failed to load</span>
        {onReset && (
          <Button 
            onClick={onReset} 
            variant="ghost" 
            size="sm"
            className="h-auto p-1"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper component for Home button
function HomeButton({ variant = "default" }: { variant?: "default" | "outline" }) {
  const router = useRouter();
  
  return (
    <Button
      onClick={() => router.push('/')}
      variant={variant}
      className="gap-2"
    >
      <Home className="h-4 w-4" />
      Go Home
    </Button>
  );
}