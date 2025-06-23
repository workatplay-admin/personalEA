import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  conversationState?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Chat Error Boundary caught an error:', error, errorInfo);
    
    // Store conversation state before crash to prevent data loss
    try {
      if (this.props.conversationState) {
        localStorage.setItem('conversation_backup', JSON.stringify({
          state: this.props.conversationState,
          timestamp: new Date().toISOString(),
          error: error.message
        }));
        console.log('Conversation state backed up to localStorage');
      }
    } catch (backupError) {
      console.error('Failed to backup conversation state:', backupError);
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleRecover = () => {
    try {
      const backup = localStorage.getItem('conversation_backup');
      if (backup) {
        const parsedBackup = JSON.parse(backup);
        console.log('Recovering conversation from backup:', parsedBackup);
        // Emit a custom event that parent components can listen to
        window.dispatchEvent(new CustomEvent('conversation-recovery', {
          detail: parsedBackup
        }));
      }
    } catch (error) {
      console.error('Failed to recover conversation:', error);
    }
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-recovery bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Something went wrong with the conversation
              </h3>
            </div>
          </div>
          
          <div className="text-sm text-red-700 mb-4">
            <p>Don't worry - your conversation has been saved automatically.</p>
            <p className="mt-2 text-xs text-red-600">
              Error: {this.state.error?.message || 'Unknown error occurred'}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Again
            </button>
            
            <button
              onClick={this.handleRecover}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Recover Conversation
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-xs text-red-600 cursor-pointer">
                Show technical details
              </summary>
              <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-32">
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary;