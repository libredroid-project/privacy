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
