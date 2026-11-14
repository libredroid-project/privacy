import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { DeletionPage } from "@/pages/deletion";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DeletionPage kind="data" />
  </StrictMode>,
);
