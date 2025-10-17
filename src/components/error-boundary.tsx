'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorBoundaryKey: number;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorBoundaryKey: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to server in production (via custom logger)
    if (process.env.NODE_ENV === 'production') {
      // Could send to server-side logger endpoint here if needed
      console.error('Production error:', error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    if (hasError) {
      // Reset on prop changes if enabled
      if (resetOnPropsChange && prevProps.children !== this.props.children) {
        this.resetErrorBoundary();
      }
      
      // Reset on specific key changes
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorBoundaryKey: this.state.errorBoundaryKey + 1,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children, level = 'component', showDetails = false } = this.props;

    if (hasError && error) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetErrorBoundary={this.resetErrorBoundary}
          level={level}
          showDetails={showDetails}
        />
      );
    }

    return children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetErrorBoundary: () => void;
  level: 'page' | 'section' | 'component';
  showDetails?: boolean;
}

function ErrorFallback({ 
  error, 
  errorInfo, 
  resetErrorBoundary, 
  level,
  showDetails = false 
}: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const showErrorDetails = isDevelopment || showDetails;

  return (
    <div className={`
      flex items-center justify-center
      ${level === 'page' ? 'min-h-screen' : level === 'section' ? 'min-h-[400px]' : 'min-h-[200px]'}
      p-4
    `}>
      <Card className="max-w-2xl w-full p-6 shadow-lg">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              {level === 'page' ? 'Page Error' : 
               level === 'section' ? 'Section Error' : 
               'Something went wrong'}
            </h2>
            <p className="text-muted-foreground">
              {level === 'page' 
                ? "We&apos;re sorry, but this page encountered an error."
                : level === 'section'
                ? "This section of the page couldn&apos;t load properly."
                : "An unexpected error occurred in this component."}
            </p>
          </div>

          {showErrorDetails && (
            <div className="w-full mt-4 space-y-4">
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Error Details
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm font-mono text-destructive">
                      {error.toString()}
                    </p>
                  </div>
                  {error.stack && (
                    <div className="rounded-md bg-muted p-3 overflow-x-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div className="rounded-md bg-muted p-3 overflow-x-auto">
                      <p className="text-xs font-semibold mb-1">Component Stack:</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              onClick={resetErrorBoundary}
              variant="default"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            {level === 'page' && (
              <NavigateHomeButton />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function NavigateHomeButton() {
  const router = useRouter();
  
  return (
    <Button
      onClick={() => router.push('/')}
      variant="outline"
      className="gap-2"
    >
      <Home className="h-4 w-4" />
      Go Home
    </Button>
  );
}

// Export a hook-friendly wrapper
export function ErrorBoundary(props: Props) {
  return <ErrorBoundaryClass {...props} />;
}

// Export specific error boundaries for different use cases
export function PageErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundaryClass {...props} level="page">
      {children}
    </ErrorBoundaryClass>
  );
}

export function SectionErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundaryClass {...props} level="section">
      {children}
    </ErrorBoundaryClass>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundaryClass {...props} level="component">
      {children}
    </ErrorBoundaryClass>
  );
}