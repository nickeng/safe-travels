# Background patterns (tiled motifs)

Follow these guidelines when you build a tiled background motif.

## Complexity

Build the tile from the motif's real geometry — curves, steps, nesting, overlapping or interlocking
forms — with correct proportions and enough vertices to stay recognizable. Without that detail it
collapses into graph paper — vertical and horizontal lines, circles on a grid, or basic diamonds —
which reads as a generic texture, not the motif.

## Contrast

Keep the motif and ground tones close so the texture never competes with the text. For thin-line
motifs (lattices, screens, hairline strokes), aim for ~**1.2–1.3:1**; for filled/solid motifs (tiles
covering much of the surface), aim for ~**1.05–1.1:1** — the large painted area carries far more visual
weight. Either way, body text must still clear **WCAG AAA (≥7:1)** over the strongest part of the
pattern. Control the level with the two tone colors, applied uniformly: never mix per-element
opacities (a group `fill-opacity` plus a child element's own `stroke-opacity` makes that one line jump
out). If a thin-line motif is too faint, thicken the stroke rather than darkening the color.

## Placement

Page-wide texture goes on `#content`, not `body::before` — `#content` has its own
`position:relative` + `background:var(--bg)`  (required for the map split) and covers the body pseudo-element.
Use `background: var(--bg) url("…") repeat;`

## Examples

Match this level of detail in your own tiles. Copy these patterns when appropriate but prefer creating your own.

### Seigaiha

Seigaiha is very difficult to execute correctly, so prefer a **separator strip** instead of a full-page background.
Use a single row of 2-3 layered `radial-gradient`s repeated on the x-axis (one row of rings rather than
overlapping scales).

For a full background or accent panel, copy the tile below — NEVER write your own seigaiha background.
In this pattern the circles overlap to form the scales, so each MUST be **fully opaque**: a transparent
circle lets the one beneath show through and breaks the scale pattern. Keep `background-size` in the tile's 5:3 ratio.

```css
.bg-seigaiha-dark{
  background-color:#1c2a4d;color:#eef3fb;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Cdefs%3E%3CradialGradient id='g' cx='.5' cy='.5' r='.5'%3E%3Cstop offset='0' stop-color='%231c2a4d'/%3E%3Cstop offset='.244' stop-color='%231c2a4d'/%3E%3Cstop offset='.244' stop-color='%23293961'/%3E%3Cstop offset='.256' stop-color='%23293961'/%3E%3Cstop offset='.256' stop-color='%231c2a4d'/%3E%3Cstop offset='.494' stop-color='%231c2a4d'/%3E%3Cstop offset='.494' stop-color='%23293961'/%3E%3Cstop offset='.506' stop-color='%23293961'/%3E%3Cstop offset='.506' stop-color='%231c2a4d'/%3E%3Cstop offset='.7440000000000001' stop-color='%231c2a4d'/%3E%3Cstop offset='.7440000000000001' stop-color='%23293961'/%3E%3Cstop offset='.7559999999999999' stop-color='%23293961'/%3E%3Cstop offset='.7559999999999999' stop-color='%231c2a4d'/%3E%3Cstop offset='.985' stop-color='%231c2a4d'/%3E%3Cstop offset='.985' stop-color='%23293961'/%3E%3Cstop offset='1' stop-color='%23293961'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cg fill='url(%23g)'%3E%3Ccircle cy='27' r='57'/%3E%3Ccircle cx='100' cy='27' r='57'/%3E%3Ccircle cx='50' cy='57' r='57'/%3E%3Ccircle cy='87' r='57'/%3E%3Ccircle cx='100' cy='87' r='57'/%3E%3C/g%3E%3C/svg%3E");
  background-size:100px 60px;background-repeat:repeat;
}
```

### Jali

The internal detail is what makes each read as a screen: the arch's three crossing
arcs or the ogee's two interlocking ovals.

```css
/* pointed arch lattice */
.bg-jali-arch{
  background-color:#faf6ef;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='60'%3E%3Cpath d='M0 60 C0 30 20 0 20 0 C20 0 40 30 40 60' fill='none' stroke='%23ebddbc' stroke-width='.6'/%3E%3Cpath d='M20 60 C20 30 40 0 40 0' fill='none' stroke='%23ebddbc' stroke-width='.6'/%3E%3Cpath d='M20 60 C20 30 0 0 0 0' fill='none' stroke='%23ebddbc' stroke-width='.6'/%3E%3C/svg%3E");
  background-size:40px 60px;background-repeat:repeat;
}
/* overlapping ogee */
.bg-jali-ogee{
  background-color:#faf6ef;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M24 0 C12 12 12 36 24 48 C36 36 36 12 24 0z' fill='none' stroke='%23ebddbc' stroke-width='.6'/%3E%3Cpath d='M0 24 C12 12 36 12 48 24 C36 36 12 36 0 24z' fill='none' stroke='%23ebddbc' stroke-width='.6'/%3E%3C/svg%3E");
  background-size:48px 48px;background-repeat:repeat;
}
```

### Tartan

A tartan sett is layered `repeating-linear-gradient`s: a vertical and a matching horizontal
band sequence (the sett) plus a faint 45° twill. The trick is keeping the bright overcheck lines **on
top at high alpha** so they stay crisp — muddy, evenly-faded stripes are the usual failure. It's a
**bold accent, not a behind-text texture**: use it for a hero or a sash/separator and keep
reading on a card on top.

```css
.tartan{
  background-color:#1c3a29;
  background-image:
    repeating-linear-gradient(45deg, rgba(255,255,255,.045) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg,
      rgba(16,30,66,.72) 0 28px, transparent 28px 36px,
      rgba(0,0,0,.5) 36px 42px, transparent 42px 62px,
      rgba(184,138,44,.92) 62px 64px, transparent 64px 68px,
      rgba(236,229,208,.95) 68px 70px, transparent 70px 96px),
    repeating-linear-gradient(0deg,
      rgba(16,30,66,.72) 0 28px, transparent 28px 36px,
      rgba(0,0,0,.5) 36px 42px, transparent 42px 62px,
      rgba(184,138,44,.92) 62px 64px, transparent 64px 68px,
      rgba(236,229,208,.95) 68px 70px, transparent 70px 96px);
}
```
