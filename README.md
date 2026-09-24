# Frontline

Mobile-first portrait tactical territory PvP prototype built with Phaser, TypeScript, Vite and Capacitor.

## Current v2.00

The repository contains the current browser runtime and Capacitor iPhone project from the same versioned source.

### Core combat

- 3-minute matches plus overtime where the mode allows it
- 3x3 territory grid with connected frontline / deployment rules
- Core destruction and control-objective win conditions
- 12 unit cards and 4 tactical abilities
- ATLAS, LYRA and NOVA commanders with separate active abilities
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

### StoreKit release mode

Frontline's cosmetic supporter product remains fail-safe by default:

- normal Xcode, unsigned CI and TestFlight-oriented builds default to `FRONTLINE_STORE_MODE=sandbox`
- the StoreKit product ID is injected through `FRONTLINE_STORE_PRODUCT_ID` instead of being hard-coded into the Swift purchase flow
- the signed GitHub workflow reads `IOS_STORE_PRODUCT_ID` and exposes an explicit `sandbox` / `production` choice
- a production-mode archive is only created when that mode is explicitly requested
- the archive is rejected if its embedded StoreKit mode or product ID differs from the requested values
- sandbox UI says TESTKAUF and explicitly explains that no real charge occurs
- production UI removes all test-purchase wording and uses Apple's localized product price
- verified StoreKit transactions remain the only source of cosmetic ownership; browser storage never grants purchase entitlement
- purchase restoration remains available through Apple

The repository intentionally defaults to sandbox mode. The actual App Store Connect product must exist under the configured product ID before production mode is useful.

## Friend duel server

The browser client uses `/api/duel` on the same origin. Native iPhone builds use `VITE_DUEL_SERVER_URL` when a duel server has been configured. Without that variable, solo modes remain available and the native duel screen explains that online duels are not configured.

Local server entry point:

```bash
pnpm start
```

Local development binds to `127.0.0.1:8080` by default. In `NODE_ENV=production`, the validated runtime defaults to `0.0.0.0:8080`, which is suitable for a container behind an HTTPS reverse proxy.

Production container:

```bash
docker build -t frontline-duel .
docker run --rm -p 8080:8080 \
  -e DUEL_MAX_ROOMS=12 \
  -e DUEL_TRUST_PROXY_HOPS=1 \
  -e DUEL_ALLOWED_ORIGINS=capacitor://localhost \
  frontline-duel
```

Operational endpoints:

- `/healthz` — liveness only
- `/readyz` — readiness plus current in-memory room count and configured capacity

Deployment variables:

- `PORT` — TCP port, default 8080
- `HOST` — explicit listen address; production defaults to `0.0.0.0`
- `DUEL_MAX_ROOMS` — in-memory room capacity, accepted range 2–64, default 12
- `DUEL_ALLOWED_ORIGINS` — comma-separated exact cross-origin clients such as `capacitor://localhost`
- `DUEL_TRUST_PROXY_HOPS` — trusted reverse-proxy hops, default 0; forwarded client IP headers are ignored unless this is explicitly enabled

Rooms and active matches are intentionally in-memory. A process restart clears them, so production hosting should use a single duel-server instance until shared room state is implemented.

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


## v0.59 changes

- newly deployed units now materialize through a short team-colored deployment beam
- a ground signal and expanding deployment ring make the exact insertion point readable
- units fade, descend and scale into the battlefield during the existing engine spawn effect
- Swarm members receive their own deployment feedback because each spawned unit already has an independent engine effect
- deployment presentation remains renderer-only and does not change attack timing, energy cost or unit statistics


## v0.60 changes

- real combat damage now emits a dedicated hit-impact effect
- impact size scales from the damage actually applied after shields
- heavy hits receive a larger double-ring burst while normal hits stay restrained
- lethal hits combine the impact with the existing death burst
- hit feedback contains no floating damage numbers and does not alter combat simulation


## v0.61 changes

- cores now show escalating visual damage instead of relying only on the HP bar
- first visible structural cracks appear at 60% Core health
- critical cores below 30% add stronger fractures, warning lights and lightweight sparks
- fresh Core hits produce a brief local flash and expanding impact ring
- all Core damage states are renderer-only and preserve the existing win conditions and damage values


## v0.62 changes

- capture points now have clearly different visual states for capturing, contested, disconnected and freshly secured
- capture progress uses a stronger team-colored ring with a moving leading marker
- contested points pulse with rotating warning ticks instead of only a static cross
- disconnected owned points use a hatched cut-off treatment and warning ring
- Signalkrieg relay points pulse with the owning team's color when supplied
- freshly captured territory sends a visible hex shockwave and briefly brightens the corresponding frontline
- losing a point that you previously held now triggers a FRONT VERLOREN callout with the sector coordinate


## v0.63 changes

- match results now include a compact final 3x3 territory map
- the summary shows both sides' final controlled-sector count and Core health
- disconnected owned sectors remain visibly hatched in the final map
- the map uses the actual end-state rather than reconstructed statistics
- result screens now explain the territorial shape of a win, draw or loss at a glance


## v0.64 changes

- unit health bars now communicate condition instead of only shrinking
- healthy units retain team-color health bars
- wounded units below 55% switch to amber
- critical units below 30% switch to red and receive a small pulsing warning marker
- team identity remains on the unit footprint and sprite, so health urgency does not obscure allegiance
- critical-state presentation is renderer-only and does not change health, damage or targeting


## v0.65 changes

- Core-Angriff overtime now gets a dedicated VERLÄNGERUNG transition banner
- the overtime callout explains that the next territorial or Core advantage decides the extended fight
- the match clock switches to a distinct amber overtime state
- overtime clock emphasis respects reduced-motion preferences
- no overtime behavior or tie-break rule was changed


## v0.66 changes

- headquarters construction now has a second tier of five dependent projects
- Nachschubterminal extends the Versorgungsdepot after 10 campaign wins
- Garnisonsflügel extends the Trainingsplatz after 12 total mastery points
- Aufklärungsturm extends the Signalrelais after 12 campaign wins
- Drohnenrampe extends the Feldwerkstatt after 42 campaign stars
- Siegesmonument extends the Ehrenhof after 24 campaign wins
- second-tier projects cannot be skipped by having enough progress; their predecessor must actually be built first
- build cards show the missing predecessor directly when a construction chain is locked
- all five new upgrades add visible structures to the headquarters artwork and remain cosmetic only


## v0.67 changes

- moving units now receive subtle renderer-only walk motion instead of sliding as static icons
- movement uses actual frame-to-frame unit displacement and does not alter simulation positions
- attacking units receive a short recoil away from their current target
- shots and melee attacks now begin with a brief source flash before the existing projectile/impact feedback
- unit motion state resets completely between matches so rematches cannot inherit stale animation state
- all motion remains cosmetic and preserves deterministic combat logic


## v0.68 changes

- holding a unit card over the battlefield now previews that unit's real attack radius before deployment
- ranged units expose their larger tactical reach while melee units retain a compact placement footprint
- long-range previews add subtle radial ticks for fast visual recognition
- invalid placement keeps the same preview geometry but switches to the existing error color
- ability targeting still uses its existing effect-radius preview
- deployment range visualization is renderer-only and does not alter card ranges or targeting


## v0.69 changes

- active attacks now briefly mark their current target with a compact four-corner lock indicator
- the target lock exists only for the short lifetime of the existing shot effect, avoiding permanent targeting-line clutter
- Core turret attacks use the same readable lock treatment
- healing keeps its separate pulse/beam language so support actions remain visually distinct from attacks
- targeting behavior and target selection are unchanged


## v0.70 changes

- destroying a Core now gets a dedicated battlefield end moment before the result modal opens
- player input stops immediately when the match ends, while the arena keeps rendering for 850 ms after a Core break
- destroyed Cores trigger a stronger one-time camera shake, break ring, sparks and fracture treatment
- victory/defeat gets a dedicated CORE GEBROCHEN / CORE GEFALLEN battle callout before results
- time-limit and territory decisions still proceed directly to the result screen without the destruction hold
- all match rules, winner calculation and rewards remain unchanged


## v0.71 changes

- Pulse, Rally, Stasis, Repulsor and Shield now use clearly different battlefield visual languages
- Pulse reads as a concentric shockwave with radial burst lines
- Rally uses outward tempo chevrons and a green support wave
- Stasis uses an icy hex field with rotating frost markers
- Repulsor uses directional push arrows radiating from the cast point
- Shield uses layered hex protection geometry instead of a generic circle
- ability mechanics, radii, damage, healing and crowd-control values remain unchanged


## v0.72 changes

- the Commander button now clearly distinguishes ready and cooling-down states
- a ready Commander receives a brighter green border, subtle internal glow and highlighted icon
- when a real cooldown reaches zero, the button flashes briefly to surface the timing window without a modal or banner
- the match does not flash the Commander at initial match start; only actual cooldown-to-ready transitions trigger it
- reduced-motion settings disable the readiness animation
- Commander cooldown values and activation rules are unchanged


## v0.73 changes

- ATLAS and NOVA now expose their real active-duration window directly on the Commander button
- the status reads AKTIV with the remaining live effect time before returning to the normal cooldown countdown
- active Commander effects stay visually emphasized even though the button is correctly disabled during cooldown
- the active-duration display derives from the same per-unit shield/rally timers used by combat simulation
- LYRA remains instantaneous and therefore never shows a misleading active-duration state
- reduced-motion settings disable the active Commander pulse
- Commander durations, cooldowns, combat values and activation rules are unchanged


## v0.74 changes

- enemy Commander activations now surface immediately with a short battlefield warning
- the warning names both the opposing Commander and the ability that just fired
- bot Commander activation now uses the same public activation path as player/authoritative combat
- enemy Commander cooldown state is therefore real and observable instead of remaining at zero while the bot uses a separate hidden timer
- the bot keeps its existing decision threshold and activation cadence
- friend-duel and authoritative clients can reuse the same enemy cooldown state for readable Commander events
- Commander abilities, cooldown lengths, AI thresholds and combat values are unchanged


## v0.75 changes

- the opposing Commander now keeps a compact live status in the match HUD
- enemy status distinguishes BEREIT, active-duration windows and remaining cooldown seconds
- ATLAS and NOVA active windows use the same real per-unit timers as the battlefield simulation
- LYRA correctly skips an artificial active state and moves directly into cooldown
- the persistent HUD state complements the existing short enemy-Commander warning banner
- Commander abilities, cooldowns, AI behavior and combat values are unchanged


## v0.76 changes

- Commander readiness now reflects whether the ability can actually affect a valid target
- ATLAS requires at least one living allied unit before the button reports BEREIT
- NOVA requires at least one living allied unit that is not already at the full Commander rally duration
- LYRA reports BEREIT only when a living allied unit is wounded or slowed
- zero cooldown without a usable target is shown as KEIN ZIEL instead of a false ready state
- the player Commander button is disabled and visually muted while no valid target exists
- the opposing Commander HUD uses the same target-aware readiness rules
- Commander effects, cooldowns, AI behavior and combat values are unchanged


## v0.77 changes

- unavailable Commander states now explain the actual reason instead of using only the generic KEIN ZIEL label
- ATLAS and NOVA show TRUPP FEHLT when no living allied unit exists
- LYRA shows TRUPP FEHLT with no living allies and ALLE INTAKT while every living ally is healthy and unslowed
- the ready flash now follows real usability transitions, not only the cooldown reaching zero
- LYRA therefore surfaces the moment a wounded or slowed ally becomes a valid repair target
- ATLAS and NOVA can surface readiness when the first usable allied unit enters the field
- initial match setup remains quiet because readiness flashing starts only after combat time has advanced
- Commander effects, cooldowns, AI behavior and combat values are unchanged


## v0.78 changes

- the player Commander button now carries a thin cooldown-progress rail along its bottom edge
- the rail starts empty when the ability enters cooldown and fills continuously toward readiness
- ready and no-target states keep a full rail because the cooldown itself is complete
- active-duration, target-aware readiness and contextual availability text remain unchanged
- cooldown progress is derived from the real Commander cooldown and clamped defensively
- the progress rail is purely presentational and does not alter Commander timing, effects or combat values


## v0.79 changes

- the opposing Commander HUD now mirrors the player's cooldown readability with its own thin progress rail
- the enemy rail starts empty when the opposing ability fires and fills continuously toward readiness
- the rail fills from the enemy side of the HUD to preserve the visual left/right team direction
- enemy active-duration, cooldown text and target-aware availability states remain unchanged
- progress uses the same real enemy Commander cooldown and shared clamped progress helper as the player rail
- the enemy cooldown rail is purely presentational and does not alter bot decisions, Commander timing or combat values


## v0.80 changes

- persistent unit-status visuals now expose remaining whole seconds with compact pips around affected units
- shield, rally and slow states lose one pip as each remaining second expires
- the timer pips use the same live per-unit status timers as combat simulation
- enemy ATLAS shields now use the enemy team color instead of incorrectly appearing in the player's mint color
- rally keeps its neutral gold tempo language and slowing keeps its blue control language
- status pips are renderer-only and do not alter shield strength, movement, attack speed, slow duration or any combat rule


## v0.81 changes

- selecting an unaffordable card now shows a live energy-ready countdown directly in the persistent selection hint
- the countdown derives from the real current energy value, card cost and the existing 0.72 energy-per-second regeneration rate
- the hint updates continuously and automatically returns to the card's normal tactical description as soon as the card becomes affordable
- the initial insufficient-energy toast now also reports the estimated ready time instead of only the rounded missing-energy amount
- the waiting state receives a restrained amber emphasis so it reads as resource timing rather than an error
- energy generation, card costs, deployment validation and all combat rules remain unchanged


## v0.82 changes

- first-session battle coaching now uses the same target-aware Commander readiness rules as the live Commander button
- the coach no longer highlights a disabled Commander simply because its cooldown reached zero
- ATLAS requires a living allied unit before the Commander lesson points at the button
- LYRA waits for a wounded or slowed ally and NOVA waits for a unit that can actually receive the rally effect
- when the Commander has no valid target, the lesson keeps focus on tactical cards and explains why
- dedicated tests cover no-target, LYRA and NOVA coaching states
- learning progress, Commander effects, cooldowns and combat rules remain unchanged


## v0.83 changes

- first-session deployment coaching now checks the selected unit's real energy cost before directing the player into the arena
- an unaffordable selected unit shows ENERGIE SAMMELN instead of highlighting an action that the live match would reject
- the coach estimates readiness from the same current energy value, card cost and 0.72 energy-per-second regeneration used by the match
- once the unit becomes affordable, the coach automatically returns to TRUPPE EINSETZEN and arena focus
- tactic cards still correctly route the player back to choosing a troop for the deployment lesson
- dedicated tests cover low-energy, exact-cost and tactic-card states
- card costs, energy regeneration, deployment validation and all combat rules remain unchanged


## v0.84 changes

- field-training step 3 now follows a deliberately selected tactic into the arena instead of leaving the coaching focus on the card row
- an affordable usable tactic shows TAKTIK ZIELEN and highlights the battlefield as the next action
- an unaffordable tactic stays on the card row with the real energy-ready countdown
- Rally waits for a living allied unit before arena guidance; Stasis and Repulsor wait for a living enemy; Pulse remains freely targetable
- a selected usable tactic takes coaching priority over a simultaneously ready Commander so the tutorial respects the player's current intent
- dedicated tests cover tactic energy, target availability and selected-tactic priority
- tactic effects, targeting radii, energy costs, Commander rules and all combat values remain unchanged


## v0.85 changes

- field-training step 2 now detects when the player's entire deployed army has been wiped before the first capture
- the coach no longer highlights the battlefield with BODEN EROBERN when no living allied unit can capture anything
- with no living allies it first asks for a unit card, keeps unaffordable reinforcement on the card row with the real energy countdown, and only returns to arena focus once the selected reinforcement is affordable
- after a living allied unit is back on the field, the normal BODEN EROBERN objective resumes automatically
- selecting a tactic while the army is wiped correctly keeps the recovery guidance on unit cards
- dedicated tests cover wipeout, wrong-card, low-energy, affordable-reinforcement and recovered-army states
- unit stats, capture rules, energy regeneration, deployment validation and all combat values remain unchanged


## v0.86 changes

- field-training step 4 now detects a full allied wipe before directing the player to push the front or attack the enemy Core
- with no living allied units, the final lesson first asks for a unit card instead of highlighting an impossible battlefield objective
- an unaffordable reinforcement remains on the card row with the real energy-ready countdown
- once the selected reinforcement is affordable, the arena is highlighted for deployment
- after a living allied unit returns, the coach automatically resumes FRONT WEITER SCHIEBEN or CORE DURCHBRECHEN according to the live territory state
- losing the rebuilt army again immediately returns the lesson to reinforcement recovery
- dedicated tests cover wrong-card, low-energy, affordable deployment, front push, Core push and repeated wipeout states
- win conditions, unit stats, territory ownership, energy regeneration and all combat values remain unchanged


## v0.87 changes

- tactical aiming now highlights the exact units that will be affected before the player releases the cast
- Rally marks living allied targets, while Pulse, Stasis and Repulsor mark living enemy targets inside their real effect geometry
- Pulse also highlights the enemy Core whenever the cast point is inside its special 100-point Core damage reach
- the hold-to-aim label now distinguishes ability casting from unit deployment and reports the live number of affected targets
- a valid Pulse aimed at empty space remains legally castable but is shown in amber with 0 ZIELE so an accidental wasted cast is easier to avoid
- target preview calculation is now shared with tactical validation, preventing renderer guidance from drifting away from combat rules
- dedicated engine tests cover Rally, Stasis, Repulsor and Pulse/Core target previews
- ability damage, healing, crowd control, radii, energy costs and all combat values remain unchanged

## v0.88 changes

- Repulsor aiming now previews the exact push direction and landing position for every affected enemy before release
- projected landing markers respect the same battlefield clamps as the real displacement, including edge and corner cases
- tactical execution now consumes the same shared target preview used by validation and renderer guidance instead of calculating affected units a second time
- Pulse Core hits, Rally targets, Stasis targets and Repulsor targets therefore resolve from the same target set the player was shown
- the aiming label distinguishes affected troops from a Pulse Core hit instead of collapsing both into a generic target count
- a dedicated regression test verifies that Repulsor preview coordinates exactly match the post-cast unit coordinates
- ability radii, damage, healing, crowd control, push distance, energy costs and all other combat values remain unchanged

## v0.89 changes

- Pulse aiming now marks enemies that the pending 85-damage hit will actually eliminate after current shields are accounted for
- a lethal Pulse target receives a compact knockout cross while ordinary affected targets keep the normal area-target ring
- aiming at the enemy Core now surfaces KERNBRUCH when its current health is low enough for the real Pulse Core hit to finish it
- Pulse Core damage and Core reach now live on the Pulse card definition instead of being duplicated as renderer/simulation magic numbers
- the aiming label appends K.O. and KERNBRUCH outcome hints without changing whether an otherwise legal cast is allowed
- dedicated regression coverage distinguishes lethal, shield-surviving and one-hit-Core Pulse previews
- Pulse damage, Core damage, range, energy cost and all other combat values remain unchanged

## v0.90 changes

- Rally aiming now calculates the exact HP that will actually be restored to every affected allied unit before release
- the aiming label reports total effective healing and the number of allies whose six-second tempo boost will be added or refreshed
- a fully redundant Rally cast remains legal but is surfaced in amber as KEIN BONUS instead of looking equally valuable
- affected allies receive compact heal and tempo markers so full-health or already-boosted targets can be distinguished from units that will materially benefit
- Rally heal strength and tempo duration now live on the card definition and are reused by both preview and execution
- Rally execution consumes the shared preview deltas, keeping the displayed healing result and the committed combat result aligned
- dedicated regression coverage verifies capped healing, full-health targets and already-active tempo states
- Rally healing, tempo duration, radius, energy cost and all other combat values remain unchanged

## v0.91 changes

- Stasis aiming now distinguishes targets whose slow state will actually change from targets already carrying the full Stasis effect
- the aiming label reports WIRKSAM and BEREITS VOLL counts instead of presenting every target as equally valuable
- a Stasis cast aimed only at already fully slowed enemies remains legal but is surfaced in amber to warn about a low-value timing window
- fully saturated Stasis targets receive a compact neutral marker while targets that will be newly slowed or refreshed retain the normal blue targeting emphasis
- Stasis preview computes the exact post-cast slow duration and slow factor for each target
- Stasis execution now consumes those shared preview outcomes, preventing preview and committed crowd-control state from drifting apart
- dedicated regression coverage includes a fresh target, a partially expired slow and an already fully applied Stasis target
- Stasis duration, slow factor, radius, energy cost and all other combat values remain unchanged

## v0.92 changes

- unit aiming now uses an engine-owned deployment preview instead of assuming every card inserts exactly at the pointer
- Swarm displays all three real insertion points before release rather than representing the card as one generic unit ghost
- each projected Swarm member shows its own attack footprint and any supply-boundary correction applied to its actual spawn position
- the aiming label reports the real multi-unit count for cards that deploy more than one unit
- single-unit cards continue to use the existing unit ghost, now positioned from the same shared deployment preview used by simulation
- committed deployment consumes the exact preview coordinates, including per-member frontline clamping when a Swarm crosses a column boundary
- dedicated regression coverage verifies that previewed Swarm coordinates exactly match spawned units and still obey connected supply
- unit counts, spacing, attack ranges, energy costs and all combat values remain unchanged

## v0.93 changes

- deployment preview now keeps both the requested formation point and the legal resolved spawn point for every unit
- Swarm aiming distinguishes ordinary three-unit spacing from a real automatic correction caused by a battlefield edge or a stricter connected-supply frontline in another column
- corrected members are marked with an amber origin ring, displacement line and landing arrow instead of drawing misleading lines from the pointer for every normal formation offset
- the aiming label reports FORMATION ANGEPASST with the exact number of members that will be repositioned before deployment
- valid but corrected placements use amber feedback so the player can reposition before committing without blocking a legal deployment
- committed unit deployment still consumes the exact resolved preview coordinates
- regression coverage verifies both cross-column supply correction and board-edge correction while preserving unadjusted single-unit placements
- deployment legality, Swarm spacing, unit counts, energy costs and all combat values remain unchanged

## v0.94 changes

- multi-unit deployment aiming now renders one real unit ghost for every member that will be inserted
- Swarm therefore shows three recognizable drone silhouettes at the exact shared-preview spawn coordinates instead of relying only on abstract range circles
- preview ghost sizes now match the live battlefield renderer, including the smaller Swarm drones and larger Bulwark silhouette
- members corrected by supply or board limits use amber ghost tint while ordinary legal formation members remain mint
- invalid deployment keeps the existing coral feedback across every projected member
- all deployment ghosts are hidden together on aim cancel, selection change and normal redraw cleanup so stale formation silhouettes cannot remain on screen
- gameplay, deployment coordinates, unit counts, energy costs and all combat values remain unchanged

## v0.95 changes

- Pulse preview now computes the exact shield damage and HP damage that will be applied to every affected enemy
- the aiming label reports aggregate SCHILD and HP damage before the existing knockout and Core-break indicators
- shielded Pulse targets receive a compact blue shield-impact arc so absorbed damage is visually distinct from direct health damage
- lethal detection is now derived from the same projected post-hit HP outcome instead of a separate health-plus-shield comparison
- committed Pulse unit damage now reads the damage value from the Pulse card definition instead of the remaining hard-coded 85
- dedicated regression coverage verifies that a 30-shield target absorbs 30 damage, takes 55 HP damage and finishes at the exact previewed health
- Pulse damage, radius, Core damage, energy cost and all combat balance values remain unchanged

## v0.96 changes

- Lancer's 60% bonus damage against the enemy Core now lives on the Lancer card definition instead of a hard-coded combat branch
- Core attack resolution reads the optional per-card Core damage multiplier, leaving ordinary units at the default 1.0 multiplier
- the existing Lancer balance remains exactly 48 base damage multiplied by 1.6 when firing at a Core
- dedicated regression coverage verifies that the real Core HP loss equals the Lancer card's configured multiplier
- Lancer health, range, speed, fire interval, energy cost and all other combat values remain unchanged

## v0.97 changes

- Medic support healing is now defined on the Medic card: 19 HP, 100 support range, 1.1-second support interval and 65-unit follow distance
- Medic runtime healing and ally-follow behavior consume those shared card values instead of separate hard-coded numbers
- dedicated regression coverage verifies the exact configured Medic heal amount and cooldown applied by the real simulation
- the v0.96 Lancer Core regression is hardened to restore the real 48 damage and 135 range after the static test helper neutralizes combat stats
- the Lancer regression now proves an actual 76.8 Core hit from the configured 1.6 multiplier instead of allowing a zero-damage false positive
- Medic and Lancer balance values remain unchanged

## v0.98 changes

- Rally and NOVA now share explicit non-stacking tempo constants instead of relying on hidden 1.25 and 1.3 multipliers inside movement and cooldown code
- the shared tempo status remains +25% movement speed and +30% attack speed
- Rally exposes both multipliers on its card definition and now states the exact percentages in its player-facing description
- NOVA exposes the same shared multipliers on its commander definition, matching its existing description and the simulation
- movement and attack-cooldown resolution consume the shared tempo constants, keeping Rally and NOVA mechanically identical as intended
- the existing Disruptor + Rally regression now derives expected movement from Rally card data instead of a hard-coded 0.75 result
- dedicated coverage verifies the Rally attack-speed multiplier against the real cooldown update
- healing, duration, cooldowns, energy costs and all other balance values remain unchanged

## v0.99 changes

- selected tactical cards now show their actual configured effect values in the mobile match HUD instead of the generic “hold to aim” hint
- Pulse shows 85 damage and 45 Core damage
- Rally shows +65 HP, +25% movement, +30% attack speed and the 6-second duration
- Stasis shows the 40% movement reduction, 4-second duration and zero-damage nature
- Repulsor shows the 55-unit push distance and zero-damage nature
- the hint formatter reads directly from card data, so future balance changes automatically update the player-facing values
- dedicated tests cover all four tactical cards plus unit and empty-selection fallback behavior
- aiming controls, combat values, energy costs and deployment rules remain unchanged

## v1.00 changes

- Repulsor preview now reports the effective displacement distance for every affected unit instead of only its final coordinates
- preview results distinguish full movement, boundary-clamped movement and completely blocked movement
- the aim label now reports moved, shortened and blocked targets with `VERSCHOBEN N`, `GEKÜRZT N` and `BLOCKIERT N`
- a legal Repulsor cast that cannot move any affected target is highlighted as wasteful instead of looking fully effective
- fully blocked targets receive a neutral blocked marker while useful push arrows continue to show the exact landing position
- Repulsor execution still consumes the exact preview coordinates, preserving preview/execution parity
- regression coverage verifies a full 55-unit push, a partially clamped push and a zero-distance boundary block
- no Repulsor balance values or energy costs changed

## v1.01 changes

- specialist unit selection now exposes the exact configured values directly in the mobile match HUD
- Pioneer shows its +50% capture bonus plus HP and damage
- Breaker shows 45 shield break, 18 damage and 160 HP
- Lancer shows 48 damage, +60% Core damage and 135 range
- Medic shows +19 HP, 100 heal range and its 1.1-second heal interval
- Mortar shows 40 direct damage, 28 splash damage and 42 splash radius
- Disruptor shows 12 damage, 40% movement slow and 2-second duration
- every specialist hint is generated from the card definition, so balance changes automatically update the HUD
- ordinary unit descriptions and all combat values remain unchanged


### Versioning

- `package.json` is the release-version source of truth
- `npm run version:sync` maps package `1.2.0` to Frontline `v1.02`, iOS `1.02` and native build `102`
- `npm run ios:sync` performs this synchronization before every native build
- CI verifies that README and the Xcode project cannot silently drift from the package release

## v1.02 changes

- Breaker now emits its dedicated specialist impact effect only when a hit actually removes enemy shield
- the old generic shield pulse on Breaker attacks is replaced by a distinct angular shield-break visual so shield removal cannot be mistaken for shield gain
- Pioneer now emits its dedicated capture-specialist pulse when its configured capture multiplier contributes to a completed point capture
- ordinary captures keep the normal capture effect and do not emit Pioneer feedback
- both specialist effects were already part of the effect model but were previously never produced by the simulation
- regression coverage verifies Breaker shield removal/effect gating and Pioneer accelerated capture/effect gating
- Breaker damage, shield break, Pioneer capture speed and all other balance values remain unchanged

## v1.03 changes

- Core turret damage, range and fire interval now live in explicit shared engine constants instead of mixing exported data with hidden magic numbers
- the unchanged turret values are 24 damage, 160 range and a 1-second fire interval
- the simulation consumes those shared values for targeting and cooldown timing
- when an opposing live unit enters a Core turret's actual range, the arena now reveals a subtle defense perimeter around that Core
- dedicated regression coverage verifies the exact range edge, out-of-range behavior, damage and repeat-fire timing
- the iPhone workflow no longer hardcodes a specific release number when validating the packaged IPA; it compares the built app against the current Xcode release/build settings
- release version is now v1.03 / package 1.3.0 / iOS 1.03 (103)
- no Core turret balance values changed


## v1.04 changes

- Core turrets now share one deterministic target selector with the arena renderer
- a thin sight line and open corner brackets reveal the closest live enemy currently targeted by each Core, including during reload
- target selection ignores allies, defeated units, destroyed Cores and ended matches; equal-distance ties use the unit ID
- destroyed Cores can no longer retaliate after taking lethal unit damage in the same simulation tick
- regression coverage checks actual fire against the preview target, ties, retargeting, range boundaries and lethal Core attacks for both teams
- turret damage, range and fire interval remain unchanged
- release version is v1.04 / package 1.4.0 / iOS 1.04 (104)

## v1.05 changes

- Headquarters now opens a mobile isometric construction map with 25 plots, a fixed central command building, zoom and selectable structures
- Five building families can be placed on free plots, relocated and expanded into their existing second-tier projects
- Buildings have distinct original vector artwork; the command structure gains visible additions with campaign stage
- Every placement and relocation requires confirmation; occupied plots and the command plot cannot be built over
- Existing campaign, mastery and learning requirements still unlock construction, with no new currency, timers or combat advantages
- Saved layouts persist across matches and portable backups; older saves receive a collision-free default arrangement without losing projects
- If saving fails, construction is not committed in memory and the existing base is preserved
- The lobby miniature now shows the actual saved arrangement
- Release: package 1.5.0 / v1.05 / iOS 1.05 (105)

## v1.06 changes

- the mobile headquarters builder now supports plot-first construction: tap a free plot, choose any eligible unbuilt tier-one building, then confirm it directly on that remembered plot
- a remembered free plot stays visibly selected while browsing locked tier-one buildings, so players can compare requirements without losing their intended location
- selecting an existing building or the fixed command plot clears the remembered free-plot intent to avoid accidental construction
- zoomed base-map scroll position survives builder redraws, so selecting plots or catalog entries no longer jumps the enlarged map back to its origin
- construction and relocation availability are now shared pure helpers used by both the UI and the mutation functions, preventing preview/commit rule drift
- regression coverage checks command-plot rejection, occupied plots, progression requirements, upgrade location rules and move availability through the same helpers
- release: package 1.6.0 / v1.06 / iOS 1.06 (106)

## v1.07 changes

- every player-built headquarters structure now has a persistent two-way isometric facing
- built structures can be rotated directly from the mobile inspector with one DREHEN action; the new facing is saved immediately and rolls back safely if storage fails
- facing is cosmetic only and never changes construction requirements, progression, combat values or occupied plots
- relocation, upgrades, later matches and the lobby miniature preserve each building's facing
- portable save backup and restore now preserve facing together with project progression and plot positions
- old saves remain unchanged because the default facing is implicit and adds no new required save field
- malformed or unbuilt facing entries are removed during normal save normalization
- regression coverage verifies rotate, rotate-back-to-default, move, upgrade, JSON roundtrip and backup restore behavior
- release: package 1.7.0 / v1.07 / iOS 1.07 (107)

## v1.08 changes

- the headquarters map now generates an automatic road network from every built structure to the fixed command center
- roads follow the same 5×5 construction grid as building placement and update immediately when structures are relocated
- shared route sections are deduplicated into one clean network instead of drawing overlapping duplicate roads
- route geometry is deterministic and independent of render order, save history or building facing
- intersections receive compact road nodes while a restrained center marking keeps the isometric base readable behind structures
- roads are renderer-only and do not create movement bonuses, build requirements, timers or combat effects
- regression coverage verifies the exact default network, adjacency of every road segment, deduplication, command-center reachability and relocation updates
- release: package 1.8.0 / v1.08 / iOS 1.08 (108)

## v1.09 changes

- the headquarters now feels active instead of static: up to three small supply convoys travel continuously between built structures and the command center
- convoy paths use the exact same deterministic grid routes that generate the v1.08 road network, so vehicles never cut across terrain or ignore a relocated building
- traffic selection is deterministic from the built base layout and requires no timers, currency or persistent simulation state
- each convoy receives a stable route-dependent duration and staggered start so traffic does not stack into one visual blob
- the lobby miniature and full builder both inherit the same live road activity from the saved layout
- reduced-motion preference removes moving traffic entirely while keeping the road network and buildings visible
- logistics activity is renderer-only and has no effect on construction, progression or combat
- regression coverage verifies exact convoy routes, command-center termination, invalid-route rejection and adjacency of every movement segment
- release: package 1.9.0 / v1.09 / iOS 1.09 (109)

## v1.10 changes

- combat hits now produce immediate unit hit-flash and a small impact squash instead of relying only on projectile lines and health bars
- heavy impacts trigger a restrained camera impulse while ordinary chip damage stays steady, keeping repeated fire readable
- unit K.O. effects now scale from the defeated unit's actual collision radius, so Bulwark-sized units break apart with visibly more weight than light infantry
- K.O. bursts gain an expanding shock ring, ground ellipse and ten deterministic debris shards while retaining team-color readability
- Core impacts keep their existing stronger camera response and remain visually distinct from ordinary unit damage
- players using reduced-motion preferences receive no new camera shake from impacts or K.O.s
- all combat balance, damage, health, attack timing and targeting rules remain unchanged
- regression coverage verifies size-aware lethal effect radius and duration for standard and heavy units
- release: package 1.10.0 / v1.10 / iOS 1.10 (110)

## v1.11 changes

- Core impact feedback now scales from the damage that actually reached the Core instead of rendering every hit with identical weight
- Lancer's boosted Core strike therefore produces a larger impact ring, more rays and stronger camera response than Pulse's smaller Core hit
- finishing blows only visualize the damage that was actually applied to the remaining Core HP, avoiding exaggerated overkill feedback
- the Core model itself now reacts with a weight-scaled flash and an additional outer shock ring for heavier impacts
- simultaneous Core effects select the strongest active hit for the structure flash so large strikes are not visually hidden by smaller ones
- reduced-motion preference continues to suppress all camera shake while preserving readable impact rings and flashes
- damage, targeting, Core HP and all combat balance remain unchanged
- regression coverage checks Lancer, Pulse and low-HP finishing impact weights against exact applied damage
- release: package 1.11.0 / v1.11 / iOS 1.11 (111)

## v1.12 changes

- Commander abilities now expose an exact pre-activation outcome in the match HUD instead of only showing BEREIT
- ATLAS reports affected troops and the exact total new shield points that will be added; a fully shielded force is identified as a duration refresh
- LYRA reports exact effective HP restoration after max-HP clamping plus the exact number of slows that will be cleansed
- NOVA reports the exact number of troops whose tempo duration will be started or refreshed and keeps the shared 6-second duration visible
- Commander tooltip and accessibility label carry the same live outcome text as the visible button
- the engine and HUD now consume the same per-unit Commander eligibility/outcome helper, preventing preview/execution drift
- successful Commander toast messages echo the calculated result so activation feedback confirms what was applied
- regression coverage checks exact aggregate outcomes and verifies LYRA, ATLAS and NOVA execution against the shared preview rules
- release: package 1.12.0 / v1.12 / iOS 1.12 (112)

## v1.13 changes

- important combat outcomes now surface as compact floating numbers directly in the arena instead of requiring players to infer every result from health bars
- damage text is intentionally limited to heavy unit hits of 35+ applied damage; frequent chip fire stays clean and readable
- Core hits of 35+ show their actual applied damage, including Lancer's boosted Core strike and clamped finishing blows
- effective healing of 30+ and ATLAS shield gains of 20+ are shown at the affected unit; low Medic ticks remain visual-only to avoid number spam
- floating values come from the same post-clamp values already resolved by the engine, so shields, max HP and low remaining Core HP cannot overstate a result
- at most five high-signal values render simultaneously; newest events win when the battlefield is busy
- reduced-motion mode keeps the values readable but removes their upward float and scale pulse
- regression coverage verifies applied damage, Core damage, Rally healing, Medic healing and Commander shield/heal values on the emitted effects
- release: package 1.13.0 / v1.13 / iOS 1.13 (113)

## v1.14 changes

- control points now expose the exact live capture pressure instead of only a raw percentage ring
- active capture labels show percentage, estimated seconds remaining and the effective capture-speed multiplier from group support plus specialist bonus
- contested sectors show the exact nearby troop split, e.g. KAMPF 2:1, while progress remains frozen
- enemy counter-pressure is distinguished from passive progress decay so players can read whether a capture is actively being reversed or merely fading
- active pressure gains an outer team-colored push arc and up to three troop pips without obscuring the existing ownership ring
- the previous hidden 15% group support and 18%/s passive decay values are now shared exported constants
- simulation and renderer consume the same controlPointPressure calculation, preventing capture-speed and ETA drift
- regression coverage verifies Pioneer + group multiplier, exact ETA, contest freeze, counter-capture rate, passive decay and final ownership using the shared calculation
- release: package 1.14.0 / v1.14 / iOS 1.14 (114)

## v1.15 changes

- completed captures now emit an exact frontline-shift event whenever connected deployment territory changes
- the affected column briefly shows the previous boundary, the new boundary and a team-colored movement band instead of silently snapping the deployment edge
- floating frontline feedback distinguishes VORRÜCKEN from RÜCKZUG and reports the exact connected-sector change
- supply-chain collapses can report multiple lost sectors at once, e.g. RÜCKZUG −3 SEKTOREN, rather than pretending every capture changes the front by one step
- the renderer receives the real old/new frontline coordinates from the engine, so the visual band cannot drift from actual deployment legality
- frontline depth and edge calculation are now a shared pure helper used by Match.frontline and regression tests
- reduced-motion mode keeps the old/new boundaries and text while removing the moving chevron travel
- regression coverage verifies one-sector advance, three-sector connected-territory collapse, exact event coordinates, column clamping and team symmetry
- release: package 1.15.0 / v1.15 / iOS 1.15 (115)

## v1.16 changes

- selecting any unit card now reveals the exact legal deployment area as three separate supply columns instead of only a broad green territory wash
- each column shows EINSATZ 1/3, 2/3 or 3/3 together with its exact connected FRONT depth, making asymmetric supply immediately readable
- the legal area receives a restrained tactical grid and a brighter exact boundary while the rest of the arena stays visually quiet
- columns with collapsed supply remain visibly shallow rather than implying that territory in neighboring columns grants deployment rights
- deployment-column geometry is now a shared engine helper used by the renderer and validated against Match.canDeploy at every exact front edge
- board-side deployment limits now consume the same exported column-bound constants instead of separate 18/402 magic values
- enemy deployment geometry is covered by the same symmetric helper even though only the local player's placement overlay is shown interactively
- regression coverage verifies initial column geometry, asymmetric 2/3 and 3/3 advances, exact legal front edges and outer board rejection
- release: package 1.16.0 / v1.16 / iOS 1.16 (116)

## v1.17 changes

- attack effects now carry the actual attacking card identity into the renderer instead of presenting every attack as the same generic tracer
- close-range Vanguard, Bulwark, Swarm, Breaker, Raider and Pioneer attacks render as compact directional slashes rather than fake projectiles
- Ranger uses a fast precision tracer with a restrained target lock; Lancer uses a brighter long rail-like streak and larger lock
- Mortar shells follow a visible parabolic arc with smoke puffs and a heavier terminal ring while damage timing remains unchanged
- Disruptor shots use a short electrical zig-zag trail; Sentinel rounds use a slower heavy pulse; Core turrets have their own concentrated beam treatment
- muzzle flashes, unit recoil and impact feedback remain compatible with the existing v1.10-v1.13 hit-response system
- all projectile travel remains presentation-only: attack interval, damage application, targeting and balance are unchanged
- regression coverage verifies that ranged, melee and Core-turret shot events preserve their exact source identity and target coordinates
- release: package 1.17.0 / v1.17 / iOS 1.17 (117)

## v1.18 changes

- weapon identity now survives the full combat-feedback chain: shot, applied impact, lethal K.O. and Core hit all retain the actual source card
- Ranger impacts use a tight precision cross instead of a generic burst; Lancer rail hits gain wider white shock ellipses
- Mortar impacts receive a warmer expanding blast, debris and a larger K.O. debris field; Disruptor impacts close with an electrical ring
- Sentinel rounds land with layered heavy shock rings while Core-turret hits use a compact concentrated beam impact
- Breaker keeps its dedicated shield-break feedback and now also receives a distinct breach-style X impact; ordinary melee uses restrained directional sparks
- Pulse damage carries its source identity into unit deaths and Core impacts instead of falling back to generic hit styling
- camera impulse remains damage-aware but now receives a small cosmetic weapon-profile multiplier; reduced-motion still suppresses all camera shake
- all impact profiles are pure presentation data and do not alter damage, attack interval, targeting, projectile timing, shields or HP
- regression coverage verifies weapon-profile mapping plus exact source propagation through impact, death, Core-hit and Core-turret damage events
- release: package 1.18.0 / v1.18 / iOS 1.18 (118)

## v1.19 changes

- units now preserve a stable horizontal facing and visibly turn toward meaningful movement or the exact target of their current attack
- active attacks override travel facing, so a unit that is still drifting one way can immediately present its weapon toward the actual target
- near-vertical movement keeps the last facing instead of rapidly flipping on tiny horizontal jitter
- moving units gain restrained ground dust/trail marks based on their real movement vector, while a short settle ellipse marks an abrupt stop
- attack stance now adds a subtle width/height compression on top of the existing recoil instead of relying on translation alone
- horizontal travel adds a very small directional body lean while the existing walk bob remains intact
- reduced-motion mode keeps target-facing information but removes walk bob, directional lean, dust and stop-settle animation
- movement sampling and trail geometry are isolated in a pure helper with regression coverage for travel facing, target override, vertical preservation, stop detection and trail direction
- all changes are presentation-only: speed, pathfinding, targeting, attack timing, collision and combat balance remain unchanged
- release: package 1.19.0 / v1.19 / iOS 1.19 (119)

## v1.20 changes

- unit HP bars now preserve the previous health briefly after a hit and then trail down, making burst damage readable instead of instantly replacing the old value
- healing snaps both current and trailing HP directly upward so recovery can never be misread as pending damage
- shields now receive their own compact bar above HP while retaining the existing shield ring and duration pips
- shield damage has an independent faster trail, clearly separating absorbed damage from real HP loss
- ATLAS shield gain snaps the shield bar up immediately while later shield loss remains visible for a short moment
- trail state is renderer-only and automatically removed when a unit dies or a new match replaces the current scene
- a pure unit-vitals sampler centralizes hold, easing, clamping and heal/shield-gain behavior instead of embedding timing math in the renderer
- regression coverage verifies HP damage hold/easing, healing snap, shield damage/gain and malformed-value clamping
- release: package 1.20.0 / v1.20 / iOS 1.20 (120)

## v1.21 changes

- Core-destruction match endings now use the existing 850 ms result delay as an arena-wide finish sequence instead of leaving the battlefield visually static before the result modal
- victory, defeat and simultaneous-Core draw states receive distinct FRONT DURCHBROCHEN, STELLUNG GEFALLEN or BEIDE CORES GEFALLEN messaging derived from the actual final MatchState
- the destroyed Core is emphasized with expanding concentric rings while a team-colored sweep travels from the broken position toward the center of the arena
- simultaneous Core destruction uses a neutral center-collapse treatment rather than incorrectly favoring either side
- the finish sequence adds a restrained arena vignette and directional chevrons while preserving all existing unit, impact and destroyed-Core rendering beneath it
- no additional result delay was introduced; the existing finish timing and all match logic remain unchanged
- reduced-motion mode keeps the static end-state boundaries and text but removes the moving sweep, scaling entrance and Core-destruction camera shake
- a pure matchEndVisual helper centralizes outcome wording/focus with regression coverage for victory, defeat, simultaneous Core destruction and non-Core endings
- release: package 1.21.0 / v1.21 / iOS 1.21 (121)

## v1.22 changes

- the existing three-second pre-match countdown is now a staged battlefield synchronization sequence instead of three isolated numbers
- second 3 performs a CORE-LINK system check, confirms both Cores online and visually scans the tactical HUD
- second 2 switches to SUPPLY-LINK and confirms all three deployment columns, with synchronized three-lane status bars
- second 1 performs a KOMMANDO-LINK between the actual selected player and enemy Commanders before abilities become usable
- LOS inherits the current objective: Core matches show CORE BRECHEN while control matches show RELAIS SICHERN
- Daily Front matches identify themselves during the first Core-link phase without adding another modal or delaying control
- the sequence reuses the existing 3000 ms preparation and 650 ms LOS window, so match timing, energy generation and first-action timing remain unchanged
- reduced-motion keeps every phase, number and status message but disables scan, lane pulse and scale animations
- a pure matchStartVisual helper centralizes phase timing and wording with boundary, objective, Daily Front, Commander and malformed-time regression coverage
- release: package 1.22.0 / v1.22 / iOS 1.22 (122)

## v1.23 changes

- standard Core matches now receive a dedicated overtime presentation instead of silently switching the timer label after regulation
- the existing 45-second overtime window opens with a VERLÄNGERUNG transition, then settles into a persistent SUDDEN DEATH arena treatment
- the final ten seconds switch to LETZTER DRUCK with exact remaining-second text and stronger visual pressure
- the arena gains a restrained overtime vignette, central pressure line, inward chevrons and a tightening frame without hiding units, capture state or deployment geometry
- reduced-motion keeps all wording, countdown context and static pressure framing while removing pulse and travel motion
- the previous NÄCHSTER VORTEIL ENTSCHEIDET copy is corrected to 45 SEKUNDEN · CORE ODER SCHLUSSWERTUNG, matching the actual engine rule
- overtime presentation is derived by a pure matchOvertimeVisual helper and does not modify the existing 180-second regulation, 45-second extension, score resolution or Core-destruction behavior
- regression coverage verifies hidden/entry/pressure/final phases, exact remaining time, phase boundaries and malformed-time clamping
- release: package 1.23.0 / v1.23 / iOS 1.23 (123)

## v1.24 changes

- the post-match modal now opens with one compact ENTSCHEIDUNG score strip instead of forcing players to infer the deciding tiebreak from scattered stats
- Core destruction, completed relay objective, time-limit control advantage, Core-HP advantage and territory advantage each receive an explicit final-decision label
- the strip shows the final DU vs GEGNER values for RELAIS when relevant, CORE and GEBIET, while highlighting only the metric that actually decided the match
- simultaneous Core destruction, simultaneous control completion and full score ties stay visually neutral instead of implying a false winning metric
- Core percentages are clamped from the actual final HP state; control time is shown to one decimal and territory uses the exact final owners
- the decision helper consumes the engine's final winner/reason plus final state rather than re-running a separate scoring approximation in the UI
- the existing final-front map, progression rewards, mastery, comparison, rematch actions and feedback remain unchanged below the new strip
- regression coverage verifies immediate Core wins, control-objective wins, all three time-limit tiebreak layers and neutral draw handling
- release: package 1.24.0 / v1.24 / iOS 1.24 (124)



## v1.25 changes

- Control-objective relays now communicate live pressure as a dedicated battlefield signal instead of relying mainly on the small sector status text
- active captures receive a team-colored progress sweep around the relay, with a brighter terminal marker that makes direction and completion readable at a glance
- captures above 75% enter a critical visual state with stronger objective framing and radial pressure marks without changing capture speed
- reverse captures use the pushing team's color plus a neutral counter-arc, clearly separating undoing enemy progress from ordinary forward capture
- contested relays split their outer signal between player and enemy colors and add neutral cardinal pressure marks, while the existing KAMPF count remains intact
- decaying capture progress becomes a segmented fading relay signal rather than looking like an active push
- reduced-motion preserves every objective state and static emphasis while suppressing rotating or travelling pressure motion
- a pure controlPointVisual helper centralizes objective presentation with regression coverage for hidden, capture, critical, contested, reverse, decay and held states
- all changes are presentation-only: capture radius, capture rates, group bonuses, supply, ownership and win conditions are unchanged
- release: package 1.25.0 / v1.25 / iOS 1.25 (125)

## v1.26 changes

- Core danger is now derived from one shared pressure helper instead of using 30% in the arena and 25% in the HUD
- both Cores receive persistent HUD pressure states: damaged, critical and destroyed, rather than relying only on one-time announcements
- the local Core enters CORE KRITISCH at the same 30% threshold used by the arena model; the enemy Core exposes a DURCHBRUCHFENSTER at the same point
- the enemy critical transition now receives its own one-time battle callout, while the local critical transition retains the defensive danger treatment
- percentage display, accessibility labels, persistent status text and arena damage visuals consume the same normalized Core state
- malformed HP/max-HP values are clamped safely in the pure helper so presentation can never emit impossible percentages
- critical health tracks pulse only in normal-motion mode; reduced-motion keeps the same wording and static emphasis without animation
- no Core HP, damage, turret, scoring or match-ending rules changed
- regression coverage verifies exact 60% damaged and 30% critical thresholds, 0% destruction, clamping and player/enemy labels
- release: package 1.26.0 / v1.26 / iOS 1.26 (126)



## v1.27 changes

- every match ending now receives the same focused 850 ms battlefield conclusion before the result modal instead of reserving the cinematic pause for Core destruction
- completed control objectives use the exact configured relay points as the finish focus, with linked team-colored objective rings instead of a generic center flash
- time-limit control decisions reuse those relay locations but present the outcome as held control rather than falsely implying a completed objective
- Core-HP tiebreaks frame both surviving Cores and visualize their actual remaining HP around each structure before the verdict appears
- territory tiebreaks emphasize all nine live sectors and visually prioritize the winning side's owned ground
- simultaneous control completion and full score ties keep neutral wording and center-focused presentation rather than implying a false winner
- end-of-match banner wording now comes from the same matchEndVisual helper as the arena overlay, preventing Core, relay and score-result copy from drifting apart
- the 850 ms finish window is now a shared constant consumed by both arena presentation and result-modal timing
- reduced-motion keeps the complete final decision wording and static focus geometry while skipping entrance travel and scale motion
- match simulation, winner selection, tiebreak ordering, Core HP, control time and territory ownership are unchanged
- regression coverage now verifies Core endings, relay victory/defeat/draw, control-time, Core-HP, territory, full ties and the shared finish duration
- release: package 1.27.0 / v1.27 / iOS 1.27 (127)

## v1.28 changes

- every card now exposes a live readiness strip derived from current energy versus its exact cost instead of switching only between dimmed and affordable
- unaffordable cards show proportional progress toward their own cost, so a 4-energy card at 2 energy visibly reads as halfway ready while cheaper cards can already be available
- cards flash once when regenerated energy crosses their actual affordability threshold; initial match setup does not trigger a false ready cascade
- selecting an unaffordable card keeps the existing wait message but now includes exact readiness percentage from the same shared calculation
- successful plays show the real post-engine energy spend beside the resource counter and briefly emphasize the segmented energy track
- failed plays never emit spend feedback, and the spend display uses before/after engine energy rather than trusting card metadata
- accessibility labels now state whether a card is ready or include exact missing energy and estimated wait time
- a pure energyReadiness/energySpent helper centralizes clamping, progress, missing energy and wait-time math with malformed-value regression coverage
- reduced-motion keeps static readiness information and spend value while suppressing ready/spend animations
- energy cap, regeneration rate, card costs and all gameplay balance remain unchanged
- release: package 1.28.0 / v1.28 / iOS 1.28 (128)

## v1.29 changes

- native iPhone builds now use Capacitor Haptics for tactile feedback while the browser build remains a safe no-op
- card selection uses a light impact, unit deployment a medium impact and Commander or targeted ability activation a heavy impact
- successful captures and victories use success notification feedback; lost sectors and local Core danger use warning feedback; invalid actions and defeats use error feedback
- enemy Commander activations also trigger a warning cue so important hostile abilities can be felt when visual attention is on another lane
- enemy Core critical pressure uses a strong opportunity cue while the persistent DURCHBRUCHFENSTER HUD state remains visible
- routine auto-attacks, projectile impacts, healing ticks and movement never trigger haptics, preventing vibration spam during dense fights
- the haptic wrapper executes only on a native Capacitor platform and safely degrades if the device cannot provide Taptic feedback
- haptic cue mapping is centralized and regression-tested so UI call sites cannot silently change intensity semantics
- @capacitor/haptics is synced as a native dependency; gameplay, timing, damage, capture and scoring rules are unchanged
- release: package 1.29.0 / v1.29 / iOS 1.29 (129)



## v1.30 changes

- Commander activation now creates one formation-level battlefield signature in addition to the existing per-unit shield, heal or tempo effects
- the signature is centered on the actual affected troops and expands only far enough to frame their real formation rather than using a fixed full-arena animation
- ATLAS projects a layered hexagonal Aegis lattice with radial shield braces, making the team-wide protection event visually distinct from ordinary unit shields
- NOVA sends directional command chevrons through the formation toward the enemy front, reinforcing that STURMSIGNAL is an offensive tempo activation
- LYRA emits a repair ring, central medical cross and orbiting repair nodes instead of looking like several unrelated healing ticks
- player and enemy activations use the same geometry with team-aware attack direction, so hostile Commander use remains readable without inventing different mechanics
- formation center and radius are derived from the exact units accepted by the same Commander eligibility calculation used for execution
- reduced-motion keeps each Commander's distinct static identity while removing travelling chevrons and orbital motion
- existing per-unit status effects, cooldowns, healing, shields, tempo values, haptics and balance are unchanged
- a pure commanderActivationVisual helper sanitizes timing and geometry and regression coverage verifies all three identities plus real engine cue emission
- release: package 1.30.0 / v1.30 / iOS 1.30 (130)


## v1.31 changes

- unit damage now carries the real attack origin into presentation events so hit response can follow the direction the damage actually came from
- living units visually kick a few pixels away from the source of a hit, lean with the impact and compress slightly instead of reacting only with a generic scale flash
- reaction strength is derived from the existing applied-damage impact radius and remaining effect lifetime, so heavy hits feel weightier without changing damage or knockback
- direct attacks use the attacking unit as their visual source, Core turret hits use the Core, Pulse uses the cast center and splash damage radiates from the blast center
- the underlying unit coordinates never move from this feedback; pathfinding, capture position, collision, target selection and simulation remain exactly unchanged
- reduced-motion keeps the existing hit flash and restrained scale response while suppressing directional translation and tilt
- impact events expose optional source coordinates only for presentation and remain backwards-compatible when a source is unavailable
- a pure unitHitReaction helper centralizes direction, strength, scale and malformed-value clamping
- regression coverage verifies left/right and vertical impact direction, neutral fallback and real Pulse source propagation through the engine
- release: package 1.31.0 / v1.31 / iOS 1.31 (131)


## v1.32 changes

- Core turret targeting now exposes its exact internal cooldown to presentation through a read-only Match accessor instead of showing a permanently identical lock state
- the existing sight line strengthens as the real one-second turret reload approaches readiness
- target brackets contract through reload and tracking, then switch to a high-contrast lock state shortly before the next shot
- each Core now draws a compact radial charge arc around the turret body using the same shared CORE_TURRET_INTERVAL that drives combat
- the final lock phase adds a restrained target ring and center pip, making incoming Core fire readable before the projectile appears
- player and enemy turrets use the same timing model and presentation rules; nearest-target selection remains unchanged
- reduced-motion keeps exact static reload progress and lock state while suppressing animated pulse variation
- turret damage, range, target selection, fire interval and simulation timing are unchanged
- a pure coreTurretVisual helper centralizes phase thresholds, bracket contraction, sight strength and malformed cooldown clamping
- regression coverage verifies shared-interval progress, safe clamping and that the exposed cooldown still follows the existing one-second firing cadence
- release: package 1.32.0 / v1.32 / iOS 1.32 (132)


## v1.33 changes

- Medic support transfer now reads as a real battlefield action instead of only a thin line and endpoint dot
- targeted healing keeps the existing source-to-patient link but layers a compact source emitter, target recovery ring and medical marker over it
- three staggered nanite packets travel from the Medic to the actual patient during the existing heal effect lifetime, giving support actions the same spatial clarity as weapon fire
- packet direction and travel are derived from the exact source and target coordinates already emitted by the simulation; no new targeting logic is introduced
- visual intensity scales conservatively with the applied heal value while the actual healing amount remains completely unchanged
- reduced-motion replaces travelling packets with static transfer nodes while preserving source, target and connection readability
- Rally and Commander healing remain visually distinct because only targeted heal events receive the transfer-link treatment
- a pure healLinkVisual helper centralizes lifetime progress, intensity, packet staging and malformed-value clamping
- regression coverage verifies staged transfer, non-targeted fallback and safe handling of malformed timing/value data
- release: package 1.33.0 / v1.33 / iOS 1.33 (133)


## v1.34 changes

- destroyed units now leave short-lived battlefield scars so intense fights have a visible aftermath instead of resetting visually as soon as the K.O. burst expires
- scars are presentation-only and never participate in collision, pathfinding, targeting, capture or deployment logic
- the finishing weapon profile determines the mark: explosive/heavy/rail kills leave compact crater rings and fractures, electric kills leave residual discharge traces, melee/breach kills leave directional scrape marks and other weapons leave restrained burn marks
- scar size derives from the existing death-effect radius and weapon impact profile rather than introducing new combat data
- marks settle in after the death burst, remain readable for several seconds and then fade out cleanly
- the arena keeps at most 16 marks at once to avoid clutter and rendering growth during long battles
- marks reset immediately with a new Match and pause naturally with the match clock
- reduced-motion requires no alternate motion path because scars are static ground feedback
- a pure battlefieldScarVisual helper centralizes lifetime, fade, radius and weapon-profile styling
- regression coverage verifies settle/hold/fade behavior, source weapon styling and malformed-value clamping
- release: package 1.34.0 / v1.34 / iOS 1.34 (134)


## v1.35 changes

- Core damage now carries the real attack origin into the existing core-hit presentation event
- direct unit attacks use the firing unit position; Pulse uses its actual cast center
- Core impact feedback is no longer purely centered: the struck side of the Core now flashes, arcs and throws directional sparks toward the incoming attack side
- short armor-fracture lines propagate inward from the real impact edge, making flanking and close Core pressure easier to read at a glance
- the original centered weight-based Core flash remains as fallback when a directional source is unavailable or coincides with the Core center
- effect strength still derives from the existing core-hit lifetime and radius; Core HP, damage, range, targeting and end conditions are unchanged
- the new source coordinates are presentation-only and reuse the same optional Effect fields already introduced for unit hit reactions
- a pure coreHitReaction helper centralizes source direction, weight scaling, rim placement and malformed-value handling
- regression coverage verifies vertical and horizontal source direction, neutral fallback and real Pulse source propagation into a core-hit event
- release: package 1.35.0 / v1.35 / iOS 1.35 (135)


## v1.36 changes

- firing units now use weapon-specific attack motion instead of the same generic 3.2 px recoil and scale for every card
- precision fire stays controlled, rail and heavy weapons kick back harder, explosive weapons compress more noticeably, electric weapons use a lighter snap and melee/breach units lunge toward the target instead of recoiling backwards
- the sprite pose still follows the exact existing shot event lifetime, so presentation remains synchronized with real attacks without introducing wind-up or timing changes
- ranged attacks now emit a compact muzzle/energy discharge directly from the firing unit before the existing projectile presentation takes over
- muzzle length, bloom size and ray count derive from the same existing impact profile used by projectile/impact/death feedback
- electric fire adds a restrained forked discharge while rail fire gets a narrower, brighter launch impulse
- melee and breach profiles intentionally draw no muzzle flash and rely on their forward attack lunge plus existing slash feedback
- Reduced Motion still suppresses movement-derived animation while static combat readability remains intact
- damage, fire interval, target selection, projectile travel, hit timing and all balance values are unchanged
- a pure weaponFireFeedback helper centralizes recoil/lunge, pose scale, muzzle geometry and malformed lifetime clamping
- regression coverage verifies heavy-vs-precision recoil, melee forward lunge, lifetime decay and malformed timing fallback
- release: package 1.36.0 / v1.36 / iOS 1.36 (136)


## v1.37 changes

- the Core turret emitter now reacts to its real shot event instead of remaining visually static while the beam launches
- the inner turret head recoils opposite the actual target vector while the outer Core shell stays anchored, keeping hitbox/readability stable
- a short bright launch channel connects the recoiling emitter to the muzzle point before the existing Core beam projectile continues toward the target
- side vents discharge backward from the firing direction and the muzzle gets a compact team-colored flare with a white-hot center
- full motion adds a few directional discharge rays; Reduced Motion keeps the static launch channel and flare but suppresses recoil and ray motion
- feedback strength follows the existing 0.25 s Core turret shot lifetime and uses only the real shot source/target coordinates
- Core turret damage, range, 1 s reload cadence, target selection and projectile timing are unchanged
- a pure coreTurretFireFeedback helper centralizes direction, recoil, muzzle distance, flare size and vent spread
- regression coverage verifies real target direction, lifetime decay and neutral handling for non-turret/malformed shots
- release: package 1.37.0 / v1.37 / iOS 1.37 (137)


## v1.38 changes

- unit K.O. bursts now use the real attack source already carried by death effects instead of always exploding symmetrically
- shards and debris are biased away from the incoming hit direction while preserving part of the existing radial spread so kills still read clearly from every angle
- the bright burst center shifts slightly in the outgoing direction and the main burst ring stretches along that vector
- heavy, explosive and rail K.O.s use an elongated shock ellipse aligned with the impact direction; electric K.O. arcs inherit the same directional bias
- when a source is unavailable or coincides with the destroyed unit, the existing radial K.O. presentation remains unchanged
- battlefield scars, camera shake and weapon-specific death colors remain intact
- the directional effect is presentation-only: destroyed units are never physically displaced and simulation positions, damage, targeting and collision remain unchanged
- a pure deathBurstDirection helper centralizes source vector, lifetime decay, directional bias, stretch and visual offset
- regression coverage verifies source-to-target direction, lifetime decay, radial fallback and malformed timing handling
- release: package 1.38.0 / v1.38 / iOS 1.38 (138)


## v1.39 changes

- shielded units now emit dedicated shield-hit feedback whenever incoming damage is absorbed by active shield points
- the shield flash uses the protected unit's team color rather than the attacker's color, making ownership immediately readable
- when the attack source is known, the struck side of the shield gets a white-hot contact point and inward crack lines aligned to the real incoming vector
- when the last shield point is removed by normal damage, a separate shield-break event expands the hex shell, throws fragments and leaves a short collapse ring
- shield absorption and break strength derive from the actual shield damage already calculated by damageUnit; no damage or mitigation values were changed
- attacks that overflow the shield into HP still keep their existing body-impact feedback, so a shield break plus health hit reads as one layered combat event
- the existing Breaker-specific anti-shield slash remains intact and can layer with the generic shield feedback when appropriate
- missing attack source coordinates fall back to a symmetric shield crack rather than producing invalid direction math
- a pure shieldImpactVisual helper centralizes lifetime, radius, direction, crack reach and fragment reach
- regression coverage verifies absorption vs break styling, real Atlas/Pulse shield-break event emission and malformed-value fallback
- release: package 1.39.0 / v1.39 / iOS 1.39 (139)


## v1.40 changes

- floating combat values now distinguish shield damage from HP damage instead of presenting one ambiguous combined hit value
- shield absorption uses a dedicated team-aware label such as −26 SCH and sits slightly above/left of the body-damage lane
- meaningful HP damage uses a separate −N HP label slightly below/right, so shield overflow can be read as two parts of the same attack without overlapping text
- damageUnit still derives hit radius and impact weight from the full applied damage, but the impact event's numeric value now carries HP damage only while shield-hit carries shield damage
- shield-break itself intentionally emits no second number, avoiding duplicate damage text during the collapse animation
- low chip damage remains suppressed: HP labels start at 20 and shield labels at 15, preserving arena readability during Swarm/low-damage exchanges
- high-signal healing, shield gain, Core damage and frontline labels remain supported and now use explicit HP/SCH suffixes where relevant
- combat-value formatting and label offsets moved into a pure combatValuePresentation helper for regression coverage
- real Atlas + Pulse overflow coverage verifies the engine exposes 70 shield damage and 15 HP overflow separately
- damage, mitigation, shield values, hit radius, camera shake and all balance rules are unchanged
- release: package 1.40.0 / v1.40 / iOS 1.40 (140)


## v1.41 changes

- high-impact ranged units now expose their exact live attack cooldown as a compact weapon-cycle ring under the unit instead of hiding the reload state after each shot
- Lancer and Mortar use the strongest presentation, Sentinel is slightly quieter and Disruptor uses a lighter electric cycle; fast precision/melee units intentionally stay clean to avoid arena clutter
- the ring is driven directly by the real unit.attackCooldown / unit.interval values, so Rally naturally makes the visible cycle complete faster because the simulation already burns cooldown faster
- the completed arc represents real next-shot readiness rather than a cosmetic timer; no duplicate timers or renderer-side combat state were introduced
- the final 18 percent gains a restrained ready highlight and moving pip in full motion, with a static equivalent under Reduced Motion
- small interval ticks make long Lancer/Mortar reloads easier to estimate at a glance without adding text labels
- weapon-cycle colors follow the existing weapon profile language: rail white-blue, explosive amber, heavy warm white and electric cyan
- attack interval, Rally multiplier, target selection, shot timing, damage and all balance values remain unchanged
- a pure weaponCycleVisual helper centralizes supported weapon types, exact charge ratio, prominence, radius, thickness and tick count
- regression coverage verifies exact Lancer/Mortar progress, lower Sentinel/Disruptor prominence, clutter suppression for fast/melee units and malformed cooldown handling
- release: package 1.41.0 / v1.41 / iOS 1.41 (141)


## v1.42 changes

- unit deployment now communicates role and weight instead of using the exact same generic beam/ring for every card
- Bulwark and Sentinel land with a wider, shorter deployment column, heavier sprite settle, broad ground shock ellipse and short outward ground fractures
- Lancer and Mortar use a narrower precision column with lock brackets and a clean concentric targeting ring, reinforcing their siege identity before their first shot
- Swarm uses a smaller, faster arrival footprint with three orbiting deployment nodes rather than a heavy landing shock
- Medic uses a softer support arrival with a compact recovery cross and restrained ring
- all other units retain a cleaned-up standard arrival based on the original beam/ring language
- spawn effects now carry the real card id and unit radius into presentation-only Effect fields, allowing the renderer to choose the matching visual without maintaining duplicate gameplay state
- sprite scale and vertical settle derive from the same spawn effect lifetime; heavy arrivals have a slight landing compression while siege units descend farther
- Reduced Motion freezes Swarm orbit rotation while preserving its three-node identity
- deployment location, initial attack cooldown, energy cost, unit stats, collision, formation placement and spawn duration are unchanged
- a pure deploymentArrivalVisual helper centralizes arrival kind, progress, beam geometry, ring/shock size, sprite scale and vertical offset
- regression coverage verifies heavy/siege/swarm/support differentiation, real spawn metadata propagation, standard fallback and malformed timing handling
- release: package 1.42.0 / v1.42 / iOS 1.42 (142)


## v1.43 changes

- ordinary unit impact effects now use the real incoming attack vector instead of presenting almost every hit as a symmetric radial burst
- the bright contact point appears on the source-facing edge while spark rays and impact wake bias away from the attacker, matching the existing directional unit reaction and K.O. language
- Ranger precision impacts align their strike axis and cross-mark to the actual shot path
- Lancer rail impacts use properly oriented custom ellipses along the real projectile direction instead of fixed horizontal ellipses
- Mortar debris now carries directional momentum away from the blast source while keeping enough radial spread to preserve explosion readability
- Disruptor electrical arcs inherit a lighter directional bias from the incoming discharge
- Sentinel/heavy impacts add a perpendicular compression bar, Core-turret beam impacts keep a short axis trace and Breaker/melee slashes align to the attacker/target relationship
- when source coordinates are missing or coincide with the target, the previous radial/fixed fallback remains available
- no unit is physically moved by these visuals; damage, hit radius, splash, targeting, cooldowns and all balance values are unchanged
- a pure impactDirectionVisual helper centralizes source vector, perpendicular vector, lifetime intensity, directional bias, contact offset and wake length
- regression coverage verifies real source direction, lifetime decay, radial fallback and malformed-value handling
- release: package 1.43.0 / v1.43 / iOS 1.43 (143)


## v1.44 changes

- moving units now communicate weight and role through distinct ground feedback instead of sharing the same generic pair of dust ellipses
- Bulwark and Sentinel leave broader paired dust pads plus short transverse tread marks, making heavy movement feel slower and more planted without changing simulation speed
- Lancer and Mortar use restrained parallel track streaks that reinforce their stabilized siege-platform identity
- Swarm leaves three compact, slightly offset movement wisps rather than full-size dust puffs, preserving its light/fast silhouette
- standard units keep the original two-puff language in a cleaned-up direction-aware form
- stop/settle ground rings now scale by movement class: heavy units produce the broadest footprint, siege units a narrower stable ring and Swarm the smallest
- all trails are derived from the real per-frame motion vector already produced by sampleUnitMotion; no renderer-side velocity or path state is introduced
- Reduced Motion continues to suppress moving trail particles while retaining static readability elsewhere
- movement speed, collision, pathing, unit spacing, Rally speed multiplier, Slow and every balance value are unchanged
- a pure movementFootprintVisual helper centralizes role classification, trail distance, dust strength, footprint geometry and settle dimensions
- regression coverage verifies heavy vs standard weight, siege geometry, compact Swarm movement and malformed-motion fallback
- release: package 1.44.0 / v1.44 / iOS 1.44 (144)


## v1.45 changes

- damaged units now carry a persistent visual damage state instead of looking fully pristine until the existing critical-HP warning ring appears
- below 55 percent HP, units gain restrained armor-scuff lines and low-intensity mechanical spark feedback; heavy/siege units may also begin venting a small smoke puff
- below 30 percent HP, the damage state escalates into denser smoke, more frequent orange-white sparks and a subtle dark/warm ground leak underneath the unit
- Bulwark and Sentinel produce the strongest critical smoke/spark footprint, Lancer/Mortar keep a mechanical siege-style profile and Swarm remains compact so clustered units do not become unreadable
- the existing critical danger ring and warning diamond remain intact and layer on top of the new persistent damage state
- smoke/spark motion is deterministic from scene clock plus unit id; no random simulation state or persistent particle objects are introduced
- Reduced Motion freezes the damage presentation to restrained static smoke/spark cues rather than removing damage readability entirely
- HP, movement, targeting, attack cadence, collision, damage intake, death threshold and all balance values remain unchanged
- a pure unitDamageStateVisual helper centralizes healthy/damaged/critical thresholds, role-aware smoke/spark counts, rise/spread and ground-mark geometry
- regression coverage verifies healthy suppression, damaged mechanical wear, critical escalation, compact Swarm feedback and malformed HP fallback
- release: package 1.45.0 / v1.45 / iOS 1.45 (145)


## v1.46 changes

- persistent Slow/Stasis feedback now reflects the real unit slowFactor instead of drawing the same fixed blue ellipse for every slowed unit
- the slowdown severity directly controls cage density, ring radius, bracket reach, orbit radius and ground compression footprint
- the current 40 percent slowdown used by Stasis and Disruptor therefore reads as a medium-strength containment field rather than a generic status marker
- slowTime still drives the existing duration pips; the final 0.8 seconds now also enter a visible release phase where the field expands/fades before disappearing
- orbit bands and bright nodes rotate only in full-motion mode; Reduced Motion keeps a static containment cage with the same severity/readability
- the status remains attached to the unit and uses only the existing slowTime and slowFactor simulation values, so refreshed slows automatically display the correct remaining phase
- no source guessing or duplicate renderer-side status state is introduced, so Stasis and Disruptor remain mechanically identical when their actual slow values are identical
- movement speed multiplier, slow refresh rules, non-stacking behavior, attack cadence, targeting and all balance values are unchanged
- a pure slowStatusVisual helper centralizes activation, exact severity, release fade, cage geometry, orbit speed and floor footprint
- regression coverage verifies exact 40 percent severity, stronger-vs-lighter slow geometry, release fade and malformed/expired fallback
- release: package 1.46.0 / v1.46 / iOS 1.46 (146)


## v1.47 changes

- persistent Rally/NOVA tempo feedback now exposes the two real tempo channels instead of showing the same two static gold chevrons for the entire buff
- movement tempo reads from the shared TEMPO_MOVE_SPEED_MULTIPLIER (currently +25 percent) and drives a directional gold flow/chevron stream under the affected unit
- attack tempo reads from the shared TEMPO_ATTACK_SPEED_MULTIPLIER (currently +30 percent) and drives a separate segmented cycle ring around the unit
- because the current attack bonus is slightly stronger than the movement bonus, the attack ring is intentionally a little denser/more prominent than the movement flow
- rallyTime remains the only duration state; the final 0.8 seconds enter a subtle release ring/fade before the tempo field disappears
- player and enemy movement flow points toward their natural advance direction while the actual unit facing and pathing remain untouched
- Rally and NOVA continue to share the exact same non-stacking tempo state, so identical mechanics now also produce identical persistent visuals
- Reduced Motion freezes the chevron/cycle motion while preserving both move-vs-attack channels and exact remaining-duration pips
- movement speed multiplier, attack-speed multiplier, Rally healing, NOVA behavior, refresh/non-stacking rules and all balance values are unchanged
- a pure tempoStatusVisual helper reads the shared tempo constants and centralizes boosts, strengths, release fade, flow geometry and attack-cycle geometry
- regression coverage verifies exact +25/+30 values, relative channel strength, release fade and malformed/expired fallback
- release: package 1.47.0 / v1.47 / iOS 1.47 (147)


## v1.48 changes

- active ATLAS shields now expose their real remaining shield integrity instead of showing the same full circle until the shield disappears
- the persistent shell is split into 12 plates; the number of bright intact plates derives directly from unit.shield / COMMANDERS.atlas.shield
- damaged shields lose visible plates, open larger gaps and gain deterministic crack lines as integrity falls
- full shields remain clean and bright with no crack clutter, while heavily damaged shields visibly look close to failure before the existing shield-break animation triggers
- shieldTime continues to drive the exact remaining-duration pips; the final 0.8 seconds also enter a release phase with a faint expanding shell before expiry
- team ownership remains immediately readable through the existing player/enemy shield colors, with a brighter highlight only on intact plates
- the current shield value, duration and ATLAS maximum are the only inputs; no duplicate renderer-side shield state is introduced
- existing shield-hit contact flashes, shield-break fragmentation, floating SCH values and shield-health-bar trail remain intact and layer with the new persistent integrity shell
- shield amount, expiration, ATLAS refresh behavior, Breaker interaction, damage mitigation and all balance values are unchanged
- a pure shieldIntegrityVisual helper centralizes exact integrity/time ratios, plate counts, cracks, gaps, shell geometry and release phase
- regression coverage verifies full integrity, damaged plate loss/cracks, expiry release and malformed/expired fallback
- release: package 1.48.0 / v1.48 / iOS 1.48 (148)


## v1.49 changes

- the Core turret head now physically aims at its real current coreTurretTarget instead of staying visually neutral while only the sight line points at the enemy
- a new oriented twin-prong barrel follows the exact core-to-target vector and rotates with target changes without introducing separate renderer-side targeting state
- the turret head shifts slightly forward along the aim vector while tracking, making the emitter feel mechanically connected to the existing lock-on line
- barrel length, width, prong spread and muzzle-node size derive from the same real coreTurretVisual reload charge already used by sight/brackets
- reload keeps the barrel compact, track extends it, and lock produces the strongest/longest geometry plus a visible cross-lock at the muzzle
- the central Core turret diamond is now oriented along the target vector as part of the same head assembly, rather than remaining vertically fixed
- the existing v1.37 firing recoil still overrides the forward tracking offset during an actual shot, so recoil remains clean and mechanically readable
- Reduced Motion keeps the static target orientation and lock geometry because they communicate state rather than decorative motion
- target selection, nearest-target tie breaking, turret range, reload cadence, damage, shot effect timing and all balance values are unchanged
- a pure coreTurretAimVisual helper centralizes target vector, phase, charge, head offset, barrel geometry and muzzle size
- regression coverage verifies real target direction, reload→track→lock extension, shared charge progression and malformed/coincident target fallback
- release: package 1.49.0 / v1.49 / iOS 1.49 (149)


## v1.50 changes

- Medic now exposes its real healing-support cooldown between heal pulses instead of looking identical whether the nanite heal is ready or still recharging
- an eight-segment support ring fills directly from unit.healCooldown / Medic supportInterval (currently 1.1 seconds)
- the ring is presentation-only and uses the exact engine cooldown already consumed by Medic healing; no duplicate timer or renderer-side support state was added
- as charge builds, one to three small nanite packets appear around the Medic, matching the established v1.33 heal-link language
- once healCooldown reaches ready state, all eight segments are lit and a compact medical cross plus outer ready ring appear
- when an injured ally enters support range while ready, the existing real Medic logic fires immediately, resets healCooldown and the visible cycle naturally restarts
- if no valid damaged ally exists, the Medic stays visually ready rather than inventing a fake target or consuming the cooldown
- Reduced Motion freezes cycle rotation/orbit motion while preserving charge, packet count and ready-state readability
- Medic heal amount, support range, support interval, patient priority, follow behavior, attack behavior and all balance values are unchanged
- a pure medicCycleVisual helper centralizes exact charge/remaining ratios, segment fill, nanite packet count, ring geometry and ready cross size
- regression coverage verifies exact half-charge, ready state, non-Medic suppression and malformed cooldown fallback
- release: package 1.50.0 / v1.50 / iOS 1.50 (150)


## v1.51 changes

- Repulsor now visualizes the exact displacement of every affected unit instead of showing only the initial area wave while units instantly appear at their landing positions
- each changed AbilityTargetMovement emits a short presentation-only repulsor-move effect from the unit's real pre-push position to the exact clamped landing position already calculated by the engine
- displacement streak count, trail width, landing ring and recoil wake scale from the real moved distance (up to the existing 55-unit push)
- a violet/white multi-streak corridor makes the push direction readable even when several units are displaced at once
- the landing point gains a short shock ring and perpendicular compression line, making wall/board-edge-clamped pushes easier to read visually
- the original Repulsor area pulse remains intact, so the ability now reads as source wave → unit shove → landing response
- Reduced Motion keeps a static start-to-landing corridor and landing mark instead of animated streak travel
- no interpolation is applied to simulation positions: units still move immediately according to the existing deterministic engine result, while the effect only explains that displacement visually
- push distance, board clamping, target selection, collision rules, ability cost and all balance values are unchanged
- a pure repulsorDisplacementVisual helper centralizes exact vector, distance, progress, trail geometry and landing response
- regression coverage verifies direction, distance-scaled feedback, real engine effect emission and malformed/coincident fallback
- release: package 1.51.0 / v1.51 / iOS 1.51 (151)


## v1.52 changes

- Breaker's anti-shield strike now carries the exact amount removed by its special shieldBreak step (up to the existing 45 shield) into presentation metadata
- the gold Breaker breach effect now scales from that real removed-shield amount instead of using one fixed slash weight for every shield contact
- Breaker breach slashes align to the real attacker→target vector, with the contact point on the attacker-facing shield edge and fragments shearing away from the incoming hit
- when the special 45-SCH removal itself drops a shield to zero, the engine now emits the same directional shield-break presentation event used by ordinary shield depletion
- this closes the previous visual gap where a 10-SCH shield could vanish under Breaker's special removal without the established shield-collapse/fracture animation
- when shield remains after the special removal, no extra generic shield-hit event is added, avoiding duplicate absorption layers and duplicate floating SCH values
- the following normal 18-damage attack remains unchanged and still uses the existing damageUnit shield/HP presentation path for any shield it actually removes
- protected-team coloring, source direction and exact removed amount are preserved on special shield-break events
- Breaker damage, 45 shieldBreak value, attack interval, HP damage after depletion, core damage and all balance values are unchanged
- a pure breakerShieldVisual helper centralizes exact removal strength, attacker vector, slash reach, cross reach and fragment count
- regression coverage verifies exact 45/10 removal metadata, directional geometry, symmetric fallback and the previously missing special-depletion shield-break event
- release: package 1.52.0 / v1.52 / iOS 1.52 (152)


## v1.53 changes

- active Pioneer capture acceleration is now visible during the capture itself instead of only becoming distinct after the relay is secured
- the specialist signature reads directly from controlPointPressure.captureMultiplier, so the existing 1.5x Pioneer bonus is the single source of truth for the visual
- a specialist relay ring, rotating capture nodes and directional advance chevrons appear only while a real accelerated capture is in progress
- ordinary group support still affects the total capture multiplier, but does not falsely increase Pioneer specialist strength; the two mechanics remain visually and logically distinct
- the existing capture-progress arc, exact seconds remaining, group dots, multiplier text, contested feedback and final Pioneer secure effect all remain intact
- the specialist pulse scale reflects the actual combined captureMultiplier × groupMultiplier, making a Pioneer supported by multiple allies visibly more forceful without inventing extra capture speed
- reverse, contested, decay and ordinary 1.0x capture states do not show Pioneer specialist geometry
- Reduced Motion freezes specialist rotation while preserving the ring, nodes and directional chevrons
- capture speed, 1.5x Pioneer multiplier, group support, contest rules, supply rules and all balance values are unchanged
- a pure captureSpecialistVisual helper centralizes exact specialist boost, total multiplier, node/chevron counts, ring geometry and pulse scale
- regression coverage verifies the exact 1.5x Pioneer signature, group-vs-specialist separation, non-specialist suppression and malformed fallback
- release: package 1.53.0 / v1.53 / iOS 1.53 (153)


## v1.54 changes

- high-impact units now visibly acquire their real current combat target late in the weapon cycle instead of showing reload charge with no indication of where the shot is about to go
- Lancer, Mortar, Sentinel and Disruptor use the same exact target selected by simulation through a new shared unitCombatTarget helper; renderer and combat no longer need separate targeting guesses
- the shared helper preserves the existing nearest-enemy acquisition radius, firing-range check, Core fallback and first-encountered tie behavior, so target selection and balance remain unchanged
- target-lock feedback appears only once the real reload cycle passes 62 percent charge and the selected target is actually inside firing range
- a sparse dashed designator links weapon and target, while vector-oriented corner brackets contract toward the target as the real attackCooldown approaches ready
- final lock adds a compact target pulse immediately before the shot; the lock disappears naturally when attackCooldown resets after firing
- Rail and Mortar receive the strongest lock language, Sentinel is quieter and Disruptor keeps a lighter electric variant to avoid battlefield clutter
- fast Ranger/melee weapons, out-of-range pursued enemies and units without a valid target do not render lock geometry
- Core targeting works through the same helper when no enemy unit is acquired and the Core is genuinely inside that unit's existing attack range
- Reduced Motion preserves target orientation and readiness state while suppressing decorative pulse motion
- attack damage, range, acquisition distance, cooldowns, movement, target priority, Core damage multipliers and all balance values are unchanged
- a pure weaponTargetLockVisual helper centralizes exact reload charge, lock threshold, vector basis, prominence, bracket contraction and target pulse
- regression coverage verifies shared nearest-target selection, out-of-range pursuit, Core fallback, late-cycle Lancer lock, profile prominence and malformed fallback
- release: package 1.54.0 / v1.54 / iOS 1.54 (154)


## v1.55 changes

- Core damage now changes the physical machine presentation progressively instead of relying only on HP bars, cracks and generic critical particles
- the existing 60 percent damaged and 30 percent critical thresholds remain the single visual staging boundaries
- damaged Cores expose asymmetric armor seams, internal conduits, vent leakage and localized electrical sparks that intensify continuously with lost HP
- critical Cores add wider armor separation, stronger conduit glow, more vent failures and detached edge debris while the turret remains visibly operational and keeps its existing real targeting/reload behavior
- the mechanical damage layer deliberately avoids disabling, slowing or misaligning the turret so the presentation never implies a gameplay penalty that does not exist
- Reduced Motion keeps static damage staging and short fixed vent marks instead of animated vent drift
- destroyed Core presentation remains owned by the existing destruction sequence and is not double-rendered by the new active-damage layer
- Core HP, turret range, turret damage, reload cadence, target selection and all balance values are unchanged
- a pure coreDamageStateVisual helper centralizes damage staging, seam/vent/spark counts, armor gap and conduit/warning intensity
- regression coverage verifies stable suppression, progressive damaged staging, stronger critical staging and deterministic malformed/destroyed fallback
- release: package 1.55.0 / v1.55 / iOS 1.55 (155)


## v1.56 changes

- Core turrets now visibly acquire each newly selected enemy instead of snapping from one tracked target to the next with no handoff feedback
- target changes are detected only from the real coreTurretTarget result; no renderer-side target priority or range logic is introduced
- each new target receives a short contracting acquisition ring, oriented corner brackets and three scanning ticks before the existing reload/lock presentation takes over
- a compact scan packet travels from the Core to the newly acquired target during the 0.48 second handoff window, making target switches readable even in crowded fights
- the acquisition layer uses the selected unit's real radius and the owning Core's real battlefield position
- losing all valid targets clears acquisition state immediately, so reacquiring later correctly reads as a new lock rather than reusing stale renderer state
- target handoff state resets with each Match instance and freezes naturally while the match is paused
- Reduced Motion keeps the static acquisition rings/brackets but suppresses the traveling scan packet and rotating scan motion
- the existing Core turret reload arc, sight line, target brackets, physical barrel aim, muzzle discharge and firing recoil remain intact
- turret target selection, range, damage, reload cadence, firing timing and all balance values are unchanged
- a pure coreTargetAcquisitionVisual helper centralizes the 0.48 second timing, ring contraction, bracket reach, scan position and fade
- regression coverage verifies initial acquisition, mid-handoff contraction, clean expiry and malformed fallback
- release: package 1.56.0 / v1.56 / iOS 1.56 (156)


## v1.57 changes

- Pulse now lands as a dedicated high-impact tactical strike instead of sharing the same generic expanding circle used by ordinary blast/capture effects
- the Pulse cast effect now carries the card's real 82-unit damage radius and 85 damage as presentation metadata; gameplay still uses the existing abilityTargetPreview and damageUnit paths
- the strike opens with a compact white-hot center flare, then drives two expanding shock fronts toward the exact gameplay radius
- eight radial discharge spokes, impact chevrons and short capacitor arcs make the area hit read as a deliberate energy weapon rather than a generic orange flash
- the outer boundary remains visible at the real 82-unit radius during the transient effect, so the animation communicates the same footprint that targeting and damage use
- existing per-target shield absorption, HP impact, directional hit reactions, K.O. bursts and Core-hit feedback still layer on top, preserving exact victim-specific outcomes
- Reduced Motion keeps the exact-radius rings, spokes and impact staging while suppressing the brief cross-flare/rotational motion
- Mortar blast and relay capture visuals retain their previous rendering and are no longer coupled to Pulse's presentation branch
- Pulse cost, 85 unit damage, 45 Core damage, 82 unit radius, 100 Core range, target selection and all balance values are unchanged
- a pure pulseStrikeVisual helper centralizes strike progress, exact radius, shock-front expansion, spoke geometry, arc count and damage-derived presentation intensity
- regression coverage verifies exact 82 radius/85 damage metadata from a real Match play, outward expansion, release fade and malformed/non-Pulse suppression
- release: package 1.57.0 / v1.57 / iOS 1.57 (157)


## v1.58 changes

- Stasis now gives every newly slowed enemy a dedicated impact/lock-on response instead of relying only on the cast-area hex and the already-active persistent slow cage
- the engine emits a short stasis-hit presentation event only when abilityTargetPreview reports that the target's slow state actually changed
- each onset event carries the affected unit's real radius, the exact resulting 0.6 movement factor and the real cast-center source position
- a contracting hex cage, inner lock ring, four capture brackets and severity-scaled shards visibly snap onto each affected unit
- a compact energy packet travels from the Stasis cast center to each newly affected target, tying the area cast to the individual persistent slow state
- recasting Stasis on a unit already at the same 4-second/40-percent state does not emit a fake second onset burst; the persistent slow presentation simply continues
- the existing persistent slow floor band, orbiting brackets, cage spokes, release ring and exact remaining-time pips remain intact after the onset animation
- Reduced Motion keeps the static per-target cage/brackets/shards and source tether while suppressing packet travel and cage rotation
- Stasis cost, 78 radius, 4-second duration, 0.6 movement factor, stacking rules, target selection and all balance values are unchanged
- a pure stasisHitVisual helper centralizes exact slow severity, source direction, cage contraction, tether progress and shard count
- regression coverage verifies the real 0.6 factor, directional contraction, exact per-target metadata, no duplicate onset on an unchanged recast and malformed suppression
- release: package 1.58.0 / v1.58 / iOS 1.58 (158)


## v1.59 changes

- Pioneer-assisted captures now finish with a dedicated secured-territory signature instead of the old generic green ring and three arrows
- the capture-completion event now carries the exact capture multiplier that controlPointPressure actually used; the current Pioneer bonus is 1.5x
- the visual keeps the real 48-unit capture radius and stages an expanding secure perimeter, inner confirmation ring, six perimeter nodes, directional advance chevrons and a compact frontline gate
- chevron count and geometry are driven by the real capture bonus metadata, keeping presentation tied to simulation rather than duplicating the Pioneer card value in the renderer
- player and enemy capture signatures advance in their natural battlefield direction
- Reduced Motion keeps the full secured-radius/perimeter information while freezing orbital node rotation
- the ordinary capture effect still layers with the Pioneer signature, so ownership confirmation and the specialist bonus remain visually distinct
- removed the legacy second Pulse renderer that was still drawing underneath the dedicated v1.57 Pulse strike; Pulse now has one authoritative presentation path with no redundant overdraw
- Pioneer HP, damage, speed, 1.5x capture multiplier, group support, capture timing, contested behavior and all balance values are unchanged
- a pure pioneerCaptureVisual helper centralizes exact radius, multiplier strength, perimeter expansion, node positions and chevron geometry
- regression coverage verifies exact 48 radius/1.5x metadata, outward expansion, fade and malformed fallback
- release: package 1.59.0 / v1.59 / iOS 1.59 (159)

## v1.60 changes

- Rally now lands as a dedicated support-command field instead of the older generic expanding ring with six arrows
- the Rally cast effect now carries the card's real 96-unit target radius and 65-point healing value as presentation metadata
- the cast keeps a faint exact-radius perimeter while the active support wave expands through it, so targeting footprint and impact presentation stay aligned
- eight rotating command nodes, paired directional surge chevrons and a central medical cross combine healing and tempo into one readable tactical signature
- player and enemy Rally chevrons travel in their natural battlefield advance direction
- command-node tangents and forward lane reach are driven by the same 1.25x movement and 1.3x attack-speed multipliers used by the simulation
- Reduced Motion preserves the exact radius, support rings, nodes, lanes and center confirmation while freezing orbital rotation and chevron travel
- existing per-unit heal feedback and persistent Rally tempo status remain layered on top, so immediate healing and the six-second buff are still readable separately
- Rally cost, 65 healing, 96 radius, six-second duration, 1.25x movement, 1.3x attack speed, targeting and all balance values are unchanged
- a pure rallyCastVisual helper centralizes cast timing, exact radius, healing intensity, ring expansion, command-node geometry and tempo multiplier presentation
- regression coverage verifies real Match metadata, exact 96/65 values, canonical tempo multipliers, outward expansion, release fade and malformed/non-Rally suppression
- release: package 1.60.0 / v1.60 / iOS 1.60 (160)

## v1.61 changes

- Stasis now opens with a dedicated suppression-lattice cast instead of the older generic expanding hex effect
- the Stasis cast event now carries the card's real 78-unit radius, exact 0.6 movement factor and source card identity as presentation metadata
- a faint circular boundary stays fixed at the real cast radius while the active hex lattice expands through it, keeping effect staging tied to targeting geometry
- six radial lattice spokes, six counter-rotating control nodes, severity-scaled suppression shards and a central lock seal make the area denial state readable before per-target lock effects land
- shard density and bracket reach are driven by the actual 40-percent slow severity derived from the 0.6 movement factor rather than a renderer-only duplicate
- Reduced Motion preserves the exact boundary, lattice, nodes, shards and lock seal while freezing orbital rotation and shard travel
- the existing per-target stasis-hit cage, tether packet and persistent slow status remain layered on top, preserving target-specific feedback after the cast
- Repulsor presentation metadata and behavior are unchanged even though Stasis and Repulsor share the same ability-resolution branch
- Stasis cost, 78 radius, four-second duration, 0.6 movement factor, non-stacking rules, targeting and all balance values are unchanged
- a pure stasisCastVisual helper centralizes cast progress, exact radius, slow severity, lattice expansion, node geometry, shard count and release fade
- regression coverage verifies real Match metadata, exact 78/0.6 values, the real four-second slow outcome, outward expansion, release fade and malformed/non-Stasis suppression
- release: package 1.61.0 / v1.61 / iOS 1.61 (161)

## v1.62 changes

- Repulsor now opens with a dedicated outward pressure-wave cast instead of the older generic expanding circle with static arrows
- the Repulsor cast event now carries the card's real 72-unit target radius, exact 55-unit push distance and source card identity as presentation metadata
- a faint fixed boundary remains at the exact targeting radius while the active pressure front expands through it, keeping cast staging aligned with gameplay reach
- eight radial impulse vectors, a bright compression front, secondary pressure ring and layered outward pulses make the cast read as directional force rather than generic area damage
- arrow length, ring spacing and center compression strength are driven by the real 55-unit displacement value instead of renderer-only constants
- Reduced Motion preserves the exact boundary, pressure front, impulse vectors and center compression while freezing rotational and pulse travel
- the existing repulsor-move presentation still follows each target's actual clamped start-to-landing vector, so cast footprint and real displacement remain separate but visually linked
- Stasis metadata and rendering are unchanged even though Stasis and Repulsor share the same ability-resolution branch
- Repulsor cost, 72 radius, 55-unit requested push, target selection, board clamping and all balance values are unchanged
- a pure repulsorCastVisual helper centralizes exact radius, push strength, wave expansion, impulse geometry and release fade
- regression coverage verifies exact 72/55 metadata from a real Match play, outward expansion, fade and malformed/non-Repulsor suppression
- release: package 1.62.0 / v1.62 / iOS 1.62 (162)

## v1.63 changes

- Mortar impacts now finish with a dedicated artillery blast instead of falling back to the generic blast/capture circle after the projectile arc lands
- the blast event now carries the card's real 42-unit splash radius, exact 28 splash damage, Mortar source identity and real firing position as presentation metadata
- the explosion keeps a faint fixed 42-unit splash boundary while a brighter pressure front expands through the actual affected area
- directional debris rays, a white-hot center, secondary heat ring and impact-axis recoil visually connect the landing blast to the incoming Mortar trajectory
- debris density and strike geometry scale from the real 28 splash damage while directional bias is derived from the actual shooter-to-impact vector
- Reduced Motion preserves the exact splash boundary, pressure front, debris geometry and impact direction while suppressing rotational drift
- the existing arcing Mortar projectile, smoke trail, impact cue, per-target damage feedback and death effects remain layered with the new blast
- unknown future blast sources retain the previous generic fallback instead of disappearing when they do not provide Mortar metadata
- Mortar cost, 40 primary damage, 28 splash damage, 42 splash radius, attack interval, targeting and all balance values are unchanged
- a pure mortarBlastVisual helper centralizes exact splash radius, damage intensity, shock expansion, debris geometry, impact direction and release fade
- regression coverage verifies exact 42/28 metadata from a real Mortar attack, real firing direction, outward expansion, release fade and malformed/non-Mortar suppression
- release: package 1.63.0 / v1.63 / iOS 1.63 (163)

## v1.64 changes

- ATLAS now applies a dedicated per-unit shield-lock presentation instead of the legacy generic expanding shield hex
- every ATLAS shield effect now carries the affected unit's real collision radius and explicit ATLAS source identity while preserving the existing per-unit shield-gain value
- the visual model reads the canonical 70 shield cap and six-second duration directly from COMMANDERS, so presentation does not duplicate balance constants
- six locking armor plates, nested shield shells, perimeter charge sparks and the ATLAS diamond mark make shield application distinct from later shield-hit and shield-break feedback
- fresh shield gain scales charge density from the real gain amount while a zero-gain duration refresh uses a restrained relock signature instead of pretending new shield was added
- Reduced Motion keeps shell geometry, armor plates, refresh state and gain intensity readable while freezing orbital drift and charge travel
- the existing formation-level ATLAS commander activation cue, persistent shield integrity visuals, shield-hit direction feedback and shield-break collapse remain unchanged and layer with the new per-unit lock
- non-ATLAS shield effects retain the previous generic shield fallback
- ATLAS cooldown, 70 shield, six-second duration, target eligibility and all gameplay/balance values are unchanged
- a pure atlasShieldVisual helper centralizes canonical shield values, unit geometry, gain intensity, refresh state, plate locking and release fade
- regression coverage verifies canonical 70/6 values, refresh behavior, real Match metadata, exact shield gain preservation, expansion/fade and malformed/non-ATLAS suppression
- release: package 1.64.0 / v1.64 / iOS 1.64 (164)

## v1.65 changes

- NOVA now shows an explicit per-unit tempo-lock activation instead of emitting Rally effects that the Rally-specific renderer intentionally ignored
- every NOVA activation effect now carries the affected unit's real collision radius, the canonical six-second tempo duration and explicit NOVA source identity
- the visual model reads NOVA's canonical 1.25x movement and 1.3x attack-speed multipliers directly from COMMANDERS, keeping presentation tied to simulation values
- gold tempo shells, attack-cycle ticks, forward surge chevrons and a central lightning mark make NOVA visually distinct from the green healing-and-tempo Rally card
- movement chevron count/geometry and attack tick density derive from the actual 25-percent movement and 30-percent attack-speed boosts
- player and enemy chevrons travel in their natural battlefield advance direction
- Reduced Motion preserves the tempo shell, tick density, boost geometry and direction while freezing orbital and chevron travel
- the formation-level NOVA commander cue and persistent tempo status around boosted units remain unchanged and layer with the new activation lock
- Rally-card casting is unchanged and continues to use its dedicated healing/support-command presentation
- NOVA cooldown, six-second duration, 1.25x movement, 1.3x attack speed, target eligibility, non-stacking behavior and all balance values are unchanged
- a pure novaTempoActivationVisual helper centralizes canonical duration, tempo multipliers, unit geometry, tick density, chevrons and release fade
- regression coverage verifies canonical NOVA values, real Match metadata, exact per-unit radius/duration, outward expansion, release fade and Rally/non-NOVA suppression
- release: package 1.65.0 / v1.65 / iOS 1.65 (165)

## v1.66 changes

- LYRA now applies a dedicated per-unit repair-and-cleanse pulse instead of falling back to the old generic floating heal cross
- every LYRA effect now carries the affected unit's real collision radius, exact healing amount, explicit LYRA source identity and whether that unit was actually cleansed
- the visual model reads LYRA's canonical 80 HP healing cap directly from COMMANDERS so repair intensity remains tied to the simulation
- mint repair shells, repair nodes and a central medical cross scale from the actual HP restored to that unit
- slow removal is now visually distinct through blue cleanse sweeps and a release ring rather than being hidden inside the healing animation
- cleanse-only targets remain visible with zero healing value, so removing Stasis/slow never falsely communicates HP restoration
- Reduced Motion preserves repair strength, cleanse state, unit geometry and all core readability while freezing orbital and shard travel
- the formation-level LYRA commander cue remains unchanged and layers with the new per-unit repair pulses
- Medic heal links and other non-LYRA healing keep their existing renderer/fallback behavior
- LYRA cooldown, 80 HP cap, cleanse rules, target eligibility and all gameplay/balance values are unchanged
- Effect metadata now includes an optional cleanse flag used only when the simulation actually removes a slow
- a pure lyraRepairVisual helper centralizes canonical healing, exact per-unit repair strength, cleanse state, shell geometry and release fade
- regression coverage verifies the 80 HP cap, cleanse-only behavior, real Match healing/cleanse metadata, exact unit radius, expansion/fade and non-LYRA suppression
- release: package 1.66.0 / v1.66 / iOS 1.66 (166)

## v1.67 changes

- normal control-point ownership changes now finish with a dedicated secure animation instead of the legacy generic capture circle
- completed capture effects now carry the canonical 48-unit capture radius, 4.2-second capture time and explicit control-point source identity
- a faint fixed 48-unit boundary preserves the exact objective footprint while an expanding secure front confirms ownership across the real capture area
- six locking perimeter nodes, directional advance chevrons and a gate marker make point ownership changes read as territorial progress instead of a generic explosion
- player/enemy secure chevrons follow each team's natural advance direction
- Reduced Motion preserves the exact boundary, ownership direction, lock nodes and gate geometry while freezing orbital and travel motion
- Pioneer specialist confirmation remains a separate layered effect and continues to communicate its 1.5x capture acceleration
- frontline movement feedback remains unchanged and still follows the actual column edge transition after the point flips
- capture radius, 4.2-second capture time, pressure rules, decay, ownership logic and all balance values are unchanged
- a pure controlPointSecureVisual helper centralizes canonical capture radius/timing, secure-front expansion, node geometry, directional chevrons and fade
- regression coverage verifies canonical 48/4.2 values, real Match capture metadata, actual ownership completion, outward expansion, release fade and legacy/malformed suppression
- release: package 1.67.0 / v1.67 / iOS 1.67 (167)

## v1.68 changes

- the existing minimal oscillator beeps are replaced by a centralized tactical audio synthesis system with distinct layered cues for high-value match events
- audio remains generated locally through Web Audio, so the game adds no third-party samples, music licensing dependency or network request
- unit deployment uses a compact low mechanical impulse while tactical abilities use a separate rising energy cue
- player Commander activation receives a heavier three-layer command signature and enemy Commander activation uses a clearly different descending warning cue
- normal control-point capture keeps its positive secure chord while losing a previously owned point now has an audible warning in addition to the existing haptic and banner
- local Core critical pressure, enemy Core breakthrough opportunity, overtime and the final 30-second push each receive distinct non-spam status cues
- match start now has its own launch signature instead of reusing the deployment sound
- victory, defeat and draw now use three separate result cues; draws no longer reuse the defeat sound
- selection and invalid-action sounds remain intentionally short and restrained
- routine auto-attacks, healing ticks, movement and repeated combat impacts stay silent in this first audio pass to avoid dense-match sound spam
- noise transients are synthesized deterministically and filtered locally; oscillator/noise layers use bounded gain, frequency and duration values
- AudioContext startup remains user-gesture gated and fails safely when Web Audio is unavailable, preserving browser and native functionality with sound disabled or unsupported
- the existing sound preference/toggle remains authoritative and no user setting is reset
- pure soundCueSpec metadata makes all 15 tactical cues testable without requiring a browser AudioContext
- regression coverage validates every cue layer, distinct high-value signatures and safe behavior in non-browser test environments
- README release metadata now reflects all three current commanders and removes the obsolete Work 0.52 wording
- gameplay timing, combat values, targeting, haptics and balance are unchanged
- release: package 1.68.0 / v1.68 / iOS 1.68 (168)

## v1.69 changes

- dense matches now use a deterministic presentation budget so tactical information stays readable when many transient effects overlap
- objective captures, frontline shifts, Commander activations, Core hits, tactical abilities, shield breaks and specialist confirmations remain full-strength at every density level
- deaths, shields, healing, deployments and genuinely heavy impacts remain visible while receiving only restrained alpha compression under extreme load
- routine projectile and small-impact feedback stays unchanged in normal fights, begins soft compression only after more than 18 simultaneous effects and is deterministically sampled only in genuinely dense states
- dense routine sampling uses stable effect IDs rather than randomness, so the same simulation state produces the same presentation decision
- small routine impacts are the primary clutter target; impacts with radius 12 or larger are automatically promoted to high-priority presentation
- camera impulse intensity now scales down progressively as simultaneous effect count rises, preventing stacked hits and K.O.s from making large fights visually unstable
- critical visual geometry itself is never removed by the density system even when camera shake is restrained
- combat-value text keeps its existing independent five-label cap and is not made noisier by this change
- the effect budget is renderer-only and does not delete, delay or alter simulation effects, damage, projectiles, targeting, capture, status effects or replay determinism
- a pure effectPresentationBudget helper centralizes priority, density thresholds, deterministic sampling, alpha scaling and camera restraint
- regression coverage verifies full preservation of tactical effects, heavy-vs-small impact classification, deterministic dense sampling, progressive camera restraint and malformed-count fallback
- release: package 1.69.0 / v1.69 / iOS 1.69 (169)

## v1.70 changes

- mobile combat layout now profiles the live visual viewport into standard, compact and tight density classes instead of relying only on static CSS height assumptions
- browser chrome, dynamic viewport resizing and supported iPhone safe-area changes can now update the active combat density without restarting the match
- standard tall phones keep the full existing match presentation, while shorter screens progressively reclaim arena height from HUD and command-deck chrome
- iPhone SE-class heights use a dedicated tight profile with a shorter top bar, compact Core HUD, reduced command-deck spacing and smaller battle banners without changing arena coordinates
- narrow screens keep the existing four-card-per-row interaction pattern but card rows are reduced from 53 px to 48 px, or 44 px in the tight profile, recovering meaningful vertical battlefield space
- card art, costs and names remain visible in narrow layouts; keyboard shortcut badges are hidden on touch-size mobile layouts where they consume space without helping interaction
- top-bar sound/help/pause controls gain larger mobile touch surfaces in standard/compact layouts while tight layouts retain a 34 px compromise to preserve battlefield height
- Core labels, HP values, health tracks, control-objective HUD, arena hints and battle banners receive stronger mobile contrast against the battlefield
- mobile HUD and command deck gain restrained edge shadows and stronger separator colors so they remain visually distinct over high-action scenes
- left/right safe-area insets are now respected in addition to the existing top/bottom insets
- viewport profiling is pure and regression-tested for modern tall phones, short mobile windows, iPhone SE-class dimensions, narrow/tall displays and malformed viewport fallback
- all changes are presentation-only; match simulation, Phaser arena size, touch targeting, card costs, cooldowns, timing and balance remain unchanged
- release: package 1.70.0 / v1.70 / iOS 1.70 (170)

## v1.71 changes

- the post-match screen is rebuilt into a clear tactical debrief instead of presenting every result block with equal visual weight
- a simulation-backed final snapshot now surfaces outcome, both Core percentages, both territory totals, captures, deployments, kills and tactical-ability usage directly from the finished MatchState
- the debrief opens with a dedicated win/loss/draw hero and an immediate two-sided Core/territory comparison
- the existing decision analysis remains intact directly below the hero, so the exact reason the match was decided is still explicit
- the final 3x3 territory map now follows the decision block as the visual proof of the ending frontline
- player performance is grouped into a four-column action panel: captures, deployments, kills and abilities
- historical comparison remains visible but is visually separated from immediate match-decision information
- campaign stars, series progress, Tagesfront records, learning progress and mastery rewards are grouped into a dedicated progression stack without hiding or deleting any existing reward information
- next mission, rematch/continue and return-to-base controls now live in a dedicated action panel with a clearer primary/secondary hierarchy
- feedback remains available but is visually subordinate to the gameplay result and actions
- narrow-phone layouts receive compact result hero, decision rows, performance values and single-column feedback controls
- resultSnapshot is a pure tested helper with safe Core-percent clamping and explicit win/loss/draw handling
- no result logic, progression rules, rewards, history recording, stars, mastery, campaign unlocks or match balance changed
- release: package 1.71.0 / v1.71 / iOS 1.71 (171)

## v1.72 changes

- the Einsatzbasis now opens with a compact three-part command center for Feldzug, Hauptquartier and Tagesfront instead of making the player scan several equally weighted cards
- command-center values are derived from live campaign stars/completion, HQ project readiness, learning progress, daily attempts/completion and active series state
- the command center is interactive: each status cell jumps directly to the matching campaign, HQ or Tagesfront flow
- a pure lobbyCommandStatus model determines the next relevant focus without changing progression: ready HQ projects take priority, then an open Tagesfront, then unfinished campaign progression
- a fully cleared daily and completed campaign settle into a neutral command-center state rather than manufacturing urgency
- HQ-ready states receive a distinct construction-ready treatment while completed campaign/daily states use restrained secured styling
- the main operation hero receives stronger focus only when campaign progression is currently the relevant next action
- the HQ entry receives stronger structure, clearer progress treatment and a dedicated ready-project emphasis when construction is available
- Tagesfront receives a stronger but still contained focus state while it remains open
- the chapter track now reads more like a connected operation route with an explicit active chapter marker
- base mode, deck, commander, learning, daily and HQ cards receive restrained depth and hover/touch feedback so the lobby matches the newer combat/debrief visual quality
- compact and narrow-phone layouts keep the command center usable without consuming excessive vertical space
- command-center priority and malformed-count behavior are regression-tested
- campaign unlocks, daily generation, HQ requirements, rewards, store behavior and all combat balance remain unchanged
- release: package 1.72.0 / v1.72 / iOS 1.72 (172)

## v1.73 changes

- headquarters construction now exposes the exact placement rules visually instead of showing most plots with the same generic editing treatment
- every one of the 25 base plots receives a deterministic presentation state derived from the same canConstructOnPlot / canMoveBaseBuilding rules used by the actual save operation
- valid new-build or move destinations are marked green, blocked plots are muted/red, the fixed command plot stays unavailable, occupied plots are clearly differentiated and the building's current location remains visible while moving
- Tier-2 expansions now mark their predecessor plot in gold as the single required upgrade location rather than implying that another free tile could be chosen
- selecting a valid plot produces a brighter lock frame and construction hologram; invalid taps now stay visible as rejected targets instead of silently leaving the previous valid choice highlighted
- the builder header and map caption report the real count of currently valid destinations and whether the chosen field can actually be confirmed
- placement ghosts receive a restrained hologram pulse in normal motion mode while Reduced Motion preserves the same exact valid/blocked/required information without animation
- completed construction keeps the existing saved-building confirmation pulse and now receives a stronger final plot outline
- accessibility labels on interactive plots include placement meaning such as valid, occupied, current location or unavailable
- inspect mode remains clean: placement overlays are only sent to the map while actively building or moving
- a pure basePlacementVisual helper centralizes valid-count, source, required-upgrade, blocked and chosen-valid/chosen-invalid states
- regression coverage verifies new construction, occupied land, fixed upgrades, movement destinations, locked projects and malformed target choices against the real construction helpers
- base progression requirements, project costs, unlock thresholds, saved layouts, roads, facing, cosmetic-only rules and combat balance are unchanged
- release: package 1.73.0 / v1.73 / iOS 1.73 (173)

## v1.74 changes

- the deck builder now exposes the current 6+2 combat loadout as a dedicated visual rail instead of relying only on count text and highlighted roster cards
- the first six slots are reserved for units and the final two for tactical abilities, matching the real deck validation rules
- filled loadout slots show canonical card art, name and energy cost; empty slots explicitly show which unit or tactic position is still missing
- tapping a filled loadout slot removes that exact card immediately, making deck correction substantially faster on touch devices
- the loadout rail derives all metadata from the canonical CARDS definitions and preserves the same unit/tactic order used by the actual active deck
- the deck summary now has a distinct ready state and the primary Deck übernehmen action receives a stronger confirmation treatment only when isValidDeck passes
- matching built-in presets are highlighted automatically without changing or auto-applying the player's draft
- selected roster cards receive stronger confirmation hierarchy while retaining the existing mastery frame and role styling
- composition analysis remains descriptive only, but its presentation is visually subordinate to the active 8-card loadout
- narrow phones render the eight loadout slots as a compact 4x2 grid so the selected deck remains visible without horizontal scrolling
- a pure deckLoadout helper centralizes slot splitting, empty positions, counts, canonical card metadata and completion state
- regression coverage verifies complete decks, partial decks, stable unit/tactic ordering, unknown-value safety and canonical card metadata
- deck validity, card costs, stats, presets, mastery, saved deck slots, active series decks and all combat balance are unchanged
- release: package 1.74.0 / v1.74 / iOS 1.74 (174)

## v1.75 changes

- commander selection is rebuilt as an explicit loadout decision instead of three long text cards with hard-to-compare values
- the currently active commander now appears in a dedicated loadout hero with portrait, ability, role and cooldown before the alternative choices
- ATLAS, LYRA and NOVA expose compact stat chips derived directly from their canonical combat definitions
- ATLAS shows shield amount, duration and all-unit scope; LYRA shows healing, slow cleanse and all-unit scope; NOVA derives movement and attack bonuses from the shared tempo multipliers plus duration
- each commander card receives a distinct but restrained defense, recovery or tempo presentation without implying a strength ranking
- the active commander is clearly marked and its select button is disabled, preventing redundant save actions
- alternative commanders retain one-tap selection and the same persistent commander save behavior
- the lobby commander entry receives stronger touch/focus feedback and visual separation from surrounding meta cards
- the selection layout becomes more compact on narrow phones while keeping portrait, ability, exact stats and description visible
- a pure commanderBriefing helper centralizes displayed combat values so the selection UI does not duplicate magic numbers
- regression coverage verifies ATLAS shield/duration/cooldown, LYRA heal/cleanse/cooldown and NOVA movement/attack/duration/cooldown against canonical definitions
- commander effects, cooldowns, bot parity, campaign-fixed enemy commanders, series commander locking, saves and all combat balance remain unchanged
- release: package 1.75.0 / v1.75 / iOS 1.75 (175)

## v1.76 changes

- campaign mission selection is rebuilt into a mission-first briefing instead of hiding the most important combat setup behind a generic details disclosure
- every selected mission now surfaces its actual mode, difficulty, starting 3x3 territory split and exact objective before the start button
- Core missions explicitly identify Core attack while control missions expose required relays and control seconds from the canonical control objective
- all three star targets are visible at a glance and already-earned stars are marked without changing completion logic
- enemy setup now exposes unit/tactic counts and average energy derived from the canonical enemy deck definitions
- missions with a fixed enemy commander keep the full commander description while also showing the same enemy deck composition summary
- the tactical hint is promoted into a dedicated briefing block while the complete enemy deck remains available as optional intelligence
- prior best time and stars are grouped into a compact best-performance record instead of a loose line of text
- campaign route nodes receive clearer selected/ready feedback; the ready pulse is removed under Reduced Motion
- small-phone layouts compact the briefing map and star objectives without hiding mission-critical values
- a pure missionBriefingSnapshot helper centralizes mode labels, territory counts, objective metadata, enemy deck composition, commander label and star targets
- regression coverage verifies Core missions, control relay requirements, canonical enemy Commander labels, enemy deck composition and complete 3x3 territory accounting across every mission
- mission seeds, owners, objectives, star requirements, unlocks, enemy decks, commanders, campaign progress and all combat balance remain unchanged
- release: package 1.76.0 / v1.76 / iOS 1.76 (176)

## v1.77 changes

- Einsatzserie, Tagesfront and Draft now share the same explicit pre-battle preparation hierarchy as campaign, deck and commander flows
- Einsatzserie opens with a run-status hero showing current battle, wins, remaining attempts, fixed commander, average deck energy and the locked eight-card series loadout
- the three-series-win path is visualized as a compact progress track; current, secured and future stages are distinct without changing series rules
- each available series route now exposes its actual mode, objective requirement, starting front, enemy deck composition and tactical hint before the attack action
- Tagesfront now promotes its fixed daily setup into a single operation briefing with mode/objective, starting territory counts, arena, difficulty, both commanders and player/enemy average deck cost
- the fixed daily eight-card deck remains fully visible and completed daily records now also surface the best territory count alongside best time and Core result
- Draft now shows all eight loadout slots from the start, including explicit empty unit and tactic positions, rather than only displaying already-picked cards
- Draft receives a three-stage progress track for units, tactics and battle readiness plus a dedicated current-offer label
- completed Drafts show the actual local-match parameters before the start action while leaving the saved normal deck untouched
- a pure mode-preparation model centralizes series progress, daily setup summaries and Draft stage/count logic
- regression coverage verifies new/complete series states, daily territory/setup data, Draft phase transitions and malformed Draft values
- Series lives, route selection, fixed deck/commander behavior, daily deterministic seeds, daily records, Draft offer generation, mastery, learning and combat balance are unchanged
- release: package 1.77.0 / v1.77 / iOS 1.77 (177)

## v1.78 changes

- native iOS scene startup now preserves FrontlineViewController instead of replacing it with a generic CAPBridgeViewController
- the custom FrontlineViewController is the controller that registers FrontlineStorePlugin, so StoreKit entitlement, catalog, purchase and restore calls remain reachable under scene-based iPhone lifecycle startup
- the storyboard's existing FrontlineViewController configuration is preserved when UIKit creates it; programmatic scene recovery now uses the same custom controller
- signed iOS export refuses the development placeholder bundle identifier com.frontlinegame.app
- signed GitHub Actions builds now require IOS_PRIVACY_URL and expose it to the Vite build as VITE_PRIVACY_URL
- privacy-policy URLs are accepted only as public HTTPS links without credentials or fragments; invalid/missing values stay hidden in unsigned/local builds
- when configured, the privacy policy is directly accessible from the Einsatzbasis, Feldhandbuch and Friend Duel screen
- signed release configuration validates an optional native duel server as a clean HTTPS origin before signing secrets are used
- the unsigned iPhone CI build now verifies that a PrivacyInfo.xcprivacy file from the app/SDK bundle is present before packaging the IPA
- signed archives verify the actual CFBundleIdentifier against BUNDLE_ID and verify a bundled PrivacyInfo.xcprivacy before export
- source-level release integrity tests protect the custom StoreKit controller chain, app-target membership, bundle-id gate and privacy-manifest CI gate
- no gameplay, progression, StoreKit product entitlement rules, friend-duel simulation or balance changed
- final registered bundle identifier, public privacy-policy URL and Apple signing credentials remain deployment configuration and are intentionally not invented in source control
- release: package 1.78.0 / v1.78 / iOS 1.78 (178)

## v1.79 changes

- Friend Duels now have an explicit production server runtime instead of relying on local-only server defaults
- local development remains safely bound to 127.0.0.1, while NODE_ENV=production defaults to 0.0.0.0 for container/reverse-proxy hosting
- PORT, DUEL_MAX_ROOMS, DUEL_ALLOWED_ORIGINS and DUEL_TRUST_PROXY_HOPS are parsed through a shared validated runtime configuration and invalid values fail fast
- the previous hard-coded twelve-room capacity is now a validated 2–64 deployment setting while remaining twelve rooms by default
- the server exposes /readyz with non-sensitive active-room and capacity information in addition to the existing /healthz liveness endpoint
- rate limiting can now identify clients correctly behind a trusted reverse proxy, but X-Forwarded-For remains ignored by default and is only honored when an exact trusted proxy hop count is configured
- a production Dockerfile builds the same Vite client and runs the authoritative Node duel service with a container health check
- CI now performs a real Docker image build, starts the production container, verifies /healthz and /readyz and checks the configured room capacity
- server integration coverage verifies readiness state before and after room creation plus enforcement of a configured room-capacity limit
- native/browser Duel setup copy now distinguishes a configured iPhone online server from local browser testing instead of always calling the mode a local PvP test
- production documentation explicitly records that rooms are in-memory and a single server instance is required until shared room state exists
- duel simulation, reconnect timing, room codes, rematches, decks, commanders, rewards and combat balance remain unchanged
- release: package 1.79.0 / v1.79 / iOS 1.79 (179)

## v1.80 changes

- StoreKit purchase behavior is now an explicit build-time release mode instead of permanently being sandbox-only in Swift
- both Debug and Release Xcode configurations remain fail-safe on sandbox by default, so ordinary builds cannot accidentally open a production-money purchase path
- FrontlineStorePlugin reads FrontlineStoreMode and FrontlineStoreProductID from the compiled app Info.plist rather than hard-coding the product identifier
- sandbox mode still requires Apple's Xcode/sandbox transaction environment before purchase becomes available
- production mode must be explicitly requested and permits the normal verified StoreKit purchase path while retaining all existing transaction verification
- signed archive tooling accepts FRONTLINE_STORE_MODE=sandbox|production and FRONTLINE_STORE_PRODUCT_ID, passes both to Xcode and verifies the compiled Info.plist after archiving
- the GitHub signed-IPA workflow now exposes an explicit StoreKit mode choice and requires IOS_STORE_PRODUCT_ID
- unsigned iPhone CI proves that normal builds still compile with sandbox mode and a non-empty product identifier
- the store UI is mode-aware: sandbox uses TESTKAUF and no-charge wording, while production uses KAUFEN and removes test-only messaging
- a pure store-copy helper with regression tests prevents production catalog states from accidentally presenting test-purchase copy
- native integrity tests protect Info.plist keys, sandbox defaults, Swift build-config reads, signed export propagation and archive verification
- entitlement checks, restore flow, verified StoreKit transactions, cosmetic-only benefits, gameplay and combat balance are unchanged
- release: package 1.80.0 / v1.80 / iOS 1.80 (180)

## v1.81 changes

- the Einsatzbasis is deliberately simplified around three top-level choices: SPIELEN, EVENT and BASIS
- SPIELEN is the default landing section and now leads with one large one-tap Schnellgefecht instead of presenting campaign, daily, series, draft, duel and training with equal weight
- the one-tap main battle uses the clear baseline setup Taktiker + Core-Angriff while the existing free-battle controls remain available under Gefecht anpassen
- Feldzug remains fully available under Spielen, including the next-mission hero and complete mission list, but no longer competes with the primary battle action
- Freundesduell remains available as the second social play option rather than a separate top-level mode
- EVENT exposes exactly one featured mode per local calendar day and rotates deterministically between Tagesfront, Draft and Einsatzserie
- the featured Event card carries the real daily/series status where applicable, while all three existing event modes remain accessible under Andere Events
- BASIS now contains the player's HQ, Commander, eight-card loadout, learning progression, chapter progress, history, backup and legal/help links
- the old command-center strip remains internally available for progression/state calculation but is no longer part of the visible navigation hierarchy
- returning from a match always lands back on SPIELEN with the primary one-tap battle focused, reinforcing the short battle → result → battle loop
- narrow and short iPhone layouts compact the three-way navigation, primary battle hero and featured event without adding horizontal navigation
- a pure focused-lobby helper defines the three allowed top-level labels and the deterministic daily event rotation
- regression coverage verifies stable same-day rotation, three-day coverage of all existing event types and the intentionally limited SPIELEN/EVENT/BASIS hierarchy
- no campaign missions, Tagesfront, Draft, Einsatzserie, Friend Duels, HQ, deck, Commander, progression, StoreKit, rewards or combat rules were removed
- release: package 1.81.0 / v1.81 / iOS 1.81 (181)

## v1.82 changes

- the post-match screen is reorganized around the next battle instead of making players scroll through the full analytical debrief before they can continue
- immediately after the result hero, a compact momentum card now summarizes whether the player secured the front, drew or should strike back
- consecutive local victories are surfaced as a visible win streak only when they are truly consecutive in validated match history
- two or more consecutive wins display the exact streak count; losses and draws reset the visible streak instead of preserving misleading momentum
- the primary continuation action now sits directly below the result and momentum card: next campaign mission, series continuation, daily replay, fresh Draft or immediate rematch depending on the mode that just ended
- ordinary quick-battle losses use a direct Sofort zurückschlagen action while wins keep the simpler Noch ein Gefecht loop
- returning from the result uses the lighter SPIELEN-MENÜ action and lands on the focused SPIELEN section introduced in v1.81
- mission, series, daily, learning and mastery progress rewards remain visible near the primary action so meaningful progression is not buried
- detailed decision scoring, final territory map, combat statistics, historical comparison and playtest feedback move into an optional Gefechtsbericht disclosure
- no result data is deleted; the default visual hierarchy simply prioritizes outcome, progression and the next match
- the primary next-battle button receives stronger touch hierarchy and compact small-iPhone handling
- a pure resultMomentum helper derives win streak and retry copy exclusively from validated local MatchRecord history
- regression coverage verifies consecutive-win counting, loss reset, draw reset and empty-history fallback
- campaign progression, series lives, daily records, Draft flow, mastery, learning, match history, feedback storage and all combat rules remain unchanged
- release: package 1.82.0 / v1.82 / iOS 1.82 (182)

## v1.83 changes

- the main SPIELEN hero now exposes one concrete next-progress target instead of leaving existing Feldausbildung and Unit Mastery hidden behind the Basis menus
- unfinished Feldausbildung is prioritized first and shows the exact current/goal value, practical battle instruction and Aurora reward context before the player taps Jetzt spielen
- once all four learning tasks are complete, the same slot automatically switches to the nearest upcoming mastery frame for a unit in the currently selected eight-card deck
- mastery targeting only considers units actually present in the active saved deck and prefers the frame that needs the fewest remaining mastery points
- the mastery cue reminds players of the existing three-deploy requirement rather than inventing a new quest or currency
- after every completed battle the result progression stack now also shows the updated next target and progress bar, so wins, losses and draws can all leave a visible sense of forward movement when real progress occurred
- fully mastered decks do not receive a fake target; the progress surface cleanly disappears when there is no genuine learning/mastery milestone left
- changing the saved deck immediately recalculates the visible mastery target
- narrow iPhone layouts retain the progress count/reward without crowding the primary Jetzt spielen action
- a pure nextBattleProgress helper centralizes the learning-to-mastery handoff and reward text
- regression coverage verifies learning priority, nearest mastery selection, active-deck filtering and the fully-mastered fallback
- no new mode, currency, timer, artificial daily obligation, combat bonus or pay-to-win progression was added
- learning rules, mastery thresholds, card frames, HQ progression, campaign progression, rewards and combat balance remain unchanged
- release: package 1.83.0 / v1.83 / iOS 1.83 (183)

## v1.84 changes

- brand-new players now enter an intentionally stripped-down first-session view instead of seeing the full Play / Event / Base hierarchy before they understand the core battle
- before the first completed match the main navigation, campaign shortcuts, Friend Duel and advanced battle configuration stay out of the way; the player sees the core 3-minute battle, its next real progress target and one primary action
- the first Quick Play match uses the existing Rekrut bot difficulty to create a more forgiving first contact; subsequent Quick Play matches automatically return to the standard Taktiker baseline
- the first battle hero uses direct onboarding copy and a stronger single CTA without adding a separate tutorial mode or blocking the existing in-match contextual coaching
- after the first completed match the normal SPIELEN / EVENT / BASIS navigation and secondary play choices are revealed immediately
- the first result includes one compact unlock moment explaining that Events, loadout editing and the Base are now available
- advanced custom battle controls remain progressively hidden for the first two completed matches, then appear automatically from match three onward
- existing players with prior local match history skip the progressive reveal entirely and keep the full v1.83 interface immediately
- all hidden systems remain intact; this is presentation gating only and does not delete or reset campaign, Event, Friend Duel, HQ, deck, Commander, StoreKit or saved progression
- a pure firstSessionFocus helper centralizes the three presentation phases and first-match unlock condition
- regression coverage verifies the first-battle, early-learning and full-lobby phases plus malformed local match counts
- no new mode, currency, energy gate, forced timer, monetization gate or combat advantage was added
- release: package 1.84.0 / v1.84 / iOS 1.84 (184)

## v1.85 changes

- repeat matches now enter combat faster: the first-ever battle keeps the full 3.0-second onboarding launch, while every later match compresses the same opening into 1.8 seconds
- the existing Core, supply and Commander synchronization phases are preserved rather than removed; their timing scales with the configured launch duration
- the brief LOS state after the countdown is shortened for returning players as well, reducing dead time between tapping play and the first real action
- after the first completed match, unit and tactic cards become selectable during the launch countdown so players can prepare their first move before the arena is released
- deployment itself still remains locked until the match is live, so preselection cannot move simulation time, spend energy or change combat state early
- the selected card receives restrained prelaunch emphasis and the selection hint explains that it is ready for LOS
- the first battle deliberately keeps card preselection disabled so the existing contextual coaching can introduce card choice at its intended pace
- a pure matchStartTiming helper centralizes first-battle versus returning-player timing and preselection eligibility
- matchStartVisual now accepts an explicit duration and deterministically divides any valid start window into the same three presentation phases
- regression coverage verifies first-battle timing, repeat timing, malformed match-count fallback, compressed phase boundaries and compressed progress
- match duration, starting energy, card costs, bot timing after the match goes live, objectives, progression and combat balance are unchanged
- release: package 1.85.0 / v1.85 / iOS 1.85 (185)

## v1.86 changes

- real progression milestones now receive one concise earned-reward reveal inside the existing result screen instead of being buried as plain text among several progress cards
- the reveal is intentionally milestone-only: normal matches without a genuine unlock do not fabricate a reward moment
- when several things unlock in one match, one high-value milestone is promoted and the remaining gains stay in the existing progression stack
- Aurora completion has the highest reveal priority, followed by HQ upgrades, new Unit Mastery frames and individual learning-task completions
- mastery reveals use the actual unit art and canonical mastery rank; HQ and learning/style reveals use compact symbolic badges
- the reveal sits between result momentum and the existing next-match action, so the reward is felt without forcing another modal, claim screen or delay before replay
- a dedicated short unlock sound and restrained medium haptic fire after the normal match-end feedback rather than replacing victory/defeat audio
- Reduced Motion keeps the reveal fully visible while removing the sweep/settle animation
- a pure rewardReveal helper derives milestone priority and extra-progress count from before/after learning, mastery and HQ state
- regression coverage verifies Aurora priority, HQ upgrade fallback, mastery-frame detection, lesson completion and the no-milestone case
- audio/haptic coverage now includes the dedicated unlock cue while routine combat feedback remains unchanged
- no currency, loot box, claim timer, combat bonus, pay-to-win reward or extra screen was added
- learning rules, mastery thresholds, HQ progression, cosmetics, campaign, modes and combat balance remain unchanged
- release: package 1.86.0 / v1.86 / iOS 1.86 (186)

## v1.87 changes

- the live match now recognizes a small set of genuine territory momentum swings instead of relying only on Core-critical, overtime and final-30-second warnings
- a player comeback is announced only after the player has genuinely trailed by at least two owned sectors and later moves into the lead
- a clear player advance is announced only from a strong 5+ versus 2-or-fewer territory position and only once per battle
- the mirrored 5+ versus 2-or-fewer enemy advance receives a restrained danger callout so the player immediately understands that the front is slipping
- ordinary captures, early-game movement, ties and minor one-sector leads do not trigger momentum banners, keeping the battle readable instead of turning the HUD into constant commentary
- comeback takes priority over a simultaneous strong-advance state and suppresses an immediate duplicate follow-up banner
- opportunity moments reuse the existing opportunity/capture audio and native success/capture haptics; enemy advances reuse the existing warning cue
- opportunity banners receive a distinct restrained lime treatment while danger keeps the existing red warning treatment
- all momentum memory resets at the start of every match and derives only from actual current territory ownership and elapsed match time
- a pure battleMomentum helper centralizes the rare-event thresholds, previous-deficit memory and once-per-match suppression
- regression coverage verifies early-game silence, one-time own advance, enemy danger, real comeback requirements, duplicate suppression and malformed-time safety
- no territory rule, capture speed, Core behavior, card value, bot behavior, match duration, reward, progression or balance changed
- release: package 1.87.0 / v1.87 / iOS 1.87 (187)

## v1.88 changes

- cards can now be dragged directly from the bottom deck into the arena and released to deploy, giving the iPhone battle flow a faster one-gesture input path
- the existing tap-card → aim → release interaction remains fully available, so direct drag is additive rather than a forced control rewrite
- drag only activates after a deliberate movement threshold, preserving ordinary taps and avoiding accidental deployments from normal finger jitter
- the dragged card lifts out of the hand as a compact floating card ghost that follows the finger while the source card remains visibly anchored in the deck
- client touch coordinates are mapped against the actual rendered Phaser canvas, so letterboxing and responsive FIT scaling still resolve to correct simulation coordinates
- leaving the rendered arena cancels the deployment cleanly and restores the previous card selection instead of committing an off-board action
- live drag targets use Match.validatePlay directly, so green/red target feedback follows the exact same energy, deployment-zone and ability-target rules as the committed action
- valid targets receive a restrained lime arena/drop treatment; invalid targets turn coral and surface the actual current validation reason before release
- pausing, ending the match or otherwise losing the live-match state during a drag fails closed and restores the prior selection
- touch scrolling conflicts are removed from battle cards while keyboard shortcuts and mouse/tap selection remain unchanged
- the default battle hint now teaches the simpler choice: tap a card or drag it directly into the field
- a pure card-drag helper centralizes deliberate-drag threshold detection and rendered-canvas → board coordinate conversion
- regression coverage verifies tap-jitter rejection, malformed-coordinate safety, scaled coordinate mapping, off-canvas rejection and invalid canvas geometry
- card costs, energy gain, deployment rules, ability targets, deck contents, bot behavior, progression, rewards and combat balance are unchanged
- release: package 1.88.0 / v1.88 / iOS 1.88 (188)

## v1.89 changes

- Quick Play now behaves like a simple battlefield playlist instead of repeatedly opening the same visual arena unless the player manually changes settings
- the existing four visual environments rotate deterministically after completed matches: Smaragdküste, Frostrelais, Glutbruch and Nexuskern, then repeat
- the very first Quick Play still opens on Smaragdküste with the existing Rekrut onboarding difficulty; returning Quick Play keeps the standard Taktiker baseline
- the next Quick Play arena is shown directly in the main Play hero before the player taps the one primary action
- the Play hero subtly adopts the palette of the upcoming battlefield so repeat sessions feel visually fresh without adding another menu or decision
- Quick Play rematches advance to the next battlefield automatically, strengthening the one-more-match loop
- campaign missions and Tagesfront continue using their authored themes, while manually customized free battles keep the player's selected arena exactly as before
- automatic Quick Play rotation never overwrites the saved custom arena preference
- the in-match mode label identifies the active Quick Play battlefield instead of presenting it as generic training
- the v1.88 direct drag-to-deploy input remains unchanged and works identically across every rotated battlefield
- a pure quickPlayRotation helper owns the four-arena sequence, first-match Rekrut fallback and returning-player Taktiker baseline
- regression coverage verifies first-battle behavior, full four-arena rotation, standard returning difficulty and malformed match-count safety
- no new mode, arena asset, combat modifier, random gameplay rule, currency, reward or balance change was added
- all four environments remain visual-only: territory layout, paths, capture rules, decks, Commander behavior and combat values are unchanged
- release: package 1.89.0 / v1.89 / iOS 1.89 (189)

## v1.90 changes

- Quick Play now carries real session momentum back into the SPIELEN hero instead of losing the emotional context of the previous result as soon as the player leaves the result screen
- two or more consecutive wins turn the existing hero into a restrained hot-streak state with the exact streak count, the next battlefield and one stronger Serie halten action
- a single win deliberately does not trigger a streak treatment, preventing routine victories from becoming constant celebration noise
- after a loss, the same existing Quick Play entry becomes a focused Revanche state with Sofort zurückschlagen language but no penalty, boost or artificial recovery mechanic
- draws stay neutral and frame the next match as the deciding front
- first-battle and early-learning onboarding remain untouched; session momentum only overrides the full returning-player presentation
- the already existing rotating Quick Play battlefield remains visible in every state and still follows the deterministic v1.89 four-arena playlist
- the existing launch countdown now uses its first synchronization phase to carry the same arena/session context, such as SERIE ×3 or REVANCHE, without adding any extra countdown time
- later countdown phases remain unchanged so Core, supply and Commander synchronization stay familiar and readable
- the session treatment derives only from validated local MatchRecord history and never changes bot strength, energy, deck values, rewards or progression
- a pure quickPlaySessionCue helper centralizes neutral, hot-streak, loss-rebound and draw presentation
- regression coverage verifies multi-win streaks, one-win restraint, loss rebound, draw handling and malformed/empty-history fallback
- no new mode, currency, reward track, gameplay bonus, timer or monetization system was added
- release: package 1.90.0 / v1.90 / iOS 1.90 (190)

## v1.91 changes

- the live resource row now shows the actual territory race for both sides instead of only displaying the player's owned-sector count
- the compact score reads player territory versus enemy territory at a glance while nine tiny segments retain the exact 3x3 ownership state
- every segment is driven directly from the current MatchState point owners: mint for player, coral for enemy and neutral gray for unclaimed territory
- the race presentation distinguishes player lead, enemy lead and an even front without inventing percentages, rankings or hidden advantage calculations
- the accessible label mirrors the same exact counts and neutral-zone total for screen readers
- only a genuine leadership reversal triggers one restrained front-shift pulse; ordinary captures, ties and the first lead remain quiet
- the previous non-neutral leader is remembered through temporary ties so an actual comeback/lead flip still reads clearly without double-firing on the tie itself
- the existing v1.87 rare momentum banners remain unchanged; this is a persistent at-a-glance score, not another banner or commentary system
- tight and narrow iPhone layouts compress the score and nine segments rather than removing battlefield information
- Reduced Motion keeps the changed-front emphasis visible without animation
- a pure frontRace helper centralizes player/enemy/neutral counts, lead state and accessible copy
- regression coverage verifies the initial 3-3-3 board, player advantage, enemy advantage and empty-state safety
- territory ownership, capture rules, supply, Core behavior, timers, bot behavior, rewards and combat balance are unchanged
- release: package 1.91.0 / v1.91 / iOS 1.91 (191)



## v1.92 changes

- the final 30 seconds now expose the exact current time-limit outcome instead of making the player mentally combine several HUD values
- the outlook uses the same tiebreak order as the engine: control time first in Signalkrieg, then Core fraction, then owned territory, then draw
- Overtime keeps the outlook visible for the full extra period so the player always knows what the current fallback result would be
- the compact timer area shows VORTEIL DU, VORTEIL GEGNER or GLEICHSTAND plus the exact deciding metric
- Core mode shows the real Core percentages before falling back to territory
- Signalkrieg shows actual accumulated control seconds before any Core or territory comparison
- the normal phase label returns automatically outside the deciding window, avoiding permanent HUD clutter
- no new banner, sound or haptic was added; the existing last-push and critical-Core moments remain unchanged
- a pure timeLimitOutlook helper mirrors the engine's real score resolution rules and is covered by regression tests
- combat values, match duration, Overtime rules, control scoring, territory capture, bot behavior and balance are unchanged
- release: package 1.92.0 / v1.92 / iOS 1.92 (192)

## v1.93 changes

- the Core HUD now distinguishes a genuinely active assault from a Core that is merely damaged or critical
- a player unit counts toward Durchbruch only when the shared unitCombatTarget logic says it is currently targeting the enemy Core
- the mirrored player-Core warning uses the exact same target rule for enemy attackers
- active assaults replace the passive Core status with DURCHBRUCH ×N or CORE UNTER FEUER ×N, where N is the exact number of living units currently committed to the Core
- nearby defending units naturally remove attackers from the assault count when those attackers switch to the defender, so the HUD cannot claim Core pressure while combat logic is targeting something else
- dead units are excluded and destroyed Cores keep the existing destroyed status
- the Core health track receives a restrained lock pulse only while a real assault exists; Reduced Motion keeps the emphasis without animation
- accessibility labels include the same exact assault count
- no sound, banner or haptic was added, avoiding duplicate noise with the existing critical-Core and battle-momentum callouts
- a pure coreAssault helper derives the presentation directly from authoritative MatchState and unitCombatTarget
- regression coverage verifies multiple attackers, mirrored enemy pressure, defender interception and dead-unit exclusion
- targeting, unit damage, Core HP, turret behavior, win conditions, bot behavior and combat balance remain unchanged
- release: package 1.93.0 / v1.93 / iOS 1.93 (193)

## v1.94 changes

- the live energy row now communicates match tempo without adding another HUD widget or new gameplay system
- below 80% energy the presentation stays exactly as restrained as before
- at 80% or more, the existing energy bar shifts into a warmer high-energy state so players can feel that they are approaching the cap without reading another number
- at the real ENERGY_CAP the current resource row becomes ENERGY VOLL and the existing selection hint changes to ENERGIE VOLL · JETZT KARTE SPIELEN when no card is selected
- crossing into full energy triggers one short visual pulse on the current energy bar and already-affordable cards; it does not loop continuously while energy remains capped
- spending any energy naturally clears the capped state, allowing a later genuine cap crossing to trigger again
- selected cards, insufficient-energy countdowns, drag-to-deploy validation and prelaunch card selection retain their existing higher-priority guidance
- no sound, banner or haptic is added for full energy, preventing the tempo cue from competing with combat, Core and Commander feedback
- Reduced Motion preserves the high/full-energy distinction while removing the one-shot pulse animation
- resource accessibility copy now exposes the exact current energy value and cap
- the existing energy-feedback helper now owns normal, high and capped tempo states and sanitizes malformed capacity values
- regression coverage verifies the quiet normal range, 80% high-energy threshold, exact cap behavior and malformed-input fallback
- energy generation rate, ENERGY_CAP, card costs, deployment rules, bot behavior, objectives, rewards and combat balance are unchanged
- release: package 1.94.0 / v1.94 / iOS 1.94 (194)



## v1.95 changes

- Quick Play now derives its battlefield and difficulty from the same rotation state on every launch and rematch
- the first Quick Play remains REKRUT while every later Quick Play correctly moves to the TAKTIKER baseline, including direct rematches
- Quick Play no longer overwrites the player's separately chosen training difficulty
- Quick Play no longer mutates the training objective selector and explicitly starts as a Core battle, so returning to custom training preserves the player's previous mode
- result replay actions now distinguish a draw from a loss instead of showing SOFORT ZURÜCKSCHLAGEN for both
- Quick Play wins continue the lightweight session flow with NÄCHSTE FRONT, while genuine multi-win momentum uses SERIE HALTEN without creating a separate game mode
- Quick Play losses use ZURÜCKSCHLAGEN and draws use NOCHMAL
- regression coverage verifies the replay-copy states; the existing rotation suite continues to verify first-match rookie difficulty and later standard difficulty
- combat stats, cards, energy, bot logic, objectives, rewards, progression and match duration are unchanged
- release: package 1.95.0 / v1.95 / iOS 1.95 (195)


## v1.96 changes

- Quick Play progression is now isolated from campaign, Draft, Tagesfront, Einsatzserie and custom training results
- arena rotation and the first-match REKRUT onboarding now count completed Quick Play matches only, instead of all matches on the device
- Quick Play win streak, last outcome and replay momentum are stored separately from the global match record
- campaign or event wins can no longer create a false Quick Play SERIE ×N state, and losses outside Quick Play no longer break a real Quick Play streak
- the result screen uses the dedicated Quick Play streak when a Schnellgefecht ends; other modes keep the existing general result momentum
- old stats saves remain valid because the new Quick Play fields are optional and normalized only when present
- portable v1/v2 backups therefore remain compatible without a format migration; new backups preserve the additional fields automatically once Quick Play has been played
- malformed Quick Play counters fail safe, streaks cannot exceed completed Quick Play matches, and non-win outcomes reset the stored streak
- regression coverage verifies isolated session cues, legacy stats compatibility and Quick Play-only result momentum
- combat values, bot logic, cards, energy, rewards, campaign progression and match duration are unchanged
- release: package 1.96.0 / v1.96 / iOS 1.96 (196)


## v1.97 changes

- legacy players no longer get treated as brand-new Quick Play users after the v1.96 state split
- on the first v1.97 launch, an old save without dedicated Quick Play progress preserves its previous global match count as a one-time Quick Play rotation baseline
- this keeps the existing battlefield sequence and prevents experienced players from being dropped back to the REKRUT first-match difficulty after updating
- the migrated baseline is persisted immediately; campaign, Draft, Tagesfront, Einsatzserie and custom training results after migration no longer affect Quick Play progression
- Quick Play streak and last-outcome state intentionally start neutral during migration because older saves did not contain enough mode metadata to reconstruct those values reliably
- fresh installs still start at Quick Play match zero and receive the intended REKRUT onboarding
- saves that already contain v1.96 Quick Play progress are left untouched
- portable legacy backups remain accepted without a backup-format bump; restored legacy data is migrated by the normal startup path
- regression coverage verifies old-save migration, fresh-install behavior and precedence of dedicated Quick Play progress
- combat balance, cards, bots, rewards, objectives and match duration are unchanged
- release: package 1.97.0 / v1.97 / iOS 1.97 (197)


## v1.98 changes

- the live battlefield renderer now targets 60 FPS instead of 30 FPS
- card dragging, deployment aiming, unit animation, combat flashes, camera shake and arena atmosphere therefore update at twice the previous visual cadence on capable devices
- the deterministic Match simulation remains at 30 Hz, so movement speed, energy generation, attack intervals, bot timing, objectives and match duration are unchanged
- the renderer no longer explicitly requests the browser's low-power GPU path and instead uses the default platform power preference
- DOM HUD updates remain throttled independently, avoiding unnecessary extra layout work while the Phaser battlefield renders more smoothly
- a dedicated render-profile helper documents the separation between 60 FPS presentation and 30 Hz simulation
- regression coverage verifies the intended render target and guards against accidentally coupling render frequency to gameplay timing
- no cards, damage values, cooldowns, rewards or progression rules were changed
- release: package 1.98.0 / v1.98 / iOS 1.98 (198)


## v1.99 changes

- unit movement presentation now bridges the visual gap between deterministic 30 Hz simulation ticks while the battlefield renders at 60 FPS
- moving units no longer alternate between moving and stopped states on render-only frames
- walk bob, lean and settle animation therefore stay continuous instead of flickering every second 60 FPS frame
- unit sprites and their ground footprint interpolate short normal movement steps across the extra render frame
- large displacement effects still snap immediately, preserving the punch and readability of knockback or teleport-like movement
- reduced-motion mode keeps exact simulation positions without presentation interpolation
- 30 FPS fallback devices preserve the previous exact per-tick positioning
- regression coverage verifies 60 FPS interpolation, 30 FPS fallback behavior, large-displacement snapping and prevention of false movement stops
- deterministic combat simulation, collision logic, targeting, damage, energy, bot decisions and match timing are unchanged
- release: package 1.99.0 / v1.99 / iOS 1.99 (199)


## v2.00 changes

- all unit-attached battlefield presentation now follows the same interpolated 60 FPS position as the unit sprite
- weapon-cycle rings, muzzle flashes, movement trails, settle rings, Medic charge visuals, shields, tempo and slow effects no longer lag behind the moving unit by a 30 Hz simulation frame
- health and shield bars, damage scars, sparks, smoke and critical-health warning effects stay visually locked to the unit while it moves
- target-lock source lines now originate from the interpolated shooter position while authoritative targeting and range checks remain unchanged
- ground footprints and status pips share the presentation anchor, removing the subtle split between a smooth sprite and stepping overlays introduced by the v1.99 interpolation
- effect matching and combat calculations still use authoritative simulation coordinates; only rendering anchors were changed
- deterministic combat simulation, damage, movement speed, targeting, collision, bot logic, energy and match timing are unchanged
- existing unit-motion interpolation regression coverage continues to verify 60 FPS, 30 FPS fallback, reduced-motion and large-displacement behavior
- release: package 2.0.0 / v2.00 / iOS 2.00 (200)
