import { createRoot } from "react-dom/client";
import App from "./App";
import { createMsalAuth, type AuthProvider } from "./auth";
import "./style.css";

declare global {
  interface Window {
    __TEST_AUTH__?: AuthProvider;
  }
}

async function start() {
  // Only the dev server (e2e) honours an injected provider; production builds drop this branch.
  const auth = import.meta.env.DEV && window.__TEST_AUTH__ ? window.__TEST_AUTH__ : await createMsalAuth();
  createRoot(document.getElementById("root")!).render(
    <App auth={auth} />,
  );
}
void start();
