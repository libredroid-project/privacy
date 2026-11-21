import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMcpClientConfig,
  classifyMcpPermissions,
  hasKodaDash,
  mcpEndpointUrl,
  mcpServerSlug,
} from "./mcp-config.ts";

test("hasKodaDash filters out databases and servers without kodadash_port", () => {
  assert.equal(hasKodaDash({ host: "survival", kodadash_port: 25600 }), true);
  assert.equal(hasKodaDash({ host: "survival", kodadash_port: 0 }), false);
  assert.equal(hasKodaDash({ host: "db_main", kodadash_port: 25600 }), false);
});

test("mcpEndpointUrl respects https toggle and base domain", () => {
  assert.equal(
    mcpEndpointUrl({ host: "halloween", base_domain: "kodaserv.eu", kodadash_port: 26001 }, true),
    "https://halloween.kodaserv.eu/mcp",
  );
  assert.equal(
    mcpEndpointUrl({ host: "halloween", base_domain: "kodaserv.eu", kodadash_port: 26001 }, false),
    "http://halloween.kodaserv.eu:26001/mcp",
  );
});

test("mcpServerSlug sanitizes hostnames cleanly", () => {
  assert.equal(mcpServerSlug("My_World 01"), "kodahosting-my-world-01");
  assert.equal(mcpServerSlug("halloween"), "kodahosting-halloween");
});

test("classifyMcpPermissions detects read-only vs enabled write capabilities", () => {
  const readOnly = classifyMcpPermissions(["mcp_status", "server_context", "console_tail", "list_files"]);
  assert.equal(readOnly.read, true);
  assert.equal(readOnly.readOnly, true);
  assert.equal(readOnly.console, false);
  assert.equal(readOnly.modrinth, false);

  const full = classifyMcpPermissions([
    "mcp_status",
    "run_command",
    "write_file",
    "server_setting",
    "install_plugin",
    "modrinth_install",
  ]);
  assert.equal(full.readOnly, false);
  assert.equal(full.console, true);
  assert.equal(full.filesWrite, true);
  assert.equal(full.serverSettings, true);
  assert.equal(full.plugins, true);
  assert.equal(full.modrinth, true);
});

test("buildMcpClientConfig produces valid client-specific payloads with filled token or env vars", () => {
  const claude = JSON.parse(
    buildMcpClientConfig({
      client: "claude-code",
      serverSlug: "kodahosting-halloween",
      endpointUrl: "https://halloween.kodaserv.eu/mcp",
      token: "koda_mcp_secret_123",
      useEnvVar: false,
    }),
  );
  assert.equal(claude.mcpServers["kodahosting-halloween"].type, "http");
  assert.equal(
    claude.mcpServers["kodahosting-halloween"].headers.Authorization,
    "Bearer koda_mcp_secret_123",
  );

  const antigravity = JSON.parse(
    buildMcpClientConfig({
      client: "antigravity",
      serverSlug: "kodahosting-halloween",
      endpointUrl: "https://halloween.kodaserv.eu/mcp",
      token: "",
      useEnvVar: true,
    }),
  );
  assert.equal(
    antigravity.mcpServers["kodahosting-halloween"].serverUrl,
    "https://halloween.kodaserv.eu/mcp",
  );
  assert.equal(
    antigravity.mcpServers["kodahosting-halloween"].headers.Authorization,
    "Bearer ${KODA_MCP_TOKEN}",
  );

  const vscode = JSON.parse(
    buildMcpClientConfig({
      client: "vscode",
      serverSlug: "kodahosting-halloween",
      endpointUrl: "https://halloween.kodaserv.eu/mcp",
      token: "abc",
      useEnvVar: true,
    }),
  );
  assert.ok(vscode.servers["kodahosting-halloween"]);
  assert.equal(vscode.inputs[0].id, "koda-mcp-token");

  const codex = buildMcpClientConfig({
    client: "codex",
    serverSlug: "kodahosting-halloween",
    endpointUrl: "https://halloween.kodaserv.eu/mcp",
    token: "abc",
    useEnvVar: true,
  });
  assert.match(codex, /\[mcp_servers\.kodahosting_halloween\]/);
  assert.match(codex, /bearer_token_env_var = "KODA_MCP_TOKEN"/);
});
