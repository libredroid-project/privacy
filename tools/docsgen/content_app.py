"""Documentation content: start, the app, server management."""

GROUPS = [
    ("Start", [
        ("getting-started", "What KodaHosting is", """
<p>KodaHosting turns a phone into a real Minecraft server. Not a client and not a remote control for somebody else's machine: the server process runs on the device, the world files sit in the device storage, and the app is the control panel around it. That one decision explains almost every design choice in this codebase, including the odd ones.</p>
<p>Three planes do the work, and it helps to keep them apart in your head.</p>
<ul>
  <li><b>The device plane</b> is the app itself. It downloads server jars and Java runtimes, starts and stops the process, owns the console, browses and edits files, makes backups and applies every change. If something mutates a server, it happens here.</li>
  <li><b>The connectivity plane</b> is the tunnel. A bundled reverse proxy client forwards the Minecraft ports and the web dashboard through a public server, so friends can join without your home address ever leaving the router.</li>
  <li><b>The control plane</b> is Supabase. It knows which devices belong to which user, which servers exist, which ports are taken, which releases are published and which extensions are approved. Every write goes through a function that checks a per device token.</li>
</ul>
<p>A fourth piece is easy to miss: KodaDash, a Java plugin that runs inside the Minecraft server and serves a web dashboard on port 7867. The app writes small JSON files into the server folder for stats, backups and schedules, and KodaDash picks them up, which is why the dashboard still shows sensible numbers while the phone sleeps.</p>
"""),
        ("own-instance", "Your own instance", """
<p>The public repository is a complete snapshot of the source. What it cannot contain is the instance: the addresses, keys and accounts that belong to whoever runs it, plus the admin tooling that holds the service role key. Here is where the line is drawn.</p>
<table>
  <tr><th>Missing on purpose</th><th>Why it matters</th></tr>
  <tr><td><code>secrets_local.h</code></td><td>the Supabase URL, the public key, the AI key and the tunnel host that get compiled into the app</td></tr>
  <tr><td>The Supabase project</td><td>its rows, storage objects, auth users and the edge function secrets</td></tr>
  <tr><td>Tunnel and DNS credentials</td><td>the reverse proxy token and the DNS provider keys for custom domains</td></tr>
  <tr><td>Signing material</td><td>the release keystore, its passwords and the Play credentials</td></tr>
  <tr><td>The admin tools</td><td>the web panel and the Kotlin admin app</td></tr>
</table>
<p>One exception is on purpose. The imprint and the privacy policy name a real operator with a real address, because German law requires it, and a service that hides who runs it is not trustworthy anyway.</p>
<h4>Running your own</h4>
<ol>
  <li>Clone the repository and build it once with JDK 21.</li>
  <li>Create a Supabase project and apply the SQL files from <code>supabase/</code>: first <code>migrations/</code>, then <code>security_fix_*.sql</code>, then the remaining feature SQL (releases, extensions, notifications, KodaDash beta and profile avatar). Each file reloads the API schema.</li>
  <li>Create the storage buckets: <code>artifacts</code>, <code>release_images</code>, <code>support_attachments</code>, <code>extension_assets</code> and <code>avatars</code> public, <code>extension_packages</code> and <code>data_exports</code> private.</li>
  <li>Deploy the edge functions and set their secrets. <code>supabase/README.md</code> lists the full set; <code>get-tunnel-config</code> is the one you cannot skip, the app asks it for its tunnel credentials.</li>
  <li>Run an frps server (a hardened starting point is <code>vps-https/frps.toml.example</code>) and put its address plus your Supabase URL and public key into the native header file.</li>
  <li>Build a signed release and install it. The first screen registers a device and creates the row everything else hangs off.</li>
  <li>Optional: the Discord bot with your own token, and the admin panel if you prefer a browser over the admin app.</li>
</ol>
<div class="callout">A fresh instance starts empty on purpose. Without a backend the app still runs, but the first start cannot register a device and most screens stay quiet.</div>
"""),
        ("building", "Building the app", """
<p>One Gradle module plus a small native part that boots the embedded JVM. The first build takes a few minutes, later ones are quick.</p>
<pre><code>export JAVA_HOME=/path/to/jdk-21        # newer JDKs break the Gradle version in use
./gradlew :app:assembleDebug            # debug apk
./gradlew :app:assembleRelease -PKEYSTORE_PW=... -PKEY_PW=...
adb install -r app/build/outputs/apk/release/app-release.apk
./gradlew :app:testDebugUnitTest        # unit tests, finishes in seconds</code></pre>
<p><b>The first trap:</b> a debug build and a release build cannot replace each other, because their signatures differ. Decide early which one your test device carries, otherwise you will uninstall the app and lose its data on the way.</p>
<p><b>The second trap:</b> release builds strip every log call. Logcat stays silent in a release build, for your code and for the framework wrappers alike, so show diagnostics in the interface instead of trusting a log line. The app has its own debug log screen for exactly this reason.</p>
<p>Relevant devices are arm64 and run Android 11 or newer. The APK bundles only arm64 libraries, so an x86 emulator will install nothing useful.</p>
"""),
    ]),
    ("The app", [
        ("screens", "All screens at a glance", """
<p>The app has one main screen, one large per server screen, and a set of dialogs and helpers around them. Knowing this map makes the rest of the documentation easier to follow.</p>
<table>
  <tr><th>Screen</th><th>What it is for</th></tr>
  <tr><td>Main</td><td>your servers as cards, quick stats, and the ways into settings, support and this documentation</td></tr>
  <tr><td>Create server</td><td>a step by step setup: name, type, version, memory, world, join address, optional modpack</td></tr>
  <tr><td>Server detail</td><td>five tabs per server: dashboard, console, files, mods and plugins, settings</td></tr>
  <tr><td>Settings</td><td>appearance, account, support, legal, developer options and the extension hub</td></tr>
  <tr><td>Extensions</td><td>install, enable and configure extensions</td></tr>
  <tr><td>Themes</td><td>the app colours plus every theme contributed by an extension</td></tr>
  <tr><td>Support</td><td>tickets, bug reports and the personal chat</td></tr>
  <tr><td>Onboarding</td><td>the first start: language, terms, account, background permissions, nickname</td></tr>
</table>
"""),
        ("dashboard-home", "Your servers, the home screen", """
<p>The home screen lists every server as a card with its name, type, version and live state. A tap opens the server screen, a long press gives the quick actions that matter in the moment, and the cards carry the numbers you check most often: players, memory and uptime.</p>
<p>Servers that are hibernated appear greyed out with a wake button. Servers that are starting or stopping show the animated state instead of a button, so you can see that something is happening without opening the console.</p>
<p>Above the list you find the entry points to settings, support, Discord and the debug log, plus the button that starts a new server. The stats card at the top summarises how many servers exist, how many are online and how much memory they use together.</p>
"""),
        ("create-server", "Creating a server", """
<p>The wizard is deliberately linear, because every step has consequences that are hard to undo later. Name and join address first, then the server software, then the Minecraft version, then memory, then the world.</p>
<ul>
  <li><b>Server type</b>: Paper, Purpur, Folia and Vanilla for plugins, Fabric, Forge and NeoForge for mods, and PumpkinMC, the native server that needs no Java at all.</li>
  <li><b>Minecraft version</b>: only versions the chosen software actually publishes, with short notes on mod and plugin availability.</li>
  <li><b>Memory</b>: the wizard shows what the device can spare while other servers keep running.</li>
  <li><b>World</b>: type, seed and a few presets, including a flat world for building tests.</li>
  <li><b>Setup mode</b>: the Koda design installs a tuned configuration with sensible gameplay defaults, or you start from a clean vanilla setup.</li>
</ul>
<p>After the wizard the server is created locally and registered in the cloud, and the first start downloads the server jar and, if needed, the matching Java runtime. Both downloads show progress in the console.</p>
"""),
        ("server-dashboard", "The server dashboard tab", """
<p>The dashboard is the tab you land on, and it is built to answer three questions: is the server healthy, who is playing, and what can I do right now.</p>
<p>Status and address come first, with the join address in a copyable form and a button to change it. The player panel lists who is online, with avatars and one tap into the full player sheet for stats, inventory and moderation actions. Memory and CPU usage update live, and the quick action row starts, stops and restarts the server with a confirmation countdown when players are online.</p>
<p>When a server crashes, the dashboard is also where the crash report appears: a classified reason, the suggested fix, and the last log lines. Applying a suggested fix is a single tap and never guesses, it changes one known setting and tells you what it changed.</p>
"""),
        ("console", "The console", """
<p>The console streams the server output live, stripped of the colour codes that Minecraft servers write, with the levels highlighted so warnings and errors stand out. Auto scroll follows the newest line until you scroll up, then it stays where you are, which is the behaviour you want while reading a stack trace.</p>
<p>Above the input field sits a row of quick commands, and extensions can add their own chips to it. Commands you type are sent to the server process directly, so anything the server understands works here, including plugin commands.</p>
<ul>
  <li><b>Copy</b> puts the visible log on the clipboard, handy for a support ticket.</li>
  <li><b>Log</b> opens the full verbose log of the app itself, useful when a download or a start fails.</li>
  <li><b>AI crash analysis</b> offers to read a crash with you, and asks for consent before anything leaves the device.</li>
</ul>
"""),
        ("files", "Files: browse, edit, unpack, export", """
<p>The file tab is a full manager for the server folder. Tap a folder to enter it, tap a file to open the editor, long press an entry for the action sheet with rename, copy, cut, delete and share.</p>
<ul>
  <li><b>Import</b> brings files in from anywhere the phone can read, including other apps and cloud providers.</li>
  <li><b>Unpack here</b> extracts ZIP and RAR archives in place. Password protected RAR files are reported instead of failing silently.</li>
  <li><b>Export</b> writes the whole folder as a ZIP into Downloads, without a wrapper folder so it can be reimported directly.</li>
  <li><b>NBT viewer</b> opens player data, level data and other binary NBT files as a readable tree, read only by design.</li>
</ul>
<p>The editor is for text files up to a megabyte, with syntax friendly handling for properties, JSON and YAML, and a save button that warns when the server is running because some files are only read at start.</p>
"""),
        ("plugins", "Mods and plugins", """
<p>Mods and plugins are managed in their own tab, and the install side is a Modrinth browser: search, filter by the server type and version, install with one tap, update with one tap.</p>
<p>The installed list shows every jar with its metadata read from the file itself: name, version, authors and icon, with a Modrinth lookup as a fallback because many server jars ship no image. A switch enables and disables a jar by renaming it, and the trash keeps removed files for a while instead of deleting them outright.</p>
<div class="callout">Server jars are not app extensions. This tab manages software that runs <b>inside</b> Minecraft. App extensions are a different system, described further down.</div>
"""),
    ]),
    ("Server management", [
        ("lifecycle", "Starting, stopping, restarting", """
<p>Starting a server is one tap, and the app orchestrates a lot behind that tap: it checks memory and network budget, prepares the runtime, writes generated configs, starts the process, and waits for the startup line before reporting the server as online.</p>
<p>Stopping asks the server politely first, sends the save command, and only kills the process when it does not react. The force kill option exists and warns that world data may be lost, which is why it sits behind a confirmation.</p>
<p>Restarts reuse the stop path, so players do not lose progress. When people are online, the server announces the restart in chat with a countdown.</p>
"""),
        ("versions", "Changing the Minecraft version", """
<p>Version changes live behind a wheel on the dashboard and are treated as a structural operation, not a setting. The list only shows versions the current server software really publishes, and the switch takes a backup first.</p>
<ul>
  <li><b>Upgrades</b> ask for a backup but let you continue without one.</li>
  <li><b>Downgrades</b> require one, because worlds and chunks are not backwards compatible.</li>
  <li>The old jar is kept until the new one started successfully.</li>
</ul>
<p>Plugins and mods are not migrated automatically. After a version change the app tells you to check the mods tab, and Modrinth update checks usually find matching builds.</p>
"""),
        ("backups", "Backups and restore", """
<p>Backups are ZIP archives of the whole server folder, stored beside the app, and they are the reason a bad afternoon stays an afternoon. You can create one manually, or let the app keep a schedule: on stop, daily, or both.</p>
<ul>
  <li><b>Keep count</b> decides how many copies survive the rotation.</li>
  <li><b>Restore</b> replaces the server folder with the chosen state and keeps the current files until the restore finishes.</li>
  <li><b>Size and age</b> are shown per backup, so cleaning up is a decision and not a guess.</li>
</ul>
<div class="callout">Restoring needs a stopped server. The app refuses otherwise, and that refusal has saved more worlds than any warning text could.</div>
"""),
        ("schedules", "Automations and schedules", """
<p>The automation sheet plans recurring work: restart, stop, save the world, announce something or run a command. Jobs can run on an interval or daily at a fixed time, and they can wait until nobody is online.</p>
<p>A nightly restart with an announcement a few minutes ahead is the usual first job. The app notes in chat before an empty only restart, so players are never surprised, and the KodaDash dashboard shows the same job list because the app mirrors it into the server folder.</p>
"""),
        ("players", "Players, stats and moderation", """
<p>Player management covers both worlds: the live roster of who is connected, and the history of everyone who ever joined. Tapping a player opens a sheet with their skin, playtime, statistics and inventory rendered from the actual save data.</p>
<ul>
  <li><b>Live actions</b>: kick, ban, pardon, op and deop, message, gamemode, teleport, experience.</li>
  <li><b>Care actions</b>: heal, feed, saturate, and a full inventory wipe that asks twice.</li>
  <li><b>Inventory</b> can be rearranged by dragging items between slots, which writes straight into the player save.</li>
  <li><b>Whitelist</b> switches per player and for the server as a whole, with the same rules the server uses.</li>
</ul>
"""),
        ("motd", "The MOTD editor", """
<p>The MOTD is the two line text players see in their server list, and the editor treats it like the formatting puzzle it is. Colours, bold, italic, underline, obfuscated, reset, plus hex colours in all three notations Minecraft accepts, are inserted as proper codes while you type.</p>
<p>Every code button inserts into the field and keeps your cursor in the right place, and a live preview shows how the text will look. If you prefer raw editing, the plain properties view is still one tab away.</p>
<div class="callout">The MOTD field can be resized by dragging its lower edge, which helps with long texts and small screens.</div>
"""),
        ("resourcepack", "Resource packs", """
<p>A resource pack is served by the server itself, and the app handles the whole chain: pick a ZIP, upload it into the server folder, set the pack URL and the SHA-1 checksum in the properties, and switch the pack requirement on or off.</p>
<p>KodaDash serves the file over the tunnel so players can download it through the join address, which means no external hosting is needed. The dashboard shows whether a pack is active and how large it is.</p>
"""),
        ("world", "World settings: type, seed, gameplay", """
<p>World type, seed, gamemode, difficulty, view and simulation distance, spawn protection and hardcore mode are all edited in the settings tab and written into <code>server.properties</code>. The app reads the file back afterwards and compares it to what it wrote, so manual edits are never overwritten silently.</p>
<p>If you change a value by hand while the server is stopped, the app notices the drift on the next visit and asks which value should win. That is the reason the file and the interface never disagree, a problem that otherwise shows up as a server that ignores its own settings.</p>
"""),
        ("memory", "Memory settings", """
<p>Each server gets its own heap size, and the app guards the total: Android keeps a reserve for itself, and starting a second server can only use what is left. The RAM slider shows what fits right now and warns when a value would push the device into swapping.</p>
<p>Changing memory requires a restart to take effect, because it becomes a JVM start argument. The app uses it to power the crash advice as well: an out of memory crash arrives with a suggested value that fits the device, not an arbitrary number.</p>
"""),
        ("java", "Java runtimes", """
<p>Minecraft servers need a Java runtime per version, and the app bundles none of them by default. Instead it downloads the matching runtime when a server needs it, from JDK 25 down to 8 and 17, and remembers the choice per server.</p>
<ul>
  <li><b>Automatic</b> picks the runtime that matches the server version and software.</li>
  <li><b>Manual</b> lets you pin a version, for example a mod that insists on Java 17.</li>
  <li><b>Fallback</b> starts the server anyway when a runtime is broken, and tells you what it did and why.</li>
</ul>
<p>The download progress is visible in the console tab, and runtimes are shared between servers, so the second server of the same version starts much faster.</p>
"""),
        ("hibernation", "Hibernate and wake", """
<p>Hibernation takes a server off the air without deleting it: the app stops the process, removes the join address from the network, packs the folder, and leaves a marker behind so the dashboard shows a sleeping server instead of a broken one.</p>
<p>Waking it restores the folder, requests a fresh join address, and starts the process. The point of the feature is the phone: a hibernated server uses no memory, no battery and no tunnel, which matters when you host more than one world.</p>
<div class="callout">The transfer between two devices speaks the same language, which is why both features share their packing code.</div>
"""),
        ("databases", "MariaDB and Redis", """
<p>For plugins that need a database, the app can run MariaDB or Redis next to the server, on the phone, with credentials you choose in the wizard. Both run as native processes from the same runtime set that runs the servers, so there is nothing to install separately.</p>
<p>The connection details are shown in the database card, including port, user and a generated password, and the app keeps the data directory beside the server folder so a backup covers both. The server type <b>Database</b> in the main list is exactly this: a database instance without a Minecraft server around it.</p>
"""),
    ]),
]
