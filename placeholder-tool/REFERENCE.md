# Printable UI reference — parity with `printed_ui.png`

This document ties the **intended printed appearance** to the codebase. The **ground-truth image** is:

- **`printed_ui.png`** (repository root), or the archived copy under `assets/` if present.

Use it at **actual card size (63 mm × 88 mm)** when checking PDF output (screen zoom or printed proof). The implementation is driven by the JSX-derived scale in `app.py` and documented in **`CURSOR.md`**.

---

## What “match the image” means

| Area | Target (from reference art) | Implementation anchor |
|------|------------------------------|------------------------|
| Grid on A4 | 3×3 cards, gaps and margins per spec | `CURSOR.md` → Page Layout; `GAP`, `MARGIN_*` in `app.py` |
| Card shell | Rounded rect, light fill, subtle border | `CARD_R`, `COLOR_CARD_BORDER`, clip + stroke in `draw_card` |
| Header band | Dark bar, gold/yellow spaced title (user-customisable) | `FONT_HEADER_PT`, `LETTER_SPACE_HEADER_PT`; colours from form |
| Name row | Bold name left; rarity **badge** right — **circle** if one letter (C/U/R), else **rounded rectangle** (corner radius capped so it is not a pill); vertically aligned with the name line | `FONT_NAME_PT`, `BADGE_*`; `RARITY_MAP` |
| Art zone | Rounded inner panel, large centred number, `/total` bottom-right | `ART_*`, `FONT_WATERMARK_PT`, `LETTER_SPACE_WATERMARK_PT`, `FONT_TOTAL_PT`, baked greys |
| Label row | Finish type left + rarity name right; default `#AAAAAA`; special rarities coloured on the right | `FONT_RARITY_PT`, `LETTER_SPACE_RARITY_PT`, `COLOR_RARITY_LABEL_DEFAULT`, `labelColor` |
| Footer | Thin top rule, centred `kollekt.gg`, spaced, muted | `FOOTER_*`, `FONT_FOOTER_PT`, `LETTER_SPACE_FOOTER_PT` |

Alignment rule from the design: **left edge of name and label row lines up with the art box**; **badge and rarity text align to the art box right** — implemented via `SIDE_PAD`, `ART_MARGIN`, and shared horizontal bounds in `app.py`.

---

## Constants map (quick)

All derived from **215×301 px → 63×88 mm**. Full tables: **`CURSOR.md` → Constants Reference**.

- **Heights:** `HEADER_H`, `NAME_H`, `TYPE_H`, `ART_H`, `RARITY_H`, `FOOTER_H` — must sum to `CARD_H`.
- **Fonts (pt):** `FONT_HEADER_PT`, `FONT_NAME_PT`, `FONT_BADGE_PT`, `FONT_WATERMARK_PT`, `FONT_TOTAL_PT`, `FONT_RARITY_PT`, `FONT_FOOTER_PT`.
- **Letter spacing (pt):** `LETTER_SPACE_HEADER_PT`, `LETTER_SPACE_WATERMARK_PT`, `LETTER_SPACE_RARITY_PT`, `LETTER_SPACE_FOOTER_PT`.
- **Colours:** `COLOR_*` and baked watermark/total greys — see **`CURSOR.md` → Colours / Opacity baking**.

---

## Known deviations from pixel-perfect CSS/JSX

These are **expected** unless fonts or rendering are upgraded:

1. **Watermark weight:** Design calls for heavy/black weight; PDF uses **Helvetica-Bold** (700). Closer match needs **embedded TTF** (`pdfmetrics.registerFont`).
2. **Art background:** JSX gradient is **flattened** to `#F4F4F4` in PDF.
3. **Letter spacing:** Characters drawn individually; **no font kerning** interaction with negative watermark spacing — may differ slightly from browser text.

Do not “fix” these silently without remeasuring against **`printed_ui.png`** and updating **`CURSOR.md`** Known Constraints.

---

## Regression checks

1. Generate PDF from `sample.csv` (see `README.md`).
2. Compare one card to **`printed_ui.png`**: header, name+badge, art numbers, label row (finish + rarity), footer.
3. Confirm **print dialog**: A4, **100% / Actual size** (not fit-to-page) — see **`GUIDE.md` → Print Settings**.

---

## Related files

| File | Role |
|------|------|
| `app.py` | Flask routes, CSV parse, PDF generation, all layout constants |
| `templates/index.html` | Web UI; preview bar; POST to `/generate` |
| `CURSOR.md` | Coordinate system, `draw_card` behaviour, crop marks, API |
| `GUIDE.md` | End-user instructions and CSV/rarity reference |

Cursor automation: **`.cursor/rules/binder-placeholder-pdf.mdc`** (when editing `app.py`), **`.cursor/rules/binder-placeholder-project.mdc`** (always-on project map).
