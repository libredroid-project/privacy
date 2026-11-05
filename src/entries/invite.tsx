import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { InvitePage } from "@/pages/invite";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InvitePage />
  </StrictMode>,
);
