import { Box, Group, Paper, SimpleGrid, Skeleton, Stack, Text } from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  BookOpen,
  BriefcaseMedical,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  NotebookPen,
  Users,
} from 'lucide-react';
import { Header } from '../Header/Header';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useTeaPendingReservationsQuery } from '../../hooks/useTeaPendingReservationsQuery';
import './TeaHome.css';

type StatHue = 'blue' | 'green' | 'orange' | 'violet';

type StatCard = {
  key: string;
  label: string;
  helper: string;
  value: string;
  icon: typeof Users;
  hue: StatHue;
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
        key: 'pacientes',
        title: 'Pacientes de Terapias',
        description: 'Lista, vincula e edita perfis',
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
        title: 'Agenda Semanal de Terapias',
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
  return (
    <Paper className="tea-home-stat-card" withBorder>
      <Group align="center" justify="space-between" wrap="nowrap" gap="sm">
        <Group align="center" wrap="nowrap" gap="sm">
          <Box className="tea-home-stat-icon" style={{ '--stat-hue': `var(--ui-hue-${item.hue})` } as any}>
            <item.icon size={20} />
          </Box>
          <Box>
            <Text fw={600} size="sm" lineClamp={1}>
              {item.label}
            </Text>
            <Text c="dimmed" size="xs" lineClamp={1}>
              {item.helper}
            </Text>
          </Box>
        </Group>
        <Text className="tea-home-stat-value">
          {item.value}
        </Text>
      </Group>
    </Paper>
  );
}

function TeaSectionModuleCard({ item, onOpen }: { item: TeaSectionCard; onOpen: (route: string) => void }) {
  return (
    <Paper
      className="tea-home-module-card"
      withBorder
      onClick={() => onOpen(item.route)}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box className="tea-home-module-icon">
            <item.icon size={18} />
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Text fw={600} size="sm" lineClamp={1}>
              {item.title}
            </Text>
            <Text c="dimmed" size="xs" lineClamp={1}>
              {item.description}
            </Text>
          </Box>
        </Group>
        <ChevronRight size={16} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
      </Group>
    </Paper>
  );
}

export function TeaHome() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');

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
      label: 'Pacientes cadastrados',
      helper: `${activeProfilesCount} ativos`,
      value: String(teaProfiles.length),
      icon: Users,
      hue: 'blue',
    },
    {
      key: 'pits',
      label: 'PITs',
      helper: `${activePitProfiles.length} ativos`,
      value: String(activePitProfiles.length),
      icon: FileSpreadsheet,
      hue: 'green',
    },
    {
      key: 'pre-reservas',
      label: 'Pré-reservas pendentes',
      helper: 'Aguardando definição',
      value: String(pendingReservations.length),
      icon: CalendarClock,
      hue: 'orange',
    },
    {
      key: 'pendencias',
      label: 'Pendências',
      helper: 'Alertas operacionais',
      value: String(pendingAlertCount),
      icon: BellRing,
      hue: 'violet',
    },
  ];

  const loadingSummary = profilesLoading || pitsLoading || reservationsLoading;

  return (
    <Box className="tea-home-page" bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate(-1) }} />

      <Box className="tea-home-content" p={isMobile ? 'sm' : 'xl'} maw={1400} mx="auto" w="100%">
        <Box className="tea-home-hero ui-page-intro">
          <Text className="tea-home-eyebrow">OPERAÇÃO CLÍNICA · TERAPIAS</Text>
          <Text className="tea-home-title" fw={700} size="2xl">Módulo Terapias</Text>
          <Text className="tea-home-subtitle" size="sm">Subsistema clínico de acompanhamento de Terapias</Text>
        </Box>

        {loadingSummary ? (
          <SimpleGrid className="tea-home-stats" cols={{ base: 1, sm: 2, lg: 4 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Paper key={index} className="tea-home-stat-card" withBorder>
                <Group wrap="nowrap" gap="sm">
                  <Skeleton height={44} width={44} radius="md" />
                  <Stack gap={8} style={{ flex: 1 }}>
                    <Skeleton height={14} width="70%" radius="xl" />
                    <Skeleton height={12} width="50%" radius="xl" />
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid className="tea-home-stats" cols={{ base: 1, sm: 2, lg: 4 }}>
            {statCards.map((item) => (
              <TeaSummaryCard key={item.key} item={item} />
            ))}
          </SimpleGrid>
        )}

        <Stack gap="xl">
          {SECTIONS.map((section) => (
            <Box key={section.title} className="tea-home-section">
              <Text className="tea-home-section-title">{section.title}</Text>
              <SimpleGrid className="tea-home-section-grid" cols={{ base: 1, sm: 2, lg: 4 }}>
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
