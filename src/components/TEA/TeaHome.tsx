import { ActionIcon, Box, Group, Paper, SimpleGrid, Skeleton, Stack, Text, ThemeIcon, useMantineColorScheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  BookOpen,
  BriefcaseMedical,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  NotebookPen,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useTeaPendingReservationsQuery } from '../../hooks/useTeaPendingReservationsQuery';

type StatCard = {
  key: string;
  label: string;
  helper: string;
  value: string;
  icon: typeof Users;
  tint: string;
  iconColor: string;
};

type TeaSectionCard = {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: typeof Users;
};

const SECTIONS: Array<{ title: string; items: TeaSectionCard[] }> = [
  {
    title: 'Cadastro e Perfil',
    items: [
      {
        key: 'cadastro',
        title: 'Vincular Paciente',
        description: 'Paciente base + Perfil TEA',
        route: '/tea/cadastro',
        icon: UserRoundPlus,
      },
      {
        key: 'pacientes',
        title: 'Pacientes TEA',
        description: 'Lista e edição',
        route: '/tea/pacientes',
        icon: Users,
      },
    ],
  },
  {
    title: 'Planejamento',
    items: [
      {
        key: 'pit',
        title: 'PIT de terapias',
        description: 'Plano integrado',
        route: '/tea/pit',
        icon: FileSpreadsheet,
      },
      {
        key: 'plano',
        title: 'Plano Terapêutico',
        description: 'Objetivos e prioridades',
        route: '/tea/plano',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'Agendamento',
    items: [
      {
        key: 'pre-reserva',
        title: 'Pré-reserva',
        description: 'Pendências e propostas',
        route: '/tea/pre-reserva',
        icon: CalendarClock,
      },
      {
        key: 'agenda-semanal',
        title: 'Agenda Semanal TEA',
        description: 'Visão macro',
        route: '/tea/agenda-semanal',
        icon: CalendarDays,
      },
    ],
  },
  {
    title: 'Evolução e Relatórios',
    items: [
      {
        key: 'evolucao',
        title: 'Evolução',
        description: 'Registro por sessão',
        route: '/tea/evolucao',
        icon: NotebookPen,
      },
      {
        key: 'evolucao-templates',
        title: 'Template de Evolução',
        description: 'Modelos por procedimento',
        route: '/tea/evolucao-templates',
        icon: BookOpen,
      },
      {
        key: 'relatorios',
        title: 'Relatório',
        description: 'Consolidados e indicadores',
        route: '/tea/relatorios',
        icon: BriefcaseMedical,
      },
      {
        key: 'desmarcacao-lote',
        title: 'Desmarcação em lote',
        description: 'Cancelar terapias',
        route: '/tea/desmarcacao-lote',
        icon: CalendarX2,
      },
    ],
  },
];

function TeaSummaryCard({ item }: { item: StatCard }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Paper
      withBorder
      radius="md"
      p={8}
      style={{
        background: isDark ? 'var(--mantine-color-dark-7)' : '#ffffff',
        borderColor: isDark ? '#4d66a7' : 'var(--mantine-color-default-border)',
        boxShadow: isDark ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Group align="center" justify="space-between" wrap="nowrap" gap={8}>
        <Group align="center" wrap="nowrap" gap={8}>
          <Box
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: item.tint,
              boxShadow: isDark ? 'none' : '0 6px 12px rgba(15, 23, 42, 0.10)',
              flexShrink: 0,
            }}
          >
            <item.icon size={18} color={item.iconColor} />
          </Box>
          <Box>
            <Text fw={500} size="xs" lineClamp={1}>
              {item.label}
            </Text>
            <Text c="dimmed" size="xs" lineClamp={1}>
              {item.helper}
            </Text>
          </Box>
        </Group>
        <Box
          style={{
            minWidth: 22,
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          <Text fw={500} lh={1} size="1.45rem">
            {item.value}
          </Text>
        </Box>
      </Group>
    </Paper>
  );
}

function TeaSectionModuleCard({ item, onOpen }: { item: TeaSectionCard; onOpen: (route: string) => void }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Paper
      withBorder
      radius="md"
      p={10}
      onClick={() => onOpen(item.route)}
      style={{
        cursor: 'pointer',
        background: isDark ? '#0f2f6a' : '#ffffff',
        borderColor: isDark ? '#0f2f6a' : DARK_BLUE,
        transition: 'transform 140ms ease, box-shadow 140ms ease',
        boxShadow: isDark ? 'none' : '0 3px 10px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap={10} wrap="nowrap">
          <ThemeIcon
            size={38}
            radius="md"
            variant="transparent"
            style={{
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.85)' : DARK_BLUE}`,
              color: isDark ? '#ffffff' : DARK_BLUE,
            }}
          >
            <item.icon size={18} />
          </ThemeIcon>
          <Box>
            <Text fw={500} size="sm" c={isDark ? '#ffffff' : 'var(--mantine-color-text)'}>
              {item.title}
            </Text>
            <Text c="dimmed" size="xs">
              {item.description}
            </Text>
          </Box>
        </Group>
        <ChevronRight size={14} color={isDark ? '#dce6ff' : '#b5bcc9'} />
      </Group>
    </Paper>
  );
}

export function TeaHome() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const titleColor = isDark ? '#ffffff' : 'var(--mantine-color-text)';
  const subtitleColor = isDark ? '#6c86cf' : 'var(--mantine-color-dimmed)';

  const { data: teaProfiles = [], isLoading: profilesLoading } = useTeaProfilesQuery();
  const { data: activePitProfiles = [], isLoading: pitsLoading } = useTeaProfilesQuery({ hasActivePit: true });
  const { data: pendingReservations = [], isLoading: reservationsLoading } = useTeaPendingReservationsQuery({ search: '', status: null });

  const activeProfilesCount = teaProfiles.filter((item: any) => item?.isActive !== false).length;
  const pendingAlertCount = pendingReservations.filter((item: any) => {
    const status = String(item?.status || '').toUpperCase();
    return status === 'PROPOSED' || status === 'PENDING_AUTHORIZATION' || status === 'PENDING_SCHEDULING';
  }).length;

  const statCards: StatCard[] = [
    {
      key: 'profiles',
      label: 'Paciente cadastrados',
      helper: `${activeProfilesCount} ativos`,
      value: String(teaProfiles.length),
      icon: Users,
      tint: isDark ? '#eef1ff' : '#e7edff',
      iconColor: '#5067ad',
    },
    {
      key: 'pits',
      label: 'PITs',
      helper: `${activePitProfiles.length} ativos`,
      value: String(activePitProfiles.length),
      icon: FileSpreadsheet,
      tint: isDark ? '#eefde5' : '#e4f7d5',
      iconColor: '#1fa700',
    },
    {
      key: 'pre-reservas',
      label: 'Pré-reservas pendentes',
      helper: 'Aguardando definição',
      value: String(pendingReservations.length),
      icon: CalendarClock,
      tint: isDark ? '#fff1e1' : '#fff0df',
      iconColor: '#f08a00',
    },
    {
      key: 'pendencias',
      label: 'Pendências',
      helper: 'Alertas operacionais',
      value: String(pendingAlertCount),
      icon: BellRing,
      tint: isDark ? '#f5e8ff' : '#f3e4ff',
      iconColor: '#b31dff',
    },
  ];

  const loadingSummary = profilesLoading || pitsLoading || reservationsLoading;

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'md'} maw={1400} mx="auto" w="100%">
        <Group mb={isMobile ? 12 : 14} gap="xs" align="center" wrap="nowrap">
          <ActionIcon variant="default" color="dark" size={isMobile ? 'lg' : 48} onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={isMobile ? 18 : 18} />
          </ActionIcon>
          <Box>
            <Text fw={700} size={isMobile ? 'xl' : '1.2rem'} c={titleColor} lh={1.1}>
              Módulo TEA
            </Text>
            <Text size="xs" c={subtitleColor}>
              Subsistema clínico TEA
            </Text>
          </Box>
        </Group>

        {loadingSummary ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs" mb="sm">
            {Array.from({ length: 4 }).map((_, index) => (
              <Paper key={index} withBorder radius="md" p={8}>
                <Group wrap="nowrap" gap={8}>
                  <Skeleton height={38} width={38} radius="md" />
                  <Stack gap={8} style={{ flex: 1 }}>
                    <Skeleton height={18} width="28%" radius="xl" />
                    <Skeleton height={14} width="72%" radius="xl" />
                    <Skeleton height={12} width="54%" radius="xl" />
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs" mb="sm">
            {statCards.map((item) => (
              <TeaSummaryCard key={item.key} item={item} />
            ))}
          </SimpleGrid>
        )}

        <Stack gap="sm">
          {SECTIONS.map((section) => (
            <Box key={section.title}>
              <Text fw={700} size={isMobile ? 'lg' : '0.95rem'} mb={8} c={titleColor}>
                {section.title}
              </Text>
              <SimpleGrid
                cols={{
                  base: 1,
                  sm: 2,
                  lg: 4,
                }}
                spacing="xs"
                verticalSpacing="xs"
              >
                {section.items.map((item) => (
                  <TeaSectionModuleCard
                    key={item.key}
                    item={item}
                    onOpen={(route) => navigate(route, { state: { fromModuleHub: true } })}
                  />
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
