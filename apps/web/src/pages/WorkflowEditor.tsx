import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  addEdge,
  applyEdgeChanges,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, CheckCircle2, Download, Moon, Sun } from 'lucide-react';
import type { CanvasState, CapturedScreen, FlowLensProjectExport } from '@flowlens/shared';
import { bridgePayloadSchema, createConnection } from '@flowlens/shared';
import { db, importProject } from '../db/database';
import { autoLayout } from '../utils/layout';
import { ScreenNode, type ScreenNodeData } from '../features/workflow/ScreenNode';
import { DetailsPanel } from '../features/workflow/DetailsPanel';
import { AnnotationModal } from '../features/annotations/AnnotationModal';
import { exportPng } from '../features/export/export';
import { useUI } from '../store/ui';
import type { Theme } from '../store/theme';
import { ProjectIcon } from '../features/projects/ProjectIcon';
import { EditableEdge, type EditableEdgeData } from '../features/workflow/EditableEdge';
import { buildRouteGraph } from '../utils/routeGraph';

const nodeTypes = { screen: ScreenNode };
const edgeTypes = { editable: EditableEdge };

function Editor({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { projectId = '' } = useParams();
  const flowRef = useRef<HTMLDivElement>(null);
  const imported = useRef(false);
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId], null);
  const screensQuery = useLiveQuery(
    () => db.screens.where('projectId').equals(projectId).sortBy('capturedAt'),
    [projectId],
  );
  const connectionsQuery = useLiveQuery(
    () => db.connections.where('projectId').equals(projectId).toArray(),
    [projectId],
  );
  const commentsQuery = useLiveQuery(
    () => db.comments.where('projectId').equals(projectId).toArray(),
    [projectId],
  );
  const annotationsQuery = useLiveQuery(
    () => db.annotations.where('projectId').equals(projectId).toArray(),
    [projectId],
  );
  const screens = useMemo(() => screensQuery ?? [], [screensQuery]);
  const connections = useMemo(() => connectionsQuery ?? [], [connectionsQuery]);
  const comments = useMemo(() => commentsQuery ?? [], [commentsQuery]);
  const annotations = useMemo(() => annotationsQuery ?? [], [annotationsQuery]);
  const routeGraph = useMemo(
    () => buildRouteGraph(screens, connections),
    [screens, connections],
  );
  const routeScreens = useMemo(
    () => routeGraph.nodes.map((node) => node.screen),
    [routeGraph.nodes],
  );
  const canvas = useLiveQuery(() => db.canvasStates.get(projectId), [projectId]);
  const selectedId = useUI((state) => state.selectedScreenId);
  const select = useUI((state) => state.selectScreen);
  const annotationId = useUI((state) => state.annotationScreenId);
  const openAnnotation = useUI((state) => state.openAnnotation);
  const notify = useUI((state) => state.notify);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [preview, setPreview] = useState<CapturedScreen>();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window) return;
      const result = bridgePayloadSchema.safeParse(event.data);
      if (!result.success || result.data.projectId !== projectId) return;
      if (result.data.payload)
        void importProject(result.data.payload as FlowLensProjectExport).then(() =>
          notify('Recording imported from FlowLens extension'),
        );
      else if (result.data.error) notify(result.data.error, 'error');
    };
    window.addEventListener('message', onMessage);
    if (!imported.current) {
      imported.current = true;
      window.postMessage(
        { source: 'flowlens-web', type: 'FLOWLENS_REQUEST_PROJECT', projectId },
        window.location.origin,
      );
    }
    return () => window.removeEventListener('message', onMessage);
  }, [projectId, notify]);

  const removeScreens = useCallback(
    (ids: string[]) => {
      if (!confirm('Delete this route and all of its captures, connections, comments, and annotations?'))
        return;
      const idSet = new Set(ids);
      void db.transaction(
        'rw',
        db.screens,
        db.connections,
        db.comments,
        db.annotations,
        async () => {
          await db.screens.bulkDelete(ids);
          await db.connections
            .filter(
              (edge) => idSet.has(edge.sourceScreenId) || idSet.has(edge.targetScreenId),
            )
            .delete();
          await db.comments.where('screenId').anyOf(ids).delete();
          await db.annotations.where('screenId').anyOf(ids).delete();
        },
      );
      if (selectedId && idSet.has(selectedId)) select(undefined);
    },
    [selectedId, select],
  );

  const positions = useMemo(
    () =>
      canvas?.layoutMode === 'route-graph-v1' &&
      routeGraph.nodes.every((node) => canvas.nodePositions[node.id])
        ? canvas!.nodePositions
        : autoLayout(routeScreens, routeGraph.edges),
    [canvas, routeScreens, routeGraph],
  );
  useEffect(() => {
    setNodes(
      routeGraph.nodes.map((routeNode) => ({
        id: routeNode.id,
        type: 'screen',
        position: positions[routeNode.id] ?? { x: 0, y: 0 },
        data: {
          screen: routeNode.screen,
          commentCount: comments.filter((comment) => routeNode.screenIds.includes(comment.screenId))
            .length,
          annotationPreviewUrl: annotations.find((item) =>
            routeNode.screenIds.includes(item.screenId),
          )?.previewDataUrl,
          onDelete: () => removeScreens(routeNode.screenIds),
          onPreview: setPreview,
        } satisfies ScreenNodeData,
      })),
    );
  }, [routeGraph.nodes, comments, annotations, positions, removeScreens, setNodes]);
  const renameEdges = useCallback((ids: string[], label: string) => {
    void db.connections.bulkUpdate(ids.map((id) => ({ key: id, changes: { label } })));
  }, []);
  useEffect(
    () =>
      setEdges(
        routeGraph.edges.map((edge) => ({
          id: edge.id,
          source: edge.sourceScreenId,
          target: edge.targetScreenId,
          data: {
            label: edge.label,
            connectionIds: edge.connectionIds,
            onLabelChange: (_id, label) => renameEdges(edge.connectionIds, label),
          } satisfies EditableEdgeData,
          type: 'editable',
        })),
      ),
    [routeGraph.edges, renameEdges, setEdges],
  );

  const saveCanvas = useCallback(
    async (nextNodes = nodes) => {
      const state: CanvasState = {
        projectId,
        nodePositions: Object.fromEntries(nextNodes.map((node) => [node.id, node.position])),
        layoutMode: 'route-graph-v1',
        updatedAt: new Date().toISOString(),
      };
      await db.canvasStates.put(state);
      await db.projects.update(projectId, { updatedAt: state.updatedAt });
    },
    [nodes, projectId],
  );
  const connect = async (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const label = 'Navigate';
    const sessionId =
      routeScreens.find((screen) => screen.id === connection.source)?.sessionId ?? 'manual';
    const edge = createConnection({
      projectId,
      sessionId,
      sourceScreenId: connection.source,
      targetScreenId: connection.target,
      label,
      actionType: 'manual',
    });
    await db.connections.add(edge);
    setEdges((current) =>
      addEdge(
        {
          id: edge.id,
          source: edge.sourceScreenId,
          target: edge.targetScreenId,
          type: 'editable',
          data: {
            label: edge.label,
            connectionIds: [edge.id],
            onLabelChange: (_id, nextLabel) => renameEdges([edge.id], nextLabel),
          } satisfies EditableEdgeData,
        },
        current,
      ),
    );
  };
  const changeEdges = (changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type !== 'remove') continue;
      const current = edges.find((edge) => edge.id === change.id);
      const connectionIds = (current?.data as { connectionIds?: string[] } | undefined)
        ?.connectionIds;
      void db.connections.bulkDelete(connectionIds?.length ? connectionIds : [change.id]);
    }
    setEdges((current) => applyEdgeChanges(changes, current));
  };
  const selectedRoute = routeGraph.nodes.find((node) => node.id === selectedId);
  const selected = selectedRoute?.screen;
  const selectedComments = comments.filter((comment) =>
    selectedRoute?.screenIds.includes(comment.screenId),
  );
  const annotationScreen = routeGraph.nodes.find((node) => node.id === annotationId)?.screen;

  if (project === null)
    return (
      <div className="center-state">
        <div className="spinner" /> Waiting for project data…
        <small>Keep the FlowLens extension installed if this recording has not imported yet.</small>
      </div>
    );
  if (project === undefined)
    return (
      <div className="center-state">
        <h2>Project not found</h2>
        <p>The project may have been deleted, or the extension has not imported it.</p>
        <Link className="button primary" to="/">
          Return to projects
        </Link>
      </div>
    );
  return (
    <div className="editor">
      <header className="editor-header">
        <div className="editor-project">
          <Link className="icon-button" to="/" aria-label="Back to projects">
            <ArrowLeft />
          </Link>
          <ProjectIcon faviconUrl={project.faviconUrl} className="editor-project-icon" />
          <div>
            <input
              className="editor-project-name"
              aria-label="Project name"
              value={project.name}
              onChange={(event) => {
                const name = event.target.value;
                void db.projects.update(projectId, { name, updatedAt: new Date().toISOString() });
              }}
            />
            <p>
              {routeGraph.nodes.length} routes · {routeGraph.edges.length} connections
            </p>
          </div>
        </div>
        <div className="editor-actions">
          <button
            className="icon-button theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <span className="autosave-status" title="Project changes are saved automatically">
            <CheckCircle2 size={16} /> Autosaved
          </span>
          <button
            className="button primary"
            onClick={() =>
              flowRef.current &&
              void exportPng(flowRef.current, project.name).catch(() =>
                notify('PNG export failed. Try fitting the workflow and export again.', 'error'),
              )
            }
          >
            <Download size={16} /> PNG
          </button>
        </div>
      </header>
      <div className={`editor-body ${selected ? 'with-details' : ''}`}>
        <aside className="screen-list">
          <div>
            <h2>Screens</h2>
            <span>{routeGraph.nodes.length}</span>
          </div>
          {routeGraph.nodes.map((routeNode) => (
            <button
              key={routeNode.id}
              className={routeNode.id === selectedId ? 'active' : ''}
              onClick={() => select(routeNode.id)}
            >
              <img src={routeNode.screen.screenshotDataUrl} alt="" />
              <span>
                <strong>{routeNode.route}</strong>
              </span>
            </button>
          ))}
          {routeGraph.nodes.length === 0 && <p>No screens have been imported.</p>}
        </aside>
        <main className="flow-area" ref={flowRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={changeEdges}
            onConnect={(connection) => void connect(connection)}
            onNodeClick={(_event, node) => select(node.id)}
            onNodeDragStop={() => void saveCanvas()}
            onPaneClick={() => select(undefined)}
            connectionMode={ConnectionMode.Strict}
            connectionLineType={ConnectionLineType.SmoothStep}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            minZoom={0.15}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor="#c7d2fe" />
          </ReactFlow>
        </main>
        {selected && (
          <DetailsPanel
            screen={selected}
            projectId={projectId}
            comments={selectedComments}
            connections={routeGraph.edges}
            previewDataUrl={annotations.find((item) => item.screenId === selected.id)?.previewDataUrl}
            onClose={() => select(undefined)}
            onAnnotate={() => openAnnotation(selected.id)}
            onDelete={() => selectedRoute && removeScreens(selectedRoute.screenIds)}
          />
        )}
      </div>
      {preview && (
        <div className="modal-backdrop preview-modal" onClick={() => setPreview(undefined)}>
          <button aria-label="Close preview">×</button>
          <img src={preview.screenshotDataUrl} alt={preview.title} />
        </div>
      )}
      {annotationScreen && (
        <AnnotationModal
          screen={annotationScreen}
          existing={annotations.find((item) => item.screenId === annotationScreen.id)}
        />
      )}
    </div>
  );
}

export function WorkflowEditor({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <ReactFlowProvider>
      <Editor theme={theme} onToggleTheme={onToggleTheme} />
    </ReactFlowProvider>
  );
}
