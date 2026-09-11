import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { startSyncManager } from "./utils/syncManager";

// Service worker registration
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// Start background offline sync manager safely
try {
  startSyncManager();
} catch (e) {
  console.warn("Sync manager start failed:", e);
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application render error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#080808",
            color: "#f8fafc",
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 16px",
          }}
        >
          <div
            style={{
              maxWidth: 540,
              width: "100%",
              background: "rgba(18, 20, 18, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 24,
              padding: "36px 28px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 14 }}>🧠⚠️</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 10px", color: "#ffffff" }}>
              NeuroAid Application Notice
            </h1>
            <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 24px" }}>
              An unexpected issue occurred while rendering the page. You can safely reload the app or reset your local session.
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: "linear-gradient(135deg, #c8f135, #a3e635)",
                  color: "#080808",
                  border: "none",
                  borderRadius: 14,
                  padding: "12px 22px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ↻ Reload Application
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 14,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reset Session & Home
              </button>
            </div>

            {this.state.error && (
              <details style={{ textAlign: "left", marginTop: 16 }}>
                <summary style={{ fontSize: 12, color: "#64748b", cursor: "pointer" }}>
                  Technical error details
                </summary>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: 10,
                    color: "#f87171",
                    fontSize: 11,
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error("Root element #root not found in document.");
}

