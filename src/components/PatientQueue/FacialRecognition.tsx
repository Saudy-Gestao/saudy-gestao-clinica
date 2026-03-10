import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, Button, Stack, Paper, Title, ActionIcon, Loader, Center, Badge, Card, SimpleGrid } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Camera, User } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FacialCapture } from '../common/FacialCapture';
import facialRecognitionService, { type FacialScanResponse } from '../../services/facialRecognitionService';
import consultationService from '../../services/consultationService';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  time: string;
  status: string;
  room?: string;
}

export function FacialRecognition() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [facialCaptureOpen, setFacialCaptureOpen] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<FacialScanResponse | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

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
      
      // Buscar consultas do dia para o paciente reconhecido
      if (result.patient && result.patient.id) {
        await loadTodayAppointments(result.patient.id);
      }

      showNotification({
        title: 'Reconhecimento bem-sucedido',
        message: `Bem-vindo(a), ${result.patient.name}!`,
        color: 'green',
      });
    } catch (error: any) {
      console.error('Erro no reconhecimento facial:', error);
      showNotification({
        title: 'Erro no reconhecimento',
        message: error?.response?.data?.detail || error?.message || 'Não foi possível reconhecer o paciente. Tente novamente.',
        color: 'red',
      });
    } finally {
      setRecognizing(false);
    }
  };

  const loadTodayAppointments = async (patientId: string) => {
    setLoadingAppointments(true);
    try {
      // Buscar consultas do paciente
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const response: any = await consultationService.list();
      
      // Filtrar consultas do dia do paciente
      const allConsultations = Array.isArray(response) ? response : (response?.data || []);
      const todayConsultations = allConsultations.filter((c: any) => {
        const consultDate = new Date(c.scheduledAt || c.scheduled_at || c.date);
        const isToday = consultDate >= new Date(startOfDay) && consultDate <= new Date(endOfDay);
        const isPatient = String(c.patientId || c.patient_id || c.patient?.id) === patientId;
        return isToday && isPatient;
      });

      const mapped: Appointment[] = todayConsultations.map((c: any) => ({
        id: String(c.id || c.consultationId),
        doctorName: c.doctorName || c.doctor_name || c.doctor?.name || 'Médico não informado',
        specialty: c.specialty || c.doctor?.specialty || '-',
        time: new Date(c.scheduledAt || c.scheduled_at || c.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: c.status || 'SCHEDULED',
        room: c.room || c.roomNumber || '-',
      }));

      setAppointments(mapped);
    } catch (error: any) {
      console.error('Erro ao carregar consultas:', error);
      showNotification({
        title: 'Aviso',
        message: 'Não foi possível carregar as consultas do paciente.',
        color: 'yellow',
      });
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleReset = () => {
    setRecognitionResult(null);
    setAppointments([]);
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
                        <Text size="sm" c="dimmed">CPF: {recognitionResult.patient.cpf}</Text>
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
                  <Center p="xl">
                    <Loader size="lg" />
                  </Center>
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
