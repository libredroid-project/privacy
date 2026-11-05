import { useRef } from "react";
import { useGoogleButton } from "@/lib/google";

export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useGoogleButton(container, onCredential);
  return <div ref={container} className="flex min-h-10 justify-center" />;
}
