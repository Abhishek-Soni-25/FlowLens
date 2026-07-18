import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { STORAGE_KEYS, type RecordingState } from '@flowlens/shared';
import './popup.css';

export function Popup() {
  const [state, setState] = useState<RecordingState>({
    active: false,
    screens: [],
    connections: [],
  });
  const [projectName, setProjectName] = useState('Website Workflow');
  const [existingProjectId, setExistingProjectId] = useState<string>();
  const [projectLookupPending, setProjectLookupPending] = useState(true);
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const capturedCount = state.capturedCount ?? state.screens.length;
  const lastCapturedTitle = state.lastCapturedTitle ?? state.screens.at(-1)?.title;

  const send = async (message: object) => {
    setBusy(true);
    setError('');
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (!response?.ok) throw new Error(response?.error || 'The extension did not respond.');
      if (response.error) setError(response.error);
      if (response.active !== undefined) setState(response as RecordingState);
      else if (response.state) setState(response.state);
      return response;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      try {
        const currentDomain = new URL(tab?.url ?? '').hostname;
        setDomain(currentDomain);
        void chrome.runtime
          .sendMessage({ type: 'GET_PROJECT_SUGGESTION', domain: currentDomain })
          .then((response) => {
            if (response?.suggestion) {
              setProjectName(response.suggestion.name);
              setExistingProjectId(response.suggestion.id);
            } else {
              setProjectName('Website Workflow');
              setExistingProjectId(undefined);
            }
          })
          .finally(() => setProjectLookupPending(false));
      } catch {
        setDomain('Restricted page');
        setProjectLookupPending(false);
      }
    });
    void chrome.storage.local.get(STORAGE_KEYS.theme).then((value) => {
      document.documentElement.dataset.theme =
        value[STORAGE_KEYS.theme] === 'dark' ? 'dark' : 'light';
    });
    const onStorageChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      const themeChange = changes[STORAGE_KEYS.theme];
      if (themeChange)
        document.documentElement.dataset.theme = themeChange.newValue === 'dark' ? 'dark' : 'light';
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    void send({ type: 'GET_STATE' });
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

  return (
    <main>
      <header>
        <img className="logo" src="/icons/flowlens-icon.png" alt="" />
        <div>
          <h1>
            Flow<span>Lens</span>
          </h1>
          <p>{domain || 'No active website'}</p>
        </div>
        {state.active && (
          <span className="status recording">
            <i /> Recording
          </span>
        )}
      </header>
      {state.active ? (
        <section className="recording-card">
          <strong>{state.project?.name}</strong>
          <span>
            {capturedCount} screen{capturedCount === 1 ? '' : 's'} captured
          </span>
          {lastCapturedTitle && <small>Last: {lastCapturedTitle}</small>}
        </section>
      ) : (
        <section className="form">
          <label>
            Project name
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </label>
          {existingProjectId && (
            <small className="project-match">Existing project · new session will be added</small>
          )}
        </section>
      )}
      {!state.active && error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <div className="actions">
        {!state.active && (
          <button
            className="primary"
            disabled={
              busy ||
              projectLookupPending ||
              !projectName.trim() ||
              !/^((?!Restricted).)+$/.test(domain)
            }
            onClick={() =>
              void send({
                type: 'START_RECORDING',
                projectName: projectName.trim(),
                domain,
                projectId: existingProjectId,
              })
            }
          >
            Start recording
          </button>
        )}
        {state.active && (
          <button
            className="danger"
            disabled={busy}
            onClick={() => void send({ type: 'STOP_RECORDING' })}
          >
            Stop recording
          </button>
        )}
        {!state.active && (
          <button
            disabled={busy}
            onClick={() => void send({ type: 'OPEN_WORKFLOW', projectId: existingProjectId ?? '' })}
          >
            Open workflow
          </button>
        )}
      </div>
      <footer>Sensitive fields are masked. Recordings stay in this browser.</footer>
    </main>
  );
}

const rootElement = typeof document === 'undefined' ? null : document.getElementById('root');
if (rootElement)
  createRoot(rootElement).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>,
  );
