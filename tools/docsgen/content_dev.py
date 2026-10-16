"""Documentation content: infrastructure, development and troubleshooting."""

GROUPS = [
    ("Infrastructure", [
        ("db-schema", "The database", """
<p>The control plane runs on Supabase, and the schema is deliberately small and readable. Everything a client is allowed to do goes through a function, tables themselves are closed to the API.</p>
<table>
  <tr><th>Table</th><th>What it holds</th></tr>
  <tr><td><code>koda_users</code></td><td>one row per device: app uuid, device token, linked Minecraft account, nickname, permissions, ban state</td></tr>
  <tr><td><code>koda_servers</code></td><td>one row per server: owner, type, version, port, join address, state, join address history</td></tr>
  <tr><td><code>koda_ports</code></td><td>the port pool, with allocation and release handled by edge functions</td></tr>
  <tr><td><code>releases</code></td><td>app releases with changelog, channel, banner image and a published flag</td></tr>
  <tr><td><code>app_settings</code></td><td>remote configuration: maintenance mode, minimum versions, feature flags</td></tr>
  <tr><td><code>support_tickets</code>, <code>support_ticket_messages</code></td><td>tickets and their conversation, including the encrypted personal chat</td></tr>
  <tr><td><code>extension_*</code></td><td>the extension registry: packages, versions, reports</td></tr>
</table>
<p>Functions follow one naming rule: anything a client may call starts with <code>rpc_</code>, internal helpers start with <code>fn_</code>. Read functions that replace a table are the norm, and every write verifies the device token inside the function rather than trusting the caller.</p>
"""),
        ("edge-functions", "Edge functions", """
<p>Small Deno functions handle the work that needs a secret or a decision the client should not make itself: allocating and freeing ports, checking whether a server name is free, creating and deleting DNS records, provisioning a Java runtime, and handing out the tunnel configuration after verifying a device token.</p>
<p>They are the only place where credentials for external services live, and each one validates its caller first. A typical request carries the app uuid and the device token, and the shared helper in <code>supabase/functions/_shared</code> does the verification in one place.</p>
"""),
        ("kodadash-internals", "Inside KodaDash", """
<p>KodaDash is a Java plugin with its own small HTTP server, built on the JDK's built in server so it has no dependencies beyond the plugin API. It registers one handler per area: console, players, files, settings, plugins, logs, backups, schedule, stats, efficiency and the server actions.</p>
<p>The console handler is the interesting one: it attaches a Log4j appender through a dynamic proxy, keeps a bounded per client queue with a writer thread, and streams events with a line index so a reconnecting browser resumes exactly where it stopped. That is why the dashboard console survives a phone going to sleep and back.</p>
<p>The dashboard never writes files the app owns. The app mirrors stats, backups and the schedule into the server folder, and KodaDash reads them, which keeps one writer per piece of state.</p>
"""),
        ("release-bot", "The Discord release bot", """
<p>A small Node.js bot watches the releases table and announces anything that is published and not yet announced. It runs on the server as a service, reads with the service role key, and marks each release after posting, which makes it safe to restart at any time.</p>
<p>Each announcement carries the changelog and the release banner. The bot never writes releases itself, publishing stays a deliberate action in the admin panel.</p>
"""),
        ("website", "The website", """
<p>The website is a static site with a dashboard page that talks to the same Supabase project through the anon key and a real user login. It answers the questions a phone screen is bad at: comparing servers side by side, reading a changelog on a big screen, or checking whether a server is up while away from the app.</p>
<p>The legal texts and the third party license list are the same files the app ships, so there is one source of truth and one place to correct a typo. This documentation page is part of the same site and lives in the same repository as the code it describes.</p>
"""),
        ("admin-tools", "The admin tools", """
<p>Two tools exist for the operator, and both are private by design, because both hold the service role key.</p>
<ul>
  <li><b>The web panel</b> for publishing releases, uploading banners and reviewing the extension registry.</li>
  <li><b>The Android admin app</b> for everything that should not wait for a browser: user and hardware bans, tickets, the email centre, DNS and server access.</li>
</ul>
<p>Neither tool is part of the public repository. If you run your own instance, you either build equivalents or use the Supabase dashboard directly, which is enough for a small instance.</p>
"""),
        ("security-model", "The security model", """
<p>The app ships a public API key, and that is fine because the key alone authorises nothing. Every write carries the device uuid and a per device token, and the server side functions verify that pair before they touch a row.</p>
<ul>
  <li><b>Device tokens</b> are random, per installation, and rotate when a device is reset.</li>
  <li><b>Row level security</b> is on everywhere, with no permissive policies on the tables clients use.</li>
  <li><b>Admin functions</b> additionally check an allowlist, so holding the service key is not the same as being an admin.</li>
  <li><b>Anti tamper</b> watches the app's own state and identity, and is deliberately narrow to avoid punishing honest users.</li>
  <li><b>Attack simulations</b> in the repository try the classic moves with the public key: writing without a token, escalating to admin, spoofing a ticket, reading tables directly. They must all fail.</li>
</ul>
<div class="callout">Server side plugins have their own credentials. The KodaDash token lives in the server folder, not in the app, and a stolen token cannot delete backups by design.</div>
"""),
    ]),
    ("Development", [
        ("workflow", "Working on the code", """
<p>The project uses two repositories: a private development repository and a public mirror. The mirror is produced by a script that copies tracked files, excludes the local tooling, the IDE state and database backups, and scans the result for instance data before it pushes. A pattern that has never been public before aborts the push, which is the only reason a project this size can be published safely.</p>
<p>Branches are simple: work happens on a feature branch, releases are tagged, and the mirror receives a snapshot commit. When you fork, the same script is your safety net for anything you adapt.</p>
"""),
        ("testing", "The checks that run around a change", """
<p>None of these is ceremony. Every check exists because the corresponding mistake reached a device at least once.</p>
<table>
  <tr><th>Check</th><th>What it protects</th></tr>
  <tr><td><code>./gradlew :app:testDebugUnitTest</code></td><td>extension manifest rules, example packages that must install on the current build, path traversal in archives</td></tr>
  <tr><td><code>check_language_pack.py</code></td><td>language packs with typo keys, which would otherwise do nothing at all</td></tr>
  <tr><td><code>check_translation.py</code></td><td>built in translations with missing keys or broken placeholders</td></tr>
  <tr><td>Koda Lab on a device</td><td>the whole bridge at runtime with raw answers, plus storage quota and rate limits</td></tr>
  <tr><td>The packaging tools</td><td>unknown view ids, missing files and malformed colours before a package leaves your machine</td></tr>
  <tr><td>The mirror publish script</td><td>instance data on its way into the public repository</td></tr>
</table>
"""),
        ("release", "Making a release", """
<p>A release is a version bump, a build, an entry in the releases table and a banner. The order matters, because the app reads the version from the database, not from the store.</p>
<ol>
  <li>Raise <code>versionCode</code> and <code>versionName</code> in the Gradle file and build a signed bundle for the store and an APK for direct installs.</li>
  <li>Add a draft row to <code>releases</code> with the changelog, the channel and the banner, and leave it unpublished while you check it.</li>
  <li>Publish: the flag goes up, the app's update screen starts offering the new version, and the bot announces it in Discord.</li>
</ol>
<p>Users on an older build see the update screen with the changelog text, which is why the changelog is written for people rather than for machines.</p>
"""),
        ("licensing", "Licensing, in plain words", """
<p>The project is free software under the GNU General Public License v3, and only that. Source files carry a short header that points at the license text. If you fork and publish, keep those headers and the license, and your users keep the same freedoms you got.</p>
<p>Third party components are listed twice on purpose: inside the app under Licenses in the settings, and on the website at <a href="https://host.kodanetwork.eu/licenses.html">host.kodanetwork.eu/licenses.html</a>, so people can read them without installing anything. When you add a dependency, add its license text there as well.</p>
<p>Extensions are not covered by this license. They are separate works that run against a documented interface, and every published extension declares its own license, which the app shows to the user. That is why the license field is mandatory in the manifest and why the store recommends a source link.</p>
"""),
        ("troubleshooting", "When something goes wrong", """
<p>Most problems have a short answer, and the app usually says it before you have to guess.</p>
<table>
  <tr><th>Symptom</th><th>What to check</th></tr>
  <tr><td>Server starts and stops again immediately</td><td>the console tab, the crash card names the cause and offers a fix</td></tr>
  <tr><td>Players cannot join</td><td>the join address on the dashboard, and whether the server shows online</td></tr>
  <tr><td>The server stops while the screen is off</td><td>background permissions, the app asks for battery exceptions during setup</td></tr>
  <tr><td>Downloads fail</td><td>the network alarm, and the verbose log under Log in the console tab</td></tr>
  <tr><td>An update does not appear</td><td>the app version in the settings, and whether the release is published</td></tr>
  <tr><td>A plugin breaks the start</td><td>the plugins tab, disable the newest jar and read the console again</td></tr>
</table>
<p>When in doubt, the debug log screen copies everything into a support ticket in one tap, which is faster than describing symptoms.</p>
"""),
        ("faq", "Questions that come up often", """
<h4>Does a server keep running when the app is closed?</h4>
<p>Yes. The server runs in a foreground service with a notification, and the app asks for battery exceptions during setup so Android does not stop it. The console and the dashboard keep working through KodaDash while the phone sleeps.</p>
<h4>Do I need an account?</h4>
<p>No. An account adds the website dashboard, recovery on a new device and the family features, but hosting works without one.</p>
<h4>Is my world uploaded anywhere?</h4>
<p>No. Worlds stay on the device unless you start a transfer to another device, and that transfer runs directly between the two phones.</p>
<h4>Why is the app not on the store for every country?</h4>
<p>Because hosting needs a device with enough memory and a modern WebView, and the store listing states the requirements honestly instead of collecting refunds.</p>
<h4>Can I host more than one server?</h4>
<p>Yes, as long as memory allows. The app tracks the budget, and hibernation exists so inactive worlds cost nothing.</p>
<h4>How do I get help?</h4>
<p>Through a ticket in the app or the Discord server. The personal chat is there for things that are not about servers at all.</p>
"""),
    ]),
]
