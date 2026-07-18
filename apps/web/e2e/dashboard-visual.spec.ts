import { test, expect } from '@playwright/test';

async function seedProject(page: import('@playwright/test').Page) {
  await page.goto('/project/mock-checkout');
  await page.evaluate(async () => {
    const payload = await fetch('/mock-recording.json').then((response) => response.json());
    payload.screens.push(
      {
        ...payload.screens[0],
        id: 'mock-home-return',
        capturedAt: '2026-07-18T15:32:00.000Z',
      },
      {
        ...payload.screens[1],
        id: 'mock-signup',
        url: 'https://shop.example/signup',
        normalizedUrl: 'https://shop.example/signup',
        title: 'Create account',
        capturedAt: '2026-07-18T15:33:00.000Z',
      },
    );
    payload.connections.push(
      {
        ...payload.connections[0],
        id: 'mock-return-home',
        sourceScreenId: 'mock-cart',
        targetScreenId: 'mock-home-return',
        label: 'Continue shopping',
        createdAt: '2026-07-18T15:32:00.000Z',
      },
      {
        ...payload.connections[0],
        id: 'mock-signup-edge',
        sourceScreenId: 'mock-home-return',
        targetScreenId: 'mock-signup',
        label: 'Create account',
        createdAt: '2026-07-18T15:33:00.000Z',
      },
    );
    window.postMessage(
      {
        source: 'flowlens-extension',
        type: 'FLOWLENS_PROJECT_PAYLOAD',
        projectId: 'mock-checkout',
        payload,
      },
      window.location.origin,
    );
  });
  await expect(page.getByLabel('Project name')).toHaveValue('Mock checkout flow');
}

test('dashboard supports branded light, dark, and mobile states', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await seedProject(page);
  await expect(page.getByRole('button', { name: 'Auto layout' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'JSON' })).toHaveCount(0);
  await expect(page.getByText('Autosaved')).toBeVisible();
  await expect(page.locator('.screen-node')).toHaveCount(3);
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await page.screenshot({ path: 'artifacts/editor-dark.png', fullPage: true });
  await page.setViewportSize({ width: 1096, height: 462 });
  await page.getByTestId('rf__controls').getByRole('button', { name: 'Fit View' }).click();
  await page.screenshot({ path: 'artifacts/editor-route-graph-dark.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('.screen-list > button').first().click();
  const originalPreview = await page.locator('.screen-node img').first().getAttribute('src');
  await expect(page.getByText('Page title')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annotate screenshot' }).click();
  await expect(page.getByText('Sticky note')).toHaveCount(0);
  await expect(page.getByText('100%')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.getByText('110%')).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Annotate Store home' }).getByRole('heading', { name: '/' }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/annotation-dark.png', fullPage: true });
  await page.getByTitle('Text').click();
  await expect(page.getByTitle('Text')).toHaveClass(/active/);
  await page.locator('.canvas-stage canvas').click({ position: { x: 80, y: 80 } });
  await page.getByLabel('Annotation text').fill('Review this step');
  await page.getByLabel('Annotation text').press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.screen-node img').first()).not.toHaveAttribute(
    'src',
    originalPreview ?? '',
  );
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mock checkout flow' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'shop.example' })).toHaveAttribute(
    'href',
    'https://shop.example',
  );
  await page.screenshot({ path: 'artifacts/dashboard-light.png', fullPage: true });

  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'artifacts/dashboard-dark.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'artifacts/dashboard-mobile-dark.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
});
