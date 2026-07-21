# Binder Placeholder Generator — User Guide

A local web tool by **kollekt.gg** that generates print-ready A4 PDFs with TCG binder placeholder cards. Upload a CSV of your card list, customise the header colours, and download a PDF ready to print, cut, and slot into your binder.

---

## Quick Start

See **`LOCAL_SETUP.md`** for full local setup (virtualenv, ports, troubleshooting).

```bash
cd placeholder-tool
pip install -r requirements.txt
python app.py
```

Open `http://localhost:5001` in your browser.

---

## Using the Tool

The web interface has four inputs:

### Set Title

The name of the Pokémon TCG set. This appears in the header bar of every placeholder card, rendered in uppercase with letter spacing (e.g. `Ascended Heroes` becomes `A S C E N D E D  H E R O E S`).

### Title Font Colour

The hex colour of the header text. Default is `#FAC010` (kollekt.gg gold). Use the colour picker or type a hex value directly. The live preview bar below the inputs updates in real time.

### Header Background Colour

The hex colour of the header bar background. Default is `#4A4A49` (kollekt.gg charcoal). Same colour picker + hex input setup.

### Card Data (CSV)

Upload a `.csv` file with your card list. The file must have these four columns:

| Column | Description | Example |
|---|---|---|
| `number` | Card number in the set | `1` |
| `name` | Full card name | `Erika's Oddish` |
| `type` | Pokémon type or "Trainer" | `Grass` |
| `rarity_code` | Rarity abbreviation (see table below) | `C` |

**Example CSV:**

```csv
number,name,type,rarity_code
1,Erika's Oddish,Grass,C
55,Brock's Geodude,Fighting,U
120,Misty's Staryu,Water,R
183,Misty's Starmie ex,Water,RR
218,Erika's Vileplume,Grass,UR
260,Sabrina's Alakazam,Psychic,SIR
295,Charizard ex,Fire,MHR
```

**Header names are flexible** — the tool normalises headers by stripping whitespace and converting to lowercase, so `Rarity Code`, `rarity_code`, and `RARITY_CODE` all work.

**Empty rows are skipped.** Rows without a `name` value are ignored.

**Cards are sorted by number** regardless of the order in your CSV.

### Rarity Codes

| Code | Rarity | Badge Colour | Label Colour |
|---|---|---|---|
| `C` | Common | Grey (#9E9E9E) | Default grey |
| `U` | Uncommon | Green (#66BB6A) | Default grey |
| `R` | Rare | Blue (#42A5F5) | Default grey |
| `RR` | Double Rare | Orange (#FF7043) | Default grey |
| `UR` | Ultra Rare | Red (#FF5E5B) | Default grey |
| `IR` | Illustration Rare | Gold (#FAC010) | Gold |
| `SIR` | Special Illustration Rare | Pink (#EC407A) | Pink |
| `MHR` | Mega Hyper Rare | Purple (#AB47BC) | Purple |

If a rarity code isn't recognised, the card defaults to Common styling.

---

## Creating a CSV with AI (optional)

The web app needs a CSV; it does not accept a PDF or set name directly.

### Option A — Set name only (recommended)

1. Copy `PROMPT_STANDARD_MASTER.md` into your AI chat.
2. Send: `SET NAME: Ascended Heroes` (or any English set name).
3. The AI should use [tcg.pokemon.com](https://tcg.pokemon.com) and [pokemon.com](https://www.pokemon.com) only — no PDF.
4. Save `{set}_standard.csv` and/or `{set}_master.csv` from the response.
5. Upload one file at a time under **Card data (CSV)** in the web UI.

### Option B — Checklist PDF

If you have an official checklist PDF from [tcg.pokemon.com](https://tcg.pokemon.com):

1. Attach the PDF in the AI chat with `PROMPT.md`.
2. Save the single CSV and upload it in the web UI.

### Type Values (finish)

The `type` column is the card **finish** (e.g. `Non-holo`, `Reverse Holo`, `Holo`, `Promo`). It appears left-aligned below the art, in the same muted grey as the default rarity label (`#AAAAAA`). See **`PROMPT.md`** for which finishes apply to each rarity.

---

## Print Settings

These settings are important — incorrect print settings will produce cards that don't fit standard binder sleeves.

| Setting | Value |
|---|---|
| **Paper size** | A4 (210mm × 297mm) |
| **Scale** | **Actual Size** — do NOT use "Fit to Page" or "Shrink to Fit" |
| **Recommended stock** | 200gsm cardstock |
| **Cards per page** | 9 (3 columns × 3 rows) |
| **Card size** | 63mm × 88mm (standard TCG) |
| **Cut guides** | L-shaped crop marks at every card corner |
| **Binder compatibility** | Any standard 9-pocket binder pages (Dragon Shield Codex, Vault X, Ultra Pro, etc.) |

### Printing Tips

- **Use "Actual Size"** in your printer settings. "Fit to Page" will shrink the cards and they won't fill binder sleeves properly.
- **200gsm cardstock** gives the placeholders enough rigidity to sit upright in sleeves. Regular 80gsm paper works but feels flimsy.
- **Cut along the crop marks** — the small L-shaped marks at each card corner show you exactly where to cut. A paper trimmer gives cleaner edges than scissors.
- **The `/XX` number** in the bottom-right of each card's art zone is the total card count from your CSV (auto-calculated).

---

## What Each Card Shows

Every placeholder card has five visible bands, top to bottom:

1. **Header** — Set title in uppercase with letter spacing on a coloured background
2. **Card name + rarity badge** — Bold card name on the left, coloured rarity code on the right (rounded rectangle; vertically aligned with the name)
3. **Art zone** — Light grey rounded rectangle with a large faded watermark number (the card's set number) and `/total` count in the bottom-right corner
4. **Label row** — Finish type left (e.g. `Non-holo`) and full rarity name right (e.g. `Common`, `Double Rare`). Default grey (`#AAAAAA`) for finish and for common-tier rarity names; IR, SIR, MHR, etc. use their rarity colour on the right only. Toggle **Show finish type** in the UI to hide the left label.
5. **Footer** — `kollekt.gg` branding centered in light grey with letter spacing

---

## File Structure

```
placeholder-tool/
├── app.py              # Flask app + PDF generation engine
├── templates/
│   └── index.html      # Web interface (branded, dark theme)
├── sample.csv          # Example 23-card CSV for testing
└── README.md           # Quick-start reference
```

---

## Limitations

- **Font weight**: The watermark number uses Helvetica-Bold (weight 700). The original JSX design specifies weight 900 (Black), which isn't available in ReportLab's built-in fonts without custom font embedding. The number is slightly thinner than the JSX mockup.
- **Max file size**: CSV uploads are capped at 16MB (more than enough for any TCG set).
- **Local only**: The app runs on Flask's development server. It's not configured for production deployment.
- **No BOM issues**: The CSV parser handles UTF-8 BOM encoding, so files exported from Excel work without modification.
