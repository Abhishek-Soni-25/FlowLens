import {
  routeFromUrl,
  type CapturedScreen,
  type ScreenConnection,
} from '@flowlens/shared';

export type RouteGraphNode = {
  id: string;
  route: string;
  screen: CapturedScreen;
  screenIds: string[];
};

export type RouteGraphEdge = ScreenConnection & {
  connectionIds: string[];
};

export function buildRouteGraph(
  screens: CapturedScreen[],
  connections: ScreenConnection[],
): { nodes: RouteGraphNode[]; edges: RouteGraphEdge[] } {
  const groups = new Map<string, CapturedScreen[]>();
  [...screens]
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .forEach((screen) => {
      const route = routeFromUrl(screen.url);
      const group = groups.get(route) ?? [];
      group.push(screen);
      groups.set(route, group);
    });

  const nodes = Array.from(groups, ([route, groupedScreens]) => ({
    id: groupedScreens[0]!.id,
    route,
    screen: groupedScreens[0]!,
    screenIds: groupedScreens.map((screen) => screen.id),
  }));
  const representativeByScreen = new Map(
    nodes.flatMap((node) => node.screenIds.map((screenId) => [screenId, node.id] as const)),
  );
  const edges = new Map<string, RouteGraphEdge>();

  [...connections]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((connection) => {
      const sourceScreenId = representativeByScreen.get(connection.sourceScreenId);
      const targetScreenId = representativeByScreen.get(connection.targetScreenId);
      if (!sourceScreenId || !targetScreenId || sourceScreenId === targetScreenId) return;
      const key = `${sourceScreenId}→${targetScreenId}`;
      const existing = edges.get(key);
      if (existing) {
        existing.connectionIds.push(connection.id);
        return;
      }
      edges.set(key, {
        ...connection,
        sourceScreenId,
        targetScreenId,
        connectionIds: [connection.id],
      });
    });

  return { nodes, edges: Array.from(edges.values()) };
}
