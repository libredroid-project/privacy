import type { ReactNode } from "react";
import { Mail } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const SUPPORT_MAIL = "support@kodaserv.eu";

type Kind = "account" | "data";

function mailto(subject: string, body: string): string {
  return `mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const ACCOUNT_MAIL = mailto(
  "KodaHosting account deletion request",
  `Hello KodaHosting,

I want to delete my KodaHosting account and all associated data.

Account email:
Minecraft username (if linked):

Please confirm when the account and data are deleted.
`,
);

const DATA_MAIL = mailto(
  "KodaHosting data deletion request",
  `Hello KodaHosting,

I want to delete some of my KodaHosting data but keep my account.

Account email:
Minecraft username (if linked):
Data to delete:

Please confirm when the data is deleted.
`,
);

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-medium tracking-[-0.025em] text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-400">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-0.5 font-mono text-xs text-brand-ink tabular">
            0{index + 1}.
          </span>
          <span className="text-zinc-300">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-[#09090b]">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-6 sm:px-5">
          <div className="font-display text-sm font-medium text-white">{label}</div>
          <div className="text-sm leading-6 text-zinc-400">{value}</div>
        </div>
      ))}
    </div>
  );
}

const RETENTION: [string, string][] = [
  ["Contract and server records", "6 years (2,190 days) under German contract law."],
  ["Security and abuse evidence", "180 days, for security and abuse prevention."],
  [
    "Billing and payment records",
    "10 years (3,650 days), only if billing records exist. KodaHosting is free, so normally none exist.",
  ],
  ["Backup copies", "Until the backup retention cycle ends."],
  ["Aggregate extension downloads", "12 months. These counts are not linked to an account."],
];

export function DeletionPage({ kind }: { kind: Kind }) {
  const isAccount = kind === "account";

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader />

      <main className="relative flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="resend-dot-grid pointer-events-none absolute inset-x-0 top-0 h-[380px] opacity-55"
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:px-6">
          <div className="max-w-3xl">
            <p className="font-mono text-xs text-brand-ink">Privacy & data control</p>
            <h1 className="resend-title mt-3 font-display text-3xl font-medium tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              {isAccount
                ? "Delete your KodaHosting account"
                : "Delete your KodaHosting data without deleting your account"}
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-zinc-400">
              {isAccount
                ? "You can remove your KodaHosting account from the app or by email. This page explains what is deleted, what stays on your phone and what we must keep by law."
                : "You do not have to delete your whole account to remove data. Delete individual items in the app, or ask us to remove specific data while keeping your login."}
            </p>

            <div className="resend-glass-panel mt-8 rounded-3xl p-6 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-base font-medium text-white">
                    Start a deletion request
                  </p>
                  <p className="mt-1.5 max-w-xl text-sm leading-6 text-zinc-400">
                    Send it from the email address linked to your account. If you cannot access that
                    inbox, include your Minecraft username so we can verify the request.
                  </p>
                </div>
                <a
                  href={isAccount ? ACCOUNT_MAIL : DATA_MAIL}
                  className="koda-btn-black h-10 shrink-0 px-5 text-sm whitespace-nowrap"
                >
                  <Mail className="size-4 text-brand-ink" />
                  Request by email
                </a>
              </div>
              <p className="mt-5 border-t border-white/[0.06] pt-4 text-xs leading-5 text-zinc-500">
                We process requests within 30 days and may ask for proof that you own the account.
                If you are under 16, your legal guardian can send the request for you.
              </p>
            </div>
          </div>

          <article className="mt-14 max-w-3xl space-y-12">
            {isAccount ? (
              <>
                <Section title="Delete your account in the app">
                  <Steps
                    items={[
                      "Open KodaHosting on the Android device where you are signed in.",
                      "Open Settings, then Account.",
                      "Tap Delete Account and confirm.",
                    ]}
                  />
                  <p>
                    This removes your login from the device and clears your account profile. Your
                    servers, worlds and files stay on the phone and keep running. It does not delete
                    your server data or the device record. Use Request full data deletion for that.
                  </p>
                </Section>

                <Section title="Delete your account and all data">
                  <Steps
                    items={[
                      "Open Settings, then Account.",
                      "Tap Request full data deletion and confirm.",
                      "An admin reviews the request. You get a notification and an email when it is processed.",
                    ]}
                  />
                  <p>
                    After approval, we delete your account and the personal data linked to it. Your
                    local server files stay on the phone. Delete the server in the app or uninstall
                    the app if you want those files gone too.
                  </p>
                </Section>

                <Section title="What is deleted">
                  <Rows
                    rows={[
                      [
                        "Account and login",
                        "Email address, authentication record, Minecraft username and UUID, nickname, permissions, public key and 2FA settings.",
                      ],
                      [
                        "Device record",
                        "App UUID, device token, device model, OS version, app version, RAM, battery, network type and screen resolution.",
                      ],
                      [
                        "Server records",
                        "Servers are removed from KodaHosting and marked deleted. They no longer appear in your account, the dashboard or public lists.",
                      ],
                      [
                        "Notifications",
                        "Read state and mute settings for the in-app inbox.",
                      ],
                      [
                        "Support tickets",
                        "Your reporter ID is replaced with “deleted”. Ticket content can stay for support history without a link to you. Ask us if you want the content removed as well.",
                      ],
                      [
                        "Published extensions",
                        "Tell us in the request if you published extensions. We remove the developer profile, listings and packages unless we need to keep a record for legal reasons.",
                      ],
                    ]}
                  />
                </Section>

                <Section title="What stays on your phone">
                  <p>
                    Server files, worlds, plugins, configurations and backups are stored on your
                    device, not on our servers. A web request cannot delete them. Delete the server
                    in the app under Server, Settings, Delete server, or uninstall the app and remove
                    the server folder.
                  </p>
                </Section>
              </>
            ) : (
              <>
                <Section title="Delete individual data in the app">
                  <Rows
                    rows={[
                      [
                        "A server",
                        "Open the server, open its settings and choose Delete server. This removes it from KodaHosting and deletes its local files on that device.",
                      ],
                      [
                        "Files",
                        "Open Files, then Trash. Delete items or empty the trash. Deleted files stay in the trash for seven days.",
                      ],
                      [
                        "Notifications",
                        "Open the inbox and delete one message or all messages. Read state and mutes are removed when you delete the account.",
                      ],
                      [
                        "Profile picture",
                        "Remove your picture in Account in the app or the web dashboard. The file is removed from storage.",
                      ],
                      [
                        "A support ticket",
                        "Email us. We delete the ticket content unless it is needed for an open case or a legal obligation.",
                      ],
                      [
                        "A published extension",
                        "Email us from the developer account. We remove the listing and the package unless we need to keep a record for legal reasons.",
                      ],
                    ]}
                  />
                </Section>

                <Section title="Delete data but keep your account">
                  <p>
                    Email us and tell us what to remove: support tickets, server records,
                    notification history, profile data or extension listings. We verify that the
                    request comes from the account email, delete what is not legally required and
                    confirm by email.
                  </p>
                  <p>
                    Your login stays active. You can keep using KodaHosting after the selected data
                    is removed.
                  </p>
                </Section>

                <Section title="What stays on your phone">
                  <p>
                    Server files, worlds, plugins, configurations and backups are stored on your
                    device. We cannot delete them remotely. Remove them in the app or uninstall the
                    app and delete the server folder.
                  </p>
                </Section>
              </>
            )}

            <Section title="What we may keep">
              <p>
                Some records must be kept by law or for security. They are stored in a separate,
                access-restricted table and deleted automatically when the deadline ends.
              </p>
              <Rows rows={RETENTION} />
              <p>
                We also keep a record that the deletion request was made and completed, so we can
                show that we handled it.
              </p>
            </Section>

            <Section title="Questions">
              <p>
                Write to{" "}
                <a
                  href={`mailto:${SUPPORT_MAIL}`}
                  className="font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-brand"
                >
                  {SUPPORT_MAIL}
                </a>
                . Include the email address on your account and your Minecraft username if one is
                linked. Never send your password or device token.
              </p>
              <p>
                {isAccount ? (
                  <>
                    Only want to remove some data and keep your account?{" "}
                    <a
                      href="/data-deletion"
                      className="font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-brand"
                    >
                      Use the data deletion page
                    </a>
                    .
                  </>
                ) : (
                  <>
                    Want to delete the account as well?{" "}
                    <a
                      href="/account-deletion"
                      className="font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-brand"
                    >
                      Use the account deletion page
                    </a>
                    .
                  </>
                )}
              </p>
            </Section>

            <p className="border-t border-white/[0.06] pt-6 font-mono text-xs text-zinc-500">
              Last updated 14 November 2026. KodaHosting is not an official Minecraft product and is
              not approved by or associated with Mojang or Microsoft.
            </p>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
