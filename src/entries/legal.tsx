import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { LegalPage } from "@/pages/legal";

const page = (document.getElementById("root")?.dataset.page || "privacy") as
  | "privacy"
  | "tos"
  | "impressum";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LegalPage page={page} />
  </StrictMode>,
);
