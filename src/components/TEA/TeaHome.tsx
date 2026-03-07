import { Box, Group, Text, Paper, ThemeIcon, SimpleGrid, Button, useMantineColorScheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Brain, Users, ClipboardList, Activity, BarChart3, CalendarClock, CalendarX2, CalendarDays, ChevronRight } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';

const SUBMODULES = [
  {
    key: 'cadastro',
    title: 'Cadastro TEA',
    description: 'Paciente base + perfil TEA',
    route: '/tea/cadastro',
    icon: Brain,
    enabled: true,
  },
  {
    key: 'pacientes',
    title: 'Pacientes TEA',
    description: 'Lista e edição dos cadastrados',
    route: '/tea/pacientes',
    icon: Users,
    enabled: true,
  },
  {
    key: 'pit',
    title: 'PIT de Terapias',
    description: 'Plano integrado multiprofissional',
    route: '/tea/pit',
    icon: ClipboardList,
    enabled: true,
  },
  {
    key: 'pre-reserva',
    title: 'Pré-reserva',
    description: 'Pendências e propostas de horário',
    route: '/tea/pre-reserva',
    icon: CalendarClock,
    enabled: true,
  },
  {
    key: 'plano',
    title: 'Plano Terapêutico',
    description: 'Objetivos e prioridades clínicas',
    route: '/tea/plano',
    icon: ClipboardList,
    enabled: true,
  },
  {
    key: 'evolucao',
    title: 'Evolução',
    description: 'Registros por sessão do paciente',
    route: '/tea/evolucao',
    icon: Activity,
    enabled: true,
  },
  {
    key: 'relatorios',
    title: 'Relatórios',
    description: 'Consolidados e indicadores por paciente',
    route: '/tea/relatorios',
    icon: BarChart3,
    enabled: true,
  },
  {
    key: 'desmarcacao-lote',
    title: 'Desmarcação em lote',
    description: 'Cancelar terapias recorrentes por paciente',
    route: '/tea/desmarcacao-lote',
    icon: CalendarX2,
    enabled: true,
  },
  {
    key: 'agenda-semanal',
    title: 'Agenda semanal TEA',
    description: 'Visão macro de todos os pacientes',
    route: '/tea/agenda-semanal',
    icon: CalendarDays,
    enabled: true,
  },
];

export function TeaHome() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const accentColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const heroBg = colorScheme === 'dark' ? 'transparent' : 'var(--mantine-color-gray-0)';

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={14}>
          <Button variant="subtle" color="dark" leftSection={<ChevronLeft size={18} />} onClick={() => navigate('/dashboard')}>
            Voltar
          </Button>
          <Box>
            <Text fw={800} size="lg" style={{ color: titleColor }}>Módulo TEA</Text>
            <Text size="sm" c="dimmed">Selecione um submódulo para continuar</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: heroBg }}>
          <Text fw={700} mb="sm">Submódulos TEA</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {SUBMODULES.map((module) => {
              const Icon = module.icon;
              return (
                <Paper
                  key={module.key}
                  p="xs"
                  withBorder
                  className={colorScheme === 'dark' ? 'module-card-dark' : undefined}
                  style={{
                    borderColor: 'var(--mantine-color-default-border)',
                    cursor: module.enabled ? 'pointer' : 'not-allowed',
                    opacity: module.enabled ? 1 : 0.6,
                    minHeight: 60,
                    height: '100%',
                  }}
                  onClick={() => {
                    if (!module.enabled) return;
                    navigate(module.route, { state: { fromModuleHub: true } });
                  }}
                >
                  <Group justify="space-between" align="flex-start">
                    <Group gap="xs" wrap="nowrap">
                      <ThemeIcon size="md" variant="transparent" color="darkBlue" bg="transparent" style={{ border: `1px solid ${accentColor}`, borderRadius: '6px' }}>
                        <Icon size={18} color={accentColor} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={500} size="sm" lineClamp={1}>{module.title}</Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>{module.description}</Text>
                      </Box>
                    </Group>
                    <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                  </Group>
                </Paper>
              );
            })}
          </SimpleGrid>
        </Paper>
      </Box>
    </Box>
  );
}
