# Hover glossary (local terms)

Underline local food/culture terms; show a definition on hover/focus. Keeps the prose clean while
making non-English terms legible. Use in food or culture sections that lean on local vocabulary. Tap-friendly via `tabindex`.

```html
The night isn't over without <span class="gloss" tabindex="0" data-def="late-night meal — Cantonese">siu yeh</span>.
```
```css
.gloss{border-bottom:1px dotted var(--accent);cursor:help;position:relative}
.gloss:hover::after,.gloss:focus::after{content:attr(data-def);position:absolute;left:0;bottom:130%;
  white-space:nowrap;background:var(--ink);color:var(--bg);font-size:.75rem;padding:.3rem .55rem;
  border-radius:5px;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:6}
```

Keep definitions short (a few words). Pull the term + meaning from the research.
