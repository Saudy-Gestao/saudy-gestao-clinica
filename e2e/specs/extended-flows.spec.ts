import { test, expect, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFlow } from '../flows/catalog';

type E2EFixture = {
  loginEmail: string;
  patientName: string;
  mobilePatientName: string;
  telePatientName: string;
  mobileTelePatientName: string;
  branchName: string;
  modalityName?: string;
  specialtyName: string;
  procedureName: string;
  examProcedureName: string;
  teaProcedureName: string;
  doctorName: string;
  targetDate: string;
  apiBaseUrl: string;
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
const patientForProject = (testInfo: TestInfo) => testInfo.project.name === 'mobile' ? fixture.mobilePatientName : fixture.patientName;
const telePatientForProject = (testInfo: TestInfo) => testInfo.project.name === 'mobile' ? fixture.mobileTelePatientName : fixture.telePatientName;

const selectOptionById = async (page: Page, id: string, optionName: string) => {
  await page.locator(`#${id}`).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
};

const selectDoctorBirthDate = async (page: Page) => {
  await page.locator('#doctor-field-birth-date').click();
  const calendar = page.getByRole('dialog', { name: 'Selecionar data' });
  await calendar.getByRole('button', { name: /de \d{4}/i }).click();
  await calendar.locator('#ui-calendar-year-input').fill('1990');
  await calendar.getByRole('button', { name: 'abr', exact: true }).click();
  await calendar.getByRole('button', { name: 'Ir para esta data', exact: true }).click();
  await calendar.locator('.ui-calendar-day:not(.ui-calendar-day-outside)').filter({ hasText: '10' }).click();
  await expect(page.locator('#doctor-field-birth-date')).toHaveValue('10/04/1990');
};

test.describe(getFlow('professional.create').title, () => {
  test('cadastra profissional com conjunto de especialidade e procedimento', async ({ page }, testInfo) => {
    await authenticate(page);
    await page.goto('/cadastro-medico');
    await page.getByText('Cadastrar profissional', { exact: true }).first().click();

    const suffix = projectSuffix(testInfo);
    await page.getByLabel('Nome completo').fill(`Profissional Automatizado ${suffix}`);
    await page.getByLabel('CPF').fill(testInfo.project.name === 'mobile' ? '12345678909' : '93541134780');
    await selectDoctorBirthDate(page);
    await selectOptionById(page, 'doctor-field-gender', 'Outro');
    await selectOptionById(page, 'doctor-field-crm-state', 'SP');
    await page.getByLabel('Email').fill(`profissional.automatizado.${suffix.toLowerCase()}@saudy.test`);
    await page.getByLabel('Celular').fill('11977776666');
    await page.getByLabel('Número do CRM').fill(`E2E${testInfo.project.name === 'mobile' ? 'M' : 'D'}99`);
    await page.getByRole('button', { name: '+ Adicionar conjunto', exact: true }).click();
    const groupDialog = page.getByRole('dialog').last();
    await selectOptionById(page, 'doctor-group-modality', fixture.modalityName || 'Consulta E2E');

    await page.locator('#doctor-group-specialties').click();
    await page.getByRole('option', { name: fixture.specialtyName, exact: true }).click();
    await groupDialog.getByLabel('Número do registro').fill(`E2E-${testInfo.project.name === 'mobile' ? 'M' : 'D'}99`);
    await groupDialog.getByLabel('UF do registro').click();
    await page.getByRole('option', { name: 'SP', exact: true }).click();
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();

    await page.getByLabel('Buscar procedimento').fill(fixture.procedureName);
    const availableProcedure = page.locator('.cadastro-medico-form-pick-item').filter({ hasText: fixture.procedureName }).first();
    await expect(availableProcedure).toBeVisible();
    await availableProcedure.click();
    const linkSelected = testInfo.project.name === 'mobile'
      ? page.getByRole('button', { name: 'Vincular selecionados', exact: true })
      : page.getByRole('button', { name: 'Vincular procedimentos selecionados', exact: true });
    await expect(linkSelected).toBeEnabled();
    await linkSelected.click();
    await expect(page.getByText('1 vinculado(s)', { exact: true })).toBeVisible();

    const createResponse = page.waitForResponse((response) => (
      response.url().includes('/accounts/doctors/')
      && response.request().method() === 'POST'
      && response.status() >= 200
      && response.status() < 300
    ));
    await page.getByRole('button', { name: 'Salvar', exact: true }).click({ force: testInfo.project.name === 'mobile' });
    await createResponse;
    await expect(page.getByText('Profissional cadastrado', { exact: true })).toBeVisible();
  });
});

test.describe(getFlow('scheduling.ai-draft').title, () => {
  test('prepara um rascunho de agendamento com a resposta do interpretador', async ({ page }) => {
    await authenticate(page);
    await page.route('**/care/appointments/assistant/parse', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          draft: {
            patientName: fixture.patientName,
            patientCpf: '12345678901',
            procedureNames: [fixture.procedureName],
            professionalName: fixture.doctorName,
            professionalPreference: null,
            date: fixture.targetDate,
            time: '10:00',
            period: null,
            modality: 'Presencial',
            insuranceName: null,
            recurrenceOccurrences: null,
            recurrenceIntervalWeeks: null,
            simultaneous: false,
            observations: null,
          },
        }),
      });
    });

    await page.goto('/agendamento');
    await page.getByText('Realizar marcação', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Agendar com IA', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Agendar com IA', exact: true })).toBeVisible();
    await page.getByLabel('Pedido de agendamento').fill(`Agendar ${fixture.patientName} para ${fixture.procedureName} amanhã às 10h.`);
    await page.getByRole('button', { name: 'Preparar rascunho', exact: true }).click();

    await expect(page.getByText('Rascunho identificado', { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.patientName, { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.procedureName, { exact: true })).toBeVisible();
    await expect(page.getByText('Pronto para revisar', { exact: true })).toBeVisible();
  });

  test('preserva o pedido ao fechar e reabrir o assistente', async ({ page }) => {
    await authenticate(page);
    await page.goto('/agendamento');
    await page.getByText('Realizar marcação', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Agendar com IA', exact: true }).click();

    const prompt = `Agendar ${fixture.patientName} para ${fixture.procedureName} amanhã às 10h.`;
    const promptField = page.getByLabel('Pedido de agendamento');
    await promptField.fill(prompt);
    await page.getByLabel('Fechar assistente de agendamento').click();
    await expect(page.getByRole('heading', { name: 'Agendar com IA', exact: true })).toBeHidden();

    await page.getByRole('button', { name: 'Agendar com IA', exact: true }).click();
    await expect(page.getByLabel('Pedido de agendamento')).toHaveValue(prompt);
  });

  test('leva do campo pendente no rascunho ao campo do formulário', async ({ page }) => {
    await authenticate(page);
    await page.route('**/care/appointments/assistant/parse', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          draft: {
            patientName: fixture.patientName,
            patientCpf: '12345678901',
            procedureNames: [fixture.procedureName],
            professionalName: null,
            professionalPreference: null,
            date: fixture.targetDate,
            time: '10:00',
            period: null,
            modality: 'Presencial',
            insuranceName: null,
            recurrenceOccurrences: null,
            recurrenceIntervalWeeks: null,
            simultaneous: false,
            observations: null,
          },
        }),
      });
    });

    await page.goto('/agendamento');
    await page.getByText('Realizar marcação', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Agendar com IA', exact: true }).click();
    await page.getByLabel('Pedido de agendamento').fill(`Agendar ${fixture.patientName} para ${fixture.procedureName}.`);
    await page.getByRole('button', { name: 'Preparar rascunho', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Ir para profissional', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ir para profissional', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Agendar com IA', exact: true })).toBeHidden();
    await expect(page.locator('#agendamento-field-professional')).toBeFocused();
  });
});

test.describe(getFlow('tea.pre-reservation').title, () => {
  test('sugere, autoriza e converte uma pré-reserva TEA em agendamento', async ({ page }, testInfo) => {
    await authenticate(page);
    const patientName = patientForProject(testInfo);

    await page.goto('/tea/pre-reserva');
    const pitCard = page.locator('.tea-pre-reserva-card').filter({
      has: page.getByText(patientName, { exact: true }),
    }).first();
    await expect(pitCard).toBeVisible();
    await pitCard.getByRole('button', { name: 'Sugerir horários automáticos', exact: true }).click();

    await expect(page.getByText('Calendário da sugestão automática', { exact: true })).toBeVisible();
    await expect(page.getByText('1x/sem', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Aceitar sugestão', exact: true }).click();
    await page.getByRole('button', { name: 'Apenas reservar', exact: true }).click();
    await expect(page.getByText('Grade PIT aceita', { exact: false })).toBeVisible();

    const authToken = await page.evaluate(() => localStorage.getItem('token'));
    const requestHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
    const pendingResponse = await page.request.get(`${fixture.apiBaseUrl}/care/tea-pre-reservations/pending`, {
      headers: requestHeaders,
    });
    expect(pendingResponse.ok()).toBeTruthy();
    const pendingPayload = await pendingResponse.json() as {
      items?: Array<{ patient?: { name?: string }; preReservationId?: string }>;
    };
    const pendingItem = (pendingPayload.items || []).find((item) => (
      item?.patient?.name === patientName && item?.preReservationId
    ));
    expect(pendingItem?.preReservationId).toBeTruthy();

    const authorizeResponse = await page.request.patch(
      `${fixture.apiBaseUrl}/care/tea-pre-reservations/${pendingItem.preReservationId}/status`,
      { data: { status: 'AUTHORIZED', applySeries: true }, headers: requestHeaders },
    );
    expect(authorizeResponse.ok()).toBeTruthy();

    await page.reload();
    const authorizedCard = page.locator('.tea-pre-reserva-card').filter({
      has: page.getByText(patientName, { exact: true }),
    }).first();
    await expect(authorizedCard.getByText('Autorizado', { exact: true }).first()).toBeVisible();
    await authorizedCard.getByRole('button', { name: 'Agendar', exact: true }).click();
    await expect(page.getByText('Checklist pré-conversão', { exact: false })).toBeVisible();
    await expect(page.getByText('Checklist OK', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await expect(page.getByText('Etapa de Conversao', { exact: true })).toBeVisible();
    const firstDateSelect = page.locator('.tea-pre-reserva-accept-select').first();
    await firstDateSelect.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Converter em agendamento', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Converter em agendamento', exact: true }).click();
    await expect(page.getByText('Conversão em lote concluída', { exact: false })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe(getFlow('consultation.execute').title, () => {
  test('inicia, salva evolução e finaliza uma consulta da fila clínica', async ({ page }, testInfo) => {
    await authenticate(page);
    await page.goto('/consulta');
    const patientName = patientForProject(testInfo);
    await expect(page.getByText(patientName, { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: `Ações da consulta de ${patientName}`, exact: true }).click();
    await page.getByRole('button', { name: 'Iniciar consulta', exact: true }).click();
    await expect(page).toHaveURL(/\/consulta\/atendimento\//);
    await expect(page.getByText('Atendimento clínico', { exact: true })).toBeVisible();

    await page.getByLabel('Queixa principal').fill('Queixa registrada no cenário E2E.');
    await page.getByLabel('História da doença atual').fill('História clínica registrada no cenário E2E.');
    await page.getByLabel('Diagnóstico/CID').fill('Avaliação clínica E2E');
    await page.getByRole('button', { name: /Receituário/ }).click();
    await page.getByLabel('Conduta / tratamento').fill('Conduta registrada no cenário E2E.');
    await page.getByLabel('Prescrição').fill('Sem prescrição adicional.');
    await page.getByRole('button', { name: /Salvar no prontuário/ }).click();
    await expect(page.getByText('Prontuário sincronizado', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Finalizar atendimento', exact: true }).click();
    await expect(page.getByText(/Atendimento finalizado|Atendimento concluído|concluído/i).first()).toBeVisible();
  });
});

test.describe(getFlow('exams.execute').title, () => {
  test('abre a fila, inicia e conclui a triagem do exame', async ({ page }, testInfo) => {
    await authenticate(page);
    await page.goto('/execucao-exames');
    await page.getByText('Fila de exames', { exact: true }).click();
    await expect(page.getByText(patientForProject(testInfo), { exact: true }).first()).toBeVisible();
    const patientRow = testInfo.project.name === 'mobile'
      ? page.locator('.execucao-exames-patient-card').filter({ has: page.getByText(patientForProject(testInfo), { exact: true }) })
      : page.locator('tr').filter({ has: page.getByText(patientForProject(testInfo), { exact: true }) });
    await patientRow.getByRole('button', { name: 'Iniciar triagem', exact: true }).click();
    await expect(page.getByText('Triagem de enfermagem', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Concluir triagem', exact: true }).click();
    await expect(page.getByText('Triagem concluída', { exact: true })).toBeVisible();
  });
});

test.describe(getFlow('reports.workflow').title, () => {
  test('localiza um exame na fila de laudos e abre o editor', async ({ page }) => {
    await authenticate(page);
    await page.goto('/laudo-exames');
    await expect(page.getByText(fixture.patientName, { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: `Abrir laudo de ${fixture.patientName}` }).click();
    await expect(page.getByRole('dialog', { name: 'Editor de laudo' })).toBeVisible();
    await expect(page.getByText(`${fixture.patientName} · ${fixture.examProcedureName}`, { exact: true })).toBeVisible();
  });
});

test.describe(getFlow('teleconsultation.execute').title, () => {
  test('gera o link e abre a preparação da teleconsulta', async ({ page }, testInfo) => {
    await authenticate(page);
    const patientName = telePatientForProject(testInfo);

    await page.goto('/consulta');
    await expect(page.getByText(patientName, { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: `Ações da consulta de ${patientName}`, exact: true }).click();
    await page.getByRole('button', { name: 'Iniciar teleconsulta', exact: true }).click();

    await expect(page).toHaveURL(/\/teleconsulta\/preparacao\?token=/);
    await expect(page.getByText('Médico Responsável', { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.doctorName, { exact: true })).toBeVisible();
    await expect(page.getByText(`Paciente: ${patientName}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingressar', exact: true })).toBeVisible();
  });
});
