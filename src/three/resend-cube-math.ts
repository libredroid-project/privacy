export type CubeAxis = "x" | "y" | "z";

export interface SliceTwistState {
  axis: CubeAxis;
  layer: -1 | 0 | 1;
  angle: number;
  pulse: number;
}

export interface CubieCoord {
  ix: -1 | 0 | 1;
  iy: -1 | 0 | 1;
  iz: -1 | 0 | 1;
}

const SEQUENCE: { axis: CubeAxis; layer: -1 | 0 | 1; dir: 1 | -1 }[] = [
  { axis: "y", layer: 1, dir: 1 },
  { axis: "x", layer: -1, dir: -1 },
  { axis: "z", layer: 1, dir: 1 },
  { axis: "y", layer: -1, dir: -1 },
  { axis: "x", layer: 1, dir: 1 },
  { axis: "z", layer: -1, dir: -1 },
];

/**
 * Smooth cubic-in-out easing for weighted mechanical cube slice turns.
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/**
 * Generates the 26 outer cubie coordinates of a 3x3x3 Resend-style obsidian monolith
 * (leaving the center (0,0,0) hollow for the KodaHosting orange ARM64 core crystal).
 */
export function buildOuterCubieCoords(): CubieCoord[] {
  const coords: CubieCoord[] = [];
  const vals: (-1 | 0 | 1)[] = [-1, 0, 1];
  for (const ix of vals) {
    for (const iy of vals) {
      for (const iz of vals) {
        if (ix === 0 && iy === 0 && iz === 0) continue;
        coords.push({ ix, iy, iz });
      }
    }
  }
  return coords;
}

/**
 * Deterministic architectural twist solver: smoothly rotates one 3x3 slice
 * by 90 degrees, holds briefly for sculptural stillness, then advances to the next axis.
 */
export function solveCubeSliceTwist(elapsedSeconds: number): SliceTwistState {
  const stepDuration = 3.2;
  const moveFraction = 0.52;
  const safeTime = Math.max(0, elapsedSeconds);
  const stepIndex = Math.floor(safeTime / stepDuration);
  const stepLocal = (safeTime % stepDuration) / stepDuration;
  const step = SEQUENCE[stepIndex % SEQUENCE.length];

  const moveProgress = stepLocal < moveFraction ? stepLocal / moveFraction : 1;
  const eased = easeInOutCubic(moveProgress);
  const angle = eased * (Math.PI / 2) * step.dir;

  // Subtle breathing expansion while a slice is mid-twist
  const pulse = Math.sin(moveProgress * Math.PI) * 0.045;

  return {
    axis: step.axis,
    layer: step.layer,
    angle,
    pulse,
  };
}
