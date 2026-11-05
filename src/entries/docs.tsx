import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { DocsPage } from "@/pages/docs";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocsPage />
  </StrictMode>,
);
