// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Error Boundary (UPDATED)
// ============================================================

import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // ✅ Log error to console
    console.error('Error caught by boundary:', error, errorInfo);
    
    // ✅ Store error info for debugging
    this.setState({ errorInfo });
    
    // ✅ You could also send this to a logging service
    // Example: sendToLoggingService(error, errorInfo);
  }

  // ✅ Handle retry
  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  // ✅ Toggle error details
  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  // ✅ Handle logout
  handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <span role="img" aria-label="Warning">⚠️</span>
          </div>
          
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#0a1e3d',
            marginBottom: '8px'
          }}>
            Something went wrong
          </h2>
          
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '20px',
            maxWidth: '400px'
          }}>
            {isProduction 
              ? 'An unexpected error occurred. Please refresh the page or try again.'
              : `Error: ${this.state.error?.message || 'Unknown error'}`
            }
          </p>
          
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button 
              onClick={this.handleRetry} 
              className="btn btn-primary"
            >
              Refresh Page
            </button>
            
            <button 
              onClick={this.handleLogout} 
              className="btn btn-secondary"
            >
              Go to Login
            </button>
            
            {!isProduction && (
              <button 
                onClick={this.toggleDetails} 
                className="btn btn-secondary"
              >
                {this.state.showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            )}
          </div>
          
          {/* Error Details (Development Only) */}
          {!isProduction && this.state.showDetails && this.state.error && (
            <div style={{ 
              marginTop: '20px', 
              padding: '16px', 
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              maxWidth: '100%',
              width: '600px',
              textAlign: 'left',
              overflow: 'auto'
            }}>
              <p style={{ 
                color: '#991b1b', 
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                Error Details:
              </p>
              <pre style={{
                color: '#4b5563',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {this.state.error.toString()}
              </pre>
              {this.state.errorInfo && (
                <>
                  <p style={{ 
                    color: '#991b1b', 
                    fontWeight: '600',
                    marginTop: '12px',
                    marginBottom: '8px'
                  }}>
                    Component Stack:
                  </p>
                  <pre style={{
                    color: '#4b5563',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;