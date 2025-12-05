import { Box, Group, Text, Paper, Button, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Play, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';

export function PatientQueue() {
  const isMobile = useMediaQuery('(max-width: 799px)');

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
                1
              </Box>
              <Box>
                <Text fw={600} size="lg">Maria Silva Santos</Text>
                {isMobile ? (
                  <Box>
                    <Group gap="xs" c="black">
                      <Clock size={16} />
                      <Text size="sm">08:30</Text>
                      <Text size="sm">Consulta</Text>
                    </Group>
                    <Text size="sm" c="black">Dr.(a) Carlos Mendes</Text>
                  </Box>
                ) : (
                  <Group gap="xs" c={isMobile ? 'black' : undefined}>
                    <Clock size={16} />
                    <Text size="sm">08:30</Text>
                    <Text size="sm">Consulta</Text>
                    <Text size="sm">Dr.(a) Carlos Mendes</Text>
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

        {/* Inactive Items */}
        {[
          { id: 2, name: 'João Pedro Oliveira', time: '09:00', type: 'Consulta', doctor: 'Dr.(a) Ana Paula Costa' },
          { id: 3, name: 'Ana Beatriz Lima', time: '09:30', type: 'Retorno', doctor: 'Dr.(a) Carlos Mendes' },
        ].map((patient) => (
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
                  {patient.id}
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