import { expect, test } from '@playwright/test';

test('registrazione, navigazione, ricarica, logout e login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Registrati' }).click();
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill('password1');
  await page.getByRole('button', { name: 'Crea account' }).click();
  await expect(page.getByRole('heading', { name: 'Oggi' })).toBeVisible();

  await page.getByRole('link', { name: 'Statistiche' }).click();
  await expect(page.getByRole('tab', { name: 'Settimana' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('tab', { name: 'Settimana' })).toBeVisible();

  await page.getByRole('link', { name: 'Profilo' }).click();
  await expect(page.getByText('ada@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Esci' }).click();
  await expect(page.getByRole('tab', { name: 'Accedi' })).toBeVisible();

  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill('sbagliata');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email o password non corretti');

  await page.getByLabel('Password').fill('password1');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page.getByRole('heading', { name: 'Oggi' })).toBeVisible();
});
