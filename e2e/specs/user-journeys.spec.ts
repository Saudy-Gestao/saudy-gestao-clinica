import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type E2EFixture = {
  loginEmail: string;
  branchName: string;
  examProcedureName: string;
  mobileExamProcedureName: string;
  secondProcedureName: string;
  specialtyName: string;
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
  const field = page.locator('.ui-field').filter({
    has: page.locator('.ui-field-label', { hasText: label }),
  }).last();
  await field.locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
};

const selectOptionMatching = async (page: Page, label: string, optionName: RegExp) => {
  const field = page.locator('.ui-field').filter({
    has: page.locator('.ui-field-label', { hasText: label }),
  }).last();
  await field.locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: optionName }).click();
};

test.describe('Jornadas reais do usuário', () => {
  test('abre um chamado pela ajuda e acompanha o resultado em Meus chamados', async ({ page }, testInfo) => {
    await authenticate(page);
    await page.goto('/dashboard');

    await page.getByRole('button', { name: 'Abrir ajuda' }).click();
    await page.getByRole('button', { name: 'Chamado', exact: true }).click();

    const description = `Jornada E2E ${projectSuffix(testInfo)}: validar abertura e acompanhamento de chamado.`;
    await selectOption(page, 'Fluxo', 'Atendimento e Agenda');
    await page.getByLabel('Descrição detalhada').fill(description);

    const createResponse = page.waitForResponse((response) => (
      response.url().includes('/care/tickets')
      && response.request().method() === 'POST'
      && response.status() === 201
    ));
    await page.getByRole('button', { name: 'Enviar chamado', exact: true }).click();
    await createResponse;
    await expect(page.getByText('Chamado aberto', { exact: true })).toBeVisible();

    await page.goto('/meus-chamados');
    await page.getByPlaceholder('Descrição, fluxo ou módulo').fill(description);
    await expect(page.getByText(description, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir chamado', exact: true }).click();
    await expect(page).toHaveURL(/\/meus-chamados\//);
    await expect(page.getByText(description, { exact: true })).toBeVisible();
  });

  test('cria um procedimento seguindo a cadeia modalidade, especialidade e regras clínicas', async ({ page }, testInfo) => {
    await authenticate(page);

    const suffix = projectSuffix(testInfo);
    const modalityName = `Modalidade E2E ${suffix}`;
    const specialtyName = `Especialidade E2E ${suffix}`;
    const procedureName = `Procedimento E2E ${suffix}`;

    await page.goto('/cadastro-modalidade');
    await page.getByRole('button', { name: 'Nova modalidade', exact: true }).click();
    await page.getByLabel('Nome da modalidade', { exact: true }).fill(modalityName);
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    await expect(page.getByText(modalityName, { exact: true })).toBeVisible();

    await page.goto('/cadastro-especialidade');
    await page.getByRole('button', { name: 'Nova especialidade', exact: true }).click();
    await selectOption(page, 'Modalidade', modalityName);
    await page.getByLabel('Nome da especialidade', { exact: true }).fill(specialtyName);
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    await expect(page.getByText(specialtyName, { exact: true })).toBeVisible();

    await page.goto('/cadastro-procedimento');
    await page.getByText('Cadastrar procedimento', { exact: true }).first().click();
    await page.getByLabel('Nome do procedimento', { exact: true }).fill(procedureName);
    await selectOption(page, 'Tipo do procedimento', 'Consulta clínica');
    await page.getByLabel('Duração (minutos)', { exact: true }).fill('30');
    await selectOption(page, 'Especialidade', `${specialtyName} — ${modalityName}`);
    await selectOption(page, 'Unidades atendidas', fixture.branchName);
    await page.getByRole('button', { name: 'Salvar procedimento', exact: true }).click();

    await expect(page.getByText(/cadastrado com sucesso\./i)).toBeVisible();
    await page.getByRole('button', { name: 'Cadastrar outro', exact: true }).click();
    await page.goto('/cadastro-procedimento');
    await page.getByText('Procedimentos cadastrados', { exact: true }).first().click();
    await page.getByPlaceholder('Buscar por nome').fill(procedureName);
    await expect(page.getByText(procedureName, { exact: true })).toBeVisible();
  });

  test('profissional registra uma evolução e consulta o relatório do paciente de Terapias', async ({ page }) => {
    await authenticate(page);

    await page.goto('/tea/evolucao');
    await selectOptionMatching(page, 'Paciente de Terapias', /Paciente E2E\s+•/);
    await page.getByLabel('Objetivo trabalhado na sessão', { exact: true }).fill('Ampliar comunicação funcional durante a sessão.');
    await page.getByLabel('Estratégias utilizadas', { exact: true }).fill('Modelagem');
    await page.getByLabel('Estratégias utilizadas', { exact: true }).press('Enter');
    await page.getByLabel('Intervenção realizada', { exact: true }).fill('Foram aplicadas atividades estruturadas e reforço positivo.');
    await page.getByLabel('Resposta do paciente', { exact: true }).fill('Paciente participou com apoio e manteve o foco.');
    await page.getByRole('button', { name: 'Salvar evolução', exact: true }).click();
    await expect(page.getByText('Evolução registrada com sucesso', { exact: true })).toBeVisible();

    await page.goto('/tea/relatorios');
    await selectOptionMatching(page, 'Paciente de Terapias', /Paciente E2E\s+•/);
    await page.getByRole('button', { name: 'Gerar relatório', exact: true }).click();
    await expect(page.getByText('Relatório', { exact: true })).toBeVisible();
    await expect(page.getByText('Paciente E2E', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Evoluções no período', { exact: true })).toBeVisible();
  });

  test('recepção cadastra uma sala vinculada à modalidade e à especialidade', async ({ page }, testInfo) => {
    await authenticate(page);
    const roomName = `Sala E2E ${projectSuffix(testInfo)}`;

    await page.goto('/cadastro-sala');
    await page.locator('.cadastro-sala-hub-card').filter({ hasText: 'Cadastro de salas' }).click();
    await page.getByRole('button', { name: 'Nova sala', exact: true }).click();
    await selectOption(page, 'Filial', fixture.branchName);
    await page.getByLabel('Nome da sala', { exact: true }).fill(roomName);
    await selectOption(page, 'Modalidade', 'Consulta E2E');
    await selectOption(page, 'Especialidade', fixture.specialtyName);
    await page.getByLabel('Capacidade de slots', { exact: true }).fill('2');
    await page.getByRole('button', { name: 'Cadastrar sala', exact: true }).click();

    await expect(page.getByText(roomName, { exact: true })).toBeVisible();
  });

  test('configura a triagem de um exame com uma pergunta clínica', async ({ page }, testInfo) => {
    await authenticate(page);
    const screeningName = `Triagem E2E ${projectSuffix(testInfo)}`;

    await page.goto('/cadastro-enfermagem');
    await page.getByRole('button', { name: 'Nova triagem', exact: true }).click();
    // Exame E2E já possui uma triagem no fixture para os fluxos de execução.
    // Usamos outro procedimento para exercitar a criação sem violar a regra
    // de uma triagem ativa por procedimento.
    const screeningProcedureName = projectSuffix(testInfo) === 'Mobile'
      ? fixture.mobileExamProcedureName
      : fixture.secondProcedureName;
    await selectOption(page, 'Procedimento', screeningProcedureName);
    await page.getByLabel('Nome da triagem', { exact: true }).fill(screeningName);
    await page.getByLabel('Pergunta', { exact: true }).fill('O paciente realizou o preparo orientado?');
    await page.getByRole('button', { name: 'Cadastrar triagem', exact: true }).click();

    await expect(page.getByText('Triagem cadastrada', { exact: true })).toBeVisible();
    await expect(page.getByText(screeningName, { exact: true })).toBeVisible();
  });

  test('configura uma anamnese vinculada ao procedimento', async ({ page }, testInfo) => {
    await authenticate(page);
    const anamnesisName = `Anamnese E2E ${projectSuffix(testInfo)}`;

    await page.goto('/cadastro-anamnese');
    await page.getByRole('button', { name: 'Nova anamnese', exact: true }).click();
    const anamnesisProcedureName = projectSuffix(testInfo) === 'Mobile'
      ? fixture.mobileExamProcedureName
      : fixture.examProcedureName;
    await selectOption(page, 'Procedimento', anamnesisProcedureName);
    await page.getByLabel('Nome da anamnese', { exact: true }).fill(anamnesisName);
    await page.getByLabel('Descrição', { exact: true }).fill('Perguntas clínicas para preparar o atendimento.');
    await page.getByLabel('Pergunta', { exact: true }).fill('O paciente possui alguma alergia conhecida?');
    await page.getByRole('button', { name: 'Cadastrar anamnese', exact: true }).click();

    await expect(page.getByText('Anamnese cadastrada', { exact: true })).toBeVisible();
    // A lista vira cartões no mobile, então a asserção deve validar o registro
    // sem depender da estrutura visual específica de cada breakpoint.
    await expect(
      page.locator('p.ui-text:visible').filter({ hasText: anamnesisName }).first(),
    ).toBeVisible();
  });

  test('cadastra um equipamento operacional e confirma na lista', async ({ page }, testInfo) => {
    await authenticate(page);
    const equipmentName = `Equipamento E2E ${projectSuffix(testInfo)}`;

    await page.goto('/cadastro-equipamento');
    await page.locator('.cadastro-equipamento-hub-card').filter({ hasText: 'Cadastrar equipamento' }).click();
    await page.getByLabel('Nome do Equipamento', { exact: true }).fill(equipmentName);
    await selectOption(page, 'Modalidade', 'OT - Outros');
    await page.getByLabel('Número de Série', { exact: true }).fill(`SN-E2E-${projectSuffix(testInfo)}`);
    await page.getByRole('button', { name: 'Cadastrar equipamento', exact: true }).click();

    await expect(page.getByText('Equipamento cadastrado', { exact: true })).toBeVisible();
    await expect(page.getByText(`${equipmentName} foi salvo com sucesso.`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Voltar para Cadastros Clínicos', exact: true }).click();
  });

  test('cadastra um item de estoque e confirma a entrada na operação', async ({ page }, testInfo) => {
    await authenticate(page);
    const itemName = `Insumo E2E ${projectSuffix(testInfo)}`;
    const itemCode = `E2E-${projectSuffix(testInfo).toUpperCase()}`;

    await page.goto('/estoque');
    await page.locator('.estoque-hub-card').filter({
      has: page.getByText('Itens', { exact: true }),
    }).click();
    await page.getByRole('button', { name: 'Novo item', exact: true }).click();
    await page.getByRole('textbox', { name: 'Nome do item', exact: true }).fill(itemName);
    await page.getByRole('textbox', { name: 'Código', exact: true }).fill(itemCode);
    await selectOption(page, 'Unidade', 'un');
    await page.getByRole('spinbutton', { name: 'Quantidade atual', exact: true }).fill('20');
    await page.getByRole('spinbutton', { name: 'Quant. mínima', exact: true }).fill('5');
    await page.getByRole('dialog').getByRole('button', { name: 'Cadastrar', exact: true }).click();

    await expect(page.getByText('Item cadastrado', { exact: true })).toBeVisible();
    await expect(page.getByText(`${itemName} foi adicionado ao estoque.`, { exact: true })).toBeVisible();
  });

  test('explora o BI filtrando indicadores e alternando painéis', async ({ page }) => {
    await authenticate(page);
    await page.goto('/bi');
    await expect(page.getByRole('heading', { name: 'Cockpit executivo da clínica', exact: true })).toBeVisible();

    await selectOption(page, 'Período', 'Últimos 7 dias');
    await expect(page.getByText('Últimos 7 dias', { exact: true })).toBeVisible();
    await page.locator('.bi-tab-nav-list').getByText('Operação', { exact: true }).click();
    await expect(page.getByText('Ocupação por sala', { exact: true })).toBeVisible();
    await page.locator('.bi-tab-nav-list').getByText('Financeiro', { exact: true }).click();
    await expect(page.getByText('Financeiro do período', { exact: true })).toBeVisible();
  });
});
