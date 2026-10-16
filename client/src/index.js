import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/dashboard.css";
import App from "./App";
import "./styles/mobile-layout.css";
import { persistentReads } from "./services/persistentReads";


async function start() {
  await persistentReads.initialize();
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
}
start();
