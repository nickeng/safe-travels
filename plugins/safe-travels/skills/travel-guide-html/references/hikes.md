# Hikes

An inline-SVG distance × elevation profile for a trail — spatial information prose can't convey. Use
when the guide includes real hikes/trails (alpine destinations, treks, coastal walks). Restyle the
stroke/fill to the palette. **Take distance and elevation from the researcher's source (or a trail
page); never invent the numbers.**

## Where to place it

- **The trip is built around the hike** (a trek or multi-day route — a circuit guide): the profile is
  the guide's spine. Render it as a standalone `<figure>` in a content section, showing the whole
  route's cumulative distance × elevation.
- **Mappable hikes are one section among others** (trails/viewpoints that are also map pins): render
  that section as **elevation cards** — a per-section card variant (below). Each hike is one card,
  one pin, one profile. Give the hikes their own section so it holds a single kind of card.

## The drawing helper

A profile that labels its high and low points — restyle freely.

```js
// profile: { dist:[…], elev:[…, same length], marks?:[{at, label}] }
// Labels the high & low points by default; {labelMarks:true} names the waypoints instead — not both, or they collide at the peak.
function elevationSVG(profile, { unit='m', labelMarks=false } = {}){
  if (!profile) return '';
  const W=460, H=140, px=14, pt=22, pb=16, D=profile.dist, E=profile.elev, marks=profile.marks||[],
    maxD=Math.max(...D), maxE=Math.max(...E), minE=Math.min(...E), iMax=E.indexOf(maxE), iMin=E.indexOf(minE),
    X=d=>px+(d/maxD)*(W-2*px), Y=e=>(H-pb)-((e-minE)/((maxE-minE)||1))*(H-pt-pb),
    pts=D.map((d,i)=>`${X(d).toFixed(1)},${Y(E[i]).toFixed(1)}`).join(' '),
    val=i=>{ const x=X(D[i]), a=x<W/2?'start':'end';
      return `<text x="${(a==='start'?x+4:x-4).toFixed(1)}" y="${(Y(E[i])-6).toFixed(1)}" font-size="10" text-anchor="${a}" fill="var(--muted)">${E[i].toLocaleString()} ${unit}</text>`; },
    dots=marks.map(m=>{ const i=D.indexOf(m.at), x=X(m.at), y=Y(E[i]??maxE);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="var(--c-hikes)"/>`
        + (labelMarks ? `<text x="${x.toFixed(1)}" y="${(y-8).toFixed(1)}" font-size="10" text-anchor="middle" fill="var(--ink)">${m.label}</text>` : ''); }).join('');
  return `<svg class="elev" viewBox="0 0 ${W} ${H}" role="img" aria-label="Elevation ${minE}–${maxE} ${unit} over ${maxD}">
    <polygon points="${X(0).toFixed(1)},${H-pb} ${pts} ${X(maxD).toFixed(1)},${H-pb}" fill="var(--c-hikes)" opacity=".12"/>
    <polyline points="${pts}" fill="none" stroke="var(--c-hikes)" stroke-width="2"/>
    ${labelMarks ? '' : val(iMax) + val(iMin)}${dots}</svg>`;
}
```

**How much detail:** on cards keep it lean — the default (high/low labels + dots) suits that size.
For a route-level figure, pass `{labelMarks:true}` to name the waypoints, and add a labeled y-axis
(gridlines) if the route earns it. Set `unit` to `'m'` or `'ft'` for the destination. Show the high/low
values **or** the waypoint names, never both — a named peak sits at the high point, so the two labels
would overlap.

## Route-level (content)

A standalone figure — the route's spine. Fill a placeholder with the helper:

```html
<figure class="elev-fig" id="route-elev"></figure>
```
```js
const ROUTE_PROFILE = { dist:[0,20,42,68,90,110,145,160], elev:[820,1300,2050,3540,4130,3800,2710,1070],
  marks:[{at:68,label:"Thorong La 5,416 m"}] };            // from the researcher's stage table
document.getElementById('route-elev').innerHTML =
  elevationSVG(ROUTE_PROFILE, {unit:'m', labelMarks:true}) + '<figcaption>Annapurna Circuit — 160 km · high point Thorong La 5,416 m</figcaption>';
```

## As a card variant (mappable hikes)

Register the renderer, then select the whole section with `data-variant="elevation"` on its mount.
The card keeps `class="card"` + `data-id` (so the map pin and sync work) and emits images via
`galleryHTML` — a photo, the name/blurb, the description, an optional stat trio, and the profile. Style it to taste.

```js
CARD_VARIANTS.elevation = (it) => `<article class="card${it.feature ? ' feature' : ''}" data-id="${it.id}" aria-labelledby="t-${it.id}">
  ${galleryHTML(it.images)}
  <div class="body">
    <p class="card-title" id="t-${it.id}">${it.name}</p><p class="meta">${it.blurb}</p>
    ${it.description ? `<p class="desc">${it.description}</p>` : ''}
    ${it.stats?.length ? `<div class="tstats">${it.stats.map(s => `<div><b>${s.n}</b><span>${s.l}</span></div>`).join('')}</div>` : ''}
    ${elevationSVG(it.elevation, {unit:'ft'})}
    ${it.sources?.length ? `<div class="card-sources">${it.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>`).join(' · ')}</div>` : ''}
  </div></article>`;
```
```html
<div class="cards" data-section="hikes" data-variant="elevation"></div>
```

The SVG needs a size inside cards:

```css
.cards[data-variant="elevation"] .elev{width:100%;height:auto;display:block}
```

Each hike is an item carrying its profile, an optional stat trio, and its pin coords:

```json
{ "id":"south-kaibab", "category":"hikes", "name":"South Kaibab Trail",
  "blurb":"Open ridge, views from the first step — no water, no shade, so carry everything.",
  "stats":[{"n":"6 mi","l":"Round trip"},{"n":"−2,100 ft","l":"Descent"},{"n":"4–6 hr","l":"Typical"}],
  "lat":36.053, "lng":-112.084,
  "elevation":{ "dist":[0,0.9,1.5,3.0,4.4], "elev":[7200,6660,6060,5200,4000],
                "marks":[{"at":0.9,"label":"Ooh Aah"},{"at":3.0,"label":"Skeleton"}] },
  "images":[{"url":"…","label":"…","credit":"…"}], "sources":[{"url":"…","title":"…"}] }
```
