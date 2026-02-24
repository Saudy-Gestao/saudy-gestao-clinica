import { useEffect, useState } from 'react';
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
  MultiSelect,
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
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import insuranceService from '../../services/insuranceService';
import procedureService from '../../services/procedureService';
import { formatCPF } from '../../utils/formatters';

interface Agendamento {
  id: string;
  patientId?: string;
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
  pacienteId: string;
  pacienteNome: string;
  pacienteCPF: string;
  especialidade: string;
  convenio: string;
  data: Date | null;
  hora: string;
  profissional: string;
  tipoConsulta: string;
  informacoes: string;
}

const INITIAL_NOVO_AGENDAMENTO: NovoAgendamento = {
  pacienteId: '',
  pacienteNome: '',
  pacienteCPF: '',
  especialidade: '',
  convenio: '',
  data: null,
  hora: '',
  profissional: '',
  tipoConsulta: '',
  informacoes: '',
};

const TIME_SLOTS = {
  'Manhã': ['08:00', '08:30', '09:00', '09:30', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45'],
  'Tarde': ['13:00', '13:15', '13:30', '13:45', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
  'Noite': ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
};

export function Agendamento() {
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>(INITIAL_NOVO_AGENDAMENTO);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgendamentoId, setEditingAgendamentoId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const [layout, setLayout] = useState<'list' | 'grid' | 'calendar'>('list');
  // State to track expanded cards (ids)
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month').toDate());
  // Selected day for calendar (uses same shape as dataHoraFiltro)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // Modal for showing appointments on a selected day
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);
  const [patientById, setPatientById] = useState<Record<string, any>>({});
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [summaryItems, setSummaryItems] = useState<string[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [insuranceOptions, setInsuranceOptions] = useState<{ value: string; label: string }[]>([]);
  const [insurancesLoading, setInsurancesLoading] = useState(false);
  const [procedureOptions, setProcedureOptions] = useState<{ value: string; label: string }[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [savingAgendamento, setSavingAgendamento] = useState(false);

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



  const mapApiToAgendamento = (it: any): Agendamento => ({
    id: String(it.id),
    patientId: it.patientId || it.patient_id || it.patient?.id || undefined,
    pacienteNome: it.patientName || it.patient_name || it.patient?.name || it.pacienteNome || '',
    pacienteCPF: it.patientCpf || it.patient_cpf || it.patient?.cpf || it.pacienteCPF || '',
    medicoNome: it.doctorName || it.doctor_name || it.doctor?.name || it.medicoNome || '',
    especialidade: it.specialty || it.procedure || it.procedureName || it.procedimento || it.especialidade || '',
    convenio: it.convenio || it.insurance || it.healthInsuranceName || '',
    data: it.date || it.data || '',
    hora: it.time || it.hora || '',
    tipoConsulta: it.type || it.tipoConsulta || '',
    status: it.status || '',
    observacoes: it.observations || it.observacoes || '',
    totem: it.totem ?? undefined,
  });

  const getResumoLinha = (agendamento: Agendamento) => {
    const parts = [agendamento.tipoConsulta, agendamento.especialidade].filter(Boolean);
    const base = parts.length ? parts.join(' | ') : '—';
    return agendamento.medicoNome ? `${base} | Dr(a): ${agendamento.medicoNome}` : base;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data: any = await appointmentService.list();
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data)
              ? data.data
              : []));
        setAgendamentos(list.map(mapApiToAgendamento));
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos',
          color: 'red',
        });
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      try {
        const data: any = await patientService.listPatients();
        const listRaw = Array.isArray(data)
          ? data
          : (Array.isArray(data?.patients)
            ? data.patients
            : (Array.isArray(data?.data?.patients)
              ? data.data.patients
              : (Array.isArray(data?.data)
                ? data.data
                : (Array.isArray(data?.items) ? data.items : []))));

        const list: any[] = Array.isArray(listRaw) ? listRaw : [];
        const options = list.map((p: any) => {
          const id = String(p.id ?? p.patientId ?? '');
          const name = (p.name || p.fullName || p.patientName || p.email || p.cpf || '').toString().trim();
          const label = name ? `${name}${p.cpf ? ` • ${formatCPF(p.cpf)}` : ''}` : 'Paciente';
          return { value: id || label, label };
        });

        const byId: Record<string, any> = {};
        list.forEach((p: any) => {
          const id = String(p.id ?? p.patientId ?? '');
          if (id) byId[id] = p;
        });

        setPatientById(byId);
        setPatientOptions(options);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes',
          color: 'red',
        });
      } finally {
        setPatientsLoading(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    const loadInsurances = async () => {
      setInsurancesLoading(true);
      try {
        const data: any = await insuranceService.listInsurances({ isActive: true });
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const options = list
          .map((it: any) => {
            const name = (it.name || it.nome || '').toString().trim();
            return name ? { value: name, label: name } : null;
          })
          .filter(Boolean) as { value: string; label: string }[];

        setInsuranceOptions(options);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar convênios',
          color: 'red',
        });
      } finally {
        setInsurancesLoading(false);
      }
    };

    const loadDoctors = async () => {
      setDoctorsLoading(true);
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

        const options = list
          .map((doctor: any) => {
            const name = doctor.name || doctor.nome || doctor.fullName || '';
            return name ? { value: name, label: name } : null;
          })
          .filter(Boolean) as { value: string; label: string }[];

        setDoctorOptions(options);

      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar médicos',
          color: 'red',
        });
      } finally {
        setDoctorsLoading(false);
      }
    };

    const loadProcedures = async () => {
      setProceduresLoading(true);
      try {
        const data: any = await procedureService.listProcedures({ limit: 200, offset: 0 });
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const options = list
          .map((item: any) => {
            const name = (item.name || item.nome || '').toString().trim();
            return name ? { value: name, label: name } : null;
          })
          .filter(Boolean) as { value: string; label: string }[];

        setProcedureOptions(options);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar procedimentos',
          color: 'red',
        });
      } finally {
        setProceduresLoading(false);
      }
    };

    loadInsurances();
    loadDoctors();
    loadProcedures();
  }, []);

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
      pacienteId: agendamento.patientId || '',
      pacienteNome: agendamento.pacienteNome || '',
      pacienteCPF: agendamento.pacienteCPF || '',
      especialidade: agendamento.especialidade,
      convenio: agendamento.convenio,
      data: agendamento.data ? new Date(agendamento.data) : null,
      hora: agendamento.hora,
      profissional: agendamento.medicoNome,
      tipoConsulta: agendamento.tipoConsulta,
      informacoes: agendamento.observacoes,
    });
    const specialties = agendamento.especialidade
      ? agendamento.especialidade.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    setSelectedSpecialties(specialties);
    setSummaryItems(specialties);
    setSelectedPatientId(agendamento.patientId || null);
    setIsEditing(true);
    setEditingAgendamentoId(agendamento.id);
    setModalOpen(true);
  };

  const handleSelectPatient = (value: string | null) => {
    if (!value) {
      setSelectedPatientId(null);
      setNovoAgendamento((prev) => ({
        ...prev,
        pacienteId: '',
        pacienteNome: '',
        pacienteCPF: '',
      }));
      return;
    }

    setSelectedPatientId(value);
    const p = patientById[value];
    if (!p) return;

    setNovoAgendamento((prev) => ({
      ...prev,
      pacienteId: String(p.id ?? p.patientId ?? value),
      pacienteNome: p.name || p.fullName || p.patientName || prev.pacienteNome || '',
      pacienteCPF: p.cpf || prev.pacienteCPF || '',
      convenio: p.healthInsuranceName || prev.convenio || '',
    }));
  };

  const handleAddSummary = () => {
    if (selectedSpecialties.length === 0) return;
    setSummaryItems((prev) => Array.from(new Set([...prev, ...selectedSpecialties])));
    setSelectedSpecialties([]);
  };

  const handleAddAgendamento = async () => {
    const specialties = summaryItems.length ? summaryItems : selectedSpecialties;
    const specialtyValue = specialties.join(', ');

    if (!selectedPatientId) {
      showNotification({ title: 'Erro', message: 'Paciente é obrigatório', color: 'red' });
      return;
    }
    if (!novoAgendamento.convenio) {
      showNotification({ title: 'Erro', message: 'Convênio é obrigatório', color: 'red' });
      return;
    }
    if (!novoAgendamento.data || !novoAgendamento.hora) {
      showNotification({ title: 'Erro', message: 'Data e horário são obrigatórios', color: 'red' });
      return;
    }
    if (!novoAgendamento.profissional) {
      showNotification({ title: 'Erro', message: 'Profissional é obrigatório', color: 'red' });
      return;
    }
    if (!novoAgendamento.tipoConsulta) {
      showNotification({ title: 'Erro', message: 'Tipo é obrigatório', color: 'red' });
      return;
    }
    if (!specialtyValue) {
      showNotification({ title: 'Erro', message: 'Procedimento é obrigatório', color: 'red' });
      return;
    }

    const basePayload = {
      patientId: selectedPatientId || undefined,
      patientName: novoAgendamento.pacienteNome || undefined,
      patientCpf: novoAgendamento.pacienteCPF || undefined,
      doctorName: novoAgendamento.profissional || undefined,
      specialty: specialtyValue,
      convenio: novoAgendamento.convenio || undefined,
      date: novoAgendamento.data ? novoAgendamento.data.toISOString().split('T')[0] : '',
      time: novoAgendamento.hora,
      type: novoAgendamento.tipoConsulta || undefined,
      observations: novoAgendamento.informacoes || undefined,
    };

    setSavingAgendamento(true);
    if (isEditing && editingAgendamentoId !== null) {
      const current = agendamentos.find((a) => a.id === editingAgendamentoId);
      try {
        const updated = await appointmentService.update(editingAgendamentoId, {
          ...basePayload,
          patientName: basePayload.patientName || current?.pacienteNome || undefined,
          patientCpf: basePayload.patientCpf || current?.pacienteCPF || undefined,
          type: basePayload.type || current?.tipoConsulta || undefined,
          status: current?.status || undefined,
          totem: current?.totem,
        });
        setAgendamentos((prev) => prev.map((a) => (a.id === editingAgendamentoId ? mapApiToAgendamento(updated) : a)));
        showNotification({
          title: 'Agendamento atualizado',
          message: 'Dados do agendamento atualizados com sucesso.',
          color: 'green',
        });
      } catch (err: any) {
        setSavingAgendamento(false);
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao atualizar agendamento',
          color: 'red',
        });
        return;
      }
    } else {
      try {
        const created = await appointmentService.create({
          ...basePayload,
          status: 'Pendente',
          totem: Math.floor(Math.random() * 100) + 1,
        });
        setAgendamentos((prev) => [mapApiToAgendamento(created), ...prev]);
        showNotification({
          title: 'Agendamento criado',
          message: 'Agendamento realizado com sucesso.',
          color: 'green',
        });
      } catch (err: any) {
        setSavingAgendamento(false);
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao criar agendamento',
          color: 'red',
        });
        return;
      }
    }

    setNovoAgendamento(INITIAL_NOVO_AGENDAMENTO);
    setModalOpen(false);
    setIsEditing(false);
    setEditingAgendamentoId(null);
    setSavingAgendamento(false);
  };

  const handleStatusChange = async (agendamentoId: string, newStatus: string) => {
    const current = agendamentos.find((a) => a.id === agendamentoId);
    if (!current) return;

    try {
      const updated = await appointmentService.update(agendamentoId, { status: newStatus });
      setAgendamentos((prev) => prev.map((a) => (a.id === agendamentoId ? mapApiToAgendamento(updated) : a)));
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao atualizar status',
        color: 'red',
      });
    }
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
          {getResumoLinha(agendamento)}
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
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {/* Breadcrumb/Back Button */}
        <Group mb={isMobile ? 20 : 30}>
          <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
              Agendamento
            </Text>
            <Text size="sm" c="dimmed">
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
              leftSection={<Search size={16} color="var(--mantine-color-dimmed)" />}
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
              onClick={() => {
                setIsEditing(false);
                setEditingAgendamentoId(null);
                setNovoAgendamento(INITIAL_NOVO_AGENDAMENTO);
                setSelectedPatientId(null);
                setSelectedSpecialties([]);
                setSummaryItems([]);
                setModalOpen(true);
              }}
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
                          <Text size="sm"><strong>Procedimento:</strong> {a.especialidade || '—'}</Text>
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
                            <Text size="xs" c="dimmed">{getResumoLinha(a)}</Text>
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
          setSelectedPatientId(null);
          setSelectedSpecialties([]);
          setSummaryItems([]);
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
            <Box>
              <Select
                label="Paciente"
                placeholder={patientsLoading ? 'Carregando pacientes...' : 'Selecione o paciente'}
                data={patientOptions}
                value={selectedPatientId}
                onChange={handleSelectPatient}
                searchable
                clearable
                nothingFoundMessage="Nenhum paciente encontrado"
                disabled={patientsLoading}
              />
            </Box>
            <Box>
              <Select
                label="Convênio"
                placeholder={insurancesLoading ? 'Carregando convênios...' : 'Selecione o convênio'}
                data={insuranceOptions}
                value={novoAgendamento.convenio}
                onChange={(value) => setNovoAgendamento({ ...novoAgendamento, convenio: value || '' })}
                searchable
                clearable
                disabled={insurancesLoading}
                nothingFoundMessage="Nenhum convênio encontrado"
              />
            </Box>
          </Group>

          <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
            <Box>
              <DateInput
                label="Data"
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
                placeholder="--:--"
                value={novoAgendamento.hora}
                onChange={(e) =>
                  setNovoAgendamento({ ...novoAgendamento, hora: e.currentTarget.value })
                }
                leftSection={<Clock size={16} />}
                variant="unstyled"
              />
            </Box>
          </Group>

          <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
            <Box>
              <Select
                label="Profissional"
                placeholder={doctorsLoading ? 'Carregando médicos...' : 'Selecione o profissional'}
                data={doctorOptions}
                value={novoAgendamento.profissional}
                onChange={(value) => setNovoAgendamento({ ...novoAgendamento, profissional: value || '' })}
                searchable
                clearable
                disabled={doctorsLoading}
                nothingFoundMessage="Nenhum médico encontrado"
              />
            </Box>
            <Box>
              <Select
                label="Tipo"
                placeholder="Selecione"
                data={[
                  { value: 'Consulta', label: 'Consulta' },
                  { value: 'Exame', label: 'Exame' },
                  { value: 'Retorno', label: 'Retorno' },
                  { value: 'Outro', label: 'Outro' },
                ]}
                value={novoAgendamento.tipoConsulta}
                onChange={(value) => setNovoAgendamento({ ...novoAgendamento, tipoConsulta: value || '' })}
              />
            </Box>
          </Group>

          <Box>
            <MultiSelect
              label="Procedimento (selecione um ou mais)"
              placeholder={proceduresLoading ? 'Carregando procedimentos...' : 'Selecione'}
              data={procedureOptions}
              value={selectedSpecialties}
              onChange={setSelectedSpecialties}
              searchable
              clearable
              disabled={proceduresLoading}
              nothingFoundMessage="Nenhum procedimento cadastrado"
            />
          </Box>

          <Group justify="flex-start">
            <Button variant="outline" size="xs" onClick={handleAddSummary}>
              Adicionar ao resumo
            </Button>
          </Group>

          <Textarea
            label="Observações"
            placeholder="Observações adicionais"
            rows={4}
            value={novoAgendamento.informacoes}
            onChange={(e) =>
              setNovoAgendamento({ ...novoAgendamento, informacoes: e.currentTarget.value })
            }
          />

          <Box style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 12 }}>
            <Text fw={600} size="sm" mb={6}>Resumo</Text>
            {summaryItems.length > 0 ? (
              summaryItems.map((item) => (
                <Text key={item} size="xs">{item}</Text>
              ))
            ) : (
              <Text size="xs" c="dimmed">Nenhum item</Text>
            )}
          </Box>

          <Group justify="flex-end" gap="md" mt={isMobile ? "sm" : "lg"}>
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} onClick={handleAddAgendamento} loading={savingAgendamento} disabled={savingAgendamento}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
