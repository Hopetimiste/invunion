import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadConfig } from "./lib/runtimeConfig";

// Load runtime config before rendering
loadConfig().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
