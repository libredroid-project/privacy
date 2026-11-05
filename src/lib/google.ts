import { useEffect, useRef, type RefObject } from "react";
import { GOOGLE_CLIENT_ID } from "@/lib/supabase";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        ux_mode?: "popup" | "redirect";
        auto_prompt?: boolean;
        locale?: string;
        callback: (response: GoogleCredentialResponse) => void;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: string;
          shape?: "rectangular" | "pill" | "circle" | "square";
          theme?: "outline" | "filled_blue" | "filled_black";
          text?: string;
          size?: "large" | "medium" | "small";
          logo_alignment?: "left" | "center";
          width?: number;
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src^="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=en";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in failed to load."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Renders the official Google button into the given container. The credential is
 * exchanged for a Supabase session with signInWithIdToken in the caller.
 */
export function useGoogleButton(
  containerRef: RefObject<HTMLDivElement | null>,
  onCredential: (credential: string) => void,
  enabled = true,
) {
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: "popup",
          auto_prompt: false,
          locale: "en",
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
        });
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "filled_black",
          text: "signin_with",
          size: "large",
          logo_alignment: "left",
          width: 320,
        });
      })
      .catch(() => {
        // The email form stays usable; no need to shout about a blocked script.
      });

    return () => {
      cancelled = true;
    };
  }, [containerRef, enabled]);
}
