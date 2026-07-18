export type Project = {
  id: string;
  name: string;
  domain: string;
  siteUrl?: string;
  faviconUrl?: string;
  createdAt: string;
  updatedAt: string;
};
export type ProjectIndexEntry = Pick<
  Project,
  'id' | 'name' | 'domain' | 'siteUrl' | 'faviconUrl'
> & {
  sessionCount: number;
  createdAt: string;
};
export type CaptureSession = {
  id: string;
  projectId: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  autoCapture: boolean;
  status: 'recording' | 'completed';
};
export type CaptureType = 'initial' | 'automatic' | 'manual';
export type CapturedScreen = {
  id: string;
  projectId: string;
  sessionId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  name?: string;
  screenshotDataUrl: string;
  screenshotHash: string;
  viewportWidth: number;
  viewportHeight: number;
  pageWidth?: number;
  pageHeight?: number;
  capturedAt: string;
  captureType: CaptureType;
  sourceScreenId?: string;
  navigationAction?: string;
};
export type ActionType = 'click' | 'route-change' | 'back' | 'forward' | 'manual' | 'unknown';
export type ScreenConnection = {
  id: string;
  projectId: string;
  sessionId: string;
  sourceScreenId: string;
  targetScreenId: string;
  label: string;
  actionType: ActionType;
  createdAt: string;
};
export type ScreenComment = {
  id: string;
  projectId: string;
  screenId: string;
  text: string;
  author: string;
  status: 'open' | 'resolved';
  createdAt: string;
  updatedAt: string;
  position?: { x: number; y: number };
};
export type AnnotationElement = {
  id: string;
  type: 'freehand' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'sticky';
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  points?: Array<{ x: number; y: number }>;
  text?: string;
  color: string;
  width: number;
};
export type ScreenAnnotation = {
  id: string;
  projectId: string;
  screenId: string;
  editorType: 'native-canvas';
  data: AnnotationElement[];
  previewDataUrl?: string;
  updatedAt: string;
};
export type CanvasState = {
  projectId: string;
  nodePositions: Record<string, { x: number; y: number }>;
  viewport?: { x: number; y: number; zoom: number };
  layoutMode?: 'route-graph-v1';
  updatedAt: string;
};
export type FlowLensProjectExport = {
  version: '1.0';
  project: Project;
  sessions: CaptureSession[];
  screens: CapturedScreen[];
  connections: ScreenConnection[];
  comments: ScreenComment[];
  annotations: ScreenAnnotation[];
  canvas: CanvasState;
  exportedAt: string;
};
export type NavigationContext = {
  text?: string;
  tagName?: string;
  ariaLabel?: string;
  href?: string;
  selector?: string;
};
export type RecordingState = {
  active: boolean;
  project?: Project;
  session?: CaptureSession;
  screens: CapturedScreen[];
  connections: ScreenConnection[];
  capturedCount?: number;
  lastCapturedTitle?: string;
  tabId?: number;
  lastScreenId?: string;
  pendingContext?: NavigationContext;
  error?: string;
};
