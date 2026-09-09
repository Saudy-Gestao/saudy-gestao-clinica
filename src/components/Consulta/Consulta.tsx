import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Menu,
  Paper,
  Table,
  Text,
  TextInput,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { showNotification } from '@/components/ui';
import { Activity, AlertTriangle, Clock3, Copy, Grid2x2, History, List, MoreVertical, Play, Search, Users, Video } from 'lucide-react';
import { Header } from '../Header/Header';
import consultationService from '../../services/consultationService';
import teleconsultationLinkService from '../../services/teleconsultationLinkService';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { formatCPF } from '../../utils/formatters';
import './Consulta.css';

interface ConsultationRow {
  id: string;
  appointmentId?: string;
  nomeCompleto: string;
  cpf?: string;
  doctorName?: string;
  convenio?: string;
  procedimento?: string;
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
    procedimento: String(it.procedureName || it.procedure || it.appointment?.specialty || it.specialty || '').trim(),
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
      [row.nomeCompleto, row.procedimento, row.convenio, row.agenda, row.agendadoPara, row.statusFluxo, row.notes, row.doctorName]
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
    <Box className="consulta-page" bg="var(--mantine-color-body)">
      <Header back={{ label: 'Voltar', onClick: () => navigate(-1) }} />

      <Box className="consulta-container" maw={1500} mx="auto">
        <Box className="consulta-hero">
          <Box>
            <Text className="consulta-eyebrow">OPERAÇÃO CLÍNICA</Text>
            <Text component="h1" className="consulta-title">Fila de consultas</Text>
            <Text className="consulta-subtitle">
              {loggedDoctorName ? `Atendimentos disponíveis para o(a) Dr(a). ${loggedDoctorName}` : 'Acompanhe e inicie os atendimentos da clínica'}
            </Text>
          </Box>
          <Button className="consulta-history-button" variant="outline" leftSection={<History size={17} />} onClick={() => navigate('/historico')}>
            Histórico
          </Button>
        </Box>

        <Box className="consulta-summary" aria-label="Resumo da fila">
          <Box className="consulta-summary-item">
            <Box className="consulta-summary-icon"><Users size={18} /></Box>
            <Box><Text className="consulta-summary-value">{counters[FILTER_KEYS.ALL]}</Text><Text className="consulta-summary-label">Na fila agora</Text></Box>
          </Box>
          <Box className="consulta-summary-item">
            <Box className="consulta-summary-icon consulta-summary-icon--warning"><Clock3 size={18} /></Box>
            <Box><Text className="consulta-summary-value">{counters[FILTER_KEYS.WAITING]}</Text><Text className="consulta-summary-label">Aguardando</Text></Box>
          </Box>
          <Box className="consulta-summary-item">
            <Box className="consulta-summary-icon consulta-summary-icon--success"><Activity size={18} /></Box>
            <Box><Text className="consulta-summary-value">{counters[FILTER_KEYS.IN_PROGRESS]}</Text><Text className="consulta-summary-label">Em atendimento</Text></Box>
          </Box>
          <Box className="consulta-summary-item">
            <Box className="consulta-summary-icon consulta-summary-icon--tele"><Video size={18} /></Box>
            <Box><Text className="consulta-summary-value">{counters[FILTER_KEYS.TELECONSULT]}</Text><Text className="consulta-summary-label">Teleconsultas</Text></Box>
          </Box>
        </Box>

        <Paper className="consulta-workspace" withBorder>
          <Box className="consulta-toolbar">
            <TextInput
              className="consulta-search"
              label="Buscar na fila"
              placeholder="Paciente, CPF, procedimento ou profissional"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              leftSection={<Search size={17} aria-hidden="true" />}
            />
            <Box className="consulta-view-control" aria-label="Modo de visualização">
              <Text className="consulta-control-label">Visualização</Text>
              <Box className="consulta-view-switcher">
                <ActionIcon className={viewMode === VIEW_MODES.LIST ? 'consulta-view-button is-active' : 'consulta-view-button'} variant={viewMode === VIEW_MODES.LIST ? 'filled' : 'subtle'} onClick={() => setViewMode(VIEW_MODES.LIST)} aria-label="Visualização em lista">
                  <List size={17} />
                </ActionIcon>
                <ActionIcon className={viewMode === VIEW_MODES.CARDS ? 'consulta-view-button is-active' : 'consulta-view-button'} variant={viewMode === VIEW_MODES.CARDS ? 'filled' : 'subtle'} onClick={() => setViewMode(VIEW_MODES.CARDS)} aria-label="Visualização em cards">
                  <Grid2x2 size={17} />
                </ActionIcon>
              </Box>
            </Box>
          </Box>

          <Box className="consulta-filter-row" aria-label="Filtros da fila">
            <Text className="consulta-control-label">Filtrar por status</Text>
            <Box className="consulta-filters">
              {(Object.values(FILTER_KEYS) as FilterKey[]).map((chip) => {
                const isActive = activeFilter === chip;
                return (
                  <Button key={chip} className={isActive ? 'consulta-filter-button is-active' : 'consulta-filter-button'} variant={isActive ? 'filled' : 'outline'} onClick={() => setActiveFilter(chip)} rightSection={<Box className="consulta-filter-count">{counters[chip]}</Box>}>
                    {getChipFilterLabel(chip)}
                  </Button>
                );
              })}
            </Box>
          </Box>

          <Box className="consulta-results-meta">
            <Text><b>{filtered.length}</b> {filtered.length === 1 ? 'consulta encontrada' : 'consultas encontradas'}</Text>
            {query.trim() && <Text className="consulta-results-query">Busca por “{query.trim()}”</Text>}
          </Box>

          {viewMode === VIEW_MODES.LIST && (
            <Box className="consulta-table-shell">
              <Table className="consulta-table" horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Paciente</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Agendado para</Table.Th>
                    <Table.Th>Procedimento</Table.Th>
                    <Table.Th>Profissional</Table.Th>
                    {!isTablet && <Table.Th>Convênio</Table.Th>}
                    <Table.Th className="consulta-actions-column">Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.length > 0 ? filtered.map((row) => {
                    const badge = statusBadge(row.statusFluxo);
                    const isFinalized = isFinalizedRow(row);
                    return (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <Box className="consulta-patient-cell">
                            {!isMobile && <Box className="consulta-avatar">{row.nomeCompleto.charAt(0).toUpperCase()}</Box>}
                            <Box className="consulta-patient-copy">
                              <Text fw={650}>{row.nomeCompleto}</Text>
                              {!isTablet && <Text size="xs" c="dimmed">CPF: {row.cpf ? formatCPF(row.cpf) : 'Não informado'}</Text>}
                            </Box>
                          </Box>
                        </Table.Td>
                        <Table.Td><Badge className="consulta-status-badge" color={badge.color} variant="light">{badge.label}</Badge></Table.Td>
                        <Table.Td><Text className="consulta-date-cell">{parseAppointmentDateTime(row)}</Text></Table.Td>
                        <Table.Td><Text className="consulta-truncate-cell" title={row.procedimento || '-'}>{row.procedimento || '-'}</Text></Table.Td>
                        <Table.Td><Text className="consulta-truncate-cell" title={row.doctorName || loggedDoctorName || '-'}>{row.doctorName || loggedDoctorName || '-'}</Text></Table.Td>
                        {!isTablet && <Table.Td><Badge variant="outline" radius="xl" color={row.convenio ? 'blue' : 'gray'}>{row.convenio || 'Particular'}</Badge></Table.Td>}
                        <Table.Td className="consulta-actions-column">
                          <Box className="consulta-menu-anchor">
                            <Menu shadow="md" width={220} position="bottom-end" withArrow>
                              <Menu.Target><ActionIcon className="consulta-row-action" variant="light" size="sm" aria-label={`Ações da consulta de ${row.nomeCompleto}`}><MoreVertical size={16} /></ActionIcon></Menu.Target>
                              <Menu.Dropdown>
                                {row.isTeleconsultation && !isFinalized && <Menu.Item leftSection={<Copy size={14} />} disabled={loadingId === row.id} onClick={() => { void copyTeleconsultationLink(row); }}>Copiar link</Menu.Item>}
                                {!isFinalized && <Menu.Item leftSection={row.isTeleconsultation ? <Video size={14} /> : <Play size={14} />} disabled={loadingId === row.id} onClick={() => { if (row.isTeleconsultation) { void startTeleconsultation(row); return; } void startInPersonConsultation(row); }}>{row.isTeleconsultation ? 'Iniciar teleconsulta' : 'Iniciar consulta'}</Menu.Item>}
                              </Menu.Dropdown>
                            </Menu>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    );
                  }) : (
                    <Table.Tr><Table.Td colSpan={isTablet ? 6 : 7}><Box className="consulta-empty-state"><Search size={24} /><Text>Nenhuma consulta encontrada</Text><Text size="sm">Ajuste os filtros ou aguarde novos atendimentos.</Text></Box></Table.Td></Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Box>
          )}

          {viewMode === VIEW_MODES.CARDS && (
            <Box className="consulta-cards-grid">
              {filtered.length > 0 ? filtered.map((row) => {
                const isFinalized = isFinalizedRow(row);
                const dateTimeLabel = parseAppointmentDateTime(row);
                const complaint = parseComplaint(row);
                const urgent = isUrgentRow(row);
                const badge = statusBadge(row.statusFluxo);
                return (
                  <Paper key={row.id} className="consulta-card" withBorder>
                    <Box className="consulta-card-header">
                      <Box className="consulta-card-person"><Box className="consulta-avatar consulta-avatar--large">{row.nomeCompleto.slice(0, 1).toUpperCase()}</Box><Box className="consulta-patient-copy"><Text fw={700} lineClamp={1}>{row.nomeCompleto}</Text><Text size="sm" c="dimmed" lineClamp={1}>{row.convenio || 'Particular'}</Text></Box></Box>
                      <Box className="consulta-card-tags"><Badge className="consulta-status-badge" color={badge.color} variant="light">{badge.label}</Badge>{row.isTeleconsultation && <Badge color="blue" variant="outline">Teleconsulta</Badge>}{urgent && <Badge color="orange" variant="outline"><AlertTriangle size={13} /> Urgente</Badge>}</Box>
                    </Box>
                    <Box className="consulta-card-date"><Clock3 size={16} /><Text>{dateTimeLabel}</Text></Box>
                    <Box className="consulta-card-details">
                      <Box><Text className="consulta-detail-label">Procedimento</Text><Text lineClamp={1}>{row.procedimento || '-'}</Text></Box>
                      <Box><Text className="consulta-detail-label">Profissional</Text><Text lineClamp={1}>{row.doctorName || loggedDoctorName || '-'}</Text></Box>
                      <Box className="consulta-card-note"><Text className="consulta-detail-label">Observação</Text><Text size="sm" c="dimmed" lineClamp={2}>{complaint}</Text></Box>
                    </Box>
                    {!isFinalized && <><Divider className="consulta-card-divider" />{row.isTeleconsultation ? <Box className="consulta-card-actions"><Button variant="outline" leftSection={<Copy size={15} />} onClick={() => { void copyTeleconsultationLink(row); }} loading={loadingId === row.id}>Copiar link</Button><Button leftSection={<Video size={15} />} onClick={() => { void startTeleconsultation(row); }} loading={loadingId === row.id}>Iniciar</Button></Box> : <Button fullWidth leftSection={<Play size={15} />} onClick={() => { void startInPersonConsultation(row); }} loading={loadingId === row.id}>Iniciar consulta</Button>}</>}
                  </Paper>
                );
              }) : <Box className="consulta-empty-state"><Search size={24} /><Text>Nenhuma consulta encontrada</Text><Text size="sm">Ajuste os filtros ou aguarde novos atendimentos.</Text></Box>}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
