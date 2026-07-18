import { test, expect } from '@playwright/test';

test('imports a recording and persists comments', async ({ page }) => {
  await page.goto('/project/mock-checkout');
  page.on('dialog', (dialog) => dialog.accept());
  await page.evaluate(async () => {
    const payload = await fetch('/mock-recording.json').then((response) => response.json());
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
  await expect(page.locator('.screen-node')).toHaveCount(2);
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  await page.locator('.screen-list > button').first().click();
  await page.getByLabel('New comment').fill('Persist this feedback');
  await page.getByRole('button', { name: 'Add comment' }).click();
  await expect(page.getByText('Persist this feedback')).toBeVisible();
  await page.reload();
  await page.locator('.screen-list > button').first().click();
  await expect(page.getByText('Persist this feedback')).toBeVisible();
  await page.getByLabel('Project name').fill('Checkout journey');
  await page.goto('/');
  await expect(page.getByText('Checkout journey')).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { flowLensMessages: string[] }).flowLensMessages = [];
    window.addEventListener('message', (event) => {
      if (event.data?.type)
        (window as unknown as { flowLensMessages: string[] }).flowLensMessages.push(event.data.type);
    });
  });
  await page.getByRole('button', { name: 'Delete Checkout journey' }).click();
  await expect(page.getByRole('heading', { name: 'No workflows yet' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { flowLensMessages: string[] }).flowLensMessages.includes(
          'FLOWLENS_DELETE_PROJECT',
        ),
      ),
    )
    .toBe(true);
});
