import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { quickAdd, register } from './helpers';

test('esporta la giornata in Markdown e CSV', async ({ page }) => {
  await register(page);
  await quickAdd(page, 'Drink water');
  await page.getByRole('link', { name: 'Abitudini' }).click();
  await page.getByRole('button', { name: 'Segna «Drink water» come fatta' }).click();
  await expect(page.getByText('Completate (1)')).toBeVisible();
  await page.getByRole('link', { name: 'Profilo' }).click();

  const [md] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Scarica' }).click(),
  ]);
  expect(md.suggestedFilename()).toMatch(/^habit-tracker-\d{4}-\d{2}-\d{2}\.md$/);
  const mdText = await readFile((await md.path())!, 'utf8');
  expect(mdText).toContain('Completamento: 100% (1/1)');
  expect(mdText).toContain('- [x] Drink water 🔥1');

  await page.getByRole('button', { name: 'CSV' }).click();
  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Scarica' }).click(),
  ]);
  expect(csv.suggestedFilename()).toMatch(/\.csv$/);
  expect(await readFile((await csv.path())!, 'utf8')).toContain('Drink water,1,1');
});
