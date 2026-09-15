import { test, expect, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFlow } from '../flows/catalog';

type E2EFixture = {
  loginEmail: string;
  patientName: string;
  branchName: string;
  specialtyName: string;
  doctorName: string;
  secondDoctorName: string;
  targetWeekday: string;
  targetDate: string;
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

const selectOption = async (page: Page, selector: string, optionName: string) => {
  await page.locator(selector).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
};

const selectBirthDate = async (page: Page) => {
  await page.locator('#patient-field-birth-date').click();
  const calendar = page.getByRole('dialog', { name: 'Selecionar data' });
  await calendar.getByRole('button', { name: /de \d{4}/i }).click();
  await calendar.locator('#ui-calendar-year-input').fill('1990');
  await calendar.getByRole('button', { name: 'abr', exact: true }).click();
  await calendar.getByRole('button', { name: 'Ir para esta data', exact: true }).click();
  await calendar.locator('.ui-calendar-day:not(.ui-calendar-day-outside)').filter({ hasText: '10' }).click();
  await expect(page.locator('#patient-field-birth-date')).toHaveValue('10/04/1990');
};

const openMobileNavigationIfNeeded = async (page: Page) => {
  const menuTrigger = page.getByRole('button', { name: 'Abrir menu principal' });
  if (await menuTrigger.isVisible().catch(() => false)) await menuTrigger.click();
};

const projectSuffix = (testInfo: TestInfo) => testInfo.project.name === 'mobile' ? 'Mobile' : 'Desktop';

test.describe(getFlow('patient.create').title, () => {
  test('cadastra e edita um paciente pela operação clínica', async ({ page }, testInfo) => {
    await authenticate(page);
    await page.goto('/cadastro-paciente');
    await page.getByText('Cadastrar paciente', { exact: true }).click();

    const patientName = `Paciente Automatizado ${projectSuffix(testInfo)}`;
    const patientCpf = testInfo.project.name === 'mobile' ? '11144477735' : '52998224725';
    await page.locator('#patient-field-name').fill(patientName);
    await page.locator('#patient-field-cpf').fill(patientCpf);
    await selectBirthDate(page);
    await selectOption(page, '#patient-field-gender', 'Outro');
    await page.locator('#patient-field-cellphone').fill('11977776666');

    const createResponse = page.waitForResponse((response) => (
      response.url().includes('/accounts/patients/')
      && response.request().method() === 'POST'
      && response.status() === 201
    ));
    await page.getByTestId('patient-save').click();
    await createResponse;
    await expect(page.getByText(`${patientName} foi cadastrado com sucesso.`, { exact: true })).toBeVisible();

    await page.goto('/cadastro-paciente');
    await page.getByTestId('patient-lista-card').click();
    await page.getByPlaceholder('Buscar por nome').fill(patientName);
    await expect(page.getByText(patientName, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ações do paciente' }).click();
    await page.getByRole('button', { name: 'Editar', exact: true }).click();

    const updatedName = `${patientName} Atualizado`;
    await page.locator('#patient-field-name').fill(updatedName);
    const updateResponse = page.waitForResponse((response) => (
      response.url().includes('/accounts/patients/')
      && response.request().method() === 'PUT'
      && response.status() === 200
    ));
    await page.getByTestId('patient-save').click();
    await updateResponse;
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  });
});

test.describe(getFlow('agenda.create').title, () => {
  test('cadastra uma escala com especialidade, profissional e horário', async ({ page }, testInfo) => {
    await authenticate(page);
    await page.goto('/cadastro-agenda');
    await page.getByTestId('agenda-new').click();

    await selectOption(page, '#agenda-field-branch', fixture.branchName);
    await page.locator('#agenda-field-specialties').click();
    await page.getByRole('option', { name: fixture.specialtyName, exact: true }).click();
    await page.keyboard.press('Escape');
    await selectOption(page, '#agenda-field-doctor', fixture.secondDoctorName);

    await page.getByRole('button', { name: 'Novo bloco', exact: true }).click();
    const freeDay = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']
      .find((day) => day !== fixture.targetWeekday) || 'segunda';
    await page.getByTestId(`agenda-day-${freeDay}`).click();

    const draft = page.locator('.cadastro-agenda-draft-card');
    const timeInputs = draft.locator('input[type="time"]');
    const startTime = testInfo.project.name === 'mobile' ? '19:00' : '18:00';
    const endTime = testInfo.project.name === 'mobile' ? '20:00' : '19:00';
    await timeInputs.nth(0).fill(startTime);
    await timeInputs.nth(1).fill(endTime);
    await page.getByTestId('agenda-save-block').click();

    const createResponse = page.waitForResponse((response) => (
      response.url().includes('/care/agendas/bulk')
      && response.request().method() === 'POST'
      && response.status() === 201
    ));
    await page.getByTestId('agenda-save').click();
    await createResponse;
    await expect(page.getByText('Agendas', { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.secondDoctorName, { exact: true }).first()).toBeVisible();
  });
});

test.describe(getFlow('agenda.conflict').title, () => {
  test('informa o conflito quando o mesmo profissional já tem o horário ocupado', async ({ page }) => {
    await authenticate(page);
    await page.goto('/cadastro-agenda');
    await page.getByTestId('agenda-new').click();

    await selectOption(page, '#agenda-field-branch', fixture.branchName);
    await page.locator('#agenda-field-specialties').click();
    await page.getByRole('option', { name: fixture.specialtyName, exact: true }).click();
    await page.keyboard.press('Escape');
    await selectOption(page, '#agenda-field-doctor', fixture.doctorName);
    await page.getByRole('button', { name: 'Novo bloco', exact: true }).click();
    await page.getByTestId(`agenda-day-${fixture.targetWeekday}`).click();

    const draft = page.locator('.cadastro-agenda-draft-card');
    const timeInputs = draft.locator('input[type="time"]');
    await timeInputs.nth(0).fill('10:00');
    await timeInputs.nth(1).fill('11:00');
    await page.getByTestId('agenda-save-block').click();
    await page.getByTestId('agenda-save').click();

    await expect(page.getByText(/Conflito no horário|Existe um conflito/i)).toBeVisible();
  });
});

test.describe(getFlow('therapy.weekly-agenda').title, () => {
  test('exibe a agenda configurada da unidade na visão semanal de terapias', async ({ page }) => {
    await authenticate(page);
    await page.goto('/tea/agenda-semanal');
    await expect(page.getByText('Agenda semanal de Terapias', { exact: true })).toBeVisible();
    await expect(page.getByText('Sala E2E 1', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(fixture.branchName, { exact: false }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Semana', exact: true }).click();
    await expect(page.locator('.tea-agenda-date-summary')).toBeVisible();
    await expect(page.getByText(/atendimento\(s\)|Agenda configurada|Nenhum atendimento/i).first()).toBeVisible();
  });
});

test.describe(getFlow('forms.unsaved-changes').title, () => {
  test('protege o formulário ao navegar sem salvar', async ({ page }) => {
    await authenticate(page);
    await page.goto('/cadastro-paciente');
    await page.getByText('Cadastrar paciente', { exact: true }).click();
    await page.locator('#patient-field-name').fill('Paciente pendente E2E');

    await openMobileNavigationIfNeeded(page);
    await page.getByRole('button', { name: 'Visão Geral', exact: true }).click();
    await expect(page.getByText('Alterações não salvas', { exact: true })).toBeVisible();
    await expect(page.getByText('Este formulário tem dados pendentes', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
    await expect(page).toHaveURL(/cadastro-paciente/);
    await openMobileNavigationIfNeeded(page);
    await page.getByRole('button', { name: 'Visão Geral', exact: true }).click();
    await page.getByRole('button', { name: 'Sair sem salvar', exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
  });
});
