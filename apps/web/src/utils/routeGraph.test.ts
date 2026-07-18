import { describe, expect, it } from 'vitest';
import type { CapturedScreen, ScreenConnection } from '@flowlens/shared';
import { buildRouteGraph } from './routeGraph';

const screen = (id: string, route: string, capturedAt: string): CapturedScreen => ({
  id,
  projectId: 'project',
  sessionId: 'session',
  url: `https://example.test${route}`,
  normalizedUrl: `https://example.test${route}`,
  title: route,
  screenshotDataUrl: 'data:image/png;base64,AA==',
  screenshotHash: id,
  viewportWidth: 1200,
  viewportHeight: 800,
  capturedAt,
  captureType: 'automatic',
});

const edge = (id: string, sourceScreenId: string, targetScreenId: string): ScreenConnection => ({
  id,
  projectId: 'project',
  sessionId: 'session',
  sourceScreenId,
  targetScreenId,
  label: 'Navigate',
  actionType: 'route-change',
  createdAt: `2026-07-18T00:00:0${id.slice(-1)}.000Z`,
});

describe('buildRouteGraph', () => {
  it('merges repeated routes and branches from their representative node', () => {
    const graph = buildRouteGraph(
      [
        screen('home-1', '/', '2026-07-18T00:00:01.000Z'),
        screen('login', '/login', '2026-07-18T00:00:02.000Z'),
        screen('home-2', '/', '2026-07-18T00:00:03.000Z'),
        screen('signup', '/signup', '2026-07-18T00:00:04.000Z'),
      ],
      [edge('e1', 'home-1', 'login'), edge('e2', 'login', 'home-2'), edge('e3', 'home-2', 'signup')],
    );

    expect(graph.nodes.map((node) => node.route)).toEqual(['/', '/login', '/signup']);
    expect(graph.nodes[0]?.screenIds).toEqual(['home-1', 'home-2']);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceScreenId: 'home-1', targetScreenId: 'login' }),
        expect.objectContaining({ sourceScreenId: 'home-1', targetScreenId: 'signup' }),
      ]),
    );
  });

  it('deduplicates repeated transitions and removes same-route loops', () => {
    const graph = buildRouteGraph(
      [screen('a1', '/a', '2026-07-18T00:00:01.000Z'), screen('a2', '/a', '2026-07-18T00:00:02.000Z'), screen('b', '/b', '2026-07-18T00:00:03.000Z')],
      [edge('e1', 'a1', 'a2'), edge('e2', 'a1', 'b'), edge('e3', 'a2', 'b')],
    );

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.connectionIds).toEqual(['e2', 'e3']);
  });
});
