import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Text, Group, TextInput } from '@/components/ui';
import { notifications } from '@/components/ui';
import authService from '../../services/authService';
import { resolveApiErrorMessage } from '../../lib/apiError';

export function AdmRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const previousScheme = root.getAttribute('data-color-scheme');

    root.setAttribute('data-color-scheme', 'light');

    return () => {
      if (previousScheme) root.setAttribute('data-color-scheme', previousScheme);
      else root.removeAttribute('data-color-scheme');
    };
  }, []);

  const passwordStrength = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid =
    passwordStrength.minLength &&
    passwordStrength.hasNumber &&
    passwordStrength.hasSpecialChar;

  const handleRequestCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password || !confirmPassword) {
      notifications.show({ title: 'Erro', message: 'Preencha todos os campos', color: 'red' });
      return;
    }

    if (password !== confirmPassword) {
      notifications.show({ title: 'Erro', message: 'As senhas não coincidem', color: 'red' });
      return;
    }

    if (!isPasswordValid) {
      notifications.show({
        title: 'Erro',
        message: 'A senha deve ter no mínimo 8 caracteres, 1 número e 1 caractere especial',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.requestAdmRegisterCode({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });

      notifications.show({ title: 'Sucesso', message: 'Código enviado para o e-mail informado', color: 'green' });
      setStep('code');
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Falha ao enviar código'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      notifications.show({ title: 'Erro', message: 'Informe o código recebido por e-mail', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      await authService.verifyAdmRegisterCode({ email: email.trim().toLowerCase(), code: code.trim() });
      notifications.show({ title: 'Sucesso', message: 'Administrador confirmado com sucesso', color: 'green' });
      navigate('/adm-hub');
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Código inválido'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-light" style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8f9fa' }}>
      <Box
        style={{
          width: '40%',
          minWidth: 320,
          backgroundColor: '#0A2568',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '3rem',
        }}
      >
        <Box bg="white" w={100} h={100} style={{ borderRadius: 16, marginBottom: 12 }} />
        <Text c="white" size="2rem" fw={600}>Saudy</Text>
        <Text c="white" mt="xs">Registro Administrador</Text>
      </Box>

      <Box
        className="login-right-panel"
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', backgroundColor: '#ffffff' }}
      >
        <Box w="100%" maw={460}>
          <Stack gap="lg">
            <Box ta="center">
              <Text size="xl" fw={600}>Cadastrar ADM Hub</Text>
            </Box>

            {step === 'form' ? (
              <>
                <TextInput label="Nome" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
                <TextInput label="E-mail" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
                <TextInput label="Senha" type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
                <Box>
                  <Text size="xs" c="dimmed" mb={6}>A senha deve conter:</Text>
                  <Stack gap={2}>
                    <Text size="xs" c={passwordStrength.minLength ? 'teal' : 'red'}>
                      {passwordStrength.minLength ? 'OK' : 'X'} No mínimo 8 caracteres
                    </Text>
                    <Text size="xs" c={passwordStrength.hasNumber ? 'teal' : 'red'}>
                      {passwordStrength.hasNumber ? 'OK' : 'X'} Pelo menos 1 número
                    </Text>
                    <Text size="xs" c={passwordStrength.hasSpecialChar ? 'teal' : 'red'}>
                      {passwordStrength.hasSpecialChar ? 'OK' : 'X'} Pelo menos 1 caractere especial
                    </Text>
                  </Stack>
                </Box>
                <TextInput label="Confirmar senha" type="password" value={confirmPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} />

                <Button fullWidth size="lg" bg={'#0A2568'} onClick={handleRequestCode} loading={loading}>
                  Enviar código de validação
                </Button>
              </>
            ) : (
              <>
                <TextInput label="Código do e-mail" value={code} onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)} />

                <Button fullWidth size="lg" bg={'#0A2568'} onClick={handleVerifyCode} loading={loading}>
                  Confirmar código e entrar
                </Button>

                <Button variant="subtle" onClick={() => setStep('form')}>
                  Editar dados e reenviar código
                </Button>
              </>
            )}

            <Group justify="center">
              <Button variant="subtle" c="dimmed" size="sm" onClick={() => navigate('/adm')}>
                Voltar para login ADM
              </Button>
            </Group>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
