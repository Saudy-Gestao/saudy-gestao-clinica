import { useState, useEffect } from 'react';
import { Box, Title, Text, Stack, Group } from '@mantine/core';
import { Header } from '../Header/Header';
import { StatsCards } from '../StatsCards/StatsCards';
import { PatientQueue } from '../PatientQueue/PatientQueue';
import { WorkflowSections } from '../WorkflowSections/WorkflowSections';

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia!';
    if (hour >= 12 && hour < 18) return 'Boa tarde!';
    return 'Boa noite!';
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        {/* Welcome Section */}
        <Group mb={30} justify="space-between" align="center">
          <Stack gap="xs">
            <Title order={1} fw={600} style={{ fontSize: '2rem' }}>{getGreeting()}</Title>
            <Text c="dimmed" size="lg">O que você precisa fazer hoje?</Text>
          </Stack>

        </Group>

        <StatsCards />
        <PatientQueue />
        <WorkflowSections />
      </Box>
    </Box>
  );
}