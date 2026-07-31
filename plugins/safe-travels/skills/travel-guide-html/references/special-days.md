# Special Days & Holidays

A special day — a public holiday, a community celebration, a seasonal happening — is often the single
best reason to time a trip, so give it the weight that reason deserves. Convey the *lived experience*,
not just the facts: it's not "a parade on May 17," it's the whole city in bunads, children clutching
flags and ice cream, families sharing mole. That human detail is what makes a reader want to be there.
Lead with that feeling even when the day is mainly something to plan *around* — a crowd/closure period
like Golden Week opens on the experience (the whole country on the move, every famous site thronged)
before the practical warning. Alongside the feeling, always give what a traveler needs to act: dates,
what closes, crowd and price effects, how far ahead to book. Link the official schedule when one exists.

When the trip has no fixed dates, lead each occasion with *when* it happens, so a reader still choosing
their timing can pick the season that appeals.

## Scale to importance

Match the visual weight to how central the occasion is to the trip:

- **It defines the trip** (Día de Muertos in Oaxaca, Christmas in Colmar) → lead the intro with it.
  Editorial treatment: a photo paired with an evocative description (text one side, image the other),
  or a full-width hero with the event name over the photo.
- **A notable overlap** (a national day, a local festival mid-trip) → a clear section with a photo and
  the practical details, but not the guide's headline.
- **A minor overlap** (mainly affects opening hours) → a compact inline callout noting what to expect.

Always include a photo if one is available. Always surface practical impact: what closes, crowd and
price effects, and how far ahead to book.

## When several qualify

Don't give multiple occasions equal billing by default. Let the most significant one lead with the
fullest treatment and give the rest lighter, comparable entries — a row of smaller cards beside or
below the lead (each with its date, a line of description, a link) reads well. Where several are
genuinely comparable in weight, an equal grid of them works just as well. Gather truly minor mentions
— a market's final weekend, a fair across town — into a single "also worth timing" note rather than
expanding each into a full entry. Keep the set curated: a few that matter, not an events listing.

## Calendar (multi-day events with distinct phases)

When an occasion spans several days that aren't all alike — a lead-up, peak days, a calmer aftermath —
a small month calendar shows its shape at a glance. Build it as a simple HTML grid: emit a row of
weekday headers, then one cell per day, padding the first week with empty cells so day 1 lands under
its true weekday — get that weekday from the `date` command, don't guess it. Highlight the peak days strongly
in the guide's accent color, show the lead-up in a lighter tint of it, and leave the rest muted; add
a short legend mapping color to meaning. Pair it with the text description (text one side, calendar
the other).

```css
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px} /* seven day columns */
.cal-grid .cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:5px}
.cal-grid .peak{background:var(--accent);color:#fff;font-weight:700} /* peak days */
```

## Schedule timeline (3+ timed events on one day)

When a single day has several timed events worth following, a
vertical timeline reads better than prose. Only worth it for **3 or more** events — fewer than that,
just write a sentence. Link the official program if there is one.

```html
<div class="day-schedule">
  <div class="ev"><div class="t">07:00</div><div class="body">Cannon salute. Champagne breakfast gatherings begin.</div></div>
  <div class="ev"><div class="t">10:30</div><div class="body">Children's parade — schools march with banners and flags.</div></div>
</div>
```
```css
.day-schedule{margin:1.5rem 0}
.ev{display:grid;grid-template-columns:60px 1fr;gap:.3rem 1.2rem;align-items:baseline}
.ev .t{font-size:.75rem;color:var(--accent);font-weight:600;text-align:right}
.ev .body{font-size:.85rem;color:var(--muted);padding:.55rem 0;border-bottom:1px solid var(--line)}
.ev:first-of-type .body,.ev:first-of-type .t{padding-top:0} /* no gap above the first row */
.ev:last-child .body{border-bottom:0} /* drop the trailing divider */
```

Equal padding above and below each `.body` centers the divider line between rows; `align-items:baseline`
aligns the time with the first line of its description.

## Matching treatment to the occasion

| The occasion is… | Treatment |
|---|---|
| The reason to visit | Editorial photo + description, or full-width hero |
| A notable overlap | Section with photo + practical details |
| A minor overlap (hours only) | Inline callout |
| Several worth including | Lead + lighter lesser entries, or a comparable grid |
| Multi-day with distinct phases | + Calendar |
| 3+ timed events on one day | + Schedule timeline |

Combine freely: a defining event often warrants a hero photo AND a calendar; a national day might use
a photo split AND a schedule timeline.
