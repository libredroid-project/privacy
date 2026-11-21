import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  damp,
  getEngineSpec,
  solveStagePose,
  type AppScreenId,
  type EngineId,
  type StageViewId,
} from "./choreography";
import {
  createBatteryLabelTexture,
  createBrushedMetalTexture,
  createContactShadowTexture,
  createLeicaDecoTexture,
  createMainboardPcbTexture,
  createStarryEmeraldBackTexture,
  createStarryRoughnessTexture,
  createVaporChamberTexture,
  createWirelessCoilTexture,
  drawSocCanvas,
} from "./textures";

export interface HardwareSceneParams {
  container: HTMLElement;
  initialEngine: EngineId;
  initialView?: StageViewId;
  reducedMotion: boolean;
  onReady?: () => void;
  onContextLost?: () => void;
}

export interface HardwareSceneController {
  setView: (view: StageViewId) => void;
  setEngine: (engine: EngineId) => void;
  resetCamera: () => void;
  dispose: () => void;
}

const SCREEN_SOURCES: Record<AppScreenId, string> = {
  dashboard: "/assets/app/dashboard.webp",
  console: "/assets/app/console.webp",
  files: "/assets/app/files.webp",
};

const BUNDLED_GLB_MODELS = import.meta.glob("../assets/models/*.glb", {
  query: "?url",
  import: "default",
}) as Record<string, () => Promise<string>>;

function pickBundledGlbLoader(): (() => Promise<string>) | null {
  const keys = Object.keys(BUNDLED_GLB_MODELS);
  if (keys.length === 0) return null;
  const preferred = keys.find((key) => /xiaomi_17_pro_max\.glb$/i.test(key));
  return BUNDLED_GLB_MODELS[preferred ?? keys[0]] ?? null;
}

const _pos = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _dummy = new THREE.Object3D();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

function createRoundedPanelGeometry(width: number, height: number, radius: number): THREE.ShapeGeometry {
  const shape = createRoundedRectShape(width, height, radius);
  const geo = new THREE.ShapeGeometry(shape, 28);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv[i * 2] = (x + width / 2) / width;
    uv[i * 2 + 1] = (y + height / 2) / height;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

export function mountHardwareScene(params: HardwareSceneParams): HardwareSceneController {
  const { container, reducedMotion, onReady, onContextLost } = params;
  const isSoftwareGl = detectSoftwareGl();

  const width = Math.max(container.clientWidth, 300);
  const height = Math.max(container.clientHeight, 360);

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
  const initialPose = solveStagePose(params.initialView ?? "dashboard", width < 768);
  camera.position.set(initialPose.cameraPos.x, initialPose.cameraPos.y, initialPose.cameraPos.z);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  // Custom nocturnal moonlit room environment map (replaces bright daytime RoomEnvironment)
  // Matches the diagonal upper-left moonlight shafts in the dark room so metallic edges,
  // emerald back glass, and camera lenses reflect realistic cool silver-blue moonlight.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x03050a);

  const envDisposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  const addEnvPanel = (
    w: number,
    h: number,
    colorHex: number,
    intensity: number,
    pos: [number, number, number],
  ) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const col = new THREE.Color(colorHex).multiplyScalar(intensity);
    const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(0, 0, 0);
    envScene.add(mesh);
    envDisposables.push(geo, mat);
  };

  // Primary high-left moonlight window panel aligned with the diagonal lunar beams
  addEnvPanel(6.5, 9.5, 0xc2dcff, 4.4, [-8.2, 7.2, 5.6]);
  // Soft elongated upper-left lunar rim strip for rear backplate & camera plateau highlights
  addEnvPanel(5.2, 7.5, 0x8eb8f0, 2.5, [-6.4, 4.8, -6.5]);
  // Subtle midnight zenith skylight so top chamfers catch cool lunar sheen
  addEnvPanel(8.0, 5.0, 0x3b5c8c, 1.35, [-1.5, 9.5, 0.5]);
  // Very faint cool shadow-side wall bounce (keeps dark room realism with zero warm hotspots)
  addEnvPanel(7.0, 7.0, 0x1a2b46, 0.75, [8.5, 1.2, 3.2]);

  const envTarget = pmrem.fromScene(envScene, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.92;
  envDisposables.forEach((d) => d.dispose());
  pmrem.dispose();

  // Physically aligned nocturnal moonlight lighting rig (zero warm sunlight / orange bulbs)
  // Primary moonlight streaming from the upper-left matching the CSS lunar beams
  const moonKeyLight = new THREE.DirectionalLight(0xc2dcff, 2.35);
  moonKeyLight.position.set(-5.6, 6.4, 4.6);
  scene.add(moonKeyLight);

  // Cool midnight sky above, deep shadowed floor below
  const nightFillLight = new THREE.HemisphereLight(0x88b0e6, 0x04070e, 0.56);
  scene.add(nightFillLight);

  // Consistent upper-left moonlight illuminating the rear camera plateau & emerald back when rotated
  const moonBackKey = new THREE.DirectionalLight(0xb2d2ff, 1.8);
  moonBackKey.position.set(-4.4, 5.0, -4.8);
  scene.add(moonBackKey);

  // Grazing lunar highlight along the left flat aluminum rail and side hardware buttons
  const moonSideLight = new THREE.DirectionalLight(0xd4e6ff, 1.25);
  moonSideLight.position.set(-5.2, 2.8, 1.8);
  scene.add(moonSideLight);

  // Subtle cool nocturnal ambient bounce on the shadow side (keeps Side view backplate readable)
  const nightBounceLight = new THREE.DirectionalLight(0x6389bd, 0.85);
  nightBounceLight.position.set(4.5, 1.8, 2.8);
  scene.add(nightBounceLight);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  // Load REAL KodaHosting Android app screenshots with clean bezel-trimmed UVs
  const loader = new THREE.TextureLoader();
  const screenTextures: Record<AppScreenId, THREE.Texture> = {
    dashboard: trackTex(loader.load(SCREEN_SOURCES.dashboard)),
    console: trackTex(loader.load(SCREEN_SOURCES.console)),
    files: trackTex(loader.load(SCREEN_SOURCES.files)),
  };

  (Object.values(screenTextures) as THREE.Texture[]).forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(0.892, 0.936);
    tex.offset.set(0.054, 0.033);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
  });

  const brushedMap = trackTex(createBrushedMetalTexture(maxAnisotropy));
  const shadowMap = trackTex(createContactShadowTexture());
  const starryBackMap = trackTex(createStarryEmeraldBackTexture(maxAnisotropy));
  const starryRoughMap = trackTex(createStarryRoughnessTexture(maxAnisotropy));
  const leicaDecoMap = trackTex(createLeicaDecoTexture(maxAnisotropy));
  const wirelessCoilMap = trackTex(createWirelessCoilTexture(maxAnisotropy));
  const batteryLabelMap = trackTex(createBatteryLabelTexture(maxAnisotropy));
  const mainboardPcbMap = trackTex(createMainboardPcbTexture(maxAnisotropy));
  const vaporChamberMap = trackTex(createVaporChamberTexture(maxAnisotropy));

  const socCanvas = document.createElement("canvas");
  socCanvas.width = 512;
  socCanvas.height = 512;
  const socTexture = trackTex(new THREE.CanvasTexture(socCanvas));
  socTexture.colorSpace = THREE.SRGBColorSpace;
  socTexture.anisotropy = maxAnisotropy;

  // Xiaomi 17 Ultra China Edition Starry Emerald Titanium & Leica Optical Materials
  const emeraldTitaniumMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x2c4b3f,
      metalness: 0.88,
      roughness: 0.27,
      anisotropy: 0.75,
      bumpMap: brushedMap,
      bumpScale: 0.0018,
      roughnessMap: brushedMap,
      clearcoat: 0.18,
      clearcoatRoughness: 0.26,
    }),
  );

  const emeraldChamferMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x456b5b,
      metalness: 0.94,
      roughness: 0.16,
      clearcoat: 0.32,
    }),
  );

  const antennaBandMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a2c24,
      metalness: 0.12,
      roughness: 0.72,
    }),
  );

  const portCavityMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x050607,
      metalness: 0.2,
      roughness: 0.85,
    }),
  );

  const portMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x71717a,
      metalness: 0.92,
      roughness: 0.24,
    }),
  );

  const rearBodyEdgeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x203d31,
      metalness: 0.22,
      roughness: 0.44,
      clearcoat: 0.35,
      clearcoatRoughness: 0.28,
    }),
  );

  const starryBackGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: starryBackMap,
      roughnessMap: starryRoughMap,
      metalness: 0.16,
      roughness: 0.56,
      clearcoat: 0.12,
      clearcoatRoughness: 0.58,
    }),
  );

  const leicaCollarMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x264438,
      metalness: 0.9,
      roughness: 0.22,
      anisotropy: 0.8,
      bumpMap: brushedMap,
      bumpScale: 0.0024,
      clearcoat: 0.38,
      clearcoatRoughness: 0.18,
    }),
  );

  const leicaGrooveMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x152820,
      metalness: 0.84,
      roughness: 0.34,
    }),
  );

  const leicaGlassPlateMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: leicaDecoMap,
      metalness: 0.08,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
    }),
  );

  const lensOpticalGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x070a14,
      metalness: 0.15,
      roughness: 0.03,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      iridescence: 0.85,
      iridescenceIOR: 1.42,
    }),
  );

  const flashWarmMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf7dca0,
      emissive: 0x5c4314,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.1,
    }),
  );

  const flashCoolMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeef5ff,
      emissive: 0x354659,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.1,
    }),
  );

  const ultraRedLineMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9362e,
      metalness: 0.35,
      roughness: 0.3,
    }),
  );

  const pcbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: mainboardPcbMap,
      metalness: 0.34,
      roughness: 0.52,
    }),
  );

  const pcbSideMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0c0f12,
      metalness: 0.25,
      roughness: 0.65,
    }),
  );

  const batteryFaceMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: batteryLabelMap,
      metalness: 0.38,
      roughness: 0.42,
      clearcoat: 0.25,
      clearcoatRoughness: 0.32,
    }),
  );

  const batteryEdgeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x15181d,
      metalness: 0.55,
      roughness: 0.38,
    }),
  );

  const wirelessCoilMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: wirelessCoilMap,
      metalness: 0.62,
      roughness: 0.32,
      clearcoat: 0.3,
      clearcoatRoughness: 0.25,
    }),
  );

  const graphiteBracketMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x131619,
      metalness: 0.28,
      roughness: 0.62,
    }),
  );

  const copperTraceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc97b42,
      metalness: 0.92,
      roughness: 0.24,
    }),
  );

  const brassGearMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd6a656,
      metalness: 0.94,
      roughness: 0.22,
    }),
  );

  const flexRibbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1c1714,
      metalness: 0.35,
      roughness: 0.42,
    }),
  );

  const goldContactMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe3b85b,
      metalness: 0.96,
      roughness: 0.18,
    }),
  );

  const thermalAlloyMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: vaporChamberMap,
      metalness: 0.86,
      roughness: 0.26,
      anisotropy: 0.72,
      bumpMap: brushedMap,
      bumpScale: 0.0022,
      clearcoat: 0.24,
      clearcoatRoughness: 0.22,
    }),
  );

  const shieldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x62666f,
      metalness: 0.92,
      roughness: 0.24,
    }),
  );

  const camMetalMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x1e2228,
      metalness: 0.88,
      roughness: 0.26,
      clearcoat: 0.2,
    }),
  );

  const socTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: socTexture,
      metalness: 0.35,
      roughness: 0.32,
    }),
  );

  const oledMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: screenTextures.dashboard,
      toneMapped: false,
    }),
  );

  const bezelMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x050608,
      metalness: 0.08,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    }),
  );

  const glassSheenMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.03,
      transparent: true,
      opacity: 0.055,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      depthWrite: false,
    }),
  );

  // =========================================================================
  // Authentic Xiaomi 17 Ultra China Edition 3D Assembly
  // =========================================================================
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const phoneGroup = new THREE.Group();
  rootGroup.add(phoneGroup);

  const PHONE_W = 1.5;
  const PHONE_H = 3.15;
  const PHONE_R = 0.245;
  const FRAME_DEPTH = 0.162;

  // Soft natural ground shadow only (no white ring)
  const shadowDisc = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(3.0, 3.0)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowMap,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    ),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.set(0, -1.84, 0);
  rootGroup.add(shadowDisc);

  // Subtle floating Resend-style chamfered obsidian micro-monoliths framing deep space
  const monolithShape = createRoundedRectShape(0.24, 0.24, 0.045);
  const monolithGeo = trackGeo(
    new THREE.ExtrudeGeometry(monolithShape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.026,
      bevelSize: 0.024,
      bevelSegments: 3,
    }),
  );
  monolithGeo.center();

  const monolithMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x141418,
      metalness: 0.94,
      roughness: 0.16,
      clearcoat: 0.95,
      clearcoatRoughness: 0.1,
      anisotropy: 0.7,
    }),
  );

  const monolithConfigs = [
    { base: new THREE.Vector3(-1.46, 1.08, -0.96), scale: 0.88, speed: 0.42, phase: 0.2 },
    { base: new THREE.Vector3(1.56, -0.84, -1.1), scale: 1.02, speed: 0.36, phase: 1.7 },
    { base: new THREE.Vector3(-1.3, -1.2, -0.72), scale: 0.64, speed: 0.54, phase: 3.1 },
    { base: new THREE.Vector3(1.28, 1.2, -1.28), scale: 0.74, speed: 0.48, phase: 4.4 },
  ];

  const monoliths = monolithConfigs.map((cfg) => {
    const mesh = new THREE.Mesh(monolithGeo, monolithMat);
    mesh.position.copy(cfg.base);
    mesh.scale.setScalar(cfg.scale);
    rootGroup.add(mesh);
    return { mesh, ...cfg };
  });

  // -------------------------------------------------------------------------
  // Layer 1: Xiaomi 17 Ultra China Edition Starry Emerald Backplate + Deep Leica Island
  // -------------------------------------------------------------------------
  const rearLayer = new THREE.Group();
  phoneGroup.add(rearLayer);

  // Subtle 2.5D gently contoured rear mineral composite backplate tucked inside the emerald rail
  const rearBodyGeo = trackGeo(
    new THREE.ExtrudeGeometry(createRoundedRectShape(PHONE_W - 0.056, PHONE_H - 0.056, PHONE_R - 0.024), {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 5,
    }),
  );
  rearBodyGeo.center();
  rearLayer.add(new THREE.Mesh(rearBodyGeo, rearBodyEdgeMat));

  // Textured Starry Emerald rear surface offset cleanly beyond rearBodyGeo (-0.027) to prevent Z-fighting
  const rearFacePanel = new THREE.Mesh(
    trackGeo(createRoundedPanelGeometry(PHONE_W - 0.06, PHONE_H - 0.06, PHONE_R - 0.026)),
    starryBackGlassMat,
  );
  rearFacePanel.rotation.y = Math.PI;
  rearFacePanel.position.z = -0.0298;
  rearLayer.add(rearFacePanel);

  // Subtle flush crimson micro-stripe accent inside the upper-left ULTRA emblem (matching real photo)
  const ultraRedStripe = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.008, 0.145, 0.003)),
    ultraRedLineMat,
  );
  ultraRedStripe.position.set(0.558, 1.285, -0.0315);
  rearLayer.add(ultraRedStripe);

  // Giant Circular Leica Optical Camera Island spanning ~83% of the phone width with authentic deep side step
  const leicaIsland = new THREE.Group();
  leicaIsland.rotation.y = Math.PI;
  leicaIsland.position.set(0, 0.62, -0.0288);
  rearLayer.add(leicaIsland);

  // Sculpted deep multi-step metallic emerald camera plateau via LatheGeometry (signature Xiaomi Ultra side profile)
  const collarProfile = [
    new THREE.Vector2(0.585, 0.0),
    new THREE.Vector2(0.662, 0.0),
    new THREE.Vector2(0.65, 0.016),
    new THREE.Vector2(0.634, 0.042),
    new THREE.Vector2(0.63, 0.055),
    new THREE.Vector2(0.628, 0.118),
    new THREE.Vector2(0.616, 0.136),
    new THREE.Vector2(0.598, 0.138),
    new THREE.Vector2(0.59, 0.126),
  ];
  const collarGeo = trackGeo(new THREE.LatheGeometry(collarProfile, 84));
  collarGeo.rotateX(Math.PI / 2);
  leicaIsland.add(new THREE.Mesh(collarGeo, leicaCollarMat));

  // Fine machined horizontal dark micro-groove rings around the outer cylindrical Leica barrel
  for (const gz of [0.062, 0.08, 0.098, 0.112]) {
    const grooveRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.629, 0.0024, 8, 84)),
      leicaGrooveMat,
    );
    grooveRing.position.z = gz;
    leicaIsland.add(grooveRing);
  }

  // Crisp narrow satin-emerald top chamfer lip framing the monolithic flush sapphire optical disc
  const leicaTrimRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.606, 0.006, 12, 84)),
    emeraldChamferMat,
  );
  leicaTrimRing.position.z = 0.136;
  leicaIsland.add(leicaTrimRing);

  // Monolithic unified glossy obsidian Leica optical glass plate (recessed barrels + exact vertical LEICA markings)
  const leicaGlassDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.596, 72)),
    leicaGlassPlateMat,
  );
  leicaGlassDisc.position.z = 0.128;
  leicaIsland.add(leicaGlassDisc);

  // 12 o'clock: Authentic recessed Dual-Tone LED Flash (warm amber left + cool white right)
  const flashDotGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.005, 20));
  flashDotGeo.rotateX(Math.PI / 2);
  const flashWarm = new THREE.Mesh(flashDotGeo, flashWarmMat);
  flashWarm.position.set(-0.036, 0.448, 0.13);
  leicaIsland.add(flashWarm);
  const flashCool = new THREE.Mesh(flashDotGeo, flashCoolMat);
  flashCool.position.set(0.036, 0.448, 0.13);
  leicaIsland.add(flashCool);

  // Subtle recessed dark optical glass shimmer discs under the unified sapphire top sheet (zero loud chrome rings)
  const periGlassElement = new THREE.Mesh(
    trackGeo(createRoundedPanelGeometry(0.155, 0.168, 0.018)),
    lensOpticalGlassMat,
  );
  periGlassElement.position.set(-0.256, 0.106, 0.13);
  leicaIsland.add(periGlassElement);

  const mainLensElement = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.072, 32)),
    lensOpticalGlassMat,
  );
  mainLensElement.position.set(-0.172, -0.275, 0.13);
  leicaIsland.add(mainLensElement);

  const uwLensElement = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.06, 28)),
    lensOpticalGlassMat,
  );
  uwLensElement.position.set(0.172, -0.275, 0.13);
  leicaIsland.add(uwLensElement);

  // Continuous flush sapphire cover glass sheen spanning the entire Leica circle cleanly
  const leicaTopSheen = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.596, 72)),
    glassSheenMat,
  );
  leicaTopSheen.position.z = 0.134;
  leicaTopSheen.renderOrder = 5;
  leicaIsland.add(leicaTopSheen);

  // -------------------------------------------------------------------------
  // Layer 2: Brushed Dark-Emerald Aluminum Flat Unibody Frame (8.29mm ratio) + Real Buttons & Ports
  // -------------------------------------------------------------------------
  const chassisLayer = new THREE.Group();
  phoneGroup.add(chassisLayer);

  const outerShape = createRoundedRectShape(PHONE_W, PHONE_H, PHONE_R);
  const innerHole = createRoundedRectShape(PHONE_W - 0.088, PHONE_H - 0.088, PHONE_R - 0.036);
  outerShape.holes.push(innerHole);

  const frameGeo = trackGeo(
    new THREE.ExtrudeGeometry(outerShape, {
      depth: FRAME_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.012,
      bevelSegments: 5,
    }),
  );
  frameGeo.center();
  chassisLayer.add(new THREE.Mesh(frameGeo, emeraldTitaniumMat));

  // Front & back precision anodized metallic chamfer rims framing the screen & backplate
  const chamferShape = createRoundedRectShape(PHONE_W - 0.012, PHONE_H - 0.012, PHONE_R - 0.005);
  chamferShape.holes.push(createRoundedRectShape(PHONE_W - 0.066, PHONE_H - 0.066, PHONE_R - 0.028));
  const chamferRimGeo = trackGeo(
    new THREE.ExtrudeGeometry(chamferShape, {
      depth: 0.006,
      bevelEnabled: false,
    }),
  );
  chamferRimGeo.center();
  const frontChamfer = new THREE.Mesh(chamferRimGeo, emeraldChamferMat);
  frontChamfer.position.z = FRAME_DEPTH / 2 + 0.012;
  chassisLayer.add(frontChamfer);

  const backChamfer = new THREE.Mesh(chamferRimGeo, emeraldChamferMat);
  backChamfer.position.z = -(FRAME_DEPTH / 2 + 0.012);
  chassisLayer.add(backChamfer);

  // Realistic matte antenna injection break lines along left, right, top & bottom flat rails
  const sideAntennaGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.026, FRAME_DEPTH + 0.018));
  const topAntennaGeo = trackGeo(new THREE.BoxGeometry(0.026, 0.018, FRAME_DEPTH + 0.018));
  [
    [PHONE_W / 2 + 0.006, 1.2],
    [PHONE_W / 2 + 0.006, -1.2],
    [-PHONE_W / 2 - 0.006, 1.2],
    [-PHONE_W / 2 - 0.006, -1.2],
  ].forEach(([ax, ay]) => {
    const band = new THREE.Mesh(sideAntennaGeo, antennaBandMat);
    band.position.set(ax, ay, 0);
    chassisLayer.add(band);
  });
  [
    [-0.44, PHONE_H / 2 + 0.006],
    [0.44, -PHONE_H / 2 - 0.006],
  ].forEach(([ax, ay]) => {
    const band = new THREE.Mesh(topAntennaGeo, antennaBandMat);
    band.position.set(ax, ay, 0);
    chassisLayer.add(band);
  });

  // Authentic Xiaomi 17 Ultra China Edition Right-Side Tactile Hardware Keys:
  // TWO separate small circular camera-style volume buttons + slim flat power key below!
  const roundSocketGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 28));
  roundSocketGeo.rotateZ(Math.PI / 2);

  const roundVolBaseGeo = trackGeo(new THREE.CylinderGeometry(0.038, 0.041, 0.032, 28));
  roundVolBaseGeo.rotateZ(Math.PI / 2);

  const roundVolCapGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.037, 0.01, 28));
  roundVolCapGeo.rotateZ(Math.PI / 2);

  const addRoundVolumeButton = (by: number) => {
    const btnGroup = new THREE.Group();
    btnGroup.position.set(PHONE_W / 2 + 0.014, by, 0);
    const socket = new THREE.Mesh(roundSocketGeo, portCavityMat);
    socket.position.x = -0.003;
    btnGroup.add(socket);
    const base = new THREE.Mesh(roundVolBaseGeo, emeraldTitaniumMat);
    base.position.x = 0.008;
    btnGroup.add(base);
    const cap = new THREE.Mesh(roundVolCapGeo, emeraldChamferMat);
    cap.position.x = 0.025;
    btnGroup.add(cap);
    chassisLayer.add(btnGroup);
  };

  // Exact vertical heights matching the real Xiaomi 17 Ultra photo (alongside lower Leica arc)
  addRoundVolumeButton(0.42);
  addRoundVolumeButton(0.22);

  // Slim flat machined power button directly below the two circular volume keys
  const powerSocket = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.008, 0.258, 0.06)),
    portCavityMat,
  );
  powerSocket.position.set(PHONE_W / 2 + 0.011, -0.08, 0);
  chassisLayer.add(powerSocket);

  const powerBtnShape = createRoundedRectShape(0.048, 0.244, 0.022);
  const powerBtnGeo = trackGeo(
    new THREE.ExtrudeGeometry(powerBtnShape, {
      depth: 0.028,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 3,
    }),
  );
  powerBtnGeo.center();
  powerBtnGeo.rotateY(Math.PI / 2);
  const powerBtn = new THREE.Mesh(powerBtnGeo, emeraldChamferMat);
  powerBtn.position.set(PHONE_W / 2 + 0.02, -0.08, 0);
  chassisLayer.add(powerBtn);

  // Bottom Edge Real Hardware Ports: USB-C cavity + metallic tongue, speaker grille, SIM tray & mic
  const bottomY = -PHONE_H / 2 - 0.011;

  const usbcOuter = new THREE.Mesh(
    trackGeo(
      new THREE.ExtrudeGeometry(createRoundedRectShape(0.21, 0.052, 0.024), {
        depth: 0.01,
        bevelEnabled: false,
      }),
    ),
    portCavityMat,
  );
  usbcOuter.rotation.x = Math.PI / 2;
  usbcOuter.position.set(0, bottomY + 0.004, 0);
  chassisLayer.add(usbcOuter);

  const usbcTongue = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.145, 0.006, 0.014)),
    portMetalMat,
  );
  usbcTongue.position.set(0, bottomY + 0.002, 0);
  chassisLayer.add(usbcTongue);

  // 5-hole precision bottom speaker grille
  const holeGeo = trackGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 12));
  for (let i = 0; i < 5; i++) {
    const spkHole = new THREE.Mesh(holeGeo, portCavityMat);
    spkHole.position.set(0.22 + i * 0.044, bottomY + 0.003, 0);
    chassisLayer.add(spkHole);
  }

  // Bottom-left SIM card tray seam + ejector pinhole + primary microphone pinhole
  const simTrayOutline = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.24, 0.006, 0.044)),
    antennaBandMat,
  );
  simTrayOutline.position.set(-0.34, bottomY + 0.002, 0);
  chassisLayer.add(simTrayOutline);

  const simPinHole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 10)),
    portCavityMat,
  );
  simPinHole.position.set(-0.26, bottomY + 0.003, 0);
  chassisLayer.add(simPinHole);

  const bottomMic = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 10)),
    portCavityMat,
  );
  bottomMic.position.set(-0.16, bottomY + 0.003, 0);
  chassisLayer.add(bottomMic);

  // Top Edge Real Hardware Details: IR Blaster + Secondary Mic + Top Speaker micro-slit
  const topY = PHONE_H / 2 + 0.011;
  const irBlaster = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 14)),
    lensOpticalGlassMat,
  );
  irBlaster.position.set(0.28, topY - 0.003, 0);
  chassisLayer.add(irBlaster);

  const topMic = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 10)),
    portCavityMat,
  );
  topMic.position.set(-0.22, topY - 0.003, 0);
  chassisLayer.add(topMic);

  const topSpeakerSlit = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.18, 0.008, 0.016)),
    portCavityMat,
  );
  topSpeakerSlit.position.set(0.02, topY - 0.003, 0);
  chassisLayer.add(topSpeakerSlit);

  // -------------------------------------------------------------------------
  // Layer 1B: Inner Protective Mid-Bracket + Copper 80W Qi & NFC Coil
  // -------------------------------------------------------------------------
  const coilLayer = new THREE.Group();
  phoneGroup.add(coilLayer);

  // Protective matte graphite/polycarbonate frame with rectangular upper cutout matching the Xiaomi 17 Pro Max plateau
  const bracketShape = createRoundedRectShape(PHONE_W - 0.14, PHONE_H - 0.16, PHONE_R - 0.05);
  const camWellHole = new THREE.Path();
  const cwW = 1.12;
  const cwH = 0.68;
  const cwR = 0.12;
  const cwCy = 1.04;
  camWellHole.moveTo(-cwW / 2 + cwR, cwCy - cwH / 2);
  camWellHole.lineTo(cwW / 2 - cwR, cwCy - cwH / 2);
  camWellHole.quadraticCurveTo(cwW / 2, cwCy - cwH / 2, cwW / 2, cwCy - cwH / 2 + cwR);
  camWellHole.lineTo(cwW / 2, cwCy + cwH / 2 - cwR);
  camWellHole.quadraticCurveTo(cwW / 2, cwCy + cwH / 2, cwW / 2 - cwR, cwCy + cwH / 2);
  camWellHole.lineTo(-cwW / 2 + cwR, cwCy + cwH / 2);
  camWellHole.quadraticCurveTo(-cwW / 2, cwCy + cwH / 2, -cwW / 2, cwCy + cwH / 2 - cwR);
  camWellHole.lineTo(-cwW / 2, cwCy - cwH / 2 + cwR);
  camWellHole.quadraticCurveTo(-cwW / 2, cwCy - cwH / 2, -cwW / 2 + cwR, cwCy - cwH / 2);
  bracketShape.holes.push(camWellHole);

  const bracketGeo = trackGeo(
    new THREE.ExtrudeGeometry(bracketShape, {
      depth: 0.012,
      bevelEnabled: false,
    }),
  );
  bracketGeo.center();
  coilLayer.add(new THREE.Mesh(bracketGeo, graphiteBracketMat));

  // Textured circular/square copper wireless charging + NFC pad sitting over the battery zone
  const coilPad = new THREE.Mesh(
    trackGeo(createRoundedPanelGeometry(1.06, 1.06, 0.14)),
    wirelessCoilMat,
  );
  coilPad.position.set(0, -0.58, 0.009);
  coilLayer.add(coilPad);

  const coilPadBack = new THREE.Mesh(
    trackGeo(createRoundedPanelGeometry(1.06, 1.06, 0.14)),
    wirelessCoilMat,
  );
  coilPadBack.rotation.y = Math.PI;
  coilPadBack.position.set(0, -0.58, -0.009);
  coilLayer.add(coilPadBack);

  // Raised 3D copper Qi coil torus winding rings for real specular relief
  const coilRingOuter = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.35, 0.014, 12, 56)),
    copperTraceMat,
  );
  coilRingOuter.position.set(0, -0.58, 0.012);
  coilLayer.add(coilRingOuter);

  const coilRingInner = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.24, 0.012, 12, 48)),
    copperTraceMat,
  );
  coilRingInner.position.set(0, -0.58, 0.012);
  coilLayer.add(coilRingInner);

  // Tiny silver Torx perimeter screws holding the protective mid-bracket
  const screwGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.018, 10));
  screwGeo.rotateX(Math.PI / 2);
  [
    [-0.58, 1.38],
    [0.58, 1.38],
    [-0.58, 0.04],
    [0.58, 0.04],
    [-0.58, -1.34],
    [0.58, -1.34],
    [0, -1.38],
  ].forEach(([sx, sy]) => {
    const screw = new THREE.Mesh(screwGeo, portMetalMat);
    screw.position.set(sx, sy, 0.008);
    coilLayer.add(screw);
  });

  // -------------------------------------------------------------------------
  // Layer 3: Xiaomi 17 Pro Max Internal Teardown Core
  // - Rectangular Upper Dual-Lens Optical Bay + Rear Secondary Display Controller
  // - Wrapped L-Shaped Stacked Mainboard PCB + Snapdragon 8 Elite SoC
  // - 6000mAh High-Density Si-C Battery Pack
  // - Lower USB-C Sub-PCB + X-Axis Haptic Motor + Stereo Speaker Box + Coax RF
  // -------------------------------------------------------------------------
  const computeLayer = new THREE.Group();
  phoneGroup.add(computeLayer);

  // 3A. Xiaomi 17 Pro Max Upper Rectangular Optical & Rear-Display Driver Module
  const internalCamBay = new THREE.Group();
  internalCamBay.position.set(0, 0.88, 0.008);
  computeLayer.add(internalCamBay);

  const plateauChassisGeo = trackGeo(
    new THREE.ExtrudeGeometry(createRoundedRectShape(1.14, 0.68, 0.11), {
      depth: 0.036,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    }),
  );
  plateauChassisGeo.center();
  internalCamBay.add(new THREE.Mesh(plateauChassisGeo, camMetalMat));

  // Dual vertical optical camera barrels aligned with the Xiaomi 17 Pro Max left lens stack
  for (const ly of [0.16, -0.15]) {
    const barrelHousing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.27, 0.058)),
      shieldMat,
    );
    barrelHousing.position.set(-0.34, ly, 0.02);
    internalCamBay.add(barrelHousing);

    const oisCopperRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.105, 0.013, 10, 28)),
      copperTraceMat,
    );
    oisCopperRing.position.set(-0.34, ly, 0.052);
    internalCamBay.add(oisCopperRing);

    const sensorGlass = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.082, 0.082, 0.02, 24)),
      lensOpticalGlassMat,
    );
    sensorGlass.rotation.x = Math.PI / 2;
    sensorGlass.position.set(-0.34, ly, 0.048);
    internalCamBay.add(sensorGlass);
  }

  // Secondary rear-display driver board, brass zoom actuator, and gold flex bridge on right side of plateau
  const rearDisplayDriver = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.56, 0.48, 0.042)),
    [pcbSideMat, pcbSideMat, pcbSideMat, pcbSideMat, pcbMat, pcbMat],
  );
  rearDisplayDriver.position.set(0.22, 0.01, 0.022);
  internalCamBay.add(rearDisplayDriver);

  const driverIcShield = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.3, 0.24, 0.024)),
    shieldMat,
  );
  driverIcShield.position.set(0.22, 0.04, 0.048);
  internalCamBay.add(driverIcShield);

  const actuatorDrum = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.26, 16)),
    brassGearMat,
  );
  actuatorDrum.rotation.z = Math.PI / 2;
  actuatorDrum.position.set(0.22, -0.15, 0.048);
  internalCamBay.add(actuatorDrum);

  const rearDispFlex = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.16, 0.04, 0.014)),
    goldContactMat,
  );
  rearDispFlex.position.set(0.22, -0.22, 0.044);
  internalCamBay.add(rearDispFlex);

  // 3B. Wrapped Stacked Matte-Black Mainboard PCB + Snapdragon 8 Elite SoC + Gold EMI Shields
  const upperPcbStrip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.18, 0.34, 0.028)),
    [pcbSideMat, pcbSideMat, pcbSideMat, pcbSideMat, pcbMat, pcbMat],
  );
  upperPcbStrip.position.set(0, 1.24, 0.004);
  computeLayer.add(upperPcbStrip);

  const midPcbBridge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.18, 0.42, 0.032)),
    [pcbSideMat, pcbSideMat, pcbSideMat, pcbSideMat, pcbMat, pcbMat],
  );
  midPcbBridge.position.set(0, -0.02, 0.006);
  computeLayer.add(midPcbBridge);

  // Engraved Snapdragon 8 Elite / KodaHosting ARM64 SoC Package mounted on the mainboard bridge
  const socDie = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.36, 0.044)), [
    shieldMat,
    shieldMat,
    shieldMat,
    shieldMat,
    socTopMat,
    shieldMat,
  ]);
  socDie.position.set(0.18, -0.02, 0.03);
  computeLayer.add(socDie);

  // LPDDR5X RAM & UFS 4.1 Brushed Steel EMI Shields + Gold BTB Flex Connectors
  const ramEmiShield = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.32, 0.28, 0.034)),
    shieldMat,
  );
  ramEmiShield.position.set(-0.32, -0.02, 0.026);
  computeLayer.add(ramEmiShield);

  const pmicShield = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.38, 0.2, 0.028)),
    shieldMat,
  );
  pmicShield.position.set(-0.32, 1.24, 0.022);
  computeLayer.add(pmicShield);

  const modemShield = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.34, 0.2, 0.028)),
    shieldMat,
  );
  modemShield.position.set(0.34, 1.24, 0.022);
  computeLayer.add(modemShield);

  // Gold BTB connector sockets along the mainboard edge
  for (const bx of [-0.46, -0.14, 0.02, 0.46]) {
    const btb = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.08, 0.038, 0.014)),
      goldContactMat,
    );
    btb.position.set(bx, -0.19, 0.026);
    computeLayer.add(btb);
  }

  // 3C. Real 6000mAh Silicon-Carbon (Si-C) Battery Pack occupying the lower-middle bay
  const batteryMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.12, 0.94, 0.046)),
    [
      batteryEdgeMat,
      batteryEdgeMat,
      batteryEdgeMat,
      batteryEdgeMat,
      batteryFaceMat,
      batteryFaceMat,
    ],
  );
  batteryMesh.position.set(0, -0.72, 0.004);
  computeLayer.add(batteryMesh);

  // Dual black FPC interconnect ribbons bridging mainboard across the battery down to the USB-C sub-PCB
  const mainFpcRibbon = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.11, 1.18, 0.008)),
    flexRibbonMat,
  );
  mainFpcRibbon.position.set(-0.22, -0.74, 0.032);
  computeLayer.add(mainFpcRibbon);

  const displayFpcRibbon = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.085, 1.16, 0.008)),
    flexRibbonMat,
  );
  displayFpcRibbon.position.set(0.24, -0.74, 0.032);
  computeLayer.add(displayFpcRibbon);

  // Orange-gold Kapton FPC accent markers on ribbons
  const fpcStripe = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.112, 0.045, 0.009)),
    copperTraceMat,
  );
  fpcStripe.position.set(-0.22, -0.26, 0.033);
  computeLayer.add(fpcStripe);

  // 3D. Bottom Sub-Assembly: USB-C Daughterboard + X-Axis Linear Haptic Engine + Stereo Speaker Box
  const subPcb = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.14, 0.24, 0.024)),
    [pcbSideMat, pcbSideMat, pcbSideMat, pcbSideMat, pcbMat, pcbMat],
  );
  subPcb.position.set(0, -1.34, 0.004);
  computeLayer.add(subPcb);

  // Metallic USB-C Port Shield Cage on the center of the sub-PCB
  const usbcShield = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.22, 0.16, 0.048)),
    portMetalMat,
  );
  usbcShield.position.set(0, -1.38, 0.016);
  computeLayer.add(usbcShield);

  // Machined Brushed-Steel X-Axis Linear Haptic Motor (lower-left)
  const hapticMotor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.36, 0.2, 0.048)),
    shieldMat,
  );
  hapticMotor.position.set(-0.36, -1.34, 0.02);
  computeLayer.add(hapticMotor);

  // Bottom Acoustic Stereo Speaker Chamber (lower-right)
  const speakerBox = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.4, 0.21, 0.048)),
    camMetalMat,
  );
  speakerBox.position.set(0.36, -1.34, 0.02);
  computeLayer.add(speakerBox);

  // Dual thin coaxial RF antenna cables running along the inner right rail from mainboard to sub-PCB
  const coaxCable = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 2.52, 8)),
    portMetalMat,
  );
  coaxCable.position.set(0.61, -0.06, 0.014);
  computeLayer.add(coaxCable);

  const coaxCable2 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 2.48, 8)),
    copperTraceMat,
  );
  coaxCable2.position.set(0.585, -0.06, 0.014);
  computeLayer.add(coaxCable2);

  // -------------------------------------------------------------------------
  // Layer 4: Oversized Xiaomi 3D Dual-Loop Copper Vapor Chamber Cooling Plate
  // -------------------------------------------------------------------------
  const thermalLayer = new THREE.Group();
  phoneGroup.add(thermalLayer);

  const thermalPanelGeo = trackGeo(createRoundedPanelGeometry(1.12, 2.54, 0.12));
  const thermalPlateFront = new THREE.Mesh(thermalPanelGeo, thermalAlloyMat);
  thermalPlateFront.position.z = 0.007;
  thermalLayer.add(thermalPlateFront);

  const thermalPlateBack = new THREE.Mesh(thermalPanelGeo, thermalAlloyMat);
  thermalPlateBack.rotation.y = Math.PI;
  thermalPlateBack.position.z = -0.007;
  thermalLayer.add(thermalPlateBack);

  const thermalRimGeo = trackGeo(
    new THREE.ExtrudeGeometry(createRoundedRectShape(1.12, 2.54, 0.12), {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 2,
    }),
  );
  thermalRimGeo.center();
  thermalLayer.add(new THREE.Mesh(thermalRimGeo, copperTraceMat));

  // -------------------------------------------------------------------------
  // Layer 5: Real AMOLED Display Assembly (Actual Android App Screenshots!)
  // -------------------------------------------------------------------------
  const displayLayer = new THREE.Group();
  phoneGroup.add(displayLayer);

  const bezelBacking = new THREE.Mesh(
    trackGeo(createRoundedPanelGeometry(PHONE_W - 0.04, PHONE_H - 0.04, PHONE_R - 0.018)),
    bezelMat,
  );
  bezelBacking.position.z = -0.002;
  displayLayer.add(bezelBacking);

  const oledScreen = new THREE.Mesh(
    trackGeo(createRoundedPanelGeometry(PHONE_W - 0.088, PHONE_H - 0.088, PHONE_R - 0.04)),
    oledMat,
  );
  oledScreen.position.z = 0.006;
  displayLayer.add(oledScreen);

  // Centered front punch-hole selfie camera
  const punchHoleRing = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.034, 24)),
    portCavityMat,
  );
  punchHoleRing.position.set(0, PHONE_H / 2 - 0.125, 0.009);
  displayLayer.add(punchHoleRing);

  const punchHoleLens = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.018, 20)),
    lensOpticalGlassMat,
  );
  punchHoleLens.position.set(0, PHONE_H / 2 - 0.125, 0.011);
  displayLayer.add(punchHoleLens);

  // Subtle front top-bezel earpiece speaker micro-slit
  const earpieceSlit = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.24, 0.011, 0.006)),
    portCavityMat,
  );
  earpieceSlit.position.set(0, PHONE_H / 2 - 0.032, 0.009);
  displayLayer.add(earpieceSlit);

  const glassSheen = new THREE.Mesh(
    trackGeo(createRoundedPanelGeometry(PHONE_W - 0.044, PHONE_H - 0.044, PHONE_R - 0.02)),
    glassSheenMat,
  );
  glassSheen.position.z = 0.014;
  glassSheen.renderOrder = 4;
  displayLayer.add(glassSheen);

  // =========================================================================
  // Bundled Xiaomi 17 Pro Max .glb Shell + True GLB Exploded Cutaway Layers
  // Front OLED display + front glass explode forward; emerald unibody + dual
  // lenses + glowing rear secondary display explode backward around internals
  // =========================================================================
  const glbShellGroup = new THREE.Group();
  glbShellGroup.visible = false;
  phoneGroup.add(glbShellGroup);

  const glbFrontGroup = new THREE.Group();
  const glbRearGroup = new THREE.Group();
  let glbFrontBacking: THREE.Mesh | null = null;

  let glbLoaded = false;
  const glbCleanup: Array<() => void> = [];

  const glbUrlLoader = pickBundledGlbLoader();
  if (glbUrlLoader) {
    void glbUrlLoader()
      .then((modelUrl) => {
        if (disposed) return;
        const gltfLoader = new GLTFLoader();

        gltfLoader.load(
          modelUrl,
          (gltf) => {
            if (disposed) {
              gltf.scene.traverse((obj) => {
                if (obj instanceof THREE.Mesh) {
                  obj.geometry?.dispose();
                  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                  mats.forEach((m) => m?.dispose());
                }
              });
              return;
            }

            const model = gltf.scene;
            model.updateMatrixWorld(true);
            const rawBox = new THREE.Box3().setFromObject(model);
            const rawSize = rawBox.getSize(new THREE.Vector3());

            // Orient to vertical portrait standing along Y if exported flat
            if (rawSize.z > rawSize.y * 1.25) {
              model.rotation.x = Math.PI / 2;
            } else if (rawSize.x > rawSize.y * 1.25) {
              model.rotation.z = Math.PI / 2;
            }
            model.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxHeight = Math.max(size.y, 0.001);
            const scale = PHONE_H / maxHeight;

            model.scale.setScalar(scale);
            model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

            let screenCandidate: THREE.Mesh | null = null;
            let glassCandidate: THREE.Mesh | null = null;
            let bestFrontArea = 0;

            model.traverse((obj) => {
              if (!(obj instanceof THREE.Mesh)) return;
              const geo = obj.geometry;
              if (geo) glbCleanup.push(() => geo.dispose());

              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              const name = `${obj.name} ${mats.map((m) => m?.name || "").join(" ")}`;
              const isBackDisplay = /back|rear|display\s*2/i.test(name);
              const isFrontDisplay = !isBackDisplay && /\bdisplay\b|screen|oled|lcd/i.test(name);
              const isCoverGlass = /\bglass\b/i.test(name);

              mats.forEach((mat) => {
                if (!mat) return;
                if ("envMapIntensity" in mat && typeof mat.envMapIntensity === "number") {
                  mat.envMapIntensity = Math.max(mat.envMapIntensity, 1.15);
                }

                // Keep the iconic Xiaomi 17 Pro Max rear secondary display crisp under moonlight
                if (isBackDisplay && mat instanceof THREE.MeshStandardMaterial && mat.map) {
                  mat.emissiveMap = mat.map;
                  mat.emissive = new THREE.Color(0xffffff);
                  mat.emissiveIntensity = 0.34;
                  mat.roughness = Math.min(mat.roughness, 0.24);
                  mat.needsUpdate = true;
                }

                // Replace KHR_materials_transmission on cover glass with clearcoat lunar reflection
                // so the front Android OLED screenshot stays 100% sharp while catching moonlight sheen
                if (isCoverGlass && mat instanceof THREE.MeshPhysicalMaterial) {
                  mat.transmission = 0;
                  mat.transparent = true;
                  mat.opacity = 0.075;
                  mat.roughness = 0.035;
                  mat.metalness = 0.0;
                  mat.clearcoat = 1.0;
                  mat.clearcoatRoughness = 0.03;
                  mat.envMapIntensity = 1.35;
                  mat.depthWrite = false;
                  mat.needsUpdate = true;
                  obj.renderOrder = 4;
                }

                glbCleanup.push(() => {
                  for (const value of Object.values(mat)) {
                    if (value instanceof THREE.Texture && !textures.includes(value)) {
                      value.dispose();
                    }
                  }
                  mat.dispose();
                });
              });

              if (isCoverGlass && !glassCandidate) {
                glassCandidate = obj;
              }

              if (isFrontDisplay) {
                screenCandidate = obj;
              } else if (!screenCandidate && !isBackDisplay && !isCoverGlass && geo) {
                geo.computeBoundingBox();
                const gb = geo.boundingBox;
                if (gb) {
                  const s = gb.getSize(new THREE.Vector3());
                  const area = s.x * s.y;
                  if (area > bestFrontArea && s.z < Math.min(s.x, s.y) * 0.2) {
                    bestFrontArea = area;
                    screenCandidate = obj;
                  }
                }
              }
            });

            // Assemble front and rear cutaway groups in an identity container so transforms
            // remain 100% exact regardless of phoneGroup's animated rotation during async load
            const stagingRoot = new THREE.Group();
            stagingRoot.add(model, glbFrontGroup, glbRearGroup);
            stagingRoot.updateMatrixWorld(true);

            if (screenCandidate) {
              const screenMesh = screenCandidate as THREE.Mesh;
              const geo = screenMesh.geometry;
              const posAttr = geo?.attributes.position;
              if (geo && posAttr && posAttr.count > 0) {
                // Recompute clean planar UVs from the front screen bounds so the screenshot
                // is strictly upright (v=0 bottom -> v=1 top) and unmirrored (u=0 left -> u=1 right)
                geo.computeBoundingBox();
                const bb = geo.boundingBox;
                if (bb) {
                  const spanX = Math.max(bb.max.x - bb.min.x, 1e-5);
                  const spanY = Math.max(bb.max.y - bb.min.y, 1e-5);
                  const uvs = new Float32Array(posAttr.count * 2);
                  for (let i = 0; i < posAttr.count; i++) {
                    uvs[i * 2] = (posAttr.getX(i) - bb.min.x) / spanX;
                    uvs[i * 2 + 1] = (posAttr.getY(i) - bb.min.y) / spanY;
                  }
                  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
                }
              }
              screenMesh.material = oledMat;

              const screenWorldBox = new THREE.Box3().setFromObject(screenMesh);
              const screenSize = screenWorldBox.getSize(new THREE.Vector3());
              const screenCenter = screenWorldBox.getCenter(new THREE.Vector3());

              glbFrontGroup.attach(screenMesh);

              // Sleek dark OLED backing panel shown behind the detached screen during Cutaway
              const backingGeo = trackGeo(
                createRoundedPanelGeometry(screenSize.x + 0.03, screenSize.y + 0.03, 0.2),
              );
              glbFrontBacking = new THREE.Mesh(backingGeo, bezelMat);
              glbFrontBacking.rotation.y = Math.PI;
              glbFrontBacking.position.set(
                screenCenter.x,
                screenCenter.y,
                screenWorldBox.min.z - 0.008,
              );
              glbFrontBacking.visible = false;
              glbFrontGroup.add(glbFrontBacking);
            }

            // Split the cover glass triangles cleanly into front screen glass (z > 0) and
            // rear camera/back glass (z <= 0) so front glass glides forward with the OLED screen
            if (glassCandidate) {
              const glassMesh = glassCandidate as THREE.Mesh;
              const gGeo = glassMesh.geometry;
              const gPos = gGeo?.attributes.position;
              const gIndex = gGeo?.index;
              if (gGeo && gPos && gIndex) {
                const frontIndices: number[] = [];
                const rearIndices: number[] = [];
                for (let i = 0; i < gIndex.count; i += 3) {
                  const a = gIndex.getX(i);
                  const b = gIndex.getX(i + 1);
                  const c = gIndex.getX(i + 2);
                  if (gPos.getZ(a) > 0 && gPos.getZ(b) > 0 && gPos.getZ(c) > 0) {
                    frontIndices.push(a, b, c);
                  } else {
                    rearIndices.push(a, b, c);
                  }
                }
                if (frontIndices.length > 0 && rearIndices.length > 0) {
                  const frontGlassGeo = gGeo.clone();
                  frontGlassGeo.setIndex(frontIndices);
                  glbCleanup.push(() => frontGlassGeo.dispose());

                  gGeo.setIndex(rearIndices);

                  const frontGlassMesh = new THREE.Mesh(frontGlassGeo, glassMesh.material);
                  frontGlassMesh.renderOrder = glassMesh.renderOrder;
                  frontGlassMesh.position.copy(glassMesh.position);
                  frontGlassMesh.quaternion.copy(glassMesh.quaternion);
                  frontGlassMesh.scale.copy(glassMesh.scale);
                  if (glassMesh.parent) {
                    glassMesh.parent.add(frontGlassMesh);
                  }
                  stagingRoot.updateMatrixWorld(true);
                  glbFrontGroup.attach(frontGlassMesh);
                }
              }
            }

            glbRearGroup.attach(model);
            glbShellGroup.add(glbFrontGroup, glbRearGroup);
            glbLoaded = true;
          },
          undefined,
          () => {
            // Keep procedural shell cleanly if external GLB fails to decode
            glbLoaded = false;
          },
        );
      })
      .catch(() => {
        glbLoaded = false;
      });
  }

  // =========================================================================
  // Precision Koda Orange DE Frankfurt Reverse-Proxy Signal Arc (Cutaway Only)
  // =========================================================================
  const tunnelGroup = new THREE.Group();
  rootGroup.add(tunnelGroup);

  const relayNode = new THREE.Group();
  relayNode.position.set(1.28, 1.56, -0.35);
  tunnelGroup.add(relayNode);

  const relayCoreGeo = trackGeo(
    new THREE.ExtrudeGeometry(createRoundedRectShape(0.56, 0.36, 0.065), {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 3,
    }),
  );
  relayCoreGeo.center();
  const relayCore = new THREE.Mesh(relayCoreGeo, monolithMat);
  relayCore.rotation.x = Math.PI / 2;
  relayNode.add(relayCore);

  const relayGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff6a00,
    }),
  );
  const relayStrip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.42, 0.018, 0.015)),
    relayGlowMat,
  );
  relayStrip.position.set(0, 0.018, 0.195);
  relayNode.add(relayStrip);

  const relayRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.44, 0.005, 8, 48)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xff8c38,
        transparent: true,
        opacity: 0.38,
      }),
    ),
  );
  relayRing.rotation.x = Math.PI / 2.2;
  relayNode.add(relayRing);

  const arcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, 0.75, 0.08),
    new THREE.Vector3(0.52, 1.48, 0.28),
    new THREE.Vector3(1.18, 1.54, -0.26),
  ]);

  const arcMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff7a1a,
      transparent: true,
      opacity: 0.45,
    }),
  );
  const arcTube = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(arcCurve, 44, 0.007, 8, false)),
    arcMat,
  );
  tunnelGroup.add(arcTube);

  const PACKET_COUNT = 8;
  const packetGeo = trackGeo(new THREE.CapsuleGeometry(0.014, 0.075, 4, 8));
  const packetMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff9a44,
      transparent: true,
      opacity: 0.95,
    }),
  );
  const packetMesh = new THREE.InstancedMesh(packetGeo, packetMat, PACKET_COUNT);
  packetMesh.frustumCulled = false;
  tunnelGroup.add(packetMesh);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.8;

  let currentView: StageViewId = params.initialView ?? "dashboard";
  let currentEngine: EngineId = params.initialEngine;
  let userDragging = false;
  let transitioningCamera = true;
  let isCompact = width < 768;

  const targetCamPos = new THREE.Vector3(
    initialPose.cameraPos.x,
    initialPose.cameraPos.y,
    initialPose.cameraPos.z,
  );
  const targetLookAt = new THREE.Vector3(
    initialPose.cameraTarget.x,
    initialPose.cameraTarget.y,
    initialPose.cameraTarget.z,
  );

  let curExplode = initialPose.explode;
  let curRotX = initialPose.phoneRotX;
  let curRotY = initialPose.phoneRotY;
  let curRotZ = initialPose.phoneRotZ;
  let pointerX = 0;
  let pointerY = 0;

  function updateSocDie() {
    drawSocCanvas(socCanvas, getEngineSpec(currentEngine));
    socTexture.needsUpdate = true;
  }
  updateSocDie();

  function applyStageView(view: StageViewId) {
    currentView = view;
    const pose = solveStagePose(view, isCompact);
    oledMat.map = screenTextures[pose.screen];
    oledMat.needsUpdate = true;
    targetCamPos.set(pose.cameraPos.x, pose.cameraPos.y, pose.cameraPos.z);
    targetLookAt.set(pose.cameraTarget.x, pose.cameraTarget.y, pose.cameraTarget.z);
    transitioningCamera = true;
  }

  const onControlsStart = () => {
    userDragging = true;
    transitioningCamera = false;
  };
  const onControlsEnd = () => {
    userDragging = false;
  };
  controls.addEventListener("start", onControlsStart);
  controls.addEventListener("end", onControlsEnd);

  const onPointerMove = (event: PointerEvent) => {
    if (userDragging || reducedMotion) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    pointerY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    onContextLost?.();
  };
  renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const w = Math.max(Math.floor(entry.contentRect.width), 260);
    const h = Math.max(Math.floor(entry.contentRect.height), 320);
    isCompact = w < 768;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });
  resizeObserver.observe(container);

  let isVisible = true;
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
    },
    { rootMargin: "140px" },
  );
  intersectionObserver.observe(container);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  let disposed = false;
  let frameId = 0;
  let lastTime = performance.now();
  let elapsed = 0;

  function afterDraw(cb: () => void) {
    if (disposed) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === "function") {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 85);
        }
      };
      frameId = window.setTimeout(poll, 6);
    } else {
      frameId = window.setTimeout(cb, 95);
    }
  }

  function step(now: number) {
    if (disposed) return;
    const dt = Math.min((now - lastTime) / 1000, 0.18);
    lastTime = now;

    if (!isVisible) {
      frameId = window.setTimeout(() => step(performance.now()), 220);
      return;
    }

    if (!reducedMotion) elapsed += dt;

    const pose = solveStagePose(currentView, isCompact);
    const speed = reducedMotion ? 24 : 6.5;

    curExplode = damp(curExplode, pose.explode, speed, dt);

    const floatY = reducedMotion ? 0 : Math.sin(elapsed * 1.15) * 0.036;
    const px = !userDragging && !reducedMotion ? pointerX * 0.08 : 0;
    const py = !userDragging && !reducedMotion ? pointerY * 0.04 : 0;

    curRotX = damp(curRotX, pose.phoneRotX + py, 6, dt);
    curRotY = damp(curRotY, pose.phoneRotY + px, 6, dt);
    curRotZ = damp(curRotZ, pose.phoneRotZ, 6, dt);

    phoneGroup.position.y = floatY;
    phoneGroup.rotation.set(curRotX, curRotY, curRotZ);

    for (let i = 0; i < monoliths.length; i++) {
      const m = monoliths[i];
      const expand = 1 + curExplode * 0.22;
      m.mesh.position.set(
        m.base.x * expand,
        m.base.y + (reducedMotion ? 0 : Math.sin(elapsed * m.speed + m.phase) * 0.09),
        m.base.z - curExplode * 0.18,
      );
      m.mesh.rotation.set(
        0.4 + elapsed * m.speed * 0.45 + m.phase,
        0.6 + elapsed * m.speed * 0.6,
        0.2 + m.phase * 0.3,
      );
    }

    if (glbLoaded) {
      // Keep the real Xiaomi 17 Pro Max .glb visible at all times, including Cutaway!
      glbShellGroup.visible = true;
      rearLayer.visible = false;
      chassisLayer.visible = false;
      displayLayer.visible = false;

      glbRearGroup.position.z = -curExplode * 0.82;
      coilLayer.position.z = -curExplode * 0.34;
      computeLayer.position.z = curExplode * 0.14;
      thermalLayer.position.z = curExplode * 0.56;
      glbFrontGroup.position.z = curExplode * 0.98;
      if (glbFrontBacking) {
        glbFrontBacking.visible = curExplode > 0.02;
      }
    } else {
      glbShellGroup.visible = false;
      rearLayer.visible = true;
      chassisLayer.visible = true;
      displayLayer.visible = true;

      rearLayer.position.z = -(FRAME_DEPTH / 2 + 0.006) - curExplode * 0.82;
      coilLayer.position.z = -0.042 - curExplode * 0.48;
      chassisLayer.position.z = -curExplode * 0.15;
      computeLayer.position.z = curExplode * 0.2;
      thermalLayer.position.z = 0.036 + curExplode * 0.58;
      displayLayer.position.z = FRAME_DEPTH / 2 + 0.008 + curExplode * 0.98;
    }

    coilLayer.visible = curExplode > 0.02;
    computeLayer.visible = curExplode > 0.02;
    thermalLayer.visible = curExplode > 0.02;

    const showTunnel = curExplode > 0.25;
    tunnelGroup.visible = showTunnel;
    if (showTunnel) {
      const alpha = Math.min(1, (curExplode - 0.25) / 0.55);
      arcMat.opacity = 0.45 * alpha;
      packetMat.opacity = 0.95 * alpha;
      tunnelGroup.position.y = floatY * 0.6;

      for (let i = 0; i < PACKET_COUNT; i++) {
        const t = (i / PACKET_COUNT + elapsed * 0.32) % 1;
        arcCurve.getPointAt(t, _pos);
        arcCurve.getTangentAt(t, _tan).normalize();
        _dummy.position.copy(_pos);
        _dummy.quaternion.setFromUnitVectors(_up, _tan);
        _dummy.scale.setScalar((0.75 + Math.sin(t * Math.PI) * 0.45) * alpha);
        _dummy.updateMatrix();
        packetMesh.setMatrixAt(i, _dummy.matrix);
      }
      packetMesh.instanceMatrix.needsUpdate = true;
    }

    if (transitioningCamera) {
      camera.position.x = damp(camera.position.x, targetCamPos.x, 6.2, dt);
      camera.position.y = damp(camera.position.y, targetCamPos.y, 6.2, dt);
      camera.position.z = damp(camera.position.z, targetCamPos.z, 6.2, dt);
      controls.target.x = damp(controls.target.x, targetLookAt.x, 6.2, dt);
      controls.target.y = damp(controls.target.y, targetLookAt.y, 6.2, dt);
      controls.target.z = damp(controls.target.z, targetLookAt.z, 6.2, dt);
      if (
        camera.position.distanceTo(targetCamPos) < 0.015 &&
        controls.target.distanceTo(targetLookAt) < 0.015
      ) {
        transitioningCamera = false;
      }
    }
    controls.update();

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(() => step(performance.now()));
    } else {
      frameId = window.requestAnimationFrame(step);
    }
  }

  step(performance.now());
  onReady?.();

  return {
    setView(view: StageViewId) {
      applyStageView(view);
    },
    setEngine(engine: EngineId) {
      currentEngine = engine;
      updateSocDie();
    },
    resetCamera() {
      applyStageView(currentView);
    },
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      controls.removeEventListener("start", onControlsStart);
      controls.removeEventListener("end", onControlsEnd);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      controls.dispose();
      glbCleanup.forEach((fn) => fn());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
