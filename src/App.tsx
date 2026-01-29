import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';
import { theme } from './themes/theme';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Login } from './components/Auth/Login';
import { Cadastro } from './components/Auth/Cadastro';
import { EsqueciSenha } from './components/Auth/EsqueciSenha';
import { PreAtendimento } from './components/PreAgendamento/PreAtendimento';
import { Agendamento } from './components/PreAgendamento/Agendamento';
import { Consulta } from './components/Consulta/Consulta';
import { Laudo } from './components/Laudo/Laudo';
import { Envelopamento } from './components/Envelopamento/Envelopamento';
import { Entrega } from './components/Entrega/Entrega';
import { Estoque } from './components/Estoque/Estoque';
import { SettingsPage } from './components/Settings/SettingsPage';
import { Financeiro } from './Financeiro/Financeiro';
import { Faturamento } from './Faturamento/Faturamento';
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = true;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const [colorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'mantine-color-scheme',
    defaultValue: 'light',
  });

  return (
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <Notifications position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={localStorage.getItem('token') ? <Navigate to="/dashboard" replace /> : <Login />} 
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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
