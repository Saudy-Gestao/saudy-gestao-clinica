import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type E2EFixture = {
  loginEmail: string;
  branchName: string;
  specialtyName: string;
  procedureName: string;
  patientName: string;
  doctorName: string;
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

const suffix = (testInfo: TestInfo) => testInfo.project.name === 'mobile' ? 'Mobile' : 'Desktop';

const selectOption = async (page: Page | Locator, label: string, optionName: string | RegExp) => {
  await page.getByRole('button', { name: label, exact: true }).last().click();
  await page.getByRole('option', { name: optionName }).click();
};

test.describe('Jornadas administrativas complementares', () => {
  test('cadastra um convênio e vincula um procedimento aceito', async ({ page }, testInfo) => {
    await authenticate(page);
    const name = `Convênio E2E ${suffix(testInfo)}`;
    const code = `E2E-${suffix(testInfo).toUpperCase()}`;

    await page.goto('/cadastro-convenio');
    await page.locator('.cadastro-convenio-hub-card').filter({ hasText: 'Cadastrar convênio' }).click();
    await page.getByLabel('Nome do convênio', { exact: true }).fill(name);
    await page.getByLabel('Código', { exact: true }).fill(code);
    await page.getByLabel('Descrição', { exact: true }).fill('Convênio criado pela jornada real de testes.');
    await page.getByLabel('Subconvênio', { exact: true }).fill(`Plano ${suffix(testInfo)}`);
    await page.getByLabel('Subconvênio', { exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();

    await expect(page).toHaveURL(/\/convenios\//);
    await expect(page.getByText(/convênio.*salvo|cadastrado com sucesso/i)).toBeVisible();
    const proceduresTab = page.getByRole('button', { name: 'Procedimentos', exact: true });
    await expect(proceduresTab).toBeEnabled();
    await proceduresTab.click();
    await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();

    await page.getByLabel('Buscar procedimento', { exact: true }).fill(fixture.procedureName);
    await selectOption(page, 'Procedimento', fixture.procedureName);
    await page.getByLabel('Valor pago pelo convênio (R$)', { exact: true }).fill('180');
    await page.getByLabel('Prazo de autorização (dias)', { exact: true }).fill('3');
    await page.getByRole('button', { name: 'Vincular', exact: true }).click();

    await expect(page.getByText('Procedimento vinculado ao convênio', { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.procedureName, { exact: true })).toBeVisible();
  });

  test('cadastra um estagiário com unidade, especialidade e responsável', async ({ page }, testInfo) => {
    await authenticate(page);
    const name = `Estagiário E2E ${suffix(testInfo)}`;

    await page.goto('/cadastro-estagiario');
    await page.getByRole('button', { name: 'Novo estagiário', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome completo', { exact: true }).fill(name);
    const branchSelect = dialog.getByRole('button', { name: /Unidade de atuação/, exact: false }).first();
    if ((await branchSelect.innerText()).includes('Selecione')) {
      await branchSelect.click();
      await page.getByRole('option', { name: fixture.branchName, exact: true }).click();
    }
    await selectOption(dialog, 'Especialidade', fixture.specialtyName);
    await dialog.getByLabel('E-mail', { exact: true }).fill(`estagiario.e2e.${suffix(testInfo).toLowerCase()}@saudy.test`);
    await dialog.getByLabel('Instituição de ensino', { exact: true }).fill('Faculdade E2E');
    await dialog.getByLabel('Curso', { exact: true }).fill('Psicologia');
    await selectOption(dialog, 'Profissionais responsáveis', fixture.doctorName);
    await page.keyboard.press('Escape');
    await dialog.getByRole('button', { name: 'Cadastrar', exact: true }).click();

    await expect(page.getByText('Estagiário cadastrado', { exact: true })).toBeVisible();
    await page.getByPlaceholder('Buscar por nome').fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test('emite uma fatura pelo fluxo de faturamento e localiza o registro', async ({ page }, testInfo) => {
    await authenticate(page);
    const patientName = `Paciente faturamento E2E ${suffix(testInfo)}`;

    await page.goto('/faturamento');
    await page.locator('.faturamento-hub-card').filter({ hasText: 'Faturas' }).click();
    await page.getByRole('button', { name: 'Nova fatura', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await selectOption(dialog, 'Tipo', 'Lançamento');
    await selectOption(dialog, 'Categoria', 'Consulta');
    await dialog.getByLabel('Descrição', { exact: true }).fill(`Fatura da jornada E2E ${suffix(testInfo)}`);
    await dialog.getByLabel('Valor (R$)', { exact: true }).fill('320');
    await selectOption(dialog, 'Forma de pagamento', 'Cartão');
    await dialog.getByLabel('Nome', { exact: true }).fill(patientName);
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();

    await expect(page.getByText('Fatura criada', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.getByPlaceholder(/Buscar paciente por nome ou número|Buscar\.\.\./).fill(patientName);
    await expect(page.getByText(patientName, { exact: true })).toBeVisible();
  });

  test('recepção abre e conclui o checklist de um paciente agendado', async ({ page }, testInfo) => {
    await authenticate(page);
    await page.goto('/autorizacao-e-recepcao');
    const patientName = testInfo.project.name === 'mobile' ? fixture.mobilePatientName : fixture.patientName;
    await page.getByPlaceholder(/Buscar paciente por nome ou CPF|Buscar\.\.\./).fill(patientName);
    await expect(page.getByText(patientName, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar checklist', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Checklist de recepção', exact: true })).toBeVisible();
    await dialog.getByLabel('Dados pessoais conferidos com o paciente', { exact: true }).check();
    await dialog.getByLabel('Telefone, e-mail e endereço conferidos', { exact: true }).check();
    await dialog.getByLabel('Atendimento particular', { exact: true }).check();
    await dialog.getByLabel('Valor', { exact: true }).fill('150');
    await dialog.getByRole('button', { name: 'Pix', exact: true }).click();
    await dialog.getByLabel('Pagamento realizado na recepção', { exact: true }).check();
    await dialog.getByLabel('Dados do paciente conferidos', { exact: true }).check();
    await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();

    await expect(page.getByText('Checklist concluído', { exact: true })).toBeVisible();
  });
});

test.describe('Jornadas de Terapias complementares', () => {
  test('cria um plano terapêutico para um paciente de Terapias', async ({ page }, testInfo) => {
    await authenticate(page);
    const title = `Plano E2E ${suffix(testInfo)}`;

    await page.goto('/tea/plano');
    await selectOption(page, 'Paciente de Terapias', /Paciente E2E\s+•/);
    await page.getByLabel('Título', { exact: true }).fill(title);
    await selectOption(page, 'Prioridade', 'Alta');
    await selectOption(page, 'Profissional responsável', fixture.doctorName);
    await page.getByLabel('Objetivo clínico', { exact: true }).fill('Objetivo clínico criado durante a jornada E2E.');
    await page.getByLabel('Observações', { exact: true }).fill('Acompanhar evolução no próximo ciclo.');
    await page.getByRole('button', { name: 'Adicionar plano', exact: true }).click();

    await expect(page.getByText('Plano terapêutico criado com sucesso', { exact: true })).toBeVisible();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  });

  test('abre o PIT de Terapias e persiste uma alteração da configuração', async ({ page }, testInfo) => {
    await authenticate(page);
    const title = `PIT atualizado E2E ${suffix(testInfo)}`;

    await page.goto('/tea/pit');
    await selectOption(page, 'Paciente de Terapias', /Paciente E2E\s+•/);
    await page.getByLabel('Título do PIT', { exact: true }).fill(title);
    await page.getByRole('textbox', { name: 'Observações gerais', exact: true }).fill('Configuração atualizada durante a jornada E2E.');
    await page.getByRole('button', { name: 'Salvar PIT', exact: true }).click();

    await expect(page.getByText('PIT salvo com sucesso', { exact: true })).toBeVisible();
    await page.reload();
    await selectOption(page, 'Paciente de Terapias', /Paciente E2E\s+•/);
    await expect(page.getByLabel('Título do PIT', { exact: true })).toHaveValue(title);
  });
});
