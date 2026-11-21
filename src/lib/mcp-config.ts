import { isDatabase, type ServerRow } from "./server-status.ts";
import {
  validateKodaBaseDomain,
  validateKodaPort,
  validateKodaSubdomain,
} from "./security.ts";

export type McpClientId =
  | "claude-code"
  | "cursor"
  | "antigravity"
  | "vscode"
  | "windsurf"
  | "codex"
  | "zcode"
  | "claude-desktop";

export interface McpClientMeta {
  id: McpClientId;
  label: string;
  fileHint: string;
  format: "json" | "toml";
  note: string;
}

export const MCP_CLIENTS: McpClientMeta[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    fileHint: ".mcp.json",
    format: "json",
    note: "Place in .mcp.json in your project root or pass to claude mcp add-json.",
  },
  {
    id: "cursor",
    label: "Cursor",
    fileHint: "~/.cursor/mcp.json",
    format: "json",
    note: "Works in global ~/.cursor/mcp.json or workspace .cursor/mcp.json.",
  },
  {
    id: "antigravity",
    label: "Antigravity",
    fileHint: "~/.gemini/config/mcp_config.json",
    format: "json",
    note: "Antigravity expects serverUrl rather than url.",
  },
  {
    id: "vscode",
    label: "VS Code",
    fileHint: ".vscode/mcp.json",
    format: "json",
    note: "VS Code uses a top-level servers object rather than mcpServers.",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    fileHint: "~/.codeium/windsurf/mcp_config.json",
    format: "json",
    note: "Windsurf uses serverUrl; refresh the MCP panel after saving.",
  },
  {
    id: "codex",
    label: "Codex",
    fileHint: "~/.codex/config.toml",
    format: "toml",
    note: "Paste into ~/.codex/config.toml. Export KODA_MCP_TOKEN in your shell when using env auth.",
  },
  {
    id: "zcode",
    label: "ZCode",
    fileHint: "New MCP server (HTTP)",
    format: "json",
    note: "Choose Type: HTTP, Timeout MS: 30000, Protocol version: Auto, and paste the Headers JSON.",
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    fileHint: "claude_desktop_config.json",
    format: "json",
    note: "Uses mcp-remote as a local stdio bridge when a static Bearer header is needed.",
  },
];

export interface DetectedMcpPermissions {
  read: boolean;
  console: boolean;
  filesWrite: boolean;
  serverSettings: boolean;
  plugins: boolean;
  modrinth: boolean;
  readOnly: boolean;
  toolNames: string[];
}

export function hasKodaDash(row: ServerRow): boolean {
  return !isDatabase(row) && Number(row.kodadash_port) > 0;
}

export function mcpServerSlug(host: string): string {
  const clean = (host || "server")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `kodahosting-${clean || "server"}`;
}

export function mcpEndpointUrl(row: ServerRow, httpsEnabled: boolean): string {
  const host = validateKodaSubdomain(row.host) || "server";
  const baseDomain = validateKodaBaseDomain(row.base_domain);
  if (httpsEnabled && validateKodaSubdomain(row.host)) {
    return `https://${host}.${baseDomain}/mcp`;
  }
  const port = validateKodaPort(row.kodadash_port) ?? 8080;
  return `http://${host}.${baseDomain}:${port}/mcp`;
}

/**
 * Classifies active KodaDash MCP capabilities directly from the live `tools/list`
 * response returned by the Minecraft server's KodaDash plugin.
 */
export function classifyMcpPermissions(toolNames: string[]): DetectedMcpPermissions {
  const normalized = toolNames.map((name) => name.trim().toLowerCase()).filter(Boolean);
  const hasAny = (patterns: RegExp[]) =>
    normalized.some((name) => patterns.some((re) => re.test(name)));

  const consoleWrite = hasAny([
    /console.*(cmd|command|exec|run|send)/,
    /run_command/,
    /send_command/,
    /execute_command/,
  ]);
  const filesWrite = hasAny([
    /file.*(write|edit|save|delete|remove|rename|move|mkdir|create)/,
    /write_file/,
    /delete_file/,
    /rename_file/,
    /create_(dir|folder)/,
  ]);
  const serverSettings = hasAny([
    /server_setting/,
    /properties.*(write|set|update|edit)/,
    /set_property/,
    /update_setting/,
  ]);
  const modrinth = hasAny([/modrinth_install/, /modrinth.*download/]);
  const plugins = hasAny([
    /plugin.*(enable|disable|install|remove|delete|toggle)/,
    /install_plugin/,
    /toggle_plugin/,
  ]);

  const anyWrite = consoleWrite || filesWrite || serverSettings || plugins || modrinth;

  return {
    read: normalized.length > 0,
    console: consoleWrite,
    filesWrite,
    serverSettings,
    plugins,
    modrinth,
    readOnly: normalized.length > 0 && !anyWrite,
    toolNames: normalized,
  };
}

export function buildMcpClientConfig({
  client,
  serverSlug,
  endpointUrl,
  token,
  useEnvVar,
}: {
  client: McpClientId;
  serverSlug: string;
  endpointUrl: string;
  token: string;
  useEnvVar: boolean;
}): string {
  const cleanToken = token.trim();
  const literalHeader = `Bearer ${cleanToken || "<paste-mcp-token-from-app>"}`;

  switch (client) {
    case "claude-code": {
      const auth = useEnvVar ? "Bearer ${KODA_MCP_TOKEN}" : literalHeader;
      return JSON.stringify(
        {
          mcpServers: {
            [serverSlug]: {
              type: "http",
              url: endpointUrl,
              headers: {
                Authorization: auth,
              },
            },
          },
        },
        null,
        2,
      );
    }

    case "cursor": {
      const auth = useEnvVar ? "Bearer ${env:KODA_MCP_TOKEN}" : literalHeader;
      return JSON.stringify(
        {
          mcpServers: {
            [serverSlug]: {
              url: endpointUrl,
              headers: {
                Authorization: auth,
              },
            },
          },
        },
        null,
        2,
      );
    }

    case "antigravity": {
      const auth = useEnvVar ? "Bearer ${KODA_MCP_TOKEN}" : literalHeader;
      return JSON.stringify(
        {
          mcpServers: {
            [serverSlug]: {
              serverUrl: endpointUrl,
              headers: {
                Authorization: auth,
              },
            },
          },
        },
        null,
        2,
      );
    }

    case "vscode": {
      if (useEnvVar) {
        return JSON.stringify(
          {
            inputs: [
              {
                type: "promptString",
                id: "koda-mcp-token",
                description: "KodaHosting MCP token",
                password: true,
              },
            ],
            servers: {
              [serverSlug]: {
                type: "http",
                url: endpointUrl,
                headers: {
                  Authorization: "Bearer ${input:koda-mcp-token}",
                },
              },
            },
          },
          null,
          2,
        );
      }
      return JSON.stringify(
        {
          servers: {
            [serverSlug]: {
              type: "http",
              url: endpointUrl,
              headers: {
                Authorization: literalHeader,
              },
            },
          },
        },
        null,
        2,
      );
    }

    case "windsurf": {
      const auth = useEnvVar ? "Bearer ${env:KODA_MCP_TOKEN}" : literalHeader;
      return JSON.stringify(
        {
          mcpServers: {
            [serverSlug]: {
              serverUrl: endpointUrl,
              headers: {
                Authorization: auth,
              },
            },
          },
        },
        null,
        2,
      );
    }

    case "codex": {
      const tomlKey = serverSlug.replace(/[^a-z0-9_]+/gi, "_");
      if (useEnvVar) {
        return [
          `[mcp_servers.${tomlKey}]`,
          `url = ${JSON.stringify(endpointUrl)}`,
          `bearer_token_env_var = "KODA_MCP_TOKEN"`,
        ].join("\n");
      }
      return [
        `[mcp_servers.${tomlKey}]`,
        `url = ${JSON.stringify(endpointUrl)}`,
        ``,
        `[mcp_servers.${tomlKey}.http_headers]`,
        `Authorization = ${JSON.stringify(literalHeader)}`,
      ].join("\n");
    }

    case "zcode": {
      return JSON.stringify(
        {
          name: serverSlug,
          type: "HTTP",
          timeoutMs: 30000,
          protocolVersion: "Auto",
          url: endpointUrl,
          headers: {
            Authorization: literalHeader,
          },
        },
        null,
        2,
      );
    }

    case "claude-desktop": {
      return JSON.stringify(
        {
          mcpServers: {
            [serverSlug]: {
              command: "npx",
              args: [
                "-y",
                "mcp-remote",
                endpointUrl,
                "--header",
                "Authorization:${AUTH_HEADER}",
              ],
              env: {
                AUTH_HEADER: literalHeader,
              },
            },
          },
        },
        null,
        2,
      );
    }
  }
}
