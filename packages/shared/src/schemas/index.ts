import { z } from 'zod';

const iso = z.string().datetime();
export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  domain: z.string(),
  siteUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  createdAt: iso,
  updatedAt: iso,
});
export const sessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  startedAt: iso,
  endedAt: iso.optional(),
  autoCapture: z.boolean(),
  status: z.enum(['recording', 'completed']),
});
export const screenSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sessionId: z.string(),
  url: z.string(),
  normalizedUrl: z.string(),
  title: z.string(),
  name: z.string().optional(),
  screenshotDataUrl: z.string().startsWith('data:image/'),
  screenshotHash: z.string(),
  viewportWidth: z.number().positive(),
  viewportHeight: z.number().positive(),
  pageWidth: z.number().positive().optional(),
  pageHeight: z.number().positive().optional(),
  capturedAt: iso,
  captureType: z.enum(['initial', 'automatic', 'manual']),
  sourceScreenId: z.string().optional(),
  navigationAction: z.string().optional(),
});
export const connectionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sessionId: z.string(),
  sourceScreenId: z.string(),
  targetScreenId: z.string(),
  label: z.string(),
  actionType: z.enum(['click', 'route-change', 'back', 'forward', 'manual', 'unknown']),
  createdAt: iso,
});
export const commentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  screenId: z.string(),
  text: z.string().min(1),
  author: z.string(),
  status: z.enum(['open', 'resolved']),
  createdAt: iso,
  updatedAt: iso,
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});
export const annotationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  screenId: z.string(),
  editorType: z.literal('native-canvas'),
  data: z.array(z.record(z.unknown())),
  previewDataUrl: z.string().optional(),
  updatedAt: iso,
});
export const canvasSchema = z.object({
  projectId: z.string(),
  nodePositions: z.record(z.object({ x: z.number(), y: z.number() })),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
  layoutMode: z.literal('route-graph-v1').optional(),
  updatedAt: iso,
});
export const exportSchema = z.object({
  version: z.literal('1.0'),
  project: projectSchema,
  sessions: z.array(sessionSchema),
  screens: z.array(screenSchema),
  connections: z.array(connectionSchema),
  comments: z.array(commentSchema),
  annotations: z.array(annotationSchema),
  canvas: canvasSchema,
  exportedAt: iso,
});

export const bridgeRequestSchema = z.object({
  source: z.literal('flowlens-web'),
  type: z.literal('FLOWLENS_REQUEST_PROJECT'),
  projectId: z.string(),
});
export const bridgeProjectIndexSchema = z.object({
  source: z.literal('flowlens-web'),
  type: z.literal('FLOWLENS_SYNC_PROJECT_INDEX'),
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      domain: z.string(),
      siteUrl: z.string().optional(),
      faviconUrl: z.string().optional(),
      sessionCount: z.number().nonnegative(),
      createdAt: z.string(),
    }),
  ),
});
export const bridgeThemeSchema = z.object({
  source: z.literal('flowlens-web'),
  type: z.literal('FLOWLENS_SYNC_THEME'),
  theme: z.enum(['light', 'dark']),
});
export const bridgeProjectDeleteSchema = z.object({
  source: z.literal('flowlens-web'),
  type: z.literal('FLOWLENS_DELETE_PROJECT'),
  projectId: z.string(),
});
export const bridgeClearProjectsSchema = z.object({
  source: z.literal('flowlens-web'),
  type: z.literal('FLOWLENS_CLEAR_PROJECTS'),
});
export const bridgePayloadSchema = z.object({
  source: z.literal('flowlens-extension'),
  type: z.literal('FLOWLENS_PROJECT_PAYLOAD'),
  projectId: z.string(),
  payload: exportSchema.optional(),
  error: z.string().optional(),
});
export const extensionMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GET_STATE') }),
  z.object({ type: z.literal('GET_PROJECT_SUGGESTION'), domain: z.string() }),
  z.object({
    type: z.literal('SYNC_PROJECT_INDEX'),
    projects: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        domain: z.string(),
        siteUrl: z.string().optional(),
        faviconUrl: z.string().optional(),
        sessionCount: z.number().nonnegative(),
        createdAt: z.string(),
      }),
    ),
  }),
  z.object({
    type: z.literal('START_RECORDING'),
    projectName: z.string().min(1),
    domain: z.string(),
    projectId: z.string().optional(),
  }),
  z.object({
    type: z.literal('CAPTURE_SCREEN'),
    captureType: z.enum(['initial', 'automatic', 'manual']).default('manual'),
    navigationAction: z.string().optional(),
  }),
  z.object({ type: z.literal('STOP_RECORDING') }),
  z.object({ type: z.literal('DELETE_PROJECT'), projectId: z.string() }),
  z.object({ type: z.literal('CLEAR_PROJECTS') }),
  z.object({
    type: z.literal('NAVIGATION'),
    url: z.string(),
    title: z.string(),
    context: z.record(z.unknown()).optional(),
    actionType: z
      .enum(['click', 'route-change', 'back', 'forward', 'unknown'])
      .default('route-change'),
  }),
  z.object({ type: z.literal('GET_PROJECT_EXPORT'), projectId: z.string() }),
  z.object({ type: z.literal('OPEN_WORKFLOW'), projectId: z.string().optional() }),
]);
