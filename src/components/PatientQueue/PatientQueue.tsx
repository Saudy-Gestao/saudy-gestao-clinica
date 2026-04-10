import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Group, Text, Paper, Button, Stack, Skeleton, Center, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useMantineColorScheme } from '@mantine/core';
import { Play, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';
import preAttendanceService from '../../services/preAttendanceService';
import { usePatientQueueQuery, type QueuePatient } from '../../hooks/usePatientQueueQuery';
import { queryKeys } from '../../lib/queryKeys';
import { showErrorToast, showSuccessToast } from '../../lib/toast';

interface PatientQueueProps {
  limit?: number;
  showViewAll?: boolean;
  fullPage?: boolean;
}

export function PatientQueue({ limit = 3, showViewAll = true, fullPage = false }: PatientQueueProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const [callingId, setCallingId] = useState<string | null>(null);
  const { data: queueData = [], isLoading: loading, error } = usePatientQueueQuery();
  const queue = useMemo(() => (limit ? queueData.slice(0, limit) : queueData), [queueData, limit]);

  useEffect(() => {
    if (!error) return;
    showErrorToast({
      title: 'Erro',
      error,
      fallback: 'Erro ao carregar fila',
    });
  }, [error]);

  const QueueSkeleton = () => (
    <Stack gap="sm">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Skeleton key={`queue-skeleton-${idx}`} height={82} radius="md" />
      ))}
    </Stack>
  );

  if (loading) {
    return (
      <Box mb={40}>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg" c="dimmed">Fila de Atendimento</Text>
        </Group>
        <QueueSkeleton />
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.patientQueue });

      showSuccessToast({
        title: 'Paciente chamado',
        message: `${patient.name} foi encaminhado para Autorização e Recepção.`,
      });

      navigate('/autorizacao-e-recepcao');
    } catch (err: any) {
      showErrorToast({
        title: 'Erro',
        error: err,
        fallback: 'Erro ao chamar paciente',
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
