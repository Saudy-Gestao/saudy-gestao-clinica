import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CadastroAgendaEscalaForm } from '../CadastroAgendaEscalaForm';
import { ThemeProvider } from '@/components/ui';
import agendaService from '../../../services/agendaService';

vi.mock('../../../services/agendaService', () => ({
  default: {
    createAgenda: vi.fn(),
  },
}));

const baseProps = {
  branchOptions: [{ value: 'branch-1', label: 'Unidade Central' }],
  doctors: [
    {
      id: 'doctor-1',
      name: 'Dra. Ana',
      branchIds: ['branch-1'],
      especialidadeGroups: [{ especialidadeId: 'specialty-1', modalidadeId: 'modality-1' }],
    },
    {
      id: 'doctor-2',
      name: 'Dr. Bruno',
      branchIds: ['branch-1'],
      especialidadeGroups: [{ especialidadeId: 'specialty-2', modalidadeId: 'modality-2' }],
    },
    {
      id: 'doctor-3',
      name: 'Dra. Camila',
      branchIds: ['branch-1'],
      especialidadeGroups: [
        { especialidadeId: 'specialty-1', modalidadeId: 'modality-1' },
        { especialidadeId: 'specialty-2', modalidadeId: 'modality-2' },
      ],
    },
  ],
  especialidades: [
    { id: 'specialty-1', name: 'Fonoaudiologia', branchId: null },
    { id: 'specialty-2', name: 'Psicologia', branchId: null },
  ],
  rooms: [],
  interns: [],
  isMobile: false,
  onCancel: vi.fn(),
  onSaved: vi.fn(),
};

describe('CadastroAgendaEscalaForm', () => {
  it('libera especialidade após a unidade e filtra profissionais compatíveis', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <CadastroAgendaEscalaForm {...baseProps} />
      </ThemeProvider>,
    );

    const unitSelect = screen.getAllByRole('button', { name: 'Unidade', exact: true })[0];
    const specialtySelect = screen.getByRole('button', { name: 'Especialidade', exact: true });

    expect(specialtySelect).toBeDisabled();

    await user.click(unitSelect);
    await user.click(screen.getByRole('option', { name: 'Unidade Central', exact: true }));

    expect(specialtySelect).toBeEnabled();

    await user.click(specialtySelect);
    await user.click(screen.getByRole('option', { name: 'Fonoaudiologia', exact: true }));

    const professionalSelect = screen.getByRole('button', { name: 'Profissional', exact: true });
    await user.click(professionalSelect);

    expect(screen.getByRole('option', { name: 'Dra. Ana', exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Dr. Bruno', exact: true })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Dra. Ana', exact: true }));
    expect(specialtySelect).toBeEnabled();
    expect(specialtySelect).toHaveTextContent('Fonoaudiologia');
  });

  it('envia todas as especialidades selecionadas no mesmo horário', async () => {
    const user = userEvent.setup();
    vi.mocked(agendaService.createAgenda).mockResolvedValue({});
    render(
      <ThemeProvider>
        <CadastroAgendaEscalaForm {...baseProps} />
      </ThemeProvider>,
    );

    await user.click(screen.getAllByRole('button', { name: 'Unidade', exact: true })[0]);
    await user.click(screen.getByRole('option', { name: 'Unidade Central', exact: true }));

    const specialtySelect = screen.getByRole('button', { name: 'Especialidade', exact: true });
    await user.click(specialtySelect);
    await user.click(screen.getByRole('option', { name: 'Fonoaudiologia', exact: true }));
    await user.click(screen.getByRole('option', { name: 'Psicologia', exact: true }));

    await user.click(screen.getByRole('button', { name: 'Profissional', exact: true }));
    await user.click(screen.getByRole('option', { name: 'Dra. Camila', exact: true }));

    await user.click(screen.getByRole('button', { name: /Novo bloco/ }));
    await user.click(screen.getByRole('button', { name: /Segunda-feira/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar bloco', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Salvar escala', exact: true }));

    await waitFor(() => expect(agendaService.createAgenda).toHaveBeenCalledWith(expect.objectContaining({
      especialidadeId: 'specialty-1',
      especialidadeIds: ['specialty-1', 'specialty-2'],
    })));
  });
});
