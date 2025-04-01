import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // Log error to analytics service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg"
        >
          <FiAlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Something went wrong
          </h3>
          <p className="text-red-600 text-center mb-4">
            {this.props.errorMessage || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 