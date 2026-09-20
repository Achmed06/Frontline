# Frontline

Mobile-first portrait PvP prototype built with Phaser, TypeScript and Vite.

## Current v0.3 loop

- 3-minute matches
- Three clearly selectable deployment lanes
- Moving frontline / territory pressure
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
- Rematch flow
- Procedural prototype visuals with no third-party game assets

## Local development

```bash
npm install
npm run dev
```

Tap a unit card and then tap lane 1, 2 or 3 to deploy it. Ability cards cast immediately when both energy and cooldown permit.

The prototype remains focused on validating match flow, territory pressure, counters, readability and pacing before art production, progression systems or online multiplayer.
