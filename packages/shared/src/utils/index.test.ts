import { describe, expect, it } from 'vitest';
import {
  createConnection,
  hashScreenshot,
  isDuplicateCapture,
  normalizeUrl,
  routeFromUrl,
} from './index';

describe('shared utilities', () => {
  it('normalizes URLs and strips tracking data', () =>
    expect(normalizeUrl('https://x.test/path/?utm_source=a&b=2#part')).toBe(
      'https://x.test/path?b=2',
    ));
  it('formats a URL as a route', () =>
    expect(routeFromUrl('https://x.test/signup?plan=pro#details')).toBe('/signup'));
  it('hashes screenshots deterministically', async () =>
    expect(await hashScreenshot('data:image/png;base64,abc')).toBe(
      await hashScreenshot('data:image/png;base64,abc'),
    ));
  it('skips automatic duplicates but permits manual states', () => {
    const latest = { normalizedUrl: 'https://x.test/', screenshotHash: 'a' } as any;
    expect(isDuplicateCapture(latest, 'https://x.test/', 'a', 'automatic')).toBe(true);
    expect(isDuplicateCapture(latest, 'https://x.test/', 'a', 'manual')).toBe(false);
  });
  it('creates directed connections', () =>
    expect(
      createConnection({
        projectId: 'p',
        sessionId: 's',
        sourceScreenId: 'a',
        targetScreenId: 'b',
        label: 'Go',
        actionType: 'click',
      }).sourceScreenId,
    ).toBe('a'));
});
