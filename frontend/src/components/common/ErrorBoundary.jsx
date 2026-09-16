// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Error Boundary
// ============================================================

import React, { Component } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiLogOut, FiCode } from 'react-icons/fi';

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
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const isProduction = process.env.NODE_ENV === 'production';

      return (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'var(--light, #f4f6f9)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg, 18px)',
              background: 'var(--danger-soft, #fef2f2)',
              color: 'var(--danger, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}
          >
            <FiAlertTriangle size={30} />
          </div>

          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--dark, #0f172a)',
              letterSpacing: '-0.4px',
              marginBottom: '8px'
            }}
          >
            Something went wrong
          </h2>

          <p
            style={{
              color: 'var(--gray, #64748b)',
              fontSize: '13.5px',
              marginBottom: '24px',
              maxWidth: '420px',
              lineHeight: 1.6
            }}
          >
            {isProduction
              ? 'An unexpected error occurred. Please refresh the page or try again.'
              : `Error: ${this.state.error?.message || 'Unknown error'}`}
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={this.handleRetry} className="btn btn-primary">
              <FiRefreshCw size={15} style={{ marginRight: '6px' }} />
              Refresh Page
            </button>
            <button onClick={this.handleLogout} className="btn btn-secondary">
              <FiLogOut size={15} style={{ marginRight: '6px' }} />
              Go to Login
            </button>
            {!isProduction && (
              <button onClick={this.toggleDetails} className="btn btn-secondary">
                <FiCode size={15} style={{ marginRight: '6px' }} />
                {this.state.showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            )}
          </div>

          {!isProduction && this.state.showDetails && this.state.error && (
            <div
              style={{
                marginTop: '22px',
                padding: '16px 18px',
                background: 'var(--danger-soft, #fef2f2)',
                borderRadius: 'var(--radius, 10px)',
                border: '1px solid #fecaca',
                maxWidth: '100%',
                width: '600px',
                textAlign: 'left',
                overflow: 'auto'
              }}
            >
              <p style={{ color: '#991b1b', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                Error Details:
              </p>
              <pre
                style={{
                  color: '#4b5563',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  maxHeight: '200px',
                  overflow: 'auto'
                }}
              >
                {this.state.error.toString()}
              </pre>
              {this.state.errorInfo && (
                <>
                  <p
                    style={{
                      color: '#991b1b',
                      fontWeight: 600,
                      fontSize: '13px',
                      marginTop: '12px',
                      marginBottom: '8px'
                    }}
                  >
                    Component Stack:
                  </p>
                  <pre
                    style={{
                      color: '#4b5563',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}
                  >
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