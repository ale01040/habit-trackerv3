import { expect, test } from '@playwright/test';
import { drag, quickAdd, register, stableBox, swipe } from './helpers';

test('spunta con tap e con swipe, completate, giorni passati e bloccati', async ({ page }) => {
  await register(page);
  await quickAdd(page, 'Drink water', 'Read 15min');
  await page.getByRole('link', { name: 'Abitudini' }).click();
  await expect(page.getByRole('img', { name: 'Completamento 0%, 0 su 2' })).toBeVisible();

  await page.getByRole('button', { name: 'Segna «Drink water» come fatta' }).click();
  await expect(page.getByText('Completate (1)')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Completamento 50%, 1 su 2' })).toBeVisible();

  // swipe verso destra sulla riga ancora da fare
  await swipe(page.getByRole('listitem', { name: 'Read 15min' }), 'right');
  await expect(page.getByText('Completate (2)')).toBeVisible();
  await expect(page.getByText('Tutto fatto! 🎉')).toBeVisible();

  // swipe verso sinistra per togliere la spunta
  await swipe(page.getByRole('listitem', { name: 'Read 15min' }), 'left');
  await expect(page.getByText('Completate (1)')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Completate (1)')).toBeVisible();

  await page.getByRole('button', { name: 'Giorno precedente' }).click();
  await expect(page.getByRole('heading', { name: 'Ieri' })).toBeVisible();
  await expect(page.getByText('Nessuna abitudine prevista per questo giorno.')).toBeVisible();

  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Giorno precedente' }).click();
  await expect(page.getByText('Puoi modificare solo gli ultimi 7 giorni')).toBeVisible();
  await page.getByRole('button', { name: 'Vai a oggi' }).click();
  await expect(page.getByRole('heading', { name: 'Oggi' })).toBeVisible();
});

test('uno swipe che parte dal cerchio spunta una volta sola', async ({ page }) => {
  await register(page);
  await quickAdd(page, 'Drink water');
  await page.getByRole('link', { name: 'Abitudini' }).click();
  const circle = page.getByRole('button', { name: 'Segna «Drink water» come fatta' });
  const box = await stableBox(circle);
  const row = await stableBox(page.getByRole('listitem', { name: 'Drink water' }));
  const y = box.y + box.height / 2;
  await drag(page, { x: box.x + box.width / 2, y }, { x: row.x + row.width - 4, y });
  await expect(page.getByText('Completate (1)')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByText('Completate (1)')).toBeVisible();
});
