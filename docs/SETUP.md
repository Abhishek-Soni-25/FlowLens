# Setup

## Prerequisites

Install Node.js 20 LTS or newer, npm, and current Google Chrome or Chromium. Verify:

```bash
node --version
npm --version
```

On Ubuntu, use NodeSource, `nvm`, or your managed package source. On macOS, `brew install node` is suitable. On Windows, use the Node.js installer or `winget install OpenJS.NodeJS.LTS`. A version manager such as `nvm`/`nvm-windows` is recommended when multiple projects need different Node versions.

## Install and run

```bash
git clone <repository-url> flowlens
cd flowlens
npm install
npm run dev:web
```

The dashboard should open at `http://localhost:5173`. If it does not open automatically, visit that address manually.

## Build and load the extension

```bash
npm run build:extension
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the absolute `apps/extension/dist` directory.
5. Pin FlowLens from Chrome's extensions menu.
6. Open the extension's **Details → Extension options** to change the editor URL if it is not `http://localhost:5173`.

After extension source changes, run the production build again and click **Reload** on the extension card.

For CRXJS hot-reload development, run:

```bash
npm run dev:extension
```

This starts the extension development server on `http://localhost:5174` and writes its loader files to `apps/extension/dist-dev`. Load `dist-dev` only while that command is running. Keep the normal unpacked extension pointed at `apps/extension/dist`; development mode no longer overwrites that production directory.

## Verify the bridge

1. Keep the web editor running.
2. Open any normal `http://` or `https://` page.
3. Start a short recording, capture a screen, and stop.
4. FlowLens opens `/project/{projectId}`.
5. The page requests the completed payload from the installed content bridge and imports it into IndexedDB.

If the project does not appear, confirm the editor uses exactly the URL configured in extension options and that Chrome shows FlowLens enabled.

## Tests and production builds

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

Playwright may require its browser on a fresh machine:

```bash
npx playwright install chromium
```

Production artifacts are `apps/web/dist` and `apps/extension/dist`. The web artifact can be served by any static host, but the default extension bridge is intentionally restricted to `http://localhost:5173`; update the manifest origin and bridge allowlist together before using another origin.
