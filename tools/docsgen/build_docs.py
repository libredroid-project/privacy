#!/usr/bin/env python3
"""Build the KodaHosting documentation site (docs/index.html).

Content lives in content_app.py, content_net.py, content_ext.py and content_dev.py.
Each module exports GROUPS: [(group label, [(section id, section title, html), ...]), ...].
The builder renders the sidebar, the sections, the prev/next links and a search index
that the page ships with, so search works offline and without a server.
"""

import html as html_mod
import json
import os
import re
import sys

from content_app import GROUPS as G_APP
from content_net import GROUPS as G_NET
from content_ext import GROUPS as G_EXT
from content_dev import GROUPS as G_DEV

# write next to the repo: tools/docsgen/build_docs.py -> <repo>/docs/index.html
DEFAULT_OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "index.html")
OUT = os.environ.get("DOCS_OUT", sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT)
GROUPS = G_APP + G_NET + G_EXT + G_DEV

HEAD_RE = re.compile(r"<h([34])>(.*?)</h\1>", re.S)
TAG_RE = re.compile(r"<[^>]+>")


def plain(s):
    """HTML to plain text for the search index."""
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"</(p|li|tr|td|th|h[1-6]|div|table|ul|ol|pre|code)>", " ", s)
    s = TAG_RE.sub("", s)
    s = html_mod.unescape(s)
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def wrap_tables(s):
    s = s.replace("<table>", '<div class="tw"><table>')
    s = s.replace("</table>", "</table></div>")
    return s


def prepare_section(sid, body):
    """Give every subheading a stable id and return (html, chunks).

    chunks is a list of (anchor, heading, text) used for the search index.
    """
    out = []
    chunks = []
    idx = 0
    pos = 0
    cur_anchor = sid
    cur_heading = None
    cur_parts = []

    def flush():
        chunks.append((cur_anchor, cur_heading, plain("".join(cur_parts))))

    for m in HEAD_RE.finditer(body):
        cur_parts.append(body[pos:m.start()])
        flush()
        idx += 1
        anchor = "%s-%d" % (sid, idx)
        heading = plain(m.group(2))
        out.append(body[pos:m.start()])
        out.append('<h%s id="%s">%s</h%s>' % (m.group(1), anchor, m.group(2), m.group(1)))
        cur_anchor = anchor
        cur_heading = heading
        cur_parts = []
        pos = m.end()
    cur_parts.append(body[pos:])
    flush()
    out.append(body[pos:])
    return "".join(out), chunks


def main():
    sidebar = []
    sections = []
    index = []
    flat = []  # (sid, title, body, group) in reading order

    for group, items in GROUPS:
        links = []
        for sid, title, body in items:
            flat.append((sid, title, body, group))
            links.append(sid)
        sidebar.append((group, links))

    titles = {sid: t for sid, t, _, _ in flat}

    for i, (sid, title, body, group) in enumerate(flat):
        body = body.strip()
        html, chunks = prepare_section(sid, body)
        html = wrap_tables(html)

        prev_l = ""
        next_l = ""
        if i > 0:
            pid, ptitle, _, _ = flat[i - 1]
            prev_l = '<a href="#%s">&larr; %s</a>' % (pid, html_mod.escape(ptitle))
        else:
            prev_l = "<span></span>"
        if i < len(flat) - 1:
            nid, ntitle, _, _ = flat[i + 1]
            next_l = '<a href="#%s">%s &rarr;</a>' % (nid, html_mod.escape(ntitle))
        else:
            next_l = "<span></span>"

        sections.append(
            '<section id="%s">\n'
            '<div class="eyebrow">%s</div>\n'
            '<h2>%s</h2>\n%s\n'
            '<div class="nextprev">%s%s</div>\n'
            "</section>"
            % (sid, html_mod.escape(group), html_mod.escape(title), html, prev_l, next_l)
        )

        for anchor, heading, text in chunks:
            if not text and heading is None:
                continue
            index.append(
                {
                    "a": anchor,
                    "s": sid,
                    "t": title,
                    "g": group,
                    "h": heading or title,
                    "x": text[:6000],
                }
            )

    nav_html = []
    for group, links in sidebar:
        rows = "".join(
            '<a href="#%s" data-s="%s">%s</a>' % (sid, sid, html_mod.escape(titles[sid]))
            for sid in links
        )
        nav_html.append('<div class="sgroup"><h5>%s</h5>%s</div>' % (html_mod.escape(group), rows))

    count = len(flat)
    idx_json = json.dumps(index, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    page = TEMPLATE.replace("__COUNT__", str(count))
    page = page.replace("__SIDEBAR__", "\n".join(nav_html))
    page = page.replace("__CONTENT__", "\n".join(sections))
    page = page.replace("__INDEX__", idx_json)

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(page)

    print("wrote %s" % OUT)
    print("groups: %d, sections: %d, index entries: %d" % (len(GROUPS), count, len(index)))
    print("size: %.1f KB" % (len(page.encode("utf-8")) / 1024.0))

    # duplicate id check
    ids = re.findall(r'\bid="([^"]+)"', page)
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        print("DUPLICATE IDS: %s" % sorted(dupes))
        sys.exit(1)


TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="icon" type="image/png" href="../assets/logo.png">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation | KodaHosting</title>
    <link rel="canonical" href="https://host.kodanetwork.eu/docs">
    <meta name="description" content="The complete KodaHosting documentation: hosting, the server manager, KodaDash, the account, extensions, themes, translations, your own instance and development.">
    <link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
        html.js .rev { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
        html.js .rev.in { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) { html.js .rev { opacity: 1; transform: none; transition: none; } }
        body {
            font-family: 'Golos Text', system-ui, sans-serif;
            background: #0B0B0D;
            color: #F5F5F7;
            line-height: 1.7;
            -webkit-font-smoothing: antialiased;
            min-height: 100vh;
        }
        a { color: #FFA45C; text-decoration: none; }
        a:hover { text-decoration: underline; text-underline-offset: 2px; }

        .header {
            border-bottom: 1px solid #3C3C47;
            padding: 20px 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            background: rgba(11, 11, 13, 0.92);
            backdrop-filter: blur(8px);
            z-index: 20;
        }
        .logo { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 0.95rem; color: #F5F5F7; }
        .logo img { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; }
        .logo span { color: #FFA45C; }
        .header .links a { color: #9696A2; font-size: 0.85rem; font-weight: 500; margin-left: 18px; }
        .header .links a:hover { color: #F5F5F7; text-decoration: none; }
        .header .links { display: flex; align-items: center; }
        .header .links a.btn { margin-left: 18px; padding: 10px 18px; min-height: 40px; display: inline-flex; align-items: center;
            background: #FF6B00; color: #1A0F00; border-radius: 8px; font-weight: 600; }
        .header .links a.btn:hover { background: #FF8524; color: #1A0F00; }

        .layout {
            max-width: 1180px;
            margin: 0 auto;
            padding: 34px 32px 96px;
            display: grid;
            grid-template-columns: 270px minmax(0, 1fr);
            gap: 48px;
            align-items: start;
        }

        .sidebar { position: sticky; top: 92px; max-height: calc(100vh - 120px); overflow: auto; padding-right: 6px; }
        .search input {
            width: 100%;
            background: #141419;
            border: 1px solid #3C3C47;
            border-radius: 10px;
            color: #F5F5F7;
            font-family: inherit;
            font-size: 0.86rem;
            padding: 9px 12px;
            outline: none;
        }
        .search input::placeholder { color: #8A8A96; }
        .search input:focus { border-color: #FF6B00; }
        .results { margin-top: 8px; }
        .results:empty { display: none; }
        .res {
            padding: 8px 10px;
            border-radius: 8px;
            cursor: pointer;
            border: 1px solid transparent;
        }
        .res:hover { background: #141419; border-color: #3C3C47; }
        .res .rg { color: #8A8A96; font-size: 0.8125rem; font-weight: 600; }
        .res .rt { display: block; color: #F5F5F7; font-size: 0.9rem; font-weight: 600; line-height: 1.35; }
        .res .rx { color: #9C9CA8; font-size: 0.85rem; line-height: 1.45; margin-top: 2px; }
        .res mark { background: none; color: #FFA45C; font-weight: 600; }
        .res .sub { color: #9696A2; font-weight: 500; }
        .nores { color: #8A8A96; font-size: 0.8125rem; padding: 8px 10px; }
        .search .hintkey { color: #8A8A96; font-size: 0.8125rem; margin-top: 6px; }
        .search .hintkey kbd {
            font-family: inherit; background: #141419; border: 1px solid #2B2B34;
            border-radius: 4px; padding: 0 4px; font-size: 0.8125rem; color: #9C9CA8;
        }

        .sgroup { margin-bottom: 16px; }
        .navwrap > summary { display: none; }
        .sgroup h5 {
            font-size: 0.8125rem;
            color: #9696A2; margin-bottom: 6px; font-weight: 600;
        }
        .sidebar a {
            display: block; padding: 5px 10px; border-left: 2px solid #3C3C47;
            color: #C8C8D2; font-size: 0.9rem; line-height: 1.4;
        }
        .sidebar a:hover { color: #F5F5F7; text-decoration: none; border-left-color: #35353F; }
        .sidebar a.active { color: #FFA45C; border-left-color: #FF6B00; }
        .sidebar .dl {
            margin-top: 26px;
            font-size: 0.8125rem;
        }

        .doc { min-width: 0; }
        .doc .hint { color: #A8A8B4; font-size: 0.9rem; margin-bottom: 10px; max-width: 74ch; }
        .doc h1 { font-size: clamp(2.25rem, 1.2rem + 4.6vw, 4.25rem); font-weight: 700; letter-spacing: -0.02em; color: #fff; margin-bottom: 8px; }
        .doc section { scroll-margin-top: 100px; padding-bottom: 8px; margin-bottom: 40px; }
        .doc section:last-of-type { border-bottom: none; }
        .doc .eyebrow {
            font-size: 0.8125rem;
            color: #FFA45C; font-weight: 600; margin-bottom: 6px;
        }
        .doc h2 { font-size: 1.3rem; font-weight: 700; color: #fff; margin-bottom: 14px; scroll-margin-top: 100px; }
        .doc h3 { font-size: 1rem; font-weight: 600; color: #FFA45C; margin: 26px 0 8px; scroll-margin-top: 100px; }
        .doc h4 { font-size: 1rem; font-weight: 600; color: #F5F5F7; margin: 22px 0 6px; scroll-margin-top: 100px; }
        .doc p { color: #C8C8D2; font-size: 1rem; margin-bottom: 14px; max-width: 74ch; }
        .doc p.lead { color: #F5F5F7; }
        .doc ul, .doc ol { margin: 0 0 16px; padding-left: 22px; }
        .doc li { color: #C8C8D2; font-size: 1rem; margin-bottom: 8px; max-width: 72ch; }
        .doc b { color: #F5F5F7; font-weight: 600; }
        code {
            font-family: ui-monospace, "JetBrains Mono", monospace;
            font-size: 0.85rem; background: #2B2B34; border: 0;
            border-radius: 6px; padding: 1px 6px; color: #F5F5F7;
        }
        pre {
            background: #17171C; border: 0; border-radius: 12px;
            padding: 16px 18px; overflow: auto; margin: 0 0 18px;
        }
        pre code { background: none; border: none; padding: 0; font-size: 0.85rem; line-height: 1.6; color: #F5F5F7; }
        .tw { overflow-x: auto; margin: 0 0 18px; }
        .tw table { margin: 0; }
        table { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 0.9rem; }
        th {
            text-align: left; color: #fff; background: #3C3C47; font-weight: 600;
            padding: 10px 14px; border: 1px solid #3C3C47;
        }
        td { color: #C8C8D2; padding: 10px 14px; border: 1px solid #3C3C47; background: #141419; vertical-align: top; max-width: 74ch; }
        td code, th code { font-size: 0.8125rem; }
        .callout {
            border-left: 3px solid #FFA45C; background: #141419; border-radius: 0 10px 10px 0;
            padding: 12px 16px; color: #C8C8D2; font-size: 1rem; margin: 0 0 18px;
        }
        ol.steps { padding-left: 22px; }
        ol.steps li { margin-bottom: 10px; }
        .nextprev {
            display: flex; justify-content: space-between; align-items: center; gap: 12px;
            padding-top: 16px; font-size: 0.9rem; color: #9696A2; flex-wrap: wrap;
        }
        .nextprev a { color: #9696A2; }
        .nextprev a:hover { color: #FFA45C; text-decoration: none; }
        .ainotice {
            display: flex; gap: 14px; align-items: flex-start;
            border: 0; border-left: 3px solid #FFA45C;
            background: #1D1D24; border-radius: 0 12px 12px 0;
            padding: 16px 18px; margin-top: 10px; scroll-margin-top: 100px;
        }
        .ainotice .badge {
            font-size: 0.8125rem; font-weight: 700;
            color: #1A0F00; background: #FF6B00; border-radius: 6px;
            padding: 2px 7px; flex-shrink: 0; margin-top: 2px;
        }
        .ainotice p { margin: 0; font-size: 0.8125rem; line-height: 1.65; color: #C8C8D2; max-width: 74ch; }
        .ainotice strong { color: #F5F5F7; font-weight: 600; }
        @media (max-width: 900px) {
            .layout { grid-template-columns: 1fr; gap: 24px; padding: 24px 20px 80px; }
            .layout > .doc { order: 1; }
            .layout > .sidebar { order: 2; }
            .header .links a:not(.btn) { display: none; }
            .sidebar { position: static; max-height: none; background: #17171C; border: 0; border-radius: 12px; padding: 14px 10px; }
            .navwrap > summary {
                display: block; cursor: pointer; color: #F5F5F7; font-weight: 600; font-size: 0.86rem;
                padding: 6px 10px; list-style: none;
            }
            .navwrap > summary::-webkit-details-marker { display: none; }
            .navwrap > summary::before { content: "\25B8  "; color: #FFA45C; }
            .navwrap[open] > summary::before { content: "\25BE  "; }
            .navwrap[open] > summary { margin-bottom: 8px; }
            .sgroup { margin-bottom: 12px; }
        }
        @media (max-width: 560px) {
            .header { padding: 16px 18px; }
            .header .logo { font-size: 0.88rem; }
            .header .links a { margin-left: 12px; font-size: 0.85rem; }
        }
    </style>
</head>
<body>

    <header class="header">
        <a href="../index.html" class="logo">
            <img src="../assets/logo.png" alt="KodaHosting">
            Koda<span>Hosting</span>
        </a>
        <div class="links">
            <a href="../index.html">Home</a>
            <a href="../dashboard.html">Dashboard</a>
            <a href="https://github.com/libredroid-project/KodaNetwork" target="_blank" rel="noopener">GitHub</a>
            <a class="btn" href="../index.html">Get the app</a>
        </div>
    </header>

    <div class="layout">
        <aside class="sidebar" role="navigation" aria-label="Documentation contents">
            <div class="search">
                <input id="q" type="text" placeholder="Search the documentation" autocomplete="off" spellcheck="false">
                <div id="results" class="results"></div>
                <div class="hintkey">Press <kbd>Enter</kbd> to jump, <kbd>Esc</kbd> to clear.</div>
            </div>
            <div style="height:16px"></div>
            <details class="navwrap" open>
            <summary>Contents</summary>
__SIDEBAR__
            </details>
            <div class="dl">
                <a href="#ai-notice">About these docs (AI)</a>
            </div>
        </aside>

        <main class="doc">
            <h1>Documentation</h1>
            <p class="hint">Everything about running KodaHosting, extending it and making it your own. __COUNT__ categories. Parts of it were written with AI assistance, see <a href="#ai-notice">the notice at the end</a>. Last updated October 2026.</p>

__CONTENT__

            <div class="ainotice" id="ai-notice">
                <span class="badge">AI</span>
                <p>
                    <strong>About these docs.</strong> Large parts of this documentation were drafted with the
                    assistance of an AI language model (deepseek-flash-v4.1) and reviewed by the developer. The AI
                    was used for the wording, the structure and the examples only. The KodaHosting Android
                    application itself, its server hosting logic, the networking infrastructure and all executable
                    code are written entirely by the developer and are not AI-generated; where this documentation
                    describes code, the code is the source of truth. Legal responsibility for all content,
                    including the AI-assisted sections, rests with the developer and their legal guardians, as set
                    out in the Impressum.
                </p>
            </div>

        </main>
    </div>

<script>
(function () {
    // entrance for the hero and every section part (JS-gated: without JS the text stays visible)
    document.documentElement.classList.add('js');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function kodaReveal() {
        var nodes = document.querySelectorAll('.doc > h1, .doc > .hint, .doc section > *, .ainotice');
        if (reduceMotion || !('IntersectionObserver' in window)) {
            Array.prototype.forEach.call(nodes, function (n) { n.classList.add('rev', 'in'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
        }, { rootMargin: '0px 0px -6% 0px' });
        Array.prototype.forEach.call(nodes, function (n, i) {
            if (n.classList.contains('in')) return;
            n.classList.add('rev');
            if (!n.style.transitionDelay) n.style.transitionDelay = Math.min((i % 8) * 40, 280) + 'ms';
            io.observe(n);
        });
    }
    kodaReveal();
    var IDX = __INDEX__;
    var q = document.getElementById('q');
    var box = document.getElementById('results');
    var links = Array.prototype.slice.call(document.querySelectorAll('.sidebar a[data-s]'));

    var navWrap = document.querySelector('details.navwrap');
    function syncNav() {
        if (!navWrap) return;
        if (window.innerWidth <= 900) navWrap.removeAttribute('open');
        else navWrap.setAttribute('open', '');
    }
    syncNav();

    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function hl(s, v) {
        var i = s.toLowerCase().indexOf(v);
        if (i < 0) return esc(s);
        return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + v.length)) + '</mark>' + esc(s.slice(i + v.length));
    }
    function excerpt(x, v) {
        var i = x.toLowerCase().indexOf(v);
        if (i < 0) return '';
        var a = Math.max(0, i - 55);
        var b = Math.min(x.length, i + v.length + 85);
        return (a > 0 ? '&hellip; ' : '') + hl(x.slice(a, b), v) + (b < x.length ? ' &hellip;' : '');
    }

    function search(v) {
        v = v.trim().toLowerCase();
        box.innerHTML = '';
        if (v.length < 2) return;
        var hits = [];
        for (var i = 0; i < IDX.length; i++) {
            var e = IDX[i];
            var h = e.h.toLowerCase(), t = e.t.toLowerCase(), x = e.x.toLowerCase();
            var score = 0;
            if (h.indexOf(v) === 0) score += 7;
            else if (h.indexOf(v) > 0) score += 4;
            if (t.indexOf(v) === 0) score += 6;
            else if (t.indexOf(v) > 0) score += 3;
            if (score === 0 && x.indexOf(v) >= 0) score += 1;
            if (score === 0) continue;
            hits.push({ e: e, score: score, r: excerpt(e.x, v) });
        }
        hits.sort(function (a, b) { return b.score - a.score; });
        hits = hits.slice(0, 20);
        if (!hits.length) {
            box.innerHTML = '<div class="nores">Nothing found. Try a shorter word.</div>';
            return;
        }
        hits.forEach(function (hit) {
            var e = hit.e;
            var d = document.createElement('div');
            d.className = 'res';
            d.setAttribute('data-a', e.a);
            var head = '<span class="rt">' + hl(e.t, v);
            if (e.h !== e.t) head += ' <span class="sub">&rsaquo; ' + hl(e.h, v) + '</span>';
            head += '</span>';
            d.innerHTML = '<span class="rg">' + esc(e.g) + '</span>' + head +
                          (hit.r ? '<div class="rx">' + hit.r + '</div>' : '');
            d.addEventListener('click', function () {
                location.hash = '#' + e.a;
                q.value = '';
                box.innerHTML = '';
            });
            box.appendChild(d);
        });
    }

    q.addEventListener('input', function () { search(q.value); });
    q.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { q.value = ''; box.innerHTML = ''; q.blur(); }
        if (ev.key === 'Enter') {
            var first = box.querySelector('.res');
            if (first) {
                location.hash = '#' + first.getAttribute('data-a');
                q.value = '';
                box.innerHTML = '';
            }
        }
    });

    function setActive(id) {
        var nav = document.querySelector('.sidebar');
        var navRect = nav.getBoundingClientRect();
        for (var i = 0; i < links.length; i++) {
            var on = links[i].getAttribute('data-s') === id;
            if (!on) { links[i].classList.remove('active'); continue; }
            var wasOn = links[i].classList.contains('active');
            links[i].classList.add('active');
            if (!wasOn) {
                var r = links[i].getBoundingClientRect();
                if (r.top < navRect.top + 60 || r.bottom > navRect.bottom - 24) {
                    nav.scrollTop += r.top - (navRect.top + navRect.height / 3);
                }
            }
        }
    }
    var secs = Array.prototype.slice.call(document.querySelectorAll('.doc section'));
    var ticking = false;
    function spy() {
        ticking = false;
        var y = window.scrollY + 130;
        var cur = secs.length ? secs[0].id : null;
        for (var i = 0; i < secs.length; i++) {
            if (secs[i].offsetTop <= y) cur = secs[i].id;
        }
        if (cur) setActive(cur);
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(spy); }
    }, { passive: true });
    spy();
})();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
