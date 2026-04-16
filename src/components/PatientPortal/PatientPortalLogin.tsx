import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Anchor, Badge, Box, Button, Group, MantineProvider, Paper, PinInput, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CheckCircle2, LockKeyhole, MailCheck, Moon, ShieldCheck, Sun } from 'lucide-react';
import patientPortalAuthService from '../../services/patientPortalAuthService';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { formatCPF, isValidCPF, onlyDigits } from '../../utils/formatters';
import { usePatientPortalTheme } from './usePatientPortalTheme';
import { theme } from '../../themes/theme';
import './patient-portal.css';

export function PatientPortalLogin() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = usePatientPortalTheme();
  const portalColorScheme = isDark ? 'dark' : 'light';
  const [step, setStep] = useState<'identify' | 'verify'>('identify');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRetryAfterSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAfterSeconds]);

  const handleRequestCode = async () => {
    const cpfDigits = onlyDigits(cpf);
    if (!isValidCPF(cpfDigits)) {
      notifications.show({
        title: 'CPF inválido',
        message: 'Informe um CPF válido para continuar.',
        color: 'red',
      });
      return;
    }

    if (!birthDate) {
      notifications.show({
        title: 'Data obrigatória',
        message: 'Informe sua data de nascimento.',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await patientPortalAuthService.requestCode(cpfDigits, birthDate);
      setChallengeToken(response.challengeToken);
      setDestination(response.destination);
      setStep('verify');
      notifications.show({
        title: 'Código enviado',
        message: `Enviamos um código para ${response.destination}`,
        color: 'green',
      });
    } catch (error: any) {
      const retryAfter = Number(error?.response?.data?.retryAfterSeconds || 0);
      if (retryAfter > 0) setRetryAfterSeconds(retryAfter);
      notifications.show({
        title: 'Falha no acesso',
        message: resolveApiErrorMessage(error, 'Não foi possível solicitar o código.'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (onlyDigits(code).length !== 6) {
      notifications.show({
        title: 'Código inválido',
        message: 'Digite o código de 6 dígitos.',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await patientPortalAuthService.verifyCode(challengeToken, onlyDigits(code));
      notifications.show({
        title: 'Acesso liberado',
        message: 'Bem-vindo(a) ao Portal do Paciente.',
        color: 'green',
      });
      navigate('/portal');
    } catch (error: any) {
      const retryAfter = Number(error?.response?.data?.retryAfterSeconds || 0);
      if (retryAfter > 0) setRetryAfterSeconds(retryAfter);
      notifications.show({
        title: 'Código inválido',
        message: resolveApiErrorMessage(error, 'Não foi possível validar o código.'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MantineProvider theme={theme} forceColorScheme={portalColorScheme}>
      <Box className="patient-portal-login-page">
        <a href="#patient-portal-login-card" className="patient-portal-skip-link">Ir para formulário de acesso</a>
        <Box className="patient-portal-login-bg" />
        <Box className="patient-portal-login-grid">
          <Box className="patient-portal-login-hero">
            <Badge className="patient-portal-kicker" leftSection={<ShieldCheck size={13} />}>
              Acesso protegido
            </Badge>
            <Title className="patient-portal-hero-title">
              Seu histórico clínico em um espaço feito para pacientes.
            </Title>
            <Text className="patient-portal-hero-subtitle">
              Consulte consultas, exames e laudos com uma experiência simples e segura.
            </Text>

            <Stack gap="sm" mt="xl">
              <Group className="patient-portal-feature-item">
                <LockKeyhole size={16} />
                <Text size="sm">Código de acesso temporário por e-mail</Text>
              </Group>
              <Group className="patient-portal-feature-item">
                <CheckCircle2 size={16} />
                <Text size="sm">Visualização rápida dos seus atendimentos</Text>
              </Group>
              <Group className="patient-portal-feature-item">
                <MailCheck size={16} />
                <Text size="sm">Notificações e confirmação de identidade</Text>
              </Group>
            </Stack>
          </Box>

          <Paper className="patient-portal-login-card" withBorder id="patient-portal-login-card" role="main" aria-label="Acesso ao Portal do Paciente">
            <Stack gap="lg">
              <Group justify="space-between">
                <Title order={3} className="patient-portal-card-title">Portal do Paciente</Title>
                <Group gap="xs">
                  <ActionIcon variant="light" color="blue" radius="xl" onClick={toggleTheme} aria-label="Alternar tema">
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  </ActionIcon>
                  <img src="/logo.png" alt="Saudy" className="patient-portal-logo" />
                </Group>
              </Group>

              <Group gap="xs" className="patient-portal-steps">
                <Badge variant={step === 'identify' ? 'filled' : 'light'} color="blue">1. Identificação</Badge>
                <Badge variant={step === 'verify' ? 'filled' : 'light'} color="blue">2. Validação</Badge>
              </Group>

              {step === 'identify' ? (
                <Stack gap="md">
                  <Box className="patient-portal-input-wrap">
                    <label htmlFor="patient-cpf">CPF</label>
                    <input
                      id="patient-cpf"
                      value={cpf}
                      onChange={(event) => setCpf(formatCPF(event.currentTarget.value))}
                      inputMode="numeric"
                      maxLength={14}
                      placeholder="000.000.000-00"
                    />
                  </Box>

                  <Box className="patient-portal-input-wrap">
                    <label htmlFor="patient-birth-date">Data de nascimento</label>
                    <input
                      id="patient-birth-date"
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.currentTarget.value)}
                    />
                  </Box>

                  <Button className="patient-portal-primary-btn" onClick={handleRequestCode} loading={loading} disabled={retryAfterSeconds > 0}>
                    {retryAfterSeconds > 0 ? `Tente novamente em ${retryAfterSeconds}s` : 'Enviar código de acesso'}
                  </Button>
                </Stack>
              ) : (
                <Stack gap="md">
                  <Box className="patient-portal-code-box">
                    <Text size="sm" c="dimmed">Código enviado para</Text>
                    <Text fw={700}>{destination}</Text>
                  </Box>

                  <Group justify="center">
                    <PinInput
                      length={6}
                      type="number"
                      oneTimeCode
                      value={code}
                      onChange={setCode}
                      size="lg"
                    />
                  </Group>

                  <Button className="patient-portal-primary-btn" onClick={handleVerifyCode} loading={loading} disabled={retryAfterSeconds > 0}>
                    {retryAfterSeconds > 0 ? `Aguarde ${retryAfterSeconds}s` : 'Entrar no portal'}
                  </Button>

                  <Group justify="space-between">
                    <Anchor size="sm" onClick={() => { setStep('identify'); setCode(''); }} style={{ cursor: 'pointer' }}>
                      Alterar dados
                    </Anchor>
                    <Anchor size="sm" onClick={retryAfterSeconds > 0 ? undefined : handleRequestCode} style={{ cursor: retryAfterSeconds > 0 ? 'not-allowed' : 'pointer', opacity: retryAfterSeconds > 0 ? 0.55 : 1 }}>
                      Reenviar código
                    </Anchor>
                  </Group>
                </Stack>
              )}

              <Text ta="center" size="sm" c="dimmed">
                Área administrativa? <Anchor href="/login">Acesse aqui</Anchor>
              </Text>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </MantineProvider>
  );
}
