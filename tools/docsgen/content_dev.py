"""Documentation content: infrastructure, development and troubleshooting."""

GROUPS = [
    ("Infrastructure", [
        ("db-schema", "The database", """
<p>The control plane runs on Supabase with a deliberately small, easy-to-audit schema. Raw tables stay locked off from direct API access; every action a client is allowed to take goes through an explicit database function.</p>
<table>
  <tr><th>Table</th><th>What it stores</th></tr>
  <tr><td><code>koda_users</code></td><td>one row per device: app UUID, device token, linked Minecraft account, nickname, permissions, and ban state</td></tr>
  <tr><td><code>koda_servers</code></td><td>one row per server: owner, software type, version, port, join address, live state, and join address history</td></tr>
  <tr><td><code>koda_ports</code></td><td>the shared port pool, allocated and freed exclusively by edge functions</td></tr>
  <tr><td><code>releases</code></td><td>app releases with changelog copy, channel, banner artwork, and publish flag</td></tr>
  <tr><td><code>app_settings</code></td><td>remote flags: maintenance mode, minimum supported versions, and feature toggles</td></tr>
  <tr><td><code>support_tickets</code>, <code>support_ticket_messages</code></td><td>support tickets and reply threads, plus the encrypted personal chat</td></tr>
  <tr><td><code>extension_*</code></td><td>the extension registry: packages, versions, review state, and reports</td></tr>
</table>
<p>Naming stays strictly consistent: client-callable RPCs start with <code>rpc_</code>, while internal database helpers start with <code>fn_</code>. Read RPCs stand in for direct table queries, and every write RPC verifies the caller's device token inside the function itself instead of blindly trusting request parameters.</p>
"""),
        ("edge-functions", "Edge functions", """
<p>Lightweight Deno edge functions handle everything that requires private credentials or server-side authority: allocating and releasing ports, checking server name availability, creating and deleting DNS records, provisioning Java runtimes, and handing out tunnel configs once a device token checks out.</p>
<p>Edge functions are the only layer that holds external service secrets. Incoming requests pass the app UUID and device token, and a single shared helper in <code>supabase/functions/_shared</code> handles caller verification consistently across every endpoint.</p>
"""),
        ("kodadash-internals", "Inside KodaDash", """
<p>KodaDash is a compact Java plugin that spins up its own HTTP server using the JDK's built-in server classes, so it carries zero third-party dependencies beyond the Minecraft plugin API. Each area registers its own clean handler: console, players, files, settings, plugins, logs, backups, schedules, stats, efficiency, and server actions.</p>
<p>The console handler is where the cleverness lives: it attaches a Log4j appender via a dynamic proxy, maintains a bounded per-client queue on a dedicated writer thread, and tags every streamed event with a monotonically increasing line index. If your browser disconnects when your phone sleeps, it reconnects and picks up on the exact line it missed.</p>
<p>To avoid race conditions, KodaDash never overwrites files owned by the Android app. The app mirrors stats, backups, and schedules into the server directory, and KodaDash treats them as read-only so every piece of state has a single clear owner.</p>
"""),
        ("release-bot", "The Discord release bot", """
<p>A small Node.js service polls the <code>releases</code> table for anything marked published that hasn't been announced yet. It runs server-side with the service role key, posts the changelog and banner image to Discord, and flips the announced flag afterward so restarting the bot never causes duplicate posts.</p>
<p>The bot is strictly an announcer: it never creates or edits releases itself. Publishing stays an explicit button click in the operator admin panel.</p>
"""),
        ("website", "The website", """
<p>The website is a fast static app paired with a live dashboard that talks to the same Supabase backend using the public anon key and standard user login. It focuses on the things a phone screen isn't great for: viewing all your servers side by side, reading changelogs comfortably, managing extensions, or checking server status while you're at a desk.</p>
<p>Legal notices and third-party license lists come from the exact same source files bundled in the Android app, so fixing a typo once updates both places. These docs live right in the same site and repository as the code they document.</p>
"""),
        ("admin-tools", "The admin tools", """
<p>Two private operator tools sit on top of the service role key, which is why neither lives in the public repository:</p>
<ul>
  <li><b>The web admin panel</b> for publishing app releases, uploading release banners, and reviewing extension submissions.</li>
  <li><b>The Android admin app</b> for urgent on-the-go operations: user and device bans, support tickets, email tools, DNS management, and server triage.</li>
</ul>
<p>If you self-host your own KodaHosting instance, you can either build lightweight admin tools of your own or manage rows directly in the Supabase dashboard, which works fine for smaller setups.</p>
"""),
        ("security-model", "The security model", """
<p>Yes, the app ships with a public API key, and that's completely intentional because that key alone can't authorize any mutation. Every write carries the device's UUID and a per-installation device token, and server-side functions verify that exact pair before modifying a single row.</p>
<ul>
  <li><b>Device tokens</b> are randomly generated per installation and rotate automatically whenever a device resets.</li>
  <li><b>Row level security</b> stays enabled everywhere, with zero permissive open policies on client tables.</li>
  <li><b>Admin functions</b> check an explicit allowlist on top of credentials, so merely possessing a key isn't enough to act as an admin.</li>
  <li><b>Anti-tamper checks</b> guard the app's own state and identity, kept intentionally narrow so normal users never hit false positives.</li>
  <li><b>Attack simulations</b> live in the repo and continuously test the classic abuse paths using the public key: tokenless writes, privilege escalation, ticket spoofing, and raw table reads. Every one of them has to fail.</li>
</ul>
<div class="callout">Server-side plugins keep their credentials separate too. Your KodaDash token lives inside the server folder rather than the app, and even a leaked dashboard token can never delete backups.</div>
"""),
    ]),
    ("API", [
        ("api-reference", "API reference", """
<p>The public API runs at <code>https://api.kodanetwork.eu</code> and returns JSON across the board. Public read endpoints used by this website don't require an API key. Everything under <code>/v1/me</code> expects your Supabase access token in an <code>Authorization: Bearer ...</code> header.</p>
<table>
  <tr><th>Method and path</th><th>What it returns</th></tr>
  <tr><td><code>GET /v1/status</code></td><td>API version, live server and player counts, tunnel load, latest release, and maintenance flag</td></tr>
  <tr><td><code>GET /v1/servers?limit=12</code></td><td>public servers with host address, status, MOTD, and player counts</td></tr>
  <tr><td><code>GET /v1/servers/{host}</code></td><td>single public server details, including a live Minecraft ping when reachable</td></tr>
  <tr><td><code>GET /v1/extensions</code></td><td>the approved extension store catalog</td></tr>
  <tr><td><code>GET /v1/extensions/{ext_id}</code></td><td>full extension details, description, screenshots, and approved versions</td></tr>
  <tr><td><code>GET /v1/extensions/{ext_id}/download?version={code}</code></td><td>redirects to a short-lived signed package download URL</td></tr>
  <tr><td><code>GET /v1/invite/{token}</code></td><td>details for a server invite, including join addresses and usage limits</td></tr>
</table>
<h4>Signed in</h4>
<table>
  <tr><th>Method and path</th><th>What it does</th></tr>
  <tr><td><code>POST /v1/invite/{token}/accept</code></td><td>accepts an invite and attaches the shared server to your account</td></tr>
  <tr><td><code>GET /v1/me</code></td><td>account profile, linked Minecraft account, counters, and 2FA status</td></tr>
  <tr><td><code>PATCH /v1/me</code></td><td>updates your nickname or avatar URL</td></tr>
  <tr><td><code>GET /v1/me/devices</code></td><td>linked devices along with telemetry and linked Minecraft accounts</td></tr>
  <tr><td><code>POST /v1/me/devices/{app_uuid}/unlink</code></td><td>detaches a device from your account</td></tr>
  <tr><td><code>GET /v1/me/tickets</code></td><td>list of your support tickets and their most recent message</td></tr>
  <tr><td><code>GET /v1/me/tickets/{id}</code></td><td>full conversation history for a single ticket</td></tr>
  <tr><td><code>POST /v1/me/tickets/{id}/messages</code></td><td>posts a reply to a ticket</td></tr>
  <tr><td><code>GET /v1/me/extensions</code></td><td>your extension submissions and their review status</td></tr>
  <tr><td><code>POST /v1/extensions</code>, <code>/versions</code>, <code>/finalize</code>, <code>/withdraw</code></td><td>the full extension store submission lifecycle</td></tr>
  <tr><td><code>POST /v1/assets</code></td><td>creates a signed upload URL for an extension icon or screenshot</td></tr>
  <tr><td><code>POST /v1/me/servers/{host}/action</code></td><td>starts, restarts, or stops a server remotely</td></tr>
</table>
<h4>Errors</h4>
<p>Failed requests return <code>{ "error": "name" }</code> paired with a standard HTTP status code. A <code>401</code> means your session expired and you need to sign in again. A <code>429</code> includes a <code>retry_after</code> duration in seconds; the web UI pauses cleanly with a countdown until that window clears rather than dumping raw errors on screen.</p>
<p>The extension submission pipeline enforces a few extra invariants: <code>version_code</code> must strictly increase, only one version per extension can sit in review at once, and package SHA-256 hashes are always verified post-upload. The live status page links straight here so real-time metrics and their exact API endpoints stay connected.</p>
"""),
    ]),
    ("Development", [
        ("workflow", "Working on the code", """
<p>Development splits across two repositories: a private day-to-day repo and a public mirror. A dedicated mirror script copies tracked source files, filters out local helper scripts, IDE files, and database backups, and scans every file for private instance data before pushing. If an unfamiliar secret-like pattern shows up, the push aborts automatically. That safety net is what makes publishing a codebase this size sustainably possible.</p>
<p>Branching stays lightweight: features happen on short-lived branches, releases get tagged, and the public mirror gets clean snapshot commits. If you fork the project, you can use the exact same publish script to protect your own instance secrets.</p>
"""),
        ("testing", "The checks that run around a change", """
<p>None of these checks exist just to pad a CI badge. Every single one was added after that exact mistake actually made it onto a phone at least once:</p>
<table>
  <tr><th>Check</th><th>What it catches</th></tr>
  <tr><td><code>./gradlew :app:testDebugUnitTest</code></td><td>manifest validation rules, example extensions that must install cleanly on the current build, and archive path traversal</td></tr>
  <tr><td><code>check_language_pack.py</code></td><td>typo keys in extension language packs that would otherwise silently do nothing</td></tr>
  <tr><td><code>check_translation.py</code></td><td>built-in translations with missing keys or mismatched format placeholders</td></tr>
  <tr><td>Koda Lab on a real device</td><td>live bridge behaviour, raw JSON responses, storage quotas, and rate limits</td></tr>
  <tr><td>Extension packaging tools</td><td>unknown view IDs, missing files, and invalid colour codes before a package leaves your machine</td></tr>
  <tr><td>Mirror publish script</td><td>accidental instance config or credentials before anything hits the public repository</td></tr>
</table>
"""),
        ("release", "Making a release", """
<p>Shipping a release means bumping the version, building signed artifacts, creating a row in <code>releases</code>, and uploading a banner. The order matters because the app checks the database for updates rather than relying on the store listing alone.</p>
<ol>
  <li>Increment <code>versionCode</code> and <code>versionName</code> in Gradle, then build a signed app bundle for Google Play and a signed APK for direct downloads.</li>
  <li>Insert a draft entry in <code>releases</code> with the changelog, channel, and banner image, keeping it unpublished while you double-check everything.</li>
  <li>Flip the published flag: the in-app update prompt starts offering the new build, and the Discord bot announces it automatically.</li>
</ol>
<p>Anyone running an older build sees your changelog right inside the update screen, so write changelogs for real humans rather than dumping raw git commit messages.</p>
"""),
        ("licensing", "Licensing, in plain words", """
<p>KodaHosting is free software released strictly under the GNU General Public License v3. Source files carry a short header pointing to the full license text. If you fork the code and distribute your build, keep those headers and the GPLv3 terms intact so your users get the exact same freedoms you received.</p>
<p>Third-party libraries and licenses are published in two places on purpose: inside the app under <b>Settings, Licenses</b>, and online at <a href="https://host.kodanetwork.eu/licenses.html">host.kodanetwork.eu/licenses.html</a> so anyone can inspect them before installing. Whenever you add a new dependency, make sure its license lands there too.</p>
<p>Extensions are separate works that talk to KodaHosting over its documented bridge API, so they aren't forced under GPLv3. Every extension picks and declares its own license, which the app surfaces clearly to users. That's why <code>license</code> is required in every manifest and why the store strongly encourages linking source code.</p>
"""),
        ("troubleshooting", "When something goes wrong", """
<p>Most hiccups have a straightforward cause, and the app usually points you right to it before you have to dig:</p>
<table>
  <tr><th>Symptom</th><th>Where to look first</th></tr>
  <tr><td>Server starts and immediately stops</td><td>open the console tab; the crash card identifies the cause and usually offers a one-tap fix</td></tr>
  <tr><td>Friends can't connect</td><td>verify the live join address on the dashboard and make sure the server actually shows online</td></tr>
  <tr><td>Server dies when the screen turns off</td><td>check Android battery optimization settings; the app needs background exemptions enabled</td></tr>
  <tr><td>Downloads keep failing</td><td>check the network alarm and open the verbose app log under <b>Log</b> in the console tab</td></tr>
  <tr><td>An update isn't showing up</td><td>check your installed version in Settings and confirm the release is marked published</td></tr>
  <tr><td>A newly added plugin breaks startup</td><td>head to the plugins tab, toggle off the newest jar, and check the console again</td></tr>
</table>
<p>Still stuck? Open the debug log screen and attach everything to a support ticket in one tap. That gives way more context than trying to describe the error from memory.</p>
"""),
        ("faq", "Questions that come up often", """
<h4>Does my server keep running when I close the app?</h4>
<p>Yes. Servers run inside an Android foreground service with a persistent notification, and onboarding walks you through battery exemptions so Android doesn't put it to sleep. You can still watch the console and manage everything through KodaDash while the phone screen is off.</p>
<h4>Do I have to create an account?</h4>
<p>Nope. Hosting works completely without an account. Creating one simply adds the web dashboard, easy recovery on a new phone, and family sharing permissions.</p>
<h4>Are my worlds uploaded to the cloud?</h4>
<p>Never. Your world files stay locally on your phone unless you explicitly initiate a device-to-device transfer, and even then they travel encrypted straight between your two phones.</p>
<h4>Why isn't the app available on the Play Store for every phone or country?</h4>
<p>Running a real Minecraft server takes solid RAM and a modern Android WebView. Keeping store eligibility honest prevents people with unsupported devices from running into crashes and frustration.</p>
<h4>Can I host more than one server at the same time?</h4>
<p>Yes, as long as your phone has the memory for it. The app monitors your combined RAM budget automatically, and you can hibernate worlds you aren't playing so they take zero memory or battery.</p>
<h4>Where can I get help?</h4>
<p>Open a support ticket right inside the app or drop into the Discord server. And for personal stuff that has nothing to do with Minecraft servers, the encrypted personal chat is always there too.</p>
"""),
    ]),
]
