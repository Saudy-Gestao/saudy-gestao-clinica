import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { showNotification } from '@/components/ui';
import { ChevronRight, Map as MapIcon, Pencil, Search, Trash2, UserPlus, Warehouse } from 'lucide-react';
import { Header } from '../Header/Header';
import { MapaSalas } from './MapaSalas';
import sectorService from '../../services/sectorService';
import { isRoomSector, markRoomDescription, stripRoomMarker } from '../../utils/sectorClassification';
import { useRoomsAdminQuery } from '../../hooks/useRoomsAdminQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { useModalidadesAdminQuery } from '../../hooks/useModalidadesAdminQuery';
import { useEspecialidadesAdminQuery } from '../../hooks/useEspecialidadesAdminQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import './CadastroSala.css';

interface BranchOption {
  id: string;
  label: string;
}

interface SalaRow {
  id: string;
  name: string;
  description?: string | null;
  branchId: string;
  workingDays: string[];
  modalidadeId?: string | null;
  especialidadeId?: string | null;
  especialidadeIds?: string[];
  capacity?: number | null;
}

const WEEKDAY_OPTIONS = [
  { value: 'segunda', label: 'Segunda' },
  { value: 'terca', label: 'Terça' },
  { value: 'quarta', label: 'Quarta' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'sexta', label: 'Sexta' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

export function CadastroSala() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [query, setQuery] = useState('');
  const [activeView, setActiveView] = useState<'hub' | 'cadastro' | 'mapa'>('hub');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [items, setItems] = useState<SalaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const roomsQuery = useRoomsAdminQuery();
  const branchesQuery = useSettingsBranchesQuery();
  const modalidadesQuery = useModalidadesAdminQuery();
  const especialidadesQuery = useEspecialidadesAdminQuery();

  const [form, setForm] = useState({
    name: '',
    description: '',
    branchId: '',
    workingDays: [] as string[],
    modalidadeId: '' as string,
    especialidadeIds: [] as string[],
    capacity: '' as string,
  });

  const modalidadeOptions = useMemo(() => {
    const data: any = modalidadesQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return list.filter((m: any) => m?.id && m.isActive).map((m: any) => ({ value: m.id, label: m.name }));
  }, [modalidadesQuery.data]);

  const especialidadeList = useMemo(() => {
    const data: any = especialidadesQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return list.filter((e: any) => e?.id && e.isActive);
  }, [especialidadesQuery.data]);

  const especialidadesByModalidadeId = useMemo(() => {
    const map = new Map<string, any[]>();
    especialidadeList.forEach((especialidade: any) => {
      const modalidadeId = String(especialidade.modalidadeId || '').trim();
      if (!modalidadeId) return;
      const current = map.get(modalidadeId) || [];
      current.push(especialidade);
      map.set(modalidadeId, current);
    });
    return map;
  }, [especialidadeList]);

  const branchLabelById = useMemo(() => {
    return branches.reduce<Record<string, string>>((acc, branch) => {
      acc[branch.id] = branch.label;
      return acc;
    }, {});
  }, [branches]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (
      it.name.toLowerCase().includes(q)
      || (it.description || '').toLowerCase().includes(q)
    ));
  }, [items, query]);

  useEffect(() => {
    setLoadingBranches(branchesQuery.isFetching);
  }, [branchesQuery.isFetching]);

  useEffect(() => {
    if (!branchesQuery.error) return;
    const err: any = branchesQuery.error;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar filiais'),
      color: 'red',
    });
  }, [branchesQuery.error]);

  useEffect(() => {
    const data: any = branchesQuery.data;
    const list: any[] = Array.isArray(data)
      ? data
      : (Array.isArray(data?.items)
        ? data.items
        : (Array.isArray(data?.data?.items)
          ? data.data.items
          : (Array.isArray(data?.data)
            ? data.data
            : [])));

    const mapped: BranchOption[] = list.map((branch: any) => ({
      id: String(branch.id || ''),
      label: branch.tradeName || branch.socialName || 'Filial sem nome',
    })).filter((branch: BranchOption) => branch.id);

    setBranches(mapped);
    if (!selectedBranchId && mapped.length > 0) {
      setSelectedBranchId(mapped[0].id);
    }
  }, [branchesQuery.data, selectedBranchId]);

  useEffect(() => {
    setLoading(roomsQuery.isLoading && items.length === 0);
  }, [items.length, roomsQuery.isLoading]);

  useEffect(() => {
    if (roomsQuery.error) {
      const err: any = roomsQuery.error;
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao carregar salas'),
        color: 'red',
      });
    }
  }, [roomsQuery.error]);

  useEffect(() => {
    if (!selectedBranchId) {
      setItems([]);
      return;
    }
    const list = Array.isArray(roomsQuery.data) ? roomsQuery.data : [];
    const mapped: SalaRow[] = list
      .filter((sector: any) => isRoomSector(sector))
      .map((sector: any) => ({
        id: String(sector.id || ''),
        name: sector.name || '',
        description: stripRoomMarker(sector.description) || null,
        branchId: String(sector.branchId || ''),
        workingDays: Array.isArray(sector.workingDays)
          ? sector.workingDays.map((day: any) => String(day || '').trim()).filter(Boolean)
          : [],
        modalidadeId: sector.modalidadeId || null,
        especialidadeId: sector.especialidadeId || null,
        especialidadeIds: Array.isArray(sector.especialidadeIds) && sector.especialidadeIds.length > 0
          ? sector.especialidadeIds.map((id: any) => String(id))
          : (sector.especialidadeId ? [String(sector.especialidadeId)] : []),
        capacity: sector.capacity ?? null,
      }))
      .filter((sector: SalaRow) => sector.id && sector.branchId === selectedBranchId);
    setItems(mapped);
  }, [roomsQuery.data, selectedBranchId]);

  const openModal = (item?: SalaRow) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        name: item.name || '',
        description: item.description || '',
        branchId: item.branchId || selectedBranchId || '',
        workingDays: Array.isArray(item.workingDays) ? item.workingDays : [],
        modalidadeId: item.modalidadeId || '',
        especialidadeIds: item.especialidadeIds || (item.especialidadeId ? [item.especialidadeId] : []),
        capacity: item.capacity != null ? String(item.capacity) : '',
      });
    } else {
      setEditingId(null);
      setForm({
        name: '',
        description: '',
        branchId: selectedBranchId || '',
        workingDays: [],
        modalidadeId: '',
        especialidadeIds: [],
        capacity: '',
      });
    }
    setModalOpen(true);
  };

  const handleModalidadeChange = (modalidadeId: string | null) => {
    setForm((prev) => ({ ...prev, modalidadeId: modalidadeId || '', especialidadeIds: [] }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showNotification({ title: 'Erro', message: 'Nome da sala é obrigatório', color: 'red' });
      return;
    }

    if (!form.branchId) {
      showNotification({ title: 'Erro', message: 'Selecione a filial da sala', color: 'red' });
      return;
    }

    setSaving(true);
    try {
      const trimmedCapacity = form.capacity.trim();
      if (trimmedCapacity && (!/^\d+$/.test(trimmedCapacity) || Number(trimmedCapacity) < 1)) {
        showNotification({ title: 'Erro', message: 'Capacidade de slots deve ser um número inteiro maior que zero', color: 'red' });
        setSaving(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        description: markRoomDescription(form.description || ''),
        branchId: form.branchId,
        workingDays: form.workingDays || [],
        modalidadeId: form.modalidadeId || null,
        especialidadeId: form.especialidadeIds[0] || null,
        especialidadeIds: form.especialidadeIds,
        capacity: trimmedCapacity ? Number(trimmedCapacity) : null,
      };

      let roomId = editingId;
      if (editingId) {
        await sectorService.updateSector(editingId, payload);
        showNotification({ title: 'Atualizado', message: 'Sala atualizada', color: 'green' });
      } else {
        const created: any = await sectorService.createSector(payload);
        roomId = String(created?.id || '');
        showNotification({ title: 'Adicionado', message: 'Sala cadastrada', color: 'green' });
      }

      if (!roomId) {
        throw new Error('Não foi possível identificar a sala salva.');
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.roomsAdmin });

      setItems((prev) => prev.map((item) => {
        if (item.id === roomId) {
          return {
            ...item,
            modalidadeId: payload.modalidadeId,
            especialidadeId: payload.especialidadeId,
            especialidadeIds: payload.especialidadeIds,
            capacity: payload.capacity,
          };
        }

        return item;
      }));

      setModalOpen(false);
      setEditingId(null);
      setForm({
        name: '',
        description: '',
        branchId: selectedBranchId || '',
        workingDays: [],
        modalidadeId: '',
        especialidadeIds: [],
        capacity: '',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao salvar sala'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: SalaRow) => {
    setDeleting(true);
    try {
      await sectorService.deleteSector(item.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.roomsAdmin });
      showNotification({ title: 'Removido', message: 'Sala excluída', color: 'green' });
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao excluir sala'),
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => (activeView === 'hub' ? navigate('/dashboard?secao=cadastros-clinicos') : setActiveView('hub')) }} />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {activeView === 'hub' ? (
          <>
            <Box className="cadastro-sala-hero ui-page-intro">
              <Text className="cadastro-sala-eyebrow">CADASTROS CLÍNICOS</Text>
              <Text className="cadastro-sala-title" fw={700} size="2xl">Salas</Text>
              <Text className="cadastro-sala-subtitle" size="sm">Cadastro de salas por filial</Text>
            </Box>

            <SimpleGrid className="cadastro-sala-hub-grid" cols={{ base: 1, sm: 2 }}>
              {[
                {
                  key: 'cadastro',
                  icon: Warehouse,
                  title: 'Cadastro de salas',
                  desc: 'Cadastre, edite e organize as salas de cada filial.',
                  onClick: () => setActiveView('cadastro'),
                },
                {
                  key: 'mapa',
                  icon: MapIcon,
                  title: 'Mapa de salas',
                  desc: 'Acompanhe ocupação, disponibilidade e agenda das salas por dia ou semana.',
                  onClick: () => setActiveView('mapa'),
                },
              ].map((card) => (
                <Paper key={card.key} className="cadastro-sala-hub-card" withBorder onClick={card.onClick}>
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <Box className="cadastro-sala-hub-icon">
                        <card.icon size={20} />
                      </Box>
                      <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="md" lineClamp={1}>{card.title}</Text>
                        <Text size="sm" c="dimmed" lineClamp={2}>{card.desc}</Text>
                      </Box>
                    </Group>
                    <ChevronRight size={18} className="cadastro-sala-hub-chevron" style={{ flexShrink: 0 }} />
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </>
        ) : activeView === 'mapa' ? (
          <>
            <Group justify="space-between" align="center" mb="lg" wrap="wrap">
              <Text fw={600} size="lg">Mapa de salas</Text>
            </Group>
            <MapaSalas embedded />
          </>
        ) : (
          <>
            <Group justify="space-between" align="center" mb="lg" wrap="wrap">
              <Text fw={600} size="lg">Cadastro de salas</Text>
            </Group>
            <Paper className="cadastro-sala-panel" p="lg" withBorder radius="md">
            <Group justify="flex-end" mb="lg" wrap="wrap" gap="sm">
              <Group gap="sm" wrap="wrap" align="flex-end" className="cadastro-sala-actions">
                <Select
                  label="Filial"
                  className="cadastro-sala-branch-select"
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  data={branches.map((branch) => ({ value: branch.id, label: branch.label }))}
                  disabled={loadingBranches}
                  searchable
                  nothingFoundMessage="Nenhuma filial encontrada"
                />
                <TextInput
                  className="cadastro-sala-search"
                  placeholder="Buscar por nome ou descrição"
                  leftSection={<Search size={16} aria-hidden="true" />}
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                />
                <Button leftSection={<UserPlus size={16} />} onClick={() => openModal()} disabled={!selectedBranchId}>
                  Nova sala
                </Button>
              </Group>
            </Group>

            {loading ? (
              isMobile ? (
                <Stack gap="sm">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Paper key={idx} className="cadastro-sala-card" withBorder radius="md" p="md">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Stack gap={8} style={{ flex: 1 }}>
                          <Skeleton height={18} width="52%" radius="sm" />
                          <Skeleton height={14} width="42%" radius="sm" />
                          <Skeleton height={14} width="58%" radius="sm" />
                        </Stack>
                        <Group gap={8}>
                          <Skeleton height={28} width={28} radius="xl" />
                          <Skeleton height={28} width={28} radius="xl" />
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box className="cadastro-sala-table-wrap">
                  <Table horizontalSpacing="md" verticalSpacing="md">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th className="cadastro-sala-th">Nome da sala</Table.Th>
                        <Table.Th className="cadastro-sala-th">Descrição</Table.Th>
                        <Table.Th className="cadastro-sala-th">Filial</Table.Th>
                        <Table.Th className="cadastro-sala-th">Ações</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Table.Tr key={idx} className="cadastro-sala-row">
                          <Table.Td><Skeleton height={16} width="58%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={14} width="70%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={14} width="62%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={14} width="48%" radius="sm" /></Table.Td>
                          <Table.Td>
                            <Group gap={8} justify="flex-end">
                              <Skeleton height={28} width={28} radius="xl" />
                              <Skeleton height={28} width={28} radius="xl" />
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              )
            ) : (
              isMobile ? (
                filteredItems.length === 0 ? (
                  <Paper className="cadastro-sala-empty" withBorder radius="md" p="xl">
                    <Text c="dimmed" ta="center">
                      Nenhuma sala encontrada para esta filial.
                    </Text>
                  </Paper>
                ) : (
                  <Stack gap="sm">
                    {filteredItems.map((item) => (
                      <Paper key={item.id} className="cadastro-sala-card" withBorder radius="md" p="md">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Stack gap={4} style={{ flex: 1 }}>
                            <Text fw={600}>{item.name}</Text>
                            <Text size="sm" c="dimmed">{branchLabelById[item.branchId] || '-'}</Text>
                            {item.description ? (
                              <Text size="sm" c="dimmed" lineClamp={2}>{item.description}</Text>
                            ) : null}
                          </Stack>
                          <Group gap={8}>
                            <ActionIcon variant="light" color="blue" onClick={() => openModal(item)} aria-label="Editar sala">
                              <Pencil size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => {
                                setDeleteTarget(item);
                                setDeleteModalOpen(true);
                              }}
                              aria-label="Excluir sala"
                            >
                              <Trash2 size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                )
              ) : (
                <Box className="cadastro-sala-table-wrap">
                  <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                    <Table.Thead>
                      <Table.Tr style={{ borderBottom: 'none' }}>
                        <Table.Th className="cadastro-sala-th">Nome da sala</Table.Th>
                        {!isMobile && <Table.Th className="cadastro-sala-th">Descrição</Table.Th>}
                        {!isTablet && <Table.Th className="cadastro-sala-th">Filial</Table.Th>}
                        <Table.Th className="cadastro-sala-th">Ações</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredItems.map((item) => (
                        <Table.Tr key={item.id} className="cadastro-sala-row">
                          <Table.Td>
                            <Text fw={600}>{item.name}</Text>
                          </Table.Td>
                          {!isMobile && <Table.Td><Text c="dimmed" lineClamp={2}>{item.description || '-'}</Text></Table.Td>}
                          {!isTablet && <Table.Td><Text c="dimmed">{branchLabelById[item.branchId] || '-'}</Text></Table.Td>}
                          <Table.Td>
                            <Group gap="xs" justify="flex-end">
                              <ActionIcon variant="light" color="blue" onClick={() => openModal(item)} aria-label="Editar sala">
                                <Pencil size={16} />
                              </ActionIcon>
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => {
                                  setDeleteTarget(item);
                                  setDeleteModalOpen(true);
                                }}
                                aria-label="Excluir sala"
                              >
                                <Trash2 size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                      {filteredItems.length === 0 && (
                        <Table.Tr>
                          <Table.Td colSpan={isTablet ? 3 : 4} style={{ textAlign: 'center' }}>
                            <Text c="dimmed" py="md">Nenhuma sala encontrada para esta filial.</Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Box>
              )
            )}
            </Paper>
          </>
        )}
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar sala' : 'Nova sala'}
        centered
      >
        <Stack>
          <Select
            label="Filial"
            value={form.branchId}
            onChange={(value) => setForm((prev) => ({ ...prev, branchId: value || '' }))}
            data={branches.map((branch) => ({ value: branch.id, label: branch.label }))}
            searchable
            nothingFoundMessage="Nenhuma filial encontrada"
            required
          />
          <TextInput
            label="Nome da sala"
            placeholder="Ex.: Sala 01"
            value={form.name}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setForm((prev) => ({ ...prev, name: value }));
            }}
            required
          />
          <Group grow>
            <Select
              label="Modalidade"
              placeholder="Selecione a modalidade"
              value={form.modalidadeId || null}
              onChange={handleModalidadeChange}
              data={modalidadeOptions}
              searchable
              clearable
              nothingFoundMessage="Nenhuma modalidade encontrada"
            />
            <MultiSelect
              label="Especialidade"
              placeholder={form.modalidadeId ? 'Selecione uma ou mais especialidades' : 'Selecione uma modalidade primeiro'}
              data={(form.modalidadeId ? especialidadesByModalidadeId.get(form.modalidadeId) || [] : []).map((especialidade: any) => ({
                value: String(especialidade.id),
                label: String(especialidade.name || 'Especialidade sem nome'),
              }))}
              value={form.especialidadeIds}
              onChange={(values) => setForm((prev) => ({ ...prev, especialidadeIds: values }))}
              disabled={!form.modalidadeId}
              searchable
              clearable
              nothingFoundMessage="Nenhuma especialidade disponível"
            />
          </Group>
          <NumberInput
            label="Capacidade de slots"
            placeholder="Ex.: 1"
            min={1}
            value={form.capacity === '' ? '' : Number(form.capacity)}
            onChange={(value) => setForm((prev) => ({ ...prev, capacity: value === '' ? '' : String(value) }))}
          />
          <MultiSelect
            label="Dias de funcionamento"
            value={form.workingDays}
            onChange={(values) => setForm((prev) => ({ ...prev, workingDays: values }))}
            data={WEEKDAY_OPTIONS}
            searchable
            clearable
            nothingFoundMessage="Nenhum dia encontrado"
          />
          <Textarea
            label="Descrição"
            placeholder="Informações adicionais da sala"
            minRows={3}
            value={form.description}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setForm((prev) => ({ ...prev, description: value }));
            }}
          />
          <Button onClick={handleSave} loading={saving}>
            {editingId ? 'Salvar alterações' : 'Cadastrar sala'}
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Confirmar exclusão"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {`Confirma a exclusão da sala ${deleteTarget?.name || 'selecionada'}?`}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteTarget(null);
              }}
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
