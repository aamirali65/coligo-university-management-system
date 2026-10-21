import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/shared/error-state";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches render errors so a single broken view cannot blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface to the console for debugging during development.
    console.error("Coligo render error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <ErrorState
            title="This section failed to render"
            description="An unexpected error occurred. Reloading the page usually resolves it."
            onRetry={() => this.setState({ hasError: false })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
