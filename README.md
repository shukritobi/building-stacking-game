# Skyline Stack

A complete, mobile-first building stacking game inspired by classic crane-and-tower arcade games. It uses original procedural vector graphics and contains no copied game assets.

## Play

Once GitHub Pages is enabled with **GitHub Actions** as the source, the game is available at:

**https://shukritobi.github.io/building-stacking-game/**

## Features

- One-tap crane timing and physics-based drops
- Classic mode and 60-second Time Attack
- Accuracy scoring, perfect drops, combos, lives and power-ups
- Slow Time and Tower Stabilizer abilities
- Procedural 2.5D buildings, animated skyline, weather drift, day/night color shifts and particles
- Touch, mouse and keyboard controls
- Haptics and generated Web Audio sound effects
- Local high scores and tallest-tower records
- Responsive portrait UI, safe-area support and pause-on-background
- Installable PWA with offline caching
- Web Share API score sharing
- No frameworks, dependencies or build step

## Controls

- Mobile: tap anywhere on the game canvas to drop
- Desktop: click, Space or Enter to drop
- Escape: pause or resume

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deployment

The included `.github/workflows/pages.yml` publishes the repository root to GitHub Pages. In the repository, open **Settings > Pages** and select **GitHub Actions** under Build and deployment if it is not already selected.

## License

MIT
