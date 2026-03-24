import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  TextInput,
  Button,
  Modal,
  Stack,
  Select,
  ActionIcon,
  Popover,
  SimpleGrid,
  UnstyledButton,
  Paper,
  Badge,
  Tabs,
  useComputedColorScheme,
} from '@mantine/core';
import { Calendar as MantineCalendar } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { Search, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, Plus, Clock3, User } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { FloatingDateInput } from '../common/FloatingDateInput';
import { FloatingTextarea } from '../common/FloatingTextarea';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import insuranceService from '../../services/insuranceService';
import procedureService from '../../services/procedureService';
import { formatCPF } from '../../utils/formatters';

interface Agendamento {
  id: string;
  rescheduledFromAppointmentId?: string;
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
  durationMinutes?: number | null;
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

interface PendingPatientRegistration {
  name: string;
  cpf: string;
  birthDate: Date | null;
  gender: string;
  cellphone: string;
  email: string;
}

interface DoctorScheduleMeta {
  id?: string;
  name: string;
  workingDays: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  specialties: string[];
}

interface ProcedureMeta {
  name: string;
  durationMinutes?: number | null;
  doctorIds: string[];
  doctorNames: string[];
}

interface SuggestedProcedureSchedule {
  procedure: string;
  doctorName: string;
  date: Date;
  time: string;
  durationMinutes: number;
}

interface SuggestedScheduleOption {
  id: string;
  totalWaitMinutes: number;
  items: SuggestedProcedureSchedule[];
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

const INITIAL_PENDING_PATIENT: PendingPatientRegistration = {
  name: '',
  cpf: '',
  birthDate: null,
  gender: '',
  cellphone: '',
  email: '',
};

const TIME_SLOTS = {
  'Manhã': ['08:00', '08:30', '09:00', '09:30', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45'],
  'Tarde': ['13:00', '13:15', '13:30', '13:45', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
  'Noite': ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
};

const PERIOD_RANGES: Record<'Manhã' | 'Tarde' | 'Noite', [number, number]> = {
  Manhã: [0, 12 * 60],
  Tarde: [12 * 60, 18 * 60],
  Noite: [18 * 60, 24 * 60],
};

const normalizeAppointmentStatus = (status?: string | null): string => {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'REALIZADO' || normalized === 'COMPLETED' || normalized === 'FINALIZADO' || normalized === 'ATENDIDO') return 'REALIZADO';
  if (normalized === 'NAO_COMPARECEU' || normalized === 'NÃO_COMPARECEU' || normalized === 'NO_SHOW' || normalized === 'NO-SHOW' || normalized === 'AUSENTE' || normalized === 'FALTOU') return 'NAO_COMPARECEU';
  if (normalized === 'CONFIRMADO') return 'CONFIRMADO';
  if (normalized === 'CANCELED') return 'CANCELADO';
  if (normalized === 'AGENDADO') return 'AGENDADO';
  if (normalized === 'CANCELADO') return 'CANCELADO';
  if (normalized === 'PENDENTE') return 'AGENDADO';
  return 'AGENDADO';
};

const sortAgendamentosByDateTime = (items: Agendamento[]): Agendamento[] => {
  return [...items].sort((a, b) => {
    const aStamp = dayjs(`${a.data}T${a.hora || '00:00'}:00`).valueOf();
    const bStamp = dayjs(`${b.data}T${b.hora || '00:00'}:00`).valueOf();
    return bStamp - aStamp;
  });
};

const normalizeDateOnly = (value: unknown): string => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const parsed = dayjs(raw);
  if (!parsed.isValid()) return raw;
  return parsed.format('YYYY-MM-DD');
};

const resolveTurnoFromTime = (time?: string): 'Manhã' | 'Tarde' | 'Noite' | null => {
  const [hourRaw] = String(time || '').split(':');
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return null;
  if (hour < 12) return 'Manhã';
  if (hour < 18) return 'Tarde';
  return 'Noite';
};

const normalizeWeekdayLabel = (value?: string | null): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const normalizeComparableText = (value?: string | null): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const getBranchWeekdayLabel = (date: Date): string => {
  const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  return days[date.getDay()] || '';
};

const parseTimeToMinutes = (value?: string | null): number | null => {
  const [hoursRaw, minutesRaw] = String(value || '').split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
};

const formatMinutesToTime = (value: number): string => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const buildDoctorSlots = (
  doctor: DoctorScheduleMeta | undefined,
  period: 'Manhã' | 'Tarde' | 'Noite',
  date: Date,
): string[] => {
  if (!doctor?.workingHoursStart || !doctor?.workingHoursEnd) {
    return TIME_SLOTS[period];
  }

  const normalizedDays = (doctor.workingDays || []).map(normalizeWeekdayLabel);
  const currentWeekday = getBranchWeekdayLabel(date);
  if (normalizedDays.length > 0 && !normalizedDays.includes(currentWeekday)) {
    return [];
  }

  const doctorStart = parseTimeToMinutes(doctor.workingHoursStart);
  const doctorEnd = parseTimeToMinutes(doctor.workingHoursEnd);
  if (doctorStart === null || doctorEnd === null || doctorEnd <= doctorStart) {
    return TIME_SLOTS[period];
  }

  const [periodStart, periodEnd] = PERIOD_RANGES[period];
  const rangeStart = Math.max(doctorStart, periodStart);
  const rangeEnd = Math.min(doctorEnd, periodEnd);
  if (rangeEnd <= rangeStart) return [];

  const slots: string[] = [];
  for (let minute = rangeStart; minute < rangeEnd; minute += 15) {
    slots.push(formatMinutesToTime(minute));
  }
  return slots;
};

const formatDateForApi = (value: Date | null): string => {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const onlyDigits = (value?: string | null): string => String(value || '').replace(/\D/g, '');
const addDays = (date: Date, amount: number): Date => dayjs(date).add(amount, 'day').toDate();

export function Agendamento() {
  const navigate = useNavigate();
  const location = useLocation();
  const handledPrefillRef = useRef(false);
  const schedulerRef = useRef<HTMLDivElement | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState<string>('marcacao');
  const [, setSchedulingStep] = useState<number>(0);
  const [activeSchedulePeriod, setActiveSchedulePeriod] = useState<'Manhã' | 'Tarde' | 'Noite'>('Manhã');
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>(INITIAL_NOVO_AGENDAMENTO);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgendamentoId, setEditingAgendamentoId] = useState<string | null>(null);
  const computedColorScheme = useComputedColorScheme('dark');
  const isDarkMode = computedColorScheme === 'dark';
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
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [doctorMetaByName, setDoctorMetaByName] = useState<Record<string, DoctorScheduleMeta>>({});
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [insuranceOptions, setInsuranceOptions] = useState<{ value: string; label: string }[]>([]);
  const [insurancesLoading, setInsurancesLoading] = useState(false);
  const [procedureOptions, setProcedureOptions] = useState<{ value: string; label: string }[]>([]);
  const [procedureMetaByName, setProcedureMetaByName] = useState<Record<string, ProcedureMeta>>({});
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [savingAgendamento, setSavingAgendamento] = useState(false);
  const [isManualPatientFlow, setIsManualPatientFlow] = useState(false);
  const [pendingPatient, setPendingPatient] = useState<PendingPatientRegistration>(INITIAL_PENDING_PATIENT);
  const [suggestedOptions, setSuggestedOptions] = useState<SuggestedScheduleOption[]>([]);
  const [selectedSuggestedOptionId, setSelectedSuggestedOptionId] = useState<string | null>(null);
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);
  const [rescheduleSourceId, setRescheduleSourceId] = useState<string | null>(null);

  // Estados para os filtros
  const [especialidade, setEspecialidade] = useState<string | null>(null);
  const [convenio, setConvenio] = useState<string | null>(null);
  const [dataHoraFiltro, setDataHoraFiltro] = useState<Date | null>(new Date());
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);

  // State for date filter picker
  const [pickerOpened, setPickerOpened] = useState(false);
  const [tempDateFilter, setTempDateFilter] = useState<Date | null>(new Date());
  const [viewedDate, setViewedDate] = useState<Date>(new Date());

  dayjs.locale('pt-br');

  const resetSchedulingForm = (keepDate: Date | null = dataHoraFiltro || new Date()) => {
    setNovoAgendamento({
      ...INITIAL_NOVO_AGENDAMENTO,
      data: keepDate,
    });
    setSelectedPatientId(null);
    setSelectedSpecialties([]);
    setIsEditing(false);
    setEditingAgendamentoId(null);
    setSchedulingStep(0);
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setViewedDate(keepDate || new Date());
    setSuggestedOptions([]);
    setSelectedSuggestedOptionId(null);
    setRescheduleSourceId(null);
  };



  const mapApiToAgendamento = (it: any): Agendamento => ({
    id: String(it.id),
    rescheduledFromAppointmentId: it.rescheduledFromAppointmentId || it.rescheduled_from_appointment_id || undefined,
    patientId: it.patientId || it.patient_id || it.patient?.id || undefined,
    pacienteNome: it.patientName || it.patient_name || it.patient?.name || it.pacienteNome || '',
    pacienteCPF: it.patientCpf || it.patient_cpf || it.patient?.cpf || it.pacienteCPF || '',
    medicoNome: it.doctorName || it.doctor_name || it.doctor?.name || it.medicoNome || '',
    especialidade: it.specialty || it.procedure || it.procedureName || it.procedimento || it.especialidade || '',
    convenio: it.convenio || it.insurance || it.healthInsuranceName || '',
    data: normalizeDateOnly(it.date || it.data || ''),
    hora: it.time || it.hora || '',
    tipoConsulta: it.type || it.tipoConsulta || '',
    status: normalizeAppointmentStatus(it.status),
    observacoes: it.observations || it.observacoes || '',
    totem: it.totem ?? undefined,
    durationMinutes: Number.isFinite(Number(it.durationMinutes)) ? Number(it.durationMinutes) : null,
  });

  const getResumoLinha = (agendamento: Agendamento) => {
    const parts = [agendamento.tipoConsulta, agendamento.especialidade].filter(Boolean);
    const base = parts.length ? parts.join(' | ') : '—';
    return agendamento.medicoNome ? `${base} | Dr(a): ${agendamento.medicoNome}` : base;
  };

  const loadAgendamentos = async () => {
    try {
      const data: any = await appointmentService.list({ limit: 2000, offset: 0 });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data?.data)
            ? data.data
            : []));
      setAgendamentos(sortAgendamentosByDateTime(list.map(mapApiToAgendamento)));
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos',
        color: 'red',
      });
    }
  };

  useEffect(() => {
    loadAgendamentos();
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

        const metaByName = list.reduce<Record<string, DoctorScheduleMeta>>((acc, doctor: any) => {
          const name = (doctor.name || doctor.nome || doctor.fullName || '').toString().trim();
          if (!name) return acc;
          acc[name] = {
            id: String(doctor.id ?? doctor.doctorId ?? '').trim() || undefined,
            name,
            workingDays: Array.isArray(doctor.workingDays) ? doctor.workingDays : [],
            workingHoursStart: doctor.workingHoursStart || undefined,
            workingHoursEnd: doctor.workingHoursEnd || undefined,
            specialties: [
              ...(doctor.specialty ? [String(doctor.specialty)] : []),
              ...(Array.isArray(doctor.specialties) ? doctor.specialties.map((item: any) => String(item)) : []),
            ].filter(Boolean),
          };
          return acc;
        }, {});

        setDoctorOptions(options);
        setDoctorMetaByName(metaByName);

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

        const metaByName = list.reduce<Record<string, ProcedureMeta>>((acc, item: any) => {
          const name = (item.name || item.nome || '').toString().trim();
          if (!name) return acc;
          const linkedDoctors = Array.isArray(item.doctors) ? item.doctors : [];
          acc[name] = {
            name,
            durationMinutes: Number.isFinite(Number(item.durationMinutes)) ? Number(item.durationMinutes) : null,
            doctorIds: linkedDoctors
              .map((doctor: any) => String(doctor?.doctorId || doctor?.id || '').trim())
              .filter(Boolean),
            doctorNames: linkedDoctors
              .map((doctor: any) => String(doctor?.doctorName || doctor?.name || '').trim())
              .filter(Boolean),
          };
          return acc;
        }, {});

        setProcedureOptions(options);
        setProcedureMetaByName(metaByName);
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

  const filteredAgendamentos = agendamentos.filter((agendamento) => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || agendamento.pacienteNome.toLowerCase().includes(normalizedSearch)
      || agendamento.pacienteCPF.includes(normalizedSearch)
      || agendamento.medicoNome.toLowerCase().includes(normalizedSearch);

    const normalizedEspecialidade = String(especialidade || '').trim().toLowerCase();
    const matchesEspecialidade = !normalizedEspecialidade
      || agendamento.especialidade.toLowerCase().includes(normalizedEspecialidade)
      || agendamento.tipoConsulta.toLowerCase().includes(normalizedEspecialidade);

    const normalizedConvenio = String(convenio || '').trim().toLowerCase();
    const matchesConvenio = !normalizedConvenio
      || agendamento.convenio.toLowerCase().includes(normalizedConvenio);

    const matchesDate = !dataHoraFiltro
      || dayjs(agendamento.data).isSame(dayjs(dataHoraFiltro), 'day');

    const matchesStatus = !statusFiltro || agendamento.status === statusFiltro;

    return matchesSearch && matchesEspecialidade && matchesConvenio && matchesDate && matchesStatus;
  });

  const handleEditAgendamento = (agendamento: Agendamento) => {
    const appointmentDate = agendamento.data ? new Date(`${agendamento.data}T00:00:00`) : null;
    setNovoAgendamento({
      pacienteId: agendamento.patientId || '',
      pacienteNome: agendamento.pacienteNome || '',
      pacienteCPF: agendamento.pacienteCPF || '',
      especialidade: agendamento.especialidade,
      convenio: agendamento.convenio,
      data: appointmentDate,
      hora: agendamento.hora,
      profissional: agendamento.medicoNome,
      tipoConsulta: agendamento.tipoConsulta,
      informacoes: agendamento.observacoes,
    });
    const specialties = agendamento.especialidade
      ? agendamento.especialidade.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    setSelectedSpecialties(specialties);
    setSelectedPatientId(agendamento.patientId || null);
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setIsEditing(true);
    setEditingAgendamentoId(agendamento.id);
    setRescheduleSourceId(null);
    setActiveTab('marcacao');
    setSchedulingStep(0);
    if (appointmentDate) {
      setDataHoraFiltro(appointmentDate);
      setViewedDate(appointmentDate);
    }
    setTimeout(() => {
      schedulerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleRescheduleAppointment = (agendamento: Agendamento) => {
    const appointmentDate = agendamento.data ? new Date(`${agendamento.data}T00:00:00`) : null;
    setNovoAgendamento({
      pacienteId: agendamento.patientId || '',
      pacienteNome: agendamento.pacienteNome || '',
      pacienteCPF: agendamento.pacienteCPF || '',
      especialidade: agendamento.especialidade,
      convenio: agendamento.convenio,
      data: appointmentDate,
      hora: agendamento.hora,
      profissional: agendamento.medicoNome,
      tipoConsulta: agendamento.tipoConsulta,
      informacoes: agendamento.observacoes,
    });
    const specialties = agendamento.especialidade
      ? agendamento.especialidade.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    setSelectedSpecialties(specialties);
    setSelectedPatientId(agendamento.patientId || null);
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setIsEditing(false);
    setEditingAgendamentoId(null);
    setRescheduleSourceId(agendamento.id);
    setActiveTab('marcacao');
    setSchedulingStep(0);
    if (appointmentDate) {
      setDataHoraFiltro(appointmentDate);
      setViewedDate(appointmentDate);
    }
    setTimeout(() => {
      schedulerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
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

    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
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

  const handleEnableManualPatientFlow = () => {
    setIsManualPatientFlow(true);
    setSelectedPatientId(null);
    setNovoAgendamento((prev) => ({
      ...prev,
      pacienteId: '',
      pacienteNome: pendingPatient.name || '',
      pacienteCPF: pendingPatient.cpf || '',
    }));
  };

  const handlePendingPatientField = <K extends keyof PendingPatientRegistration>(
    field: K,
    value: PendingPatientRegistration[K],
  ) => {
    setPendingPatient((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' || field === 'cpf') {
        setNovoAgendamento((current) => ({
          ...current,
          pacienteNome: field === 'name' ? String(value) : next.name,
          pacienteCPF: field === 'cpf' ? String(value) : next.cpf,
        }));
      }
      return next;
    });
  };

  const ensurePatientForScheduling = async (): Promise<{ patientId?: string; patientName?: string; patientCpf?: string } | null> => {
    if (selectedPatientId) {
      return {
        patientId: selectedPatientId,
        patientName: novoAgendamento.pacienteNome || undefined,
        patientCpf: onlyDigits(novoAgendamento.pacienteCPF) || undefined,
      };
    }

    const manualCpf = onlyDigits(pendingPatient.cpf || novoAgendamento.pacienteCPF);
    const manualName = String(pendingPatient.name || novoAgendamento.pacienteNome || '').trim();

    if (!manualName || manualCpf.length !== 11) {
      showNotification({
        title: 'Dados do paciente',
        message: 'Preencha nome e CPF válidos para seguir com o agendamento.',
        color: 'red',
      });
      return null;
    }

    const existingPatient = Object.values(patientById).find((patient: any) => onlyDigits(patient?.cpf) === manualCpf);
    if (existingPatient?.id) {
      return {
        patientId: String(existingPatient.id),
        patientName: existingPatient.name || manualName,
        patientCpf: manualCpf,
      };
    }

    if (!pendingPatient.birthDate || !pendingPatient.gender || onlyDigits(pendingPatient.cellphone).length < 10) {
      showNotification({
        title: 'Finalize o cadastro',
        message: 'Para um paciente novo, precisamos concluir nascimento, gênero e celular antes de confirmar.',
        color: 'yellow',
      });
      return null;
    }

    try {
      const created = await patientService.createPatient({
        name: manualName,
        cpf: manualCpf,
        birthDate: formatDateForApi(pendingPatient.birthDate),
        gender: pendingPatient.gender,
        cellphone: onlyDigits(pendingPatient.cellphone),
        email: pendingPatient.email || undefined,
        hasHealthInsurance: Boolean(novoAgendamento.convenio),
        healthInsuranceName: novoAgendamento.convenio || undefined,
      });

      const createdId = String(created?.id || created?.patientId || '');
      if (!createdId) {
        throw new Error('Paciente criado sem identificador retornado.');
      }

      const nextPatient = {
        ...created,
        id: createdId,
        name: created?.name || manualName,
        cpf: created?.cpf || manualCpf,
      };

      setPatientById((prev) => ({ ...prev, [createdId]: nextPatient }));
      setPatientOptions((prev) => {
        const label = `${nextPatient.name}${nextPatient.cpf ? ` • ${formatCPF(nextPatient.cpf)}` : ''}`;
        if (prev.some((item) => item.value === createdId)) return prev;
        return [...prev, { value: createdId, label }].sort((a, b) => a.label.localeCompare(b.label));
      });
      setSelectedPatientId(createdId);
      setIsManualPatientFlow(false);
      setNovoAgendamento((prev) => ({
        ...prev,
        pacienteId: createdId,
        pacienteNome: nextPatient.name,
        pacienteCPF: nextPatient.cpf,
      }));

      return {
        patientId: createdId,
        patientName: nextPatient.name,
        patientCpf: nextPatient.cpf,
      };
    } catch (err: any) {
      showNotification({
        title: 'Erro ao finalizar cadastro',
        message: err?.response?.data?.message || err?.message || 'Não foi possível criar o paciente antes do agendamento.',
        color: 'red',
      });
      return null;
    }
  };

  const handleAddAgendamento = async () => {
    if (!novoAgendamento.convenio) {
      showNotification({ title: 'Erro', message: 'Convênio é obrigatório', color: 'red' });
      return;
    }
    if (!novoAgendamento.data) {
      showNotification({ title: 'Erro', message: 'Data é obrigatória', color: 'red' });
      return;
    }
    if (!selectedSpecialties.length) {
      showNotification({ title: 'Erro', message: 'Procedimento é obrigatório', color: 'red' });
      return;
    }
    if (!isMultiProcedureFlow && !novoAgendamento.profissional) {
      showNotification({ title: 'Erro', message: 'Profissional é obrigatório', color: 'red' });
      return;
    }
    if (!isMultiProcedureFlow && !novoAgendamento.hora) {
      showNotification({ title: 'Erro', message: 'Horário é obrigatório', color: 'red' });
      return;
    }
    if (isMultiProcedureFlow && selectedSuggestedSchedules.length !== selectedSpecialties.length) {
      showNotification({ title: 'Erro', message: 'Gere a sugestão de horários próximos antes de confirmar.', color: 'red' });
      return;
    }
    if (isEditing && isMultiProcedureFlow) {
      showNotification({ title: 'Edição em lote', message: 'A edição com múltiplos procedimentos ainda não está disponível.', color: 'yellow' });
      return;
    }

    const resolvedPatient = await ensurePatientForScheduling();
    if (!resolvedPatient) return;

    setSavingAgendamento(true);
    if (isEditing && editingAgendamentoId !== null) {
      const current = agendamentos.find((a) => a.id === editingAgendamentoId);
      try {
        const basePayload = {
          patientId: resolvedPatient.patientId || undefined,
          patientName: resolvedPatient.patientName || undefined,
          patientCpf: resolvedPatient.patientCpf || undefined,
          doctorName: novoAgendamento.profissional || undefined,
          specialty: selectedSpecialties.join(', '),
          durationMinutes: selectedProcedureDuration,
          convenio: novoAgendamento.convenio || undefined,
          date: formatDateForApi(novoAgendamento.data),
          time: novoAgendamento.hora,
          observations: novoAgendamento.informacoes || undefined,
        };
        await appointmentService.update(editingAgendamentoId, {
          ...basePayload,
          patientName: basePayload.patientName || current?.pacienteNome || undefined,
          patientCpf: basePayload.patientCpf || current?.pacienteCPF || undefined,
          status: current?.status || undefined,
          totem: current?.totem,
        });
        await loadAgendamentos();
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
        if (isMultiProcedureFlow) {
          for (const suggestion of selectedSuggestedSchedules) {
            await appointmentService.create({
              patientId: resolvedPatient.patientId || undefined,
              patientName: resolvedPatient.patientName || undefined,
              patientCpf: resolvedPatient.patientCpf || undefined,
              doctorName: suggestion.doctorName,
              specialty: suggestion.procedure,
              durationMinutes: suggestion.durationMinutes,
              convenio: novoAgendamento.convenio || undefined,
              date: formatDateForApi(suggestion.date),
              time: suggestion.time,
              observations: novoAgendamento.informacoes || undefined,
              status: 'AGENDADO',
              totem: Math.floor(Math.random() * 100) + 1,
              rescheduledFromAppointmentId: rescheduleSourceId || undefined,
            });
          }
        } else {
          await appointmentService.create({
            patientId: resolvedPatient.patientId || undefined,
            patientName: resolvedPatient.patientName || undefined,
            patientCpf: resolvedPatient.patientCpf || undefined,
            doctorName: novoAgendamento.profissional || undefined,
            specialty: selectedSpecialties.join(', '),
            durationMinutes: selectedProcedureDuration,
            convenio: novoAgendamento.convenio || undefined,
            date: formatDateForApi(novoAgendamento.data),
            time: novoAgendamento.hora,
            observations: novoAgendamento.informacoes || undefined,
            status: 'AGENDADO',
            totem: Math.floor(Math.random() * 100) + 1,
            rescheduledFromAppointmentId: rescheduleSourceId || undefined,
          });
        }
        await loadAgendamentos();
        showNotification({
          title: 'Agendamento criado',
          message: isMultiProcedureFlow
            ? `${selectedSuggestedSchedules.length} agendamentos criados em sequência com sucesso.`
            : 'Agendamento realizado com sucesso.',
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

    resetSchedulingForm(novoAgendamento.data);
    setActiveTab('agendados');
    setSavingAgendamento(false);
  };

  const handleStatusChange = async (agendamentoId: string, newStatus: string) => {
    const current = agendamentos.find((a) => a.id === agendamentoId);
    if (!current) return;

    try {
      await appointmentService.update(agendamentoId, { status: newStatus });
      await loadAgendamentos();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao atualizar status',
        color: 'red',
      });
    }
  };

  const rows = filteredAgendamentos.map((agendamento) => (
    <Box key={agendamento.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
      {/* Time column - centered */}
      <Box style={{ minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text size="sm" fw={500} c="var(--mantine-color-text)">{agendamento.hora}</Text>
      </Box>

      {/* Vertical separator and main content */}
      <Box onClick={() => handleEditAgendamento(agendamento)} style={{ borderLeft: !isMobile ? '1px solid var(--mantine-color-default-border)' : 'none', paddingLeft: !isMobile ? 16 : 0, flex: 1, cursor: 'pointer' }}>
        <Text fw={600} size="sm">{agendamento.pacienteNome}</Text>
        <Text size="xs" c="dimmed" mt={6}>
          {getResumoLinha(agendamento)}
        </Text>
      </Box>

      {/* Right aligned status */}
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          minWidth: isMobile ? 180 : 320,
          paddingRight: isMobile ? 12 : 20,
        }}
      >
        <Box style={{ minWidth: isMobile ? 170 : 190 }}>
	          <Select
	              data={[
	              { value: 'AGENDADO', label: 'Agendado' },
	              { value: 'CONFIRMADO', label: 'Confirmado' },
	              { value: 'NAO_COMPARECEU', label: 'Não compareceu' },
	              { value: 'REALIZADO', label: 'Realizado' },
	              { value: 'CANCELADO', label: 'Cancelado' },
	            ]}
            value={agendamento.status}
	            onChange={(value) => handleStatusChange(agendamento.id, value || 'AGENDADO')}
	            size="xs"
	            radius="md"
		            w={isMobile ? 170 : 190}
	          />
	        </Box>
        {(agendamento.status === 'NAO_COMPARECEU' || agendamento.status === 'CANCELADO') && (
          <Button
            size="xs"
            variant="light"
            miw={110}
            px="md"
            onClick={() => handleRescheduleAppointment(agendamento)}
          >
            Reagendar
          </Button>
        )}
	      </Box>
	    </Box>
	  ));

  const uniqueDates = Array.from(new Set(filteredAgendamentos.map(a => a.data))).sort();
  const agendamentosByDate = uniqueDates.reduce<Record<string, Agendamento[]>>((acc, date) => {
    acc[date] = filteredAgendamentos.filter(a => a.data === date).sort((x, y) => x.hora.localeCompare(y.hora));
    return acc;
  }, {});

  useEffect(() => {
    if (handledPrefillRef.current) return;

    const state = location.state as { prefillAppointment?: any; source?: string } | null;
    if (!state?.prefillAppointment) return;

    handledPrefillRef.current = true;

    const appt = state.prefillAppointment;
    const specialty = String(appt.specialty || appt.procedure || appt.procedureName || '').trim();
    const specialties = specialty
      ? specialty.split(',').map((item: string) => item.trim()).filter(Boolean)
      : [];

    setSelectedPatientId(appt.patientId || null);
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setNovoAgendamento({
      pacienteId: appt.patientId || '',
      pacienteNome: appt.patientName || '',
      pacienteCPF: appt.patientCpf || '',
      especialidade: specialty,
      convenio: appt.convenio || '',
      data: appt.date ? new Date(`${appt.date}T00:00:00`) : null,
      hora: appt.time || '',
      profissional: appt.doctorName || '',
      tipoConsulta: appt.type || '',
      informacoes: appt.observations || '',
    });
    setSelectedSpecialties(specialties);
    setIsEditing(true);
    setEditingAgendamentoId(String(appt.id || ''));
    setActiveTab('marcacao');
    setSchedulingStep(0);
    if (appt.date) {
      setDataHoraFiltro(new Date(`${appt.date}T00:00:00`));
      setViewedDate(new Date(`${appt.date}T00:00:00`));
    }
    setTimeout(() => {
      schedulerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);

    navigate('/agendamento', { replace: true, state: null });
  }, [location.state, navigate]);

  const schedulingDate = viewedDate || novoAgendamento.data || dataHoraFiltro || new Date();
  const selectedProcedureDuration = Math.max(
    15,
    selectedSpecialties.reduce((total, selected) => {
      const duration = Number(procedureMetaByName[selected]?.durationMinutes);
      return total + (Number.isFinite(duration) && duration > 0 ? duration : 30);
    }, 0) || 30,
  );
  const isMultiProcedureFlow = selectedSpecialties.length > 1;
  const filteredDoctorOptions = doctorOptions.filter((option) => {
    if (selectedSpecialties.length === 0) return true;
    const meta = doctorMetaByName[option.value];
    const doctorId = String(meta?.id || '').trim();
    const doctorSpecialties = (meta?.specialties || []).map(normalizeComparableText);

    return selectedSpecialties.some((selected) => {
      const normalizedSelected = normalizeComparableText(selected);
      const procedureMeta = procedureMetaByName[selected];
      const linkedDoctorIds = (procedureMeta?.doctorIds || []).map((item) => String(item).trim()).filter(Boolean);
      const linkedDoctorNames = (procedureMeta?.doctorNames || []).map(normalizeComparableText);

      if (linkedDoctorIds.length > 0 || linkedDoctorNames.length > 0) {
        const matchesLinkedDoctor =
          (doctorId && linkedDoctorIds.includes(doctorId))
          || linkedDoctorNames.includes(normalizeComparableText(option.value));
        if (matchesLinkedDoctor) return true;
      }

      if (doctorSpecialties.length === 0) return false;
      return doctorSpecialties.some((doctorSpecialty) =>
        doctorSpecialty.includes(normalizedSelected) || normalizedSelected.includes(doctorSpecialty),
      );
    });
  });
  const schedulerDoctors = (() => {
    if (novoAgendamento.profissional) return [novoAgendamento.profissional];
    return filteredDoctorOptions.map((item) => item.value);
  })();
  const getAppointmentsForDate = (date: Date) => agendamentos.filter(
    (item) => item.data === dayjs(date).format('YYYY-MM-DD') && item.status !== 'CANCELADO',
  );
  
  const selectedProcedureSummary = Array.isArray(selectedSpecialties) ? selectedSpecialties : [];
  const selectedPatientCpfDigits = onlyDigits(novoAgendamento.pacienteCPF || pendingPatient.cpf);
  const safeSuggestedOptions = Array.isArray(suggestedOptions) ? suggestedOptions : [];
  const selectedSuggestedOption = safeSuggestedOptions.find((option) => option.id === selectedSuggestedOptionId) || null;
  const selectedSuggestedSchedules = selectedSuggestedOption?.items || [];
  const hasPatientContext = Boolean(
    selectedPatientId || (
      String(novoAgendamento.pacienteNome || pendingPatient.name).trim()
      && onlyDigits(novoAgendamento.pacienteCPF || pendingPatient.cpf).length === 11
    ),
  );
  const pendingPatientReadyForCreation = Boolean(
    pendingPatient.birthDate &&
    pendingPatient.gender &&
    onlyDigits(pendingPatient.cellphone).length >= 10,
  );
  const schedulingReady = Boolean(
    hasPatientContext &&
    novoAgendamento.convenio &&
    selectedProcedureSummary.length > 0 &&
    novoAgendamento.data &&
    (
      (isMultiProcedureFlow && selectedSuggestedSchedules.length === selectedProcedureSummary.length)
      || (!isMultiProcedureFlow && novoAgendamento.profissional && novoAgendamento.hora)
    ) &&
    (!isManualPatientFlow || pendingPatientReadyForCreation),
  );
  
  const safeSchedulerDoctors = Array.isArray(schedulerDoctors) ? schedulerDoctors : [];
  const doctorSlotsByName = safeSchedulerDoctors.reduce<Record<string, string[]>>((acc, doctorName) => {
    acc[doctorName] = buildDoctorSlots(doctorMetaByName[doctorName], activeSchedulePeriod, schedulingDate);
    return acc;
  }, {});
  const findOverlappingAppointment = (
    doctorName: string,
    slotStartMinute: number,
    slotEndMinute: number,
    date: Date = schedulingDate,
    ignoreAppointmentId?: string | null,
  ) => {
    const doctorAppointments = getAppointmentsForDate(date).filter((item) => item.medicoNome === doctorName);
    return doctorAppointments.find((item) => {
      if (ignoreAppointmentId && item.id === ignoreAppointmentId) return false;
      const startMinute = parseTimeToMinutes(item.hora);
      const duration = Math.max(15, Number(item.durationMinutes) || 30);
      if (startMinute === null) return false;
      const endMinute = startMinute + duration;
      return slotStartMinute < endMinute && slotEndMinute > startMinute;
    });
  };
  const patientHasConflict = (
    slotStartMinute: number,
    slotEndMinute: number,
    date: Date = schedulingDate,
    ignoreAppointmentId?: string | null,
  ) => {
    if (!selectedPatientId && !selectedPatientCpfDigits) return false;
    return getAppointmentsForDate(date).some((item) => {
      if (ignoreAppointmentId && item.id === ignoreAppointmentId) return false;
      const samePatient =
        (selectedPatientId && item.patientId === selectedPatientId)
        || (selectedPatientCpfDigits && onlyDigits(item.pacienteCPF) === selectedPatientCpfDigits);
      if (!samePatient) return false;
      const startMinute = parseTimeToMinutes(item.hora);
      const duration = Math.max(15, Number(item.durationMinutes) || 30);
      if (startMinute === null) return false;
      const endMinute = startMinute + duration;
      return slotStartMinute < endMinute && slotEndMinute > startMinute;
    });
  };
  const slotSupportsDuration = (
    doctorName: string,
    slot: string,
    durationMinutes: number,
    date: Date = schedulingDate,
    ignoreAppointmentId?: string | null,
  ) => {
    const slotStartMinute = parseTimeToMinutes(slot);
    if (slotStartMinute === null) return false;

    const slotEndMinute = slotStartMinute + durationMinutes;
    const period = resolveTurnoFromTime(slot) || activeSchedulePeriod;
    const [, periodEnd] = PERIOD_RANGES[period];
    if (slotEndMinute > periodEnd) return false;

    const doctorMeta = doctorMetaByName[doctorName];
    const doctorEndMinute = parseTimeToMinutes(doctorMeta?.workingHoursEnd);
    if (doctorEndMinute !== null && slotEndMinute > doctorEndMinute) return false;

    if (findOverlappingAppointment(doctorName, slotStartMinute, slotEndMinute, date, ignoreAppointmentId)) return false;
    if (patientHasConflict(slotStartMinute, slotEndMinute, date, ignoreAppointmentId)) return false;
    return true;
  };
  const slotSupportsProcedureDuration = (doctorName: string, slot: string, date: Date = schedulingDate) =>
    slotSupportsDuration(doctorName, slot, selectedProcedureDuration, date, editingAgendamentoId);
  const flattenedScheduleSlots = safeSchedulerDoctors
    .flatMap((doctor) => {
      const doctorSlots = doctorSlotsByName[doctor] || [];
      return doctorSlots.map((slot) => {
        const slotStartMinute = parseTimeToMinutes(slot) || 0;
        const currentAppointment = findOverlappingAppointment(doctor, slotStartMinute, slotStartMinute + 15);
        const isSelected = novoAgendamento.profissional === doctor && novoAgendamento.hora === slot;
        const isOccupied = Boolean(currentAppointment);
        const durationFits = slotSupportsProcedureDuration(doctor, slot);
        const isTooShort = !isOccupied && !durationFits;
        return {
          key: `${doctor}-${slot}`,
          doctor,
          slot,
          isSelected,
          isOccupied,
          isTooShort,
          minute: slotStartMinute,
        };
      });
    })
    .filter((item) => !item.isOccupied && !item.isTooShort)
    .sort((a, b) => (a.minute - b.minute) || a.doctor.localeCompare(b.doctor));
  const dateHasAvailability = (date: Date) => {
    return schedulerDoctors.some((doctor) => {
      const doctorSlots = buildDoctorSlots(doctorMetaByName[doctor], activeSchedulePeriod, date);
      return doctorSlots.some((slot) => slotSupportsProcedureDuration(doctor, slot, date));
    });
  };
  const getProcedureDuration = (procedureName: string): number => {
    const duration = Number(procedureMetaByName[procedureName]?.durationMinutes);
    return Math.max(15, Number.isFinite(duration) && duration > 0 ? duration : 30);
  };
  const getCompatibleDoctorsForProcedure = (procedureName: string): string[] => {
    const normalizedSelected = normalizeComparableText(procedureName);
    const procedureMeta = procedureMetaByName[procedureName];
    const linkedDoctorIds = (procedureMeta?.doctorIds || []).map((item) => String(item).trim()).filter(Boolean);
    const linkedDoctorNames = (procedureMeta?.doctorNames || []).map(normalizeComparableText);

    return doctorOptions
      .filter((option) => {
        if (novoAgendamento.profissional && option.value !== novoAgendamento.profissional) return false;

        const meta = doctorMetaByName[option.value];
        const doctorId = String(meta?.id || '').trim();
        const doctorSpecialties = (meta?.specialties || []).map(normalizeComparableText);

        if (linkedDoctorIds.length > 0 || linkedDoctorNames.length > 0) {
          return (
            (doctorId && linkedDoctorIds.includes(doctorId))
            || linkedDoctorNames.includes(normalizeComparableText(option.value))
          );
        }

        return doctorSpecialties.some((doctorSpecialty) =>
          doctorSpecialty.includes(normalizedSelected) || normalizedSelected.includes(doctorSpecialty),
        );
      })
      .map((option) => option.value);
  };
  const getAllDoctorSlotsForDate = (doctorName: string, date: Date): string[] => {
    const merged = (['Manhã', 'Tarde', 'Noite'] as const).flatMap((period) =>
      buildDoctorSlots(doctorMetaByName[doctorName], period, date),
    );
    return Array.from(new Set(merged)).sort((a, b) => (parseTimeToMinutes(a) || 0) - (parseTimeToMinutes(b) || 0));
  };
  const findSuggestedSchedules = (): SuggestedScheduleOption[] => {
    const procedureNames = [...selectedSpecialties];
    if (procedureNames.length <= 1) return [];

    type Candidate = SuggestedProcedureSchedule & { start: number; end: number };
    type Assigned = Candidate[];

    const overlapsAssigned = (candidate: Candidate, assigned: Assigned) =>
      assigned.some((item) => {
        const sameDoctorConflict = item.doctorName === candidate.doctorName && candidate.start < item.end && candidate.end > item.start;
        const samePatientConflict = candidate.start < item.end && candidate.end > item.start;
        return sameDoctorConflict || samePatientConflict;
      });

    const scoreAssigned = (assigned: Assigned) => {
      const ordered = [...assigned].sort((a, b) => a.start - b.start);
      return ordered.reduce((score, item, index) => {
        if (index === 0) return score;
        const previous = ordered[index - 1];
        return score + Math.max(0, item.start - previous.end);
      }, 0);
    };

    const searchForDate = (date: Date): SuggestedScheduleOption[] => {
      const candidatesByProcedure = procedureNames.reduce<Record<string, Candidate[]>>((acc, procedureName) => {
        const durationMinutes = getProcedureDuration(procedureName);
        const doctors = getCompatibleDoctorsForProcedure(procedureName);
        const candidates = doctors.flatMap((doctorName) =>
          getAllDoctorSlotsForDate(doctorName, date)
            .filter((slot) => slotSupportsDuration(doctorName, slot, durationMinutes, date, editingAgendamentoId))
            .map((slot) => {
              const start = parseTimeToMinutes(slot) || 0;
              return {
                procedure: procedureName,
                doctorName,
                date,
                time: slot,
                durationMinutes,
                start,
                end: start + durationMinutes,
              };
            }),
        ).sort((a, b) => a.start - b.start);

        acc[procedureName] = candidates;
        return acc;
      }, {});

      if (Object.values(candidatesByProcedure).some((items) => items.length === 0)) return [];

      const procedureOrder = [...procedureNames].sort(
        (a, b) => (candidatesByProcedure[a]?.length || 0) - (candidatesByProcedure[b]?.length || 0),
      );

      const foundOptions: Array<{ assigned: Assigned; score: number }> = [];

      const dfs = (index: number, assigned: Assigned) => {
        if (index >= procedureOrder.length) {
          const currentScore = scoreAssigned(assigned);
          foundOptions.push({ assigned: [...assigned], score: currentScore });
          return;
        }

        const procedureName = procedureOrder[index];
        const candidates = candidatesByProcedure[procedureName] || [];
        const orderedAssigned = [...assigned].sort((a, b) => a.start - b.start);
        const lastEnd = orderedAssigned.length > 0 ? orderedAssigned[orderedAssigned.length - 1].end : null;

        for (const candidate of candidates) {
          if (lastEnd !== null && candidate.start < lastEnd) continue;
          if (lastEnd !== null && candidate.start - lastEnd > 180) continue;
          if (overlapsAssigned(candidate, assigned)) continue;

          assigned.push(candidate);
          dfs(index + 1, assigned);
          assigned.pop();
        }
      };

      dfs(0, []);
      if (!foundOptions.length) return [];

      return foundOptions
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map((option, index) => {
          const byProcedure = option.assigned.reduce<Record<string, Candidate>>((acc, item) => {
            acc[item.procedure] = item;
            return acc;
          }, {});

          return {
            id: `${dayjs(date).format('YYYYMMDD')}-${index}`,
            totalWaitMinutes: option.score,
            items: procedureNames.map((procedureName) => ({
              procedure: procedureName,
              doctorName: byProcedure[procedureName].doctorName,
              date: byProcedure[procedureName].date,
              time: byProcedure[procedureName].time,
              durationMinutes: byProcedure[procedureName].durationMinutes,
            })),
          };
        });
    };

    for (let offset = 0; offset <= 14; offset += 1) {
      const candidateDate = addDays(schedulingDate, offset);
      const found = searchForDate(candidateDate);
      if (found.length > 0) return found;
    }

    return [];
  };
  const handleGenerateSuggestedSchedules = async () => {
    if (selectedSpecialties.length <= 1) return;
    setGeneratingSuggestion(true);
    try {
      const result = findSuggestedSchedules();
      if (result.length === 0) {
        setSuggestedOptions([]);
        setSelectedSuggestedOptionId(null);
        showNotification({
          title: 'Sem sugestão disponível',
          message: 'Não encontramos uma sequência próxima para os procedimentos selecionados nos próximos 15 dias.',
          color: 'yellow',
        });
        return;
      }

      setSuggestedOptions(result);
      setSelectedSuggestedOptionId(result[0].id);
      const first = result[0].items[0];
      setViewedDate(first.date);
      setNovoAgendamento((prev) => ({
        ...prev,
        data: first.date,
        profissional: '',
        hora: '',
      }));
      showNotification({
        title: 'Sugestão pronta',
        message: `${result.length} opção(ões) geradas com foco no menor tempo de espera total.`,
        color: 'green',
      });
    } finally {
      setGeneratingSuggestion(false);
    }
  };
  const goToSchedulingDate = (date: Date) => {
    setViewedDate(date);
    setNovoAgendamento((prev) => ({
      ...prev,
      data: date,
      hora: prev.data && dayjs(prev.data).isSame(dayjs(date), 'day') ? prev.hora : '',
      profissional: prev.data && dayjs(prev.data).isSame(dayjs(date), 'day') ? prev.profissional : '',
    }));
  };
  const goToNextAvailableDate = () => {
    for (let offset = 1; offset <= 30; offset += 1) {
      const candidate = addDays(schedulingDate, offset);
      if (dateHasAvailability(candidate)) {
        goToSchedulingDate(candidate);
        showNotification({
          title: 'Próxima disponibilidade encontrada',
          message: `Mostrando agenda de ${dayjs(candidate).format('DD/MM/YYYY')}.`,
          color: 'blue',
        });
        return;
      }
    }

    showNotification({
      title: 'Sem disponibilidade',
      message: 'Não encontramos horários disponíveis nos próximos 30 dias para esse turno.',
      color: 'yellow',
    });
  };
  const schedulingDateHasAvailability = dateHasAvailability(schedulingDate);

  useEffect(() => {
    if (!novoAgendamento.profissional) return;
    const stillAvailable = filteredDoctorOptions.some((option) => option.value === novoAgendamento.profissional);
    if (!stillAvailable) {
      setNovoAgendamento((prev) => ({
        ...prev,
        profissional: '',
        hora: '',
      }));
    }
  }, [filteredDoctorOptions, novoAgendamento.profissional]);

  useEffect(() => {
    setSuggestedOptions([]);
    setSelectedSuggestedOptionId(null);
  }, [selectedSpecialties, novoAgendamento.profissional, viewedDate, selectedPatientId, novoAgendamento.convenio]);

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

        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'marcacao')} variant="default">
          <Tabs.List mb="lg">
            <Tabs.Tab value="marcacao">Marcação</Tabs.Tab>
            <Tabs.Tab value="agendados">Agenda</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="marcacao">

        <Box ref={schedulerRef}>
          <Paper
            p={isMobile ? 'md' : 'lg'}
            radius="md"
            withBorder
            bg={isDarkMode ? 'var(--mantine-color-body)' : 'var(--mantine-color-default)'}
            style={{ borderColor: 'var(--mantine-color-default-border)' }}
            mb={isMobile ? 20 : 28}
          >
            <Stack
              gap="xl"
              style={{
                position: 'relative',
                paddingLeft: isMobile ? 22 : 30,
                paddingRight: isMobile ? 4 : 8,
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap" style={{ position: 'relative', zIndex: 1, marginLeft: isMobile ? -8 : -10 }}>
                <Group gap="xs">
                  <Badge circle color="blue" variant="filled" size="lg">1</Badge>
                  <Box>
                    <Text fw={700} size="lg">Dados cadastrais</Text>
                    <Text size="sm" c="dimmed">Dados do paciente</Text>
                  </Box>
                </Group>

                <Button
                  bg={DARK_BLUE}
                  leftSection={<Plus size={14} />}
                  onClick={handleEnableManualPatientFlow}
                >
                  Novo paciente
                </Button>
              </Group>

              <Box
                ml={isMobile ? 6 : 4}
                h={26}
                style={{ borderLeft: '1px solid rgba(120, 158, 230, 0.45)' }}
              />

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <FloatingSelect
                  label="Nome completo"
                  placeholder={patientsLoading ? 'Carregando pacientes...' : 'Selecione o paciente'}
                  data={patientOptions}
                  value={selectedPatientId}
                  onChange={handleSelectPatient}
                  searchable
                  clearable
                  nothingFoundMessage="Nenhum paciente encontrado"
                  disabled={patientsLoading || isManualPatientFlow}
                />
                <FloatingInput
                  label="CPF"
                  value={novoAgendamento.pacienteCPF || pendingPatient.cpf}
                  onChange={(e) => {
                    if (!isManualPatientFlow) return;
                    handlePendingPatientField('cpf', formatCPF(e.currentTarget.value));
                  }}
                  readOnly={!isManualPatientFlow}
                />
              </SimpleGrid>

              {isManualPatientFlow && (
                <FloatingInput
                  label="Paciente novo"
                  placeholder="Digite o nome do paciente"
                  value={pendingPatient.name}
                  onChange={(e) => handlePendingPatientField('name', e.currentTarget.value)}
                />
              )}

              <Text fw={600} size="md">Dados do convênio</Text>
              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
                <FloatingSelect
                  label="Tipo do convênio*"
                  placeholder={insurancesLoading ? 'Carregando convênios...' : 'Selecione o convênio'}
                  data={insuranceOptions}
                  value={novoAgendamento.convenio}
                  onChange={(value) => setNovoAgendamento({ ...novoAgendamento, convenio: value || '' })}
                  searchable
                  clearable
                  disabled={insurancesLoading}
                  nothingFoundMessage="Nenhum convênio encontrado"
                />
                <FloatingInput
                  label="Número da carteirinha"
                  value={String(patientById[selectedPatientId || '']?.healthInsuranceNumber || patientById[selectedPatientId || '']?.insuranceCardNumber || '')}
                  readOnly
                />
                <FloatingInput
                  label="Data de validade"
                  value={patientById[selectedPatientId || '']?.healthInsuranceValidity ? dayjs(patientById[selectedPatientId || '']?.healthInsuranceValidity).format('MM/YY') : ''}
                  readOnly
                />
                <FloatingInput
                  label="Status"
                  value={novoAgendamento.convenio ? 'Ativo' : ''}
                  readOnly
                />
              </SimpleGrid>

              <Text fw={600} size="md">Dados do agendamento</Text>
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <FloatingMultiSelect
                  label="Procedimento"
                  placeholder={proceduresLoading ? 'Carregando procedimentos...' : 'Selecione os procedimentos'}
                  data={procedureOptions}
                  value={selectedSpecialties}
                  onChange={setSelectedSpecialties}
                  searchable
                  clearable
                  disabled={proceduresLoading}
                  nothingFoundMessage="Nenhum procedimento encontrado"
                />
                <FloatingDateInput
                  label="Data da marcação"
                  placeholder="Selecione a data"
                  value={novoAgendamento.data}
                  onChange={(value) => {
                    const nextDate = value ? new Date(value) : null;
                    setNovoAgendamento({ ...novoAgendamento, data: nextDate });
                    setDataHoraFiltro(nextDate);
                    if (nextDate) setViewedDate(nextDate);
                  }}
                  rightSection={<Calendar size={16} />}
                  valueFormat="DD/MM/YYYY"
                  locale="pt-br"
                />
                <FloatingSelect
                  label="Profissional"
                  placeholder={doctorsLoading ? 'Carregando médicos...' : 'Selecione se quiser filtrar por um profissional'}
                  data={filteredDoctorOptions}
                  value={novoAgendamento.profissional}
                  onChange={(value) => setNovoAgendamento({ ...novoAgendamento, profissional: value || '' })}
                  searchable
                  clearable
                  disabled={doctorsLoading}
                  nothingFoundMessage="Nenhum médico compatível com o procedimento encontrado"
                />
              </SimpleGrid>

              <FloatingTextarea
                label="Observações"
                placeholder="Alguma observação importante para a recepção ou profissional"
                minRows={2}
                value={novoAgendamento.informacoes}
                onChange={(e) => setNovoAgendamento({ ...novoAgendamento, informacoes: e.currentTarget.value })}
              />

              <Group gap="xs">
                {selectedProcedureSummary.length > 0 ? (
                  selectedProcedureSummary.map((item) => (
                    <Badge key={item} variant="light" color="blue" radius="xl" size="lg">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">Nenhum procedimento selecionado ainda.</Text>
                )}
              </Group>

              <Group gap="xs" style={{ position: 'relative', zIndex: 1, marginLeft: isMobile ? -8 : -10 }}>
                <Badge circle color="blue" variant="filled" size="lg">2</Badge>
                <Box>
                  <Text fw={700} size="lg">Horários</Text>
                  <Text size="sm" c="dimmed">Disponibilidade de horários</Text>
                </Box>
              </Group>

              <Box
                ml={isMobile ? 6 : 4}
                h={26}
                style={{ borderLeft: '1px solid rgba(120, 158, 230, 0.45)' }}
              />

              <Group gap="sm" wrap="wrap">
                <ActionIcon variant="light" onClick={() => goToSchedulingDate(addDays(schedulingDate, -1))} aria-label="Dia anterior">
                  <ChevronLeft size={16} />
                </ActionIcon>
                <Group
                  gap={6}
                  px="sm"
                  py={6}
                  style={{
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                    minWidth: 132,
                  }}
                >
                  <Calendar size={14} />
                  <Text fw={600} size="md">
                    {dayjs(schedulingDate).format('DD/MM/YYYY')}
                  </Text>
                </Group>
                <ActionIcon variant="light" onClick={() => goToSchedulingDate(addDays(schedulingDate, 1))} aria-label="Próximo dia">
                  <ChevronRight size={16} />
                </ActionIcon>
                <FloatingSelect
                  label="Turno"
                  data={(['Manhã', 'Tarde', 'Noite'] as const).map((turnoLabel) => ({ value: turnoLabel, label: turnoLabel }))}
                  value={activeSchedulePeriod}
                  onChange={(value) => setActiveSchedulePeriod((value as 'Manhã' | 'Tarde' | 'Noite') || 'Manhã')}
                  containerProps={{ w: 140 }}
                />
                <FloatingSelect
                  label="Profissional"
                  data={[{ value: '', label: 'Todos os profissionais' }, ...filteredDoctorOptions]}
                  value={novoAgendamento.profissional}
                  onChange={(value) => setNovoAgendamento((prev) => ({ ...prev, profissional: value || '' }))}
                  containerProps={{ w: 260 }}
                />
              </Group>

              {safeSchedulerDoctors.length === 0 ? (
                <Paper
                  p="xl"
                  radius="lg"
                  bg={isDarkMode ? 'transparent' : 'rgba(255,255,255,0.02)'}
                  style={{
                    border: isDarkMode ? '1px solid rgba(120, 158, 230, 0.18)' : undefined,
                  }}
                >
                  <Text ta="center" c="dimmed">
                    Nenhum médico compatível com os procedimentos escolhidos está disponível para esta visualização.
                  </Text>
                </Paper>
              ) : (
                <Stack gap="md">
                  {isMultiProcedureFlow && (
                    <Paper
                      p="md"
                      radius="lg"
                      bg={isDarkMode ? 'transparent' : 'rgba(0, 31, 84, 0.18)'}
                      style={{
                        border: isDarkMode ? '1px solid rgba(120, 158, 230, 0.18)' : undefined,
                      }}
                    >
                      <Group justify="space-between" align="center" wrap="wrap">
                        <Box>
                          <Text fw={700}>Sugestão inteligente para múltiplos procedimentos</Text>
                          <Text size="sm" c="dimmed">
                            Vamos tentar encaixar os procedimentos no mesmo dia e com o menor intervalo possível entre eles.
                          </Text>
                        </Box>
                        <Button bg={DARK_BLUE} onClick={handleGenerateSuggestedSchedules} loading={generatingSuggestion}>
                          Sugerir horários próximos
                        </Button>
                      </Group>

                      {suggestedOptions.length > 0 && (
                        <Stack gap="sm" mt="md">
                          {safeSuggestedOptions.map((option, optionIndex) => {
                            const isSelected = selectedSuggestedOptionId === option.id;
                            return (
                              <Paper
                                key={option.id}
                                p="sm"
                                radius="md"
                                bg={
                                  isSelected
                                    ? (isDarkMode ? 'rgba(18, 184, 134, 0.10)' : 'rgba(18, 184, 134, 0.08)')
                                    : (isDarkMode ? 'transparent' : 'rgba(255,255,255,0.02)')
                                }
                                style={{ border: `1px solid ${isSelected ? 'var(--mantine-color-teal-5)' : 'var(--mantine-color-default-border)'}` }}
                              >
                                <Group justify="space-between" align="center" wrap="wrap" mb="sm">
                                  <Box>
                                    <Text fw={700}>Opção {optionIndex + 1}</Text>
                                    <Text size="sm" c="dimmed">
                                      Espera total: {option.totalWaitMinutes} min
                                    </Text>
                                  </Box>
                                  <Button
                                    size="xs"
                                    variant={isSelected ? 'filled' : 'light'}
                                    color={isSelected ? 'teal' : 'blue'}
                                    onClick={() => setSelectedSuggestedOptionId(option.id)}
                                  >
                                    {isSelected ? 'Opção selecionada' : 'Escolher opção'}
                                  </Button>
                                </Group>

                                <Stack gap="xs">
                                  {option.items.map((item) => (
                                    <Paper
                                      key={`${option.id}-${item.procedure}-${item.doctorName}-${item.time}`}
                                      p="sm"
                                      radius="md"
                                      bg={isDarkMode ? 'transparent' : 'rgba(255,255,255,0.02)'}
                                      style={{
                                        border: isDarkMode ? '1px solid rgba(120, 158, 230, 0.14)' : undefined,
                                      }}
                                    >
                                      <Group justify="space-between" wrap="wrap">
                                        <Box>
                                          <Text fw={700}>{item.procedure}</Text>
                                          <Text size="sm" c="dimmed">{item.doctorName}</Text>
                                        </Box>
                                        <Group gap="xs">
                                          <Badge color="blue" variant="light">{dayjs(item.date).format('DD/MM')}</Badge>
                                          <Badge color="teal" variant="light">{item.time}</Badge>
                                          <Badge color="gray" variant="light">{item.durationMinutes} min</Badge>
                                        </Group>
                                      </Group>
                                    </Paper>
                                  ))}
                                </Stack>
                              </Paper>
                            );
                          })}
                        </Stack>
                      )}
                    </Paper>
                  )}

                  {!schedulingDateHasAvailability && (
                    <Paper
                      p="md"
                      radius="lg"
                      bg={isDarkMode ? 'rgba(250, 176, 5, 0.06)' : 'rgba(250, 176, 5, 0.08)'}
                      style={{ border: '1px solid rgba(250, 176, 5, 0.28)' }}
                    >
                      <Group justify="space-between" align="center" wrap="wrap">
                        <Box>
                          <Text fw={700}>Nenhuma disponibilidade nesse dia</Text>
                          <Text size="sm" c="dimmed">
                            Podemos procurar o próximo dia com vaga nesse mesmo turno para não quebrar o fluxo da marcação.
                          </Text>
                        </Box>
                        <Button variant="light" color="yellow" onClick={goToNextAvailableDate}>
                          Buscar próximo dia com vaga
                        </Button>
                      </Group>
                    </Paper>
                  )}

                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
                    {flattenedScheduleSlots.map((slotItem) => (
                      <UnstyledButton
                        key={slotItem.key}
                        onClick={() => {
                          if (isMultiProcedureFlow) return;
                          setNovoAgendamento((prev) => ({
                            ...prev,
                            profissional: slotItem.doctor,
                            hora: slotItem.slot,
                            data: schedulingDate,
                          }));
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${
                            slotItem.isSelected
                              ? (isDarkMode ? 'rgba(66, 180, 255, 0.75)' : 'rgba(16, 99, 212, 0.48)')
                              : (isDarkMode ? 'rgba(66, 180, 255, 0.18)' : 'rgba(15, 23, 42, 0.12)')
                          }`,
                          background: slotItem.isSelected
                            ? (isDarkMode ? 'rgba(0, 70, 170, 0.45)' : 'rgba(219, 234, 254, 0.95)')
                            : (isDarkMode ? 'rgba(0, 70, 170, 0.30)' : '#ffffff'),
                          cursor: isMultiProcedureFlow ? 'not-allowed' : 'pointer',
                          boxShadow: isDarkMode ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.04)',
                        }}
                      >
                        <Group justify="space-between" align="center" wrap="nowrap" mb={6}>
                          <Group gap={6}>
                            <Clock3 size={16} />
                            <Text fw={700} size="xl" lh={1}>{slotItem.slot}</Text>
                          </Group>
                                          {slotItem.isSelected ? (
                                            <Badge
                                              color="teal"
                                              variant="light"
                                              radius="xl"
                                            >
                                              SELECIONADO
                                            </Badge>
                                          ) : null}
                        </Group>
                        <Group gap={6} wrap="nowrap">
                          <User size={14} />
                          <Text size="sm" c={isDarkMode ? 'rgba(255,255,255,0.78)' : 'rgba(15, 23, 42, 0.72)'} truncate>
                            {slotItem.doctor}
                          </Text>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                </Stack>
              )}

              <Group gap="xs" style={{ position: 'relative', zIndex: 1, marginLeft: isMobile ? -8 : -10 }}>
                <Badge circle color="blue" variant="filled" size="lg">3</Badge>
                <Box>
                  <Text fw={700} size="lg">Revisão</Text>
                  <Text size="sm" c="dimmed">Revisão e confirmação</Text>
                </Box>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <FloatingInput label="Nome completo" value={novoAgendamento.pacienteNome || ''} readOnly />
              <FloatingInput label="Convênio" value={novoAgendamento.convenio || ''} readOnly />
              <FloatingInput label="Procedimento" value={selectedProcedureSummary.join(', ')} readOnly />
              <FloatingInput label="Data" value={novoAgendamento.data ? dayjs(novoAgendamento.data).format('DD/MM/YYYY') : ''} readOnly />
              <FloatingInput label="Horário" value={novoAgendamento.hora || selectedSuggestedSchedules[0]?.time || ''} readOnly />
              <FloatingInput label="Profissional respons." value={novoAgendamento.profissional || selectedSuggestedSchedules[0]?.doctorName || ''} readOnly />
              </SimpleGrid>

              {isManualPatientFlow && (
                <Paper
                  p="md"
                  radius="lg"
                  bg={isDarkMode ? 'transparent' : 'rgba(0, 31, 84, 0.18)'}
                  style={{
                    border: isDarkMode ? '1px solid rgba(120, 158, 230, 0.18)' : undefined,
                  }}
                >
                  <Text fw={700} mb="sm">Finalizar cadastro do paciente</Text>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <FloatingDateInput
                      label="Data de nascimento"
                      placeholder="Selecione"
                      value={pendingPatient.birthDate}
                      onChange={(value) => handlePendingPatientField('birthDate', value ? new Date(value) : null)}
                      rightSection={<Calendar size={16} />}
                      valueFormat="DD/MM/YYYY"
                      locale="pt-br"
                    />
                    <FloatingSelect
                      label="Gênero"
                      placeholder="Selecione"
                      data={[
                        { value: 'MALE', label: 'Masculino' },
                        { value: 'FEMALE', label: 'Feminino' },
                        { value: 'OTHER', label: 'Outro' },
                      ]}
                      value={pendingPatient.gender}
                      onChange={(value) => handlePendingPatientField('gender', value || '')}
                    />
                    <FloatingInput
                      label="Celular"
                      placeholder="Digite o celular"
                      value={pendingPatient.cellphone}
                      onChange={(e) => handlePendingPatientField('cellphone', e.currentTarget.value)}
                    />
                    <FloatingInput
                      label="E-mail"
                      placeholder="Opcional"
                      value={pendingPatient.email}
                      onChange={(e) => handlePendingPatientField('email', e.currentTarget.value)}
                    />
                  </SimpleGrid>
                </Paper>
              )}

              <Group justify="space-between">
                <Button variant="default" onClick={() => resetSchedulingForm(dataHoraFiltro || new Date())}>
                  Limpar fluxo
                </Button>
                <Button
                  bg={DARK_BLUE}
                  onClick={handleAddAgendamento}
                  loading={savingAgendamento}
                  disabled={!schedulingReady || savingAgendamento}
                >
                  {isEditing ? 'Salvar alterações' : 'Confirmar Marcação'}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Box>

          </Tabs.Panel>

          <Tabs.Panel value="agendados">

        <Box mb="md">
          <Text size={isMobile ? 'lg' : 'xl'} fw={700}>Agenda existente</Text>
          <Text size="sm" c="dimmed">
            Aqui a gente consulta, filtra e ajusta os agendamentos já criados.
          </Text>
        </Box>

        {/* Search and Button Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end" wrap="nowrap">
            {/* Filtros */}
            <Select
              label="Especialidade"
              placeholder={proceduresLoading ? 'Carregando procedimentos...' : 'Selecione'}
              data={procedureOptions}
              value={especialidade}
              onChange={setEspecialidade}
              searchable
              clearable
              disabled={proceduresLoading}
              nothingFoundMessage="Nenhum procedimento encontrado"
              style={{ minWidth: 220 }}
            />

            <Select
              label="Convênio"
              placeholder={insurancesLoading ? 'Carregando convênios...' : 'Selecione'}
              data={insuranceOptions}
              value={convenio}
              onChange={setConvenio}
              searchable
              clearable
              disabled={insurancesLoading}
              nothingFoundMessage="Nenhum convênio encontrado"
              style={{ minWidth: 220 }}
            />

            <Popover 
              opened={pickerOpened} 
              onChange={setPickerOpened}
              position="bottom-start"
              withArrow
              shadow="md"
              width={320}
              trapFocus
            >
              <Popover.Target>
                <TextInput
                  label="Data"
                  placeholder="Selecione a data"
                  value={dataHoraFiltro ? dayjs(dataHoraFiltro).format('DD/MM/YYYY') : ''}
                  onClick={() => {
                    const initialDate = dataHoraFiltro || new Date();
                    setTempDateFilter(initialDate);
                    setViewedDate(initialDate);
                    setPickerOpened(true);
                  }}
                  leftSection={<Calendar size={16} />}
                  readOnly
                  variant="unstyled"
                />
              </Popover.Target>
              <Popover.Dropdown p="md">
                <Stack gap="md">
                  <MantineCalendar
                    date={viewedDate}
                    onDateChange={(date) => setViewedDate(new Date(date))}
                    locale="pt-br"
                    size="md"
                    styles={{
                      day: { borderRadius: '50%' },
                    }}
                    getDayProps={(date) => ({
                      onClick: () => {
                        const d = new Date(date);
                        setTempDateFilter(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
                      },
                      selected: tempDateFilter ? dayjs(date).isSame(tempDateFilter, 'day') : false,
                    })}
                  />

                  <Group justify="space-between" gap="xs">
                    <Button
                      variant="outline"
                      size="xs"
                      color="gray"
                      onClick={() => {
                        const today = new Date();
                        setTempDateFilter(today);
                        setViewedDate(today);
                      }}
                    >
                      Hoje
                    </Button>
                    <Group gap="xs">
                      <Button
                        variant="subtle"
                        size="xs"
                        color="gray"
                        onClick={() => {
                          setTempDateFilter(null);
                          setDataHoraFiltro(null);
                          setPickerOpened(false);
                        }}
                      >
                        Limpar
                      </Button>
                      <Button variant="default" size="xs" onClick={() => setPickerOpened(false)}>
                        Cancelar
                      </Button>
                      <Button
                        size="xs"
                        bg={DARK_BLUE}
                        onClick={() => {
                          setDataHoraFiltro(tempDateFilter);
                          setPickerOpened(false);
                        }}
                      >
                        Aplicar
                      </Button>
                    </Group>
                  </Group>
                </Stack>
              </Popover.Dropdown>
            </Popover>

            <Select
              label="Status"
              placeholder="Selecione"
              data={[
                { value: 'AGENDADO', label: 'Agendado' },
                { value: 'CONFIRMADO', label: 'Confirmado' },
                { value: 'NAO_COMPARECEU', label: 'Não compareceu' },
                { value: 'REALIZADO', label: 'Realizado' },
                { value: 'CANCELADO', label: 'Cancelado' },
              ]}
              value={statusFiltro}
              onChange={setStatusFiltro}
              clearable
              style={{ minWidth: 180 }}
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
        <Box style={{ overflowX: 'auto', border: '1px solid var(--mantine-color-default-border)', borderRadius: 6}}>
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
                    <Box key={a.id} p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                      <Group justify="apart" align="flex-start">
                        <Box>
                          <Text fw={700}>{a.pacienteNome || '—'}</Text>
                          <Text size="xs" c="dimmed">{a.hora} • {a.tipoConsulta}</Text>
                        </Box>
                        <Text size="xs" c={a.status ? 'green.5' : 'dimmed'}>{a.status || '—'}</Text>
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
                  <Button size="xs" variant={selectedDay ? 'outline' : 'filled'} onClick={() => { setSelectedDay(null); setDataHoraFiltro(new Date()); }}>
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
                          color: isSelected ? 'white' : isCurrentMonth ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
                          boxShadow: isSelected ? '0 6px 18px rgba(0,0,0,0.06)' : undefined,
                          border: isToday && !isSelected ? '1px solid var(--mantine-color-default-border)' : undefined,
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
                      <Box key={a.id} style={{ padding: 12, background: 'var(--mantine-color-default)', borderRadius: 8, border: '1px solid var(--mantine-color-default-border)', marginBottom: 8 }}>
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
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Box>
  );
}
