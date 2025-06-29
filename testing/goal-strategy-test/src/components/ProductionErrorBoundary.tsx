import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate a unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to production error reporting service
    if (import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
      this.reportError(error, errorInfo)
    }
    
    // Update state with error info
    this.setState({
      errorInfo,
    })
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In production, send to error reporting service
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    }
    
    // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
    console.error('Production Error:', errorReport)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    })
    
    // Optionally reload the page for a fresh start
    if (import.meta.env.VITE_FORCE_RELOAD_ON_ERROR === 'true') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // Default production error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white shadow-lg rounded-lg p-6">
              {/* Error Icon */}
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              
              {/* Error Message */}
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-center text-gray-600 mb-6">
                We encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>
              
              {/* Error ID for support */}
              {this.state.errorId && (
                <div className="bg-gray-50 rounded p-3 mb-6">
                  <p className="text-xs text-gray-500 text-center">
                    Error ID: <code className="font-mono">{this.state.errorId}</code>
                  </p>
                </div>
              )}
              
              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>
                
                <a
                  href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@personalea.com'}?subject=Error Report ${this.state.errorId}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </a>
              </div>
              
              {/* Additional Help */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  If this problem persists, please try clearing your browser cache or using a different browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional component wrapper for easier use
export const withProductionErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> => {
  return (props: P) => (
    <ProductionErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ProductionErrorBoundary>
  )
}

export default ProductionErrorBoundary