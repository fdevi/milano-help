import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";

const root = document.getElementById("root");
if (!root) throw new Error("App root is missing");
createRoot(root).render(
  <React.StrictMode>
    <HelmetProvider><App /></HelmetProvider>
  </React.StrictMode>
);
