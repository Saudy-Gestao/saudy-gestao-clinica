import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import branchService from '../../services/branchService';
import sectorService from '../../services/sectorService';
import doctorService from '../../services/doctorService';
import { isRoomSector, markRoomDescription, stripRoomMarker } from '../../utils/sectorClassification';

interface BranchOption {
  id: string;
  label: string;
}

interface SalaRow {
  id: string;
  name: string;
  description?: string | null;
  branchId: string;
  doctorId?: string | null;
  doctorName?: string | null;
}

interface DoctorOption {
  value: string;
  label: string;
  branchId: string;
  roomId?: string | null;
}

export function CadastroSala() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [query, setQuery] = useState('');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [items, setItems] = useState<SalaRow[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    branchId: '',
    doctorId: '',
  });

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

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const data: any = await branchService.listBranches();
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
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.message || 'Erro ao carregar filiais',
        color: 'red',
      });
    } finally {
      setLoadingBranches(false);
    }
  };

  const loadSalas = async (branchId: string | null) => {
    if (!branchId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const data: any = await sectorService.listSectors();
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data?.data?.items)
            ? data.data.items
            : (Array.isArray(data?.data)
              ? data.data
              : [])));

      const mapped: SalaRow[] = list
        .filter((sector: any) => isRoomSector(sector))
        .map((sector: any) => ({
          id: String(sector.id || ''),
          name: sector.name || '',
          description: stripRoomMarker(sector.description) || null,
          branchId: String(sector.branchId || ''),
          doctorId: null,
          doctorName: null,
        }))
        .filter((sector: SalaRow) => sector.id && sector.branchId === branchId);

      setItems(mapped);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.message || 'Erro ao carregar salas',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadSalas(selectedBranchId);
  }, [selectedBranchId]);

  useEffect(() => {
    const loadDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const data: any = await doctorService.listDoctors();
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const mapped = list
          .map((doctor: any) => ({
            value: String(doctor.id || ''),
            label: doctor.name || 'Médico sem nome',
            branchId: String(doctor.branchId || ''),
            roomId: doctor.roomId ? String(doctor.roomId) : null,
          }))
          .filter((doctor: DoctorOption) => Boolean(doctor.value));

        setDoctorOptions(mapped);
      } catch {
        setDoctorOptions([]);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const doctorByRoomId = doctorOptions.reduce<Record<string, DoctorOption>>((acc, doctor) => {
      if (doctor.roomId) acc[doctor.roomId] = doctor;
      return acc;
    }, {});

    setItems((prev) => prev.map((item) => {
      const linkedDoctor = doctorByRoomId[item.id];
      return {
        ...item,
        doctorId: linkedDoctor?.value || null,
        doctorName: linkedDoctor?.label || null,
      };
    }));
  }, [doctorOptions]);

  const availableDoctorOptions = useMemo(() => {
    if (!form.branchId) return [];
    return doctorOptions
      .filter((doctor) => doctor.branchId === form.branchId)
      .map((doctor) => ({ value: doctor.value, label: doctor.label }));
  }, [doctorOptions, form.branchId]);

  const openModal = (item?: SalaRow) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        name: item.name || '',
        description: item.description || '',
        branchId: item.branchId || selectedBranchId || '',
        doctorId: item.doctorId || '',
      });
    } else {
      setEditingId(null);
      setForm({
        name: '',
        description: '',
        branchId: selectedBranchId || '',
        doctorId: '',
      });
    }
    setModalOpen(true);
  };

  const syncRoomDoctor = async (roomId: string, nextDoctorId: string | null) => {
    const linkedDoctors = doctorOptions.filter((doctor) => doctor.roomId === roomId);

    for (const doctor of linkedDoctors) {
      if (doctor.value !== nextDoctorId) {
        await doctorService.updateDoctor(doctor.value, { roomId: null });
      }
    }

    if (nextDoctorId) {
      await doctorService.updateDoctor(nextDoctorId, { roomId });
    }
  };

  const refreshDoctors = async () => {
    const data: any = await doctorService.listDoctors();
    const list: any[] = Array.isArray(data)
      ? data
      : (Array.isArray(data?.items)
        ? data.items
        : (Array.isArray(data?.data?.items)
          ? data.data.items
          : (Array.isArray(data?.data)
            ? data.data
            : [])));

    const mapped = list
      .map((doctor: any) => ({
        value: String(doctor.id || ''),
        label: doctor.name || 'Médico sem nome',
        branchId: String(doctor.branchId || ''),
        roomId: doctor.roomId ? String(doctor.roomId) : null,
      }))
      .filter((doctor: DoctorOption) => Boolean(doctor.value));

    setDoctorOptions(mapped);
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

      await syncRoomDoctor(roomId, form.doctorId || null);
      await refreshDoctors();

      setModalOpen(false);
      setEditingId(null);
      setForm({ name: '', description: '', branchId: selectedBranchId || '', doctorId: '' });
      loadSalas(selectedBranchId);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.message || 'Erro ao salvar sala',
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
      showNotification({ title: 'Removido', message: 'Sala excluída', color: 'green' });
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.message || 'Erro ao excluir sala',
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
          <Select
            label="Filial"
            placeholder={loadingBranches ? 'Carregando filiais...' : 'Selecione a filial'}
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            data={branches.map((branch) => ({ value: branch.id, label: branch.label }))}
            disabled={loadingBranches}
            searchable
            nothingFoundMessage="Nenhuma filial encontrada"
          />
          <TextInput
            label="Buscar sala"
            placeholder="Buscar por nome ou descrição..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </Group>

        {loading ? (
          <Center style={{ padding: 24, gap: 8 }}>
            <Loader />
            <Text>Carregando salas...</Text>
          </Center>
        ) : (
          <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
            <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
            <Table.Thead>
              <Table.Tr style={{ borderBottom: 'none' }}>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome da sala</Table.Th>
                {!isMobile && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Médico vinculado</Table.Th>}
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
                    {!isMobile && <Table.Td><Text c="dimmed">{item.doctorName || '-'}</Text></Table.Td>}
                    {!isMobile && <Table.Td><Text c="dimmed">{item.description || '-'}</Text></Table.Td>}
                    {!isTablet && <Table.Td><Text c="dimmed">{branchLabelById[item.branchId] || '-'}</Text></Table.Td>}
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon variant="subtle" color="blue" onClick={() => openModal(item)} aria-label="Editar sala">
                          <Pencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
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
                      <Text c="dimmed" py="md">Nenhuma sala encontrada para esta filial</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Box>
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
            placeholder="Selecione a filial"
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
          <Select
            label="Médico vinculado"
            placeholder={loadingDoctors ? 'Carregando médicos...' : 'Selecione um médico'}
            value={form.doctorId}
            onChange={(value) => setForm((prev) => ({ ...prev, doctorId: value || '' }))}
            data={availableDoctorOptions}
            searchable
            clearable
            nothingFoundMessage="Nenhum médico encontrado para esta filial"
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
