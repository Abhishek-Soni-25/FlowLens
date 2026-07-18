# Troubleshooting

## Extension is missing or shows a manifest error

Run `npm run build:extension`, load `apps/extension/dist` rather than the source directory, and inspect the extension card's error details. Use Node.js 20+. After rebuilding, click **Reload** on the extension card.

If the popup says **CRX.JS DEV MODE** or Chrome reports `unsupported MIME type ('text/html')`, a development loader was loaded without its matching Vite server. For the stable extension, run `npm run build:extension`, remove the existing unpacked entry, and load `apps/extension/dist` again. For hot reload, run `npm run dev:extension` continuously and load `apps/extension/dist-dev`; its server uses port 5174, separate from the web editor on port 5173.

## Web app is not running or port 5173 is occupied

Run `npm run dev:web`. Stop the process already using 5173 or configure the extension options and Vite port together. The default bridge accepts exactly `http://localhost:5173`; `127.0.0.1` is not equivalent.

## Capture is disabled or fails

Open a normal `http://` or `https://` site and focus its tab. Chrome internal pages, the Chrome Web Store, PDF/browser UI, and some protected pages cannot be captured. Confirm the extension is enabled and has access to the current site. If a screenshot exceeds 8 MB, reduce the viewport or zoom and retry.

## Recording does not auto-capture an SPA route

Wait at least 1.5 seconds after navigation. Some apps mutate state without changing the URL; those states are not captured automatically in this MVP. Reload the extension after a content-script change. If the application replaces history functions after FlowLens loads, reload the website once.

## Screenshots do not import

Keep the extension installed and the editor running at the configured origin. Reload the project page once. Confirm the completed recording exists by reopening the extension and selecting **Open workflow**. Origin errors usually mean the configured editor URL and manifest/content bridge allowlist differ.

## IndexedDB is stale

Use **Clear local data** on the dashboard, or open Chrome DevTools → Application → IndexedDB → FlowLens and delete the database. This does not clear the completed temporary payload in extension storage; re-opening the project can import it again.

## Build or dependency errors

Remove only the local `node_modules` directory and reinstall when appropriate, ensure Node.js 20+, and run `npm install`. Do not use `npm audit fix --force` without reviewing breaking dependency changes.

## Playwright fails

Run `npx playwright install chromium`, then `npm run test:e2e`. Ensure port 5173 is available. Linux CI may need Playwright's documented system dependencies.

## Storage quota or PNG export errors

Current builds use Chrome's `unlimitedStorage` permission and move completed recordings instead of duplicating their screenshots. If an older installed build reports `QUOTA_BYTES quota exceeded`, rebuild the extension, remove the old unpacked entry, load `apps/extension/dist` again, and press **Stop recording**. The in-progress recording remains in local extension storage across that reload. PNG export is memory intensive; fit the workflow, reduce browser zoom, and retry. JSON remains the lossless backup format.
