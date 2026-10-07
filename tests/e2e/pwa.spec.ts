import { expect, test } from '@playwright/test';

test('manifest e icone per l’installazione', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    name: 'Habit tracker',
    display: 'standalone',
    theme_color: '#073B4C',
    lang: 'it',
  });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  expect((await request.get('/apple-touch-icon-180x180.png')).ok()).toBe(true);
});
