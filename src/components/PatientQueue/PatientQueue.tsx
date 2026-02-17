import { useState, useEffect } from 'react';
import { Box, Group, Text, Paper, Button, Stack, Loader, Center } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
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
}

export function PatientQueue() {
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        setLoading(true);
        const data: any = await preAttendanceService.list({ limit: 10 });
        
        const list: any[] = Array.isArray(data)
          ? data
          : (data?.items || data?.data || []);

        // Mapear para formato da fila
        const queueData = list
          .filter((item: any) => item.status !== 'finalizado' && item.status !== 'cancelado')
          .slice(0, 10) // Limitar para 10 primeiros
          .map((item: any, index: number) => ({
            id: String(item.id),
            name: item.fullName || item.patientName || 'Paciente sem nome',
            time: item.agenda || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            type: item.queueType || 'Consulta',
            doctor: item.notes || 'Médico não definido',
            position: index + 1,
          }));

        setQueue(queueData);
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
          <Text fw={600} size="lg" style={{ color: '#A5A1A1' }}>Fila de Atendimento</Text>
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
          <Text fw={600} size="lg" style={{ color: '#A5A1A1' }}>Fila de Atendimento</Text>
        </Group>
        <Paper p="xl" withBorder>
          <Center>
            <Text c="dimmed">Nenhum paciente na fila no momento</Text>
          </Center>
        </Paper>
      </Box>
    );
  }

  const [firstPatient, ...restPatients] = queue;

  return (
    <Box mb={40}>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg" style={{ color: '#A5A1A1' }}>Fila de Atendimento</Text>
        <Group gap={4} style={{ cursor: 'pointer' }}>
          {!isMobile && <Text size="sm" style={{ color: '#4B4545' }}>Ver agenda completa</Text>}
          {isMobile ? <ChevronRight size={20} color="#4B4545" /> : <ArrowRight size={16} color="gray" />}
        </Group>
      </Group>

      <Stack gap="sm">
        {/* Active Item */}
        {firstPatient && (
          <Paper p="md" bg={isMobile ? 'white' : DARK_BLUE} c={isMobile ? 'black' : 'white'} radius="md" withBorder={isMobile}>
            <Group justify="space-between">
              <Group>
                <Box
                  bg={isMobile ? '#e2e8f0' : DARK_BLUE}
                  c={isMobile ? 'gray' : 'white'}
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
                      <Group gap="xs" c="black">
                        <Clock size={16} />
                        <Text size="sm">{firstPatient.time}</Text>
                        <Text size="sm">{firstPatient.type}</Text>
                      </Group>
                      <Text size="sm" c="black">{firstPatient.doctor}</Text>
                    </Box>
                  ) : (
                    <Group gap="xs" c={isMobile ? 'black' : undefined}>
                      <Clock size={16} />
                      <Text size="sm">{firstPatient.time}</Text>
                      <Text size="sm">{firstPatient.type}</Text>
                      <Text size="sm">{firstPatient.doctor}</Text>
                    </Group>
                  )}
                </Box>
              </Group>
              {!isMobile && (
                <Button bg="white" c="#001f54" leftSection={<Play size={16} fill="#001f54" />}>
                  Chamar
                </Button>
              )}
            </Group>
          </Paper>
        )}

        {/* Inactive Items */}
        {restPatients.map((patient) => (
          <Paper key={patient.id} p="md" withBorder>
            <Group justify="space-between">
              <Group>
                <Box
                  bg="#e2e8f0"
                  c="gray"
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
                      <Group gap="xs" c="black">
                        <Clock size={16} />
                        <Text size="sm">{patient.time}</Text>
                        <Text size="sm">{patient.type}</Text>
                      </Group>
                      <Text size="sm" c="black">{patient.doctor}</Text>
                    </Box>
                  ) : (
                    <Group gap="xs" c="black">
                      <Clock size={16} />
                      <Text size="sm">{patient.time}</Text>
                      <Text size="sm">{patient.type}</Text>
                      <Text size="sm">{patient.doctor}</Text>
                    </Group>
                  )}
                </Box>
              </Group>
              {!isMobile && (
                <Button bg={DARK_BLUE} c="white" leftSection={<Play size={16} fill="white" />}>
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