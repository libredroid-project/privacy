import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Copy, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { copyText } from "@/lib/format";
import { cn } from "@/lib/utils";

const PLAY_URL = "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost";

const FAQ = [
  {
    q: "How many servers can I host at the same time?",
    a: "Each account can host a maximum of six (6) servers simultaneously. This limit applies across all server types (Minecraft servers and databases combined) and is in place to ensure fair use of the shared VPS proxy infrastructure. Creating multiple accounts to bypass this limit is not allowed and may result in a permanent ban.",
  },
  {
    q: "Does my phone need to be on 24/7?",
    a: "Your server runs only while the KodaHosting app is active on your device. When the app is in the foreground, players can join freely. In the background, the server stays alive with reduced priority. When you close the app, the server stops. You can also hibernate servers to free up resources without deleting them.",
  },
  {
    q: "Can players join when my phone is asleep?",
    a: "When your phone's screen is off, Android may put the app into a deep sleep state depending on your battery settings. To keep the server accessible, disable battery optimization for KodaHosting in your Android settings, or keep the device plugged in. Players connecting through our VPS proxy will automatically reconnect once your device wakes up.",
  },
  {
    q: "How much RAM do I need?",
    a: "For a small survival server with 5–10 players, 1–2 GB of RAM is sufficient. For larger communities or heavy mod packs, allocate 3–4 GB. The app automatically caps your RAM allocation based on your device's available memory to prevent system instability. You can adjust the allocation at any time from the server management panel.",
  },
  {
    q: "Is my home IP really hidden?",
    a: "Yes. All player connections are routed through our central VPS infrastructure using secure reverse proxy tunnels (Bore / FRP). Players only ever see the IP address of our proxy server, never your home IP. This means your network remains completely private and protected from DDoS attacks or targeted harassment.",
  },
  {
    q: "What happens if my internet disconnects?",
    a: "If your internet connection drops, players will be disconnected from the server. The server itself continues running on your device, and once your connection is restored, the proxy tunnel reconnects automatically and players can rejoin. World data is always saved locally on your device, so no progress is lost during disconnects.",
  },
  {
    q: "Can I manage my server from a computer?",
    a: "Yes. The web dashboard at host.kodanetwork.eu lets you manage all your servers from any browser. The Server Manager gives you access to the live console (where you can execute commands and see server output in real-time) and the file management view (where you can upload worlds, install maps, and edit configuration files). Start, stop, restart, and other server lifecycle actions happen in the app directly. The dashboard communicates with your device through Supabase realtime updates.",
  },
  {
    q: "Will hosting damage my phone?",
    a: "Running a Minecraft server is computationally intensive and will generate heat and consume battery. We recommend keeping your device plugged in while hosting, placing it on a cool surface, and avoiding prolonged use in direct sunlight. The app includes a live performance monitor so you can track CPU and RAM usage. We are not liable for hardware damage, overheating, or battery degradation resulting from intensive use, as outlined in our Terms of Service.",
  },
  {
    q: "Do I need to pay anything?",
    a: "No. KodaHosting is completely free, with no purchase, no subscription and no premium features. The entire app, all engines, the VPS proxy infrastructure and the web dashboard are available to everyone at no cost. If you want to support development, there is an optional Ko-fi link in the app, but it is entirely voluntary and unlocks nothing.",
  },
  {
    q: "How is this sustainable without charging users?",
    a: "KodaHosting is a hobby project by a single developer. Server infrastructure costs are kept low through efficient use of resources, and voluntary Ko-fi donations from supporters help cover ongoing hosting costs. There is no business model that requires charging users.",
  },
];

const DEVICES = [
  { src: "/assets/devices/xiaomi-17-ultra.jpg", alt: "Xiaomi 17 Ultra", caption: "Xiaomi 17 Ultra", note: "the phone the network runs on" },
  { src: "/assets/devices/pixel-10-pro.jpg", alt: "Pixel 10 Pro", caption: "Pixel 10 Pro" },
  { src: "/assets/devices/oppo-find-x9.jpg", alt: "OPPO Find X9", caption: "OPPO Find X9" },
  { src: "/assets/devices/xiaomi-14t-pro.jpg", alt: "Xiaomi 14T Pro", caption: "Xiaomi 14T Pro" },
];

const ENGINES = [
  {
    name: "Paper",
    note: "Plugins and a stable API. The default for most worlds.",
    href: "https://papermc.io/",
    logo: "/assets/engines/paper.png",
  },
  {
    name: "Fabric",
    note: "Light mods and quick updates.",
    href: "https://fabricmc.net/",
    logo: "/assets/engines/fabric-big.png",
  },
  {
    name: "Forge",
    note: "The classic loader for big modpacks.",
    href: "https://minecraftforge.net/",
    logo: "/assets/engines/forge.png",
  },
  {
    name: "NeoForge",
    note: "The newer fork for modern modpacks.",
    href: "https://neoforged.net/",
    logo: "/assets/engines/neoforge.png",
  },
  {
    name: "Vanilla",
    note: "The original server, no mods.",
    href: "https://www.minecraft.net/",
    logo: "/assets/engines/vanilla.png",
  },
  {
    name: "Pumpkin",
    note: "A fast server written in Rust.",
    href: "https://pumpkinmc.org/",
    logo: "/assets/engines/pumpkin.png",
  },
];

const SCREENS = [
  {
    id: "dashboard",
    label: "Dashboard",
    src: "/assets/app/dashboard.webp",
    alt: "The KodaHosting app showing a server dashboard with uptime, join address and the start, stop and restart controls",
  },
  {
    id: "console",
    label: "Console",
    src: "/assets/app/console.webp",
    alt: "The KodaHosting app showing the live Minecraft console and the command field",
  },
  {
    id: "files",
    label: "Files",
    src: "/assets/app/files.webp",
    alt: "The KodaHosting app showing the server file browser",
  },
];

function Surface({
  children,
  className,
  ui,
}: {
  children: ReactNode;
  className?: string;
  ui?: boolean;
}) {
  return (
    <div data-ui={ui || undefined} className={cn("rounded-2xl bg-card", className)}>
      {children}
    </div>
  );
}

function SectionIntro({
  title,
  children,
  align = "center",
}: {
  title: string;
  children: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "")}>
      <h2 className="text-4xl font-medium tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      <p className={cn("mt-5 text-lg leading-8 text-muted-foreground", align === "center" ? "mx-auto max-w-xl" : "max-w-xl")}>
        {children}
      </p>
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!(await copyText(value))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="min-w-0 text-[clamp(1.35rem,2.4vw,2rem)] leading-tight font-medium tracking-[-0.03em] break-all">
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 rounded-full"
        onClick={copy}
        aria-label={`Copy ${value}`}
      >
        {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

function Tilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      el.style.transform = `perspective(1400px) rotateX(${y.toFixed(2)}deg) rotateY(${x.toFixed(2)}deg)`;
    };
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      x = ((event.clientX - rect.left) / rect.width - 0.5) * 2.5;
      y = -((event.clientY - rect.top) / rect.height - 0.5) * 2.5;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const leave = () => {
      x = 0;
      y = 0;
      el.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg)";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="will-change-transform">
      {children}
    </div>
  );
}

function Phone({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("block rounded-[2.25rem]", className)}
    />
  );
}

function PhoneGallery() {
  const [active, setActive] = useState(0);
  const screen = SCREENS[active];

  return (
    <div className="flex flex-col items-center">
      <Tilt>
        <div className="w-[280px] sm:w-[360px] lg:w-[400px]">
          <Phone key={screen.id} src={screen.src} alt={screen.alt} className="phone-in w-full" />
        </div>
      </Tilt>

      <div className="mt-7 flex gap-1 rounded-full bg-card p-1">
        {SCREENS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            aria-pressed={index === active}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors duration-200",
              index === active
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScrollHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(false);
  const [reduced, setReduced] = useState(false);
  const showSplit = split || reduced;

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reducedMotion);
    if (reducedMotion) return;

    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    let frame = 0;
    let active = false;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      stage.style.setProperty("--p", progress.toFixed(4));
      const next = progress > 0.28;
      if (next !== active) {
        active = next;
        setSplit(next);
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} className={cn("relative", reduced ? "hero-reduced" : "h-[210svh]")}>
      <div ref={stageRef} className="hero-stage sticky top-0 h-svh overflow-hidden">
        {!showSplit ? (
        <div
          className="hero-center absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
        >
          <h1 className="text-[clamp(2.9rem,9vw,8.5rem)] leading-[0.9] font-semibold tracking-[-0.045em] text-balance">
            <span className="hero-line">
              <span style={{ "--delay": "120ms" } as CSSProperties}>Host Minecraft</span>
            </span>
            <span className="hero-line">
              <span style={{ "--delay": "240ms" } as CSSProperties}>from your phone.</span>
            </span>
          </h1>

          <p
            className="fade-up mx-auto mt-8 max-w-xl text-lg leading-8 text-muted-foreground"
            style={{ "--delay": "360ms" } as CSSProperties}
          >
            A real Minecraft server on the device in your pocket. Friends join with an address, the
            console lives in the browser.
          </p>

          <div
            className="fade-up mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-7"
            style={{ "--delay": "480ms" } as CSSProperties}
          >
            <Button asChild size="lg" className="h-12 rounded-full px-7">
              <a href={PLAY_URL}>
                <Play className="size-4" />
                Get it on Google Play
              </a>
            </Button>
            <a href="#how" className="link-arrow inline-flex items-center gap-2 text-base font-medium">
              How it works
              <ArrowRight className="size-4" />
            </a>
          </div>

          <a
            href="#engines"
            className="hero-cue absolute bottom-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Scroll
            <ArrowDown className="size-4" />
          </a>
        </div>
        ) : (
        <div
          className="hero-split absolute inset-0 mx-auto flex max-w-6xl flex-col items-center justify-center gap-6 px-4 lg:flex-row lg:justify-between lg:gap-10"
        >
          <div className="hero-left w-full text-center lg:w-[48%] lg:text-left">
            <p className="text-[clamp(2rem,4.2vw,4rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
              Host Minecraft
              <br />
              from your phone.
            </p>
            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 lg:mx-0">
              A real Minecraft server on the device in your pocket. Friends join with an address, the
              console lives in the browser.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Button asChild size="lg" className="h-11 rounded-full px-6">
                <a href={PLAY_URL}>
                  <Play className="size-4" />
                  Get it on Google Play
                </a>
              </Button>
              <a href="#how" className="link-arrow inline-flex items-center gap-2 text-sm font-medium">
                How it works
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>

          <div className="hero-video w-[190px] shrink-0 sm:w-[240px] lg:w-[40%] lg:max-w-[360px]">
            <video
              src="/assets/app/terminal.mp4"
              poster="/assets/app/terminal-poster.webp"
              autoPlay={!reduced}
              muted
              loop
              playsInline
              preload="metadata"
              controls={reduced}
              aria-label="A screen recording of the KodaHosting console starting a Minecraft server"
              className="w-full rounded-[2rem] bg-black"
            />
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionIntro title="Built the way you actually play">
            Install the app, open a world, send the address. Everything else happens on the phone.
          </SectionIntro>
        </Reveal>

        <div className="mt-16 grid gap-5 lg:grid-cols-12">
          <Reveal delay={0} className="lg:col-span-7">
            <Surface className="h-full p-8 sm:p-10">
              <h3 className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">Six engines, one installer</h3>
              <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
                Paper, Fabric, Forge, NeoForge, vanilla and Pumpkin. The app fetches the build and the
                matching Java runtime, on the device, without a PC.
              </p>
              <div className="mt-9 grid grid-cols-2 gap-x-8 gap-y-6">
                {ENGINES.map((engine) => (
                  <div key={engine.name}>
                    <div className="text-2xl font-medium tracking-tight">{engine.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{engine.note}</div>
                  </div>
                ))}
              </div>
            </Surface>
          </Reveal>

          <Reveal delay={90} className="lg:col-span-5">
            <Surface className="h-full p-8 sm:p-10" ui>
              <h3 className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">It sleeps when nobody plays</h3>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Servers hibernate instead of running the battery empty. The address stays, the world is
                put away, and the next player wakes it in about twenty seconds.
              </p>
              <div className="mt-10">
                <div className="flex items-end justify-between">
                  <span className="text-6xl font-medium tracking-[-0.04em]">82%</span>
                  <span className="pb-1 text-sm text-muted-foreground">charging</span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[82%] rounded-full bg-emerald-500" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">battery, one world asleep</p>
              </div>
            </Surface>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-12">
            <Surface className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[5fr_7fr] lg:items-center">
              <div>
                <h3 className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">The console is included</h3>
                <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
                  KodaDash opens the live log, players, files and settings in a browser. It ships with
                  the app, with no plan to buy and no feature held back.
                </p>
              </div>
              <div className="grid gap-3">
                {[
                  { title: "Live console", text: "Read the log and send a command from any browser." },
                  { title: "Players and moderation", text: "See who is online, op, kick or ban from the panel." },
                  { title: "Files and backups", text: "Browse the server folder, edit configs, pull a backup." },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl bg-muted/40 px-5 py-4">
                    <div className="text-base font-medium">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</div>
                  </div>
                ))}
              </div>
            </Surface>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function AddressSection() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-end gap-10 lg:grid-cols-[5fr_7fr]">
        <Reveal>
          <div>
            <h2 className="text-4xl font-medium tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
              The address is the product.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">
              Create a server, pick a name, and it answers under a normal subdomain in the vanilla
              server list. No port to remember, no mod on the client, no account needed to join.
            </p>
            <ul className="mt-7 space-y-3 text-base">
              {[
                "A normal address friends can type",
                "Bedrock players get a port",
                "No client mod, no account to join",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-muted-foreground">
                  <Check className="size-4 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal variant="scale" delay={90}>
          <Surface ui className="p-8 sm:p-10">
            <div className="text-sm text-muted-foreground">Join address</div>
            <div className="mt-2">
              <CopyValue value="koda-world.kodanetwork.eu" />
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <div className="text-sm text-muted-foreground">Server name</div>
                <div className="mt-1 text-lg font-medium">Koda World</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Bedrock port</div>
                <div className="mt-1 text-lg font-medium">41230</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Version</div>
                <div className="mt-1 text-lg font-medium">1.21.11</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Engine</div>
                <div className="mt-1 text-lg font-medium">Paper</div>
              </div>
            </div>
          </Surface>
        </Reveal>
      </div>
    </section>
  );
}

function ControlSection() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[5fr_7fr]">
        <Reveal>
          <div>
            <h2 className="text-4xl font-medium tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
              Read it, or take it over.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
              Restart it, send a command, kick a player or pull a backup. Guests can be handed the
              same controls with an expiring invite that asks them to sign in first.
            </p>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              The console and the file browser are the same screens you use on the phone. Nothing in
              this picture is a mock-up.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Button asChild size="lg" className="h-12 rounded-full px-7">
                <a href="/dashboard">Open the dashboard</a>
              </Button>
              <a href="/docs" className="link-arrow inline-flex items-center gap-2 text-base font-medium">
                Read the docs
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal variant="scale" delay={100}>
          <Phone
            src="/assets/app/console.webp"
            alt="The live console in the KodaHosting app, with the command field and the server output"
            className="mx-auto w-[280px] sm:w-[360px]"
          />
        </Reveal>
      </div>
    </section>
  );
}

function EngineMarquee() {
  return (
    <section id="engines" className="overflow-hidden py-14 sm:py-20" aria-label="Server engines">
      <h2 className="sr-only">Server engines</h2>
      <div className="marquee-mask">
        <div className="marquee-track gap-4">
          {[0, 1].map((group) => (
            <div key={group} className="flex shrink-0 gap-4 pr-4" aria-hidden={group === 1}>
              {ENGINES.map((engine) => (
                <a
                  key={engine.name}
                  href={engine.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={group === 1 ? -1 : undefined}
                  className="group flex w-[300px] shrink-0 items-start gap-4 px-2 py-2 transition-opacity hover:opacity-80"
                >
                  <img src={engine.logo} alt="" className="size-12 shrink-0 object-contain" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-lg font-medium">
                      {engine.name}
                      <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{engine.note}</p>
                  </div>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionIntro title="Plainly, a phone in a room">
            One developer, in school, building this around a phone instead of around a server room.
            Parts of the site were drafted with an AI language model and reviewed by hand; the app,
            the networking and everything that executes are not.
          </SectionIntro>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {DEVICES.map((device) => (
            <figure key={device.src} className="group">
              <div className="overflow-hidden rounded-xl bg-card">
                <img
                  src={device.src}
                  alt={device.alt}
                  loading="lazy"
                  className="photo-drift aspect-[3/4] w-full object-cover grayscale transition-[filter] duration-700 group-hover:grayscale-0"
                />
              </div>
              <figcaption className="mt-3 text-sm font-medium">{device.caption}</figcaption>
              {device.note ? <div className="mt-0.5 text-sm text-muted-foreground">{device.note}</div> : null}
            </figure>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm leading-6 text-muted-foreground">
          Device photographs from Wikimedia Commons, shown for identification only; all rights belong
          to the respective manufacturers. The database, the tunnel server and the law texts sit in
          Germany.
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<string | null>(FAQ[0]?.q ?? null);

  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionIntro title="Common questions">
            Short answers to what people ask before they install. Everything else is in the
            documentation.
          </SectionIntro>
        </Reveal>
        <Reveal delay={80} className="mt-8">
          <div className="space-y-3">
            {FAQ.map((item) => {
              const isOpen = open === item.q;
              return (
                <div key={item.q} className="rounded-xl bg-card">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : item.q)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 p-5 text-left text-lg font-medium"
                  >
                    {item.q}
                    <Plus
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                        isOpen && "rotate-45",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-[62ch] px-5 pb-5 text-base leading-7 text-muted-foreground">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="px-4 py-20 text-center sm:py-28">
      <Reveal>
        <h2 className="mx-auto max-w-4xl text-4xl font-medium tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
          Have a phone? You have a server.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
          Install the app, open a world and send the address. The console is in the browser.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-7">
          <Button asChild size="lg" className="h-12 rounded-full px-7">
            <a href={PLAY_URL}>
              <Play className="size-4" />
              Get it on Google Play
            </a>
          </Button>
          <a href="/dashboard" className="link-arrow inline-flex items-center gap-2 text-base font-medium">
            Open the dashboard
            <ArrowRight className="size-4" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function ScreensSection() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionIntro title="Every screen, in the app">
            Dashboard, console and files, the same three screens you use on the phone.
          </SectionIntro>
        </Reveal>
        <div className="mt-12">
          <PhoneGallery />
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-clip">
      <SiteHeader />
      <main>
        <ScrollHero />
        <EngineMarquee />
        <HowItWorks />
        <AddressSection />
        <ControlSection />
        <ScreensSection />
        <AboutSection />
        <FaqSection />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
