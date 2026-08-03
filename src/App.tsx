import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/pt-br';
import { theme } from './themes/theme';
import authService from './services/authService';
import { APP_COLOR_SCHEME_EVENT, getAppColorScheme, type AppColorScheme } from './utils/appColorScheme';
import { Dashboard } from './components/Dashboard/Dashboard';
import { BIGestao } from './components/BI/BIGestao';
import { Login } from './components/Auth/Login';
import { Cadastro } from './components/Auth/Cadastro';
import { EsqueciSenha } from './components/Auth/EsqueciSenha';
import { Adm } from './components/Auth/Adm';
import { AdmRegister } from './components/Auth/AdmRegister';
import { AdminHub } from './components/Admin/AdminHub';
import { PossiveisClientes } from './components/Admin/PossiveisClientes';
import { AdminClients } from './components/Admin/AdminClients';
import { AdminTickets } from './components/Admin/AdminTickets';
import { AdminTicketDetails } from './components/Admin/AdminTicketDetails';
import { AdminKnowledge } from './components/Admin/AdminKnowledge';
import { PreAtendimento } from './components/PreAgendamento/PreAtendimento';
import { Agendamento } from './components/PreAgendamento/Agendamento';
import { PreAgendamento } from './components/PreAgendamento/PreAgendamento';
import { PublicPreAgendamentoDocs } from './components/PreAgendamento/PublicPreAgendamentoDocs';
import { Consulta } from './components/Consulta/Consulta';
import { AtendimentoClinico } from './components/Consulta/AtendimentoClinico';
import { TeleconsultaPreparation } from './components/Teleconsulta/TeleconsultaPreparation';
import { TeleconsultaPatientWaiting } from './components/Teleconsulta/TeleconsultaPatientWaiting';
import { TeleconsultaFinished } from './components/Teleconsulta/TeleconsultaFinished';
import { ExecucaoExames } from './components/Exames/ExecucaoExames';
import { LaudoConfiguracoes } from './components/Laudo/LaudoConfiguracoes';
import { LaudoExames } from './components/LaudoExames/LaudoExames';
import { DicomViewerPage } from './components/DicomViewer/DicomViewerPage';
import { Entrega } from './components/Entrega/Entrega';
import { Estoque } from './components/Estoque/Estoque';
import { SettingsPage } from './components/Settings/SettingsPage';
import { Financeiro } from './Financeiro/Financeiro';
import { Faturamento } from './Faturamento/Faturamento';
import { CadastroMedico } from './components/Medicos/CadastroMedico';
import { CadastroPaciente } from './components/Patient/CadastroPaciente';
import { CadastroProcedimento } from './components/Procedimentos/CadastroProcedimento';
import { CadastroConvenio } from './components/Convenios/CadastroConvenio';
import { ConvenioForm } from './components/Convenios/ConvenioForm';
import { AutorizacaoConvenio } from './components/Convenios/AutorizacaoConvenio';
import { CadastroCliente } from './components/Company/CadastroCliente';
import { CadastroSala } from './components/Salas/CadastroSala';
import { CadastroEquipamento } from './components/Equipamentos/CadastroEquipamento';
import { CadastroAnamnese } from './components/Anamnese/CadastroAnamnese';
import { HistoricoAtendimentos } from './components/Historico/HistoricoAtendimentos';
import { CadastroEnfermagem } from './components/Enfermagem/CadastroEnfermagem';
import { CadastroTEA } from './components/TEA/CadastroTEA';
import { TeaHome } from './components/TEA/TeaHome';
import { WhatsAppPage } from './components/Settings/WhatsAppPage';
import { Conversations } from './components/Communication/Conversations';
import { TeaEvolucao } from './components/TEA/TeaEvolucao';
import { TeaPIT } from './components/TEA/TeaPIT';
import { TeaRelatorios } from './components/TEA/TeaRelatorios';
import { TeaPreReserva } from './components/TEA/TeaPreReserva';
import { TeaDesmarcacaoLote } from './components/TEA/TeaDesmarcacaoLote';
import { TeaAgendaSemanal } from './components/TEA/TeaAgendaSemanal';
import { TeaEvolucaoTemplates } from './components/TEA/TeaEvolucaoTemplates';
import { PublicCheckIn } from './components/PublicCheckIn/PublicCheckIn';
import { PrivacyPolicy } from './components/PrivacyPolicy/PrivacyPolicy';
import { TermsOfService } from './components/PrivacyPolicy/TermsOfService';
import { LGPDConsentBanner } from './components/common/LGPDConsentBanner';
import { PatientQueuePage } from './components/PatientQueue/PatientQueuePage';
import { TicketFab } from './components/common/TicketFab';
import { MyTicketsPage } from './components/Tickets/MyTicketsPage';
import { MyTicketDetailsPage } from './components/Tickets/MyTicketDetailsPage';
import { PatientPortalLogin } from './components/PatientPortal/PatientPortalLogin';
import { PatientPortalDashboard } from './components/PatientPortal/PatientPortalDashboard';
import { PatientPortalDicomViewer } from './components/PatientPortal/PatientPortalDicomViewer';
import patientPortalAuthService from './services/patientPortalAuthService';
import { hasModuleAccess, isAdminUser, isDoctorUser } from './utils/userRole';
import { useCurrentUserProfileQuery } from './hooks/useCurrentUserProfileQuery';
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentUser = authService.getCurrentUser() as any;
  const { data: profileUser } = useCurrentUserProfileQuery();
  const effectiveUser = (profileUser || currentUser) as any;
  const isAdmOnly = Boolean(effectiveUser?.isAdmHubOnly);
  const doctorView = isDoctorUser(effectiveUser);
  const adminView = isAdminUser(effectiveUser) || hasModuleAccess(effectiveUser, 'configuracoes');
  const admAllowedPaths = ['/adm-hub', '/cadastro-cliente', '/possiveis-clientes', '/adm-clientes', '/adm-tickets', '/adm-knowledge'];

  if (!isAdmOnly && location.pathname === '/adm-hub') {
    return <Navigate to="/dashboard" replace />;
  }

  const isAllowedForAdmOnly = admAllowedPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  if (isAdmOnly && !isAllowedForAdmOnly) {
    return <Navigate to="/adm-hub" replace />;
  }

  if (doctorView && !adminView && location.pathname === '/settings') {
    return <Navigate to="/dashboard" replace />;
  }

  const doctorBlockedPaths = ['/agendamento', '/pre-atendimento', '/pre-agendamento', '/autorizacao-e-recepcao'];
  const isDoctorBlockedPath = doctorBlockedPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  if (doctorView && isDoctorBlockedPath) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PatientPortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const isPatientAuthenticated = patientPortalAuthService.isAuthenticated();
  if (!isPatientAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
}

function LegacyPreSchedulingDocsRedirect() {
  const { token } = useParams();
  return <Navigate to={`/pre-atendimento/documentos/${encodeURIComponent(String(token || ''))}`} replace />;
}

function App() {
  const [colorScheme, setColorScheme] = useState<AppColorScheme>(getAppColorScheme);
  const [, setAuthVersion] = useState(0);
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser() as { isAdmHubOnly?: boolean } | null;
  const isAdmOnly = Boolean(currentUser?.isAdmHubOnly);
  const isPatientAuthenticated = patientPortalAuthService.isAuthenticated();

  useEffect(() => {
    const onAuthChanged = () => {
      setAuthVersion((prev) => prev + 1);
    };

    window.addEventListener('auth:changed', onAuthChanged);
    window.addEventListener('patient-auth:changed', onAuthChanged);
    return () => {
      window.removeEventListener('auth:changed', onAuthChanged);
      window.removeEventListener('patient-auth:changed', onAuthChanged);
    };
  }, []);

  useEffect(() => {
    const syncColorScheme = () => {
      setColorScheme(getAppColorScheme());
    };

    window.addEventListener(APP_COLOR_SCHEME_EVENT, syncColorScheme as EventListener);
    window.addEventListener('storage', syncColorScheme);

    return () => {
      window.removeEventListener(APP_COLOR_SCHEME_EVENT, syncColorScheme as EventListener);
      window.removeEventListener('storage', syncColorScheme);
    };
  }, []);

  return (
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <DatesProvider settings={{ locale: 'pt-br' }}>
        <Notifications
          position="top-right"
          autoClose={5000}
          transitionDuration={260}
          zIndex={4200}
          limit={5}
          classNames={{
            notification: 'saudy-toast',
          }}
        />
        <LGPDConsentBanner />
        <BrowserRouter>
          <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to={isAdmOnly ? '/adm-hub' : '/dashboard'} replace /> : <Login />} 
          />
          <Route
            path="/portal/login"
            element={isPatientAuthenticated ? <Navigate to="/portal" replace /> : <PatientPortalLogin />}
          />
          <Route
            path="/portal"
            element={<PatientPortalProtectedRoute><PatientPortalDashboard /></PatientPortalProtectedRoute>}
          />
          <Route
            path="/portal/dicom/:reportId"
            element={<PatientPortalProtectedRoute><PatientPortalDicomViewer /></PatientPortalProtectedRoute>}
          />
          <Route 
            path="/adm" 
            element={isAuthenticated ? <Navigate to="/adm-hub" replace /> : <Adm />}
          />
          <Route
            path="/adm-register"
            element={isAuthenticated ? <Navigate to="/adm-hub" replace /> : <AdmRegister />}
          />
          <Route 
            path="/adm-hub"
            element={<ProtectedRoute><AdminHub /></ProtectedRoute>}
          />
          <Route
            path="/possiveis-clientes"
            element={<ProtectedRoute><PossiveisClientes /></ProtectedRoute>}
          />
          <Route
            path="/adm-clientes"
            element={<ProtectedRoute><AdminClients /></ProtectedRoute>}
          />
          <Route
            path="/adm-tickets"
            element={<ProtectedRoute><AdminTickets /></ProtectedRoute>}
          />
          <Route
            path="/adm-tickets/:id"
            element={<ProtectedRoute><AdminTicketDetails /></ProtectedRoute>}
          />
          <Route
            path="/adm-knowledge"
            element={<ProtectedRoute><AdminKnowledge /></ProtectedRoute>}
          />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-a-senha" element={<EsqueciSenha />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/termos" element={<TermsOfService />} />
          <Route path="/check-in" element={<PublicCheckIn />} />
          <Route path="/check-in/:branchId" element={<PublicCheckIn />} />
          <Route path="/pre-atendimento/documentos/:token" element={<PublicPreAgendamentoDocs />} />
          <Route path="/pre-agendamento/documentos/:token" element={<LegacyPreSchedulingDocsRedirect />} />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
          />
          <Route
            path="/bi"
            element={<ProtectedRoute><BIGestao /></ProtectedRoute>}
          />
          <Route
            path="/fila-atendimento"
            element={<ProtectedRoute><PatientQueuePage /></ProtectedRoute>}
          />
          <Route
            path="/meus-chamados"
            element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>}
          />
          <Route
            path="/meus-chamados/:id"
            element={<ProtectedRoute><MyTicketDetailsPage /></ProtectedRoute>}
          />
          <Route 
            path="/settings" 
            element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} 
          />
          <Route
            path="/pre-atendimento"
            element={<ProtectedRoute><PreAgendamento /></ProtectedRoute>}
          />
          <Route
            path="/pre-agendamento"
            element={<Navigate to="/pre-atendimento" replace />}
          />
          <Route
            path="/autorizacao-e-recepcao"
            element={<ProtectedRoute><PreAtendimento /></ProtectedRoute>}
          />
          <Route 
            path="/agendamento" 
            element={<ProtectedRoute><Agendamento /></ProtectedRoute>} 
          />
          <Route
            path="/historico"
            element={<ProtectedRoute><HistoricoAtendimentos /></ProtectedRoute>}
          />
          <Route
            path="/consulta"
            element={<ProtectedRoute><Consulta /></ProtectedRoute>}
          />
          <Route
            path="/consulta/atendimento/:consultationId"
            element={<ProtectedRoute><AtendimentoClinico /></ProtectedRoute>}
          />
          <Route
            path="/teleconsulta/preparacao"
            element={<TeleconsultaPreparation />}
          />
          <Route
            path="/teleconsulta/paciente/espera"
            element={<TeleconsultaPatientWaiting />}
          />
          <Route
            path="/teleconsulta/finalizada"
            element={<TeleconsultaFinished />}
          />
          <Route
            path="/execucao-exames"
            element={<ProtectedRoute><ExecucaoExames /></ProtectedRoute>}
          />
          <Route
            path="/laudo-exames"
            element={<ProtectedRoute><LaudoExames /></ProtectedRoute>}
          />
          <Route
            path="/dicom-viewer/:key"
            element={<ProtectedRoute><DicomViewerPage /></ProtectedRoute>}
          />
          <Route
            path="/laudo-configuracoes"
            element={<ProtectedRoute><LaudoConfiguracoes /></ProtectedRoute>}
          />
          <Route
            path="/entrega"
            element={<ProtectedRoute><Entrega /></ProtectedRoute>}
          />
          <Route
            path="/estoque"
            element={<ProtectedRoute><Estoque /></ProtectedRoute>}
          />
          <Route
            path="/financeiro"
            element={<ProtectedRoute><Financeiro /></ProtectedRoute>}
          />
          <Route
            path="/faturamento"
            element={<ProtectedRoute><Faturamento /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-medico"
            element={<ProtectedRoute><CadastroMedico /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-procedimento"
            element={<ProtectedRoute><CadastroProcedimento /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-paciente"
            element={<ProtectedRoute><CadastroPaciente /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-convenio"
            element={<ProtectedRoute><CadastroConvenio /></ProtectedRoute>}
          />
          <Route
            path="/convenios/novo"
            element={<ProtectedRoute><ConvenioForm /></ProtectedRoute>}
          />
          <Route
            path="/convenios/:id"
            element={<ProtectedRoute><ConvenioForm /></ProtectedRoute>}
          />
          <Route
            path="/autorizacao-convenio"
            element={<ProtectedRoute><AutorizacaoConvenio /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-cliente"
            element={<ProtectedRoute><CadastroCliente /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-sala"
            element={<ProtectedRoute><CadastroSala /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-equipamento"
            element={<ProtectedRoute><CadastroEquipamento /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-anamnese"
            element={<ProtectedRoute><CadastroAnamnese /></ProtectedRoute>}
          />
          <Route
            path="/cadastro-enfermagem"
            element={<ProtectedRoute><CadastroEnfermagem /></ProtectedRoute>}
          />
          <Route
            path="/conversas"
            element={<ProtectedRoute><Conversations /></ProtectedRoute>}
          />
          <Route
            path="/whatsapp"
            element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>}
          />
          <Route
            path="/tea"
            element={<ProtectedRoute><TeaHome /></ProtectedRoute>}
          />
          <Route
            path="/tea/cadastro"
            element={<ProtectedRoute><CadastroTEA forcedSubmodule="cadastro" /></ProtectedRoute>}
          />
          <Route
            path="/tea/pacientes"
            element={<ProtectedRoute><CadastroTEA forcedSubmodule="pacientes" /></ProtectedRoute>}
          />
          <Route
            path="/tea/plano"
            element={<ProtectedRoute><CadastroTEA forcedSubmodule="plano" /></ProtectedRoute>}
          />
          <Route
            path="/tea/evolucao"
            element={<ProtectedRoute><TeaEvolucao /></ProtectedRoute>}
          />
          <Route
            path="/tea/pit"
            element={<ProtectedRoute><TeaPIT /></ProtectedRoute>}
          />
          <Route
            path="/tea/pre-reserva"
            element={<ProtectedRoute><TeaPreReserva /></ProtectedRoute>}
          />
          <Route
            path="/tea/relatorios"
            element={<ProtectedRoute><TeaRelatorios /></ProtectedRoute>}
          />
          <Route
            path="/tea/desmarcacao-lote"
            element={<ProtectedRoute><TeaDesmarcacaoLote /></ProtectedRoute>}
          />
          <Route
            path="/tea/agenda-semanal"
            element={<ProtectedRoute><TeaAgendaSemanal /></ProtectedRoute>}
          />
          <Route
            path="/tea/evolucao-templates"
            element={<ProtectedRoute><TeaEvolucaoTemplates /></ProtectedRoute>}
          />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <TicketFab />
        </BrowserRouter>
      </DatesProvider>
    </MantineProvider>
  );
}

export default App;
