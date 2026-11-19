---
name: Ality Intelligence
description: Confidential supply chain planning, set on moving abstract seabed contours.
colors:
  paper: "#f8f8f5"
  ink: "#15191c"
  ink-2: "#474d53"
  ink-3: "#6a7178"
  rule: "rgba(21, 25, 28, 0.16)"
  slate: "#23404e"
  blue: "#406bb5"
  blue-deep: "#3a588d"
  night: "#121a1f"
  night-ink: "#eef1f0"
  night-ink-2: "#aab5b8"
  night-line: "#9db3bd"
  night-node: "#c9d5da"
  blue-night: "#9cb0d3"
typography:
  display:
    fontFamily: "Archivo, Archivo Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.6rem, 1.3rem + 4.4vw, 5.25rem)"
    fontWeight: 640
    lineHeight: 0.98
    letterSpacing: "-0.032em"
    fontVariation: "\"wdth\" 112"
  headline:
    fontFamily: "Archivo, Archivo Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.9rem, 1.25rem + 2vw, 3rem)"
    fontWeight: 640
    lineHeight: 1.08
    letterSpacing: "-0.02em"
    fontVariation: "\"wdth\" 112"
  title:
    fontFamily: "Archivo, Archivo Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 640
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontVariation: "\"wdth\" 112"
  lede:
    fontFamily: "Archivo, Archivo Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Archivo, Archivo Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, Archivo Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    fontVariation: "\"wdth\" 108"
rounded:
  corner: "2px"
spacing:
  s4: "40px"
  s5: "64px"
  s6: "104px"
  s7: "136px"
  gutter: "max(20px, 4.5vw)"
  max: "1240px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.corner}"
    padding: "16px 22px 16px 24px"
  button-primary-hover:
    backgroundColor: "{colors.blue-deep}"
    textColor: "#ffffff"
  nav-cta:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.corner}"
    padding: "10px 16px"
  nav-cta-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
---

# Design System: Ality Intelligence

## Overview

**Creative North Star: "The Moving Seabed"**

A pale paper ground carries an animated seabed: slate depth contours that drift like a tide, every fifth line heavier, the shallows tinted a little bluer in two steps, with small nodes riding the lines and joining in blue when they come close. Seabed and network are the two themes; the linking is the product made visible: two sides finding each other. The field is abstract, not a chart. Everything else on the page is quiet and editorial so the field and one blue can carry the meaning.

Type is a single family, Archivo, used wide for headings and at normal width for reading. Structure comes from hairline rules and generous section spacing rather than boxes: lists are ruled, nothing sits in a card. Corners are nearly square (2px). The close ("Let's map your network.") sits on a dark night field (pale lines on #121a1f) that the pointer can raise, so every page ends on the seabed.

The user's binding steer: the field is an abstract contour field, not a literal map. No neat line or border around the field, no graticule, no soundings or depth figures, no land fills, no map symbols (turbines, harbours, compass roses). Soundings and contour depth labels were tried again on 2026-11-18 and taken out for this reason.

**Key Characteristics:**
- Full-bleed contour field as the hero ground, fading out at its foot; never framed.
- One accent, blue, reserved for links between things, the main action and anything that joins two sides.
- Archivo in two widths: wide (wdth 112 to 120) for headings and the wordmark, normal for text.
- Ruled lists and hairline dividers instead of cards.
- 2px corners everywhere a corner exists.

## Colors

A near-neutral paper and ink palette with a deep slate for the field and a single blue that means "connection".

### Primary
- **Link Blue** (blue): the primary button, the links that form between field nodes, the "Only the result crosses" rule and its words, step numerals, focus outlines, text selection, active nav underline and the hover rule under list rows.
- **Deep Blue** (blue-deep): hover state of the primary button only.
- **Night Blue** (blue-night): the blue re-tuned for the night field: node links and the button focus ring.

### Secondary
- **Contour Slate** (slate): the contour lines and nodes of the paper-ground field. It is the field's colour, not a text or UI colour.
- **Shoal tints** (field-shoal #eef2f6, field-shoal-2 #e3eaf2; on night #16222a and #1b2a34): the shallows inside the field only, never a UI ground.

### Neutral
- **Pale Paper** (paper): page ground and field ground. Near-neutral with the faintest warm cast.
- **Ink** (ink): headings, body on the hero, strong rules (top of ruled lists, footer top), outlined buttons, the wordmark.
- **Ink 2** (ink-2): secondary text, ledes outside the hero, descriptions in lists.
- **Ink 3** (ink-3): scrollbar thumb; least emphasis.
- **Hairline** (rule): dividers between list rows and between principles.
- **Night** (night): the night band and placeholder portraits.
- **Night Ink / Night Ink 2** (night-ink, night-ink-2): primary and secondary text on night.
- **Night Line / Night Node** (night-line, night-node): field lines and nodes on night.

### Named Rules
**The One Meaning Rule.** Blue means a connection or the action that starts one. It is never used as decoration, a section tint or a heading colour.

**The Field Reads From The Host Rule.** The field takes its colours from `--field-bg`, `--field-line`, `--field-node`, `--field-link`, `--field-shoal` and `--field-shoal-2` on its host element. A new field context (like night) is made by resetting those six, never by editing the script.

## Typography

**Display Font:** Archivo (variable, wdth 100 to 125, wght 400 to 700), with a metric-adjusted Arial fallback
**Body Font:** Archivo at normal width

**Character:** One grotesque in two postures: stretched wide and slightly heavy for statements, plain and open for reading. The width axis does the work a second family would.

### Hierarchy
- **Display** (640, wdth 112, clamp 2.6rem to 5.25rem, line-height 0.98, -0.032em): the hero headline only, lower left over the field.
- **Headline** (640, wdth 112, clamp 1.9rem to 3rem, 1.08): section headings. The closing heading steps up to clamp 2.2rem to 3.8rem.
- **Title** (640, wdth 112, 1.25rem, 1.2): list items, steps, principles, names. Side headings use 1.5rem.
- **Lede** (400, 1.1875rem, 1.55, max 34em): one sentence or short paragraph beside or under a headline, ink-2 (ink on the hero).
- **Body** (400, 1.0625rem, 1.6; 1rem under 560px): running text, max about 30 to 36em.
- **Label** (600, wdth 108, 1rem, line-height 1): buttons; nav links use 520 at 0.9688rem, wdth 106.

### Named Rules
**The Width Axis Rule.** Hierarchy is carried by width and weight within Archivo (headings wdth 112, wordmark 115 to 120, labels 106 to 110), not by a second typeface.

**The Lockup Only Rule.** Uppercase tracked text appears in two places only: the wordmark's "Intelligence" line (0.32em) and the confidential boundary label (0.18em). Never as a label above a heading.

## Layout

Content sits in a centred column of max 1240px plus a fluid gutter of max(20px, 4.5vw), respecting safe-area insets. Sections breathe on a short spacing scale: 40, 64, 104, 136px (s4 to s7), with s6 and s7 shrinking to 80 and 100px under 860px.

Section heads are a 7:5 grid (headline left, lede right, aligned to the bottom). The problem is two equal columns (suppliers, project teams) under ink rules. The confidentiality block is three columns (1 : 112px : 1): what each side keeps, with a dashed limit line between, closed by a blue rule; the three steps follow in three columns. The assessment list is 5:7 with a sticky intro. Under 860px the problem and steps stack and the limit column narrows; under 560px the two sides stack and the limit line runs across between them. The nav collapses to a Menu button and dropdown under 1000px.

The hero fills the viewport (100svh, 660 to 1040px; a shorter 78svh variant on inner pages) with copy anchored lower left and the field masked to transparent over its last 180px so it dissolves into the page.

## Elevation & Depth

Flat. Depth comes from the field behind the content and from the light/night inversion, not from shadows. The single shadow in the build is the soft one under the mobile menu dropdown (`0 12px 32px -12px rgba(21, 25, 28, 0.28)`), used because it floats over the moving field.

### Named Rules
**The Field Is The Depth Rule.** Surfaces are flat and borderless. If something must stand off the field (a nav dropdown), give it a solid ground colour and a 1px line before reaching for a shadow.

## Shapes

Square-ish: every corner that exists is 2px (buttons, outlined nav CTA, menu, portraits). Lines are the main shape language: 1px hairlines, 1px ink rules to open and close a list, a dashed limit line (14px dash, 6px gap, short cross tick) for the confidential boundary, and a 2px blue rule for what crosses it. The logo is the same vocabulary: three turbine blades drawn as graph edges ending in node rings around a hub ring, in Mid blue (blue) beside an ink wordmark; the favicon and icons are blue too (pale night blue on a dark browser).

## Components

### Buttons
- **Shape:** near-square corners (2px).
- **Primary:** blue ground, white text, 600 weight at wdth 108, padding 16px 22px 16px 24px, followed by an 18px arrow.
- **Hover / Focus:** ground deepens to blue-deep and the arrow slides 4px right; press nudges down 1px. Focus is a 2px blue outline offset 3px.
- **Text link (secondary action):** ink text with a hairline underline offset 0.32em that darkens to the current colour on hover.
- **Outlined (nav Contact):** 1px ink border, fills ink with paper text on hover.

### Navigation
Sits over the field at the top: logo lockup left, plain links right with a 2px blue underline on hover and current page, then the outlined Contact. The rotor in the logo turns 120 degrees on hover. Under 1000px a "Menu" button opens a paper dropdown with a 1px ink border.

### Ruled list (assessment coverage)
Opens with a 1px ink rule; each row is a two-column term and description separated by hairlines. On hover a blue line draws across the row's bottom edge.

### Numbered steps
Three columns; blue tabular numerals in a 30px column, title and ink-2 text beside. Stacked under 860px.

### Confidential boundary
Two ruled lists of what each side keeps, either side of a dashed chart-style limit line labelled "Confidential boundary" in small tracked capitals beside it; a 2px blue rule closes the block with "Only the result crosses." in blue. No nodes or drawn graph.

### Contour field (signature)
WebGL contour lines from a summed-wave height field: thin lines (0.36px half-width at 55% opacity) with every fifth line heavier (0.62px, full opacity), fading out at the top and bottom of the level range. Nodes ride the lines and link with blue strokes inside about 90px; links ease in and out, and a point is drawn only while it is linked, so lone points fade away rather than blink. On the hero the pointer raises the field locally and the lines fall quiet behind the copy and nav. Shallows (contour 12 and 15 up from the lowest level) are tinted in two steps. Variants: hero (64 nodes, pointer, one shoal bank on the right), the night close (46 nodes, pointer, slower, 78% line alpha, quiet behind the copy) and still portraits (no motion). Reduced motion stops the animation.

### Home journey (signature)
The home page is one seabed behind everything: a fixed full-screen field that the page travels over (the seabed drifts at a third of the scroll speed), with each section a full-screen chapter that steers it:
- **Intro** (once a visit; skipped on any input; never with reduced motion; about 3 s): the mark turns in, alone on paper, in Mid blue. Its hub and three rings are four real points of the network, placed so that, seen from 3.2x close up (2.2x on phones, where the scaled words would otherwise sweep past the screen), they sit exactly on the mark. The mark is centred on its hub, the point it turns about. The drawn mark hands over to them, the contours open outward from it, and the camera pulls back and pans until the mark rests as a small linked cluster in the hero's open water. The nav and the hero copy sit on the same plane and scale down into place with the seabed, fading in only in the last part of the move, once they are near their size. The seabed holds still during the move, then the page carries on.
Below the hero the seabed (contours and network) fades out over the first screen of scrolling, and the three middle chapters become a story (`.story`): the text in the left column on clean paper, and one seabed relief pinned in the right column (`.stage`, `js/stage.js`). The relief is the same contours seen from a low angle in perspective, dissolving into the paper at its rim, with the network's points sitting on it. It is one terrain that changes shape with each chapter, its points flowing between places and the view turning to show each shape best, rather than one drawing replacing another:
- **The problem:** one broad rise with shoulders, the supply chain, carrying a large network (16 points); a small new rise, a supplier, slides in from the edge and grows as the chapter comes up the screen. Each links only among its own points. (Two equal peaks were tried first and looked odd: user, 2026-11-19.)
- **Confidential by design:** the two draw a little apart, the view turns to face the trench, and a pale boundary stands in it with a dashed top edge and a dashed trace along the floor (the page's limit line, in the relief). One heavier blue link arcs over it with a point running along it, marked where it crosses: only the result crosses.
- **What we look at:** the terrain settles into five uneven ridges from a centre, one per item; hovering a row lifts its ridge and lights its links.
Below 961px the relief rides along the foot of the screen (38svh, fading up into the paper; along the top was tried and read badly: user, 2026-11-19) and the chapters are read above it; it changes shape as each chapter passes the upper third, where the text is read; from 961 to 1180px the boundary's two sides stack so the text column stays readable. Without WebGL the story falls back to full-width chapters (`.story.flat`).
- **Contact:** the close is deep water again, with the full seabed and the loose network, as before.
A smaller set of drawn cluster "formations" in reserved spaces was tried and dropped as too slight (user, 2026-11-19).

Text blocks marked `data-calm` (the nav and each block of copy) hold a little clear water around them: a hollow slightly wider than the text, so contours thin out and fall away behind the words without leaving a blank band (a much wider clearing was tried and was too much: user, 2026-11-19). Points keep 14px off the text, and no link crosses it. The clearings follow the text exactly; the seabed itself follows the scroll with a little inertia (and the relief settles just after it), so a jump of the wheel becomes a glide. While the page moves the seabed draws every frame, at rest every other. In the intro the clearings fade in only as the text lands. The cursor is a node: the field swells a little behind it, trailing, and nearby points link to it. A chapter rail on the right (from 1101px) shows the chapters as a small graph; its line fills blue to the current chapter, and a chapter's name shows briefly as it arrives. Section headings arrive word by word, coming into focus. All motion is off with reduced motion; the field then redraws still as the page scrolls.

### Close (night field)
Full-bleed night field, at least 520px tall, with the 7:5 close grid centred in it: a large headline and night-ink-2 text left, the blue button right. The footer follows on paper with no top rule. A sector list was tried here and removed: it claimed more than the company can show (user, 2026-11-19).

## Do's and Don'ts

### Do:
- **Do** let the contour field run full bleed with no frame, fading into the page at its foot.
- **Do** keep blue for connections and the main action, and keep it to one primary button per view.
- **Do** make a new field context by resetting the six `--field-*` properties on the host.
- **Do** structure content with ruled lists and hairlines (1px rule colour; 1px ink to open a list).
- **Do** use Archivo's width axis for hierarchy: headings at wdth 112, text at normal width.
- **Do** keep corners at 2px.

### Don't:
- **Don't** make the field look like a literal map: no neat line or border, no graticule, no soundings or depth figures, no land fills, no map symbols.
- **Don't** put content in cards or tinted boxes.
- **Don't** use blue as decoration, a heading colour or a section background.
- **Don't** add a second typeface or uppercase tracked labels above headings.
- **Don't** add shadows to resting surfaces.
