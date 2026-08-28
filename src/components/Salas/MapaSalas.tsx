import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Badge, Box, Button, Group, Paper, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { useTeaWeeklyAgendaQuery, type TeaAgendaItem } from '../../hooks/useTeaWeeklyAgendaQuery';
import { useRoomsAdminQuery } from '../../hooks/useRoomsAdminQuery';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { isRoomSector } from '../../utils/sectorClassification';

const SLOTS = Array.from({ length: 16 }, (_, index) => {
  const minutes = 8 * 60 + index * 45;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const STATUS_META = {
  available: { label: 'Disponível', color: 'var(--mantine-color-body)', border: 'var(--mantine-color-default-border)' },
  occupied: { label: 'Ocupado', color: 'rgba(72, 187, 155, 0.28)', border: 'rgba(72, 187, 155, 0.7)' },
  blocked: { label: 'Bloqueado', color: 'rgba(240, 153, 123, 0.3)', border: 'rgba(240, 153, 123, 0.7)' },
} as const;
const toWeekStartMonday = (value: dayjs.Dayjs) => value.subtract((value.day() + 6) % 7, 'day').startOf('day');
const normalizeList = (data: any): any[] => Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : []));
type SlotStatus = keyof typeof STATUS_META;

function StatCard({ label, value, detail, highlight = false }: { label: string; value: number; detail: string; highlight?: boolean }) {
  return <Paper withBorder radius="md" p="sm" style={{ borderColor: highlight ? 'rgba(72, 187, 155, 0.6)' : 'var(--mantine-color-default-border)', background: highlight ? 'rgba(72, 187, 155, 0.12)' : 'var(--mantine-color-body)' }}><Text size="xl" fw={700}>{value}</Text><Text size="sm" fw={600}>{label}</Text><Text size="xs" c="dimmed">{detail}</Text></Paper>;
}

export function MapaSalas({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { data: allAppointments = [], isLoading: loading, error } = useTeaWeeklyAgendaQuery();
  const roomsQuery = useRoomsAdminQuery();
  const [view, setView] = useState<'day' | 'week'>('week');
  const [selectedDate, setSelectedDate] = useState(() => dayjs().startOf('day'));
  const [weekStart, setWeekStart] = useState(() => toWeekStartMonday(dayjs()));
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<string[]>([]);
  const [roomFilter, setRoomFilter] = useState<string[]>([]);
  const [unitFilter, setUnitFilter] = useState<string[]>([]);

  const mockAppointments = useMemo<TeaAgendaItem[]>(() => {
    const rooms = [
      'Sala 1 (Unidade Central)',
      'Sala 2 (Unidade Central)',
      'Sala 3 (Unidade Central)',
      'Sala 4 (Unidade Central)',
      'Sala 1 (Unidade Jardins)',
      'Sala 2 (Unidade Jardins)',
      'Sala 3 (Unidade Jardins)',
      'Sala 4 (Unidade Jardins)',
    ];
    const entries = [
      [0, 0, '08:00', 'Psicologia', 'Camila Duarte'],
      [0, 1, '09:30', 'Fonoaudiologia', 'Rafael Nogueira'],
      [1, 2, '10:15', 'Terapia ocupacional', 'Beatriz Alves'],
      [2, 0, '14:00', 'Psicologia', 'Camila Duarte'],
      [2, 3, '15:30', 'Fisioterapia', 'Thiago Prado'],
      [0, 4, '08:45', 'Fisioterapia', 'Marina Lopes'],
      [1, 5, '11:00', 'Fonoaudiologia', 'Rafael Nogueira'],
      [2, 6, '13:15', 'Psicologia', 'Camila Duarte'],
      [3, 1, '11:00', 'Fonoaudiologia', 'Rafael Nogueira'],
      [3, 7, '15:30', 'Terapia ocupacional', 'Beatriz Alves'],
      [4, 2, '16:15', 'Terapia ocupacional', 'Beatriz Alves'],
      [4, 5, '10:15', 'Fonoaudiologia', 'Rafael Nogueira'],
      [4, 3, '09:30', 'Fisioterapia', 'Thiago Prado'],
    ] as const;
    return entries.map(([dayOffset, roomIndex, time, specialty, doctorName], index) => ({
      id: `mock-tea-${index}`,
      patientName: `Paciente demonstrativo ${index + 1}`,
      doctorName,
      specialty,
      roomName: rooms[roomIndex],
      date: weekStart.add(dayOffset, 'day').format('YYYY-MM-DD'),
      time,
      type: 'RESERVA TEA',
      status: index % 3 === 0 ? 'AUTHORIZED' : 'RESERVED',
      source: 'RESERVATION',
    }));
  }, [weekStart]);
  const usingMockData = allAppointments.length === 0 && !loading;
  const agendaAppointments = usingMockData ? mockAppointments : allAppointments;
  const mockBlockedSlots = useMemo(() => new Set([
    [0, 0, '09:30'],
    [0, 3, '13:15'],
    [1, 1, '08:45'],
    [1, 6, '14:00'],
    [2, 2, '11:00'],
    [3, 4, '16:15'],
    [4, 7, '10:15'],
    [5, 5, '15:30'],
  ].map(([dayOffset, roomIndex, time]) => `${weekStart.add(Number(dayOffset), 'day').format('YYYY-MM-DD')}|${time}|${roomIndex}`)), [weekStart]);

  const roomRecords = useMemo(() => normalizeList(roomsQuery.data).filter(isRoomSector), [roomsQuery.data]);
  const roomSubtitleByName = useMemo(() => {
    const subtitles = new Map<string, string>();
    roomRecords.forEach((room: any) => {
      const description = String(room?.description || '')
        .replace(/^\[SALA\]\s*/i, '')
        .replace(/^__ROOM__[:|]?\s*/i, '')
        .trim();
      subtitles.set(String(room.name), description || 'Sala de atendimento');
    });
    return subtitles;
  }, [roomRecords]);
  const roomNames = useMemo(() => {
    const names = new Set<string>();
    roomRecords.forEach((room: any) => { if (room?.name) names.add(String(room.name)); });
    agendaAppointments.forEach((item) => { if (item.roomName) names.add(item.roomName); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [agendaAppointments, roomRecords]);
  const getUnitName = (roomName: string) => roomName.match(/\(([^)]+)\)$/)?.[1] || 'Unidade não informada';
  const filteredAppointments = useMemo(() => agendaAppointments.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [item.specialty, item.doctorName, item.roomName, item.time].some((value) => String(value || '').toLowerCase().includes(query));
    return matchesSearch
      && (specialtyFilter.length === 0 || specialtyFilter.includes(item.specialty))
      && (doctorFilter.length === 0 || doctorFilter.includes(item.doctorName))
      && (roomFilter.length === 0 || roomFilter.includes(item.roomName))
      && (unitFilter.length === 0 || unitFilter.includes(getUnitName(item.roomName)));
  }), [agendaAppointments, doctorFilter, roomFilter, search, specialtyFilter, unitFilter]);
  const specialties = useMemo(() => Array.from(new Set(agendaAppointments.map((item) => item.specialty).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [agendaAppointments]);
  const doctors = useMemo(() => Array.from(new Set(agendaAppointments.map((item) => item.doctorName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [agendaAppointments]);
  const units = useMemo(() => Array.from(new Set(roomNames.map(getUnitName))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [roomNames]);
  const visibleRooms = useMemo(() => roomNames.filter((name) => roomFilter.length === 0 || roomFilter.includes(name)), [roomFilter, roomNames]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => weekStart.add(index, 'day')), [weekStart]);
  const appointmentBySlot = useMemo(() => {
    const map = new Map<string, TeaAgendaItem>();
    filteredAppointments.forEach((item) => map.set(`${item.date}|${item.time}|${item.roomName}`, item));
    return map;
  }, [filteredAppointments]);
  const getSlot = (date: dayjs.Dayjs, time: string, roomName: string) => {
    const item = appointmentBySlot.get(`${date.format('YYYY-MM-DD')}|${time}|${roomName}`);
    const roomIndex = roomNames.indexOf(roomName);
    const blocked = usingMockData && mockBlockedSlots.has(`${date.format('YYYY-MM-DD')}|${time}|${roomIndex}`);
    return { item, blocked: !item && blocked };
  };
  const stats = useMemo(() => {
    const dates = view === 'day' ? [selectedDate] : weekDays;
    const total = dates.length * visibleRooms.length * SLOTS.length;
    let occupied = 0;
    let blocked = 0;
    dates.forEach((date) => visibleRooms.forEach((room) => SLOTS.forEach((time) => {
      const slot = getSlot(date, time, room);
      if (slot.item) occupied += 1;
      else if (slot.blocked) blocked += 1;
    })));
    return { total, occupied, blocked, available: Math.max(0, total - occupied - blocked) };
  }, [appointmentBySlot, mockBlockedSlots, roomNames, selectedDate, usingMockData, view, visibleRooms, weekDays]);

  useEffect(() => { dayjs.locale('pt-br'); }, []);
  useEffect(() => { if (error) showNotification({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao carregar mapa de salas'), color: 'red' }); }, [error]);
  const moveDay = (amount: number) => { let next = selectedDate.add(amount, 'day'); while (next.day() === 0 || next.day() === 6) next = next.add(amount >= 0 ? 1 : -1, 'day'); setSelectedDate(next); setWeekStart(toWeekStartMonday(next)); };
  const renderCell = (date: dayjs.Dayjs, time: string, roomName: string, compact = false) => {
    const { item, blocked } = getSlot(date, time, roomName);
    const status: SlotStatus = item ? 'occupied' : blocked ? 'blocked' : 'available';
    const meta = STATUS_META[status];
    const tooltipContent = (item || blocked) ? (
      <Box p={2} style={{ minWidth: 220 }}>
        <Group justify="space-between" gap="sm" mb={6} wrap="nowrap">
          <Text size="sm" fw={700}>{item ? 'Horário ocupado' : 'Horário bloqueado'}</Text>
          <Badge size="sm" variant="light" color={item ? 'teal' : 'orange'}>{time}</Badge>
        </Group>
        <Text size="xs" c="dimmed" mb={4}>{roomName}</Text>
        {item ? (
          <Stack gap={3}>
            <Text size="sm" fw={600}>{item.specialty || 'Procedimento não informado'}</Text>
            <Text size="xs">Terapeuta: {item.doctorName || 'Não informado'}</Text>
            <Text size="xs" c="dimmed">Status: {item.status === 'AUTHORIZED' ? 'Autorizado' : 'Reservado'}</Text>
          </Stack>
        ) : (
          <Stack gap={3}>
            <Text size="sm" fw={600}>Indisponível para agendamento</Text>
            <Text size="xs" c="dimmed">Manutenção ou reserva interna da sala.</Text>
          </Stack>
        )}
      </Box>
    ) : null;
    return <Tooltip key={`${date.format('YYYY-MM-DD')}-${time}-${roomName}`} label={tooltipContent} disabled={!tooltipContent} withArrow position="top" offset={8} openDelay={180} multiline styles={{ tooltip: { background: 'var(--mantine-color-dark-7)', color: 'var(--mantine-color-white)', border: '1px solid var(--mantine-color-default-border)', boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)', padding: 12 }, arrow: { background: 'var(--mantine-color-dark-7)', borderColor: 'var(--mantine-color-default-border)' } }}><Box style={{ minHeight: compact ? 28 : 42, padding: compact ? 3 : 6, border: `1px solid ${meta.border}`, borderRadius: 6, background: meta.color, color: status === 'available' ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-text)', fontSize: compact ? 10 : 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>{compact ? (item ? 'Ocupado' : blocked ? 'Bloqueado' : 'Livre') : meta.label}</Box></Tooltip>;
  };

  return <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
    {!embedded && <Header />}
    <Box p={embedded ? 0 : isMobile ? 'sm' : 'xl'} maw={embedded ? 'none' : 1500} mx={embedded ? 0 : 'auto'} w="100%">
      <Group mb="lg" gap="md" align="flex-start" style={{ display: embedded ? 'none' : undefined }}><ActionIcon variant="default" size={isMobile ? 44 : 52} radius="md" onClick={() => navigate('/cadastro-sala')} aria-label="Voltar"><ChevronLeft size={22} /></ActionIcon><Box><Group gap="xs"><Text fw={700} size="lg">Mapa de salas</Text>{usingMockData && <Badge size="sm" variant="light" color="yellow">Dados demonstrativos</Badge>}</Group><Text size="sm" c="dimmed">Capacidade e oferta da agenda de terapias</Text></Box></Group>
      <Paper p={isMobile ? 'sm' : 'md'} withBorder radius="md"><Stack gap="md">
        <Group justify="flex-end" align="center" wrap="wrap"><Group gap={6}><Button size="xs" variant={view === 'day' ? 'filled' : 'default'} onClick={() => setView('day')}>Dia</Button><Button size="xs" variant={view === 'week' ? 'filled' : 'default'} onClick={() => setView('week')}>Semana</Button></Group></Group>
        <Group grow align="flex-start" wrap="wrap"><FloatingMultiSelect label="Unidade" placeholder="Todas" data={units.map((value) => ({ value, label: value }))} value={unitFilter} onChange={setUnitFilter} searchable clearable /><FloatingMultiSelect label="Especialidade" placeholder="Todas" data={specialties.map((value) => ({ value, label: value }))} value={specialtyFilter} onChange={setSpecialtyFilter} searchable clearable /><FloatingMultiSelect label="Sala" placeholder="Todas" data={roomNames.map((value) => ({ value, label: value }))} value={roomFilter} onChange={setRoomFilter} searchable clearable /><FloatingMultiSelect label="Terapeuta" placeholder="Todos" data={doctors.map((value) => ({ value, label: value }))} value={doctorFilter} onChange={setDoctorFilter} searchable clearable /></Group>
        <Group justify="space-between" align="center" wrap="wrap"><Group gap="xs">{view === 'day' ? <><Button size="xs" variant="default" leftSection={<ChevronLeft size={14} />} onClick={() => moveDay(-1)}>Dia anterior</Button><Button size="xs" variant="light" onClick={() => { const today = dayjs().startOf('day'); setSelectedDate(today); setWeekStart(toWeekStartMonday(today)); }}>Hoje</Button><Button size="xs" variant="default" rightSection={<ChevronRight size={14} />} onClick={() => moveDay(1)}>Próximo dia</Button></> : <><Button size="xs" variant="default" leftSection={<ChevronLeft size={14} />} onClick={() => setWeekStart((current) => current.subtract(7, 'day'))}>Semana anterior</Button><Button size="xs" variant="light" onClick={() => setWeekStart(toWeekStartMonday(dayjs()))}>Hoje</Button><Button size="xs" variant="default" rightSection={<ChevronRight size={14} />} onClick={() => setWeekStart((current) => current.add(7, 'day'))}>Próxima semana</Button></>}</Group><Group gap="xs" align="center"><FloatingInput label={null} placeholder="Buscar por sala, especialidade, terapeuta ou horário" value={search} onChange={(event) => setSearch(event.currentTarget.value)} rightSection={<Search size={14} />} /><Text size="sm" c="dimmed">{view === 'day' ? selectedDate.format('dddd, DD [de] MMMM [de] YYYY') : `${weekStart.format('DD/MM/YYYY')} até ${weekStart.add(6, 'day').format('DD/MM/YYYY')}`}</Text></Group></Group>
        <Box style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))', gap: 10 }}><StatCard label="Capacidade total" value={stats.total} detail="horários possíveis" /><StatCard label="Ofertado" value={stats.total} detail="100% da capacidade" /><StatCard label="Ocupado" value={stats.occupied} detail={`${stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0}% do ofertado`} highlight /><StatCard label="Disponível" value={stats.available} detail={`${stats.total ? Math.round((stats.available / stats.total) * 100) : 0}% do ofertado`} /><StatCard label="Bloqueado" value={stats.blocked} detail="manutenção ou reserva interna" /></Box>
        <Group gap="lg" mb={-4}>{(['available', 'occupied', 'blocked'] as SlotStatus[]).map((status) => <Group key={status} gap={6}><Box w={12} h={12} style={{ borderRadius: 3, background: STATUS_META[status].color, border: `1px solid ${STATUS_META[status].border}` }} /><Text size="xs" c="dimmed">{STATUS_META[status].label}</Text></Group>)}</Group>
        {loading ? <Box style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>{Array.from({ length: 4 }).map((_, index) => <Paper key={index} withBorder p="md"><Stack gap="sm"><Skeleton height={20} /><Skeleton height={180} /></Stack></Paper>)}</Box> : view === 'day' ? <Box style={{ overflowX: 'auto' }}>
          <Paper withBorder radius="md" p="xs" style={{ minWidth: Math.max(700, visibleRooms.length * 190 + 100) }}>
            <Box style={{ display: 'grid', gridTemplateColumns: `82px repeat(${Math.max(visibleRooms.length, 1)}, minmax(160px, 1fr))`, gap: 6, marginBottom: 8 }}>
              <Paper withBorder radius="sm" p="xs" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
                <Text size="xs" fw={700} c="dimmed">Horário</Text>
                <Text size="xs" c="dimmed">{selectedDate.format('DD/MM')}</Text>
              </Paper>
              {visibleRooms.length
                ? visibleRooms.map((room) => (
                  <Paper key={room} withBorder radius="sm" p="xs" style={{ borderColor: 'var(--mantine-color-indigo-5)', background: 'rgba(59, 130, 246, 0.08)' }}>
                    <Tooltip label={room} withArrow openDelay={180} multiline styles={{ tooltip: { background: 'var(--mantine-color-dark-7)', color: 'var(--mantine-color-white)', border: '1px solid var(--mantine-color-default-border)', boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)' }, arrow: { background: 'var(--mantine-color-dark-7)', borderColor: 'var(--mantine-color-default-border)' } }}>
                      <Text size="sm" fw={700} lineClamp={1}>{room}</Text>
                    </Tooltip>
                    <Text size="xs" c="dimmed" lineClamp={1}>{roomSubtitleByName.get(room) || 'Sala de atendimento'}</Text>
                  </Paper>
                ))
                : <Paper withBorder p="xs"><Text size="sm" c="dimmed">Nenhuma sala encontrada</Text></Paper>}
            </Box>
            {SLOTS.map((time) => (
              <Box key={time} style={{ display: 'grid', gridTemplateColumns: `82px repeat(${Math.max(visibleRooms.length, 1)}, minmax(160px, 1fr))`, gap: 6, marginBottom: 6 }}>
                <Box style={{ display: 'flex', alignItems: 'center', padding: 6, borderRight: '1px solid var(--mantine-color-default-border)' }}>
                  <Text size="xs" c="dimmed" fw={600}>{time}</Text>
                </Box>
                {visibleRooms.length ? visibleRooms.map((room) => renderCell(selectedDate, time, room)) : <Box />}
              </Box>
            ))}
          </Paper>
        </Box> : <Box style={{ overflowX: 'auto' }}>
          <Box style={{ minWidth: Math.max(1120, 62 + weekDays.length * (Math.max(visibleRooms.length, 1) * 112 + 18)) }}>
            <Box style={{ display: 'grid', gridTemplateColumns: `62px repeat(${weekDays.length}, minmax(${Math.max(visibleRooms.length, 1) * 112 + 18}px, 1fr))`, gap: 8, marginBottom: 8 }}>
              <Box />
              {weekDays.map((day) => (
                <Paper
                  key={day.format('YYYY-MM-DD')}
                  withBorder
                  radius="md"
                  p="xs"
                  style={{
                    borderColor: 'var(--mantine-color-indigo-5)',
                    background: 'rgba(59, 130, 246, 0.08)',
                  }}
                >
                  <Text size="sm" fw={700} ta="center">
                    {WEEKDAY_LABELS[day.day() === 0 ? 6 : day.day() - 1]} · {day.format('DD/MM')}
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    {visibleRooms.length} {visibleRooms.length === 1 ? 'sala' : 'salas'}
                  </Text>
                </Paper>
              ))}
            </Box>

            <Box style={{ display: 'grid', gridTemplateColumns: `62px repeat(${weekDays.length}, minmax(${Math.max(visibleRooms.length, 1) * 112 + 18}px, 1fr))`, gap: 8, marginBottom: 8 }}>
              <Box />
              {weekDays.map((day) => (
                <Box
                  key={`rooms-${day.format('YYYY-MM-DD')}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.max(visibleRooms.length, 1)}, minmax(100px, 1fr))`,
                    gap: 5,
                    padding: '0 6px 6px',
                    borderLeft: '1px solid var(--mantine-color-default-border)',
                    borderRight: '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  {(visibleRooms.length ? visibleRooms : ['Sem sala']).map((room) => (
                    <Tooltip key={`${day.format('YYYY-MM-DD')}-room-${room}`} label={room} withArrow openDelay={180} multiline styles={{ tooltip: { background: 'var(--mantine-color-dark-7)', color: 'var(--mantine-color-white)', border: '1px solid var(--mantine-color-default-border)', boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)' }, arrow: { background: 'var(--mantine-color-dark-7)', borderColor: 'var(--mantine-color-default-border)' } }}>
                      <Text size="xs" c="dimmed" ta="center" lineClamp={1}>{room}</Text>
                    </Tooltip>
                  ))}
                </Box>
              ))}
            </Box>

            {SLOTS.map((time) => (
              <Box
                key={time}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `62px repeat(${weekDays.length}, minmax(${Math.max(visibleRooms.length, 1) * 112 + 18}px, 1fr))`,
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Text size="xs" c="dimmed" p={6}>{time}</Text>
                {weekDays.map((day) => (
                  <Box
                    key={`${day.format('YYYY-MM-DD')}-${time}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${Math.max(visibleRooms.length, 1)}, minmax(100px, 1fr))`,
                      gap: 5,
                      padding: 5,
                      borderLeft: '1px solid var(--mantine-color-default-border)',
                      borderRight: '1px solid var(--mantine-color-default-border)',
                      borderBottom: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 5,
                      background: 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    {visibleRooms.length
                      ? visibleRooms.map((room) => renderCell(day, time, room, true))
                      : <Text size="xs" c="dimmed" ta="center">Nenhuma sala encontrada</Text>}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>}
      </Stack></Paper>
    </Box>
  </Box>;
}
