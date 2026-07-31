# Data graphic

When a fact is quantitative or time-based — climate across the year, a bloom or foliage window, when a
pass or road is open, how long a festival runs, the daylight you'll get — a small chart lets a reader
take it in at a glance where prose gets skimmed.

Build these in **CSS**, not SVG: real DOM text stays legible and reflows at any width, where an SVG
chart shrinks its labels to mush on a phone. Restyle everything to the guide's palette (`var(--accent)`,
tints via `color-mix()` or opacity). Every bar encodes a real measured value from the destination's
norms — °C, mm, time, crowd level — never a subjective score (e.g. suitability or best month). Cite in the
credits when precision matters.

Two shapes cover almost everything.

## Bars (comparison)

For comparing one metric across a set — monthly temperature, rainfall, or crowds (one metric at
a time). A flex row of columns; each bar's height is its value as a %, with the category
label beneath (the month, the day, the stop). Optionally use an accent to emphasize important
values (e.g. recommended month).

**The track measures the bars, nothing else.** It takes the column's leftover height (`flex:1`), and
anything else in flow inside it makes the tallest columns overflow — flex-shrink then quietly
equalizes them.

```html
<div class="bars">
  <div class="col">
    <div class="track"><div class="bar" style="height:calc(100% * {value}/{max})"><b>{value}</b></div></div>
    <span class="lbl">Label</span>
  </div>
  <!-- one .col per category -->
</div>
```

```css
.bars{display:flex;align-items:flex-end;gap:.5rem;height:130px} /* fixed height: % bar heights resolve against it */
.bars .col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%}
.bars .track{flex:1;width:80%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.bars .bar{width:100%;background:var(--line)}
```

Position the value label off the track's height with the bar `position:relative`:
`bottom:calc(100% + .3rem)` floats it above the bar's top, `top:.3rem` in a contrasting colour
sets it inside the bar.

## Ranges (spans on a shared scale)

One primitive covers bloom calendars, foliage turn, route access, or a single day's daylight window:
**labeled rows sharing one axis**, each bar spanning start→end positioned by `left`/`width`  as a %
of the range (a Gantt chart, when that range is time).

**One coordinate system, or the chart lies.** The tracks and the axis must be the same width — so
bars, overlays, and ticks are all percentages of the SAME width. Two layouts do that: each row's
label above its track with the axis below them, or a label gutter
(`grid-template-columns:110px 1fr`) with the axis in the same grid column as the tracks. Labels
above also get the full width on a phone, no media query needed.

```css
.ranges .rl{font-size:.8rem;margin-bottom:4px} /* row label */
.ranges .track{position:relative;height:10px;border-radius:5px;background:var(--line)}
.ranges .bar{position:absolute;top:0;bottom:0;border-radius:5px;background:var(--accent)}
.ranges .axis{position:relative;height:1.2rem;margin-top:2rem} /* margin-top is the gap below the rows */
.ranges .axis span{position:absolute;transform:translateX(-50%)}
```

**Position by arithmetic, never by eye.** Fix the range first (say Oct 2 → Dec 21 = 80 days), then write
every position — bars, ticks, overlays — as the same expression: `left:calc(100% * 12/80)` 
for a date 12 days in, `width:calc(100% * 10/80)` for a 10-day window. The day counts stay
readable in the markup and CSS does the division. Never lay the axis out with flex
`space-between`: it spaces the labels evenly whatever the real intervals are, and pins the edge
labels to the container edges instead of their tick positions.

- **Two things in one row** (e.g. maples vs ginkgo): give the track two bars in different
  accent tints.
- **A transition rather than a hard span** (foliage turning, building to peak): fill the bar with a
  `linear-gradient` between the two states; use a muted hatch (`repeating-linear-gradient`) for a
  "past peak / not applicable" stretch.
- Center any bar label or tick with `transform:translateX(-50%)`.
- **Daylight** — a band on a midnight-to-midnight track, placed at the real sunrise/sunset (not a fill from the left), so the lit hours sit where they actually fall.

### Overlays (timeline)

To mark a moment against every row — a recommended window, a festival day, an opening date — wrap
the rows in a `.plot` and put an overlay element inside it, spanning the rows with `top:0;bottom:0` and
positioned by the same calc % as the bars. The `.plot` wraps ALL the rows and nothing else: the axis
stays outside it, so an overlay covers the rows and stops short of the ticks. Overlays are percentages
of `.plot`, so the tracks must span its FULL width — the row label goes above its track, never in a gutter.

```html
<div class="ranges">
  <div class="plot">
    <div class="band" style="left:calc(100% * 25/52);width:calc(100% * 8/52)"><b>Label</b></div>
    <div class="mark" style="left:calc(100% * 40/52)"><b>Label</b></div>
    <!-- the rows -->
  </div>
  <div class="axis"><!-- ticks --></div>
</div>
```

```css
.ranges .plot{position:relative}
.ranges .band,.ranges .mark{position:absolute;top:0;bottom:0;z-index:3;pointer-events:none}
.ranges .band{background:color-mix(in srgb,var(--accent) 14%,transparent)}
.ranges .mark{width:2px;background:var(--accent)}
.ranges .band b,.ranges .mark b{position:absolute;top:-1.3rem}
```

- **Labels** go inside the overlay — one coordinate, so a label can't drift from the line it
  names. Sit it above the line's top end (give `.plot` a `margin-top` to open the space) or
  offset it to one side — never centred on the line, where the rule cuts through the text.

## Accessibility

A CSS chart is a picture built from divs, so give it the same treatment as an image and make sure
its data survives without the visuals:

- Put `role="img"` on the chart with an `aria-label` that states the data, not the picture:
  
  ```html
  <figure>
    <div class="ranges" role="img" aria-label="Bloom calendar: crocus, 18 Mar – 7 Apr; hyacinths, 23 Mar – 12 Apr; …">
      …
    </div>
  </figure>
  ```
- No value should live only in CSS. A `calc()` is the encoding, not the datum — the
  number itself must be text somewhere: a value label on the bar, the row label's date range,
  or the `aria-label` series.
- Check contrast where text sits over a fill (a value label inside its bar, a caption over a band).

## Gotchas

* CSS can't draw a smooth diagonal — a temperature *line* or a hiking *elevation profile*. These are
  rare; prefer bars. If you genuinely need one, that single case is where an inline SVG `polyline` earns
  its place.
