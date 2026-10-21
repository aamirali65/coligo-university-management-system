import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./providers";
import { ErrorBoundary } from "./ErrorBoundary";
import { AppRoutes } from "./router";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProviders>
          <AppRoutes />
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
