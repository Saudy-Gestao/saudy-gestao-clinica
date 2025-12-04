import { useState, useEffect } from 'react';
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Text,
  Container,
  Button,
  Stack,
  Alert,
  Box,
} from '@mantine/core';
import { IconAlertCircle, IconLogin, IconStethoscope } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
      navigate('/dashboard');
      } else {
        setError('Email ou senha inválidos');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--mantine-color-body)',
        padding: '20px',
      }}
    >
      <Container size={520}>
        <Stack gap="xl" align="center">
          {/* Logo e Header */}
          <Box style={{ textAlign: 'center' }}>
            <Box
              style={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #2ec5b6 0%, #26a99c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(46, 197, 182, 0.3)',
              }}
              aria-hidden="true"
            >
              <IconStethoscope size={48} color="white" stroke={2} />
            </Box>
            <Title order={1} fw={600} size="2rem">
              Saudy Gestão Clínica
            </Title>
            
          </Box>

          {/* Form Card */}
          <Paper 
            radius="xl" 
            p="xl" 
            withBorder 
            shadow="md"
            style={{
              width: '100%',
              backgroundColor: 'var(--mantine-color-default)',
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <form onSubmit={handleSubmit} aria-label="Formulário de login">
              <Stack gap="lg">
                <Box>
                  <Text size="lg" fw={600} mb="md">
                    Entrar no sistema
                  </Text>
                  <Text size="sm" c="dimmed">
                    Digite suas credenciais para acessar
                  </Text>
                </Box>

                <TextInput
                  label="Email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                  size="md"
                  radius="md"
                  styles={{
                    label: {
                      fontWeight: 500,
                      marginBottom: 8,
                    },
                  }}
                  aria-required="true"
                  autoComplete="email"
                />

                <PasswordInput
                  label="Senha"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  required
                  size="md"
                  radius="md"
                  styles={{
                    label: {
                      fontWeight: 500,
                      marginBottom: 8,
                    },
                  }}
                  aria-required="true"
                  autoComplete="current-password"
                />

                {error && (
                  <Alert 
                    icon={<IconAlertCircle size={18} />} 
                    color="red" 
                    variant="light"
                    radius="md"
                    role="alert"
                  >
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  loading={loading}
                  leftSection={<IconLogin size={18} />}
                  color="teal"
                  radius="md"
                  styles={{
                    root: {
                      height: 48,
                      fontSize: 16,
                      fontWeight: 500,
                    },
                  }}
                  aria-label="Entrar no sistema"
                >
                  Entrar
                </Button>
              </Stack>
            </form>
          </Paper>

          
        </Stack>
      </Container>
    </Box>
  );
}
