import { chromium } from '@playwright/test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { URL } from 'node:url';

const extensionPath = resolve('apps/extension/dist');
const profilePath = await mkdtemp(join(tmpdir(), 'flowlens-popup-'));
const context = await chromium.launchPersistentContext(profilePath, {
  headless: false,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});
let [worker] = context.serviceWorkers();
worker ??= await context.waitForEvent('serviceworker');
const extensionId = new URL(worker.url()).host;
const popup = await context.newPage();
const errors = [];
popup.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
popup.on('pageerror', (error) => errors.push(error.message));
await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
await popup.setViewportSize({ width: 370, height: 330 });
await popup.screenshot({ path: 'apps/web/artifacts/extension-popup-light.png', fullPage: true });
await worker.evaluate(() => globalThis.chrome.storage.local.set({ 'flowlens:theme': 'dark' }));
await popup.reload();
await popup.screenshot({ path: 'apps/web/artifacts/extension-popup-dark.png', fullPage: true });
await context.close();
if (errors.length) throw new Error(`Popup console errors:\n${errors.join('\n')}`);
