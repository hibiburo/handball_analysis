import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  /** エラー画面の「データを書き出す」ボタンの処理。フェーズ5で全データの書き出しをつなぐ */
  onExportData?: () => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * 画面全体の予期しないエラーを受け止める（development-guidelines.md 2.5）。
 * データは IndexedDB に残っているため、まず書き出してから再読み込みできるようにする。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-bold">予期しないエラーが発生しました</h1>
        <p className="text-muted">
          記録したデータはこの端末に保存されています。念のためデータを書き出してから、ページを再読み込みしてください。
        </p>
        <pre className="overflow-x-auto rounded-lg bg-surface p-3 text-xs text-muted">{this.state.error.message}</pre>
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-11 rounded-lg border border-border bg-surface px-4 font-medium disabled:opacity-40"
            disabled={!this.props.onExportData}
            onClick={this.props.onExportData}
          >
            データを書き出す
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg bg-primary px-4 font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }
}
