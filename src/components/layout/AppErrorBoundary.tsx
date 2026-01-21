import type { ReactNode } from "react";
import { Component } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[AppErrorBoundary]", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background px-6 py-16 text-center">
        <div className="mx-auto max-w-sm space-y-3">
          <div className="text-2xl font-semibold text-foreground">Something went wrong</div>
          <div className="text-sm text-muted-foreground">
            The app hit an unexpected error. Please reload.
          </div>
          <Button type="button" className="h-11 w-full" onClick={this.handleReload}>
            Reload
          </Button>
          {import.meta.env?.DEV && this.state.error?.message ? (
            <div className="pt-3 text-xs text-muted-foreground">
              {this.state.error.message}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}
