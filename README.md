# SONIC RADAR · Global Avant-Garde & Underground Music Radar

> **Escape algorithmic feeds. Dig directly from the source.**  
> A real-time crate-digging radar aggregating first-hand releases across global avant-garde, underground labels, and critical consensus.

**Live Site: <https://frkocnluo.github.io/music-tracker/>**

---

## Why Sonic Radar?

Traditional music discovery channels (year-end lists, social media reposts, algorithms) suffer from significant latency:
1. **Third-Hand Lag**: By the time an underground release makes it to viral social feeds, weeks or months have already passed.
2. **Algorithmic Homogenization**: Streaming homepages prioritize playlist payola and predictable trends over genuine artistic breakthroughs.

**Sonic Radar** synchronizes directly with the world's most reputable underground and critical sources:

```
【Level 1 · Avant-Garde & Experimental】
  ├── The Wire (Adventures in Modern Music)
  ├── The Quietus (Radical Independent Music & Avant-Rock)
  └── Boomkat (UK Avant-Garde & Electronic Staff Picks)
          ↓
【Level 2 · Decentralized Underground Drops】
  └── Bandcamp Daily (Album of the Day / Essential Releases)
          ↓
【Level 3 · Critical Consensus】
  ├── Pitchfork (Reviews & Best New Music)
  ├── Stereogum (Album of the Week)
  └── The Needle Drop / Anthony Fantano (YouTube Reviews)
```

---

## Core Features

- 💽 **Vinyl Crate Digging Aesthetic**: Obsidian dark theme, interactive sliding vinyl record on jacket hover, rotating vinyl disc center labels.
- 🖼️ **100% High-Resolution Cover Art**: Directly extracted from Pitchfork, Bandcamp, Stereogum, The Quietus, and YouTube CDN.
- ⚡ **Zero-Latency In-Browser Audio Player**: Universal bottom dock with real-time waveform equalizer, fallback Web Audio harmonic synthesizer, and outbound links (`Bandcamp ↗`, `Spotify ↗`, `Original ↗`, `YouTube ↗`).
- 📡 **Automated RSS Syndication**: Native zero-dependency stream parsing, updating over 110+ active releases in seconds.

---

## Architecture & Development

Zero runtime dependencies — built with native Node.js 18+ ESM, Vanilla CSS, and modern semantic HTML5:

```bash
# 1. Fetch latest global feeds & album covers
node _build/fetch.mjs

# 2. Build static production site (outputs to root index.html)
node _build/build.mjs

# 3. Start local preview server (port 4174)
node _build/serve.mjs
# Open http://127.0.0.1:4174
```

---

## License

MIT License. Music artwork, audio metadata, and review excerpts are copyright their respective artists, labels, and publications.
