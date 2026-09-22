# Frontline

Mobile-first portrait tactical territory PvP prototype built with Phaser, TypeScript, Vite and Capacitor.

## Current v1.28

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

