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
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Camera, CircleAlert, ClipboardCheck, RefreshCcw, UserRoundCheck } from 'lucide-react';
import { FacialCapture } from '../common/FacialCapture';
import facialRecognitionService, { type FacialScanResponse } from '../../services/facialRecognitionService';
import publicCheckInService, { type PublicCheckInResponse } from '../../services/publicCheckInService';
import { usePublicBranchInfoQuery } from '../../hooks/usePublicBranchInfoQuery';
import { queryKeys } from '../../lib/queryKeys';

const DARK_SURFACE = '#0F1838';
const CARD_SURFACE = '#162552';

const formatCpf = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value || '-';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

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

  const [facialCaptureOpen, setFacialCaptureOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<FacialScanResponse | null>(null);
  const [checkInResult, setCheckInResult] = useState<PublicCheckInResponse | null>(null);
  const [branchLookupError, setBranchLookupError] = useState<string | null>(null);
  const { data: branchInfo, error: branchInfoError, isLoading: branchInfoLoading } = usePublicBranchInfoQuery(branchId);

  const currentStatus = useMemo(() => {
    const status = checkInResult?.status || '';
    return statusConfig[status] || null;
  }, [checkInResult]);

  const resetFlow = () => {
    setRecognitionResult(null);
    setCheckInResult(null);
  };

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
    if (!branchInfoError) {
      setBranchLookupError(null);
      return;
    }
    const error: any = branchInfoError;
    setBranchLookupError(error?.response?.data?.error || 'Não foi possível identificar a filial configurada.');
  }, [branchId, branchInfoError]);

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
      const fallbackStatus = responseData?.status as PublicCheckInResponse['status'] | undefined;
      if (fallbackStatus) {
        setCheckInResult(responseData);
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

  return (
    <Box bg={DARK_SURFACE} style={{ minHeight: '100vh' }}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} style={{ minHeight: '100vh' }}>
        <Center p={{ base: 'xl', md: 48 }} bg="#0A1128">
          <Stack align="center" gap="xl" maw={520} w="100%">
            <ThemeIcon size={88} radius="xl" color="blue" variant="light">
              <Camera size={40} />
            </ThemeIcon>

            <Stack align="center" gap="xs">
              <Title order={1} c="white" ta="center">
                Check-in de chegada
              </Title>
              <Text c="rgba(255,255,255,0.72)" ta="center" size="lg">
                Posicione seu rosto na câmera para identificarmos você e localizarmos seu atendimento de hoje.
              </Text>
            </Stack>

            <Button
              size="xl"
              radius="xl"
              leftSection={<Camera size={22} />}
              onClick={() => setFacialCaptureOpen(true)}
              loading={processing}
              fullWidth
            >
              Iniciar reconhecimento facial
            </Button>

            <Text c="rgba(255,255,255,0.6)" size="sm" ta="center">
              Se não conseguirmos identificar você, a recepção poderá continuar o atendimento manualmente.
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
                  {branchInfo?.tradeName
                    ? `Filial configurada: ${branchInfo.tradeName}`
                    : branchInfoLoading
                      ? 'Carregando filial...'
                      : branchLookupError || 'Não foi possível identificar a filial configurada.'}
                </Text>
              </Box>

              <ActionIcon variant="light" size="xl" onClick={resetFlow} disabled={processing}>
                <RefreshCcw size={20} />
              </ActionIcon>
            </Group>

            {!checkInResult ? (
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
        onCapture={handleFacialScan}
        title="Reconhecimento facial de chegada"
        description="Posicione seu rosto no centro da câmera. Vamos validar sua identidade e localizar seu atendimento de hoje."
      />
    </Box>
  );
}
