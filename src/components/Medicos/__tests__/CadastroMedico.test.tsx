import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CadastroMedico } from '../CadastroMedico';

const mocks = vi.hoisted(() => ({
  createDoctor: vi.fn(),
  updateDoctor: vi.fn(),
  deleteDoctor: vi.fn(),
  listDoctors: vi.fn(),
  listPatients: vi.fn(),
}));

vi.mock('../../../hooks/useDoctorsAdminQuery', () => ({
  useDoctorsAdminQuery: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('../../../hooks/useEspecialidadesAdminQuery', () => ({
  useEspecialidadesAdminQuery: () => ({ data: undefined }),
}));
vi.mock('../../../hooks/useModalidadesAdminQuery', () => ({
  useModalidadesAdminQuery: () => ({ data: undefined }),
}));
vi.mock('../../../hooks/useSettingsBranchesQuery', () => ({
  useSettingsBranchesQuery: () => ({ data: undefined }),
}));
vi.mock('../../../hooks/useProceduresAdminQuery', () => ({
  useProceduresAdminQuery: () => ({ data: undefined }),
}));
vi.mock('../../../hooks/useMyTicketsQuery', () => ({
  useMyTicketsQuery: () => ({ data: undefined }),
}));
vi.mock('../../../hooks/useCurrentUserProfileQuery', () => ({
  useCurrentUserProfileQuery: () => ({ data: undefined }),
}));
vi.mock('../../../services/doctorService', () => ({
  default: {
    createDoctor: mocks.createDoctor,
    updateDoctor: mocks.updateDoctor,
    deleteDoctor: mocks.deleteDoctor,
    listDoctors: mocks.listDoctors,
  },
}));
vi.mock('../../../services/patientService', () => ({
  default: { listPatients: mocks.listPatients },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CadastroMedico />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CadastroMedico - novo cadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createDoctor.mockResolvedValue({});
    mocks.updateDoctor.mockResolvedValue({});
    mocks.deleteDoctor.mockResolvedValue({});
    mocks.listDoctors.mockResolvedValue([]);
    mocks.listPatients.mockResolvedValue([]);
    window.localStorage.clear();
    Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() });
  });

  it('limpa os dados anteriores ao entrar novamente pelo hub', () => {
    renderPage();

    fireEvent.click(screen.getByText('Cadastrar profissional', { exact: true }));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Profissional anterior' } });

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.click(screen.getByText('Cadastrar profissional', { exact: true }));

    expect(screen.getByLabelText('Nome completo')).toHaveValue('');
  });

  it('limpa os dados ao escolher cadastrar novo no modal de sucesso', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Cadastrar profissional', { exact: true }));

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Profissional anterior' } });
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '52998224725' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'profissional@example.com' } });
    fireEvent.change(screen.getByLabelText('Celular'), { target: { value: '11999999999' } });
    fireEvent.change(screen.getByLabelText('Número do CRM'), { target: { value: '12345' } });

    fireEvent.click(screen.getByLabelText('Data de nascimento'));
    fireEvent.click(await screen.findByRole('button', { name: 'Hoje' }));

    const genderField = screen.getByText('Gênero', { exact: true }).closest('label');
    fireEvent.click(genderField?.querySelector('button') as HTMLButtonElement);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Masculino' }));

    const stateField = screen.getByText('UF do registro', { exact: true }).closest('label');
    fireEvent.click(stateField?.querySelector('button') as HTMLButtonElement);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'SP' }));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('Profissional cadastrado', { exact: true })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar novo' }));

    expect(screen.getByLabelText('Nome completo')).toHaveValue('');
    expect(screen.getByLabelText('CPF')).toHaveValue('');
    expect(mocks.createDoctor).toHaveBeenCalledTimes(1);
  });
});
