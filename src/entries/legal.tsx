import { mountPage } from "@/lib/mount-page";
import { LegalPage } from "@/pages/legal";

const page = (document.getElementById("root")?.dataset.page || "privacy") as
  | "privacy"
  | "tos"
  | "impressum";

mountPage(<LegalPage page={page} />);
