import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: '#0a0d14',
          color: '#f1f5f9',
          fontFamily: 'system-ui, sans-serif',
          padding: 20,
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: 12, fontSize: '1.8rem', fontWeight: 800 }}>⚠️ Something went wrong</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: 24, maxWidth: 500, lineHeight: 1.5 }}>
            An unexpected error occurred in the interface. You can reload the page or return to the dashboard.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: '#10b981',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}>
              Reload Page
            </button>
            <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: '#1a2235',
                color: '#f1f5f9',
                border: '1px solid #1e2d45',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
