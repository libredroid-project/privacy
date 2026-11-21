import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCooldownSeconds,
  normalizeFaultMode,
  parseDebugQueryParams,
  readDebugSimulationState,
  resetDebugSimulation,
  writeDebugSimulationState,
} from "./debug-ratelimit.ts";

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

test("normalizeCooldownSeconds bounds invalid and out-of-range durations safely", () => {
  assert.equal(normalizeCooldownSeconds(15), 15);
  assert.equal(normalizeCooldownSeconds("45"), 45);
  assert.equal(normalizeCooldownSeconds(-10, 30), 30);
  assert.equal(normalizeCooldownSeconds(Number.NaN, 20), 20);
  assert.equal(normalizeCooldownSeconds(9999), 600);
});

test("normalizeFaultMode accepts only valid API fault modes", () => {
  assert.equal(normalizeFaultMode("rate_limit"), "rate_limit");
  assert.equal(normalizeFaultMode("network_error"), "network_error");
  assert.equal(normalizeFaultMode("off"), "off");
  assert.equal(normalizeFaultMode("invalid"), "off");
  assert.equal(normalizeFaultMode(null), "off");
});

test("parseDebugQueryParams extracts debug panel flag, cooldown override, and fault mode", () => {
  assert.deepEqual(parseDebugQueryParams("?debug=1"), {
    openPanel: true,
    simulateSeconds: null,
    faultMode: null,
  });

  assert.deepEqual(parseDebugQueryParams("?simulate_ratelimit=25&fault=rate_limit"), {
    openPanel: false,
    simulateSeconds: 25,
    faultMode: "rate_limit",
  });

  assert.deepEqual(parseDebugQueryParams(""), {
    openPanel: false,
    simulateSeconds: null,
    faultMode: null,
  });
});

test("read/write/reset debug simulation state persists cleanly in storage", () => {
  const storage = createMemoryStorage();
  assert.deepEqual(readDebugSimulationState(storage), { mode: "off", retryAfter: 30 });

  writeDebugSimulationState({ mode: "rate_limit", retryAfter: 12 }, storage);
  assert.deepEqual(readDebugSimulationState(storage), { mode: "rate_limit", retryAfter: 12 });

  writeDebugSimulationState({ mode: "network_error", retryAfter: 60 }, storage);
  assert.deepEqual(readDebugSimulationState(storage), { mode: "network_error", retryAfter: 60 });

  resetDebugSimulation(storage);
  assert.deepEqual(readDebugSimulationState(storage), { mode: "off", retryAfter: 30 });
});
