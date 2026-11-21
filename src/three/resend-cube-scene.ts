import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { damp } from "./choreography";
import { createBrushedMetalTexture } from "./textures";
import { buildOuterCubieCoords, solveCubeSliceTwist, type CubieCoord } from "./resend-cube-math";

export interface ResendCubeParams {
  container: HTMLElement;
  reducedMotion: boolean;
  onContextLost?: () => void;
}

export interface ResendCubeController {
  pulseAccent: () => void;
  dispose: () => void;
}

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

function createBeveledCubieGeometry(size: number, radius: number, bevel: number): THREE.ExtrudeGeometry {
  const s = size - bevel * 2;
  const h = s / 2;
  const r = Math.min(radius, h * 0.45);
  const shape = new THREE.Shape();
  shape.moveTo(-h + r, -h);
  shape.lineTo(h - r, -h);
  shape.quadraticCurveTo(h, -h, h, -h + r);
  shape.lineTo(h, h - r);
  shape.quadraticCurveTo(h, h, h - r, h);
  shape.lineTo(-h + r, h);
  shape.quadraticCurveTo(-h, h, -h, h - r);
  shape.lineTo(-h, -h + r);
  shape.quadraticCurveTo(-h, -h, -h + r, -h);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: s,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

const _vec = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisZ = new THREE.Vector3(0, 0, 1);

/**
 * Resend-inspired machined 3x3x3 obsidian titanium architectural cube cluster
 * with an illuminated KodaHosting orange ARM64 core crystal and studio specular edges.
 */
export function mountResendCubeScene(params: ResendCubeParams): ResendCubeController {
  const { container, reducedMotion, onContextLost } = params;
  const isSoftwareGl = detectSoftwareGl();

  const width = Math.max(container.clientWidth, 260);
  const height = Math.max(container.clientHeight, 260);

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 30);
  camera.position.set(3.6, 2.75, 4.15);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.035);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 1.05;
  pmrem.dispose();

  // Sharp Resend architectural monochrome studio rim lighting + subtle Koda orange interior warmth
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(4.5, 6.2, 4.2);
  scene.add(keyLight);

  const coolFill = new THREE.HemisphereLight(0xe4e4e7, 0x050507, 0.65);
  scene.add(coolFill);

  const rimSilver = new THREE.DirectionalLight(0xd4d4d8, 1.9);
  rimSilver.position.set(-4.2, -1.8, -3.8);
  scene.add(rimSilver);

  const innerCoreLight = new THREE.PointLight(0xff6a00, 3.6, 5.2, 1.8);
  innerCoreLight.position.set(0, 0, 0);
  scene.add(innerCoreLight);

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

  const brushedMap = trackTex(createBrushedMetalTexture(maxAnisotropy));

  // Two distinct obsidian finishes for authentic Resend multi-material depth
  const obsidianGlossMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x16161b,
      metalness: 0.92,
      roughness: 0.16,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      anisotropy: 0.72,
      bumpMap: brushedMap,
      bumpScale: 0.0022,
    }),
  );

  const brushedGraphiteMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x24242b,
      metalness: 0.88,
      roughness: 0.34,
      anisotropy: 0.85,
      bumpMap: brushedMap,
      bumpScale: 0.003,
      roughnessMap: brushedMap,
    }),
  );

  const kodaTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff6a00,
      emissive: 0xff5a00,
      emissiveIntensity: 1.5,
      metalness: 0.3,
      roughness: 0.25,
    }),
  );

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const cubieGeo = trackGeo(createBeveledCubieGeometry(0.54, 0.075, 0.042));
  const coords = buildOuterCubieCoords();

  interface CubieItem {
    mesh: THREE.Mesh;
    coord: CubieCoord;
  }

  const cubies: CubieItem[] = coords.map((coord) => {
    const isCorner = Math.abs(coord.ix) + Math.abs(coord.iy) + Math.abs(coord.iz) === 3;
    const mesh = new THREE.Mesh(cubieGeo, isCorner ? obsidianGlossMat : brushedGraphiteMat);
    rootGroup.add(mesh);
    return { mesh, coord };
  });

  // Inner KodaHosting orange ARM64 core crystal visible through precision seams
  const coreMesh = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.46, 0)),
    kodaTrimMat,
  );
  rootGroup.add(coreMesh);

  // Subtle architectural orbital hairline ring framing the monolith
  const haloRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.78, 0.0045, 8, 96)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.14,
      }),
    ),
  );
  haloRing.rotation.x = Math.PI * 0.42;
  haloRing.rotation.y = Math.PI * 0.14;
  scene.add(haloRing);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;

  let isVisible = true;
  let userDragging = false;
  let hoverBoost = 0;
  let pulseEnergy = 0;
  let pointerX = 0;
  let pointerY = 0;

  controls.addEventListener("start", () => {
    userDragging = true;
  });
  controls.addEventListener("end", () => {
    userDragging = false;
  });

  const onPointerMove = (event: PointerEvent) => {
    if (userDragging || reducedMotion) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    hoverBoost = inside ? 1 : 0;
    if (inside) {
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    }
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
    const w = Math.max(Math.floor(entry.contentRect.width), 220);
    const h = Math.max(Math.floor(entry.contentRect.height), 220);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
    },
    { rootMargin: "120px" },
  );
  intersectionObserver.observe(container);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  let disposed = false;
  let frameId = 0;
  let lastTime = performance.now();
  let elapsed = 0;
  let smoothHover = 0;

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
          frameId = window.setTimeout(poll, 8);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 110);
        }
      };
      frameId = window.setTimeout(poll, 8);
    } else {
      frameId = window.setTimeout(cb, 120);
    }
  }

  function step(now: number) {
    if (disposed) return;
    const dt = Math.min((now - lastTime) / 1000, 0.08);
    lastTime = now;

    if (!isVisible) {
      frameId = window.setTimeout(() => step(performance.now()), 220);
      return;
    }

    if (!reducedMotion) {
      elapsed += dt;
    }

    smoothHover = damp(smoothHover, hoverBoost, 5, dt);
    pulseEnergy = damp(pulseEnergy, 0, 3.6, dt);

    const twist = reducedMotion
      ? { axis: "y" as const, layer: 1 as const, angle: 0.28, pulse: 0.02 }
      : solveCubeSliceTwist(elapsed);

    const spacing = 0.615 + twist.pulse + smoothHover * 0.032 + pulseEnergy * 0.06;

    const rotAxis =
      twist.axis === "x" ? _axisX : twist.axis === "y" ? _axisY : _axisZ;
    _quat.setFromAxisAngle(rotAxis, twist.angle);

    for (let i = 0; i < cubies.length; i++) {
      const { mesh, coord } = cubies[i];
      _vec.set(coord.ix * spacing, coord.iy * spacing, coord.iz * spacing);

      const inSlice =
        (twist.axis === "x" && coord.ix === twist.layer) ||
        (twist.axis === "y" && coord.iy === twist.layer) ||
        (twist.axis === "z" && coord.iz === twist.layer);

      if (inSlice) {
        _vec.applyQuaternion(_quat);
        mesh.quaternion.copy(_quat);
      } else {
        mesh.quaternion.identity();
      }
      mesh.position.copy(_vec);
    }

    rootGroup.rotation.y = elapsed * 0.24 + pointerX * 0.16 * smoothHover;
    rootGroup.rotation.x = Math.sin(elapsed * 0.35) * 0.14 + pointerY * 0.12 * smoothHover;
    rootGroup.position.y = reducedMotion ? 0 : Math.sin(elapsed * 1.1) * 0.06;

    coreMesh.rotation.y = -elapsed * 0.7;
    coreMesh.rotation.z = elapsed * 0.45;
    const coreScale = 1 + pulseEnergy * 0.22 + smoothHover * 0.08;
    coreMesh.scale.setScalar(coreScale);
    innerCoreLight.intensity = 3.6 + pulseEnergy * 2.4 + smoothHover * 0.9;

    haloRing.rotation.z = elapsed * 0.12;

    controls.update();
    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(() => step(performance.now()));
    } else {
      frameId = window.requestAnimationFrame(step);
    }
  }

  step(performance.now());

  return {
    pulseAccent() {
      pulseEnergy = 1;
    },
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      controls.dispose();
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
