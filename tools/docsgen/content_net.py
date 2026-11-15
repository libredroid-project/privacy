"""Documentation content: connectivity, account and support."""

GROUPS = [
    ("Connectivity", [
        ("tunnel", "Tunnel and join addresses", """
<p>Players cannot reach a phone on a home network directly, so the app runs a reverse proxy client that forwards the Minecraft ports and the dashboard through a public server. The address players use is the join address shown on the dashboard, and it changes with the tunnel, not with your home connection.</p>
<p>The tunnel credentials are not stored in the app package. The app asks the backend for them on demand, caches them for a few hours, and refreshes them in the background, which is why an expired tunnel heals itself after a while instead of needing a reinstall.</p>
<ul>
  <li><b>Join address</b> is created automatically and can be changed once per day.</li>
  <li><b>Both Java and Bedrock</b> ports are forwarded when Bedrock support is on.</li>
  <li><b>The dashboard</b> travels through the same tunnel on its own port band.</li>
</ul>
"""),
        ("custom-domain", "Custom domains", """
<p>If you own a domain, the wizard links it to the server with an SRV record: it shows the exact record values, copies them to the clipboard, and verifies through public DNS until the record is live. No DNS knowledge is required, but the wizard explains what it does at each step.</p>
<p>Because DNS changes take time, the wizard can finish later: the server stays reachable on the standard address until the record resolves. The same card can unlink the domain and return to the default address.</p>
"""),
        ("ports", "Ports and network", """
<p>Each server gets its own port, and the app manages both halves: the local port the server listens on, and the remote port the tunnel publishes. KodaDash runs on a separate port from a reserved band, so it never collides with a Minecraft server.</p>
<p>The port list on the dashboard shows what is in use and what is free. When a port is taken by another app on the phone, the server start fails with a clear message and a suggestion instead of a generic crash.</p>
"""),
        ("network-rules", "Network budgets and the network alarm", """
<p>Hosting from a phone means hosting on a connection that other people also use. The app therefore tracks how much bandwidth each server consumes and can hold a server back when a rule is set.</p>
<ul>
  <li><b>Budget rules</b> define a speed limit and a split between servers, so one busy world cannot starve the others.</li>
  <li><b>The network alarm</b> warns when the shared tunnel server is under pressure, before players notice lag.</li>
  <li><b>Protection mode</b> stops servers when the network is overloaded and tells you why, instead of letting everyone lag.</li>
</ul>
"""),
        ("koda-dash", "The KodaDash web dashboard", """
<p>KodaDash is a small Java plugin that runs inside the Minecraft server and serves a web interface on its own port, reachable through the tunnel. It is the answer to a simple question: what if I am not holding the phone?</p>
<table>
  <tr><th>Tab</th><th>What it does</th></tr>
  <tr><td>Overview</td><td>status, players, memory, TPS history and the device the server runs on</td></tr>
  <tr><td>Console</td><td>live console with streaming, history and a level filter</td></tr>
  <tr><td>Players</td><td>roster with inventories, statistics and moderation actions</td></tr>
  <tr><td>Files</td><td>browse and edit server files in the browser</td></tr>
  <tr><td>Plugins</td><td>installed jars, enable and disable, Modrinth search</td></tr>
  <tr><td>Settings</td><td>server.properties with comments preserved</td></tr>
</table>
<p>The dashboard has its own token and optional password, and the backups tab is deliberately read only: a stolen dashboard token should not be able to destroy the only copy of a world.</p>
"""),
        ("koda-dash-mcp", "MCP for AI clients", """
<p>KodaDash 1.1.0 adds a Model Context Protocol endpoint. An AI client that supports remote MCP can then inspect the server, read files and logs, run console commands and change settings without the app being open. The AI is a normal MCP client, not a chat window inside KodaHosting.</p>
<h4>Before you start</h4>
<ul>
  <li>A Paper or Purpur server with KodaDash enabled and running.</li>
  <li>KodaHosting v0.147beta / version code 8527 or newer, because that build contains the KodaDash 1.1.0 jar.</li>
  <li>The HTTPS dashboard address, for example <code>https://your-server.kodaserv.eu/</code>. The MCP endpoint is the same host with <code>/mcp</code>.</li>
</ul>
<h4>Enable MCP</h4>
<ol>
  <li>Open the KodaDash dashboard and go to <b>Settings, AI access (MCP)</b>. In the app the same screen is under the server, <b>KodaDash, AI access (MCP)</b>.</li>
  <li>Open <b>Connection</b> and turn on <b>Enable MCP</b>. KodaDash generates a separate MCP token.</li>
  <li>Copy the endpoint and the token. The endpoint looks like <code>https://your-server.kodaserv.eu/mcp</code>.</li>
</ol>
<p>The MCP token is not the dashboard token and not the KodaHosting account password. It is a separate credential that only works on this server and only for the tools you allow.</p>
<p>The app's MCP sheet also has <b>How to set up</b> and <b>Troubleshooting</b> rows with the same steps, so the setup and the common fixes are available without opening this page.</p>
<h4>Connect an AI client</h4>
<p>Every client needs the same three values: the endpoint URL, the MCP token and the HTTP transport. Only the menu names differ. The table maps the common harnesses; the examples below show the exact file or fields.</p>
<table>
  <tr><th>Client</th><th>Where it lives</th><th>What to enter</th></tr>
  <tr><td>ZCode</td><td>MCP server list, New MCP server</td><td>Type HTTP, URL, Headers JSON</td></tr>
  <tr><td>Codex</td><td><code>~/.codex/config.toml</code></td><td><code>[mcp_servers.…]</code>, <code>url</code>, <code>bearer_token_env_var</code></td></tr>
  <tr><td>Antigravity</td><td><code>~/.gemini/config/mcp_config.json</code></td><td><code>serverUrl</code>, <code>headers</code></td></tr>
  <tr><td>Claude Code</td><td><code>.mcp.json</code> or <code>claude mcp add-json</code></td><td><code>type: http</code>, <code>url</code>, <code>headers</code></td></tr>
  <tr><td>Cursor</td><td><code>~/.cursor/mcp.json</code> or <code>.cursor/mcp.json</code></td><td><code>url</code>, <code>headers</code></td></tr>
  <tr><td>VS Code</td><td><code>.vscode/mcp.json</code> or user <code>mcp.json</code></td><td><code>servers</code>, <code>type: http</code>, <code>url</code>, <code>headers</code></td></tr>
  <tr><td>Windsurf</td><td><code>~/.codeium/windsurf/mcp_config.json</code></td><td><code>serverUrl</code>, <code>headers</code></td></tr>
  <tr><td>Claude Desktop</td><td>Connectors or a stdio bridge</td><td>OAuth, or <code>mcp-remote</code> for a static Bearer header</td></tr>
</table>
<h4>ZCode</h4>
<ol>
  <li>Open the MCP server list and choose <b>New MCP server</b>.</li>
  <li>Name: <code>kodahosting-your-server</code>. Scope: <b>This computer</b> or <b>User</b>.</li>
  <li>Type: <b>HTTP</b>. Timeout MS: <code>30000</code>. Protocol version: <b>Auto</b>.</li>
  <li>URL: <code>https://your-server.kodaserv.eu/mcp</code>.</li>
  <li>Headers: <code>{"Authorization": "Bearer &lt;mcp-token&gt;"}</code> in the Form or JSON tab.</li>
  <li>Save. The KodaDash tools should appear in the client's tool list.</li>
</ol>
<p>30000 ms is enough; use 60000 if the phone is slow to start the server. Leave Protocol version on Auto.</p>
<h4>Codex</h4>
<pre><code>[mcp_servers.kodahosting]
url = "https://your-server.kodaserv.eu/mcp"
bearer_token_env_var = "KODA_MCP_TOKEN"</code></pre>
<p>Export the token in the environment Codex starts from, not in the TOML: <code>export KODA_MCP_TOKEN=&lt;mcp-token&gt;</code>. The CLI form is <code>codex mcp add kodahosting --url https://your-server.kodaserv.eu/mcp --bearer-token-env-var KODA_MCP_TOKEN</code>. If you need a static header, use <code>[mcp_servers.kodahosting.http_headers]</code> with <code>Authorization = "Bearer ..."</code>; the environment variable is safer.</p>
<h4>Antigravity</h4>
<pre><code>{
  "mcpServers": {
    "kodahosting": {
      "serverUrl": "https://your-server.kodaserv.eu/mcp",
      "headers": { "Authorization": "Bearer &lt;mcp-token&gt;" }
    }
  }
}</code></pre>
<p>Antigravity expects <code>serverUrl</code>, not <code>url</code>. The global file is <code>~/.gemini/config/mcp_config.json</code>; a workspace can use <code>.agents/mcp_config.json</code>. The CLI form is <code>agy mcp add --type http --header "Authorization: Bearer &lt;mcp-token&gt;" kodahosting https://your-server.kodaserv.eu/mcp</code>.</p>
<h4>Claude Code</h4>
<pre><code>{
  "mcpServers": {
    "kodahosting": {
      "type": "http",
      "url": "https://your-server.kodaserv.eu/mcp",
      "headers": { "Authorization": "Bearer ${KODA_MCP_TOKEN}" }
    }
  }
}</code></pre>
<p>Put this in <code>.mcp.json</code> or use <code>claude mcp add-json kodahosting '{...}'</code>. Claude Code expands shell environment variables; it does not read a plain <code>.env</code> file.</p>
<h4>Cursor</h4>
<pre><code>{
  "mcpServers": {
    "kodahosting": {
      "url": "https://your-server.kodaserv.eu/mcp",
      "headers": { "Authorization": "Bearer ${env:KODA_MCP_TOKEN}" }
    }
  }
}</code></pre>
<p>Global file <code>~/.cursor/mcp.json</code>, project file <code>.cursor/mcp.json</code>. Cursor detects Streamable HTTP from <code>url</code>.</p>
<h4>VS Code</h4>
<pre><code>{
  "inputs": [
    { "type": "promptString", "id": "koda-mcp-token", "description": "KodaHosting MCP token", "password": true }
  ],
  "servers": {
    "kodahosting": {
      "type": "http",
      "url": "https://your-server.kodaserv.eu/mcp",
      "headers": { "Authorization": "Bearer ${input:koda-mcp-token}" }
    }
  }
}</code></pre>
<p>VS Code uses <code>servers</code>, not <code>mcpServers</code>. Put it in <code>.vscode/mcp.json</code> or run <b>MCP: Open User Configuration</b> from the Command Palette.</p>
<h4>Windsurf</h4>
<pre><code>{
  "mcpServers": {
    "kodahosting": {
      "serverUrl": "https://your-server.kodaserv.eu/mcp",
      "headers": { "Authorization": "Bearer ${env:KODA_MCP_TOKEN}" }
    }
  }
}</code></pre>
<p>Windsurf uses <code>serverUrl</code>; a copied <code>url</code> key can fail silently. Refresh the MCP panel after editing.</p>
<h4>Claude Desktop</h4>
<p>The native custom connector accepts public or OAuth servers; a static Bearer header is not available in every build. If your build has a request-header field, use it. Otherwise add a local stdio bridge such as <code>mcp-remote</code>:</p>
<pre><code>{
  "mcpServers": {
    "kodahosting": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-server.kodaserv.eu/mcp",
               "--header", "Authorization:${AUTH_HEADER}"],
      "env": { "AUTH_HEADER": "Bearer &lt;mcp-token&gt;" }
    }
  }
}</code></pre>
<p>On Windows, keep the space inside <code>AUTH_HEADER</code> and use <code>Authorization:${AUTH_HEADER}</code>; a space in the argument can be split. KodaDash does not ship this bridge.</p>
<h4>Anything else</h4>
<p>Use the common <code>mcpServers</code> shape with <code>url</code> and <code>headers</code>. If the client asks for a type, choose HTTP or Streamable HTTP. If it uses <code>serverUrl</code> instead of <code>url</code>, rename the key. A client that only supports stdio needs an HTTP-to-stdio bridge.</p>
<h4>Test it with curl</h4>
<pre><code>curl -s https://your-server.kodaserv.eu/mcp \\
  -H "Authorization: Bearer &lt;mcp-token&gt;" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'</code></pre>
<p>A successful answer contains a <code>tools</code> array. <code>GET /mcp</code> returns 405 on purpose: this endpoint accepts POST only and does not offer SSE.</p>
<h4>What the AI can do</h4>
<table>
  <tr><th>Area</th><th>Tools</th></tr>
  <tr><td>Read</td><td>server status, console tail, online players, playtime, stats history, files, logs, plugins, server.properties, schedules and the backup index</td></tr>
  <tr><td>Console</td><td>run a command as the console sender, except start, stop, restart and hibernate</td></tr>
  <tr><td>Files</td><td>list, read, write, rename, create folders and delete</td></tr>
  <tr><td>Server</td><td>read and change server.properties</td></tr>
  <tr><td>Plugins</td><td>list, enable, disable and install a jar from a public HTTPS URL</td></tr>
</table>
<p>The AI can never start, stop, restart or hibernate the server. Those actions stay with the human owner in the app or the dashboard. The server rejects those console commands even if the AI tries.</p>
<h4>Security</h4>
<ul>
  <li><b>Read-only</b> hides every write tool. Use it when the AI should only look around.</li>
  <li><b>Capability switches</b> turn console, file writes, server.properties and plugins on or off separately.</li>
  <li><b>Regenerate</b> rotates the MCP token immediately. The old token stops working; update the AI client afterwards.</li>
  <li>Destructive tools need <code>confirm:true</code>, and file writes need it to overwrite an existing file.</li>
  <li>Every call is written to <code>plugins/KodaDash/mcp-audit.log</code>. File contents and values whose names contain password, secret or token are redacted.</li>
  <li><code>plugins/KodaDash/config.yml</code>, the audit log and <code>.frpc.toml</code> are blocked from the MCP file tools.</li>
  <li>The token is a Bearer secret. Anyone who has it can use the enabled tools. Treat it like a root password and do not put it in a public repository or a screenshot.</li>
</ul>
<h4>What the AI is told</h4>
<p>On connect, KodaDash sends an MCP system prompt with the KodaHosting context, the server software and version, the worlds, plugins, current players and TPS, and the phone model, Android version, RAM, battery and storage. It also states the rules: never start or stop the server, ask before destructive changes, never reveal tokens, and prefer read-only tools.</p>
<p>Server version and software come from the running server and are authoritative. The app and cloud mirror in <code>server-info.json</code> is secondary and labelled as possibly stale. A wrong cloud <code>server_version</code> is shown as a mirror value and never used as the real version. The read-only <code>server_context</code> tool returns the same data later, even if the client does not keep the initial prompt.</p>
<h4>Troubleshooting</h4>
<table>
  <tr><th>Symptom</th><th>Check</th></tr>
  <tr><td>404</td><td>MCP is off, or KodaDash is off. Turn both on; the endpoint exists only while KodaDash is enabled.</td></tr>
  <tr><td>401</td><td>The token is wrong or was regenerated. Copy the current token from Connection.</td></tr>
  <tr><td>405 on GET</td><td>Normal. Use POST; there is no SSE stream.</td></tr>
  <tr><td>No connection</td><td>The server must be online and the HTTPS dashboard must work. Open <code>https://&lt;server&gt;/</code> first.</td></tr>
  <tr><td>Tools are missing</td><td>Read-only mode or a capability switch is off. Open Permissions.</td></tr>
  <tr><td>Old plugin</td><td>KodaDash is loaded from the app on server start. Install 8527 or newer, then restart the server once.</td></tr>
</table>
<p>The audit log is the first place to look when the AI did something unexpected. It records the tool, redacted arguments, result and duration for every call.</p>
"""),
        ("bedrock", "Bedrock crossplay", """
<p>With Geyser and Floodgate installed, Bedrock players can join a Java server. The app installs both plugins, writes their configuration from templates that already match the server settings, and opens the extra port the Bedrock protocol needs.</p>
<p>PumpkinMC, the native server, has Bedrock support built in, so on that server the switch is simply part of the server itself. Either way the dashboard shows both addresses: the Java one and the Bedrock one with its port.</p>
"""),
        ("voicechat", "Voice chat", """
<p>For Simple Voice Chat the app installs the plugin or mod matching the server type, opens the extra UDP port through the tunnel, and writes the voice chat configuration with the correct port and address. The result is voice that works for Java and Bedrock players without a separate server.</p>
"""),
    ]),
    ("Account and support", [
        ("account", "Your account", """
<p>An account is optional, and the app works fully without one. With an account you get your servers on the website, the ability to recover them on a new device, and the family features.</p>
<p>Signing in happens with email and password or with Google, and the account links to the device, not the other way around: the device token stays the credential that authorises every write, and it never leaves the phone.</p>
"""),
        ("linking", "Linking a Minecraft account", """
<p>Linking proves that a Minecraft player belongs to you, which is what the lobby and the <code>/join</code> command use. The app generates a short code, you join the lobby server and type <code>/link</code> with that code, and the link appears in your account card.</p>
<p>One Minecraft account belongs to one device at a time. Moving it to another device is a deliberate action, and the old device loses the link when the new one takes it, which keeps shared accounts from drifting apart.</p>
"""),
        ("nickname", "Your nickname", """
<p>A nickname is what friends see in the shared server list and in the lobby, instead of a device identifier. The app asks once after the first start and then about once a day when you open a screen that shows other people, and it can be changed in the settings at any time.</p>
"""),
        ("device-transfer", "Moving servers to a new device", """
<p>Transfer takes a server from one phone to another over the local network, encrypted end to end. The old device packs and serves the files, the new device downloads and adopts them, and the join addresses follow the server.</p>
<ul>
  <li><b>Pairing</b> works by picking the target device or by an eight character code, and the receiving side always confirms with a dialog that names the sender.</li>
  <li><b>Encryption</b> uses a key that only exists during the transfer window, so the LAN traffic is unreadable even on a shared network.</li>
  <li><b>Cleanup</b> happens after the receiving side confirms, never before, so an interrupted transfer leaves the old copy intact.</li>
</ul>
"""),
        ("family", "Family accounts and permissions", """
<p>One account can hold several servers, and other people can be linked to them with individual permissions: who may start, stop, hibernate, delete, manage players, install plugins or use the console. The permission dialog lists them as switches, and a main account keeps full control.</p>
<p>Everyone signs in with their own credentials, so the permissions apply to people, not to devices. Revoking access is one switch and takes effect on the next action.</p>
"""),
        ("cluster", "KodaCluster", """
<p>Two phones can be joined with a USB cable into a small fleet: one device is the master and shows a dashboard of both machines, and can start and stop servers on the other device. The link speaks a small JSON protocol over USB, so it works without a network at all.</p>
<div class="callout">The slave device has to be set to file transfer mode, and the USB accessory filter is part of the app manifest, so the cluster connects without any setup inside the app.</div>
"""),
        ("support", "Tickets and bug reports", """
<p>Support happens inside the app: a ticket with a subject and a message, attachments if you have them, and a conversation thread that shows replies. Bug reports and server reports are the same mechanism with a shorter form, so nothing gets lost between a chat message and a real ticket.</p>
<p>You need an account to open a ticket, because the reply has to reach you. The ticket list shows the state of everything you sent, and the conversation keeps its history.</p>
"""),
        ("personal-chat", "The personal chat", """
<p>Beyond tickets there is a direct line to the developer, encrypted end to end. The keys are generated on the device, the private key never leaves it, and messages are encrypted with ECDH and AES-GCM before they are stored.</p>
<p>On the other side only the developer can decrypt, using a key that lives in a separate admin app behind a PIN. That is the entire point of the feature: honest words stay between two people, and nobody in between can read them, including the server that stores them.</p>
"""),
        ("crisis", "The help screen", """
<p>When something in a session suggests that a person is not doing well, the app shows a quiet screen that exists for one purpose: to say that someone cares and to offer real ways to get help, including hotlines, a chat service for younger people and the personal chat.</p>
<p>It never blocks, never reports anything, never changes a server, and disappearing from it needs a short countdown. The screen is part of the app because the people who use it are people, and the project is built by one.</p>
"""),
        ("bans", "Bans and enforcement", """
<p>A ban is the last resort, and the app treats it that way. Server names are checked before they are created, reports are reviewed by a human, and a banned server shows a screen that explains the reason and offers a backup download instead of a dead end.</p>
<p>Device bans address abuse that survives reinstalls. They are rare, and the code that triggers them is deliberately narrow: file tampering with the app's own state and forged identities, nothing else.</p>
"""),
    ]),
]
