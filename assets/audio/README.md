# ColorTube Sort — SFX (`assets/audio`)

Language-free sample clips replacing the old WebAudio oscillator beeps in `assets/js/game.js`.

| File stem | Use | Approx length |
|-----------|-----|---------------|
| `pour` | Liquid pour into tube | 450 ms |
| `land` | Soft settle after pour | 90 ms |
| `complete` | Single tube filled | 170 ms |
| `uncap` | Lid uncover | 180 ms |
| `blocked` | Capped reject / shake | 240 ms |
| `win` | Level clear celebration | 630 ms |
| `ui_tap` | Primary HUD button tap | 30 ms |

Formats: `.ogg` (primary) + `.mp3` (fallback). No speech.

## Generation

Original procedural synthesis via `ffmpeg` lavfi (pink/brown/white noise + sine), **not** third-party packs — safe for store / UA.

Re-generate from the box (example):

```bash
# see agent notes / PR description for exact ffmpeg graphs
```

`scripts/sync-www.sh` copies all of `assets/` into `www/assets/`, so these ship with Capacitor builds automatically.

## v2 tactile pass (pour / uncap / blocked)

CEO follow-up after #15: keep land/complete/win/ui_tap; re-synthesize **pour** (layered liquid), **uncap** (metal lid pop+ring), **blocked** (multi-impact plastic/metal rattle). Still ffmpeg lavfi, no speech, no third-party packs.
