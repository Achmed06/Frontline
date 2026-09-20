# Frontline

Mobile-first portrait PvP prototype built with Phaser, TypeScript and Vite.

## Current v0.5 loop

- Dedicated home screen with one functional Play entry
- 3-minute matches with a 3-second pre-match countdown
- Three clearly selectable deployment lanes
- Moving frontline / territory pressure
- Live frontline control meter
- Core HP win condition
- Five-second breakthrough win condition
- Six unit archetypes with explicit counter relationships
- Two abilities: Surge and Repulse
- Ability cooldowns in addition to energy costs
- Single-resource economy
- Aegis commander comeback passive
- Final-minute energy acceleration
- Lane-by-lane pressure readout
- 14-active-unit cap per side
- Short per-lane deploy lock to prevent input spam
- First-match 3-step onboarding
- Counter-aware bot composition and lane response
- Combat counter feedback
- Post-match telemetry for deploys, kills, core damage and best territorial push
- Functional Rematch and Home actions
- Procedural prototype visuals with no third-party game assets

## Local development

```bash
npm install
npm run dev
```

Tap **Play**, then select a unit card and tap lane 1, 2 or 3 to deploy it. Ability cards cast immediately when both energy and cooldown permit.

## Browser preview

A GitHub Pages deployment workflow is included. GitHub requires Pages to be enabled once in the repository settings:

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

After that, run the **Deploy Frontline Preview** workflow.

The prototype remains focused on validating match flow, territory pressure, counters, readability and pacing before full art production, progression systems or online multiplayer.
