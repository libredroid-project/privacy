import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { ResetPage } from "@/pages/reset";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ResetPage />
  </StrictMode>,
);
