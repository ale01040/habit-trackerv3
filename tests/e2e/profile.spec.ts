import { expect, test } from '@playwright/test';
import { drag, quickAdd, register } from './helpers';

test('crea, modifica, archivia e riattiva', async ({ page }) => {
  await register(page);
  await quickAdd(page, 'Drink water', 'Read 15min');
  await expect(page.getByText('2 abitudini attive · 0 passate')).toBeVisible();

  await page.getByRole('button', { name: 'Modifica «Read 15min»' }).click();
  const dialog = page.getByRole('dialog', { name: 'Modifica abitudine' });
  await dialog.getByLabel('Nome').fill('Leggere 15 minuti');
  await dialog.getByRole('button', { name: 'Libro' }).click();
  await dialog.getByRole('button', { name: 'sabato' }).click();
  await dialog.getByRole('button', { name: 'domenica' }).click();
  await dialog.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByRole('button', { name: 'Modifica «Leggere 15 minuti»' })).toContainText(
    'Lun–Ven',
  );

  await page.getByRole('button', { name: 'Modifica «Drink water»' }).click();
  await page.getByRole('button', { name: 'Archivia' }).click();
  await page.getByRole('button', { name: 'Conferma archiviazione' }).click();
  await expect(page.getByText('1 abitudine attiva · 1 passata')).toBeVisible();

  await page.getByText('Abitudini passate (1)').click();
  await page.getByRole('button', { name: 'Riattiva «Drink water»' }).click();
  await expect(page.getByText('2 abitudini attive · 0 passate')).toBeVisible();
});

test('riordino trascinando la maniglia', async ({ page }) => {
  await register(page);
  await quickAdd(page, 'Primo', 'Secondo');
  const handle = page.getByRole('button', { name: 'Trascina per riordinare «Secondo»' });
  const target = page.getByRole('button', { name: 'Modifica «Primo»' });
  const from = (await handle.boundingBox())!;
  const to = (await target.boundingBox())!;
  const x = from.x + from.width / 2;
  await drag(page, { x, y: from.y + from.height / 2 }, { x, y: to.y - 12 });
  const names = page
    .getByRole('list', { name: 'Abitudini attive' })
    .getByRole('button', { name: /^Modifica/ });
  await expect(names.first()).toHaveAccessibleName('Modifica «Secondo»');
  await page.reload();
  await expect(names.first()).toHaveAccessibleName('Modifica «Secondo»');
});
