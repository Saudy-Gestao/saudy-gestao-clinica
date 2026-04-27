import React from 'react';
import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreAgendamento } from '../PreAgendamento';

const {
  navigateMock,
  invalidateQueriesMock,
  showNotificationMock,
  usePreSchedulingsQueryMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  showNotificationMock: vi.fn(),
  usePreSchedulingsQueryMock: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<any>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
    }),
  };
});

vi.mock('@mantine/notifications', async () => {
  const actual = await vi.importActual<any>('@mantine/notifications');
  return {
    ...actual,
    showNotification: showNotificationMock,
  };
});

vi.mock('../../../hooks/usePreSchedulingsQuery', () => ({
  usePreSchedulingsQuery: (...args: any[]) => usePreSchedulingsQueryMock(...args),
}));

vi.mock('../../Header/Header', () => ({
  Header: () => null,
}));

vi.mock('../../common/FloatingInput', () => ({
  FloatingInput: ({ label, value, onChange }: any) => (
    <label>
      {label}
      <input aria-label={String(label)} value={value || ''} onChange={onChange} />
    </label>
  ),
}));

vi.mock('../../common/FloatingSelect', () => ({
  FloatingSelect: ({ label, value, onChange }: any) => (
    <label>
      {label}
      <select aria-label={String(label)} value={value || ''} onChange={(e) => onChange?.(e.target.value || null)}>
        <option value="">Selecione</option>
      </select>
    </label>
  ),
}));

describe('PreAgendamento', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    invalidateQueriesMock.mockReset();
    showNotificationMock.mockReset();
    usePreSchedulingsQueryMock.mockReset();
  });

  it('renders empty state when query returns no items', () => {
    usePreSchedulingsQueryMock.mockReturnValue({
      isLoading: false,
      data: [],
      error: null,
    });

    render(
      <MantineProvider>
        <PreAgendamento />
      </MantineProvider>,
    );

    expect(screen.getByText(/pré-atendimento/i)).toBeInTheDocument();
    expect(screen.getByText(/fila de trabalho/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhum agendamento confirmado encontrado/i)).toBeInTheDocument();
    expect(screen.getByText(/total: 0/i)).toBeInTheDocument();
  });

  it('renders items and badges from loaded list', () => {
    usePreSchedulingsQueryMock.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'pre-1',
          appointmentId: 'appt-1',
          patientName: 'Maria Silva',
          patientCpf: '52998224725',
          source: 'BOT',
          doctorName: 'Dr. Joao',
          specialty: 'Cardiologia',
          convenio: 'Unimed',
          date: '2026-04-10',
          time: '10:30',
          preSchedulingStatus: 'PRE_AUTHORIZED',
          docsCount: 2,
          isTeleconsultation: true,
          isResolved: false,
        },
      ],
      error: null,
    });

    render(
      <MantineProvider>
        <PreAgendamento />
      </MantineProvider>,
    );

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('BOT')).toBeInTheDocument();
    expect(screen.getByText('TELECONSULTA')).toBeInTheDocument();
    expect(screen.getByText('Pré-autorizado')).toBeInTheDocument();
    expect(screen.getByText('2 anexo(s)')).toBeInTheDocument();
  });

  it('shows notification when query returns error and back button navigates', () => {
    usePreSchedulingsQueryMock.mockReturnValue({
      isLoading: false,
      data: [],
      error: new Error('Falhou ao carregar'),
    });

    render(
      <MantineProvider>
        <PreAgendamento />
      </MantineProvider>,
    );

    expect(showNotificationMock).toHaveBeenCalled();

    const backButton = screen.getByRole('button');
    fireEvent.click(backButton);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });
});
