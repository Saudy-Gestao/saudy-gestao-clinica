import { test, expect, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type E2EFixture = {
  loginEmail: string;
  branchName: string;
  specialtyName: string;
  secondSpecialtyName: string;
  doctorName: string;
  secondSpecialtyRoomName: string;
  combinedRoomName: string;
  targetWeekday: string;
};

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(frontDir, 'e2e/.runtime/fixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as E2EFixture;
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

const selectSpecialty = async (page: Page, specialtyName: string) => {
  const trigger = page.locator('#agenda-field-specialties');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  await page.getByRole('option', { name: specialtyName, exact: true }).click();
};

const startFreeDraft = async (page: Page, testInfo: TestInfo) => {
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
  return draft;
};

test.describe('Regressões de especialidades e salas no cadastro de agenda', () => {
  test('mantém duas especialidades ao selecionar o profissional e salva a sala compatível', async ({ page }, testInfo) => {
    await authenticate(page);
    await page.goto('/cadastro-agenda');
    await page.getByTestId('agenda-new').click();

    await selectOption(page, '#agenda-field-branch', fixture.branchName);
    await selectSpecialty(page, fixture.specialtyName);
    await selectSpecialty(page, fixture.secondSpecialtyName);
    await page.keyboard.press('Escape');
    await selectOption(page, '#agenda-field-doctor', fixture.doctorName);

    await expect(page.getByText(fixture.specialtyName, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(fixture.secondSpecialtyName, { exact: true }).first()).toBeVisible();

    const draft = await startFreeDraft(page, testInfo);
    const roomField = draft.getByRole('button', { name: 'Sala', exact: true });
    await roomField.click();
    await expect(page.getByRole('option', { name: fixture.combinedRoomName, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: fixture.secondSpecialtyRoomName, exact: true })).toHaveCount(0);
    await page.getByRole('option', { name: fixture.combinedRoomName, exact: true }).click();
    await page.getByTestId('agenda-save-block').click();

    const createResponse = page.waitForResponse((response) => (
      response.url().includes('/care/agendas/bulk')
      && response.request().method() === 'POST'
      && response.status() === 201
    ));
    const requestPromise = page.waitForRequest((request) => (
      request.url().includes('/care/agendas/bulk') && request.method() === 'POST'
    ));
    await page.getByTestId('agenda-save').click();
    const [request] = await Promise.all([requestPromise, createResponse]);
    const payload = request.postDataJSON() as { items?: Array<{ especialidadeIds?: string[]; roomId?: string }> };
    expect(payload.items?.[0]?.especialidadeIds).toHaveLength(2);
    expect(payload.items?.[0]?.roomId).toBeTruthy();
    await expect(page.getByText('Agendas', { exact: true })).toBeVisible();
  });

  test('restringe as salas à especialidade selecionada', async ({ page }) => {
    await authenticate(page);
    await page.goto('/cadastro-agenda');
    await page.getByTestId('agenda-new').click();

    await selectOption(page, '#agenda-field-branch', fixture.branchName);
    await selectSpecialty(page, fixture.secondSpecialtyName);
    await page.keyboard.press('Escape');
    await selectOption(page, '#agenda-field-doctor', fixture.doctorName);

    const draft = page.locator('.cadastro-agenda-draft-card');
    await page.getByRole('button', { name: 'Novo bloco', exact: true }).click();
    await page.getByTestId('agenda-day-segunda').click();
    const roomField = draft.getByRole('button', { name: 'Sala', exact: true });
    await roomField.click();
    await expect(page.getByRole('option', { name: fixture.secondSpecialtyRoomName, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: fixture.combinedRoomName, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Sala E2E 1', exact: true })).toHaveCount(0);
  });
});
