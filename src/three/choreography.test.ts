import assert from "node:assert/strict";
import test from "node:test";
import {
  clamp01,
  damp,
  ENGINES,
  getEngineSpec,
  sanitizeSubdomain,
  solveStagePose,
} from "./choreography.ts";
import {
  buildOuterCubieCoords,
  easeInOutCubic,
  solveCubeSliceTwist,
} from "./resend-cube-math.ts";

test("clamp01 safely bounds out-of-range and NaN inputs", () => {
  assert.equal(clamp01(-0.5), 0);
  assert.equal(clamp01(1.8), 1);
  assert.equal(clamp01(0.42), 0.42);
  assert.equal(clamp01(Number.NaN), 0);
});

test("solveStagePose selects authentic screens and activates cutaway + tunnel cleanly", () => {
  const dash = solveStagePose("dashboard", false);
  assert.equal(dash.screen, "dashboard");
  assert.equal(dash.explode, 0);

  const cons = solveStagePose("console", false);
  assert.equal(cons.screen, "console");
  assert.equal(cons.explode, 0);

  const files = solveStagePose("files", false);
  assert.equal(files.screen, "files");

  const rear = solveStagePose("rear", false);
  assert.equal(rear.explode, 0);
  assert.ok(rear.phoneRotY > 2.5);

  const side = solveStagePose("side", false);
  assert.equal(side.explode, 0);
  assert.ok(side.phoneRotY > Math.PI * 1.15 && side.phoneRotY < Math.PI * 1.6);

  const cutaway = solveStagePose("cutaway", false);
  assert.equal(cutaway.explode, 1);
  assert.equal(cutaway.tunnelActive, 1);
});

test("compact viewport pulls camera distance slightly wider for breathing room", () => {
  const desktop = solveStagePose("dashboard", false);
  const mobile = solveStagePose("dashboard", true);
  assert.ok(mobile.cameraPos.z > desktop.cameraPos.z);
});

test("sanitizeSubdomain normalizes server names into valid DNS labels", () => {
  assert.equal(sanitizeSubdomain("Halloween World!"), "halloween-world");
  assert.equal(sanitizeSubdomain("  My__SMP_2026 "), "my-smp-2026");
  assert.equal(sanitizeSubdomain("!!!"), "survival");
});

test("engine catalog covers all 9 real KodaHosting server cores", () => {
  assert.equal(ENGINES.length, 9);
  assert.equal(getEngineSpec("pumpkin").runtimeKind, "Rust");
  assert.equal(getEngineSpec("velocity").runtimeKind, "Proxy");
  assert.equal(getEngineSpec("folia").name, "Folia");
  assert.equal(getEngineSpec("purpur").name, "Purpur");
});

test("exponential damping converges monotonically without overshoot", () => {
  let value = 0;
  for (let i = 0; i < 60; i++) {
    const next = damp(value, 1, 7, 1 / 60);
    assert.ok(next >= value && next <= 1);
    value = next;
  }
  assert.ok(value > 0.99);
});

test("resend obsidian cube shell generates exactly 26 outer cubies excluding center core", () => {
  const coords = buildOuterCubieCoords();
  assert.equal(coords.length, 26);
  assert.equal(
    coords.some((c) => c.ix === 0 && c.iy === 0 && c.iz === 0),
    false,
  );
});

test("solveCubeSliceTwist eases smoothly into 90-degree architectural slice rotations", () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);

  const start = solveCubeSliceTwist(0);
  assert.equal(start.angle, 0);
  assert.equal(start.axis, "y");

  const mid = solveCubeSliceTwist(0.8);
  assert.ok(Math.abs(mid.angle) > 0 && Math.abs(mid.angle) < Math.PI / 2);
  assert.ok(mid.pulse > 0);

  const settled = solveCubeSliceTwist(2.5);
  assert.ok(Math.abs(Math.abs(settled.angle) - Math.PI / 2) < 1e-6);
});
