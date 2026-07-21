# Binder Placeholder Generator — Technical Reference (for AI / Cursor)

This document describes the architecture, coordinate system, unit conventions, and critical constraints of the placeholder generator. Read this before making any changes to `app.py`.

---

## Project Overview

A Flask web app that generates print-ready A4 PDFs containing TCG binder placeholder cards. Users upload a CSV file with card data, configure header colours, and receive a downloadable PDF. Each card is 63mm × 88mm (standard TCG size), arranged 9 per A4 page (3×3) with crop marks.

The card design is derived pixel-for-pixel from a React JSX mockup (`placeholder-redesign-basis.jsx`). Every dimension in the PDF is computed by scaling JSX pixel values to physical print units.

### Stack

- **Python 3** with **Flask** (web server + routing)
- **ReportLab** (PDF generation via `canvas.Canvas`)
- **Single file architecture** — all logic lives in `app.py`
- **No database, no auth, no external services**

### File Structure

```
placeholder-tool/
├── app.py              # Everything: constants, helpers, card drawing, PDF gen, CSV parsing, routes
├── templates/
│   └── index.html      # Jinja2 template, standalone (inline CSS/JS, no external deps)
├── sample.csv          # 23-card test fixture
├── GUIDE.md            # Human-facing user guide
├── CURSOR.md           # This file
└── README.md           # Quick-start
```

### Names in `app.py` (vs. older docs below)

Scale: `PTS_PER_JSX_PIXEL_X` / `PTS_PER_JSX_PIXEL_Y` (formerly `SX` / `SY`). JSX size: `JSX_CARD_WIDTH_PX` / `JSX_CARD_HEIGHT_PX`. Fonts: `FONT_*_PT`; letter spacing: `LETTER_SPACE_*_PT`; fills/strokes: `COLOR_*` (name text: `COLOR_CARD_NAME_TEXT`). Meaning is unchanged — formulas below still apply if you mentally substitute.

---

## Critical: Unit System

**This is the most important thing to understand.** A unit conversion bug was the root cause of every visual defect in v1. Do not repeat it.

### ReportLab's `mm` constant

```python
from reportlab.lib.units import mm
# mm = 2.8346 (this is POINTS, not millimetres)
# 63 * mm = 178.58 points (which equals 63mm on paper)
```

`mm` is a **multiplier that converts millimetres to points**. All ReportLab coordinates, dimensions, and font sizes are in **points**. When you write `63 * mm`, the result is `178.58` — that's 178.58 **points**, which prints as 63mm.

### Scale factors SX and SY

```python
JSX_W = 215.0   # pixels
JSX_H = 301.0   # pixels
CARD_W = 63 * mm  # 178.58 points
CARD_H = 88 * mm  # 249.45 points

SX = CARD_W / JSX_W  # 0.8306 points per JSX pixel (horizontal)
SY = CARD_H / JSX_H  # 0.8287 points per JSX pixel (vertical)
```

**SX and SY are in points/px.** When you multiply a JSX pixel value by SX or SY, the result is already in **points**. This means:

- **Font sizes**: `F_NAME = 12.5 * SY` → 10.4 **points** (ready to pass to `c.setFont`)
- **Dimensions**: `SIDE_PAD = 10.0 * SX` → 8.3 **points** (ready to use in coordinates)
- **Letter spacing**: `LS_HEADER = 2.0 * SX` → 1.66 **points**

### The bug that must never recur

```python
# WRONG — double conversion, produces values 2.83× too large
F_NAME = 12.5 * SY * MM_TO_PT  # 29.4pt (BROKEN)

# CORRECT — SY already gives points
F_NAME = 12.5 * SY              # 10.4pt (CORRECT)
```

**Rule: Never multiply an SX/SY-derived value by MM_TO_PT.** The constant `MM_TO_PT` exists in the file but is unused. It should stay that way. If you need to convert a raw millimetre value to points (rare), use `value * mm` instead.

---

## Card Anatomy

Each card is a vertical stack of six sections. Heights are derived from the JSX flex layout:

```
┌─────────────────────────────┐
│       HEADER (20.6px)       │  Coloured bg, uppercase title, letter-spaced
├─────────────────────────────┤
│ Card Name          [BADGE]  │  NAME ROW (24px) — padding: 7px 10px 2px
├─────────────────────────────┤
│                             │
│         ╔═══════╗           │
│         ║  001  ║           │  ART ZONE (200.6px) — flex + former type band
│         ╚═══════╝           │  Watermark number, /total bottom-right
│                       /217  │
├─────────────────────────────┤
│ Non-holo           Common   │  LABEL ROW (19.8px) — finish left, rarity right
├─────────────────────────────┤
│       kollekt.gg            │  FOOTER (20.6px) — border-top + padding 5px
└─────────────────────────────┘
```

### Section height derivation

Each JSX section height = top padding + content line height + bottom padding.

| Section | JSX padding | Font px | Line height (×1.2) | Total px | Points (×SY) |
|---|---|---|---|---|---|
| Header | matched to footer | 8 | 9.6 | 20.6 | 17.07 |
| Name | 7 + 2 | 12.5 | 15.0 | 24.0 | 19.89 |
| Type band | 0 + 4 | 9.5 | 11.4 | 15.4 | 12.76 | *(height folded into art; label drawn in row below)* |
| Art | flex:1 | — | — | 200.6 | 166.24 |
| Label row | 5 + 4 | 9 | 10.8 | 19.8 | 16.41 |
| Footer | 1(border) + 5 + 5 | 8 | 9.6 | 20.6 | 17.07 |
| **Total** | | | | **301.0** | **249.45** |

Header height is set equal to footer height (20.6px) rather than the JSX original (21.6px). The 1px difference is absorbed by the art zone. This ensures the header and footer bands are visually identical.

The total must equal CARD_H (249.45pt = 88mm). Art zone height is the remainder after all fixed sections.

---

## Constants Reference

### Dimensions (all in points, derived from JSX px × SX or SY)

| Constant | JSX px | Points | mm | What |
|---|---|---|---|---|
| `CARD_W` | 215 | 178.58 | 63 | Card width |
| `CARD_H` | 301 | 249.45 | 88 | Card height |
| `CARD_R` | 10 | 8.31 | 2.93 | Card border radius |
| `SIDE_PAD` | 10 | 8.31 | 2.93 | Left/right content padding |
| `ART_MARGIN` | 10 | 8.31 | 2.93 | Art zone left/right inset |
| `ART_R` | 7 | 5.81 | 2.05 | Art zone border radius |
| `BADGE_R` | 6 | 4.98 | 1.76 | Badge border radius (rounded square, NOT pill) |
| `BADGE_PX` | 6 | 4.98 | 1.76 | Badge horizontal padding |
| `BADGE_PY` | 2 | 1.66 | 0.58 | Badge vertical padding |

### Font sizes (all in points)

| Constant | JSX px | Points | Used for |
|---|---|---|---|
| `F_HEADER` | 8 | 6.6 | Header title text |
| `F_NAME` | 12.5 | 10.4 | Card name (bold) |
| `F_BADGE` | 8 | 6.6 | Rarity badge text (bold) |
| `F_WATERMARK` | 88 | 72.9 | Art zone watermark number (bold) |
| `F_TOTAL` | 8.5 | 7.0 | "/total" text in art zone |
| `F_RARITY` | 9 | 7.5 | Rarity label text |
| `F_FOOTER` | 8 | 6.6 | Footer "kollekt.gg" text |

### Letter spacing (all in points)

| Constant | JSX px | Points | Used for |
|---|---|---|---|
| `LS_HEADER` | +2.0 | +1.66 | Header title |
| `LS_WATERMARK` | −3.0 | −2.49 | Watermark number (negative = tighter) |
| `LS_RARITY` | +0.5 | +0.42 | Finish type + rarity label row |
| `LS_FOOTER` | +1.5 | +1.25 | Footer text |

### Colours

| Constant | Hex | Source |
|---|---|---|
| `CLR_ART_BG` | #F4F4F4 | Art zone background (JSX: `linear-gradient(145deg, #F4F4F4, #ECECEC)`, flattened) |
| `CLR_WATERMARK` | #E8E8E8 | Baked: #4A4A49 at 7% opacity on #F4F4F4 |
| `CLR_TOTAL` | #C0C0C0 | Baked: #4A4A49 at 30% opacity on #F4F4F4 |
| `CLR_LABEL_DFLT` | #AAAAAA | Default finish type + rarity label colour (C, U, R, RR) |
| `CLR_FOOTER_BG` | #F7F7F7 | Footer background |
| `CLR_FOOTER_LN` | #EEEEEE | Footer top border |
| `CLR_FOOTER_TXT` | #C0C0C0 | Footer text |
| `CLR_BORDER` | #DDDDDD | Card outline stroke |

### Opacity baking formula

The JSX uses CSS opacity on coloured elements over a background. ReportLab doesn't support layer opacity, so colours are pre-calculated:

```
result_channel = (1 - opacity) × bg_channel + opacity × fg_channel
```

Example: CHARCOAL #4A4A49 (rgb 74,74,73) at 0.07 opacity on #F4F4F4 (rgb 244,244,244):

```
R = 0.93 × 244 + 0.07 × 74 = 232 → 0xE8
G = 0.93 × 244 + 0.07 × 74 = 232 → 0xE8
B = 0.93 × 244 + 0.07 × 73 = 232 → 0xE8
Result: #E8E8E8
```

---

## Key Functions

### `draw_card(c, x, y, card, base_total, title, title_color, title_bg_color)`

Draws one complete placeholder card. `x, y` is the bottom-left corner in ReportLab coordinates (Y increases upward). This function:

1. Computes section boundary Y coordinates from top down
2. Clips to a rounded rectangle (card outline)
3. Draws each section in order: header → name+badge → art zone → label row (finish + rarity) → footer
4. Restores clip state
5. Draws card border stroke on top

**Coordinate system**: ReportLab uses bottom-left origin with Y increasing upward. The JSX uses top-left origin with Y increasing downward. Section boundaries are computed from `card_top` (= `y + CARD_H`) downward: `header_bot = card_top - HEADER_H`, etc.

### `draw_text_spaced_centered(c, cx, y, text, font, size, spacing_pt)`

Draws text centered at `cx` with custom letter spacing. Computes total width (all character widths + inter-character spacing), then starts drawing from `cx - total_w/2`. All units in points.

### `draw_text_spaced_right(c, right_x, y, text, font, size, spacing_pt)`

Same as centered, but right-aligned at `right_x`.

### `baseline_for_center(band_bottom, band_h, font_size_pt)`

Computes the baseline Y coordinate to visually center text within a horizontal band. Uses sans-serif heuristics: ascent ≈ 0.72 × font_size, descent ≈ 0.20 × font_size. The visual center of the text is at `baseline + 0.26 × font_size`, so `baseline = band_center - 0.26 × font_size`.

### `baseline_from_top(section_top_rl, pad_top, font_size_pt)`

Computes baseline for CSS-style top-padded text (used for card name positioning). Accounts for line-height 1.2 half-leading and ascent.

### `parse_csv(file_stream)`

Reads a CSV file stream (bytes). Handles UTF-8 BOM. Normalises headers to lowercase with underscores. Returns a list of card dicts sorted by number. Empty name rows are skipped.

### `generate_pdf(cards, title, title_color, title_bg_color, output_path)`

Orchestrates the full PDF. Calculates page count from card count, iterates pages, places 9 cards per page in a 3×3 grid with crop marks, adds page footer.

---

## Page Layout

```
┌──────────────── A4 (210mm × 297mm) ─────────────────┐
│                                                       │
│  margin_x = 7.5mm                                     │
│  ┌─────────┐ 3mm ┌─────────┐ 3mm ┌─────────┐        │
│  │  Card 1 │ gap │  Card 2 │ gap │  Card 3 │        │
│  │ 63×88mm │     │ 63×88mm │     │ 63×88mm │        │
│  └─────────┘     └─────────┘     └─────────┘        │
│       3mm gap                                         │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐        │
│  │  Card 4 │     │  Card 5 │     │  Card 6 │        │
│  └─────────┘     └─────────┘     └─────────┘        │
│       3mm gap                                         │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐        │
│  │  Card 7 │     │  Card 8 │     │  Card 9 │        │
│  └─────────┘     └─────────┘     └─────────┘        │
│                                                       │
│           Page X of Y · Title · kollekt.gg            │
│  margin_y = 13.5mm                                    │
└───────────────────────────────────────────────────────┘
```

Cards fill left-to-right, top-to-bottom. In code, the row index is inverted (`ROWS - 1 - (i // COLS)`) because ReportLab Y=0 is at the bottom.

---

## Rarity System

`RARITY_MAP` is a dict keyed by rarity code string. Each entry has:

```python
{
    "label": str,       # Full display name ("Common", "Double Rare", etc.)
    "bg": str,          # Hex colour for badge background
    "labelColor": str | None,  # If set, rarity label uses this colour; if None, uses #AAAAAA
    "goldBadge": bool,  # UNUSED — kept in data structure but badge text is always white
}
```

Badge text is always white regardless of background colour. The `goldBadge` field is retained in the data structure but not read by the drawing code.

Rarity labels use regular weight (Helvetica) for all rarities. The `labelColor` field only controls the text colour — SR/SIR/HR labels display in their rarity colour, while C/U/R/RR use the default grey (#AAAAAA).

### Badge shape

The badge height is computed as `F_BADGE * 1.2 + 2 * BADGE_PY` (using CSS line-height, not raw font size). This makes the badge taller than the radius (`BADGE_R = 6px × SX = 4.98pt`), producing a rounded rectangle. Using raw font size instead of line-height would make `radius ≈ height/2`, creating a pill shape — this is a bug that was fixed in v2.

---

## Crop Marks

L-shaped marks at each card corner, offset 0.5mm from the card edge, 3mm arm length, 0.25pt stroke in #999999. These marks guide cutting and do not touch the card boundary.

---

## Flask Routes

| Route | Method | Description |
|---|---|---|
| `/` | GET | Serves `index.html` (the form UI) |
| `/generate` | POST | Accepts form data + CSV file, returns PDF as download |

### POST `/generate` parameters

| Field | Type | Required | Default |
|---|---|---|---|
| `title` | form text | yes | `"Ascended Heroes"` |
| `title_color` | form text (hex) | yes | `"#FAC010"` |
| `title_bg_color` | form text (hex) | yes | `"#4A4A49"` |
| `csv_file` | file upload | yes | — |

Hex validation: must start with `#`, length 4 or 7. Returns 400 on invalid input, 500 on PDF generation failure.

---

## HTML Template

`templates/index.html` is a self-contained file with inline CSS and JS. No external dependencies, no build step. Features:

- Dark theme matching kollekt.gg brand (#1a1a2e bg, #FAC010 gold accents)
- Dual colour input: native `<input type="color">` picker synced with a text hex input
- Live preview bar that updates header colours and title text in real time
- CSV format reference with rarity code colour swatches
- Standard `<form>` POST with `multipart/form-data` encoding

---

## Known Constraints

1. **Helvetica-Bold is max weight 700.** The JSX watermark uses `fontWeight: 900` (Black). ReportLab's built-in Helvetica family doesn't include Black weight. To fix this, you'd need to embed a `.ttf` font file (e.g. Helvetica Neue Black or a similar open-source alternative) using `pdfmetrics.registerFont()`.

2. **Art zone gradient is flattened.** The JSX uses `linear-gradient(145deg, #F4F4F4, #ECECEC)`. ReportLab's canvas doesn't support CSS-style gradients natively. The art zone uses flat #F4F4F4. This is barely perceptible in print.

3. **Letter spacing is manual.** ReportLab doesn't have a `letterSpacing` property. The `draw_text_spaced_*` functions draw each character individually with computed offsets. This works but is slower than native text rendering for large documents.

4. **No negative letter-spacing kerning table interaction.** The watermark's negative spacing (`LS_WATERMARK = -2.49pt`) reduces space between characters uniformly. It doesn't interact with the font's built-in kerning pairs. The visual result is close but not identical to CSS `letter-spacing: -3px` which is applied on top of kerning.

---

## How to Add a New Rarity Code

1. Add an entry to `RARITY_MAP`:

```python
"ACE": {"label": "Ace Spec", "bg": "#FF9800", "labelColor": "#FF9800", "goldBadge": False},
```

2. That's it. The card drawing code reads from `RARITY_MAP` dynamically. No other changes needed.

## How to Change Card Dimensions

Update `CARD_W` and `CARD_H` at the top of the file. All other measurements will recalculate automatically because they're derived from `SX` and `SY` which depend on `CARD_W` and `CARD_H`. The JSX reference dimensions (`JSX_W = 215`, `JSX_H = 301`) should NOT change — they're the pixel dimensions of the source design, not the output.

---

## Testing

Generate a test PDF from the command line without running the Flask server:

```python
from app import parse_csv, generate_pdf

with open('sample.csv', 'rb') as f:
    cards = parse_csv(f)

generate_pdf(cards, 'Ascended Heroes', '#FAC010', '#4A4A49', 'test_output.pdf')
```

Verify dimensions:

```python
# Card should be 63mm × 88mm = 178.58pt × 249.45pt
# Page should be A4 = 595.28pt × 841.89pt
# 9 cards per page, 3 cols × 3 rows
# Grid: 195mm wide × 270mm tall, centered on page
```
