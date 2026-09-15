import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type E2EFixture = { loginEmail: string };

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(frontDir, 'e2e/.runtime/fixture.json');
const fixture: E2EFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const authenticate = async (page: Page) => {
  await page.goto('/login');
  const consentButton = page.getByRole('button', { name: 'Entendi e aceito' });
  if (await consentButton.isVisible().catch(() => false)) await consentButton.click();
  await page.getByLabel('E-mail/CPF').fill(fixture.loginEmail);
  await page.getByRole('textbox', { name: 'Senha' }).fill('E2e!Test123');
  await page.getByRole('button', { name: /Entrar|Acessar/i }).click();
  await expect(page).toHaveURL(/dashboard|inicio|visao-geral/i);
};

test.describe('Modal de novidades da versão', () => {
  test('abre pelo menu, fecha e pode ser reaberto sem bloquear o fluxo', async ({ page }) => {
    await authenticate(page);

    await page.getByRole('button', { name: 'Abrir menu da conta' }).click();
    await page.getByText('Novidades da versão', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Novidades da versão', exact: true })).toBeVisible();
    await expect(page.getByText('O que mudou', { exact: true })).toBeVisible();
    await expect(page.getByText('Áreas impactadas', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Entendi', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Novidades da versão', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Abrir menu da conta' }).click();
    await page.getByText('Novidades da versão', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Novidades da versão', exact: true })).toBeVisible();
  });
});
