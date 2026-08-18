import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Paper,
  SimpleGrid,
  Table,
  Text,
  useComputedColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { AlertTriangle, ChevronLeft, Clock3, Copy, Grid2x2, History, List, MoreVertical, Play, Search, Video } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { FloatingInput } from '../common/FloatingInput';
import consultationService from '../../services/consultationService';
import teleconsultationLinkService from '../../services/teleconsultationLinkService';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { formatCPF } from '../../utils/formatters';

interface ConsultationRow {
  id: string;
  appointmentId?: string;
  nomeCompleto: string;
  cpf?: string;
  doctorName?: string;
  convenio?: string;
  agendadoPara: string;
  agenda: string;
  statusFluxo: string;
  appointmentType: string;
  priority?: string;
  notes?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  isTeleconsultation: boolean;
  triageRequired: boolean;
}

const WAITING_STATUS = 'Aguardando atendimento';
const CALLED_STATUS = 'Chamado para atendimento';
const IN_PROGRESS_STATUS = 'Em atendimento';
const DONE_STATUS = 'Atendimento concluído';
const CLINICAL_QUEUE_TYPE = 'Fila clínica';
const VIEW_MODES = {
  LIST: 'list',
  CARDS: 'cards',
} as const;

type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];

const FILTER_KEYS = {
  ALL: 'all',
  WAITING: 'waiting',
  IN_PROGRESS: 'inProgress',
  TELECONSULT: 'teleconsult',
  FINALIZED: 'finalized',
} as const;

type FilterKey = typeof FILTER_KEYS[keyof typeof FILTER_KEYS];

const statusBadge = (status: string) => {
  if (status === WAITING_STATUS) return { color: 'yellow', label: 'Aguardando' };
  if (status === CALLED_STATUS) return { color: 'blue', label: 'Aguardando' };
  if (status === IN_PROGRESS_STATUS) return { color: 'green', label: 'Em atendimento' };
  return { color: 'gray', label: status || '-' };
};

const normalizeText = (value?: string | null) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase();

const isUrgentRow = (row: ConsultationRow) => normalizeText(`${row.priority || ''} ${row.notes || ''}`).includes('URGENTE');

const isWaitingRow = (row: ConsultationRow) => {
  const status = normalizeText(row.statusFluxo);
  return status === normalizeText(WAITING_STATUS) || status === normalizeText(CALLED_STATUS);
};

const isInProgressRow = (row: ConsultationRow) => normalizeText(row.statusFluxo) === normalizeText(IN_PROGRESS_STATUS);

const isFinalizedRow = (row: ConsultationRow) => {
  const status = normalizeText(row.statusFluxo);
  if (!status) return false;
  if (status === normalizeText(DONE_STATUS)) return true;
  return status.includes('CONCLUID') && (status.includes('ATENDIMENTO') || status.includes('EXAME'));
};

const getAppointmentTypeLabel = (value?: string | null) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'EXAME' || normalized === 'EXAM') return 'Exame';
  return 'Consulta';
};

const getChipFilterLabel = (key: FilterKey) => {
  if (key === FILTER_KEYS.ALL) return 'Todos';
  if (key === FILTER_KEYS.WAITING) return 'Aguardando';
  if (key === FILTER_KEYS.IN_PROGRESS) return 'Em Atendimento';
  if (key === FILTER_KEYS.TELECONSULT) return 'Teleconsulta';
  return 'Finalizados';
};

const rowMatchesFilter = (row: ConsultationRow, filter: FilterKey) => {
  if (filter === FILTER_KEYS.ALL) return !isFinalizedRow(row);
  if (filter === FILTER_KEYS.WAITING) return isWaitingRow(row) && !isFinalizedRow(row);
  if (filter === FILTER_KEYS.IN_PROGRESS) return isInProgressRow(row) && !isFinalizedRow(row);
  if (filter === FILTER_KEYS.TELECONSULT) return row.isTeleconsultation && !isFinalizedRow(row);
  return isFinalizedRow(row);
};

const parseAppointmentDateTime = (row: ConsultationRow) => {
  const rawDate = String(row.appointmentDate || '').trim();
  const rawTime = String(row.appointmentTime || '').trim();
  if (rawDate && rawTime) return `${rawTime} | ${rawDate.split('-').reverse().join('/')}`;
  if (rawDate) return rawDate.split('-').reverse().join('/');
  if (rawTime) return rawTime;
  if (row.agendadoPara && row.agendadoPara !== '-') return row.agendadoPara;
  if (row.agenda && row.agenda !== '-') return row.agenda;
  return '-';
};

const parseComplaint = (row: ConsultationRow) => {
  const raw = String(row.notes || row.agenda || '').trim();
  if (!raw || raw === '-') return 'Sem descrição da consulta';
  return raw;
};

export function Consulta() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loggedDoctorName, setLoggedDoctorName] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.LIST);
  const [activeFilter, setActiveFilter] = useState<FilterKey>(FILTER_KEYS.ALL);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const isDark = useComputedColorScheme('light') === 'dark';
  const clinicalQueueQuery = useClinicalQueueQuery();
  const appointmentsQuery = useAppointmentsQuery();

  const mapApiToRow = (it: any): ConsultationRow => ({
    id: String(it.id),
    appointmentId: String(it.appointmentId || it.appointment_id || it.appointment?.id || ''),
    nomeCompleto: it.patientName || '',
    cpf:
      it.patientCpf
      || it.patient_cpf
      || it.cpf
      || it.patient?.cpf
      || it.patient?.document
      || it.patientDocument
      || it.patient_document
      || '',
    doctorName: String(it.doctorName || it.appointment?.doctorName || '').trim(),
    convenio: it.convenio || '',
    agendadoPara: it.scheduledFor || '-',
    agenda: it.agenda || '-',
    statusFluxo: it.queue || WAITING_STATUS,
    appointmentType: String(it.appointmentType || it.appointment?.type || ''),
    priority: String(it.priority || it.orderPriority || it.appointment?.orderPriority || ''),
    notes: String(it.notes || it.orderNotes || it.mainComplaint || it.triageNotes || it.appointment?.observations || it.agenda || ''),
    appointmentDate: String(it.appointment?.date || ''),
    appointmentTime: String(it.appointment?.time || ''),
    isTeleconsultation: Boolean(it.isTeleconsultation),
    triageRequired: Boolean(it.triageRequired),
  });

  const appointmentCpfById = useMemo(() => {
    const items = Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : [];
    return items.reduce<Record<string, string>>((acc, item: any) => {
      const key = String(item?.id || '').trim();
      const cpf = String(item?.patientCpf || item?.patient_cpf || item?.patient?.cpf || '').trim();
      if (key && cpf) acc[key] = cpf;
      return acc;
    }, {});
  }, [appointmentsQuery.data]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setLoggedDoctorName(String(user?.doctor?.name || '').trim());
    } catch {
      setLoggedDoctorName('');
    }
  }, []);

  useEffect(() => {
    setRows(
      (((clinicalQueueQuery.data as any[]) || [])
        .map((item) => {
          const mapped = mapApiToRow(item);
          return {
            ...mapped,
            cpf: mapped.cpf || appointmentCpfById[mapped.appointmentId || ''] || '',
          };
        })
        .filter((item) => getAppointmentTypeLabel(item.appointmentType) !== 'Exame' && !item.triageRequired)),
    );
  }, [appointmentCpfById, clinicalQueueQuery.data]);

  const counters = useMemo(() => ({
    [FILTER_KEYS.ALL]: rows.filter((row) => rowMatchesFilter(row, FILTER_KEYS.ALL)).length,
    [FILTER_KEYS.WAITING]: rows.filter((row) => rowMatchesFilter(row, FILTER_KEYS.WAITING)).length,
    [FILTER_KEYS.IN_PROGRESS]: rows.filter((row) => rowMatchesFilter(row, FILTER_KEYS.IN_PROGRESS)).length,
    [FILTER_KEYS.TELECONSULT]: rows.filter((row) => rowMatchesFilter(row, FILTER_KEYS.TELECONSULT)).length,
    [FILTER_KEYS.FINALIZED]: rows.filter((row) => rowMatchesFilter(row, FILTER_KEYS.FINALIZED)).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filteredByChip = rows.filter((row) => rowMatchesFilter(row, activeFilter));
    if (!normalized) return filteredByChip;
    return filteredByChip.filter((row) =>
      [row.nomeCompleto, row.convenio, row.agenda, row.agendadoPara, row.statusFluxo, row.notes, row.doctorName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [rows, query, activeFilter]);

  const openClinicalCare = (row: ConsultationRow) => {
    navigate(`/consulta/atendimento/${row.id}`);
  };

  const copyTeleconsultationLink = async (row: ConsultationRow) => {
    if (!row.appointmentId || !row.isTeleconsultation) return;
    try {
      setLoadingId(row.id);
      const result = await teleconsultationLinkService.sendWhatsAppLinkByAppointment(row.appointmentId, {
        sendPatientMessage: false,
      });
      const patientUrl = String(result?.links?.patientUrl || '').trim();
      if (!patientUrl) throw new Error('Link do paciente não disponível.');
      await navigator.clipboard.writeText(patientUrl);
      showNotification({
        title: 'Link copiado',
        message: 'Link da teleconsulta copiado para a área de transferência.',
        color: 'green',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Não foi possível copiar o link da teleconsulta'),
        color: 'red',
      });
    } finally {
      setLoadingId(null);
    }
  };
  const startInPersonConsultation = async (row: ConsultationRow) => {
    try {
      setLoadingId(row.id);
      const status = normalizeText(row.statusFluxo);

      if (status === normalizeText(WAITING_STATUS)) {
        await consultationService.update(row.id, { queue: CALLED_STATUS, queueType: CLINICAL_QUEUE_TYPE });
      }

      if (status !== normalizeText(IN_PROGRESS_STATUS)) {
        await consultationService.update(row.id, { queue: IN_PROGRESS_STATUS, queueType: CLINICAL_QUEUE_TYPE });
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
      openClinicalCare(row);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao iniciar consulta'),
        color: 'red',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const startTeleconsultation = async (row: ConsultationRow) => {
    if (!row.appointmentId) {
      showNotification({
        title: 'Não foi possível iniciar',
        message: 'Consulta sem agendamento vinculado.',
        color: 'red',
      });
      return;
    }

    try {
      setLoadingId(row.id);
      await consultationService.update(row.id, { queue: IN_PROGRESS_STATUS, queueType: CLINICAL_QUEUE_TYPE });
      const result = await teleconsultationLinkService.sendWhatsAppLinkByAppointment(row.appointmentId, {
        sendPatientMessage: false,
      });

      const doctorUrlRaw = String(result?.links?.doctorUrl || '').trim();
      if (!doctorUrlRaw) {
        throw new Error('Link do médico não retornado.');
      }

      const doctorUrl = new URL(doctorUrlRaw, window.location.origin);
      const token = doctorUrl.searchParams.get('token');
      if (!token) {
        throw new Error('Token do médico não encontrado no link.');
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
      window.location.assign(`/teleconsulta/preparacao?token=${encodeURIComponent(token)}`);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Não foi possível iniciar a teleconsulta.',
        color: 'red',
      });
      setLoadingId(null);
    }
  };
  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1500} mx="auto">
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Consulta
              </Text>
              <Text size="sm" c="dimmed">
                {loggedDoctorName ? `Consultas e exames do(a) Dr(a). ${loggedDoctorName}` : 'Consultas e exames'}
              </Text>
            </Box>
          </Group>
          <Button
            variant="light"
            color="darkBlue"
            leftSection={<History size={16} />}
            onClick={() => navigate('/historico')}
            size={isMobile ? 'xs' : 'sm'}
          >
            Histórico
          </Button>
        </Group>

        <Paper
          withBorder
          p={isMobile ? 'sm' : 'md'}
          radius="md"
          style={{
            background: isDark ? '#031233' : '#fff',
            borderColor: isDark ? 'rgba(74, 108, 186, 0.3)' : 'var(--mantine-color-gray-3)',
          }}
        >
          {viewMode === VIEW_MODES.LIST && (
            <Box mt="sm">
              <FloatingInput
                label="Buscar"
                alwaysFloatLabel
                placeholder="Buscar"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                rightSection={<Search size={16} color="var(--mantine-color-dimmed)" style={{ pointerEvents: 'none' }} />}
                containerProps={{ style: { minHeight: 56 } }}
              />
            </Box>
          )}

          <Group justify="space-between" mt="sm" mb="sm" wrap="wrap" gap="xs">
            <Group gap="xs" wrap="wrap">
              {(Object.values(FILTER_KEYS) as FilterKey[]).map((chip) => {
                const isActive = activeFilter === chip;
                return (
                  <Button
                    key={chip}
                    size="xs"
                    radius="sm"
                    variant={isActive ? 'filled' : 'light'}
                    color="darkBlue"
                    onClick={() => setActiveFilter(chip)}
                    rightSection={(
                      <Box
                        px={6}
                        py={1}
                        style={{
                          borderRadius: 4,
                          background: isActive ? 'rgba(255,255,255,0.16)' : (isDark ? '#0a1d4d' : '#0b1a43'),
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          minWidth: 18,
                          textAlign: 'center',
                        }}
                      >
                        {counters[chip]}
                      </Box>
                    )}
                  >
                    {getChipFilterLabel(chip)}
                  </Button>
                );
              })}
            </Group>

            <Group gap={6}>
              <ActionIcon
                variant={viewMode === VIEW_MODES.LIST ? 'filled' : 'light'}
                color="darkBlue"
                onClick={() => setViewMode(VIEW_MODES.LIST)}
                aria-label="Visualização em lista"
              >
                <List size={16} />
              </ActionIcon>
              <ActionIcon
                variant={viewMode === VIEW_MODES.CARDS ? 'filled' : 'light'}
                color="darkBlue"
                onClick={() => setViewMode(VIEW_MODES.CARDS)}
                aria-label="Visualização em cards"
              >
                <Grid2x2 size={16} />
              </ActionIcon>
            </Group>
          </Group>

          {viewMode === VIEW_MODES.LIST && (
            <Box style={{ overflowX: 'auto', border: `1px solid ${isDark ? 'rgba(74,108,186,0.35)' : '#e9ecef'}`, borderRadius: 6 }}>
              <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: 'none' }}>
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Agendado para</Table.Th>
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>}
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center', width: 96 }}>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.length > 0 ? filtered.map((row) => {
                    const badge = statusBadge(row.statusFluxo);
                    const isFinalized = isFinalizedRow(row);
                    return (
                      <Table.Tr key={row.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <Table.Td>
                          <Group gap={isMobile ? 'xs' : 'sm'}>
                            {!isMobile && (
                              <Box
                                bg={DARK_BLUE}
                                w={32}
                                h={32}
                                style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              >
                                <Text c="white" fw={600} size="sm">
                                  {row.nomeCompleto.charAt(0).toUpperCase()}
                                </Text>
                              </Box>
                            )}
                            <Box>
                              <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
                                {row.nomeCompleto}
                              </Text>
                              {!isTablet && (
                                <Text size="xs" c="dimmed">
                                  CPF: {row.cpf ? formatCPF(row.cpf) : 'Não informado'}
                                </Text>
                              )}
                            </Box>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={badge.color} variant="light">
                            {badge.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{parseAppointmentDateTime(row)}</Text>
                        </Table.Td>
                        {!isTablet && (
                          <Table.Td>
                            <Badge variant="outline" radius="xl" color={row.convenio ? 'blue' : 'gray'}>
                              {row.convenio || 'Particular'}
                            </Badge>
                          </Table.Td>
                        )}
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group justify="center">
                            <Menu shadow="md" width={220} position="bottom-end" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações da consulta">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {row.isTeleconsultation && !isFinalized && (
                                  <Menu.Item
                                    leftSection={<Copy size={14} />}
                                    disabled={loadingId === row.id}
                                    onClick={() => { void copyTeleconsultationLink(row); }}
                                  >
                                    Copiar link
                                  </Menu.Item>
                                )}
                                {!isFinalized && (
                                  <Menu.Item
                                    leftSection={row.isTeleconsultation ? <Video size={14} /> : <Play size={14} />}
                                    disabled={loadingId === row.id}
                                    onClick={() => {
                                      if (row.isTeleconsultation) {
                                        void startTeleconsultation(row);
                                        return;
                                      }
                                      void startInPersonConsultation(row);
                                    }}
                                  >
                                    {row.isTeleconsultation ? 'Iniciar teleconsulta' : 'Iniciar consulta'}
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  }) : (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text ta="center" c="dimmed" py="md">Nenhuma consulta na fila no momento.</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Box>
          )}

          {viewMode === VIEW_MODES.CARDS && (
            <Box>
              {filtered.length > 0 ? (
                <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                  {filtered.map((row) => {
                    const isFinalized = isFinalizedRow(row);
                    const dateTimeLabel = parseAppointmentDateTime(row);
                    const complaint = parseComplaint(row);
                    const urgent = isUrgentRow(row);
                    return (
                      <Paper
                        key={row.id}
                        withBorder
                        p="sm"
                        radius="md"
                        style={{
                          background: isDark ? '#051845' : '#f8f9ff',
                          borderColor: isDark ? 'rgba(74,108,186,0.45)' : 'var(--mantine-color-gray-3)',
                        }}
                      >
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Group align="center" wrap="nowrap" gap="sm" style={{ minWidth: 0 }}>
                            <Box
                              style={{
                                minWidth: 36,
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: isDark ? '#4d67b4' : '#5d78c9',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 22,
                              }}
                            >
                              {row.nomeCompleto.slice(0, 1).toUpperCase()}
                            </Box>
                            <Box style={{ minWidth: 0 }}>
                              <Text fw={700} lineClamp={1}>{row.nomeCompleto}</Text>
                              <Text size="sm" c="dimmed" lineClamp={1}>{row.convenio || 'SulAmerica'}</Text>
                            </Box>
                          </Group>
                          <Box>
                            {row.isTeleconsultation && <Text fw={700} c="blue.3">Teleconsulta</Text>}
                            {urgent && (
                              <Group gap={4} justify="flex-end" mt={row.isTeleconsultation ? 2 : 0}>
                                <AlertTriangle size={14} color="#f76707" />
                                <Text c="orange.6" fw={700} size="sm">Urgente</Text>
                              </Group>
                            )}
                          </Box>
                        </Group>

                        <Group gap={8} mt="sm">
                          <Clock3 size={14} />
                          <Text size="sm">{dateTimeLabel}</Text>
                        </Group>

                        <Text size="sm" mt={8} lineClamp={2}>
                          <Text component="span" fw={700}>Queixa: </Text>
                          {complaint}
                        </Text>
                        <Text size="sm" mt={2} lineClamp={1}>
                          <Text component="span" fw={700}>Profissional: </Text>
                          {row.doctorName || loggedDoctorName || '-'}
                        </Text>

                        <Divider my="sm" />

                        {!isFinalized && (
                          row.isTeleconsultation ? (
                            <Group gap={8} wrap="nowrap">
                              <Button
                                size="sm"
                                variant="default"
                                leftSection={<Copy size={14} />}
                                onClick={() => { void copyTeleconsultationLink(row); }}
                                loading={loadingId === row.id}
                                style={{ flex: 1 }}
                              >
                                Copiar Link
                              </Button>
                              <Button
                                size="sm"
                                color="darkBlue"
                                leftSection={<Video size={14} />}
                                onClick={() => { void startTeleconsultation(row); }}
                                loading={loadingId === row.id}
                                style={{ flex: 1 }}
                              >
                                Iniciar teleconsulta
                              </Button>
                            </Group>
                          ) : (
                            <Group gap={8} wrap="nowrap">
                              <Button
                                size="sm"
                                color="darkBlue"
                                leftSection={<Play size={14} />}
                                onClick={() => { void startInPersonConsultation(row); }}
                                loading={loadingId === row.id}
                                style={{ flex: 1 }}
                              >
                                Iniciar consulta
                              </Button>
                            </Group>
                          )
                        )}
                      </Paper>
                    );
                  })}
                </SimpleGrid>
              ) : (
                <Text ta="center" c="dimmed" py="md">Nenhuma consulta na fila no momento.</Text>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
