import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Badge,
  Group,
  Modal,
  Paper,
  Progress,
  Skeleton,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, Circle, Clock3, Pencil, Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
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
import { useModalidadesAdminQuery } from '../../hooks/useModalidadesAdminQuery';
import { useEspecialidadesAdminQuery } from '../../hooks/useEspecialidadesAdminQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
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
  workingDays: string[];
  workingHoursStart?: string | null;
  workingHoursEnd?: string | null;
  doctorIds?: string[];
  doctorNames?: string[];
  modalidadeId?: string | null;
  especialidadeId?: string | null;
  capacity?: number | null;
}

interface DoctorOption {
  value: string;
  label: string;
  branchId: string;
  roomIds: string[];
}

type RoomMapStatus = 'EM_USO' | 'ALTA_DEMANDA' | 'MODERADA' | 'LIVRE';

interface RoomMapItem {
  roomId: string;
  roomName: string;
  status: RoomMapStatus;
  utilizationPercent: number;
  inProgressNow: number;
  upcomingToday: number;
  totalToday: number;
  doneToday: number;
  noShowOrCanceledToday: number;
}

const isCanceledOrNoShow = (statusRaw?: string | null) => {
  const normalized = String(statusRaw || '').trim().toUpperCase();
  return normalized === 'CANCELADO'
    || normalized === 'CANCELED'
    || normalized === 'NAO_COMPARECEU'
    || normalized === 'NÃO_COMPARECEU'
    || normalized === 'NO_SHOW'
    || normalized === 'NO-SHOW'
    || normalized === 'AUSENTE'
    || normalized === 'FALTOU';
};

const isDoneStatus = (statusRaw?: string | null) => {
  const normalized = String(statusRaw || '').trim().toUpperCase();
  return normalized === 'CONCLUIDO'
    || normalized === 'CONCLUÍDO'
    || normalized === 'COMPLETED'
    || normalized === 'REALIZADO'
    || normalized === 'FINALIZADO'
    || normalized === 'DONE';
};

const ACTIVE_CONSULTATION_QUEUES = new Set([
  'EM ATENDIMENTO',
  'EM TRIAGEM',
  'CHAMADO PARA EXAME',
  'EM EXAME',
]);

const getRoomMapStatusMeta = (status: RoomMapStatus) => {
  if (status === 'EM_USO') return { label: 'Em uso agora', color: 'teal' as const };
  if (status === 'ALTA_DEMANDA') return { label: 'Alta demanda', color: 'orange' as const };
  if (status === 'MODERADA') return { label: 'Fluxo moderado', color: 'blue' as const };
  return { label: 'Livre', color: 'gray' as const };
};

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
  const [activeView, setActiveView] = useState<'cadastro' | 'mapa'>('cadastro');
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
  const appointmentsQuery = useAppointmentsQuery();
  const clinicalQueueQuery = useClinicalQueueQuery();
  const modalidadesQuery = useModalidadesAdminQuery();
  const especialidadesQuery = useEspecialidadesAdminQuery();

  const [form, setForm] = useState({
    name: '',
    description: '',
    branchId: '',
    doctorIds: [] as string[],
    workingDays: [] as string[],
    workingHoursStart: '',
    workingHoursEnd: '',
    modalidadeId: '' as string,
    especialidadeId: '' as string,
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

  const especialidadeByModalidadeId = useMemo(() => {
    const map = new Map<string, any>();
    especialidadeList.forEach((e: any) => map.set(e.modalidadeId, e));
    return map;
  }, [especialidadeList]);

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

  const roomMapItems = useMemo<RoomMapItem[]>(() => {
    const todayKey = dayjs().format('YYYY-MM-DD');
    const now = dayjs();
    const appointments = Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : [];
    const queueRows = Array.isArray(clinicalQueueQuery.data) ? clinicalQueueQuery.data : [];

    const appointmentById = appointments.reduce<Record<string, any>>((acc, appt: any) => {
      const id = String(appt?.id || '').trim();
      if (id) acc[id] = appt;
      return acc;
    }, {});

    const inProgressByRoomId = queueRows.reduce<Record<string, number>>((acc, row: any) => {
      const queue = String(row?.queue || '').trim().toUpperCase();
      if (!ACTIVE_CONSULTATION_QUEUES.has(queue)) return acc;
      const appointmentId = String(row?.appointmentId || row?.appointment_id || row?.appointment?.id || '').trim();
      const linkedAppointment = appointmentId ? appointmentById[appointmentId] : null;
      const roomId = String(linkedAppointment?.roomId || linkedAppointment?.room_id || '').trim();
      if (!roomId) return acc;
      acc[roomId] = (acc[roomId] || 0) + 1;
      return acc;
    }, {});

    const roomStatsById = appointments.reduce<Record<string, {
      totalToday: number;
      upcomingToday: number;
      doneToday: number;
      noShowOrCanceledToday: number;
    }>>((acc, appt: any) => {
      const roomId = String(appt?.roomId || appt?.room_id || '').trim();
      const rawDate = String(appt?.date || appt?.data || '').trim();
      if (!roomId || !rawDate) return acc;

      const date = dayjs(rawDate).isValid() ? dayjs(rawDate).format('YYYY-MM-DD') : rawDate;
      if (date !== todayKey) return acc;

      const statusRaw = String(appt?.status || '').trim();
      const canceledOrNoShow = isCanceledOrNoShow(statusRaw);
      const done = isDoneStatus(statusRaw);

      const scheduledAt = dayjs(`${date}T${String(appt?.time || appt?.hora || '00:00').trim()}`);
      const upcoming = !canceledOrNoShow && scheduledAt.isValid() && scheduledAt.isAfter(now);

      if (!acc[roomId]) {
        acc[roomId] = {
          totalToday: 0,
          upcomingToday: 0,
          doneToday: 0,
          noShowOrCanceledToday: 0,
        };
      }

      if (!canceledOrNoShow) acc[roomId].totalToday += 1;
      if (upcoming) acc[roomId].upcomingToday += 1;
      if (done) acc[roomId].doneToday += 1;
      if (canceledOrNoShow) acc[roomId].noShowOrCanceledToday += 1;
      return acc;
    }, {});

    return displayItems
      .map((room) => {
        const roomId = room.id;
        const stats = roomStatsById[roomId] || {
          totalToday: 0,
          upcomingToday: 0,
          doneToday: 0,
          noShowOrCanceledToday: 0,
        };
        const inProgressNow = inProgressByRoomId[roomId] || 0;
        const doneOrInProgress = stats.doneToday + inProgressNow;
        const utilizationPercent = stats.totalToday > 0
          ? Math.max(0, Math.min(100, Math.round((doneOrInProgress / stats.totalToday) * 100)))
          : 0;

        const status: RoomMapStatus =
          inProgressNow > 0
            ? 'EM_USO'
            : stats.upcomingToday >= 4
              ? 'ALTA_DEMANDA'
              : stats.totalToday > 0
                ? 'MODERADA'
                : 'LIVRE';

        return {
          roomId,
          roomName: room.name,
          status,
          utilizationPercent,
          inProgressNow,
          upcomingToday: stats.upcomingToday,
          totalToday: stats.totalToday,
          doneToday: stats.doneToday,
          noShowOrCanceledToday: stats.noShowOrCanceledToday,
        };
      })
      .sort((a, b) => {
        if (b.inProgressNow !== a.inProgressNow) return b.inProgressNow - a.inProgressNow;
        if (b.upcomingToday !== a.upcomingToday) return b.upcomingToday - a.upcomingToday;
        return a.roomName.localeCompare(b.roomName, 'pt-BR');
      });
  }, [appointmentsQuery.data, clinicalQueueQuery.data, displayItems]);

  const roomMapSummary = useMemo(() => {
    return roomMapItems.reduce((acc, item) => {
      if (item.status === 'EM_USO') acc.inUse += 1;
      if (item.status === 'ALTA_DEMANDA') acc.highDemand += 1;
      if (item.status === 'MODERADA') acc.moderate += 1;
      if (item.status === 'LIVRE') acc.free += 1;
      return acc;
    }, { inUse: 0, highDemand: 0, moderate: 0, free: 0 });
  }, [roomMapItems]);

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
        workingHoursStart: sector.workingHoursStart || null,
        workingHoursEnd: sector.workingHoursEnd || null,
        doctorIds: [],
        doctorNames: [],
        modalidadeId: sector.modalidadeId || null,
        especialidadeId: sector.especialidadeId || null,
        capacity: sector.capacity ?? null,
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
        workingDays: Array.isArray(item.workingDays) ? item.workingDays : [],
        workingHoursStart: String(item.workingHoursStart || ''),
        workingHoursEnd: String(item.workingHoursEnd || ''),
        modalidadeId: item.modalidadeId || '',
        especialidadeId: item.especialidadeId || '',
        capacity: item.capacity != null ? String(item.capacity) : '',
      });
    } else {
      setEditingId(null);
      setForm({
        name: '',
        description: '',
        branchId: selectedBranchId || '',
        doctorIds: [],
        workingDays: [],
        workingHoursStart: '',
        workingHoursEnd: '',
        modalidadeId: '',
        especialidadeId: '',
        capacity: '',
      });
    }
    setModalOpen(true);
  };

  const handleModalidadeChange = (modalidadeId: string | null) => {
    const especialidade = modalidadeId ? especialidadeByModalidadeId.get(modalidadeId) : null;
    setForm((prev) => ({ ...prev, modalidadeId: modalidadeId || '', especialidadeId: especialidade?.id || '' }));
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
      if ((form.workingHoursStart && !form.workingHoursEnd) || (!form.workingHoursStart && form.workingHoursEnd)) {
        showNotification({
          title: 'Erro',
          message: 'Informe horário inicial e final do funcionamento da sala.',
          color: 'red',
        });
        setSaving(false);
        return;
      }
      if (form.workingHoursStart && form.workingHoursEnd && form.workingHoursEnd <= form.workingHoursStart) {
        showNotification({
          title: 'Erro',
          message: 'O horário final deve ser maior que o horário inicial.',
          color: 'red',
        });
        setSaving(false);
        return;
      }

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
        workingHoursStart: form.workingHoursStart || null,
        workingHoursEnd: form.workingHoursEnd || null,
        modalidadeId: form.modalidadeId || null,
        especialidadeId: form.especialidadeId || null,
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
            modalidadeId: payload.modalidadeId,
            especialidadeId: payload.especialidadeId,
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
        doctorIds: [],
        workingDays: [],
        workingHoursStart: '',
        workingHoursEnd: '',
        modalidadeId: '',
        especialidadeId: '',
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
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
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

          {activeView === 'cadastro' ? (
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
          ) : <div />}
        </Group>

        <Group mb={isMobile ? 12 : 18} grow align="flex-end">
          <FloatingSelect
            label="Filial"
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            data={branches.map((branch) => ({ value: branch.id, label: branch.label }))}
            disabled={loadingBranches}
            searchable
            nothingFoundMessage="Nenhuma filial encontrada"
          />
        </Group>
        <Tabs value={activeView} onChange={(value) => setActiveView((value as 'cadastro' | 'mapa') || 'cadastro')} keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="cadastro">Cadastro de salas</Tabs.Tab>
            <Tabs.Tab value="mapa">Mapa de salas</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="cadastro">
            <Group mb={isMobile ? 16 : 24} grow align="flex-end">
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
          </Tabs.Panel>

          <Tabs.Panel value="mapa">
            <Paper withBorder radius="lg" p={isMobile ? 'md' : 'lg'}>
              <Group justify="space-between" align="center" mb="sm">
                <Box>
                  <Text fw={700} size={isMobile ? 'md' : 'lg'}>Mapa de Salas</Text>
                  <Text size="sm" c="dimmed">Visualização em tempo real da ocupação por sala</Text>
                </Box>
                <Group gap={6} align="center">
                  <Clock3 size={14} />
                  <Text size="xs" c="dimmed">Atualizado às {dayjs().format('HH:mm')}</Text>
                </Group>
              </Group>

              <Group gap={8} mb="md">
                <Badge variant="light" color="teal">Em uso: {roomMapSummary.inUse}</Badge>
                <Badge variant="light" color="orange">Alta demanda: {roomMapSummary.highDemand}</Badge>
                <Badge variant="light" color="blue">Fluxo moderado: {roomMapSummary.moderate}</Badge>
                <Badge variant="light" color="gray">Livres: {roomMapSummary.free}</Badge>
              </Group>

              {(appointmentsQuery.isLoading || clinicalQueueQuery.isLoading) ? (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="sm">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Paper key={idx} withBorder radius="md" p="md">
                      <Stack gap={8}>
                        <Skeleton height={18} width="60%" radius="sm" />
                        <Skeleton height={12} width="45%" radius="sm" />
                        <Skeleton height={8} width="100%" radius="sm" />
                        <Skeleton height={12} width="75%" radius="sm" />
                      </Stack>
                    </Paper>
                  ))}
                </SimpleGrid>
              ) : roomMapItems.length === 0 ? (
                <Alert color="gray" variant="light" title="Sem salas para exibir">
                  Cadastre salas nesta filial para habilitar o mapa de utilização.
                </Alert>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="sm">
                  {roomMapItems.map((roomMap) => {
                    const statusMeta = getRoomMapStatusMeta(roomMap.status);
                    return (
                      <Paper
                        key={roomMap.roomId}
                        withBorder
                        radius="md"
                        p="sm"
                        style={{
                          boxShadow: roomMap.status === 'EM_USO'
                            ? '0 8px 20px rgba(18,184,134,0.16)'
                            : '0 6px 14px rgba(15,23,42,0.08)',
                          background: roomMap.status === 'EM_USO'
                            ? 'linear-gradient(135deg, rgba(18,184,134,0.14), rgba(34,139,230,0.08))'
                            : roomMap.status === 'ALTA_DEMANDA'
                              ? 'linear-gradient(135deg, rgba(253,126,20,0.14), rgba(255,212,59,0.08))'
                              : 'var(--mantine-color-body)',
                        }}
                      >
                        <Group justify="space-between" align="flex-start" mb={6}>
                          <Box style={{ minWidth: 0 }}>
                            <Text fw={700} size="sm" lineClamp={1}>{roomMap.roomName}</Text>
                            <Group gap={6} align="center">
                              <Circle size={8} fill="currentColor" color={`var(--mantine-color-${statusMeta.color}-6)`} />
                              <Text size="xs" c="dimmed">{statusMeta.label}</Text>
                            </Group>
                          </Box>
                          <Badge variant="light" color={statusMeta.color}>{roomMap.utilizationPercent}%</Badge>
                        </Group>
                        <Progress value={roomMap.utilizationPercent} color={statusMeta.color} radius="xl" mb={8} />
                        <SimpleGrid cols={2} spacing={8}>
                          <Box>
                            <Text size="10px" c="dimmed">Agora</Text>
                            <Text fw={700} size="sm">{roomMap.inProgressNow}</Text>
                          </Box>
                          <Box>
                            <Text size="10px" c="dimmed">Próximos</Text>
                            <Text fw={700} size="sm">{roomMap.upcomingToday}</Text>
                          </Box>
                          <Box>
                            <Text size="10px" c="dimmed">Agenda</Text>
                            <Text fw={700} size="sm">{roomMap.totalToday}</Text>
                          </Box>
                          <Box>
                            <Text size="10px" c="dimmed">Concluídos</Text>
                            <Text fw={700} size="sm">{roomMap.doneToday}</Text>
                          </Box>
                        </SimpleGrid>
                      </Paper>
                    );
                  })}
                </SimpleGrid>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
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
          <Group grow>
            <FloatingSelect
              label="Modalidade"
              placeholder="Selecione a modalidade"
              value={form.modalidadeId || null}
              onChange={handleModalidadeChange}
              data={modalidadeOptions}
              searchable
              clearable
              nothingFoundMessage="Nenhuma modalidade encontrada"
            />
            <FloatingInput
              label="Especialidade"
              value={(form.modalidadeId ? especialidadeByModalidadeId.get(form.modalidadeId) : null)?.name || ''}
              disabled
              containerProps={{ opacity: 0.7 }}
              placeholder={form.modalidadeId ? 'Modalidade sem especialidade cadastrada' : 'Selecione uma modalidade'}
            />
          </Group>
          <FloatingInput
            label="Capacidade de slots"
            type="number"
            placeholder="Ex.: 1"
            value={form.capacity}
            onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, capacity: value })); }}
          />
          <FloatingMultiSelect
            label="Dias de funcionamento"
            value={form.workingDays}
            onChange={(values) => setForm((prev) => ({ ...prev, workingDays: values }))}
            data={WEEKDAY_OPTIONS}
            searchable
            clearable
            nothingFoundMessage="Nenhum dia encontrado"
          />
          <Group grow>
            <FloatingInput
              label="Início do funcionamento"
              type="time"
              value={form.workingHoursStart}
              onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, workingHoursStart: value })); }}
            />
            <FloatingInput
              label="Fim do funcionamento"
              type="time"
              value={form.workingHoursEnd}
              onChange={(e) => { const value = e.currentTarget.value; setForm((prev) => ({ ...prev, workingHoursEnd: value })); }}
            />
          </Group>
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


