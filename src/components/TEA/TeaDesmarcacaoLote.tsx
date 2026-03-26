import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Group,
  Text,
  Button,
  ActionIcon,
  Paper,
  Stack,
  Badge,
  Modal,
  Divider,
  Skeleton,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, CalendarX2, X } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import teaPreReservationService from '../../services/teaPreReservationService';
import { formatCPF } from '../../utils/formatters';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useTeaCancellationTherapiesQuery } from '../../hooks/useTeaCancellationTherapiesQuery';
import { queryKeys } from '../../lib/queryKeys';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';

type CancellationTherapyItem = {
  pitTherapyId: string;
  procedureName: string;
  professionalName: string;
  weeklyFrequency: number;
  preferredWeekdays: string[];
  preferredShift?: string | null;
  totalSessions: number;
  slots: Array<{ date: string; time: string }>;
};

type CancellationScope = 'single' | 'all';

type WeekdayCancellationTarget = {
  weekdayIndex: number;
  weekdayLabel: string;
  timesLabel: string;
};

const WEEKDAY_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const getWeekdayLabel = (value: string) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return 'Dia inválido';
  return WEEKDAY_LABELS[parsed.day()] || 'Dia inválido';
};

const getWeekdayIndex = (value: string) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return 99;
  return parsed.day();
};

export function TeaDesmarcacaoLote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const queryClient = useQueryClient();
  const fromDate = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [selectedTherapy, setSelectedTherapy] = useState<CancellationTherapyItem | null>(null);
  const [cancellationScope, setCancellationScope] = useState<CancellationScope>('single');
  const [cancelReason, setCancelReason] = useState('');
  const [weekdayModalOpened, setWeekdayModalOpened] = useState(false);
  const [weekdayCancelTarget, setWeekdayCancelTarget] = useState<WeekdayCancellationTarget | null>(null);
  const [cancelingWeekday, setCancelingWeekday] = useState(false);

  const {
    data: teaProfiles = [] as any[],
    isLoading: loadingProfiles,
    error: teaProfilesError,
  } = useTeaProfilesQuery();

  const {
    data: therapies = [] as CancellationTherapyItem[],
    isLoading: loadingTherapies,
    isFetching: fetchingTherapies,
    error: therapiesError,
  } = useTeaCancellationTherapiesQuery({
    teaProfileId: selectedTeaProfileId,
    fromDate,
  });

  const teaProfileOptions = useMemo(
    () => teaProfiles.map((it: any) => ({
      value: String(it.id),
      label: `${it.patient?.name || 'Paciente sem nome'}${it.patient?.cpf ? ` • ${formatCPF(it.patient.cpf)}` : ''}`,
    })),
    [teaProfiles],
  );

  const selectedProfile = useMemo(
    () => teaProfiles.find((item: any) => String(item?.id) === String(selectedTeaProfileId || '')),
    [teaProfiles, selectedTeaProfileId],
  );

  useEffect(() => {
    if (!teaProfilesError) return;
    const err: any = teaProfilesError;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes TEA',
      color: 'red',
    });
  }, [teaProfilesError]);

  useEffect(() => {
    if (!therapiesError || !selectedTeaProfileId) return;
    const err: any = therapiesError;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar terapias agendadas',
      color: 'red',
    });
  }, [therapiesError, selectedTeaProfileId]);

  useEffect(() => {
    const queryTeaProfileId = String(searchParams.get('teaProfileId') || '').trim();
    if (!queryTeaProfileId) return;
    setSelectedTeaProfileId((prev) => prev || queryTeaProfileId);
  }, [searchParams]);

  const openCancelModal = (therapy: CancellationTherapyItem) => {
    setCancellationScope('single');
    setSelectedTherapy(therapy);
    setCancelReason('');
    setConfirmModalOpened(true);
  };

  const openCancelAllModal = () => {
    setCancellationScope('all');
    setSelectedTherapy(null);
    setCancelReason('');
    setConfirmModalOpened(true);
  };

  const openWeekdayCancelModal = (target: WeekdayCancellationTarget) => {
    setWeekdayCancelTarget(target);
    setWeekdayModalOpened(true);
  };

  const totalSessionsAllTherapies = useMemo(
    () => therapies.reduce((acc: number, item: CancellationTherapyItem) => acc + Number(item.totalSessions || 0), 0),
    [therapies],
  );

  const handleConfirmCancellation = async () => {
    if (!selectedTeaProfileId) return;
    if (cancellationScope === 'single' && !selectedTherapy) return;
    setCanceling(true);
    try {
      const result: any = await teaPreReservationService.cancelTherapySeries({
        teaProfileId: selectedTeaProfileId,
        pitTherapyId: cancellationScope === 'single' ? selectedTherapy?.pitTherapyId : undefined,
        cancelAll: cancellationScope === 'all',
        fromDate,
        reason: cancelReason.trim() || undefined,
      });

      const canceledAppointments = Number(result?.canceledAppointments || 0);
      showNotification({
        title: 'Sucesso',
        message: cancellationScope === 'all'
          ? `Cancelamento em lote concluído: ${canceledAppointments} sessão(ões) desmarcada(s).`
          : `Cancelamento concluído: ${canceledAppointments} sessão(ões) desmarcada(s).`,
        color: 'green',
      });

      setConfirmModalOpened(false);
      setSelectedTherapy(null);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.teaCancellationTherapies, selectedTeaProfileId, fromDate],
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao cancelar terapia em lote',
        color: 'red',
      });
    } finally {
      setCanceling(false);
    }
  };

  const handleConfirmWeekdayCancellation = async () => {
    if (!selectedTeaProfileId || !weekdayCancelTarget) return;
    setCancelingWeekday(true);
    try {
      const result: any = await teaPreReservationService.cancelTherapySeries({
        teaProfileId: selectedTeaProfileId,
        cancelAll: true,
        fromDate,
        weekdayIndex: weekdayCancelTarget.weekdayIndex,
        reason: `Desmarcação por dia da semana: ${weekdayCancelTarget.weekdayLabel}`,
      });

      const canceledAppointments = Number(result?.canceledAppointments || 0);
      showNotification({
        title: 'Sucesso',
        message: `${canceledAppointments} sessão(ões) de ${weekdayCancelTarget.weekdayLabel} desmarcada(s).`,
        color: 'green',
      });

      setWeekdayModalOpened(false);
      setWeekdayCancelTarget(null);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.teaCancellationTherapies, selectedTeaProfileId, fromDate],
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao excluir horários desse dia',
        color: 'red',
      });
    } finally {
      setCancelingWeekday(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Modal
        opened={confirmModalOpened}
        onClose={() => setConfirmModalOpened(false)}
        title="Confirmar cancelamento em lote"
        centered
        size="md"
      >
        <Stack gap="sm">
          {cancellationScope === 'single' ? (
            <>
              <Text size="sm">
                Você está cancelando a agenda de:
              </Text>
              <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Text fw={700}>{selectedTherapy?.procedureName || 'Terapia'}</Text>
                <Text size="sm" c="dimmed">{selectedTherapy?.professionalName || 'Profissional'}</Text>
              </Paper>
              <Text size="sm">
                Total de sessões que serão canceladas: <b>{selectedTherapy?.totalSessions || 0}</b>
              </Text>
            </>
          ) : (
            <>
              <Text size="sm">
                Você está cancelando <b>todas as terapias</b> futuras deste paciente.
              </Text>
              <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Text fw={700}>Terapias afetadas: {therapies.length}</Text>
                <Text size="sm" c="dimmed">Sessões totais previstas: {totalSessionsAllTherapies}</Text>
              </Paper>
            </>
          )}
          <FloatingTextarea
            label="Motivo (opcional)"
            placeholder="Informe o motivo do cancelamento em lote"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmModalOpened(false)} disabled={canceling}>
              Voltar
            </Button>
            <Button color="red" onClick={handleConfirmCancellation} loading={canceling}>
              {cancellationScope === 'all' ? 'Confirmar cancelamento total' : 'Confirmar cancelamento'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={weekdayModalOpened}
        onClose={() => {
          if (cancelingWeekday) return;
          setWeekdayModalOpened(false);
          setWeekdayCancelTarget(null);
        }}
        title="Excluir horários do dia"
        centered
        size="sm"
      >
        <Stack gap="sm">
          <Text size="sm">Deseja excluir os horários desse dia?</Text>
          <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
            <Text size="sm" fw={700}>
              Deseja excluir os horários da {weekdayCancelTarget?.weekdayLabel || '-'} • {weekdayCancelTarget?.timesLabel || '-'}?
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Apenas os horários desse dia da semana serão removidos. Os outros dias permanecem normais.
            </Text>
          </Paper>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setWeekdayModalOpened(false);
                setWeekdayCancelTarget(null);
              }}
              disabled={cancelingWeekday}
            >
              Não
            </Button>
            <Button color="red" onClick={handleConfirmWeekdayCancellation} loading={cancelingWeekday}>
              Sim
            </Button>
          </Group>
        </Stack>
      </Modal>

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
            <Text fw={700} size="lg" style={{ color: 'var(--mantine-color-text)' }}>Desmarcação em lote</Text>
            <Text size="sm" c="dimmed">Cancelar terapias recorrentes de um paciente TEA</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="md">
            <Group gap="xs">
              <CalendarX2 size={18} />
              <Text fw={700}>Seleção de paciente</Text>
            </Group>

            <FloatingSelect
              label="Paciente TEA"
              placeholder={loadingProfiles ? 'Carregando...' : 'Selecione um paciente'}
              data={teaProfileOptions}
              value={selectedTeaProfileId}
              onChange={setSelectedTeaProfileId}
              searchable
              clearable
            />

            {selectedProfile && (
              <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Group justify="space-between" align="center" wrap="wrap">
                  <Text size="sm" fw={600}>Paciente: {selectedProfile?.patient?.name || 'N/D'}</Text>
                  {therapies.length > 0 && (
                    <Button size="xs" color="red" variant="outline" onClick={openCancelAllModal}>
                      Desmarcar todas as terapias
                    </Button>
                  )}
                </Group>
              </Paper>
            )}

            {(loadingTherapies || fetchingTherapies) ? (
              <Stack gap="xs">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Paper key={index} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Box style={{ flex: 1 }}>
                        <Skeleton height={16} width="34%" mb={8} radius="xl" />
                        <Skeleton height={12} width="28%" radius="xl" />
                      </Box>
                      <Skeleton height={24} width={120} radius="xl" />
                    </Group>
                    <Group gap={8} wrap="wrap" mt="sm">
                      <Skeleton height={24} width={140} radius="xl" />
                      <Skeleton height={24} width={120} radius="xl" />
                      <Skeleton height={24} width={180} radius="xl" />
                    </Group>
                    <Skeleton height={50} mt="sm" radius="md" />
                  </Paper>
                ))}
              </Stack>
            ) : !selectedTeaProfileId ? (
              <Text size="sm" c="dimmed">Selecione um paciente para listar terapias agendadas.</Text>
            ) : therapies.length === 0 ? (
              <Text size="sm" c="dimmed">Nenhuma terapia com sessões futuras encontrada para esse paciente.</Text>
            ) : (
              <Stack gap="xs">
                {therapies.map((therapy: CancellationTherapyItem) => {
                  const weeklyPatternByWeekdayMap = therapy.slots
                    .map((slot: { date: string; time: string }) => ({
                      weekdayLabel: getWeekdayLabel(slot.date),
                      weekdayIndex: getWeekdayIndex(slot.date),
                      time: String(slot.time || '').trim(),
                    }))
                    .filter((slot: { weekdayLabel: string; weekdayIndex: number; time: string }) => slot.weekdayLabel !== 'Dia inválido' && slot.time)
                    .reduce((acc: Map<number, { weekdayIndex: number; weekdayLabel: string; times: string[] }>, slot: { weekdayLabel: string; weekdayIndex: number; time: string }) => {
                      const existing = acc.get(slot.weekdayIndex);
                      if (!existing) {
                        acc.set(slot.weekdayIndex, {
                          weekdayIndex: slot.weekdayIndex,
                          weekdayLabel: slot.weekdayLabel,
                          times: [slot.time],
                        });
                        return acc;
                      }

                      if (!existing.times.includes(slot.time)) {
                        existing.times.push(slot.time);
                      }
                      return acc;
                    }, new Map<number, { weekdayIndex: number; weekdayLabel: string; times: string[] }>());

                  const weeklyPatternByDay = Array.from(weeklyPatternByWeekdayMap.values())
                    .map((slot: { weekdayIndex: number; weekdayLabel: string; times: string[] }) => ({
                      ...slot,
                      times: [...slot.times].sort((a, b) => a.localeCompare(b)),
                    }))
                    .sort((a, b) => {
                      if (a.weekdayIndex !== b.weekdayIndex) return a.weekdayIndex - b.weekdayIndex;
                      return (a.times[0] || '').localeCompare(b.times[0] || '');
                    });
                  return (
                    <Paper key={therapy.pitTherapyId} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                      <Stack gap={6}>
                        <Group justify="space-between" align="center" wrap="wrap">
                          <Box>
                            <Text fw={600}>{therapy.procedureName}</Text>
                            <Text size="sm" c="dimmed">{therapy.professionalName}</Text>
                          </Box>
                          <Badge color="indigo" variant="light">{therapy.totalSessions} sessão(ões)</Badge>
                        </Group>

                        <Group gap={8} wrap="wrap">
                          <Badge variant="light" color="blue">Frequência: {therapy.weeklyFrequency}x/sem</Badge>
                          <Badge variant="light" color="grape">Turno: {therapy.preferredShift || 'Não definido'}</Badge>
                          <Badge variant="light" color="gray">
                            Dias: {Array.isArray(therapy.preferredWeekdays) && therapy.preferredWeekdays.length > 0 ? therapy.preferredWeekdays.join(', ') : 'Não definido'}
                          </Badge>
                        </Group>

                        <Divider />

                        <Stack gap={3}>
                          <Text size="xs" fw={600}>sessões</Text>
                          {weeklyPatternByDay.length > 0 ? (
                            <Group gap={6} wrap="wrap">
                              {weeklyPatternByDay.map((slot) => (
                                <Group
                                  key={`${slot.weekdayIndex}`}
                                  gap={4}
                                  wrap="nowrap"
                                  style={{
                                    display: 'inline-flex',
                                    borderRadius: 999,
                                    padding: '2px 6px 2px 10px',
                                    backgroundColor: colorScheme === 'dark'
                                      ? 'rgba(96, 165, 250, 0.18)'
                                      : 'var(--mantine-color-gray-2)',
                                    border: colorScheme === 'dark'
                                      ? '1px solid rgba(96, 165, 250, 0.45)'
                                      : '1px solid var(--mantine-color-gray-4)',
                                  }}
                                >
                                  <Text
                                    size="xs"
                                    fw={700}
                                    c={colorScheme === 'dark' ? 'var(--mantine-color-blue-1)' : 'var(--mantine-color-dark-7)'}
                                  >
                                    {slot.weekdayLabel} • {slot.times.join(', ')}
                                  </Text>
                                  <ActionIcon
                                    size="xs"
                                    variant="subtle"
                                    color="red"
                                    title={`Excluir horários de ${slot.weekdayLabel}`}
                                    onClick={() => openWeekdayCancelModal({
                                      weekdayIndex: slot.weekdayIndex,
                                      weekdayLabel: slot.weekdayLabel,
                                      timesLabel: slot.times.join(', '),
                                    })}
                                  >
                                    <X size={12} />
                                  </ActionIcon>
                                </Group>
                              ))}
                            </Group>
                          ) : (
                            <Text size="xs" c="dimmed">Sem sessões futuras listadas.</Text>
                          )}
                        </Stack>

                        <Group justify="flex-end">
                          <Button size="xs" color="red" variant="light" onClick={() => openCancelModal(therapy)}>
                            Desmarcar só esta terapia
                          </Button>
                        </Group>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
