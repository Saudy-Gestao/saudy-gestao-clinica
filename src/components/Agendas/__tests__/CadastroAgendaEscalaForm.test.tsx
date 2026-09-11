import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CadastroAgendaEscalaForm } from '../CadastroAgendaEscalaForm';
import { ThemeProvider } from '@/components/ui';

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
});
