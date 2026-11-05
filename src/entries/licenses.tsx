import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { LicensesPage } from "@/pages/licenses";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LicensesPage />
  </StrictMode>,
);
