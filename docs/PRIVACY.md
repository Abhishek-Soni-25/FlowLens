# Privacy

FlowLens is local-only. It has no analytics, backend, account, cloud database, external API, or screenshot upload.

## What is captured

- The visible browser viewport when a capture occurs
- Page URL and title
- Viewport dimensions and capture timestamp/type
- Navigation relationships and limited clicked link/button context: visible text, tag, aria label, href, and a selector
- User-created names, connections, comments, annotations, and canvas positions

## What is not captured

FlowLens does not read or store cookies, request/response headers, network traffic, browser history outside the active guided session, local storage, session storage, password values, arbitrary input values, access tokens, video, audio, full-page content outside the viewport, or cross-origin iframe internals.

## Masking

Immediately before capture, the content script blurs `input[type=password]` and `[data-flowlens-mask]`, hides `[data-flowlens-ignore]` and the FlowLens badge, captures the viewport, and restores original inline styles in a `finally` path. Masking is best-effort: cross-origin iframe contents cannot be modified, and sensitive text elsewhere on a page is visible unless the site marks it or the user avoids capturing it. Review every capture before sharing.

## Storage and deletion

Active/completed recording payloads are stored in `chrome.storage.local`. The `unlimitedStorage` permission removes Chrome's small default quota because recordings contain user-controlled screenshots; it does not provide cloud or filesystem access. Imported projects are stored in the web origin's IndexedDB database named `FlowLens`; the editor URL setting is in `chrome.storage.sync`. Delete a project from its dashboard card or use **Clear local data** for IndexedDB. Remove extension data through Chrome's extension storage controls or uninstall the extension.

Exports are files explicitly created by the user and remain wherever the browser downloads them. FlowLens cannot delete exported copies.
