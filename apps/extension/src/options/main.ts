import { DEFAULT_EDITOR_URL, STORAGE_KEYS } from '@flowlens/shared';
import './options.css';
const input = document.querySelector<HTMLInputElement>('#editor-url')!;
const status = document.querySelector<HTMLSpanElement>('#status')!;
void chrome.storage.local.get(STORAGE_KEYS.theme).then((data) => {
  document.documentElement.dataset.theme = data[STORAGE_KEYS.theme] === 'dark' ? 'dark' : 'light';
});
void chrome.storage.sync.get(STORAGE_KEYS.editorUrl).then((data) => {
  input.value = String(data[STORAGE_KEYS.editorUrl] ?? DEFAULT_EDITOR_URL);
});
document.querySelector('form')!.addEventListener('submit', (event) => {
  event.preventDefault();
  const url = new URL(input.value);
  if (!/^https?:$/.test(url.protocol)) {
    status.textContent = 'Use an http:// or https:// URL.';
    return;
  }
  void chrome.storage.sync
    .set({ [STORAGE_KEYS.editorUrl]: url.toString().replace(/\/$/, '') })
    .then(() => {
      status.textContent = 'Settings saved.';
    });
});
