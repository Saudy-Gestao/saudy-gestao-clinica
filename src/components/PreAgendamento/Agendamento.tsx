import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
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
import appointmentAttachmentService from '../../services/appointmentAttachmentService';
import type { AppointmentAttachment } from '../../services/appointmentAttachmentService';
import { formatCPF } from '../../utils/formatters';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { usePatientsAdminQuery } from '../../hooks/usePatientsAdminQuery';
import { useInsurancesAdminQuery } from '../../hooks/useInsurancesAdminQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useRoomsAdminQuery } from '../../hooks/useRoomsAdminQuery';
import { useMedicalEquipmentsQuery } from '../../hooks/useMedicalEquipmentsQuery';
import { isRoomSector } from '../../utils/sectorClassification';
import { queryKeys } from '../../lib/queryKeys';
interface Agendamento {
  id: string;
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
  convenioNumber: string;
  convenioValidUntil: string;
  convenioStatus: string;
  data: Date | null;
  hora: string;
  profissional: string;
  roomId: string;
  medicalEquipmentId: string;
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
  roomIds: string[];
  workingDays: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  specialties: string[];
}
interface ProcedureMeta {
  id?: string;
  name: string;
  appointmentType: 'CONSULTA' | 'EXAME';
  durationMinutes?: number | null;
  doctorIds: string[];
  doctorNames: string[];
  acceptsInsurance: boolean;
  acceptedInsurances: string[];
}
interface RoomScheduleMeta {
  id: string;
  name: string;
  workingDays: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
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
}
const INITIAL_NOVO_AGENDAMENTO: NovoAgendamento = {
  pacienteId: '',
  pacienteNome: '',
  pacienteCPF: '',
  especialidade: '',
  convenio: 'Particular',
  convenioNumber: '',
  convenioValidUntil: '',
  convenioStatus: 'Particular',
  data: null,
  hora: '',
  profissional: '',
  roomId: '',
  medicalEquipmentId: '',
  tipoConsulta: 'CONSULTA',
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
const buildRoomSlots = (
  room: RoomScheduleMeta | undefined,
  period: 'Manhã' | 'Tarde' | 'Noite',
  date: Date,
): string[] => {
  if (!room?.workingHoursStart || !room?.workingHoursEnd) {
    return TIME_SLOTS[period];
  }
  const normalizedDays = (room.workingDays || []).map(normalizeWeekdayLabel);
  const currentWeekday = getBranchWeekdayLabel(date);
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
  const appointmentsQuery = useAppointmentsQuery();
  const patientsQuery = usePatientsAdminQuery();
  const insurancesQuery = useInsurancesAdminQuery();
  const doctorsQuery = useDoctorsAdminQuery();
  const proceduresCatalogQuery = useProceduresAdminQuery();
  const roomsQuery = useRoomsAdminQuery();
  const medicalEquipmentsQuery = useMedicalEquipmentsQuery();
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
  }, [selectedSpecialties]);
  const mapApiToAgendamento = (it: any): Agendamento => ({
    id: String(it.id),
    rescheduledFromAppointmentId: it.rescheduledFromAppointmentId || it.rescheduled_from_appointment_id || undefined,
    patientId: it.patientId || it.patient_id || it.patient?.id || undefined,
    pacienteNome: it.patientName || it.patient_name || it.patient?.name || it.pacienteNome || '',
    pacienteCPF: it.patientCpf || it.patient_cpf || it.patient?.cpf || it.pacienteCPF || '',
    medicoNome: it.doctorName || it.doctor_name || it.doctor?.name || it.medicoNome || '',
    roomId: String(it.roomId || it.room_id || '').trim() || undefined,
    medicalEquipmentId: String(it.medicalEquipmentId || it.medical_equipment_id || '').trim() || undefined,
    especialidade: it.specialty || it.procedure || it.procedureName || it.procedimento || it.especialidade || '',
    convenio: it.convenio || it.insurance || it.healthInsuranceName || '',
    convenioNumber: it.convenioNumber || it.convenio_number || it.healthInsuranceNumber || it.insuranceCardNumber || '',
    convenioValidUntil: it.convenioValidUntil || it.convenio_valid_until || it.healthInsuranceExpiry || it.healthInsuranceValidity || '',
    convenioStatus: it.convenioStatus || it.convenio_status || '',
    data: normalizeDateOnly(it.date || it.data || ''),
    hora: it.time || it.hora || '',
    tipoConsulta: it.type || it.tipoConsulta || 'CONSULTA',
    status: normalizeAppointmentStatus(it.status),
    observacoes: it.observations || it.observacoes || '',
    totem: it.totem ?? undefined,
    durationMinutes: Number.isFinite(Number(it.durationMinutes)) ?Number(it.durationMinutes) : null,
  });
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
    const list = Array.isArray(appointmentsQuery.data) ?appointmentsQuery.data : [];
    setAgendamentos(
      sortAgendamentosByDateTime(
        list
          .map(mapApiToAgendamento)
          .filter((item) => !isTeaReturnAppointment(item.tipoConsulta)),
      ),
    );
  }, [appointmentsQuery.data]);
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
        : (Array.isArray(data?.data?.items)
          ?data.data.items
          : (Array.isArray(data?.data)
            ?data.data
            : [])));
    const options = list
      .filter((it: any) => it?.isActive !== false)
      .map((it: any) => {
        const name = (it.name || it.nome || '').toString().trim();
        return name ?{ value: name, label: name } : null;
      })
      .filter(Boolean) as { value: string; label: string }[];
    const mergedOptions = [
      { value: PARTICULAR_INSURANCE_LABEL, label: PARTICULAR_INSURANCE_LABEL },
      ...options.filter((item, index, arr) => arr.findIndex((current) => current.value === item.value) === index),
    ];
    setInsuranceOptions(mergedOptions);
  }, [insurancesQuery.data]);
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
    const metaByName = list.reduce<Record<string, DoctorScheduleMeta>>((acc, doctor: any) => {
      const name = (doctor.name || doctor.nome || doctor.fullName || '').toString().trim();
      if (!name) return acc;
      acc[name] = {
        id: String(doctor.id ?? doctor.doctorId ?? '').trim() || undefined,
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
      };
      return acc;
    }, {});
    setDoctorOptions(options);
    setDoctorMetaByName(metaByName);
  }, [doctorsQuery.data]);
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
        acceptsInsurance: Boolean(item.acceptsInsurance),
        acceptedInsurances: Array.isArray(item.acceptedInsurances)
          ?item.acceptedInsurances.map((insurance: any) => String(insurance || '').trim()).filter(Boolean)
          : [],
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
  const getInsuranceIncompatibleProcedures = (insuranceName: string, procedureNames: string[]): string[] => {
    if (isParticularInsurance(insuranceName)) return [];
    const normalizedInsurance = normalizeComparableText(insuranceName);
    return procedureNames.filter((procedureName) => {
      const meta = procedureMetaByName[procedureName];
      if (!meta) return false;
      if (!meta.acceptsInsurance) return true;
      const acceptedInsurances = (meta.acceptedInsurances || []).map(normalizeComparableText);
      if (acceptedInsurances.length === 0) return true;
      return !acceptedInsurances.includes(normalizedInsurance);
    });
  };
  const handleProcedureSelectionChange = (values: string[]) => {
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
  const handleEditAgendamento = (agendamento: Agendamento) => {
    const appointmentDate = agendamento.data ?new Date(`${agendamento.data}T00:00:00`) : null;
    setNovoAgendamento({
      pacienteId: agendamento.patientId || '',
      pacienteNome: agendamento.pacienteNome || '',
      pacienteCPF: agendamento.pacienteCPF || '',
      especialidade: agendamento.especialidade,
      convenio: agendamento.convenio,
      convenioNumber: agendamento.convenioNumber || '',
      convenioValidUntil: agendamento.convenioValidUntil || '',
      convenioStatus: agendamento.convenioStatus || (isParticularInsurance(agendamento.convenio) ?PARTICULAR_STATUS_LABEL : 'Ativo'),
      data: appointmentDate,
      hora: agendamento.hora,
      profissional: agendamento.medicoNome,
      roomId: agendamento.roomId || '',
      medicalEquipmentId: agendamento.medicalEquipmentId || '',
      tipoConsulta: agendamento.tipoConsulta,
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
    setNovoAgendamento({
      pacienteId: agendamento.patientId || '',
      pacienteNome: agendamento.pacienteNome || '',
      pacienteCPF: agendamento.pacienteCPF || '',
      especialidade: agendamento.especialidade,
      convenio: agendamento.convenio,
      convenioNumber: agendamento.convenioNumber || '',
      convenioValidUntil: agendamento.convenioValidUntil || '',
      convenioStatus: agendamento.convenioStatus || (isParticularInsurance(agendamento.convenio) ?PARTICULAR_STATUS_LABEL : 'Ativo'),
      data: appointmentDate,
      hora: agendamento.hora,
      profissional: agendamento.medicoNome,
      roomId: agendamento.roomId || '',
      medicalEquipmentId: agendamento.medicalEquipmentId || '',
      tipoConsulta: agendamento.tipoConsulta,
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
          patientId: resolvedPatient.patientId || undefined,
          patientName: resolvedPatient.patientName || undefined,
          patientCpf: resolvedPatient.patientCpf || undefined,
          doctorName: novoAgendamento.profissional || undefined,
          roomId: isExamAppointment ?(novoAgendamento.roomId || undefined) : undefined,
          medicalEquipmentId: isExamAppointment ?(novoAgendamento.medicalEquipmentId || undefined) : undefined,
          specialty: selectedSpecialties.join(', '),
          durationMinutes: selectedProcedureDuration,
          convenio: resolvedInsuranceName,
          convenioNumber: novoAgendamento.convenioNumber || undefined,
          convenioValidUntil: novoAgendamento.convenioValidUntil || undefined,
          convenioStatus: novoAgendamento.convenioStatus || undefined,
          insurance: resolvedInsuranceName,
          healthInsuranceName: resolvedInsuranceName,
          date: formatDateForApi(novoAgendamento.data),
          time: novoAgendamento.hora,
          type: resolvedAppointmentType,
          observations: novoAgendamento.informacoes || undefined,
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
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao atualizar agendamento',
          color: 'red',
        });
        return;
      }
    } else {
      try {
        const createdAppointmentIds: string[] = [];
        if (isMultiProcedureFlow && hasSelectedSuggestedSchedules) {
          for (const suggestion of selectedSuggestedSchedules) {
            const suggestionType = deriveAppointmentType([suggestion.procedure], novoAgendamento.tipoConsulta);
            const suggestionResource = suggestionType === 'EXAME'
              ?findExamResourceForSlot({
                  doctorName: suggestion.doctorName,
                  procedureName: suggestion.procedure,
                  date: suggestion.date,
                  time: suggestion.time,
                  durationMinutes: suggestion.durationMinutes,
                })
              : null;
            if (suggestionType === 'EXAME' && !suggestionResource) {
              throw new Error(`EXAM_RESOURCE_NOT_AVAILABLE::${suggestion.procedure}`);
            }
            const created = await appointmentService.create({
              patientId: resolvedPatient.patientId || undefined,
              patientName: resolvedPatient.patientName || undefined,
              patientCpf: resolvedPatient.patientCpf || undefined,
              doctorName: suggestion.doctorName,
              roomId: suggestionResource?.roomId || undefined,
              medicalEquipmentId: suggestionResource?.medicalEquipmentId || undefined,
              specialty: suggestion.procedure,
              durationMinutes: suggestion.durationMinutes,
              convenio: resolvedInsuranceName,
              convenioNumber: novoAgendamento.convenioNumber || undefined,
              convenioValidUntil: novoAgendamento.convenioValidUntil || undefined,
              convenioStatus: novoAgendamento.convenioStatus || undefined,
              insurance: resolvedInsuranceName,
              healthInsuranceName: resolvedInsuranceName,
              date: formatDateForApi(suggestion.date),
              time: suggestion.time,
              type: suggestionType,
              observations: novoAgendamento.informacoes || undefined,
              status: 'AGENDADO',
              totem: Math.floor(Math.random() * 100) + 1,
              rescheduledFromAppointmentId: rescheduleSourceId || undefined,
            });
            if (created?.id) createdAppointmentIds.push(String(created.id));
          }
        } else {
          const created = await appointmentService.create({
            patientId: resolvedPatient.patientId || undefined,
            patientName: resolvedPatient.patientName || undefined,
            patientCpf: resolvedPatient.patientCpf || undefined,
            doctorName: novoAgendamento.profissional || undefined,
            roomId: isExamAppointment ?(novoAgendamento.roomId || undefined) : undefined,
            medicalEquipmentId: isExamAppointment ?(novoAgendamento.medicalEquipmentId || undefined) : undefined,
            specialty: selectedSpecialties.join(', '),
            durationMinutes: selectedProcedureDuration,
            convenio: resolvedInsuranceName,
            convenioNumber: novoAgendamento.convenioNumber || undefined,
            convenioValidUntil: novoAgendamento.convenioValidUntil || undefined,
            convenioStatus: novoAgendamento.convenioStatus || undefined,
            insurance: resolvedInsuranceName,
            healthInsuranceName: resolvedInsuranceName,
            date: formatDateForApi(novoAgendamento.data),
            time: novoAgendamento.hora,
            type: resolvedAppointmentType,
            observations: novoAgendamento.informacoes || undefined,
            status: 'AGENDADO',
            totem: Math.floor(Math.random() * 100) + 1,
            rescheduledFromAppointmentId: rescheduleSourceId || undefined,
          });
          if (created?.id) createdAppointmentIds.push(String(created.id));
        }
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
          message: isMultiProcedureFlow
            ?`${selectedSuggestedSchedules.length} agendamentos criados${reviewAttachments.length > 0 ?' com anexos' : ''} com sucesso.`
            : `Agendamento realizado${reviewAttachments.length > 0 ?' com anexos' : ''} com sucesso.`,
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
      <Box onClick={() => handleOpenAppointmentDetail(agendamento)} style={{ borderLeft: !isMobile ?'1px solid var(--mantine-color-default-border)' : 'none', paddingLeft: !isMobile ?16 : 0, flex: 1, cursor: 'pointer' }}>
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
          minWidth: isMobile ?180 : 320,
          paddingRight: isMobile ?12 : 20,
        }}
      >
        <Box style={{ minWidth: isMobile ?170 : 190 }}>
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
        <Button size="xs" variant="subtle" onClick={() => handleEditAgendamento(agendamento)}>
          Editar
        </Button>
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
    setIsManualPatientFlow(false);
    setPendingPatient(INITIAL_PENDING_PATIENT);
    setNovoAgendamento({
      pacienteId: appt.patientId || '',
      pacienteNome: appt.patientName || '',
      pacienteCPF: appt.patientCpf || '',
      especialidade: specialty,
      convenio: appt.convenio || '',
      convenioNumber: appt.convenioNumber || '',
      convenioValidUntil: appt.convenioValidUntil || '',
      convenioStatus: appt.convenioStatus || '',
      data: appt.date ?new Date(`${appt.date}T00:00:00`) : null,
      hora: appt.time || '',
      profissional: appt.doctorName || '',
      roomId: String(appt.roomId || '').trim(),
      medicalEquipmentId: String(appt.medicalEquipmentId || '').trim(),
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
  const examProcedureIds = selectedSpecialties
    .filter((name) => normalizeProcedureAppointmentType(procedureMetaByName[name]?.appointmentType) === 'EXAME')
    .map((name) => String(procedureMetaByName[name]?.id || '').trim())
    .filter(Boolean);
  const selectedDoctorRoomIds = Array.from(new Set(
    (doctorMetaByName[novoAgendamento.profissional]?.roomIds || [])
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  ));
  const roomsList = (Array.isArray(roomsQuery.data) ?roomsQuery.data : []).filter((item: any) => isRoomSector(item));
  const roomLabelById = roomsList.reduce<Record<string, string>>((acc, room: any) => {
    const id = String(room?.id || '').trim();
    if (!id) return acc;
    const name = String(room?.name || room?.nome || `Sala ${id}`).trim();
    acc[id] = name || `Sala ${id}`;
    return acc;
  }, {});
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
    if (novoAgendamento.profissional && selectedDoctorRoomIds.length > 0 && !selectedDoctorRoomIds.includes(roomId)) return false;
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
        ...filteredDoctorOptions.map((item) => item.value),
      ]));
    }
    return filteredDoctorOptions.map((item) => item.value);
  })();
  const getAppointmentsForDate = (date: Date) => agendamentos.filter(
    (item) => item.data === dayjs(date).format('YYYY-MM-DD') && item.status !== 'CANCELADO',
  );
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
  const hasSelectedSuggestedSchedules = isMultiProcedureFlow && selectedSuggestedSchedules.length === selectedProcedureSummary.length;
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
      (isMultiProcedureFlow && hasSelectedSuggestedSchedules)
      || (!isMultiProcedureFlow && hasManualScheduleSelection)
    ) &&
    (
      !isExamAppointment
      || isMultiProcedureFlow
      || (novoAgendamento.roomId && novoAgendamento.medicalEquipmentId)
    ) &&
    (!isManualPatientFlow || pendingPatientReadyForCreation),
  );
  
  const safeSchedulerDoctors = Array.isArray(schedulerDoctors) ?schedulerDoctors : [];
  const doctorSlotsByName = safeSchedulerDoctors.reduce<Record<string, string[]>>((acc, doctorName) => {
    acc[doctorName] = isExamAppointment
      ?buildRoomSlots(roomScheduleById[doctorName], activeSchedulePeriod, schedulingDate)
      : buildDoctorSlots(doctorMetaByName[doctorName], activeSchedulePeriod, schedulingDate);
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
    const period = resolveTurnoFromTime(slot) || activeSchedulePeriod;
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
      : safeSchedulerDoctors.filter((candidateDoctor) => (doctorSlotsByName[candidateDoctor] || []).includes(time));
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
  const getProfessionalOptionsForSlot = (time: string, date: Date, procedureName?: string): typeof flattenedScheduleSlots => {
    if (isExamAppointment) return [];
    const normalizedProcedure = String(procedureName || '').trim();
    const candidateDoctors = novoAgendamento.profissional
      ?[novoAgendamento.profissional]
      : normalizedProcedure
        ?getCompatibleDoctorsForProcedure(normalizedProcedure)
        : filteredDoctorOptions.map((option) => option.value);
    return Array.from(new Set(candidateDoctors))
      .filter(Boolean)
      .filter((doctor) => {
        const doctorSlots = buildDoctorSlots(doctorMetaByName[doctor], activeSchedulePeriod, date);
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
      const doctorSlots = buildDoctorSlots(doctorMetaByName[doctor], activeSchedulePeriod, date);
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
      profissional: doctorName,
      hora: time,
      data: date,
    }));
  };
  const handleSelectAnchorSlot = (doctorName: string, time: string, date: Date) => {
    if (isExamAppointment) {
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
  const handleSelectGridSlot = (slot: { doctor?: string; slot: string; availableDoctorsForSlot?: string[] }, date: Date) => {
    if (isExamAppointment) {
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
      setPendingProfessionalSlot({ date, time: slot.slot, procedure: '' });
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
      setPendingProfessionalSlot({ date, time: slot.slot, procedure: selectableProcedures[0] });
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
    const stillAvailable = filteredDoctorOptions.some((option) => option.value === novoAgendamento.profissional);
    if (!stillAvailable) {
      setNovoAgendamento((prev) => ({
        ...prev,
        profissional: '',
        hora: '',
      }));
    }
  }, [filteredDoctorOptions, novoAgendamento.profissional, isExamAppointment]);
  useEffect(() => {
    setSuggestedOptions([]);
    setSelectedSuggestedOptionId(null);
  }, [selectedSpecialties, novoAgendamento.profissional, viewedDate, selectedPatientId, novoAgendamento.convenio]);
  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p={isMobile ?'sm' : isTablet ?'md' : 'xl'} maw={isMobile ?'100%' : 1400} mx="auto">
        {/* Breadcrumb/Back Button */}
        <Group mb={isMobile ?20 : 30}>
          <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ?'md' : 'lg'} c="var(--mantine-color-text)">
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
            p={isMobile ?'md' : 'lg'}
            radius="md"
            withBorder
            bg={isDarkMode ?'var(--mantine-color-body)' : 'var(--mantine-color-default)'}
            style={{ borderColor: 'var(--mantine-color-default-border)' }}
            mb={isMobile ?20 : 28}
          >
            <Stack
              gap="xl"
              style={{
                position: 'relative',
                paddingLeft: isMobile ?22 : 30,
                paddingRight: isMobile ?4 : 8,
              }}
            >
	              <Group justify="space-between" align="center" wrap="wrap" style={{ position: 'relative', zIndex: 1, marginLeft: isMobile ?-8 : -10 }}>
	                <Group gap="xs">
	                  <Badge circle color="blue" variant="filled" size="lg">1</Badge>
	                  <Box>
	                    <Text fw={700} size="lg">Dados cadastrais</Text>
	                    <Text size="sm" c="dimmed">Dados do paciente</Text>
	                  </Box>
	                </Group>
	
                  <Group gap="sm" justify="flex-end">
                    {isManualPatientFlow ?(
                      <>
                        <Badge variant="light" color="blue" size="lg">
                          Novo paciente em cadastro
                        </Badge>
                        <Button
                          variant="default"
                          onClick={handleDisableManualPatientFlow}
                        >
                          Voltar para paciente cadastrado
                        </Button>
                      </>
                    ) : (
		                  <Button
		                    bg={DARK_BLUE}
		                    leftSection={<Plus size={14} />}
		                    onClick={handleEnableManualPatientFlow}
		                  >
		                    Novo paciente
		                  </Button>
                    )}
                  </Group>
	              </Group>
              <Box
                ml={isMobile ?6 : 4}
                h={26}
                style={{ borderLeft: '1px solid rgba(120, 158, 230, 0.45)' }}
              />
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <FloatingSelect
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
                <Stack gap="md">
                  <FloatingInput
                    label="Paciente novo"
                    placeholder="Digite o nome do paciente"
                    value={pendingPatient.name}
                    onChange={(e) => handlePendingPatientField('name', e.currentTarget.value)}
                  />
                  <Paper
                    p="md"
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
                      <Box>
                        <Text fw={700}>Completar cadastro do paciente</Text>
                        <Text size="sm" c="dimmed">
                          Preencha os dados mínimos para concluir o cadastro desse novo paciente.
                        </Text>
                      </Box>
                      <Group justify="flex-end">
                        <Button variant="subtle" color="gray" onClick={handleDisableManualPatientFlow}>
                          Cancelar novo paciente
                        </Button>
                      </Group>
                      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                        <FloatingDateInput
                          label="Data de nascimento"
                          placeholder="Selecione"
                          value={pendingPatient.birthDate}
                          onChange={(value) => handlePendingPatientField('birthDate', value ?new Date(value) : null)}
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
                    </Stack>
                  </Paper>
                </Stack>
              )}
              <Text fw={600} size="md">Dados do convênio</Text>
              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
                <FloatingSelect
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
                <FloatingInput
                  label="Número da carteirinha"
                  value={insuranceCardNumberValue}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, convenioNumber: e.currentTarget.value })}
                />
                <FloatingInput
                  label="Data de validade"
                  value={insuranceValidityValue}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, convenioValidUntil: e.currentTarget.value })}
                />
                <FloatingInput
                  label="Status"
                  value={insuranceStatusValue}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, convenioStatus: e.currentTarget.value })}
                />
              </SimpleGrid>
              <Text fw={600} size="md">Dados do agendamento</Text>
              <SimpleGrid cols={{ base: 1, md: isExamAppointment ?2 : 3, lg: isExamAppointment ?5 : 3 }} spacing="md">
                <FloatingMultiSelect
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
                <FloatingDateInput
                  label="Data da marcação"
                  placeholder="Selecione a data"
                  value={novoAgendamento.data}
                  onChange={(value) => {
                    const rawDate = value ?new Date(value) : null;
                    const nextDate = rawDate
                      ?(isPastCalendarDate(rawDate) ?getTodayStart() : rawDate)
                      : null;
                    setNovoAgendamento({ ...novoAgendamento, data: nextDate });
                    setDataHoraFiltro(nextDate);
                    if (nextDate) setViewedDate(nextDate);
                  }}
                  minDate={getTodayStart()}
                  rightSection={<Calendar size={16} />}
                  valueFormat="DD/MM/YYYY"
                  locale="pt-br"
                />
                <FloatingSelect
                  label="Profissional"
                  placeholder={doctorsLoading ?'Carregando médicos...' : 'Selecione se quiser filtrar por um profissional'}
                  data={filteredDoctorOptions}
                  value={novoAgendamento.profissional}
                  onChange={(value) => setNovoAgendamento({ ...novoAgendamento, profissional: value || '' })}
                  searchable
                  clearable
                  disabled={doctorsLoading}
                  nothingFoundMessage="Nenhum médico compatível com o procedimento encontrado"
                />
                {isExamAppointment && (
                  <FloatingSelect
                    label="Sala (exame)"
                    placeholder={!novoAgendamento.profissional
                      ?'Selecione o profissional'
                      : !examProcedureIds.length
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
                  <FloatingSelect
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
              <FloatingTextarea
                label="Observações"
                placeholder="Alguma observação importante para a recepção ou profissional"
                minRows={2}
                value={novoAgendamento.informacoes}
                onChange={(e) => setNovoAgendamento({ ...novoAgendamento, informacoes: e.currentTarget.value })}
              />
              <Group gap="xs">
                {selectedProcedureSummary.length > 0 ?(
                  selectedProcedureSummary.map((item) => (
                    <Badge key={item} variant="light" color="blue" radius="xl" size="lg">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">Nenhum procedimento selecionado ainda.</Text>
                )}
              </Group>
              <Group gap="xs" style={{ position: 'relative', zIndex: 1, marginLeft: isMobile ?-8 : -10 }}>
                <Badge circle color="blue" variant="filled" size="lg">2</Badge>
                <Box>
                  <Text fw={700} size="lg">Horários</Text>
                  <Text size="sm" c="dimmed">Disponibilidade de horários</Text>
                </Box>
              </Group>
              {selectedProcedureSummary.length > 0 ?(
              <>
              <Box
                ml={isMobile ?6 : 4}
                h={26}
                style={{ borderLeft: '1px solid rgba(120, 158, 230, 0.45)' }}
              />
              <Group gap="sm" wrap="wrap">
                <ActionIcon
                  variant="light"
                  onClick={() => goToSchedulingDate(addDays(schedulingDate, -1))}
                  aria-label="Dia anterior"
                  disabled={dayjs(schedulingDate).isSame(dayjs(), 'day') || isPastCalendarDate(schedulingDate)}
                >
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
              {safeSchedulerDoctors.length === 0 ?(
                <Paper
                  p="xl"
                  radius="lg"
                  bg={isDarkMode ?'transparent' : 'rgba(255,255,255,0.02)'}
                  style={{
                    border: isDarkMode ?'1px solid rgba(120, 158, 230, 0.18)' : undefined,
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
                        <Button bg={DARK_BLUE} onClick={handleGenerateSuggestedSchedules} loading={generatingSuggestion}>
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
                  {!schedulingDateHasAvailability && examResourcesSelected && (
                    <Paper
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
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
                    {displayScheduleSlots.map((slotItem) => (
                      <UnstyledButton
                        key={slotItem.key}
                          onClick={() => {
                            if (slotItem.isCoveredBySelectedRange || slotItem.isCoveredBySuggestedRange || slotItem.isCoveredByAnchorRange) return;
                            handleSelectGridSlot(slotItem, schedulingDate);
                          }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${
                            slotItem.isSelected || slotItem.isCoveredBySelectedRange || slotItem.isAnchorStart || slotItem.isCoveredByAnchorRange || slotItem.isSuggestedStart || slotItem.isCoveredBySuggestedRange
                              ?(isDarkMode ?'rgba(66, 180, 255, 0.75)' : 'rgba(16, 99, 212, 0.48)')
                              : (isDarkMode ?'rgba(66, 180, 255, 0.18)' : 'rgba(15, 23, 42, 0.12)')
                          }`,
                          background: slotItem.isSelected || slotItem.isCoveredBySelectedRange
                            ?(isDarkMode ?'rgba(0, 70, 170, 0.45)' : 'rgba(219, 234, 254, 0.95)')
                            : slotItem.isAnchorStart || slotItem.isCoveredByAnchorRange
                              ?(isDarkMode ?'rgba(249, 115, 22, 0.18)' : 'rgba(255, 237, 213, 0.95)')
                            : slotItem.isSuggestedStart || slotItem.isCoveredBySuggestedRange
                              ?(isDarkMode ?'rgba(18, 184, 134, 0.18)' : 'rgba(209, 250, 229, 0.9)')
                            : (isDarkMode ?'rgba(0, 70, 170, 0.30)' : '#ffffff'),
                          cursor: slotItem.isCoveredBySelectedRange || slotItem.isCoveredBySuggestedRange || slotItem.isCoveredByAnchorRange ?'not-allowed' : 'pointer',
                          opacity: slotItem.isCoveredBySelectedRange || slotItem.isCoveredBySuggestedRange || slotItem.isCoveredByAnchorRange ?0.82 : 1,
                          boxShadow: isDarkMode ?'none' : '0 1px 2px rgba(15, 23, 42, 0.04)',
                        }}
                      >
                        <Group justify="space-between" align="center" wrap="nowrap" mb={6}>
                          <Group gap={6}>
                            <Clock3 size={16} />
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
                        <Group gap={6} wrap="nowrap">
                          <User size={14} />
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
                            mt={6}
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
                  <Group justify="flex-end" mt="md">
                    <Button
                      variant="light"
                      color="red"
                      onClick={handleClearSelectedSchedules}
                      disabled={!hasAnySelectedSchedule}
                    >
                      Limpar horários
                    </Button>
                  </Group>
                  <Modal
                    opened={professionalSlotModalOpen}
                    onClose={() => {
                      setProfessionalSlotModalOpen(false);
                      setPendingProfessionalSlot(null);
                    }}
                    title="Selecionar profissional"
                    centered
                    size="md"
                  >
                    <Stack gap="sm">
                      <Text size="sm" c="dimmed">
                        Profissionais com disponibilidade às {pendingProfessionalSlot?.time || '--:--'}.
                      </Text>
                      {(pendingProfessionalSlot
                        ?getProfessionalOptionsForSlot(
                            pendingProfessionalSlot.time,
                            pendingProfessionalSlot.date,
                            pendingProfessionalSlot.procedure,
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
                          {slotItem.doctor}
                        </Button>
                      ))}
                      {pendingProfessionalSlot && getProfessionalOptionsForSlot(
                        pendingProfessionalSlot.time,
                        pendingProfessionalSlot.date,
                        pendingProfessionalSlot.procedure,
                      ).length === 0 && (
                        <Text size="sm" c="dimmed">
                          Nenhum profissional compatível com este procedimento está disponível nesse horário.
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
              <Group gap="xs" style={{ position: 'relative', zIndex: 1, marginLeft: isMobile ?-8 : -10 }}>
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
              <FloatingInput label="Tipo de agendamento" value={getAppointmentTypeLabel(resolvedAppointmentType)} readOnly />
              <FloatingInput label="Data" value={reviewDateValue ?dayjs(reviewDateValue).format('DD/MM/YYYY') : ''} readOnly />
              <FloatingInput label="Horário" value={reviewTimeValue} readOnly />
              <FloatingInput label="Profissional respons." value={reviewProfessionalValue} readOnly />
              {isExamAppointment && (
                <FloatingInput label="Sala" value={roomLabelById[novoAgendamento.roomId] || ''} readOnly />
              )}
              {isExamAppointment && (
                <FloatingInput
                  label="Equipamento"
                  value={eligibleEquipmentOptions.find((item) => item.value === novoAgendamento.medicalEquipmentId)?.label || ''}
                  readOnly
                />
              )}
              </SimpleGrid>
              <Paper
                p="md"
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
                  <Group justify="space-between" align="center">
                    <Box>
                      <Text fw={700}>Documentos do agendamento</Text>
                      <Text size="sm" c="dimmed">
                        Anexe pedido medico, guia, identidade ou outros documentos relevantes.
                      </Text>
                    </Box>
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
                  {isEditing ?'Salvar alterações' : 'Confirmar Marcação'}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Box>
          </Tabs.Panel>
          <Tabs.Panel value="agendados">
        <Box mb="md">
          <Text size={isMobile ?'lg' : 'xl'} fw={700}>Agenda existente</Text>
          <Text size="sm" c="dimmed">
            Aqui a gente consulta, filtra e ajusta os agendamentos já criados.
          </Text>
        </Box>
        {/* Search and Button Section */}
        <Box mb={isMobile ?20 : 30}>
          <Box
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: isMobile
                ?'1fr'
                : 'minmax(210px, 1.1fr) minmax(180px, 0.9fr) minmax(210px, 1.1fr) minmax(180px, 0.9fr)',
              alignItems: 'start',
            }}
          >
            {/* Filtros */}
            <FloatingSelect
              label="Especialidade"
              alwaysFloatLabel
              data={procedureOptions}
              value={especialidade}
              onChange={setEspecialidade}
              searchable
              clearable
              disabled={proceduresLoading}
              nothingFoundMessage="Nenhum procedimento encontrado"
              containerProps={{ style: { width: '100%', minHeight: 64 } }}
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
                <FloatingInput
                  label=" "
                  value={dataHoraFiltro ?dayjs(dataHoraFiltro).format('DD/MM/YYYY') : ''}
                  onClick={() => {
                    const initialDate = dataHoraFiltro || new Date();
                    setTempDateFilter(initialDate);
                    setViewedDate(initialDate);
                    setPickerOpened(true);
                  }}
                  readOnly
                  rightSection={<Calendar size={16} color="var(--mantine-color-dimmed)" style={{ pointerEvents: 'none' }} />}
                  containerProps={{ className: 'agenda-date-filter', style: { width: '100%', minHeight: 64, cursor: 'pointer' } }}
                  style={{ cursor: 'pointer' }}
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
                      selected: tempDateFilter ?dayjs(date).isSame(tempDateFilter, 'day') : false,
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
            <FloatingSelect
              label="Convênio"
              alwaysFloatLabel
              data={insuranceOptions}
              value={convenio}
              onChange={setConvenio}
              searchable
              clearable
              disabled={insurancesLoading}
              nothingFoundMessage="Nenhum convênio encontrado"
              containerProps={{ style: { width: '100%', minHeight: 64 } }}
            />
            <FloatingSelect
              label="Status"
              alwaysFloatLabel
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
              containerProps={{ style: { width: '100%', minHeight: 64 } }}
            />
          </Box>
          {/* Layout switch icons (Lista / Grade / Calendário) */}
          <Group mt={12} mb={8} justify="space-between" align="end" wrap="wrap">
            <Box style={{ flex: 1, minWidth: isMobile ?'100%' : 360 }}>
              <FloatingInput
                label={isMobile ?'Buscar' : 'Buscar por paciente, CPF ou médico'}
                alwaysFloatLabel
                value={searchValue}
                onChange={(e) => setSearchValue(e.currentTarget.value)}
                rightSection={<Search size={16} color="var(--mantine-color-dimmed)" style={{ pointerEvents: 'none' }} />}
                containerProps={{ style: { width: '100%', minHeight: 64 } }}
              />
            </Box>
            <Group gap="xs" style={{ alignSelf: 'center' }}>
              <ActionIcon
                variant={layout === 'list' ?'filled' : 'subtle'}
                color={layout === 'list' ?'darkBlue' : undefined}
                onClick={() => setLayout('list')}
                title="Lista"
              >
                <List size={16} />
              </ActionIcon>
              <ActionIcon
                variant={layout === 'grid' ?'filled' : 'subtle'}
                color={layout === 'grid' ?'darkBlue' : undefined}
                onClick={() => setLayout('grid')}
                title="Grade"
              >
                <LayoutGrid size={16} />
              </ActionIcon>
              <ActionIcon
                variant={layout === 'calendar' ?'filled' : 'subtle'}
                color={layout === 'calendar' ?'darkBlue' : undefined}
                onClick={() => setLayout('calendar')}
                title="Calendário"
              >
                <Calendar size={16} />
              </ActionIcon>
            </Group>
          </Group>
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
              {rows.length > 0 ?rows : <Box p="md"><Text ta="center" c="dimmed">Nenhum agendamento encontrado</Text></Box>}
            </Box>
          )}
          {/* GRID */}
          {layout === 'grid' && (
            <Box p="md">
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {filteredAgendamentos.length > 0 ?filteredAgendamentos.map(a => {
                  const isExpanded = expandedIds.includes(a.id);
                  return (
                    <Box
                      key={a.id}
                      p="md"
                      style={{
                        border: '1px solid var(--mantine-color-default-border)',
                        borderRadius: 12,
                        background: 'var(--mantine-color-body)',
                        minHeight: 188,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Group justify="apart" align="flex-start" mb="xs">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={700} lineClamp={1}>{a.pacienteNome || '—'}</Text>
                          <Text size="xs" c="dimmed" mt={4}>
                            {dayjs(a.data).format('DD/MM/YYYY')} • {a.hora || '—'}
                          </Text>
                        </Box>
                        <Badge variant="light" radius="xl" color={getAppointmentStatusBadgeColor(a.status)}>
                          {getAppointmentStatusLabel(a.status)}
                        </Badge>
                      </Group>
                      <Stack gap={8}>
                        <Box>
                          <Text size="xs" c="dimmed" fw={600}>Procedimento</Text>
                          <Text size="sm" fw={500} lineClamp={1}>{a.especialidade || '—'}</Text>
                        </Box>
                        <Group gap="xs">
                          <Badge variant="dot" color={a.tipoConsulta === 'EXAME' ?'grape' : 'blue'}>
                            {getAppointmentTypeLabel(a.tipoConsulta)}
                          </Badge>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {a.convenio || 'Sem convênio'}
                          </Text>
                        </Group>
                        <Box>
                          <Text size="xs" c="dimmed" fw={600}>Profissional</Text>
                          <Text size="sm" lineClamp={1}>{a.medicoNome || 'Não informado'}</Text>
                        </Box>
                      </Stack>
                      {!isExpanded ?(
                        <Group mt="md" justify="apart">
                          <Button size="xs" variant="light" onClick={() => handleOpenAppointmentDetail(a)}>
                            Detalhes
                          </Button>
                          <Group gap="xs">
                            <Button size="xs" variant="subtle" onClick={() => setExpandedIds(prev => prev.includes(a.id) ?prev.filter(id => id !== a.id) : [...prev, a.id])}>
                              Ver mais
                            </Button>
                            <Button size="xs" variant="subtle" onClick={() => handleEditAgendamento(a)}>
                              Editar
                            </Button>
                          </Group>
                        </Group>
                      ) : (
                        <Box mt="md">
                          <Stack gap={6}>
                            <Text size="sm"><strong>CPF:</strong> {a.pacienteCPF ?formatCPF(a.pacienteCPF) : 'Não informado'}</Text>
                            <Text size="sm"><strong>Resumo:</strong> {getResumoLinha(a)}</Text>
                            {a.observacoes ?(
                              <Text size="sm"><strong>Observações:</strong> {a.observacoes}</Text>
                            ) : null}
                          </Stack>
                          <Group mt="md" justify="apart">
                            <Button size="xs" variant="light" onClick={() => handleOpenAppointmentDetail(a)}>
                              Detalhes
                            </Button>
                            <Group gap="xs">
                              {(a.status === 'NAO_COMPARECEU' || a.status === 'CANCELADO') && (
                                <Button size="xs" variant="outline" onClick={() => handleRescheduleAppointment(a)}>
                                  Reagendar
                                </Button>
                              )}
                              <Button size="xs" variant="subtle" onClick={() => setExpandedIds(prev => prev.filter(id => id !== a.id))}>
                                Ver menos
                              </Button>
                            </Group>
                          </Group>
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
                  <Button size="xs" variant={selectedDay ?'outline' : 'filled'} onClick={() => { setSelectedDay(null); setDataHoraFiltro(new Date()); }}>
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
                            ?`1px solid ${DARK_BLUE}`
                            : isToday
                              ?'1px solid var(--mantine-color-default-border)'
                              : '1px solid transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                        title={d.format('DD/MM/YYYY')}
                      >
                        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Group gap={6} align="center">
                            <Text fw={700} size="sm">{d.date()}</Text>
                            {isToday && (
                              <Badge size="xs" variant={isSelected ?'filled' : 'light'} color={isSelected ?'dark' : 'blue'} radius="xl">
                                Hoje
                              </Badge>
                            )}
                          </Group>
                          {count > 0 && (
                            <Box style={{ width: 8, height: 8, borderRadius: 8, background: isSelected ?DARK_BLUE : DARK_BLUE }} />
                          )}
                        </Box>
                        <Box style={{ marginTop: 6 }}>
                          {count > 0 && (
                            <Stack gap={2}>
                              <Text size="xs" fw={600} c={isSelected ?'var(--mantine-color-text)' : 'dimmed'}>
                                {count} agendamento{count > 1 ?'s' : ''}
                              </Text>
                              {daySummary[0] ?(
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {daySummary[0].count} {daySummary[0].label.toLowerCase()}
                                </Text>
                              ) : null}
                            </Stack>
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
        </Tabs>
      </Box>
      <Modal
        opened={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Detalhes do agendamento"
        centered
        size={isMobile ?'100%' : 'xl'}
        fullScreen={isMobile}
        styles={{
          body: {
            paddingTop: 8,
          },
        }}
      >
        {detailAppointment ?(
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {[
                { label: 'Paciente', value: detailAppointment.pacienteNome || 'Não informado' },
                { label: 'CPF', value: detailAppointment.pacienteCPF ?formatCPF(detailAppointment.pacienteCPF) : 'Não informado' },
                { label: 'Procedimento', value: detailAppointment.especialidade || 'Não informado' },
                { label: 'Convênio', value: detailAppointment.convenio || 'Não informado' },
                { label: 'Data', value: detailAppointment.data ?dayjs(detailAppointment.data).format('DD/MM/YYYY') : 'Não informada' },
                { label: 'Horário', value: detailAppointment.hora || 'Não informado' },
                { label: 'Profissional', value: detailAppointment.medicoNome || 'Não informado' },
                { label: 'Status', value: detailAppointment.status || 'Não informado' },
              ].map((item) => (
                <Paper
                  key={item.label}
                  p="md"
                  radius="md"
                  bg={isDarkMode ?'rgba(120, 158, 230, 0.08)' : 'rgba(0, 31, 84, 0.06)'}
                  style={{
                    border: isDarkMode ?'1px solid rgba(120, 158, 230, 0.18)' : '1px solid rgba(0, 31, 84, 0.10)',
                  }}
                >
                  <Stack gap={4}>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                      {item.label}
                    </Text>
                    <Text fw={600}>
                      {item.value}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
            <Paper
              p="md"
              radius="md"
              bg={isDarkMode ?'rgba(120, 158, 230, 0.08)' : 'rgba(0, 31, 84, 0.06)'}
              style={{
                border: isDarkMode ?'1px solid rgba(120, 158, 230, 0.18)' : '1px solid rgba(0, 31, 84, 0.10)',
              }}
            >
              <Stack gap={6}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Observacoes
                </Text>
                <Text>
                  {detailAppointment.observacoes || 'Sem observacoes registradas.'}
                </Text>
              </Stack>
            </Paper>
            <Paper
              p="md"
              radius="md"
              bg={isDarkMode ?'rgba(120, 158, 230, 0.08)' : 'rgba(0, 31, 84, 0.06)'}
              style={{
                border: isDarkMode ?'1px solid rgba(120, 158, 230, 0.18)' : '1px solid rgba(0, 31, 84, 0.10)',
              }}
            >
              <Stack gap="sm">
                <Text fw={700}>Anexos</Text>
                {detailAttachmentsLoading ?(
                  <Text size="sm" c="dimmed">Carregando anexos...</Text>
                ) : detailAttachments.length > 0 ?(
                  detailAttachments.map((attachment) => (
                    <Paper
                      key={attachment.id}
                      p="sm"
                      radius="md"
                      bg={isDarkMode ?'rgba(255,255,255,0.02)' : 'white'}
                      style={{
                        border: '1px solid rgba(120, 158, 230, 0.18)',
                      }}
                    >
                      <Group justify="space-between" align="center" wrap={isMobile ?'wrap' : 'nowrap'}>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500}>{attachment.fileName}</Text>
                        <Text size="xs" c="dimmed">
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
                    </Paper>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">Nenhum anexo enviado para este agendamento.</Text>
                )}
              </Stack>
            </Paper>
            <Group justify="space-between" wrap="wrap">
              <Button variant="default" onClick={() => setDetailOpen(false)}>
                Fechar
              </Button>
              <Button bg={DARK_BLUE} onClick={handleEditFromDetail}>
                Editar agendamento
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Box>
  );
}
