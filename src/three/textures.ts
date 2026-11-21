import * as THREE from "three";
import type { EngineSpec } from "./choreography";

/**
 * Generates a laser-etched ARM64 SoC silicon die texture in stealth monochrome black
 * with surgical KodaHosting orange accents.
 */
export function drawSocCanvas(canvas: HTMLCanvasElement, engine: EngineSpec) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#0b0b0e";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  // Surgical KodaHosting orange silicon orientation index
  ctx.fillStyle = "#ff6a00";
  ctx.fillRect(28, 28, 16, 16);

  ctx.textAlign = "center";
  ctx.font = '600 20px "Geist Mono", ui-monospace, monospace';
  ctx.fillStyle = "#9696a0";
  ctx.fillText("SNAPDRAGON 8 ELITE", w / 2, h * 0.36);

  ctx.font = '600 28px "Geist", system-ui, sans-serif';
  ctx.fillStyle = "#f4f4f5";
  ctx.fillText(engine.socLabel, w / 2, h * 0.54);

  ctx.font = '500 18px "Geist Mono", ui-monospace, monospace';
  ctx.fillStyle = "#ff8c38";
  ctx.fillText(engine.ramBaseline, w / 2, h * 0.72);
  ctx.textAlign = "left";
}

/**
 * Generates a directional brushed-titanium grayscale roughness/bump texture.
 */
export function createBrushedMetalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y++) {
      const shade = 114 + Math.floor(((Math.sin(y * 1.7) + Math.cos(y * 4.3)) * 0.5 + 0.5) * 28);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Deterministic pseudo-random generator for reproducible starry emerald mineral grain.
 */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Authentic Xiaomi 17 Ultra China Edition Starry Emerald Green rear glass texture:
 * deep satin pine-emerald mineral fiberglass finish dusted with crisp pinpoint starlight
 * micro-flecks, compact flush upper-left ULTRA emblem with thin crimson stripe, and
 * authentic lower-left vertical XIAOMI wordmark.
 */
export function createStarryEmeraldBackTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Deep satin pine-emerald base matching the real Xiaomi 17 Ultra China Edition photo
    const grad = ctx.createLinearGradient(0, 0, w * 0.9, h);
    grad.addColorStop(0, "#335d4d");
    grad.addColorStop(0.32, "#294d3f");
    grad.addColorStop(0.72, "#234437");
    grad.addColorStop(1, "#1c362c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle soft studio sheen gradient across the satin fiberglass surface
    const sheen = ctx.createRadialGradient(w * 0.36, h * 0.28, w * 0.06, w * 0.45, h * 0.46, h * 0.72);
    sheen.addColorStop(0, "rgba(130, 192, 166, 0.18)");
    sheen.addColorStop(0.55, "rgba(48, 88, 72, 0.05)");
    sheen.addColorStop(1, "rgba(10, 22, 17, 0.26)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    // 26,000 crisp pinpoint mineral starlight micro-flecks (fine natural shimmer, no polka dots)
    const rng = mulberry32(170179);
    for (let i = 0; i < 26000; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = 0.35 + rng() * 0.82;
      const tone = rng();
      if (tone > 0.92) {
        ctx.fillStyle = `rgba(242, 252, 246, ${(0.55 + rng() * 0.4).toFixed(2)})`;
      } else if (tone > 0.66) {
        ctx.fillStyle = `rgba(176, 224, 202, ${(0.22 + rng() * 0.28).toFixed(2)})`;
      } else if (tone > 0.34) {
        ctx.fillStyle = `rgba(92, 148, 124, ${(0.16 + rng() * 0.2).toFixed(2)})`;
      } else {
        ctx.fillStyle = `rgba(14, 34, 26, ${(0.2 + rng() * 0.22).toFixed(2)})`;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle dark outer perimeter shadow where the backplate meets the anodized aluminum frame
    ctx.strokeStyle = "rgba(10, 24, 19, 0.55)";
    ctx.lineWidth = 18;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Compact flush upper-left China Edition ULTRA emblem with thin vermilion stripe
    const bx = 76;
    const by = 92;
    const bw = 62;
    const bh = 142;
    ctx.save();
    ctx.fillStyle = "rgba(28, 56, 45, 0.62)";
    ctx.strokeStyle = "rgba(148, 192, 174, 0.36)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 14);
    ctx.fill();
    ctx.stroke();

    // Inner subtle debossed rim highlight
    ctx.strokeStyle = "rgba(14, 30, 24, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx + 3, by + 3, bw - 6, bh - 6, 11);
    ctx.stroke();

    // Signature thin crimson-red vertical accent line on the right side of the ULTRA capsule
    ctx.fillStyle = "#c82d29";
    ctx.beginPath();
    ctx.roundRect(bx + bw - 19, by + 22, 6, bh - 44, 3);
    ctx.fill();

    // Fine vertical etched ULTRA lettering on the left side of the capsule
    ctx.translate(bx + 23, by + bh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '600 15px "Geist", system-ui, sans-serif';
    ctx.fillStyle = "rgba(202, 224, 214, 0.66)";
    ctx.fillText("ULTRA", 0, 0);
    ctx.restore();

    // Authentic lower-left vertical XIAOMI wordmark (warm brushed silver-champagne, geometric rounded)
    ctx.save();
    ctx.translate(154, h - 295);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '500 42px "Plus Jakarta Sans", "Geist", system-ui, sans-serif';
    ctx.fillStyle = "rgba(224, 232, 228, 0.84)";
    const letters = "XIAOMI";
    const spacing = 44;
    const startX = -((letters.length - 1) * spacing) / 2;
    for (let i = 0; i < letters.length; i++) {
      ctx.fillText(letters[i], startX + i * spacing, 0);
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Matching linear roughness map for the satin starry emerald mineral backplate so
 * pinpoint mineral flecks catch specular highlights naturally as the phone turns.
 */
export function createStarryRoughnessTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgb(138,138,138)";
    ctx.fillRect(0, 0, w, h);
    const rng = mulberry32(170179);
    for (let i = 0; i < 14000; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = 0.35 + rng() * 0.7;
      const v = rng() > 0.9 ? 28 : 112 + Math.floor(rng() * 44);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Authentic monolithic deep-black Xiaomi 17 Ultra Leica optical cover glass plate:
 * unified dark sapphire glass with recessed periscope prism window, subtle dark multi-coated
 * circular optical barrels, 12 o'clock dual-tone flash recess, and exact vertical center
 * LEICA + VARIO-APO-SUMMILUX 1:1.67-2.9/14-100 ASPH. typography matching the real photo.
 */
export function createLeicaDecoTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;

    // Deep unified glossy obsidian optical glass backing
    const bg = ctx.createRadialGradient(cx * 0.78, cy * 0.72, 40, cx, cy, size * 0.52);
    bg.addColorStop(0, "#15181c");
    bg.addColorStop(0.5, "#0a0c0e");
    bg.addColorStop(0.88, "#050608");
    bg.addColorStop(1, "#020304");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Subtle dark outer optical bezel step inside the sapphire glass edge
    ctx.strokeStyle = "rgba(170, 198, 186, 0.1)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.478, 0, Math.PI * 2);
    ctx.stroke();

    // 9:30 o'clock recessed 200MP periscope telephoto optical bay (dark machined square under glass)
    const px = cx - 220;
    const py = cy - 92;
    const pw = 214;
    const ph = 228;
    ctx.save();
    ctx.fillStyle = "#10141a";
    ctx.strokeStyle = "rgba(210, 226, 220, 0.11)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px - pw / 2, py - ph / 2, pw, ph, 26);
    ctx.fill();
    ctx.stroke();

    // Inner recessed periscope rectangular prism chamber
    const prismGrad = ctx.createLinearGradient(px - 70, py - 80, px + 70, py + 80);
    prismGrad.addColorStop(0, "#232b36");
    prismGrad.addColorStop(0.48, "#0c1018");
    prismGrad.addColorStop(1, "#1b2330");
    ctx.fillStyle = prismGrad;
    ctx.beginPath();
    ctx.roundRect(px - 70, py - 76, 140, 152, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(198, 216, 232, 0.22)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtle multi-coated optical prism reflection bar inside the periscope bay
    ctx.fillStyle = "rgba(155, 195, 225, 0.12)";
    ctx.beginPath();
    ctx.roundRect(px - 52, py - 58, 44, 116, 8);
    ctx.fill();
    ctx.restore();

    // Helper for subtle dark recessed circular Leica lenses (NO bright chrome rings!)
    const drawRecessedLens = (lx: number, ly: number, outerR: number, glassR: number) => {
      // Dark matte anodized housing ring
      const housingGrad = ctx.createRadialGradient(lx - outerR * 0.2, ly - outerR * 0.2, outerR * 0.2, lx, ly, outerR);
      housingGrad.addColorStop(0, "#191c22");
      housingGrad.addColorStop(0.7, "#0b0d10");
      housingGrad.addColorStop(1, "#050608");
      ctx.fillStyle = housingGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle dark concentric anti-glare baffles
      for (const frac of [0.92, 0.78, 0.64]) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lx, ly, outerR * frac, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Deep dark multi-coated navy/violet optical glass element
      const lensGrad = ctx.createRadialGradient(lx - glassR * 0.28, ly - glassR * 0.28, glassR * 0.08, lx, ly, glassR);
      lensGrad.addColorStop(0, "#243049");
      lensGrad.addColorStop(0.45, "#0b1020");
      lensGrad.addColorStop(0.85, "#05070e");
      lensGrad.addColorStop(1, "#020306");
      ctx.fillStyle = lensGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, glassR, 0, Math.PI * 2);
      ctx.fill();

      // Tiny realistic pinpoint anti-reflective coating glint
      ctx.fillStyle = "rgba(140, 185, 235, 0.34)";
      ctx.beginPath();
      ctx.ellipse(lx - glassR * 0.34, ly - glassR * 0.3, glassR * 0.16, glassR * 0.09, -0.5, 0, Math.PI * 2);
      ctx.fill();
    };

    // 7 o'clock: 1-Inch Leica Main Sensor Lens
    drawRecessedLens(cx - 148, cy + 236, 114, 62);

    // 5 o'clock: Leica Ultra-Wide Sensor Lens
    drawRecessedLens(cx + 148, cy + 236, 102, 52);

    // 3 o'clock: subtle dark spectral / laser AF pinhole
    ctx.fillStyle = "#14181c";
    ctx.beginPath();
    ctx.arc(cx + 392, cy - 12, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#080a0d";
    ctx.beginPath();
    ctx.arc(cx + 392, cy - 12, 9, 0, Math.PI * 2);
    ctx.fill();

    // EXACT CENTER VERTICAL AXIS: LEICA (lower-middle) + VARIO-APO-SUMMILUX (directly above it)
    // Matches the real Xiaomi 17 Ultra China Edition photo reading vertically bottom-to-top!
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // LEICA wordmark (lower-middle on vertical center spine)
    ctx.font = '500 42px "Geist", system-ui, sans-serif';
    ctx.fillStyle = "rgba(238, 244, 240, 0.88)";
    const leica = "LEICA";
    const sp = 34;
    const leicaCenter = -52;
    const sx = leicaCenter - ((leica.length - 1) * sp) / 2;
    for (let i = 0; i < leica.length; i++) {
      ctx.fillText(leica[i], sx + i * sp, 0);
    }

    // Two-line technical Leica lens inscription directly above LEICA along the same spine
    ctx.textAlign = "left";
    ctx.font = '500 14.5px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle = "rgba(218, 226, 222, 0.72)";
    ctx.fillText("VARIO-APO-SUMMILUX", 48, -9);
    ctx.font = '500 12.5px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle = "rgba(196, 206, 202, 0.62)";
    ctx.fillText("1:1.67-2.9/14-100 ASPH.", 48, 10);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Real Xiaomi 17 Ultra inner graphite protective bracket + copper Qi wireless
 * charging coil + NFC perimeter trace sitting directly behind the rear glass.
 */
export function createWirelessCoilTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Matte carbon-graphite heat-spreading sheet base
    ctx.fillStyle = "#101215";
    ctx.fillRect(0, 0, w, h);

    // Subtle graphite cross-weave texture
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 2;
    for (let i = 0; i < w; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    const cx = w / 2;
    const cy = h / 2;

    // Outer NFC magnetic antenna loop trace
    ctx.strokeStyle = "rgba(196, 128, 68, 0.65)";
    ctx.lineWidth = 7;
    ctx.strokeRect(72, 72, w - 144, h - 144);
    ctx.strokeStyle = "rgba(196, 128, 68, 0.45)";
    ctx.lineWidth = 4;
    ctx.strokeRect(92, 92, w - 184, h - 184);

    // Concentric wound copper Qi / 80W HyperCharge wireless charging coil
    const coilGrad = ctx.createLinearGradient(cx - 340, cy - 340, cx + 340, cy + 340);
    coilGrad.addColorStop(0, "#d68443");
    coilGrad.addColorStop(0.35, "#f0b072");
    coilGrad.addColorStop(0.65, "#9c5625");
    coilGrad.addColorStop(1, "#df904f");

    for (let r = 148; r <= 344; r += 10.5) {
      ctx.strokeStyle = coilGrad;
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(25, 14, 7, 0.72)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center ferrite shielding core + thermistor dot
    ctx.fillStyle = "#181b20";
    ctx.beginPath();
    ctx.arc(cx, cy, 134, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Amber Kapton adhesive retention strips holding coil leads
    ctx.fillStyle = "rgba(208, 122, 34, 0.58)";
    ctx.fillRect(cx - 36, 120, 72, 165);
    ctx.fillRect(cx - 28, cy - 16, 56, 32);

    // Copper coil lead traces routing up toward the mainboard contact pads
    ctx.fillStyle = "#d98b48";
    ctx.fillRect(cx - 18, 16, 12, 140);
    ctx.fillRect(cx + 6, 16, 12, 140);

    // Technical laser markings inside the ferrite center
    ctx.textAlign = "center";
    ctx.font = '600 22px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle = "rgba(220, 224, 232, 0.65)";
    ctx.fillText("80W WIRELESS · NFC", cx, cy - 16);
    ctx.font = '500 17px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle = "rgba(160, 166, 178, 0.55)";
    ctx.fillText("MI-17U-QI-COIL", cx, cy + 16);
    ctx.textAlign = "left";
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Real Xiaomi 17 Ultra High-Density Silicon-Carbon (Si-C) battery pouch texture.
 */
export function createBatteryLabelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Matte charcoal-black aluminum laminate pouch
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#14161a");
    bg.addColorStop(0.5, "#191c21");
    bg.addColorStop(1, "#0f1114");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle folded foil border seam
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    // Top orange-amber Kapton protection tape band
    ctx.fillStyle = "rgba(198, 108, 28, 0.72)";
    ctx.fillRect(28, 28, w - 56, 54);

    // White easy-pull adhesive tab arrow on the left edge
    ctx.fillStyle = "rgba(235, 238, 244, 0.85)";
    ctx.beginPath();
    ctx.roundRect(42, h * 0.42, 46, 160, 10);
    ctx.fill();
    ctx.fillStyle = "#111318";
    ctx.font = '700 22px "Geist", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("1", 65, h * 0.51);

    // Authentic Xiaomi Silicon-Carbon cell technical spec print
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(232, 236, 242, 0.86)";
    ctx.font = '600 40px "Geist", system-ui, sans-serif';
    ctx.fillText("Xiaomi Surge Si-C", 136, 210);

    ctx.fillStyle = "rgba(255, 138, 56, 0.85)";
    ctx.font = '600 26px "Geist Mono", ui-monospace, monospace';
    ctx.fillText("SILICON-CARBON ANODE CELL", 136, 256);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(136, 290);
    ctx.lineTo(w - 90, 290);
    ctx.stroke();

    ctx.fillStyle = "rgba(208, 214, 222, 0.72)";
    ctx.font = '500 26px "Geist Mono", ui-monospace, monospace';
    ctx.fillText("Typical Capacity : 6000 mAh / 23.2 Wh", 136, 355);
    ctx.fillText("Rated Voltage    : 3.88 Vdc", 136, 405);
    ctx.fillText("Charge Limit     : 4.53 Vdc · 90W Wired", 136, 455);
    ctx.fillText("Model            : BM6B · 1ICP5/67/82", 136, 505);

    // Minimal regulatory vector marks & QR matrix block
    ctx.strokeStyle = "rgba(200, 206, 216, 0.42)";
    ctx.lineWidth = 3;
    ctx.strokeRect(136, 610, 120, 120);
    const rng = mulberry32(6000);
    ctx.fillStyle = "rgba(216, 222, 230, 0.58)";
    for (let gx = 0; gx < 8; gx++) {
      for (let gy = 0; gy < 8; gy++) {
        if (rng() > 0.42) {
          ctx.fillRect(148 + gx * 12, 622 + gy * 12, 9, 9);
        }
      }
    }

    ctx.font = '600 32px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle = "rgba(196, 202, 212, 0.5)";
    ctx.fillText("CE   Li-ion 00   RoHS", 300, 682);

    ctx.font = '500 18px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle = "rgba(154, 160, 172, 0.46)";
    ctx.fillText("DO NOT PUNCTURE · INCINERATE · HEAT ABOVE 60C", 136, 860);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * High-density matte-black flagship smartphone mainboard PCB texture with
 * fine copper/gold routing traces, micro SMD capacitors, and test pads.
 */
export function createMainboardPcbTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#0b0e11";
    ctx.fillRect(0, 0, size, size);

    const rng = mulberry32(8088);

    // Subtle orthogonal copper micro-bus traces beneath dark solder mask
    ctx.strokeStyle = "rgba(74, 118, 102, 0.24)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 95; i++) {
      const x1 = Math.floor(rng() * 64) * 16;
      const y1 = Math.floor(rng() * 64) * 16;
      const len = (2 + Math.floor(rng() * 14)) * 16;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      if (rng() > 0.5) {
        ctx.lineTo(x1 + len, y1);
        ctx.lineTo(x1 + len + 24, y1 + 24);
      } else {
        ctx.lineTo(x1, y1 + len);
        ctx.lineTo(x1 + 24, y1 + len + 24);
      }
      ctx.stroke();
    }

    // Gold circular vias & probe pads
    for (let i = 0; i < 240; i++) {
      const vx = 24 + rng() * (size - 48);
      const vy = 24 + rng() * (size - 48);
      ctx.fillStyle = rng() > 0.35 ? "rgba(214, 168, 86, 0.72)" : "rgba(182, 190, 200, 0.52)";
      ctx.beginPath();
      ctx.arc(vx, vy, 3.2 + rng() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiny surface-mount ceramic capacitors & resistors (tan/silver)
    for (let i = 0; i < 210; i++) {
      const sx = 28 + rng() * (size - 56);
      const sy = 28 + rng() * (size - 56);
      const horiz = rng() > 0.5;
      const cw = horiz ? 14 : 7;
      const ch = horiz ? 7 : 14;
      ctx.fillStyle = rng() > 0.45 ? "#8b6d47" : "#22262c";
      ctx.fillRect(sx, sy, cw, ch);
      ctx.fillStyle = "#c8cdd4";
      if (horiz) {
        ctx.fillRect(sx, sy, 3, ch);
        ctx.fillRect(sx + cw - 3, sy, 3, ch);
      } else {
        ctx.fillRect(sx, sy, cw, 3);
        ctx.fillRect(sx, sy + ch - 3, cw, 3);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Real Xiaomi 17 Ultra oversized 3D Dual-Loop IceLoop Copper Vapor Chamber (VC)
 * cooling plate texture with stamped microfluidic channels & thermal graphite pad.
 */
export function createVaporChamberTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Brushed rose-copper alloy base
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#a86136");
    grad.addColorStop(0.32, "#c67b49");
    grad.addColorStop(0.65, "#8f4f2a");
    grad.addColorStop(1, "#b46a3c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Fine directional metallic grain
    for (let y = 0; y < h; y += 3) {
      const alpha = (0.04 + ((Math.sin(y * 0.45) + 1) * 0.03)).toFixed(3);
      ctx.fillStyle = `rgba(255, 224, 195, ${alpha})`;
      ctx.fillRect(0, y, w, 1);
    }

    // Stamped 3D Dual-Loop vapor-liquid separation channels (signature Xiaomi IceLoop)
    ctx.strokeStyle = "rgba(58, 24, 10, 0.55)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.roundRect(104, 130, w - 208, h - 260, 96);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 206, 168, 0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(126, 152, w - 252, h - 304, 82);
    ctx.stroke();

    // Inner vertical dual-loop vapor conduits
    for (const cx of [w * 0.33, w * 0.5, w * 0.67]) {
      ctx.strokeStyle = "rgba(62, 26, 10, 0.48)";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(cx, 250);
      ctx.lineTo(cx, h - 250);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 214, 182, 0.28)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 5, 250);
      ctx.lineTo(cx - 5, h - 250);
      ctx.stroke();
    }

    // Precision laser-welded support dimples across the vapor chamber
    for (let rx = 190; rx <= w - 190; rx += 96) {
      for (let ry = 280; ry <= h - 280; ry += 120) {
        ctx.fillStyle = "rgba(52, 22, 8, 0.5)";
        ctx.beginPath();
        ctx.arc(rx, ry, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 212, 178, 0.35)";
        ctx.beginPath();
        ctx.arc(rx - 2, ry - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dark thermal graphite transfer patch over upper SoC evaporator zone
    ctx.fillStyle = "rgba(18, 20, 24, 0.86)";
    ctx.beginPath();
    ctx.roundRect(210, 240, 604, 420, 26);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 140, 56, 0.38)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Etched cooling specification typography
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(245, 226, 210, 0.82)";
    ctx.font = '600 32px "Geist Mono", ui-monospace, monospace';
    ctx.fillText("3D DUAL-LOOP ICELOOP VC", w / 2, 425);
    ctx.fillStyle = "rgba(255, 166, 98, 0.78)";
    ctx.font = '500 22px "Geist Mono", ui-monospace, monospace';
    ctx.fillText("ARM64 CONTINUOUS THERMAL DISSIPATION", w / 2, 474);
    ctx.textAlign = "left";
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Subtle grounding contact shadow beneath the flagship phone (no white ring).
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 124);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.75)");
    grad.addColorStop(0.5, "rgba(0, 0, 0, 0.28)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
