import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Text, Stack, Group, Anchor, Image, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Eye, EyeOff } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';
import authService from '../../services/authService';

export function Login() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leftImageSrc, setLeftImageSrc] = useState('/medicos.png');

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
        message: error.response?.data?.message || error.response?.data?.error || 'Erro ao fazer login',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }; 



  return (
    <Box
      className="login-light"
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        padding: 0,
      }}
    >
      <Box
        style={{
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr',
          backgroundColor: 'white',
          overflow: 'hidden',
        }}
      >
        <Box
          className="login-left-panel"
          style={{
            backgroundColor: DARK_BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '2rem 1rem' : '3rem',
            minHeight: isMobile ? 300 : 'auto',
          }}
        >
          <img
            src={leftImageSrc}
            alt="Equipe medica"
            onError={() => setLeftImageSrc('/logo.png')}
            loading="eager"
            decoding="sync"
            style={{
              width: isMobile ? '70%' : '74%',
              maxWidth: 560,
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Box>

        <Box
          className="login-right-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '2rem 1.5rem' : '3rem 4.5rem',
            backgroundColor: 'white',
          }}
        >
          <Box w="100%" maw={420}>
            <Stack gap="lg">
              <Stack align="center" gap={8} mb="md">
                <Image src="/logo.png" alt="Saudy" fit="contain" style={{ width: 64, height: 64 }} />
                <Text ta="center" fw={700} c={DARK_BLUE} lh={1} style={{ fontSize: isMobile ? '2.25rem' : '2.75rem' }}>
                  Saudy
                </Text>
              </Stack>

              <Box mb="sm" ta="center">
                <Text size="2.2rem" c="#2e2e2e">
                  Bem-vindo de volta!
                </Text>
              </Box>

              <Box className="floating-field">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  aria-label="E-mail/CPF"
                />
                <label>E-mail/CPF</label>
              </Box>

              <Box>
                <Box className="floating-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    aria-label="Senha"
                    style={{ paddingRight: 36 }}
                  />
                  <label>Senha</label>
                  <ActionIcon
                    variant="transparent"
                    color="dark"
                    size="sm"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 1,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} color="#001F54" /> : <Eye size={18} color="#001F54" />}
                  </ActionIcon>
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
                mt="sm"
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
                c="#2e2e2e"
                styles={{
                  root: {
                    borderColor: '#adb5bd',
                    height: '56px',
                    borderRadius: '8px',
                    borderWidth: '1px',
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
    </Box>
  );
}
