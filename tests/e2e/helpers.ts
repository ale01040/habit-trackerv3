import { expect, type Locator, type Page } from '@playwright/test';

export async function register(page: Page, email = 'ada@example.com') {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Registrati' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password1');
  await page.getByRole('button', { name: 'Crea account' }).click();
  await expect(page.getByRole('heading', { name: 'Oggi' })).toBeVisible();
}

export async function quickAdd(page: Page, ...names: string[]) {
  await page.getByRole('link', { name: 'Profilo' }).click();
  for (const name of names) {
    await page.getByLabel('Nuova abitudine', { exact: true }).fill(name);
    await page.getByLabel('Nuova abitudine', { exact: true }).press('Enter');
    await expect(page.getByRole('button', { name: `Modifica «${name}»` })).toBeVisible();
  }
}

/** Attende che il browser disegni un frame. */
async function nextFrame(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

/** Trascinamento a velocità realistica: motion rileva i gesti frame per frame. */
export async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 20,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await nextFrame(page);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps,
    );
    await nextFrame(page);
  }
  await nextFrame(page);
  await page.mouse.up();
  await nextFrame(page);
}

/** Posizione di un elemento dopo la fine delle animazioni di layout. */
export async function stableBox(locator: Locator) {
  let previous = await locator.boundingBox();
  for (let i = 0; i < 40; i++) {
    await locator.page().waitForTimeout(50);
    const current = await locator.boundingBox();
    if (previous && current && previous.x === current.x && previous.y === current.y) {
      return current;
    }
    previous = current;
  }
  throw new Error('elemento ancora in movimento');
}

/** Swipe orizzontale su una riga, partendo dal centro. */
export async function swipe(row: Locator, direction: 'right' | 'left') {
  const box = await stableBox(row);
  const y = box.y + box.height / 2;
  const start = { x: box.x + box.width * 0.5, y };
  const end = { x: direction === 'right' ? box.x + box.width - 4 : box.x + 4, y };
  await drag(row.page(), start, end);
}
