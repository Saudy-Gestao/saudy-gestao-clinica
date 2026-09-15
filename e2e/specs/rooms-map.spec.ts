import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type E2EFixture = { loginEmail: string };

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(frontDir, 'e2e/.runtime/fixture.json');
const fixture: E2EFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test.describe('Mapa semanal de salas', () => {
  test('limita a janela inicial a 10 salas e mantém a rolagem dentro do mapa', async ({ page }) => {
    await page.goto('/login');
    const consentButton = page.getByRole('button', { name: 'Entendi e aceito' });
    if (await consentButton.isVisible().catch(() => false)) await consentButton.click();
    await page.getByLabel('E-mail/CPF').fill(fixture.loginEmail);
    await page.getByRole('textbox', { name: 'Senha' }).fill('E2e!Test123');
    await page.getByRole('button', { name: /Entrar|Acessar/i }).click();
    await expect(page).toHaveURL(/dashboard|inicio|visao-geral/i);

    await page.goto('/cadastro-sala');
    await page.getByText('Mapa de salas', { exact: true }).last().click();

    const mapScroll = page.locator('[data-testid="mapa-salas-week-scroll"], .mapa-salas-week-scroll').first();
    await expect(mapScroll).toBeVisible();
    await expect(mapScroll).toHaveAttribute('data-room-scroll-limit', '10');
    await expect(page.getByText(/Exibindo 10 salas por janela/)).toBeVisible();

    const overflowState = await mapScroll.evaluate((element) => ({
      hasHorizontalOverflow: element.scrollWidth > element.clientWidth,
      bodyOverflowsHorizontally: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    expect(overflowState.hasHorizontalOverflow).toBe(true);
    expect(overflowState.bodyOverflowsHorizontally).toBe(false);

  });
});
