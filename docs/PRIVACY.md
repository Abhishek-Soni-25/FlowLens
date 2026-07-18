# FlowLens Privacy Policy

Last updated: July 18, 2026

FlowLens records user-initiated website journeys and turns them into editable visual workflows. It is designed as a local-first product. FlowLens does not operate an account system, analytics service, advertising service, cloud database, or recording upload service.

The public version of this policy is available at `https://flowlens-bx6p.onrender.com/privacy`.

## Information FlowLens handles

After the user selects **Start recording**, FlowLens may handle:

- Stitched full-page screenshots, limited to 30,000 pixels in page height and a 32 MB screenshot safety limit.
- Page URLs, routes, titles, favicons, viewport dimensions, and timestamps.
- Navigation relationships and limited clicked-link or button context: visible text, element type, ARIA label, link destination, and selector.
- Project names, sessions, connections, comments, annotations, and canvas positions created by the user.

FlowLens does not intentionally read cookies, request or response headers, network traffic, saved browser history outside an active recording, website local or session storage, password values, arbitrary form values, access tokens, audio, or video.

## Recording and masking

Recording starts only after the user presses **Start recording**. While recording is active, FlowLens captures the initial page and automatically captures after detected navigation. It scrolls the page to create a full-page image and restores the original scroll position afterward.

Before capture, FlowLens blurs password fields and elements marked with `data-flowlens-mask`. It temporarily hides elements marked with `data-flowlens-ignore` and the FlowLens recording badge. This protection is best-effort: FlowLens cannot mask content inside cross-origin frames, and other sensitive text remains visible unless the website marks it for masking. Users should review recordings before exporting or sharing them.

## Storage, transfer, and sharing

Active and completed recordings are stored in `chrome.storage.local`. When a workflow is opened, its data is passed from the extension to the FlowLens website inside the browser and stored in the website origin's IndexedDB database named `FlowLens`. FlowLens does not send recording contents to the developer, Render, advertisers, analytics providers, or other third parties.

The editor URL is stored in `chrome.storage.sync` and may be synchronized by Chrome according to the user's browser settings. It does not contain screenshots or workflow contents. The hosted website makes ordinary HTTPS requests to Render to load static application files, but recording contents remain in browser storage.

FlowLens shares data only when the user explicitly creates and distributes an export or image. Exported files remain wherever the user saves or shares them and are outside FlowLens's local deletion controls.

## Retention and deletion

FlowLens keeps local project data until the user deletes it, clears FlowLens data, clears the relevant browser storage, or uninstalls the extension. Deleting a project removes its sessions, screens, connections, comments, annotations, canvas state, extension export, project index entry, and matching recording state. **Clear local data** deletes all local website projects and their corresponding extension project copies. Previously downloaded or shared exports must be deleted separately.

## Chrome permission purposes

- `activeTab`: accesses the tab in which the user starts a recording.
- `tabs`: reads the active tab URL, title, favicon, and navigation state required to build a workflow.
- `scripting`: reads page dimensions, scrolls for full-page capture, and applies temporary masking.
- `storage`: stores recording data, project metadata, theme, and editor settings.
- `unlimitedStorage`: allows local storage of screenshot-heavy recordings without Chrome's small default quota.
- Website access: detects navigation and captures pages on websites where the user chooses to record, and connects the extension to the official FlowLens editor.

## Limited use

FlowLens uses browser and website information only to provide and improve its single purpose of recording website journeys and creating local visual workflows. It does not sell user data, use it for advertising or credit decisions, or provide the developer or its personnel access to recording contents. FlowLens's use of information complies with the Chrome Web Store User Data Policy, including its Limited Use requirements.

## Policy changes

This policy will be updated if FlowLens's data practices change. Material changes will also be disclosed through the product or its Chrome Web Store listing as required.
