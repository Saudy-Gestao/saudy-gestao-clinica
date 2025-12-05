import { useState, useEffect } from 'react';
import { Box, Title, Text, Stack } from '@mantine/core';
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
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        {/* Welcome Section */}
        <Stack gap="xs" mb={30}>
          <Title order={1} fw={600} style={{ fontSize: '2rem' }}>{getGreeting()}</Title>
          <Text c="dimmed" size="lg">O que você precisa fazer hoje?</Text>
        </Stack>

        <StatsCards />
        <PatientQueue />
        <WorkflowSections />
      </Box>
    </Box>
  );
}