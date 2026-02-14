import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Text, Stack, Group, Anchor } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import authService from '../../services/authService';

export function Login() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha todos os campos',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.login({ email, password });
      notifications.show({
        title: 'Sucesso',
        message: 'Login realizado com sucesso',
        color: 'green',
      });
      navigate('/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.message || 'Erro ao fazer login',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }; 



  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        backgroundColor: isMobile ? DARK_BLUE : 'white',
      }}
    >
      {/* Left/Top Side - Blue with Logo */}
      <Box
        style={{
          width: isMobile ? '100%' : '50%',
          height: isMobile ? '35vh' : '100vh',
          backgroundColor: DARK_BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <Stack align="center" gap="lg">
          <Box
            bg="white"
            w={isMobile ? 80 : 120}
            h={isMobile ? 80 : 120}
            style={{ borderRadius: 16 }}
          />
          <Text c="white" size={isMobile ? "1.5rem" : "2rem"} fw={600}>
            Saudy
          </Text>
        </Stack>
      </Box>

      {/* Right/Bottom Side - Login Form */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '1rem 1.5rem' : '3rem',
          backgroundColor: 'white',
          borderTopLeftRadius: isMobile ? '30px' : '0',
          borderTopRightRadius: isMobile ? '30px' : '0',
          marginTop: isMobile ? '-20px' : '0', // Slight overlap to ensure no gap
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box w="100%" maw={420}>
          <Stack gap="lg">
            <Box mb="xl" ta="center">
              <Text size="xl" fw={600}>Acesse sua conta</Text>
            </Box>

            <Box className="floating-field">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                aria-label="E-mail"
              />
              <label>E-mail</label>
            </Box>

            <Box>
              <Box className="floating-field">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  aria-label="Senha"
                />
                <label>Senha</label>
              </Box>
              <Group justify="flex-end" mt="xs">
                <Anchor
                  size="sm"
                  c="blue"
                  onClick={() => navigate('/esqueci-a-senha')}
                  style={{ cursor: 'pointer' }}
                >
                  Esqueci a senha
                </Anchor>
              </Group>
            </Box>

            <Button
              fullWidth
              size="lg"
              bg={DARK_BLUE}
              onClick={handleLogin}
              loading={loading}
              mt="md"
              styles={{
                root: {
                  height: '56px',
                  borderRadius: '8px',
                }
              }}
            >
              Acessar conta
            </Button>

            <Button
              fullWidth
              size="lg"
              variant="outline"
              c={DARK_BLUE}
              styles={{
                root: {
                  borderColor: DARK_BLUE,
                  height: '56px',
                  borderRadius: '8px',
                  borderWidth: '2px',
                }
              }}
              onClick={() => navigate('/cadastro')}
            >
              Criar conta
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
