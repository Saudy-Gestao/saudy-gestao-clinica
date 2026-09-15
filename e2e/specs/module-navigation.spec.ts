import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(frontDir, 'e2e/.runtime/fixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as { loginEmail: string };
const E2E_PASSWORD = 'E2e!Test123';

const authenticatedEntryRoutes = [
  '/dashboard',
  '/bi',
  '/e2e-fluxos',
  '/fila-atendimento',
  '/meus-chamados',
  '/settings',
  '/pre-atendimento',
  '/autorizacao-e-recepcao',
  '/agendamento',
  '/historico',
  '/consulta',
  '/execucao-exames',
  '/laudo-exames',
  '/laudo-configuracoes',
  '/entrega',
  '/estoque',
  '/financeiro',
  '/faturamento',
  '/cadastro-medico',
  '/cadastro-estagiario',
  '/cadastro-procedimento',
  '/cadastro-paciente',
  '/cadastro-convenio',
  '/autorizacao-convenio',
  '/cadastro-sala',
  '/cadastro-equipamento',
  '/cadastro-modalidade',
  '/cadastro-especialidade',
  '/cadastro-anamnese',
  '/cadastro-enfermagem',
  '/cadastro-agenda',
  '/conversas',
  '/whatsapp',
  '/tea',
  '/tea/agenda-semanal',
];

const authenticate = async (page: Page) => {
  await page.goto('/login');
  const consentButton = page.getByRole('button', { name: 'Entendi e aceito' });
  if (await consentButton.isVisible().catch(() => false)) await consentButton.click();
  await page.getByLabel('E-mail/CPF').fill(fixture.loginEmail);
  await page.getByRole('textbox', { name: 'Senha' }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /Entrar|Acessar/i }).click();
  await expect(page).toHaveURL(/dashboard|inicio|visao-geral/i);
};

test.describe('Navegação dos módulos autenticados', () => {
  test('abre todas as entradas do shell sem redirecionar para login ou 404', async ({ page }) => {
    await authenticate(page);

    for (const route of authenticatedEntryRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page, `A rota ${route} não deve exigir novo login`).not.toHaveURL(/\/login(?:\?|$)/i);
      await expect(page.locator('body'), `A rota ${route} não deve mostrar a página 404`).not.toContainText('Página não encontrada');
      await expect(page.locator('body'), `A rota ${route} deve renderizar conteúdo`).not.toBeEmpty();
    }
  });
});
