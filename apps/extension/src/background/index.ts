import {
  DEFAULT_EDITOR_URL,
  STORAGE_KEYS,
  createConnection,
  extensionMessageSchema,
  hashScreenshot,
  isDuplicateCapture,
  normalizeUrl,
  type ActionType,
  type CapturedScreen,
  type FlowLensProjectExport,
  type NavigationContext,
  type ProjectIndexEntry,
  type RecordingState,
} from '@flowlens/shared';
import { removeProjectCopies } from './projectCleanup';

const idleState = (): RecordingState => ({ active: false, screens: [], connections: [] });
const navigationTimers = new Map<number, ReturnType<typeof setTimeout>>();

async function getState(): Promise<RecordingState> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.recording);
  return (data[STORAGE_KEYS.recording] as RecordingState | undefined) ?? idleState();
}

async function getProjectSuggestion(domain: string): Promise<ProjectIndexEntry | undefined> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.projectIndex, STORAGE_KEYS.exports]);
  const index = (stored[STORAGE_KEYS.projectIndex] as ProjectIndexEntry[] | undefined) ?? [];
  const indexed = index
    .filter((project) => project.domain === domain)
    .sort((a, b) => b.sessionCount - a.sessionCount)[0];
  if (indexed) return indexed;
  const exports =
    (stored[STORAGE_KEYS.exports] as Record<string, FlowLensProjectExport> | undefined) ?? {};
  const payload = Object.values(exports)
    .filter((item) => item.project.domain === domain)
    .sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt))[0];
  if (!payload) return undefined;
  return {
    id: payload.project.id,
    name: payload.project.name,
    domain: payload.project.domain,
    siteUrl: payload.project.siteUrl,
    faviconUrl: payload.project.faviconUrl,
    sessionCount: payload.sessions.length,
    createdAt: payload.project.createdAt,
  };
}

async function saveState(state: RecordingState) {
  await chrome.storage.local.set({ [STORAGE_KEYS.recording]: state });
  await updateBadge(state);
}

async function updateBadge(state: RecordingState) {
  await chrome.action.setBadgeText({ text: state.active ? 'REC' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
}

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error('No capturable active tab was found.');
  if (!/^https?:/.test(tab.url))
    throw new Error(
      'FlowLens cannot capture Chrome internal pages. Open a normal website and try again.',
    );
  return tab;
}

async function sendMask(tabId: number, masked: boolean) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: masked ? 'MASK_FOR_CAPTURE' : 'RESTORE_AFTER_CAPTURE',
    });
  } catch {
    /* The page may not have a content script yet. */
  }
}

type PageMetrics = {
  viewportWidth: number;
  viewportHeight: number;
  pageHeight: number;
  scrollX: number;
  scrollY: number;
};

async function getPageMetrics(tabId: number): Promise<PageMetrics> {
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight ?? 0,
        window.innerHeight,
      );
      const leafBottom = Array.from(document.body?.querySelectorAll('*') ?? []).reduce(
        (bottom, element) => {
          const style = getComputedStyle(element);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.position === 'fixed' ||
            (element.childElementCount > 0 &&
              !['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'SVG'].includes(element.tagName))
          )
            return bottom;
          const rect = element.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) return bottom;
          return Math.max(bottom, rect.bottom + window.scrollY);
        },
        0,
      );
      const pageHeight =
        scrollHeight <= window.innerHeight + 2 && leafBottom > 0
          ? Math.min(scrollHeight, Math.max(160, Math.ceil(leafBottom + 24)))
          : scrollHeight;
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pageHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      };
    },
  });
  return result[0]?.result as PageMetrics;
}

async function scrollPage(tabId: number, x: number, y: number) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (nextX, nextY) => window.scrollTo({ left: nextX, top: nextY, behavior: 'instant' }),
    args: [x, y],
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function captureFullPage(tab: chrome.tabs.Tab, metrics: PageMetrics): Promise<{
  screenshotDataUrl: string;
  metrics: PageMetrics;
}> {
  if (!tab.id) throw new Error('The active tab closed before capture.');
  const maxPageHeight = 30_000;
  const pageHeight = Math.min(metrics.pageHeight, maxPageHeight);
  const finalY = Math.max(0, pageHeight - metrics.viewportHeight);
  const positions: number[] = [];
  for (let y = 0; y < finalY; y += metrics.viewportHeight) positions.push(y);
  if (!positions.length || positions.at(-1) !== finalY) positions.push(finalY);

  const shots: Array<{ y: number; bitmap: ImageBitmap }> = [];
  for (let index = 0; index < positions.length; index += 1) {
    const y = positions[index] ?? 0;
    await scrollPage(tab.id, 0, y);
    await new Promise((resolve) => setTimeout(resolve, 180));
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 82,
    });
    shots.push({ y, bitmap: await createImageBitmap(await (await fetch(dataUrl)).blob()) });
    if (index < positions.length - 1)
      await new Promise((resolve) => setTimeout(resolve, 550));
  }

  const first = shots[0];
  if (!first) throw new Error('FlowLens could not capture this page.');
  const scale = first.bitmap.width / metrics.viewportWidth;
  const canvas = new OffscreenCanvas(first.bitmap.width, Math.ceil(pageHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('FlowLens could not prepare the full-page capture.');
  for (const shot of shots) {
    const destinationY = Math.round(shot.y * scale);
    const remainingHeight = canvas.height - destinationY;
    const sourceHeight = Math.min(shot.bitmap.height, remainingHeight);
    context.drawImage(
      shot.bitmap,
      0,
      0,
      shot.bitmap.width,
      sourceHeight,
      0,
      destinationY,
      shot.bitmap.width,
      sourceHeight,
    );
    shot.bitmap.close();
  }
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
  return {
    screenshotDataUrl: await blobToDataUrl(blob),
    metrics: { ...metrics, pageHeight },
  };
}

async function capture(
  captureType: CapturedScreen['captureType'],
  navigationAction?: string,
  actionType: ActionType = 'manual',
): Promise<{ state: RecordingState; skipped?: boolean }> {
  const state = await getState();
  if (!state.active || !state.project || !state.session)
    throw new Error('Start a recording before capturing a screen.');
  const tab = await activeTab();
  if (!tab.id) throw new Error('The active tab closed before capture.');
  await sendMask(tab.id, true);
  let screenshotDataUrl: string;
  let metrics: PageMetrics | undefined;
  try {
    await new Promise((resolve) => setTimeout(resolve, 80));
    metrics = await getPageMetrics(tab.id);
    const result = await captureFullPage(tab, metrics);
    screenshotDataUrl = result.screenshotDataUrl;
    metrics = result.metrics;
  } finally {
    if (metrics)
      await scrollPage(tab.id, metrics.scrollX, metrics.scrollY).catch(() => undefined);
    await sendMask(tab.id, false);
  }
  if (!metrics) throw new Error('FlowLens could not read the page dimensions.');
  if (screenshotDataUrl.length > 32 * 1024 * 1024 * 1.37)
    throw new Error(
      'This full-page screenshot exceeds the 32 MB safety limit. Try a narrower browser window.',
    );
  const screenshotHash = await hashScreenshot(screenshotDataUrl);
  const normalizedUrl = normalizeUrl(tab.url ?? '');
  const latest = state.screens.at(-1);
  if (isDuplicateCapture(latest, normalizedUrl, screenshotHash, captureType))
    return { state, skipped: true };
  const screen: CapturedScreen = {
    id: crypto.randomUUID(),
    projectId: state.project.id,
    sessionId: state.session.id,
    url: tab.url ?? '',
    normalizedUrl,
    title: tab.title || 'Untitled screen',
    screenshotDataUrl,
    screenshotHash,
    viewportWidth: metrics.viewportWidth,
    viewportHeight: metrics.viewportHeight,
    pageWidth: metrics.viewportWidth,
    pageHeight: metrics.pageHeight,
    capturedAt: new Date().toISOString(),
    captureType,
    sourceScreenId: state.lastScreenId,
    navigationAction,
  };
  if (state.lastScreenId && state.lastScreenId !== screen.id) {
    state.connections.push(
      createConnection({
        projectId: state.project.id,
        sessionId: state.session.id,
        sourceScreenId: state.lastScreenId,
        targetScreenId: screen.id,
        label:
          navigationAction ||
          state.pendingContext?.text ||
          state.pendingContext?.ariaLabel ||
          (captureType === 'manual' ? 'Manual capture' : 'Navigate'),
        actionType,
      }),
    );
  }
  state.screens.push(screen);
  state.lastScreenId = screen.id;
  state.pendingContext = undefined;
  state.project.updatedAt = new Date().toISOString();
  await saveState(state);
  return { state };
}

async function completeRecording(): Promise<RecordingState> {
  const state = await getState();
  if (!state.active || !state.project || !state.session) throw new Error('No recording is active.');
  const now = new Date().toISOString();
  state.active = false;
  state.session.status = 'completed';
  state.session.endedAt = now;
  state.project.updatedAt = now;
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.exports,
    STORAGE_KEYS.projectIndex,
  ]);
  const exports =
    (stored[STORAGE_KEYS.exports] as Record<string, FlowLensProjectExport> | undefined) ?? {};
  const previous = exports[state.project.id];
  const payload: FlowLensProjectExport = {
    version: '1.0',
    project: state.project,
    sessions: [...(previous?.sessions ?? []), state.session],
    screens: [...(previous?.screens ?? []), ...state.screens],
    connections: [...(previous?.connections ?? []), ...state.connections],
    comments: previous?.comments ?? [],
    annotations: previous?.annotations ?? [],
    canvas: previous?.canvas ?? {
      projectId: state.project.id,
      nodePositions: {},
      updatedAt: now,
    },
    exportedAt: now,
  };
  exports[state.project.id] = payload;
  const projectIndex =
    (stored[STORAGE_KEYS.projectIndex] as ProjectIndexEntry[] | undefined) ?? [];
  const nextProjectIndex = [
    ...projectIndex.filter((project) => project.id !== state.project!.id),
    {
      id: state.project.id,
      name: state.project.name,
      domain: state.project.domain,
      siteUrl: state.project.siteUrl,
      faviconUrl: state.project.faviconUrl,
      sessionCount: payload.sessions.length,
      createdAt: state.project.createdAt,
    },
  ];

  // Do not keep a second screenshot-heavy copy after completion. Replacing the active
  // recording and adding the export in one storage operation also makes Stop recoverable
  // when the old recording is already close to Chrome's quota.
  const completedState: RecordingState = {
    active: false,
    project: state.project,
    session: state.session,
    screens: [],
    connections: [],
    capturedCount: state.screens.length,
    lastCapturedTitle: state.screens.at(-1)?.title,
  };
  await chrome.storage.local.set({
    [STORAGE_KEYS.exports]: exports,
    [STORAGE_KEYS.projectIndex]: nextProjectIndex,
    [STORAGE_KEYS.recording]: completedState,
  });
  await updateBadge(completedState);
  await openWorkflow(state.project.id);
  return completedState;
}

async function editorUrl() {
  const data = await chrome.storage.sync.get(STORAGE_KEYS.editorUrl);
  return String(data[STORAGE_KEYS.editorUrl] ?? DEFAULT_EDITOR_URL).replace(/\/$/, '');
}

async function openWorkflow(projectId?: string) {
  const state = await getState();
  const id = projectId ?? state.project?.id;
  await chrome.tabs.create({
    url: id ? `${await editorUrl()}/project/${encodeURIComponent(id)}` : await editorUrl(),
  });
}

chrome.runtime.onInstalled.addListener(() => void updateBadge(idleState()));

chrome.runtime.onMessage.addListener((raw, _sender, respond) => {
  void (async () => {
    const parsed = extensionMessageSchema.safeParse(raw);
    if (!parsed.success) throw new Error('Invalid FlowLens message.');
    const message = parsed.data;
    if (message.type === 'GET_STATE') return getState();
    if (message.type === 'GET_PROJECT_SUGGESTION') {
      return { suggestion: await getProjectSuggestion(message.domain) };
    }
    if (message.type === 'SYNC_PROJECT_INDEX') {
      const stored = await chrome.storage.local.get([
        STORAGE_KEYS.exports,
        STORAGE_KEYS.recording,
      ]);
      const exports =
        (stored[STORAGE_KEYS.exports] as Record<string, FlowLensProjectExport> | undefined) ?? {};
      const recording = stored[STORAGE_KEYS.recording] as RecordingState | undefined;
      const retainedIds = new Set(message.projects.map((project) => project.id));
      if (recording?.active && recording.project?.id) retainedIds.add(recording.project.id);
      const retainedExports = Object.fromEntries(
        Object.entries(exports).filter(([projectId, payload]) => {
          if (retainedIds.has(projectId)) return true;
          const exportedAt = Date.parse(payload.exportedAt);
          return Number.isFinite(exportedAt) && Date.now() - exportedAt < 10 * 60 * 1000;
        }),
      );
      await chrome.storage.local.set({
        [STORAGE_KEYS.projectIndex]: message.projects,
        [STORAGE_KEYS.exports]: retainedExports,
      });
      return { synced: true };
    }
    if (message.type === 'DELETE_PROJECT') {
      const stored = await chrome.storage.local.get([
        STORAGE_KEYS.exports,
        STORAGE_KEYS.projectIndex,
        STORAGE_KEYS.recording,
      ]);
      const exports =
        (stored[STORAGE_KEYS.exports] as Record<string, FlowLensProjectExport> | undefined) ?? {};
      const projectIndex =
        (stored[STORAGE_KEYS.projectIndex] as ProjectIndexEntry[] | undefined) ?? [];
      const recording =
        (stored[STORAGE_KEYS.recording] as RecordingState | undefined) ?? idleState();
      const cleaned = removeProjectCopies(message.projectId, exports, projectIndex, recording);
      const nextRecording = cleaned.clearRecording ? idleState() : recording;
      await chrome.storage.local.set({
        [STORAGE_KEYS.exports]: cleaned.exports,
        [STORAGE_KEYS.projectIndex]: cleaned.projectIndex,
        [STORAGE_KEYS.recording]: nextRecording,
      });
      await updateBadge(nextRecording);
      return { deleted: true };
    }
    if (message.type === 'CLEAR_PROJECTS') {
      const nextRecording = idleState();
      await chrome.storage.local.set({
        [STORAGE_KEYS.exports]: {},
        [STORAGE_KEYS.projectIndex]: [],
        [STORAGE_KEYS.recording]: nextRecording,
      });
      await updateBadge(nextRecording);
      return { cleared: true };
    }
    if (message.type === 'START_RECORDING') {
      const existing = await getState();
      if (existing.active)
        throw new Error('A recording is already active. Stop it before starting another.');
      const now = new Date().toISOString();
      const tab = await activeTab();
      const suggestion = await getProjectSuggestion(message.domain);
      const projectId = suggestion?.id ?? message.projectId ?? crypto.randomUUID();
      const state: RecordingState = {
        active: true,
        tabId: tab.id,
        project: {
          id: projectId,
          name: message.projectName,
          domain: message.domain,
          siteUrl: tab.url ? new URL(tab.url).origin : suggestion?.siteUrl,
          faviconUrl: tab.favIconUrl || suggestion?.faviconUrl,
          createdAt: suggestion?.createdAt ?? now,
          updatedAt: now,
        },
        session: {
          id: crypto.randomUUID(),
          projectId,
          name: `Recording ${(suggestion?.sessionCount ?? 0) + 1}`,
          startedAt: now,
          autoCapture: true,
          status: 'recording',
        },
        screens: [],
        connections: [],
      };
      await saveState(state);
      await capture('initial');
      return getState();
    }
    if (message.type === 'CAPTURE_SCREEN')
      return capture(message.captureType, message.navigationAction);
    if (message.type === 'STOP_RECORDING') return completeRecording();
    if (message.type === 'OPEN_WORKFLOW') {
      await openWorkflow(message.projectId);
      return { ok: true };
    }
    if (message.type === 'GET_PROJECT_EXPORT') {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.exports);
      return {
        payload: (
          stored[STORAGE_KEYS.exports] as Record<string, FlowLensProjectExport> | undefined
        )?.[message.projectId],
      };
    }
    if (message.type === 'NAVIGATION') {
      const state = await getState();
      if (!state.active || (state.tabId && _sender.tab?.id !== state.tabId)) return state;
      const context = message.context as NavigationContext | undefined;
      state.pendingContext = context;
      await saveState(state);
      if (state.session?.autoCapture) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return capture('automatic', context?.text || context?.ariaLabel, message.actionType);
      }
      return state;
    }
  })()
    .then((result) =>
      respond({ ok: true, ...(result && typeof result === 'object' ? result : { result }) }),
    )
    .catch((error: unknown) =>
      respond({
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected extension error.',
      }),
    );
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !/^https?:/.test(tab.url ?? '')) return;
  void getState().then((state) => {
    if (
      !state.active ||
      !state.session?.autoCapture ||
      state.tabId !== tabId ||
      state.screens.at(-1)?.url === tab.url
    )
      return;
    try {
      if (state.project && new URL(tab.url ?? '').hostname !== state.project.domain)
        state.error = `Recording continued on ${new URL(tab.url ?? '').hostname}. Review captures before sharing.`;
    } catch {
      /* URL was already validated above. */
    }
    const previous = navigationTimers.get(tabId);
    if (previous) clearTimeout(previous);
    navigationTimers.set(
      tabId,
      setTimeout(() => {
        navigationTimers.delete(tabId);
        void capture('automatic', 'Navigate', 'route-change').catch(async (error: unknown) => {
          const latest = await getState();
          latest.error = error instanceof Error ? error.message : 'Automatic capture failed.';
          await saveState(latest);
        });
      }, 1000),
    );
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void getState().then(async (state) => {
    if (state.active && state.tabId === tabId) {
      state.error = 'The recorded tab was closed. Open the popup to stop or start a new recording.';
      await saveState(state);
    }
  });
});
