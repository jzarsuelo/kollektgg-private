# kollekt.gg — Binder Placeholder Generator

Local web tool that generates printable A4 PDFs with TCG binder placeholder cards.

## Setup

See **`LOCAL_SETUP.md`** for first-time and day-to-day local startup (venv, ports, troubleshooting).

```bash
cd placeholder-tool
pip install -r requirements.txt
python app.py
```

Open `http://localhost:5001` in your browser.

## Usage

1. Enter the **Set Title** (e.g. "Ascended Heroes", "Perfect Order")
2. Pick **Title Font Colour** and **Header BG Colour** using the colour pickers
3. Upload a **CSV file** with your card data
4. Click **Generate PDF** — the file downloads automatically

## CSV Format

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

### Rarity Codes

| Code | Rarity                 |
|------|------------------------|
| C    | Common                 |
| U    | Uncommon               |
| R    | Rare                   |
| RR   | Double Rare            |
| UR   | Ultra Rare             |
| IR   | Illustration Rare      |
| SIR  | Special Illustration Rare |
| MHR  | Mega Hyper Rare        |

### Type Values (finish)

Card finish in the `type` column (e.g. `Non-holo`, `Reverse Holo`, `Holo`, `Promo`). See **`PROMPT.md`** / **`GUIDE.md`** for allowed values per rarity.

## Print Settings

- **Paper:** A4
- **Scale:** Actual Size (do NOT use "Fit to Page")
- **Recommended stock:** 200gsm cardstock
- **Cards per page:** 9 (3×3 grid)
- **Card size:** 63mm × 88mm (standard TCG)
- **Cut guides:** Crop marks at each card corner

## Documentation

- **`LOCAL_SETUP.md`** — Run the app locally (Python venv, `python app.py`, ports).
- **`GUIDE.md`** — Full user guide (CSV, rarities, print settings).
- **`CURSOR.md`** — Technical spec for PDF layout, units, and `app.py` internals.
- **`REFERENCE.md`** — Checklist for printable parity with `printed_ui.png`.
- **`PROMPT.md`** — Single CSV from an official checklist PDF (if you have the PDF).
- **`PROMPT_STANDARD_MASTER.md`** — **Set name only** (no PDF); research tcg.pokemon.com / pokemon.com; outputs **standard** and **master** CSVs.

## File Structure

```
placeholder-tool/
├── app.py              # Flask app + PDF generation
├── templates/
│   └── index.html      # Web interface
├── sample.csv          # Example card data
├── printed_ui.png      # Visual reference for card layout (parity target)
├── README.md
├── LOCAL_SETUP.md
├── GUIDE.md
├── CURSOR.md
└── REFERENCE.md
```
