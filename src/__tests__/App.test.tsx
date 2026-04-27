import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import App from '../App';
import { APP_COLOR_SCHEME_EVENT } from '../utils/appColorScheme';

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  currentUser: null as any,
  isPatientAuthenticated: false,
  isDoctor: false,
}));

vi.mock('../services/authService', () => ({
  default: {
    isAuthenticated: () => authState.isAuthenticated,
    getCurrentUser: () => authState.currentUser,
  },
}));

vi.mock('../services/patientPortalAuthService', () => ({
  default: {
    isAuthenticated: () => authState.isPatientAuthenticated,
  },
}));

vi.mock('../utils/userRole', () => ({
  isDoctorUser: () => authState.isDoctor,
}));

vi.mock('../components/Dashboard/Dashboard', () => ({ Dashboard: () => <div>Dashboard page</div> }));
vi.mock('../components/Auth/Login', () => ({ Login: () => <div>Login page</div> }));
vi.mock('../components/Auth/Cadastro', () => ({ Cadastro: () => <div>Cadastro page</div> }));
vi.mock('../components/Auth/EsqueciSenha', () => ({ EsqueciSenha: () => <div>Esqueci page</div> }));
vi.mock('../components/Auth/Adm', () => ({ Adm: () => <div>Adm page</div> }));
vi.mock('../components/Auth/AdmRegister', () => ({ AdmRegister: () => <div>Adm Register page</div> }));
vi.mock('../components/Admin/AdminHub', () => ({ AdminHub: () => <div>Admin Hub page</div> }));
vi.mock('../components/Admin/PossiveisClientes', () => ({ PossiveisClientes: () => <div>Possiveis page</div> }));
vi.mock('../components/Admin/AdminClients', () => ({ AdminClients: () => <div>Admin Clients page</div> }));
vi.mock('../components/Admin/AdminTickets', () => ({ AdminTickets: () => <div>Admin Tickets page</div> }));
vi.mock('../components/Admin/AdminTicketDetails', () => ({ AdminTicketDetails: () => <div>Admin Ticket details page</div> }));
vi.mock('../components/PreAgendamento/PreAtendimento', () => ({ PreAtendimento: () => <div>Pre Atendimento page</div> }));
vi.mock('../components/PreAgendamento/Agendamento', () => ({ Agendamento: () => <div>Agendamento page</div> }));
vi.mock('../components/PreAgendamento/PreAgendamento', () => ({ PreAgendamento: () => <div>Pre Agendamento page</div> }));
vi.mock('../components/PreAgendamento/PublicPreAgendamentoDocs', () => ({ PublicPreAgendamentoDocs: () => <div>Public docs page</div> }));
vi.mock('../components/Consulta/Consulta', () => ({ Consulta: () => <div>Consulta page</div> }));
vi.mock('../components/Teleconsulta/TeleconsultaPreparation', () => ({ TeleconsultaPreparation: () => <div>Tele prep page</div> }));
vi.mock('../components/Teleconsulta/TeleconsultaPatientWaiting', () => ({ TeleconsultaPatientWaiting: () => <div>Tele waiting page</div> }));
vi.mock('../components/Teleconsulta/TeleconsultaFinished', () => ({ TeleconsultaFinished: () => <div>Tele finished page</div> }));
vi.mock('../components/Exames/ExecucaoExames', () => ({ ExecucaoExames: () => <div>Execucao page</div> }));
vi.mock('../components/Laudo/LaudoConfiguracoes', () => ({ LaudoConfiguracoes: () => <div>Laudo config page</div> }));
vi.mock('../components/LaudoExames/LaudoExames', () => ({ LaudoExames: () => <div>Laudo exames page</div> }));
vi.mock('../components/DicomViewer/DicomViewerPage', () => ({ DicomViewerPage: () => <div>Dicom page</div> }));
vi.mock('../components/Entrega/Entrega', () => ({ Entrega: () => <div>Entrega page</div> }));
vi.mock('../components/Estoque/Estoque', () => ({ Estoque: () => <div>Estoque page</div> }));
vi.mock('../components/Settings/SettingsPage', () => ({ SettingsPage: () => <div>Settings page</div> }));
vi.mock('../Financeiro/Financeiro', () => ({ Financeiro: () => <div>Financeiro page</div> }));
vi.mock('../Faturamento/Faturamento', () => ({ Faturamento: () => <div>Faturamento page</div> }));
vi.mock('../components/Medicos/CadastroMedico', () => ({ CadastroMedico: () => <div>Cadastro medico page</div> }));
vi.mock('../components/Patient/CadastroPaciente', () => ({ CadastroPaciente: () => <div>Cadastro paciente page</div> }));
vi.mock('../components/Procedimentos/CadastroProcedimento', () => ({ CadastroProcedimento: () => <div>Cadastro procedimento page</div> }));
vi.mock('../components/Convenios/CadastroConvenio', () => ({ CadastroConvenio: () => <div>Cadastro convenio page</div> }));
vi.mock('../components/Convenios/AutorizacaoConvenio', () => ({ AutorizacaoConvenio: () => <div>Autorizacao convenio page</div> }));
vi.mock('../components/Company/CadastroCliente', () => ({ CadastroCliente: () => <div>Cadastro cliente page</div> }));
vi.mock('../components/Salas/CadastroSala', () => ({ CadastroSala: () => <div>Cadastro sala page</div> }));
vi.mock('../components/Equipamentos/CadastroEquipamento', () => ({ CadastroEquipamento: () => <div>Cadastro equipamento page</div> }));
vi.mock('../components/Anamnese/CadastroAnamnese', () => ({ CadastroAnamnese: () => <div>Cadastro anamnese page</div> }));
vi.mock('../components/Enfermagem/CadastroEnfermagem', () => ({ CadastroEnfermagem: () => <div>Cadastro enfermagem page</div> }));
vi.mock('../components/TEA/CadastroTEA', () => ({ CadastroTEA: () => <div>Cadastro TEA page</div> }));
vi.mock('../components/TEA/TeaHome', () => ({ TeaHome: () => <div>Tea Home page</div> }));
vi.mock('../components/Settings/WhatsAppPage', () => ({ WhatsAppPage: () => <div>WhatsApp page</div> }));
vi.mock('../components/Communication/Conversations', () => ({ Conversations: () => <div>Conversations page</div> }));
vi.mock('../components/TEA/TeaEvolucao', () => ({ TeaEvolucao: () => <div>Tea Evolucao page</div> }));
vi.mock('../components/TEA/TeaPIT', () => ({ TeaPIT: () => <div>Tea PIT page</div> }));
vi.mock('../components/TEA/TeaRelatorios', () => ({ TeaRelatorios: () => <div>Tea Relatorios page</div> }));
vi.mock('../components/TEA/TeaPreReserva', () => ({ TeaPreReserva: () => <div>Tea Pre Reserva page</div> }));
vi.mock('../components/TEA/TeaDesmarcacaoLote', () => ({ TeaDesmarcacaoLote: () => <div>Tea Desmarcacao page</div> }));
vi.mock('../components/TEA/TeaAgendaSemanal', () => ({ TeaAgendaSemanal: () => <div>Tea Agenda page</div> }));
vi.mock('../components/TEA/TeaEvolucaoTemplates', () => ({ TeaEvolucaoTemplates: () => <div>Tea templates page</div> }));
vi.mock('../components/PublicCheckIn/PublicCheckIn', () => ({ PublicCheckIn: () => <div>Public checkin page</div> }));
vi.mock('../components/PatientQueue/PatientQueuePage', () => ({ PatientQueuePage: () => <div>Patient queue page</div> }));
vi.mock('../components/common/TicketFab', () => ({ TicketFab: () => <div>TicketFab</div> }));
vi.mock('../components/Tickets/MyTicketsPage', () => ({ MyTicketsPage: () => <div>My tickets page</div> }));
vi.mock('../components/Tickets/MyTicketDetailsPage', () => ({ MyTicketDetailsPage: () => <div>My ticket details page</div> }));
vi.mock('../components/PatientPortal/PatientPortalLogin', () => ({ PatientPortalLogin: () => <div>Portal login page</div> }));
vi.mock('../components/PatientPortal/PatientPortalDashboard', () => ({ PatientPortalDashboard: () => <div>Portal dashboard page</div> }));

describe('App routes', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.currentUser = null;
    authState.isPatientAuthenticated = false;
    authState.isDoctor = false;
    window.history.pushState({}, '', '/login');
  });

  it('redirects unauthenticated user from protected route to login', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('redirects non-adm-only user away from adm-hub', async () => {
    authState.isAuthenticated = true;
    authState.currentUser = { id: 'u1', isAdmHubOnly: false };
    window.history.pushState({}, '', '/adm-hub');

    render(<App />);
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('redirects adm-only user to adm-hub when accessing non-allowed path', async () => {
    authState.isAuthenticated = true;
    authState.currentUser = { id: 'u1', isAdmHubOnly: true };
    window.history.pushState({}, '', '/dashboard');

    render(<App />);
    expect(await screen.findByText('Admin Hub page')).toBeInTheDocument();
  });

  it('redirects doctor user from settings to dashboard', async () => {
    authState.isAuthenticated = true;
    authState.currentUser = { id: 'u1' };
    authState.isDoctor = true;
    window.history.pushState({}, '', '/settings');

    render(<App />);
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('handles patient portal auth guards and legacy docs redirect', async () => {
    window.history.pushState({}, '', '/portal');
    render(<App />);
    expect(await screen.findByText('Portal login page')).toBeInTheDocument();

    authState.isPatientAuthenticated = true;
    window.history.pushState({}, '', '/portal/login');
    render(<App />);
    expect(await screen.findByText('Portal dashboard page')).toBeInTheDocument();

    window.history.pushState({}, '', '/pre-agendamento/documentos/token 1');
    render(<App />);
    expect(await screen.findByText('Public docs page')).toBeInTheDocument();
  });

  it('handles auth and color scheme events without crashing', () => {
    render(<App />);

    act(() => {
      window.dispatchEvent(new Event('auth:changed'));
      window.dispatchEvent(new Event('patient-auth:changed'));
      window.dispatchEvent(new Event(APP_COLOR_SCHEME_EVENT));
      window.dispatchEvent(new Event('storage'));
    });

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
