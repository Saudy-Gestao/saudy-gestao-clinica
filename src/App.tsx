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

function App() {
  const [colorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'mantine-color-scheme',
    defaultValue: 'light',
  });

  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <Notifications position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-a-senha" element={<EsqueciSenha />} />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/pre-atendimento" 
            // element={isAuthenticated ? <PreAgendamento /> : <Navigate to="/login" replace />} 
            element={<PreAtendimento />} 
          />          <Route 
            path="/agendamento" 
            // element={isAuthenticated ? <Agendamento /> : <Navigate to="/login" replace />} 
            element={<Agendamento />} 
          />
          <Route 
            path="/consulta" 
            // element={isAuthenticated ? <Consulta /> : <Navigate to="/login" replace />} 
            element={<Consulta />} 
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
