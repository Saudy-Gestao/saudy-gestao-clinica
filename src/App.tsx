import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MantineProvider } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/pt-br';
import { theme } from './themes/theme';
import authService from './services/authService';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Login } from './components/Auth/Login';
import { Cadastro } from './components/Auth/Cadastro';
import { EsqueciSenha } from './components/Auth/EsqueciSenha';
import { Adm } from './components/Auth/Adm';
import { AdmRegister } from './components/Auth/AdmRegister';
import { AdminHub } from './components/Admin/AdminHub';
import { PreAtendimento } from './components/PreAgendamento/PreAtendimento';
import { Agendamento } from './components/PreAgendamento/Agendamento';
import { Consulta } from './components/Consulta/Consulta';
import { Laudo } from './components/Laudo/Laudo';
import { LaudoConfiguracoes } from './components/Laudo/LaudoConfiguracoes';
import { LaudoExames } from './components/LaudoExames/LaudoExames';
import { DicomViewerPage } from './components/DicomViewer/DicomViewerPage';
import { OhifViewer } from './components/OhifViewer/OhifViewer';
import { Envelopamento } from './components/Envelopamento/Envelopamento';
import { Entrega } from './components/Entrega/Entrega';
import { Estoque } from './components/Estoque/Estoque';
import { SettingsPage } from './components/Settings/SettingsPage';
import { Financeiro } from './Financeiro/Financeiro';
import { Faturamento } from './Faturamento/Faturamento';
import { CadastroMedico } from './components/Medicos/CadastroMedico';
import { CadastroPaciente } from './components/Patient/CadastroPaciente';
import { CadastroProcedimento } from './components/Procedimentos/CadastroProcedimento';
import { CadastroConvenio } from './components/Convenios/CadastroConvenio';
import { AutorizacaoConvenio } from './components/Convenios/AutorizacaoConvenio';
import { CadastroCliente } from './components/Company/CadastroCliente';
import { CadastroSala } from './components/Salas/CadastroSala';
import { CadastroTEA } from './components/TEA/CadastroTEA';
import { TeaHome } from './components/TEA/TeaHome';
import { TeaEvolucao } from './components/TEA/TeaEvolucao';
import { TeaPIT } from './components/TEA/TeaPIT';
import { TeaRelatorios } from './components/TEA/TeaRelatorios';
import { TeaPreReserva } from './components/TEA/TeaPreReserva';
import { TeaDesmarcacaoLote } from './components/TEA/TeaDesmarcacaoLote';
import { TeaAgendaSemanal } from './components/TEA/TeaAgendaSemanal';
import { TeaEvolucaoTemplates } from './components/TEA/TeaEvolucaoTemplates';
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentUser = authService.getCurrentUser() as { isAdmHubOnly?: boolean } | null;
  const isAdmOnly = Boolean(currentUser?.isAdmHubOnly);
  const admAllowedPaths = ['/adm-hub', '/cadastro-cliente'];

  if (!isAdmOnly && location.pathname === '/adm-hub') {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAdmOnly && !admAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/adm-hub" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [colorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'mantine-color-scheme',
    defaultValue: 'dark',
  });
  const [, setAuthVersion] = useState(0);
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser() as { isAdmHubOnly?: boolean } | null;
  const isAdmOnly = Boolean(currentUser?.isAdmHubOnly);

  useEffect(() => {
    const onAuthChanged = () => {
      setAuthVersion((prev) => prev + 1);
    };

    window.addEventListener('auth:changed', onAuthChanged);
    return () => {
      window.removeEventListener('auth:changed', onAuthChanged);
    };
  }, []);

  return (
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <DatesProvider settings={{ locale: 'pt-br' }}>
        <Notifications position="top-right" />
        <BrowserRouter>
          <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to={isAdmOnly ? '/adm-hub' : '/dashboard'} replace /> : <Login />} 
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
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-a-senha" element={<EsqueciSenha />} />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
          />
          <Route 
            path="/settings" 
            element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} 
          />
          <Route 
            path="/pre-atendimento" 
            element={<ProtectedRoute><PreAtendimento /></ProtectedRoute>} 
          />
          <Route 
            path="/agendamento" 
            element={<ProtectedRoute><Agendamento /></ProtectedRoute>} 
          />
          <Route 
            path="/consulta" 
            element={<ProtectedRoute><Consulta /></ProtectedRoute>} 
          />
          <Route
            path="/laudo"
            element={<ProtectedRoute><Laudo /></ProtectedRoute>}
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
            path="/ohif/:key"
            element={<ProtectedRoute><OhifViewer /></ProtectedRoute>}
          />
          <Route
            path="/laudo-configuracoes"
            element={<ProtectedRoute><LaudoConfiguracoes /></ProtectedRoute>}
          />
          <Route
            path="/envelopamento"
            element={<ProtectedRoute><Envelopamento /></ProtectedRoute>}
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
        </BrowserRouter>
      </DatesProvider>
    </MantineProvider>
  );
}

export default App;
