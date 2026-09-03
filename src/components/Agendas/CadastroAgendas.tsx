import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Table,
  Modal,
  Stack,
  ActionIcon,
  Badge,
  Paper,
  Skeleton,
  Menu,
  Stepper,
  Divider,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { PaginatedGrid } from '../common/PaginatedGrid';
import agendaService, { type Agenda } from '../../services/agendaService';
import { useAgendasAdminQuery } from '../../hooks/useAgendasAdminQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useEspecialidadesAdminQuery } from '../../hooks/useEspecialidadesAdminQuery';
import { useRoomsAdminQuery } from '../../hooks/useRoomsAdminQuery';
import { useInternsAdminQuery } from '../../hooks/useInternsAdminQuery';
import { isRoomSector } from '../../utils/sectorClassification';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import './CadastroAgendas.css';
import { CadastroAgendaEscalaForm } from './CadastroAgendaEscalaForm';

const WEEKDAY_OPTIONS = [
  { value: 'segunda', label: 'Segunda' },
  { value: 'terca', label: 'Terça' },
  { value: 'quarta', label: 'Quarta' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'sexta', label: 'Sexta' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

const WEEKDAY_LABEL: Record<string, string> = WEEKDAY_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {});

const STATUS_OPTIONS = [
  { value: 'ATIVA', label: 'Ativa' },
  { value: 'INATIVA', label: 'Inativa' },
  { value: 'BLOQUEADA', label: 'Bloqueada' },
];

const STATUS_COLOR: Record<string, string> = { ATIVA: 'green', INATIVA: 'gray', BLOQUEADA: 'red' };

const getApiList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR');
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const genKey = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

interface AgendaFormState {
  branchId: string;
  doctorId: string;
  weekday: string;
  shiftStart: string;
  shiftEnd: string;
  especialidadeId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  status: 'ATIVA' | 'INATIVA' | 'BLOQUEADA';
}

const EMPTY_FORM: AgendaFormState = {
  branchId: '',
  doctorId: '',
  weekday: '',
  shiftStart: '',
  shiftEnd: '',
  especialidadeId: '',
  roomId: '',
  startDate: '',
  endDate: '',
  status: 'ATIVA',
};

interface ConjuntoDraft {
  key: string;
  roomId: string;
  roomName: string;
  especialidadeId: string | null;
  especialidadeName: string | null;
  weekday: string;
  shiftStart: string;
  shiftEnd: string;
  startDate: string;
  endDate: string;
  status: AgendaFormState['status'];
  error?: string;
}

const EMPTY_DRAFT: ConjuntoDraft = {
  key: '',
  roomId: '',
  roomName: '',
  especialidadeId: null,
  especialidadeName: null,
  weekday: '',
  shiftStart: '',
  shiftEnd: '',
  startDate: '',
  endDate: '',
  status: 'ATIVA',
};

export function CadastroAgendas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const agendasQuery = useAgendasAdminQuery();
  const branchesQuery = useSettingsBranchesQuery();
  const doctorsQuery = useDoctorsAdminQuery();
  const especialidadesQuery = useEspecialidadesAdminQuery();
  const roomsQuery = useRoomsAdminQuery();
  const internsQuery = useInternsAdminQuery();

  const items = useMemo(() => getApiList(agendasQuery.data), [agendasQuery.data]);

  const branchOptions = useMemo(() => {
    return getApiList(branchesQuery.data)
      .filter((b: any) => b?.id)
      .map((b: any) => ({ value: b.id, label: b.tradeName || b.socialName || 'Filial sem nome' }));
  }, [branchesQuery.data]);

  const doctorList = useMemo(() => getApiList(doctorsQuery.data).filter((d: any) => d?.id), [doctorsQuery.data]);

  const especialidadeById = useMemo(() => {
    const map = new Map<string, any>();
    getApiList(especialidadesQuery.data).forEach((e: any) => { if (e?.id) map.set(e.id, e); });
    return map;
  }, [especialidadesQuery.data]);

  const roomList = useMemo(() => getApiList(roomsQuery.data).filter((s: any) => isRoomSector(s)), [roomsQuery.data]);
  const internList = useMemo(() => getApiList(internsQuery.data).filter((item: any) => item?.id), [internsQuery.data]);

  const doctorOptionsForBranch = (branchId: string) => doctorList
    .filter((d: any) => (Array.isArray(d.branchIds) && d.branchIds.includes(branchId)) || d.branchId === branchId)
    .map((d: any) => ({ value: d.id, label: d.name }));

  const especialidadeGroupsForDoctor = (doctorId: string): any[] => {
    const doctor = doctorList.find((d: any) => d.id === doctorId);
    return Array.isArray(doctor?.especialidadeGroups) ? doctor.especialidadeGroups : [];
  };

  const doctorModalidadeIds = (doctorId: string) => {
    const groups = especialidadeGroupsForDoctor(doctorId);
    return new Set(groups.map((g: any) => g.modalidadeId).filter(Boolean));
  };

  // Only rooms whose modalidade matches one of the professional's registered conjuntos.
  const roomOptionsForDoctorInBranch = (branchId: string, doctorId: string) => {
    const modalidadeIds = doctorModalidadeIds(doctorId);
    return roomList
      .filter((r: any) => r.branchId === branchId)
      .filter((r: any) => r.modalidadeId && modalidadeIds.has(r.modalidadeId))
      .map((r: any) => ({ value: r.id, label: r.name }));
  };

  const deriveEspecialidadeForRoom = (doctorId: string, roomId: string): { especialidadeId: string | null; especialidadeName: string | null } => {
    const room = roomList.find((r: any) => r.id === roomId);
    if (!room?.modalidadeId) return { especialidadeId: null, especialidadeName: null };
    const group = especialidadeGroupsForDoctor(doctorId).find((g: any) => g.modalidadeId === room.modalidadeId);
    if (!group) return { especialidadeId: null, especialidadeName: null };
    const esp = especialidadeById.get(group.especialidadeId);
    return { especialidadeId: group.especialidadeId || null, especialidadeName: esp?.name || null };
  };

  const [filterBranchId, setFilterBranchId] = useState<string | null>(null);
  const [createScaleOpen, setCreateScaleOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it: Agenda) => {
      if (filterBranchId && it.branchId !== filterBranchId) return false;
      if (!q) return true;
      return (
        (it.doctor?.name || '').toLowerCase().includes(q)
        || (it.branch?.tradeName || '').toLowerCase().includes(q)
        || (it.especialidade?.name || '').toLowerCase().includes(q)
        || (it.room?.name || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, filterBranchId]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredItems.length / pageSize)), [filteredItems.length, pageSize]);

  useEffect(() => { setPage(1); }, [query, pageSize, filterBranchId]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  useEffect(() => {
    if (agendasQuery.error) {
      showNotification({ title: 'Erro', message: resolveApiErrorMessage(agendasQuery.error, 'Erro ao carregar agendas'), color: 'red' });
    }
  }, [agendasQuery.error]);

  // --- Single-record edit modal (existing agendas only; creation goes through the wizard below) ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AgendaFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agenda | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openEditModal = (item: Agenda) => {
    setEditingId(item.id);
    setForm({
      branchId: item.branchId,
      doctorId: item.doctorId,
      weekday: item.weekday,
      shiftStart: item.shiftStart,
      shiftEnd: item.shiftEnd,
      especialidadeId: item.especialidadeId || '',
      roomId: item.roomId || '',
      startDate: toDateInputValue(item.startDate),
      endDate: toDateInputValue(item.endDate),
      status: item.status,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleBranchChange = (branchId: string | null) => {
    setForm((prev) => ({ ...prev, branchId: branchId || '', doctorId: '', especialidadeId: '', roomId: '' }));
  };

  const handleDoctorChange = (doctorId: string | null) => {
    setForm((prev) => ({ ...prev, doctorId: doctorId || '', especialidadeId: '', roomId: '' }));
  };

  const handleFormRoomChange = (roomId: string | null) => {
    const { especialidadeId } = deriveEspecialidadeForRoom(form.doctorId, roomId || '');
    setForm((prev) => ({ ...prev, roomId: roomId || '', especialidadeId: especialidadeId || '' }));
  };

  const handleSave = async () => {
    if (!form.branchId || !form.doctorId || !form.weekday || !form.shiftStart || !form.shiftEnd) {
      setFormError('Preencha unidade, profissional, dia da semana e turno');
      return;
    }
    if (form.shiftEnd <= form.shiftStart) {
      setFormError('O fim do turno deve ser maior que o início');
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        branchId: form.branchId,
        doctorId: form.doctorId,
        weekday: form.weekday,
        shiftStart: form.shiftStart,
        shiftEnd: form.shiftEnd,
        especialidadeId: form.especialidadeId || null,
        roomId: form.roomId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
      };

      if (editingId) {
        await agendaService.updateAgenda(editingId, payload);
        showNotification({ title: 'Atualizada', message: 'Agenda atualizada com sucesso', color: 'green' });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.agendasAdmin });
      setModalOpen(false);
    } catch (err: any) {
      const errorCode = err?.response?.data?.error;
      if (errorCode === 'AGENDA_OVERLAP') {
        setFormError('Já existe uma agenda ativa nesse dia/turno para esse profissional');
      } else {
        showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao salvar agenda'), color: 'red' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Agenda) => {
    setDeleting(true);
    try {
      await agendaService.deleteAgenda(item.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.agendasAdmin });
      showNotification({ title: 'Excluída', message: 'Agenda excluída com sucesso', color: 'green' });
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao excluir agenda'), color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  // --- Creation wizard: Unidade/Profissional -> Sala -> Turno, with a staging mini-grid for multiple conjuntos ---
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardBranchId, setWizardBranchId] = useState('');
  const [wizardDoctorId, setWizardDoctorId] = useState('');
  const [draft, setDraft] = useState<ConjuntoDraft>(EMPTY_DRAFT);
  const [conjuntos, setConjuntos] = useState<ConjuntoDraft[]>([]);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const closeWizard = () => { if (!submitting) setWizardOpen(false); };

  const handleWizardBranchChange = (branchId: string | null) => {
    setWizardBranchId(branchId || '');
    setWizardDoctorId('');
    setDraft(EMPTY_DRAFT);
    setConjuntos([]);
    setWizardError(null);
  };

  const handleWizardDoctorChange = (doctorId: string | null) => {
    setWizardDoctorId(doctorId || '');
    setDraft(EMPTY_DRAFT);
    setConjuntos([]);
    setWizardError(null);
  };

  const handleDraftRoomChange = (roomId: string | null) => {
    const room = roomList.find((r: any) => r.id === roomId);
    const { especialidadeId, especialidadeName } = deriveEspecialidadeForRoom(wizardDoctorId, roomId || '');
    setDraft((prev) => ({ ...prev, roomId: roomId || '', roomName: room?.name || '', especialidadeId, especialidadeName }));
  };

  const goToStep0 = () => { setWizardError(null); setWizardStep(0); };
  const goToStep1 = () => {
    if (!wizardBranchId || !wizardDoctorId) { setWizardError('Selecione a unidade e o profissional'); return; }
    setWizardError(null);
    setWizardStep(1);
  };
  const goToStep2 = () => {
    if (!draft.roomId) { setWizardError('Selecione a sala'); return; }
    setWizardError(null);
    setWizardStep(2);
  };

  const addConjunto = () => {
    if (!draft.weekday || !draft.shiftStart || !draft.shiftEnd) {
      setWizardError('Preencha o dia da semana e o turno');
      return;
    }
    if (draft.shiftEnd <= draft.shiftStart) {
      setWizardError('O fim do turno deve ser maior que o início');
      return;
    }
    setWizardError(null);
    setConjuntos((prev) => [...prev, { ...draft, key: genKey() }]);
    setDraft(EMPTY_DRAFT);
    setWizardStep(1);
  };

  const removeConjunto = (key: string) => setConjuntos((prev) => prev.filter((c) => c.key !== key));

  const editConjunto = (item: ConjuntoDraft) => {
    setDraft({ ...item, error: undefined });
    setConjuntos((prev) => prev.filter((c) => c.key !== item.key));
    setWizardStep(1);
    setWizardError(null);
  };

  const goToSummary = () => {
    if (conjuntos.length === 0) { setWizardError('Adicione pelo menos um conjunto antes de finalizar'); return; }
    setWizardError(null);
    setWizardStep(3);
  };

  const handleWizardSubmit = async () => {
    if (conjuntos.length === 0) return;
    setSubmitting(true);
    let successCount = 0;
    const remaining: ConjuntoDraft[] = [];
    for (const item of conjuntos) {
      try {
        await agendaService.createAgenda({
          branchId: wizardBranchId,
          doctorId: wizardDoctorId,
          weekday: item.weekday,
          shiftStart: item.shiftStart,
          shiftEnd: item.shiftEnd,
          especialidadeId: item.especialidadeId,
          roomId: item.roomId,
          startDate: item.startDate || null,
          endDate: item.endDate || null,
          status: item.status,
        });
        successCount += 1;
      } catch (err: any) {
        const errorCode = err?.response?.data?.error;
        const message = errorCode === 'AGENDA_OVERLAP'
          ? 'Já existe uma agenda ativa nesse dia/turno para esse profissional'
          : resolveApiErrorMessage(err, 'Erro ao cadastrar esse conjunto');
        remaining.push({ ...item, error: message });
      }
    }
    setConjuntos(remaining);
    setSubmitting(false);

    if (successCount > 0) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agendasAdmin });
    }
    if (remaining.length === 0) {
      showNotification({ title: 'Cadastradas', message: `${successCount} conjunto(s) de agenda cadastrado(s) com sucesso`, color: 'green' });
      setWizardOpen(false);
    } else if (successCount > 0) {
      showNotification({ title: 'Parcialmente cadastrado', message: `${successCount} cadastrado(s), ${remaining.length} com erro. Corrija e tente novamente.`, color: 'yellow' });
    } else {
      showNotification({ title: 'Erro', message: 'Não foi possível cadastrar os conjuntos. Verifique os erros na lista.', color: 'red' });
    }
  };

  const roomOptionsForWizard = useMemo(
    () => roomOptionsForDoctorInBranch(wizardBranchId, wizardDoctorId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wizardBranchId, wizardDoctorId, roomList, doctorList],
  );

  const wizardDoctorName = doctorList.find((d: any) => d.id === wizardDoctorId)?.name || '';
  const wizardBranchName = branchOptions.find((b) => b.value === wizardBranchId)?.label || '';

  const renderVigenciaText = (start?: string | null, end?: string | null) => {
    const s = formatDate(start);
    const e = formatDate(end);
    if (!s && !e) return 'Sem prazo';
    return `${s || '—'} até ${e || 'sem fim'}`;
  };

  const renderConjuntosGrid = (list: ConjuntoDraft[], showErrors: boolean) => (
    <Table horizontalSpacing="sm" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ fontSize: '0.75rem' }}>Sala</Table.Th>
          <Table.Th style={{ fontSize: '0.75rem' }}>Especialidade</Table.Th>
          <Table.Th style={{ fontSize: '0.75rem' }}>Dia</Table.Th>
          <Table.Th style={{ fontSize: '0.75rem' }}>Turno</Table.Th>
          <Table.Th style={{ fontSize: '0.75rem' }}>Vigência</Table.Th>
          <Table.Th style={{ fontSize: '0.75rem' }}>Status</Table.Th>
          <Table.Th style={{ fontSize: '0.75rem', width: 76, textAlign: 'center' }}>Ações</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {list.map((item) => (
          <Table.Tr key={item.key}>
            <Table.Td>
              <Text size="sm">{item.roomName}</Text>
              {showErrors && item.error ? <Text size="xs" c="red">{item.error}</Text> : null}
            </Table.Td>
            <Table.Td><Text size="sm" c="dimmed">{item.especialidadeName || '—'}</Text></Table.Td>
            <Table.Td><Text size="sm" c="dimmed">{WEEKDAY_LABEL[item.weekday] || item.weekday}</Text></Table.Td>
            <Table.Td><Text size="sm" c="dimmed">{item.shiftStart} - {item.shiftEnd}</Text></Table.Td>
            <Table.Td><Text size="xs" c="dimmed">{renderVigenciaText(item.startDate, item.endDate)}</Text></Table.Td>
            <Table.Td>
              <Badge color={STATUS_COLOR[item.status]} variant="light" size="sm">
                {STATUS_OPTIONS.find((s) => s.value === item.status)?.label || item.status}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Group gap={4} justify="center" wrap="nowrap">
                <ActionIcon variant="light" size="sm" onClick={() => editConjunto(item)}>
                  <Pencil size={14} />
                </ActionIcon>
                <ActionIcon variant="light" color="red" size="sm" onClick={() => removeConjunto(item.key)}>
                  <Trash2 size={14} />
                </ActionIcon>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  const renderVigencia = (item: Agenda) => {
    const start = formatDate(item.startDate);
    const end = formatDate(item.endDate);
    if (!start && !end) return <Text size="xs" c="dimmed">Sem prazo</Text>;
    return <Text size="xs" c="dimmed">{start || '—'} até {end || 'sem fim'}</Text>;
  };

  const loading = agendasQuery.isLoading && items.length === 0;

  return (
    <Box className="cadastro-agendas-page" bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box className="cadastro-agendas-shell" p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group className="cadastro-agendas-page-header" mb={isMobile ? 20 : 30} justify="space-between" align="flex-end" wrap="wrap">
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text className="cadastro-agendas-eyebrow">
                OPERAÇÃO ADMINISTRATIVA · ESCALAS
              </Text>
              <Text className="cadastro-agendas-page-title" fw={700} size={isMobile ? 'xl' : '2rem'} c="var(--mantine-color-text)">
                Cadastro de agendas
              </Text>
              <Text className="cadastro-agendas-page-subtitle" size="sm" c="dimmed">
                Defina unidade, profissional, sala e os horários de atendimento da semana.
              </Text>
            </Box>
          </Group>

          {createScaleOpen ? (
            <Button className="cadastro-agendas-primary-action" variant="default" onClick={() => setCreateScaleOpen(false)} size={isMobile ? 'sm' : 'md'}>
              Voltar para agendas
            </Button>
          ) : (
            <Button className="cadastro-agendas-primary-action" bg={DARK_BLUE} c="white" leftSection={<Plus size={16} />} onClick={() => setCreateScaleOpen(true)} size={isMobile ? 'sm' : 'md'}>
              Nova agenda
            </Button>
          )}
        </Group>

        {createScaleOpen ? (
          <CadastroAgendaEscalaForm
            branchOptions={branchOptions}
            doctors={doctorList}
            especialidades={getApiList(especialidadesQuery.data)}
            rooms={roomList}
            interns={internList}
            isMobile={Boolean(isMobile)}
            onCancel={() => setCreateScaleOpen(false)}
            onSaved={async () => {
              await queryClient.invalidateQueries({ queryKey: queryKeys.agendasAdmin });
              setCreateScaleOpen(false);
            }}
          />
        ) : (
          <>
        <Box className="cadastro-agendas-filters-panel">
          <Box className="cadastro-agendas-section-heading">
            <Text className="cadastro-agendas-section-title" fw={700}>Filtros</Text>
            <Text className="cadastro-agendas-section-hint" size="sm" c="dimmed">
              Encontre agendas por unidade, profissional, especialidade ou sala.
            </Text>
          </Box>
          <Group className="cadastro-agendas-filter-row" mb={isMobile ? 20 : 30} grow={isMobile} align="flex-end">
          <FloatingSelect
            label="Filtrar por unidade"
            placeholder="Todas as unidades"
            data={branchOptions}
            value={filterBranchId}
            onChange={setFilterBranchId}
            searchable
            clearable
            nothingFoundMessage="Nenhuma unidade encontrada"
          />
          <FloatingInput
            label="Buscar agendas"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={isMobile ? 'Buscar...' : 'Buscar por profissional, unidade, especialidade ou sala...'}
          />
          </Group>
        </Box>

        <Box className="cadastro-agendas-list-panel">
          <Group className="cadastro-agendas-list-heading" justify="space-between" align="flex-end" wrap="wrap">
            <Box>
              <Text className="cadastro-agendas-section-title" fw={700}>Agendas cadastradas</Text>
              <Text className="cadastro-agendas-section-hint" size="sm" c="dimmed">
                Consulte, edite ou remova os horários configurados para cada profissional.
              </Text>
            </Box>
            <Badge className="cadastro-agendas-count" variant="light" color="darkBlue" size="lg">
              {filteredItems.length} {filteredItems.length === 1 ? 'agenda' : 'agendas'}
            </Badge>
          </Group>

        {loading ? (
          <Stack gap="sm">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Paper key={idx} withBorder radius="md" p="md">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={8} style={{ flex: 1 }}>
                    <Skeleton height={18} width="56%" radius="sm" />
                    <Skeleton height={14} width="28%" radius="sm" />
                  </Stack>
                  <Skeleton height={24} width={76} radius="xl" />
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          isMobile ? (
            filteredItems.length === 0 ? (
              <Paper withBorder radius="md" p="xl">
                <Text size="sm" c="dimmed" ta="center">
                  Nenhuma agenda encontrada. Ajuste os filtros ou cadastre uma nova agenda.
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm">
                {filteredItems.map((it: Agenda) => (
                  <Paper key={it.id} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={600} size="sm">{it.doctor?.name || '—'}</Text>
                        <Text size="xs" c="dimmed">{it.branch?.tradeName || '—'} · {WEEKDAY_LABEL[it.weekday] || it.weekday}</Text>
                        <Text size="xs" c="dimmed">{it.shiftStart} - {it.shiftEnd}</Text>
                        <Text size="xs" c="dimmed">{it.room?.name || 'Sem sala definida'}</Text>
                        {renderVigencia(it)}
                      </Stack>
                      <Badge color={STATUS_COLOR[it.status]} variant="light" size="sm">
                        {STATUS_OPTIONS.find((s) => s.value === it.status)?.label || it.status}
                      </Badge>
                    </Group>
                    <Group gap={8} mt="md" wrap="nowrap">
                      <ActionIcon variant="light" color="blue" onClick={() => openEditModal(it)}>
                        <Pencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => { setDeleteTarget(it); setDeleteModalOpen(true); }}
                      >
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )
          ) : (
            <PaginatedGrid
              totalItems={filteredItems.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              isMobile={isMobile}
              maxHeight={620}
              showFooter
            >
              <Table horizontalSpacing="md" verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: 'none' }}>
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Profissional</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Unidade</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Dia</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Turno</Table.Th>
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Sala</Table.Th>}
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Vigência</Table.Th>}
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500, textAlign: 'center', width: 96 }}>
                      Ações
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredItems.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={isTablet ? 6 : 8}>
                        <Text size="sm" c="dimmed" ta="center">
                          Nenhuma agenda encontrada. Ajuste os filtros ou cadastre uma nova agenda.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedItems.map((it: Agenda) => (
                      <Table.Tr key={it.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <Table.Td><Text fw={600} size="sm">{it.doctor?.name || '—'}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{it.branch?.tradeName || '—'}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{WEEKDAY_LABEL[it.weekday] || it.weekday}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{it.shiftStart} - {it.shiftEnd}</Text></Table.Td>
                        {!isTablet && <Table.Td><Text size="sm" c="dimmed">{it.room?.name || '—'}</Text></Table.Td>}
                        {!isTablet && <Table.Td>{renderVigencia(it)}</Table.Td>}
                        <Table.Td>
                          <Badge color={STATUS_COLOR[it.status]} variant="light" size="sm">
                            {STATUS_OPTIONS.find((s) => s.value === it.status)?.label || it.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group justify="center">
                            <Menu shadow="md" width={200} position="bottom" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações da agenda">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<Pencil size={14} />} onClick={() => openEditModal(it)}>
                                  Editar
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<Trash2 size={14} />}
                                  color="red"
                                  onClick={() => { setDeleteTarget(it); setDeleteModalOpen(true); }}
                                >
                                  Excluir
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </PaginatedGrid>
          )
        )}
        </Box>
          </>
        )}
      </Box>

      {/* Creation wizard */}
      <Modal
        opened={wizardOpen}
        onClose={closeWizard}
        title="Cadastrar agenda"
        size={isMobile ? '100%' : 900}
        padding={isMobile ? 'md' : 'xl'}
        centered
        fullScreen={isMobile}
      >
        <Stack gap={24}>
          <Stepper active={wizardStep} onStepClick={(step) => { if (step < wizardStep) setWizardStep(step); }} size="md" iconSize={36} mt={20}>
            <Stepper.Step label="Profissional" description="Unidade e profissional" />
            <Stepper.Step label="Sala" description="Onde vai atender" />
            <Stepper.Step label="Turno" description="Dia e horário" />
            <Stepper.Step label="Resumo" description="Confirmar cadastro" />
          </Stepper>

          {wizardStep === 0 && (
            <Stack gap={16}>
              <FloatingSelect
                label="Unidade"
                required
                placeholder="Selecione a unidade"
                data={branchOptions}
                value={wizardBranchId || null}
                searchable
                nothingFoundMessage="Nenhuma unidade encontrada"
                onChange={handleWizardBranchChange}
              />
              <FloatingSelect
                label="Profissional"
                required
                placeholder={wizardBranchId ? 'Selecione o profissional' : 'Selecione uma unidade primeiro'}
                data={doctorOptionsForBranch(wizardBranchId)}
                value={wizardDoctorId || null}
                disabled={!wizardBranchId}
                searchable
                nothingFoundMessage="Nenhum profissional encontrado para essa unidade"
                onChange={handleWizardDoctorChange}
              />
            </Stack>
          )}

          {wizardStep === 1 && (
            <Stack gap={16}>
              <Text size="sm" c="dimmed">{wizardDoctorName} · {wizardBranchName}</Text>
              <FloatingSelect
                label="Sala"
                required
                placeholder={roomOptionsForWizard.length ? 'Selecione a sala' : 'Nenhuma sala compatível com as modalidades do profissional'}
                data={roomOptionsForWizard}
                value={draft.roomId || null}
                searchable
                nothingFoundMessage="Nenhuma sala encontrada"
                onChange={handleDraftRoomChange}
              />
              {conjuntos.length > 0 && (
                <>
                  <Divider label={`${conjuntos.length} conjunto(s) já adicionado(s)`} labelPosition="left" mt={8} />
                  {renderConjuntosGrid(conjuntos, false)}
                </>
              )}
            </Stack>
          )}

          {wizardStep === 2 && (
            <Stack gap={16}>
              <Text size="sm" c="dimmed">{wizardDoctorName} · {draft.roomName}{draft.especialidadeName ? ` · ${draft.especialidadeName}` : ''}</Text>
              <FloatingSelect
                label="Dia da semana"
                required
                placeholder="Selecione o dia"
                data={WEEKDAY_OPTIONS}
                value={draft.weekday || null}
                onChange={(value) => setDraft((prev) => ({ ...prev, weekday: value || '' }))}
              />
              <Group grow>
                <FloatingInput
                  label="Início do turno"
                  type="time"
                  value={draft.shiftStart}
                  onChange={(e) => { const value = e.currentTarget.value; setDraft((prev) => ({ ...prev, shiftStart: value })); }}
                  required
                />
                <FloatingInput
                  label="Fim do turno"
                  type="time"
                  value={draft.shiftEnd}
                  onChange={(e) => { const value = e.currentTarget.value; setDraft((prev) => ({ ...prev, shiftEnd: value })); }}
                  required
                />
              </Group>
              <Group grow>
                <FloatingInput
                  label="Data de ativação"
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => { const value = e.currentTarget.value; setDraft((prev) => ({ ...prev, startDate: value })); }}
                />
                <FloatingInput
                  label="Data de finalização"
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => { const value = e.currentTarget.value; setDraft((prev) => ({ ...prev, endDate: value })); }}
                />
              </Group>
              <FloatingSelect
                label="Status"
                data={STATUS_OPTIONS}
                value={draft.status}
                onChange={(value) => setDraft((prev) => ({ ...prev, status: (value || 'ATIVA') as AgendaFormState['status'] }))}
              />
            </Stack>
          )}

          {wizardStep === 3 && (
            <Stack gap={16}>
              <Text size="sm" fw={600}>{wizardDoctorName} · {wizardBranchName}</Text>
              <Text size="sm" c="dimmed">Confira os conjuntos abaixo antes de confirmar o cadastro.</Text>
              {renderConjuntosGrid(conjuntos, true)}
            </Stack>
          )}

          {wizardError ? (
            <Text size="sm" c="red">{wizardError}</Text>
          ) : null}

          <Group justify="space-between" mt={8}>
            <Button variant="default" onClick={wizardStep === 0 ? closeWizard : (wizardStep === 3 ? () => setWizardStep(2) : goToStep0)} size="sm" disabled={submitting}>
              {wizardStep === 0 ? 'Cancelar' : 'Voltar'}
            </Button>

            {wizardStep === 0 && (
              <Button bg={DARK_BLUE} onClick={goToStep1} size="sm">Próximo</Button>
            )}
            {wizardStep === 1 && (
              <Group gap={8}>
                {conjuntos.length > 0 && (
                  <Button variant="default" onClick={goToSummary} size="sm">Finalizar e revisar</Button>
                )}
                <Button bg={DARK_BLUE} onClick={goToStep2} size="sm">Próximo</Button>
              </Group>
            )}
            {wizardStep === 2 && (
              <Button bg={DARK_BLUE} onClick={addConjunto} size="sm">Adicionar conjunto</Button>
            )}
            {wizardStep === 3 && (
              <Button bg={DARK_BLUE} onClick={handleWizardSubmit} size="sm" loading={submitting} disabled={submitting || conjuntos.length === 0}>
                Confirmar cadastro
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>

      {/* Single-record edit modal */}
      <Modal
        opened={modalOpen}
        onClose={() => { if (!saving) setModalOpen(false); }}
        title="Editar agenda"
        size={isMobile ? '100%' : 560}
        centered
        fullScreen={isMobile}
      >
        <Stack gap={10}>
          <FloatingSelect
            label="Unidade"
            required
            placeholder="Selecione a unidade"
            data={branchOptions}
            value={form.branchId || null}
            searchable
            nothingFoundMessage="Nenhuma unidade encontrada"
            onChange={handleBranchChange}
          />
          <FloatingSelect
            label="Profissional"
            required
            placeholder={form.branchId ? 'Selecione o profissional' : 'Selecione uma unidade primeiro'}
            data={doctorOptionsForBranch(form.branchId)}
            value={form.doctorId || null}
            disabled={!form.branchId}
            searchable
            nothingFoundMessage="Nenhum profissional encontrado para essa unidade"
            onChange={handleDoctorChange}
          />
          <FloatingSelect
            label="Dia da semana"
            required
            placeholder="Selecione o dia"
            data={WEEKDAY_OPTIONS}
            value={form.weekday || null}
            onChange={(value) => setForm((prev) => ({ ...prev, weekday: value || '' }))}
          />
          <Group grow>
            <FloatingInput
              label="Início do turno"
              type="time"
              value={form.shiftStart}
              onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, shiftStart: value })); }}
              required
            />
            <FloatingInput
              label="Fim do turno"
              type="time"
              value={form.shiftEnd}
              onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, shiftEnd: value })); }}
              required
            />
          </Group>
          <FloatingSelect
            label="Sala"
            placeholder={form.branchId && form.doctorId ? 'Selecione a sala (opcional)' : 'Selecione unidade e profissional primeiro'}
            data={roomOptionsForDoctorInBranch(form.branchId, form.doctorId)}
            value={form.roomId || null}
            disabled={!form.branchId || !form.doctorId}
            clearable
            searchable
            nothingFoundMessage="Nenhuma sala encontrada"
            onChange={handleFormRoomChange}
          />
          <Group grow>
            <FloatingInput
              label="Data de ativação"
              type="date"
              value={form.startDate}
              onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, startDate: value })); }}
            />
            <FloatingInput
              label="Data de finalização"
              type="date"
              value={form.endDate}
              onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, endDate: value })); }}
            />
          </Group>
          <FloatingSelect
            label="Status"
            data={STATUS_OPTIONS}
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: (value || 'ATIVA') as AgendaFormState['status'] }))}
          />

          {formError ? (
            <Text size="sm" c="red">{formError}</Text>
          ) : null}

          <Group justify="flex-end" mt={8}>
            <Button variant="default" onClick={() => setModalOpen(false)} size="sm" disabled={saving}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} onClick={handleSave} size="sm" loading={saving} disabled={saving}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteModalOpen}
        onClose={() => { if (!deleting) { setDeleteModalOpen(false); setDeleteTarget(null); } }}
        title="Confirmar exclusão"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {`Confirma a exclusão da agenda de ${deleteTarget?.doctor?.name || 'profissional selecionado'} (${deleteTarget ? WEEKDAY_LABEL[deleteTarget.weekday] || deleteTarget.weekday : ''})?`}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => { setDeleteModalOpen(false); setDeleteTarget(null); }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button color="red" onClick={() => deleteTarget && handleDelete(deleteTarget)} loading={deleting}>
              Excluir
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
