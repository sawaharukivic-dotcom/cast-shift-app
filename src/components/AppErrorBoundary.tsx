import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { logger } from "../utils/logger";

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.error) {
      if (import.meta.env.DEV) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h2 className="font-semibold text-red-700">アプリ内エラー</h2>
            <pre className="mt-2 text-xs text-red-800 whitespace-pre-wrap">
              {this.state.error.name}: {this.state.error.message}
            </pre>
            {this.state.error.stack && (
              <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            )}
          </div>
        );
      }
      return <div>アプリ内エラーが発生しました。</div>;
    }
    return this.props.children;
  }
}
