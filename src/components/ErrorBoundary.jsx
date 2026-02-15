import React from 'react';
import { Alert, AlertDescription } from './ui/Alert';
import { Button } from './ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Send error to logging service (in production)
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    try {
      // Send error to your logging service
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
            componentStack: errorInfo.componentStack,
            errorId: this.state.errorId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: localStorage.getItem('userId') || 'anonymous'
          }
        })
      }).catch(err => {
        console.error('Failed to log error to service:', err);
      });
    } catch (err) {
      console.error('Error logging failed:', err);
    }
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          errorId: this.state.errorId,
          retry: this.handleRetry,
          reload: this.handleReload
        });
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <h1 className="text-xl font-semibold text-center text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-gray-100 rounded-lg">
                <summary className="cursor-pointer font-mono text-sm">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 text-xs text-red-600 font-mono whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={this.handleRetry}
                className="flex-1"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload}
                className="flex-1"
              >
                Reload Page
              </Button>
            </div>

            {this.state.errorId && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Render children normally
    return this.props.children;
  }
}

/**
 * Functional Error Boundary Hook
 * For use in functional components
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error) => {
    console.error('Error captured by useErrorHandler:', error);
    setError(error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

/**
 * Error Boundary for specific components
 */
export const withErrorBoundary = (Component, fallback = null) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

/**
 * API Error Boundary
 * Specifically for API-related errors
 */
export const ApiErrorBoundary = ({ children }) => {
  const fallback = ({ error, retry, reload }) => (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="w-4 h-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-semibold">API Error</p>
          <p className="text-sm">
            {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={retry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={reload}>
              Reload
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};

/**
 * SWIFT Message Error Boundary
 * Specifically for SWIFT message generation errors
 */
export const SwiftErrorBoundary = ({ children }) => {
  const fallback = ({ error, retry, reload }) => (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="w-4 h-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-semibold">SWIFT Message Error</p>
          <p className="text-sm">
            {error?.message || 'Failed to generate SWIFT message. Please check your input and try again.'}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={retry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button size="sm" variant="outline" onClick={reload}>
              Reload
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
