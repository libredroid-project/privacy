# KodaHosting website

The public site: landing page, extension store, dashboard, documentation, invites, password
reset and the legal pages.

Built with Vite, React 19, TypeScript, Tailwind CSS 4 and [shadcn/ui](https://ui.shadcn.com).
The theme is the shadcn dark preset on a black background (`#050505`, white primary buttons), with the
KodaHosting orange as the only accent. Figtree is the UI font, JetBrains Mono is used for console and code.

## Commands

```bash
npm install
npm run dev        # local dev server, clean URLs work like on Vercel
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm run typecheck  # TypeScript only
npm run docs       # regenerate src/generated/docs.json
npm run legal      # regenerate src/generated/legal.json + public/licenses
```

## Structure

- `index.html`, `store.html`, `dashboard.html`, `docs/index.html`, `invite.html`, `reset.html`,
  `privacy.html`, `tos.html`, `licenses.html`, `impressum.html` are the Vite entries. Each one
  loads a page from `src/entries/`.
- `src/pages/` holds the pages, `src/components/` the shared shell and the shadcn components.
- `src/dashboard/` and `src/store/` hold the app-specific pieces.
- `src/generated/` holds the two committed content artifacts. Vercel does not run Python.
- `public/` holds the assets, the licence texts, the copied legal sources and the files served
  outside the React entries.

## Content pipelines

Documentation lives in `tools/docsgen/content_*.py`. `npm run docs` turns those groups into
`src/generated/docs.json` (prepared HTML with stable anchors, search index, prev/next).

Legal texts live in the app repository and are copied by
`KodaNetwork/tools/sync_website_legal.py`. It writes `src/generated/legal.json`, the plain texts in
`public/legal/` and the licence list in `public/licenses/`. Legal wording is never edited here.

Both artifacts are committed, so a deploy only needs `npm run build`.

## Deployment

Vercel builds with `npm run build` and serves `dist/`. `cleanUrls` keeps `/store`, `/docs` and the
other paths without an extension; `/invite/:token` is rewritten to the invite entry, which reads
the token from the pathname.
