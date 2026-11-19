# Ality Intelligence: website

Live: https://andrew-keenlyside.github.io/ality.io/

Static site: `index.html` (home) and `about.html`. No build step; open either file through any static server.

- `css/site.css`: the whole design system (tokens at the top).
- `js/field.js`: the animated seabed contour field (WebGL lines with tinted shallows, nodes that ride the lines and link when close). Colours come from the `--field-*` custom properties on the host element.
- `js/site.js`: the home page journey (one fixed seabed steered by chapters, the intro, the chapter rail), the About page fields, the menu and reveals.
- `assets/`: logo mark (`ality-mark.svg`), favicons, share image (`share.jpg`), team photos (`team/`).
- `assets/fonts/`: Archivo (variable, latin subset), served from the site itself so no visitor data goes to Google. Licensed under the SIL Open Font License (`OFL.txt`).

Placeholders to fill on `about.html`: James's photo (4:5, in `assets/team/`), a higher-resolution photo of David (the current one is his 200px LinkedIn picture), and a biography for James (marked with a `PLACEHOLDER` comment).
