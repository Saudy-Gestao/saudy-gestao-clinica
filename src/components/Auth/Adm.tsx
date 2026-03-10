import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Text, Group, Anchor } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import authService from '../../services/authService';
import { FloatingInput } from '../common/FloatingInput';

export function Adm() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (err: unknown) => {
    if (err && typeof err === 'object') {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      if (anyErr.response?.data?.message) return anyErr.response.data.message;
      if (anyErr.message) return anyErr.message;
    }
    return 'Erro ao fazer login';
  };

  const handleLogin = async () => {
    if (!login || !password) {
      notifications.show({ title: 'Erro', message: 'Preencha todos os campos', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.loginAdm({ email: login, password });

      if (!response?.user || !(response.user as any).isAdmHubOnly) {
        authService.logout();
        notifications.show({
          title: 'Acesso negado',
          message: 'Esta conta não possui acesso ao ADM Hub',
          color: 'red',
        });
        return;
      }

      notifications.show({ title: 'Sucesso', message: 'Login ADM realizado', color: 'green' });
      navigate('/adm-hub');
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      notifications.show({ title: 'Erro', message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8f9fa' }}>
      <Box
        style={{
          width: '40%',
          minWidth: 320,
          backgroundColor: DARK_BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '3rem',
        }}
      >
        <Box bg="white" w={100} h={100} style={{ borderRadius: 16, marginBottom: 12 }} />
        <Text c="white" size="2rem" fw={600}>Saudy</Text>
        <Text c="white" mt="xs">Área Administrativa</Text>
      </Box>

      <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <Box w="100%" maw={420}>
          <Stack gap="lg">
            <Box ta="center">
              <Text size="xl" fw={600}>Login ADM</Text>
              <Text c="dimmed" size="sm">Acesse a área administrativa</Text>
            </Box>

            <FloatingInput label="E-mail / Usuário" value={login} onChange={(e: ChangeEvent<HTMLInputElement>) => setLogin(e.target.value)} />
            <FloatingInput label="Senha" type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />

            <Group justify="flex-end">
              <Anchor size="sm" c="blue" style={{ cursor: 'pointer' }} onClick={() => navigate('/esqueci-a-senha')}>
                Esqueci a senha
              </Anchor>
            </Group>

            <Button fullWidth size="lg" bg={DARK_BLUE} onClick={handleLogin} loading={loading} styles={{ root: { height: '56px', borderRadius: '8px' } }}>
              Entrar
            </Button>

            <Button fullWidth size="md" variant="outline" c={DARK_BLUE} onClick={() => navigate('/adm-register')}>
              Registrar
            </Button>

            <Button variant="subtle" c="dimmed" size="sm" onClick={() => navigate('/login')}>
              Voltar
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
