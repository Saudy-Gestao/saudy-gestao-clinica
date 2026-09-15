import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFlow } from '../flows/catalog';

type E2EFixture = {
  loginEmail: string;
  patientName: string;
  mobilePatientName: string;
  branchName: string;
  procedureName: string;
  secondProcedureName: string;
  doctorName: string;
  secondDoctorName: string;
  insuranceName: string;
  targetDate: string;
  mobileTargetDate: string;
};

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(frontDir, 'e2e/.runtime/fixture.json');
const fixture: E2EFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const E2E_PASSWORD = 'E2e!Test123';

const selectOption = async (page: Page, selectId: string, optionName: string) => {
  await page.locator(`#${selectId}`).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
};

const authenticate = async (page: Page) => {
  await page.goto('/login');
  const consentButton = page.getByRole('button', { name: 'Entendi e aceito' });
  if (await consentButton.isVisible().catch(() => false)) await consentButton.click();
  await page.getByLabel('E-mail/CPF').fill(fixture.loginEmail);
  await page.getByRole('textbox', { name: 'Senha' }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /Entrar|Acessar/i }).click();
  await expect(page).toHaveURL(/dashboard|inicio|visao-geral/i);
};

const targetDateForProject = (testInfo: { project: { name: string } }) => (
  testInfo.project.name === 'mobile' ? fixture.mobileTargetDate : fixture.targetDate
);

const patientForProject = (testInfo: { project: { name: string } }) => (
  testInfo.project.name === 'mobile' ? fixture.mobilePatientName : fixture.patientName
);

const openAvailability = async (page: Page, procedureNames: string[], patientName: string) => {
  await authenticate(page);
  await page.goto('/agendamento');
  await page.getByTestId('agendamento-marcacao-card').click();
  await expect(page.getByText('Paciente', { exact: true }).first()).toBeVisible();

  await selectOption(page, 'agendamento-field-patient', patientName);
  await selectOption(page, 'agendamento-field-insurance', fixture.insuranceName);
  await selectOption(page, 'agendamento-field-branch', fixture.branchName);
  for (const procedureName of procedureNames) {
    const procedureOption = page.getByRole('option', { name: procedureName, exact: true });
    if (!await procedureOption.isVisible().catch(() => false)) {
      await page.locator('#agendamento-field-procedure').click();
    }
    await procedureOption.click();
  }
  await page.keyboard.press('Escape');
  await selectOption(page, 'agendamento-field-modality', 'Presencial');
  await page.getByTestId('agendamento-continue-availability').click();
  await expect(page.getByText('Escolha quando realizar o atendimento', { exact: true })).toBeVisible();
  await expect(page.locator('.agendamento-scheduler-intro__status-value')).toHaveText('Etapa 2 de 3');
};

const moveToFixtureDate = async (page: Page, targetDate: string) => {
  const currentDate = page.locator('#agendamento-field-date input');
  const expectedDate = targetDate.split('-').reverse().join('/');
  for (let attempt = 0; attempt < 14; attempt += 1) {
    if (await currentDate.inputValue() === expectedDate) return;
    await page.getByRole('button', { name: 'Ir para o próximo dia' }).click();
  }
  await expect(currentDate).toHaveValue(expectedDate);
};

const assertNoRuntimeErrors = (page: Page) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    const isKnownBrowserStyleWarning = text.startsWith('Unsupported style property');
    if (message.type() === 'error' && !isKnownBrowserStyleWarning) runtimeErrors.push(`console: ${text}`);
  });
  return runtimeErrors;
};

test.describe(getFlow('scheduling.conventional').title, () => {
  test('autentica, consulta a agenda centralizada e confirma uma marcação', async ({ page }, testInfo) => {
    const runtimeErrors = assertNoRuntimeErrors(page);
    const targetDate = targetDateForProject(testInfo);
    await openAvailability(page, [fixture.procedureName], patientForProject(testInfo));
    await moveToFixtureDate(page, targetDate);

    const firstSlot = page.getByRole('button', { name: /Selecionar \d{2}:\d{2}/ }).first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();
    const professionalChoice = page.getByRole('button', { name: fixture.doctorName, exact: true });
    if (await professionalChoice.isVisible().catch(() => false)) await professionalChoice.click();

    await expect(page.getByTestId('agendamento-review')).toBeEnabled();
    await page.getByTestId('agendamento-review').click();
    await expect(page.getByText('Resumo do atendimento', { exact: true })).toBeVisible();
    await expect(page.locator('.agendamento-scheduler-intro__status-value')).toHaveText('Etapa 3 de 3');
    const inputValues = await page.locator('input').evaluateAll((inputs, expectedValues) => {
      const values = inputs.map((input) => (input as HTMLInputElement).value);
      return expectedValues.every((expected) => values.includes(expected));
    }, [patientForProject(testInfo), fixture.procedureName]);
    expect(inputValues).toBe(true);

    const createAppointmentResponse = page.waitForResponse((response) => (
      response.url().includes('/care/appointments/batch')
      && response.request().method() === 'POST'
    ));
    await page.getByTestId('agendamento-confirm').click();
    const appointmentResponse = await createAppointmentResponse;
    expect(appointmentResponse.status(), await appointmentResponse.text()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Visualizar agenda', exact: true })).toBeVisible();
    const agendaDate = page.locator('.agendamento-agenda-native-date-field input');
    await agendaDate.fill(targetDate.split('-').reverse().join('/'));
    await expect(agendaDate).toHaveValue(targetDate.split('-').reverse().join('/'));
    await expect(page.getByText(patientForProject(testInfo), { exact: true }).first()).toBeVisible();

    expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
  });
});

test.describe(getFlow('scheduling.week-view').title, () => {
  test('exibe a disponibilidade da semana da agenda', async ({ page }, testInfo) => {
    const runtimeErrors = assertNoRuntimeErrors(page);
    const targetDate = targetDateForProject(testInfo);
    await openAvailability(page, [fixture.procedureName], patientForProject(testInfo));
    await moveToFixtureDate(page, targetDate);
    await page.getByTestId('agendamento-availability-week').click();

    await expect(page.locator('.agendamento-availability-week-grid')).toBeVisible();
    const targetWeekday = new Date(`${targetDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
    await expect(page.getByText(targetWeekday, { exact: true })).toBeVisible();
    await expect(page.getByText(/horários encontrados|horário encontrado/).first()).toBeVisible();
    expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
  });
});

test.describe(getFlow('scheduling.recurrence').title, () => {
  test('cria ocorrências semanais a partir da disponibilidade centralizada', async ({ page }, testInfo) => {
    const runtimeErrors = assertNoRuntimeErrors(page);
    const targetDate = targetDateForProject(testInfo);
    await openAvailability(page, [fixture.procedureName], patientForProject(testInfo));
    await moveToFixtureDate(page, targetDate);
    await page.getByTestId('agendamento-recurrence').click();
    await page.locator('#agendamento-recurrence-occurrences').click();
    await page.getByRole('option', { name: '2 ocorrências', exact: true }).click();

    const firstSlot = page.getByRole('button', { name: /Selecionar \d{2}:\d{2}/ }).first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();
    const professionalChoice = page.getByRole('button', { name: fixture.doctorName, exact: true });
    if (await professionalChoice.isVisible().catch(() => false)) await professionalChoice.click();

    await expect(page.getByTestId('agendamento-review')).toBeEnabled();
    await page.getByTestId('agendamento-review').click();
    await expect(page.getByText('Resumo do atendimento', { exact: true })).toBeVisible();
    await expect(page.locator('.agendamento-review-summary__flags').getByText('2 ocorrências', { exact: true })).toBeVisible();

    const createAppointmentResponse = page.waitForResponse((response) => (
      response.url().includes('/care/appointments/batch')
      && response.request().method() === 'POST'
    ));
    await page.getByTestId('agendamento-confirm').click();
    const response = await createAppointmentResponse;
    const body = await response.json();
    expect(Array.isArray(body?.items) ? body.items : []).toHaveLength(2);
    await expect(page.getByRole('heading', { name: 'Visualizar agenda', exact: true })).toBeVisible();
    expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
  });
});

test.describe(getFlow('scheduling.simultaneous').title, () => {
  test('cria dois procedimentos no mesmo horário com profissionais distintos', async ({ page }, testInfo) => {
    const runtimeErrors = assertNoRuntimeErrors(page);
    const targetDate = targetDateForProject(testInfo);
    await openAvailability(page, [fixture.procedureName, fixture.secondProcedureName], patientForProject(testInfo));
    await moveToFixtureDate(page, targetDate);
    await page.getByTestId('agendamento-simultaneous').click();

    const simultaneousSlot = page
      .locator('[data-testid^="agendamento-availability-slot-"]')
      .filter({ hasText: '2 profissional(is) disponível(is)' })
      .first();
    await expect(simultaneousSlot).toBeVisible();
    await simultaneousSlot.click();
    await expect(page.getByText('2 horários selecionados', { exact: true })).toBeVisible();
    await expect(page.getByTestId('agendamento-review')).toBeEnabled();
    await page.getByTestId('agendamento-review').click();
    await expect(page.getByText('Resumo do atendimento', { exact: true })).toBeVisible();

    const createAppointmentResponse = page.waitForResponse((response) => (
      response.url().includes('/care/appointments/batch')
      && response.request().method() === 'POST'
    ));
    await page.getByTestId('agendamento-confirm').click();
    const response = await createAppointmentResponse;
    const body = await response.json();
    expect(Array.isArray(body?.items) ? body.items : []).toHaveLength(2);
    await expect(page.getByRole('heading', { name: 'Visualizar agenda', exact: true })).toBeVisible();
    expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
  });
});
