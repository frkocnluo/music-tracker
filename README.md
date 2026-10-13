# SONIC RADAR · Global Avant-Garde & Underground Music Radar

> **Escape algorithmic feeds. Dig directly from the source.**
> A crate-digging radar that aggregates first-hand releases across global avant-garde, underground labels, and critical consensus.

**Live Site: <https://frkocnluo.github.io/music-tracker/>**

---

## Why Sonic Radar?

Traditional music discovery channels (year-end lists, social media reposts, algorithms) suffer from significant latency:

1. **Third-Hand Lag** — by the time an underground release reaches viral social feeds, weeks or months have passed.
2. **Algorithmic Homogenization** — streaming homepages prioritize playlist payola over genuine artistic breakthroughs.

Sonic Radar reads the sources themselves and shows you what is actually new.

---

## Sources & Sync Status

| Source | Tier | Transport | Status |
| --- | --- | --- | --- |
| The Wire | 1st-hand · sound art | RSS (`/news/rss`) | live |
| The Quietus | 1st-hand · radical independent | RSS (Cloudflare-protected) | **degraded** — see below |
| Bandcamp Daily | 1st-hand · decentralised curation | RSS | live (flaky TLS → auto-retry) |
| Pitchfork Reviews | 2nd-hand · critical authority | RSS | live |
| Stereogum (Album of the Week) | 2nd-hand · core criticism | RSS | live (slow, ~5–30s) |
| The Needle Drop (Fantano) | 2nd-hand · video criticism | YouTube Atom | live, **playable in-page** |
| Boomkat | 0th-hand · record shop | none | curated slot only (no public feed, `products.atom` → 403) |

**Honest notes**

- **The Quietus** sits behind a Cloudflare JS challenge: the feed, the WordPress REST API, the sitemap and even the homepage all return HTTP 403 with a `Just a moment...` interstitial — verified with browser, Googlebot, Feedfetcher and curl user agents. The radar therefore **keeps its last successful snapshot** and labels it as stale instead of pretending it is live. It will resume automatically if the WAF is lifted.
- **Playback is real or explicitly absent.** Only the YouTube-backed source has audio we can legally embed; those entries play for real inside the dock. Everything else **tells you there is no free preview** and hands you the platform links. There is no synthetic "fake preview" tone.
- **No fabricated scores.** Only platforms we can actually verify are shown (Pitchfork, The Needle Drop, Douban search). RYM / AOTY award no verifiable score from a feed, so they are not displayed.

---

## Core Features

- 💽 **Vinyl crate-digging aesthetic** — obsidian dark theme, sliding vinyl on jacket hover, rotating center labels.
- 🖼️ **Cover art from source CDNs** — Pitchfork, Bandcamp, Stereogum, The Quietus, YouTube thumbnails.
- ▶️ **Honest player dock** — YouTube entries play in-page (iframe); audio-enclosure entries play via `<audio>`; sources without preview audio say so and surface platform links (`Bandcamp ↗ / Spotify ↗ / YouTube ↗ / 豆瓣 ↗ / Original ↗`).
- 📡 **Zero-dependency feed pipeline** — native Node.js ESM, no runtime dependencies.
- 🧬 **Cross-source deduplication** — the same album picked up by Pitchfork *and* Stereogum becomes one card with two badges ("multi-source consensus"), not two duplicated cards.
- 🩺 **Source health panel** — every feed reports its own status, attempt count and staleness in the sidebar.
- 🧭 **Publisher metadata first** — genres and artist names come from the publishers' own `<category>` taxonomies where available, falling back to keyword inference only when nothing else exists.

---

## Architecture

```
_build/
  sources.mjs   # feed topology + FETCH_POLICY tuning knobs
  fetch.mjs     # concurrent, retrying fetcher; merge-safe cache; entity decoding;
                # Pitchfork artist enrichment via og:title (cached across runs)
  data.mjs      # genre inference, cross-source dedup, artist extraction, summaries
  layout.mjs    # HTML generation (fully escaped), dynamic filters, source health
  scores.mjs    # verified-score engine (no fabricated numbers)
  build.mjs     # atomic build; refuses to overwrite a working page with an empty one
  serve.mjs     # local preview server (path-traversal guarded, gzip)
  report.mjs    # CI job summary
  cache.json    # versioned snapshot: per-source status + items + enrichment cache
.github/workflows/update-and-deploy.yml   # the automation that actually runs
assets/css/style.css
assets/js/app.js
```

### Design rules the pipeline follows

1. **Never destroy data on partial failure.** A failed source keeps its last successful snapshot and is flagged; the cache is written atomically.
2. **Retry before giving up.** Bandcamp Daily intermittently resets TLS, Stereogum can take 30s. Deterministic failures (403/404) are not retried; transient ones get 3 attempts with exponential backoff.
3. **Escape all third-party text.** Feed titles and excerpts are untrusted input.
4. **Don't display what you can't verify.** No invented scores, no invented genres, no fake audio.

---

## Development

Zero runtime dependencies — native Node.js 18+ ESM, vanilla CSS, semantic HTML5:

```bash
# 1. Fetch the latest feeds (writes _build/cache.json)
node _build/fetch.mjs

# 2. Build the static production site (outputs to root index.html)
node _build/build.mjs

# 3. Inspect source health
node _build/report.mjs

# 4. Start the local preview server (port 4174)
node _build/serve.mjs
# Open http://127.0.0.1:4174
```

Or everything at once:

```bash
npm run ci     # fetch → build → report
npm run dev    # build → serve
```

### Tuning

All fetch knobs live in `FETCH_POLICY` (`_build/sources.mjs`): per-request timeout, retry count, backoff base, per-source item cap, staleness window, and the Pitchfork enrichment budget.

---

## License

MIT License. Music artwork, audio metadata, and review excerpts are copyright their respective artists, labels, and publications.
