import { Box, Group, Text, ActionIcon } from '@mantine/core';
import { ChevronLeft } from 'lucide-react';
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
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size="lg" c="var(--mantine-color-text)">
                Fila de Atendimento
              </Text>
              <Text size="sm" c="dimmed">
                Visualização completa dos pacientes aguardando chamada na recepção.
              </Text>
            </Box>
          </Group>
        </Group>

        <PatientQueue limit={undefined} showViewAll={false} fullPage />
      </Box>
    </Box>
  );
}
