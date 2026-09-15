import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFlow } from '../flows/catalog';

type E2EFixture = {
  loginEmail: string;
  historyPatientName: string;
  branchName: string;
};

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(frontDir, 'e2e/.runtime/fixture.json');
const fixture: E2EFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const E2E_PASSWORD = 'E2e!Test123';

const authenticate = async (page: Page) => {
  await page.goto('/login');
  const consentButton = page.getByRole('button', { name: 'Entendi e aceito' });
  if (await consentButton.isVisible().catch(() => false)) await consentButton.click();
  await page.getByLabel('E-mail/CPF').fill(fixture.loginEmail);
  await page.getByRole('textbox', { name: 'Senha' }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /Entrar|Acessar/i }).click();
  await expect(page).toHaveURL(/dashboard|inicio|visao-geral/i);
};

const projectSuffix = (testInfo: TestInfo) => testInfo.project.name === 'mobile' ? 'Mobile' : 'Desktop';

const selectOption = async (page: Page | Locator, label: string, optionName: string) => {
  await page.getByRole('button', { name: label, exact: true }).last().click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
};

test.describe(getFlow('history.consultation-review').title, () => {
  test('filtra o histórico e abre o prontuário do atendimento concluído', async ({ page }) => {
    await authenticate(page);
    await page.goto('/historico');

    await page.getByPlaceholder('Nome do paciente ou CPF').fill(fixture.historyPatientName);
    const historyRow = page.locator('.historico-table tbody tr:visible, .historico-mobile-card:visible').filter({ hasText: fixture.historyPatientName }).first();
    await expect(historyRow).toBeVisible();
    await historyRow.getByRole('button', { name: 'Ver detalhes', exact: true }).click();

    const drawer = page.locator('.ui-modal').filter({ has: page.getByRole('heading', { name: 'Detalhes do atendimento', exact: true }) });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Paciente', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Data e horário', { exact: true })).toBeVisible();
  });
});

test.describe(getFlow('finance.entry-create').title, () => {
  test('registra uma receita e depois a localiza pela busca financeira', async ({ page }, testInfo) => {
    await authenticate(page);
    const name = `Paciente financeiro ${projectSuffix(testInfo)}`;
    const description = `Receita criada na jornada E2E ${projectSuffix(testInfo)}`;

    await page.goto('/financeiro');
    await page.locator('.financeiro-hub-card').filter({ hasText: 'Todos' }).click();
    await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();

    const dialog = page.locator('.ui-modal').filter({ has: page.getByRole('heading', { name: 'Novo lançamento', exact: true }) });
    await selectOption(dialog, 'Tipo', 'Receita');
    await selectOption(dialog, 'Categoria', 'Consulta');
    await dialog.getByLabel('Descrição').fill(description);
    await dialog.getByLabel('Valor (R$)').fill('275');
    await dialog.getByLabel('Forma de pagamento').click();
    await page.getByRole('option', { name: 'Cartão', exact: true }).click();
    await dialog.getByLabel('Nome').fill(name);
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();

    await expect(page.getByText('Lançamento criado', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Fechar|Continuar/i }).first().click().catch(() => undefined);
    await page.getByPlaceholder('Buscar paciente por nome ou CPF...').fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    const financeRow = page.getByRole('row').filter({ hasText: name }).last();
    await expect(financeRow).toContainText('receita');
  });
});

test.describe(getFlow('delivery.document-hand-off').title, () => {
  test('registra um documento disponível e confirma a entrega ao paciente', async ({ page }, testInfo) => {
    await authenticate(page);
    const receiverName = `Recebedor E2E ${projectSuffix(testInfo)}`;

    await page.goto('/entrega');
    await page.getByRole('button', { name: 'Nova entrega', exact: true }).click();
    const createDialog = page.locator('.ui-modal').filter({ has: page.getByRole('heading', { name: 'Registrar entrega', exact: true }) }).first();
    await selectOption(createDialog, 'Paciente', fixture.historyPatientName);
    await selectOption(createDialog, 'Tipo de documento', 'Laudo');
    await createDialog.getByLabel('Descrição').fill(`Documento entregue na jornada E2E ${projectSuffix(testInfo)}`);
    await createDialog.getByRole('button', { name: 'Registrar', exact: true }).click();

    await expect(page.getByText('Entrega registrada', { exact: true })).toBeVisible();
    const patientActions = page.getByRole('button', { name: `Ações de ${fixture.historyPatientName}` });
    await expect(patientActions.first()).toBeVisible();
    await patientActions.first().click();
    await page.getByRole('button', { name: 'Entregar', exact: true }).click();

    const deliverDialog = page.locator('.ui-modal').filter({ has: page.getByRole('heading', { name: 'Registrar entrega', exact: true }) }).last();
    await deliverDialog.getByLabel('Nome de quem recebeu').fill(receiverName);
    await deliverDialog.getByLabel('CPF de quem recebeu').fill('52998224725');
    await deliverDialog.getByRole('button', { name: 'Entregar', exact: true }).click();

    await expect(page.getByText('Entrega realizada', { exact: true })).toBeVisible();
    await expect(page.getByText('Entregue', { exact: true }).first()).toBeVisible();
  });
});

test.describe(getFlow('reports.configuration').title, () => {
  test('altera uma regra de revisão e confirma a persistência da configuração', async ({ page }) => {
    await authenticate(page);
    await page.goto('/laudo-configuracoes');
    await page.locator('.laudo-config-hub-card').filter({ hasText: 'Configurações' }).click();
    await expect(page.getByText('Regras de Finalização', { exact: true })).toBeVisible();

    const reviewerSwitch = page.getByRole('checkbox', { name: /Ativo|Inativo/ }).first();
    const nextValue = !(await reviewerSwitch.isChecked());
    await reviewerSwitch.setChecked(nextValue);
    await expect(page.getByText('Configuracao atualizada', { exact: true })).toBeVisible();

    await page.reload();
    await page.locator('.laudo-config-hub-card').filter({ hasText: 'Configurações' }).click();
    await expect(page.getByRole('checkbox', { name: /Ativo|Inativo/ }).first()).toBeChecked({ checked: nextValue });
  });
});
