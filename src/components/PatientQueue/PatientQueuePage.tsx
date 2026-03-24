import { Box, Group, Stack, Text, ActionIcon } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { PatientQueue } from './PatientQueue';

export function PatientQueuePage() {
  const navigate = useNavigate();

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <Group mb={30} justify="space-between" align="center">
          <Group gap="lg" align="center">
            <ActionIcon
              size={56}
              radius="md"
              variant="light"
              color="blue"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={28} />
            </ActionIcon>
            <Stack gap={2}>
              <Text size="2rem" fw={700} c="white">
                Fila de Atendimento
              </Text>
              <Text c="#8fa6dc" size="lg">
                Visualização completa dos pacientes aguardando chamada na recepção.
              </Text>
            </Stack>
          </Group>
        </Group>

        <PatientQueue limit={undefined} showViewAll={false} fullPage />
      </Box>
    </Box>
  );
}
