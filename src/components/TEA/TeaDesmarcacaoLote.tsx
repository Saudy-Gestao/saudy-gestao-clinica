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
  Badge,
  Loader,
  Modal,
  Textarea,
  Divider,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, CalendarX2 } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import teaProfileService from '../../services/teaProfileService';
import teaPreReservationService from '../../services/teaPreReservationService';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF } from '../../utils/formatters';

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

export function TeaDesmarcacaoLote() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();

  const [teaProfiles, setTeaProfiles] = useState<any[]>([]);
  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingTherapies, setLoadingTherapies] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const [therapies, setTherapies] = useState<CancellationTherapyItem[]>([]);
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [selectedTherapy, setSelectedTherapy] = useState<CancellationTherapyItem | null>(null);
  const [cancellationScope, setCancellationScope] = useState<CancellationScope>('single');
  const [cancelReason, setCancelReason] = useState('');

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

  const loadTeaProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const data: any = await teaProfileService.list({ limit: 300, offset: 0 });
      const list: any[] = Array.isArray(data)
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

  const loadTherapies = async (teaProfileId: string) => {
    setLoadingTherapies(true);
    try {
      const data: any = await teaPreReservationService.listCancellationTherapies({
        teaProfileId,
        fromDate: dayjs().format('YYYY-MM-DD'),
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setTherapies(items);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar terapias agendadas',
        color: 'red',
      });
      setTherapies([]);
    } finally {
      setLoadingTherapies(false);
    }
  };

  useEffect(() => {
    loadTeaProfiles();
  }, []);

  useEffect(() => {
    if (!selectedTeaProfileId) {
      setTherapies([]);
      return;
    }
    loadTherapies(selectedTeaProfileId);
  }, [selectedTeaProfileId]);

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

  const totalSessionsAllTherapies = useMemo(
    () => therapies.reduce((acc, item) => acc + Number(item.totalSessions || 0), 0),
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
        fromDate: dayjs().format('YYYY-MM-DD'),
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
      await loadTherapies(selectedTeaProfileId);
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
          <Textarea
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

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={14}>
          <Button variant="subtle" color="dark" leftSection={<ChevronLeft size={18} />} onClick={() => navigate('/tea')}>
            Voltar
          </Button>
          <Box>
            <Text fw={700} size="lg" style={{ color: DARK_BLUE }}>Desmarcação em lote</Text>
            <Text size="sm" c="dimmed">Cancelar terapias recorrentes de um paciente TEA</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="md">
            <Group gap="xs">
              <CalendarX2 size={18} />
              <Text fw={700}>Seleção de paciente</Text>
            </Group>

            <Select
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

            {loadingTherapies ? (
              <Group justify="center"><Loader size="sm" /></Group>
            ) : !selectedTeaProfileId ? (
              <Text size="sm" c="dimmed">Selecione um paciente para listar terapias agendadas.</Text>
            ) : therapies.length === 0 ? (
              <Text size="sm" c="dimmed">Nenhuma terapia com sessões futuras encontrada para esse paciente.</Text>
            ) : (
              <Stack gap="xs">
                {therapies.map((therapy) => {
                  const previewSlots = therapy.slots.slice(0, 6);
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
                          <Text size="xs" fw={600}>Próximas sessões</Text>
                          {previewSlots.length > 0 ? (
                            <Group gap={6} wrap="wrap">
                              {previewSlots.map((slot) => (
                                <Badge
                                  key={`${slot.date}-${slot.time}`}
                                  variant="filled"
                                  color={colorScheme === 'dark' ? 'blue' : 'gray'}
                                  styles={{
                                    root: {
                                      backgroundColor: colorScheme === 'dark'
                                        ? 'rgba(96, 165, 250, 0.18)'
                                        : undefined,
                                      border: colorScheme === 'dark'
                                        ? '1px solid rgba(96, 165, 250, 0.45)'
                                        : undefined,
                                      color: colorScheme === 'dark'
                                        ? 'var(--mantine-color-blue-1)'
                                        : undefined,
                                      fontWeight: 700,
                                    },
                                  }}
                                >
                                  {dayjs(slot.date).format('DD/MM')} • {slot.time}
                                </Badge>
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
