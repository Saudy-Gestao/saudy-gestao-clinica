import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  DateInput,
  Group,
  Menu,
  Modal,
  MultiSelect,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { showNotification } from '@/components/ui';
import { Header } from '../Header/Header';
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
import { CadastroAgendaEscalaForm } from './CadastroAgendaEscalaForm';
import { notifyUnsavedChangesSaved } from '../../hooks/useUnsavedChangesGuard';
import './CadastroAgendas.css';

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

type AgendaSpecialtyGroup = {
  especialidadeId?: string | null;
  especialidadeIds?: string[];
  modalidadeId?: string | null;
};

type SpecialtyRecord = {
  id?: string;
  branchId?: string | null;
  name?: string;
};

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

const parseISODate = (value: string): Date | null => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatISODate = (date: Date | null): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface AgendaFormState {
  branchId: string;
  doctorId: string;
  weekday: string;
  shiftStart: string;
  shiftEnd: string;
  especialidadeId: string;
  especialidadeIds: string[];
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
  especialidadeIds: [],
  roomId: '',
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
  const [createScaleOpen, setCreateScaleOpen] = useState(false);

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

  const especialidadeGroupsForDoctor = (doctorId: string): AgendaSpecialtyGroup[] => {
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

  const especialidadeOptionsForDoctor = (branchId: string, doctorId: string) => {
    const groups = especialidadeGroupsForDoctor(doctorId);
    const doctorEspecialidadeIds = new Set(groups.flatMap((group) => [
      group?.especialidadeId,
      ...(Array.isArray(group?.especialidadeIds) ? group.especialidadeIds : []),
    ].filter((id): id is string => Boolean(id))));
    return (getApiList(especialidadesQuery.data) as SpecialtyRecord[])
      .filter((item): item is SpecialtyRecord & { id: string } => Boolean(item.id))
      .filter((item) => !branchId || !item.branchId || item.branchId === branchId)
      .filter((item) => doctorEspecialidadeIds.size === 0 || doctorEspecialidadeIds.has(item.id))
      .map((item) => ({ value: item.id, label: item.name || 'Especialidade sem nome' }));
  };

  const deriveEspecialidadeForRoom = (doctorId: string, roomId: string): { especialidadeId: string | null; especialidadeName: string | null } => {
    const room = roomList.find((r: any) => r.id === roomId);
    if (!room?.modalidadeId) return { especialidadeId: null, especialidadeName: null };
    const group = especialidadeGroupsForDoctor(doctorId).find((g: any) => g.modalidadeId === room.modalidadeId);
    const especialidadeId = group?.especialidadeId;
    if (!especialidadeId) return { especialidadeId: null, especialidadeName: null };
    const esp = especialidadeById.get(especialidadeId);
    return { especialidadeId, especialidadeName: esp?.name || null };
  };

  const [filterBranchId, setFilterBranchId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it: Agenda) => {
      if (filterBranchId && it.branchId !== filterBranchId) return false;
      const agendaEspecialidadeNames = (it.especialidadeIds?.length
        ? it.especialidadeIds
        : (it.especialidadeId ? [it.especialidadeId] : []))
        .map((id) => especialidadeById.get(id)?.name || '')
        .filter(Boolean);
      if (!q) return true;
      return (
        (it.doctor?.name || '').toLowerCase().includes(q)
        || (it.branch?.tradeName || '').toLowerCase().includes(q)
        || agendaEspecialidadeNames.some((name) => name.toLowerCase().includes(q))
        || (it.room?.name || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, filterBranchId, especialidadeById]);

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

  // --- Single-record edit modal (existing agendas only; creation goes through the scale form below) ---
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
      especialidadeIds: item.especialidadeIds?.length
        ? item.especialidadeIds
        : (item.especialidadeId ? [item.especialidadeId] : []),
      roomId: item.roomId || '',
      startDate: toDateInputValue(item.startDate),
      endDate: toDateInputValue(item.endDate),
      status: item.status,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleBranchChange = (branchId: string | null) => {
    setForm((prev) => ({ ...prev, branchId: branchId || '', doctorId: '', especialidadeId: '', especialidadeIds: [], roomId: '' }));
  };

  const handleDoctorChange = (doctorId: string | null) => {
    setForm((prev) => ({ ...prev, doctorId: doctorId || '', especialidadeId: '', especialidadeIds: [], roomId: '' }));
  };

  const handleFormRoomChange = (roomId: string | null) => {
    const { especialidadeId } = deriveEspecialidadeForRoom(form.doctorId, roomId || '');
    setForm((prev) => ({
      ...prev,
      roomId: roomId || '',
      especialidadeId: prev.especialidadeIds[0] || especialidadeId || '',
      especialidadeIds: prev.especialidadeIds.length > 0
        ? prev.especialidadeIds
        : (especialidadeId ? [especialidadeId] : []),
    }));
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
        especialidadeId: form.especialidadeIds[0] || form.especialidadeId || null,
        especialidadeIds: form.especialidadeIds,
        roomId: form.roomId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
      };

      if (editingId) {
        await agendaService.updateAgenda(editingId, payload);
        showNotification({ title: 'Atualizada', message: 'Agenda atualizada com sucesso', color: 'green' });
        notifyUnsavedChangesSaved();
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

  const renderVigencia = (item: Agenda) => {
    const start = formatDate(item.startDate);
    const end = formatDate(item.endDate);
    if (!start && !end) return <Text size="xs" c="dimmed">Sem prazo</Text>;
    return <Text size="xs" c="dimmed">{start || '—'} até {end || 'sem fim'}</Text>;
  };

  const loading = agendasQuery.isLoading && items.length === 0;

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => (createScaleOpen ? setCreateScaleOpen(false) : navigate('/dashboard?secao=cadastros-clinicos')) }} />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {createScaleOpen ? (
          <>
            <Group justify="space-between" align="center" mb="lg" wrap="wrap">
              <Text fw={600} size="lg">Nova agenda</Text>
            </Group>
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
          </>
        ) : (
          <>
            <Box className="cadastro-agendas-hero ui-page-intro">
              <Text className="cadastro-agendas-eyebrow">CADASTROS CLÍNICOS</Text>
              <Text className="cadastro-agendas-title" fw={700} size="2xl">Agendas</Text>
              <Text className="cadastro-agendas-subtitle" size="sm">Agendas de profissionais por unidade, dia e turno.</Text>
            </Box>

            <Paper className="cadastro-agendas-panel" p={isMobile ? 'sm' : 'lg'} withBorder radius="md" mb="lg">
              <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
                <Group align="flex-end" wrap="wrap" gap="sm" style={{ flex: 1 }}>
                  <Select
                    label="Filtrar por unidade"
                    placeholder="Todas as unidades"
                    data={branchOptions}
                    value={filterBranchId}
                    onChange={setFilterBranchId}
                    searchable
                    clearable
                    style={{ flex: '1 1 220px', maxWidth: isMobile ? '100%' : 280 }}
                  />
                  <TextInput
                    label="Buscar agendas"
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    placeholder={isMobile ? 'Buscar...' : 'Buscar por profissional, unidade, especialidade ou sala...'}
                    style={{ flex: '1 1 260px', maxWidth: isMobile ? '100%' : 420 }}
                  />
                </Group>
                <Button leftSection={<Plus size={16} />} onClick={() => setCreateScaleOpen(true)} fullWidth={isMobile}>
                  Nova agenda
                </Button>
              </Group>
            </Paper>

            <Paper className="cadastro-agendas-panel" p={isMobile ? 'sm' : 'lg'} withBorder radius="md">
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
                              <Text size="xs" c="dimmed">
                                {((it.especialidadeIds?.length ? it.especialidadeIds : (it.especialidadeId ? [it.especialidadeId] : []))
                                  .map((id) => especialidadeById.get(id)?.name)
                                  .filter(Boolean)
                                  .join(', ')) || it.especialidade?.name || 'Sem especialidade definida'}
                              </Text>
                              <Text size="xs" c="dimmed">{it.room?.name || 'Sem sala definida'}</Text>
                              {renderVigencia(it)}
                            </Stack>
                            <Badge color={STATUS_COLOR[it.status]} variant="light" size="sm">
                              {STATUS_OPTIONS.find((s) => s.value === it.status)?.label || it.status}
                            </Badge>
                          </Group>
                          <Group gap={8} mt="md" wrap="nowrap">
                            <ActionIcon variant="light" color="blue" onClick={() => openEditModal(it)} aria-label="Editar agenda">
                              <Pencil size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => { setDeleteTarget(it); setDeleteModalOpen(true); }}
                              aria-label="Excluir agenda"
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
                        <Table.Tr>
                          <Table.Th className="cadastro-agendas-th">Profissional</Table.Th>
                          <Table.Th className="cadastro-agendas-th">Unidade</Table.Th>
                          <Table.Th className="cadastro-agendas-th">Dia</Table.Th>
                          <Table.Th className="cadastro-agendas-th">Turno</Table.Th>
                          {!isTablet && <Table.Th className="cadastro-agendas-th">Especialidade(s)</Table.Th>}
                          {!isTablet && <Table.Th className="cadastro-agendas-th">Sala</Table.Th>}
                          {!isTablet && <Table.Th className="cadastro-agendas-th">Vigência</Table.Th>}
                          <Table.Th className="cadastro-agendas-th">Status</Table.Th>
                          <Table.Th className="cadastro-agendas-th" style={{ textAlign: 'center', width: 96 }}>
                            Ações
                          </Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredItems.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={isTablet ? 6 : 9}>
                              <Text size="sm" c="dimmed" ta="center">
                                Nenhuma agenda encontrada. Ajuste os filtros ou cadastre uma nova agenda.
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          paginatedItems.map((it: Agenda) => (
                            <Table.Tr key={it.id} className="cadastro-agendas-row">
                              <Table.Td><Text fw={600} size="sm">{it.doctor?.name || '—'}</Text></Table.Td>
                              <Table.Td><Text size="sm" c="dimmed">{it.branch?.tradeName || '—'}</Text></Table.Td>
                              <Table.Td><Text size="sm" c="dimmed">{WEEKDAY_LABEL[it.weekday] || it.weekday}</Text></Table.Td>
                              <Table.Td><Text size="sm" c="dimmed">{it.shiftStart} - {it.shiftEnd}</Text></Table.Td>
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="sm" c="dimmed">
                                    {((it.especialidadeIds?.length ? it.especialidadeIds : (it.especialidadeId ? [it.especialidadeId] : []))
                                      .map((id) => especialidadeById.get(id)?.name)
                                      .filter(Boolean)
                                      .join(', ')) || it.especialidade?.name || '—'}
                                  </Text>
                                </Table.Td>
                              )}
                              {!isTablet && <Table.Td><Text size="sm" c="dimmed">{it.room?.name || '—'}</Text></Table.Td>}
                              {!isTablet && <Table.Td>{renderVigencia(it)}</Table.Td>}
                              <Table.Td>
                                <Badge color={STATUS_COLOR[it.status]} variant="light" size="sm">
                                  {STATUS_OPTIONS.find((s) => s.value === it.status)?.label || it.status}
                                </Badge>
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center' }}>
                                <Group justify="center">
                                  <Menu shadow="md" width={200} position="bottom-end" withArrow>
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
            </Paper>
          </>
        )}
      </Box>

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
          <Select
            label="Unidade"
            required
            placeholder="Selecione a unidade"
            data={branchOptions}
            value={form.branchId || null}
            searchable
            onChange={handleBranchChange}
          />
          <Select
            label="Profissional"
            required
            placeholder={form.branchId ? 'Selecione o profissional' : 'Selecione uma unidade primeiro'}
            data={doctorOptionsForBranch(form.branchId)}
            value={form.doctorId || null}
            disabled={!form.branchId}
            searchable
            onChange={handleDoctorChange}
          />
          <MultiSelect
            label="Especialidades"
            placeholder={form.doctorId ? 'Selecione uma ou mais' : 'Selecione o profissional primeiro'}
            data={especialidadeOptionsForDoctor(form.branchId, form.doctorId)}
            value={form.especialidadeIds}
            disabled={!form.branchId || !form.doctorId}
            searchable
            clearable
            onChange={(values) => setForm((prev) => ({ ...prev, especialidadeIds: values, especialidadeId: values[0] || '' }))}
          />
          <Select
            label="Dia da semana"
            required
            placeholder="Selecione o dia"
            data={WEEKDAY_OPTIONS}
            value={form.weekday || null}
            onChange={(value) => setForm((prev) => ({ ...prev, weekday: value || '' }))}
          />
          <Group grow>
            <TextInput
              label="Início do turno"
              type="time"
              value={form.shiftStart}
              onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, shiftStart: value })); }}
              required
            />
            <TextInput
              label="Fim do turno"
              type="time"
              value={form.shiftEnd}
              onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, shiftEnd: value })); }}
              required
            />
          </Group>
          <Select
            label="Sala"
            placeholder={form.branchId && form.doctorId ? 'Selecione a sala (opcional)' : 'Selecione unidade e profissional primeiro'}
            data={roomOptionsForDoctorInBranch(form.branchId, form.doctorId)}
            value={form.roomId || null}
            disabled={!form.branchId || !form.doctorId}
            clearable
            searchable
            onChange={handleFormRoomChange}
          />
          <Group grow>
            <DateInput
              label="Data de ativação"
              value={parseISODate(form.startDate)}
              onChange={(date) => setForm((prev) => ({ ...prev, startDate: formatISODate(date) }))}
            />
            <DateInput
              label="Data de finalização"
              value={parseISODate(form.endDate)}
              onChange={(date) => setForm((prev) => ({ ...prev, endDate: formatISODate(date) }))}
            />
          </Group>
          <Select
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
            <Button onClick={handleSave} size="sm" loading={saving} disabled={saving}>
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
