import { expect, test } from '@playwright/test';

test('senza login si apre la pagina di accesso', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Habit tracker' })).toBeVisible();
});
