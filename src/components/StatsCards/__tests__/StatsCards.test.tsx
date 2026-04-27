import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { StatsCards } from '../StatsCards';
import * as clinicalQueueHook from '../../../hooks/useClinicalQueueQuery';
import * as appointmentsHook from '../../../hooks/useAppointmentsQuery';
import dayjs from 'dayjs';

// Mock dos hooks
vi.mock('../../../hooks/useClinicalQueueQuery');
vi.mock('../../../hooks/useAppointmentsQuery');
vi.mock('@mantine/notifications', () => ({
  showNotification: vi.fn(),
}));

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

const expectCardValue = (label: string, value: string) => {
  const labelEl = screen.getByText(label);
  const card = labelEl.parentElement;
  expect(card).not.toBeNull();
  expect(within(card as HTMLElement).getByText(value)).toBeInTheDocument();
};

describe('StatsCards', () => {
  const today = dayjs().format('YYYY-MM-DD');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar skeleton quando estiver carregando', () => {
    vi.spyOn(clinicalQueueHook, 'useClinicalQueueQuery').mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    } as any);

    vi.spyOn(appointmentsHook, 'useAppointmentsQuery').mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    } as any);

    renderWithMantine(<StatsCards />);
    
    // Verifica se há elementos Skeleton na tela
    const skeletons = document.querySelectorAll('.mantine-Skeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('deve exibir estatísticas corretas para usuário não-médico', () => {
    const mockAppointments = [
      {
        id: 1,
        date: `${today}T10:00:00`,
        status: 'AGENDADO',
        doctorId: '1',
      },
      {
        id: 2,
        date: `${today}T11:00:00`,
        status: 'AGENDADO',
        doctorId: '2',
      },
      {
        id: 3,
        date: `${today}T12:00:00`,
        status: 'ATENDIDO',
        doctorId: '1',
      },
    ];

    const mockConsultations = [
      {
        id: 1,
        queue: 'em atendimento',
        doctorId: '1',
      },
    ];

    vi.spyOn(clinicalQueueHook, 'useClinicalQueueQuery').mockReturnValue({
      data: mockConsultations,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(appointmentsHook, 'useAppointmentsQuery').mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    renderWithMantine(<StatsCards />);

    // Verifica que os números estão corretos
    expectCardValue('Agendados hoje', '03');
    expectCardValue('Pendentes hoje', '02');
    expectCardValue('Em atendimento', '01');
  });

  it('deve filtrar consultas do médico quando usuário é médico', () => {
    const mockUser = {
      doctorId: 'doc-123',
      doctor: {
        id: 'doc-123',
        name: 'Dr. Silva',
      },
    };

    const mockAppointments = [
      {
        id: 1,
        date: `${today}T10:00:00`,
        status: 'AGENDADO',
        doctorId: 'doc-123',
      },
      {
        id: 2,
        date: `${today}T11:00:00`,
        status: 'AGENDADO',
        doctorId: 'doc-456', // Outro médico
      },
      {
        id: 3,
        date: `${today}T12:00:00`,
        status: 'ATENDIDO',
        doctorId: 'doc-123',
      },
    ];

    vi.spyOn(clinicalQueueHook, 'useClinicalQueueQuery').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(appointmentsHook, 'useAppointmentsQuery').mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    renderWithMantine(<StatsCards user={mockUser} />);

    // Deve mostrar apenas as consultas do médico específico (2)
    expectCardValue('Agendados hoje', '02');
  });

  it('deve ignorar consultas canceladas', () => {
    const mockAppointments = [
      {
        id: 1,
        date: `${today}T10:00:00`,
        status: 'AGENDADO',
      },
      {
        id: 2,
        date: `${today}T11:00:00`,
        status: 'CANCELADO',
      },
      {
        id: 3,
        date: `${today}T12:00:00`,
        status: 'CANCELED',
      },
    ];

    vi.spyOn(clinicalQueueHook, 'useClinicalQueueQuery').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(appointmentsHook, 'useAppointmentsQuery').mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    renderWithMantine(<StatsCards />);

    // Apenas 1 consulta agendada (ignora as 2 canceladas)
    expectCardValue('Agendados hoje', '01');
  });

  it('deve identificar corretamente status de atendidos', () => {
    const statusFinalizados = [
      'atendido',
      'atendida',
      'finalizado',
      'concluido',
      'concluído',
      'realizado',
    ];

    statusFinalizados.forEach((status) => {
      const mockAppointments = [
        {
          id: 1,
          date: `${today}T10:00:00`,
          status,
        },
      ];

      vi.spyOn(appointmentsHook, 'useAppointmentsQuery').mockReturnValue({
        data: mockAppointments,
        isLoading: false,
        error: null,
      } as any);

      vi.spyOn(clinicalQueueHook, 'useClinicalQueueQuery').mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      const { unmount } = renderWithMantine(<StatsCards />);
      
      // Deve contar como atendido
      expectCardValue('Agendados hoje', '01');
      
      unmount();
    });
  });

  it('deve filtrar apenas consultas de hoje', () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

    const mockAppointments = [
      {
        id: 1,
        date: `${yesterday}T10:00:00`,
        status: 'AGENDADO',
      },
      {
        id: 2,
        date: `${today}T10:00:00`,
        status: 'AGENDADO',
      },
      {
        id: 3,
        date: `${tomorrow}T10:00:00`,
        status: 'AGENDADO',
      },
    ];

    vi.spyOn(clinicalQueueHook, 'useClinicalQueueQuery').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(appointmentsHook, 'useAppointmentsQuery').mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    renderWithMantine(<StatsCards />);

    // Apenas 1 consulta de hoje
    expectCardValue('Agendados hoje', '01');
  });
});
