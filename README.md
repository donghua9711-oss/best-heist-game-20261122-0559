# The Night Vault — a one-room museum heist

[![make.fun — best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/donghua9711-oss/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/donghua9711-oss/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

One thief. One golden disk. Three guards who would rather you left empty-handed.

**The Night Vault** is a complete top-down stealth game that runs offline in a desktop
browser from its own static files — no build step, no network, no library. Cross the
Ashworth Museum's Meridian Gallery in the dark, read the guards' patrols and the cameras'
sweeps, lift the **Sun Disk** from the laser-guarded vault wing, and slip out the service
door before the alarm meter fills and the hunt is on.

## The night

- **One room, three halls, several routes** — the north gallery, the central hall and the
  south hall, joined by door gaps, with display cases, pillars, planters and benches as
  cover that blocks sight or just slows your feet.
- **Guards with vision cones** who patrol, stop and stare when they glimpse you, walk over
  to investigate a noise, and hunt in earnest once the alarm trips. A guard's grip ends the
  night, so the cones are worth reading before you move.
- **Two sweeping cameras** that never blink and cannot be distracted, and a **laser grid**
  across the vault doorway that dumps the alarm up if you cross it while it is live.
- **Tools at a cost**: three coins to toss (click) that turn every nearby guard's head, and
  a sneak (Shift) that trades speed for a fainter outline.
- **Loot**: the Sun Disk ($10,000, and it takes both hands and a held breath to lift) plus
  five side pieces in the cases — the Sapphire Tiara, the Jeweled Chalice, the Emerald
  Scarab, the Gold Ingots and the Ivory Vase.
- **A getaway that grades you**: Ghost, Phantom, Shadow, or Smash and Grab, by the highest
  the alarm meter ever climbed.

## Controls

| Input | Action |
| --- | --- |
| WASD or arrow keys | Move |
| Shift | Sneak (slower, harder to spot) |
| Mouse click | Toss a coin to that spot |
| P or Esc | Pause |
| R | Restart the night |
| Enter or Space | Begin / play again |

## Run it

```bash
node serve.ts
```

then open http://localhost:8080. The game is plain files under `game/`; any static file
server does as well.

## Hand in

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output folder and writes the dossier the
judge reads, built with the vendored make.fun library (`vendor/makefun-game.ts`, the kit's
copy, unchanged).

## Layout

- `game/index.html` — the page: one canvas, one screen-reader status line.
- `game/src/config.js` — every tuning number and colour.
- `game/src/level.js` — the gallery as data: walls, furniture, patrols, cameras, lasers, loot.
- `game/src/vision.js` — vision cones and line of sight past walls and tall furniture.
- `game/src/movement.js` — round bodies sliding through a rectangular world.
- `game/src/guards.js` — patrol, suspicion, investigation and the hunt.
- `game/src/cameras.js` — the sweeping lenses.
- `game/src/alarm.js` — the alarm meter: what pours in, what drains, when it trips.
- `game/src/world.js` — the night itself: the fixed-step simulation and its events.
- `game/src/render.js` — everything drawn: floor, cones, actors, HUD, screens.
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — the deterministic screenshot scenes behind `?shot=`.
- `game/src/main.js` — boot, the one loop, and the screens' flow.
- `screenshots/` — four frames of the real game, staged by `game/src/shots.js` from a fresh
  world at a fixed seed (`shots.json` names the queries).
