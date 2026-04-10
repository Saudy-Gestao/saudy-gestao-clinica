import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Button,
  Badge,
  Group,
  Modal,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import sectorService from '../../services/sectorService';
import doctorService from '../../services/doctorService';
import { isRoomSector, markRoomDescription, stripRoomMarker } from '../../utils/sectorClassification';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { useRoomsAdminQuery } from '../../hooks/useRoomsAdminQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

interface BranchOption {
  id: string;
  label: string;
}

interface SalaRow {
  id: string;
  name: string;
  description?: string | null;
  branchId: string;
  doctorIds?: string[];
  doctorNames?: string[];
}

interface DoctorOption {
  value: string;
  label: string;
  branchId: string;
  roomIds: string[];
}

const normalizeDoctorOptions = (data: any): DoctorOption[] => {
  const list: any[] = Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data?.items)
        ? data.data.items
        : (Array.isArray(data?.data)
          ? data.data
          : [])));

  return list
    .map((doctor: any) => ({
      value: String(doctor?.id || ''),
      label: doctor?.name || 'Médico sem nome',
      branchId: String(doctor?.branchId || ''),
      roomIds: Array.isArray(doctor?.roomIds)
        ? doctor.roomIds.map((roomId: any) => String(roomId || '').trim()).filter(Boolean)
        : (doctor?.roomId ? [String(doctor.roomId)] : []),
    }))
    .filter((doctor: DoctorOption) => Boolean(doctor.value));
};

export function CadastroSala() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [query, setQuery] = useState('');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [items, setItems] = useState<SalaRow[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
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
  const doctorsQuery = useDoctorsAdminQuery();

  const [form, setForm] = useState({
    name: '',
    description: '',
    branchId: '',
    doctorIds: [] as string[],
  });

  const branchLabelById = useMemo(() => {
    return branches.reduce<Record<string, string>>((acc, branch) => {
      acc[branch.id] = branch.label;
      return acc;
    }, {});
  }, [branches]);

  const linkedDoctorsByRoomId = useMemo(() => {
    return doctorOptions.reduce<Record<string, DoctorOption[]>>((acc, doctor) => {
      for (const roomId of doctor.roomIds) {
        if (!acc[roomId]) acc[roomId] = [];
        acc[roomId].push(doctor);
      }
      return acc;
    }, {} as Record<string, DoctorOption[]>);
  }, [doctorOptions]);

  const displayItems = useMemo(() => {
    return items.map((item) => {
      const linkedDoctors = linkedDoctorsByRoomId[item.id] || [];
      return {
        ...item,
        doctorIds: linkedDoctors.map((doctor) => doctor.value),
        doctorNames: linkedDoctors.map((doctor) => doctor.label),
      };
    });
  }, [items, linkedDoctorsByRoomId]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayItems;
    return displayItems.filter((it) => (
      it.name.toLowerCase().includes(q)
      || (it.description || '').toLowerCase().includes(q)
      || (it.doctorNames || []).some((doctorName) => doctorName.toLowerCase().includes(q))
    ));
  }, [displayItems, query]);

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
        doctorIds: [],
        doctorNames: [],
      }))
      .filter((sector: SalaRow) => sector.id && sector.branchId === selectedBranchId);
    setItems(mapped);
  }, [roomsQuery.data, selectedBranchId]);

  useEffect(() => {
    if (!doctorsQuery.error) return;
    const err: any = doctorsQuery.error;
    setDoctorOptions([]);
    showNotification({
      title: 'Erro ao carregar médicos',
      message: resolveApiErrorMessage(err, 'A lista de médicos não pôde ser carregada.'),
      color: 'red',
    });
  }, [doctorsQuery.error]);

  useEffect(() => {
    setDoctorOptions(normalizeDoctorOptions(doctorsQuery.data));
  }, [doctorsQuery.data]);
  const availableDoctorOptions = useMemo(() => {
    return doctorOptions.map((doctor) => ({ value: doctor.value, label: doctor.label }));
  }, [doctorOptions]);

  const openModal = (item?: SalaRow) => {
    if (item) {
      const linkedDoctors = linkedDoctorsByRoomId[item.id] || [];
      setEditingId(item.id);
      setForm({
        name: item.name || '',
        description: item.description || '',
        branchId: item.branchId || selectedBranchId || '',
        doctorIds: linkedDoctors.map((doctor) => doctor.value),
      });
    } else {
      setEditingId(null);
      setForm({
        name: '',
        description: '',
        branchId: selectedBranchId || '',
        doctorIds: [],
      });
    }
    setModalOpen(true);
  };

  const syncRoomDoctors = async (roomId: string, nextDoctorIds: string[]) => {
    const selectedIds = Array.from(new Set(nextDoctorIds.filter(Boolean)));
    const currentDoctors = doctorOptions.filter((doctor) => doctor.roomIds.includes(roomId));
    const doctorsToSync = doctorOptions.filter((doctor) =>
      currentDoctors.some((item) => item.value === doctor.value) || selectedIds.includes(doctor.value),
    );

    for (const doctor of doctorsToSync) {
      const nextRoomIds = selectedIds.includes(doctor.value)
        ? Array.from(new Set([...doctor.roomIds.filter(Boolean), roomId]))
        : doctor.roomIds.filter((linkedRoomId) => linkedRoomId !== roomId);

      await doctorService.updateDoctor(doctor.value, {
        roomIds: nextRoomIds,
        roomId: nextRoomIds[0] || null,
      });
    }

    setDoctorOptions((prev) => prev.map((doctor) => {
      if (!doctorsToSync.some((item) => item.value === doctor.value)) return doctor;

      const nextRoomIds = selectedIds.includes(doctor.value)
        ? Array.from(new Set([...doctor.roomIds.filter(Boolean), roomId]))
        : doctor.roomIds.filter((linkedRoomId) => linkedRoomId !== roomId);

      return {
        ...doctor,
        roomIds: nextRoomIds,
      };
    }));
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
      const payload = {
        name: form.name.trim(),
        description: markRoomDescription(form.description || ''),
        branchId: form.branchId,
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
        throw new Error('Não foi possível identificar a sala salva para vincular o médico.');
      }

      await syncRoomDoctors(roomId, form.doctorIds || []);
      await queryClient.invalidateQueries({ queryKey: queryKeys.roomsAdmin });
      const selectedDoctors = doctorOptions.filter((doctor) => (form.doctorIds || []).includes(doctor.value));

      setItems((prev) => prev.map((item) => {
        if (item.id === roomId) {
          return {
            ...item,
            doctorIds: selectedDoctors.map((doctor) => doctor.value),
            doctorNames: selectedDoctors.map((doctor) => doctor.label),
          };
        }

        return item;
      }));

      setModalOpen(false);
      setEditingId(null);
      setForm({ name: '', description: '', branchId: selectedBranchId || '', doctorIds: [] });
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
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Salas
              </Text>
              <Text size="sm" c="dimmed">
                Cadastro de salas por filial
              </Text>
            </Box>
          </Group>

          <Button
            bg={DARK_BLUE}
            c="white"
            leftSection={<Plus size={16} />}
            onClick={() => openModal()}
            size={isMobile ? 'sm' : 'md'}
            disabled={!selectedBranchId}
          >
            Nova sala
          </Button>
        </Group>

        <Group mb={isMobile ? 16 : 24} grow align="flex-end">
          <FloatingSelect
            label="Filial"
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            data={branches.map((branch) => ({ value: branch.id, label: branch.label }))}
            disabled={loadingBranches}
            searchable
            nothingFoundMessage="Nenhuma filial encontrada"
          />
          <FloatingInput
            label="Buscar sala"
            placeholder="Buscar por nome ou descrição..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </Group>

        {loading ? (
          isMobile ? (
            <Stack gap="sm">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Paper key={idx} withBorder radius="md" p="md">
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
            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
              <Table horizontalSpacing="md" verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nome da sala</Table.Th>
                    <Table.Th>Médicos vinculados</Table.Th>
                    <Table.Th>Descrição</Table.Th>
                    <Table.Th>Filial</Table.Th>
                    <Table.Th>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Table.Tr key={idx}>
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
              <Paper withBorder radius="md" p="xl">
                <Text c="dimmed" ta="center">
                  Nenhuma sala encontrada para esta filial.
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm">
                {filteredItems.map((item) => (
                  <Paper key={item.id} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={600}>{item.name}</Text>
                        <Text size="sm" c="dimmed">{branchLabelById[item.branchId] || '-'}</Text>
                        <Text size="sm" c="dimmed">
                          {(item.doctorNames || []).length > 0 ? `${item.doctorNames?.length} médico(s) vinculados` : 'Sem médicos vinculados'}
                        </Text>
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
            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
              <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: 'none' }}>
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome da sala</Table.Th>
                    {!isMobile && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Médicos vinculados</Table.Th>}
                    {!isMobile && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Descrição</Table.Th>}
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Filial</Table.Th>}
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredItems.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Text fw={600}>{item.name}</Text>
                      </Table.Td>
                      {!isMobile && (
                        <Table.Td>
                          {(item.doctorNames || []).length > 0 ? (
                            <Group gap={6}>
                              {(item.doctorNames || []).slice(0, 2).map((doctorName) => (
                                <Badge key={doctorName} variant="light" color="blue" size="sm">
                                  {doctorName}
                                </Badge>
                              ))}
                              {(item.doctorNames || []).length > 2 ? (
                                <Text size="xs" c="dimmed">+{(item.doctorNames || []).length - 2}</Text>
                              ) : null}
                            </Group>
                          ) : (
                            <Text c="dimmed">-</Text>
                          )}
                        </Table.Td>
                      )}
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
                      <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                        <Text c="dimmed" py="md">Nenhuma sala encontrada para esta filial.</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Box>
          )
        )}
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar sala' : 'Nova sala'}
        centered
      >
        <Stack>
          <FloatingSelect
            label="Filial"
            value={form.branchId}
            onChange={(value) => setForm((prev) => ({ ...prev, branchId: value || '' }))}
            data={branches.map((branch) => ({ value: branch.id, label: branch.label }))}
            searchable
            nothingFoundMessage="Nenhuma filial encontrada"
            required
          />
          <FloatingInput
            label="Nome da sala"
            placeholder="Ex.: Sala 01"
            value={form.name}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setForm((prev) => ({ ...prev, name: value }));
            }}
            required
          />
          <FloatingMultiSelect
            label="Médicos vinculados"
            value={form.doctorIds}
            onChange={(values) => setForm((prev) => ({ ...prev, doctorIds: values }))}
            data={availableDoctorOptions}
            searchable
            clearable
            nothingFoundMessage="Nenhum médico encontrado para esta filial"
          />
          <FloatingTextarea
            label="Descrição"
            placeholder="Informações adicionais da sala"
            minRows={3}
            value={form.description}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setForm((prev) => ({ ...prev, description: value }));
            }}
          />
          <Button bg={DARK_BLUE} c="white" onClick={handleSave} loading={saving}>
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
