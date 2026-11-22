"""Documentation content: start, the app, server management."""

GROUPS = [
    ("Start", [
        ("getting-started", "What KodaHosting is", """
<p>KodaHosting turns an Android phone into a real Minecraft server. It's not a game client, and it's not a remote control talking to someone else's cloud box. The server process runs right on your phone, your world files live in your phone's storage, and the app wraps the whole thing in a clean control panel. Once you keep that in mind, pretty much every design decision in this codebase clicks into place, even the slightly unusual ones.</p>
<p>Under the hood, the system splits into three parts. Keeping them separate in your head makes troubleshooting a lot easier:</p>
<ul>
  <li><b>The device plane</b> is the Android app itself. It downloads server jars and Java runtimes, starts and stops processes, streams the console, browses and edits files, runs backups, and applies config changes. Whenever something actually mutates your server, it happens here.</li>
  <li><b>The connectivity plane</b> is the tunnel. A bundled reverse proxy client forwards your Minecraft ports and web dashboard through a public server, so your friends can join cleanly without you touching router port forwarding or exposing your home IP.</li>
  <li><b>The control plane</b> is Supabase. It tracks which devices belong to which account, which servers exist, which ports are allocated, which app releases are live, and which extensions passed review. Every write runs through a server-side function that checks a per-device token.</li>
</ul>
<p>There's also a fourth piece that's easy to overlook at first: KodaDash. It's a Java plugin running inside your Minecraft server that serves a web dashboard on port 7867. The Android app mirrors small JSON snapshots for stats, backups, and schedules into the server folder, and KodaDash reads them. That's how the web dashboard still shows sensible numbers even while your phone's screen is off and sleeping.</p>
"""),
        ("own-instance", "Your own instance", """
<p>The public repository gives you the full source code, but it obviously can't include a live production instance. Keys, accounts, domains, and operator admin tools stay private by design. Here's where the boundary sits:</p>
<table>
  <tr><th>Left out on purpose</th><th>What it covers</th></tr>
  <tr><td><code>secrets_local.h</code></td><td>the Supabase URL, public key, AI key, and tunnel host compiled into the native layer</td></tr>
  <tr><td>The Supabase project</td><td>database rows, storage buckets, auth users, and edge function secrets</td></tr>
  <tr><td>Tunnel and DNS credentials</td><td>the reverse proxy token and DNS provider keys used for custom domains</td></tr>
  <tr><td>Signing material</td><td>the release keystore, passwords, and Google Play credentials</td></tr>
  <tr><td>The admin tools</td><td>the operator web panel and the Kotlin admin app</td></tr>
</table>
<p>One detail stays public intentionally: the imprint and privacy policy list a real operator and address. German law requires it, and honestly, a hosted service that hides who runs it isn't worth trusting anyway.</p>
<h4>Spinning up your own instance</h4>
<ol>
  <li>Clone the repository and run an initial build with JDK 21.</li>
  <li>Create a Supabase project and apply the SQL files inside <code>supabase/</code> in order: first <code>migrations/</code>, then <code>security_fix_*.sql</code>, and finally the remaining feature SQL (releases, extensions, notifications, KodaDash beta, and profile avatar). Each script reloads the API schema automatically.</li>
  <li>Set up the storage buckets: make <code>artifacts</code>, <code>release_images</code>, <code>support_attachments</code>, <code>extension_assets</code>, and <code>avatars</code> public, and keep <code>extension_packages</code> and <code>data_exports</code> private.</li>
  <li>Deploy the edge functions and configure their secrets. <code>supabase/README.md</code> documents the complete list. Don't skip <code>get-tunnel-config</code>, because the app calls it to pull its tunnel credentials.</li>
  <li>Run an frps server (<code>vps-https/frps.toml.example</code> gives you a hardened baseline) and drop its address along with your Supabase URL and public key into the native header file.</li>
  <li>Build a signed release APK and install it. On first launch, the app registers the device and creates the database row everything else attaches to.</li>
  <li>Optional: wire up the Discord release bot with your own bot token. The team admin panel and Android admin app aren't included in the public repo.</li>
</ol>
<div class="callout">A brand-new instance starts empty on purpose. The app will still launch without a backend, but first-run device registration won't succeed and most cloud-backed screens will stay quiet.</div>
"""),
        ("building", "Building the app", """
<p>The project is a single Gradle module paired with a small native layer that boots the embedded JVM. The first compile takes a few minutes while dependencies settle; incremental builds after that are fast.</p>
<pre><code>export JAVA_HOME=/path/to/jdk-21        # newer JDKs break the Gradle version in use
./gradlew :app:assembleDebug            # debug apk
./gradlew :app:assembleRelease -PKEYSTORE_PW=... -PKEY_PW=...
adb install -r app/build/outputs/apk/release/app-release.apk
./gradlew :app:testDebugUnitTest        # unit tests, finishes in seconds</code></pre>
<p><b>Watch out for signature mismatches:</b> debug and release builds use different signing keys, so Android won't let you install one directly over the other. Pick which build type lives on your test phone early, or you'll have to uninstall and wipe local server data to switch.</p>
<p><b>Watch out for silent logs in release:</b> release builds strip out all Android log calls, both in app code and framework wrappers. Logcat stays completely quiet in release mode, so never rely on it to debug a release APK. Surface diagnostics in the UI instead, or use the app's built-in debug log screen.</p>
<p>Target hardware is arm64 running Android 11 or newer. The APK only ships arm64 native libraries, so an x86 emulator won't be able to run servers.</p>
"""),
    ]),
    ("The app", [
        ("screens", "All screens at a glance", """
<p>The app keeps its navigation flat: one home screen, one main server screen, and a focused set of setup flows and utility sheets around them. Here's the quick map:</p>
<table>
  <tr><th>Screen</th><th>What you do there</th></tr>
  <tr><td>Main</td><td>see all your servers as cards, check live resource totals, and jump into settings, support, or these docs</td></tr>
  <tr><td>Create server</td><td>walk through name, software type, Minecraft version, RAM, world setup, join address, and optional modpack</td></tr>
  <tr><td>Server detail</td><td>five tabs per server: dashboard, console, files, mods and plugins, and settings</td></tr>
  <tr><td>Settings</td><td>appearance, account, support, legal docs, developer options, and the extension hub</td></tr>
  <tr><td>Extensions</td><td>install, toggle, update, and configure app extensions</td></tr>
  <tr><td>Themes</td><td>switch built-in colour schemes or apply themes provided by extensions</td></tr>
  <tr><td>Support</td><td>open support tickets, file bug reports, or use the encrypted personal chat</td></tr>
  <tr><td>Onboarding</td><td>first-launch setup: language, terms, optional account, background battery permissions, and nickname</td></tr>
</table>
"""),
        ("dashboard-home", "Your servers, the home screen", """
<p>Your home screen shows every server as a card with its name, server software, Minecraft version, and live status. Tap a card to open the full server screen, or long-press it for quick actions without leaving the list. Each card also puts the numbers you actually care about up front: player count, RAM usage, and uptime.</p>
<p>Hibernated servers appear dimmed with a one-tap wake button. When a server is mid-startup or shutting down, the button turns into an animated status indicator so you know it's working without having to open the console.</p>
<p>At the top of the screen, you'll find shortcuts to settings, support, Discord, the debug log, and the button to spin up a new server. Right above the list, a summary card adds up how many servers you have, how many are currently online, and how much memory they're using combined.</p>
"""),
        ("create-server", "Creating a server", """
<p>The creation wizard walks you through one choice at a time in a fixed order, because choices like software type and version affect everything that comes after. You'll set the name and join address first, then pick your server software, Minecraft version, memory budget, and world configuration.</p>
<ul>
  <li><b>Server type</b>: Paper, Purpur, Folia, and Vanilla if you want plugins or vanilla gameplay; Fabric, Forge, and NeoForge for mods; or PumpkinMC, a native server that runs without Java at all.</li>
  <li><b>Minecraft version</b>: filtered to versions that your chosen server software actually ships, complete with quick notes on plugin and mod compatibility.</li>
  <li><b>Memory</b>: the slider shows what your phone can safely spare alongside any other running servers.</li>
  <li><b>World</b>: configure world type, custom seed, or quick presets like a flat world for testing builds.</li>
  <li><b>Setup mode</b>: pick the Koda design to start with a tuned config and solid gameplay defaults, or choose a completely clean vanilla setup.</li>
</ul>
<p>Once you finish the wizard, the app creates the server locally and registers it in the cloud. On its very first start, it automatically downloads the server jar and the matching Java runtime if needed, showing live progress right inside the console.</p>
"""),
        ("server-dashboard", "The server dashboard tab", """
<p>When you tap into a server, you land on the dashboard tab. It's built to answer three questions in two seconds: is everything healthy, who's playing right now, and what actions do I need?</p>
<p>Status and connectivity sit right at the top, with a copyable join address and a button to customize it. Below that, the player roster shows everyone online with their skins; tapping any player opens their full sheet with stats, live inventory, and moderation controls. CPU and RAM meters update in real time, and the quick-action bar lets you start, stop, or restart the server, automatically counting down in chat first if players are connected.</p>
<p>If your server ever crashes, the dashboard swaps in a crash card with a classified root cause, a concrete suggested fix, and the final lines of the log. Applying a suggested fix takes one tap and never makes blind guesses: it adjusts one specific known setting and tells you exactly what it changed.</p>
"""),
        ("console", "The console", """
<p>The console streams raw server output live, strips out messy Minecraft ANSI colour codes, and highlights log levels so warnings and errors jump off the screen. Auto-scroll follows incoming lines until you scroll up to read something, then stays pinned right where you left it so you can actually read a stack trace in peace.</p>
<p>Just above the command bar sits a row of quick-command chips, and extensions can append their own chips there too. Anything you type goes straight to the server's stdin, so vanilla commands and plugin commands both work exactly as expected.</p>
<ul>
  <li><b>Copy</b> puts the visible console buffer on your clipboard, ready to paste into a support ticket.</li>
  <li><b>Log</b> opens the app's own verbose log, which is where you look if a runtime download or tunnel startup fails before Minecraft even boots.</li>
  <li><b>AI crash analysis</b> can walk through a crash log with you, and always asks for explicit consent before sending a single line off your phone.</li>
</ul>
"""),
        ("files", "Files: browse, edit, unpack, export", """
<p>The files tab gives you a full file manager rooted at your server directory. Tap folders to navigate, tap text files to open the built-in editor, or long-press any item to rename, copy, cut, delete, or share it.</p>
<ul>
  <li><b>Import</b> pulls files in from anywhere Android's file picker can see, including local storage, other apps, and cloud drives.</li>
  <li><b>Unpack here</b> extracts ZIP and RAR archives right in place. If a RAR archive is password-protected, the app tells you plainly instead of failing silently.</li>
  <li><b>Export</b> zips the entire server directory into your Downloads folder without an extra wrapper folder, so you can re-import it directly later.</li>
  <li><b>NBT viewer</b> lets you inspect binary NBT files like player data and <code>level.dat</code> as a clean, readable tree (read-only on purpose so nothing gets corrupted).</li>
</ul>
<p>The built-in text editor handles files up to 1 MB with clean formatting for properties, JSON, and YAML. If you hit save while the server is still online, it reminds you that many config files are only read at startup.</p>
"""),
        ("plugins", "Mods and plugins", """
<p>Mods and plugins live in their own tab, complete with a built-in Modrinth browser. You can search, filter automatically by your server's software and Minecraft version, install with a tap, and update with a tap.</p>
<p>Your installed list pulls metadata directly out of each jar (name, version, authors, and icon) and falls back to Modrinth when a jar doesn't bundle its own icon. Flipping a toggle disables a jar cleanly by renaming it rather than deleting it, and removing a jar moves it to trash for a while first in case you change your mind.</p>
<div class="callout">Don't mix up server jars and app extensions. This tab manages plugins and mods running <b>inside</b> Minecraft. App extensions customize the KodaHosting app itself and are covered later in these docs.</div>
"""),
    ]),
    ("Server management", [
        ("lifecycle", "Starting, stopping, restarting", """
<p>Starting a server looks like a single tap, but a lot happens behind the curtain: the app checks your phone's free RAM and network budget, gets the right runtime ready, writes any generated config files, launches the process, and watches the console for the startup completion line before flipping the status to online.</p>
<p>Stopping always tries the graceful route first. It tells the server to save the world and shut down cleanly, and only terminates the process if it stops responding. A force-kill option is available when a server is truly hung, tucked behind a confirmation dialog because killing a JVM mid-write can corrupt chunks.</p>
<p>Restarts go through the exact same graceful stop sequence so nobody loses inventory or builds. If players are online when you trigger a restart, the app broadcasts a countdown warning in chat first.</p>
"""),
        ("versions", "Changing the Minecraft version", """
<p>You can change a server's Minecraft version from the dashboard settings wheel. Because shifting versions touches world formats and plugin compatibility, the app treats it as a real migration rather than a casual toggle. Only versions officially published for your current server software appear in the list.</p>
<ul>
  <li><b>Upgrades</b> strongly recommend taking a backup first, though you can choose to skip it.</li>
  <li><b>Downgrades</b> require a backup before continuing, since Minecraft worlds and chunks aren't backwards-compatible.</li>
  <li>Your previous server jar stays safely in place until the new version boots cleanly.</li>
</ul>
<p>Plugins and mods won't auto-migrate across major Minecraft updates. Once the switch finishes, the app nudges you to check the mods/plugins tab, where Modrinth update checks usually locate matching builds right away.</p>
"""),
        ("backups", "Backups and restore", """
<p>Backups are standard ZIP snapshots of your entire server folder stored alongside the app, and they're the fastest way to make sure a bad plugin or accidental TNT mishap stays a minor inconvenience. You can trigger a backup manually whenever you want, or set up automatic backups on stop, daily, or both.</p>
<ul>
  <li><b>Keep count</b> sets how many backups to retain before older snapshots rotate out.</li>
  <li><b>Restore</b> rolls your server folder back to the selected archive while keeping your current files safe until the restore finishes cleanly.</li>
  <li><b>Size and age</b> appear on every backup entry so freeing up storage is an informed choice rather than guesswork.</li>
</ul>
<div class="callout">You can only restore a backup while the server is stopped. The app enforces that strictly, and it has saved plenty of worlds from half-written corruption.</div>
"""),
        ("schedules", "Automations and schedules", """
<p>The automation sheet lets you schedule recurring chores: restart, stop, save the world, broadcast a chat announcement, or run any console command. Tasks can repeat on an interval or run daily at a specific clock time, and you can optionally tell a task to wait until the server is empty.</p>
<p>Most hosts start with a nightly restart paired with a chat warning a few minutes beforehand. When an empty-only restart is queued, the app announces it in chat so nobody gets caught off guard. Everything you configure here is mirrored into the server folder so KodaDash displays the exact same schedule list in the browser.</p>
"""),
        ("players", "Players, stats and moderation", """
<p>Player management covers both sides of your community: who's connected right now and everyone who has joined in the past. Tap any player to pull up their skin, total playtime, gameplay stats, and a live inventory view read directly from their save data.</p>
<ul>
  <li><b>Live actions</b>: kick, ban, pardon, op/deop, private message, gamemode switch, teleport, and XP adjustments.</li>
  <li><b>Care actions</b>: heal, feed, saturate, plus a full inventory wipe guarded by a double confirmation.</li>
  <li><b>Inventory editing</b>: drag items straight between slots to rearrange a player's inventory, written right back into their player data.</li>
  <li><b>Whitelist</b>: toggle server-wide whitelist enforcement and add or remove individual players using the server's native whitelist rules.</li>
</ul>
"""),
        ("motd", "The MOTD editor", """
<p>Your MOTD is the two-line banner players see in their Minecraft multiplayer list, and writing colour codes by hand is nobody's idea of fun. The built-in editor gives you formatting buttons for colours, bold, italic, underline, obfuscated text, resets, and hex colours in all three formats Minecraft accepts.</p>
<p>Each toolbar button drops the right code at your cursor without losing your typing position, while a live preview shows how it will look in-game. If you'd rather edit the raw text directly, the plain <code>server.properties</code> view is still right there in the files tab.</p>
<div class="callout">Tip: drag the bottom edge of the MOTD input box to resize it when you're crafting longer messages on a smaller screen.</div>
"""),
        ("resourcepack", "Resource packs", """
<p>You don't need an external file host to serve a custom resource pack. Pick a ZIP from your phone, and the app handles every step: copies it into the server folder, calculates its SHA-1 checksum, updates the pack URL and hash in <code>server.properties</code>, and lets you flip the required-pack toggle on or off.</p>
<p>KodaDash serves the pack straight over your tunnel on your server's join address, so players download it automatically on connect. The dashboard shows whether a resource pack is active and how big the download is.</p>
"""),
        ("world", "World settings: type, seed, gameplay", """
<p>World type, seed, gamemode, difficulty, view and simulation distance, spawn protection, and hardcore mode all live in the settings tab and write directly to <code>server.properties</code>. After saving, the app reads the file back and compares values so any manual edits you made in the text editor never get silently clobbered.</p>
<p>If you tweak <code>server.properties</code> by hand while the server is offline, the app spots the mismatch next time you open settings and asks which version you want to keep. That way the UI and the config file never drift out of sync.</p>
"""),
        ("memory", "Memory settings", """
<p>Every server gets its own JVM heap limit, and the app keeps an eye on the global ceiling. Android always needs breathing room for itself, so if you launch a second server, the RAM slider automatically caps itself to what's actually free and warns you before pushing the phone into heavy swapping.</p>
<p>Because heap size is passed as a JVM launch flag, changing it takes effect on the next restart. The app also feeds your device's real memory budget into crash diagnostics, so if a server runs out of memory, the recommended fix suggests a realistic number for your specific phone rather than a generic guess.</p>
"""),
        ("java", "Java runtimes", """
<p>Different Minecraft versions require different Java versions, and bundling all of them inside the APK would make it massive. Instead, KodaHosting downloads the exact runtime a server needs on demand (covering everything from JDK 25 down to Java 17 and Java 8) and remembers that preference per server.</p>
<ul>
  <li><b>Automatic</b> picks the right JDK for your server software and Minecraft version.</li>
  <li><b>Manual</b> lets you pin a specific runtime, which is handy if a legacy mod refuses to run on anything newer than Java 17.</li>
  <li><b>Fallback</b> keeps your server bootable if a selected runtime is broken, clearly telling you which fallback it used and why.</li>
</ul>
<p>Runtime downloads stream their progress into the console tab. Downloaded runtimes are shared across all servers on your phone, so spinning up a second server on the same Java version is much faster.</p>
"""),
        ("hibernation", "Hibernate and wake", """
<p>Hibernation puts a server to sleep without deleting your work. The app stops the process, releases the join address on the tunnel, packs up the server folder, and leaves a clean marker so your home screen shows a sleeping server instead of a missing one.</p>
<p>When you're ready to play again, waking it unpacks the folder, grabs a fresh join address, and boots the server right back up. A hibernated server consumes zero RAM, zero battery, and zero tunnel bandwidth, which makes a big difference if you juggle several worlds on one phone.</p>
<div class="callout">Device-to-device server transfers use the exact same archive format under the hood, which is why both features share the same packing pipeline.</div>
"""),
        ("databases", "MariaDB and Redis", """
<p>Running plugins that expect a real database? KodaHosting can run MariaDB or Redis right alongside your Minecraft server on the same phone, using credentials you pick in the setup wizard. Both run as native binaries from the same runtime stack, so there's nothing extra to install.</p>
<p>The database card displays everything your plugin config needs (port, username, and generated password), and the data directory sits right beside the server files so normal backups capture both together. If you see the <b>Database</b> server type on the main list, that's simply a standalone MariaDB or Redis instance running without a Minecraft server attached.</p>
"""),
    ]),
]
