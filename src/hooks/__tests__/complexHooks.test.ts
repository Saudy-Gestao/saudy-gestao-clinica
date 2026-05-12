import { beforeEach, describe, expect, it, vi } from 'vitest';
import teaPreReservationService from '../../services/teaPreReservationService';
import doctorService from '../../services/doctorService';
import sectorService from '../../services/sectorService';
import convenioAuthorizationService from '../../services/convenioAuthorizationService';

import { fetchTeaWeeklyAgenda } from '../useTeaWeeklyAgendaQuery';
import { fetchTeaManualGrid } from '../useTeaManualGridQuery';
import { fetchTeaReservationChecklist } from '../useTeaReservationChecklistQuery';
import { fetchTeaPendingReservations } from '../useTeaPendingReservationsQuery';
import { fetchTeaReservationTimeline } from '../useTeaReservationTimelineQuery';
import { fetchConvenioAuthorizations } from '../useConvenioAuthorizationsQuery';
import { fetchTeaPlans } from '../useTeaPlansQuery';
import teaProfileService from '../../services/teaProfileService';

vi.mock('../../services/teaPreReservationService', () => ({
  default: {
    listPending: vi.fn(),
    listCreated: vi.fn(),
    getConversionChecklist: vi.fn(),
    listCancellationTherapies: vi.fn(),
    getTimeline: vi.fn(),
    getManualGrid: vi.fn(),
    list: vi.fn(),
  },
}));
vi.mock('../../services/doctorService', () => ({ default: { listDoctors: vi.fn() } }));
vi.mock('../../services/sectorService', () => ({ default: { listSectors: vi.fn() } }));
vi.mock('../../services/convenioAuthorizationService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/teaProfileService', () => ({
  default: { list: vi.fn(), listPlans: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(teaPreReservationService.listPending).mockResolvedValue([] as any);
  vi.mocked(teaPreReservationService.listCreated).mockResolvedValue({ items: [] } as any);
  vi.mocked(teaPreReservationService.list).mockResolvedValue({ items: [] } as any);
  vi.mocked(doctorService.listDoctors).mockResolvedValue([] as any);
  vi.mocked(sectorService.listSectors).mockResolvedValue([] as any);
  vi.mocked(convenioAuthorizationService.list).mockResolvedValue({ items: [] } as any);
  vi.mocked(teaProfileService.listPlans).mockResolvedValue({ items: [] } as any);
});

describe('fetchTeaWeeklyAgenda', () => {
  it('returns empty when no reservations', async () => {
    await expect(fetchTeaWeeklyAgenda()).resolves.toEqual([]);
  });

  it('maps created reservations with RESERVED status', async () => {
    vi.mocked(teaPreReservationService.listCreated).mockResolvedValue({
      items: [{
        id: 'r1',
        preReservationId: 'r1',
        status: 'RESERVED',
        patient: { name: 'Ana' },
        doctorName: 'Dr. X',
        pitTherapyId: 't1',
        suggestedDate: '2024-06-15',
        suggestedTime: '10:00',
      }],
    } as any);
    vi.mocked(teaPreReservationService.listPending).mockResolvedValue([
      { preReservationId: 'r1', pitTherapyId: 't1' },
    ] as any);
    const result = await fetchTeaWeeklyAgenda();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('RESERVED');
  });

  it('builds roomById map from sectors', async () => {
    vi.mocked(sectorService.listSectors).mockResolvedValue([
      { id: 's1', name: 'Sala 1', branch: { tradeName: 'Centro' } },
    ] as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue([
      { id: 'd1', name: 'Dr. Y', roomId: 's1' },
    ] as any);
    await fetchTeaWeeklyAgenda();
    expect(sectorService.listSectors).toHaveBeenCalled();
  });

  it('handles array-wrapped responses', async () => {
    vi.mocked(teaPreReservationService.listPending).mockResolvedValue({ data: { items: [] } } as any);
    vi.mocked(teaPreReservationService.listCreated).mockResolvedValue({ data: { items: [] } } as any);
    await expect(fetchTeaWeeklyAgenda()).resolves.toEqual([]);
  });
});

describe('fetchTeaManualGrid', () => {
  it('returns empty object when no therapies', async () => {
    const result = await fetchTeaManualGrid([], '2024-06-10');
    expect(result).toEqual({});
  });

  it('returns empty object when no weekStart', async () => {
    const result = await fetchTeaManualGrid([{ pitTherapyId: 't1' }], '');
    expect(result).toEqual({});
  });

  it('maps days from service response per therapy', async () => {
    vi.mocked(teaPreReservationService.getManualGrid).mockResolvedValue({
      days: [{
        date: '2024-06-15',
        weekday: 'Saturday',
        enabled: true,
        slots: [{ time: '09:00', occupied: false, selectable: true }],
      }],
    } as any);
    const result = await fetchTeaManualGrid([{ pitTherapyId: 't1' }], '2024-06-10');
    expect(result).toHaveProperty('t1');
    expect(result['t1'].days).toHaveLength(1);
  });
});

describe('fetchTeaReservationChecklist', () => {
  it('returns empty for empty reservations', async () => {
    await expect(fetchTeaReservationChecklist([])).resolves.toEqual([]);
  });

  it('fetches checklist for each reservation', async () => {
    vi.mocked(teaPreReservationService.getConversionChecklist).mockResolvedValue({
      checks: [{ key: 'k1', label: 'Check 1', valid: true, message: '' }],
    } as any);
    const result = await fetchTeaReservationChecklist([
      { reservationId: 'r1', procedureName: 'Terapia' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toContain('r1');
    expect(result[0].procedureName).toBe('Terapia');
  });

  it('handles items shape', async () => {
    vi.mocked(teaPreReservationService.getConversionChecklist).mockResolvedValue({
      items: [{ key: 'k2', label: 'Check 2', valid: false, message: 'Missing' }],
    } as any);
    const result = await fetchTeaReservationChecklist([{ reservationId: 'r2', procedureName: 'P' }]);
    expect(result).toHaveLength(1);
  });
});

describe('fetchTeaPendingReservations', () => {
  it('returns empty when no data', async () => {
    vi.mocked(teaPreReservationService.listPending).mockResolvedValue({ items: [] } as any);
    await expect(fetchTeaPendingReservations({})).resolves.toEqual([]);
  });

  it('maps and normalizes patient data', async () => {
    vi.mocked(teaPreReservationService.listPending).mockResolvedValue({
      items: [{
        id: 'r1',
        status: 'PENDING',
        patient: { id: 'p1', name: 'Ana', cpf: '12345678900', birthDate: '1990-01-01' },
        procedure: { name: 'Terapia' },
      }],
    } as any);
    const result = await fetchTeaPendingReservations({});
    expect(result).toHaveLength(1);
    expect(result[0].patient.name).toBe('Ana');
  });

  it('handles array response', async () => {
    vi.mocked(teaPreReservationService.listPending).mockResolvedValue([
      { id: 'r2', patient: { id: 'p2', name: 'Bruno' } },
    ] as any);
    const result = await fetchTeaPendingReservations({ search: 'B' });
    expect(result).toHaveLength(1);
  });
});

describe('fetchTeaReservationTimeline', () => {
  it('returns empty for empty reservations array', async () => {
    await expect(fetchTeaReservationTimeline([])).resolves.toEqual([]);
  });

  it('calls service with reservationId', async () => {
    vi.mocked(teaPreReservationService.getTimeline).mockResolvedValue({ events: [] } as any);
    await fetchTeaReservationTimeline([{ reservationId: 'r1', procedureName: 'T' }]);
    expect(teaPreReservationService.getTimeline).toHaveBeenCalledWith('r1');
  });

  it('maps and labels events', async () => {
    vi.mocked(teaPreReservationService.getTimeline).mockResolvedValue({
      events: [{ id: 'e1', eventType: 'STATUS_CHANGED', payload: { nextStatus: 'RESERVED' }, createdAt: '2024-01-01' }],
    } as any);
    const result = await fetchTeaReservationTimeline([{ reservationId: 'r1', procedureName: 'Terapia' }]);
    expect(result).toHaveLength(1);
    expect(result[0].eventLabel).toContain('Terapia');
    expect(result[0].eventLabel).toContain('Horários reservados');
  });
});

describe('fetchConvenioAuthorizations - extended', () => {
  it('passes search and status params', async () => {
    vi.mocked(convenioAuthorizationService.list).mockResolvedValue({ items: [] } as any);
    await fetchConvenioAuthorizations({ search: 'Ana', statusFilter: ['PENDING' as any] });
    expect(convenioAuthorizationService.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'Ana', statuses: ['PENDING'] }));
  });
});

describe('fetchTeaPlans - extended', () => {
  it('extracts from data wrapper', async () => {
    vi.mocked(teaProfileService.listPlans).mockResolvedValue({ data: { items: [{ id: 'pl1' }] } } as any);
    const result = await fetchTeaPlans({ teaProfileId: 'tp1' });
    expect(result).toHaveLength(1);
  });
});
