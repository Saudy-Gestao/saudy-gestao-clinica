import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Stack,
  Badge,
  Skeleton,
  ActionIcon,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, ChevronRight, CalendarDays, Search } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { Header } from '../Header/Header';
import { useTeaWeeklyAgendaQuery, type TeaAgendaItem } from '../../hooks/useTeaWeeklyAgendaQuery';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const normalizeStatusLabel = (value?: string) => {
  const normalized = String(value || '').toUpperCase().trim();
  const map: Record<string, string> = {
    // Fluxo pré-reserva TEA
    PENDING_SCHEDULING: 'Pendente de marcação',
    PROPOSED: 'Aguardando aprovação',
    RESERVED: 'Reservado',
    PENDING_AUTHORIZATION: 'Aguardando autorização',
    AUTHORIZED: 'Autorizado',
    CONVERTED: 'Convertido em agendamento',
    EXPIRED: 'Expirado',
    CANCELED: 'Cancelado',

    // Fluxo agendamento
    AGENDADO: 'Agendado',
    SCHEDULED: 'Agendado',
    CANCELADO: 'Cancelado',
    CONFIRMED: 'Confirmado',
    CONFIRMADO: 'Confirmado',
    COMPLETED: 'Concluído',
    CONCLUIDO: 'Concluído',
    PENDENTE: 'Pendente',
  };

  return map[normalized] || (value || 'Pendente');
};

const getStatusColor = (value?: string) => {
  const normalized = String(value || '').toUpperCase().trim();
  if (normalized === 'RESERVED') return 'violet';
  if (normalized === 'PROPOSED') return 'grape';
  if (normalized === 'PENDING_AUTHORIZATION') return 'yellow';
  if (normalized === 'AUTHORIZED') return 'teal';
  if (normalized === 'AGENDADO' || normalized === 'SCHEDULED') return 'blue';
  if (normalized === 'CANCELADO' || normalized === 'CANCELED') return 'red';
  if (normalized === 'CONFIRMED' || normalized === 'CONFIRMADO') return 'teal';
  if (normalized === 'COMPLETED' || normalized === 'CONCLUIDO') return 'gray';
  return 'yellow';
};

const toWeekStartMonday = (reference: dayjs.Dayjs) => {
  const day = reference.day();
  const diff = (day + 6) % 7;
  return reference.subtract(diff, 'day').startOf('day');
};

export function TeaAgendaSemanal() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const {
    data: allTeaAppointments = [],
    isLoading: loading,
    error,
  } = useTeaWeeklyAgendaQuery();

  const [search, setSearch] = useState('');
  const [procedureFilter, setProcedureFilter] = useState<string[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<string[]>([]);
  const [roomFilter, setRoomFilter] = useState<string[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => toWeekStartMonday(dayjs()));

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, idx) => weekStart.add(idx, 'day')),
    [weekStart],
  );

  const filteredAppointments = useMemo(() => {
    return allTeaAppointments.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || (
        item.patientName.toLowerCase().includes(query)
        || item.doctorName.toLowerCase().includes(query)
        || item.specialty.toLowerCase().includes(query)
        || item.time.toLowerCase().includes(query)
      );

      const matchesProcedure = !procedureFilter
        || procedureFilter.length === 0
        || procedureFilter.includes(String(item.specialty || '').trim());
      const matchesDoctor = !doctorFilter
        || doctorFilter.length === 0
        || doctorFilter.includes(String(item.doctorName || '').trim());
      const matchesRoom = !roomFilter
        || roomFilter.length === 0
        || roomFilter.includes(String(item.roomName || '').trim());

      return matchesSearch && matchesProcedure && matchesDoctor && matchesRoom;
    });
  }, [allTeaAppointments, search, procedureFilter, doctorFilter, roomFilter]);

  const procedureOptions = useMemo(
    () => Array.from(new Set(allTeaAppointments.map((item) => String(item.specialty || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
    [allTeaAppointments],
  );

  const doctorOptions = useMemo(
    () => Array.from(new Set(allTeaAppointments.map((item) => String(item.doctorName || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
    [allTeaAppointments],
  );

  const roomOptions = useMemo(
    () => Array.from(new Set(allTeaAppointments.map((item) => String(item.roomName || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
    [allTeaAppointments],
  );

  const weekAppointmentsByDate = useMemo(() => {
    const startIso = weekStart.format('YYYY-MM-DD');
    const endIso = weekStart.add(6, 'day').format('YYYY-MM-DD');
    const grouped: Record<string, TeaAgendaItem[]> = {};

    filteredAppointments.forEach((item) => {
      if (!item.date) return;
      if (item.date < startIso || item.date > endIso) return;
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });

    Object.keys(grouped).forEach((date) => {
      grouped[date] = grouped[date].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    });

    return grouped;
  }, [filteredAppointments, weekStart]);

  const totalInWeek = useMemo(
    () => Object.values(weekAppointmentsByDate).reduce((acc, list) => acc + list.length, 0),
    [weekAppointmentsByDate],
  );

  useEffect(() => {
    dayjs.locale('pt-br');
  }, []);

  useEffect(() => {
    if (!error) return;
    const err: any = error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar agenda semanal TEA',
      color: 'red',
    });
  }, [error]);

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={18} gap="md" align="flex-start">
          <ActionIcon
            variant="default"
            size={isMobile ? 44 : 52}
            radius="md"
            onClick={() => navigate('/tea')}
            aria-label="Voltar"
          >
            <ChevronLeft size={22} />
          </ActionIcon>
          <Box>
            <Text fw={700} size="lg" style={{ color: 'var(--mantine-color-text)' }}>Agenda semanal TEA</Text>
            <Text size="sm" c="dimmed">Visão macro dos agendamentos de todos os pacientes</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="md">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="xs">
                <CalendarDays size={18} />
                <Text fw={700}>Calendário semanal geral</Text>
              </Group>
              <Badge color="indigo" variant="light">{totalInWeek} agendamento(s) na semana</Badge>
            </Group>

            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<ChevronLeft size={14} />}
                  onClick={() => setWeekStart((prev) => prev.subtract(7, 'day'))}
                >
                  Semana anterior
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  rightSection={<ChevronRight size={14} />}
                  onClick={() => setWeekStart((prev) => prev.add(7, 'day'))}
                >
                  Próxima semana
                </Button>
                <Button size="xs" variant="light" color="indigo" onClick={() => setWeekStart(toWeekStartMonday(dayjs()))}>
                  Hoje
                </Button>
              </Group>
              <Text size="sm" c="dimmed">
                {weekStart.format('DD/MM/YYYY')} até {weekStart.add(6, 'day').format('DD/MM/YYYY')}
              </Text>
            </Group>

            <FloatingInput
              label="Buscar agenda"
              rightSection={<Search size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder="Buscar por paciente, terapia, médico ou horário"
              alwaysFloatLabel
            />

            <Group grow align="flex-start">
              <FloatingMultiSelect
                label="Procedimento"
                placeholder="Filtrar por procedimento"
                data={procedureOptions}
                value={procedureFilter}
                onChange={setProcedureFilter}
                searchable
                clearable
                nothingFoundMessage="Nenhum procedimento"
              />
              <FloatingMultiSelect
                label="Médico"
                placeholder="Filtrar por médico"
                data={doctorOptions}
                value={doctorFilter}
                onChange={setDoctorFilter}
                searchable
                clearable
                nothingFoundMessage="Nenhum médico"
              />
              <FloatingMultiSelect
                label="Sala"
                placeholder="Filtrar por sala"
                data={roomOptions}
                value={roomFilter}
                onChange={setRoomFilter}
                searchable
                clearable
                nothingFoundMessage="Nenhuma sala"
              />
            </Group>

            {loading ? (
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(7, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {Array.from({ length: 7 }).map((_, index) => (
                  <Paper key={index} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                    <Stack gap={8}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Skeleton height={14} width="48%" radius="xl" />
                        <Skeleton height={20} width={24} radius="xl" />
                      </Group>
                      <Skeleton height={12} width="70%" radius="xl" />
                      <Skeleton height={12} width="60%" radius="xl" />
                      <Skeleton height={20} width="52%" radius="xl" />
                    </Stack>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(7, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {weekDays.map((day, idx) => {
                  const dayIso = day.format('YYYY-MM-DD');
                  const dayItems = weekAppointmentsByDate[dayIso] || [];
                  return (
                    <Paper key={dayIso} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                      <Stack gap={6}>
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Text size="xs" fw={700}>{WEEKDAY_LABELS[idx]} • {day.format('DD/MM')}</Text>
                          <Badge size="xs" variant="light" color="gray">{dayItems.length}</Badge>
                        </Group>

                        {dayItems.length === 0 ? (
                          <Text size="xs" c="dimmed">Sem agendamentos</Text>
                        ) : (
                          <Stack gap={6}>
                            {dayItems.map((item) => {
                              const isHovered = hoveredCardId === item.id;
                              return (
                              <Paper
                                key={item.id}
                                p={isHovered ? 10 : 6}
                                withBorder
                                onMouseEnter={() => setHoveredCardId(item.id)}
                                onMouseLeave={() => setHoveredCardId(null)}
                                style={{
                                  borderColor: isHovered ? 'var(--mantine-color-indigo-5)' : 'var(--mantine-color-default-border)',
                                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                  transformOrigin: 'center',
                                  transition: 'transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, padding 120ms ease',
                                  boxShadow: isHovered ? '0 8px 22px rgba(0, 0, 0, 0.25)' : 'none',
                                  position: 'relative',
                                  zIndex: isHovered ? 5 : 1,
                                }}
                              >
                                <Stack gap={3}>
                                  <Group justify="space-between" wrap="nowrap">
                                    <Text size={isHovered ? 'sm' : 'xs'} fw={700}>{item.time}</Text>
                                    {item.source === 'RESERVATION' && (
                                      <Badge size={isHovered ? 'sm' : 'xs'} variant="outline" color="violet">Pré-reserva</Badge>
                                    )}
                                  </Group>
                                  <Text size={isHovered ? 'sm' : 'xs'} fw={600} lineClamp={isHovered ? undefined : 1}>
                                    {item.patientName || 'Paciente'}
                                  </Text>
                                  <Text size={isHovered ? 'xs' : '10px'} c="dimmed" lineClamp={isHovered ? undefined : 1}>
                                    {item.specialty || 'Terapia não informada'}
                                    {item.doctorName ? ` • Dr(a): ${item.doctorName}` : ''}
                                  </Text>
                                  <Text size={isHovered ? 'xs' : '10px'} c="dimmed" lineClamp={isHovered ? undefined : 1}>
                                    {item.roomName ? `Sala: ${item.roomName}` : 'Sala não vinculada'}
                                  </Text>
                                  <Group justify="flex-start">
                                    <Badge
                                      size={isHovered ? 'sm' : 'xs'}
                                      variant="light"
                                      color={getStatusColor(item.status)}
                                      styles={{
                                        root: {
                                          maxWidth: '100%',
                                          height: 'auto',
                                          whiteSpace: isHovered ? 'normal' : 'nowrap',
                                          overflow: 'visible',
                                          paddingTop: isHovered ? 4 : undefined,
                                          paddingBottom: isHovered ? 4 : undefined,
                                        },
                                        label: {
                                          whiteSpace: isHovered ? 'normal' : 'nowrap',
                                          overflow: 'visible',
                                          textOverflow: 'clip',
                                          lineHeight: isHovered ? 1.2 : undefined,
                                          textAlign: 'left',
                                        },
                                      }}
                                    >
                                      {normalizeStatusLabel(item.status)}
                                    </Badge>
                                  </Group>
                                </Stack>
                              </Paper>
                            )})}
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
