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
import { isRoomSector } from '../../utils/sectorClassification';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

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

  const doctorOptionsForBranch = (branchId: string) => doctorList
    .filter((d: any) => (Array.isArray(d.branchIds) && d.branchIds.includes(branchId)) || d.branchId === branchId)
    .map((d: any) => ({ value: d.id, label: d.name }));

  const especialidadeGroupsForDoctor = (doctorId: string): any[] => {
    const doctor = doctorList.find((d: any) => d.id === doctorId);
    return Array.isArray(doctor?.especialidadeGroups) ? doctor.especialidadeGroups : [];
  };

  const especialidadeOptionsForDoctor = (doctorId: string) => especialidadeGroupsForDoctor(doctorId)
    .map((g: any) => especialidadeById.get(g.especialidadeId))
    .filter(Boolean)
    .map((e: any) => ({ value: e.id, label: e.name }));

  const roomOptionsForBranch = (branchId: string, especialidadeId: string) => {
    const especialidade = especialidadeId ? especialidadeById.get(especialidadeId) : null;
    const modalidadeId = especialidade?.modalidadeId || null;
    return roomList
      .filter((r: any) => r.branchId === branchId)
      .filter((r: any) => !modalidadeId || !r.modalidadeId || r.modalidadeId === modalidadeId)
      .map((r: any) => ({ value: r.id, label: r.name }));
  };

  const [filterBranchId, setFilterBranchId] = useState<string | null>(null);

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

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AgendaFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agenda | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, branchId: filterBranchId || '' });
    setFormError(null);
    setModalOpen(true);
  };

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

  const handleEspecialidadeChange = (especialidadeId: string | null) => {
    setForm((prev) => ({ ...prev, especialidadeId: especialidadeId || '', roomId: '' }));
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
      } else {
        await agendaService.createAgenda(payload);
        showNotification({ title: 'Cadastrada', message: 'Agenda cadastrada com sucesso', color: 'green' });
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
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Agendas
              </Text>
              <Text size="sm" c="dimmed">
                Agendas de profissionais por unidade, dia e turno
              </Text>
            </Box>
          </Group>

          <Button bg={DARK_BLUE} c="white" leftSection={<Plus size={16} />} onClick={openCreateModal} size={isMobile ? 'sm' : 'md'}>
            Nova agenda
          </Button>
        </Group>

        <Group mb={isMobile ? 20 : 30} grow={isMobile} align="flex-end">
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

      <Modal
        opened={modalOpen}
        onClose={() => { if (!saving) setModalOpen(false); }}
        title={editingId ? 'Editar agenda' : 'Cadastrar agenda'}
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
          <Group grow>
            <FloatingSelect
              label="Dia da semana"
              required
              placeholder="Selecione o dia"
              data={WEEKDAY_OPTIONS}
              value={form.weekday || null}
              onChange={(value) => setForm((prev) => ({ ...prev, weekday: value || '' }))}
            />
            <FloatingSelect
              label="Especialidade"
              placeholder={form.doctorId ? 'Selecione a especialidade' : 'Selecione um profissional primeiro'}
              data={especialidadeOptionsForDoctor(form.doctorId)}
              value={form.especialidadeId || null}
              disabled={!form.doctorId}
              clearable
              nothingFoundMessage="Profissional sem especialidades cadastradas"
              onChange={handleEspecialidadeChange}
            />
          </Group>
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
            placeholder={form.branchId ? 'Selecione a sala (opcional)' : 'Selecione uma unidade primeiro'}
            data={roomOptionsForBranch(form.branchId, form.especialidadeId)}
            value={form.roomId || null}
            disabled={!form.branchId}
            clearable
            searchable
            nothingFoundMessage="Nenhuma sala encontrada"
            onChange={(value) => setForm((prev) => ({ ...prev, roomId: value || '' }))}
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
              {editingId ? 'Salvar' : 'Cadastrar'}
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
