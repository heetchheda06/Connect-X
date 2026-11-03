import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-surface select-none">
          <div className="w-14 h-14 rounded-2xl bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger mb-3 shadow-subtle">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-heading font-bold text-base text-text-primary">
            Unable to load this chat view
          </h3>
          <p className="text-xs text-text-muted max-w-sm mt-1 mb-4 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred. Please refresh or retry.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button bg-brand-gradient text-white text-xs font-semibold shadow-brand hover:shadow-brand-lg transition-all scale-100 active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Retry View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

