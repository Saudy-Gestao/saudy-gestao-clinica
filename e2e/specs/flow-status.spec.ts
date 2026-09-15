import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type E2EFixture = { loginEmail: string };

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(frontDir, 'e2e/.runtime/fixture.json');
const fixture: E2EFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test.describe('Painel de cobertura dos fluxos E2E', () => {
  test('informa aprovados, pendentes e reprovados com filtros funcionais', async ({ page }, testInfo) => {
    await page.goto('/login');
    const consentButton = page.getByRole('button', { name: 'Entendi e aceito' });
    if (await consentButton.isVisible().catch(() => false)) await consentButton.click();
    await page.getByLabel('E-mail/CPF').fill(fixture.loginEmail);
    await page.getByRole('textbox', { name: 'Senha' }).fill('E2e!Test123');
    await page.getByRole('button', { name: /Entrar|Acessar/i }).click();
    await expect(page).toHaveURL(/dashboard|inicio|visao-geral/i);

    await page.goto('/e2e-fluxos');
    await expect(page.getByTestId('e2e-flow-status-page')).toBeVisible();
    await expect(page.getByTestId('e2e-summary-approved')).toContainText('17');
    await expect(page.getByTestId('e2e-summary-pending')).toContainText('0');
    await expect(page.getByTestId('e2e-summary-rejected')).toContainText('0');
    await expect(page.getByText('Agendamento convencional completo', { exact: true })).toBeVisible();

    await page.getByLabel('Filtrar por status').click();
    await page.getByRole('option', { name: 'Pendentes', exact: true }).click();
    await expect(page.getByText('Agendamento convencional completo', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Pré-reserva e conversão do fluxo TEA', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Nenhum fluxo pendente na busca', { exact: true })).toBeVisible();

    await page.screenshot({
      path: path.join(frontDir, 'e2e/.runtime', `flow-status-${testInfo.project.name}.png`),
      fullPage: false,
    });
  });
});
