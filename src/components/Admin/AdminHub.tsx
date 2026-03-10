import { Box, Button, Stack, Text, Group, Paper, SimpleGrid, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { StatsCards } from '../StatsCards/StatsCards';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';

export function AdminHub() {
  const navigate = useNavigate();
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as { isAdmHubOnly?: boolean }) : null;
    } catch {
      return null;
    }
  })();
  const isAdmHubOnly = Boolean(currentUser?.isAdmHubOnly);

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <Group mb={30} justify="space-between" align="center">
          <Stack gap="xs">
            <Title order={1} fw={600} style={{ fontSize: '2rem' }}>Área Administrativa</Title>
            <Text c="dimmed" size="lg">Visão geral e ações rápidas</Text>
          </Stack>

          <Group>
            <Button bg={DARK_BLUE} onClick={() => navigate('/cadastro-cliente', { state: { from: 'adm-hub' } })}>Cadastrar Cliente</Button>

          </Group>
        </Group>

        <Text c="dimmed" mb="md">Métricas rápidas</Text>

        {isAdmHubOnly ? (
          <Paper p="lg" withBorder shadow="sm" mb="xl">
            <Text size="sm" c="dimmed">Usuário com acesso restrito ao ADM Hub. Métricas clínicas indisponíveis nesse perfil.</Text>
          </Paper>
        ) : (
          <StatsCards />
        )}

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mt="lg">
          <Paper p="lg" withBorder shadow="sm">Gráfico 1 (placeholder)</Paper>
          <Paper p="lg" withBorder shadow="sm">Gráfico 2 (placeholder)</Paper>
        </SimpleGrid>
      </Box>
    </Box>
  );
}

