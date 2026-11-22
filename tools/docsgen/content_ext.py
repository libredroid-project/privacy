"""Documentation content: the extension system and customization."""

GROUPS = [
    ("Extensions", [
        ("extensions", "What extensions are", """
<p>Extensions let anyone add new screens, translations, themes, settings entries, and server tabs to KodaHosting without forking the app or waiting on an official update. Each extension is just a ZIP file containing a manifest and, if it has a UI, a lightweight web view. Zero native code is ever loaded dynamically, which keeps the app compliant with Play Store rules and ensures a buggy extension can't crash the app around it.</p>
<p>The quickest way to learn is to peek at the working examples right in the repository:</p>
<ul>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/examples/koda-lab" target="_blank" rel="noopener">Koda Lab</a>, an interactive test bench that exercises every bridge call and prints raw responses</li>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/examples/live-log" target="_blank" rel="noopener">Live Log</a>, a clean custom screen in roughly a hundred lines</li>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/examples/language-polish" target="_blank" rel="noopener">Polski</a>, a real production language pack</li>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/examples/theme-ocean" target="_blank" rel="noopener">Ocean</a>, a custom colour theme combined with UI tweaks</li>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/README.md" target="_blank" rel="noopener">The written reference</a>, along with the full JSON schema right beside it</li>
</ul>
"""),
        ("extension-format", "Package format", """
<pre><code>my-extension.kodaext          (a ZIP, files at the root)
  manifest.json                required
  ui/index.html                required when the extension has a screen
  ui/app.js, ui/style.css      your interface
  lang/es.json                 language packs you contribute
  automations.json             automation rules
  icon.png                     128x128, shown in the hub</code></pre>
<p>Here's a kitchen-sink manifest that touches almost every feature. Treat it like a menu and strip out whatever your extension doesn't need:</p>
<pre><code>{
  "schema": 1,
  "id": "eu.example.mypack",
  "name": "My Pack",
  "version": "1.0.0",
  "versionCode": 1,
  "author": "Your name",
  "description": "What it does, in one sentence.",
  "license": "GPL-3.0-or-later",
  "source_url": "https://github.com/you/mypack",
  "minAppVersion": 8514,
  "permissions": ["servers.read", "console.read", "storage", "http:discord.com"],
  "ui": { "entry": "ui/index.html", "title": "My Pack" },
  "contributes": {
    "languages": [ { "code": "es", "name": "Espanol", "file": "lang/es.json" } ],
    "themes": [ { "id": "ocean", "name": "Ocean", "color": "#006874" } ],
    "settings": [ { "title": "My Pack", "subtitle": "Open the panel", "target": "overview" } ],
    "server_tabs": [ { "id": "panel", "title": "Panel", "target": "server" } ],
    "ui": { "hide": ["btn_github_main"], "console_chips": ["/tps", "time set day"] }
  },
  "automations": "automations.json"
}</code></pre>
<table>
  <tr><th>Field</th><th>Rule</th></tr>
  <tr><td><code>schema</code></td><td>must be 1</td></tr>
  <tr><td><code>id</code></td><td>lowercase reverse-domain identifier, at least two dot-separated segments, max 64 characters</td></tr>
  <tr><td><code>name</code></td><td>max 48 characters, displayed in the extension hub</td></tr>
  <tr><td><code>version</code> and <code>versionCode</code></td><td><code>versionCode</code> must strictly increase with every update</td></tr>
  <tr><td><code>license</code></td><td>required; shown right beside the extension in the app</td></tr>
  <tr><td><code>source_url</code></td><td>recommended; displayed as a clickable source link</td></tr>
  <tr><td><code>minAppVersion</code></td><td>minimum KodaHosting build number required to install</td></tr>
  <tr><td><code>permissions</code></td><td>capabilities your code needs, enforced by the bridge</td></tr>
  <tr><td><code>contributes</code></td><td>languages, themes, settings rows, server tabs, and UI tweaks added to the app</td></tr>
</table>
"""),
        ("extension-bridge", "The bridge API", """
<p>Every extension screen runs inside a sandboxed WebView that can only access its own package files. To interact with KodaHosting, your page calls a single global object, <code>window.koda</code>, which the app injects before your scripts execute. Every method returns a Promise resolving to a plain JSON object, and errors come back as an object with an <code>error</code> property instead of throwing unhandled exceptions.</p>
<pre><code>const { servers } = await koda.servers.list();
const first = servers[0];
const { lines } = await koda.console.tail(first.id, 200);

await koda.storage.set('lastServer', first.id);
const saved = await koda.storage.get('lastServer');   // { value: '...' }

const theme = await koda.theme();    // colours, so your page can match the app
const { lang } = await koda.locale();
koda.ui.toast('Hello from my pack');
const { ok } = await koda.ui.confirm('Restart?', 'Players will be kicked.');</code></pre>
<table>
  <tr><th>Call</th><th>What it returns</th></tr>
  <tr><td><code>koda.api</code>, <code>koda.version</code></td><td>bridge version info so you can gracefully handle older app builds</td></tr>
  <tr><td><code>koda.servers.list()</code>, <code>get(id)</code></td><td>servers with a stable schema: <code>id</code>, <code>name</code>, <code>type</code>, <code>mcVersion</code>, <code>state</code>, <code>port</code>, <code>address</code>, <code>ramMB</code>, <code>maxPlayers</code></td></tr>
  <tr><td><code>koda.console.tail(id, lines)</code></td><td>recent console lines, up to 1,000 lines</td></tr>
  <tr><td><code>koda.storage.get/set/remove/keys</code></td><td>private key-value storage scoped to your extension (1 MB limit)</td></tr>
  <tr><td><code>koda.ui.toast</code>, <code>koda.ui.confirm</code></td><td>native toast and confirmation dialog styled to match the app</td></tr>
  <tr><td><code>koda.theme()</code>, <code>koda.locale()</code></td><td>active app palette and language code so your UI blends right in</td></tr>
</table>
<h4>Permissions</h4>
<p>Declare everything you need in <code>manifest.json</code>. The app enforces permissions at runtime, so calling <code>koda.servers.list()</code> without <code>servers.read</code> simply returns an error object.</p>
<table>
  <tr><th>Permission</th><th>Current status</th></tr>
  <tr><td><code>storage</code>, <code>servers.read</code>, <code>console.read</code></td><td>live today</td></tr>
  <tr><td><code>console.send</code>, <code>servers.control</code></td><td>declared, next phase (gated by in-app confirmation)</td></tr>
  <tr><td><code>players.read</code>, <code>players.actions</code>, <code>files.read</code>, <code>notifications</code></td><td>declared, next phase</td></tr>
  <tr><td><code>http:host</code></td><td>scoped outbound HTTP access for one specific domain</td></tr>
</table>
<div class="callout">Only read permissions and storage are active right now. Install Koda Lab on your device to inspect the exact live payload every bridge call returns on your build, rather than guessing.</div>
"""),
        ("extension-languages", "Language packs", """
<pre><code>// lang/es.json, the keys are the app's string resource names
{
  "tab_dashboard": "Panel",
  "jars_title": "MODS Y PLUGINS",
  "sd_toast_log_copied": "Registro copiado",
  "ext_ui_chips_count": "%1$d comandos extra en la consola."
}</code></pre>
<p>Language packs don't have to translate every single string in the app. Anything you omit falls back cleanly to the user's current language, so even a partial pack is immediately useful and easy to expand over time. Just be careful with format placeholders like <code>%1$s</code> or <code>%1$d</code>: keep them verbatim, because a missing or extra placeholder will crash Android when that string formats.</p>
<pre><code>python3 extensions/tools/check_language_pack.py path/to/lang/es.json</code></pre>
<p>Run that checker before shipping. It validates every key against the app's actual string resources and flags typos that would otherwise sit silently unused. Users apply a language pack from the extension's action sheet (requiring a quick restart), and disabling the extension automatically restores their previous language.</p>
"""),
        ("extension-themes", "Themes, including full palettes", """
<pre><code>"themes": [
  { "id": "ocean", "name": "Ocean", "color": "#006874" },
  { "id": "midnight", "name": "Midnight", "color": "#00D9FF",
    "colors": { "primary": "#00D9FF", "surface": "#07070F", "card": "#14141F",
                "text": "#EDEDF5", "text_dim": "#8C8C9C", "error": "#FF4455" } }
]</code></pre>
<p>Supplying just <code>color</code> gives the app a seed colour to feed into its Material 3 engine, generating a harmonious palette across buttons, cards, and highlights automatically. If you want total visual control, add a <code>colors</code> object with any combination of <code>primary</code>, <code>surface</code>, <code>card</code>, <code>text</code>, <code>text_dim</code>, <code>outline</code>, <code>online</code>, and <code>error</code>. The app overrides the generated roles with yours and computes readable contrast colours for text on top of your accents.</p>
<p>Contributed themes show up in two places on purpose: inside the extension's action sheet and in <b>Settings, Appearance, Themes</b>. Each theme gets its own toggle, and enabling one automatically switches off whichever theme was active before.</p>
<table>
  <tr><th>App theme mode</th><th>How your theme applies</th></tr>
  <tr><td>Material 3 mode</td><td>restyles the entire UI by resolving colour roles across the view tree</td></tr>
  <tr><td>Classic design</td><td>maps your accent, surfaces, cards, text, and outlines onto the classic palette slots</td></tr>
</table>
"""),
        ("extension-settings", "Settings entries", """
<pre><code>"settings": [
  { "title": "My Pack", "subtitle": "Everything in one screen", "target": "overview" }
]</code></pre>
<p>Settings entries appear right beneath the extension hub inside the app's Settings screen. Each row automatically gets a small info icon displaying the extension name, version, author, and license so users always know what's built-in and what comes from an extension.</p>
<p>Tapping a row opens your UI with <code>#target</code> appended to the URL, making it easy to deep-link straight to a specific sub-view. Each extension can contribute up to four settings rows.</p>
"""),
        ("extension-tabs", "Server tabs", """
<pre><code>"server_tabs": [ { "id": "panel", "title": "Panel", "target": "server" } ]</code></pre>
<p>This adds your own custom tab to every server's detail screen. When opened, the app passes the active server ID in the URL hash, like <code>#server&amp;server=the-server-id</code>, so your page knows exactly which server the user is looking at. Grabbing it takes two lines of JavaScript:</p>
<pre><code>const parts = location.hash.replace('#', '').split('&');
const server = (parts.find(p =&gt; p.startsWith('server=')) || '').split('=')[1];</code></pre>
<div class="callout">One honest caveat: the optional sleek layout doesn't have a shared tab container, so contributed server tabs are skipped there. Extensions can add up to four server tabs each.</div>
"""),
        ("extension-tweaks", "Interface tweaks", """
<pre><code>"ui": {
  "hide": ["btn_github_main"],
  "console_chips": ["/tps", "/list", "time set day"]
}</code></pre>
<p><code>hide</code> removes specific UI elements by their Android view IDs, while <code>console_chips</code> adds custom quick-command buttons right above the server console input. Both take effect automatically whenever the extension is enabled, without any extra toggles to dig for.</p>
"""),
        ("extension-automations", "Automations", """
<pre><code>{
  "schema": 1,
  "automations": [
    { "id": "crash-watch", "name": "Crash warning",
      "when": { "type": "log_match", "server": "*", "pattern": "(?i)(crash|exception)" },
      "then": [ { "type": "notify", "title": "Crash on {server}", "text": "{line}" },
                { "type": "http", "method": "POST",
                  "url": "https://discord.com/api/webhooks/...", "body": { "content": "{line}" } } ] }
  ]
}</code></pre>
<p>Automation rules pair a trigger (server state changes, regex log matches, or schedules) with a list of actions (notifications, webhooks, or console commands). Template variables like <code>{server}</code> and <code>{line}</code> expand automatically when a rule fires.</p>
<p>The schema is finalized and validated at install time today, while the background rule runner lands in the next phase. You can already ship valid <code>automations.json</code> definitions in your packages now.</p>
"""),
        ("extension-packaging", "Packaging and testing", """
<pre><code># validate the manifest and build the package
python3 extensions/tools/pack_extension.py extensions/examples/koda-lab

# check a language pack before you ship it
python3 extensions/tools/check_language_pack.py my/pack/lang/es.json</code></pre>
<p>Both scripts enforce the exact same validation checks the Android app runs. Catching an unknown view ID, missing translation file, malformed hex colour, or stagnant version code on your laptop is a lot nicer than hitting it on someone's phone.</p>
<p>To test locally, sideload your package via <b>Settings, Extensions, +</b> and pick the file. Updating an extension preserves its saved storage; uninstalling clears storage cleanly. You'll also find a Reload action in the hub menu so you can iterate without reinstalling every time.</p>
"""),
        ("extension-store", "The store and the API", """
<p>The extension store lives at <a href="https://host.kodanetwork.eu/store" target="_blank" rel="noopener">host.kodanetwork.eu/store</a> and mirrors straight into the app's extension hub under Discover. You publish on the website, users install inside the app, and both sides speak to the same public API.</p>
<h3>Submitting</h3>
<p>Sign in with your KodaHosting account, pick your <code>.kodaext</code> archive, enter the name, version, license, and source URL, and hit submit. Your browser computes the SHA-256 hash and the backend verifies it after upload, inspecting the manifest inside the archive and rejecting anything with an invalid ID, version code, license, or permission set. Every submission goes through human review first, and the first approved release puts your extension live in the catalog.</p>
<p>Every submission sits in one of five clear states: <code>PENDING</code> while waiting for review, <code>APPROVED</code> once live, <code>REJECTED</code> with a written reason, <code>DELISTED</code> if pulled down after publication, or <code>WITHDRAWN</code> if you cancelled it yourself. Your developer dashboard shows both the state and any review note so nothing ever disappears silently.</p>
<h3>New versions</h3>
<p>Pushing an update follows the same review flow. While your new build is pending, the store keeps serving the previous approved version so an unreviewed or broken upload never breaks existing installs. When a user updates, the new package installs cleanly over the old one while keeping all stored extension data.</p>
<h3>The API</h3>
<p>Everything powering the website and app is served from <code>https://api.kodanetwork.eu</code>. Public read endpoints don't require an API key:</p>
<pre><code>GET /v1/status                    live numbers (servers, players, store, tunnel server)
GET /v1/releases                  published app releases
GET /v1/servers                   the public server directory (name, status, players, MOTD, owner)
GET /v1/servers/{host}?ping=1     one server: owner, and a live minecraft ping (players, MOTD, favicon)
GET /v1/extensions                the catalog, approved only, with the newest version
GET /v1/extensions?author=Name    everything one publisher released
GET /v1/extensions/{id}           one extension with all approved versions
GET /v1/extensions/{id}/download  redirects to a 60 second signed url</code></pre>
<p>Authenticated routes expect your Supabase session access token as a Bearer header (the exact same login the web dashboard uses):</p>
<pre><code>GET   /v1/me                        profile, nickname, avatar url, counters, 2FA state
PATCH /v1/me                        nickname and avatar
POST  /v1/me/avatar                 upload target for a profile picture
GET   /v1/me/devices                linked devices with their telemetry and MC accounts
POST  /v1/me/devices/{id}/unlink    detach a device; the app keeps working standalone
GET   /v1/me/extensions             your submissions with their review state
GET   /v1/me/tickets                your support tickets
POST  /v1/me/tickets/{id}/messages  reply to a ticket from the browser</code></pre>
<p>When a public server is reachable, the detail endpoint performs a real Minecraft server-list ping and returns live players, MOTD, and server favicon (cached for one minute). Public listings only ever expose the owner's linked Minecraft username, never app UUIDs, tokens, or hardware IDs.</p>
<p>Two things stay off the public API deliberately: the personal support chat is end-to-end encrypted between the Android app and admin app, so it only lives inside the app. And extension packages never get static public URLs; every download redirects to a signed link that expires after 60 seconds, keeping pending or rejected uploads unreachable.</p>
<p>All routes sit behind database-backed sliding-window rate limits (120 reads per minute per IP, 30 writes, 90 per account, and 20 for ticket replies and uploads), shared consistently across edge instances. If you hit a limit, the API returns HTTP 429 with a <code>Retry-After</code> header, and the site displays a calm cooldown screen with a countdown instead of throwing cryptic errors.</p>
"""),
    ]),
    ("Customization", [
        ("customizing-translations", "Translations", """
<p>Every piece of UI copy lives in <code>app/src/main/res/values/strings.xml</code>, with built-in translations right alongside it in <code>values-de</code>, <code>values-zh-rCN</code>, and <code>values-pl</code>. Because Android falls back to the default file for any missing entry, you can start with a partial translation and fill in the rest over time.</p>
<p>Adding a new built-in language just means creating its resource directory and wiring it into the language picker in settings. Two scripts keep everything safe:</p>
<pre><code>python3 extensions/tools/check_translation.py app/src/main/res/values-pl/strings.xml
python3 extensions/tools/check_language_pack.py path/to/lang/es.json</code></pre>
<div class="callout">Always run the checker after editing strings. A broken format placeholder looks totally innocent in XML, then crashes the app at runtime the moment that text gets rendered.</div>
"""),
        ("customizing-themes", "Theming in code", """
<p>Under the hood, the app starts from Material 2 with an opt-in Material 3 mode that derives a full colour scheme from a single seed. In Material 3 mode, the theme helper resolves all colour roles once and applies them across the view tree, which is also the hook extension themes plug into. Base palettes live in <code>colors_m3.xml</code> alongside its night variant.</p>
<p>In Classic mode, views use fixed colours and extension palettes map onto those slots. Whenever you want a colour change to ripple cleanly across the entire app, make it in the theme helper instead of hunting through individual layouts.</p>
"""),
        ("customizing-layouts", "Layout variants, and the trap that keeps biting", """
<p>Core screens ship with multiple layout variants: Classic, Material 3, Sleek, and a Terminal layout for the server screen. Because activities choose their layout dynamically at runtime, adding a new view means either adding it to every layout variant or writing defensive lookups when a variant omits it.</p>
<p>This one bit us in production before: a settings card was added only to the classic layout, which threw a null pointer crash in Material 3 mode, locking users out of the very settings screen where they could switch themes back. Keep this two-line habit everywhere:</p>
<pre><code>View card = findViewById(R.id.card_my_feature);
if (card == null) return;      // this layout variant may not have it
card.setOnClickListener(v -&gt; openMyFeature());</code></pre>
"""),
        ("customizing-branding", "Branding and assets", """
<p>Icons, the K monogram, and brand colours live in <code>branding/</code> and are generated via script, so updating an asset means editing one source instead of twenty PNGs. Interface typography uses <code>font_koda</code> and logs/code use <code>font_koda_mono</code>, with their license files tracked right alongside all third-party licenses.</p>
<p>Minecraft server jars and Java runtimes are never bundled inside the APK. Downloading and verifying them on demand keeps the install tiny and keeps licensing clean. The app only ships its own assets, bundled server-side helper plugins, and license notices.</p>
"""),
        ("customizing-design", "The design rules", """
<p>A handful of simple rules keep the app feeling cohesive, and breaking them sticks out immediately once you spend ten minutes using it:</p>
<ul>
  <li>Stick to the Koda palette instead of inventing random greys. Orange highlights actions, green signals online health, and red warns of danger.</li>
  <li>Keep buttons and cards at a 12 dp corner radius on flat surfaces without heavy drop shadows.</li>
  <li>Ship every new UI string in English, German, Chinese, and Polish.</li>
  <li>Keep utility sheets focused: clear controls and one clear outcome, not walls of text.</li>
  <li>When adding a step to an existing flow, match the layout of that flow rather than inventing a second style.</li>
</ul>
"""),
        ("customizing-feature", "Adding a screen or a setting", """
<p>New screens are plain Android activities paired with XML layouts, wired up directly with <code>findViewById</code> and click listeners. Skipping a heavy navigation framework keeps each screen self-contained and easy to read on its own.</p>
<p>To add a new setting, mirror an existing card in both settings layouts and wire it up in the settings activity, or inject it dynamically the same way extension rows work. To add a new native server tab, extend the tab list and panel handler (extension server tabs do the exact same thing programmatically, so they're a great reference to follow).</p>
"""),
    ]),
]
