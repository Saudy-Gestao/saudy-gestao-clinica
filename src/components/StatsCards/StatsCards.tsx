import { Paper, SimpleGrid, Text } from '@mantine/core';

export function StatsCards() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mb={40}>
      {[
        { label: 'Atendimento hoje', value: '25' },
        { label: 'Agendamentos pendentes', value: '05' },
        { label: 'Em atendimento', value: '10' },
      ].map((stat, index) => (
        <Paper key={index} p="lg" withBorder shadow="sm">
          <Text c="dimmed" size="sm" fw={500} mb="xs">{stat.label}</Text>
          <Text size="2.5rem" fw={500} style={{ lineHeight: 1 }}>{stat.value}</Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}