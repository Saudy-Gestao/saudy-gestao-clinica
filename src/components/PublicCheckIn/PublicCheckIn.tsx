import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Camera, CircleAlert, ClipboardCheck, LogIn, LogOut, RefreshCcw, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { FacialCapture } from '../common/FacialCapture';
import facialRecognitionService, { type FacialScanResponse } from '../../services/facialRecognitionService';
import publicCheckInService, { type PublicCheckInResponse } from '../../services/publicCheckInService';
import { usePublicBranchInfoQuery } from '../../hooks/usePublicBranchInfoQuery';
import { queryKeys } from '../../lib/queryKeys';
import publicCheckInSessionService from '../../services/publicCheckInSessionService';

const DARK_SURFACE = '#0F1838';
const CARD_SURFACE = '#162552';

const formatCpf = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value || '-';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const onlyDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

const statusConfig: Record<string, { color: string; label: string }> = {
  QUEUED: { color: 'green', label: 'Na fila de atendimento' },
  NO_CONFIRMED_APPOINTMENTS: { color: 'yellow', label: 'Sem agendamento confirmado' },
  PATIENT_NOT_FOUND: { color: 'red', label: 'Paciente não encontrado' },
  FACIAL_NOT_RECOGNIZED: { color: 'red', label: 'Rosto não reconhecido' },
};

export function PublicCheckIn() {
  const { branchId: branchIdParam } = useParams();
  const branchId = branchIdParam || '';
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(() => publicCheckInSessionService.isAuthenticated());
  const [currentUserName, setCurrentUserName] = useState(() => publicCheckInSessionService.getCurrentUser()?.name || '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [facialCaptureOpen, setFacialCaptureOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<FacialScanResponse | null>(null);
  const [checkInResult, setCheckInResult] = useState<PublicCheckInResponse | null>(null);
  const [branchLookupError, setBranchLookupError] = useState<string | null>(null);
  const [firstTimeMode, setFirstTimeMode] = useState(false);
  const [firstTimeCpf, setFirstTimeCpf] = useState('');
  const [firstTimeLookupLoading, setFirstTimeLookupLoading] = useState(false);
  const [firstTimeRegistering, setFirstTimeRegistering] = useState(false);
  const [pendingFirstTimeCheckIn, setPendingFirstTimeCheckIn] = useState<PublicCheckInResponse | null>(null);
  const { data: branchInfo, error: branchInfoError, isLoading: branchInfoLoading } = usePublicBranchInfoQuery(branchId, isAuthenticated);

  const currentStatus = useMemo(() => {
    const status = checkInResult?.status || '';
    return statusConfig[status] || null;
  }, [checkInResult]);

  const resetFlow = () => {
    setRecognitionResult(null);
    setCheckInResult(null);
    setFirstTimeMode(false);
    setFirstTimeCpf('');
    setPendingFirstTimeCheckIn(null);
  };

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(publicCheckInSessionService.isAuthenticated());
      setCurrentUserName(publicCheckInSessionService.getCurrentUser()?.name || '');
    };

    syncAuthState();
    const eventName = publicCheckInSessionService.getAuthChangedEventName();
    window.addEventListener(eventName, syncAuthState);
    return () => window.removeEventListener(eventName, syncAuthState);
  }, []);

  useEffect(() => {
    if (!checkInResult) return;

    const timer = window.setTimeout(() => {
      resetFlow();
    }, 10000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [checkInResult]);

  useEffect(() => {
    if (!branchId) {
      setBranchLookupError('URL do totem sem filial configurada.');
      return;
    }
    if (!isAuthenticated) {
      setBranchLookupError(null);
      return;
    }
    if (!branchInfoError) {
      setBranchLookupError(null);
      return;
    }
    const error: any = branchInfoError;
    setBranchLookupError(error?.response?.data?.error || 'Não foi possível identificar a filial configurada.');
  }, [branchId, branchInfoError, isAuthenticated]);

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      showNotification({
        title: 'Login necessário',
        message: 'Informe email e senha para ligar o modo totem.',
        color: 'yellow',
      });
      return;
    }

    setLoginLoading(true);
    try {
      await publicCheckInSessionService.login({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
      setLoginPassword('');
      setIsAuthenticated(true);
      setCurrentUserName(publicCheckInSessionService.getCurrentUser()?.name || '');
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicBranchInfo, branchId] });
      showNotification({
        title: 'Totem liberado',
        message: 'Login realizado com sucesso. O check-in já está pronto para uso.',
        color: 'green',
      });
    } catch (error: any) {
      showNotification({
        title: 'Erro ao entrar',
        message: error?.response?.data?.message || 'Não foi possível autenticar este usuário.',
        color: 'red',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const completeLogout = async () => {
    publicCheckInSessionService.logout();
    setIsAuthenticated(false);
    setCurrentUserName('');
    setLoginPassword('');
    setLogoutPassword('');
    setRecognitionResult(null);
    setCheckInResult(null);
    setPendingFirstTimeCheckIn(null);
    await queryClient.removeQueries({ queryKey: [...queryKeys.publicBranchInfo, branchId] });
  };

  const handleLogout = async () => {
    const currentUser = publicCheckInSessionService.getCurrentUser();
    if (!currentUser?.email || !logoutPassword) {
      showNotification({
        title: 'Confirmação necessária',
        message: 'Digite a senha do usuário autenticado para encerrar o totem.',
        color: 'yellow',
      });
      return;
    }

    setLogoutLoading(true);
    try {
      await publicCheckInSessionService.login({
        email: currentUser.email,
        password: logoutPassword,
      });
      await completeLogout();
      setLogoutModalOpen(false);
      showNotification({
        title: 'Totem encerrado',
        message: 'O check-in foi desligado neste navegador.',
        color: 'green',
      });
    } catch {
      showNotification({
        title: 'Senha incorreta',
        message: 'Não foi possível encerrar o totem com a senha informada.',
        color: 'red',
      });
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleFacialScan = async (imageBase64: string) => {
    if (!branchId) {
      setCheckInResult({
        status: 'PATIENT_NOT_FOUND',
        message: 'Este totem precisa ser acessado com uma filial configurada na URL.',
      });
      return;
    }

    setProcessing(true);
    try {
      const recognized = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: branchId,
        skipAuth: true,
      });
      setRecognitionResult(recognized);

      const checkIn = await publicCheckInService.facialCheckIn({
        branchId,
        patientId: recognized.patient?.id,
        patientCpf: recognized.patient?.cpf,
        patientName: recognized.patient?.name,
        trust: recognized.trust,
        totem: 1,
      });

      setCheckInResult(checkIn);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicBranchInfo, branchId] });
    } catch (error: any) {
      const responseData = error?.response?.data;
      if (error?.response?.status === 401) {
        publicCheckInSessionService.logout();
        setIsAuthenticated(false);
        setCurrentUserName('');
        setCheckInResult(null);
        showNotification({
          title: 'Sessão expirada',
          message: 'Entre novamente para continuar usando o check-in desta filial.',
          color: 'yellow',
        });
        return;
      }
      const fallbackStatus = responseData?.status as PublicCheckInResponse['status'] | undefined;
      if (fallbackStatus) {
        setCheckInResult(responseData);
      } else if (responseData?.code === 'PUBLIC_CHECKIN_DISABLED') {
        setCheckInResult({
          status: 'PATIENT_NOT_FOUND',
          message: responseData?.error || 'O check-in desta filial está desligado no momento.',
        });
      } else if (responseData?.detail) {
        setRecognitionResult(null);
        setCheckInResult({
          status: 'FACIAL_NOT_RECOGNIZED',
          message: responseData.detail || 'Não conseguimos reconhecer seu rosto com confiança suficiente.',
        });
      } else {
        setCheckInResult({
          status: 'PATIENT_NOT_FOUND',
          message: responseData?.message || error?.message || 'Não foi possível concluir o check-in. Tente novamente ou procure a recepção.',
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleStartFirstTimeFlow = () => {
    setRecognitionResult(null);
    setCheckInResult(null);
    setPendingFirstTimeCheckIn(null);
    setFirstTimeCpf('');
    setFirstTimeMode(true);
  };

  const handleCancelFirstTimeFlow = () => {
    setFirstTimeMode(false);
    setFirstTimeCpf('');
    setPendingFirstTimeCheckIn(null);
  };

  const handleFirstTimeLookup = async () => {
    const cpfDigits = onlyDigits(firstTimeCpf);
    if (cpfDigits.length !== 11) {
      showNotification({
        title: 'CPF inválido',
        message: 'Digite um CPF válido para localizar seu cadastro.',
        color: 'yellow',
      });
      return;
    }

    if (!branchId) {
      showNotification({
        title: 'Filial não identificada',
        message: 'Este totem precisa estar vinculado a uma filial válida.',
        color: 'red',
      });
      return;
    }

    setFirstTimeLookupLoading(true);
    try {
      const lookup = await publicCheckInService.facialCheckIn({
        branchId,
        patientCpf: cpfDigits,
        totem: 1,
      });

      if (!lookup.patient?.id || !lookup.patient?.cpf || !lookup.patient?.name) {
        setCheckInResult(lookup);
        return;
      }

      setPendingFirstTimeCheckIn(lookup);
      setFacialCaptureOpen(true);
    } catch (error: any) {
      const responseData = error?.response?.data;
      if (error?.response?.status === 401) {
        publicCheckInSessionService.logout();
        setIsAuthenticated(false);
        setCurrentUserName('');
        showNotification({
          title: 'Sessão expirada',
          message: 'Entre novamente para continuar usando o totem.',
          color: 'yellow',
        });
        return;
      }
      if (responseData?.status) {
        setCheckInResult(responseData);
      } else {
        showNotification({
          title: 'Erro ao localizar cadastro',
          message: responseData?.message || error?.message || 'Não foi possível localizar seu cadastro pelo CPF informado.',
          color: 'red',
        });
      }
    } finally {
      setFirstTimeLookupLoading(false);
    }
  };

  const handleFirstTimeCapture = async (imageBase64: string) => {
    if (!branchId || !pendingFirstTimeCheckIn?.patient) return;

    setFirstTimeRegistering(true);
    try {
      await facialRecognitionService.registerFace({
        image: imageBase64,
        cpf: onlyDigits(pendingFirstTimeCheckIn.patient.cpf),
        nome: pendingFirstTimeCheckIn.patient.name,
        parentesco: 'próprio',
        id_unidade: branchId,
        id_medilab: pendingFirstTimeCheckIn.patient.id,
      });

      setCheckInResult({
        ...pendingFirstTimeCheckIn,
        message: pendingFirstTimeCheckIn.status === 'QUEUED'
          ? 'Cadastro facial concluído com sucesso. Você já foi encaminhado para a fila da recepção.'
          : pendingFirstTimeCheckIn.message || 'Cadastro facial concluído com sucesso.',
      });
      setFirstTimeMode(false);
      setFirstTimeCpf('');
      setPendingFirstTimeCheckIn(null);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicBranchInfo, branchId] });
      showNotification({
        title: 'Cadastro facial concluído',
        message: 'Seu rosto foi cadastrado com sucesso.',
        color: 'green',
      });
    } catch (error: any) {
      showNotification({
        title: 'Erro ao cadastrar rosto',
        message: error?.response?.data?.message || error?.message || 'Não foi possível concluir o cadastro facial.',
        color: 'red',
      });
      setFacialCaptureOpen(true);
    } finally {
      setFirstTimeRegistering(false);
    }
  };

  const checkInDisabled = isAuthenticated && branchInfo && !branchInfo.publicCheckInEnabled;

  return (
    <Box bg={DARK_SURFACE} style={{ minHeight: '100vh' }}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} style={{ minHeight: '100vh' }}>
        <Center p={{ base: 'xl', md: 48 }} bg="#0A1128">
          <Stack align="center" gap="xl" maw={520} w="100%">
            <ThemeIcon size={88} radius="xl" color="blue" variant="light">
              {isAuthenticated ? <Camera size={40} /> : <ShieldCheck size={40} />}
            </ThemeIcon>

            <Stack align="center" gap="xs">
              <Title order={1} c="white" ta="center">
                {isAuthenticated ? 'Check-in de chegada' : 'Entrar no modo totem'}
              </Title>
              <Text c="rgba(255,255,255,0.72)" ta="center" size="lg">
                {isAuthenticated
                  ? 'Posicione seu rosto na câmera para identificarmos você e localizarmos seu atendimento de hoje.'
                  : 'Use o login da clínica para habilitar este totem, manter a operação auditável e liberar o check-in da filial.'}
              </Text>
            </Stack>

            {!isAuthenticated ? (
              <Paper
                radius="xl"
                p="lg"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', width: '100%' }}
              >
                <Stack gap="md">
                  <TextInput
                    label="Email do usuário"
                    labelProps={{ style: { color: 'white' } }}
                    placeholder="usuario@clinica.com"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.currentTarget.value)}
                    styles={{
                      input: {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'white',
                        borderColor: 'rgba(120, 148, 255, 0.24)',
                      },
                    }}
                  />

                  <PasswordInput
                    label="Senha"
                    labelProps={{ style: { color: 'white' } }}
                    placeholder="Digite sua senha"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.currentTarget.value)}
                    styles={{
                      input: {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'white',
                        borderColor: 'rgba(120, 148, 255, 0.24)',
                      },
                    }}
                  />

                  <Button
                    size="xl"
                    radius="xl"
                    leftSection={<LogIn size={20} />}
                    onClick={handleLogin}
                    loading={loginLoading}
                    fullWidth
                  >
                    Entrar e ligar o totem
                  </Button>
                </Stack>
              </Paper>
            ) : (
              <>
                <Badge size="lg" radius="sm" color="green" variant="light">
                  Totem autenticado{currentUserName ? ` • ${currentUserName}` : ''}
                </Badge>

                <Button
                  size="xl"
                  radius="xl"
                  leftSection={<Camera size={22} />}
                  onClick={() => setFacialCaptureOpen(true)}
                  loading={processing}
                  fullWidth
                  disabled={firstTimeLookupLoading || firstTimeRegistering || Boolean(checkInDisabled)}
                >
                  Iniciar reconhecimento facial
                </Button>

                <Button
                  size="md"
                  radius="xl"
                  variant="subtle"
                  color="gray"
                  onClick={handleStartFirstTimeFlow}
                  disabled={processing || firstTimeLookupLoading || firstTimeRegistering || Boolean(checkInDisabled)}
                  fullWidth
                >
                  Primeira vez? Cadastre seu rosto
                </Button>
              </>
            )}

            {isAuthenticated && firstTimeMode && (
              <Paper
                radius="xl"
                p="lg"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', width: '100%' }}
              >
                <Stack gap="sm">
                  <Box>
                    <Text c="white" fw={700}>
                      Primeiro acesso no totem
                    </Text>
                    <Text c="dimmed" size="sm">
                      Informe seu CPF para localizar seu cadastro e registrar seu rosto pela primeira vez.
                    </Text>
                  </Box>

                  <TextInput
                    label="CPF"
                    labelProps={{ style: { color: 'white' } }}
                    placeholder="000.000.000-00"
                    value={firstTimeCpf}
                    onChange={(event) => setFirstTimeCpf(formatCpf(event.currentTarget.value))}
                    maxLength={14}
                    styles={{
                      input: {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'white',
                        borderColor: 'rgba(120, 148, 255, 0.24)',
                      },
                    }}
                  />

                  <Group justify="space-between">
                    <Button variant="subtle" color="gray" onClick={handleCancelFirstTimeFlow}>
                      Cancelar
                    </Button>
                    <Button onClick={handleFirstTimeLookup} loading={firstTimeLookupLoading}>
                      Localizar cadastro
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}

            <Text c="rgba(255,255,255,0.6)" size="sm" ta="center">
              {isAuthenticated
                ? 'Se não conseguirmos identificar você, a recepção poderá continuar o atendimento manualmente.'
                : 'Sem login, o totem permanece bloqueado e o check-in da filial não fica acessível.'}
            </Text>
          </Stack>
        </Center>

        <Box p={{ base: 'xl', md: 48 }} bg={DARK_SURFACE}>
          <Stack gap="lg" maw={640} mx="auto">
            <Group justify="space-between" align="center">
              <Box>
                <Text c="white" fw={700} size="xl">
                  Resultado do check-in
                </Text>
                <Text c="dimmed">
                  {!isAuthenticated
                    ? 'Entre com um usuário da clínica para liberar o check-in desta filial.'
                    : branchInfo?.tradeName
                    ? `Filial configurada: ${branchInfo.tradeName}`
                    : branchInfoLoading
                      ? 'Carregando filial...'
                      : branchLookupError || 'Não foi possível identificar a filial configurada.'}
                </Text>
              </Box>

              <Group gap="sm">
                {isAuthenticated && (
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<LogOut size={16} />}
                    onClick={() => {
                      setLogoutPassword('');
                      setLogoutModalOpen(true);
                    }}
                  >
                    Encerrar totem
                  </Button>
                )}
                <ActionIcon variant="light" size="xl" onClick={resetFlow} disabled={processing}>
                  <RefreshCcw size={20} />
                </ActionIcon>
              </Group>
            </Group>

            {!isAuthenticated ? (
              <Paper
                radius="xl"
                p="xl"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', minHeight: 320 }}
              >
                <Center h="100%">
                  <Stack align="center" gap="sm">
                    <ThemeIcon size={72} radius="xl" color="blue" variant="light">
                      {loginLoading ? <Loader size={28} /> : <ShieldCheck size={32} />}
                    </ThemeIcon>
                    <Text c="white" fw={600} size="lg">
                      Totem bloqueado até autenticação
                    </Text>
                    <Text c="dimmed" ta="center" maw={420}>
                      O check-in desta filial agora exige login de um usuário da clínica. Depois do login, o atendimento fica auditável e o totem pode ser desligado com logout.
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : checkInDisabled ? (
              <Paper
                radius="xl"
                p="xl"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', minHeight: 320 }}
              >
                <Center h="100%">
                  <Stack align="center" gap="sm">
                    <ThemeIcon size={72} radius="xl" color="yellow" variant="light">
                      <CircleAlert size={32} />
                    </ThemeIcon>
                    <Text c="white" fw={600} size="lg">
                      Check-in desligado para esta filial
                    </Text>
                    <Text c="dimmed" ta="center" maw={420}>
                      Esta URL já está correta, mas o check-in público ainda precisa ser ligado nas configurações da filial para começar a funcionar.
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : !checkInResult ? (
              <Paper
                radius="xl"
                p="xl"
                withBorder
                bg={CARD_SURFACE}
                style={{ borderColor: 'rgba(120, 148, 255, 0.24)', minHeight: 320 }}
              >
                <Center h="100%">
                  <Stack align="center" gap="sm">
                    <ThemeIcon size={72} radius="xl" color="blue" variant="light">
                      <ClipboardCheck size={32} />
                    </ThemeIcon>
                    <Text c="white" fw={600} size="lg">
                      Aguardando identificação
                    </Text>
                    <Text c="dimmed" ta="center" maw={420}>
                      Assim que o reconhecimento facial for concluído, vamos mostrar aqui se você já foi encaminhado para a fila da recepção.
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <>
                <Paper
                  radius="xl"
                  p="xl"
                  withBorder
                  bg={CARD_SURFACE}
                  style={{ borderColor: 'rgba(120, 148, 255, 0.24)' }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Group gap="md" align="center">
                        <ThemeIcon size={64} radius="xl" color={currentStatus?.color || 'gray'} variant="light">
                          {checkInResult.status === 'QUEUED' ? <UserRoundCheck size={30} /> : <CircleAlert size={30} />}
                        </ThemeIcon>
                        <Box>
                          <Text c="white" fw={700} size="xl">
                            {checkInResult.patient?.name || recognitionResult?.patient?.name || 'Não conseguimos identificar você'}
                          </Text>
                          {(checkInResult.patient?.cpf || recognitionResult?.patient?.cpf) && (
                            <Text c="dimmed">CPF: {formatCpf(checkInResult.patient?.cpf || recognitionResult?.patient?.cpf)}</Text>
                          )}
                        </Box>
                      </Group>

                      {currentStatus && (
                        <Badge color={currentStatus.color} variant="light" size="lg">
                          {currentStatus.label}
                        </Badge>
                      )}
                    </Group>

                    <Text c="white" size="lg">
                      {checkInResult.message}
                    </Text>

                    {checkInResult.status === 'FACIAL_NOT_RECOGNIZED' && (
                      <Text c="dimmed" size="sm">
                        Você pode tentar novamente com melhor iluminação ou seguir para a recepção para identificação manual.
                      </Text>
                    )}

                    {recognitionResult?.trust !== undefined && (
                      <Text c="dimmed" size="sm">
                        Confiança do reconhecimento: {(recognitionResult.trust * 100).toFixed(1)}%
                      </Text>
                    )}
                  </Stack>
                </Paper>

                {(checkInResult.appointments || []).length > 0 && (
                  <Stack gap="sm">
                    <Text c="white" fw={700} size="lg">
                      Agendamentos localizados hoje
                    </Text>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      {(checkInResult.appointments || []).map((appointment) => (
                        <Card
                          key={appointment.id}
                          radius="xl"
                          p="lg"
                          withBorder
                          bg={CARD_SURFACE}
                          style={{ borderColor: 'rgba(120, 148, 255, 0.24)' }}
                        >
                          <Stack gap="xs">
                            <Group justify="space-between">
                              <Text c="white" fw={700}>
                                {appointment.time || '--:--'}
                              </Text>
                              <Badge variant="light" color="blue">
                                {appointment.status || 'Agendado'}
                              </Badge>
                            </Group>

                            <Text c="white" fw={600}>
                              {appointment.specialty || 'Procedimento'}
                            </Text>
                            <Text c="dimmed">
                              {appointment.doctorName || 'Profissional não informado'}
                            </Text>
                            {appointment.convenio && (
                              <Text c="dimmed" size="sm">
                                Convênio: {appointment.convenio}
                              </Text>
                            )}
                          </Stack>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Box>
      </SimpleGrid>

      <FacialCapture
        opened={facialCaptureOpen}
        onClose={() => setFacialCaptureOpen(false)}
        onCapture={pendingFirstTimeCheckIn ? handleFirstTimeCapture : handleFacialScan}
        title={pendingFirstTimeCheckIn ? 'Cadastro facial do paciente' : 'Reconhecimento facial de chegada'}
        description={pendingFirstTimeCheckIn
          ? 'Posicione seu rosto no centro da câmera para concluir o cadastro facial.'
          : 'Posicione seu rosto no centro da câmera. Vamos validar sua identidade e localizar seu atendimento de hoje.'}
      />

      <Modal
        opened={logoutModalOpen}
        onClose={() => {
          if (logoutLoading) return;
          setLogoutModalOpen(false);
          setLogoutPassword('');
        }}
        title="Encerrar totem"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Para evitar desligamentos acidentais, confirme a senha do usuário autenticado antes de encerrar este totem.
          </Text>

          <PasswordInput
            label="Senha do usuário"
            placeholder="Digite a senha"
            value={logoutPassword}
            onChange={(event) => setLogoutPassword(event.currentTarget.value)}
            disabled={logoutLoading}
          />

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setLogoutModalOpen(false);
                setLogoutPassword('');
              }}
              disabled={logoutLoading}
            >
              Cancelar
            </Button>
            <Button color="red" onClick={handleLogout} loading={logoutLoading}>
              Confirmar encerramento
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
