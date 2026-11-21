import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, ExternalLink, QrCode, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost";

interface QrSvgData {
  size: number;
  path: string;
}

/**
 * Generates a compact, standards-compliant SVG path for a scannable QR code
 * with a 4-module quiet zone so every Android camera scanner locks on immediately.
 */
function buildQrSvgPath(value: string, quietZone = 4): QrSvgData {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const modules = qr.modules;
  const count = modules.size;
  const parts: string[] = [];

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (modules.get(row, col)) {
        const x = col + quietZone;
        const y = row + quietZone;
        parts.push(`M${x},${y}h1v1h-1z`);
      }
    }
  }

  return {
    size: count + quietZone * 2,
    path: parts.join(""),
  };
}

export function PlayDownloadFab() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrData = useMemo(() => buildQrSvgPath(GOOGLE_PLAY_URL, 4), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(GOOGLE_PLAY_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Scan QR code to download KodaHosting on Google Play"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="play-qr-fab"
        className="koda-btn-black fixed right-5 bottom-5 z-40 h-11 gap-2.5 px-3.5 text-[13.5px] shadow-[0_12px_36px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.12)] sm:right-6 sm:bottom-6 sm:px-4"
      >
        <QrCode className="size-4 shrink-0 text-brand-ink" aria-hidden="true" />
        <span className="hidden sm:inline whitespace-nowrap">Download App</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          noBlur
          className="border border-white/10 bg-[#09090b] text-zinc-100 sm:max-w-[380px]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.02em] text-white">
              <Smartphone className="size-4 text-brand-ink" aria-hidden="true" />
              Get KodaHosting on Android
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-5 text-zinc-400">
              Scan this QR code with your Android camera to install KodaHosting directly from Google
              Play.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white p-3.5 shadow-[0_14px_38px_rgba(0,0,0,0.55)] ring-1 ring-white/15">
              <svg
                viewBox={`0 0 ${qrData.size} ${qrData.size}`}
                width={208}
                height={208}
                role="img"
                aria-label="QR code linking to KodaHosting on Google Play"
                shapeRendering="crispEdges"
                className="block h-[208px] w-[208px]"
              >
                <rect width={qrData.size} height={qrData.size} fill="#ffffff" />
                <path d={qrData.path} fill="#09090b" />
              </svg>
            </div>

            <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.08]">
              <span className="truncate font-mono text-[12px] text-zinc-300">
                eu.kodanetwork.mchost
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.08] px-2.5 py-1 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.14] hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-400" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    Copy link
                  </>
                )}
              </button>
            </div>

            <div className="flex w-full items-center justify-between gap-3 pt-1">
              <a
                href="/fdroid/"
                className="text-[12.5px] text-zinc-400 transition-colors hover:text-white"
              >
                Or install via F-Droid
              </a>
              <a
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="koda-btn-black h-9 gap-1.5 px-4 text-[13px] whitespace-nowrap"
              >
                Open Google Play
                <ExternalLink className="size-3.5 text-brand-ink" aria-hidden="true" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
