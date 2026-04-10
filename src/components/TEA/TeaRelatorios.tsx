import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Stack,
  SimpleGrid,
  Badge,
  Divider,
  ThemeIcon,
  ActionIcon,
  Skeleton,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, BarChart3 } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF } from '../../utils/formatters';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useTeaReportQuery } from '../../hooks/useTeaReportQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingDateInput } from '../common/FloatingDateInput';
import { FloatingSelect } from '../common/FloatingSelect';

type TeaProfileItem = {
  id: string;
  patient?: {
    name?: string;
    cpf?: string;
  };
};

type TeaReportTherapyItem = {
  id: string;
  therapyType?: string;
  weeklyFrequency?: number;
  durationMinutes?: number | null;
  professional?: string | null;
};

export function TeaRelatorios() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const heroBg = colorScheme === 'dark' ? 'var(--mantine-color-body)' : 'var(--mantine-color-gray-0)';
  const cardBg = colorScheme === 'dark' ? 'var(--mantine-color-default)' : 'var(--mantine-color-white)';

  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const queryClient = useQueryClient();

  const {
    data: teaProfiles = [] as TeaProfileItem[],
    isLoading: loadingProfiles,
    error: teaProfilesError,
  } = useTeaProfilesQuery();

  const {
    data: reportData,
    isFetching: loadingReport,
    error: reportError,
    refetch: refetchReport,
  } = useTeaReportQuery({
    teaProfileId: selectedTeaProfileId,
    startDate: appliedStartDate || undefined,
    endDate: appliedEndDate || undefined,
  });

  const teaProfileOptions = useMemo(
    () => teaProfiles.map((it: TeaProfileItem) => ({
      value: String(it.id),
      label: `${it.patient?.name || 'Paciente sem nome'}${it.patient?.cpf ? ` • ${formatCPF(it.patient.cpf)}` : ''}`,
    })),
    [teaProfiles],
  );

  const handleGenerateReport = async () => {
    if (!selectedTeaProfileId) {
      showNotification({ title: 'Atenção', message: 'Selecione um paciente TEA', color: 'yellow' });
      return;
    }

    const nextStartDate = startDate ? dayjs(startDate).format('YYYY-MM-DD') : '';
    const nextEndDate = endDate ? dayjs(endDate).format('YYYY-MM-DD') : '';

    setAppliedStartDate(nextStartDate);
    setAppliedEndDate(nextEndDate);

    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.teaReports, selectedTeaProfileId, nextStartDate, nextEndDate],
    });
    await refetchReport();
  };

  useEffect(() => {
    if (!teaProfilesError) return;
    const err: any = teaProfilesError;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar pacientes TEA'),
      color: 'red',
    });
  }, [teaProfilesError]);

  useEffect(() => {
    if (!reportError || !selectedTeaProfileId) return;
    const err: any = reportError;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar relatório'),
      color: 'red',
    });
  }, [reportError, selectedTeaProfileId]);

  useEffect(() => {
    if (!selectedTeaProfileId) {
      setAppliedStartDate('');
      setAppliedEndDate('');
      return;
    }

    setAppliedStartDate(startDate ? dayjs(startDate).format('YYYY-MM-DD') : '');
    setAppliedEndDate(endDate ? dayjs(endDate).format('YYYY-MM-DD') : '');
  }, [selectedTeaProfileId]);

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={14} gap="md" align="flex-start">
          <ActionIcon
            variant="default"
            size={isMobile ? 44 : 52}
            radius="md"
            onClick={() => navigate('/tea')}
            aria-label="Voltar"
          >
            <ChevronLeft size={22} />
          </ActionIcon>
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
            <Group grow align="flex-start">
              <FloatingSelect
                label="Paciente TEA"
                placeholder={loadingProfiles ? 'Carregando...' : 'Selecione um paciente'}
                data={teaProfileOptions}
                value={selectedTeaProfileId}
                onChange={setSelectedTeaProfileId}
                searchable
                clearable
              />
              <FloatingDateInput
                label="Início do período"
                value={startDate}
                onChange={(value) => setStartDate(value || null)}
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
                clearable
              />
              <FloatingDateInput
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
              <Button bg={DARK_BLUE} onClick={handleGenerateReport} loading={loadingReport} disabled={!selectedTeaProfileId || loadingReport}>
                Gerar relatório
              </Button>
            </Group>

            {loadingReport ? (
              <Stack gap="sm">
                <Skeleton height={54} radius="md" />
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Paper key={index} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                      <Skeleton height={12} width="44%" mb={8} radius="xl" />
                      <Skeleton height={28} width="26%" mb={8} radius="xl" />
                      <Skeleton height={10} width="62%" radius="xl" />
                    </Paper>
                  ))}
                </SimpleGrid>
                <Skeleton height={120} radius="md" />
                <Skeleton height={140} radius="md" />
              </Stack>
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
                          {(reportData.pit.therapies || []).map((therapy: TeaReportTherapyItem) => (
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
