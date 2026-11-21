export type EngineId =
  | "paper"
  | "purpur"
  | "folia"
  | "fabric"
  | "forge"
  | "neoforge"
  | "vanilla"
  | "velocity"
  | "pumpkin";

export type AppScreenId = "dashboard" | "console" | "files";

export type StageViewId = "dashboard" | "console" | "files" | "rear" | "side" | "cutaway";

export interface EngineSpec {
  id: EngineId;
  name: string;
  runtime: string;
  runtimeKind: "JVM" | "Rust" | "Proxy";
  architecture: string;
  ramBaseline: string;
  ecosystem: string;
  note: string;
  href: string;
  logo?: string;
  socLabel: string;
  bootLines: string[];
}

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface StagePose {
  view: StageViewId;
  screen: AppScreenId;
  explode: number;
  tunnelActive: number;
  phoneRotX: number;
  phoneRotY: number;
  phoneRotZ: number;
  cameraPos: Vec3Tuple;
  cameraTarget: Vec3Tuple;
}

export const ENGINES: EngineSpec[] = [
  {
    id: "paper",
    name: "Paper",
    runtime: "OpenJDK 21 ARM64",
    runtimeKind: "JVM",
    architecture: "Async chunk I/O · Bukkit & Spigot API",
    ramBaseline: "1.5 GB – 3.0 GB",
    ecosystem: "Modrinth plugins & high-TPS survival",
    note: "The default high-performance server with full plugin compatibility.",
    href: "https://papermc.io/",
    logo: "/assets/engines/paper.png",
    socLabel: "JVM 21 · PAPER",
    bootLines: [
      "[00:01] koda-daemon: mounting ~/servers/survival",
      "[00:02] openjdk-21: -Xms1024M -Xmx2560M -XX:+UseG1GC",
      "[00:04] Paper 1.21.11: loaded 14 plugins (20.0 TPS)",
      "[00:05] frpc-de-fra: tunnel bound -> survival.kodaserv.eu",
    ],
  },
  {
    id: "purpur",
    name: "Purpur",
    runtime: "OpenJDK 21 ARM64",
    runtimeKind: "JVM",
    architecture: "Paper fork · deep gameplay config",
    ramBaseline: "1.5 GB – 3.0 GB",
    ecosystem: "Custom mob behavior & survival tweaks",
    note: "Drop-in Paper replacement with hundreds of extra configuration flags.",
    href: "https://purpurmc.org/",
    socLabel: "JVM 21 · PURPUR",
    bootLines: [
      "[00:01] koda-daemon: verifying purpur-1.21.11.jar",
      "[00:02] openjdk-21: loading purpur.yml gameplay rules",
      "[00:04] Purpur: Done (2.98s)! 20.0 TPS stable",
      "[00:05] frpc-de-fra: listening -> survival.kodaserv.eu",
    ],
  },
  {
    id: "folia",
    name: "Folia",
    runtime: "OpenJDK 21 ARM64",
    runtimeKind: "JVM",
    architecture: "Regionized multithreading across ARM64 cores",
    ramBaseline: "2.0 GB – 4.0 GB",
    ecosystem: "Parallel region ticking on multi-core phones",
    note: "Splits world regions across independent threads for modern 8-core SoCs.",
    href: "https://papermc.io/software/folia",
    socLabel: "JVM 21 · FOLIA",
    bootLines: [
      "[00:01] koda-daemon: binding 6 ARM64 region workers",
      "[00:02] folia: threaded regionizer active",
      "[00:04] Folia: independent tick loops online",
      "[00:05] frpc-de-fra: tunnel active -> folia.kodaserv.eu",
    ],
  },
  {
    id: "fabric",
    name: "Fabric",
    runtime: "OpenJDK 21 ARM64",
    runtimeKind: "JVM",
    architecture: "Lightweight mixin mod loader",
    ramBaseline: "1.2 GB – 2.5 GB",
    ecosystem: "Lithium, FerriteCore & Modrinth mods",
    note: "Fast updates and ultra-clean performance mods straight from Modrinth.",
    href: "https://fabricmc.net/",
    logo: "/assets/engines/fabric-big.png",
    socLabel: "JVM 21 · FABRIC",
    bootLines: [
      "[00:01] koda-daemon: fabric-loader 0.16.10 verified",
      "[00:02] openjdk-21: loading 24 mixin mods (SHA-512 OK)",
      "[00:03] Fabric 1.21.11: spawn region ready (3.1s)",
      "[00:04] frpc-de-fra: tunnel bound -> fabric.kodaserv.eu",
    ],
  },
  {
    id: "forge",
    name: "Forge",
    runtime: "OpenJDK 8 / 17 / 21",
    runtimeKind: "JVM",
    architecture: "Classic event-bus mod loader",
    ramBaseline: "2.5 GB – 6.0 GB",
    ecosystem: "Legacy 1.12.2 & heavy kitchen-sink packs",
    note: "Automatic OpenJDK 8/17/21 switching for classic modded worlds.",
    href: "https://minecraftforge.net/",
    logo: "/assets/engines/forge.png",
    socLabel: "JVM · FORGE",
    bootLines: [
      "[22:59:10] koda-daemon: selected OpenJDK 8 for Forge 1.12.2",
      "[22:59:11] [Server thread/INFO] [FML]: 64 mods active",
      "[22:59:12] [Server thread/INFO] [FML]: World loaded (6144 MB)",
      "[22:59:13] frpc-de-fra: bound -> halloween.kodaserv.eu",
    ],
  },
  {
    id: "neoforge",
    name: "NeoForge",
    runtime: "OpenJDK 21 ARM64",
    runtimeKind: "JVM",
    architecture: "Modern Forge fork · clean registry API",
    ramBaseline: "2.0 GB – 4.0 GB",
    ecosystem: "Modern 1.21+ modded communities",
    note: "The modern successor to Forge for current Minecraft modpacks.",
    href: "https://neoforged.net/",
    logo: "/assets/engines/neoforge.png",
    socLabel: "JVM 21 · NEOFORGE",
    bootLines: [
      "[00:01] koda-daemon: booting NeoForge 21.4 ARM64",
      "[00:03] openjdk-21: parallel mod registry init",
      "[00:05] NeoForge: 42 mods active, 20.0 TPS locked",
      "[00:06] frpc-de-fra: tunnel healthy -> 18ms RTT",
    ],
  },
  {
    id: "vanilla",
    name: "Vanilla",
    runtime: "OpenJDK 21 / 25 ARM64",
    runtimeKind: "JVM",
    architecture: "Official Mojang server binary",
    ramBaseline: "1.0 GB – 2.0 GB",
    ecosystem: "Pure unmodified Minecraft",
    note: "Unmodified official server jar with direct Java 21 or Java 25.",
    href: "https://www.minecraft.net/",
    logo: "/assets/engines/vanilla.png",
    socLabel: "JVM 25 · VANILLA",
    bootLines: [
      "[00:01] koda-daemon: verified SHA-1 server.jar",
      "[00:02] openjdk-25: allocating 1536M heap",
      "[00:04] Minecraft: Done (3.42s)! For help, type 'help'",
      "[00:05] frpc-de-fra: exposed -> vanilla.kodaserv.eu",
    ],
  },
  {
    id: "velocity",
    name: "Velocity",
    runtime: "OpenJDK 21 ARM64",
    runtimeKind: "Proxy",
    architecture: "High-throughput Netty reverse proxy",
    ramBaseline: "256 MB – 512 MB",
    ecosystem: "Multi-server networks & lobby routing",
    note: "Link multiple local or remote worlds behind a single mobile proxy.",
    href: "https://papermc.io/software/velocity",
    socLabel: "NETTY · VELOCITY",
    bootLines: [
      "[00:00] koda-daemon: starting Velocity 3.4 proxy",
      "[00:01] velocity: modern forwarding secret loaded",
      "[00:01] velocity: registered backends [lobby, survival]",
      "[00:02] frpc-de-fra: edge entry -> hub.kodaserv.eu",
    ],
  },
  {
    id: "pumpkin",
    name: "Pumpkin",
    runtime: "Native Rust ARM64",
    runtimeKind: "Rust",
    architecture: "Zero-GC multi-threaded Rust binary",
    ramBaseline: "128 MB – 512 MB",
    ecosystem: "Ultra-low thermal & battery overhead",
    note: "Blazing-fast native Rust implementation with minimal RAM and heat.",
    href: "https://pumpkinmc.org/",
    logo: "/assets/engines/pumpkin.png",
    socLabel: "RUST · PUMPKIN",
    bootLines: [
      "[00:00] koda-daemon: execve /bin/pumpkin-aarch64",
      "[00:00] pumpkin-rs: tokio runtime on 8 ARM64 cores",
      "[00:00] pumpkin-rs: listening in 140ms (94 MB RSS)",
      "[00:01] frpc-de-fra: tunnel synced -> rust.kodaserv.eu",
    ],
  },
];

export function getEngineSpec(id: EngineId): EngineSpec {
  return ENGINES.find((engine) => engine.id === id) ?? ENGINES[0];
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  const safeDt = Math.max(0, Math.min(dt, 0.2));
  return lerp(current, target, 1 - Math.exp(-lambda * safeDt));
}

export function sanitizeSubdomain(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  return cleaned || "survival";
}

/**
 * Pure deterministic solver returning the 3D framing, screen selection,
 * and hardware cutaway state for each interactive stage view.
 */
export function solveStagePose(view: StageViewId, isCompactViewport = false): StagePose {
  const distScale = isCompactViewport ? 1.12 : 1.0;

  switch (view) {
    case "dashboard":
      return {
        view,
        screen: "dashboard",
        explode: 0,
        tunnelActive: 0.15,
        phoneRotX: 0.04,
        phoneRotY: -0.24,
        phoneRotZ: 0.015,
        cameraPos: { x: 0.45 * distScale, y: 0.08, z: 5.55 * distScale },
        cameraTarget: { x: 0, y: 0.02, z: 0 },
      };
    case "console":
      return {
        view,
        screen: "console",
        explode: 0,
        tunnelActive: 0.35,
        phoneRotX: 0.06,
        phoneRotY: 0.22,
        phoneRotZ: -0.015,
        cameraPos: { x: -0.55 * distScale, y: 0.1, z: 5.55 * distScale },
        cameraTarget: { x: 0, y: 0.02, z: 0 },
      };
    case "files":
      return {
        view,
        screen: "files",
        explode: 0,
        tunnelActive: 0.25,
        phoneRotX: 0.08,
        phoneRotY: -0.16,
        phoneRotZ: 0.01,
        cameraPos: { x: 0.35 * distScale, y: -0.05, z: 5.5 * distScale },
        cameraTarget: { x: 0, y: 0.0, z: 0 },
      };
    case "rear":
      return {
        view,
        screen: "dashboard",
        explode: 0,
        tunnelActive: 0,
        phoneRotX: 0.03,
        phoneRotY: Math.PI + 0.14,
        phoneRotZ: 0.008,
        cameraPos: { x: -0.22 * distScale, y: 0.06, z: 5.35 * distScale },
        cameraTarget: { x: 0, y: 0.04, z: 0 },
      };
    case "side":
      return {
        view,
        screen: "dashboard",
        explode: 0,
        tunnelActive: 0,
        phoneRotX: 0.05,
        phoneRotY: Math.PI * 1.38,
        phoneRotZ: 0.012,
        cameraPos: { x: 0.65 * distScale, y: 0.1, z: 5.05 * distScale },
        cameraTarget: { x: 0.04, y: 0.14, z: 0 },
      };
    case "cutaway":
      return {
        view,
        screen: "dashboard",
        explode: 1,
        tunnelActive: 1,
        phoneRotX: 0.1,
        phoneRotY: -0.64,
        phoneRotZ: 0.02,
        cameraPos: { x: 3.45 * distScale, y: 0.74, z: 5.35 * distScale },
        cameraTarget: { x: 0.04, y: 0.06, z: 0.06 },
      };
  }
}
