import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, Heading, Button } from '../ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error captured by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main className="page" style={{ maxWidth: '640px', margin: '48px auto', padding: '0 20px' }}>
          <Card style={{ padding: '36px', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }}>⚠️</span>
            <Heading level={2}>Something unexpected happened</Heading>
            <p style={{ marginTop: '10px', color: 'var(--muted)', fontSize: '.92rem' }}>
              We encountered a rendering issue while presenting this view.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#f4efe8',
                  borderRadius: '10px',
                  fontSize: '.8rem',
                  color: 'var(--red-text)',
                  overflowX: 'auto',
                  textAlign: 'left',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Button
                variant="primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                Reload page
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/candidate/applications';
                }}
              >
                Go to applications
              </Button>
            </div>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
