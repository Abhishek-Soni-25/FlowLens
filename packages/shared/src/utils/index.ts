import type { CapturedScreen, ScreenConnection } from '../types';

export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
    ].forEach((key) => url.searchParams.delete(key));
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return value.split('#')[0] ?? value;
  }
}

export function routeFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.pathname || '/';
  } catch {
    return '/';
  }
}

export async function hashScreenshot(dataUrl: string): Promise<string> {
  const bytes = new TextEncoder().encode(dataUrl);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isDuplicateCapture(
  latest: CapturedScreen | undefined,
  normalizedUrl: string,
  screenshotHash: string,
  captureType: CapturedScreen['captureType'],
): boolean {
  return (
    captureType !== 'manual' &&
    latest?.normalizedUrl === normalizedUrl &&
    latest.screenshotHash === screenshotHash
  );
}

export function createConnection(
  input: Omit<ScreenConnection, 'id' | 'createdAt'>,
): ScreenConnection {
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'project'
  );
}
