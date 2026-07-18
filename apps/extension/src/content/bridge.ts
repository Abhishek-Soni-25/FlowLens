import {
  STORAGE_KEYS,
  bridgeClearProjectsSchema,
  bridgeProjectDeleteSchema,
  bridgeProjectIndexSchema,
  bridgeRequestSchema,
  bridgeThemeSchema,
} from '@flowlens/shared';

const ALLOWED_ORIGIN = 'https://flowlens-bx6p.onrender.com';
window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== ALLOWED_ORIGIN) return;
  const projectIndex = bridgeProjectIndexSchema.safeParse(event.data);
  if (projectIndex.success) {
    void chrome.runtime.sendMessage({
      type: 'SYNC_PROJECT_INDEX',
      projects: projectIndex.data.projects,
    });
    return;
  }
  const projectDelete = bridgeProjectDeleteSchema.safeParse(event.data);
  if (projectDelete.success) {
    void chrome.runtime.sendMessage({
      type: 'DELETE_PROJECT',
      projectId: projectDelete.data.projectId,
    });
    return;
  }
  const clearProjects = bridgeClearProjectsSchema.safeParse(event.data);
  if (clearProjects.success) {
    void chrome.runtime.sendMessage({ type: 'CLEAR_PROJECTS' });
    return;
  }
  const theme = bridgeThemeSchema.safeParse(event.data);
  if (theme.success) {
    void chrome.storage.local.set({ [STORAGE_KEYS.theme]: theme.data.theme });
    return;
  }
  const request = bridgeRequestSchema.safeParse(event.data);
  if (!request.success) return;
  void chrome.runtime
    .sendMessage({ type: 'GET_PROJECT_EXPORT', projectId: request.data.projectId })
    .then((response) => {
      window.postMessage(
        {
          source: 'flowlens-extension',
          type: 'FLOWLENS_PROJECT_PAYLOAD',
          projectId: request.data.projectId,
          payload: response?.payload,
          error: response?.ok ? undefined : response?.error,
        },
        ALLOWED_ORIGIN,
      );
    })
    .catch(() =>
      window.postMessage(
        {
          source: 'flowlens-extension',
          type: 'FLOWLENS_PROJECT_PAYLOAD',
          projectId: request.data.projectId,
          error: 'The extension bridge could not read this project.',
        },
        ALLOWED_ORIGIN,
      ),
    );
});
