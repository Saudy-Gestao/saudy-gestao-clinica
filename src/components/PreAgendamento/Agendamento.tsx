import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  TextInput,
  Button,
  Modal,
  Stack,
  Textarea,
  Select,
  ActionIcon,
  Popover,
  SimpleGrid,
  UnstyledButton,
  ScrollArea,
} from '@mantine/core';
import { DateInput, TimeInput, Calendar as MantineCalendar } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, ChevronRight, Calendar, Clock, LayoutGrid, List } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';

interface Agendamento {
  id: number;
  pacienteNome: string;
  pacienteCPF: string;
  medicoNome: string;
  especialidade: string;
  convenio: string;
  data: string;
  hora: string;
  tipoConsulta: string;
  status: string;
  observacoes: string;
  totem?: number;
}

interface NovoAgendamento {
  especialidade: string;
  convenio: string;
  data: Date | null;
  hora: string;
  profissional: string;
  informacoes: string;
}

const INITIAL_AGENDAMENTOS: Agendamento[] = [
  {
    id: 1,
    pacienteNome: 'Maria Silva Santos',
    pacienteCPF: '123.456.789-00',
    medicoNome: 'Dr. João Pereira',
    especialidade: 'Cardiologia',
    convenio: 'Unimed',
    data: '2026-01-15',
    hora: '09:00',
    tipoConsulta: 'Consulta de rotina',
    status: 'Agendado',
    observacoes: 'Paciente com histórico de hipertensão',
    totem: 23,
  },
  {
    id: 2,
    pacienteNome: 'João Pedro Oliveira',
    pacienteCPF: '987.654.321-00',
    medicoNome: 'Dra. Ana Costa',
    especialidade: 'Ortopedia',
    convenio: 'Particular',
    data: '2026-01-16',
    hora: '14:30',
    tipoConsulta: 'Retorno',
    status: 'Pendente',
    observacoes: 'Avaliação pós-cirurgia',
    totem: 24,
  },
  {
    id: 3,
    pacienteNome: 'Carla Santos',
    pacienteCPF: '456.789.123-00',
    medicoNome: 'Dr. Roberto Lima',
    especialidade: 'Dermatologia',
    convenio: 'Sulamerica',
    data: '2026-01-17',
    hora: '11:00',
    tipoConsulta: 'Primeira consulta',
    status: 'Agendado',
    observacoes: '',
    totem: 25,
  },
];

const INITIAL_NOVO_AGENDAMENTO: NovoAgendamento = {
  especialidade: '',
  convenio: '',
  data: null,
  hora: '',
  profissional: '',
  informacoes: '',
};

const TIME_SLOTS = {
  'Manhã': ['08:00', '08:30', '09:00', '09:30', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45'],
  'Tarde': ['13:00', '13:15', '13:30', '13:45', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
  'Noite': ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
};

export function Agendamento() {
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(INITIAL_AGENDAMENTOS);
  const [searchValue, setSearchValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>(INITIAL_NOVO_AGENDAMENTO);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgendamentoId, setEditingAgendamentoId] = useState<number | null>(null);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const [layout, setLayout] = useState<'list' | 'grid' | 'calendar'>('list');
  // State to track expanded cards (ids)
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month').toDate());
  // Selected day for calendar (uses same shape as dataHoraFiltro)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // Modal for showing appointments on a selected day
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  // Estados para os filtros
  const [especialidade, setEspecialidade] = useState('');
  const [convenio, setConvenio] = useState('');
  const [dataHoraFiltro, setDataHoraFiltro] = useState<Date | null>(null);
  const [turno, setTurno] = useState('');

  // State for custom date picker
  const [pickerOpened, setPickerOpened] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('Manhã');
  const [viewedDate, setViewedDate] = useState<Date>(new Date());

  dayjs.locale('pt-br');

  const getFilteredTimeSlots = (period: string) => {
    if (period === 'Todos') {
      return [...TIME_SLOTS['Manhã'], ...TIME_SLOTS['Tarde'], ...TIME_SLOTS['Noite']];
    }
    return TIME_SLOTS[period as keyof typeof TIME_SLOTS] || [];
  };

  const filteredAgendamentos = agendamentos.filter(
    (agendamento) =>
      agendamento.pacienteNome.toLowerCase().includes(searchValue.toLowerCase()) ||
      agendamento.pacienteCPF.includes(searchValue) ||
      agendamento.medicoNome.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleEditAgendamento = (agendamento: Agendamento) => {
    setNovoAgendamento({
      especialidade: agendamento.especialidade,
      convenio: agendamento.convenio,
      data: new Date(agendamento.data),
      hora: agendamento.hora,
      profissional: agendamento.medicoNome,
      informacoes: agendamento.observacoes,
    });
    setIsEditing(true);
    setEditingAgendamentoId(agendamento.id);
    setModalOpen(true);
  };

  const handleAddAgendamento = () => {
    if (!novoAgendamento.especialidade || !novoAgendamento.data || !novoAgendamento.hora) {
      alert('Por favor, preencha os campos obrigatórios');
      return;
    }

    const agendamentoData = {
      pacienteNome: '', // Placeholder, since not in modal
      pacienteCPF: '', // Placeholder
      medicoNome: novoAgendamento.profissional,
      especialidade: novoAgendamento.especialidade,
      data: novoAgendamento.data ? novoAgendamento.data.toISOString().split('T')[0] : '',
      hora: novoAgendamento.hora,
      tipoConsulta: '', // Placeholder
      status: '', // Placeholder
      observacoes: novoAgendamento.informacoes,
      convenio: novoAgendamento.convenio,
    };

    if (isEditing && editingAgendamentoId !== null) {
      // Edit existing agendamento
      setAgendamentos(agendamentos.map(a =>
        a.id === editingAgendamentoId
          ? { ...a, ...agendamentoData }
          : a
      ));
    } else {
      // Add new agendamento
      const newAgendamento: Agendamento = {
        ...agendamentoData,
        id: Math.max(...agendamentos.map((a) => a.id), 0) + 1,
        totem: Math.floor(Math.random() * 100) + 1,
      };
      setAgendamentos([...agendamentos, newAgendamento]);
    }

    setNovoAgendamento(INITIAL_NOVO_AGENDAMENTO);
    setModalOpen(false);
    setIsEditing(false);
    setEditingAgendamentoId(null);
  };

  const handleStatusChange = (agendamentoId: number, newStatus: string) => {
    setAgendamentos(agendamentos.map(a =>
      a.id === agendamentoId ? { ...a, status: newStatus } : a
    ));
  };

  const rows = filteredAgendamentos.map((agendamento) => (
    <Box key={agendamento.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #e9ecef' }}>
      {/* Time column - centered */}
      <Box style={{ minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text size="sm" fw={400} style={{ color: '#495057' }}>{agendamento.hora}</Text>
      </Box>

      {/* Vertical separator and main content */}
      <Box onClick={() => handleEditAgendamento(agendamento)} style={{ borderLeft: !isMobile ? '1px solid #e9ecef' : 'none', paddingLeft: !isMobile ? 16 : 0, flex: 1, cursor: 'pointer' }}>
        <Text fw={600} size="sm">{agendamento.pacienteNome}</Text>
        <Text size="xs" c="dimmed" mt={6}>
          {agendamento.tipoConsulta} {" | "} {agendamento.especialidade} {" | "} Dr(a): {agendamento.medicoNome}
        </Text>
      </Box>

      {/* Right aligned status */}
      <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Box style={{ minWidth: 140 }}>
          <Select
            data={[
              { value: 'Pendente', label: 'Pendente' },
              { value: 'Agendado', label: 'Agendado' },
              { value: 'Cancelado', label: 'Cancelado' },
            ]}
            value={agendamento.status}
            onChange={(value) => handleStatusChange(agendamento.id, value || 'Pendente')}
            size="xs"
            radius="md"
            w={120}
          />
        </Box>
      </Box>
    </Box>
  ));

  const uniqueDates = Array.from(new Set(filteredAgendamentos.map(a => a.data))).sort();
  const agendamentosByDate = uniqueDates.reduce<Record<string, Agendamento[]>>((acc, date) => {
    acc[date] = filteredAgendamentos.filter(a => a.data === date).sort((x, y) => x.hora.localeCompare(y.hora));
    return acc;
  }, {});

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {/* Breadcrumb/Back Button */}
        <Group mb={isMobile ? 20 : 30}>
          <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
              Agendamento
            </Text>
            <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
              Consultas e exames
            </Text>
          </Box>
        </Group>

        {/* Search and Button Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end" wrap="nowrap">
            {/* Filtros */}
            <Box className="floating-field">
              <input
                type="text"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.currentTarget.value)}
                placeholder=" "
              />
              <label>Especialidade</label>
            </Box>

            <Box className="floating-field">
              <input
                type="text"
                value={convenio}
                onChange={(e) => setConvenio(e.currentTarget.value)}
                placeholder=" "
              />
              <label>Convênio</label>
            </Box>

            <Popover 
              opened={pickerOpened} 
              onChange={setPickerOpened}
              position="bottom-start"
              withArrow
              shadow="md"
              width={700}
              trapFocus
            >
              <Popover.Target>
                <TextInput
                  label="Data e Hora"
                  placeholder="Selecione data e hora"
                  value={dataHoraFiltro ? dayjs(dataHoraFiltro).format('DD/MM/YYYY | HH:mm:ss') : ''}
                  onClick={() => {
                    const initialDate = dataHoraFiltro || new Date();
                    setTempDate(initialDate);
                    setViewedDate(initialDate);
                    setTempTime(dataHoraFiltro ? dayjs(dataHoraFiltro).format('HH:mm') : null);
                    setPickerOpened(true);
                  }}
                  leftSection={<Calendar size={16} />}
                  readOnly
                  variant="unstyled"
                />
              </Popover.Target>
              <Popover.Dropdown p={0}>
                <Box display="flex" style={{ height: 350 }}>
                  <Box p="md" style={{ borderRight: '1px solid #eee', width: 320 }}>
                    <MantineCalendar
                      date={viewedDate}
                      onDateChange={(date) => setViewedDate(new Date(date))}
                      locale="pt-br"
                      size="md"
                      styles={{
                        day: { borderRadius: '50%' }
                      }}
                      getDayProps={(date) => ({
                        onClick: () => {
                          // Garante que 'date' é um objeto Date
                          const d = new Date(date);
                          setTempDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
                        },
                        selected: tempDate && dayjs(date).isSame(tempDate, 'day'),
                      })}
                    />
                  </Box>
                  <Box p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Text fw={500} mb="sm">Selecione o horário</Text>
                    
                    <Group mb="md" gap="xs">
                      {['Todos', 'Manhã', 'Tarde', 'Noite'].map(period => (
                        <Button
                          key={period}
                          size="xs"
                          variant={selectedPeriod === period ? 'filled' : 'outline'}
                          color={selectedPeriod === period ? 'darkBlue' : 'gray'}
                          onClick={() => setSelectedPeriod(period)}
                          bg={selectedPeriod === period ? DARK_BLUE : undefined}
                          style={{ 
                            borderColor: selectedPeriod === period ? DARK_BLUE : '#dee2e6',
                            color: selectedPeriod === period ? 'white' : '#495057'
                          }}
                        >
                          {period}
                        </Button>
                      ))}
                    </Group>

                    <ScrollArea style={{ flex: 1 }} type="auto">
                      <SimpleGrid cols={4} spacing="xs">
                        {getFilteredTimeSlots(selectedPeriod).map(time => (
                          <UnstyledButton
                            key={time}
                            onClick={() => setTempTime(time)}
                            style={{
                              backgroundColor: tempTime === time ? '#e7f5ff' : 'transparent',
                              border: `1px solid ${tempTime === time ? '#1c7ed6' : '#dee2e6'}`,
                              borderRadius: 4,
                              padding: '4px 0',
                              textAlign: 'center',
                              fontSize: '0.875rem',
                              color: tempTime === time ? '#1c7ed6' : '#495057',
                              cursor: 'pointer'
                            }}
                          >
                            {time}
                          </UnstyledButton>
                        ))}
                      </SimpleGrid>
                    </ScrollArea>

                    <Group mt="md" justify="space-between">
                      <Group gap="xs">
                        <Group gap={4}>
                          <Box w={12} h={12} style={{ border: '1px solid #dee2e6', borderRadius: 2 }} />
                          <Text size="xs" c="dimmed">Disponível</Text>
                        </Group>
                        <Group gap={4}>
                          <Box w={12} h={12} bg="#e9ecef" style={{ borderRadius: 2 }} />
                          <Text size="xs" c="dimmed">Indisponível</Text>
                        </Group>
                      </Group>
                      
                      <Group gap="xs">
                        <Button variant="outline" size="xs" color="gray" onClick={() => {
                          setTempDate(new Date());
                          setViewedDate(new Date());
                          setTempTime(null);
                          setDataHoraFiltro(null);
                        }}>
                          Redefinir
                        </Button>
                        <Button variant="default" size="xs" onClick={() => setPickerOpened(false)}>Cancelar</Button>
                        <Button 
                          size="xs" 
                          bg={DARK_BLUE} 
                          onClick={() => {
                            if (!tempTime) {
                              alert('Selecione um horário para salvar.');
                              return;
                            }
                            if (tempDate && tempTime) {
                              const [hours, minutes] = tempTime.split(':');
                              // Cria uma nova data local sem ajuste de fuso
                              const newDate = new Date(
                                tempDate.getFullYear(),
                                tempDate.getMonth(),
                                tempDate.getDate(),
                                parseInt(hours),
                                parseInt(minutes),
                                0,
                                0
                              );
                              setDataHoraFiltro(newDate);
                              setPickerOpened(false);
                            }
                          }}
                        >
                          Salvar
                        </Button>
                      </Group>
                    </Group>
                  </Box>
                </Box>
              </Popover.Dropdown>
            </Popover>

            <Select
              label="Turno"
              placeholder="Selecione"
              data={[
                { value: 'Manhã', label: 'Manhã' },
                { value: 'Tarde', label: 'Tarde' },
                { value: 'Noite', label: 'Noite' },
              ]}
              value={turno}
              onChange={(value) => setTurno(value || '')}
              clearable
            />

            {/* Search Bar */}
            <TextInput
              placeholder={isMobile ? "Buscar..." : "Buscar por paciente, CPF ou médico..."}
              leftSection={<Search size={16} color="#999" />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.currentTarget.value)}
              radius="md"
              size={isMobile ? "sm" : "md"}
              style={{ flex: 2 }}
            />

            {/* Add Agendamento Button */}
            <Button
              bg={DARK_BLUE}
              c="white"
              leftSection={isMobile ? undefined : <Plus size={16} />}
              onClick={() => setModalOpen(true)}
              size={isMobile ? "sm" : "md"}
              fw={600}
              px={isMobile ? "sm" : "xl"}
              style={{ flexShrink: 0 }}
            >
              {isMobile ? <Plus size={16} /> : "Novo"}
            </Button>
          </Group>

          {/* Layout switch icons (Lista / Grade / Calendário) */}
          <Box mt={8} mb={8} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Group gap="xm">
              <ActionIcon
                variant={layout === 'list' ? 'filled' : 'subtle'}
                color={layout === 'list' ? 'darkBlue' : undefined}
                onClick={() => setLayout('list')}
                title="Lista"
              >
                <List size={16} />
              </ActionIcon>
              <ActionIcon
                variant={layout === 'grid' ? 'filled' : 'subtle'}
                color={layout === 'grid' ? 'darkBlue' : undefined}
                onClick={() => setLayout('grid')}
                title="Grade"
              >
                <LayoutGrid size={16} />
              </ActionIcon>
              <ActionIcon
                variant={layout === 'calendar' ? 'filled' : 'subtle'}
                color={layout === 'calendar' ? 'darkBlue' : undefined}
                onClick={() => setLayout('calendar')}
                title="Calendário"
              >
                <Calendar size={16} />
              </ActionIcon>
            </Group>
          </Box>
        </Box>

        {dataHoraFiltro && (
          <Text size="xl" fw={700} mb="md">
            {dayjs(dataHoraFiltro).format('dddd').charAt(0).toUpperCase() + dayjs(dataHoraFiltro).format('dddd').slice(1)} | {dayjs(dataHoraFiltro).format('DD [de] MMMM [de] YYYY')}
          </Text>
        )}

        {/* Agendamentos List */}
        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6}}>
          {/* LIST */}
          {layout === 'list' && (
            <Box>
              {rows.length > 0 ? rows : <Box p="md"><Text ta="center" c="dimmed">Nenhum agendamento encontrado</Text></Box>}
            </Box>
          )}

          {/* GRID */}
          {layout === 'grid' && (
            <Box p="md">
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {filteredAgendamentos.length > 0 ? filteredAgendamentos.map(a => {
                  const isExpanded = expandedIds.includes(a.id);
                  return (
                    <Box key={a.id} p="md" style={{ border: '1px solid #e9ecef', borderRadius: 8 }}>
                      <Group justify="apart" align="flex-start">
                        <Box>
                          <Text fw={700}>{a.pacienteNome || '—'}</Text>
                          <Text size="xs" c="dimmed">{a.hora} • {a.tipoConsulta}</Text>
                        </Box>
                        <Text size="xs" style={{ color: a.status ? '#16a34a' : '#6c757d' }}>{a.status || '—'}</Text>
                      </Group>

                      {!isExpanded ? (
                        <Group mt={8} justify="apart">
                          <Text size="sm">{a.especialidade || '—'}</Text>
                          <Button size="xs" variant="outline" onClick={() => setExpandedIds(prev => prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id])}>
                            Ver mais
                          </Button>
                        </Group>
                      ) : (
                        <Box mt={8}>
                          <Text size="sm"><strong>Especialidade:</strong> {a.especialidade || '—'}</Text>
                          <Text size="sm" mt={6}><strong>Profissional:</strong> {a.medicoNome || '—'}</Text>
                          <Button size="xs" variant="outline" mt={8} onClick={() => setExpandedIds(prev => prev.filter(id => id !== a.id))}>
                            Ver menos
                          </Button>
                        </Box>
                      )}
                    </Box>
                  );
                }) : <Box p="md"><Text ta="center" c="dimmed">Nenhum agendamento encontrado</Text></Box>}
              </SimpleGrid>
            </Box>
          )}

          {/* CALENDAR */}
          {layout === 'calendar' && (
            <Box p="md">
              {/* Calendar header */}
              <Group justify="apart" align="center" mb={8}>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => setCurrentMonth(d => dayjs(d).subtract(1, 'month').toDate())}>
                    <ChevronLeft size={18} />
                  </ActionIcon>
                  <Text fw={700}>{dayjs(currentMonth).format('MMMM YYYY')}</Text>
                  <ActionIcon variant="subtle" onClick={() => setCurrentMonth(d => dayjs(d).add(1, 'month').toDate())}>
                    <ChevronRight size={18} />
                  </ActionIcon>
                </Group>
                <Group>
                  <Button size="xs" variant={selectedDay ? 'outline' : 'filled'} onClick={() => { setSelectedDay(null); setDataHoraFiltro(null); }}>
                    Limpar seleção
                  </Button>
                </Group>
              </Group>

              {/* Weekdays */}
              <SimpleGrid cols={7} spacing={0} mb={8}>
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                  <Box key={d} style={{ textAlign: 'center', padding: '6px 0' }}>
                    <Text size="xs" c="dimmed" fw={600}>{d}</Text>
                  </Box>
                ))}
              </SimpleGrid>

              {/* Days grid */}
              <SimpleGrid cols={7} spacing="xs">
                {(() => {
                  const startOfMonth = dayjs(currentMonth).startOf('month');
                  // Monday-first: compute start date to show (previous Monday)
                  const startDay = startOfMonth.startOf('week').add(1, 'day');
                  // adjust if startDay is after startOfMonth (works with sunday-first)
                  const start = startDay.isAfter(startOfMonth) ? startDay.subtract(7, 'day') : startDay;
                  const days = [] as dayjs.Dayjs[];
                  for (let i = 0; i < 42; i++) {
                    days.push(dayjs(start).add(i, 'day'));
                  }

                  // Map appointments by date
                  const apptMap = filteredAgendamentos.reduce<Record<string, number>>((acc, a) => {
                    acc[a.data] = (acc[a.data] || 0) + 1;
                    return acc;
                  }, {});

                  return days.map((d) => {
                    const key = d.format('YYYY-MM-DD');
                    const isCurrentMonth = d.month() === dayjs(currentMonth).month();
                    const isSelected = selectedDay ? dayjs(selectedDay).isSame(d, 'day') : false;
                    const isToday = d.isSame(dayjs(), 'day');
                    const count = apptMap[d.format('YYYY-MM-DD')] || 0;

                    return (
                      <Box
                        key={key}
                        onClick={() => {
                          setSelectedDay(d.toDate());
                          setDataHoraFiltro(d.toDate());
                          if (count > 0) {
                            setCalendarModalOpen(true);
                          } else {
                            setCalendarModalOpen(false);
                          }
                        }}
                        style={{
                          padding: 8,
                          minHeight: 64,
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: isSelected ? DARK_BLUE : 'transparent',
                          color: isSelected ? 'white' : isCurrentMonth ? undefined : '#adb5bd',
                          boxShadow: isSelected ? '0 6px 18px rgba(0,0,0,0.06)' : undefined,
                          border: isToday && !isSelected ? '1px solid #dee2e6' : undefined,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                        title={d.format('DD/MM/YYYY')}
                      >
                        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text fw={600} size="sm">{d.date()}</Text>
                          {count > 0 && (
                            <Box style={{ width: 8, height: 8, borderRadius: 8, background: isSelected ? 'white' : DARK_BLUE }} />
                          )}
                        </Box>

                        {/* small list of appointments (one line) */}
                        <Box style={{ marginTop: 6 }}>
                          {count > 0 && (
                            <Text size="xs" style={{ opacity: 0.9 }}>{count} agendamento{count > 1 ? 's' : ''}</Text>
                          )}
                        </Box>
                      </Box>
                    );
                  });
                })()}
              </SimpleGrid>

              {/* Selected day details shown in modal when there are appointments */}
              <Modal
                opened={calendarModalOpen}
                onClose={() => setCalendarModalOpen(false)}
                title={selectedDay ? `Agendamentos — ${dayjs(selectedDay).format('DD [de] MMMM [de] YYYY')}` : 'Agendamentos'}
                size={isMobile ? '100%' : 'lg'}
                centered
                fullScreen={isMobile}
              >
                <Stack gap={8}>
                  {selectedDay && (agendamentosByDate[dayjs(selectedDay).format('YYYY-MM-DD')] || []).length > 0 ? (
                    (agendamentosByDate[dayjs(selectedDay).format('YYYY-MM-DD')] || []).map(a => (
                      <Box key={a.id} style={{ padding: 12, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef', marginBottom: 8 }}>
                        <Group align="center" style={{ width: '100%' }}>
                          <Box style={{ flex: 1 }}>
                            <Text fw={600}>{a.hora} — {a.pacienteNome || '—'}</Text>
                            <Text size="xs" c="dimmed">{a.especialidade} | Dr(a). {a.medicoNome}</Text>
                          </Box>
                          <Box style={{ marginLeft: 12 }}>
                            <Button size="xs" onClick={() => { handleEditAgendamento(a); setCalendarModalOpen(false); }}>
                              Editar
                            </Button>
                          </Box>
                        </Group>
                      </Box>
                    ))
                  ) : (
                    <Text size="sm" c="dimmed">Nenhum agendamento neste dia</Text>
                  )}

                  <Group justify="right">
                    <Button variant="default" onClick={() => setCalendarModalOpen(false)}>Fechar</Button>
                  </Group>
                </Stack>
              </Modal>
            </Box>
          )}
        </Box>
      </Box>

      {/* Modal - Novo Agendamento */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setIsEditing(false);
          setEditingAgendamentoId(null);
          setNovoAgendamento(INITIAL_NOVO_AGENDAMENTO);
        }}
        title={isEditing ? "Editar Agendamento" : "Novo Agendamento"}
        size={isMobile ? "100%" : isTablet ? "90%" : "lg"}
        centered
        fullScreen={isMobile}
        styles={{
          content: {
            '::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            overflow: 'hidden',
          },
          body: {
            '::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            overflow: 'hidden',
          },
        }}
      >
        <Stack gap={isMobile ? "sm" : "md"} mih={isMobile ? undefined : 600}>
          <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
            <Box className="floating-field">
              <input
                type="text"
                value={novoAgendamento.especialidade}
                onChange={(e) =>
                  setNovoAgendamento({ ...novoAgendamento, especialidade: e.currentTarget.value })
                }
                placeholder=" "
              />
              <label>Especialidade</label>
            </Box>
            <Box className="floating-field">
              <input
                type="text"
                value={novoAgendamento.convenio}
                onChange={(e) =>
                  setNovoAgendamento({ ...novoAgendamento, convenio: e.currentTarget.value })
                }
                placeholder=" "
              />
              <label>Convênio</label>
            </Box>
          </Group>

          <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
            <Box>
              <DateInput
                label="Data da Consulta"
                placeholder="Selecione a data"
                value={novoAgendamento.data}
                onChange={(value) =>
                  setNovoAgendamento({ ...novoAgendamento, data: value ? new Date(value) : null })
                }
                leftSection={<Calendar size={16} />}
                variant="unstyled"
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
              />
            </Box>
            <Box>
              <TimeInput
                label="Horário"
                placeholder="Selecione o horário"
                value={novoAgendamento.hora}
                onChange={(e) =>
                  setNovoAgendamento({ ...novoAgendamento, hora: e.currentTarget.value })
                }
                leftSection={<Clock size={16} />}
                variant="unstyled"
              />
            </Box>
          </Group>

          <Box className="floating-field">
            <input
              type="text"
              value={novoAgendamento.profissional}
              onChange={(e) =>
                setNovoAgendamento({ ...novoAgendamento, profissional: e.currentTarget.value })
              }
              placeholder=" "
            />
            <label>Profissional</label>
          </Box>

          <Textarea
            label="Informações"
            placeholder="Informações adicionais sobre o agendamento"
            rows={4}
            value={novoAgendamento.informacoes}
            onChange={(e) =>
              setNovoAgendamento({ ...novoAgendamento, informacoes: e.currentTarget.value })
            }
          />

          <Group justify="flex-end" gap="md" mt={isMobile ? "sm" : "lg"}>
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} onClick={handleAddAgendamento}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
