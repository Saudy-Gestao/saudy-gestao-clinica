import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { TicketFab } from '../TicketFab';
import ticketService from '../../../services/ticketService';
import { notifications } from '@mantine/notifications';

vi.mock('../../../services/ticketService', () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('@mantine/hooks', () => ({
  useDisclosure: () => [true, { open: vi.fn(), close: vi.fn() }],
}));

vi.mock('../FloatingSelect', () => ({
  FloatingSelect: ({ label, onChange, data, value }: any) => (
    <label>
      {label}
      <select aria-label={String(label)} value={value || ''} onChange={(event) => onChange?.(event.currentTarget.value)}>
        <option value="">Selecione</option>
        {(data || []).map((item: any) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock('../FloatingTextarea', () => ({
  FloatingTextarea: ({ label, value, onChange }: any) => (
    <label>
      {label}
      <textarea aria-label={String(label)} value={value || ''} onChange={onChange} />
    </label>
  ),
}));

const renderWithProviders = (initialPath = '/dashboard') => render(
  <MantineProvider>
    <MemoryRouter initialEntries={[initialPath]}>
      <TicketFab />
    </MemoryRouter>
  </MantineProvider>,
);

const clickEnviarChamado = async (user: ReturnType<typeof userEvent.setup>) => {
  const sendText = screen.getByText('Enviar chamado');
  const button = sendText.closest('button') as HTMLButtonElement;
  await user.click(button);
};

describe('TicketFab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('nao renderiza quando usuario nao esta autenticado', () => {
    renderWithProviders();
    expect(screen.queryByLabelText('Abrir ajuda')).not.toBeInTheDocument();
  });

  it('nao renderiza em rotas ocultas', () => {
    localStorage.setItem('token', 'token');
    renderWithProviders('/login');
    expect(screen.queryByLabelText('Abrir ajuda')).not.toBeInTheDocument();
  });

  it('renderiza conteudo do modal quando autenticado', () => {
    localStorage.setItem('token', 'token');

    renderWithProviders();

    expect(screen.getByText('Suporte interno')).toBeInTheDocument();
  });

  it('mostra alerta para campos obrigatorios', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'token');

    renderWithProviders();

    await clickEnviarChamado(user);

    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Campos obrigatórios',
      color: 'yellow',
    }));
  });

  it('mostra alerta quando descricao e curta', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'token');

    renderWithProviders();

    await user.type(screen.getByLabelText('Descrição do bug, erro ou melhoria'), 'curta');

    await clickEnviarChamado(user);

    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Campos obrigatórios',
    }));
  });

  it('envia ticket com sucesso e fecha modal', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'token');
    vi.mocked(ticketService.create).mockResolvedValue({ id: '1' } as any);

    renderWithProviders();

    await user.selectOptions(screen.getByLabelText('Fluxo'), 'ATENDIMENTO_AGENDA');
    await user.selectOptions(screen.getByLabelText('Módulo'), 'DASHBOARD');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'BUG');

    await user.type(screen.getByLabelText('Descrição do bug, erro ou melhoria'), 'Descrição longa o suficiente para envio');

    await clickEnviarChamado(user);

    await waitFor(() => {
      expect(ticketService.create).toHaveBeenCalledWith(expect.objectContaining({
        flow: 'ATENDIMENTO_AGENDA',
        module: 'DASHBOARD',
        type: 'BUG',
      }));
    });

    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Chamado aberto',
      color: 'green',
    }));
  });

  it('mostra erro quando envio falha', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'token');
    vi.mocked(ticketService.create).mockRejectedValue(new Error('falha'));

    renderWithProviders();

    await user.selectOptions(screen.getByLabelText('Fluxo'), 'ATENDIMENTO_AGENDA');
    await user.selectOptions(screen.getByLabelText('Módulo'), 'DASHBOARD');

    await user.type(screen.getByLabelText('Descrição do bug, erro ou melhoria'), 'Descrição longa o suficiente para envio');

    await clickEnviarChamado(user);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Erro ao abrir chamado',
        color: 'red',
      }));
    });
  });
});
