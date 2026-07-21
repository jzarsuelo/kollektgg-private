# Local setup — Binder Placeholder Generator

How to run the Flask app on your machine. This tool is **local only** (development server); it is not part of the Netlify `website/` deployment.

---

## Prerequisites

- **Python 3.10+** (3.11 or 3.12 recommended)
- A terminal (`Terminal.app`, iTerm, or the integrated terminal in Cursor)

Check your version:

```bash
python3 --version
```

---

## First-time setup

### 1. Open the project folder

From the repo root:

```bash
cd placeholder-tool
```

Or use the full path:

```bash
cd /Users/pao/dev/kollektgg/placeholder-tool
```

### 2. Create a virtual environment (recommended)

Keeps Flask and ReportLab isolated from your system Python:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Your prompt should show `(.venv)` when the environment is active.

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

This installs **Flask** (web server) and **ReportLab** (PDF generation). You do not install or “enter” Flask as a separate app — it is a Python library used by `app.py`.

---

## Start the app

With the virtual environment activated (if you use one):

```bash
python app.py
```

You should see Flask’s development server start. Open:

**http://localhost:5001**

Default port is **5001** (not 5000) to avoid conflicting with macOS AirPlay Receiver on port 5000.

### Custom port

```bash
PORT=8080 python app.py
```

Then open `http://localhost:8080`.

### Alternative: `flask run`

Same folder, dependencies installed:

```bash
export FLASK_APP=app.py
flask run --host=0.0.0.0 --port=5001
```

`python app.py` is equivalent and matches the project README.

---

## Day-to-day workflow

Each new terminal session:

```bash
cd placeholder-tool
source .venv/bin/activate   # skip if you did not create .venv
python app.py
```

Stop the server with **Ctrl+C** in the terminal.

After pulling changes or editing `requirements.txt`:

```bash
pip install -r requirements.txt
```

---

## Quick smoke test

1. Open http://localhost:5001
2. Enter a set title (e.g. `Ascended Heroes`)
3. Upload `sample.csv` from this folder
4. Click **Generate PDF** — a PDF should download

---

## Troubleshooting

| Problem | What to try |
|--------|-------------|
| `command not found: python` | Use `python3 app.py` instead |
| `ModuleNotFoundError: No module named 'flask'` | Activate `.venv`, then `pip install -r requirements.txt` |
| Port already in use | Stop the other process, or run `PORT=5002 python app.py` |
| Browser shows wrong app on :5000 | Use **5001** — this project defaults to 5001 |
| Changes not appearing | Restart the server (Ctrl+C, then `python app.py` again). Debug mode reloads most code changes automatically |

---

## What you are *not* doing

- **No** separate “Flask folder” to `cd` into — only `placeholder-tool/`
- **No** database or API keys required
- **No** link to `website/` — run `npm run dev` inside `website/` for the public kollekt.gg site

---

## Related docs

| File | Purpose |
|------|---------|
| `README.md` | Overview, CSV format, print settings |
| `GUIDE.md` | Full user guide for the web UI |
| `CURSOR.md` | PDF layout and `app.py` technical spec |
