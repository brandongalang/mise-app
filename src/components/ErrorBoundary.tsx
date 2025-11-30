'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
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
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-terracotta" />
                    </div>
                    <h1 className="font-display text-3xl font-bold text-espresso mb-3">
                        Something went wrong
                    </h1>
                    <p className="text-latte mb-8 max-w-md">
                        We're sorry, but the application encountered an unexpected error.
                        Please try reloading the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 bg-terracotta text-white px-6 py-3 rounded-xl font-medium hover:bg-terracotta-dark transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reload Application
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mt-8 p-4 bg-red-50 rounded-lg text-left max-w-2xl w-full overflow-auto">
                            <p className="font-mono text-sm text-red-800">
                                {this.state.error.toString()}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
