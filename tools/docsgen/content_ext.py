"""Documentation content: the extension system and customization."""

GROUPS = [
    ("Extensions", [
        ("extensions", "What extensions are", """
<p>Extensions let other people add screens, languages, themes, settings rows and server tabs to the app, without forking it and without waiting for a release. A package is a ZIP file with a manifest and, usually, a small web interface. Nothing native is ever loaded, which keeps the app compatible with Play policy and keeps a broken extension from taking the app down with it.</p>
<p>The examples are the fastest way in, and they are all in the repository:</p>
<ul>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/examples/koda-lab" target="_blank" rel="noopener">Koda Lab</a>, the test bench that exercises every call with raw answers</li>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/examples/live-log" target="_blank" rel="noopener">Live Log</a>, a screen in about a hundred lines</li>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/examples/language-polish" target="_blank" rel="noopener">Polski</a>, a real language pack</li>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/examples/theme-ocean" target="_blank" rel="noopener">Ocean</a>, a theme plus interface tweaks</li>
  <li><a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions/README.md" target="_blank" rel="noopener">The written reference</a>, with the JSON schema beside it</li>
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
<p>Here is a manifest that uses nearly everything. Read it as a menu, then delete the parts you do not need.</p>
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
  <tr><td><code>id</code></td><td>lowercase reverse domain, at least two segments, at most 64 characters</td></tr>
  <tr><td><code>name</code></td><td>at most 48 characters, shown in the hub</td></tr>
  <tr><td><code>version</code> and <code>versionCode</code></td><td>the code must grow with every update</td></tr>
  <tr><td><code>license</code></td><td>mandatory, the app shows it next to the extension</td></tr>
  <tr><td><code>source_url</code></td><td>recommended, shown as the source link</td></tr>
  <tr><td><code>minAppVersion</code></td><td>the app build the extension needs</td></tr>
  <tr><td><code>permissions</code></td><td>declared capabilities, enforced by the app</td></tr>
  <tr><td><code>contributes</code></td><td>everything the extension adds to the app itself</td></tr>
</table>
"""),
        ("extension-bridge", "The bridge API", """
<p>Every page your extension shows runs in a sandbox that can only reach its own files. To talk to the app it uses one global object, <code>window.koda</code>, injected before your scripts run. Every call returns a promise and every answer is a JSON object. Errors arrive as an object with an <code>error</code> field instead of an exception.</p>
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
  <tr><th>Call</th><th>What it gives you</th></tr>
  <tr><td><code>koda.api</code>, <code>koda.version</code></td><td>the bridge version, to show a friendly message on older apps</td></tr>
  <tr><td><code>koda.servers.list()</code>, <code>get(id)</code></td><td>servers with a fixed field set: id, name, type, mcVersion, state, port, address, ramMB, maxPlayers</td></tr>
  <tr><td><code>koda.console.tail(id, lines)</code></td><td>the last console lines, up to a thousand</td></tr>
  <tr><td><code>koda.storage.get/set/remove/keys</code></td><td>your own key value store, one megabyte per extension</td></tr>
  <tr><td><code>koda.ui.toast</code>, <code>koda.ui.confirm</code></td><td>two helpers that use the app's own look</td></tr>
  <tr><td><code>koda.theme()</code>, <code>koda.locale()</code></td><td>colours and language, so your page fits in</td></tr>
</table>
<h4>Permissions</h4>
<p>Permissions are declared in the manifest and enforced by the app. If you did not ask for <code>servers.read</code>, the call comes back as an error.</p>
<table>
  <tr><th>Permission</th><th>State</th></tr>
  <tr><td><code>storage</code>, <code>servers.read</code>, <code>console.read</code></td><td>live today</td></tr>
  <tr><td><code>console.send</code>, <code>servers.control</code></td><td>declared, next phase, behind in app confirmation</td></tr>
  <tr><td><code>players.read</code>, <code>players.actions</code>, <code>files.read</code>, <code>notifications</code></td><td>declared, next phase</td></tr>
  <tr><td><code>http:host</code></td><td>reserved for one specific web domain</td></tr>
</table>
<div class="callout">Only the read permissions are live right now. The test bench shows exactly which answer each call gives on your build, instead of you having to guess.</div>
"""),
        ("extension-languages", "Language packs", """
<pre><code>// lang/es.json, the keys are the app's string resource names
{
  "tab_dashboard": "Panel",
  "jars_title": "MODS Y PLUGINS",
  "sd_toast_log_copied": "Registro copiado",
  "ext_ui_chips_count": "%1$d comandos extra en la consola."
}</code></pre>
<p>Packs are partial by design. Whatever you leave out stays in the language the user picked, so a small pack is useful from the first day and can grow later. Keep placeholders such as <code>%1$s</code> exactly as they appear in the original string, because a missing or extra one crashes the app the moment that text is formatted.</p>
<pre><code>python3 extensions/tools/check_language_pack.py path/to/lang/es.json</code></pre>
<p>The checker compares your keys against the app's strings and reports the ones that do not exist, which would otherwise do nothing at all. Applying a pack happens in the extension's actions sheet and needs a restart, and the pack follows the extension: disabling it restores the previous language.</p>
"""),
        ("extension-themes", "Themes, including full palettes", """
<pre><code>"themes": [
  { "id": "ocean", "name": "Ocean", "color": "#006874" },
  { "id": "midnight", "name": "Midnight", "color": "#00D9FF",
    "colors": { "primary": "#00D9FF", "surface": "#07070F", "card": "#14141F",
                "text": "#EDEDF5", "text_dim": "#8C8C9C", "error": "#FF4455" } }
]</code></pre>
<p>The <code>color</code> field alone is a seed. The app runs it through its Material 3 engine and generates a whole palette from it, which already changes buttons, cards and highlights. With <code>colors</code> you declare the palette yourself: <code>primary</code>, <code>surface</code>, <code>card</code>, <code>text</code>, <code>text_dim</code>, <code>outline</code>, <code>online</code> and <code>error</code> override what the engine computed, and the app derives a readable contrast colour for text on top of your accents.</p>
<p>Themes live in two places, on purpose: in the extension's actions sheet, and in the app's own settings under <b>Appearance, Themes</b>. Both list every contributed theme with its own switch, and switching one on switches the previous one off.</p>
<table>
  <tr><th>Where the app runs</th><th>What a theme changes</th></tr>
  <tr><td>Material 3 mode</td><td>the whole interface, because the app resolves colour roles and styles screens with them</td></tr>
  <tr><td>Classic design</td><td>accent, surfaces, cards, texts and outlines, mapped onto the colours the classic design paints with</td></tr>
</table>
"""),
        ("extension-settings", "Settings entries", """
<pre><code>"settings": [
  { "title": "My Pack", "subtitle": "Everything in one screen", "target": "overview" }
]</code></pre>
<p>These appear in the app's settings screen, right below the extension hub, each with a small info button that names the extension, its version, the author and the license. That button is the point: a user should never have to guess which rows come from the app and which come from a pack.</p>
<p>Tapping the row opens your screen, and <code>target</code> is appended to your page address as <code>#target</code>, so you can open the right tab of your own interface. Four entries per extension are allowed.</p>
"""),
        ("extension-tabs", "Server tabs", """
<pre><code>"server_tabs": [ { "id": "panel", "title": "Panel", "target": "server" } ]</code></pre>
<p>This adds a tab to every server screen. Your page is loaded with the context attached, for example <code>#server&amp;server=the-server-id</code>, so your interface knows which server it belongs to and can show something specific instead of a generic list. Reading the fragment is one line of JavaScript:</p>
<pre><code>const parts = location.hash.replace('#', '').split('&');
const server = (parts.find(p =&gt; p.startsWith('server=')) || '').split('=')[1];</code></pre>
<div class="callout">One honest limitation: the optional sleek layout has no shared panel container, so contributed tabs are skipped there. Four tabs per extension are allowed.</div>
"""),
        ("extension-tweaks", "Interface tweaks", """
<pre><code>"ui": {
  "hide": ["btn_github_main"],
  "console_chips": ["/tps", "/list", "time set day"]
}</code></pre>
<p><code>hide</code> removes elements you do not want, addressed by the view ids used in the app's layouts. <code>console_chips</code> adds your own quick commands above the console. Both stay active while the extension is enabled, with no extra switch to hunt for, which is the trade off of these two: they are part of enabling the extension.</p>
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
<p>Rules have a trigger and a list of actions. Triggers are server state changes, log patterns and schedules. Actions are notifications, webhooks and console commands. Placeholders such as <code>{server}</code> and <code>{line}</code> are filled in when the rule runs.</p>
<p>The format is final and validated when the package is installed, and the engine that runs the rules ships in the next phase, so think of the file today as a precise description of what your extension will do on its own.</p>
"""),
        ("extension-packaging", "Packaging and testing", """
<pre><code># validate the manifest and build the package
python3 extensions/tools/pack_extension.py extensions/examples/koda-lab

# check a language pack before you ship it
python3 extensions/tools/check_language_pack.py my/pack/lang/es.json</code></pre>
<p>Both tools apply exactly the rules the app applies. An unknown view id, a missing language file, a malformed colour or a version number that does not grow will fail on your computer instead of on somebody's phone.</p>
<p>To try a package, sideload it: Settings, Extensions, plus, pick the file. Updates keep the extension's storage, removing it deletes the storage with it. The hub menu has a reload entry, so you can iterate without reinstalling.</p>
"""),
        ("extension-store", "The store and the API", """
<p>The store lives at <a href="https://host.kodanetwork.eu/store" target="_blank" rel="noopener">host.kodanetwork.eu/store</a> and mirrors inside the app's extension hub under Discover. Submitting happens on the website, installing happens in the app, and both talk to the same public API.</p>
<h3>Submitting</h3>
<p>Sign in with the same account you use in the app, pick your <code>.kodaext</code> package, fill in the name, version, license and a source link, and submit. The form computes the SHA-256 of your file and the server repeats the check: it reads the manifest out of the package and refuses anything whose id, version code, license or permissions do not hold up. Nothing reaches the store before the review approves it, and the first approved version publishes the extension.</p>
<p>A submission is in one of five states: <code>PENDING</code> while it waits, <code>APPROVED</code> once it is live, <code>REJECTED</code> with a reason, <code>DELISTED</code> when it was taken down after the fact, and <code>WITHDRAWN</code> when you ended it yourself. The dashboard on the website lists your submissions with their state and the reason, so an ended extension is never a silent one.</p>
<h3>New versions</h3>
<p>A new version of a published extension goes through the same review. Until it is approved the store keeps serving the previous version, so a broken update can never take the published one down with it. Installing an update puts it over the existing copy and keeps its storage.</p>
<h3>The API</h3>
<p>Everything the website and the app do is reachable under <code>https://api.kodanetwork.eu</code>. The public routes need no key:</p>
<pre><code>GET /v1/status                    live numbers (servers, players, store, tunnel server)
GET /v1/releases                  published app releases
GET /v1/servers                   the public server directory (name, status, players, MOTD, owner)
GET /v1/servers/{host}?ping=1     one server: owner, and a live minecraft ping (players, MOTD, favicon)
GET /v1/extensions                the catalog, approved only, with the newest version
GET /v1/extensions?author=Name    everything one publisher released
GET /v1/extensions/{id}           one extension with all approved versions
GET /v1/extensions/{id}/download  redirects to a 60 second signed url</code></pre>
<p>The rest takes the Supabase session token as a bearer, the same login the dashboard uses:</p>
<pre><code>GET   /v1/me                        profile, nickname, avatar url, counters, 2FA state
PATCH /v1/me                        nickname and avatar
POST  /v1/me/avatar                 upload target for a profile picture
GET   /v1/me/devices                linked devices with their telemetry and MC accounts
POST  /v1/me/devices/{id}/unlink    detach a device; the app keeps working standalone
GET   /v1/me/extensions             your submissions with their review state
GET   /v1/me/tickets                your support tickets
POST  /v1/me/tickets/{id}/messages  reply to a ticket from the browser</code></pre>
<p>The server detail answers with a real minecraft server list ping when the server is reachable: live players, the MOTD and the icon the server itself advertises, all cached for a minute. The directory and the detail only ever show the owner's minecraft name, and only when that account linked one - never app uuids, tokens or hardware ids.</p>
<p>Two things stay out of the API on purpose. The personal support chat is end to end encrypted between the app and the admin app, so it only exists in the app. And packages are never served from a public url: a download goes through a signed link that expires after a minute, so a pending or rejected upload is not reachable by guessing paths.</p>
<p>Every route sits behind sliding-window rate limits (reads 120 per minute per address, writes 30, ninety per account, twenty for ticket replies and uploads), counted in the database so they hold across all edge instances. When a client hits a limit the api answers 429 with a <code>Retry-After</code>, and the website shows a "service is busy, please wait" screen with a countdown instead of errors.</p>
"""),
    ]),
    ("Customization", [
        ("customizing-translations", "Translations", """
<p>All interface text lives in <code>app/src/main/res/values/strings.xml</code>, with translations beside it in <code>values-de</code>, <code>values-zh-rCN</code> and <code>values-pl</code>. Android falls back to the default for anything missing, so a partial translation is genuinely useful and can grow over time.</p>
<p>Adding a language means creating the matching folder, adding the language to the picker in the settings activity, and nothing else. Two tools keep translations honest:</p>
<pre><code>python3 extensions/tools/check_translation.py app/src/main/res/values-pl/strings.xml
python3 extensions/tools/check_language_pack.py path/to/lang/es.json</code></pre>
<div class="callout">Run the checker after every batch. A broken placeholder does not look wrong, it crashes at runtime the moment the string is used.</div>
"""),
        ("customizing-themes", "Theming in code", """
<p>The app is Material 2 at heart with an opt in Material 3 mode that generates a full colour scheme from a seed. In Material 3 mode the helper resolves the colour roles once and styles whole view trees with them, which is also where extension themes hook in. The palettes live in <code>colors_m3.xml</code> with the night variant beside it.</p>
<p>In the classic design the app paints with fixed colours, and extension palettes are mapped onto those values. If you want a colour decision that applies everywhere, the theme helper is the single place to change it, and the mapping tables in it are the list of colours you would have to touch otherwise.</p>
"""),
        ("customizing-layouts", "Layout variants, and the trap that keeps biting", """
<p>Central screens exist in more than one layout: a classic one, an optional Material 3 one, an optional sleek one, and for the server screen a terminal variant. The activity picks at runtime, which means a new view has to be added to every variant you actually use, or the code that looks it up has to cope with its absence.</p>
<p>We learned this the hard way. A settings card existed only in the classic layout, the settings screen crashed in Material 3 mode with a null pointer, and because that same screen is where the theme mode lives, there was no way back. The habit that prevents it is cheap:</p>
<pre><code>View card = findViewById(R.id.card_my_feature);
if (card == null) return;      // this layout variant may not have it
card.setOnClickListener(v -&gt; openMyFeature());</code></pre>
"""),
        ("customizing-branding", "Branding and assets", """
<p>Icons, the K monogram and the brand colours live in <code>branding/</code> and are generated by a script, so you change the source instead of twenty files. Fonts are referenced as <code>font_koda</code> for the interface and <code>font_koda_mono</code> for logs and code, and their licenses sit with all the others in the licenses folder.</p>
<p>Server software is not bundled in the app: jars and runtimes are downloaded on demand and verified, which keeps the package small and the licenses clean. The app ships only its own assets, the bundled server side plugins and the license texts.</p>
"""),
        ("customizing-design", "The design rules", """
<p>The rules that keep the app coherent are worth stating plainly, because breaking them is visible to anyone who uses the app for a day.</p>
<ul>
  <li>Use the Koda palette instead of inventing greys. Orange marks actions, online marks health, red marks danger.</li>
  <li>Buttons keep a 12 dp corner radius, cards a 12 dp radius on a flat surface with no shadow.</li>
  <li>Every new string ships in English, German and Chinese at least, and now Polish as well.</li>
  <li>Functional sheets stay functional: controls and one result, no paragraphs of prose.</li>
  <li>Screens that belong to a flow copy the flow's layout instead of inventing a second look.</li>
</ul>
"""),
        ("customizing-feature", "Adding a screen or a setting", """
<p>New screens are activities plus layouts, wired with <code>findViewById</code> and listeners. There is no navigation library in the app, which makes each screen readable on its own and makes adding one a small, local change.</p>
<p>To add a settings entry, mirror an existing card in both settings layouts and wire it in the settings activity, or insert it at runtime the way the extension entries do. To add a server tab inside the app itself, extend the tab list and the panel logic, which is exactly what extension server tabs do programmatically, so they double as a reference implementation.</p>
"""),
    ]),
]
