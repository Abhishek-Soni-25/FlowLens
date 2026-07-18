import { ArrowLeft, Moon, Sun } from 'lucide-react';
import type { Theme } from '../store/theme';

export function Privacy({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <div className="privacy-page">
      <header className="app-header">
        <a className="brand" href="/" aria-label="FlowLens home">
          <img src="/brand/flowlens-icon.png" alt="" />
          <span className="brand-wordmark">Flow<span>Lens</span></span>
        </a>
        <button
          className="icon-button theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <main className="privacy-main">
        <a className="privacy-back" href="/"><ArrowLeft size={16} /> Back to FlowLens</a>
        <article className="privacy-card">
          <p className="eyebrow">FLOWLENS PRIVACY</p>
          <h1>Privacy policy</h1>
          <p className="privacy-updated">Last updated: July 18, 2026</p>

          <p>
            FlowLens records user-initiated website journeys and turns them into editable visual
            workflows. It is designed as a local-first product: FlowLens does not operate an
            account system, analytics service, advertising service, cloud database, or recording
            upload service.
          </p>

          <h2>Information FlowLens handles</h2>
          <p>After you select <strong>Start recording</strong>, FlowLens may handle:</p>
          <ul>
            <li>Stitched full-page screenshots of recorded pages, limited to 30,000 pixels in page height and a 32 MB screenshot safety limit.</li>
            <li>Page URLs, routes, page titles, favicons, viewport dimensions, and timestamps.</li>
            <li>Navigation relationships and limited context from clicked links or buttons, including visible text, element type, ARIA label, link destination, and selector.</li>
            <li>Project names, sessions, connections, comments, annotations, and canvas positions that you create in FlowLens.</li>
          </ul>
          <p>
            FlowLens does not intentionally read cookies, request or response headers, network
            traffic, saved browser history outside an active recording, website local storage,
            website session storage, password values, arbitrary form values, access tokens, audio,
            or video.
          </p>

          <h2>How recording works</h2>
          <p>
            Recording starts only after you press <strong>Start recording</strong>. While that
            recording is active, FlowLens automatically captures the initial page and captures
            again after detected navigation. It scrolls the page to create the full-page image and
            restores the original scroll position after capture.
          </p>

          <h2>Masking and sensitive content</h2>
          <p>
            Before a screenshot, FlowLens blurs password fields and elements marked with
            <code>data-flowlens-mask</code>. It temporarily hides elements marked with
            <code>data-flowlens-ignore</code> and its recording badge. These protections are
            best-effort: FlowLens cannot mask content inside cross-origin frames, and other
            sensitive text remains visible unless the website marks it for masking. Review your
            recordings before exporting or sharing them.
          </p>

          <h2>Storage, transfer, and sharing</h2>
          <p>
            Active and completed recordings are stored in <code>chrome.storage.local</code>. When
            you open a workflow, its data is passed from the extension to the FlowLens website
            inside your browser and stored in the website origin’s IndexedDB database named
            <code>FlowLens</code>. FlowLens does not send recording contents to the developer,
            Render, advertisers, analytics providers, or other third parties.
          </p>
          <p>
            The editor URL is stored in <code>chrome.storage.sync</code> and may be synchronized by
            Chrome according to your browser settings; it does not contain screenshots or workflow
            contents. The hosted website makes ordinary HTTPS requests to Render to load its static
            application files, but recording contents remain in browser storage.
          </p>
          <p>
            FlowLens shares data only when you explicitly create and distribute an export or image.
            Exported files remain wherever you save or share them and are outside FlowLens’s local
            deletion controls.
          </p>

          <h2>Retention and deletion</h2>
          <p>
            FlowLens keeps local project data until you delete it, clear FlowLens data, clear the
            relevant browser storage, or uninstall the extension. Deleting a project removes its
            sessions, screens, connections, comments, annotations, canvas state, extension export,
            project index entry, and matching recording state. <strong>Clear local data</strong>
            deletes all local website projects and their corresponding extension project copies.
            Previously downloaded or shared exports must be deleted separately.
          </p>

          <h2>Chrome permission purposes</h2>
          <dl className="privacy-permissions">
            <div><dt>activeTab</dt><dd>Accesses the tab in which you start a recording.</dd></div>
            <div><dt>tabs</dt><dd>Reads the active tab URL, title, favicon, and navigation state needed to build the workflow.</dd></div>
            <div><dt>scripting</dt><dd>Reads page dimensions, scrolls for full-page capture, and applies temporary masking.</dd></div>
            <div><dt>storage</dt><dd>Stores recording data, project metadata, theme, and editor settings.</dd></div>
            <div><dt>unlimitedStorage</dt><dd>Allows local storage of screenshot-heavy recordings without Chrome’s small default quota.</dd></div>
            <div><dt>Website access</dt><dd>Detects navigation and captures pages on websites where you choose to record, and connects the extension to the official FlowLens editor.</dd></div>
          </dl>

          <h2>Limited use</h2>
          <p>
            FlowLens uses browser and website information only to provide and improve its single
            purpose of recording website journeys and creating local visual workflows. It does not
            sell user data, use it for advertising or credit decisions, or provide the developer
            or its personnel access to recording contents. FlowLens’s use of information complies with the Chrome Web Store User Data Policy,
            including its Limited Use requirements.
          </p>

          <h2>Policy changes</h2>
          <p>
            This policy will be updated if FlowLens’s data practices change. Material changes will
            also be disclosed through the product or its Chrome Web Store listing as required.
          </p>
        </article>
      </main>
    </div>
  );
}
