# Lid readability (ad-first / small size)

Screenshots: `lid-before.png` → `lid-after.png` (preview via `lid-preview.html`).

## CSS deltas (`.tube-lid` + cap-pending)

| Prop | Before | After |
|------|--------|-------|
| height | 16px | **22px** |
| width | 108% | **118%** (overhang) |
| top | -2px | **-6px** |
| metal gradient | soft mid greys | brighter white → steel stops |
| box-shadow | light drop + thin inset | deeper drop + stronger inset rim |
| `::after` highlight | 28%×5px @ 0.45 | **38%×7px** bright + glow |
| pending pulse | 0.65s, scale 1.08, brightness 1.35 | **0.55s, scale 1.14, brightness 1.55**, thicker gold outline |

No gameplay / IAP / JS changes.
