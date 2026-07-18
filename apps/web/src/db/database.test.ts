import { afterEach, describe, expect, it } from 'vitest';
import type { FlowLensProjectExport } from '@flowlens/shared';
import { db, deleteProject, importProject, serializeProject } from './database';

const now = '2026-07-18T10:00:00.000Z';
const payload: FlowLensProjectExport = {
  version: '1.0',
  project: { id: 'p1', name: 'Checkout', domain: 'shop.test', createdAt: now, updatedAt: now },
  sessions: [
    {
      id: 's1',
      projectId: 'p1',
      name: 'Main',
      startedAt: now,
      endedAt: now,
      autoCapture: true,
      status: 'completed',
    },
  ],
  screens: [
    {
      id: 'a',
      projectId: 'p1',
      sessionId: 's1',
      url: 'https://shop.test/',
      normalizedUrl: 'https://shop.test/',
      title: 'Home',
      screenshotDataUrl: 'data:image/png;base64,AA==',
      screenshotHash: 'hash',
      viewportWidth: 100,
      viewportHeight: 100,
      capturedAt: now,
      captureType: 'initial',
    },
  ],
  connections: [],
  comments: [],
  annotations: [],
  canvas: { projectId: 'p1', nodePositions: {}, updatedAt: now },
  exportedAt: now,
};

afterEach(async () => {
  await db.delete();
  await db.open();
});
describe('project persistence', () => {
  it('imports idempotently and serializes the full project', async () => {
    await importProject(payload);
    await importProject(payload);
    expect(await db.screens.count()).toBe(1);
    expect((await serializeProject('p1')).project.name).toBe('Checkout');
  });
  it('deletes related records as a cascade', async () => {
    await importProject(payload);
    await db.comments.add({
      id: 'comment',
      projectId: 'p1',
      screenId: 'a',
      text: 'Remove me',
      author: 'Local user',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
    await db.annotations.add({
      id: 'annotation',
      projectId: 'p1',
      screenId: 'a',
      editorType: 'native-canvas',
      data: [],
      updatedAt: now,
    });
    await deleteProject('p1');
    expect(await db.projects.count()).toBe(0);
    expect(await db.screens.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
    expect(await db.connections.count()).toBe(0);
    expect(await db.comments.count()).toBe(0);
    expect(await db.annotations.count()).toBe(0);
    expect(await db.canvasStates.count()).toBe(0);
  });
});
