import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, Paper, Button, Stack, Loader, Center, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useMantineColorScheme } from '@mantine/core';
import { Play, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import preAttendanceService from '../../services/preAttendanceService';

interface QueuePatient {
  id: string;
  name: string;
  time: string;
  type: string;
  doctor: string;
  position: number;
  status: string;
  createdAt?: string;
}

const parseAgendaSummary = (agenda?: string | null) => {
  const parts = String(agenda || '')
    .split('•')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    time: parts[0] || '--:--',
    type: parts[1] || 'Consulta',
    doctor: parts[2] || 'Profissional não informado',
  };
};

interface PatientQueueProps {
  limit?: number;
  showViewAll?: boolean;
  fullPage?: boolean;
}

export function PatientQueue({ limit = 3, showViewAll = true, fullPage = false }: PatientQueueProps) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        setLoading(true);
        const data: any = await preAttendanceService.list({ limit: 100 });
        
        const list: any[] = Array.isArray(data)
          ? data
          : (data?.items || data?.data || []);

        // Mapear para formato da fila
        const queueData = list
          .filter((item: any) => {
            const status = String(item.status || '').trim().toLowerCase();
            return status === 'na fila da recepção' || status === 'atrasado';
          })
          .sort((a: any, b: any) => {
            const createdAtA = new Date(a.createdAt || 0).getTime();
            const createdAtB = new Date(b.createdAt || 0).getTime();
            if (createdAtA !== createdAtB) return createdAtA - createdAtB;

            const updatedAtA = new Date(a.updatedAt || 0).getTime();
            const updatedAtB = new Date(b.updatedAt || 0).getTime();
            return updatedAtA - updatedAtB;
          })
          .map((item: any, index: number) => {
            const summary = parseAgendaSummary(item.agenda);
            return ({
            id: String(item.id),
            name: item.fullName || item.patientName || 'Paciente sem nome',
            time: summary.time,
            type: summary.type,
            doctor: summary.doctor,
            position: index + 1,
            status: item.status || '',
            createdAt: item.createdAt,
          })});

        setQueue(limit ? queueData.slice(0, limit) : queueData);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar fila',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, []);

  if (loading) {
    return (
      <Box mb={40}>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg" c="dimmed">Fila de Atendimento</Text>
        </Group>
        <Center h={200}>
          <Loader size="lg" />
        </Center>
      </Box>
    );
  }

  if (queue.length === 0) {
    return (
      <Box mb={40}>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg" c="dimmed">Fila de Atendimento</Text>
        </Group>
        <Paper
          p="xl"
          withBorder
          style={colorScheme === 'dark' ? {
            backgroundColor: 'transparent',
            borderColor: 'var(--mantine-color-default-border)',
          } : undefined}
        >
          <Center>
            <Text c="dimmed">Nenhum paciente na fila no momento</Text>
          </Center>
        </Paper>
      </Box>
    );
  }

  const [firstPatient, ...restPatients] = queue;

  const handleCallPatient = async (patient: QueuePatient) => {
    try {
      setCallingId(patient.id);
      await preAttendanceService.update(patient.id, {
        status: 'Em atendimento na recepção',
        queueType: 'Autorização e Recepção',
      });

      setQueue((prev) => prev.filter((item) => item.id !== patient.id));

      showNotification({
        title: 'Paciente chamado',
        message: `${patient.name} foi encaminhado para Autorização e Recepção.`,
        color: 'green',
      });

      navigate('/pre-atendimento');
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao chamar paciente',
        color: 'red',
      });
    } finally {
      setCallingId(null);
    }
  };

  return (
    <Box mb={40}>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg" c="dimmed">Fila de Atendimento</Text>
        {showViewAll && !fullPage && (
          <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => navigate('/fila-atendimento')}>
            {!isMobile && <Text size="sm" c="dimmed">Ver agenda completa</Text>}
            {isMobile ? <ChevronRight size={20} color="currentColor" /> : <ArrowRight size={16} color="currentColor" />}
          </Group>
        )}
      </Group>

      <Stack gap="sm">
        {/* Active Item */}
        {firstPatient && (
          <Paper
            p="md"
            bg={isMobile ? '#001F54' : DARK_BLUE}
            c="white"
            radius="md"
            withBorder
            style={colorScheme === 'dark' ? { borderColor: 'var(--mantine-color-default-border)' } : undefined}
          >
            <Group justify="space-between">
              <Group>
                <Box
                  bg={isMobile ? '#193a7a' : DARK_BLUE}
                  c="white"
                  w={32}
                  h={32}
                  style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}
                >
                  {firstPatient.position}
                </Box>
                <Box>
                  <Text fw={600} size="lg">{firstPatient.name}</Text>
                  {isMobile ? (
                    <Box>
                      {firstPatient.status === 'Atrasado' && (
                        <Badge color="red" variant="light" mb={6}>Atrasado</Badge>
                      )}
                      <Group gap="xs">
                        <Clock size={16} />
                        <Text size="sm">{firstPatient.time}</Text>
                        <Text size="sm">{firstPatient.type}</Text>
                      </Group>
                      <Text size="sm">{firstPatient.doctor}</Text>
                    </Box>
                  ) : (
                    <Stack gap={4}>
                      {firstPatient.status === 'Atrasado' && (
                        <Badge color="red" variant="light" w="fit-content">Atrasado</Badge>
                      )}
                      <Group gap="xs" c={isMobile ? 'black' : undefined}>
                        <Clock size={16} />
                        <Text size="sm">{firstPatient.time}</Text>
                        <Text size="sm">{firstPatient.type}</Text>
                        <Text size="sm">{firstPatient.doctor}</Text>
                      </Group>
                    </Stack>
                  )}
                </Box>
              </Group>
              {!isMobile && (
                <Button
                  bg="white"
                  c={colorScheme === 'dark' ? 'dark' : 'darkBlue.9'}
                  leftSection={<Play size={16} fill={colorScheme === 'dark' ? '#1a1b1e' : '#001f54'} />}
                  loading={callingId === firstPatient.id}
                  onClick={() => handleCallPatient(firstPatient)}
                >
                  Chamar
                </Button>
              )}
            </Group>
          </Paper>
        )}

        {/* Inactive Items */}
        {restPatients.map((patient) => (
          <Paper
            key={patient.id}
            p="md"
            withBorder
            style={colorScheme === 'dark' ? {
              backgroundColor: '#0d1a43',
              borderColor: 'var(--mantine-color-default-border)',
            } : undefined}
          >
            <Group justify="space-between">
              <Group>
                <Box
                  bg={colorScheme === 'dark' ? '#001F54' : 'var(--mantine-color-default-hover)'}
                  c={colorScheme === 'dark' ? 'white' : 'gray'}
                  w={32}
                  h={32}
                  style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}
                >
                  {patient.position}
                </Box>
                <Box>
                  <Text fw={600} size="lg">{patient.name}</Text>
                  {isMobile ? (
                    <Box>
                      {patient.status === 'Atrasado' && (
                        <Badge color="red" variant="light" mb={6}>Atrasado</Badge>
                      )}
                      <Group gap="xs">
                        <Clock size={16} />
                        <Text size="sm">{patient.time}</Text>
                        <Text size="sm">{patient.type}</Text>
                      </Group>
                      <Text size="sm">{patient.doctor}</Text>
                    </Box>
                  ) : (
                    <Stack gap={4}>
                      {patient.status === 'Atrasado' && (
                        <Badge color="red" variant="light" w="fit-content">Atrasado</Badge>
                      )}
                      <Group gap="xs">
                        <Clock size={16} />
                        <Text size="sm">{patient.time}</Text>
                        <Text size="sm">{patient.type}</Text>
                        <Text size="sm">{patient.doctor}</Text>
                      </Group>
                    </Stack>
                  )}
                </Box>
              </Group>
              {!isMobile && (
                <Button
                  bg={DARK_BLUE}
                  c="white"
                  leftSection={<Play size={16} fill="white" />}
                  loading={callingId === patient.id}
                  onClick={() => handleCallPatient(patient)}
                >
                  Chamar
                </Button>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
