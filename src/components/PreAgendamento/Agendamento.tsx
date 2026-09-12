import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  TextInput,
  Modal,
  Stack,
  Select,
  MultiSelect,
  ActionIcon,
  SimpleGrid,
  UnstyledButton,
  Paper,
  Badge,
  Tabs,
  useColorSchemeValue,
  Loader,
  Textarea,
  Divider,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { Search, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, Plus, Clock3, User, Globe, Check, X, ClipboardCheck, Paperclip } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { showNotification } from '@/components/ui';
import { Header } from '../Header/Header';
import { PaginatedGrid } from '../common/PaginatedGrid';
import { FloatingDatePicker } from '../common/FloatingDatePicker';
import './Agendamento.css';
import appointmentService, { type OnlineAppointment } from '../../services/appointmentService';
import patientService from '../../services/patientService';
import appointmentAttachmentService from '../../services/appointmentAttachmentService';
import type { AppointmentAttachment } from '../../services/appointmentAttachmentService';
import { formatCPF } from '../../utils/formatters';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { usePreSchedulingsQuery } from '../../hooks/usePreSchedulingsQuery';
import { usePatientsAdminQuery } from '../../hooks/usePatientsAdminQuery';
import { useInsurancesAdminQuery } from '../../hooks/useInsurancesAdminQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useRoomsAdminQuery } from '../../hooks/useRoomsAdminQuery';
import { useAgendasAdminQuery } from '../../hooks/useAgendasAdminQuery';
import { useMedicalEquipmentsQuery } from '../../hooks/useMedicalEquipmentsQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { isRoomSector } from '../../utils/sectorClassification';
import { queryKeys } from '../../lib/queryKeys';
interface Agendamento {
  id: string;
  branchId?: string;
  rescheduledFromAppointmentId?: string;
  patientId?: string;
  pacienteNome: string;
  pacienteCPF: string;
  medicoNome: string;
  roomId?: string;
  medicalEquipmentId?: string;
  especialidade: string;
  convenio: string;
  convenioNumber: string;
  convenioValidUntil: string;
  convenioStatus: string;
  convenioPlano?: string;
  data: string;
  hora: string;
  tipoConsulta: string;
  modalidadeAtendimento: 'Presencial' | 'Teleconsulta';
  status: string;
  observacoes: string;
  totem?: number;
  durationMinutes?: number | null;
}
interface NovoAgendamento {
  branchId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteCPF: string;
  especialidade: string;
  convenio: string;
  convenioNumber: string;
  convenioValidUntil: string;
  convenioStatus: string;
  convenioPlano: string;
  data: Date | null;
  hora: string;
  profissional: string;
  roomId: string;
  medicalEquipmentId: string;
  tipoConsulta: string;
  modalidadeAtendimento: 'Presencial' | 'Teleconsulta';
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
interface AgendaShiftWindow {
  shiftStart: string;
  shiftEnd: string;
  startDate?: string | null;
  endDate?: string | null;
}
interface DoctorScheduleMeta {
  id?: string;
  branchId?: string;
  name: string;
  roomIds: string[];
  workingDays: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  specialties: string[];
  gender?: string;
  agendaByWeekday?: Record<string, AgendaShiftWindow[]>;
}
interface ProcedureMeta {
  id?: string;
  name: string;
  appointmentType: 'CONSULTA' | 'EXAME';
  durationMinutes?: number | null;
  doctorIds: string[];
  doctorNames: string[];
  supportsTeleconsultation: boolean;
}
interface RoomScheduleMeta {
  id: string;
  name: string;
  workingDays: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  agendaByWeekday?: Record<string, AgendaShiftWindow[]>;
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
interface ProcedureAnchorSelection {
  procedure: string;
  doctorName: string;
  date: Date;
  time: string;
  durationMinutes: number;
  selectionOrder: number;
}
interface PendingAnchorSlotSelection {
  doctorName: string;
  date: Date;
  time: string;
}
interface PendingProfessionalSlotSelection {
  date: Date;
  time: string;
  procedure: string;
  candidates?: string[];
}
const INITIAL_NOVO_AGENDAMENTO: NovoAgendamento = {
  branchId: '',
  pacienteId: '',
  pacienteNome: '',
  pacienteCPF: '',
  especialidade: '',
  convenio: 'Particular',
  convenioNumber: '',
  convenioValidUntil: '',
  convenioStatus: 'Particular',
  convenioPlano: '',
  data: null,
  hora: '',
  profissional: '',
  roomId: '',
  medicalEquipmentId: '',
  tipoConsulta: 'CONSULTA',
  modalidadeAtendimento: 'Presencial',
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
const PARTICULAR_INSURANCE_LABEL = 'Particular';
const PARTICULAR_STATUS_LABEL = 'Particular';
const NOT_APPLICABLE_LABEL = 'Não se aplica';
const TELECONSULT_MODALITY = 'Telemedicina';
const TELECONSULTATION_SPECIALTY_FLAG = '__TELECONSULTA__';
const TELECONSULTATION_OBSERVATION_MARKER = '[MODALIDADE: TELECONSULTA]';

const stripTeleconsultationMarker = (value?: string | null): string => String(value || '')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && line !== TELECONSULTATION_OBSERVATION_MARKER)
  .join('\n')
  .trim();

const getAppointmentModalityFromObservation = (value?: string | null): 'Presencial' | 'Teleconsulta' => {
  const normalized = String(value || '').toUpperCase();
  return normalized.includes(TELECONSULTATION_OBSERVATION_MARKER) ? 'Teleconsulta' : 'Presencial';
};

const buildAppointmentObservations = (
  value: string,
  modality: 'Presencial' | 'Teleconsulta',
): string | undefined => {
  const base = stripTeleconsultationMarker(value);
  if (modality === 'Teleconsulta') {
    return base ? `${TELECONSULTATION_OBSERVATION_MARKER}\n${base}` : TELECONSULTATION_OBSERVATION_MARKER;
  }
  return base || undefined;
};
const resolvePatientInsuranceName = (patient: any): string => {
  const insuranceName = String(
    patient?.healthInsuranceName
    ?? patient?.insuranceName
    ?? patient?.convenio
    ?? '',
  ).trim();
  return insuranceName || PARTICULAR_INSURANCE_LABEL;
};
const resolvePatientInsuranceValidity = (patient: any): string => {
  const rawValue =
    patient?.healthInsuranceValidity
    ?? patient?.healthInsuranceExpiry
    ?? patient?.healthInsuranceValidUntil
    ?? patient?.convenioValidUntil
    ?? patient?.validadeConvenio
    ?? patient?.insuranceValidity
    ?? '';
  const normalized = String(rawValue || '').trim();
  if (!normalized) return '';
  const parsed = dayjs(normalized);
  if (!parsed.isValid()) return normalized;
  return parsed.format('MM/YY');
};
const resolvePatientInsuranceNumber = (patient: any): string => String(
  patient?.healthInsuranceNumber
  ?? patient?.insuranceCardNumber
  ?? patient?.convenioNumber
  ?? '',
).trim();
const patientHasRegisteredInsurance = (patient: any): boolean => {
  const insuranceName = String(
    patient?.healthInsuranceName
    ?? patient?.insuranceName
    ?? patient?.convenio
    ?? '',
  ).trim();
  return Boolean(insuranceName) && normalizeComparableText(insuranceName) !== normalizeComparableText(PARTICULAR_INSURANCE_LABEL);
};
const TIME_SLOTS = {
  'Manhã': ['08:00', '08:30', '09:00', '09:30', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45'],
  'Tarde': ['13:00', '13:15', '13:30', '13:45', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
  'Noite': ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
};
const PERIOD_RANGES: Record<'Manhã' | 'Tarde' | 'Noite', [number, number]> = {
  'Manhã': [0, 12 * 60],
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
const getAppointmentStatusLabel = (status?: string | null): string => {
  const normalized = normalizeAppointmentStatus(status);
  if (normalized === 'CONFIRMADO') return 'Confirmado';
  if (normalized === 'NAO_COMPARECEU') return 'Não compareceu';
  if (normalized === 'REALIZADO') return 'Realizado';
  if (normalized === 'CANCELADO') return 'Cancelado';
  return 'Agendado';
};
const getAppointmentStatusBadgeColor = (status?: string | null): string => {
  const normalized = normalizeAppointmentStatus(status);
  if (normalized === 'CONFIRMADO') return 'blue';
  if (normalized === 'NAO_COMPARECEU') return 'orange';
  if (normalized === 'REALIZADO') return 'green';
  if (normalized === 'CANCELADO') return 'red';
  return 'gray';
};
const getAppointmentStatusSummary = (items: Agendamento[]) => {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const normalized = normalizeAppointmentStatus(item.status);
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});
  return [
    { key: 'CONFIRMADO', label: 'Confirmados', color: 'blue', count: counts.CONFIRMADO || 0 },
    { key: 'AGENDADO', label: 'Agendados', color: 'gray', count: counts.AGENDADO || 0 },
    { key: 'REALIZADO', label: 'Realizados', color: 'green', count: counts.REALIZADO || 0 },
    { key: 'NAO_COMPARECEU', label: 'Não compareceram', color: 'orange', count: counts.NAO_COMPARECEU || 0 },
    { key: 'CANCELADO', label: 'Cancelados', color: 'red', count: counts.CANCELADO || 0 },
  ].filter((item) => item.count > 0);
};
const sortAgendamentosByDateTime = (items: Agendamento[]): Agendamento[] => {
  return [...items].sort((a, b) => {
    const aStamp = dayjs(`${a.data}T${a.hora || '00:00'}:00`).valueOf();
    const bStamp = dayjs(`${b.data}T${b.hora || '00:00'}:00`).valueOf();
    return aStamp - bStamp;
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
const normalizeTimeOnly = (value: unknown): string => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const timeMatch = raw.match(/\b(\d{1,2}):(\d{2})/);
  if (timeMatch) return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  const parsed = dayjs(raw);
  return parsed.isValid() ?parsed.format('HH:mm') : raw;
};
const firstPresent = (...values: unknown[]): unknown => values.find((value) => {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== '';
});
const extractAppointmentDate = (appointment: any): string => normalizeDateOnly(firstPresent(
  appointment?.date,
  appointment?.data,
  appointment?.scheduledFor,
  appointment?.scheduled_for,
  appointment?.scheduledAt,
  appointment?.scheduled_at,
  appointment?.scheduledDate,
  appointment?.scheduled_date,
  appointment?.appointmentDate,
  appointment?.appointment_date,
  appointment?.startAt,
  appointment?.start_at,
  appointment?.startsAt,
  appointment?.starts_at,
));
const extractAppointmentTime = (appointment: any): string => normalizeTimeOnly(firstPresent(
  appointment?.time,
  appointment?.hora,
  appointment?.scheduledTime,
  appointment?.scheduled_time,
  appointment?.scheduledFor,
  appointment?.scheduled_for,
  appointment?.scheduledAt,
  appointment?.scheduled_at,
  appointment?.appointmentTime,
  appointment?.appointment_time,
  appointment?.startAt,
  appointment?.start_at,
  appointment?.startsAt,
  appointment?.starts_at,
));
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
const normalizeProcedureAppointmentType = (value?: string | null): 'CONSULTA' | 'EXAME' => {
  return String(value || '').trim().toUpperCase() === 'EXAME' ?'EXAME' : 'CONSULTA';
};
const isParticularInsurance = (value?: string | null): boolean => {
  return normalizeComparableText(value) === normalizeComparableText(PARTICULAR_INSURANCE_LABEL);
};
const buildInsuranceFormValues = (patient: any, fallbackInsuranceName?: string) => {
  const insuranceName = resolvePatientInsuranceName(patient || {}) || fallbackInsuranceName || PARTICULAR_INSURANCE_LABEL;
  const hasRegisteredInsurance = patientHasRegisteredInsurance(patient || {})
    || !isParticularInsurance(insuranceName);
  return {
    convenio: insuranceName,
    convenioNumber: hasRegisteredInsurance ?resolvePatientInsuranceNumber(patient) : '',
    convenioValidUntil: hasRegisteredInsurance ?resolvePatientInsuranceValidity(patient) : '',
    convenioStatus: hasRegisteredInsurance ?'Ativo' : PARTICULAR_STATUS_LABEL,
  };
};
const matchesDoctorToProcedure = (doctorSpecialties: string[], procedureName: string): boolean => {
  const normalizedProcedure = normalizeComparableText(procedureName);
  if (!normalizedProcedure) return false;
  return doctorSpecialties
    .flatMap((specialty) => String(specialty || '')
      .split(/[;,/|]/)
      .map(normalizeComparableText)
      .filter(Boolean))
    .some((specialty) => specialty === normalizedProcedure);
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
const hasAnyAgendaWindow = (agendaByWeekday?: Record<string, AgendaShiftWindow[]>): boolean => (
  Boolean(agendaByWeekday) && Object.values(agendaByWeekday!).some((windows) => windows.length > 0)
);
const isDateWithinAgendaWindow = (date: Date, window: AgendaShiftWindow): boolean => {
  const day = dayjs(date).startOf('day');
  if (window.startDate && day.isBefore(dayjs(window.startDate).startOf('day'))) return false;
  if (window.endDate && day.isAfter(dayjs(window.endDate).startOf('day'))) return false;
  return true;
};
const buildSlotsFromAgendaWindows = (
  windows: AgendaShiftWindow[],
  period: 'Manhã' | 'Tarde' | 'Noite',
  date: Date,
): string[] => {
  const [periodStart, periodEnd] = PERIOD_RANGES[period];
  const slots = new Set<number>();
  windows
    .filter((window) => isDateWithinAgendaWindow(date, window))
    .forEach((window) => {
      const start = parseTimeToMinutes(window.shiftStart);
      const end = parseTimeToMinutes(window.shiftEnd);
      if (start === null || end === null || end <= start) return;
      const rangeStart = Math.max(start, periodStart);
      const rangeEnd = Math.min(end, periodEnd);
      for (let minute = rangeStart; minute < rangeEnd; minute += 15) {
        slots.add(minute);
      }
    });
  return Array.from(slots).sort((a, b) => a - b).map(formatMinutesToTime);
};
const groupAgendasByKey = (
  agendas: any[],
  keyOf: (agenda: any) => string | null,
): Record<string, Record<string, AgendaShiftWindow[]>> => {
  return agendas.reduce<Record<string, Record<string, AgendaShiftWindow[]>>>((acc, agenda) => {
    if (agenda?.status !== 'ATIVA') return acc;
    const key = keyOf(agenda);
    if (!key) return acc;
    const weekday = normalizeWeekdayLabel(agenda.weekday);
    if (!weekday) return acc;
    if (!acc[key]) acc[key] = {};
    if (!acc[key][weekday]) acc[key][weekday] = [];
    acc[key][weekday].push({
      shiftStart: agenda.shiftStart,
      shiftEnd: agenda.shiftEnd,
      startDate: agenda.startDate || null,
      endDate: agenda.endDate || null,
    });
    return acc;
  }, {});
};
const buildDoctorSlots = (
  doctor: DoctorScheduleMeta | undefined,
  period: 'Manhã' | 'Tarde' | 'Noite',
  date: Date,
): string[] => {
  const currentWeekday = getBranchWeekdayLabel(date);
  if (hasAnyAgendaWindow(doctor?.agendaByWeekday)) {
    const windows = doctor?.agendaByWeekday?.[currentWeekday] || [];
    return buildSlotsFromAgendaWindows(windows, period, date);
  }
  if (!doctor?.workingHoursStart || !doctor?.workingHoursEnd) {
    return TIME_SLOTS[period];
  }
  const normalizedDays = (doctor.workingDays || []).map(normalizeWeekdayLabel);
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
const buildRoomSlots = (
  room: RoomScheduleMeta | undefined,
  period: 'Manhã' | 'Tarde' | 'Noite',
  date: Date,
): string[] => {
  const currentWeekday = getBranchWeekdayLabel(date);
  if (hasAnyAgendaWindow(room?.agendaByWeekday)) {
    const windows = room?.agendaByWeekday?.[currentWeekday] || [];
    return buildSlotsFromAgendaWindows(windows, period, date);
  }
  if (!room?.workingHoursStart || !room?.workingHoursEnd) {
    return TIME_SLOTS[period];
  }
  const normalizedDays = (room.workingDays || []).map(normalizeWeekdayLabel);
  if (normalizedDays.length > 0 && !normalizedDays.includes(currentWeekday)) {
    return [];
  }
  const roomStart = parseTimeToMinutes(room.workingHoursStart);
  const roomEnd = parseTimeToMinutes(room.workingHoursEnd);
  if (roomStart === null || roomEnd === null || roomEnd <= roomStart) {
    return TIME_SLOTS[period];
  }
  const [periodStart, periodEnd] = PERIOD_RANGES[period];
  const rangeStart = Math.max(roomStart, periodStart);
  const rangeEnd = Math.min(roomEnd, periodEnd);
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
const getTodayStart = (): Date => dayjs().startOf('day').toDate();
const isPastCalendarDate = (date: Date): boolean => dayjs(date).isBefore(dayjs(), 'day');
const isPastTimeForDate = (date: Date, time?: string | null): boolean => {
  if (isPastCalendarDate(date)) return true;
  if (!dayjs(date).isSame(dayjs(), 'day')) return false;
  const slotMinute = parseTimeToMinutes(time);
  if (slotMinute === null) return false;
  const now = dayjs();
  const currentMinute = (now.hour() * 60) + now.minute();
  return slotMinute <= currentMinute;
};
export function Agendamento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const handledPrefillRef = useRef(false);
  const schedulerRef = useRef<HTMLDivElement | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState<string>('hub');
  const [onlineAppointments, setOnlineAppointments] = useState<OnlineAppointment[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [resolvingOnlineId, setResolvingOnlineId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [schedulingStep, setSchedulingStep] = useState<number>(0);
  const [activeSchedulePeriod, setActiveSchedulePeriod] = useState<'Todos' | 'Manhã' | 'Tarde' | 'Noite'>('Todos');
  const [availabilityViewMode, setAvailabilityViewMode] = useState<'day' | 'week'>('day');
  const [availabilitySearch, setAvailabilitySearch] = useState('');
  const [availabilityGenderFilter, setAvailabilityGenderFilter] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState('4');
  const [recurrenceIntervalWeeks, setRecurrenceIntervalWeeks] = useState('1');
  const [simultaneousEnabled, setSimultaneousEnabled] = useState(false);
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>(INITIAL_NOVO_AGENDAMENTO);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgendamentoId, setEditingAgendamentoId] = useState<string | null>(null);
  const computedColorScheme = useColorSchemeValue('dark');
  const isDarkMode = computedColorScheme === 'dark';
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const [layout, setLayout] = useState<'list' | 'grid' | 'calendar'>('grid');
  const [agendadosPage, setAgendadosPage] = useState(1);
  const [agendadosPageSize, setAgendadosPageSize] = useState(10);
  const [availabilityAgendamentos, setAvailabilityAgendamentos] = useState<Agendamento[]>([]);
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
  const [insurancePlanOptions, setInsurancePlanOptions] = useState<{ value: string; label: string; insuranceName: string }[]>([]);
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
  const [manualProcedureSelections, setManualProcedureSelections] = useState<ProcedureAnchorSelection[]>([]);
  const [anchorProcedureModalOpen, setAnchorProcedureModalOpen] = useState(false);
  const [pendingAnchorSlot, setPendingAnchorSlot] = useState<PendingAnchorSlotSelection | null>(null);
  const [professionalSlotModalOpen, setProfessionalSlotModalOpen] = useState(false);
  const [pendingProfessionalSlot, setPendingProfessionalSlot] = useState<PendingProfessionalSlotSelection | null>(null);
  const [suggestionOptionsModalOpen, setSuggestionOptionsModalOpen] = useState(false);
  const [reviewAttachments, setReviewAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<AppointmentAttachment[]>([]);
  const [loadingExistingAttachments, setLoadingExistingAttachments] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState<Agendamento | null>(null);
  const [detailAttachments, setDetailAttachments] = useState<AppointmentAttachment[]>([]);
  const [detailAttachmentsLoading, setDetailAttachmentsLoading] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  // Estados para os filtros
  const [procedimentoFiltro, setProcedimentoFiltro] = useState<string | null>(null);
  const [convenio, setConvenio] = useState<string | null>(null);
  const [dataHoraFiltro, setDataHoraFiltro] = useState<Date | null>(new Date());
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [viewedDate, setViewedDate] = useState<Date>(new Date());
  const appointmentDateFilter = dataHoraFiltro ?formatDateForApi(dataHoraFiltro) : undefined;
  const availabilityWeekStart = dayjs(viewedDate).startOf('week').toDate();
  const availabilityWeekEnd = dayjs(viewedDate).endOf('week').toDate();
  const appointmentsQuery = useAppointmentsQuery({ date: appointmentDateFilter });
  const availabilityAppointmentsQuery = useAppointmentsQuery({
    startDate: formatDateForApi(availabilityViewMode === 'week' ? availabilityWeekStart : viewedDate),
    endDate: formatDateForApi(availabilityViewMode === 'week' ? availabilityWeekEnd : viewedDate),
    ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
  });
  const preSchedulingsQuery = usePreSchedulingsQuery({});
  const patientsQuery = usePatientsAdminQuery();
  const insurancesQuery = useInsurancesAdminQuery();
  const branchesQuery = useSettingsBranchesQuery();
  const doctorsQuery = useDoctorsAdminQuery(selectedBranchId || undefined);
  const proceduresCatalogQuery = useProceduresAdminQuery();
  const roomsQuery = useRoomsAdminQuery();
  const agendasQuery = useAgendasAdminQuery(selectedBranchId || undefined);
  const medicalEquipmentsQuery = useMedicalEquipmentsQuery();
  dayjs.locale('pt-br');
  const resetSchedulingForm = (keepDate: Date | null = dataHoraFiltro || new Date()) => {
    setNovoAgendamento({
      ...INITIAL_NOVO_AGENDAMENTO,
      branchId: selectedBranchId || '',
      convenio: PARTICULAR_INSURANCE_LABEL,
      convenioStatus: PARTICULAR_STATUS_LABEL,
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
    setAvailabilityViewMode('day');
    setActiveSchedulePeriod('Todos');
    setSuggestedOptions([]);
    setSelectedSuggestedOptionId(null);
    setRescheduleSourceId(null);
    setManualProcedureSelections([]);
    setAnchorProcedureModalOpen(false);
    setPendingAnchorSlot(null);
    setProfessionalSlotModalOpen(false);
    setPendingProfessionalSlot(null);
    setReviewAttachments([]);
    setExistingAttachments([]);
    setAvailabilitySearch('');
    setAvailabilityGenderFilter(null);
    setRecurrenceEnabled(false);
    setRecurrenceOccurrences('4');
    setRecurrenceIntervalWeeks('1');
    setSimultaneousEnabled(false);
  };
  useEffect(() => {
    setManualProcedureSelections((prev) => {
      const filtered = prev.filter((item) => selectedSpecialties.includes(item.procedure));
      return filtered.length === prev.length ?prev : filtered;
    });
    if (selectedSpecialties.length === 0) {
      setPendingAnchorSlot(null);
      setAnchorProcedureModalOpen(false);
      setSuggestedOptions([]);
      setSelectedSuggestedOptionId(null);
      setNovoAgendamento((prev) => ({ ...prev, profissional: '', hora: '' }));
    }
    if (selectedSpecialties.length < 2) {
      setSimultaneousEnabled(false);
    }
  }, [selectedSpecialties]);
  const mapApiToAgendamento = (it: any): Agendamento => ({
    id: String(it.id),
    branchId: it.branchId || it.branch_id || undefined,
    rescheduledFromAppointmentId: it.rescheduledFromAppointmentId || it.rescheduled_from_appointment_id || undefined,
    patientId: it.patientId || it.patient_id || it.patient?.id || undefined,
    pacienteNome: it.patientName || it.patient_name || it.patient?.name || it.pacienteNome || '',
    pacienteCPF: it.patientCpf || it.patient_cpf || it.patient?.cpf || it.pacienteCPF || '',
    medicoNome: it.doctorName || it.doctor_name || it.professionalName || it.professional_name || it.doctor?.name || it.professional?.name || it.medicoNome || '',
    roomId: String(it.roomId || it.room_id || '').trim() || undefined,
    medicalEquipmentId: String(it.medicalEquipmentId || it.medical_equipment_id || '').trim() || undefined,
    especialidade: it.specialty || it.procedure || it.procedureName || it.procedure_name || it.procedure?.name || it.procedimento || it.especialidade || '',
    convenio: String(
      it.convenio
      || it.insurance
      || it.healthInsuranceName
      || it.insuranceName
      || it.insurance_name
      || it.convenioName
      || '',
    ).trim(),
    convenioNumber: it.convenioNumber || it.convenio_number || it.healthInsuranceNumber || it.insuranceCardNumber || '',
    convenioValidUntil: it.convenioValidUntil || it.convenio_valid_until || it.healthInsuranceExpiry || it.healthInsuranceValidity || '',
    convenioStatus: it.convenioStatus || it.convenio_status || '',
    convenioPlano: it.insurancePlan || it.insurance_plan || it.convenioPlano || '',
    data: extractAppointmentDate(it),
    hora: extractAppointmentTime(it),
    tipoConsulta: it.type || it.appointmentType || it.appointment_type || it.procedure?.appointmentType || it.tipoConsulta || 'CONSULTA',
    modalidadeAtendimento: getAppointmentModalityFromObservation(it.observations || it.observacoes || ''),
    status: normalizeAppointmentStatus(it.status),
    observacoes: stripTeleconsultationMarker(it.observations || it.observacoes || ''),
    totem: it.totem ?? undefined,
    durationMinutes: Number.isFinite(Number(it.durationMinutes)) ?Number(it.durationMinutes) : null,
  });
  const mapPreSchedulingToAgendamento = (it: any): Agendamento => ({
    id: String(it.appointmentId || it.appointment_id || it.id),
    patientId: it.patientId || it.patient_id || undefined,
    pacienteNome: it.patientName || it.patient_name || '',
    pacienteCPF: it.patientCpf || it.patient_cpf || '',
    medicoNome: it.doctorName || it.doctor_name || '',
    especialidade: it.specialty || it.procedureName || it.procedure_name || '',
    convenio: it.convenio || it.insurance || '',
    convenioNumber: '',
    convenioValidUntil: '',
    convenioStatus: '',
    convenioPlano: '',
    data: extractAppointmentDate(it),
    hora: extractAppointmentTime(it),
    tipoConsulta: it.type || it.appointmentType || it.appointment_type || 'CONSULTA',
    modalidadeAtendimento: it.isTeleconsultation ? 'Teleconsulta' : 'Presencial',
    status: normalizeAppointmentStatus(it.appointmentStatus || it.appointment_status || 'AGENDADO'),
    observacoes: '',
    durationMinutes: Number.isFinite(Number(it.durationMinutes)) ?Number(it.durationMinutes) : null,
  });
  useEffect(() => {
    const list = Array.isArray(availabilityAppointmentsQuery.data) ? availabilityAppointmentsQuery.data : [];
    setAvailabilityAgendamentos(
      sortAgendamentosByDateTime(
        list
          .map(mapApiToAgendamento)
          .filter((item) => !isTeaReturnAppointment(item.tipoConsulta)),
      ),
    );
  }, [availabilityAppointmentsQuery.data]);
  const getResumoLinha = (agendamento: Agendamento) => {
    const parts = [agendamento.tipoConsulta, agendamento.especialidade].filter(Boolean);
    const base = parts.length ?parts.join(' | ') : '—';
    return agendamento.medicoNome ?`${base} | Dr(a): ${agendamento.medicoNome}` : base;
  };
  const getAppointmentTypeLabel = (value?: string | null) => (
    normalizeProcedureAppointmentType(value) === 'EXAME' ?'Exame' : 'Consulta'
  );
  const isTeaReturnAppointment = (value?: string | null) => (
    String(value || '').trim().toUpperCase() === 'RETORNO TEA'
  );
  const deriveAppointmentType = (
    procedureNames: string[],
    fallbackValue?: string | null,
  ): 'CONSULTA' | 'EXAME' => {
    if (procedureNames.some((name) => normalizeProcedureAppointmentType(procedureMetaByName[name]?.appointmentType) === 'EXAME')) {
      return 'EXAME';
    }
    return normalizeProcedureAppointmentType(fallbackValue);
  };
  const loadAgendamentos = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
  };
  const fileToBase64 = async (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const loadExistingAttachments = async (appointmentId?: string | null) => {
    if (!appointmentId) {
      setExistingAttachments([]);
      return;
    }
    try {
      setLoadingExistingAttachments(true);
      const response = await appointmentAttachmentService.listAttachments(appointmentId);
      setExistingAttachments(response?.items || []);
    } catch {
      setExistingAttachments([]);
    } finally {
      setLoadingExistingAttachments(false);
    }
  };
  const handleReviewAttachmentInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    setReviewAttachments((prev) => {
      const next = [...prev];
      for (const file of selectedFiles) {
        const exists = next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
        if (!exists) next.push(file);
      }
      return next;
    });
    event.target.value = '';
  };
  const handleRemoveReviewAttachment = (file: File) => {
    setReviewAttachments((prev) => prev.filter((item) => !(item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)));
  };
  const handleOpenExistingAttachment = async (attachmentId: string) => {
    try {
      setOpeningAttachmentId(attachmentId);
      const blob = await appointmentAttachmentService.viewAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao abrir anexo',
        message: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Não foi possível abrir o anexo.',
        color: 'red',
      });
    } finally {
      setOpeningAttachmentId(null);
    }
  };
  const loadDetailAttachments = async (appointmentId?: string | null) => {
    if (!appointmentId) {
      setDetailAttachments([]);
      return;
    }
    try {
      setDetailAttachmentsLoading(true);
      const response = await appointmentAttachmentService.listAttachments(appointmentId);
      setDetailAttachments(response?.items || []);
    } catch {
      setDetailAttachments([]);
    } finally {
      setDetailAttachmentsLoading(false);
    }
  };
  const handleOpenAppointmentDetail = async (appointment: Agendamento) => {
    setDetailAppointment(appointment);
    setDetailOpen(true);
    await loadDetailAttachments(appointment.id);
  };
  const handleEditFromDetail = () => {
    if (!detailAppointment) return;
    setDetailOpen(false);
    handleEditAgendamento(detailAppointment);
  };
  useEffect(() => {
    if (appointmentsQuery.error) {
      const err: any = appointmentsQuery.error;
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos',
        color: 'red',
      });
    }
  }, [appointmentsQuery.error]);
  useEffect(() => {
    if (appointmentDateFilter) return;

    const list = Array.isArray(appointmentsQuery.data) ?appointmentsQuery.data : [];
    const preSchedulingList = Array.isArray(preSchedulingsQuery.data) ?preSchedulingsQuery.data : [];
    const mappedAppointments = list
      .map(mapApiToAgendamento)
      .filter((item) => !isTeaReturnAppointment(item.tipoConsulta));
    const appointmentIds = new Set(mappedAppointments.map((item) => String(item.id)));
    const fallbackPreSchedulings = preSchedulingList
      .map(mapPreSchedulingToAgendamento)
      .filter((item) => item.id && item.data && !appointmentIds.has(String(item.id)))
      .filter((item) => !isTeaReturnAppointment(item.tipoConsulta));

    setAgendamentos(
      sortAgendamentosByDateTime(
        [...mappedAppointments, ...fallbackPreSchedulings],
      ),
    );
  }, [appointmentDateFilter, appointmentsQuery.data, preSchedulingsQuery.data]);
  useEffect(() => {
    if (!appointmentDateFilter) return;
    let ignore = false;

    const loadAppointmentsForSelectedDate = async () => {
      try {
        const data = await appointmentService.list({ date: appointmentDateFilter, limit: 2000, offset: 0 });
        const list = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data)
              ? data.data
              : []));

        if (ignore) return;

        setAgendamentos(
          sortAgendamentosByDateTime(
            list
              .map(mapApiToAgendamento)
              .filter((item: Agendamento) => !isTeaReturnAppointment(item.tipoConsulta)),
          ),
        );
      } catch (err: any) {
        if (ignore) return;
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos do dia',
          color: 'red',
        });
      }
    };

    void loadAppointmentsForSelectedDate();

    return () => {
      ignore = true;
    };
  }, [appointmentDateFilter]);
  useEffect(() => {
    setPatientsLoading(patientsQuery.isFetching);
  }, [patientsQuery.isFetching]);
  useEffect(() => {
    setInsurancesLoading(insurancesQuery.isFetching);
  }, [insurancesQuery.isFetching]);
  useEffect(() => {
    setDoctorsLoading(doctorsQuery.isFetching);
  }, [doctorsQuery.isFetching]);
  useEffect(() => {
    setProceduresLoading(proceduresCatalogQuery.isFetching);
  }, [proceduresCatalogQuery.isFetching]);
  useEffect(() => {
    if (!patientsQuery.error) return;
    const err: any = patientsQuery.error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes',
      color: 'red',
    });
  }, [patientsQuery.error]);
  useEffect(() => {
    if (activeTab === 'online') void loadOnlineAppointments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!insurancesQuery.error) return;
    const err: any = insurancesQuery.error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar convênios',
      color: 'red',
    });
  }, [insurancesQuery.error]);
  useEffect(() => {
    if (!doctorsQuery.error) return;
    const err: any = doctorsQuery.error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar médicos',
      color: 'red',
    });
  }, [doctorsQuery.error]);
  useEffect(() => {
    if (!proceduresCatalogQuery.error) return;
    const err: any = proceduresCatalogQuery.error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar procedimentos',
      color: 'red',
    });
  }, [proceduresCatalogQuery.error]);
  useEffect(() => {
    if (!roomsQuery.error) return;
    const err: any = roomsQuery.error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar salas',
      color: 'red',
    });
  }, [roomsQuery.error]);
  useEffect(() => {
    if (!medicalEquipmentsQuery.error) return;
    const err: any = medicalEquipmentsQuery.error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar equipamentos',
      color: 'red',
    });
  }, [medicalEquipmentsQuery.error]);
  useEffect(() => {
    const data: any = patientsQuery.data;
    const listRaw = Array.isArray(data)
      ?data
      : (Array.isArray(data?.patients)
        ?data.patients
        : (Array.isArray(data?.data?.patients)
          ?data.data.patients
          : (Array.isArray(data?.data)
            ?data.data
            : (Array.isArray(data?.items) ?data.items : []))));
    const list: any[] = Array.isArray(listRaw) ?listRaw : [];
    const options = list.map((p: any) => {
      const id = String(p.id ?? p.patientId ?? '');
      const name = (p.name || p.fullName || p.patientName || p.email || p.cpf || '').toString().trim();
      const label = name || 'Paciente';
      return { value: id || label, label };
    });
    const byId: Record<string, any> = {};
    list.forEach((p: any) => {
      const id = String(p.id ?? p.patientId ?? '');
      if (id) byId[id] = p;
    });
    setPatientById(byId);
    setPatientOptions(options);
  }, [patientsQuery.data]);
  useEffect(() => {
    const data: any = insurancesQuery.data;
    const list: any[] = Array.isArray(data)
      ?data
      : (Array.isArray(data?.items)
        ?data.items
        : (Array.isArray(data?.insurances)
          ?data.insurances
        : (Array.isArray(data?.data?.items)
          ?data.data.items
          : (Array.isArray(data?.data?.insurances)
            ?data.data.insurances
            : (Array.isArray(data?.data)
              ?data.data
              : [])))));
    const catalogOptions = list
      .filter((it: any) => it?.isActive !== false)
      .map((it: any) => {
        const name = (it.name || it.nome || '').toString().trim();
        return name ?{ value: name, label: name } : null;
      })
      .filter(Boolean) as { value: string; label: string }[];
    const planOptions = list.flatMap((it: any) => {
      if (it?.isActive === false) return [];
      const insuranceName = String(it?.name || it?.nome || '').trim();
      const subInsurances = Array.isArray(it?.subInsurances) ? it.subInsurances : [];
      return subInsurances
        .filter((plan: any) => plan?.isActive !== false)
        .map((plan: any) => {
          const name = String(plan?.name || plan?.nome || '').trim();
          return name && insuranceName
            ? { value: `${insuranceName}::${name}`, label: name, insuranceName }
            : null;
        })
        .filter(Boolean);
    }) as { value: string; label: string; insuranceName: string }[];
    setInsurancePlanOptions(planOptions);
    // Keep the filter useful even when an appointment references an insurance
    // that is not returned by the current catalog response (for example, a
    // legacy or mock appointment).
    const appointmentOptions = agendamentos
      .map((item) => String(item.convenio || '').trim())
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));
    const mergedOptions = [
      { value: PARTICULAR_INSURANCE_LABEL, label: PARTICULAR_INSURANCE_LABEL },
      ...catalogOptions,
      ...appointmentOptions,
    ];
    setInsuranceOptions(
      mergedOptions.filter((item, index, arr) => arr.findIndex((current) => (
        normalizeComparableText(current.value) === normalizeComparableText(item.value)
      )) === index),
    );
  }, [insurancesQuery.data, agendamentos]);
  useEffect(() => {
    const data: any = doctorsQuery.data;
    const list: any[] = Array.isArray(data)
      ?data
      : (Array.isArray(data?.items)
        ?data.items
        : (Array.isArray(data?.data?.items)
          ?data.data.items
          : (Array.isArray(data?.data)
            ?data.data
            : [])));
    const options = list
      .map((doctor: any) => {
        const name = doctor.name || doctor.nome || doctor.fullName || '';
        return name ?{ value: name, label: name } : null;
      })
      .filter(Boolean) as { value: string; label: string }[];
    const agendaList: any[] = Array.isArray(agendasQuery.data)
      ? agendasQuery.data
      : (Array.isArray((agendasQuery.data as any)?.items) ? (agendasQuery.data as any).items : []);
    const agendaByDoctorName = groupAgendasByKey(agendaList, (agenda) => {
      const doctorName = String(agenda?.doctor?.name || '').trim();
      return doctorName || null;
    });
    const metaByName = list.reduce<Record<string, DoctorScheduleMeta>>((acc, doctor: any) => {
      const name = (doctor.name || doctor.nome || doctor.fullName || '').toString().trim();
      if (!name) return acc;
      acc[name] = {
        id: String(doctor.id ?? doctor.doctorId ?? '').trim() || undefined,
        branchId: String(doctor.branchId ?? doctor.branch_id ?? '').trim() || undefined,
        name,
        roomIds: Array.from(new Set([
          ...(Array.isArray(doctor.roomIds) ?doctor.roomIds : []),
          ...(doctor.roomId ?[doctor.roomId] : []),
          ...(Array.isArray(doctor.roomLinks) ?doctor.roomLinks.map((link: any) => link?.roomId) : []),
        ].map((item: any) => String(item || '').trim()).filter(Boolean))),
        workingDays: Array.isArray(doctor.workingDays) ?doctor.workingDays : [],
        workingHoursStart: doctor.workingHoursStart || undefined,
        workingHoursEnd: doctor.workingHoursEnd || undefined,
        specialties: [
          ...(doctor.specialty ?[String(doctor.specialty)] : []),
          ...(Array.isArray(doctor.specialties) ?doctor.specialties.map((item: any) => String(item)) : []),
        ].filter(Boolean),
        gender: String(doctor.gender || doctor.sexo || '').trim().toUpperCase() || undefined,
        agendaByWeekday: agendaByDoctorName[name],
      };
      return acc;
    }, {});
    setDoctorOptions(options);
    setDoctorMetaByName(metaByName);
  }, [doctorsQuery.data, agendasQuery.data]);
  useEffect(() => {
    const list: any[] = Array.isArray(proceduresCatalogQuery.data) ?proceduresCatalogQuery.data : [];
    const options = list
      .map((item: any) => {
        const name = (item.name || item.nome || '').toString().trim();
        return name ?{ value: name, label: name } : null;
      })
      .filter(Boolean) as { value: string; label: string }[];
    const metaByName = list.reduce<Record<string, ProcedureMeta>>((acc, item: any) => {
      const name = (item.name || item.nome || '').toString().trim();
      if (!name) return acc;
      const linkedDoctors = Array.isArray(item.doctors) ?item.doctors : [];
      acc[name] = {
        id: String(item.id || item.procedureId || '').trim() || undefined,
        name,
        appointmentType: normalizeProcedureAppointmentType(item.appointmentType),
        durationMinutes: Number.isFinite(Number(item.durationMinutes)) ?Number(item.durationMinutes) : null,
        doctorIds: linkedDoctors
          .map((doctor: any) => String(doctor?.doctorId || doctor?.id || '').trim())
          .filter(Boolean),
        doctorNames: linkedDoctors
          .map((doctor: any) => String(doctor?.doctorName || doctor?.name || '').trim())
          .filter(Boolean),
        supportsTeleconsultation:
          normalizeProcedureAppointmentType(item.appointmentType) === 'CONSULTA'
          && (
            Array.isArray(item.modalities)
              ? item.modalities.some((modality: any) => String(modality || '').trim() === TELECONSULT_MODALITY)
              : Boolean(item.supportsTeleconsultation)
          ),
      };
      return acc;
    }, {});
    setProcedureOptions(options);
    setProcedureMetaByName(metaByName);
  }, [proceduresCatalogQuery.data]);
  const filteredAgendamentos = agendamentos.filter((agendamento) => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || agendamento.pacienteNome.toLowerCase().includes(normalizedSearch)
      || agendamento.pacienteCPF.includes(normalizedSearch)
      || agendamento.medicoNome.toLowerCase().includes(normalizedSearch);
    const normalizedProcedimento = String(procedimentoFiltro || '').trim().toLowerCase();
    const appointmentProcedimento = String(agendamento.especialidade || '').trim().toLowerCase();
    const matchesProcedimento = !normalizedProcedimento
      || appointmentProcedimento.includes(normalizedProcedimento);
    const normalizedConvenio = String(convenio || '').trim().toLowerCase();
    const appointmentConvenio = String(agendamento.convenio || '').trim().toLowerCase();
    const matchesConvenio = !normalizedConvenio
      || appointmentConvenio.includes(normalizedConvenio);
    const matchesDate = !dataHoraFiltro
      || dayjs(agendamento.data).isSame(dayjs(dataHoraFiltro), 'day');
    const matchesStatus = !statusFiltro || agendamento.status === statusFiltro;
    return matchesSearch && matchesProcedimento && matchesConvenio && matchesDate && matchesStatus;
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAgendamentos.length / agendadosPageSize));
    if (agendadosPage > totalPages) {
      setAgendadosPage(totalPages);
    }
  }, [agendadosPage, agendadosPageSize, filteredAgendamentos.length]);

  const paginatedAgendamentos = filteredAgendamentos.slice(
    (agendadosPage - 1) * agendadosPageSize,
    agendadosPage * agendadosPageSize,
  );

  const getInsuranceIncompatibleProcedures = (_insuranceName: string, _procedureNames: string[]): string[] => {
    // Insurance-procedure compatibility is now managed in ConvenioForm / InsuranceProcedure table
    return [];
  };
  const handleProcedureSelectionChange = (values: string[]) => {
    const selectedTypes = new Set(
      values.map((procedureName) => normalizeProcedureAppointmentType(procedureMetaByName[procedureName]?.appointmentType)),
    );
    if (selectedTypes.size > 1) {
      showNotification({
        title: 'Combinação não permitida',
        message: 'Não é possível misturar procedimentos de consulta com procedimentos de exame na mesma marcação.',
        color: 'red',
      });
      return;
    }

    setSelectedSpecialties(values);
    if (!canEditInsuranceFields) return;
    const incompatibleProcedures = getInsuranceIncompatibleProcedures(
      novoAgendamento.convenio || PARTICULAR_INSURANCE_LABEL,
      values,
    );
    if (incompatibleProcedures.length === 0) return;
    const proceduresLabel = incompatibleProcedures.join(', ');
    showNotification({
      title: 'Convênio incompatível',
      message: incompatibleProcedures.length === 1
        ?`O procedimento ${proceduresLabel} não é contemplado pelo convênio do paciente.`
        : `Os procedimentos ${proceduresLabel} não são contemplados pelo convênio do paciente.`,
      color: 'red',
    });
  };
  const loadOnlineAppointments = async () => {
    setLoadingOnline(true);
    try {
      const data = await appointmentService.listOnline();
      setOnlineAppointments(data);
    } catch {
      showNotification({ title: 'Erro', message: 'Não foi possível carregar agendamentos online.', color: 'red' });
    } finally {
      setLoadingOnline(false);
    }
  };

  const handleConfirmOnline = async (id: string) => {
    setResolvingOnlineId(id);
    try {
      await appointmentService.resolveOnline(id, 'confirm');
      setOnlineAppointments((prev) => prev.filter((a) => a.id !== id));
      showNotification({ title: 'Agendamento confirmado', message: 'O agendamento foi aceito e está agendado.', color: 'green' });
    } catch {
      showNotification({ title: 'Erro', message: 'Não foi possível confirmar o agendamento.', color: 'red' });
    } finally {
      setResolvingOnlineId(null);
    }
  };

  const handleRejectOnline = async () => {
    if (!rejectTargetId) return;
    setResolvingOnlineId(rejectTargetId);
    try {
      await appointmentService.resolveOnline(rejectTargetId, 'reject', rejectReason || undefined);
      setOnlineAppointments((prev) => prev.filter((a) => a.id !== rejectTargetId));
      showNotification({ title: 'Agendamento recusado', message: 'O agendamento foi recusado.', color: 'orange' });
    } catch {
      showNotification({ title: 'Erro', message: 'Não foi possível recusar o agendamento.', color: 'red' });
    } finally {
      setResolvingOnlineId(null);
      setRejectModalOpen(false);
      setRejectTargetId(null);
      setRejectReason('');
    }
  };

  const handleEditAgendamento = (agendamento: Agendamento) => {
    const appointmentDate = agendamento.data ?new Date(`${agendamento.data}T00:00:00`) : null;
    setSelectedBranchId(agendamento.branchId || null);
    setNovoAgendamento({
      branchId: agendamento.branchId || selectedBranchId || '',
      pacienteId: agendamento.patientId || '',
      pacienteNome: agendamento.pacienteNome || '',
      pacienteCPF: agendamento.pacienteCPF || '',
      especialidade: agendamento.especialidade,
      convenio: agendamento.convenio,
      convenioNumber: agendamento.convenioNumber || '',
      convenioValidUntil: agendamento.convenioValidUntil || '',
      convenioStatus: agendamento.convenioStatus || (isParticularInsurance(agendamento.convenio) ?PARTICULAR_STATUS_LABEL : 'Ativo'),
      convenioPlano: agendamento.convenioPlano || '',
      data: appointmentDate,
      hora: agendamento.hora,
      profissional: agendamento.medicoNome,
      roomId: agendamento.roomId || '',
      medicalEquipmentId: agendamento.medicalEquipmentId || '',
      tipoConsulta: agendamento.tipoConsulta,
      modalidadeAtendimento: agendamento.modalidadeAtendimento || 'Presencial',
      informacoes: agendamento.observacoes,
    });
    const specialties = agendamento.especialidade
      ?agendamento.especialidade.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    setSelectedSpecialties(specialties);
    setSelectedPatientId(agendamento.patientId || null);
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setIsEditing(true);
    setEditingAgendamentoId(agendamento.id);
    setRescheduleSourceId(null);
    setReviewAttachments([]);
    loadExistingAttachments(agendamento.id);
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
    const appointmentDate = agendamento.data ?new Date(`${agendamento.data}T00:00:00`) : null;
    setSelectedBranchId(agendamento.branchId || null);
    setNovoAgendamento({
      branchId: agendamento.branchId || selectedBranchId || '',
      pacienteId: agendamento.patientId || '',
      pacienteNome: agendamento.pacienteNome || '',
      pacienteCPF: agendamento.pacienteCPF || '',
      especialidade: agendamento.especialidade,
      convenio: agendamento.convenio,
      convenioNumber: agendamento.convenioNumber || '',
      convenioValidUntil: agendamento.convenioValidUntil || '',
      convenioStatus: agendamento.convenioStatus || (isParticularInsurance(agendamento.convenio) ?PARTICULAR_STATUS_LABEL : 'Ativo'),
      convenioPlano: agendamento.convenioPlano || '',
      data: appointmentDate,
      hora: agendamento.hora,
      profissional: agendamento.medicoNome,
      roomId: agendamento.roomId || '',
      medicalEquipmentId: agendamento.medicalEquipmentId || '',
      tipoConsulta: agendamento.tipoConsulta,
      modalidadeAtendimento: agendamento.modalidadeAtendimento || 'Presencial',
      informacoes: agendamento.observacoes,
    });
    const specialties = agendamento.especialidade
      ?agendamento.especialidade.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    setSelectedSpecialties(specialties);
    setSelectedPatientId(agendamento.patientId || null);
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setIsEditing(false);
    setEditingAgendamentoId(null);
    setRescheduleSourceId(agendamento.id);
    setReviewAttachments([]);
    setExistingAttachments([]);
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
        convenio: PARTICULAR_INSURANCE_LABEL,
        convenioNumber: '',
        convenioValidUntil: '',
        convenioStatus: PARTICULAR_STATUS_LABEL,
      }));
      return;
    }
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setSelectedPatientId(value);
    const p = patientById[value];
    if (!p) return;
    const insuranceFields = buildInsuranceFormValues(p);
    setNovoAgendamento((prev) => ({
      ...prev,
      pacienteId: String(p.id ?? p.patientId ?? value),
      pacienteNome: p.name || p.fullName || p.patientName || prev.pacienteNome || '',
      pacienteCPF: p.cpf || prev.pacienteCPF || '',
      ...insuranceFields,
    }));
  };
  useEffect(() => {
    if (!selectedPatientId || isManualPatientFlow) return;
    const patient = patientById[selectedPatientId];
    if (!patient) return;
    const insuranceFields = buildInsuranceFormValues(patient);
    setNovoAgendamento((prev) => ({
      ...prev,
      pacienteId: String(patient.id ?? patient.patientId ?? selectedPatientId),
      pacienteNome: patient.name || patient.fullName || patient.patientName || prev.pacienteNome || '',
      pacienteCPF: patient.cpf || prev.pacienteCPF || '',
      ...insuranceFields,
    }));
  }, [selectedPatientId, patientById, isManualPatientFlow]);
  const handleEnableManualPatientFlow = () => {
    setIsManualPatientFlow(true);
    setSelectedPatientId(null);
    setNovoAgendamento((prev) => ({
      ...prev,
      pacienteId: '',
      pacienteNome: pendingPatient.name || '',
      pacienteCPF: pendingPatient.cpf || '',
      convenio: prev.convenio || PARTICULAR_INSURANCE_LABEL,
    }));
  };
  const handleDisableManualPatientFlow = () => {
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setNovoAgendamento((prev) => ({
      ...prev,
      pacienteId: '',
      pacienteNome: '',
      pacienteCPF: '',
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
          pacienteNome: field === 'name' ?String(value) : next.name,
          pacienteCPF: field === 'cpf' ?String(value) : next.cpf,
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
        hasHealthInsurance: normalizeComparableText(novoAgendamento.convenio) !== normalizeComparableText(PARTICULAR_INSURANCE_LABEL),
        healthInsuranceName:
          normalizeComparableText(novoAgendamento.convenio) !== normalizeComparableText(PARTICULAR_INSURANCE_LABEL)
            ?(novoAgendamento.convenio || undefined)
            : undefined,
        healthInsuranceNumber:
          normalizeComparableText(novoAgendamento.convenio) !== normalizeComparableText(PARTICULAR_INSURANCE_LABEL)
            ?(novoAgendamento.convenioNumber || undefined)
            : undefined,
        healthInsuranceExpiry:
          normalizeComparableText(novoAgendamento.convenio) !== normalizeComparableText(PARTICULAR_INSURANCE_LABEL)
            ?(novoAgendamento.convenioValidUntil || undefined)
            : undefined,
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
        const label = nextPatient.name || 'Paciente';
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
      const fieldErrors = err?.response?.data?.fields;
      const firstFieldError = fieldErrors && typeof fieldErrors === 'object'
        ?Object.values(fieldErrors).find((value) => typeof value === 'string' && value.trim().length > 0)
        : null;
      showNotification({
        title: 'Erro ao finalizar cadastro',
        message: String(firstFieldError || err?.response?.data?.message || err?.message || 'Não foi possível criar o paciente antes do agendamento.'),
        color: 'red',
      });
      return null;
    }
  };

  const resolveSchedulingError = (err: any, fallbackMessage: string) => {
    const api = err?.response?.data || {};
    const baseMessage = String(api?.message || err?.message || fallbackMessage);
    const details = String(api?.details || '').trim();
    const conflictType = String(api?.conflictType || '').trim().toUpperCase();

    const title = conflictType ? 'Conflito de agenda' : 'Erro';
    const message = details ? `${baseMessage} ${details}` : baseMessage;
    return { title, message };
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
    if (!isExamAppointment && !novoAgendamento.profissional && !hasSelectedSuggestedSchedules) {
      showNotification({ title: 'Erro', message: 'Profissional é obrigatório', color: 'red' });
      return;
    }
    if (!novoAgendamento.hora && !hasSelectedSuggestedSchedules) {
      showNotification({ title: 'Erro', message: 'Horário é obrigatório', color: 'red' });
      return;
    }
    if (isExamAppointment && !isMultiProcedureFlow) {
      if (!canSelectExamResources) {
        showNotification({
          title: 'Configuração de recurso incompleta',
          message: 'Para agendar EXAME é necessário ter sala com turno e equipamento ativo vinculado ao procedimento.',
          color: 'red',
        });
        return;
      }
      if (!novoAgendamento.roomId || !novoAgendamento.medicalEquipmentId) {
        showNotification({
          title: 'Recursos obrigatórios para exame',
          message: 'Selecione sala e equipamento para concluir o agendamento de exame.',
          color: 'red',
        });
        return;
      }
      const primaryProcedure = selectedSpecialties.find((name) => normalizeProcedureAppointmentType(procedureMetaByName[name]?.appointmentType) === 'EXAME') || selectedSpecialties[0];
      const selectedResource = findExamResourceForSlot({
        doctorName: novoAgendamento.profissional,
        procedureName: primaryProcedure,
        date: novoAgendamento.data,
        time: novoAgendamento.hora,
        durationMinutes: selectedProcedureDuration,
        excludeAppointmentId: isEditing ?editingAgendamentoId : null,
        preferredRoomId: novoAgendamento.roomId,
        preferredEquipmentId: novoAgendamento.medicalEquipmentId,
      });
      if (!selectedResource) {
        showNotification({
          title: 'Conflito de recurso',
          message: 'Sala/equipamento selecionados não estáo livres nesse horário. Escolha outro slot.',
          color: 'red',
        });
        return;
      }
    }
    if (false) { // Mantido desativado: múltiplos procedimentos agora podem usar seleção manual.
      showNotification({ title: 'Erro', message: 'Gere a sugestão de horários próximos antes de confirmar.', color: 'red' });
      return;
    }
    if (isEditing && isMultiProcedureFlow && hasSelectedSuggestedSchedules) {
      showNotification({ title: 'Edição em lote', message: 'A edição com múltiplos procedimentos ainda não está disponível.', color: 'yellow' });
      return;
    }
    const incompatibleProcedures = getInsuranceIncompatibleProcedures(
      novoAgendamento.convenio || PARTICULAR_INSURANCE_LABEL,
      selectedSpecialties,
    );
    if (incompatibleProcedures.length > 0) {
      const proceduresLabel = incompatibleProcedures.join(', ');
      showNotification({
        title: 'Convênio incompatível',
        message: incompatibleProcedures.length === 1
          ?`O procedimento ${proceduresLabel} não é coberto pelo convênio selecionado.`
          : `Os procedimentos ${proceduresLabel} não são cobertos pelo convênio selecionado.`,
        color: 'red',
      });
      return;
    }
    const resolvedPatient = await ensurePatientForScheduling();
    if (!resolvedPatient) return;
    const resolvedInsuranceName = novoAgendamento.convenio || PARTICULAR_INSURANCE_LABEL;
    setSavingAgendamento(true);
    if (isEditing && editingAgendamentoId !== null) {
      const current = agendamentos.find((a) => a.id === editingAgendamentoId);
      try {
        const basePayload = {
          branchId: selectedBranchId || undefined,
          patientId: resolvedPatient.patientId || undefined,
          patientName: resolvedPatient.patientName || undefined,
          patientCpf: resolvedPatient.patientCpf || undefined,
          doctorName: novoAgendamento.profissional || undefined,
          roomId: isExamAppointment ?(novoAgendamento.roomId || undefined) : undefined,
          medicalEquipmentId: isExamAppointment ?(novoAgendamento.medicalEquipmentId || undefined) : undefined,
          specialty: selectedSpecialties.join(', '),
          durationMinutes: selectedProcedureDuration,
          convenio: resolvedInsuranceName,
          insurancePlan: novoAgendamento.convenioPlano || undefined,
          convenioNumber: novoAgendamento.convenioNumber || undefined,
          convenioValidUntil: novoAgendamento.convenioValidUntil || undefined,
          convenioStatus: novoAgendamento.convenioStatus || undefined,
          insurance: resolvedInsuranceName,
          healthInsuranceName: resolvedInsuranceName,
          date: formatDateForApi(novoAgendamento.data),
          time: novoAgendamento.hora,
          type: resolvedAppointmentType,
          observations: buildAppointmentObservations(novoAgendamento.informacoes || '', novoAgendamento.modalidadeAtendimento),
        };
        await appointmentService.update(editingAgendamentoId, {
          ...basePayload,
          patientName: basePayload.patientName || current?.pacienteNome || undefined,
          patientCpf: basePayload.patientCpf || current?.pacienteCPF || undefined,
          status: current?.status || undefined,
          totem: current?.totem,
        });
        if (reviewAttachments.length > 0) {
          for (const file of reviewAttachments) {
            const fileBase64 = await fileToBase64(file);
            await appointmentAttachmentService.uploadAttachment(editingAgendamentoId, {
              fileName: file.name,
              fileBase64,
              mimeType: file.type || undefined,
            });
          }
        }
        await loadAgendamentos();
        showNotification({
          title: 'Agendamento atualizado',
          message: reviewAttachments.length > 0
            ?'Dados do agendamento e anexos atualizados com sucesso.'
            : 'Dados do agendamento atualizados com sucesso.',
          color: 'green',
        });
      } catch (err: any) {
        const rawMessage = String(err?.message || '');
        if (rawMessage.startsWith('EXAM_RESOURCE_NOT_AVAILABLE::')) {
          const procedureName = rawMessage.split('::')[1] || 'procedimento';
          showNotification({
            title: 'Sem recurso disponível',
            message: `Não foi possível alocar sala/equipamento para ${procedureName} no horário sugerido.`,
            color: 'red',
          });
          setSavingAgendamento(false);
          return;
        }
        setSavingAgendamento(false);
        const resolvedError = resolveSchedulingError(err, 'Erro ao atualizar agendamento');
        showNotification({
          title: resolvedError.title,
          message: resolvedError.message,
          color: 'red',
        });
        return;
      }
    } else {
      try {
        const selectedScheduleItems: SuggestedProcedureSchedule[] = hasSelectedSuggestedSchedules
          ? selectedSuggestedSchedules
          : (manualProcedureSelections.length > 0
            ? manualProcedureSelections
            : [{
                procedure: selectedSpecialties[0],
                doctorName: novoAgendamento.profissional,
                date: novoAgendamento.data,
                time: novoAgendamento.hora,
                durationMinutes: selectedProcedureDuration,
              }]);
        const recurrenceCount = recurrenceEnabled
          ? Math.max(2, Math.min(12, Number(recurrenceOccurrences) || 4))
          : 1;
        const recurrenceWeeks = recurrenceEnabled
          ? Math.max(1, Math.min(4, Number(recurrenceIntervalWeeks) || 1))
          : 0;
        const recurrenceSeriesId = recurrenceEnabled ? `series-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : undefined;
        const baseDate = selectedScheduleItems[0]?.date || novoAgendamento.data;
        const appointmentPayloads = selectedScheduleItems.flatMap((scheduleItem) => {
          const dayOffset = baseDate ? dayjs(scheduleItem.date).diff(dayjs(baseDate), 'day') : 0;
          return Array.from({ length: recurrenceCount }, (_, occurrenceIndex) => {
            const occurrenceDate = baseDate
              ? addDays(baseDate, dayOffset + (occurrenceIndex * recurrenceWeeks * 7))
              : scheduleItem.date;
            const scheduleType = deriveAppointmentType([scheduleItem.procedure], novoAgendamento.tipoConsulta);
            const scheduleResource = scheduleType === 'EXAME'
              ? findExamResourceForSlot({
                  doctorName: scheduleItem.doctorName,
                  procedureName: scheduleItem.procedure,
                  date: occurrenceDate,
                  time: scheduleItem.time,
                  durationMinutes: scheduleItem.durationMinutes,
                  preferredRoomId: novoAgendamento.roomId || undefined,
                  preferredEquipmentId: novoAgendamento.medicalEquipmentId || undefined,
                })
              : null;
            if (scheduleType === 'EXAME' && !scheduleResource) {
              throw new Error(`EXAM_RESOURCE_NOT_AVAILABLE::${scheduleItem.procedure}`);
            }
            return {
              branchId: selectedBranchId || undefined,
              patientId: resolvedPatient.patientId || undefined,
              patientName: resolvedPatient.patientName || undefined,
              patientCpf: resolvedPatient.patientCpf || undefined,
              doctorName: scheduleItem.doctorName || undefined,
              roomId: scheduleResource?.roomId || (isExamAppointment ? novoAgendamento.roomId || undefined : undefined),
              medicalEquipmentId: scheduleResource?.medicalEquipmentId || (isExamAppointment ? novoAgendamento.medicalEquipmentId || undefined : undefined),
              specialty: scheduleItem.procedure,
              durationMinutes: scheduleItem.durationMinutes,
              convenio: resolvedInsuranceName,
              insurancePlan: novoAgendamento.convenioPlano || undefined,
              convenioNumber: novoAgendamento.convenioNumber || undefined,
              convenioValidUntil: novoAgendamento.convenioValidUntil || undefined,
              convenioStatus: novoAgendamento.convenioStatus || undefined,
              insurance: resolvedInsuranceName,
              healthInsuranceName: resolvedInsuranceName,
              date: formatDateForApi(occurrenceDate),
              time: scheduleItem.time,
              type: scheduleType,
              observations: buildAppointmentObservations(novoAgendamento.informacoes || '', novoAgendamento.modalidadeAtendimento),
              status: 'AGENDADO',
              totem: Math.floor(Math.random() * 100) + 1,
              rescheduledFromAppointmentId: rescheduleSourceId || undefined,
              recurrenceSeriesId,
              recurrenceIndex: recurrenceEnabled ? occurrenceIndex + 1 : undefined,
              recurrenceTotal: recurrenceEnabled ? recurrenceCount : undefined,
              simultaneousGroupId: simultaneousEnabled
                ? `simultaneous-${recurrenceSeriesId || Date.now()}-${occurrenceIndex}`
                : undefined,
            };
          });
        });
        const batchResponse = await appointmentService.createBatch({ appointments: appointmentPayloads });
        const createdAppointmentIds: string[] = (Array.isArray(batchResponse?.items) ? batchResponse.items : [])
          .map((item: any) => String(item?.id || '').trim())
          .filter(Boolean);
        if (reviewAttachments.length > 0 && createdAppointmentIds.length > 0) {
          for (const appointmentId of createdAppointmentIds) {
            for (const file of reviewAttachments) {
              const fileBase64 = await fileToBase64(file);
              await appointmentAttachmentService.uploadAttachment(appointmentId, {
                fileName: file.name,
                fileBase64,
                mimeType: file.type || undefined,
              });
            }
          }
        }
        await loadAgendamentos();
        showNotification({
          title: 'Agendamento criado',
          message: recurrenceEnabled
            ?`${recurrenceCount} ocorrência(s) criada(s)${simultaneousEnabled ? ' com marcação simultânea' : ''}${reviewAttachments.length > 0 ?' e anexos' : ''} com sucesso.`
            : isMultiProcedureFlow
              ?`${selectedScheduleItems.length} agendamentos criados${simultaneousEnabled ? ' simultaneamente' : ''}${reviewAttachments.length > 0 ?' com anexos' : ''} com sucesso.`
            : `Agendamento realizado${reviewAttachments.length > 0 ?' com anexos' : ''} com sucesso.`,
          color: 'green',
        });
      } catch (err: any) {
        setSavingAgendamento(false);
        const resolvedError = resolveSchedulingError(err, 'Erro ao criar agendamento');
        showNotification({
          title: resolvedError.title,
          message: resolvedError.message,
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
    setUpdatingStatusId(agendamentoId);
    const previousStatus = current.status;
    setAgendamentos((prev) => prev.map((a) => a.id === agendamentoId ? { ...a, status: newStatus } : a));
    try {
      await appointmentService.update(agendamentoId, { status: newStatus });
    } catch (err: any) {
      setAgendamentos((prev) => prev.map((a) => a.id === agendamentoId ? { ...a, status: previousStatus } : a));
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao atualizar status',
        color: 'red',
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const rows = paginatedAgendamentos.map((agendamento) => (
    <Box key={agendamento.id} className="agendamento-agenda-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
      {/* Time column - centered */}
      <Box className="agendamento-agenda-row__time" style={{ minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text size="sm" fw={500} c="var(--mantine-color-text)">{agendamento.hora}</Text>
      </Box>
      {/* Vertical separator and main content */}
      <Box className="agendamento-agenda-row__content" onClick={() => handleOpenAppointmentDetail(agendamento)} style={{ borderLeft: !isMobile ?'1px solid var(--mantine-color-default-border)' : 'none', paddingLeft: !isMobile ?16 : 0, flex: 1, cursor: 'pointer' }}>
        <Text fw={600} size="sm">{agendamento.pacienteNome}</Text>
        <Text size="xs" c="dimmed" mt={6}>
          {getResumoLinha(agendamento)}
        </Text>
      </Box>
      {/* Right aligned status */}
      <Box
        className="agendamento-agenda-row__actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          minWidth: isMobile ?180 : 320,
          paddingRight: isMobile ?12 : 20,
        }}
      >
        <Box className="agendamento-agenda-row__status" style={{ minWidth: isMobile ?170 : 190 }}>
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
		            w={isMobile ?170 : 190}
            disabled={updatingStatusId === agendamento.id}
            rightSection={updatingStatusId === agendamento.id ? <Loader size={14} /> : undefined}
	          />
	        </Box>
	        <Box className="agendamento-agenda-row__action-buttons">
          {(agendamento.status === 'NAO_COMPARECEU' || agendamento.status === 'CANCELADO') && (
            <Button
              className="agendamento-agenda-row__reschedule"
              size="xs"
              variant="light"
              miw={110}
              px="md"
              onClick={() => handleRescheduleAppointment(agendamento)}
            >
              Reagendar
            </Button>
          )}
          <Button className="agendamento-agenda-row__edit" size="xs" variant="subtle" onClick={() => handleEditAgendamento(agendamento)}>
            Editar
          </Button>
	        </Box>
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
      ?specialty.split(',').map((item: string) => item.trim()).filter(Boolean)
      : [];
    setSelectedPatientId(appt.patientId || null);
    setSelectedBranchId(appt.branchId || null);
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setNovoAgendamento({
      branchId: String(appt.branchId || selectedBranchId || ''),
      pacienteId: appt.patientId || '',
      pacienteNome: appt.patientName || '',
      pacienteCPF: appt.patientCpf || '',
      especialidade: specialty,
      convenio: appt.convenio || '',
      convenioNumber: appt.convenioNumber || '',
      convenioValidUntil: appt.convenioValidUntil || '',
      convenioStatus: appt.convenioStatus || '',
      convenioPlano: appt.insurancePlan || appt.insurance_plan || appt.convenioPlano || '',
      data: appt.date ?new Date(`${appt.date}T00:00:00`) : null,
      hora: appt.time || '',
      profissional: appt.doctorName || '',
      roomId: String(appt.roomId || '').trim(),
      medicalEquipmentId: String(appt.medicalEquipmentId || '').trim(),
      tipoConsulta: appt.type || '',
      modalidadeAtendimento: getAppointmentModalityFromObservation(appt.observations || ''),
      informacoes: stripTeleconsultationMarker(appt.observations || ''),
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
  const resolvedAppointmentType = deriveAppointmentType(selectedSpecialties, novoAgendamento.tipoConsulta);
  const isMultiProcedureFlow = selectedSpecialties.length > 1;
  const anchorSelection = manualProcedureSelections[0] || null;
  const getSelectableProceduresForSlot = (doctorName: string, time: string, date: Date) => {
    const currentSelectionForSlot = manualProcedureSelections.find((item) =>
      item.doctorName === doctorName
      && item.time === time
      && dayjs(item.date).isSame(date, 'day'),
    );
    const remainingProcedures = selectedSpecialties.filter((procedureName) => !manualProcedureSelections.some((item) => (
      item.procedure === procedureName
      && !(currentSelectionForSlot
        && item.procedure === currentSelectionForSlot.procedure
        && item.doctorName === currentSelectionForSlot.doctorName
        && item.time === currentSelectionForSlot.time
        && dayjs(item.date).isSame(currentSelectionForSlot.date, 'day'))
    )));
    if (currentSelectionForSlot && !remainingProcedures.includes(currentSelectionForSlot.procedure)) {
      return [currentSelectionForSlot.procedure, ...remainingProcedures];
    }
    return remainingProcedures.length > 0 ?remainingProcedures : selectedSpecialties;
  };
  const getProcedureDuration = (procedureName: string): number => {
    const duration = Number(procedureMetaByName[procedureName]?.durationMinutes);
    return Math.max(15, Number.isFinite(duration) && duration > 0 ?duration : 30);
  };
  const totalSelectedProcedureDuration = Math.max(
    15,
    selectedSpecialties.reduce((total, selected) => {
      const duration = Number(procedureMetaByName[selected]?.durationMinutes);
      return total + (Number.isFinite(duration) && duration > 0 ?duration : 30);
    }, 0) || 30,
  );
  const anchorProcedureDuration = anchorSelection?.durationMinutes || null;
  const selectedProcedureDuration = Math.max(
    15,
    isMultiProcedureFlow
      ?(anchorProcedureDuration || 30)
      : totalSelectedProcedureDuration,
  );
  const filteredDoctorOptions = doctorOptions.filter((option) => {
    const normalizedAvailabilitySearch = normalizeComparableText(availabilitySearch);
    if (normalizedAvailabilitySearch && !normalizeComparableText(option.label).includes(normalizedAvailabilitySearch)) return false;
    if (availabilityGenderFilter) {
      const doctorGender = normalizeComparableText(doctorMetaByName[option.value]?.gender);
      if (doctorGender !== normalizeComparableText(availabilityGenderFilter)) return false;
    }
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
      return matchesDoctorToProcedure(doctorSpecialties, normalizedSelected);
    });
  });
  const isExamAppointment = resolvedAppointmentType === 'EXAME';
  const doctorSupportsTeleconsultation = (doctorName: string) => Boolean(
    doctorName
    && doctorMetaByName[doctorName]
    && Array.isArray(doctorMetaByName[doctorName].specialties)
    && doctorMetaByName[doctorName].specialties.some((item) => String(item) === TELECONSULTATION_SPECIALTY_FLAG),
  );
  const selectedProceduresSupportTeleconsultation = Boolean(
    selectedSpecialties.length > 0
    && selectedSpecialties.every((name) => Boolean(procedureMetaByName[name]?.supportsTeleconsultation)),
  );
  const teleconsultationDoctorOptions = filteredDoctorOptions.filter((option) => (
    doctorSupportsTeleconsultation(option.value)
  ));
  const canScheduleAsTeleconsultation = Boolean(
    resolvedAppointmentType === 'CONSULTA'
    && selectedProceduresSupportTeleconsultation
    && teleconsultationDoctorOptions.length > 0,
  );
  useEffect(() => {
    if (!canScheduleAsTeleconsultation && novoAgendamento.modalidadeAtendimento === 'Teleconsulta') {
      setNovoAgendamento((prev) => ({ ...prev, modalidadeAtendimento: 'Presencial', hora: '' }));
      setManualProcedureSelections([]);
      setSuggestedOptions([]);
      setSelectedSuggestedOptionId(null);
    }
  }, [canScheduleAsTeleconsultation, novoAgendamento.modalidadeAtendimento]);
  const availableDoctorOptions = novoAgendamento.modalidadeAtendimento === 'Teleconsulta'
    ? teleconsultationDoctorOptions
    : filteredDoctorOptions;
  const branchList = Array.isArray(branchesQuery.data)
    ? branchesQuery.data
    : (Array.isArray((branchesQuery.data as any)?.items) ? (branchesQuery.data as any).items : []);
  const branchOptions = branchList
    .map((branch: any) => {
      const value = String(branch?.id || '').trim();
      const label = String(branch?.tradeName || branch?.name || '').trim();
      return value && label ? { value, label } : null;
    })
    .filter(Boolean) as { value: string; label: string }[];
  const appointmentModalityOptions = [
    { value: 'Presencial', label: 'Presencial' },
    ...(canScheduleAsTeleconsultation ? [{ value: 'Teleconsulta', label: 'Teleconsulta' }] : []),
  ];
  const handleModalityChange = (value: string | null) => {
    const nextModality = value === 'Teleconsulta' && canScheduleAsTeleconsultation
      ? 'Teleconsulta'
      : 'Presencial';
    setNovoAgendamento((prev) => ({
      ...prev,
      modalidadeAtendimento: nextModality,
      profissional: nextModality === 'Teleconsulta'
        && prev.profissional
        && !teleconsultationDoctorOptions.some((option) => option.value === prev.profissional)
        ? ''
        : prev.profissional,
      hora: '',
    }));
    setManualProcedureSelections([]);
    setSuggestedOptions([]);
    setSelectedSuggestedOptionId(null);
  };
  const examProcedureIds = selectedSpecialties
    .filter((name) => normalizeProcedureAppointmentType(procedureMetaByName[name]?.appointmentType) === 'EXAME')
    .map((name) => String(procedureMetaByName[name]?.id || '').trim())
    .filter(Boolean);
  const selectedDoctorRoomIds = Array.from(new Set(
    (doctorMetaByName[novoAgendamento.profissional]?.roomIds || [])
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  ));
  const roomsList = (Array.isArray(roomsQuery.data) ?roomsQuery.data : [])
    .filter((item: any) => isRoomSector(item))
    .filter((item: any) => !selectedBranchId || String(item?.branchId || '').trim() === selectedBranchId);
  const roomLabelById = roomsList.reduce<Record<string, string>>((acc, room: any) => {
    const id = String(room?.id || '').trim();
    if (!id) return acc;
    const name = String(room?.name || room?.nome || `Sala ${id}`).trim();
    acc[id] = name || `Sala ${id}`;
    return acc;
  }, {});
  const agendaListForRooms: any[] = Array.isArray(agendasQuery.data)
    ? agendasQuery.data
    : (Array.isArray((agendasQuery.data as any)?.items) ? (agendasQuery.data as any).items : []);
  const agendaByRoomId = groupAgendasByKey(agendaListForRooms, (agenda) => {
    const roomId = String(agenda?.roomId || '').trim();
    return roomId || null;
  });
  const roomScheduleById = roomsList.reduce<Record<string, RoomScheduleMeta>>((acc, room: any) => {
    const id = String(room?.id || '').trim();
    if (!id) return acc;
    acc[id] = {
      id,
      name: roomLabelById[id] || String(room?.name || '').trim() || `Sala ${id}`,
      workingDays: Array.isArray(room?.workingDays)
        ?room.workingDays.map((day: any) => String(day || '').trim()).filter(Boolean)
        : [],
      workingHoursStart: String(room?.workingHoursStart || '').trim() || undefined,
      workingHoursEnd: String(room?.workingHoursEnd || '').trim() || undefined,
      agendaByWeekday: agendaByRoomId[id],
    };
    return acc;
  }, {});
  const eligibleEquipments = (Array.isArray(medicalEquipmentsQuery.data) ?medicalEquipmentsQuery.data : []).filter((equipment: any) => {
    const equipmentId = String(equipment?.id || '').trim();
    const roomId = String(equipment?.roomId || '').trim();
    const status = String(equipment?.status || '').trim().toUpperCase();
    if (!equipmentId || !roomId) return false;
    if (equipment?.isActive === false) return false;
    if (status === 'INATIVO' || status === 'INACTIVE' || status === 'MANUTENCAO' || status === 'MANUTENÇÃO') return false;
    if (!isExamAppointment && novoAgendamento.profissional && selectedDoctorRoomIds.length > 0 && !selectedDoctorRoomIds.includes(roomId)) return false;
    if (!examProcedureIds.length) return false;
    const procedureIds = Array.isArray(equipment?.procedureIds)
      ?equipment.procedureIds.map((item: any) => String(item || '').trim()).filter(Boolean)
      : [];
    return examProcedureIds.some((procedureId) => procedureIds.includes(procedureId));
  });
  const eligibleRoomOptions = Array.from(new Set(eligibleEquipments.map((item: any) => String(item?.roomId || '').trim()).filter(Boolean)))
    .map((roomId) => ({ value: roomId, label: roomLabelById[roomId] || `Sala ${roomId}` }));
  const eligibleEquipmentOptions = eligibleEquipments
    .filter((item: any) => !novoAgendamento.roomId || String(item?.roomId || '').trim() === novoAgendamento.roomId)
    .map((item: any) => {
      const id = String(item?.id || '').trim();
      const name = String(item?.name || '').trim() || 'Equipamento';
      const roomName = roomLabelById[String(item?.roomId || '').trim()] || 'Sala';
      return { value: id, label: `${name} • ${roomName}` };
    });
  const canSelectExamResources = isExamAppointment && examProcedureIds.length > 0 && eligibleRoomOptions.length > 0;
  const examResourcesSelected = Boolean(!isExamAppointment || (novoAgendamento.roomId && novoAgendamento.medicalEquipmentId));
  const getActiveBlockingAppointmentsForDate = (dateIso: string) => agendamentos.filter((item) => {
    if (item.data !== dateIso) return false;
    const normalized = normalizeAppointmentStatus(item.status);
    return normalized !== 'CANCELADO' && normalized !== 'NAO_COMPARECEU';
  });
  const findExamResourceForSlot = (params: {
    doctorName: string;
    procedureName: string;
    date: Date;
    time: string;
    durationMinutes: number;
    excludeAppointmentId?: string | null;
    preferredRoomId?: string;
    preferredEquipmentId?: string;
  }) => {
    const doctorRooms = (doctorMetaByName[params.doctorName]?.roomIds || [])
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    const procedureId = String(procedureMetaByName[params.procedureName]?.id || '').trim();
    if (!procedureId) return null;
    const preferredRoomId = String(params.preferredRoomId || '').trim();
    const preferredEquipmentId = String(params.preferredEquipmentId || '').trim();
    const candidateEquipments = (Array.isArray(medicalEquipmentsQuery.data) ?medicalEquipmentsQuery.data : []).filter((equipment: any) => {
      const equipmentId = String(equipment?.id || '').trim();
      const roomId = String(equipment?.roomId || '').trim();
      const status = String(equipment?.status || '').trim().toUpperCase();
      if (!equipmentId || !roomId) return false;
      if (equipment?.isActive === false) return false;
      if (status === 'INATIVO' || status === 'INACTIVE' || status === 'MANUTENCAO' || status === 'MANUTENÇÃO') return false;
      if (doctorRooms.length > 0 && !doctorRooms.includes(roomId)) return false;
      if (preferredRoomId && roomId !== preferredRoomId) return false;
      if (preferredEquipmentId && equipmentId !== preferredEquipmentId) return false;
      const procedureIds = Array.isArray(equipment?.procedureIds)
        ?equipment.procedureIds.map((item: any) => String(item || '').trim()).filter(Boolean)
        : [];
      return procedureIds.includes(procedureId);
    });
    const startMinute = parseTimeToMinutes(params.time);
    if (startMinute === null) return null;
    const endMinute = startMinute + Math.max(15, Number(params.durationMinutes) || 30);
    const dateIso = dayjs(params.date).format('YYYY-MM-DD');
    const dateAppointments = getActiveBlockingAppointmentsForDate(dateIso);
    const sortedCandidates = [...candidateEquipments].sort((a: any, b: any) => {
      const aId = String(a?.id || '').trim();
      const bId = String(b?.id || '').trim();
      const aRoomId = String(a?.roomId || '').trim();
      const bRoomId = String(b?.roomId || '').trim();
      const aScore = (preferredEquipmentId && aId === preferredEquipmentId ?10 : 0) + (preferredRoomId && aRoomId === preferredRoomId ?5 : 0);
      const bScore = (preferredEquipmentId && bId === preferredEquipmentId ?10 : 0) + (preferredRoomId && bRoomId === preferredRoomId ?5 : 0);
      return bScore - aScore;
    });
    for (const equipment of sortedCandidates) {
      const equipmentId = String(equipment?.id || '').trim();
      const roomId = String(equipment?.roomId || '').trim();
      const hasConflict = dateAppointments.some((item) => {
        if (params.excludeAppointmentId && item.id === params.excludeAppointmentId) return false;
        const apptStart = parseTimeToMinutes(item.hora);
        if (apptStart === null) return false;
        const apptEnd = apptStart + Math.max(15, Number(item.durationMinutes) || 30);
        if (!(startMinute < apptEnd && endMinute > apptStart)) return false;
        return item.roomId === roomId || item.medicalEquipmentId === equipmentId;
      });
      if (!hasConflict) {
        return { roomId, medicalEquipmentId: equipmentId };
      }
    }
    return null;
  };
  const schedulerDoctors = (() => {
    if (isExamAppointment) {
      if (!examResourcesSelected) return [] as string[];
      return novoAgendamento.roomId ?[novoAgendamento.roomId] : [];
    }
    if (novoAgendamento.profissional) return [novoAgendamento.profissional];
    if (isMultiProcedureFlow && manualProcedureSelections.length > 0) {
      return Array.from(new Set([
        ...manualProcedureSelections.map((item) => item.doctorName),
        ...availableDoctorOptions.map((item) => item.value),
      ]));
    }
    return availableDoctorOptions.map((item) => item.value);
  })();
  const getAppointmentsForDate = (date: Date) => {
    const dateKey = dayjs(date).format('YYYY-MM-DD');
    const merged = [...agendamentos, ...availabilityAgendamentos];
    return merged.filter((item, index, all) => (
      item.data === dateKey
      && item.status !== 'CANCELADO'
      && all.findIndex((candidate) => candidate.id === item.id) === index
    ));
  };
  const selectedProcedureSummary = Array.isArray(selectedSpecialties) ?selectedSpecialties : [];
  const selectedDayKey = selectedDay ?dayjs(selectedDay).format('YYYY-MM-DD') : null;
  const selectedDayAppointments = selectedDayKey ?(agendamentosByDate[selectedDayKey] || []) : [];
  const selectedDayStatusSummary = getAppointmentStatusSummary(selectedDayAppointments);
  
  const selectedPatientCpfDigits = onlyDigits(novoAgendamento.pacienteCPF || pendingPatient.cpf);
  const canEditInsuranceFields = Boolean(
    selectedPatientId
    || String(pendingPatient.name || '').trim()
    || String(novoAgendamento.pacienteNome || '').trim(),
  );
  const safeSuggestedOptions = Array.isArray(suggestedOptions) ?suggestedOptions : [];
  const selectedSuggestedOption = safeSuggestedOptions.find((option) => option.id === selectedSuggestedOptionId) || null;
  const selectedSuggestedSchedules = selectedSuggestedOption?.items || [];
  const hasSelectedSuggestedSchedules = !simultaneousEnabled && isMultiProcedureFlow && selectedSuggestedSchedules.length === selectedProcedureSummary.length;
  const hasSelectedSimultaneousSchedules = simultaneousEnabled
    && selectedProcedureSummary.length > 1
    && manualProcedureSelections.length === selectedProcedureSummary.length
    && manualProcedureSelections.every((item) => dayjs(item.date).isSame(dayjs(manualProcedureSelections[0]?.date), 'day') && item.time === manualProcedureSelections[0]?.time);
  const selectedSuggestedOptionLabel = selectedSuggestedOption
    ?`Opção ${safeSuggestedOptions.findIndex((option) => option.id === selectedSuggestedOption.id) + 1}`
    : null;
  const reviewPrimaryManualSelection = manualProcedureSelections[0] || null;
  const reviewPrimarySuggestedSelection = selectedSuggestedSchedules[0] || null;
  const reviewDateValue = reviewPrimaryManualSelection?.date || reviewPrimarySuggestedSelection?.date || novoAgendamento.data;
  const reviewTimeValue = reviewPrimaryManualSelection?.time || reviewPrimarySuggestedSelection?.time || novoAgendamento.hora || '';
  const reviewProfessionalValue = reviewPrimaryManualSelection?.doctorName || reviewPrimarySuggestedSelection?.doctorName || novoAgendamento.profissional || '';
  const insuranceSelectData = canEditInsuranceFields ?insuranceOptions : [];
  const insuranceSelectValue = canEditInsuranceFields ?novoAgendamento.convenio : '';
  const insuranceSelectPlaceholder = !canEditInsuranceFields
    ?'Selecione um paciente primeiro'
    : (insurancesLoading ?'Carregando convênios...' : 'Selecione o convênio');
  const insuranceCardNumberValue = canEditInsuranceFields ?novoAgendamento.convenioNumber : NOT_APPLICABLE_LABEL;
  const insuranceValidityValue = canEditInsuranceFields ?novoAgendamento.convenioValidUntil : NOT_APPLICABLE_LABEL;
  const insuranceStatusValue = canEditInsuranceFields ?novoAgendamento.convenioStatus : '';
  const hasAnySelectedSchedule = Boolean(
    novoAgendamento.hora
    || manualProcedureSelections.length
    || selectedSuggestedOptionId
    || suggestedOptions.length,
  );
  const hasManualScheduleSelection = Boolean(
    novoAgendamento.hora && (isExamAppointment || Boolean(novoAgendamento.profissional)),
  );
  const selectedScheduleCount = hasSelectedSuggestedSchedules
    ? selectedSuggestedSchedules.length
    : hasSelectedSimultaneousSchedules
      ? manualProcedureSelections.length
      : manualProcedureSelections.length || (hasManualScheduleSelection ? 1 : 0);
  const selectedScheduleDateLabel = reviewDateValue ? dayjs(reviewDateValue).format('DD/MM/YYYY') : '';
  const selectedScheduleTimeLabel = reviewTimeValue || '';
  useEffect(() => {
    if (!isExamAppointment) {
      if (novoAgendamento.roomId || novoAgendamento.medicalEquipmentId) {
        setNovoAgendamento((prev) => ({ ...prev, roomId: '', medicalEquipmentId: '' }));
      }
      return;
    }
    if (novoAgendamento.roomId && !eligibleRoomOptions.some((item) => item.value === novoAgendamento.roomId)) {
      setNovoAgendamento((prev) => ({ ...prev, roomId: '', medicalEquipmentId: '' }));
      return;
    }
    if (novoAgendamento.medicalEquipmentId && !eligibleEquipmentOptions.some((item) => item.value === novoAgendamento.medicalEquipmentId)) {
      setNovoAgendamento((prev) => ({ ...prev, medicalEquipmentId: '' }));
      return;
    }
    if (!novoAgendamento.roomId && eligibleRoomOptions.length === 1) {
      const onlyRoom = eligibleRoomOptions[0]?.value || '';
      if (onlyRoom) {
        setNovoAgendamento((prev) => ({ ...prev, roomId: onlyRoom }));
      }
    }
  }, [
    isExamAppointment,
    novoAgendamento.roomId,
    novoAgendamento.medicalEquipmentId,
    eligibleRoomOptions,
    eligibleEquipmentOptions,
  ]);
  useEffect(() => {
    if (!isExamAppointment) return;
    if (!novoAgendamento.roomId) return;
    if (novoAgendamento.medicalEquipmentId) return;
    if (eligibleEquipmentOptions.length !== 1) return;
    const onlyEquipment = eligibleEquipmentOptions[0]?.value || '';
    if (!onlyEquipment) return;
    setNovoAgendamento((prev) => ({ ...prev, medicalEquipmentId: onlyEquipment }));
  }, [
    isExamAppointment,
    novoAgendamento.roomId,
    novoAgendamento.medicalEquipmentId,
    eligibleEquipmentOptions,
  ]);
  const manualRangesForGrid = manualProcedureSelections
    .filter((item) => dayjs(item.date).isSame(schedulingDate, 'day'))
    .map((item, index) => ({
      date: item.date,
      doctorName: item.doctorName,
      startMinute: parseTimeToMinutes(item.time) || 0,
      endMinute: (parseTimeToMinutes(item.time) || 0) + item.durationMinutes,
      time: item.time,
      procedure: item.procedure,
      isPrimary: index === 0,
    }));
  const suggestedRangesForGrid = hasSelectedSuggestedSchedules
    ?selectedSuggestedSchedules
        .filter((item) => dayjs(item.date).isSame(schedulingDate, 'day'))
        .map((item) => {
          const startMinute = parseTimeToMinutes(item.time);
          if (startMinute === null) return null;
          return {
            date: item.date,
            doctorName: item.doctorName,
            startMinute,
            endMinute: startMinute + item.durationMinutes,
            time: item.time,
            procedure: item.procedure,
          };
        })
        .filter(Boolean) as Array<{
          date: Date;
          doctorName: string;
          startMinute: number;
          endMinute: number;
          time: string;
          procedure: string;
        }>
    : [];
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
      ((isMultiProcedureFlow && hasSelectedSuggestedSchedules) || hasSelectedSimultaneousSchedules)
      || (!isMultiProcedureFlow && hasManualScheduleSelection)
    ) &&
    (
      !isExamAppointment
      || isMultiProcedureFlow
      || (novoAgendamento.roomId && novoAgendamento.medicalEquipmentId)
    ) &&
    (!isManualPatientFlow || pendingPatientReadyForCreation),
  );
  const canAdvanceToAvailability = Boolean(
    hasPatientContext
    && novoAgendamento.convenio
    && selectedProcedureSummary.length > 0
    && (!isManualPatientFlow || pendingPatientReadyForCreation),
  );
  const canAdvanceToReview = Boolean(
    novoAgendamento.data
    && (
      ((isMultiProcedureFlow && hasSelectedSuggestedSchedules) || hasSelectedSimultaneousSchedules)
      || (!isMultiProcedureFlow && hasManualScheduleSelection)
    )
    && (
      !isExamAppointment
      || isMultiProcedureFlow
      || (novoAgendamento.roomId && novoAgendamento.medicalEquipmentId)
    ),
  );
  const goToSchedulingStep = (step: number) => {
    const nextStep = Math.max(0, Math.min(2, step));
    setSchedulingStep(nextStep);
    window.requestAnimationFrame(() => {
      schedulerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const handleContinueToAvailability = () => {
    if (!hasPatientContext) {
      showNotification({
        title: 'Paciente pendente',
        message: 'Selecione um paciente ou preencha os dados mínimos do novo paciente para continuar.',
        color: 'yellow',
      });
      return;
    }
    if (isManualPatientFlow && !pendingPatientReadyForCreation) {
      showNotification({
        title: 'Cadastro do paciente incompleto',
        message: 'Informe data de nascimento, gênero e celular antes de escolher o horário.',
        color: 'yellow',
      });
      return;
    }
    if (!novoAgendamento.convenio) {
      showNotification({ title: 'Convênio pendente', message: 'Selecione o convênio antes de escolher o horário.', color: 'yellow' });
      return;
    }
    if (selectedProcedureSummary.length === 0) {
      showNotification({ title: 'Procedimento pendente', message: 'Selecione ao menos um procedimento antes de escolher o horário.', color: 'yellow' });
      return;
    }
    goToSchedulingStep(1);
  };
  const handleContinueToReview = () => {
    if (!canAdvanceToReview) {
      showNotification({
        title: 'Horário pendente',
        message: isMultiProcedureFlow
          ? 'Gere e selecione uma sugestão com todos os procedimentos antes de revisar.'
          : 'Selecione um horário disponível antes de revisar o agendamento.',
        color: 'yellow',
      });
      return;
    }
    goToSchedulingStep(2);
  };
  
  const safeSchedulerDoctors = Array.isArray(schedulerDoctors) ?schedulerDoctors : [];
  const schedulePeriods: Array<'Manhã' | 'Tarde' | 'Noite'> = activeSchedulePeriod === 'Todos'
    ? ['Manhã', 'Tarde', 'Noite']
    : [activeSchedulePeriod];
  const getScheduleSlotsForResource = (resourceName: string, date: Date) => (
    schedulePeriods
      .flatMap((period) => (
        isExamAppointment
          ? buildRoomSlots(roomScheduleById[resourceName], period, date)
          : buildDoctorSlots(doctorMetaByName[resourceName], period, date)
      ))
      .filter((slot, index, slots) => slots.indexOf(slot) === index)
  );
  const doctorSlotsByName = safeSchedulerDoctors.reduce<Record<string, string[]>>((acc, doctorName) => {
    acc[doctorName] = getScheduleSlotsForResource(doctorName, schedulingDate);
    return acc;
  }, {});
  const findOverlappingAppointment = (
    doctorName: string,
    slotStartMinute: number,
    slotEndMinute: number,
    date: Date = schedulingDate,
    ignoreAppointmentId?: string | null,
  ) => {
    const baseAppointments = getAppointmentsForDate(date).filter((item) => {
      if (ignoreAppointmentId && item.id === ignoreAppointmentId) return false;
      if (isExamAppointment) {
        const sameRoom = String(item.roomId || '') === String(doctorName || '');
        const sameEquipment = String(item.medicalEquipmentId || '') === String(novoAgendamento.medicalEquipmentId || '');
        return sameRoom || sameEquipment;
      }
      return item.medicoNome === doctorName;
    });
    return baseAppointments.find((item) => {
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
    if (isPastTimeForDate(date, slot)) return false;
    const slotStartMinute = parseTimeToMinutes(slot);
    if (slotStartMinute === null) return false;
    const slotEndMinute = slotStartMinute + durationMinutes;
    const period = resolveTurnoFromTime(slot) || 'Manhã';
    const [, periodEnd] = PERIOD_RANGES[period];
    if (slotEndMinute > periodEnd) return false;
    if (isExamAppointment) {
      if (!novoAgendamento.roomId || !novoAgendamento.medicalEquipmentId) return false;
      const roomMeta = roomScheduleById[doctorName];
      const roomEndMinute = parseTimeToMinutes(roomMeta?.workingHoursEnd);
      if (roomEndMinute !== null && slotEndMinute > roomEndMinute) return false;
    } else {
      const doctorMeta = doctorMetaByName[doctorName];
      const doctorEndMinute = parseTimeToMinutes(doctorMeta?.workingHoursEnd);
      if (doctorEndMinute !== null && slotEndMinute > doctorEndMinute) return false;
    }
    if (findOverlappingAppointment(doctorName, slotStartMinute, slotEndMinute, date, ignoreAppointmentId)) return false;
    if (patientHasConflict(slotStartMinute, slotEndMinute, date, ignoreAppointmentId)) return false;
    return true;
  };
  const slotSupportsProcedureDuration = (doctorName: string, slot: string, date: Date = schedulingDate) =>
    slotSupportsDuration(doctorName, slot, selectedProcedureDuration, date, editingAgendamentoId);
  const getSchedulableProceduresForSlot = (doctorName: string, time: string, date: Date = schedulingDate) => {
    const selectableProcedures = getSelectableProceduresForSlot(doctorName, time, date);
    if (selectableProcedures.length === 0) return [];
    const candidateDoctors = doctorName
      ?[doctorName]
      : safeSchedulerDoctors.filter((candidateDoctor) => {
        const candidateSlots = getScheduleSlotsForResource(candidateDoctor, date);
        return candidateSlots.includes(time);
      });
    return selectableProcedures.filter((procedureName) => {
      const durationMinutes = getProcedureDuration(procedureName);
      return candidateDoctors.some((candidateDoctor) => (
        slotSupportsDuration(candidateDoctor, time, durationMinutes, date, editingAgendamentoId)
      ));
    });
  };
  const selectedSlotStartMinute = parseTimeToMinutes(novoAgendamento.hora);
  const selectedSlotEndMinute = selectedSlotStartMinute !== null
    ?selectedSlotStartMinute + selectedProcedureDuration
    : null;
  const flattenedScheduleSlots = safeSchedulerDoctors
    .flatMap((doctor) => {
      const doctorSlots = doctorSlotsByName[doctor] || [];
      return doctorSlots.map((slot) => {
        const slotStartMinute = parseTimeToMinutes(slot) || 0;
        const currentAppointment = findOverlappingAppointment(doctor, slotStartMinute, slotStartMinute + 15);
        const isSelected = !isMultiProcedureFlow
          && novoAgendamento.hora === slot
          && (
            isExamAppointment
              ?String(novoAgendamento.roomId || '') === String(doctor || '')
              : novoAgendamento.profissional === doctor
          );
        const matchingManualRange = manualRangesForGrid.find((item) =>
          item.doctorName === doctor
          && slotStartMinute >= item.startMinute
          && slotStartMinute < item.endMinute,
        ) || null;
        const isAnchorStart = Boolean(matchingManualRange && matchingManualRange.time === slot);
        const matchingSuggestedRange = suggestedRangesForGrid.find((item) =>
          item.doctorName === doctor
          && slotStartMinute >= item.startMinute
          && slotStartMinute < item.endMinute,
        ) || null;
        const isSuggestedStart = Boolean(matchingSuggestedRange && matchingSuggestedRange.time === slot);
        const isCoveredBySelectedRange = Boolean(
          !isSelected
          && novoAgendamento.profissional === doctor
          && selectedSlotStartMinute !== null
          && selectedSlotEndMinute !== null
          && slotStartMinute >= selectedSlotStartMinute
          && slotStartMinute < selectedSlotEndMinute,
        );
        const isOccupied = Boolean(currentAppointment);
        const schedulableProcedures = getSchedulableProceduresForSlot(doctor, slot, schedulingDate);
        const durationFits = isMultiProcedureFlow
          ?schedulableProcedures.length > 0
          : slotSupportsProcedureDuration(doctor, slot);
        const isTooShort = !isOccupied && !durationFits;
        const doctorLabel = isExamAppointment
          ?(roomLabelById[String(doctor || '').trim()] || 'Sala')
          : doctor;
        return {
          key: `${doctor}-${slot}`,
          doctor,
          doctorLabel,
          slot,
          isSelected,
          isAnchorStart,
          anchorProcedure: matchingManualRange?.procedure || '',
          isPrimaryAnchor: Boolean(matchingManualRange?.isPrimary),
          isCoveredByAnchorRange: Boolean(matchingManualRange && matchingManualRange.time !== slot),
          isSuggestedStart,
          suggestedProcedure: matchingSuggestedRange?.procedure || '',
          isCoveredBySuggestedRange: Boolean(matchingSuggestedRange && matchingSuggestedRange.time !== slot),
          isCoveredBySelectedRange,
          isOccupied,
          isTooShort,
          schedulableProcedures,
          minute: slotStartMinute,
        };
      });
    })
    .filter((item) => !item.isOccupied && !item.isTooShort)
    .sort((a, b) => (a.minute - b.minute) || a.doctor.localeCompare(b.doctor));
  const scheduleSlotsByTime = flattenedScheduleSlots.reduce<Record<string, typeof flattenedScheduleSlots>>((acc, item) => {
    if (!acc[item.slot]) acc[item.slot] = [];
    acc[item.slot].push(item);
    return acc;
  }, {});
  const displayScheduleSlots = novoAgendamento.profissional
    ?flattenedScheduleSlots.map((item) => ({
        ...item,
        availableDoctorsForSlot: [item.doctor],
        availableCount: 1,
      }))
    : Object.values(scheduleSlotsByTime)
        .map((items) => {
          const first = items[0];
          return {
            ...first,
            key: `time-${first.slot}`,
            doctor: '',
            availableDoctorsForSlot: items.map((item) => item.doctor),
            availableCount: items.length,
          };
        })
        .sort((a, b) => (a.minute - b.minute));
  const normalizedAvailabilitySearch = normalizeComparableText(availabilitySearch);
  const matchesAvailabilitySearchForSlot = (slotItem: { slot: string; doctor?: string; doctorLabel?: string; schedulableProcedures?: string[] }) => {
    if (!normalizedAvailabilitySearch) return true;
    return [
      slotItem.slot,
      slotItem.doctor,
      slotItem.doctorLabel,
      ...(slotItem.schedulableProcedures || []),
    ].some((value) => normalizeComparableText(value).includes(normalizedAvailabilitySearch));
  };
  const filteredDisplayScheduleSlots = displayScheduleSlots.filter(matchesAvailabilitySearchForSlot);
  const getAvailableScheduleSlotsForDate = (date: Date) => {
    const rawSlots = safeSchedulerDoctors
    .flatMap((doctor) => {
      const slots = getScheduleSlotsForResource(doctor, date);
      return slots
        .filter((slot) => {
          const procedures = getSchedulableProceduresForSlot(doctor, slot, date);
          return isMultiProcedureFlow
            ? procedures.some((procedureName) => slotSupportsDuration(doctor, slot, getProcedureDuration(procedureName), date, editingAgendamentoId))
            : slotSupportsProcedureDuration(doctor, slot, date);
        })
        .map((slot) => ({
          key: `${doctor}-${formatDateForApi(date)}-${slot}`,
          doctor,
          doctorLabel: isExamAppointment ? (roomLabelById[doctor] || 'Sala') : doctor,
          slot,
          schedulableProcedures: getSchedulableProceduresForSlot(doctor, slot, date),
          availableDoctorsForSlot: [doctor],
        }));
    })
    .filter(matchesAvailabilitySearchForSlot)
    .sort((a, b) => (parseTimeToMinutes(a.slot) || 0) - (parseTimeToMinutes(b.slot) || 0));
    if (novoAgendamento.profissional || isExamAppointment) return rawSlots;
    return Object.values(rawSlots.reduce<Record<string, typeof rawSlots>>((acc, item) => {
      if (!acc[item.slot]) acc[item.slot] = [];
      acc[item.slot].push(item);
      return acc;
    }, {})).map((items) => ({
      ...items[0],
      key: `week-time-${formatDateForApi(date)}-${items[0].slot}`,
      doctor: '',
      doctorLabel: items.length === 1 ? '1 profissional disponível' : `${items.length} profissionais disponíveis`,
      availableDoctorsForSlot: items.map((item) => item.doctor),
    }));
  };
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(availabilityWeekStart, index));
  const weekAvailabilitySlots = weekDates.reduce<Record<string, ReturnType<typeof getAvailableScheduleSlotsForDate>>>((acc, date) => {
    acc[formatDateForApi(date)] = getAvailableScheduleSlotsForDate(date);
    return acc;
  }, {});
  const weekAvailabilityCount = Object.values(weekAvailabilitySlots).reduce((total, slots) => total + slots.length, 0);
  const getProfessionalOptionsForSlot = (
    time: string,
    date: Date,
    procedureName?: string,
    candidateActors?: string[],
  ): typeof flattenedScheduleSlots => {
    const normalizedProcedure = String(procedureName || '').trim();
    const candidateDoctors = Array.isArray(candidateActors) && candidateActors.length > 0
      ?candidateActors
      : (
        isExamAppointment
          ?(novoAgendamento.roomId ?[novoAgendamento.roomId] : safeSchedulerDoctors)
          : (
            novoAgendamento.profissional
              ?[novoAgendamento.profissional]
              : normalizedProcedure
                ?getCompatibleDoctorsForProcedure(normalizedProcedure)
                : availableDoctorOptions.map((option) => option.value)
          )
      );
    return Array.from(new Set(candidateDoctors))
      .filter(Boolean)
      .filter((doctor) => {
        const doctorSlots = getScheduleSlotsForResource(doctor, date);
        if (!doctorSlots.includes(time)) return false;
        if (normalizedProcedure) {
          return getSelectableProceduresForSlot(doctor, time, date).includes(normalizedProcedure)
            && slotSupportsDuration(doctor, time, getProcedureDuration(normalizedProcedure), date, editingAgendamentoId);
        }
        return isMultiProcedureFlow
          ?getSelectableProceduresForSlot(doctor, time, date).length > 0
          : slotSupportsProcedureDuration(doctor, time, date);
      })
      .map((doctor) => {
        const slotStartMinute = parseTimeToMinutes(time) || 0;
        const matchingManualRange = manualRangesForGrid.find((item) =>
          item.doctorName === doctor
          && dayjs(item.date).isSame(date, 'day')
          && slotStartMinute >= item.startMinute
          && slotStartMinute < item.endMinute,
        ) || null;
        const matchingSuggestedRange = suggestedRangesForGrid.find((item) =>
          item.doctorName === doctor
          && dayjs(item.date).isSame(date, 'day')
          && slotStartMinute >= item.startMinute
          && slotStartMinute < item.endMinute,
        ) || null;
        return {
          key: `${doctor}-${time}`,
          doctor,
          doctorLabel: isExamAppointment
            ?(roomLabelById[String(doctor || '').trim()] || 'Sala')
            : doctor,
          slot: time,
          isSelected: false,
          isAnchorStart: Boolean(matchingManualRange && matchingManualRange.time === time),
          anchorProcedure: matchingManualRange?.procedure || '',
          isPrimaryAnchor: Boolean(matchingManualRange?.isPrimary),
          isCoveredByAnchorRange: Boolean(matchingManualRange && matchingManualRange.time !== time),
          isSuggestedStart: Boolean(matchingSuggestedRange && matchingSuggestedRange.time === time),
          suggestedProcedure: matchingSuggestedRange?.procedure || '',
          isCoveredBySuggestedRange: Boolean(matchingSuggestedRange && matchingSuggestedRange.time !== time),
          isCoveredBySelectedRange: false,
          isOccupied: false,
          isTooShort: false,
          schedulableProcedures: getSchedulableProceduresForSlot(doctor, time, date),
          minute: slotStartMinute,
        };
      })
      .sort((a, b) => a.doctor.localeCompare(b.doctor));
  };
  const dateHasAvailability = (date: Date) => {
    if (isExamAppointment) {
      if (!examResourcesSelected || !novoAgendamento.roomId) return false;
      const roomSlots = (['Manhã', 'Tarde', 'Noite'] as const).flatMap((period) =>
        buildRoomSlots(roomScheduleById[novoAgendamento.roomId], period, date),
      );
      return roomSlots.some((slot) => slotSupportsDuration(novoAgendamento.roomId, slot, selectedProcedureDuration, date, editingAgendamentoId));
    }
    return schedulerDoctors.some((doctor) => {
      const doctorSlots = getScheduleSlotsForResource(doctor, date);
      return doctorSlots.some((slot) => (
        isMultiProcedureFlow
          ?getSelectableProceduresForSlot(doctor, slot, date).some((procedureName) => (
              slotSupportsDuration(doctor, slot, getProcedureDuration(procedureName), date, editingAgendamentoId)
            ))
          : slotSupportsProcedureDuration(doctor, slot, date)
      ));
    });
  };
  const findFirstAvailabilityForDate = (
    date: Date,
    periods: Array<'Manhã' | 'Tarde' | 'Noite'> = ['Manhã', 'Tarde', 'Noite'],
  ): { period: 'Manhã' | 'Tarde' | 'Noite'; slot: string; doctor: string } | null => {
    if (isExamAppointment) {
      if (!examResourcesSelected || !novoAgendamento.roomId) return null;
      for (const period of periods) {
        const roomSlots = buildRoomSlots(roomScheduleById[novoAgendamento.roomId], period, date);
        for (const slot of roomSlots) {
          if (slotSupportsDuration(novoAgendamento.roomId, slot, selectedProcedureDuration, date, editingAgendamentoId)) {
            return { period, slot, doctor: roomLabelById[novoAgendamento.roomId] || 'Sala' };
          }
        }
      }
      return null;
    }
    for (const period of periods) {
      for (const doctor of schedulerDoctors) {
        const doctorSlots = buildDoctorSlots(doctorMetaByName[doctor], period, date);
        for (const slot of doctorSlots) {
          const isAvailable = isMultiProcedureFlow
            ?getSelectableProceduresForSlot(doctor, slot, date).some((procedureName) => (
              slotSupportsDuration(doctor, slot, getProcedureDuration(procedureName), date, editingAgendamentoId)
            ))
            : slotSupportsProcedureDuration(doctor, slot, date);
          if (isAvailable) {
            return { period, slot, doctor };
          }
        }
      }
    }
    return null;
  };
  const getCompatibleDoctorsForProcedure = (procedureName: string): string[] => {
    if (isExamAppointment) return [];
    const normalizedSelected = normalizeComparableText(procedureName);
    const procedureMeta = procedureMetaByName[procedureName];
    const linkedDoctorIds = (procedureMeta?.doctorIds || []).map((item) => String(item).trim()).filter(Boolean);
    const linkedDoctorNames = (procedureMeta?.doctorNames || []).map(normalizeComparableText);
    return availableDoctorOptions
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
        return matchesDoctorToProcedure(doctorSpecialties, normalizedSelected);
      })
      .map((option) => option.value);
  };
  const getAllDoctorSlotsForDate = (doctorName: string, date: Date): string[] => {
    if (isExamAppointment) {
      const merged = (['Manhã', 'Tarde', 'Noite'] as const).flatMap((period) =>
        buildRoomSlots(roomScheduleById[doctorName], period, date),
      );
      return Array.from(new Set(merged)).sort((a, b) => (parseTimeToMinutes(a) || 0) - (parseTimeToMinutes(b) || 0));
    }
    const merged = (['Manhã', 'Tarde', 'Noite'] as const).flatMap((period) =>
      buildDoctorSlots(doctorMetaByName[doctorName], period, date),
    );
    return Array.from(new Set(merged)).sort((a, b) => (parseTimeToMinutes(a) || 0) - (parseTimeToMinutes(b) || 0));
  };
  const findSuggestedSchedules = (): SuggestedScheduleOption[] => {
    const procedureNames = [...selectedSpecialties];
    if (procedureNames.length <= 1) return [];
    if (!anchorSelection) return [];
    const anchorDate = anchorSelection.date;
    const anchorMinute = parseTimeToMinutes(anchorSelection.time);
    const anchorEndMinute = anchorMinute !== null ?anchorMinute + anchorSelection.durationMinutes : null;
    const remainingProcedureNames = [...procedureNames];
    const anchorIndex = remainingProcedureNames.findIndex((item) => item === anchorSelection.procedure);
    if (anchorIndex >= 0) {
      remainingProcedureNames.splice(anchorIndex, 1);
    }
    if (remainingProcedureNames.length === 0) {
      return [
        {
          id: `${dayjs(anchorDate).format('YYYYMMDD')}-anchor-only`,
          totalWaitMinutes: 0,
          items: [
            {
              procedure: anchorSelection.procedure,
              doctorName: anchorSelection.doctorName,
              date: anchorSelection.date,
              time: anchorSelection.time,
              durationMinutes: anchorSelection.durationMinutes,
            },
          ],
        },
      ];
    }
    type Candidate = SuggestedProcedureSchedule & { start: number; end: number };
    type Assigned = Candidate[];
    const overlapsAssigned = (candidate: Candidate, assigned: Assigned) =>
      assigned.some((item) => {
        const sameDoctorConflict = item.doctorName === candidate.doctorName && candidate.start < item.end && candidate.end > item.start;
        const samePatientConflict = candidate.start < item.end && candidate.end > item.start;
        return sameDoctorConflict || samePatientConflict;
      });
    const getAssignedWaitMinutes = (assigned: Assigned) => {
      const ordered = [...assigned].sort((a, b) => a.start - b.start);
      return ordered.reduce((score, item, index) => {
        if (index === 0) return score;
        const previous = ordered[index - 1];
        return score + Math.max(0, item.start - previous.end);
      }, 0);
    };
    const scoreAssigned = (assigned: Assigned, date: Date) => {
      const ordered = [...assigned].sort((a, b) => a.start - b.start);
      const waitScore = getAssignedWaitMinutes(assigned);
      if (anchorEndMinute === null) return waitScore;
      const sameDayPenalty = dayjs(date).isSame(anchorDate, 'day') ?0 : 10000;
      const proximityScore = ordered.reduce((score, item) => (
        score + Math.abs(item.start - anchorEndMinute)
      ), 0);
      return waitScore + sameDayPenalty + proximityScore;
    };
    const searchForDate = (date: Date): SuggestedScheduleOption[] => {
      const candidatesByProcedure = remainingProcedureNames.reduce<Record<string, Candidate[]>>((acc, procedureName) => {
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
      const procedureOrder = [...remainingProcedureNames].sort(
        (a, b) => (candidatesByProcedure[a]?.length || 0) - (candidatesByProcedure[b]?.length || 0),
      );
      const foundOptions: Array<{ assigned: Assigned; score: number; waitMinutes: number }> = [];
      const dfs = (index: number, assigned: Assigned) => {
        if (index >= procedureOrder.length) {
          const currentScore = scoreAssigned(assigned, date);
          foundOptions.push({
            assigned: [...assigned],
            score: currentScore,
            waitMinutes: getAssignedWaitMinutes(assigned),
          });
          return;
        }
        const procedureName = procedureOrder[index];
        const candidates = [...(candidatesByProcedure[procedureName] || [])].sort((a, b) => {
          if (anchorEndMinute === null) return a.start - b.start;
          return Math.abs(a.start - anchorEndMinute) - Math.abs(b.start - anchorEndMinute);
        });
        const orderedAssigned = [...assigned].sort((a, b) => a.start - b.start);
        const lastEnd = orderedAssigned.length > 0 ?orderedAssigned[orderedAssigned.length - 1].end : anchorEndMinute;
        for (const candidate of candidates) {
          if (lastEnd !== null && candidate.start < lastEnd) continue;
          if (lastEnd !== null && candidate.start - lastEnd > 180) continue;
          if (overlapsAssigned(candidate, assigned)) continue;
          assigned.push(candidate);
          dfs(index + 1, assigned);
          assigned.pop();
        }
      };
      const anchorAssigned: Assigned = anchorEndMinute === null ?[] : [{
        procedure: anchorSelection.procedure,
        doctorName: anchorSelection.doctorName,
        date: anchorSelection.date,
        time: anchorSelection.time,
        durationMinutes: anchorSelection.durationMinutes,
        start: anchorMinute || 0,
        end: anchorEndMinute,
      }];
      dfs(0, anchorAssigned);
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
            totalWaitMinutes: option.waitMinutes,
            items: [anchorSelection.procedure, ...remainingProcedureNames].map((procedureName) => ({
              procedure: procedureName,
              doctorName: byProcedure[procedureName].doctorName,
              date: byProcedure[procedureName].date,
              time: byProcedure[procedureName].time,
              durationMinutes: byProcedure[procedureName].durationMinutes,
            })),
          };
        });
    };
    const searchDates: Date[] = [anchorDate];
    for (let offset = 1; offset <= 14; offset += 1) {
      searchDates.push(addDays(anchorDate, offset));
    }
    const uniqueSearchDates = searchDates.filter((date, index, arr) =>
      arr.findIndex((candidate) => dayjs(candidate).isSame(date, 'day')) === index,
    );
    for (const candidateDate of uniqueSearchDates) {
      const found = searchForDate(candidateDate);
      if (found.length > 0) return found;
    }
    return [];
  };
  const handleGenerateSuggestedSchedules = async () => {
    if (selectedSpecialties.length <= 1) return;
    if (!anchorSelection) {
      showNotification({
        title: 'Selecione a âncora',
        message: 'Escolha um horário na grade e informe qual procedimento será feito nele antes de sugerir os próximos horários.',
        color: 'yellow',
      });
      return;
    }
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
      const first = result[0].items[0];
      handleApplySuggestedOption(result[0], Boolean(novoAgendamento.profissional));
      setSuggestionOptionsModalOpen(true);
      setActiveSchedulePeriod(resolveTurnoFromTime(first.time) || 'Manhã');
      showNotification({
        title: 'Sugestão pronta',
        message: `${result.length} opção(ões) geradas com foco no menor tempo de espera total.`,
        color: 'green',
      });
    } finally {
      setGeneratingSuggestion(false);
    }
  };
  const handleApplySuggestedOption = (option: SuggestedScheduleOption, preserveSelectedProfessional = Boolean(novoAgendamento.profissional)) => {
    setSelectedSuggestedOptionId(option.id);
    const firstItem = option.items[0];
    if (!firstItem) return;
    setViewedDate(firstItem.date);
    setActiveSchedulePeriod(resolveTurnoFromTime(firstItem.time) || 'Manhã');
    setNovoAgendamento((prev) => ({
      ...prev,
      data: firstItem.date,
      profissional: preserveSelectedProfessional ?(prev.profissional || firstItem.doctorName) : '',
      hora: '',
    }));
  };
  const handleClearSelectedSchedules = () => {
    setManualProcedureSelections([]);
    setSuggestedOptions([]);
    setSelectedSuggestedOptionId(null);
    setSuggestionOptionsModalOpen(false);
    setAnchorProcedureModalOpen(false);
    setProfessionalSlotModalOpen(false);
    setPendingAnchorSlot(null);
    setPendingProfessionalSlot(null);
    setNovoAgendamento((prev) => ({
      ...prev,
      hora: '',
    }));
  };
  const handleFinalizeProcedureSelection = (procedureName: string, doctorName: string, time: string, date: Date) => {
    const durationMinutes = getProcedureDuration(procedureName);
    setManualProcedureSelections((prev) => {
      const existingSelection = prev.find((item) => item.procedure === procedureName);
      const nextSelection = {
        procedure: procedureName,
        doctorName,
        date,
        time,
        durationMinutes,
        selectionOrder: existingSelection?.selectionOrder ?? prev.length,
      };
      const withoutProcedure = prev.filter((item) => item.procedure !== procedureName);
      return [...withoutProcedure, nextSelection].sort((a, b) => a.selectionOrder - b.selectionOrder);
    });
    setSelectedSuggestedOptionId(null);
    setSuggestedOptions([]);
    setViewedDate(date);
    setActiveSchedulePeriod(resolveTurnoFromTime(time) || 'Manhã');
    setNovoAgendamento((prev) => ({
      ...prev,
      profissional: isExamAppointment ?prev.profissional : doctorName,
      hora: time,
      data: date,
    }));
  };
  const handleSelectAnchorSlot = (doctorName: string, time: string, date: Date) => {
    if (isExamAppointment && !isMultiProcedureFlow) {
      setSelectedSuggestedOptionId(null);
      setNovoAgendamento((prev) => ({
        ...prev,
        hora: time,
        data: date,
      }));
      return;
    }
    if (!isMultiProcedureFlow) {
      setSelectedSuggestedOptionId(null);
      setNovoAgendamento((prev) => ({
        ...prev,
        profissional: doctorName,
        hora: time,
        data: date,
      }));
      return;
    }
    const selectableProcedures = getSchedulableProceduresForSlot(doctorName, time, date);
    if (selectableProcedures.length === 1) {
      handleFinalizeProcedureSelection(selectableProcedures[0], doctorName, time, date);
      return;
    }
    setPendingAnchorSlot({ doctorName, time, date });
    setAnchorProcedureModalOpen(true);
  };
  const handleSelectSimultaneousSlot = (slot: { doctor?: string; slot: string; availableDoctorsForSlot?: string[] }, date: Date) => {
    if (selectedSpecialties.length < 2) return;
    if (isExamAppointment) {
      showNotification({
        title: 'Simultaneidade indisponível para exames',
        message: 'Para exames, selecione os recursos de cada procedimento em horários compatíveis.',
        color: 'yellow',
      });
      return;
    }
    const candidates = slot.availableDoctorsForSlot?.length
      ? slot.availableDoctorsForSlot
      : availableDoctorOptions.map((option) => option.value);
    const assignedDoctors = new Set<string>();
    const selections: ProcedureAnchorSelection[] = [];
    for (const procedureName of selectedSpecialties) {
      const compatible = getProfessionalOptionsForSlot(slot.slot, date, procedureName, candidates)
        .map((item) => item.doctor)
        .filter((doctorName) => !assignedDoctors.has(doctorName));
      const doctorName = compatible[0];
      if (!doctorName) {
        showNotification({
          title: 'Não há profissionais suficientes',
          message: 'A marcação simultânea precisa de um profissional disponível para cada procedimento no mesmo horário.',
          color: 'yellow',
        });
        return;
      }
      assignedDoctors.add(doctorName);
      selections.push({
        procedure: procedureName,
        doctorName,
        date,
        time: slot.slot,
        durationMinutes: getProcedureDuration(procedureName),
        selectionOrder: selections.length,
      });
    }
    setManualProcedureSelections(selections);
    setSuggestedOptions([]);
    setSelectedSuggestedOptionId(null);
    setViewedDate(date);
    setActiveSchedulePeriod(resolveTurnoFromTime(slot.slot) || 'Manhã');
    setNovoAgendamento((prev) => ({
      ...prev,
      profissional: selections[0]?.doctorName || '',
      hora: slot.slot,
      data: date,
    }));
  };
  const handleSelectGridSlot = (slot: { doctor?: string; slot: string; availableDoctorsForSlot?: string[] }, date: Date) => {
    if (simultaneousEnabled) {
      handleSelectSimultaneousSlot(slot, date);
      return;
    }
    if (isExamAppointment && !isMultiProcedureFlow) {
      setSelectedSuggestedOptionId(null);
      setNovoAgendamento((prev) => ({
        ...prev,
        hora: slot.slot,
        data: date,
      }));
      return;
    }
    if (!isMultiProcedureFlow) {
      if (novoAgendamento.profissional) {
        handleSelectAnchorSlot(slot.doctor || novoAgendamento.profissional, slot.slot, date);
        return;
      }
      setPendingProfessionalSlot({ date, time: slot.slot, procedure: '', candidates: slot.availableDoctorsForSlot || [] });
      setProfessionalSlotModalOpen(true);
      return;
    }
    const resolvedDoctorName = slot.doctor || novoAgendamento.profissional || '';
    if (resolvedDoctorName) {
      handleSelectAnchorSlot(resolvedDoctorName, slot.slot, date);
      return;
    }
    const selectableProcedures = getSchedulableProceduresForSlot('', slot.slot, date);
    if (selectableProcedures.length === 1) {
      setPendingProfessionalSlot({
        date,
        time: slot.slot,
        procedure: selectableProcedures[0],
        candidates: slot.availableDoctorsForSlot || [],
      });
      setProfessionalSlotModalOpen(true);
      return;
    }
    setPendingAnchorSlot({ doctorName: '', time: slot.slot, date });
    setAnchorProcedureModalOpen(true);
  };
  const handleConfirmAnchorProcedure = (procedureName: string) => {
    if (!pendingAnchorSlot) return;
    if (!pendingAnchorSlot.doctorName) {
      setAnchorProcedureModalOpen(false);
      setPendingProfessionalSlot({
        date: pendingAnchorSlot.date,
        time: pendingAnchorSlot.time,
        procedure: procedureName,
        candidates: getProfessionalOptionsForSlot(
          pendingAnchorSlot.time,
          pendingAnchorSlot.date,
          procedureName,
        ).map((item) => item.doctor),
      });
      setProfessionalSlotModalOpen(true);
      setPendingAnchorSlot(null);
      return;
    }
    handleFinalizeProcedureSelection(
      procedureName,
      pendingAnchorSlot.doctorName,
      pendingAnchorSlot.time,
      pendingAnchorSlot.date,
    );
    setAnchorProcedureModalOpen(false);
    setPendingAnchorSlot(null);
    setActiveSchedulePeriod(resolveTurnoFromTime(pendingAnchorSlot.time) || 'Manhã');
  };
  const goToSchedulingDate = (date: Date) => {
    const normalizedDate = isPastCalendarDate(date) ?getTodayStart() : date;
    setViewedDate(normalizedDate);
    setNovoAgendamento((prev) => ({
      ...prev,
      data: normalizedDate,
      hora: prev.data && dayjs(prev.data).isSame(dayjs(normalizedDate), 'day') ?prev.hora : '',
      profissional: isExamAppointment
        ?prev.profissional
        : (prev.data && dayjs(prev.data).isSame(dayjs(normalizedDate), 'day') ?prev.profissional : ''),
    }));
  };
  const goToNextAvailableDate = () => {
    for (let offset = 0; offset <= 30; offset += 1) {
      const candidate = addDays(schedulingDate, offset);
      const nextAvailability = findFirstAvailabilityForDate(candidate);
      if (nextAvailability) {
        setViewedDate(candidate);
        setActiveSchedulePeriod(nextAvailability.period);
        setNovoAgendamento((prev) => ({
          ...prev,
          data: candidate,
          profissional: isExamAppointment ?prev.profissional : (prev.profissional || nextAvailability.doctor),
          hora: nextAvailability.slot,
        }));
        showNotification({
          title: 'Próxima disponibilidade encontrada',
          message: isExamAppointment
            ?`${dayjs(candidate).format('DD/MM/YYYY')} às ${nextAvailability.slot} na ${nextAvailability.doctor}.`
            : `${dayjs(candidate).format('DD/MM/YYYY')} às ${nextAvailability.slot} com ${nextAvailability.doctor}.`,
          color: 'blue',
        });
        return;
      }
    }
    showNotification({
      title: 'Sem disponibilidade',
      message: 'Não encontramos horários disponíveis nos próximos 30 dias em nenhum turno.',
      color: 'yellow',
    });
  };
  const schedulingDateHasAvailability = dateHasAvailability(schedulingDate);
  useEffect(() => {
    if (isExamAppointment) return;
    if (!novoAgendamento.profissional) return;
    const stillAvailable = availableDoctorOptions.some((option) => option.value === novoAgendamento.profissional);
    if (!stillAvailable) {
      setNovoAgendamento((prev) => ({
        ...prev,
        profissional: '',
        hora: '',
      }));
    }
  }, [availableDoctorOptions, novoAgendamento.profissional, isExamAppointment]);
  useEffect(() => {
    setSuggestedOptions([]);
    setSelectedSuggestedOptionId(null);
  }, [selectedSpecialties, novoAgendamento.profissional, viewedDate, selectedPatientId, novoAgendamento.convenio]);
  return (
    <Box className="agendamento-page" bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header
        contextLabel={activeTab === 'hub' ? 'Agendamento' : activeTab === 'marcacao' ? 'Realizar marcação' : activeTab === 'online' ? 'Agendamentos online' : 'Visualizar agenda'}
        back={activeTab !== 'hub' ? { label: 'Voltar', onClick: () => setActiveTab('hub') } : undefined}
      />
      <Box className="agendamento-container" p={isMobile ?'sm' : isTablet ?'md' : 'xl'} maw={isMobile ?'100%' : 1400} mx="auto">
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'hub')} variant="default">
          <Tabs.Panel value="hub">
            <Box className="agendamento-hub">
            <SimpleGrid className="agendamento-hub-grid" cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {[
                {
                  key: 'marcacao',
                  icon: Plus,
                  title: 'Realizar marcação',
                  desc: 'Cadastrar novo agendamento com paciente, procedimento, profissional e horário.',
                  onClick: () => {
                    resetSchedulingForm(dataHoraFiltro || new Date());
                    setActiveTab('marcacao');
                  },
                },
                {
                  key: 'agendados',
                  icon: Calendar,
                  title: 'Visualizar agenda',
                  desc: 'Consultar agenda, filtrar atendimentos e acompanhar horários já marcados.',
                  onClick: () => setActiveTab('agendados'),
                },
                {
                  key: 'online',
                  icon: Globe,
                  title: 'Agendamentos Online',
                  desc: 'Revisar e confirmar solicitações de agendamento feitas pelos pacientes pelo portal.',
                  badge: onlineAppointments.length > 0 ? onlineAppointments.length : null,
                  onClick: () => setActiveTab('online'),
                },
              ].map((card) => (
                <Paper
                  key={card.key}
                  className="agendamento-hub-card"
                  p="lg"
                  withBorder
                  onClick={card.onClick}
                  style={{
                    cursor: 'pointer',
                    borderColor: 'var(--mantine-color-default-border)',
                    minHeight: 96,
                  }}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <Box className="agendamento-hub-card__icon" w={44} h={44}>
                        <card.icon size={22} />
                      </Box>
                      <Box className="agendamento-hub-card__content" style={{ minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                          <Text className="agendamento-hub-card__title" fw={600} size="md" lineClamp={1}>{card.title}</Text>
                          {card.badge ? <Badge color="orange" size="xs">{card.badge}</Badge> : null}
                        </Group>
                        <Text className="agendamento-hub-card__description" size="sm" c="dimmed" lineClamp={2}>{card.desc}</Text>
                      </Box>
                    </Group>
                    <ChevronRight size={18} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="marcacao">
        <Box ref={schedulerRef} className="agendamento-scheduler">
          <Box
            className="agendamento-scheduler-card"
          >
            <Box className="agendamento-scheduler-intro">
              <Box className="agendamento-scheduler-intro__copy">
                <Text className="agendamento-scheduler-intro__eyebrow">FLUXO OPERACIONAL</Text>
                <Text className="agendamento-scheduler-intro__title" component="h2">Nova marcação</Text>
                <Text className="agendamento-scheduler-intro__description">
                  Cadastre o atendimento em três passos claros: paciente, horário e confirmação.
                </Text>
              </Box>
              <Group className="agendamento-scheduler-intro__status" gap="xs" wrap="nowrap">
                <Box className="agendamento-scheduler-intro__status-dot" aria-hidden="true" />
                <Box>
                  <Text className="agendamento-scheduler-intro__status-label">Fluxo guiado</Text>
                  <Text className="agendamento-scheduler-intro__status-value">Etapa {schedulingStep + 1} de 3</Text>
                </Box>
              </Group>
            </Box>
            <Box className="agendamento-wizard-progress" aria-label="Progresso do agendamento">
              {[
                { index: 0, label: 'Dados', description: 'Paciente e atendimento' },
                { index: 1, label: 'Horário', description: 'Disponibilidade' },
                { index: 2, label: 'Revisão', description: 'Confirmação' },
              ].map((step) => (
                <UnstyledButton
                  key={step.index}
                  type="button"
                  className={`agendamento-wizard-progress__step${schedulingStep === step.index ? ' is-active' : ''}${schedulingStep > step.index ? ' is-complete' : ''}`}
                  onClick={() => {
                    if (step.index < schedulingStep) goToSchedulingStep(step.index);
                  }}
                  disabled={step.index >= schedulingStep}
                  aria-current={schedulingStep === step.index ? 'step' : undefined}
                >
                  <span className="agendamento-wizard-progress__index">
                    {schedulingStep > step.index ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : step.index + 1}
                  </span>
                  <span className="agendamento-wizard-progress__copy">
                    <span className="agendamento-wizard-progress__label">{step.label}</span>
                    <span className="agendamento-wizard-progress__description">{step.description}</span>
                  </span>
                </UnstyledButton>
              ))}
            </Box>
            <Stack
              className="agendamento-scheduler-flow"
              gap="xl"
              style={{
                position: 'relative',
                paddingLeft: isMobile ?22 : 30,
                paddingRight: isMobile ?4 : 8,
              }}
            >
              <Box className={`agendamento-wizard-step agendamento-wizard-step--details${schedulingStep === 0 ? ' is-active' : ''}`}>
              <Box className="agendamento-stage-panel agendamento-stage-panel--details">
              <Group className="agendamento-patient-panel-header" justify="space-between" align="center" wrap="wrap" gap="sm">
                <Box className="agendamento-patient-panel-header__copy">
                  <Text className="agendamento-patient-panel-header__title" fw={700}>Paciente</Text>
                  <Text className="agendamento-patient-panel-header__description" size="sm" c="dimmed">
                    {isManualPatientFlow ? 'Preencha os dados mínimos para cadastrar um novo paciente.' : 'Selecione um paciente já cadastrado ou inicie um novo cadastro.'}
                  </Text>
                </Box>
                <Group className="agendamento-patient-panel-header__actions" gap="sm" wrap="wrap">
                  {isManualPatientFlow ?(
                    <>
                      <Badge variant="light" color="blue">Novo paciente</Badge>
                      <Button variant="default" onClick={handleDisableManualPatientFlow}>
                        Usar paciente cadastrado
                      </Button>
                    </>
                  ) : (
                    <Button leftSection={<Plus size={14} />} onClick={handleEnableManualPatientFlow}>
                      Novo paciente
                    </Button>
                  )}
                </Group>
              </Group>
              <SimpleGrid className="agendamento-patient-grid" cols={{ base: 1, md: 2 }} spacing="md">
                <Select
                  className="agendamento-native-field"
                  label="Nome completo"
                  placeholder={patientsLoading ?'Carregando pacientes...' : 'Selecione o paciente'}
                  data={patientOptions}
                  value={selectedPatientId}
                  onChange={handleSelectPatient}
                  searchable
                  clearable
                  nothingFoundMessage="Nenhum paciente encontrado"
                  disabled={patientsLoading || isManualPatientFlow}
                />
                <TextInput
                  className="agendamento-native-field"
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
                <Stack className="agendamento-manual-patient-section" gap="md">
                  <TextInput
                    className="agendamento-native-field"
                    label="Paciente novo"
                    placeholder="Digite o nome do paciente"
                    value={pendingPatient.name}
                    onChange={(e) => handlePendingPatientField('name', e.currentTarget.value)}
                  />
                  <Paper
                    className="agendamento-manual-patient-card"
                    p={0}
                    radius="lg"
                    bg={isDarkMode ?'transparent' : 'var(--mantine-color-body)'}
                    style={{
                      border: isDarkMode
                        ?'1px solid rgba(120, 158, 230, 0.18)'
                        : '1px solid rgba(0, 31, 84, 0.10)',
                      boxShadow: isDarkMode ?'none' : '0 4px 16px rgba(15, 23, 42, 0.04)',
                    }}
                  >
                    <Stack className="agendamento-manual-patient-card__content" gap="md">
                      <Group className="agendamento-manual-patient-card__header" justify="space-between" align="flex-start" wrap="wrap" gap="md">
                        <Box className="agendamento-manual-patient-card__intro">
                          <Text className="agendamento-manual-patient-card__title" fw={700}>Completar cadastro do paciente</Text>
                          <Text className="agendamento-manual-patient-card__description" size="sm" c="dimmed">
                          Preencha os dados mínimos para concluir o cadastro desse novo paciente.
                          </Text>
                        </Box>
                        <Button className="agendamento-manual-patient-card__cancel" variant="subtle" color="gray" onClick={handleDisableManualPatientFlow}>
                          Cancelar novo paciente
                        </Button>
                      </Group>
                      <SimpleGrid className="agendamento-manual-patient-grid" cols={{ base: 1, md: 2 }} spacing="md">
                        <FloatingDatePicker
                          label="Data de nascimento"
                          labelPlacement="stacked"
                          value={pendingPatient.birthDate ? dayjs(pendingPatient.birthDate).format('YYYY-MM-DD') : ''}
                          onChange={(event) => handlePendingPatientField('birthDate', event.currentTarget.value ? new Date(`${event.currentTarget.value}T12:00:00`) : null)}
                          containerProps={{ className: 'agendamento-native-date-field' }}
                        />
                        <Select
                          className="agendamento-native-field"
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
                        <TextInput
                          className="agendamento-native-field"
                          label="Celular"
                          placeholder="Digite o celular"
                          value={pendingPatient.cellphone}
                          onChange={(e) => handlePendingPatientField('cellphone', e.currentTarget.value)}
                        />
                        <TextInput
                          className="agendamento-native-field"
                          label="E-mail"
                          placeholder="Opcional"
                          value={pendingPatient.email}
                          onChange={(e) => handlePendingPatientField('email', e.currentTarget.value)}
                        />
                      </SimpleGrid>
                    </Stack>
                  </Paper>
                </Stack>
              )}
              <Text className="agendamento-form-section-title" fw={600} size="md">Dados do convênio</Text>
              <SimpleGrid className="agendamento-insurance-grid" cols={{ base: 1, md: 5 }} spacing="md">
                <Select
                  className="agendamento-native-field"
                  label="Tipo do convênio*"
                  placeholder={insuranceSelectPlaceholder}
                  data={insuranceSelectData}
                  value={insuranceSelectValue}
                  onChange={(value) => {
                    const nextConvenio = value || PARTICULAR_INSURANCE_LABEL;
                    const isParticular = isParticularInsurance(nextConvenio);
                    setNovoAgendamento({
                      ...novoAgendamento,
                      convenio: nextConvenio,
                      convenioPlano: '',
                      convenioStatus: isParticular
                        ?PARTICULAR_STATUS_LABEL
                        : (novoAgendamento.convenioStatus || 'Ativo'),
                    });
                  }}
                  searchable
                  clearable
                  disabled={insurancesLoading}
                  nothingFoundMessage="Nenhum convênio encontrado"
                />
                <Select
                  className="agendamento-native-field"
                  label="Plano"
                  placeholder={novoAgendamento.convenio && !isParticularInsurance(novoAgendamento.convenio) ? 'Selecione o plano' : 'Não se aplica'}
                  data={insurancePlanOptions
                    .filter((option) => option.insuranceName === novoAgendamento.convenio)
                    .map(({ value, label }) => ({ value, label }))}
                  value={novoAgendamento.convenioPlano || null}
                  onChange={(value) => setNovoAgendamento({ ...novoAgendamento, convenioPlano: value || '' })}
                  searchable
                  clearable
                  disabled={!canEditInsuranceFields || isParticularInsurance(novoAgendamento.convenio)}
                  nothingFoundMessage="Nenhum plano cadastrado para este convênio"
                />
                <TextInput
                  className="agendamento-native-field"
                  label="Número da carteirinha"
                  value={insuranceCardNumberValue}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, convenioNumber: e.currentTarget.value })}
                />
                <TextInput
                  className="agendamento-native-field"
                  label="Data de validade"
                  value={insuranceValidityValue}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, convenioValidUntil: e.currentTarget.value })}
                />
                <TextInput
                  className="agendamento-native-field"
                  label="Status"
                  value={insuranceStatusValue}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, convenioStatus: e.currentTarget.value })}
                />
              </SimpleGrid>
              <Text className="agendamento-form-section-title" fw={600} size="md">Dados do agendamento</Text>
              <SimpleGrid className="agendamento-appointment-grid" cols={{ base: 1, md: isExamAppointment ?2 : 3, lg: isExamAppointment ?5 : 3 }} spacing="md">
                <Select
                  className="agendamento-native-field"
                  label="Unidade"
                  placeholder={branchesQuery.isFetching ? 'Carregando unidades...' : 'Unidade atual'}
                  data={branchOptions}
                  value={selectedBranchId}
                  onChange={(value) => {
                    setSelectedBranchId(value || null);
                    setNovoAgendamento((prev) => ({
                      ...prev,
                      branchId: value || '',
                      profissional: '',
                      roomId: '',
                      medicalEquipmentId: '',
                      hora: '',
                    }));
                    setManualProcedureSelections([]);
                    setSuggestedOptions([]);
                    setSelectedSuggestedOptionId(null);
                  }}
                  searchable
                  clearable
                  disabled={branchesQuery.isFetching || branchOptions.length === 0}
                  nothingFoundMessage="Nenhuma unidade encontrada"
                />
                <MultiSelect
                  className="agendamento-native-field"
                  label="Procedimento"
                  placeholder={proceduresLoading ?'Carregando procedimentos...' : 'Selecione os procedimentos'}
                  data={procedureOptions}
                  value={selectedSpecialties}
                  onChange={handleProcedureSelectionChange}
                  searchable
                  clearable
                  disabled={proceduresLoading}
                  nothingFoundMessage="Nenhum procedimento encontrado"
                />
                {!isExamAppointment && (
                  <Select
                    className="agendamento-native-field"
                    label="Profissional"
                    placeholder={doctorsLoading ?'Carregando médicos...' : 'Selecione se quiser filtrar por um profissional'}
                    data={availableDoctorOptions}
                    value={novoAgendamento.profissional}
                    onChange={(value) => setNovoAgendamento({ ...novoAgendamento, profissional: value || '' })}
                    searchable
                    clearable
                    disabled={doctorsLoading}
                    nothingFoundMessage="Nenhum médico compatível com o procedimento encontrado"
                  />
                )}
                {!isExamAppointment && (
                  <Select
                    className="agendamento-native-field"
                    label="Modalidade"
                    placeholder="Selecione a modalidade"
                    data={appointmentModalityOptions}
                    value={novoAgendamento.modalidadeAtendimento}
                    onChange={handleModalityChange}
                    disabled={selectedSpecialties.length === 0}
                    nothingFoundMessage="Nenhuma modalidade disponível"
                  />
                )}
                {isExamAppointment && (
                  <Select
                    className="agendamento-native-field"
                    label="Sala (exame)"
                    placeholder={!examProcedureIds.length
                        ?'Selecione o procedimento de exame'
                        : !canSelectExamResources
                          ?'Sem salas/equipamentos compatíveis'
                          : 'Selecione a sala'}
                    data={eligibleRoomOptions}
                    value={novoAgendamento.roomId}
                    onChange={(value) => setNovoAgendamento((prev) => ({ ...prev, roomId: value || '', medicalEquipmentId: '' }))}
                    searchable
                    clearable
                    disabled={!canSelectExamResources}
                    nothingFoundMessage="Nenhuma sala compatível encontrada"
                  />
                )}
                {isExamAppointment && (
                  <Select
                    className="agendamento-native-field"
                    label="Equipamento (exame)"
                    placeholder={!novoAgendamento.roomId
                      ?'Selecione a sala'
                      : 'Selecione o equipamento'}
                    data={eligibleEquipmentOptions}
                    value={novoAgendamento.medicalEquipmentId}
                    onChange={(value) => setNovoAgendamento((prev) => ({ ...prev, medicalEquipmentId: value || '' }))}
                    searchable
                    clearable
                    disabled={!canSelectExamResources || !novoAgendamento.roomId}
                    nothingFoundMessage="Nenhum equipamento compatível encontrado"
                  />
                )}
              </SimpleGrid>
              <Textarea
                className="agendamento-native-field"
                label="Observações"
                placeholder="Alguma observação importante para a recepção ou profissional"
                minRows={2}
                value={novoAgendamento.informacoes}
                onChange={(e) => setNovoAgendamento({ ...novoAgendamento, informacoes: e.currentTarget.value })}
              />
              </Box>
              <Group className="agendamento-wizard-actions" justify="space-between" align="center" wrap="wrap">
                <Button variant="default" onClick={() => resetSchedulingForm(dataHoraFiltro || new Date())}>
                  Limpar fluxo
                </Button>
                <Button
                  rightSection={<ChevronRight size={16} aria-hidden="true" />}
                  onClick={handleContinueToAvailability}
                  disabled={!canAdvanceToAvailability}
                >
                  Continuar para horários
                </Button>
              </Group>
              </Box>
              <Box className={`agendamento-wizard-step agendamento-wizard-step--availability${schedulingStep === 1 ? ' is-active' : ''}`}>
              <Box className="agendamento-stage-panel agendamento-stage-panel--availability">
              {selectedProcedureSummary.length > 0 ?(
              <>
              <Box className="agendamento-availability-controls">
                <Group className="agendamento-availability-controls__header" justify="space-between" align="flex-start" gap="md" wrap="wrap">
                  <Box className="agendamento-availability-controls__intro">
                    <Text className="agendamento-availability-controls__eyebrow">BUSCA DE DISPONIBILIDADE</Text>
                    <Text className="agendamento-availability-controls__title" component="h3">Escolha quando realizar o atendimento</Text>
                    <Text className="agendamento-availability-controls__description">
                      A grade considera duração, agenda, conflitos e recursos disponíveis para este atendimento.
                    </Text>
                  </Box>
                  <Badge className="agendamento-availability-controls__step" variant="light" color="blue">
                    Etapa 2 de 3
                  </Badge>
                </Group>
                <Group className="agendamento-availability-modes" justify="space-between" align="center" gap="sm" wrap="wrap">
                  <Group gap="xs" wrap="wrap">
                    <Button
                      size="sm"
                      variant={availabilityViewMode === 'day' ? 'filled' : 'default'}
                      leftSection={<Calendar size={15} aria-hidden="true" />}
                      onClick={() => setAvailabilityViewMode('day')}
                    >
                      Dia
                    </Button>
                    <Button
                      size="sm"
                      variant={availabilityViewMode === 'week' ? 'filled' : 'default'}
                      leftSection={<LayoutGrid size={15} aria-hidden="true" />}
                      onClick={() => setAvailabilityViewMode('week')}
                    >
                      Semana
                    </Button>
                  </Group>
                  <Group gap="xs" wrap="wrap">
                    <Button
                      size="sm"
                      variant={simultaneousEnabled ? 'filled' : 'default'}
                      color={simultaneousEnabled ? 'violet' : undefined}
                      onClick={() => {
                        setSimultaneousEnabled((current) => !current);
                        setSuggestedOptions([]);
                        setSelectedSuggestedOptionId(null);
                        setManualProcedureSelections([]);
                      }}
                      disabled={selectedProcedureSummary.length < 2}
                    >
                      Marcação simultânea
                    </Button>
                    <Button
                      size="sm"
                      variant={recurrenceEnabled ? 'filled' : 'default'}
                      color={recurrenceEnabled ? 'teal' : undefined}
                      onClick={() => setRecurrenceEnabled((current) => !current)}
                      disabled={selectedProcedureSummary.length === 0}
                    >
                      Marcação recorrente
                    </Button>
                  </Group>
                </Group>
                <Box className="agendamento-availability-controls__body">
                  <Group className="agendamento-schedule-date-nav" gap="sm" wrap="nowrap">
                    <Button
                      className="agendamento-schedule-nav-button"
                      variant="default"
                      size="sm"
                      leftSection={<ChevronLeft size={16} aria-hidden="true" />}
                      onClick={() => goToSchedulingDate(addDays(schedulingDate, availabilityViewMode === 'week' ? -7 : -1))}
                      aria-label={availabilityViewMode === 'week' ? 'Ir para a semana anterior' : 'Ir para o dia anterior'}
                      disabled={dayjs(schedulingDate).isSame(dayjs(), 'day') || isPastCalendarDate(schedulingDate)}
                    >
                      {availabilityViewMode === 'week' ? 'Semana anterior' : 'Dia anterior'}
                    </Button>
                    <FloatingDatePicker
                      label="Data da marcação"
                      labelPlacement="stacked"
                      value={schedulingDate ? dayjs(schedulingDate).format('YYYY-MM-DD') : ''}
                      onChange={(event) => {
                        const rawDate = event.currentTarget.value ? new Date(`${event.currentTarget.value}T12:00:00`) : null;
                        const nextDate = rawDate
                          ?(isPastCalendarDate(rawDate) ?getTodayStart() : rawDate)
                          : null;
                        setNovoAgendamento((prev) => ({ ...prev, data: nextDate, hora: '' }));
                        setDataHoraFiltro(nextDate);
                        if (nextDate) setViewedDate(nextDate);
                      }}
                      minDate={getTodayStart()}
                      containerProps={{ className: 'agendamento-availability-date-field' }}
                    />
                    <Button
                      className="agendamento-schedule-nav-button"
                      variant="default"
                      size="sm"
                      rightSection={<ChevronRight size={16} aria-hidden="true" />}
                      onClick={() => goToSchedulingDate(addDays(schedulingDate, availabilityViewMode === 'week' ? 7 : 1))}
                      aria-label={availabilityViewMode === 'week' ? 'Ir para a próxima semana' : 'Ir para o próximo dia'}
                    >
                      {availabilityViewMode === 'week' ? 'Próxima semana' : 'Próximo dia'}
                    </Button>
                  </Group>
                  <Group className="agendamento-schedule-filters" gap="md" wrap="wrap">
                    <Select
                      className="agendamento-native-field agendamento-schedule-select"
                      label="Turno de atendimento"
                      data={(['Todos', 'Manhã', 'Tarde', 'Noite'] as const).map((turnoLabel) => ({
                        value: turnoLabel,
                        label: turnoLabel === 'Todos' ? 'Todos os turnos' : turnoLabel,
                      }))}
                      value={activeSchedulePeriod}
                      onChange={(value) => setActiveSchedulePeriod((value as 'Todos' | 'Manhã' | 'Tarde' | 'Noite') || 'Todos')}
                    />
                    {!isExamAppointment && (
                      <Select
                        className="agendamento-native-field agendamento-schedule-select agendamento-schedule-select--professional"
                        label="Profissional responsável"
                        data={[{ value: '', label: 'Todos os profissionais' }, ...availableDoctorOptions]}
                        value={novoAgendamento.profissional}
                        onChange={(value) => setNovoAgendamento((prev) => ({ ...prev, profissional: value || '' }))}
                      />
                    )}
                    <Select
                      className="agendamento-native-field agendamento-schedule-select"
                      label="Sexo do profissional"
                      placeholder="Todos"
                      data={[
                        { value: 'MALE', label: 'Masculino' },
                        { value: 'FEMALE', label: 'Feminino' },
                        { value: 'OTHER', label: 'Outro' },
                      ]}
                      value={availabilityGenderFilter}
                      onChange={setAvailabilityGenderFilter}
                      clearable
                    />
                  </Group>
                  <TextInput
                    className="agendamento-availability-search"
                    label="Busca rápida"
                    placeholder="Procedimento, profissional ou horário"
                    leftSection={<Search size={16} aria-hidden="true" />}
                    value={availabilitySearch}
                    onChange={(event) => setAvailabilitySearch(event.currentTarget.value)}
                  />
                  {recurrenceEnabled && (
                    <Group className="agendamento-recurrence-controls" gap="sm" wrap="wrap">
                      <Text className="agendamento-recurrence-controls__label" fw={600}>Repetir semanalmente</Text>
                      <Select
                        aria-label="Quantidade de ocorrências"
                        data={['2', '3', '4', '5', '6', '8', '12'].map((value) => ({ value, label: `${value} ocorrências` }))}
                        value={recurrenceOccurrences}
                        onChange={(value) => setRecurrenceOccurrences(value || '4')}
                        allowDeselect={false}
                        w={150}
                      />
                      <Select
                        aria-label="Intervalo da recorrência"
                        data={[{ value: '1', label: 'Toda semana' }, { value: '2', label: 'A cada 2 semanas' }, { value: '4', label: 'A cada 4 semanas' }]}
                        value={recurrenceIntervalWeeks}
                        onChange={(value) => setRecurrenceIntervalWeeks(value || '1')}
                        allowDeselect={false}
                        w={180}
                      />
                    </Group>
                  )}
                </Box>
                <Box className="agendamento-availability-context">
                  <Text className="agendamento-availability-context__label">Critérios selecionados</Text>
                  <Group className="agendamento-availability-context__chips" gap="xs" wrap="wrap">
                    {selectedProcedureSummary.map((procedure) => (
                      <Badge key={procedure} variant="light" color="blue" radius="xl">{procedure}</Badge>
                    ))}
                    <Badge variant="light" color="gray" radius="xl">{isExamAppointment ? 'Exame' : 'Consulta'}</Badge>
                    {!isExamAppointment && (
                      <Badge variant="light" color={novoAgendamento.modalidadeAtendimento === 'Teleconsulta' ? 'violet' : 'blue'} radius="xl">
                        {novoAgendamento.modalidadeAtendimento}
                      </Badge>
                    )}
                    {novoAgendamento.profissional && !isExamAppointment && (
                      <Badge variant="light" color="violet" radius="xl">{novoAgendamento.profissional}</Badge>
                    )}
                    {isExamAppointment && novoAgendamento.roomId && (
                      <Badge variant="light" color="violet" radius="xl">{roomLabelById[novoAgendamento.roomId] || 'Sala selecionada'}</Badge>
                    )}
                  </Group>
                </Box>
              </Box>
              {safeSchedulerDoctors.length === 0 ?(
                <Paper
                  className="agendamento-availability-empty"
                  p="xl"
                  radius="lg"
                  bg={isDarkMode ?'transparent' : 'rgba(255,255,255,0.02)'}
                  style={{
                    border: isDarkMode ?'1px solid rgba(120, 158, 230, 0.18)' : undefined,
                  }}
                >
                  <Text ta="center" c="dimmed">
                    {isExamAppointment
                      ? 'Nenhuma sala compatível com os procedimentos escolhidos está disponível para esta visualização.'
                      : 'Nenhum médico compatível com os procedimentos escolhidos está disponível para esta visualização.'}
                  </Text>
                </Paper>
              ) : (
                <Stack className="agendamento-availability-section" gap="md">
                  {isMultiProcedureFlow && !simultaneousEnabled && (
                    <Paper
                      className="agendamento-suggestion-panel"
                      p="md"
                      radius="lg"
                      bg={isDarkMode ?'transparent' : 'rgba(0, 31, 84, 0.18)'}
                      style={{
                        border: isDarkMode ?'1px solid rgba(120, 158, 230, 0.18)' : undefined,
                      }}
                    >
                      <Group justify="space-between" align="center" wrap="wrap">
                        <Box>
                          <Text fw={700}>Sugestão inteligente para múltiplos procedimentos</Text>
                          <Text size="sm" c="dimmed">
                            Vamos tentar encaixar os procedimentos no mesmo dia e com o menor intervalo possível entre eles.
                          </Text>
                        </Box>
                        <Button onClick={handleGenerateSuggestedSchedules} loading={generatingSuggestion}>
                          Sugerir horários próximos
                        </Button>
                      </Group>
                      {suggestedOptions.length > 0 && (
                        <>
                          <Paper
                            mt="md"
                            p="sm"
                            radius="md"
                            bg={isDarkMode ?'rgba(18, 184, 134, 0.08)' : 'rgba(18, 184, 134, 0.06)'}
                            style={{ border: '1px solid rgba(18, 184, 134, 0.28)' }}
                          >
                            <Group justify="space-between" align="center" wrap="wrap">
                              <Box>
                                <Text fw={700}>Sugestões prontas</Text>
                                <Text size="sm" c="dimmed">
                                  {selectedSuggestedOptionLabel
                                    ?`${selectedSuggestedOptionLabel} selecionada com espera total de ${selectedSuggestedOption?.totalWaitMinutes || 0} min.`
                                    : `${safeSuggestedOptions.length} opção(ões) disponíveis.`}
                                </Text>
                              </Box>
                              <Button variant="light" color="teal" onClick={() => setSuggestionOptionsModalOpen(true)}>
                                Ver opções
                              </Button>
                            </Group>
                          </Paper>
                          <Modal
                            opened={suggestionOptionsModalOpen}
                            onClose={() => setSuggestionOptionsModalOpen(false)}
                            title="Sugestões de horários próximos"
                            centered
                            size="xl"
                          >
                            <Stack gap="sm">
                          {safeSuggestedOptions.map((option, optionIndex) => {
                            const isSelected = selectedSuggestedOptionId === option.id;
                            return (
                              <Paper
                                key={option.id}
                                p="sm"
                                radius="md"
                                bg={
                                  isSelected
                                    ?(isDarkMode ?'rgba(18, 184, 134, 0.10)' : 'rgba(18, 184, 134, 0.08)')
                                    : (isDarkMode ?'transparent' : 'rgba(255,255,255,0.02)')
                                }
                                style={{ border: `1px solid ${isSelected ?'var(--mantine-color-teal-5)' : 'var(--mantine-color-default-border)'}` }}
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
                                    variant={isSelected ?'filled' : 'light'}
                                    color={isSelected ?'teal' : 'blue'}
                                    onClick={() => {
                                      handleApplySuggestedOption(option, Boolean(novoAgendamento.profissional));
                                      setSuggestionOptionsModalOpen(false);
                                    }}
                                  >
                                    {isSelected ?'Opção selecionada' : 'Escolher opção'}
                                  </Button>
                                </Group>
                                <Stack gap="xs">
                                  {option.items.map((item) => (
                                    <Paper
                                      key={`${option.id}-${item.procedure}-${item.doctorName}-${item.time}`}
                                      p="sm"
                                      radius="md"
                                      bg={isDarkMode ?'transparent' : 'rgba(255,255,255,0.02)'}
                                      style={{
                                        border: isDarkMode ?'1px solid rgba(120, 158, 230, 0.14)' : undefined,
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
                          </Modal>
                        </>
                      )}
                    </Paper>
                  )}
                  {isExamAppointment && !examResourcesSelected && (
                    <Paper
                      className="agendamento-exam-hint"
                      p="md"
                      radius="lg"
                      bg={isDarkMode ?'rgba(66, 99, 235, 0.08)' : 'rgba(66, 99, 235, 0.10)'}
                      style={{ border: '1px solid rgba(66, 99, 235, 0.28)' }}
                    >
                      <Text fw={700}>Selecione sala e equipamento para ver a grade</Text>
                      <Text size="sm" c="dimmed">
                        Para EXAME, a agenda é baseada no turno da sala e na disponibilidade do equipamento.
                      </Text>
                    </Paper>
                  )}
                  {availabilityViewMode === 'day' && !schedulingDateHasAvailability && examResourcesSelected && (
                    <Paper
                      className="agendamento-availability-warning"
                      p="md"
                      radius="lg"
                      bg={isDarkMode ?'rgba(250, 176, 5, 0.06)' : 'rgba(250, 176, 5, 0.08)'}
                      style={{ border: '1px solid rgba(250, 176, 5, 0.28)' }}
                    >
                      <Group justify="space-between" align="center" wrap="wrap">
                        <Box>
                          <Text fw={700}>Nenhuma disponibilidade nesse dia</Text>
                          <Text size="sm" c="dimmed">
                            Podemos procurar o próximo horário disponível em qualquer turno para continuar a marcação.
                          </Text>
                        </Box>
                        <Button variant="light" color="yellow" onClick={goToNextAvailableDate}>
                          Buscar próximo turno/dia disponível
                        </Button>
                      </Group>
                    </Paper>
                  )}
                  <Box className="agendamento-availability-board">
                  <Group className="agendamento-availability-heading" justify="space-between" align="flex-end" wrap="wrap" gap="sm">
                    <Box>
                      <Text className="agendamento-availability-heading__eyebrow">GRADE DE HORÁRIOS</Text>
                      <Text className="agendamento-availability-heading__title" fw={700}>Horários disponíveis</Text>
                      <Text className="agendamento-availability-heading__description" size="sm" c="dimmed">
                        Selecione um horário livre. Ao escolher um profissional, a grade mostra a agenda específica dele.
                      </Text>
                    </Box>
                    <Badge className="agendamento-availability-heading__count" variant="light" color="blue">
                      {availabilityViewMode === 'week' ? weekAvailabilityCount : filteredDisplayScheduleSlots.length} {(availabilityViewMode === 'week' ? weekAvailabilityCount : filteredDisplayScheduleSlots.length) === 1 ? 'horário encontrado' : 'horários encontrados'}
                    </Badge>
                  </Group>
                  <Group className="agendamento-availability-legend" gap="md" wrap="wrap" aria-label="Legenda dos estados dos horários">
                    <Text component="span" className="agendamento-availability-legend__item"><span className="agendamento-availability-legend__dot agendamento-availability-legend__dot--available" aria-hidden="true" />Livre</Text>
                    <Text component="span" className="agendamento-availability-legend__item"><span className="agendamento-availability-legend__dot agendamento-availability-legend__dot--selected" aria-hidden="true" />Selecionado</Text>
                    <Text component="span" className="agendamento-availability-legend__item"><span className="agendamento-availability-legend__dot agendamento-availability-legend__dot--reserved" aria-hidden="true" />Sugestão ou intervalo</Text>
                  </Group>
                  {(availabilityViewMode === 'week' || filteredDisplayScheduleSlots.length > 0) ? (
                  <Box className="agendamento-availability-grid-shell">
                  {availabilityViewMode === 'week' ? (
                    <SimpleGrid className="agendamento-availability-week-grid" cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
                      {weekDates.map((date) => {
                        const dateKey = formatDateForApi(date);
                        const dateSlots = weekAvailabilitySlots[dateKey] || [];
                        const isSelectedDate = dayjs(date).isSame(dayjs(schedulingDate), 'day');
                        return (
                          <Paper className={`agendamento-availability-day${isSelectedDate ? ' is-selected' : ''}`} key={dateKey} p="md" radius="lg">
                            <Group className="agendamento-availability-day__header" justify="space-between" align="flex-start" wrap="nowrap">
                              <Box>
                                <Text className="agendamento-availability-day__weekday" fw={700}>{dayjs(date).format('dddd')}</Text>
                                <Text className="agendamento-availability-day__date" size="sm" c="dimmed">{dayjs(date).format('DD/MM/YYYY')}</Text>
                              </Box>
                              <Badge size="sm" variant="light" color={dateSlots.length ? 'blue' : 'gray'}>{dateSlots.length}</Badge>
                            </Group>
                            <Stack className="agendamento-availability-day__slots" gap="xs" mt="sm">
                              {dateSlots.slice(0, 8).map((slotItem) => (
                                <Button
                                  key={slotItem.key}
                                  variant="light"
                                  color={isSelectedDate && novoAgendamento.hora === slotItem.slot ? 'teal' : 'blue'}
                                  justify="space-between"
                                  onClick={() => handleSelectGridSlot(slotItem, date)}
                                >
                                  <span className="agendamento-availability-day__slot-time">{slotItem.slot}</span>
                                  <span className="agendamento-availability-day__slot-resource">{slotItem.doctorLabel}</span>
                                </Button>
                              ))}
                              {dateSlots.length > 8 && <Text size="xs" c="dimmed">+{dateSlots.length - 8} horários</Text>}
                              {dateSlots.length === 0 && <Text size="sm" c="dimmed">Sem horários livres</Text>}
                            </Stack>
                          </Paper>
                        );
                      })}
                    </SimpleGrid>
                  ) : (
                  <SimpleGrid className="agendamento-availability-grid" cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
                    {filteredDisplayScheduleSlots.map((slotItem) => (
                      <UnstyledButton
                        className={[
                          'agendamento-availability-slot',
                          slotItem.isSelected && 'is-selected',
                          slotItem.isAnchorStart && 'is-anchor-start',
                          slotItem.isCoveredByAnchorRange && 'is-anchor-covered',
                          slotItem.isSuggestedStart && 'is-suggested-start',
                          slotItem.isCoveredBySuggestedRange && 'is-suggested-covered',
                          slotItem.isCoveredBySelectedRange && 'is-selected-covered',
                        ].filter(Boolean).join(' ')}
                        key={slotItem.key}
                        type="button"
                        aria-pressed={Boolean(slotItem.isSelected || slotItem.isAnchorStart || slotItem.isSuggestedStart)}
                        aria-label={`Selecionar ${slotItem.slot}${slotItem.doctorLabel ? ` com ${slotItem.doctorLabel}` : ''}`}
                          onClick={() => {
                            if (slotItem.isCoveredBySelectedRange || slotItem.isCoveredBySuggestedRange || slotItem.isCoveredByAnchorRange) {
                              let reason = 'Esse horário já está comprometido por uma seleção atual.';
                              if (slotItem.isCoveredBySuggestedRange) reason = 'Esse horário está reservado por uma sugestão selecionada.';
                              if (slotItem.isCoveredByAnchorRange) reason = 'Esse horário está dentro de um intervalo já em execução.';
                              showNotification({
                                title: 'Horário indisponível',
                                message: reason,
                                color: 'yellow',
                              });
                              return;
                            }
                            handleSelectGridSlot(slotItem, schedulingDate);
                          }}
                      >
                        <Group className="agendamento-availability-slot__header" justify="space-between" align="center" wrap="nowrap">
                          <Group className="agendamento-availability-slot__time" gap={6} wrap="nowrap">
                            <Clock3 size={16} aria-hidden="true" />
                            <Text fw={700} size="xl" lh={1}>{slotItem.slot}</Text>
                          </Group>
                                          {slotItem.isSelected ?(
                                             <Badge
                                               color="teal"
                                               variant="light"
                                              radius="xl"
                                             >
                                               SELECIONADO
                                             </Badge>
                                          ) : slotItem.isAnchorStart ?(
                                            <Badge
                                              color="orange"
                                              variant="light"
                                              radius="xl"
                                            >
                                              SELECIONADO
                                            </Badge>
                                          ) : slotItem.isCoveredByAnchorRange ?(
                                            <Badge
                                              color="orange"
                                              variant="light"
                                              radius="xl"
                                            >
                                              EM EXECUÇÃO
                                            </Badge>
                                          ) : slotItem.isSuggestedStart ?(
                                            <Badge
                                              color="green"
                                              variant="light"
                                              radius="xl"
                                            >
                                              SUGERIDO
                                            </Badge>
                                          ) : slotItem.isCoveredBySuggestedRange ?(
                                            <Badge
                                              color="green"
                                              variant="light"
                                              radius="xl"
                                            >
                                              RESERVADO
                                            </Badge>
                                          ) : slotItem.isCoveredBySelectedRange ?(
                                            <Badge
                                              color="blue"
                                              variant="light"
                                              radius="xl"
                                            >
                                              BLOQUEADO
                                            </Badge>
                                          ) : null}
                        </Group>
                        <Group className="agendamento-availability-slot__resource" gap={6} wrap="nowrap">
                          <User size={14} aria-hidden="true" />
                          <Text size="sm" c={isDarkMode ?'rgba(255,255,255,0.78)' : 'rgba(15, 23, 42, 0.72)'} truncate>
                            {novoAgendamento.profissional
                              ?(slotItem.doctorLabel || slotItem.doctor)
                              : isExamAppointment
                                ?`${slotItem.availableCount} sala(s) disponível(is)`
                                : `${slotItem.availableCount} profissional(is) disponível(is)`}
                          </Text>
                        </Group>
                        {(slotItem.anchorProcedure || slotItem.suggestedProcedure) && (
                          <Text
                            className="agendamento-availability-slot__procedure"
                            size="xs"
                            fw={600}
                            c={slotItem.anchorProcedure ?'orange.7' : 'green.7'}
                            truncate
                          >
                            {slotItem.anchorProcedure || slotItem.suggestedProcedure}
                          </Text>
                        )}
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                  )}
                  </Box>
                  ) : (
                    <Box className="agendamento-availability-empty-board">
                      <Box className="agendamento-availability-empty-board__icon" aria-hidden="true">
                        <Calendar size={20} />
                      </Box>
                      <Text className="agendamento-availability-empty-board__title" fw={700}>Nenhum horário livre neste turno</Text>
                      <Text className="agendamento-availability-empty-board__description" size="sm" c="dimmed">
                        Troque o turno, escolha outro profissional ou procure a próxima disponibilidade.
                      </Text>
                    </Box>
                  )}
                  <Box className="agendamento-availability-selection-bar">
                    <Group className="agendamento-availability-selection-bar__copy" gap="sm" wrap="nowrap">
                      <Box className="agendamento-availability-selection-bar__icon" aria-hidden="true">
                        <Check size={16} />
                      </Box>
                      <Box>
                        <Text className="agendamento-availability-selection-bar__label">Seleção atual</Text>
                        <Text className="agendamento-availability-selection-bar__value" fw={700}>
                          {selectedScheduleCount > 0
                            ? `${selectedScheduleCount} ${selectedScheduleCount === 1 ? 'horário selecionado' : 'horários selecionados'}`
                            : 'Nenhum horário selecionado'}
                        </Text>
                        {selectedScheduleCount > 0 && (
                          <Text className="agendamento-availability-selection-bar__meta" size="sm" c="dimmed">
                            {selectedScheduleDateLabel}{selectedScheduleTimeLabel ? ` • ${selectedScheduleTimeLabel}` : ''}{reviewProfessionalValue ? ` • ${reviewProfessionalValue}` : ''}
                          </Text>
                        )}
                      </Box>
                    </Group>
                    <Group className="agendamento-availability-selection-bar__actions" gap="sm" wrap="wrap">
                      <Button
                        variant="light"
                        color="red"
                        onClick={handleClearSelectedSchedules}
                        disabled={!hasAnySelectedSchedule}
                      >
                        Limpar seleção
                      </Button>
                    </Group>
                  </Box>
                  </Box>
                  <Modal
                    opened={professionalSlotModalOpen}
                    onClose={() => {
                      setProfessionalSlotModalOpen(false);
                      setPendingProfessionalSlot(null);
                    }}
                    title={isExamAppointment ?'Selecionar sala' : 'Selecionar profissional'}
                    centered
                    size="md"
                  >
                    <Stack gap="sm">
                      <Text size="sm" c="dimmed">
                        {isExamAppointment ?'Salas' : 'Profissionais'} com disponibilidade às {pendingProfessionalSlot?.time || '--:--'}.
                      </Text>
                      {(pendingProfessionalSlot
                        ?getProfessionalOptionsForSlot(
                            pendingProfessionalSlot.time,
                            pendingProfessionalSlot.date,
                            pendingProfessionalSlot.procedure,
                            pendingProfessionalSlot.candidates,
                          )
                        : []).map((slotItem) => (
                        <Button
                          key={`${slotItem.doctor}-${slotItem.slot}`}
                          variant="light"
                          color="blue"
                          justify="space-between"
                          onClick={() => {
                            setProfessionalSlotModalOpen(false);
                            if (pendingProfessionalSlot?.procedure) {
                              handleFinalizeProcedureSelection(
                                pendingProfessionalSlot.procedure,
                                slotItem.doctor,
                                slotItem.slot,
                                pendingProfessionalSlot.date,
                              );
                            } else {
                              handleSelectAnchorSlot(slotItem.doctor, slotItem.slot, pendingProfessionalSlot?.date || schedulingDate);
                            }
                            setPendingProfessionalSlot(null);
                          }}
                        >
                          {isExamAppointment ?slotItem.doctorLabel : slotItem.doctor}
                        </Button>
                      ))}
                      {pendingProfessionalSlot && getProfessionalOptionsForSlot(
                        pendingProfessionalSlot.time,
                        pendingProfessionalSlot.date,
                        pendingProfessionalSlot.procedure,
                        pendingProfessionalSlot.candidates,
                      ).length === 0 && (
                        <Text size="sm" c="dimmed">
                          {isExamAppointment
                            ?'Nenhuma sala compatível com este procedimento está disponível nesse horário.'
                            :'Nenhum profissional compatível com este procedimento está disponível nesse horário.'}
                        </Text>
                      )}
                    </Stack>
                  </Modal>
                  <Modal
                    opened={anchorProcedureModalOpen}
                    onClose={() => {
                      setAnchorProcedureModalOpen(false);
                      setPendingAnchorSlot(null);
                    }}
                    title="Vincular horário ao procedimento"
                    centered
                    size="md"
                  >
                    <Stack gap="sm">
                      <Text size="sm" c="dimmed">
                        Escolha qual procedimento será realizado às {pendingAnchorSlot?.time || '--:--'} com {pendingAnchorSlot?.doctorName || 'o profissional selecionado'}.
                      </Text>
                      {(pendingAnchorSlot
                        ?getSchedulableProceduresForSlot(
                            pendingAnchorSlot.doctorName || '',
                            pendingAnchorSlot.time,
                            pendingAnchorSlot.date,
                          )
                        : selectedSpecialties
                      ).map((procedureName) => {
                        const isCurrentAnchor = manualProcedureSelections.some((item) =>
                          item.procedure === procedureName
                          && item.doctorName === pendingAnchorSlot?.doctorName
                          && item.time === pendingAnchorSlot?.time
                          && dayjs(item.date).isSame(pendingAnchorSlot?.date, 'day'),
                        );
                        return (
                          <Button
                            key={`${pendingAnchorSlot?.doctorName || 'doctor'}-${pendingAnchorSlot?.time || 'time'}-${procedureName}`}
                            variant={isCurrentAnchor ?'filled' : 'light'}
                            color={isCurrentAnchor ?'orange' : 'blue'}
                            justify="space-between"
                            onClick={() => handleConfirmAnchorProcedure(procedureName)}
                          >
                            {procedureName}
                          </Button>
                        );
                      })}
                    </Stack>
                  </Modal>
                </Stack>
              )}
              </>
              ) : (
                <Text size="sm" c="dimmed">
                  Selecione ao menos um procedimento para visualizar os horários disponíveis.
                </Text>
              )}
              </Box>
              <Group className="agendamento-wizard-actions" justify="space-between" align="center" wrap="wrap">
                <Button
                  variant="default"
                  leftSection={<ChevronLeft size={16} aria-hidden="true" />}
                  onClick={() => goToSchedulingStep(0)}
                >
                  Voltar aos dados
                </Button>
                <Button
                  rightSection={<ChevronRight size={16} aria-hidden="true" />}
                  onClick={handleContinueToReview}
                  disabled={!canAdvanceToReview}
                >
                  Revisar agendamento
                </Button>
              </Group>
              </Box>
              <Box className={`agendamento-wizard-step agendamento-wizard-step--confirmation${schedulingStep === 2 ? ' is-active' : ''}`}>
              <Box className="agendamento-stage-panel agendamento-stage-panel--confirmation">
              <Box className="agendamento-review-summary">
                <Group className="agendamento-review-summary__header" justify="space-between" align="center" wrap="wrap" gap="md">
                  <Group gap="sm" wrap="nowrap">
                    <Box className="agendamento-review-summary__icon" aria-hidden="true">
                      <ClipboardCheck size={18} />
                    </Box>
                    <Box className="agendamento-review-summary__intro">
                      <Text className="agendamento-review-summary__title" fw={700}>Resumo do atendimento</Text>
                      <Text className="agendamento-review-summary__description" size="sm" c="dimmed">
                        Confira os dados antes de confirmar a marcação.
                      </Text>
                    </Box>
                  </Group>
                  <Badge className="agendamento-review-summary__status" variant="light" color="blue">
                    Revisão final
                  </Badge>
                  <Group className="agendamento-review-summary__flags" gap="xs" wrap="wrap">
                    {simultaneousEnabled && <Badge variant="light" color="violet">Simultânea</Badge>}
                    {recurrenceEnabled && <Badge variant="light" color="teal">{recurrenceOccurrences} ocorrências</Badge>}
                  </Group>
                </Group>
                <SimpleGrid className="agendamento-review-grid" cols={{ base: 1, md: 3 }} spacing="md">
              <TextInput className="agendamento-native-field agendamento-review-field" label="Nome completo" value={novoAgendamento.pacienteNome || ''} readOnly />
              <TextInput className="agendamento-native-field agendamento-review-field" label="Convênio" value={novoAgendamento.convenio || ''} readOnly />
              <TextInput className="agendamento-native-field agendamento-review-field" label="Plano" value={novoAgendamento.convenioPlano || 'Não informado'} readOnly />
              <TextInput className="agendamento-native-field agendamento-review-field" label="Procedimento" value={selectedProcedureSummary.join(', ')} readOnly />
              <TextInput className="agendamento-native-field agendamento-review-field" label="Tipo de agendamento" value={getAppointmentTypeLabel(resolvedAppointmentType)} readOnly />
              {!isExamAppointment && (
                <TextInput
                  className="agendamento-native-field agendamento-review-field"
                  label="Modalidade"
                  value={novoAgendamento.modalidadeAtendimento}
                  readOnly
                />
              )}
              <TextInput className="agendamento-native-field agendamento-review-field" label="Data" value={reviewDateValue ?dayjs(reviewDateValue).format('DD/MM/YYYY') : ''} readOnly />
              <TextInput className="agendamento-native-field agendamento-review-field" label="Horário" value={reviewTimeValue} readOnly />
              {recurrenceEnabled && (
                <TextInput className="agendamento-native-field agendamento-review-field" label="Recorrência" value={`${recurrenceOccurrences} ocorrência(s) • a cada ${recurrenceIntervalWeeks} semana(s)`} readOnly />
              )}
              {!isExamAppointment && (
                <TextInput className="agendamento-native-field agendamento-review-field" label="Profissional respons." value={reviewProfessionalValue} readOnly />
              )}
              {isExamAppointment && (
                <TextInput className="agendamento-native-field agendamento-review-field" label="Sala" value={roomLabelById[novoAgendamento.roomId] || ''} readOnly />
              )}
              {isExamAppointment && (
                <TextInput
                  className="agendamento-native-field agendamento-review-field"
                  label="Equipamento"
                  value={eligibleEquipmentOptions.find((item) => item.value === novoAgendamento.medicalEquipmentId)?.label || ''}
                  readOnly
                />
              )}
                </SimpleGrid>
              </Box>
              <Paper
                className="agendamento-documents-card"
                p={0}
                radius="lg"
                bg={isDarkMode ?'transparent' : 'var(--mantine-color-body)'}
                style={{
                  border: isDarkMode
                    ?'1px solid rgba(120, 158, 230, 0.18)'
                    : '1px solid rgba(0, 31, 84, 0.10)',
                  boxShadow: isDarkMode ?'none' : '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <Stack gap="sm">
                  <Group className="agendamento-documents-card__header" justify="space-between" align="center" wrap="wrap" gap="md">
                    <Group gap="sm" wrap="nowrap">
                      <Box className="agendamento-documents-card__icon" aria-hidden="true">
                        <Paperclip size={17} />
                      </Box>
                      <Box className="agendamento-documents-card__intro">
                        <Text className="agendamento-documents-card__title" fw={700}>Documentos do agendamento</Text>
                        <Text className="agendamento-documents-card__description" size="sm" c="dimmed">
                          Anexe pedido médico, guia, identidade ou outros documentos relevantes.
                        </Text>
                      </Box>
                    </Group>
                    <Button variant="light" onClick={() => attachmentInputRef.current?.click()}>
                      Anexar documentos
                    </Button>
                  </Group>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleReviewAttachmentInput}
                  />
                  {reviewAttachments.length > 0 && (
                    <Stack gap={6}>
                      <Text size="sm" fw={600}>Arquivos para enviar</Text>
                      {reviewAttachments.map((file) => (
                        <Group key={`${file.name}-${file.lastModified}-${file.size}`} justify="space-between" wrap="nowrap">
                          <Box>
                            <Text size="sm" fw={500}>{file.name}</Text>
                            <Text size="xs" c="dimmed">
                              {(file.size / 1024).toFixed(1)} KB{file.type ?` • ${file.type}` : ''}
                            </Text>
                          </Box>
                          <Button variant="subtle" color="red" size="xs" onClick={() => handleRemoveReviewAttachment(file)}>
                            Remover
                          </Button>
                        </Group>
                      ))}
                    </Stack>
                  )}
                  {isEditing && (
                    <Stack gap={6}>
                      <Text size="sm" fw={600}>Anexos ja enviados</Text>
                      {loadingExistingAttachments ?(
                        <Text size="sm" c="dimmed">Carregando anexos...</Text>
                      ) : existingAttachments.length > 0 ?(
                        existingAttachments.map((attachment) => (
                          <Group key={attachment.id} justify="space-between" wrap="nowrap">
                            <Box>
                              <Text size="sm" fw={500}>{attachment.fileName}</Text>
                              <Text size="xs" c="dimmed">
                                {attachment.uploadedAt ?dayjs(attachment.uploadedAt).format('DD/MM/YYYY HH:mm') : 'Anexo enviado'}
                              </Text>
                            </Box>
                            <Button
                              variant="subtle"
                              size="xs"
                              loading={openingAttachmentId === attachment.id}
                              onClick={() => handleOpenExistingAttachment(attachment.id)}
                            >
                              Abrir
                            </Button>
                          </Group>
                        ))
                      ) : (
                        <Text size="sm" c="dimmed">Nenhum anexo enviado ainda.</Text>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Paper>
              <Group className="agendamento-form-actions" justify="space-between">
                <Button
                  variant="default"
                  leftSection={<ChevronLeft size={16} aria-hidden="true" />}
                  onClick={() => goToSchedulingStep(1)}
                >
                  Voltar aos horários
                </Button>
                <Button
                  onClick={handleAddAgendamento}
                  loading={savingAgendamento}
                  disabled={!schedulingReady || savingAgendamento}
                >
                  {isEditing ?'Salvar alterações' : 'Confirmar Marcação'}
                </Button>
              </Group>
              </Box>
              </Box>
            </Stack>
          </Box>
        </Box>
          </Tabs.Panel>
          <Tabs.Panel value="agendados">
        <Box className="agendamento-agenda-page">
        <Box className="agendamento-agenda-intro">
          <Box className="agendamento-agenda-intro__copy">
            <Text className="agendamento-agenda-intro__eyebrow">CONTROLE OPERACIONAL</Text>
            <Text className="agendamento-agenda-intro__title" component="h2">Visualizar agenda</Text>
            <Text className="agendamento-agenda-intro__description">
              Consulte, filtre e ajuste os atendimentos da unidade em um único lugar.
            </Text>
          </Box>
          <Box className="agendamento-agenda-intro__summary">
            <Text className="agendamento-agenda-intro__summary-label">VISÃO ATUAL</Text>
            <Text className="agendamento-agenda-intro__summary-value">
              {filteredAgendamentos.length} {filteredAgendamentos.length === 1 ? 'atendimento' : 'atendimentos'} encontrados
            </Text>
          </Box>
        </Box>
        <Box className="agendamento-agenda-toolbar">
          <Box className="agendamento-agenda-filter-grid">
            {/* Filtros */}
            <Select
              className="agendamento-agenda-native-field"
              label="Procedimento"
              data={procedureOptions}
              value={procedimentoFiltro}
              onChange={setProcedimentoFiltro}
              searchable
              clearable
              disabled={proceduresLoading}
              nothingFoundMessage="Nenhum procedimento encontrado"
            />
            <FloatingDatePicker
              label="Data"
              labelPlacement="stacked"
              value={dataHoraFiltro ? dayjs(dataHoraFiltro).format('YYYY-MM-DD') : ''}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (!value) {
                  setDataHoraFiltro(null);
                  return;
                }
                const [year, month, day] = value.split('-').map(Number);
                setDataHoraFiltro(new Date(year, month - 1, day, 0, 0, 0, 0));
              }}
              containerProps={{ className: 'agendamento-agenda-native-date-field' }}
            />
            <Select
              className="agendamento-agenda-native-field"
              label="Convênio"
              data={insuranceOptions}
              value={convenio}
              onChange={setConvenio}
              searchable
              clearable
              disabled={insurancesLoading}
              nothingFoundMessage="Nenhum convênio encontrado"
            />
            <Select
              className="agendamento-agenda-native-field"
              label="Status"
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
            />
          </Box>
          <Group className="agendamento-agenda-search-row" justify="space-between" align="end" wrap="wrap">
            <Box className="agendamento-agenda-search-input">
              <TextInput
                className="agendamento-agenda-native-search"
                label={isMobile ?'Buscar' : 'Buscar por paciente, CPF ou médico'}
                placeholder="Digite para filtrar os atendimentos"
                value={searchValue}
                onChange={(e) => setSearchValue(e.currentTarget.value)}
                rightSection={<Search size={16} aria-hidden="true" />}
              />
            </Box>
            <Group className="agendamento-agenda-view-switcher" gap="xs">
              <ActionIcon
                variant={layout === 'list' ?'filled' : 'subtle'}
                color={layout === 'list' ?'darkBlue' : undefined}
                onClick={() => setLayout('list')}
                aria-label="Visualização em lista"
                title="Lista"
              >
                <List size={16} />
              </ActionIcon>
              <ActionIcon
                variant={layout === 'grid' ?'filled' : 'subtle'}
                color={layout === 'grid' ?'darkBlue' : undefined}
                onClick={() => setLayout('grid')}
                aria-label="Visualização em grade"
                title="Grade"
              >
                <LayoutGrid size={16} />
              </ActionIcon>
              <ActionIcon
                variant={layout === 'calendar' ?'filled' : 'subtle'}
                color={layout === 'calendar' ?'darkBlue' : undefined}
                onClick={() => setLayout('calendar')}
                aria-label="Visualização em calendário"
                title="Calendário"
              >
                <Calendar size={16} />
              </ActionIcon>
            </Group>
          </Group>
          </Box>
        {dataHoraFiltro && (
          <Text className="agendamento-agenda-date-heading" size="xl" fw={700}>
            {dayjs(dataHoraFiltro).format('dddd').charAt(0).toUpperCase() + dayjs(dataHoraFiltro).format('dddd').slice(1)} | {dayjs(dataHoraFiltro).format('DD [de] MMMM [de] YYYY')}
          </Text>
        )}
        {/* Agendamentos List */}
        {(layout === 'list' || layout === 'grid') && (
          <Box className="agendamento-agenda-results">
            <PaginatedGrid
              totalItems={filteredAgendamentos.length}
              page={agendadosPage}
              pageSize={agendadosPageSize}
              onPageChange={setAgendadosPage}
              onPageSizeChange={(size) => {
                setAgendadosPageSize(size);
                setAgendadosPage(1);
              }}
              isMobile={isMobile}
              maxHeight={layout === 'grid' ?'none' : 560}
            >
            {/* LIST */}
            {layout === 'list' && (
              <Box className="agendamento-agenda-list">
                {rows.length > 0 ? rows : <Box p="md"><Text ta="center" c="dimmed">Nenhum agendamento encontrado</Text></Box>}
              </Box>
            )}

            {/* GRID */}
            {layout === 'grid' && (
              <Box className="agendamento-agenda-grid" p="md">
                <SimpleGrid cols={isMobile ? 1 : isTablet ? 2 : 3} spacing="md">
                  {filteredAgendamentos.length > 0 ? paginatedAgendamentos.map(a => {
                  const isExpanded = expandedIds.includes(a.id);
                  return (
                    <Box
                      key={a.id}
                      className={`agendamento-agenda-card${isExpanded ?' agendamento-agenda-card--expanded' : ''}`}
                      style={{
                        border: '1px solid var(--mantine-color-default-border)',
                        borderRadius: 12,
                        background: 'var(--mantine-color-body)',
                        minHeight: 280,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box className="agendamento-agenda-card__header">
                        <Box className="agendamento-agenda-card__identity">
                          <Box className="agendamento-agenda-card__time">
                            <Clock3 size={15} aria-hidden="true" />
                            <Text>{a.hora || '—'}</Text>
                          </Box>
                          <Box style={{ minWidth: 0 }}>
                            <Text className="agendamento-agenda-card__patient" lineClamp={1}>
                              {a.pacienteNome || 'Paciente não informado'}
                            </Text>
                            <Text className="agendamento-agenda-card__date">
                              {dayjs(a.data).format('DD/MM/YYYY')}
                            </Text>
                          </Box>
                        </Box>
                        <Badge className="agendamento-agenda-card__status" variant="light" radius="xl" color={getAppointmentStatusBadgeColor(a.status)}>
                          {getAppointmentStatusLabel(a.status)}
                        </Badge>
                      </Box>
                      <Box className="agendamento-agenda-card__body">
                        <Box className="agendamento-agenda-card__field">
                          <Text className="agendamento-agenda-card__label">Procedimento</Text>
                          <Text className="agendamento-agenda-card__value" lineClamp={2}>{a.especialidade || 'Não informado'}</Text>
                        </Box>
                        <Box className="agendamento-agenda-card__meta-grid">
                          <Box className="agendamento-agenda-card__field">
                            <Text className="agendamento-agenda-card__label">Tipo</Text>
                            <Badge variant="light" color={a.tipoConsulta === 'EXAME' ?'grape' : 'blue'}>
                              {getAppointmentTypeLabel(a.tipoConsulta)}
                            </Badge>
                          </Box>
                          <Box className="agendamento-agenda-card__field">
                            <Text className="agendamento-agenda-card__label">Convênio</Text>
                            <Text className="agendamento-agenda-card__value" lineClamp={1}>{a.convenio || 'Particular'}</Text>
                          </Box>
                        </Box>
                        <Box className="agendamento-agenda-card__field">
                          <Text className="agendamento-agenda-card__label">Profissional</Text>
                          <Text className="agendamento-agenda-card__value" lineClamp={1}>{a.medicoNome || 'Não informado'}</Text>
                        </Box>
                        {isExpanded && (
                          <Box className="agendamento-agenda-card__expanded">
                            <Box className="agendamento-agenda-card__expanded-row">
                              <Text className="agendamento-agenda-card__expanded-label">CPF</Text>
                              <Text className="agendamento-agenda-card__expanded-value">{a.pacienteCPF ?formatCPF(a.pacienteCPF) : 'Não informado'}</Text>
                            </Box>
                            <Box className="agendamento-agenda-card__expanded-row">
                              <Text className="agendamento-agenda-card__expanded-label">Resumo</Text>
                              <Text className="agendamento-agenda-card__expanded-value">{getResumoLinha(a)}</Text>
                            </Box>
                            {a.observacoes ?(
                              <Box className="agendamento-agenda-card__expanded-row">
                                <Text className="agendamento-agenda-card__expanded-label">Observações</Text>
                                <Text className="agendamento-agenda-card__expanded-value">{a.observacoes}</Text>
                              </Box>
                            ) : null}
                          </Box>
                        )}
                      </Box>
                      <Box className="agendamento-agenda-card__footer">
                        <Button className="agendamento-agenda-card__primary-action" size="xs" variant="light" onClick={() => handleOpenAppointmentDetail(a)}>
                          Detalhes
                        </Button>
                        <Group className="agendamento-agenda-card__secondary-actions" gap="xs">
                          {(a.status === 'NAO_COMPARECEU' || a.status === 'CANCELADO') && (
                            <Button size="xs" variant="outline" onClick={() => handleRescheduleAppointment(a)}>
                              Reagendar
                            </Button>
                          )}
                          <Button size="xs" variant="subtle" onClick={() => setExpandedIds(prev => isExpanded ?prev.filter(id => id !== a.id) : [...prev, a.id])}>
                            {isExpanded ?'Ver menos' : 'Ver mais'}
                          </Button>
                          <Button size="xs" variant="subtle" onClick={() => handleEditAgendamento(a)}>
                            Editar
                          </Button>
                        </Group>
                      </Box>
                    </Box>
                  );
                  }) : <Box p="md"><Text ta="center" c="dimmed">Nenhum agendamento encontrado</Text></Box>}
                </SimpleGrid>
              </Box>
            )}
            </PaginatedGrid>
          </Box>
        )}

          {/* CALENDAR */}
          {layout === 'calendar' && (
            <Box className="agendamento-agenda-calendar" style={{ overflowX: 'auto', border: '1px solid var(--mantine-color-default-border)', borderRadius: 6 }} p="md">
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
                  <Button size="xs" variant={selectedDay ?'outline' : 'filled'} onClick={() => { setSelectedDay(null); setDataHoraFiltro(new Date()); }}>
                    Limpar seleção
                  </Button>
                </Group>
              </Group>
              {/* Weekdays */}
              <SimpleGrid className="agendamento-agenda-calendar__weekdays" cols={7} spacing={0} mb={8}>
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                  <Box key={d} style={{ textAlign: 'center', padding: '6px 0' }}>
                    <Text size="xs" c="dimmed" fw={600}>{d}</Text>
                  </Box>
                ))}
              </SimpleGrid>
              {/* Days grid */}
              <SimpleGrid className="agendamento-agenda-calendar__days" cols={7} spacing="xs">
                {(() => {
                  const startOfMonth = dayjs(currentMonth).startOf('month');
                  // Monday-first: compute start date to show (previous Monday)
                  const startDay = startOfMonth.startOf('week').add(1, 'day');
                  // adjust if startDay is after startOfMonth (works with sunday-first)
                  const start = startDay.isAfter(startOfMonth) ?startDay.subtract(7, 'day') : startDay;
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
                    const isSelected = selectedDay ?dayjs(selectedDay).isSame(d, 'day') : false;
                    const isToday = d.isSame(dayjs(), 'day');
                    const dayAppointments = agendamentosByDate[key] || [];
                    const count = apptMap[d.format('YYYY-MM-DD')] || 0;
                    const daySummary = getAppointmentStatusSummary(dayAppointments);
                    return (
                      <Box
                        key={key}
                        onClick={() => {
                          setSelectedDay(d.toDate());
                          setDataHoraFiltro(d.toDate());
                          setCalendarModalOpen(false);
                        }}
                        className={`agendamento-agenda-calendar__day${isCurrentMonth ? '' : ' is-outside'}${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}${count > 0 ? ' has-appointments' : ''}`}
                        style={{
                          padding: 10,
                          minHeight: 92,
                          borderRadius: 12,
                          cursor: 'pointer',
                          background: isSelected
                            ?(isDarkMode ?'rgba(70, 116, 255, 0.20)' : 'rgba(0, 31, 84, 0.08)')
                            : isToday
                              ?(isDarkMode ?'rgba(255,255,255,0.03)' : 'rgba(0, 31, 84, 0.03)')
                              : 'transparent',
                          color: isCurrentMonth ?'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
                          boxShadow: isSelected ?'0 8px 24px rgba(0, 31, 84, 0.10)' : undefined,
                          border: isSelected
                            ?'1px solid var(--ui-primary)'
                            : isToday
                              ?'1px solid var(--mantine-color-default-border)'
                              : '1px solid transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                        title={d.format('DD/MM/YYYY')}
                      >
                        <Box className="agendamento-agenda-calendar__day-header">
                          <Box className="agendamento-agenda-calendar__day-heading">
                            <Text className="agendamento-agenda-calendar__day-number" fw={700} size="sm">{d.date()}</Text>
                            {isToday && (
                              <Badge className="agendamento-agenda-calendar__today" size="xs" variant={isSelected ?'filled' : 'light'} color={isSelected ?'dark' : 'blue'} radius="xl">
                                Hoje
                              </Badge>
                            )}
                          </Box>
                          {count > 0 && (
                            <Badge className="agendamento-agenda-calendar__appointment-count" size="sm" variant="light" radius="xl">
                              {count}
                            </Badge>
                          )}
                        </Box>
                        <Box className="agendamento-agenda-calendar__appointment-summary">
                          {count > 0 && (
                            <>
                              <Text className="agendamento-agenda-calendar__appointment-total" size="xs" fw={600} c={isSelected ?'var(--mantine-color-text)' : 'dimmed'}>
                                {count} agendamento{count > 1 ?'s' : ''}
                              </Text>
                              {daySummary[0] ?(
                                <Text className="agendamento-agenda-calendar__appointment-status" size="xs" c="dimmed" lineClamp={1}>
                                  {daySummary[0].count} {daySummary[0].label.toLowerCase()}
                                </Text>
                              ) : null}
                            </>
                          )}
                        </Box>
                      </Box>
                    );
                  });
                })()}
              </SimpleGrid>
              {selectedDay && (
                <Paper
                  mt="md"
                  p="md"
                  radius="md"
                  bg={isDarkMode ?'rgba(120, 158, 230, 0.08)' : 'rgba(0, 31, 84, 0.04)'}
                  style={{
                    border: isDarkMode ?'1px solid rgba(120, 158, 230, 0.18)' : '1px solid rgba(0, 31, 84, 0.10)',
                  }}
                >
                  <Stack gap="md">
                    <Group justify="apart" align="flex-start">
                      <Box>
                        <Text fw={700}>
                          {dayjs(selectedDay).format('dddd').charAt(0).toUpperCase() + dayjs(selectedDay).format('dddd').slice(1)} • {dayjs(selectedDay).format('DD [de] MMMM [de] YYYY')}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {selectedDayAppointments.length > 0
                            ?`${selectedDayAppointments.length} agendamento${selectedDayAppointments.length > 1 ?'s' : ''} neste dia`
                            : 'Nenhum agendamento neste dia'}
                        </Text>
                      </Box>
                      {selectedDayAppointments.length > 0 ?(
                        <Button size="xs" variant="light" onClick={() => setCalendarModalOpen(true)}>
                          Ver lista completa
                        </Button>
                      ) : null}
                    </Group>
                    {selectedDayStatusSummary.length > 0 ?(
                      <Group gap="xs">
                        {selectedDayStatusSummary.map((item) => (
                          <Badge key={item.key} variant="light" color={item.color} radius="xl">
                            {item.count} {item.label}
                          </Badge>
                        ))}
                      </Group>
                    ) : null}
                    {selectedDayAppointments.length > 0 ?(
                      <Stack gap="xs">
                        {selectedDayAppointments.slice(0, 4).map((a) => (
                          <Paper
                            key={a.id}
                            p="sm"
                            radius="md"
                            bg="var(--mantine-color-body)"
                            style={{ border: '1px solid var(--mantine-color-default-border)' }}
                          >
                            <Group justify="apart" align="center">
                              <Box style={{ flex: 1, minWidth: 0 }}>
                                <Text fw={600}>{a.hora} • {a.pacienteNome || '—'}</Text>
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {getResumoLinha(a)}
                                </Text>
                              </Box>
                              <Group gap="xs">
                                <Badge variant="light" color={getAppointmentStatusBadgeColor(a.status)} radius="xl">
                                  {getAppointmentStatusLabel(a.status)}
                                </Badge>
                                <Button size="xs" variant="subtle" onClick={() => handleOpenAppointmentDetail(a)}>
                                  Detalhes
                                </Button>
                              </Group>
                            </Group>
                          </Paper>
                        ))}
                        {selectedDayAppointments.length > 4 ?(
                          <Text size="xs" c="dimmed">
                            Mostrando 4 de {selectedDayAppointments.length} agendamentos.
                          </Text>
                        ) : null}
                      </Stack>
                    ) : null}
                  </Stack>
                </Paper>
              )}
              {/* Selected day details shown in modal when there are appointments */}
              <Modal
                opened={calendarModalOpen}
                onClose={() => setCalendarModalOpen(false)}
                title={selectedDay ?`Agendamentos — ${dayjs(selectedDay).format('DD [de] MMMM [de] YYYY')}` : 'Agendamentos'}
                size={isMobile ?'100%' : 'lg'}
                centered
                fullScreen={isMobile}
              >
                <Stack gap={8}>
                  {selectedDay && (agendamentosByDate[dayjs(selectedDay).format('YYYY-MM-DD')] || []).length > 0 ?(
                    (agendamentosByDate[dayjs(selectedDay).format('YYYY-MM-DD')] || []).map(a => (
                      <Box key={a.id} style={{ padding: 12, background: 'var(--mantine-color-default)', borderRadius: 8, border: '1px solid var(--mantine-color-default-border)', marginBottom: 8 }}>
                        <Group align="center" style={{ width: '100%' }}>
                          <Box style={{ flex: 1 }}>
                            <Text fw={600}>{a.hora} — {a.pacienteNome || '—'}</Text>
                            <Text size="xs" c="dimmed">{getResumoLinha(a)}</Text>
                          </Box>
                          <Box style={{ marginLeft: 12 }}>
                            <Button size="xs" onClick={() => { handleOpenAppointmentDetail(a); setCalendarModalOpen(false); }}>
                              Detalhes
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

          <Tabs.Panel value="online">
            <Box className="agendamento-online-page">
              <Box className="agendamento-online-content">
                <Box className="agendamento-online-hero">
                  <Box className="agendamento-online-hero__copy">
                    <Text className="agendamento-online-hero__eyebrow">OPERAÇÃO • PORTAL DO PACIENTE</Text>
                    <Text className="agendamento-online-hero__title" component="h2">Agendamentos online</Text>
                    <Text className="agendamento-online-hero__description">
                      Revise as solicitações recebidas pelo portal antes de confirmar o atendimento.
                    </Text>
                  </Box>
                  <Box className="agendamento-online-hero__summary" aria-live="polite">
                    <Text className="agendamento-online-hero__summary-label">EM ANÁLISE</Text>
                    <Text className="agendamento-online-hero__summary-value">{onlineAppointments.length}</Text>
                    <Text className="agendamento-online-hero__summary-caption">
                      {onlineAppointments.length === 1 ? 'solicitação pendente' : 'solicitações pendentes'}
                    </Text>
                  </Box>
                </Box>

              {loadingOnline ? (
                <Box className="agendamento-online-state" aria-live="polite">
                  <Loader />
                  <Text>Carregando solicitações online...</Text>
                </Box>
              ) : onlineAppointments.length === 0 ? (
                <Box className="agendamento-online-empty" aria-live="polite">
                  <Box className="agendamento-online-empty__icon" aria-hidden="true">
                    <ClipboardCheck size={24} />
                  </Box>
                  <Box className="agendamento-online-empty__content">
                    <Text className="agendamento-online-empty__title">Tudo em dia</Text>
                    <Text className="agendamento-online-empty__description">
                      Nenhum agendamento online está pendente de revisão neste momento.
                    </Text>
                  </Box>
                </Box>
              ) : (
                <Box className="agendamento-online-list" aria-label="Solicitações de agendamento online">
                    {onlineAppointments.map((a) => (
                      <Paper key={a.id} className="agendamento-online-card" withBorder>
                        <Box className="agendamento-online-card__top">
                          <Box className="agendamento-online-card__top-copy">
                            <Text className="agendamento-online-card__eyebrow">SOLICITAÇÃO ONLINE</Text>
                            <Text className="agendamento-online-card__request-date">
                              {a.createdAt ? `Recebida em ${dayjs(a.createdAt).format('DD/MM/YYYY [às] HH:mm')}` : 'Solicitação recebida'}
                            </Text>
                          </Box>
                          <Badge className="agendamento-online-card__status" variant="light" color="orange" radius="xl">
                            Aguardando revisão
                          </Badge>
                        </Box>

                        <Box className="agendamento-online-card__body">
                          <Box className="agendamento-online-card__patient">
                            <Text className="agendamento-online-card__field-label">PACIENTE</Text>
                            <Text className="agendamento-online-card__patient-name">{a.patientName || 'Paciente não informado'}</Text>
                            {a.patientCpf ? (
                              <Text className="agendamento-online-card__patient-cpf">CPF {formatCPF(a.patientCpf)}</Text>
                            ) : null}
                          </Box>

                          <Box className="agendamento-online-card__details">
                            <Box className="agendamento-online-card__detail">
                              <Text className="agendamento-online-card__field-label">DATA E HORÁRIO</Text>
                              <Box className="agendamento-online-card__detail-value">
                                <Clock3 size={16} aria-hidden="true" />
                                <Text>{a.date ? dayjs(a.date).format('DD/MM/YYYY') : 'Data não informada'}{a.time ? ` • ${a.time}` : ''}</Text>
                              </Box>
                            </Box>
                            <Box className="agendamento-online-card__detail">
                              <Text className="agendamento-online-card__field-label">PROCEDIMENTO</Text>
                              <Text className="agendamento-online-card__detail-text">{a.specialty || 'Não informado'}</Text>
                            </Box>
                            <Box className="agendamento-online-card__detail">
                              <Text className="agendamento-online-card__field-label">PROFISSIONAL</Text>
                              <Box className="agendamento-online-card__detail-value">
                                <User size={16} aria-hidden="true" />
                                <Text>{a.doctorName || 'A definir'}</Text>
                              </Box>
                            </Box>
                            <Box className="agendamento-online-card__detail">
                              <Text className="agendamento-online-card__field-label">TIPO</Text>
                              <Text className="agendamento-online-card__detail-text">
                                {a.type === 'CONSULTA' ? 'Consulta' : a.type === 'EXAME' ? 'Exame' : a.type || 'Não informado'}
                              </Text>
                            </Box>
                            <Box className="agendamento-online-card__detail">
                              <Text className="agendamento-online-card__field-label">CONVÊNIO</Text>
                              <Text className="agendamento-online-card__detail-text">{a.convenio || 'Particular'}</Text>
                            </Box>
                          </Box>
                        </Box>

                        {a.observations ? (
                          <Box className="agendamento-online-card__observations">
                            <Text className="agendamento-online-card__field-label">OBSERVAÇÕES</Text>
                            <Text>{a.observations}</Text>
                          </Box>
                        ) : null}

                        <Box className="agendamento-online-card__footer">
                          <Text className="agendamento-online-card__footer-note">
                            Confirme os dados antes de aceitar esta solicitação.
                          </Text>
                          <Group className="agendamento-online-card__actions" gap="sm">
                            <Button
                              className="agendamento-online-card__accept"
                              color="green"
                              leftSection={<Check size={16} />}
                              loading={resolvingOnlineId === a.id}
                              onClick={() => handleConfirmOnline(a.id)}
                            >
                              Aceitar solicitação
                            </Button>
                            <Button
                              className="agendamento-online-card__reject"
                              color="red"
                              variant="light"
                              leftSection={<X size={16} />}
                              disabled={resolvingOnlineId === a.id}
                              onClick={() => { setRejectTargetId(a.id); setRejectModalOpen(true); }}
                            >
                              Recusar
                            </Button>
                          </Group>
                        </Box>
                      </Paper>
                    ))}
                </Box>
              )}
              </Box>
            </Box>
          </Tabs.Panel>
        </Tabs>

        <Modal
          opened={rejectModalOpen}
          onClose={() => { setRejectModalOpen(false); setRejectTargetId(null); setRejectReason(''); }}
          title="Recusar agendamento"
          className="agendamento-online-reject-modal"
          centered
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">Informe o motivo da recusa (opcional). O paciente não será notificado automaticamente.</Text>
            <Textarea
              label="Motivo"
              placeholder="Ex: horário indisponível, profissional de folga..."
              value={rejectReason}
              onChange={(e) => { const v = e.currentTarget.value; setRejectReason(v); }}
              rows={3}
            />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => { setRejectModalOpen(false); setRejectTargetId(null); setRejectReason(''); }}>
                Cancelar
              </Button>
              <Button color="red" loading={resolvingOnlineId === rejectTargetId} onClick={handleRejectOnline}>
                Confirmar recusa
              </Button>
            </Group>
          </Stack>
        </Modal>

      </Box>
      <Modal
        opened={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Detalhes do agendamento"
        className="agendamento-detail-modal"
        centered
        size={isMobile ?'100%' : 'xl'}
      >
        {detailAppointment ?(
          <Stack className="agendamento-detail-content" gap="lg">
            <Box className="agendamento-detail-summary">
              <Box className="agendamento-detail-summary__copy">
                <Text className="agendamento-detail-eyebrow">ATENDIMENTO AGENDADO</Text>
                <Text className="agendamento-detail-summary__patient">
                  {detailAppointment.pacienteNome || 'Paciente não informado'}
                </Text>
                <Group className="agendamento-detail-summary__meta" gap="sm" wrap="wrap">
                  <Group gap="xs">
                    <Calendar size={15} aria-hidden="true" />
                    <Text>{detailAppointment.data ?dayjs(detailAppointment.data).format('DD/MM/YYYY') : 'Data não informada'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Clock3 size={15} aria-hidden="true" />
                    <Text>{detailAppointment.hora || 'Horário não informado'}</Text>
                  </Group>
                </Group>
              </Box>
              <Badge className="agendamento-detail-summary__status" variant="light" color={getAppointmentStatusBadgeColor(detailAppointment.status)}>
                {getAppointmentStatusLabel(detailAppointment.status)}
              </Badge>
            </Box>
            <SimpleGrid className="agendamento-detail-fields" cols={isMobile ? 1 : 2} spacing="md">
              {[
                { label: 'CPF', value: detailAppointment.pacienteCPF ?formatCPF(detailAppointment.pacienteCPF) : 'Não informado' },
                { label: 'Procedimento', value: detailAppointment.especialidade || 'Não informado' },
                { label: 'Convênio', value: detailAppointment.convenio || 'Não informado' },
                { label: 'Profissional', value: detailAppointment.medicoNome || 'Não informado' },
                { label: 'Modalidade', value: detailAppointment.modalidadeAtendimento || 'Presencial' },
              ].map((item) => (
                <Box
                  key={item.label}
                  className="agendamento-detail-field"
                >
                  <Text className="agendamento-detail-field__label">{item.label}</Text>
                  <Text className="agendamento-detail-field__value">{item.value}</Text>
                </Box>
              ))}
            </SimpleGrid>
            <Box className="agendamento-detail-section">
              <Box className="agendamento-detail-section__heading">
                <Text className="agendamento-detail-section__title">Observações</Text>
                <Text className="agendamento-detail-section__description">Informações adicionais deste atendimento.</Text>
              </Box>
              <Text className="agendamento-detail-section__text">
                {detailAppointment.observacoes || 'Sem observações registradas.'}
              </Text>
            </Box>
            <Box className="agendamento-detail-section agendamento-detail-attachments">
              <Box className="agendamento-detail-section__heading">
                <Group gap="xs">
                  <Paperclip size={16} aria-hidden="true" />
                  <Text className="agendamento-detail-section__title">Anexos</Text>
                </Group>
                <Text className="agendamento-detail-section__description">Documentos enviados para este agendamento.</Text>
              </Box>
                {detailAttachmentsLoading ?(
                  <Text className="agendamento-detail-section__empty">Carregando anexos...</Text>
                ) : detailAttachments.length > 0 ?(
                  <Stack className="agendamento-detail-attachments__list" gap="xs">
                    {detailAttachments.map((attachment) => (
                    <Box
                      key={attachment.id}
                      className="agendamento-detail-attachment"
                    >
                      <Group justify="space-between" align="center" wrap={isMobile ?'wrap' : 'nowrap'}>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text className="agendamento-detail-attachment__name">{attachment.fileName}</Text>
                          <Text className="agendamento-detail-attachment__date">
                            {attachment.uploadedAt ?dayjs(attachment.uploadedAt).format('DD/MM/YYYY HH:mm') : 'Anexo enviado'}
                          </Text>
                        </Box>
                        <Button
                          variant="light"
                          size="xs"
                          loading={openingAttachmentId === attachment.id}
                          onClick={() => handleOpenExistingAttachment(attachment.id)}
                        >
                          Abrir
                        </Button>
                      </Group>
                    </Box>
                    ))}
                  </Stack>
                ) : (
                  <Text className="agendamento-detail-section__empty">Nenhum anexo enviado para este agendamento.</Text>
                )}
            </Box>
            <Box className="agendamento-detail-footer">
              <Button variant="default" onClick={() => setDetailOpen(false)}>
                Fechar
              </Button>
              <Button onClick={handleEditFromDetail}>
                Editar agendamento
              </Button>
            </Box>
          </Stack>
        ) : null}
      </Modal>
    </Box>
  );
}
