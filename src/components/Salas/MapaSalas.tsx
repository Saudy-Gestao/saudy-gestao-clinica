import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Badge, Box, Button, Divider, Group, Paper, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { useElementSize, useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { useTeaWeeklyAgendaQuery, type TeaAgendaItem } from '../../hooks/useTeaWeeklyAgendaQuery';
import { useAgendasAdminQuery } from '../../hooks/useAgendasAdminQuery';
import { useRoomsAdminQuery } from '../../hooks/useRoomsAdminQuery';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { isRoomSector } from '../../utils/sectorClassification';
import { resolveAgendaCardPresentation } from '../../utils/agendaCardDensity';

const SLOTS = Array.from({ length: 16 }, (_, index) => {
  const minutes = 8 * 60 + index * 45;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
const TIMELINE_START_MINUTE = 8 * 60;
const SLOT_DURATION_MINUTES = 45;
const TIMELINE_END_MINUTE = TIMELINE_START_MINUTE + SLOTS.length * SLOT_DURATION_MINUTES;
const timeToMinutes = (value: unknown) => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};
const minutesToTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const FIXED_TIMELINE_MARKERS = SLOTS.map(timeToMinutes).filter((minute): minute is number => minute !== null);
const getTimelineStep = (rowHeight: number, rowGap: number) => rowHeight + rowGap;
const getTimelineHeight = (rowHeight: number, rowGap: number) => SLOTS.length * getTimelineStep(rowHeight, rowGap);
const getTimelineOffset = (minute: number, rowHeight: number, rowGap: number) => {
  const timelineHeight = getTimelineHeight(rowHeight, rowGap);
  const elapsedMinutes = Math.max(0, Math.min(SLOTS.length * SLOT_DURATION_MINUTES, minute - TIMELINE_START_MINUTE));
  if (elapsedMinutes >= SLOTS.length * SLOT_DURATION_MINUTES) return timelineHeight;
  return (elapsedMinutes / SLOT_DURATION_MINUTES) * getTimelineStep(rowHeight, rowGap);
};
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const WEEKDAY_TOKENS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
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
  const { ref: scheduleRef, width: scheduleWidth } = useElementSize();
  const { data: allAppointments = [], isLoading: loading, error } = useTeaWeeklyAgendaQuery();
  const agendasQuery = useAgendasAdminQuery();
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
  const mockAgendaRecords = useMemo(() => {
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
    const specialties = ['Psicologia', 'Fonoaudiologia', 'Fisioterapia', 'Terapia ocupacional'];
    const doctors = ['Camila Duarte', 'Rafael Nogueira', 'Beatriz Alves', 'Thiago Prado', 'Marina Lopes'];
    const records: any[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      rooms.forEach((roomName, roomIndex) => {
        const morningStartIndex = (dayOffset + roomIndex) % 3;
        const morningSpan = 2 + ((dayOffset + roomIndex) % 3);
        const afternoonStartIndex = 8 + ((dayOffset * 2 + roomIndex) % 3);
        const afternoonSpan = 2 + ((dayOffset + roomIndex + 1) % 3);
        const blocks = [
          { startIndex: morningStartIndex, span: morningSpan, status: 'ATIVA' },
          { startIndex: afternoonStartIndex, span: afternoonSpan, status: (dayOffset + roomIndex) % 6 === 0 ? 'BLOQUEADA' : 'ATIVA' },
        ];

        blocks.forEach(({ startIndex, span, status }, blockIndex) => {
          records.push({
            id: `mock-room-agenda-${dayOffset}-${roomIndex}-${blockIndex}`,
            roomName,
            weekday: WEEKDAY_TOKENS[dayOffset],
            shiftStart: SLOTS[startIndex],
            shiftEnd: SLOTS[Math.min(startIndex + span, SLOTS.length - 1)],
            status,
            especialidade: { name: specialties[(dayOffset + roomIndex + blockIndex) % specialties.length] },
            doctor: { name: doctors[(roomIndex + blockIndex) % doctors.length] },
          });
        });
      });
    }

    return records;
  }, []);
  const usingMockData = import.meta.env.DEV && allAppointments.length === 0 && !loading;
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
  const roomIdByName = useMemo(() => {
    const map = new Map<string, string>();
    roomRecords.forEach((room: any) => {
      const branchName = String(room?.branch?.tradeName || room?.branch?.socialName || '').trim();
      const fullName = branchName ? `${room.name} (${branchName})` : String(room.name || '');
      const roomName = String(room?.name || '').trim();
      if (roomName) map.set(roomName, String(room.id));
      if (fullName) map.set(fullName, String(room.id));
    });
    return map;
  }, [roomRecords]);
  const agendas = useMemo(() => normalizeList(agendasQuery.data).filter((agenda: any) => (agenda?.roomId || agenda?.roomName) && agenda.status !== 'INATIVA'), [agendasQuery.data]);
  const agendaRecords = useMemo(() => {
    if (!usingMockData) return agendas;
    const existingKeys = new Set(agendas.map((agenda: any) => `${agenda.roomId || agenda.roomName}|${agenda.weekday}|${agenda.shiftStart}`));
    return [...agendas, ...mockAgendaRecords.filter((agenda: any) => !existingKeys.has(`${agenda.roomId || agenda.roomName}|${agenda.weekday}|${agenda.shiftStart}`))];
  }, [agendas, mockAgendaRecords, usingMockData]);
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
  const getMapCellWidth = () => {
    const roomCount = Math.max(visibleRooms.length, 1);

    if (view === 'day') {
      const gridWidth = Math.max(scheduleWidth, Math.max(700, roomCount * 190 + 100));
      return Math.max(40, (gridWidth - 82 - roomCount * 6) / roomCount);
    }

    const gridWidth = Math.max(
      scheduleWidth,
      Math.max(1120, 62 + weekDays.length * (roomCount * 112 + 18)),
    );
    const dayWidth = (gridWidth - 62 - weekDays.length * 8) / weekDays.length;
    return Math.max(40, (dayWidth - 12 - Math.max(0, roomCount - 1) * 5) / roomCount);
  };
  const appointmentBySlot = useMemo(() => {
    const map = new Map<string, TeaAgendaItem>();
    filteredAppointments.forEach((item) => map.set(`${item.date}|${item.time}|${item.roomName}`, item));
    return map;
  }, [filteredAppointments]);
  const getWeekdayToken = (date: dayjs.Dayjs) => WEEKDAY_TOKENS[date.day() === 0 ? 6 : date.day() - 1];
  const getAgendaForSlot = (date: dayjs.Dayjs, time: string, roomName: string) => {
    const roomId = roomIdByName.get(roomName);
    if (!roomId && !agendaRecords.some((agenda: any) => agenda.roomName === roomName)) return null;
    const weekday = getWeekdayToken(date);
    const minute = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    return agendaRecords.find((agenda: any) => {
      if (((agenda.roomId && String(agenda.roomId) !== roomId) || (agenda.roomName && agenda.roomName !== roomName)) || String(agenda.weekday || '').toLowerCase() !== weekday) return false;
      const start = String(agenda.shiftStart || '');
      const end = String(agenda.shiftEnd || '');
      const startMinute = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
      const endMinute = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5));
      const dateAllowed = (!agenda.startDate || date.isAfter(dayjs(agenda.startDate).subtract(1, 'day'), 'day'))
        && (!agenda.endDate || date.isBefore(dayjs(agenda.endDate).add(1, 'day'), 'day'));
      return dateAllowed && minute >= startMinute && minute < endMinute;
    }) || null;
  };
  const getAgendaBlocks = (date: dayjs.Dayjs, roomName: string) => {
    const roomId = roomIdByName.get(roomName);
    if (!roomId && !agendaRecords.some((agenda: any) => agenda.roomName === roomName)) return [];
    const weekday = getWeekdayToken(date);
    return agendaRecords.filter((agenda: any) => {
      if (((agenda.roomId && String(agenda.roomId) !== roomId) || (agenda.roomName && agenda.roomName !== roomName)) || String(agenda.weekday || '').toLowerCase() !== weekday) return false;
      return (!agenda.startDate || date.isAfter(dayjs(agenda.startDate).subtract(1, 'day'), 'day'))
        && (!agenda.endDate || date.isBefore(dayjs(agenda.endDate).add(1, 'day'), 'day'));
    }).map((agenda: any) => {
      const start = String(agenda.shiftStart || '');
      const end = String(agenda.shiftEnd || '');
      const startMinute = timeToMinutes(start);
      const endMinute = timeToMinutes(end);
      if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;
      return {
        agenda,
        startMinute: Math.max(TIMELINE_START_MINUTE, startMinute),
        endMinute: Math.min(TIMELINE_END_MINUTE, endMinute),
      };
    }).filter((block): block is { agenda: any; startMinute: number; endMinute: number } => Boolean(block && block.startMinute < block.endMinute));
  };
  const renderTimelineMarkers = (rowHeight: number, rowGap: number) => (
    <Box style={{ position: 'relative', height: getTimelineHeight(rowHeight, rowGap) }}>
      {FIXED_TIMELINE_MARKERS.map((minute) => <Box key={minute} style={{ position: 'absolute', top: getTimelineOffset(minute, rowHeight, rowGap) + 1, left: 0, right: 0, minHeight: 16, display: 'flex', alignItems: 'flex-start', padding: '0 6px', zIndex: 1 }}><Text size="xs" lh={1} c="dimmed" fw={600}>{minutesToTime(minute)}</Text></Box>)}
    </Box>
  );
  const getSlot = (date: dayjs.Dayjs, time: string, roomName: string) => {
    const item = appointmentBySlot.get(`${date.format('YYYY-MM-DD')}|${time}|${roomName}`);
    const agenda = getAgendaForSlot(date, time, roomName);
    const roomIndex = roomNames.indexOf(roomName);
    const blocked = usingMockData && mockBlockedSlots.has(`${date.format('YYYY-MM-DD')}|${time}|${roomIndex}`);
    return { item, agenda, blocked: !item && !agenda && blocked };
  };
  const stats = useMemo(() => {
    const dates = view === 'day' ? [selectedDate] : weekDays;
    const total = dates.length * visibleRooms.length * SLOTS.length;
    let occupied = 0;
    let blocked = 0;
    dates.forEach((date) => visibleRooms.forEach((room) => SLOTS.forEach((time) => {
      const slot = getSlot(date, time, room);
      if (slot.agenda?.status === 'BLOQUEADA') blocked += 1;
      else if (slot.agenda) occupied += 1;
    })));
    return { total, occupied, blocked, available: Math.max(0, total - occupied - blocked) };
  }, [appointmentBySlot, mockBlockedSlots, roomNames, selectedDate, usingMockData, view, visibleRooms, weekDays]);

  useEffect(() => { dayjs.locale('pt-br'); }, []);
  useEffect(() => { if (error) showNotification({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao carregar mapa de salas'), color: 'red' }); }, [error]);
  const moveDay = (amount: number) => { let next = selectedDate.add(amount, 'day'); while (next.day() === 0 || next.day() === 6) next = next.add(amount >= 0 ? 1 : -1, 'day'); setSelectedDate(next); setWeekStart(toWeekStartMonday(next)); };
  const renderAgendaBlock = (date: dayjs.Dayjs, roomName: string, block: { agenda: any; startMinute: number; endMinute: number }, compact = false, availableWidth = getMapCellWidth()) => {
    const agenda = block.agenda;
    const isBlocked = agenda.status === 'BLOQUEADA';
    const start = String(agenda.shiftStart || '');
    const end = String(agenda.shiftEnd || '');
    const presentation = resolveAgendaCardPresentation(availableWidth, 1, 'full');
    const detailLevel = presentation.hideContent || presentation.patientOnly ? 'minimal' : presentation.detailLevel;
    const showCardText = !presentation.hideContent;
    const content = <Box p={2} style={{ minWidth: 220 }}><Group justify="space-between" gap="sm" mb={6} wrap="nowrap"><Text size="sm" fw={700}>{isBlocked ? 'Agenda bloqueada' : 'Detalhes da agenda'}</Text>{detailLevel === 'minimal' && <Badge size="sm" variant="light" color={isBlocked ? 'orange' : 'teal'}>{start}–{end}</Badge>}</Group><Text size="xs" c="dimmed" mb={detailLevel === 'full' ? 0 : 6}>{roomName}</Text>{detailLevel !== 'full' && <Stack gap={3}>{detailLevel === 'minimal' && <Text size="sm" fw={600}>{agenda.especialidade?.name || 'Especialidade não informada'}</Text>}<Text size="xs">Profissional: {agenda.doctor?.name || 'Não informado'}</Text></Stack>}</Box>;
    const interval = `${start}–${end}`;
    return <Tooltip key={`${date.format('YYYY-MM-DD')}-${roomName}-${agenda.id || start}`} label={content} withArrow position="top" offset={8} openDelay={180} multiline styles={{ tooltip: { background: 'var(--mantine-color-dark-7)', color: 'var(--mantine-color-white)', border: '1px solid var(--mantine-color-default-border)', boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)', padding: 12 }, arrow: { background: 'var(--mantine-color-dark-7)', borderColor: 'var(--mantine-color-default-border)' } }}><Box style={{ height: '100%', minHeight: compact ? 28 : 42, padding: detailLevel === 'minimal' ? 4 : 8, border: `1px solid ${isBlocked ? STATUS_META.blocked.border : STATUS_META.occupied.border}`, borderRadius: 8, background: isBlocked ? STATUS_META.blocked.color : 'rgba(72, 187, 155, 0.34)', color: 'var(--mantine-color-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: compact ? 10 : 12, fontWeight: 600, overflow: 'hidden', gap: detailLevel === 'full' ? 4 : 2 }}>
      {showCardText && detailLevel === 'full' && <Text size="sm" fw={700} truncate w="100%">{agenda.doctor?.name || 'Agenda da sala'}</Text>}
      {showCardText && detailLevel !== 'minimal' && <Text size="xs" c="dimmed" truncate w="100%">{isBlocked ? 'Bloqueado' : agenda.especialidade?.name || 'Agenda da sala'}</Text>}
      {showCardText && <Text size={detailLevel === 'minimal' ? 'xs' : 'sm'} fw={700}>{interval}</Text>}
    </Box></Tooltip>;
  };
  const renderRoomTimeline = (date: dayjs.Dayjs, roomName: string, compact = false) => {
    const rowHeight = compact ? 40 : 42;
    const rowGap = 6;
    const blocks = getAgendaBlocks(date, roomName).sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);
    const lanes: number[] = [];
    const positionedBlocks = blocks.map((block) => {
      const availableLane = lanes.findIndex((endMinute) => endMinute <= block.startMinute);
      const lane = availableLane >= 0 ? availableLane : lanes.length;
      lanes[lane] = block.endMinute;
      return { ...block, lane };
    });
    const laneCount = Math.max(lanes.length, 1);
    const availableSegments = Array.from({ length: laneCount }).flatMap((_, lane) => {
      const laneBlocks = positionedBlocks.filter((block) => block.lane === lane).sort((a, b) => a.startMinute - b.startMinute);
      const laneSegments: Array<{ lane: number; startMinute: number; endMinute: number }> = [];
      let cursor = TIMELINE_START_MINUTE;
      laneBlocks.forEach((block) => {
        if (block.startMinute > cursor) laneSegments.push({ lane, startMinute: cursor, endMinute: block.startMinute });
        cursor = Math.max(cursor, block.endMinute);
      });
      if (cursor < TIMELINE_END_MINUTE) laneSegments.push({ lane, startMinute: cursor, endMinute: TIMELINE_END_MINUTE });
      return laneSegments;
    });
    const timelineHeight = getTimelineHeight(rowHeight, rowGap);
    const getSegmentStyle = (startMinute: number, endMinute: number) => ({
      position: 'absolute' as const,
      top: getTimelineOffset(startMinute, rowHeight, rowGap),
      height: Math.max(2, getTimelineOffset(endMinute, rowHeight, rowGap) - getTimelineOffset(startMinute, rowHeight, rowGap)),
      minHeight: 0,
    });
    const getLaneStyle = (lane: number) => ({
      left: `calc(${(lane * 100) / laneCount}% + 2px)`,
      width: `calc(${100 / laneCount}% - 4px)`,
    });
    const laneWidth = getMapCellWidth() / laneCount;
    const availablePresentation = resolveAgendaCardPresentation(laneWidth, 1, 'full');
    return <Box style={{ position: 'relative', height: timelineHeight, minWidth: 0 }}>
      {availableSegments.map((segment) => <Tooltip key={`${roomName}-available-${segment.lane}-${segment.startMinute}`} label={`Disponível · ${minutesToTime(segment.startMinute)}–${minutesToTime(segment.endMinute)}`} withArrow openDelay={180}>
        <Box style={{ ...getSegmentStyle(segment.startMinute, segment.endMinute), ...getLaneStyle(segment.lane), border: '1px solid var(--mantine-color-default-border)', borderRadius: 10, background: 'rgba(255, 255, 255, 0.025)', boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mantine-color-dimmed)', fontSize: compact ? 11 : 13, zIndex: 1 }}>
          {!availablePresentation.hideContent && <Stack gap={2} align="center"><Text size={compact ? 'xs' : 'sm'} c="dimmed">{availablePresentation.patientOnly ? 'Livre' : 'Disponível'}</Text>{!availablePresentation.patientOnly && <Text size="xs" c="dimmed">{minutesToTime(segment.startMinute)}–{minutesToTime(segment.endMinute)}</Text>}</Stack>}
        </Box>
      </Tooltip>)}
      {positionedBlocks.map((block) => <Box key={`${roomName}-${block.agenda.id || block.startMinute}`} style={{
        ...getSegmentStyle(block.startMinute, block.endMinute),
        ...getLaneStyle(block.lane),
        zIndex: 2,
      }}>{renderAgendaBlock(date, roomName, block, compact, laneWidth)}</Box>)}
    </Box>;
  };

  return <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
    {!embedded && <Header />}
    <Box p={embedded ? 0 : isMobile ? 'sm' : 'xl'} maw={embedded ? 'none' : 1500} mx={embedded ? 0 : 'auto'} w="100%">
      <Group mb="lg" gap="md" align="flex-start" style={{ display: embedded ? 'none' : undefined }}><ActionIcon variant="default" size={isMobile ? 44 : 52} radius="md" onClick={() => navigate('/cadastro-sala')} aria-label="Voltar"><ChevronLeft size={22} /></ActionIcon><Box><Group gap="xs"><Text fw={700} size="lg">Mapa de salas</Text>{usingMockData && <Badge size="sm" variant="light" color="yellow">Dados demonstrativos</Badge>}</Group><Text size="sm" c="dimmed">Capacidade e oferta da agenda de terapias</Text></Box></Group>
      <Paper p={isMobile ? 'sm' : 'md'} withBorder radius="md"><Stack gap="md">
        <Group justify="flex-end" align="center" wrap="wrap"><Group gap={6}><Button size="xs" variant={view === 'day' ? 'filled' : 'default'} onClick={() => setView('day')}>Dia</Button><Button size="xs" variant={view === 'week' ? 'filled' : 'default'} onClick={() => setView('week')}>Semana</Button></Group></Group>
        <Group grow align="flex-start" wrap="wrap"><FloatingMultiSelect label="Unidade" placeholder="Todas" data={units.map((value) => ({ value, label: value }))} value={unitFilter} onChange={setUnitFilter} searchable clearable /><FloatingMultiSelect label="Especialidade" placeholder="Todas" data={specialties.map((value) => ({ value, label: value }))} value={specialtyFilter} onChange={setSpecialtyFilter} searchable clearable /><FloatingMultiSelect label="Sala" placeholder="Todas" data={roomNames.map((value) => ({ value, label: value }))} value={roomFilter} onChange={setRoomFilter} searchable clearable /><FloatingMultiSelect label="Terapeuta" placeholder="Todos" data={doctors.map((value) => ({ value, label: value }))} value={doctorFilter} onChange={setDoctorFilter} searchable clearable /></Group>
        <Group justify="space-between" align="center" wrap="wrap"><Paper withBorder radius="md" p={4} style={{ background: 'rgba(59, 130, 246, 0.04)' }}><Group gap="xs" wrap="wrap">{view === 'day' ? <><Button size="xs" variant="default" leftSection={<ChevronLeft size={14} />} onClick={() => moveDay(-1)}>Dia anterior</Button><Button size="xs" variant="light" onClick={() => { const today = dayjs().startOf('day'); setSelectedDate(today); setWeekStart(toWeekStartMonday(today)); }}>Hoje</Button><Button size="xs" variant="default" rightSection={<ChevronRight size={14} />} onClick={() => moveDay(1)}>Próximo dia</Button><Divider orientation="vertical" my={4} /><Group gap={2} wrap="nowrap">{WEEKDAY_LABELS.map((label, index) => { const day = weekStart.add(index, 'day'); const selected = selectedDate.isSame(day, 'day'); return <Button key={label} size="xs" variant={selected ? 'filled' : 'subtle'} color={selected ? 'blue' : undefined} px={10} onClick={() => setSelectedDate(day)} aria-label={`Selecionar ${label}`}>{label}</Button>; })}</Group></> : <><Button size="xs" variant="default" leftSection={<ChevronLeft size={14} />} onClick={() => setWeekStart((current) => current.subtract(7, 'day'))}>Semana anterior</Button><Button size="xs" variant="light" onClick={() => setWeekStart(toWeekStartMonday(dayjs()))}>Hoje</Button><Button size="xs" variant="default" rightSection={<ChevronRight size={14} />} onClick={() => setWeekStart((current) => current.add(7, 'day'))}>Próxima semana</Button></>}</Group></Paper><Group gap="xs" align="center"><FloatingInput label={null} placeholder="Buscar por sala, especialidade, terapeuta ou horário" value={search} onChange={(event) => setSearch(event.currentTarget.value)} rightSection={<Search size={14} />} /><Text size="sm" c="dimmed">{view === 'day' ? selectedDate.format('dddd, DD [de] MMMM [de] YYYY') : `${weekStart.format('DD/MM/YYYY')} até ${weekStart.add(6, 'day').format('DD/MM/YYYY')}`}</Text></Group></Group>
        <Box style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))', gap: 10 }}><StatCard label="Capacidade total" value={stats.total} detail="horários possíveis" /><StatCard label="Ofertado" value={stats.total} detail="100% da capacidade" /><StatCard label="Ocupado" value={stats.occupied} detail={`${stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0}% do ofertado`} highlight /><StatCard label="Disponível" value={stats.available} detail={`${stats.total ? Math.round((stats.available / stats.total) * 100) : 0}% do ofertado`} /><StatCard label="Bloqueado" value={stats.blocked} detail="manutenção ou reserva interna" /></Box>
        <Group gap="lg" mb={-4}>{(['available', 'occupied', 'blocked'] as SlotStatus[]).map((status) => <Group key={status} gap={6}><Box w={12} h={12} style={{ borderRadius: 3, background: STATUS_META[status].color, border: `1px solid ${STATUS_META[status].border}` }} /><Text size="xs" c="dimmed">{STATUS_META[status].label}</Text></Group>)}</Group>
        {loading ? <Box style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>{Array.from({ length: 4 }).map((_, index) => <Paper key={index} withBorder p="md"><Stack gap="sm"><Skeleton height={20} /><Skeleton height={180} /></Stack></Paper>)}</Box> : view === 'day' ? <Box ref={scheduleRef} style={{ overflowX: 'auto' }}>
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
            <Box style={{ display: 'grid', gridTemplateColumns: `82px repeat(${Math.max(visibleRooms.length, 1)}, minmax(160px, 1fr))`, gap: 6, height: getTimelineHeight(42, 6), alignItems: 'start' }}>
              <Box style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>{renderTimelineMarkers(42, 6)}</Box>
              {visibleRooms.length ? visibleRooms.map((room) => <Box key={room}>{renderRoomTimeline(selectedDate, room)}</Box>) : <Box />}
            </Box>
          </Paper>
        </Box> : <Box ref={scheduleRef} style={{ overflowX: 'auto' }}>
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

            <Box style={{ display: 'grid', gridTemplateColumns: `62px repeat(${weekDays.length}, minmax(${Math.max(visibleRooms.length, 1) * 112 + 18}px, 1fr))`, gap: 8 }}>
              {renderTimelineMarkers(40, 6)}
              {weekDays.map((day) => (
                <Box key={`day-timeline-${day.format('YYYY-MM-DD')}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(visibleRooms.length, 1)}, minmax(100px, 1fr))`, gap: 5, padding: '0 5px', height: getTimelineHeight(40, 6), alignItems: 'start', borderLeft: '1px solid var(--mantine-color-default-border)', borderRight: '1px solid var(--mantine-color-default-border)', background: 'rgba(255, 255, 255, 0.015)' }}>
                  {visibleRooms.length ? visibleRooms.map((room) => <Box key={`${day.format('YYYY-MM-DD')}-${room}`}>{renderRoomTimeline(day, room, true)}</Box>) : <Text size="xs" c="dimmed" ta="center">Nenhuma sala encontrada</Text>}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>}
      </Stack></Paper>
    </Box>
  </Box>;
}
