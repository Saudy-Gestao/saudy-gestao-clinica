import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPatientQueue, usePatientQueueQuery } from '../usePatientQueueQuery';
import { fetchPatientSummary, usePatientSummaryQuery } from '../usePatientSummaryQuery';
import { fetchTeaCancellationTherapies, useTeaCancellationTherapiesQuery } from '../useTeaCancellationTherapiesQuery';
import { fetchTeaEvolutionTemplates, useTeaEvolutionTemplatesQuery } from '../useTeaEvolutionTemplatesQuery';
import { fetchTeaEvolutions, useTeaEvolutionsQuery } from '../useTeaEvolutionsQuery';
import { fetchTeaManualGrid, useTeaManualGridQuery } from '../useTeaManualGridQuery';
import { fetchTeaPendingReservations, useTeaPendingReservationsQuery } from '../useTeaPendingReservationsQuery';
import { fetchTeaPit, useTeaPitQuery } from '../useTeaPitQuery';
import { fetchTeaPlans, useTeaPlansQuery } from '../useTeaPlansQuery';
import { fetchTeaProfiles, useTeaProfilesQuery } from '../useTeaProfilesQuery';
import { fetchTeaReport, useTeaReportQuery } from '../useTeaReportQuery';
import { fetchTeaReservationChecklist, useTeaReservationChecklistQuery } from '../useTeaReservationChecklistQuery';
import { fetchTeaReservationTimeline, useTeaReservationTimelineQuery } from '../useTeaReservationTimelineQuery';
import { fetchTeaWeeklyAgenda, useTeaWeeklyAgendaQuery } from '../useTeaWeeklyAgendaQuery';
import preAttendanceService from '../../services/preAttendanceService';
import appointmentService from '../../services/appointmentService';
import deliveryService from '../../services/deliveryService';
import patientService from '../../services/patientService';
import reportService from '../../services/reportService';
import teaProfileService from '../../services/teaProfileService';
import teaPreReservationService from '../../services/teaPreReservationService';
import teaEvolutionTemplateService from '../../services/teaEvolutionTemplateService';
import doctorService from '../../services/doctorService';
import sectorService from '../../services/sectorService';

vi.mock('../../services/preAttendanceService', () => ({
  default: { list: vi.fn() },
}));

vi.mock('../../services/appointmentService', () => ({
  default: { list: vi.fn() },
}));

vi.mock('../../services/deliveryService', () => ({
  default: { getDeliveries: vi.fn() },
}));

vi.mock('../../services/patientService', () => ({
  default: {
    getPatientById: vi.fn(),
    listPatients: vi.fn(),
  },
}));

vi.mock('../../services/reportService', () => ({
  default: { list: vi.fn() },
}));

vi.mock('../../services/teaProfileService', () => ({
  default: {
    list: vi.fn(),
    listPlans: vi.fn(),
    listEvolutions: vi.fn(),
    getPit: vi.fn(),
    getReport: vi.fn(),
  },
}));

vi.mock('../../services/teaPreReservationService', () => ({
  default: {
    listPending: vi.fn(),
    listCreated: vi.fn(),
    listCancellationTherapies: vi.fn(),
    getManualGrid: vi.fn(),
    getConversionChecklist: vi.fn(),
    getTimeline: vi.fn(),
  },
}));

vi.mock('../../services/teaEvolutionTemplateService', () => ({
  default: { list: vi.fn() },
}));

vi.mock('../../services/doctorService', () => ({
  default: { listDoctors: vi.fn() },
}));

vi.mock('../../services/sectorService', () => ({
  default: { listSectors: vi.fn() },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('tea and patient summary hooks', () => {
  beforeEach(() => {
    vi.mocked(preAttendanceService.list).mockReset();
    vi.mocked(appointmentService.list).mockReset();
    vi.mocked(deliveryService.getDeliveries).mockReset();
    vi.mocked(patientService.getPatientById).mockReset();
    vi.mocked(patientService.listPatients).mockReset();
    vi.mocked(reportService.list).mockReset();
    vi.mocked(teaProfileService.list).mockReset();
    vi.mocked(teaProfileService.listPlans).mockReset();
    vi.mocked(teaProfileService.listEvolutions).mockReset();
    vi.mocked(teaProfileService.getPit).mockReset();
    vi.mocked(teaProfileService.getReport).mockReset();
    vi.mocked(teaPreReservationService.listPending).mockReset();
    vi.mocked(teaPreReservationService.listCreated).mockReset();
    vi.mocked(teaPreReservationService.listCancellationTherapies).mockReset();
    vi.mocked(teaPreReservationService.getManualGrid).mockReset();
    vi.mocked(teaPreReservationService.getConversionChecklist).mockReset();
    vi.mocked(teaPreReservationService.getTimeline).mockReset();
    vi.mocked(teaEvolutionTemplateService.list).mockReset();
    vi.mocked(doctorService.listDoctors).mockReset();
    vi.mocked(sectorService.listSectors).mockReset();
  });

  it('normalizes patient queue and patient summary data', async () => {
    vi.mocked(preAttendanceService.list).mockResolvedValue({
      items: [
        {
          id: '2',
          fullName: 'Paciente B',
          agenda: '09:00 • Retorno • Dra B',
          status: 'atrasado',
          createdAt: '2026-01-01T09:10:00Z',
        },
        {
          id: '1',
          patientName: 'Paciente A',
          agenda: '08:00 • Consulta • Dr A',
          status: 'na fila da recepção',
          createdAt: '2026-01-01T09:00:00Z',
        },
        {
          id: '3',
          fullName: 'Ignorado',
          status: 'atendido',
        },
      ],
    } as any);

    const queue = await fetchPatientQueue();
    expect(queue).toEqual([
      {
        id: '1',
        name: 'Paciente A',
        time: '08:00',
        type: 'Consulta',
        doctor: 'Dr A',
        position: 1,
        status: 'na fila da recepção',
        createdAt: '2026-01-01T09:00:00Z',
      },
      {
        id: '2',
        name: 'Paciente B',
        time: '09:00',
        type: 'Retorno',
        doctor: 'Dra B',
        position: 2,
        status: 'atrasado',
        createdAt: '2026-01-01T09:10:00Z',
      },
    ]);

    vi.mocked(patientService.getPatientById).mockRejectedValue(new Error('not-found'));
    vi.mocked(patientService.listPatients).mockResolvedValue([
      {
        id: 'p1',
        name: 'Maria',
        cpf: '12345678900',
        address: 'Rua A',
        addressNumber: '10',
        city: 'SP',
        state: 'SP',
      },
    ] as any);
    vi.mocked(appointmentService.list).mockResolvedValue({ items: [{ id: 'a1', date: '2026-01-01', time: '08:00', status: 'AGENDADO' }] } as any);
    vi.mocked(reportService.list).mockResolvedValue({ data: [{ id: 'r1', patientName: 'Maria', status: 'PENDING', exam: 'US' }] } as any);
    vi.mocked(deliveryService.getDeliveries).mockResolvedValue({ data: [{ id: 'd1', patientName: 'Maria', status: 'AVAILABLE', documentType: 'Laudo' }] } as any);

    const summary = await fetchPatientSummary({ id: 'p1', id_medilab: 'm1', nome: 'Maria', cpf: '123.456.789-00' }, 'daily');
    expect(summary.patientInfo).toEqual(expect.objectContaining({ id: 'p1', name: 'Maria', address: 'Rua A, 10 - SP/SP' }));
    expect(summary.appointments).toHaveLength(1);
    expect(summary.pendingItems).toHaveLength(2);

    const empty = await fetchPatientSummary(null);
    expect(empty).toEqual({ patientInfo: null, appointments: [], pendingItems: [] });
  });

  it('normalizes tea profile/template/evolution/report hooks fetchers', async () => {
    vi.mocked(teaProfileService.list).mockResolvedValue({ data: { items: [{ id: 'tp1' }] } } as any);
    vi.mocked(teaProfileService.listPlans).mockResolvedValue({ items: [{ id: 'pl1' }] } as any);
    vi.mocked(teaProfileService.listEvolutions).mockResolvedValue([{ id: 'ev1' }] as any);
    vi.mocked(teaProfileService.getPit).mockResolvedValue({ id: 'pit1' } as any);
    vi.mocked(teaProfileService.getReport).mockResolvedValue({ id: 'rep1' } as any);
    vi.mocked(teaEvolutionTemplateService.list).mockResolvedValue({ data: [{ id: 'tpl1' }] } as any);

    await expect(fetchTeaProfiles({ search: 'maria', hasActivePit: true })).resolves.toEqual([{ id: 'tp1' }]);
    await expect(fetchTeaPlans({ teaProfileId: 'tp1', search: 'abc' })).resolves.toEqual([{ id: 'pl1' }]);
    await expect(fetchTeaPlans({ teaProfileId: null })).resolves.toEqual([]);
    await expect(fetchTeaEvolutions('tp1')).resolves.toEqual([{ id: 'ev1' }]);
    await expect(fetchTeaEvolutions(null)).resolves.toEqual([]);
    await expect(fetchTeaPit('tp1')).resolves.toEqual({ id: 'pit1' });
    await expect(fetchTeaPit(null)).resolves.toBeNull();
    await expect(fetchTeaReport({ teaProfileId: 'tp1', startDate: '2026-01-01' })).resolves.toEqual({ id: 'rep1' });
    await expect(fetchTeaReport({ teaProfileId: null })).resolves.toBeNull();
    await expect(fetchTeaEvolutionTemplates()).resolves.toEqual([{ id: 'tpl1' }]);
  });

  it('normalizes pending reservations, cancellation therapies and checklist', async () => {
    vi.mocked(teaPreReservationService.listPending).mockResolvedValue({
      items: [
        {
          id: 'res1',
          patientId: 'p1',
          patientName: 'Joao',
          patientCpf: '123',
          patientBirthDate: '2010-01-01',
        },
      ],
    } as any);
    vi.mocked(teaPreReservationService.listCancellationTherapies).mockResolvedValue({ items: [{ id: 't1' }] } as any);
    vi.mocked(teaPreReservationService.getConversionChecklist)
      .mockResolvedValueOnce({ checks: [{ key: 'doctor', label: 'Médico', valid: true, message: 'ok' }] } as any)
      .mockResolvedValueOnce({ items: [{ key: 'room', label: 'Sala', valid: false, message: 'faltando' }] } as any);

    const pending = await fetchTeaPendingReservations({ search: 'joao', status: 'PROPOSED' });
    expect(pending[0].patient).toEqual(expect.objectContaining({ id: 'p1', name: 'Joao', birthDate: '2010-01-01' }));

    await expect(fetchTeaCancellationTherapies({ teaProfileId: null })).resolves.toEqual([]);
    await expect(fetchTeaCancellationTherapies({ teaProfileId: 'tp1', fromDate: '2026-01-01' })).resolves.toEqual([{ id: 't1' }]);

    const checklist = await fetchTeaReservationChecklist([
      { reservationId: 'res1', procedureName: 'TO' },
      { reservationId: 'res2', procedureName: 'Fono' },
    ]);

    expect(checklist).toEqual([
      { key: 'res1-doctor', label: 'Médico', valid: true, message: 'ok', procedureName: 'TO' },
      { key: 'res2-room', label: 'Sala', valid: false, message: 'faltando', procedureName: 'Fono' },
    ]);
  });

  it('normalizes manual grid, timeline and weekly agenda', async () => {
    vi.mocked(teaPreReservationService.getManualGrid).mockResolvedValue({
      days: [
        {
          date: '2026-01-05',
          weekday: 'MON',
          enabled: true,
          slots: [
            { time: '09:00', occupied: false, selectable: true },
            { time: '08:00', occupied: true, selectable: false },
            { time: '09:00', occupied: true, selectable: false },
          ],
        },
      ],
    } as any);

    const grid = await fetchTeaManualGrid([{ pitTherapyId: 'pit-1' }], '2026-01-05');
    expect(grid['pit-1'].days[0].slots).toEqual([
      { time: '08:00', occupied: true, selectable: false },
      { time: '09:00', occupied: true, selectable: true },
    ]);
    await expect(fetchTeaManualGrid([], '')).resolves.toEqual({});

    vi.mocked(teaPreReservationService.getTimeline)
      .mockResolvedValueOnce({
        events: [
          { id: 'e1', eventType: 'STATUS_CHANGED', payload: { nextStatus: 'CONVERTED' }, createdAt: '2026-01-02T10:00:00Z' },
        ],
      } as any)
      .mockResolvedValueOnce({
        events: [
          { id: 'e2', eventType: 'STATUS_CHANGED', payload: { nextStatus: 'PROPOSED' }, createdAt: '2026-01-01T10:00:00Z' },
        ],
      } as any);

    const timeline = await fetchTeaReservationTimeline([
      { reservationId: 'r1', procedureName: 'TO' },
      { reservationId: 'r2', procedureName: 'Fono' },
    ]);
    expect(timeline.map((i) => i.eventLabel)).toEqual([
      '[TO] Convertido em agendamento',
      '[Fono] Enviado para aprovação dos pais',
    ]);

    vi.mocked(teaPreReservationService.listPending).mockResolvedValue({ items: [{ preReservationId: 'res-1', pitTherapyId: 'pit-1' }] } as any);
    vi.mocked(teaPreReservationService.listCreated).mockResolvedValue({
      items: [
        {
          preReservationId: 'res-1',
          pitTherapyId: 'pit-1',
          status: 'RESERVED',
          patient: { name: 'Alice' },
          professionalDoctorId: 'doc-1',
          professionalName: 'Dr House',
          procedureName: 'TO',
          weeklySlotPattern: [{ date: '2026-01-06', time: '09:00' }],
          slotSuggestion: { suggestedDate: '2026-01-06', suggestedTime: '09:00' },
        },
      ],
    } as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue({ items: [{ id: 'doc-1', roomId: 'room-1', name: 'Dr House' }] } as any);
    vi.mocked(sectorService.listSectors).mockResolvedValue({ items: [{ id: 'room-1', name: 'Sala 1', branch: { tradeName: 'Matriz' } }] } as any);

    const agenda = await fetchTeaWeeklyAgenda();
    expect(agenda).toEqual([
      {
        id: 'reservation-res-1-0-2026-01-06-09:00',
        patientName: 'Alice',
        doctorName: 'Dr House',
        specialty: 'TO',
        roomName: 'Sala 1 (Matriz)',
        date: '2026-01-06',
        time: '09:00',
        type: 'RESERVA TEA',
        status: 'RESERVED',
        source: 'RESERVATION',
      },
    ]);
  });

  it('runs tea and patient query hooks with enabled/disabled behaviors', async () => {
    vi.mocked(preAttendanceService.list).mockResolvedValue({ items: [] } as any);
    vi.mocked(appointmentService.list).mockResolvedValue({ items: [] } as any);
    vi.mocked(reportService.list).mockResolvedValue({ data: [] } as any);
    vi.mocked(deliveryService.getDeliveries).mockResolvedValue({ data: [] } as any);
    vi.mocked(patientService.getPatientById).mockResolvedValue({ id: 'p1', name: 'Maria', cpf: '123' } as any);
    vi.mocked(teaProfileService.list).mockResolvedValue({ items: [] } as any);
    vi.mocked(teaProfileService.listPlans).mockResolvedValue({ items: [] } as any);
    vi.mocked(teaProfileService.listEvolutions).mockResolvedValue({ items: [] } as any);
    vi.mocked(teaProfileService.getPit).mockResolvedValue(null as any);
    vi.mocked(teaProfileService.getReport).mockResolvedValue(null as any);
    vi.mocked(teaEvolutionTemplateService.list).mockResolvedValue({ items: [] } as any);
    vi.mocked(teaPreReservationService.listPending).mockResolvedValue({ items: [] } as any);
    vi.mocked(teaPreReservationService.listCancellationTherapies).mockResolvedValue({ items: [] } as any);
    vi.mocked(teaPreReservationService.getManualGrid).mockResolvedValue({ days: [] } as any);
    vi.mocked(teaPreReservationService.getConversionChecklist).mockResolvedValue({ checks: [] } as any);
    vi.mocked(teaPreReservationService.getTimeline).mockResolvedValue({ events: [] } as any);
    vi.mocked(teaPreReservationService.listCreated).mockResolvedValue({ items: [] } as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue({ items: [] } as any);
    vi.mocked(sectorService.listSectors).mockResolvedValue({ items: [] } as any);

    const wrapper = createWrapper();

    const patientQueue = renderHook(() => usePatientQueueQuery(), { wrapper });
    const patientSummaryDisabled = renderHook(() => usePatientSummaryQuery(null), { wrapper });
    const patientSummaryEnabled = renderHook(
      () => usePatientSummaryQuery({ id: 'p1', id_medilab: 'm1', nome: 'Maria', cpf: '123' }),
      { wrapper },
    );

    const teaProfiles = renderHook(() => useTeaProfilesQuery({ search: 'a' }), { wrapper });
    const teaPlansDisabled = renderHook(() => useTeaPlansQuery({ teaProfileId: null }), { wrapper });
    const teaPlansEnabled = renderHook(() => useTeaPlansQuery({ teaProfileId: 'tp1' }), { wrapper });
    const teaEvolutionsDisabled = renderHook(() => useTeaEvolutionsQuery(null), { wrapper });
    const teaEvolutionsEnabled = renderHook(() => useTeaEvolutionsQuery('tp1'), { wrapper });
    const teaPitDisabled = renderHook(() => useTeaPitQuery(null), { wrapper });
    const teaPitEnabled = renderHook(() => useTeaPitQuery('tp1'), { wrapper });
    const teaReportDisabled = renderHook(() => useTeaReportQuery({ teaProfileId: null }), { wrapper });
    const teaReportEnabled = renderHook(() => useTeaReportQuery({ teaProfileId: 'tp1' }), { wrapper });
    const teaTemplates = renderHook(() => useTeaEvolutionTemplatesQuery(), { wrapper });
    const teaPending = renderHook(() => useTeaPendingReservationsQuery({ search: '' }), { wrapper });
    const teaCancelDisabled = renderHook(() => useTeaCancellationTherapiesQuery({ teaProfileId: null }), { wrapper });
    const teaCancelEnabled = renderHook(() => useTeaCancellationTherapiesQuery({ teaProfileId: 'tp1' }), { wrapper });
    const teaGridDisabled = renderHook(() => useTeaManualGridQuery([], ''), { wrapper });
    const teaGridEnabled = renderHook(() => useTeaManualGridQuery([{ pitTherapyId: 'pit-1' }], '2026-01-05'), { wrapper });
    const teaChecklistDisabled = renderHook(() => useTeaReservationChecklistQuery([], true), { wrapper });
    const teaChecklistEnabled = renderHook(() => useTeaReservationChecklistQuery([{ reservationId: 'r1', procedureName: 'TO' }], true), { wrapper });
    const teaTimelineDisabled = renderHook(() => useTeaReservationTimelineQuery([], true), { wrapper });
    const teaTimelineEnabled = renderHook(() => useTeaReservationTimelineQuery([{ reservationId: 'r1', procedureName: 'TO' }], true), { wrapper });
    const teaWeeklyAgenda = renderHook(() => useTeaWeeklyAgendaQuery(), { wrapper });

    expect(patientSummaryDisabled.result.current.fetchStatus).toBe('idle');
    expect(teaPlansDisabled.result.current.fetchStatus).toBe('idle');
    expect(teaEvolutionsDisabled.result.current.fetchStatus).toBe('idle');
    expect(teaPitDisabled.result.current.fetchStatus).toBe('idle');
    expect(teaReportDisabled.result.current.fetchStatus).toBe('idle');
    expect(teaCancelDisabled.result.current.fetchStatus).toBe('idle');
    expect(teaGridDisabled.result.current.fetchStatus).toBe('idle');
    expect(teaChecklistDisabled.result.current.fetchStatus).toBe('idle');
    expect(teaTimelineDisabled.result.current.fetchStatus).toBe('idle');

    await waitFor(() => {
      expect(patientQueue.result.current.isSuccess).toBe(true);
      expect(patientSummaryEnabled.result.current.isSuccess).toBe(true);
      expect(teaProfiles.result.current.isSuccess).toBe(true);
      expect(teaPlansEnabled.result.current.isSuccess).toBe(true);
      expect(teaEvolutionsEnabled.result.current.isSuccess).toBe(true);
      expect(teaPitEnabled.result.current.isSuccess).toBe(true);
      expect(teaReportEnabled.result.current.isSuccess).toBe(true);
      expect(teaTemplates.result.current.isSuccess).toBe(true);
      expect(teaPending.result.current.isSuccess).toBe(true);
      expect(teaCancelEnabled.result.current.isSuccess).toBe(true);
      expect(teaGridEnabled.result.current.isSuccess).toBe(true);
      expect(teaChecklistEnabled.result.current.isSuccess).toBe(true);
      expect(teaTimelineEnabled.result.current.isSuccess).toBe(true);
      expect(teaWeeklyAgenda.result.current.isSuccess).toBe(true);
    });
  });
});
