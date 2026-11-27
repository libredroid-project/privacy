"""Documentation content: connectivity, account and support."""

GROUPS = [
    ("Connectivity", [
        ("tunnel", "Tunnel and join addresses", """
<p>Most phones sit behind carrier NAT or a home router where outside players can't connect directly. To solve that, KodaHosting bundles a reverse proxy client that forwards your Minecraft ports and web dashboard through a public relay server. Players connect using the join address shown on your dashboard, which follows the tunnel rather than your home IP.</p>
<p>Tunnel credentials aren't baked into the APK. Instead, the app requests them from the backend on demand, caches them for a few hours, and refreshes them quietly in the background. If a tunnel token expires, it heals itself automatically without you ever having to reinstall the app.</p>
<ul>
  <li><b>Join address</b> is assigned automatically when you create a server, and you can change it once per day.</li>
  <li><b>Java and Bedrock</b> ports both forward automatically whenever Bedrock crossplay is enabled.</li>
  <li><b>KodaDash</b> rides through the same tunnel on its own reserved port band.</li>
</ul>
"""),
        ("custom-domain", "Custom domains", """
<p>If you already own a domain, the custom domain wizard walks you through pointing it at your server with an SRV record. It hands you the exact record values, lets you copy them with one tap, and checks public DNS until the record propagates. You don't need to be a DNS expert; the wizard explains what each record does along the way.</p>
<p>Since DNS propagation can take a little while, you can close the wizard and come back later. Your default join address keeps working in the meantime, and you can unlink your custom domain from the same card whenever you want to switch back.</p>
"""),
        ("ports", "Ports and network", """
<p>Every server gets two paired ports managed automatically by the app: the local port Minecraft binds to on the phone, and the public port exposed through the tunnel. KodaDash always uses a separate reserved port range so it never bumps into a game server.</p>
<p>You can inspect every active and free port right from the dashboard. If another app on your phone is already holding a port, startup stops with a clear explanation and a suggested fix instead of throwing a cryptic crash.</p>
"""),
        ("network-rules", "Network budgets and the network alarm", """
<p>Hosting on a phone usually means sharing Wi-Fi or mobile data with everyone else in the house. KodaHosting tracks per-server bandwidth in real time and lets you put sensible guardrails around it.</p>
<ul>
  <li><b>Budget rules</b> cap transfer speeds and split bandwidth across servers so one busy world doesn't choke the rest.</li>
  <li><b>The network alarm</b> alerts you when the shared tunnel relay starts getting heavy load, ideally before players feel any lag.</li>
  <li><b>Protection mode</b> steps in to stop servers when the network is genuinely overloaded and explains why, rather than letting everyone rubber-band.</li>
</ul>
"""),
        ("koda-dash", "The KodaDash web dashboard", """
<p>KodaDash is a lightweight Java plugin bundled inside your Minecraft server that exposes a web interface over the tunnel. It solves a super practical problem: managing your server from a laptop or browser when you don't have your phone in your hand.</p>
<table>
  <tr><th>Tab</th><th>What you get</th></tr>
  <tr><td>Overview</td><td>live status, online players, RAM usage, TPS history, and info about the phone hosting the server</td></tr>
  <tr><td>Console</td><td>live streaming console with scrollback history and log-level filtering</td></tr>
  <tr><td>Players</td><td>player list with live inventories, stats, and moderation tools</td></tr>
  <tr><td>Files</td><td>browse and edit server files right in your browser</td></tr>
  <tr><td>Plugins</td><td>view installed jars, toggle them on or off, and search Modrinth</td></tr>
  <tr><td>Settings</td><td>edit <code>server.properties</code> while preserving existing comments</td></tr>
</table>
<p>KodaDash uses its own access token and optional password. One deliberate safety choice: the backups tab is strictly read-only, so even if someone ever leaked a dashboard token, they couldn't wipe out your only world backups.</p>
"""),
        ("koda-dash-mcp", "MCP for AI clients", """
<p>Starting with KodaDash 1.2.0, your server exposes a Model Context Protocol (MCP) endpoint. Any AI client that speaks remote MCP can inspect server status, read logs and config files, run console commands, and tweak settings without you needing the phone app open. It connects directly to standard MCP clients rather than locking you into an in-app chat box.</p>
<h4>Before you start</h4>
<ul>
  <li>A running Paper or Purpur server with KodaDash enabled.</li>
  <li>KodaHosting v0.147beta / version code 8527 or newer (that build bundles the KodaDash 1.1.0 jar and newer updates).</li>
  <li>Your HTTPS dashboard URL, such as <code>https://your-server.kodaserv.eu/</code>. Your MCP endpoint is simply that same host with <code>/mcp</code> added.</li>
</ul>
<h4>Enable MCP</h4>
<ol>
  <li>In KodaDash, head to <b>Settings, AI access (MCP)</b>. Inside the Android app, open your server and go to <b>KodaDash, AI access (MCP)</b>.</li>
  <li>Open <b>Connection</b> and switch on <b>Enable MCP</b>. KodaDash generates a dedicated MCP token for you.</li>
  <li>Copy both the endpoint URL and the token. Your endpoint looks like <code>https://your-server.kodaserv.eu/mcp</code>.</li>
</ol>
<p>Your MCP token is completely separate from your KodaDash login token and your KodaHosting account password. It only grants access to this single server and only to the specific tool groups you switch on.</p>
<p>You'll also find built-in <b>How to set up</b> and <b>Troubleshooting</b> rows right inside the app's MCP sheet, so you can grab these steps offline without opening the docs.</p>
<h4>Connect an AI client</h4>
<p>Every MCP client asks for the same three ingredients: the endpoint URL, your Bearer token, and the HTTP transport. Only the config file path and key names vary. The table below gives you the quick cheat sheet, followed by copy-paste examples. Even faster: tap <b>Copy JSON</b> in the app's Connection sheet to copy a ready-to-paste <code>mcpServers</code> block.</p>
<table>
  <tr><th>Client</th><th>Config location</th><th>Fields to set</th></tr>
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
  <li>Open the MCP server list and pick <b>New MCP server</b>.</li>
  <li>Name: <code>kodahosting-your-server</code>. Scope: <b>This computer</b> or <b>User</b>.</li>
  <li>Type: <b>HTTP</b>. Timeout MS: <code>30000</code>. Protocol version: <b>Auto</b>.</li>
  <li>URL: <code>https://your-server.kodaserv.eu/mcp</code>.</li>
  <li>Headers: <code>{"Authorization": "Bearer &lt;mcp-token&gt;"}</code> in either the Form or JSON tab.</li>
  <li>Save. Your KodaDash tools should pop up in the client's tool list right away.</li>
</ol>
<p>30000 ms works well for most phones; bump it to 60000 if your device takes a bit longer to wake up. Leave Protocol version on Auto.</p>
<h4>Codex</h4>
<pre><code>[mcp_servers.kodahosting]
url = "https://your-server.kodaserv.eu/mcp"
bearer_token_env_var = "KODA_MCP_TOKEN"</code></pre>
<p>Set the token in the shell environment where you launch Codex rather than putting it straight into the TOML file: <code>export KODA_MCP_TOKEN=&lt;mcp-token&gt;</code>. You can also register it via CLI with <code>codex mcp add kodahosting --url https://your-server.kodaserv.eu/mcp --bearer-token-env-var KODA_MCP_TOKEN</code>. If you really need a static header in the file, use <code>[mcp_servers.kodahosting.http_headers]</code> with <code>Authorization = "Bearer ..."</code>, though the environment variable is much safer.</p>
<h4>Antigravity</h4>
<pre><code>{
  "mcpServers": {
    "kodahosting": {
      "serverUrl": "https://your-server.kodaserv.eu/mcp",
      "headers": { "Authorization": "Bearer &lt;mcp-token&gt;" }
    }
  }
}</code></pre>
<p>Note that Antigravity expects <code>serverUrl</code> rather than <code>url</code>. Put this in <code>~/.gemini/config/mcp_config.json</code> globally, or <code>.agents/mcp_config.json</code> inside a workspace. Via CLI: <code>agy mcp add --type http --header "Authorization: Bearer &lt;mcp-token&gt;" kodahosting https://your-server.kodaserv.eu/mcp</code>.</p>
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
<p>Save this to <code>.mcp.json</code> or pass it to <code>claude mcp add-json kodahosting '{...}'</code>. Keep in mind Claude Code reads exported shell environment variables and does not automatically load a plain <code>.env</code> file.</p>
<h4>Cursor</h4>
<pre><code>{
  "mcpServers": {
    "kodahosting": {
      "url": "https://your-server.kodaserv.eu/mcp",
      "headers": { "Authorization": "Bearer ${env:KODA_MCP_TOKEN}" }
    }
  }
}</code></pre>
<p>Works in either your global <code>~/.cursor/mcp.json</code> or a project-level <code>.cursor/mcp.json</code>. Cursor automatically picks up Streamable HTTP from the <code>url</code> field.</p>
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
<p>Heads up: VS Code uses <code>servers</code> at the top level instead of <code>mcpServers</code>. Drop this into <code>.vscode/mcp.json</code> or open your user config via <b>MCP: Open User Configuration</b> in the Command Palette.</p>
<h4>Windsurf</h4>
<pre><code>{
  "mcpServers": {
    "kodahosting": {
      "serverUrl": "https://your-server.kodaserv.eu/mcp",
      "headers": { "Authorization": "Bearer ${env:KODA_MCP_TOKEN}" }
    }
  }
}</code></pre>
<p>Windsurf specifically looks for <code>serverUrl</code>; pasting a snippet with <code>url</code> can fail silently. Hit refresh in the MCP panel after saving.</p>
<h4>Claude Desktop</h4>
<p>Claude Desktop's built-in custom connector mainly targets public or OAuth servers, and not every build exposes custom request headers. If your version lets you enter a header, use that. Otherwise, bridge it locally over stdio with <code>mcp-remote</code>:</p>
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
<p>If you're on Windows, keep the space inside <code>AUTH_HEADER</code> and pass <code>Authorization:${AUTH_HEADER}</code> so the argument doesn't get split on whitespace. Note that <code>mcp-remote</code> is an external tool and isn't bundled with KodaDash.</p>
<h4>Using another client?</h4>
<p>Start with the standard <code>mcpServers</code> layout using <code>url</code> and <code>headers</code>. If your client asks for a transport type, select HTTP or Streamable HTTP. If it expects <code>serverUrl</code> instead of <code>url</code>, swap the key name. If it only speaks stdio, put an HTTP-to-stdio bridge in front.</p>
<h4>Quick test with curl</h4>
<pre><code>curl -s https://your-server.kodaserv.eu/mcp \\
  -H "Authorization: Bearer &lt;mcp-token&gt;" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'</code></pre>
<p>If everything is wired up right, you'll get back a JSON response with a <code>tools</code> array. Seeing a 405 on <code>GET /mcp</code> is completely expected: the endpoint accepts POST requests only and doesn't run an SSE stream.</p>
<h4>What the AI can do</h4>
<table>
  <tr><th>Area</th><th>Available tools</th></tr>
  <tr><td>Read</td><td>server status, MCP status, console tail, online players, playtime, stats history, files, logs, plugins, <code>server.properties</code>, schedules, and the backup index</td></tr>
  <tr><td>Console</td><td>run commands as the console sender (excluding start, stop, restart, and hibernate)</td></tr>
  <tr><td>Files</td><td>list, read, write, rename, create directories, and delete. Files up to 16 MB go through <code>files_push</code> in one request; larger jars are assembled in ≤16 MB base64 chunks with <code>files_chunk_append</code> onto a <code>.part</code> name and swapped onto their final path with <code>files_replace_atomic</code>, so a failed transfer never leaves a half-written jar behind</td></tr>
  <tr><td>Server</td><td>read and edit <code>server.properties</code>, plus validated single-setting helpers for MOTD, max players, difficulty, gamemode, PvP, whitelist, online-mode, view distance, simulation distance, and spawn protection</td></tr>
  <tr><td>Plugins</td><td>list, enable, disable, install from a public HTTPS URL, search Modrinth, and install compatible Modrinth versions with SHA-512 verification</td></tr>
</table>
<p>An AI client can never start, stop, restart, or hibernate your server. Power controls stay strictly in human hands inside the app or dashboard, and KodaDash rejects those commands even if an AI tries sending them through the console.</p>
<p>Dedicated helper tools include <code>mcp_status</code>, <code>modrinth_search</code>, <code>modrinth_install</code>, <code>server_setting</code>, and the big-file helpers <code>files_push</code>, <code>files_chunk_append</code>, and <code>files_replace_atomic</code>. The <code>tools/list</code> call always reflects the exact tool set of the installed KodaDash version, so newer plugins can add tools without a config change on your side.</p>
<h4>Security guardrails</h4>
<ul>
  <li><b>Read-only mode</b> hides every write tool completely. Great when you just want an AI to diagnose a lag spike or inspect logs.</li>
  <li><b>Capability switches</b> let you independently toggle console commands, file writes, <code>server.properties</code> edits, plugin actions, and Modrinth downloads.</li>
  <li><b>Regenerate</b> invalidates your current MCP token on the spot and issues a fresh one. Just remember to update your AI client config afterward.</li>
  <li>Destructive actions (and overwriting existing files) require an explicit <code>confirm:true</code> flag. Modrinth installs always check the SHA-512 hash against version metadata and delete the file immediately on mismatch.</li>
  <li>Modrinth lookups and downloads are locked strictly to <code>api.modrinth.com</code> and <code>cdn.modrinth.com</code> over HTTPS; private, loopback, and reserved IP ranges are blocked.</li>
  <li>Every single tool call gets logged to <code>plugins/KodaDash/mcp-audit.log</code>, with file contents and any argument names containing password, secret, or token automatically redacted.</li>
  <li><code>plugins/KodaDash/config.yml</code>, the audit log itself, and <code>.frpc.toml</code> are completely off-limits to MCP file tools.</li>
  <li>Treat your MCP token like a root password. Anyone holding it can invoke whichever tools you've enabled, so keep it out of public repos and screenshots.</li>
</ul>
<h4>What context the AI receives</h4>
<p>When a client connects, KodaDash sends an initial system prompt giving the AI practical context: KodaHosting environment details, server software and version, loaded worlds, plugins, live players and TPS, plus your phone's model, Android version, RAM, battery, and free storage. It also reinforces the ground rules: never start or stop the server, ask before destructive changes, never expose tokens, and prefer read-only checks.</p>
<p>Software and version data reported by the running server are treated as authoritative. The app/cloud mirror in <code>server-info.json</code> is explicitly tagged as secondary and potentially stale, so an outdated cloud <code>server_version</code> is never mistaken for reality. Even if an AI client drops the initial prompt later, it can pull the exact same snapshot anytime with the read-only <code>server_context</code> tool.</p>
<h4>Troubleshooting</h4>
<table>
  <tr><th>Symptom</th><th>What to check</th></tr>
  <tr><td>404</td><td>Either MCP or KodaDash is turned off. Both need to be enabled for the endpoint to exist.</td></tr>
  <tr><td>401</td><td>Your token is mistyped or was rotated. Copy the active token from Connection.</td></tr>
  <tr><td>405 on GET</td><td>Expected behavior. Send POST requests; SSE isn't used here.</td></tr>
  <tr><td>No connection</td><td>Make sure the server is online and your HTTPS dashboard loads normally at <code>https://&lt;server&gt;/</code>.</td></tr>
  <tr><td>Tools are missing</td><td>Read-only mode or a specific capability switch is turned off under Permissions.</td></tr>
  <tr><td>Old plugin</td><td>KodaDash updates when the app launches the server. Update to build 8527 or newer and restart the server once.</td></tr>
</table>
<p>If an AI ever does something surprising, open <code>plugins/KodaDash/mcp-audit.log</code> first. It records the exact tool called, redacted arguments, outcome, and duration for every request.</p>
"""),
        ("bedrock", "Bedrock crossplay", """
<p>Want friends on consoles, tablets, or phones to join your Java world? Turning on Bedrock crossplay installs Geyser and Floodgate, generates configs pre-matched to your server setup, and forwards the extra UDP port Bedrock expects.</p>
<p>If you're running PumpkinMC, Bedrock support is native to the server itself, so it's just a built-in toggle. Either way, your dashboard displays both join details cleanly: the Java address and the Bedrock address with its port.</p>
"""),
        ("voicechat", "Voice chat", """
<p>Enabling Simple Voice Chat installs the right plugin or mod for your server software, opens the extra UDP port over the tunnel, and writes out the voice chat config with the proper public port and address. Both Java and Bedrock players get working proximity voice without you having to rent a separate server.</p>
"""),
    ]),
    ("Account and support", [
        ("account", "Your account", """
<p>You don't need an account to host servers on KodaHosting. Creating one is completely optional, and it unlocks the web dashboard, server recovery when you switch phones, and family sharing permissions.</p>
<p>You can sign in with email and password or with Google. Notice the direction of trust: your account links to your device, not the other way around. Your local device token remains the credential that authorizes writes, and it never leaves your phone.</p>
"""),
        ("linking", "Linking a Minecraft account", """
<p>Linking proves a Minecraft username belongs to you, which powers the lobby and the <code>/join</code> command. The app gives you a short verification code; hop into the lobby server, run <code>/link</code> with that code, and your Minecraft profile appears right on your account card.</p>
<p>One Minecraft account can only be linked to one device at a time. If you move it to a new phone, the old device loses the link deliberately so shared setups don't drift out of sync.</p>
"""),
        ("nickname", "Your nickname", """
<p>Your nickname is what other players see in the public server list and lobby instead of an internal device ID. The app asks you to pick one after first launch (and gently reminds you at most once a day when opening social screens), and you can update it anytime in settings.</p>
"""),
        ("device-transfer", "Moving servers to a new device", """
<p>Upgrading your phone doesn't mean starting your worlds over. Device transfer moves an entire server directly from one phone to another over your local Wi-Fi, encrypted end to end. The old phone packs and serves the archive, the new phone pulls it down and adopts it, and your join addresses come along for the ride.</p>
<ul>
  <li><b>Pairing</b> works either by picking the nearby device or entering an 8-character code, and the receiving phone always shows a confirmation prompt naming the sender.</li>
  <li><b>Encryption</b> uses an ephemeral key that only exists for that transfer window, keeping your world files unreadable even on a shared network.</li>
  <li><b>Safe cleanup</b> only runs after the receiving phone confirms everything arrived intact. If your Wi-Fi drops halfway through, your original copy is untouched.</li>
</ul>
"""),
        ("family", "Family accounts and permissions", """
<p>One main account can own several servers while letting friends or family help run them with granular permissions. You decide per person who can start, stop, hibernate, delete, manage players, install plugins, or send console commands, all controlled with simple switches while the main account stays in full control.</p>
<p>Because everyone signs in with their own account, permissions follow the person rather than a specific phone. Need to revoke access? Flip a single switch and it takes effect on their very next action.</p>
"""),
        ("cluster", "KodaCluster", """
<p>Got a spare Android phone sitting in a drawer? Connect two phones with a USB cable to turn them into a mini hosting cluster. One phone acts as the master controller, showing a unified dashboard for both devices and starting or stopping servers on the secondary phone. They talk over a tiny JSON protocol straight across USB, so it doesn't even depend on Wi-Fi.</p>
<div class="callout">Set the secondary phone to USB file transfer mode. The USB accessory filter is already built into the app manifest, so the cluster links up automatically without manual pairing.</div>
"""),
        ("support", "Tickets and bug reports", """
<p>You can reach support without leaving the app: write a subject and message, attach screenshots or logs if they help, and follow the full reply thread in one place. Bug reports and server reports feed into the exact same ticket system with a quicker form, so nothing slips through the cracks.</p>
<p>Opening a ticket requires an account so replies actually have somewhere to go. Your ticket list tracks the live status of every thread and keeps the full conversation history.</p>
"""),
        ("personal-chat", "The personal chat", """
<p>Alongside regular support tickets, there's a direct, end-to-end encrypted chat with the developer. Your phone generates the keys locally, the private key never leaves your device, and every message is encrypted with ECDH and AES-GCM before it's ever stored.</p>
<p>On the other end, only the developer can decrypt messages using a key stored behind a PIN in a separate admin app. The whole idea is simple: honest conversations stay strictly between two people, and nobody in the middle, not even the database storing the ciphertext, can read them.</p>
"""),
        ("crisis", "The help screen", """
<p>If something during a session signals that someone might be going through a really hard time, the app shows a calm, quiet screen with one goal: reminding you that someone cares and offering real ways to reach out, including crisis hotlines, youth chat support, and the personal chat.</p>
<p>It never blocks your access, never reports anything anywhere, and never touches your servers. Dismissing it only has a brief pause so it doesn't get tapped away by accident. It's in the app simply because the people using this software are real people, and the person building it is too.</p>
"""),
        ("bans", "Bans and enforcement", """
<p>Bans are always a last resort, and the app treats them that way. Server names get checked up front, abuse reports are reviewed by a real human, and if a server does get banned, the screen clearly explains why and lets you download a backup of your world instead of stranding your data.</p>
<p>Device bans only exist for persistent abuse that tries to survive reinstalls. They're rare, and the checks behind them are deliberately narrow: tampering with the app's own protected state or forging device identities, and nothing else.</p>
"""),
    ]),
]
