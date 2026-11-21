import { useState } from "react";
import { ArrowUpRight, Check, Copy, Download, ShieldCheck, Smartphone } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { copyText } from "@/lib/format";

const REPO_URL = "https://api.kodanetwork.eu/fdroid/repo";
const FINGERPRINT_RAW = "B11D3E8D251712F48FA6AEC74C4F5B12D56F9074047536C31B2278B40871C3A2";
const FINGERPRINT_DISPLAY =
  "B1:1D:3E:8D:25:17:12:F4:8F:A6:AE:C7:4C:4F:5B:12:D5:6F:90:74:04:75:36:C3:1B:22:78:B4:08:71:C3:A2";
const FDROID_DEEP_LINK = `fdroidrepos://api.kodanetwork.eu/fdroid/repo?fingerprint=${FINGERPRINT_RAW}`;
const DIRECT_APK_URL = "https://api.kodanetwork.eu/fdroid/repo/KodaHosting-8525.apk";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost";

function CopyField({
  label,
  value,
  copyValue,
  note,
}: {
  label: string;
  value: string;
  copyValue?: string;
  note?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!(await copyText(copyValue ?? value))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="resend-glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.07em] text-zinc-500 uppercase">
          {label}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="koda-btn-pill h-7 px-3 text-[11px] whitespace-nowrap"
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="size-3 text-emerald-400" />
          ) : (
            <Copy className="size-3 text-zinc-400" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-3 rounded-xl bg-black/80 px-3.5 py-3 font-mono text-xs leading-6 break-all text-zinc-200 select-all">
        {value}
      </div>
      {note ? <p className="mt-2.5 text-xs leading-5 text-zinc-500">{note}</p> : null}
    </div>
  );
}

const MANUAL_STEPS = [
  {
    num: "01",
    title: "Open F-Droid repositories",
    body: "Launch the F-Droid client on your Android device, go to Settings, then open Repositories.",
  },
  {
    num: "02",
    title: "Add the KodaHosting repository",
    body: "Tap the + button, paste the repository URL above, and optionally paste the SHA-256 signing fingerprint to verify packages automatically.",
  },
  {
    num: "03",
    title: "Install and receive updates",
    body: "Refresh your repository index, search for KodaHosting, and install. Future releases update straight through F-Droid without Google Play.",
  },
];

export function FdroidPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader />

      <main className="relative flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="resend-dot-grid pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-65"
        />

        <div className="relative mx-auto w-full max-w-5xl px-4 pt-28 pb-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-brand-ink">Official Android repository</p>
            <h1 className="resend-title mt-3 font-display text-3xl font-medium tracking-[-0.035em] sm:text-5xl">
              Install KodaHosting with F-Droid.
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-zinc-400">
              No Google account or Play Services required. Add the signed KodaHosting repository to
              F-Droid for verified updates, or download the APK directly to your Android phone or
              tablet.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={FDROID_DEEP_LINK}
                className="koda-btn-black h-11 px-5 text-sm whitespace-nowrap"
              >
                <Smartphone className="size-4 text-brand-ink" />
                Add to F-Droid
              </a>
              <a
                href={DIRECT_APK_URL}
                className="koda-btn-pill h-11 px-5 text-sm whitespace-nowrap"
              >
                <Download className="size-4 text-zinc-400" />
                Download APK directly
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-1.5 px-2 font-display text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Google Play
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <CopyField
              label="Repository URL"
              value={REPO_URL}
              note="Compatible with F-Droid, Droid-ify, Neo Store, and Obtainium."
            />
            <CopyField
              label="SHA-256 signing fingerprint"
              value={FINGERPRINT_DISPLAY}
              copyValue={FINGERPRINT_RAW}
              note="Verify this fingerprint inside F-Droid to confirm authentic KodaHosting builds."
            />
          </div>

          <section className="mt-16">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-brand-ink" />
              <h2 className="font-display text-lg font-medium tracking-[-0.02em] text-white">
                Manual setup in F-Droid
              </h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {MANUAL_STEPS.map((step) => (
                <div key={step.num} className="rounded-2xl bg-[#09090b] p-5">
                  <span className="font-mono text-xs text-brand-ink tabular">{step.num}</span>
                  <h3 className="mt-3 font-display text-base font-medium text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
