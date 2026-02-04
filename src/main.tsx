import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize error tracking and analytics before React render
import { initErrorTracking } from "./lib/errorTracking";
import { initAnalytics } from "./lib/analytics";

// Initialize Sentry first to catch any initialization errors
initErrorTracking();

// Initialize PostHog analytics
initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
