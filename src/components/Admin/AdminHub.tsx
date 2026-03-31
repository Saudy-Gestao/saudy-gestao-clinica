import { Box, Stack, Text, Group, Paper, SimpleGrid, Title, ThemeIcon } from '@mantine/core';
import { Building2, ChevronRight, LayoutGrid, LifeBuoy, MessageSquareText, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatsCards } from '../StatsCards/StatsCards';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';

const adminModules = [
  {
    icon: MessageSquareText,
    title: 'Possíveis Clientes',
    description: 'Visualize os contatos captados pela landing page e acompanhe o funil inicial.',
    route: '/possiveis-clientes',
  },
  {
    icon: Building2,
    title: 'Cadastro de Cliente',
    description: 'Crie novas empresas, administrador inicial e liberação de filiais.',
    route: '/cadastro-cliente',
  },
  {
    icon: Building2,
    title: 'Gestão de Clientes',
    description: 'Edite dados da empresa, campos cadastrais e o tipo de módulo liberado.',
    route: '/adm-clientes',
  },
  {
    icon: LifeBuoy,
    title: 'Chamados',
    description: 'Analise tickets enviados pelos usuários e acompanhe o status de cada atendimento.',
    route: '/adm-tickets',
  },
];

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
            <Title order={1} fw={600} style={{ fontSize: '2rem' }}>
              Área Administrativa
            </Title>
            <Text c="dimmed" size="lg">
              Operação administrativa do Saudy com módulos dedicados do ADM.
            </Text>
          </Stack>
        </Group>

        <Paper
          p="xl"
          radius="lg"
          mb="xl"
          style={{
            background: `linear-gradient(135deg, ${DARK_BLUE} 0%, #16357f 100%)`,
            color: 'white',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Group justify="space-between" align="flex-start" gap="xl">
            <Stack gap={8} maw={720}>
              <Group gap="sm">
                <ThemeIcon size={42} radius="md" variant="light" color="white">
                  <LayoutGrid size={20} />
                </ThemeIcon>
                <Text size="sm" fw={700} tt="uppercase" c="rgba(255,255,255,0.72)" style={{ letterSpacing: '0.08em' }}>
                  Dashboard ADM
                </Text>
              </Group>
              <Title order={2} c="white">
                Centralize os cadastros administrativos com a mesma linguagem do sistema principal.
              </Title>
              <Text c="rgba(255,255,255,0.82)" maw={620}>
                Este ambiente fica reservado para operações administrativas. Os módulos daqui tratam de estrutura,
                clientes e governança do produto.
              </Text>
            </Stack>

            <Paper
              p="lg"
              radius="lg"
              style={{
                minWidth: 240,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Text size="sm" c="rgba(255,255,255,0.72)" mb={6}>
                Ambiente
              </Text>
              <Text fw={700} size="xl" c="white">
                ADM Hub
              </Text>
              <Text size="sm" c="rgba(255,255,255,0.78)" mt="sm">
                Fluxos administrativos isolados da operação clínica.
              </Text>
            </Paper>
          </Group>
        </Paper>

        <Text c="dimmed" mb="md">
          Métricas rápidas
        </Text>

        {isAdmHubOnly ? (
          <Paper p="lg" withBorder shadow="sm" mb="xl">
            <Text size="sm" c="dimmed">
              Usuário com acesso restrito ao ADM Hub. Métricas clínicas indisponíveis nesse perfil.
            </Text>
          </Paper>
        ) : (
          <StatsCards />
        )}

        <Box mt="xl">
          <Text fw={600} size="lg" c="dimmed" mb="md">
            Módulos administrativos
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {adminModules.map((module) => (
              <Paper
                key={module.route}
                p="lg"
                withBorder
                shadow="sm"
                radius="lg"
                style={{
                  cursor: 'pointer',
                  borderColor: 'var(--mantine-color-default-border)',
                  minHeight: 180,
                }}
                onClick={() => navigate(module.route, { state: { from: 'adm-hub' } })}
              >
                <Stack h="100%" justify="space-between" gap="lg">
                  <Stack gap="sm">
                    <ThemeIcon size={48} radius="md" color="darkBlue" variant="light">
                      <module.icon size={24} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={600} size="lg">
                        {module.title}
                      </Text>
                      <Text c="dimmed" size="sm" mt={4}>
                        {module.description}
                      </Text>
                    </Box>
                  </Stack>

                  <Group justify="space-between" align="center">
                    <Group gap={8}>
                      <UserPlus size={16} color={DARK_BLUE} />
                      <Text fw={500} size="sm" c={DARK_BLUE}>
                        Abrir módulo
                      </Text>
                    </Group>
                    <ChevronRight size={18} color="var(--mantine-color-dimmed)" />
                  </Group>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    </Box>
  );
}
