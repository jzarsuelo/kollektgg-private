# Deploying Binder Placeholder Generator to Dockge

Deploy the Flask app from your Mac to the NAS using Finder — no Git, no CLI required on the NAS.
Everything stays contained inside Dockge's stacks directory.

---

## Prerequisites

- NAS is reachable on your local network
- Dockge is running at `http://<NAS-IP>:5001`
- SMB share `data` is available on the NAS

---

## Step 1 — Add a Dockerfile to your project

On your Mac, open `placeholder-tool/` in Cursor and create a new file called `Dockerfile`
(no extension) at the root of the folder, alongside `app.py` and `requirements.txt`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5001
CMD ["python", "app.py"]
```

Your folder structure should look like this:

```
placeholder-tool/
  Dockerfile          ← new
  app.py
  requirements.txt
  templates/
  ...
```

---

## Step 2 — Mount the NAS share in Finder

1. Open **Finder**
2. In the menu bar: **Go → Connect to Server** (or `⌘K`)
3. Enter: `smb://<NAS-IP>/data`
4. Click **Connect** and authenticate if prompted

The `data` share will appear in Finder under **Locations** in the sidebar.

---

## Step 3 — Create the destination folder on the NAS

In the mounted share, navigate to:

```
data → apps → dockge
```

Create a new folder called `binder-placeholder` inside `dockge/`:

```
data/
  apps/
    dockge/
      binder-placeholder/    ← create this
```

---

## Step 4 — Copy your app files to the NAS

From your Mac's `placeholder-tool/` folder, copy everything **except** these folders
(they're Mac-only and shouldn't go to the NAS):

- `.venv/`
- `__pycache__/`
- `*.pyc` files
- `.git/` (if present)

Select everything else and drag it into `data/apps/dockge/binder-placeholder/` in Finder.

The destination should look like:

```
data/apps/dockge/binder-placeholder/
  Dockerfile
  app.py
  requirements.txt
  templates/
  ...
```

---

## Step 5 — Create the stack in Dockge

1. Open Dockge at `http://<NAS-IP>:5001`
2. Click **+ Compose** (top right)
3. Name the stack: `binder-placeholder`
4. Paste this as the compose content:

```yaml
services:
  binder-placeholder:
    build: .
    ports:
      - "5002:5001"
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

> Port mapping is `5002:5001` — host port 5002 avoids the conflict with Dockge
> which already uses 5001. The app inside the container still runs on 5001 as normal.

5. Click **Deploy**

Dockge will build the Docker image from your `Dockerfile` and start the container.
This may take a minute the first time while it downloads `python:3.12-slim` and installs dependencies.

---

## Step 6 — Verify it works

Open your browser and go to:

```
http://<NAS-IP>:5002
```

You should see the Binder Placeholder Generator UI. Run a quick smoke test:

1. Enter a set title (e.g. `Ascended Heroes`)
2. Upload `sample.csv`
3. Click **Generate PDF** — a PDF should download

---

## Updating the app

When you make changes to the app on your Mac:

1. In Finder, open `data/apps/dockge/binder-placeholder/`
2. Drag the updated files over (Finder will ask to replace — confirm)
3. In Dockge, go to the `binder-placeholder` stack
4. Click **Stop**
5. Click **Build** (this rebuilds the Docker image with your new code)
6. Click **Start**

> If you only changed Python files and not `requirements.txt`, the build will be fast
> because Docker caches the dependency install layer.

---

## Reference

| Item | Value |
|------|-------|
| Host port | `5002` |
| Container port | `5001` |
| App URL | `http://<NAS-IP>:5002` |
| Stack name | `binder-placeholder` |
| Files location on NAS | `/mnt/data/apps/dockge/binder-placeholder/` |
| Dockge UI | `http://<NAS-IP>:5001` |
