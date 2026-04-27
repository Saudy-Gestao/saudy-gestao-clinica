import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchDoctorsAdmin, useDoctorsAdminQuery } from '../useDoctorsAdminQuery';
import { fetchInsurancesAdmin, useInsurancesAdminQuery } from '../useInsurancesAdminQuery';
import { fetchProceduresAdmin, useProceduresAdminQuery } from '../useProceduresAdminQuery';
import { fetchRoomsAdmin, useRoomsAdminQuery } from '../useRoomsAdminQuery';
import { fetchPatientAppointments, usePatientAppointmentsQuery } from '../usePatientAppointmentsQuery';
import { fetchPatientTodayAppointments, usePatientTodayAppointmentsQuery } from '../usePatientTodayAppointmentsQuery';
import doctorService from '../../services/doctorService';
import insuranceService from '../../services/insuranceService';
import procedureService from '../../services/procedureService';
import sectorService from '../../services/sectorService';
import appointmentService from '../../services/appointmentService';

vi.mock('../../services/doctorService', () => ({
  default: {
    listDoctors: vi.fn(),
  },
}));

vi.mock('../../services/insuranceService', () => ({
  default: {
    listInsurances: vi.fn(),
  },
}));

vi.mock('../../services/procedureService', () => ({
  default: {
    listProcedures: vi.fn(),
  },
}));

vi.mock('../../services/sectorService', () => ({
  default: {
    listSectors: vi.fn(),
  },
}));

vi.mock('../../services/appointmentService', () => ({
  default: {
    list: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const formatToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

describe('admin and patient hooks', () => {
  it('forwards simple admin list fetchers', async () => {
    vi.mocked(doctorService.listDoctors).mockResolvedValue([{ id: 'd1' }] as any);
    vi.mocked(insuranceService.listInsurances).mockResolvedValue([{ id: 'i1' }] as any);

    const doctors = await fetchDoctorsAdmin();
    const insurances = await fetchInsurancesAdmin();

    expect(doctors).toEqual([{ id: 'd1' }]);
    expect(insurances).toEqual([{ id: 'i1' }]);
    expect(doctorService.listDoctors).toHaveBeenCalled();
    expect(insuranceService.listInsurances).toHaveBeenCalled();
  });

  it('normalizes procedures and rooms responses from multiple payload shapes', async () => {
    vi.mocked(procedureService.listProcedures)
      .mockResolvedValueOnce([{ id: 'p1' }] as any)
      .mockResolvedValueOnce({ items: [{ id: 'p2' }] } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'p3' }] } } as any)
      .mockResolvedValueOnce({ data: [{ id: 'p4' }] } as any);

    vi.mocked(sectorService.listSectors)
      .mockResolvedValueOnce([{ id: 'r1' }] as any)
      .mockResolvedValueOnce({ items: [{ id: 'r2' }] } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'r3' }] } } as any)
      .mockResolvedValueOnce({ data: [{ id: 'r4' }] } as any);

    expect(await fetchProceduresAdmin()).toEqual([{ id: 'p1' }]);
    expect(await fetchProceduresAdmin()).toEqual([{ id: 'p2' }]);
    expect(await fetchProceduresAdmin()).toEqual([{ id: 'p3' }]);
    expect(await fetchProceduresAdmin()).toEqual([{ id: 'p4' }]);

    expect(await fetchRoomsAdmin()).toEqual([{ id: 'r1' }]);
    expect(await fetchRoomsAdmin()).toEqual([{ id: 'r2' }]);
    expect(await fetchRoomsAdmin()).toEqual([{ id: 'r3' }]);
    expect(await fetchRoomsAdmin()).toEqual([{ id: 'r4' }]);
  });

  it('normalizes patient appointments and handles missing patient id', async () => {
    vi.mocked(appointmentService.list)
      .mockResolvedValueOnce([{ id: 'a1' }] as any)
      .mockResolvedValueOnce({ items: [{ id: 'a2' }] } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'a3' }] } } as any)
      .mockResolvedValueOnce({ data: [{ id: 'a4' }] } as any);

    expect(await fetchPatientAppointments('patient-1')).toEqual([{ id: 'a1' }]);
    expect(await fetchPatientAppointments('patient-1')).toEqual([{ id: 'a2' }]);
    expect(await fetchPatientAppointments('patient-1')).toEqual([{ id: 'a3' }]);
    expect(await fetchPatientAppointments('patient-1')).toEqual([{ id: 'a4' }]);
    expect(await fetchPatientAppointments(undefined)).toEqual([]);

    expect(appointmentService.list).toHaveBeenCalledWith({ patientId: 'patient-1', limit: 200, offset: 0 });
  });

  it('maps only today appointments with fallback fields', async () => {
    const today = formatToday();
    vi.mocked(appointmentService.list).mockResolvedValue([
      {
        id: 'a1',
        date: `${today}T08:00:00.000Z`,
        doctor_name: 'Dr. Joao',
        time: '08:30',
        status: 'CONFIRMADO',
      },
      {
        id: 'a2',
        date: '1990-01-01T10:00:00.000Z',
        doctorName: 'Outro',
      },
      {
        id: 'a3',
        date: `${today}`,
        doctor: { name: 'Dra. Ana', specialty: 'Pediatria' },
      },
    ] as any);

    const result = await fetchPatientTodayAppointments('patient-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'a1', doctorName: 'Dr. Joao', time: '08:30', status: 'CONFIRMADO' });
    expect(result[1]).toMatchObject({ id: 'a3', doctorName: 'Dra. Ana', specialty: 'Pediatria', time: '--:--' });
  });

  it('hooks resolve admin lists and respect patient enabled flags', async () => {
    vi.mocked(doctorService.listDoctors).mockResolvedValue([{ id: 'd9' }] as any);
    vi.mocked(insuranceService.listInsurances).mockResolvedValue([{ id: 'i9' }] as any);
    vi.mocked(procedureService.listProcedures).mockResolvedValue({ items: [{ id: 'p9' }] } as any);
    vi.mocked(sectorService.listSectors).mockResolvedValue({ data: [{ id: 'r9' }] } as any);
    vi.mocked(appointmentService.list).mockResolvedValue([{ id: 'a9', date: `${formatToday()}` }] as any);

    const doctors = renderHook(() => useDoctorsAdminQuery(), { wrapper: createWrapper() });
    const insurances = renderHook(() => useInsurancesAdminQuery(), { wrapper: createWrapper() });
    const procedures = renderHook(() => useProceduresAdminQuery(), { wrapper: createWrapper() });
    const rooms = renderHook(() => useRoomsAdminQuery(), { wrapper: createWrapper() });
    const noPatient = renderHook(() => usePatientAppointmentsQuery(undefined), { wrapper: createWrapper() });
    const withPatient = renderHook(() => usePatientAppointmentsQuery('patient-1'), { wrapper: createWrapper() });
    const today = renderHook(() => usePatientTodayAppointmentsQuery('patient-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(doctors.result.current.isSuccess).toBe(true);
      expect(insurances.result.current.isSuccess).toBe(true);
      expect(procedures.result.current.isSuccess).toBe(true);
      expect(rooms.result.current.isSuccess).toBe(true);
      expect(withPatient.result.current.isSuccess).toBe(true);
      expect(today.result.current.isSuccess).toBe(true);
    });

    expect(doctors.result.current.data).toEqual([{ id: 'd9' }]);
    expect(insurances.result.current.data).toEqual([{ id: 'i9' }]);
    expect(procedures.result.current.data).toEqual([{ id: 'p9' }]);
    expect(rooms.result.current.data).toEqual([{ id: 'r9' }]);
    expect(withPatient.result.current.data).toEqual([{ id: 'a9', date: `${formatToday()}` }]);
    expect(today.result.current.data?.length).toBe(1);
    expect(noPatient.result.current.fetchStatus).toBe('idle');
  });
});
