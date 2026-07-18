import Dexie, { type EntityTable } from 'dexie';
import type {
  CanvasState,
  CaptureSession,
  CapturedScreen,
  FlowLensProjectExport,
  Project,
  ScreenAnnotation,
  ScreenComment,
  ScreenConnection,
} from '@flowlens/shared';

class FlowLensDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  sessions!: EntityTable<CaptureSession, 'id'>;
  screens!: EntityTable<CapturedScreen, 'id'>;
  connections!: EntityTable<ScreenConnection, 'id'>;
  comments!: EntityTable<ScreenComment, 'id'>;
  annotations!: EntityTable<ScreenAnnotation, 'id'>;
  canvasStates!: EntityTable<CanvasState, 'projectId'>;
  constructor() {
    super('FlowLens');
    this.version(1).stores({
      projects: 'id, updatedAt, domain',
      sessions: 'id, projectId, status',
      screens: 'id, projectId, sessionId, capturedAt',
      connections: 'id, projectId, sourceScreenId, targetScreenId',
      comments: 'id, projectId, screenId, status',
      annotations: 'id, projectId, screenId',
      canvasStates: 'projectId',
    });
  }
}

export const db = new FlowLensDatabase();

export async function importProject(payload: FlowLensProjectExport) {
  await db.transaction('rw', db.tables, async () => {
    await db.projects.put(payload.project);
    await db.sessions.bulkPut(payload.sessions);
    await db.screens.bulkPut(payload.screens);
    await db.connections.bulkPut(payload.connections);
    await db.comments.bulkPut(payload.comments);
    await db.annotations.bulkPut(payload.annotations);
    const existingCanvas = await db.canvasStates.get(payload.project.id);
    if (!existingCanvas || payload.canvas.updatedAt > existingCanvas.updatedAt)
      await db.canvasStates.put(payload.canvas);
  });
}

export async function deleteProject(projectId: string) {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all([
      db.sessions.where('projectId').equals(projectId).delete(),
      db.screens.where('projectId').equals(projectId).delete(),
      db.connections.where('projectId').equals(projectId).delete(),
      db.comments.where('projectId').equals(projectId).delete(),
      db.annotations.where('projectId').equals(projectId).delete(),
      db.canvasStates.delete(projectId),
    ]);
    await db.projects.delete(projectId);
  });
}

export async function serializeProject(projectId: string): Promise<FlowLensProjectExport> {
  const [project, sessions, screens, connections, comments, annotations, canvas] =
    await Promise.all([
      db.projects.get(projectId),
      db.sessions.where('projectId').equals(projectId).toArray(),
      db.screens.where('projectId').equals(projectId).toArray(),
      db.connections.where('projectId').equals(projectId).toArray(),
      db.comments.where('projectId').equals(projectId).toArray(),
      db.annotations.where('projectId').equals(projectId).toArray(),
      db.canvasStates.get(projectId),
    ]);
  if (!project) throw new Error('Project not found.');
  return {
    version: '1.0',
    project,
    sessions,
    screens,
    connections,
    comments,
    annotations,
    canvas: canvas ?? { projectId, nodePositions: {}, updatedAt: new Date().toISOString() },
    exportedAt: new Date().toISOString(),
  };
}
