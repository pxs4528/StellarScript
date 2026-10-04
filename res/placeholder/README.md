# Placeholder art

Everything in this folder is a stand-in written by `tools/make-placeholders.js`: a flat coloured block with a cross and a short tag. None of it is meant to ship.

To replace one, draw the real pixel art at the same size and save it over the file with the same name. No code changes are needed.

| File | Size | Used for |
| --- | --- | --- |
| `joker-*.png` | 32x32 | Joker cards in the hangar and the encounter HUD |
| `upgrade-*.png` | 32x32 | Hardware upgrades in the shop |
| `part-*.png` | 32x32 | New ship parts in the shop (radar, shield) |
| `service-repair.png` | 32x32 | Hull repair in the shop |
| `boss.png` | 64x64 | The boss ship, drawn at 3x |
| `shield.png` | 48x48 | The shield bubble around the ship, drawn at 3.5x |

The rocks, drones, bullets, explosions and the player ship still use the existing sprite sheets in `res/`.
