## Future_Obs_Typescript_Videos

SvelteKit + TypeScript + Remotion project for generating videos.

This guide explains how to clone the repo, switch to the `prod` branch, install dependencies, and run the app.

---

## Prerequisites

- **Git**: verify with:

```bash
git --version
```

- **Node.js and npm** (Node v18+ or v20+ recommended). Verify with:

```bash
node -v
npm -v
```

If you need to install or update Node, the recommended way is via **nvm**:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart your terminal, then:
nvm install --lts
nvm use --lts
```

---

## 1. Clone the repository

```bash
cd /path/where/you/want/the/project
git clone <REPO_URL>
cd Future_Obs_Typescript_Videos
```

Replace `<REPO_URL>` with the actual HTTPS or SSH URL of this repository.

---

## 2. Switch to the `prod` branch

```bash
git fetch --all
git checkout prod
```

Confirm you are on `prod`:

```bash
git branch
```

The `*` should be next to `prod`.

---

## 3. Install dependencies

From the project root (where `package.json` is):

```bash
npm install
```

If you run into permission or Node version issues, make sure you are using a local Node from `nvm` (see **Prerequisites**), then try:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 4. Environment variables (if any)

Check for environment files:

```bash
ls
```

If you see something like `.env.example`, copy it to `.env`:

```bash
cp .env.example .env
```

Then open `.env` and fill in any required values (API keys, URLs, etc.).

If there is no `.env` or `.env.example`, you can typically skip this step.

---

## 5. Run the development server

Start the dev server:

```bash
npm run dev
```

The terminal output will show the local URL, typically something like:

```text
Local:   http://localhost:5173/
```

Open that URL in your browser.

To listen on all interfaces (e.g. Docker or remote dev):

```bash
npm run dev -- --host
```

---

## 6. Build and preview (optional)

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The terminal will show the preview URL (often `http://localhost:4173`).

---

## 7. Run via Docker (optional)

This repo includes `multistep.dockerfile`, which builds a **production** image using the Node adapter and serves the built app on **port 3000** inside the container.

### 7.1 Build the image

From the project root:

```bash
docker build -f multistep.dockerfile -t future-obs-typescript-videos .
```

### 7.2 Run the container

Run the built image and expose port 3000:

```bash
docker run --rm -p 5173:5173 future-obs-typescript-videos
```

Then open `http://localhost:5173` in your browser.

The Dockerfile also creates `/app/tmp/uploads` inside the container.  
If you need to persist uploaded files across container restarts, you can mount a volume:

```bash
docker run --rm -p 5173:5173 \
  -v $(pwd)/uploads:/app/tmp/uploads \
  future-obs-typescript-videos
```

If your deployment environment requires environment variables (e.g. API keys), pass them with `-e KEY=value` or `--env-file` when running `docker run`.

---

## 8. Common issues

- **Port already in use**  
  If you see an error like “Port 5173 is already in use”, either stop the other process using that port or run:

  ```bash
  npm run dev -- --port 4173
  ```

- **Unsupported Node version / engine error**  
  Switch Node version with `nvm`:

  ```bash
  nvm use --lts
  ```

---

## 9. Quick start cheat sheet

For a machine that already has Git and a compatible Node installed:

```bash
git clone <REPO_URL>
cd Future_Obs_Typescript_Videos
git checkout prod
npm install
npm run dev
```

Then open the URL printed in the terminal (usually `http://localhost:5173`).

