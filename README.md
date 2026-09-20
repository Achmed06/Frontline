# Frontline

Mobile-first portrait tactical territory PvP prototype built with Phaser, TypeScript, Vite and Capacitor.

## Current v0.58

The repository now contains the complete Work 0.52 runtime used by the browser build and the iPhone project.

### Core combat

- 3-minute matches plus overtime where the mode allows it
- 3x3 territory grid with connected frontline / deployment rules
- Core destruction and control-objective win conditions
- 12 unit cards and 4 tactical abilities
- ATLAS and LYRA commanders with separate active abilities
- Deterministic renderer-independent match engine
- Rookie, standard and veteran bot difficulty
- Campaign-specific decks, commanders, objectives and seeded scenarios

### Progression and modes

- 24-mission campaign across multiple regions
- Headquarters progression, unlockable base styles and manual cosmetic construction projects
- Unit mastery
- Saved deck slots and deck analysis
- Einsatzserie runs
- Draft battles
- Match history and post-match reports
- Local save backup / transfer
- Cosmetic store / supporter ownership integration
- Friend duels with room codes, rematches, reconnect handling and server-authoritative simulation

### Browser and iPhone

- Responsive browser build and GitHub Pages deployment
- Capacitor iOS project under `ios/`
- Xcode 26.3 native compile validation in GitHub Actions
- Automatic unsigned IPA artifact for sideload testing
- Optional signed IPA workflow when Apple signing credentials are configured
- Native app lifecycle handling and durable friend-duel reconnect state
- Contextual first-battle coaching that highlights cards, arena or commander without blocking play

## Local development

```bash
pnpm install --frozen-lockfile
pnpm run test
pnpm run dev
```

Production validation:

```bash
pnpm run test
pnpm run build
```

## iOS

Sync the current web runtime into the native project:

```bash
pnpm run ios:sync
```

Open the native project on macOS:

```bash
pnpm run ios:open
```

The **iPhone test build** GitHub Actions workflow compiles the Release iPhone target without signing and uploads `Frontline-unsigned.ipa`. A signed export can be enabled separately with the `ios-testing` environment and Apple signing credentials.

## Friend duel server

The browser client uses `/api/duel` on the same origin. Native iPhone builds use `VITE_DUEL_SERVER_URL` when a duel server has been configured. Without that variable, solo modes remain available and the native duel screen explains that online duels are not configured.

Server entry point:

```bash
pnpm start
```

## CI

Every main-branch build runs:

1. full Node test suite
2. TypeScript typecheck
3. Vite production build
4. built-entry validation
5. browser preview smoke test

Gameplay-source changes also trigger the latest iPhone test build; older in-progress iPhone builds are cancelled so only the newest commit consumes macOS runner time.


## v0.53 changes

- contextual first-battle coach built on the existing Feldtraining progression
- coach automatically disappears after the permanent learning path is complete
- five manual, cosmetic headquarters projects: Versorgungsdepot, Trainingsplatz, Signalrelais, Feldwerkstatt and Ehrenhof
- project unlocks reuse campaign wins, campaign stars, learning tasks and unit mastery instead of adding another currency
- built projects become visible in the headquarters illustration
- ready-to-build projects are surfaced directly on the base card
- mastery-driven headquarters garrison shows the player's most-used units once the Trainingsplatz is built
- construction feedback animates the completed project and updated base without adding wait timers
- projectile trails now travel to targets instead of rendering as full debug lines
- dedicated Core impact feedback adds a subtle hit flash and camera impulse
- no construction timer and no combat-stat bonuses


## v0.54 changes

- deterministic Tagesfront generated from the local calendar day
- fixed daily seed, battlefield, starting front, player deck, enemy deck and commanders
- rotating Core-Angriff and Signalkrieg objectives
- same daily setup can be replayed freely without tickets, energy or wait timers
- local daily record tracks attempts and successful best time, Core health and controlled points
- daily best values only compare successful clears
- dedicated Tagesfront card and full briefing in the headquarters lobby
- Tagesfront records are included in portable save backups
- backup format v2 remains able to import legacy v1 saves


## v0.55 changes

- Ehrenhof construction project now unlocks a real trophy display
- chapter completion trophies derive directly from the 24-mission campaign
- additional honors track seven distinct Tagesfront clears, three Gold-mastery units and 48 campaign stars
- locked honors show measurable progress instead of hidden requirements
- trophies are presentation-only and never alter combat values


## v0.56 changes

- every match now has a short fair deployment countdown: 3, 2, 1, LOS
- player input and bot simulation stay frozen until the countdown completes
- pausing or backgrounding during the countdown preserves the remaining countdown instead of letting it expire invisibly
- match objective banner appears as combat begins
- reduced-motion preference disables countdown animation while keeping the timing and game-state behavior


## v0.57 changes

- each arena now has its own lightweight procedural atmosphere instead of relying mainly on palette changes
- Smaragdküste adds water glints, shoreline movement and vegetation marks
- Frostrelais adds drifting snow and ice-crystal details
- Glutbruch adds rising sparks and glowing fracture marks
- Nexuskern adds scanning lines and circuit-like data details
- territory plates also carry theme-specific surface details
- all atmosphere remains cosmetic, deterministic and collision-free


## v0.58 changes

- mastered units now appear directly inside the headquarters artwork once the Trainingsplatz is built
- the visible patrol is derived from the same top-mastery units used by the garrison panel
- unit silhouettes differ for heavy, ranged, support, swarm and assault roles
- up to four earned units can occupy the base artwork at once
- subtle patrol movement makes the headquarters feel inhabited while respecting reduced-motion settings
- no training-ground or patrol element alters combat values
