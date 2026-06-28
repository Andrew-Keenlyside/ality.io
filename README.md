# Ality Logistics — Website

Marketing site for **Ality Logistics**: supply-chain intelligence for renewable energy. A single-page app with three views (Home, About, Live graph) and an interactive supply-chain graph.

## Structure

```
.
├── index.html        # markup + page shell (loads everything below)
├── css/
│   ├── tokens.css     # design-system tokens: colours, type, spacing, elevation, fonts
│   ├── site.css       # marketing layout (nav, hero, sections, how-it-works, footer)
│   └── views.css      # single-page view switching + About / Live-graph styles
├── js/
│   ├── particles-hero.js  # hero network-graph background (particles.js config)
│   ├── graph.js           # interactive supply-chain graph logic
│   ├── site.js            # nav-on-scroll, reveal-on-scroll, loading screen
│   └── app.js             # particle init + hash-route view switcher
├── assets/           # logo + node-mark (light & white variants)
└── README.md
```

## Run locally

It's a static site — open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Push these files to the root of a repo named `‹your-username›.github.io` (user site) or any repo (project site).
2. **Settings → Pages →** set the source to your main branch.
3. Visit `https://‹your-username›.github.io`.

The Home / About / Live-graph views are hash routes (`#/`, `#/about`, `#/graph`), so the whole site lives at one URL with no server config.

## Dependencies

Loaded over HTTPS at runtime (no build step):
- Google Fonts — Roboto, Roboto Mono, Material Symbols
- particles.js 2.0.0 (jsDelivr CDN)
