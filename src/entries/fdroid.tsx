import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { FdroidPage } from "@/pages/fdroid";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FdroidPage />
  </StrictMode>,
);
