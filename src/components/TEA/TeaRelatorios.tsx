import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Select,
  Stack,
  Loader,
  SimpleGrid,
  Badge,
  Divider,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, BarChart3 } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import teaProfileService from '../../services/teaProfileService';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF } from '../../utils/formatters';

interface TeaProfileItem {
  id: string;
  patient?: {
    name?: string;
    cpf?: string;
  };
}

interface TeaReportData {
  patient?: {
    name?: string;
    cpf?: string;
    birthDate?: string;
  };
  summary?: {
    plansTotal?: number;
    plansActive?: number;
    plansInactive?: number;
    evolutionsTotal?: number;
    evolutionsWithScore?: number;
    avgProgressScore?: number | null;
  };
  latestEvolution?: {
    sessionDate?: string;
    professional?: string | null;
    therapeuticPlan?: {
      title?: string;
    } | null;
    progressScore?: number | null;
    interventionSummary?: string | null;
  } | null;
  pit?: {
    title?: string;
    status?: string;
    startDate?: string | null;
    reviewDate?: string | null;
    therapiesCount?: number;
    therapies?: Array<{
      id: string;
      therapyType?: string;
      weeklyFrequency?: number;
      durationMinutes?: number | null;
      professional?: string | null;
    }>;
  } | null;
}

export function TeaRelatorios() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const heroBg = colorScheme === 'dark' ? 'var(--mantine-color-body)' : 'var(--mantine-color-gray-0)';
  const cardBg = colorScheme === 'dark' ? 'var(--mantine-color-default)' : 'var(--mantine-color-white)';

  const [teaProfiles, setTeaProfiles] = useState<TeaProfileItem[]>([]);
  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<TeaReportData | null>(null);

  const teaProfileOptions = useMemo(
    () => teaProfiles.map((it) => ({
      value: String(it.id),
      label: `${it.patient?.name || 'Paciente sem nome'}${it.patient?.cpf ? ` • ${formatCPF(it.patient.cpf)}` : ''}`,
    })),
    [teaProfiles],
  );

  const loadTeaProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const data: any = await teaProfileService.list({ limit: 300, offset: 0 });
      const list: TeaProfileItem[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);
      setTeaProfiles(list);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes TEA',
        color: 'red',
      });
    } finally {
      setLoadingProfiles(false);
    }
  };

  const loadReport = async () => {
    if (!selectedTeaProfileId) {
      showNotification({ title: 'Atenção', message: 'Selecione um paciente TEA', color: 'yellow' });
      return;
    }

    setLoadingReport(true);
    try {
      const data = await teaProfileService.getReport(selectedTeaProfileId, {
        startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
        endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
      });
      setReportData(data);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao carregar relatório',
        color: 'red',
      });
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadTeaProfiles();
  }, []);

  useEffect(() => {
    if (!selectedTeaProfileId) {
      setReportData(null);
      return;
    }
    loadReport();
  }, [selectedTeaProfileId]);

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={14}>
          <Button variant="subtle" color="dark" leftSection={<ChevronLeft size={18} />} onClick={() => navigate('/tea')}>
            Voltar
          </Button>
          <Box>
            <Text fw={800} size="lg" style={{ color: titleColor }}>Relatórios</Text>
            <Text size="sm" c="dimmed">Consolidado clínico por paciente TEA</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: heroBg }}>
          <Group gap="sm" mb="sm">
            <ThemeIcon size="lg" variant="light" color="blue"><BarChart3 size={16} /></ThemeIcon>
            <Text fw={700}>Indicadores e consolidados TEA</Text>
          </Group>
          <Stack gap="md">
            <Group grow>
              <Select
                label="Paciente TEA"
                placeholder={loadingProfiles ? 'Carregando...' : 'Selecione um paciente'}
                data={teaProfileOptions}
                value={selectedTeaProfileId}
                onChange={setSelectedTeaProfileId}
                searchable
                clearable
              />
              <DateInput
                label="Início do período"
                value={startDate}
                onChange={(value) => setStartDate(value || null)}
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
                clearable
              />
              <DateInput
                label="Fim do período"
                value={endDate}
                onChange={(value) => setEndDate(value || null)}
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
                clearable
              />
            </Group>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => { setStartDate(null); setEndDate(null); }}>
                Limpar período
              </Button>
              <Button bg={DARK_BLUE} onClick={loadReport} loading={loadingReport} disabled={!selectedTeaProfileId || loadingReport}>
                Gerar relatório
              </Button>
            </Group>

            {loadingReport ? (
              <Group justify="center"><Loader size="sm" /></Group>
            ) : !selectedTeaProfileId ? (
              <Text size="sm" c="dimmed">Selecione um paciente para visualizar o relatório.</Text>
            ) : !reportData ? (
              <Text size="sm" c="dimmed">Sem dados para exibir.</Text>
            ) : (
              <Stack gap="sm">
                <Paper p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                  <Text fw={600}>{reportData.patient?.name || 'Paciente'}</Text>
                  <Text size="xs" c="dimmed">
                    CPF: {reportData.patient?.cpf ? formatCPF(reportData.patient.cpf) : 'Não informado'}
                    {reportData.patient?.birthDate ? ` • Nascimento: ${dayjs(reportData.patient.birthDate).format('DD/MM/YYYY')}` : ''}
                  </Text>
                </Paper>

                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  <Paper p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                    <Text size="xs" c="dimmed">Planos terapêuticos</Text>
                    <Text fw={700} size="xl">{reportData.summary?.plansTotal ?? 0}</Text>
                    <Text size="xs" c="dimmed">Ativos: {reportData.summary?.plansActive ?? 0} • Inativos: {reportData.summary?.plansInactive ?? 0}</Text>
                  </Paper>

                  <Paper p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                    <Text size="xs" c="dimmed">Evoluções no período</Text>
                    <Text fw={700} size="xl">{reportData.summary?.evolutionsTotal ?? 0}</Text>
                    <Text size="xs" c="dimmed">Com score: {reportData.summary?.evolutionsWithScore ?? 0}</Text>
                  </Paper>

                  <Paper p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                    <Text size="xs" c="dimmed">Score médio</Text>
                    <Text fw={700} size="xl">
                      {typeof reportData.summary?.avgProgressScore === 'number'
                        ? Number(reportData.summary?.avgProgressScore).toFixed(1)
                        : '-'}
                    </Text>
                    <Text size="xs" c="dimmed">Escala de 0 a 10</Text>
                  </Paper>
                </SimpleGrid>

                <Divider />

                <Paper p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                  <Group justify="space-between" align="center">
                    <Text fw={600}>Última evolução</Text>
                    {reportData.latestEvolution?.sessionDate && (
                      <Badge variant="light" color="indigo">
                        {dayjs(reportData.latestEvolution.sessionDate).format('DD/MM/YYYY')}
                      </Badge>
                    )}
                  </Group>
                  {!reportData.latestEvolution ? (
                    <Text size="sm" c="dimmed" mt={6}>Nenhuma evolução registrada no período.</Text>
                  ) : (
                    <Stack gap={2} mt={6}>
                      <Text size="sm">Profissional: {reportData.latestEvolution.professional || 'Não informado'}</Text>
                      <Text size="sm">Plano: {reportData.latestEvolution.therapeuticPlan?.title || 'Não vinculado'}</Text>
                      <Text size="sm">Score: {Number.isFinite(reportData.latestEvolution.progressScore) ? reportData.latestEvolution.progressScore : '-'}</Text>
                      {reportData.latestEvolution.interventionSummary && (
                        <Text size="sm" c="dimmed">{reportData.latestEvolution.interventionSummary}</Text>
                      )}
                    </Stack>
                  )}
                </Paper>

                <Paper p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                  <Text fw={600}>PIT de terapias</Text>
                  {!reportData.pit ? (
                    <Text size="sm" c="dimmed" mt={6}>Paciente sem PIT cadastrado.</Text>
                  ) : (
                    <Stack gap={4} mt={6}>
                      <Text size="sm">Título: {reportData.pit.title || '-'}</Text>
                      <Text size="sm">Status: {reportData.pit.status || '-'}</Text>
                      <Text size="sm">
                        Vigência: {reportData.pit.startDate ? dayjs(reportData.pit.startDate).format('DD/MM/YYYY') : '-'}
                        {' '}até{' '}
                        {reportData.pit.reviewDate ? dayjs(reportData.pit.reviewDate).format('DD/MM/YYYY') : '-'}
                      </Text>
                      <Text size="sm">Terapias ativas: {reportData.pit.therapiesCount ?? 0}</Text>

                      {(reportData.pit.therapies || []).length > 0 && (
                        <Stack gap={2} mt={4}>
                          {(reportData.pit.therapies || []).map((therapy) => (
                            <Text key={therapy.id} size="xs" c="dimmed">
                              • {therapy.therapyType || 'Terapia'}
                              {typeof therapy.weeklyFrequency === 'number' ? ` • ${therapy.weeklyFrequency}x/semana` : ''}
                              {typeof therapy.durationMinutes === 'number' ? ` • ${therapy.durationMinutes} min` : ''}
                              {therapy.professional ? ` • ${therapy.professional}` : ''}
                            </Text>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  )}
                </Paper>
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
