import dagre from 'dagre';
import type { CapturedScreen, ScreenConnection } from '@flowlens/shared';
export const NODE_WIDTH = 290;
export function screenPreviewHeight(screen: CapturedScreen) {
  const width = screen.pageWidth ?? screen.viewportWidth;
  const height = screen.pageHeight ?? screen.viewportHeight;
  return Math.min(320, Math.max(110, Math.round((NODE_WIDTH * height) / width)));
}
export function screenNodeHeight(screen: CapturedScreen) {
  return screenPreviewHeight(screen) + 50;
}
export function autoLayout(screens: CapturedScreen[], connections: ScreenConnection[]) {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', ranksep: 90, nodesep: 50 });
  screens.forEach((screen) =>
    graph.setNode(screen.id, { width: NODE_WIDTH, height: screenNodeHeight(screen) }),
  );
  connections.forEach((edge) => graph.setEdge(edge.sourceScreenId, edge.targetScreenId));
  dagre.layout(graph);
  return Object.fromEntries(
    screens.map((screen) => {
      const node = graph.node(screen.id);
      return [
        screen.id,
        { x: node.x - NODE_WIDTH / 2, y: node.y - screenNodeHeight(screen) / 2 },
      ];
    }),
  );
}
