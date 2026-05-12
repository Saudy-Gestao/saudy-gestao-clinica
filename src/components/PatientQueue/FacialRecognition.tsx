import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, Button, Stack, Paper, Title, ActionIcon, Center, Badge, Card, SimpleGrid, Skeleton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Camera, User } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FacialCapture } from '../common/FacialCapture';
import facialRecognitionService, { type FacialScanResponse } from '../../services/facialRecognitionService';
import { maskCPF } from '../../utils/formatters';
import { usePatientTodayAppointmentsQuery } from '../../hooks/usePatientTodayAppointmentsQuery';
import { showErrorToast, showSuccessToast } from '../../lib/toast';

export function FacialRecognition() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [facialCaptureOpen, setFacialCaptureOpen] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<FacialScanResponse | null>(null);
  const patientId = recognitionResult?.patient?.id || null;
  const { data: appointments = [], isLoading: loadingAppointments } = usePatientTodayAppointmentsQuery(patientId);

  const handleFacialScan = async (imageBase64: string) => {
    setRecognizing(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const unitId = user?.branchId || user?.branch?.id || '';

      const result = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: unitId,
      });

      setRecognitionResult(result);
      
      showSuccessToast({
        title: 'Reconhecimento bem-sucedido',
        message: `Bem-vindo(a), ${result.patient.name}!`,
      });
    } catch (error: any) {
      console.error('Erro no reconhecimento facial:', error);
      showErrorToast({
        title: 'Erro no reconhecimento',
        error,
        fallback: 'Não foi possível reconhecer o paciente. Tente novamente.',
      });
    } finally {
      setRecognizing(false);
    }
  };

  const handleReset = () => {
    setRecognitionResult(null);
  };

  const getTrustColor = (trust: string) => {
    const trustValue = Number(trust);
    if (trustValue >= 0.9) return 'green';
    if (trustValue >= 0.7) return 'yellow';
    return 'red';
  };

  const getTrustLabel = (trust: string) => {
    const trustValue = Number(trust);
    if (trustValue >= 0.9) return 'Alta confiança';
    if (trustValue >= 0.7) return 'Média confiança';
    return 'Baixa confiança';
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'SCHEDULED': 'blue',
      'CONFIRMED': 'green',
      'IN_PROGRESS': 'yellow',
      'COMPLETED': 'gray',
      'CANCELLED': 'red',
    };
    return statusMap[status] || 'gray';
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'SCHEDULED': 'Agendada',
      'CONFIRMED': 'Confirmada',
      'IN_PROGRESS': 'Em andamento',
      'COMPLETED': 'Concluída',
      'CANCELLED': 'Cancelada',
    };
    return statusMap[status] || status;
  };

  const AppointmentsSkeleton = () => (
    <Stack gap="md">
      <Skeleton height={74} radius="md" />
      <Skeleton height={74} radius="md" />
      <Skeleton height={74} radius="md" />
    </Stack>
  );

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1200} mx="auto">
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>

            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Reconhecimento Facial - Recepção
              </Text>
              <Text size="sm" c="dimmed">
                Identifique o paciente pela câmera
              </Text>
            </Box>
          </Group>
        </Group>

        <Stack gap="md">
          {!recognitionResult ? (
            <Paper p="xl" withBorder radius="md">
              <Stack align="center" gap="lg">
                <Box
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={60} color="white" />
                </Box>

                <Box style={{ textAlign: 'center' }}>
                  <Title order={3} mb="xs">Identifique o Paciente</Title>
                  <Text size="sm" c="dimmed" maw={500}>
                    Clique no botão abaixo para iniciar o reconhecimento facial.
                    O sistema irá identificar o paciente e mostrar suas consultas agendadas para hoje.
                  </Text>
                </Box>

                <Button
                  size="lg"
                  leftSection={<Camera size={20} />}
                  onClick={() => setFacialCaptureOpen(true)}
                  loading={recognizing}
                  bg={DARK_BLUE}
                >
                  Iniciar Reconhecimento
                </Button>
              </Stack>
            </Paper>
          ) : (
            <>
              <Paper p="md" withBorder radius="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Paciente Identificado</Title>
                  <Button variant="outline" onClick={handleReset}>
                    Nova Identificação
                  </Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Card withBorder padding="md">
                    <Group gap="md">
                      <Box
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <User size={30} color="white" />
                      </Box>
                      <Box style={{ flex: 1 }}>
                        <Text fw={600} size="lg">{recognitionResult.patient.name}</Text>
                        <Text size="sm" c="dimmed">CPF: {maskCPF(recognitionResult.patient.cpf)}</Text>
                      </Box>
                    </Group>
                  </Card>

                  <Card withBorder padding="md">
                    <Stack gap="xs">
                      <Text fw={600}>Confiança do Reconhecimento</Text>
                      <Badge
                        size="lg"
                        color={getTrustColor(String(recognitionResult.trust))}
                        variant="filled"
                      >
                        {getTrustLabel(String(recognitionResult.trust))} - {(recognitionResult.trust * 100).toFixed(1)}%
                      </Badge>
                    </Stack>
                  </Card>
                </SimpleGrid>
              </Paper>

              <Paper p="md" withBorder radius="md">
                <Title order={4} mb="md">Consultas de Hoje</Title>

                {loadingAppointments ? (
                  <AppointmentsSkeleton />
                ) : appointments.length === 0 ? (
                  <Center p="xl">
                    <Stack align="center" gap="xs">
                      <Text size="lg" c="dimmed">Nenhuma consulta agendada para hoje</Text>
                      <Text size="sm" c="dimmed">O paciente não possui consultas para hoje.</Text>
                    </Stack>
                  </Center>
                ) : (
                  <Stack gap="md">
                    {appointments.map((appointment) => (
                      <Card key={appointment.id} withBorder padding="md">
                        <Group justify="space-between" wrap="wrap">
                          <Box style={{ flex: 1 }}>
                            <Text fw={600} size="md">{appointment.doctorName}</Text>
                            <Text size="sm" c="dimmed">{appointment.specialty}</Text>
                            <Group gap="xs" mt="xs">
                              <Text size="sm" fw={500}>Horário: {appointment.time}</Text>
                              {appointment.room && appointment.room !== '-' && (
                                <Text size="sm" c="dimmed">• Sala: {appointment.room}</Text>
                              )}
                            </Group>
                          </Box>
                          <Badge
                            color={getStatusColor(appointment.status)}
                            variant="filled"
                          >
                            {getStatusLabel(appointment.status)}
                          </Badge>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Paper>
            </>
          )}
        </Stack>

        <FacialCapture
          opened={facialCaptureOpen}
          onClose={() => setFacialCaptureOpen(false)}
          onCapture={handleFacialScan}
          title="Reconhecimento Facial"
          description="Posicione o rosto do paciente no centro da câmera"
        />
      </Box>
    </Box>
  );
}
