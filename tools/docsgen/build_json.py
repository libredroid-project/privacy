#!/usr/bin/env python3
"""Emit src/generated/docs.json for the React docs page.

The content modules stay the source of truth. This gives every subheading a stable
id, wraps tables and emits the sidebar groups, the search index and the prev/next
links; the React page renders that data. Run it from the website root (npm run docs).
"""

import html as html_mod
import json
import os
import re
import sys
from pathlib import Path

from content_app import GROUPS as G_APP
from content_net import GROUPS as G_NET
from content_ext import GROUPS as G_EXT
from content_dev import GROUPS as G_DEV

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


def prepare(sid, body):
    """Give every subheading a stable id and return (html, search chunks)."""
    out, chunks = [], []
    idx, pos = 0, 0
    anchor, heading, parts = sid, None, []

    def flush():
        chunks.append((anchor, heading, plain("".join(parts))))

    for match in HEAD_RE.finditer(body):
        parts.append(body[pos:match.start()])
        flush()
        idx += 1
        anchor = "%s-%d" % (sid, idx)
        heading = plain(match.group(2))
        out.append(body[pos:match.start()])
        out.append('<h%s id="%s">%s</h%s>' % (match.group(1), anchor, match.group(2), match.group(1)))
        parts = []
        pos = match.end()

    parts.append(body[pos:])
    flush()
    out.append(body[pos:])
    html = "".join(out).replace("<table>", '<div class="tw"><table>').replace("</table>", "</table></div>")
    return html, chunks


def main():
    if not os.path.isfile("package.json"):
        sys.exit("run this from the website root")

    flat = [(sid, title, body, group) for group, items in GROUPS for sid, title, body in items]
    groups, index, prev_next, all_ids = [], [], {}, []

    for i, (sid, title, body, group) in enumerate(flat):
        html, chunks = prepare(sid, body.strip())
        if not groups or groups[-1]["label"] != group:
            groups.append({"label": group, "sections": []})
        groups[-1]["sections"].append({"id": sid, "title": title, "group": group, "html": html})

        prev_next[sid] = {
            "prev": {"id": flat[i - 1][0], "title": flat[i - 1][1]} if i else None,
            "next": {"id": flat[i + 1][0], "title": flat[i + 1][1]} if i < len(flat) - 1 else None,
        }

        all_ids.extend(re.findall(r'\bid="([^"]+)"', html))
        for anchor, heading, text in chunks:
            if text or heading is not None:
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

    duplicates = sorted({value for value in all_ids if all_ids.count(value) > 1})
    if duplicates:
        sys.exit("duplicate ids: %s" % duplicates)

    data = {
        "updated": "October 2026",
        "sectionCount": len(flat),
        "groups": groups,
        "index": index,
        "prevNext": prev_next,
    }

    Path("src/generated/docs.json").write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print("wrote src/generated/docs.json (%d sections, %d index entries)" % (len(flat), len(index)))


if __name__ == "__main__":
    main()
