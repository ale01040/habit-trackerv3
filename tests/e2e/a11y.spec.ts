import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { quickAdd, register } from './helpers';

async function scan(page: Page, label: string) {
  // attende la fine delle animazioni di ingresso prima di misurare i colori
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${label}: ${v.id} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`nessuna violazione grave in tema ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await scan(page, 'login');
    await register(page);
    await quickAdd(page, 'Drink water', 'Read 15min');
    await scan(page, 'profilo');
    await page.getByRole('link', { name: 'Abitudini' }).click();
    await page.getByRole('button', { name: 'Segna «Drink water» come fatta' }).click();
    await expect(page.getByText('Completate (1)')).toBeVisible();
    await scan(page, 'home');
    await page.getByRole('link', { name: 'Statistiche' }).click();
    await page.getByRole('tab', { name: 'Mese' }).click();
    await scan(page, 'statistiche');
  });
}
