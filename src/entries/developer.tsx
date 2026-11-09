import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { DeveloperPage } from "@/pages/developer";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DeveloperPage />
  </StrictMode>,
);
