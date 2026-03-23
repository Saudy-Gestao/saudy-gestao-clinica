import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Select,
  TextInput,
  Stack,
  Badge,
  Loader,
  ActionIcon,
  Divider,
  Modal,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  Calendar,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  RefreshCcw,
  History,
  ClipboardList,
  ListChecks,
  Sparkles,
  Trash2,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF, parseApiDateToLocalDate } from '../../utils/formatters';
import teaPreReservationService from '../../services/teaPreReservationService';
import teaProfileService from '../../services/teaProfileService';
import type { TeaPreReservationStatus } from '../../services/teaPreReservationService';

const STATUS_OPTIONS: Array<{ value: TeaPreReservationStatus; label: string }> = [
  { value: 'PENDING_SCHEDULING', label: 'Pendente de marcação' },
  { value: 'PROPOSED', label: 'Aguardando aprovação' },
  { value: 'RESERVED', label: 'Reservado' },
  { value: 'PENDING_AUTHORIZATION', label: 'Em autorização' },
  { value: 'AUTHORIZED', label: 'Autorizado' },
  { value: 'CONVERTED', label: 'Convertido em agendamento' },
  { value: 'EXPIRED', label: 'Expirado' },
  { value: 'CANCELED', label: 'Cancelado' },
];

const STATUS_LABEL: Record<string, string> = STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {} as Record<string, string>);

const STATUS_COLOR: Record<string, string> = {
  PENDING_SCHEDULING: 'gray',
  PROPOSED: 'violet',
  RESERVED: 'indigo',
  PENDING_AUTHORIZATION: 'yellow',
  AUTHORIZED: 'teal',
  CONVERTED: 'green',
  EXPIRED: 'orange',
  CANCELED: 'red',
};

const FINAL_RESERVATION_STATUSES: TeaPreReservationStatus[] = [
  'CONVERTED',
  'EXPIRED',
  'CANCELED',
];

const WEEKDAY_COLUMNS: Array<{ label: string; offset: number }> = [
  { label: 'Seg', offset: 0 },
  { label: 'Ter', offset: 1 },
  { label: 'Qua', offset: 2 },
  { label: 'Qui', offset: 3 },
  { label: 'Sex', offset: 4 },
  { label: 'Sáb', offset: 5 },
  { label: 'Dom', offset: 6 },
];

const WEEKDAY_PT_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const WEEKDAY_TO_DAY_INDEX: Record<string, number> = {
  DOMINGO: 0,
  SEGUNDA: 1,
  TERCA: 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
  SABADO: 6,
};

const normalizeDateToIso = (value?: string | null) => {
  const parsed = parseApiDateToLocalDate(value);
  if (!parsed) return null;
  return dayjs(parsed).format('YYYY-MM-DD');
};

const buildWeeklySlotSignatures = (slots: Array<{ date: string; time: string }>) => Array.from(new Set(
  (slots || [])
    .filter((slot) => slot?.date && slot?.time)
    .map((slot) => `${dayjs(slot.date).day()}#${String(slot.time).trim()}`),
));

type GroupTherapyContext = {
  pitTherapyId: string;
  procedureName: string;
  professionalName: string;
  weeklyFrequency?: number;
  previousWeeklyFrequency?: number;
  source?: string;
  preferredWeekdays?: string[];
  preferredShift?: string;
  durationMinutes?: number | null;
};

type SuggestionGroupContext = {
  groupKey: string;
  patientName: string;
  patientCpf?: string;
  therapies: GroupTherapyContext[];
};

type ReservationGroup = {
  groupKey: string;
  patientName: string;
  patientCpf?: string;
  pitId?: string;
  reservations: any[];
};

type ManualGridSlot = {
  time: string;
  occupied: boolean;
  selectable: boolean;
};

type ManualGridDay = {
  date: string;
  weekday: string;
  enabled: boolean;
  slots: ManualGridSlot[];
};

type ManualGridResponse = {
  days: ManualGridDay[];
  week?: { startDate: string; endDate: string };
};

type ConversionChecklistItem = {
  key: string;
  label: string;
  valid: boolean;
  message: string;
  procedureName?: string;
};

type TimelineEventItem = {
  id: string;
  eventType: string;
  eventLabel: string;
  actor?: string;
  payload?: any;
  createdAt: string;
};

type BulkStatusActionOption = {
  reservationId: string;
  pitTherapyId: string;
  procedureName: string;
  professionalName: string;
};

type BulkStatusActionState = {
  groupKey: string;
  patientName: string;
  fromStatus: TeaPreReservationStatus;
  toStatus: TeaPreReservationStatus;
  successMessage: string;
  title: string;
  options: BulkStatusActionOption[];
};

const isSlotCoveredBySession = (
  daySlots: ManualGridSlot[],
  anchorTime: string,
  targetTime: string,
  durationMinutes: number,
): boolean => {
  const coveredSlots = getCoveredSlotsForSession(daySlots, anchorTime, durationMinutes);
  return coveredSlots.includes(targetTime);
};

const getCoveredSlotsForSession = (
  daySlots: ManualGridSlot[],
  anchorTime: string,
  durationMinutes: number,
): string[] => {
  const sortedDaySlots = [...(daySlots || [])]
    .filter((item) => Boolean(item?.time))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const startIndex = sortedDaySlots.findIndex((item) => item.time === anchorTime);
  if (startIndex < 0) return [];

  const positiveDiffs: number[] = [];
  for (let i = 0; i < sortedDaySlots.length - 1; i += 1) {
    const diff = timeToMinutes(sortedDaySlots[i + 1].time) - timeToMinutes(sortedDaySlots[i].time);
    if (diff > 0) positiveDiffs.push(diff);
  }
  const baseStep = positiveDiffs.length > 0 ? Math.min(...positiveDiffs) : 30;

  const coveredSlots: string[] = [];
  let coveredMinutes = 0;
  for (let i = startIndex; i < sortedDaySlots.length; i += 1) {
    const candidate = sortedDaySlots[i];
    coveredSlots.push(candidate.time);

    const nextSlot = sortedDaySlots[i + 1];
    const candidateDuration = nextSlot
      ? Math.max(baseStep, timeToMinutes(nextSlot.time) - timeToMinutes(candidate.time))
      : baseStep;
    coveredMinutes += candidateDuration;

    if (coveredMinutes >= durationMinutes) {
      break;
    }
  }

  return coveredSlots;
};

type ManualReservationDecisionState = {
  groupKey: string;
  pitTherapyId: string;
  durationMinutes: number | null;
  sessionAnchors: Array<{ date: string; time: string }>;
  recurrenceWeeks: number;
  hasEditableExistingSeries: boolean;
};

type TherapyColorToken = {
  badgeColor: string;
  borderColor: string;
  backgroundColor: string;
  accentColor: string;
};

const THERAPY_COLOR_TOKENS: TherapyColorToken[] = [
  {
    badgeColor: 'cyan',
    borderColor: 'rgba(34, 211, 238, 0.95)',
    backgroundColor: 'rgba(34, 211, 238, 0.14)',
    accentColor: '#67e8f9',
  },
  {
    badgeColor: 'lime',
    borderColor: 'rgba(132, 204, 22, 0.95)',
    backgroundColor: 'rgba(132, 204, 22, 0.14)',
    accentColor: '#bef264',
  },
  {
    badgeColor: 'yellow',
    borderColor: 'rgba(250, 204, 21, 0.95)',
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    accentColor: '#fde047',
  },
  {
    badgeColor: 'grape',
    borderColor: 'rgba(192, 132, 252, 0.95)',
    backgroundColor: 'rgba(192, 132, 252, 0.14)',
    accentColor: '#d8b4fe',
  },
  {
    badgeColor: 'orange',
    borderColor: 'rgba(251, 146, 60, 0.95)',
    backgroundColor: 'rgba(251, 146, 60, 0.14)',
    accentColor: '#fdba74',
  },
  {
    badgeColor: 'pink',
    borderColor: 'rgba(244, 114, 182, 0.95)',
    backgroundColor: 'rgba(244, 114, 182, 0.14)',
    accentColor: '#f9a8d4',
  },
];

const getReservationProcedureName = (reservation: any) => (
  String(
    reservation?.procedure?.name
    || reservation?.procedureName
    || reservation?.therapyType
    || 'Procedimento não definido',
  )
);

type PitProgressStage =
  | 'PIT_GERADO'
  | 'RESERVADO_PARCIAL'
  | 'RESERVADO_COMPLETO'
  | 'AGUARDANDO_APROVACAO'
  | 'EM_AUTORIZACAO'
  | 'AGENDADO_PARCIAL'
  | 'AGENDADO_COMPLETO';

type PitProgressInfo = {
  stage: PitProgressStage;
  stepIndex: number;
  totalTherapies: number;
  convertedCount: number;
  regressedScheduledCount: number;
  regressionCompletedSessions: number;
  regressionTargetSessions: number;
  pendingCount: number;
  reservedPartialCount: number;
  reservedCompleteCount: number;
  pendingApprovalCount: number;
  pendingApprovalRequestedAt: string | null;
  pendingApprovalDeadlineAt: string | null;
  inAuthorizationCount: number;
  authorizedCount: number;
};

const timeToMinutes = (time: string) => {
  const [hourRaw, minuteRaw] = String(time).split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return (hour * 60) + minute;
};

const getManualSelectionAnchors = (slots: Array<{ date: string; time: string }>, slotStepMinutes: number) => {
  if (!slots.length) return [] as Array<{ date: string; time: string }>;
  const byDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot.time);
    return acc;
  }, {} as Record<string, string[]>);

  const anchors: Array<{ date: string; time: string }> = [];
  Object.entries(byDate).forEach(([date, times]) => {
    const sorted = [...times].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    let prevMinutes: number | null = null;

    sorted.forEach((time) => {
      const current = timeToMinutes(time);
      if (prevMinutes === null || (current - prevMinutes) > slotStepMinutes) {
        anchors.push({ date, time });
      }
      prevMinutes = current;
    });
  });

  return anchors.sort((a, b) => {
    const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
    if (dateDiff !== 0) return dateDiff;
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });
};

const PROGRESS_STEP_LABELS = [
  'PIT gerado',
  'Reservado parcial',
  'Reservado completo',
  'Aguardando aprovação',
  'Em autorização',
  'Agendado parcial',
  'Agendado completo',
];

const PIT_STAGE_BADGE: Record<PitProgressStage, { label: string; color: string }> = {
  PIT_GERADO: { label: 'Pendente de marcação', color: 'gray' },
  RESERVADO_PARCIAL: { label: 'Reservado parcial', color: 'indigo' },
  RESERVADO_COMPLETO: { label: 'Reservado completo', color: 'blue' },
  AGUARDANDO_APROVACAO: { label: 'Aguardando aprovação', color: 'violet' },
  EM_AUTORIZACAO: { label: 'Em autorização', color: 'yellow' },
  AGENDADO_PARCIAL: { label: 'Agendado parcial', color: 'teal' },
  AGENDADO_COMPLETO: { label: 'Agendado completo', color: 'green' },
};

const STATUS_FLOW_ORDER: TeaPreReservationStatus[] = [
  'PENDING_SCHEDULING',
  'RESERVED',
  'PROPOSED',
];

const isAuthorizationManagedStatus = (status?: string) => (
  status === 'PENDING_AUTHORIZATION' || status === 'AUTHORIZED'
);

const getTherapyStatusOptions = (currentStatus?: string): Array<{ value: TeaPreReservationStatus; label: string }> => {
  const current = String(currentStatus || '') as TeaPreReservationStatus;
  if (current === 'CONVERTED' || current === 'EXPIRED' || isAuthorizationManagedStatus(current)) {
    return STATUS_OPTIONS.filter((item) => item.value === current);
  }

  const index = STATUS_FLOW_ORDER.indexOf(current);
  if (index < 0) {
    return STATUS_OPTIONS.filter((item) => (
      item.value === 'PENDING_SCHEDULING'
      || item.value === 'RESERVED'
      || item.value === 'PROPOSED'
      || item.value === 'CANCELED'
    ));
  }

  const allowed = new Set<TeaPreReservationStatus>([
    STATUS_FLOW_ORDER[index],
    ...(STATUS_FLOW_ORDER[index + 1] ? [STATUS_FLOW_ORDER[index + 1]] : []),
    'CANCELED',
  ]);

  return STATUS_OPTIONS.filter((item) => allowed.has(item.value));
};

export function TeaPreReserva() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const lastScrollYRef = useRef<number>(0);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [suggestionsByTherapyId, setSuggestionsByTherapyId] = useState<Record<string, Array<{ date: string; time: string }>>>({});
  const [loadingSuggestionsId, setLoadingSuggestionsId] = useState<string | null>(null);
  const recurringUntilYearEnd = dayjs().endOf('year');
  const recurringUntilDate = recurringUntilYearEnd.format('YYYY-MM-DD');
  const recurringUntilLabel = recurringUntilYearEnd.format('DD/MM/YYYY');

  const getWeeksUntilYearEnd = (baseDate?: string) => {
    const referenceDate = baseDate ? dayjs(baseDate) : dayjs();
    const diffInWeeks = recurringUntilYearEnd.diff(referenceDate, 'week', true);
    return Math.max(1, Math.ceil(diffInWeeks));
  };

  const formatWeekdayPt = (date?: string) => {
    if (!date) return '';
    const index = dayjs(date).day();
    return WEEKDAY_PT_LONG[index] || '';
  };

  const buildRecurringPreviewDates = (sourceDates: string[] = [], count = 5) => {
    const uniqueSortedDates = Array.from(
      new Set(
        sourceDates
          .filter(Boolean)
          .map((date) => dayjs(date).startOf('day').format('YYYY-MM-DD')),
      ),
    ).sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());

    if (!uniqueSortedDates.length) return [] as string[];

    const firstDate = dayjs(uniqueSortedDates[0]).startOf('day');
    const endOfPatternWeek = firstDate.add(6, 'day').endOf('day');
    const patternDates = uniqueSortedDates
      .filter((date) => {
        const current = dayjs(date);
        return current.isSame(firstDate, 'day') || (current.isAfter(firstDate, 'day') && current.isBefore(endOfPatternWeek, 'day'));
      })
      .map((date) => dayjs(date).startOf('day'));

    const basePattern = patternDates.length ? patternDates : [firstDate];
    const today = dayjs().startOf('day');
    const previewDates: string[] = [];
    let weekOffset = 0;

    while (previewDates.length < count) {
      for (const patternDate of basePattern) {
        if (previewDates.length >= count) break;
        const candidate = patternDate.add(weekOffset, 'week');
        if (candidate.isBefore(today, 'day')) continue;
        if (candidate.isAfter(recurringUntilYearEnd, 'day')) continue;
        previewDates.push(candidate.format('YYYY-MM-DD'));
      }

      if (basePattern.every((patternDate) => patternDate.add(weekOffset, 'week').isAfter(recurringUntilYearEnd, 'day'))) {
        break;
      }

      weekOffset += 1;
    }

    return previewDates;
  };

  const resolveTherapySlotsForAcceptance = (therapy: GroupTherapyContext, startDate?: string) => {
    // Corrigido: retorna todos os horários marcados para a terapia, ordenados, sem limitar por semana
    const baseSlots = [...(suggestionsByTherapyId[therapy.pitTherapyId] || [])]
      .sort((a, b) => {
        const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
        if (dateDiff !== 0) return dateDiff;
        return String(a.time).localeCompare(String(b.time));
      });

    if (!baseSlots.length) return [] as Array<{ date: string; time: string }>;

    const effectiveStart = startDate || baseSlots[0]?.date;
    const today = dayjs().startOf('day');
    const resolvedStart = effectiveStart ? dayjs(effectiveStart).startOf('day') : today;
    const start = resolvedStart.isBefore(today, 'day') ? today : resolvedStart;

    // Retorna todos os horários a partir da data de início
    return baseSlots.filter((slot) => !start || !dayjs(slot.date).isBefore(start, 'day'));
  };
  const [suggestionModalOpened, setSuggestionModalOpened] = useState(false);
  // weekOffset removed: we display the single relevant week without navigation
  const [suggestionModalContext, setSuggestionModalContext] = useState<SuggestionGroupContext | null>(null);
  const [rejectDecisionOpened, setRejectDecisionOpened] = useState(false);
  const [acceptSuggestionDecisionOpened, setAcceptSuggestionDecisionOpened] = useState(false);
  const [manualModalOpened, setManualModalOpened] = useState(false);
  const [manualContext, setManualContext] = useState<SuggestionGroupContext | null>(null);
  const [manualWeekStart, setManualWeekStart] = useState<string>(dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
  const [manualSelectedTherapyId, setManualSelectedTherapyId] = useState<string | null>(null);
  const [manualGridByTherapyId, setManualGridByTherapyId] = useState<Record<string, ManualGridResponse>>({});
  const [manualLoadingGrid, setManualLoadingGrid] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualAcceptDecisionOpened, setManualAcceptDecisionOpened] = useState(false);
  const [manualReservationDecisionState, setManualReservationDecisionState] = useState<ManualReservationDecisionState | null>(null);
  const [manualSelectedSlots, setManualSelectedSlots] = useState<Array<{ date: string; time: string }>>([]);
  const [manualEditableExistingSlotsByTherapyId, setManualEditableExistingSlotsByTherapyId] = useState<Record<string, Array<{ date: string; time: string }>>>({});
  const [selectedSuggestionByTherapyId, setSelectedSuggestionByTherapyId] = useState<Record<string, boolean>>({});
  const [triedSlotsByTherapyId, setTriedSlotsByTherapyId] = useState<Record<string, string[]>>({});
  const [weeklyValidationByTherapyId, setWeeklyValidationByTherapyId] = useState<Record<string, {
    valid: boolean;
    missingWeeks: number;
    exceedsWeeks: number;
    missingSlots: number;
    exceedsSlots: number;
  }>>({});
  const [timelineModalOpened, setTimelineModalOpened] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventItem[]>([]);
  const [timelineReservationLabel, setTimelineReservationLabel] = useState('');
  const [checklistModalOpened, setChecklistModalOpened] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ConversionChecklistItem[]>([]);
  const [conversionReservationIds, setConversionReservationIds] = useState<string[]>([]);
  const [checklistGroupKey, setChecklistGroupKey] = useState<string | null>(null);
  const [checklistGroupLabel, setChecklistGroupLabel] = useState<string>('');
  const [checklistGroupReservations, setChecklistGroupReservations] = useState<any[]>([]);
  const [checklistProcedureOptions, setChecklistProcedureOptions] = useState<string[]>([]);
  const [selectedChecklistProcedure, setSelectedChecklistProcedure] = useState<string | null>(null);
  const [acceptModalOpened, setAcceptModalOpened] = useState(false);
  const [acceptModalMode, setAcceptModalMode] = useState<'suggestion' | 'conversion'>('suggestion');
  const [deletePitConfirmModalOpened, setDeletePitConfirmModalOpened] = useState(false);
  const [deletePitTarget, setDeletePitTarget] = useState<{ teaProfileId: string; groupKey: string } | null>(null);
  useEffect(() => {
    if (!acceptModalOpened) {
      setAcceptModalStartDate('');
      setAcceptTherapies([]);
      setAcceptDateByTherapy({});
    }
  }, [acceptModalOpened]);
  // const [acceptModalDates, setAcceptModalDates] = useState<string[]>([]); // no longer needed
  const [acceptModalStartDate, setAcceptModalStartDate] = useState<string>('');
  const [acceptTherapies, setAcceptTherapies] = useState<Array<{therapy: GroupTherapyContext; slots: Array<{date:string;time:string}>}>>([]);
  const [acceptDateByTherapy, setAcceptDateByTherapy] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'pendencias' | 'concluidas'>('pendencias');
  const [collapsedTherapyCards, setCollapsedTherapyCards] = useState<Record<string, boolean>>({});
  const [bulkStatusActionState, setBulkStatusActionState] = useState<BulkStatusActionState | null>(null);
  const [bulkStatusSelectedReservationIds, setBulkStatusSelectedReservationIds] = useState<string[]>([]);

  const toggleTherapyCard = (cardKey: string) => {
    setCollapsedTherapyCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const checklistSelectedProcedureReservations = useMemo(() => {
    if (!selectedChecklistProcedure) return [] as any[];
    return checklistGroupReservations.filter(
      (reservation) => getReservationProcedureName(reservation) === selectedChecklistProcedure,
    );
  }, [checklistGroupReservations, selectedChecklistProcedure]);

  const checklistCanConvertByProcedure = useMemo(() => {
    const byProcedure = new Map<string, boolean>();
    checklistProcedureOptions.forEach((procedure) => {
      const procedureItems = checklistItems.filter(
        (item) => (item.procedureName || 'Procedimento não definido') === procedure,
      );
      byProcedure.set(
        procedure,
        procedureItems.length > 0 && procedureItems.every((item) => item.valid),
      );
    });
    return byProcedure;
  }, [checklistItems, checklistProcedureOptions]);

  const checklistConvertibleSelectedReservations = useMemo(() => {
    if (!selectedChecklistProcedure) return [] as any[];
    return checklistSelectedProcedureReservations.filter((reservation) => {
      const procedure = getReservationProcedureName(reservation);
      return checklistCanConvertByProcedure.get(procedure) === true;
    });
  }, [checklistCanConvertByProcedure, checklistSelectedProcedureReservations, selectedChecklistProcedure]);

  const checklistCanConvertSelectedProcedure = checklistConvertibleSelectedReservations.length > 0;


  const filteredItems = useMemo(() => {
    if (badgeFilter === 'expiring-soon') {
      return items.filter((item) => item.isExpiringSoon && item.status !== 'EXPIRED');
    }
    return items;
  }, [items, badgeFilter]);

  const summary = useMemo(() => {
    const pendingPITs = new Set<string>();
    const statusByGroup = new Map<string, Set<TeaPreReservationStatus>>();
    const expiringSoonPITs = new Set<string>();
    const expiredPITs = new Set<string>();

    filteredItems.forEach((item) => {
      const patientId = String(item?.patient?.id || 'unknown-patient');
      const pitId = String(item?.pitId || item?.preReservationId || 'unknown-pit');
      const groupKey = `${patientId}-${pitId}`;

      if (!item?.preReservationId) {
        pendingPITs.add(groupKey);
        return;
      }

      const statuses = statusByGroup.get(groupKey) ?? new Set<TeaPreReservationStatus>();
      statuses.add(item.status);
      statusByGroup.set(groupKey, statuses);

      if (item.isExpiringSoon && item.status !== 'EXPIRED') {
        expiringSoonPITs.add(groupKey);
      }
      if (item.isExpired || item.status === 'EXPIRED') {
        expiredPITs.add(groupKey);
      }
    });

    let pendingApproval = 0;
    let pendingAuthorization = 0;
    let authorized = 0;
    statusByGroup.forEach((statuses) => {
      if (statuses.has('PROPOSED')) pendingApproval += 1;
      if (statuses.has('PENDING_AUTHORIZATION')) pendingAuthorization += 1;
      if (statuses.has('AUTHORIZED')) authorized += 1;
    });

    return {
      pendingScheduling: pendingPITs.size,
      pendingApproval,
      pendingAuthorization,
      authorized,
      expiringSoon: expiringSoonPITs.size,
      expired: expiredPITs.size,
    };
  }, [filteredItems]);

  const summaryBadgeDefinitions = [
    { key: 'pending-scheduling', label: `Pend. marcação: ${summary.pendingScheduling}`, color: 'gray', status: 'PENDING_SCHEDULING' as TeaPreReservationStatus },
    { key: 'pending-approval', label: `Aguard. aprovação: ${summary.pendingApproval}`, color: 'violet', status: 'PROPOSED' as TeaPreReservationStatus },
    { key: 'pending-authorization', label: `Pend. autorização: ${summary.pendingAuthorization}`, color: 'yellow', status: 'PENDING_AUTHORIZATION' as TeaPreReservationStatus },
    { key: 'authorized', label: `Autorizados: ${summary.authorized}`, color: 'teal', status: 'AUTHORIZED' as TeaPreReservationStatus },
    { key: 'expiring-soon', label: `Vencendo em 48h: ${summary.expiringSoon}`, color: 'orange' },
    { key: 'expired', label: `Expiradas: ${summary.expired}`, color: 'red', status: 'EXPIRED' as TeaPreReservationStatus },
  ];

  const handleBadgeClick = (pillKey: string, status?: TeaPreReservationStatus) => {
    if (badgeFilter === pillKey) {
      setBadgeFilter(null);
      setStatusFilter(null);
      return;
    }

    setBadgeFilter(pillKey);
    if (status) {
      setStatusFilter(status);
      return;
    }

    setStatusFilter(null);
  };

  const pendingGroups = useMemo(() => {
    const map = new Map<string, {
      groupKey: string;
      patientName: string;
      patientCpf?: string;
      therapies: any[];
    }>();

    filteredItems
      .filter((item) => !item?.preReservationId)
      .forEach((item) => {
        const patientId = String(item?.patient?.id || 'unknown-patient');
        const pitId = String(item?.pitId || 'unknown-pit');
        const groupKey = `${patientId}-${pitId}`;

        if (!map.has(groupKey)) {
          map.set(groupKey, {
            groupKey,
            patientName: item?.patient?.name || 'Paciente sem nome',
            patientCpf: item?.patient?.cpf || undefined,
            therapies: [],
          });
        }

        map.get(groupKey)?.therapies.push(item);
      });

    return Array.from(map.values());
  }, [filteredItems]);

  const existingReservationGroups = useMemo<ReservationGroup[]>(() => {
    const map = new Map<string, ReservationGroup>();

    filteredItems
      .filter((item) => !!item?.preReservationId)
      .forEach((item) => {
        const patientId = String(item?.patient?.id || 'unknown-patient');
        const pitId = String(item?.pitId || item?.preReservationId || 'unknown-pit');
        const groupKey = `${patientId}-${pitId}`;

        if (!map.has(groupKey)) {
          map.set(groupKey, {
            groupKey,
            patientName: item?.patient?.name || 'Paciente sem nome',
            patientCpf: item?.patient?.cpf || undefined,
            pitId,
            reservations: [],
          });
        }

        map.get(groupKey)?.reservations.push(item);
      });

    return Array.from(map.values());
  }, [filteredItems]);

  const isGroupCompleted = (group: ReservationGroup) => {
    if (!group.reservations.length) return false;
    return group.reservations.every((item) => {
      const status = item?.status as TeaPreReservationStatus | undefined;
      return Boolean(status && FINAL_RESERVATION_STATUSES.includes(status));
    });
  };

  const actionableExistingReservationGroups = useMemo(
    () => existingReservationGroups.filter((group) => !isGroupCompleted(group)),
    [existingReservationGroups],
  );

  const completedReservationGroups = useMemo(
    () => existingReservationGroups.filter(isGroupCompleted),
    [existingReservationGroups],
  );

  const pendingGroupKeySet = useMemo(
    () => new Set(pendingGroups.map((group) => group.groupKey)),
    [pendingGroups],
  );

  const completedReservationsByGroupKey = useMemo(() => {
    const map = new Map<string, ReservationGroup>();
    completedReservationGroups.forEach((group) => {
      map.set(group.groupKey, group);
    });
    return map;
  }, [completedReservationGroups]);

  const actionableReservationsByGroupKey = useMemo(() => {
    const map = new Map<string, ReservationGroup>();
    actionableExistingReservationGroups.forEach((group) => {
      map.set(group.groupKey, group);
    });
    return map;
  }, [actionableExistingReservationGroups]);

  const actionableExistingReservationGroupsWithoutPending = useMemo(
    () => actionableExistingReservationGroups.filter((group) => !pendingGroupKeySet.has(group.groupKey)),
    [actionableExistingReservationGroups, pendingGroupKeySet],
  );

  const completedReservationGroupsWithoutPending = useMemo(
    () => completedReservationGroups.filter((group) => !pendingGroupKeySet.has(group.groupKey)),
    [completedReservationGroups, pendingGroupKeySet],
  );

  const renderProgressTrail = (progress: PitProgressInfo, keyPrefix: string) => {

    const hasFrequencyRegression = progress.regressedScheduledCount > 0;
    const reservedTotal = progress.reservedPartialCount + progress.reservedCompleteCount;
    const reservedPartialActive = reservedTotal > 0;
    const reservedCompleteActive = progress.reservedCompleteCount >= progress.totalTherapies;
    const inAuthorizationActive = progress.inAuthorizationCount > 0 || progress.authorizedCount > 0 || progress.convertedCount > 0;
    const pendingApprovalActive = progress.pendingApprovalCount > 0 || inAuthorizationActive;
    const scheduledPartialActive = progress.convertedCount > 0 || progress.regressedScheduledCount > 0;
    const scheduledCompleteActive = progress.convertedCount >= progress.totalTherapies;
    const authorizationDone = Math.min(progress.totalTherapies, progress.authorizedCount + progress.convertedCount);
    const authorizationRatio = progress.totalTherapies > 0 ? (authorizationDone / progress.totalTherapies) : 0;
    const authorizationStepIndex = PROGRESS_STEP_LABELS.indexOf('Em autorização');
    const pendingApprovalStepIndex = PROGRESS_STEP_LABELS.indexOf('Aguardando aprovação');
    const stageFilledByStep: boolean[] = PROGRESS_STEP_LABELS.map((_, index) => index <= (progress.stepIndex - 1));
    const pendingRequested = progress.pendingApprovalRequestedAt ? dayjs(progress.pendingApprovalRequestedAt) : null;
    const pendingDeadline = progress.pendingApprovalDeadlineAt ? dayjs(progress.pendingApprovalDeadlineAt) : null;
    const hasLivePendingApproval = progress.pendingApprovalCount > 0;
    const hasDownstreamProgress = inAuthorizationActive || scheduledCompleteActive;
    const shouldCarryPendingApprovalInRegression = hasFrequencyRegression && (
      progress.inAuthorizationCount > 0
      || progress.authorizedCount > 0
      || progress.convertedCount > 0
    );
    const pendingApprovalElapsedRatio = (() => {
      if (hasFrequencyRegression && !hasLivePendingApproval && !shouldCarryPendingApprovalInRegression) return 0;
      // Once PIT advances beyond approval step, keep this stage visibly filled.
      if (hasDownstreamProgress) return 1;
      if (!hasLivePendingApproval) return stageFilledByStep[pendingApprovalStepIndex] ? 1 : 0;
      if (!pendingRequested?.isValid() || !pendingDeadline?.isValid()) return 0.2;
      const totalMs = pendingDeadline.valueOf() - pendingRequested.valueOf();
      if (totalMs <= 0) return 1;
      const remainingMs = pendingDeadline.valueOf() - Date.now();
      const remainingRatio = Math.max(0, Math.min(1, remainingMs / totalMs));
      return 1 - remainingRatio;
    })();
    const pendingApprovalStepCompleted = pendingApprovalElapsedRatio >= 1;
    const authorizationDisplayRatio = (() => {
      if (hasFrequencyRegression) {
        if (progress.authorizedCount > 0 || progress.convertedCount >= progress.totalTherapies) return 1;
        if (progress.regressionTargetSessions > 0) {
          const ratio = progress.regressionCompletedSessions / progress.regressionTargetSessions;
          return Math.max(0.5, Math.min(0.95, ratio));
        }
        return 0.5;
      }
      return stageFilledByStep[authorizationStepIndex] ? 1 : authorizationRatio;
    })();

    const authorizationStepActive = (
      inAuthorizationActive
      || stageFilledByStep[4]
      || (hasFrequencyRegression && progress.regressionTargetSessions > 0 && progress.authorizedCount < progress.totalTherapies)
    );
    const shouldCarryReservedStepsInRegression = hasFrequencyRegression && (
      progress.pendingApprovalCount > 0
      || progress.inAuthorizationCount > 0
      || progress.authorizedCount > 0
      || progress.convertedCount > 0
    );

    const activeByStep: boolean[] = [
      stageFilledByStep[0], // PIT gerado
      hasFrequencyRegression
        ? (reservedPartialActive || (shouldCarryReservedStepsInRegression && stageFilledByStep[1]))
        : (reservedPartialActive || stageFilledByStep[1]),
      hasFrequencyRegression
        ? (reservedCompleteActive || (shouldCarryReservedStepsInRegression && stageFilledByStep[2]))
        : (reservedCompleteActive || stageFilledByStep[2]),
      hasFrequencyRegression
        ? (progress.pendingApprovalCount > 0 || shouldCarryPendingApprovalInRegression)
        : (pendingApprovalActive || stageFilledByStep[3]),
      authorizationStepActive,
      scheduledPartialActive || stageFilledByStep[5],
      scheduledCompleteActive || stageFilledByStep[6],
    ];

    return (
      <Stack gap={4}>
        <Group justify="flex-end" align="center" wrap="wrap">
          <Text size="xs" c="dimmed">
            {progress.convertedCount}/{progress.totalTherapies} terapia(s) agendada(s)
          </Text>
        </Group>

        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${PROGRESS_STEP_LABELS.length}, minmax(0, 1fr))`,
            gap: 6,
          }}
        >
          {PROGRESS_STEP_LABELS.map((label, index) => {
            const active = Boolean(activeByStep[index]);
            const isAuthorizationStep = index === authorizationStepIndex;
            const isPendingApprovalStep = index === pendingApprovalStepIndex;
            return (
              <Box key={`${keyPrefix}-${label}`} style={{ minWidth: 0 }}>
                <Box
                  style={{
                    height: 8,
                    borderRadius: 99,
                    backgroundColor: (isAuthorizationStep || isPendingApprovalStep)
                      ? 'var(--mantine-color-default)'
                      : (active ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-default)'),
                    border: '1px solid var(--mantine-color-default-border)',
                    overflow: 'hidden',
                  }}
                >
                  {isPendingApprovalStep && (
                    <Box
                      style={{
                        width: `${Math.round(Math.max(0, Math.min(1, pendingApprovalElapsedRatio)) * 100)}%`,
                        height: '100%',
                        backgroundColor: pendingApprovalStepCompleted
                          ? 'var(--mantine-color-teal-6)'
                          : hasLivePendingApproval && pendingApprovalElapsedRatio >= 0.9
                            ? 'var(--mantine-color-red-6)'
                            : hasLivePendingApproval && pendingApprovalElapsedRatio >= 0.7
                              ? 'var(--mantine-color-yellow-6)'
                              : 'var(--mantine-color-violet-6)',
                        transition: 'width 180ms ease',
                      }}
                    />
                  )}
                  {isAuthorizationStep && (
                    <Box
                      style={{
                        width: `${Math.round(Math.max(0, Math.min(1, authorizationDisplayRatio)) * 100)}%`,
                        height: '100%',
                        backgroundColor: 'var(--mantine-color-teal-6)',
                        transition: 'width 180ms ease',
                      }}
                    />
                  )}
                </Box>
                <Group justify="space-between" gap={4} mt={4} wrap="nowrap">
                  <Text size="10px" c={active ? 'teal' : 'dimmed'} lineClamp={1}>
                    {label}
                  </Text>
                  {isPendingApprovalStep && pendingRequested?.isValid() && (
                    <Text size="10px" c="dimmed">
                      disparo: {pendingRequested.format('DD/MM HH:mm')}
                    </Text>
                  )}
                  {isAuthorizationStep && inAuthorizationActive && (
                    <Text size="10px" c="dimmed">
                      {authorizationDone}/{progress.totalTherapies}
                    </Text>
                  )}
                </Group>
              </Box>
            );
          })}
        </Box>
      </Stack>
    );
  };

  const buildTherapyProgressFromItem = (item: any): PitProgressInfo => {
    const status = String(item?.status || 'PENDING_SCHEDULING');
    const isFrequencyAdjustedFlow = String(item?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE';
    const weeklyTarget = Math.max(1, Number(item?.preferences?.weeklyFrequency || 1));
    const weeklyReserved = Math.max(0, Number(item?.weeklyReservationCount || 0));
    const regressionCompletedSessions = isFrequencyAdjustedFlow
      ? Math.max(0, Number(item?.previousWeeklyFrequency || 0))
      : 0;
    const regressionTargetSessions = isFrequencyAdjustedFlow
      ? Math.max(1, Number(item?.currentWeeklyFrequency || item?.preferences?.weeklyFrequency || 1))
      : 0;
    const isRegressionPending = (
      isFrequencyAdjustedFlow
      && (
        status === 'PENDING_SCHEDULING'
        || (status === 'RESERVED' && weeklyReserved === 0)
      )
    );
    const reservedComplete = status === 'RESERVED' && weeklyReserved >= weeklyTarget;
    const reservedPartial = status === 'RESERVED' && !reservedComplete && !isRegressionPending;

    let stage: PitProgressStage = 'PIT_GERADO';
    let stepIndex = 1;

    if (status === 'CONVERTED') {
      stage = 'AGENDADO_COMPLETO';
      stepIndex = 7;
    } else if (status === 'PENDING_AUTHORIZATION') {
      stage = 'EM_AUTORIZACAO';
      stepIndex = 5;
    } else if (status === 'AUTHORIZED') {
      stage = 'AGENDADO_PARCIAL';
      stepIndex = 6;
    } else if (status === 'PROPOSED') {
      stage = 'AGUARDANDO_APROVACAO';
      stepIndex = 4;
    } else if (isRegressionPending) {
      stage = 'AGENDADO_PARCIAL';
      stepIndex = 6;
    } else if (reservedComplete) {
      stage = 'RESERVADO_COMPLETO';
      stepIndex = 3;
    } else if (reservedPartial) {
      stage = 'RESERVADO_PARCIAL';
      stepIndex = 2;
    }

    return {
      stage,
      stepIndex,
      totalTherapies: 1,
      convertedCount: status === 'CONVERTED' ? 1 : 0,
      regressedScheduledCount: isFrequencyAdjustedFlow ? 1 : 0,
      regressionCompletedSessions,
      regressionTargetSessions,
      pendingCount: status === 'PENDING_SCHEDULING' ? 1 : 0,
      reservedPartialCount: reservedPartial ? 1 : 0,
      reservedCompleteCount: reservedComplete ? 1 : 0,
      pendingApprovalCount: status === 'PROPOSED' ? 1 : 0,
      pendingApprovalRequestedAt: status === 'PROPOSED'
        ? String(item?.approvalRequestedAt || item?.updatedAt || item?.createdAt || '') || null
        : null,
      pendingApprovalDeadlineAt: status === 'PROPOSED'
        ? String(item?.approvalDeadlineAt || item?.expiresAt || '') || null
        : null,
      inAuthorizationCount: status === 'PENDING_AUTHORIZATION' ? 1 : 0,
      authorizedCount: status === 'AUTHORIZED' ? 1 : 0,
    };
  };

  const buildPitProgressFromItems = (itemsToAggregate: any[]): PitProgressInfo => {
    if (!Array.isArray(itemsToAggregate) || itemsToAggregate.length === 0) {
      return {
        stage: 'PIT_GERADO',
        stepIndex: 1,
        totalTherapies: 0,
        convertedCount: 0,
        regressedScheduledCount: 0,
        regressionCompletedSessions: 0,
        regressionTargetSessions: 0,
        pendingCount: 0,
        reservedPartialCount: 0,
        reservedCompleteCount: 0,
        pendingApprovalCount: 0,
        pendingApprovalRequestedAt: null,
        pendingApprovalDeadlineAt: null,
        inAuthorizationCount: 0,
        authorizedCount: 0,
      };
    }

    const aggregated = itemsToAggregate.reduce((acc, item) => {
      const progress = buildTherapyProgressFromItem(item);
      acc.totalTherapies += 1;
      acc.convertedCount += progress.convertedCount;
      acc.regressedScheduledCount += progress.regressedScheduledCount;
      acc.regressionCompletedSessions += progress.regressionCompletedSessions;
      acc.regressionTargetSessions += progress.regressionTargetSessions;
      acc.pendingCount += progress.pendingCount;
      acc.reservedPartialCount += progress.reservedPartialCount;
      acc.reservedCompleteCount += progress.reservedCompleteCount;
      acc.pendingApprovalCount += progress.pendingApprovalCount;
      acc.inAuthorizationCount += progress.inAuthorizationCount;
      acc.authorizedCount += progress.authorizedCount;

      if (!acc.pendingApprovalRequestedAt && progress.pendingApprovalRequestedAt) {
        acc.pendingApprovalRequestedAt = progress.pendingApprovalRequestedAt;
      }
      if (!acc.pendingApprovalDeadlineAt && progress.pendingApprovalDeadlineAt) {
        acc.pendingApprovalDeadlineAt = progress.pendingApprovalDeadlineAt;
      }

      return acc;
    }, {
      stage: 'PIT_GERADO' as PitProgressStage,
      stepIndex: 1,
      totalTherapies: 0,
      convertedCount: 0,
      regressedScheduledCount: 0,
      regressionCompletedSessions: 0,
      regressionTargetSessions: 0,
      pendingCount: 0,
      reservedPartialCount: 0,
      reservedCompleteCount: 0,
      pendingApprovalCount: 0,
      pendingApprovalRequestedAt: null as string | null,
      pendingApprovalDeadlineAt: null as string | null,
      inAuthorizationCount: 0,
      authorizedCount: 0,
    });

    if (aggregated.convertedCount >= aggregated.totalTherapies && aggregated.totalTherapies > 0) {
      aggregated.stage = 'AGENDADO_COMPLETO';
      aggregated.stepIndex = 7;
    } else if (aggregated.convertedCount > 0 || aggregated.regressedScheduledCount > 0 || aggregated.authorizedCount > 0) {
      aggregated.stage = 'AGENDADO_PARCIAL';
      aggregated.stepIndex = 6;
    } else if (aggregated.inAuthorizationCount > 0) {
      aggregated.stage = 'EM_AUTORIZACAO';
      aggregated.stepIndex = 5;
    } else if (aggregated.pendingApprovalCount > 0) {
      aggregated.stage = 'AGUARDANDO_APROVACAO';
      aggregated.stepIndex = 4;
    } else if (aggregated.reservedCompleteCount >= aggregated.totalTherapies && aggregated.totalTherapies > 0) {
      aggregated.stage = 'RESERVADO_COMPLETO';
      aggregated.stepIndex = 3;
    } else if (aggregated.reservedPartialCount > 0) {
      aggregated.stage = 'RESERVADO_PARCIAL';
      aggregated.stepIndex = 2;
    } else {
      aggregated.stage = 'PIT_GERADO';
      aggregated.stepIndex = 1;
    }

    return aggregated;
  };

  const openConversionConfirmationModal = (reservationsToConvert?: any[]) => {
    const scopedReservations = Array.isArray(reservationsToConvert)
      ? reservationsToConvert
      : checklistSelectedProcedureReservations;
    const anchorByTherapy = new Map<string, string>();
    scopedReservations.forEach((item) => {
      const therapyId = String(item?.pitTherapyId || item?.preReservationId || '');
      const reservationId = String(item?.preReservationId || '');
      if (!therapyId || !reservationId || anchorByTherapy.has(therapyId)) return;
      anchorByTherapy.set(therapyId, reservationId);
    });
    const scopedReservationIds = Array.from(anchorByTherapy.values());
    const scopedProcedures = Array.from(new Set(scopedReservations.map(getReservationProcedureName)));
    const hasInvalidScopedProcedure = scopedProcedures.some(
      (procedure) => checklistCanConvertByProcedure.get(procedure) !== true,
    );

    if (scopedReservationIds.length === 0 || checklistItems.length === 0 || hasInvalidScopedProcedure) {
      showNotification({
        title: 'Checklist pendente',
        message: 'Existe procedimento com pendência no checklist.',
        color: 'yellow',
      });
      return;
    }

    const uniqueTherapies = new Map<string, { therapy: GroupTherapyContext; slots: Array<{ date: string; time: string }> }>();
    scopedReservations.forEach((reservation) => {
      const pitTherapyId = String(reservation?.pitTherapyId || reservation?.preReservationId || '');
      if (!pitTherapyId) return;

      const slotsFromPattern = Array.isArray(reservation?.weeklySlotPattern)
        ? reservation.weeklySlotPattern
          .map((slot: any) => {
            const date = normalizeDateToIso(slot?.date) || normalizeDateToIso(slot?.suggestedDate);
            const time = String(slot?.time || slot?.suggestedTime || '').trim();
            if (!date || !time) return null;
            return { date, time };
          })
          .filter(Boolean) as Array<{ date: string; time: string }>
        : [];

      const suggestedDateRaw = reservation?.slotSuggestion?.suggestedDate || reservation?.suggestedDate;
      const fallbackDate = normalizeDateToIso(suggestedDateRaw) || dayjs().format('YYYY-MM-DD');
      const fallbackTime = String(reservation?.slotSuggestion?.suggestedTime || reservation?.suggestedTime || '09:00');
      const normalizedSlots = slotsFromPattern.length > 0
        ? slotsFromPattern
        : [{ date: fallbackDate, time: fallbackTime }];

      const existing = uniqueTherapies.get(pitTherapyId);
      if (!existing) {
        uniqueTherapies.set(pitTherapyId, {
          therapy: {
            pitTherapyId,
            procedureName: reservation?.procedure?.name || reservation?.procedureName || reservation?.therapyType || 'Procedimento não definido',
            professionalName: reservation?.professional?.name || reservation?.professionalName || 'Profissional não definido',
            weeklyFrequency: Math.max(1, Number(reservation?.preferences?.weeklyFrequency || 1)),
            preferredWeekdays: Array.isArray(reservation?.preferences?.weekdays) ? reservation.preferences.weekdays : [],
            preferredShift: reservation?.preferences?.shift || undefined,
            durationMinutes: reservation?.procedure?.durationMinutes || null,
          },
          slots: normalizedSlots,
        });
        return;
      }

      normalizedSlots.forEach((slot) => {
        const signature = `${slot.date}#${slot.time}`;
        const alreadyExists = existing.slots.some((existingSlot) => `${existingSlot.date}#${existingSlot.time}` === signature);
        if (!alreadyExists) {
          existing.slots.push(slot);
        }
      });
    });

    const preparedTherapies = Array.from(uniqueTherapies.values());
    if (preparedTherapies.length === 0) {
      showNotification({
        title: 'Dados insuficientes',
        message: 'Não foi possível montar a prévia de conversão do PIT.',
        color: 'yellow',
      });
      return;
    }

    const initialDateByTherapy = preparedTherapies.reduce((acc, entry) => {
      const firstDate = entry.slots[0]?.date;
      if (firstDate) acc[entry.therapy.pitTherapyId] = firstDate;
      return acc;
    }, {} as Record<string, string>);

    setAcceptTherapies(preparedTherapies);
    setAcceptDateByTherapy(initialDateByTherapy);
    setConversionReservationIds(scopedReservationIds);
    setChecklistModalOpened(false);
    setAcceptModalMode('conversion');
    setAcceptModalOpened(true);
  };

  // Move handleOpenGroupTimeline above its first usage
  // (No duplicate handleOpenGroupTimeline here, keep only the first definition above)

  const renderReservationGroupCard = (group: ReservationGroup) => {
    const reservationStatuses = Array.from(new Set(group.reservations.map((item) => String(item?.status || ''))));
    const groupStatus = reservationStatuses.length === 1 ? reservationStatuses[0] : null;
    const suggestionContext = buildGroupContextFromReservations(group);
    const existingSlotsByTherapy = buildExistingSlotsByTherapyFromReservations(group.reservations);
    const teaProfileId = String(group.reservations[0]?.teaProfileId || group.reservations[0]?.pitId || group.pitId || '');
    const isGroupFullyConverted = group.reservations.length > 0
      && group.reservations.every((item) => String(item?.status || '') === 'CONVERTED');
    const hasPartiallyScheduledReservations = group.reservations.some((item) => String(item?.status || '') === 'AUTHORIZED');
    const hasReservedReservations = group.reservations.some((item) => String(item?.status || '') === 'RESERVED');
    const hasPendingApprovalReservations = group.reservations.some((item) => String(item?.status || '') === 'PROPOSED');
    const pitProgress = buildPitProgressFromItems(group.reservations);

    async function handleUpdatePitStatus(resolvedStatus: TeaPreReservationStatus) {
      if (!resolvedStatus) return;

      const anchorByTherapy = new Map<string, string>();
      group.reservations.forEach((item) => {
        const reservationId = String(item?.preReservationId || '');
        const therapyId = String(item?.pitTherapyId || '');
        if (!reservationId || !therapyId) return;
        if (!anchorByTherapy.has(therapyId)) {
          anchorByTherapy.set(therapyId, reservationId);
        }
      });

      const reservationIds = Array.from(anchorByTherapy.values());
      if (reservationIds.length === 0) return;

      setUpdatingId(group.groupKey);
      try {
        await Promise.all(
          reservationIds.map((reservationId) => teaPreReservationService.updateStatus(reservationId, {
            status: resolvedStatus,
            applySeries: true,
          })),
        );

        showNotification({
          title: 'Sucesso',
          message: 'Status do PIT atualizado para todas as terapias',
          color: 'green',
        });

        await loadPending();
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Falha ao atualizar status do PIT',
          color: 'red',
        });
      } finally {
        setUpdatingId(null);
      }
    }
    async function handleOpenGroupTimeline(group: ReservationGroup) {
      const reservations = group.reservations || [];
      const reservationIds = reservations
      .map((item) => String(item?.preReservationId || ''))
      .filter(Boolean);

      if (reservationIds.length === 0) return;

      setTimelineLoading(true);
      try {
      const timelineResponses = await Promise.all(
        reservations.map(async (reservation) => {
        const reservationId = String(reservation?.preReservationId || '');
        const procedureName = reservation?.procedure?.name || 'Terapia';
        const data: any = await teaPreReservationService.getTimeline(reservationId);
        const events = Array.isArray(data?.events) ? data.events : [];

        return events.map((event: any) => ({
          ...event,
          id: `${event.id}-${reservationId}`,
          eventLabel: `[${procedureName}] ${event.eventLabel || event.eventType}`,
        })) as TimelineEventItem[];
        }),
      );

      const mergedEvents = timelineResponses
        .flat()
        .sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());

      setTimelineEvents(mergedEvents);
      setTimelineReservationLabel(`${group.patientName} • PIT`);
      setTimelineModalOpened(true);
      } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao carregar timeline do PIT',
        color: 'red',
      });
      } finally {
      setTimelineLoading(false);
      }
    }
    async function handleOpenGroupConversionChecklist(group: ReservationGroup) {
      const alreadyConverted = group.reservations.length > 0
        && group.reservations.every((item) => String(item?.status || '') === 'CONVERTED');
      if (alreadyConverted) {
        showNotification({
          title: 'PIT já convertido',
          message: 'Este PIT já foi convertido em agendamento.',
          color: 'blue',
        });
        return;
      }

      const eligibleReservations = (group.reservations || []).filter((item) => String(item?.status || '') === 'AUTHORIZED');
      const anchorByTherapy = new Map<string, any>();
      eligibleReservations.forEach((item) => {
        const therapyId = String(item?.pitTherapyId || '');
        if (!therapyId) return;
        if (!anchorByTherapy.has(therapyId)) {
          anchorByTherapy.set(therapyId, item);
        }
      });
      const eligibleAnchors = Array.from(anchorByTherapy.values());

      if (eligibleAnchors.length === 0) {
        showNotification({
          title: 'Sem itens elegíveis',
          message: 'Este PIT não possui terapias em Agendado parcial para checklist/agendamento.',
          color: 'yellow',
        });
        return;
      }

      const procedureOptions = Array.from(new Set(eligibleReservations.map((item) => getReservationProcedureName(item))));

      setChecklistLoading(true);
      setChecklistModalOpened(true);
      setChecklistGroupKey(group.groupKey);
      setChecklistGroupLabel(`${group.patientName} • PIT`);
      setChecklistGroupReservations(eligibleReservations);
      setChecklistProcedureOptions(procedureOptions);
      setSelectedChecklistProcedure(procedureOptions[0] || null);
      setConversionReservationIds([]);
      setChecklistItems([]);
      try {
      const allItems: ConversionChecklistItem[] = [];
      for (const reservation of eligibleAnchors) {
        const reservationId = String(reservation?.preReservationId || '');
        if (!reservationId) continue;
        const procedureName = getReservationProcedureName(reservation);
        const data: any = await teaPreReservationService.getConversionChecklist(reservationId);
        const checks: ConversionChecklistItem[] = Array.isArray(data?.checks)
          ? data.checks
          : (Array.isArray(data?.items) ? data.items : []);
        allItems.push(
          ...checks.map((item) => ({
            ...item,
            key: `${reservationId}-${item.key}`,
            procedureName,
          })),
        );
      }
      setChecklistItems(allItems);
      } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao carregar checklist de conversão',
        color: 'red',
      });
      setChecklistItems([]);
      } finally {
      setChecklistLoading(false);
      }
    }
    async function handleMoveGroupSeriesStatus(
      fromStatus: TeaPreReservationStatus,
      toStatus: TeaPreReservationStatus,
      successMessage: string,
    ) {
        const anchorByTherapy = new Map<string, any>();
      group.reservations.forEach((item) => {
        const status = String(item?.status || '');
        const reservationId = String(item?.preReservationId || '');
        const therapyId = String(item?.pitTherapyId || '');
        if (status !== fromStatus || !reservationId || !therapyId) return;
        if (!anchorByTherapy.has(therapyId)) {
            anchorByTherapy.set(therapyId, item);
        }
      });

        const options = Array.from(anchorByTherapy.values()).map((item) => ({
          reservationId: String(item?.preReservationId || ''),
          pitTherapyId: String(item?.pitTherapyId || item?.preReservationId || ''),
          procedureName: item?.procedure?.name || item?.procedureName || item?.therapyType || 'Procedimento não definido',
          professionalName: item?.professional?.name || item?.professionalName || 'Profissional não definido',
        })).filter((option) => Boolean(option.reservationId));

        if (options.length === 0) {
        showNotification({
          title: 'Sem itens para atualizar',
          message: 'Nenhuma terapia elegível para essa ação neste PIT.',
          color: 'yellow',
        });
        return;
      }


        const actionLabel = toStatus === 'PROPOSED' ? 'Enviar para aprovação' : 'Aprovar reserva';
        setBulkStatusActionState({
          groupKey: group.groupKey,
          patientName: group.patientName,
          fromStatus,
          toStatus,
          successMessage,
          title: `${actionLabel} • selecionar terapias`,
          options,
        });
        setBulkStatusSelectedReservationIds(options.map((option) => option.reservationId));
    }

    async function handleDeletePit() {
      await handleDeletePitByTeaProfileId(teaProfileId, group.groupKey);
    }

    return (
      <Paper key={group.groupKey} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
        <Stack gap={8}>
          <Group justify="space-between" align="center" wrap="wrap">
            <Text fw={600}>{group.patientName}</Text>
            <Group gap="xs">
              <Badge variant="light" color="indigo">{group.reservations.length} terapia(s)</Badge>
              <Badge variant="light" color={groupStatus ? (STATUS_COLOR[groupStatus] || 'gray') : 'gray'}>
                {groupStatus ? (STATUS_LABEL[groupStatus] || groupStatus) : 'Status misto'}
              </Badge>
            </Group>
          </Group>

          <Text size="xs" c="dimmed">
            {group.patientCpf ? `CPF: ${formatCPF(group.patientCpf)} • ` : ''}
            PIT: {group.pitId || 'N/D'}
          </Text>

          <Box>
            {renderProgressTrail(pitProgress, `pit-${group.groupKey}`)}
          </Box>

          <Group grow align="flex-end">
            <Stack gap={4}>
              <Select
                size="xs"
                label="Status do PIT"
                data={getTherapyStatusOptions(groupStatus || undefined)}
                value={groupStatus}
                placeholder="Status misto entre terapias"
                onChange={(value) => {
                  if (!value) return;
                  handleUpdatePitStatus(value as TeaPreReservationStatus);
                }}
                disabled={
                  updatingId === group.groupKey
                  || !groupStatus
                  || isAuthorizationManagedStatus(groupStatus)
                  || groupStatus === 'CONVERTED'
                  || groupStatus === 'EXPIRED'
                }
                style={{ minWidth: 240 }}
              />
            </Stack>
            <Button
              color="red"
              variant="light"
              h={36}
              leftSection={<Trash2 size={16} />}
              onClick={handleDeletePit}
              loading={updatingId === group.groupKey}
              disabled={!teaProfileId}
            >
              Excluir PIT
            </Button>
            <Button
              variant="default"
              h={36}
              leftSection={<History size={16} />}
              onClick={() => handleOpenGroupTimeline(group)}
            >
              Histórico do PIT
            </Button>
            {!isGroupFullyConverted && hasPartiallyScheduledReservations && (
              <Button
                color="green"
                variant="light"
                h={36}
                leftSection={<ListChecks size={16} />}
                onClick={() => handleOpenGroupConversionChecklist(group)}
                loading={updatingId === group.groupKey}
              >
                Checklist / Agendar
              </Button>
            )}
          </Group>
          {!isGroupFullyConverted && (
            <Group justify="flex-end" gap="xs">
              {hasReservedReservations && (
                <Button
                  size="xs"
                  variant="light"
                  color="violet"
                  onClick={() => handleMoveGroupSeriesStatus(
                    'RESERVED',
                    'PROPOSED',
                    'Reservas enviadas para aprovação dos responsáveis.',
                  )}
                  loading={updatingId === group.groupKey}
                >
                  Enviar para aprovação
                </Button>
              )}
              {hasPendingApprovalReservations && (
                <Button
                  size="xs"
                  variant="light"
                  color="yellow"
                  onClick={() => handleMoveGroupSeriesStatus(
                    'PROPOSED',
                    'PENDING_AUTHORIZATION',
                    'Reservas aprovadas e enviadas para autorização.',
                  )}
                  loading={updatingId === group.groupKey}
                >
                  Aprovar reserva
                </Button>
              )}
            </Group>
          )}

          <Stack gap={6}>
            {group.reservations.map((item) => {
              const itemTherapyId = String(item?.pitTherapyId || item?.preReservationId || '');
              const reservationCardKey = `reservation-${group.groupKey}-${String(item.preReservationId || itemTherapyId || 'unknown')}`;
              const isReservationCardCollapsed = Boolean(collapsedTherapyCards[reservationCardKey]);
              const fallbackTherapy: GroupTherapyContext = {
                pitTherapyId: itemTherapyId,
                procedureName: item?.procedure?.name || item?.procedureName || item?.therapyType || 'Procedimento não definido',
                professionalName: item?.professional?.name || item?.professionalName || 'Profissional não definido',
                weeklyFrequency: Math.max(1, Number(item?.preferences?.weeklyFrequency || 1)),
                preferredWeekdays: Array.isArray(item?.preferences?.weekdays) ? item.preferences.weekdays : [],
                preferredShift: item?.preferences?.shift || undefined,
                durationMinutes: item?.procedure?.durationMinutes || item?.durationMinutes || null,
              };
              const matchedTherapy = suggestionContext.therapies.find((therapy) => therapy.pitTherapyId === itemTherapyId);
              const therapyContext: SuggestionGroupContext = {
                ...suggestionContext,
                therapies: itemTherapyId ? [matchedTherapy || fallbackTherapy] : [],
              };
              const itemStatus = String(item?.status || '');
              const statusToDisplay = groupStatus || itemStatus;
              const itemWeeklyTarget = Math.max(1, Number(item?.preferences?.weeklyFrequency || 1));
              const itemWeeklyReserved = Math.max(0, Number(item?.weeklyReservationCount || 0));
              const isItemReservedComplete = itemStatus === 'RESERVED' && itemWeeklyReserved >= itemWeeklyTarget;
              const canShowSuggestionButtonsForItem = itemStatus === 'PENDING_SCHEDULING' || (itemStatus === 'RESERVED' && !isItemReservedComplete);
              const therapyExistingSlotsByTherapy = itemTherapyId && Array.isArray(existingSlotsByTherapy[itemTherapyId])
                ? { [itemTherapyId]: existingSlotsByTherapy[itemTherapyId] }
                : {};

              return (
              <Paper key={String(item.preReservationId)} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Group justify="space-between" align="center" wrap="wrap">
                  <Text size="sm" fw={600}>
                    {item.procedure?.name || 'Procedimento não definido'}
                    {' • '}
                    {item.professional?.name || 'Profissional não definido'}
                  </Text>
                  <Group gap="xs">
                    <Badge variant="light" color={STATUS_COLOR[statusToDisplay] || 'gray'}>
                      {STATUS_LABEL[statusToDisplay] || statusToDisplay}
                    </Badge>
                    {item.isExpiringSoon && item.status !== 'EXPIRED' && item.status !== 'CONVERTED' && item.status !== 'AUTHORIZED' && (
                      <Badge variant="light" color="orange">Vence em breve</Badge>
                    )}
                    {(item.isExpired || item.status === 'EXPIRED') && (
                      <Badge variant="light" color="red">Expirada</Badge>
                    )}
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => toggleTherapyCard(reservationCardKey)}
                      title={isReservationCardCollapsed ? 'Mostrar detalhes' : 'Esconder detalhes'}
                    >
                      <ChevronDown
                        size={16}
                        style={{
                          transform: isReservationCardCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                          transition: 'transform 150ms ease',
                        }}
                      />
                    </ActionIcon>
                  </Group>
                </Group>
                {!isReservationCardCollapsed && (
                  <>
                {canShowSuggestionButtonsForItem && itemTherapyId && (
                  <Group mt={8} justify="flex-end" gap="xs" wrap="wrap">
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<Sparkles size={14} />}
                      onClick={() => handleLoadGroupSuggestions(therapyContext, {
                        existingSlotsByTherapy: therapyExistingSlotsByTherapy,
                        daysAhead: 90,
                      })}
                      loading={loadingSuggestionsId === group.groupKey}
                    >
                      Sugerir horários automáticos
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<Calendar size={14} />}
                      onClick={() => openManualProposalModal(therapyContext, { existingSlotsByTherapy: therapyExistingSlotsByTherapy })}
                      loading={manualLoadingGrid && manualContext?.groupKey === group.groupKey}
                    >
                      Criar proposta manual
                    </Button>
                  </Group>
                )}
                {Number(item?.authorizationAttachmentsCount || 0) > 0 && (
                  <>
                    <Text size="xs" mt={4} c="blue">
                      Anexos da autorização: {item.authorizationAttachmentsCount}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {(Array.isArray(item?.authorizationAttachments) ? item.authorizationAttachments : [])
                        .slice(0, 3)
                        .map((doc: any) => String(doc?.fileName || '').trim())
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  </>
                )}
                {item.status === 'AUTHORIZED' && item.authorizedAt && (
                  <Text size="xs" mt={4} c="teal">
                    Autorizado em: {dayjs(item.authorizedAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                )}
                {item.status !== 'AUTHORIZED' && item.status !== 'CONVERTED' && item.expiresAt && (
                  <Text size="xs" mt={4} c={item.isExpired ? 'red' : item.isExpiringSoon ? 'orange' : 'dimmed'}>
                    Expira em: {dayjs(item.expiresAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                )}
                  </>
                )}
              </Paper>
              );
            })}
          </Stack>
        </Stack>
      </Paper>
    );
  };

  const modalSuggestions = useMemo(() => {
    if (!suggestionModalContext) {
      return [] as Array<{ date: string; time: string; pitTherapyId: string; procedureName: string; professionalName: string }>;
    }

    return suggestionModalContext.therapies.flatMap((therapy) => {
      const slots = suggestionsByTherapyId[therapy.pitTherapyId] || [];
      return slots.map((slot) => ({
        date: slot.date,
        time: slot.time,
        pitTherapyId: therapy.pitTherapyId,
        procedureName: therapy.procedureName,
        professionalName: therapy.professionalName,
      }));
    });
  }, [suggestionsByTherapyId, suggestionModalContext]);

  const therapyColorById = useMemo(() => {
    const colorById: Record<string, TherapyColorToken> = {};
    (suggestionModalContext?.therapies || []).forEach((therapy, index) => {
      colorById[therapy.pitTherapyId] = THERAPY_COLOR_TOKENS[index % THERAPY_COLOR_TOKENS.length];
    });
    return colorById;
  }, [suggestionModalContext]);


  const weeklyCalendarSuggestions = useMemo(() => {
    const firstDate = modalSuggestions[0]?.date ? dayjs(modalSuggestions[0].date) : dayjs();
    const dayIndex = firstDate.day();
    const daysFromMonday = (dayIndex + 6) % 7;
    const mondayDate = firstDate.subtract(daysFromMonday, 'day').startOf('day');
    const mondayWeekday = mondayDate.day();

    const entriesByWeekday: Record<number, Array<{ date: string; time: string; pitTherapyId: string; procedureName: string; professionalName: string }>> = {};
    const seenSlots = new Set<string>();

    modalSuggestions.forEach((slot) => {
      const weekday = dayjs(slot.date).day();
      const signature = `${weekday}-${slot.time}-${slot.pitTherapyId}`;
      if (seenSlots.has(signature)) return;
      seenSlots.add(signature);

      if (!entriesByWeekday[weekday]) {
        entriesByWeekday[weekday] = [];
      }
      entriesByWeekday[weekday].push(slot);
    });

    return WEEKDAY_COLUMNS.map((column) => {
      const currentDate = mondayDate.add(column.offset, 'day');
      const currentWeekday = (mondayWeekday + column.offset) % 7;
      const entries = (entriesByWeekday[currentWeekday] || []).slice().sort((a, b) => {
        const timeCompare = a.time.localeCompare(b.time);
        if (timeCompare !== 0) return timeCompare;
        return a.procedureName.localeCompare(b.procedureName);
      });

      return {
        label: column.label,
        date: currentDate.format('YYYY-MM-DD'),
        entries,
      };
    });
  }, [modalSuggestions]);

  useEffect(() => {
    if (!suggestionModalContext) {
      setSelectedSuggestionByTherapyId({});
      setWeeklyValidationByTherapyId({});
      return;
    }

    const initialSelection = suggestionModalContext.therapies.reduce((acc, therapy) => {
      const hasSuggestion = (suggestionsByTherapyId[therapy.pitTherapyId] || []).length > 0;
      acc[therapy.pitTherapyId] = hasSuggestion;
      return acc;
    }, {} as Record<string, boolean>);

    setSelectedSuggestionByTherapyId(initialSelection);
  }, [suggestionModalContext, suggestionsByTherapyId]);

  const manualTherapyOptions = useMemo(() => {
    if (!manualContext) return [];
    return manualContext.therapies.map((therapy) => ({
      value: therapy.pitTherapyId,
      label: `${therapy.procedureName} • ${therapy.professionalName}`,
    }));
  }, [manualContext]);

  const manualSelectedTherapy = useMemo(
    () => manualContext?.therapies.find((therapy) => therapy.pitTherapyId === manualSelectedTherapyId) || null,
    [manualContext, manualSelectedTherapyId],
  );

  const manualSelectedGrid = useMemo(
    () => (manualSelectedTherapyId ? manualGridByTherapyId[manualSelectedTherapyId] : undefined),
    [manualSelectedTherapyId, manualGridByTherapyId],
  );

  const manualWeekDays = useMemo(() => {
    if (manualSelectedGrid?.days?.length) return manualSelectedGrid.days;

    return WEEKDAY_COLUMNS.map((column) => {
      const date = dayjs(manualWeekStart).add(column.offset, 'day').format('YYYY-MM-DD');
      return {
        date,
        weekday: '',
        enabled: false,
        slots: [],
      } as ManualGridDay;
    });
  }, [manualSelectedGrid, manualWeekStart]);

  const manualTimeRows = useMemo(() => {
    const allTimes = new Set<string>();
    manualWeekDays.forEach((day) => {
      day.slots.forEach((slot) => allTimes.add(slot.time));
    });
    return Array.from(allTimes).sort((a, b) => a.localeCompare(b));
  }, [manualWeekDays]);

  const manualSlotStepMinutes = useMemo(() => {
    const sorted = [...manualTimeRows].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    const diffs: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const diff = timeToMinutes(sorted[i]) - timeToMinutes(sorted[i - 1]);
      if (diff > 0) diffs.push(diff);
    }
    return diffs.length > 0 ? Math.min(...diffs) : 15;
  }, [manualTimeRows]);

  const manualWeeklyLimit = useMemo(
    () => {
      if (!manualSelectedTherapyId) return 0;
      const weeklyFrequency = Math.max(1, Number(manualSelectedTherapy?.weeklyFrequency || 1));
      const existingSlots = manualEditableExistingSlotsByTherapyId[manualSelectedTherapyId] || [];
      const existingWeeklyCount = buildWeeklySlotSignatures(existingSlots).length;
      const previousWeeklyFrequency = Math.max(0, Number(manualSelectedTherapy?.previousWeeklyFrequency || 0));
      const baselineReserved = String(manualSelectedTherapy?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE'
        ? Math.max(existingWeeklyCount, previousWeeklyFrequency)
        : existingWeeklyCount;
      return Math.max(0, weeklyFrequency - baselineReserved);
    },
    [manualEditableExistingSlotsByTherapyId, manualSelectedTherapy, manualSelectedTherapyId],
  );

  const manualSelectedSessionCount = useMemo(
    () => manualSelectedSlots.length,
    [manualSelectedSlots],
  );

  const manualSelectionComplete = manualSelectedSessionCount === manualWeeklyLimit;


  const loadPending = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (silent && typeof window !== 'undefined') {
      lastScrollYRef.current = window.scrollY || 0;
    }
    if (!silent) {
      setLoading(true);
    }
    try {
      const data: any = await teaPreReservationService.listPending({
        search: search || undefined,
        status: (statusFilter || undefined) as TeaPreReservationStatus | undefined,
      });

      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);

      setItems(list);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar pendências de pré-reserva',
        color: 'red',
      });
    } finally {
      if (!silent) {
        setLoading(false);
      } else if (typeof window !== 'undefined') {
        const targetY = lastScrollYRef.current;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo(0, targetY);
          });
        });
      }
    }
  };

  const handleDeletePitByTeaProfileId = async (teaProfileId: string, groupKey: string) => {
    if (!teaProfileId) {
      showNotification({
        title: 'PIT inválido',
        message: 'Não foi possível identificar o perfil TEA para excluir este PIT.',
        color: 'yellow',
      });
      return;
    }

    setDeletePitTarget({ teaProfileId, groupKey });
    setDeletePitConfirmModalOpened(true);
  };

  const confirmDeletePit = async () => {
    if (!deletePitTarget?.teaProfileId || !deletePitTarget?.groupKey) {
      setDeletePitConfirmModalOpened(false);
      setDeletePitTarget(null);
      return;
    }

    const { teaProfileId, groupKey } = deletePitTarget;

    setUpdatingId(groupKey);
    try {
      await teaProfileService.deletePit(teaProfileId);
      showNotification({
        title: 'Sucesso',
        message: 'PIT excluído com sucesso.',
        color: 'green',
      });
      setDeletePitConfirmModalOpened(false);
      setDeletePitTarget(null);
      await loadPending();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao excluir PIT',
        color: 'red',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmBulkStatusAction = async () => {
    if (!bulkStatusActionState) return;

    const selectedReservationIds = Array.from(new Set(bulkStatusSelectedReservationIds.filter(Boolean)));
    if (selectedReservationIds.length === 0) {
      showNotification({
        title: 'Selecione ao menos uma terapia',
        message: 'Marque uma ou mais terapias para aplicar a alteração de status.',
        color: 'yellow',
      });
      return;
    }

    setUpdatingId(bulkStatusActionState.groupKey);
    try {
      await Promise.all(
        selectedReservationIds.map((reservationId) => teaPreReservationService.updateStatus(reservationId, {
          status: bulkStatusActionState.toStatus,
          applySeries: true,
        })),
      );

      showNotification({
        title: 'Sucesso',
        message: bulkStatusActionState.successMessage,
        color: 'green',
      });

      setBulkStatusActionState(null);
      setBulkStatusSelectedReservationIds([]);
      await loadPending();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao atualizar status do PIT',
        color: 'red',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    loadPending();
  }, [search, statusFilter]);

  // polling: reload data every 30 seconds in case the PIT changes on the server,
  // and restart interval when filters/mock mode change so the query is fresh.
  useEffect(() => {
    const interval = setInterval(() => {
      loadPending({ silent: true });
    }, 30_000);

    return () => clearInterval(interval);
  }, [search, statusFilter]);

  const loadManualGridForContext = async (context: SuggestionGroupContext, weekStart: string) => {
    if (!context?.therapies?.length) return;

    setManualLoadingGrid(true);
    try {
      const responses = await Promise.all(
        context.therapies.map(async (therapy) => {
          const data = await teaPreReservationService.getManualGrid(therapy.pitTherapyId, { weekStart });
          return {
            pitTherapyId: therapy.pitTherapyId,
            data: data as ManualGridResponse,
          };
        }),
      );

      const nextByTherapyId: Record<string, ManualGridResponse> = {};
      responses.forEach((response) => {
        nextByTherapyId[response.pitTherapyId] = response.data;
      });

      setManualGridByTherapyId(nextByTherapyId);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao carregar grade manual',
        color: 'red',
      });
    } finally {
      setManualLoadingGrid(false);
    }

    setManualLoadingGrid(true);
    try {
      const responses = await Promise.all(
        context.therapies.map(async (therapy) => {
          const data = await teaPreReservationService.getManualGrid(therapy.pitTherapyId, { weekStart });
          return {
            pitTherapyId: therapy.pitTherapyId,
            data: data as ManualGridResponse,
          };
        }),
      );

      const nextByTherapyId: Record<string, ManualGridResponse> = {};
      responses.forEach((response) => {
        nextByTherapyId[response.pitTherapyId] = response.data;
      });

      setManualGridByTherapyId(nextByTherapyId);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao carregar grade manual',
        color: 'red',
      });
    } finally {
      setManualLoadingGrid(false);
    }
  };

  const openManualProposalModal = async (
    context: SuggestionGroupContext,
    options?: { existingSlotsByTherapy?: Record<string, Array<{ date: string; time: string }>> },
  ) => {
    const existingSlotsByTherapy = options?.existingSlotsByTherapy || {};
    const firstTherapyId = context.therapies[0]?.pitTherapyId || null;

    setManualContext(context);
    setManualWeekStart(dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
    setManualSelectedTherapyId(firstTherapyId);
    setManualEditableExistingSlotsByTherapyId(existingSlotsByTherapy);
    setManualSelectedSlots([]);
    setManualModalOpened(true);
    await loadManualGridForContext(context, dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
  };

  const handleManualConfirmReservation = async () => {
    if (!manualContext || !manualSelectedTherapy) {
      showNotification({ title: 'Atenção', message: 'Selecione uma terapia para continuar.', color: 'yellow' });
      return;
    }
    if (manualWeeklyLimit <= 0) {
      showNotification({
        title: 'Nada pendente',
        message: 'Esta terapia já possui todos os horários semanais necessários.',
        color: 'yellow',
      });
      return;
    }
    if (!manualSelectedSlots.length) {
      showNotification({ title: 'Atenção', message: 'Selecione ao menos um horário livre no calendário.', color: 'yellow' });
      return;
    }

    const sortedSlots = [...manualSelectedSlots].sort((a, b) => {
      const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
      if (dateDiff !== 0) return dateDiff;
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });

    const sessionAnchors = getManualSelectionAnchors(sortedSlots, manualSlotStepMinutes);
    if (!sessionAnchors.length) {
      showNotification({
        title: 'Atenção',
        message: 'Não foi possível montar sessões válidas com os horários selecionados.',
        color: 'yellow',
      });
      return;
    }
    if (sessionAnchors.length > manualWeeklyLimit) {
      showNotification({
        title: 'Limite semanal atingido',
        message: `Selecione no máximo ${manualWeeklyLimit} horário(s) faltante(s) para esta terapia.`,
        color: 'yellow',
      });
      return;
    }

    const firstDate = sessionAnchors[0]?.date;
    const weeks = getWeeksUntilYearEnd(firstDate);

    setManualReservationDecisionState({
      groupKey: manualContext.groupKey,
      pitTherapyId: manualSelectedTherapy.pitTherapyId,
      durationMinutes: manualSelectedTherapy.durationMinutes ?? null,
      sessionAnchors,
      recurrenceWeeks: weeks,
      hasEditableExistingSeries: false,
    });
    setManualAcceptDecisionOpened(true);
  };

  const handleSubmitManualReservation = async (targetStatus: TeaPreReservationStatus) => {
    if (!manualReservationDecisionState) return;

    setManualAcceptDecisionOpened(false);
    setManualSaving(true);
    setUpdatingId(manualReservationDecisionState.groupKey);
    try {
      const acceptResult: any = await teaPreReservationService.acceptGroup({
        recurring: true,
        recurrenceWeeks: manualReservationDecisionState.recurrenceWeeks,
        recurringUntilDate,
        expiresAt: dayjs().add(2, 'day').toISOString(),
        status: targetStatus,
        replaceExistingByTherapy: false,
        items: manualReservationDecisionState.sessionAnchors.map((slot) => ({
          pitTherapyId: manualReservationDecisionState.pitTherapyId,
          suggestedDate: slot.date,
          suggestedTime: slot.time,
          durationMinutes: manualReservationDecisionState.durationMinutes,
        })),
      });

      const totalCreated = Number(acceptResult?.totalCreated || 0);
      const skippedConflicts = Number(acceptResult?.skippedConflicts || 0);

      if (totalCreated <= 0) {
        showNotification({
          title: 'Nenhum horário reservado',
          message: skippedConflicts > 0
            ? 'Os horários selecionados entraram em conflito e não puderam ser reservados.'
            : 'Não foi possível reservar os horários selecionados.',
          color: 'yellow',
        });
        return;
      }

      showNotification({
        title: 'Sucesso',
        message: `Reserva manual confirmada com ${totalCreated} sessão(ões) criada(s).`,
        color: 'green',
      });

      setManualModalOpened(false);
      setManualReservationDecisionState(null);
      setManualSelectedSlots([]);
      await loadPending();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao confirmar reserva manual',
        color: 'red',
      });
    } finally {
      setManualSaving(false);
      setUpdatingId(null);
    }
  };

  const buildGroupContextFromItems = (group: {
    groupKey: string;
    patientName: string;
    patientCpf?: string;
    therapies: any[];
  }): SuggestionGroupContext => ({
    groupKey: group.groupKey,
    patientName: group.patientName,
    patientCpf: group.patientCpf,
    therapies: group.therapies
      .filter((item) => !item?.removedFromPit)
      .map((item) => ({
        pitTherapyId: String(item.pitTherapyId),
        procedureName: item?.procedure?.name || 'Procedimento não definido',
        professionalName: item?.professional?.name || 'Profissional não definido',
        weeklyFrequency: Number(item?.preferences?.weeklyFrequency || 1),
        previousWeeklyFrequency: Number(item?.previousWeeklyFrequency || 0),
        source: String(item?.source || ''),
        preferredWeekdays: Array.isArray(item?.preferences?.weekdays) ? item.preferences.weekdays : [],
        preferredShift: item?.preferences?.shift || undefined,
        durationMinutes: item?.procedure?.durationMinutes || null,
      })),
  });

  const buildGroupContextFromReservations = (group: ReservationGroup): SuggestionGroupContext => {
    const byTherapy = new Map<string, GroupTherapyContext>();

    (group.reservations || []).forEach((item) => {
      const pitTherapyId = String(item?.pitTherapyId || item?.preReservationId || '');
      if (!pitTherapyId || byTherapy.has(pitTherapyId)) return;

      byTherapy.set(pitTherapyId, {
        pitTherapyId,
        procedureName: item?.procedure?.name || item?.procedureName || item?.therapyType || 'Procedimento não definido',
        professionalName: item?.professional?.name || item?.professionalName || 'Profissional não definido',
        weeklyFrequency: Math.max(1, Number(item?.preferences?.weeklyFrequency || 1)),
        preferredWeekdays: Array.isArray(item?.preferences?.weekdays) ? item.preferences.weekdays : [],
        preferredShift: item?.preferences?.shift || undefined,
        durationMinutes: item?.procedure?.durationMinutes || item?.durationMinutes || null,
      });
    });

    return {
      groupKey: group.groupKey,
      patientName: group.patientName,
      patientCpf: group.patientCpf,
      therapies: Array.from(byTherapy.values()),
    };
  };

  const buildExistingSlotsByTherapyFromReservations = (reservations: any[]) => {
    const byTherapy: Record<string, Array<{ date: string; time: string }>> = {};

    (reservations || []).forEach((item) => {
      const pitTherapyId = String(item?.pitTherapyId || item?.preReservationId || '');
      if (!pitTherapyId) return;

      const appendSlot = (dateRaw: string, timeRaw: string) => {
        const suggestedDate = normalizeDateToIso(dateRaw);
        const suggestedTime = String(timeRaw || '').trim();
        if (!suggestedDate || !suggestedTime) return;

        if (!byTherapy[pitTherapyId]) byTherapy[pitTherapyId] = [];
        const signature = `${suggestedDate}#${suggestedTime}`;
        const alreadyExists = byTherapy[pitTherapyId].some((slot) => `${slot.date}#${slot.time}` === signature);
        if (!alreadyExists) {
          byTherapy[pitTherapyId].push({ date: suggestedDate, time: suggestedTime });
        }
      };

      const weeklyPatternSlots = Array.isArray(item?.weeklySlotPattern)
        ? item.weeklySlotPattern
        : [];
      weeklyPatternSlots.forEach((patternSlot: any) => {
        appendSlot(
          String(patternSlot?.date || patternSlot?.suggestedDate || ''),
          String(patternSlot?.time || patternSlot?.suggestedTime || ''),
        );
      });

      const suggestedDateRaw = item?.slotSuggestion?.suggestedDate || item?.suggestedDate;
      const suggestedTimeRaw = item?.slotSuggestion?.suggestedTime || item?.suggestedTime;
      appendSlot(String(suggestedDateRaw || ''), String(suggestedTimeRaw || ''));
    });

    return byTherapy;
  };

  const handleLoadGroupSuggestions = async (
    context: SuggestionGroupContext,
    options?: {
      excludeSlotsByTherapy?: Record<string, string[]>;
      daysAhead?: number;
      existingSlotsByTherapy?: Record<string, Array<{ date: string; time: string }>>;
    },
  ) => {
    const excludeSlotsByTherapy = options?.excludeSlotsByTherapy || {};

    if (!options?.excludeSlotsByTherapy) {
      setTriedSlotsByTherapyId((prev) => {
        const next = { ...prev };
        context.therapies.forEach((therapy) => {
          delete next[therapy.pitTherapyId];
        });
        return next;
      });
    }

    if (!context.therapies.length) {
      showNotification({ title: 'Atenção', message: 'Esse PIT não possui terapias para sugerir', color: 'yellow' });
      return;
    }


    setLoadingSuggestionsId(context.groupKey);
    try {
      const pickBestSuggestions = (
        rawList: Array<{ date: string; time: string }>,
        targetCount: number,
        therapy: GroupTherapyContext,
      ): Array<{ date: string; time: string }> => {
        if (targetCount <= 0) return [];

        const unique = rawList.filter((slot, idx, arr) => arr.findIndex((it) => it.date === slot.date && it.time === slot.time) === idx);

        const shuffle = <T,>(arr: T[]) => {
          const cloned = [...arr];
          for (let i = cloned.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
          }
          return cloned;
        };

        const normalizedPreferredWeekdays = (therapy.preferredWeekdays || [])
          .map((day) => WEEKDAY_TO_DAY_INDEX[String(day).toUpperCase()])
          .filter((d): d is number => Number.isInteger(d));
        const preferredWeekdaySet = new Set(normalizedPreferredWeekdays);
        const normalizedShiftTokens = String(therapy.preferredShift || '')
          .split(',')
          .map((token) => String(token || '').toUpperCase().trim())
          .filter((token) => token === 'MANHA' || token === 'TARDE' || token === 'NOITE');
        const shiftTokenSet = new Set(normalizedShiftTokens);

        const isShiftMatch = (time: string) => {
          const [hourRaw] = String(time).split(':');
          const hour = Number(hourRaw);
          if (!Number.isFinite(hour)) return true;
          if (shiftTokenSet.size === 0) return true;

          const isMorning = hour >= 8 && hour < 12;
          const isAfternoon = hour >= 13 && hour < 18;
          const isNight = hour >= 18 && hour <= 21;

          if (isMorning && shiftTokenSet.has('MANHA')) return true;
          if (isAfternoon && shiftTokenSet.has('TARDE')) return true;
          if (isNight && shiftTokenSet.has('NOITE')) return true;
          return false;
        };

        const fullPool = [...unique].sort((a, b) => {
          const weekdayA = dayjs(a.date).day();
          const weekdayB = dayjs(b.date).day();
          const weekdayScoreA = preferredWeekdaySet.size === 0 ? 1 : (preferredWeekdaySet.has(weekdayA) ? 1 : 0);
          const weekdayScoreB = preferredWeekdaySet.size === 0 ? 1 : (preferredWeekdaySet.has(weekdayB) ? 1 : 0);

          if (weekdayScoreB !== weekdayScoreA) return weekdayScoreB - weekdayScoreA;

          const shiftScoreA = shiftTokenSet.size === 0 ? 1 : (isShiftMatch(a.time) ? 1 : 0);
          const shiftScoreB = shiftTokenSet.size === 0 ? 1 : (isShiftMatch(b.time) ? 1 : 0);

          if (shiftScoreB !== shiftScoreA) return shiftScoreB - shiftScoreA;

          const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
          if (dateDiff !== 0) return dateDiff;
          return a.time.localeCompare(b.time);
        });
        const slotsByWeekStart = new Map<string, Array<{ date: string; time: string }>>();

        fullPool.forEach((slot) => {
          const weekday = dayjs(slot.date).day();
          const daysFromMonday = (weekday + 6) % 7;
          const weekStart = dayjs(slot.date).subtract(daysFromMonday, 'day').format('YYYY-MM-DD');
          const list = slotsByWeekStart.get(weekStart) || [];
          list.push(slot);
          slotsByWeekStart.set(weekStart, list);
        });

        // Keep the weekly pattern in a single base week; mixing multiple weeks
        // breaks server-side weekly validation for recurrence acceptance.
        // Prefer weeks with broader weekday distribution (not only repeated slots on one day).
        const sortedWeekStarts = Array.from(slotsByWeekStart.keys()).sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());
        const weekStats = sortedWeekStarts.map((weekStart) => {
          const list = slotsByWeekStart.get(weekStart) || [];
          const uniqueWeekdays = new Set(list.map((slot) => dayjs(slot.date).day())).size;
          return {
            weekStart,
            listLength: list.length,
            uniqueWeekdays,
          };
        });
        const viableWeeks = weekStats.filter((item) => item.listLength >= targetCount);
        const preferredWeek = (viableWeeks.length > 0 ? viableWeeks : weekStats)
          .sort((a, b) => {
            if (b.uniqueWeekdays !== a.uniqueWeekdays) return b.uniqueWeekdays - a.uniqueWeekdays;
            if (b.listLength !== a.listLength) return b.listLength - a.listLength;
            return dayjs(a.weekStart).valueOf() - dayjs(b.weekStart).valueOf();
          })[0];
        const baseWeekStart = preferredWeek?.weekStart || sortedWeekStarts[0];
        const pool = baseWeekStart ? (slotsByWeekStart.get(baseWeekStart) || []) : fullPool;
        const selected: Array<{ date: string; time: string }> = [];
        const usedSignatures = new Set<string>();
        const usedDates = new Set<string>();

        const slotsByWeekday = new Map<number, Array<{ date: string; time: string }>>();
        pool.forEach((slot) => {
          const weekday = dayjs(slot.date).day();
          const list = slotsByWeekday.get(weekday) || [];
          list.push(slot);
          slotsByWeekday.set(weekday, list);
        });

        const availableWeekdays = shuffle(Array.from(slotsByWeekday.keys()));

        // Passo 1: sorteia por dia da semana (chance equilibrada entre quarta/quinta/sexta)
        for (const weekday of availableWeekdays) {
          if (selected.length >= targetCount) break;
          const weekdaySlots = shuffle(slotsByWeekday.get(weekday) || []);
          const candidate = weekdaySlots.find((slot) => !usedDates.has(slot.date));
          if (!candidate) continue;
          const signature = `${candidate.date}#${candidate.time}`;
          if (usedSignatures.has(signature)) continue;
          selected.push(candidate);
          usedSignatures.add(signature);
          usedDates.add(candidate.date);
        }

        // Passo 2: completa com sorteio geral, evitando repetir o mesmo slot
        if (selected.length < targetCount) {
          const shuffledPool = shuffle(pool);
          for (const slot of shuffledPool) {
            if (selected.length >= targetCount) break;
            const signature = `${slot.date}#${slot.time}`;
            if (usedSignatures.has(signature)) continue;
            selected.push(slot);
            usedSignatures.add(signature);
          }
        }

        return selected.slice(0, targetCount);
      };

      const results = await Promise.all(
        context.therapies.map(async (therapy) => {
          const weeklyFrequency = Math.max(1, Number(therapy.weeklyFrequency) || 1);
          const existingBase = options?.existingSlotsByTherapy?.[therapy.pitTherapyId] || [];
          const existingSignatures = Array.from(new Set(
            existingBase
              .filter((slot) => slot?.date && slot?.time)
              .map((slot) => `${slot.date}#${slot.time}`),
          ));
          const existingWeeklySignatures = buildWeeklySlotSignatures(existingBase);
          const previousWeeklyFrequency = Math.max(0, Number(therapy?.previousWeeklyFrequency || 0));
          const baselineReserved = String(therapy?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE'
            ? Math.max(existingWeeklySignatures.length, previousWeeklyFrequency)
            : existingWeeklySignatures.length;
          const missingWeeklySlots = Math.max(0, weeklyFrequency - baselineReserved);

          if (missingWeeklySlots <= 0) {
            return {
              pitTherapyId: therapy.pitTherapyId,
              list: [] as Array<{ date: string; time: string }>,
            };
          }

          const suggestionLimit = Math.max(90, Math.min(240, weeklyFrequency * 40));
          const previousTried = triedSlotsByTherapyId[therapy.pitTherapyId] || [];
          const exclude = Array.from(new Set([
            ...(excludeSlotsByTherapy[therapy.pitTherapyId] || []),
            ...previousTried,
            ...existingSignatures,
          ]));
          const data: any = await teaPreReservationService.getSuggestions(therapy.pitTherapyId, {
            daysAhead: options?.daysAhead || 90,
            limit: suggestionLimit,
            exclude,
          });

          const rawList: Array<{ date: string; time: string }> = Array.isArray(data?.items) ? data.items : [];
          const sortedList: Array<{ date: string; time: string }> = rawList
            .sort((a, b) => {
              const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
              if (dateDiff !== 0) return dateDiff;
              return String(a.time).localeCompare(String(b.time));
            });
          const list = pickBestSuggestions(sortedList, missingWeeklySlots, therapy);
          return {
            pitTherapyId: therapy.pitTherapyId,
            list,
          };
        }),
      );

      const nextByTherapyId: Record<string, Array<{ date: string; time: string }>> = {};
      results.forEach((result) => {
        nextByTherapyId[result.pitTherapyId] = result.list.filter(
          (slot, idx, arr) => arr.findIndex((it) => it.date === slot.date && it.time === slot.time) === idx,
        );
      });

      const hasAnySuggestion = Object.values(nextByTherapyId).some((slots) => slots.length > 0);
      if (!hasAnySuggestion) {
        showNotification({
          title: 'Sem disponibilidade',
          message: 'Nenhum horário livre encontrado para as terapias deste PIT',
          color: 'yellow',
        });
        return;
      }

      setSuggestionsByTherapyId((prev) => ({ ...prev, ...nextByTherapyId }));
      setTriedSlotsByTherapyId((prev) => {
        const next = { ...prev };
        Object.entries(nextByTherapyId).forEach(([therapyId, slots]) => {
          const signatures = slots.map((slot) => `${slot.date}#${slot.time}`);
          const current = next[therapyId] || [];
          next[therapyId] = Array.from(new Set([...current, ...signatures]));
        });
        return next;
      });
      setSuggestionModalContext(context);
      setSuggestionModalOpened(true);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao sugerir horários',
        color: 'red',
      });
    } finally {
      setLoadingSuggestionsId(null);
    }
  };

  const clearSuggestionsForContext = (context: SuggestionGroupContext | null) => {
    if (!context) return;
    setSuggestionsByTherapyId((prev) => {
      const next = { ...prev };
      context.therapies.forEach((therapy) => {
        next[therapy.pitTherapyId] = [];
      });
      return next;
    });
    setTriedSlotsByTherapyId((prev) => {
      const next = { ...prev };
      context.therapies.forEach((therapy) => {
        delete next[therapy.pitTherapyId];
      });
      return next;
    });
  };

  const handleRejectSuggestions = (context: SuggestionGroupContext) => {
    clearSuggestionsForContext(context);
    setSuggestionModalOpened(false);
    setSuggestionModalContext(null);
    showNotification({ title: 'Sugestão descartada', message: 'Grade automática removida', color: 'gray' });
  };

  const handleTryAnotherSuggestions = async (context: SuggestionGroupContext) => {
    const excludeSlotsByTherapy = context.therapies.reduce((acc, therapy) => {
      const currentSlots = suggestionsByTherapyId[therapy.pitTherapyId] || [];
      acc[therapy.pitTherapyId] = currentSlots.map((slot) => `${slot.date}#${slot.time}`);
      return acc;
    }, {} as Record<string, string[]>);

    await handleLoadGroupSuggestions(context, {
      excludeSlotsByTherapy,
      daysAhead: 90,
    });
  };

  const handleAcceptSuggestions = async (
    context: SuggestionGroupContext,
    options?: { startDateOverride?: string; targetStatus?: TeaPreReservationStatus },
  ) => {
    let startDate = options?.startDateOverride || acceptModalStartDate;
    // Novo: montar todos os horários marcados pelo usuário para cada terapia selecionada
    const therapiesWithSlots = context.therapies
      .filter((therapy) => selectedSuggestionByTherapyId[therapy.pitTherapyId] !== false)
      .map((therapy) => {
        const override = acceptDateByTherapy[therapy.pitTherapyId] || startDate;
        // Pega todos os slots marcados para a terapia, não só os sugeridos automaticamente
        const slotsToApply = (suggestionsByTherapyId[therapy.pitTherapyId] || [])
          .filter((slot) => !override || !dayjs(slot.date).isBefore(dayjs(override), 'day'));
        return {
          therapy,
          slotsToApply,
        };
      })
      .filter((item) => item.slotsToApply.length > 0);

    if (therapiesWithSlots.length === 0) {
      showNotification({ title: 'Atenção', message: 'Gere sugestões antes de aceitar', color: 'yellow' });
      return;
    }

    if (!startDate) {
      const allSuggestedDates = therapiesWithSlots
        .flatMap((entry) => entry.slotsToApply.map((slot) => slot.date))
        .filter(Boolean)
        .sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());
      startDate = allSuggestedDates[0] || dayjs().format('YYYY-MM-DD');
    }

    try {
      const validations = await Promise.all(
        therapiesWithSlots.map(async (entry) => {
          const data: any = await teaPreReservationService.validateWeekly({
            pitTherapyId: entry.therapy.pitTherapyId,
            suggestions: entry.slotsToApply,
          });

          const weeks = Array.isArray(data?.weeks) ? data.weeks : [];
          const missingWeeks = weeks.filter((w: any) => Number(w?.missing || 0) > 0).length;
          const exceedsWeeks = weeks.filter((w: any) => Number(w?.exceeds || 0) > 0).length;
          const missingSlots = weeks.reduce((sum: number, w: any) => sum + Number(w?.missing || 0), 0);
          const exceedsSlots = weeks.reduce((sum: number, w: any) => sum + Number(w?.exceeds || 0), 0);

          return {
            pitTherapyId: entry.therapy.pitTherapyId,
            valid: Boolean(data?.valid),
            missingWeeks,
            exceedsWeeks,
            missingSlots,
            exceedsSlots,
          };
        }),
      );

      const nextValidationMap = validations.reduce((acc, item) => {
        acc[item.pitTherapyId] = {
          valid: item.valid,
          missingWeeks: item.missingWeeks,
          exceedsWeeks: item.exceedsWeeks,
          missingSlots: item.missingSlots,
          exceedsSlots: item.exceedsSlots,
        };
        return acc;
      }, {} as Record<string, { valid: boolean; missingWeeks: number; exceedsWeeks: number; missingSlots: number; exceedsSlots: number }>);

      setWeeklyValidationByTherapyId(nextValidationMap);

      const hasInvalid = validations.some((item) => !item.valid);
      if (hasInvalid) {
        showNotification({
          title: 'Validação semanal pendente',
          message: 'Algumas terapias não batem frequência semanal do PIT. Ajuste seleção parcial ou regerar.',
          color: 'yellow',
        });
        return;
      }
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao validar frequência semanal',
        color: 'red',
      });
      return;
    }


    setUpdatingId(context.groupKey);
    try {
      const payloadItems = therapiesWithSlots.flatMap((entry) => (
        entry.slotsToApply.map((slot) => ({
          pitTherapyId: entry.therapy.pitTherapyId,
          suggestedDate: slot.date,
          suggestedTime: slot.time,
          durationMinutes: entry.therapy.durationMinutes || null,
        }))
      ));
      const weeks = getWeeksUntilYearEnd(payloadItems[0]?.suggestedDate);

      const acceptResult: any = await teaPreReservationService.acceptGroup({
        recurring: true,
        recurrenceWeeks: weeks,
        recurringUntilDate,
        expiresAt: dayjs().add(2, 'day').toISOString(),
        status: options?.targetStatus || 'PENDING_AUTHORIZATION',
        items: payloadItems,
      });

      const totalSentPerWeek = therapiesWithSlots.reduce((acc, entry) => acc + entry.slotsToApply.length, 0);
      const totalCreated = Number.isFinite(Number(acceptResult?.totalCreated))
        ? Number(acceptResult.totalCreated)
        : 0;
      const skippedConflicts = Number.isFinite(Number(acceptResult?.skippedConflicts))
        ? Number(acceptResult.skippedConflicts)
        : 0;
      const createdLabel = totalCreated > 0 ? `${totalCreated} horário(s) criado(s)` : 'nenhum horário criado';
      const conflictLabel = skippedConflicts > 0 ? ` • ${skippedConflicts} conflito(s) ignorado(s)` : '';

      showNotification({
        title: 'Sucesso',
        message: `Grade PIT aceita: ${createdLabel}${conflictLabel} (recorrência até ${recurringUntilLabel}, base ${totalSentPerWeek} horário(s)/semana)`,
        color: 'green',
      });

      clearSuggestionsForContext(context);
      setSuggestionModalOpened(false);
      // setRejectDecisionOpened(false);
      setSuggestionModalContext(null);
      await loadPending();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao aceitar sugestão automática',
        color: 'red',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConvertGroupToAppointment = async () => {
    const reservationIds = conversionReservationIds;
    if (!Array.isArray(reservationIds) || reservationIds.length === 0) return;

    const startDateByReservationId = checklistGroupReservations.reduce((acc, reservation) => {
      const reservationId = String(reservation?.preReservationId || '');
      const pitTherapyId = String(reservation?.pitTherapyId || '');
      if (!reservationId || !pitTherapyId) return acc;
      const selectedDate = acceptDateByTherapy[pitTherapyId];
      if (selectedDate) acc[reservationId] = selectedDate;
      return acc;
    }, {} as Record<string, string>);


    setUpdatingId(checklistGroupKey || reservationIds[0]);
    try {
      const results = await Promise.allSettled(
        reservationIds.map((reservationId) => teaPreReservationService.convertToAppointment(reservationId, {
          convertSeries: true,
          seriesStartDate: startDateByReservationId[reservationId],
        })),
      );

      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        await loadPending();
      }

      if (failCount === 0) {
        showNotification({
          title: 'Sucesso',
          message: `Conversão em lote concluída (${successCount} terapia(s))`,
          color: 'green',
        });
      } else {
        showNotification({
          title: 'Conversão parcial',
          message: `Convertidas: ${successCount} • Falhas: ${failCount}`,
          color: 'yellow',
        });
      }

      setChecklistModalOpened(false);
      setConversionReservationIds([]);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Falha ao converter PIT em lote',
        color: 'red',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  
  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      {/* Conteúdo principal e modais */}
      <Modal
        opened={suggestionModalOpened}
        onClose={() => {
          setSuggestionModalOpened(false);
          setRejectDecisionOpened(false);
          setAcceptSuggestionDecisionOpened(false);
          setSuggestionModalContext(null);
        }}
        title="Calendário da sugestão automática"
        centered
        size="92vw"
        zIndex={400}
        withinPortal
        styles={{
          content: {
            minHeight: '82vh',
            maxHeight: '92vh',
          },
          body: {
            maxHeight: 'calc(92vh - 70px)',
            overflowY: 'auto',
          },
        }}
      >
        <Stack gap="sm">
          <Text size="sm" fw={600}>{suggestionModalContext?.patientName || 'Paciente'}</Text>
          <Text size="xs" c="dimmed">
            Terapias do PIT: {suggestionModalContext?.therapies.length || 0}
            {suggestionModalContext?.patientCpf ? ` • CPF: ${formatCPF(suggestionModalContext.patientCpf)}` : ''}
          </Text>
          <Text size="xs" c="dimmed">
            Recorrência semanal até {recurringUntilLabel}
          </Text>

          <Text size="sm" fw={600}>Distribuição semanal sugerida</Text>

          {modalSuggestions.length === 0 ? (
            <Text size="sm" c="dimmed">Sem horários sugeridos para visualização.</Text>
          ) : (
            <>
              <Box style={{ overflowX: 'auto' }}>
                <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 8, minWidth: isMobile ? 840 : 'auto' }}>
                  {weeklyCalendarSuggestions.map((dayBlock) => (
                    <Paper key={dayBlock.date} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                      <Stack gap={6}>
                        <Text size="xs" fw={700}>{dayBlock.label}</Text>
                        {dayBlock.entries.length === 0 ? (
                          <Text size="xs" c="dimmed">—</Text>
                        ) : (
                          <Stack gap={4}>
                            {dayBlock.entries.map((entry) => {
                              const isTherapySelected = selectedSuggestionByTherapyId[entry.pitTherapyId] !== false;
                              const colorToken = therapyColorById[entry.pitTherapyId] || THERAPY_COLOR_TOKENS[0];
                              return (
                                <Paper
                                  key={`${dayBlock.date}-${entry.pitTherapyId}-${entry.time}`}
                                  p={6}
                                  withBorder
                                  style={{
                                    borderColor: isTherapySelected
                                      ? colorToken.borderColor
                                      : 'var(--mantine-color-default-border)',
                                    backgroundColor: isTherapySelected ? colorToken.backgroundColor : undefined,
                                    opacity: isTherapySelected ? 1 : 0.45,
                                  }}
                                >
                                  <Group gap={6} wrap="nowrap" align="center">
                                    <Box
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 999,
                                        backgroundColor: colorToken.accentColor,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <Text size="xs" fw={700}>{entry.time}</Text>
                                  </Group>
                                  <Text size="xs" c="dimmed" lineClamp={2}>{entry.procedureName}</Text>
                                </Paper>
                              );
                            })}
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              </Box>

              <Divider label="Seleção por terapia" labelPosition="left" />

              <Stack gap={6}>
                {suggestionModalContext?.therapies.map((therapy) => {
                  const slots = suggestionsByTherapyId[therapy.pitTherapyId] || [];
                  const isSelected = selectedSuggestionByTherapyId[therapy.pitTherapyId] !== false;
                  const validation = weeklyValidationByTherapyId[therapy.pitTherapyId];
                  const isRegenerating = loadingSuggestionsId === therapy.pitTherapyId;
                  const colorToken = therapyColorById[therapy.pitTherapyId] || THERAPY_COLOR_TOKENS[0];

                  return (
                    <Paper
                      key={therapy.pitTherapyId}
                      p="xs"
                      withBorder
                      style={{
                        borderColor: validation && !validation.valid
                          ? 'var(--mantine-color-yellow-5)'
                          : isSelected
                            ? colorToken.borderColor
                            : 'var(--mantine-color-default-border)',
                        backgroundColor: isSelected ? colorToken.backgroundColor : undefined,
                        opacity: isSelected ? 1 : 0.6,
                      }}
                    >
                      <Group justify="space-between" wrap="wrap" gap="xs">
                        <Group gap="xs" style={{ flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              setSelectedSuggestionByTherapyId((prev) => ({
                                ...prev,
                                [therapy.pitTherapyId]: e.target.checked,
                              }))
                            }
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: colorToken.borderColor }}
                          />
                          <Stack gap={2}>
                            <Group gap={6} wrap="nowrap" align="center">
                              <Box
                                style={{
                                  width: 9,
                                  height: 9,
                                  borderRadius: 999,
                                  backgroundColor: colorToken.accentColor,
                                  flexShrink: 0,
                                }}
                              />
                              <Text size="xs" fw={600}>{therapy.procedureName}</Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {therapy.professionalName}
                              {slots.length > 0 ? ` • ${slots.length} horário(s)` : ' • sem sugestão'}
                            </Text>
                          </Stack>
                        </Group>
                        <Group gap="xs">
                          <Badge variant="outline" color={colorToken.badgeColor} size="sm">
                            Cor da terapia
                          </Badge>
                          {validation && (
                            <Badge variant="light" color={validation.valid ? 'teal' : 'yellow'} size="sm">
                              {validation.valid
                                ? 'Frequência OK'
                                : validation.missingSlots > 0
                                  ? `Faltam ${validation.missingSlots} horário(s)`
                                  : `Ajuste ${validation.exceedsSlots} horário(s)`}
                            </Badge>
                          )}
                          {therapy.weeklyFrequency && (
                            <Badge variant="outline" color="gray" size="sm">
                              {therapy.weeklyFrequency}x/sem
                            </Badge>
                          )}
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="orange"
                            loading={isRegenerating}
                            disabled={!suggestionModalContext}
                            leftSection={<RefreshCcw size={12} />}
                            onClick={async () => {
                              if (!suggestionModalContext) return;
                              const excludeSlots = slots.map((slot) => `${slot.date}#${slot.time}`);
                              await handleLoadGroupSuggestions(
                                { ...suggestionModalContext, therapies: [therapy] },
                                {
                                  excludeSlotsByTherapy: { [therapy.pitTherapyId]: excludeSlots },
                                  daysAhead: 90,
                                },
                              );
                            }}
                          >
                            Regerar
                          </Button>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            </>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                if (!suggestionModalContext) return;
                setRejectDecisionOpened(true);
              }}
              disabled={!suggestionModalContext?.groupKey || updatingId === suggestionModalContext?.groupKey}
            >
              Recusar sugestão
            </Button>
            <Button
              color="green"
              onClick={() => {
                if (!suggestionModalContext) return;
                setAcceptSuggestionDecisionOpened(true);
              }}
              loading={!!suggestionModalContext?.groupKey && updatingId === suggestionModalContext.groupKey}
              disabled={!suggestionModalContext?.groupKey || modalSuggestions.length === 0}
            >
              Aceitar sugestão
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={acceptSuggestionDecisionOpened}
        onClose={() => setAcceptSuggestionDecisionOpened(false)}
        title="Aceitar sugestão de reserva"
        centered
        size="md"
        zIndex={455}
        withinPortal
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Escolha como deseja seguir após aceitar os horários sugeridos.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => setAcceptSuggestionDecisionOpened(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="light"
              color="indigo"
              onClick={async () => {
                if (!suggestionModalContext) return;
                setAcceptSuggestionDecisionOpened(false);
                await handleAcceptSuggestions(suggestionModalContext, { targetStatus: 'RESERVED' });
              }}
              loading={!!suggestionModalContext?.groupKey && updatingId === suggestionModalContext.groupKey}
              disabled={!suggestionModalContext}
            >
              Apenas reservar
            </Button>
            <Button
              color="violet"
              onClick={async () => {
                if (!suggestionModalContext) return;
                setAcceptSuggestionDecisionOpened(false);
                await handleAcceptSuggestions(suggestionModalContext, { targetStatus: 'PROPOSED' });
              }}
              loading={!!suggestionModalContext?.groupKey && updatingId === suggestionModalContext.groupKey}
              disabled={!suggestionModalContext}
            >
              Reservar e enviar para aprovação
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={rejectDecisionOpened}
        onClose={() => setRejectDecisionOpened(false)}
        title="Recusar sugestão automática"
        centered
        size="md"
        zIndex={450}
        withinPortal
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Deseja cancelar esta sugestão ou tentar uma nova distribuição automática para todas as terapias do PIT?
          </Text>

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                if (!suggestionModalContext) return;
                setRejectDecisionOpened(false);
                handleRejectSuggestions(suggestionModalContext);
              }}
              disabled={!suggestionModalContext}
            >
              Cancelar sugestão
            </Button>
            <Button
              color="indigo"
              onClick={async () => {
                if (!suggestionModalContext) return;
                setRejectDecisionOpened(false);
                await handleTryAnotherSuggestions(suggestionModalContext);
              }}
              loading={!!suggestionModalContext?.groupKey && loadingSuggestionsId === suggestionModalContext.groupKey}
              disabled={!suggestionModalContext}
            >
              Tentar outra sugestão
            </Button>
          </Group>
        </Stack>
      </Modal>
      
      <Modal
        opened={acceptModalOpened}
        onClose={() => setAcceptModalOpened(false)}
        title={acceptModalMode === 'suggestion' ? 'Confirmação de aceitação' : 'Selecione data para agendamento'}
        centered
        size="xl"
        styles={{
          content: {
            width: 'min(96vw, 980px)',
            maxWidth: '980px',
          },
        }}
      >
        <Stack gap="sm">
          <Group gap="xs" align="center">
            <CalendarClock size={20} />
            <Text size="sm" fw={600}>Confirmar agendamento</Text>
          </Group>
          <Stack gap={6}>
            {acceptTherapies.map((entry) => {
              const allDates = Array.from(new Set(entry.slots.map((s) => s.date))).sort((a,b)=>dayjs(a).valueOf()-dayjs(b).valueOf());
              const dates = buildRecurringPreviewDates(allDates, 6);
              const timeByWeekday = new Map<number, string>();
              [...entry.slots]
                .sort((a, b) => {
                  const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
                  if (dateDiff !== 0) return dateDiff;
                  return String(a.time).localeCompare(String(b.time));
                })
                .forEach((slot) => {
                  const weekday = dayjs(slot.date).day();
                  if (!timeByWeekday.has(weekday)) {
                    timeByWeekday.set(weekday, String(slot.time || '09:00'));
                  }
                });
              const dateOptions = dates.map((d) => {
                const fallbackTime = entry.slots[0]?.time || '09:00';
                const labelTime = timeByWeekday.get(dayjs(d).day()) || fallbackTime;
                return {
                  value: d,
                  label: `${formatWeekdayPt(d)} • ${dayjs(d).format('DD/MM/YYYY')} • ${labelTime}`,
                };
              });
              const selectedDate = acceptDateByTherapy[entry.therapy.pitTherapyId] || dateOptions[0]?.value || '';
              
              // In conversion mode, use the actual marked slots for this therapy.
              // In suggestion mode, use resolved suggestions from the chosen start date.
              const selectedWeeklySlots = acceptModalMode === 'conversion'
                ? Array.from(
                    new Map(
                      [...entry.slots]
                        .filter((slot) => !selectedDate || !dayjs(slot.date).isBefore(dayjs(selectedDate), 'day'))
                        .sort((a, b) => {
                          const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
                          if (dateDiff !== 0) return dateDiff;
                          return String(a.time).localeCompare(String(b.time));
                        })
                        .map((slot) => {
                          const weekday = dayjs(slot.date).day();
                          return [`${weekday}#${slot.time}`, { date: slot.date, time: slot.time } as { date: string; time: string }];
                        }),
                    ).values(),
                  )
                : resolveTherapySlotsForAcceptance(entry.therapy, selectedDate);
              
              const weeks = getWeeksUntilYearEnd(selectedDate);
              const totalSessions = weeks * selectedWeeklySlots.length;

              return (
                <Paper key={entry.therapy.pitTherapyId} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-gray-4)' }}>
                  <Group align="center" gap="xs">
                    <CalendarClock size={16} />
                    <Text size="sm" fw={500}>{entry.therapy.procedureName}</Text>
                  </Group>
                  <Group gap="xs" mt="xs" align="center">
                    <Select
                      size="xs"
                      style={{ minWidth: 260 }}
                      data={dateOptions}
                      value={selectedDate}
                      onChange={(v) => {
                        if (!v) return;
                        setAcceptDateByTherapy((prev) => ({ ...prev, [entry.therapy.pitTherapyId]: v }));
                      }}
                    />
                    <Badge color="blue" variant="light" size="xs">{weeks} semana{weeks !== 1 ? 's' : ''}</Badge>
                    <Badge color="teal" variant="light" size="xs">{totalSessions} sess{totalSessions !== 1 ? 'ões' : 'ão'} (estimado)</Badge>
                  </Group>
                  {acceptModalMode === 'suggestion' && (
                    <Text size="xs" c="dimmed" mt={6}>
                      Sessões na semana: {selectedWeeklySlots.map((slot) => `${formatWeekdayPt(slot.date)} ${slot.time}`).join(' • ')}
                    </Text>
                  )}
                </Paper>
              );
            })}
          </Stack>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAcceptModalOpened(false)}>
              Cancelar
            </Button>
            <Button
              color="green"
              onClick={async () => {
                setAcceptModalOpened(false);
                if (acceptModalMode === 'suggestion') {
                  if (!suggestionModalContext) return;
                  setAcceptSuggestionDecisionOpened(true);
                } else if (acceptModalMode === 'conversion') {
                  if (conversionReservationIds.length === 0 || checklistItems.length === 0) {
                    showNotification({
                      title: 'Checklist pendente',
                      message: 'Selecione um procedimento válido para conversão.',
                      color: 'yellow',
                    });
                    return;
                  }
                  setUpdatingId(checklistGroupKey || conversionReservationIds[0]);
                  await handleConvertGroupToAppointment();
                }
              }}
              loading={!!updatingId}
            >
              {acceptModalMode === 'suggestion' ? 'Aceitar sugestão' : 'Converter em agendamento'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={manualModalOpened}
        onClose={() => {
          setManualModalOpened(false);
          setManualAcceptDecisionOpened(false);
          setManualReservationDecisionState(null);
        }}
        title="Proposta manual em calendário"
        centered
        size="96vw"
        withinPortal
        styles={{
          content: {
            minHeight: '84vh',
            maxHeight: '94vh',
          },
          body: {
            maxHeight: 'calc(94vh - 70px)',
            overflowY: 'auto',
          },
        }}
      >
        <Stack gap="sm">
          <Text size="sm" fw={600}>{manualContext?.patientName || 'Paciente'}</Text>
          <Text size="xs" c="dimmed">
            {manualContext?.patientCpf ? `CPF: ${formatCPF(manualContext.patientCpf)} • ` : ''}
            Selecione uma terapia, clique em um horário livre e confirme.
          </Text>

          <Group grow align="flex-end">
            <Select
              label="Terapia para preencher"
              data={manualTherapyOptions}
              value={manualSelectedTherapyId}
              onChange={(value) => {
                setManualSelectedTherapyId(value);
                setManualSelectedSlots([]);
              }}
            />
          </Group>

          {manualLoadingGrid ? (
            <Group justify="center"><Loader size="sm" /></Group>
          ) : manualTimeRows.length === 0 ? (
            <Text size="sm" c="dimmed">Sem horários disponíveis para esta semana.</Text>
          ) : (
            <Box style={{ overflowX: 'auto' }}>
              <Box style={{ minWidth: 860, display: 'grid', gridTemplateColumns: '86px repeat(7, minmax(96px, 1fr))', columnGap: 6, rowGap: 2 }}>
                <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                  <Text size="xs" fw={700}>Horário</Text>
                </Paper>
                {manualWeekDays.map((day) => (
                  <Paper key={`head-${day.date}`} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                    <Text size="xs" fw={700}>
                      {day.weekday ? String(day.weekday).slice(0, 3) : formatWeekdayPt(day.date).slice(0, 3)}
                    </Text>
                  </Paper>
                ))}

                {manualTimeRows.map((time) => (
                  <>
                    <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                      <Text size="xs" fw={600}>{time}</Text>
                    </Paper>
                    {manualWeekDays.map((day) => {
                      const slot = day.slots.find((item) => item.time === time);
                      const selectedDurationMinutes = Math.max(1, Number(manualSelectedTherapy?.durationMinutes || 30));
                      const isSelected = manualSelectedSlots.some(
                        (selected) => selected.date === day.date
                          && isSlotCoveredBySession(day.slots, selected.time, time, selectedDurationMinutes),
                      );
                      const isOccupied = !!slot?.occupied;
                      const isSelectable = !!slot?.selectable;
                      const isBlockedBySelectedSession = manualSelectedSlots.some((selected) => {
                        if (selected.date !== day.date) return false;
                        const startMinutes = timeToMinutes(selected.time);
                        const endMinutes = startMinutes + selectedDurationMinutes;
                        const currentMinutes = timeToMinutes(time);
                        // Keep only covered slots blocked; free the exact end boundary slot.
                        return currentMinutes > startMinutes && currentMinutes < endMinutes;
                      });
                      const isExistingEditableSlot = !!manualSelectedTherapyId && (
                        manualEditableExistingSlotsByTherapyId[manualSelectedTherapyId] || []
                      ).some((selected) => selected.date === day.date && selected.time === time);
                      const canToggleExistingSlot = isExistingEditableSlot;
                      const effectiveSelectable = (isSelectable || canToggleExistingSlot) && !isBlockedBySelectedSession;
                      const reachedWeeklyLimit = manualSelectedSessionCount >= manualWeeklyLimit;
                      const canAddNewSelection = !reachedWeeklyLimit || isSelected;
                      const isFree = !isOccupied && effectiveSelectable && day.enabled;
                      const isUnavailable = !isOccupied && !isSelectable;
                      const isBlocked = !isOccupied && isBlockedBySelectedSession;
                      const stateLabel = isSelected
                        ? 'Selecionado'
                        : isOccupied
                          ? 'Ocupado'
                          : isBlocked
                            ? 'Bloqueado pela sessão selecionada'
                          : isFree
                            ? 'Livre'
                            : 'Indisponível';
                      const dayLabel = day.weekday || formatWeekdayPt(day.date) || dayjs(day.date).format('ddd');

                      return (
                        <Button
                          key={`${day.date}-${time}`}
                          size="compact-xs"
                          variant="filled"
                          disabled={!effectiveSelectable || !manualSelectedTherapyId || !canAddNewSelection}
                          title={`${dayLabel} ${time} • ${stateLabel}`}
                          aria-label={`${dayLabel} ${time} • ${stateLabel}`}
                          onClick={() => {
                            if (!effectiveSelectable) return;
                            const sortedDaySlots = [...day.slots]
                              .filter((item) => !!item.time)
                              .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
                            const startIndex = sortedDaySlots.findIndex((item) => item.time === time);
                            if (startIndex < 0) return;

                            const positiveDiffs: number[] = [];
                            for (let i = 0; i < sortedDaySlots.length - 1; i += 1) {
                              const diff = timeToMinutes(sortedDaySlots[i + 1].time) - timeToMinutes(sortedDaySlots[i].time);
                              if (diff > 0) positiveDiffs.push(diff);
                            }
                            const baseStep = positiveDiffs.length > 0 ? Math.min(...positiveDiffs) : 30;

                            let coveredMinutes = 0;
                            const rangeSlots: Array<{ date: string; time: string }> = [];

                            for (let i = startIndex; i < sortedDaySlots.length; i += 1) {
                              const candidate = sortedDaySlots[i];
                              const candidateIsExistingEditable = !!manualSelectedTherapyId && (
                                manualEditableExistingSlotsByTherapyId[manualSelectedTherapyId] || []
                              ).some((selected) => selected.date === day.date && selected.time === candidate.time);
                              const candidateSelectable = candidate.selectable || candidateIsExistingEditable;
                              if ((candidate.occupied && !candidateIsExistingEditable) || !candidateSelectable) {
                                break;
                              }

                              rangeSlots.push({ date: day.date, time: candidate.time });

                              const nextSlot = sortedDaySlots[i + 1];
                              const candidateDuration = nextSlot
                                ? Math.max(baseStep, timeToMinutes(nextSlot.time) - timeToMinutes(candidate.time))
                                : baseStep;
                              coveredMinutes += candidateDuration;

                              if (coveredMinutes >= selectedDurationMinutes) {
                                break;
                              }
                            }

                            if (coveredMinutes < selectedDurationMinutes) {
                              showNotification({
                                title: 'Sem faixa contínua',
                                message: 'Não há blocos livres suficientes em sequência para essa duração.',
                                color: 'yellow',
                              });
                              return;
                            }

                            setManualSelectedSlots((prev) => {
                              const toSignature = (slotItem: { date: string; time: string }) => `${slotItem.date}#${slotItem.time}`;
                              const anchorSlot = { date: day.date, time };
                              const anchorSignature = toSignature(anchorSlot);
                              const prevSignatureSet = new Set(prev.map(toSignature));

                              const coveredAnchor = prev.find((slotItem) => (
                                slotItem.date === day.date
                                && isSlotCoveredBySession(day.slots, slotItem.time, time, selectedDurationMinutes)
                              ));
                              if (coveredAnchor) {
                                const coveredAnchorSignature = toSignature(coveredAnchor);
                                return prev.filter((slotItem) => toSignature(slotItem) !== coveredAnchorSignature);
                              }

                              // Toggle behavior: clicking an already selected start slot removes it.
                              if (prevSignatureSet.has(anchorSignature)) {
                                return prev.filter((slotItem) => toSignature(slotItem) !== anchorSignature);
                              }

                              const anchorStartMinutes = timeToMinutes(anchorSlot.time);
                              const anchorEndMinutes = anchorStartMinutes + selectedDurationMinutes;
                              const hasOverlap = prev.some((slotItem) => {
                                if (slotItem.date !== anchorSlot.date) return false;
                                const existingStartMinutes = timeToMinutes(slotItem.time);
                                const existingEndMinutes = existingStartMinutes + selectedDurationMinutes;
                                return anchorStartMinutes < existingEndMinutes && anchorEndMinutes > existingStartMinutes;
                              });

                              if (hasOverlap) {
                                showNotification({
                                  title: 'Conflito de horário',
                                  message: 'Este horário se sobrepõe a uma sessão já selecionada para esta terapia.',
                                  color: 'yellow',
                                });
                                return prev;
                              }

                              const merged = [...prev, anchorSlot];

                              const normalizedMerged = merged.sort((a, b) => {
                                const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
                                if (dateDiff !== 0) return dateDiff;
                                return timeToMinutes(a.time) - timeToMinutes(b.time);
                              });

                              const maxWeeklySessions = Math.max(1, Number(manualSelectedTherapy?.weeklyFrequency || 1));
                              const selectedSessions = normalizedMerged.length;
                              if (selectedSessions > maxWeeklySessions) {
                                showNotification({
                                  title: 'Limite semanal atingido',
                                  message: `Essa terapia permite ${maxWeeklySessions} marcação(ões) por semana no PIT.`,
                                  color: 'yellow',
                                });
                                return prev;
                              }

                              return normalizedMerged;
                            });
                          }}
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            height: 28,
                            minHeight: 28,
                            paddingInline: 4,
                            border: isUnavailable
                                ? '1px dashed var(--mantine-color-default-border)'
                                : '1px solid transparent',
                            backgroundColor: isSelected
                              ? 'var(--mantine-color-green-6)'
                              : isOccupied
                                ? 'var(--mantine-color-gray-7)'
                                : isFree
                                  ? 'rgba(74, 104, 255, 0.30)'
                                  : 'transparent',
                            color: isSelected
                              ? 'var(--mantine-color-white)'
                              : isOccupied
                                ? 'var(--mantine-color-gray-4)'
                                : 'var(--mantine-color-blue-2)',
                            opacity: isOccupied ? 0.85 : 1,
                          }}
                        >
                          {isSelected ? '●' : isFree ? '•' : isOccupied ? '•' : ''}
                        </Button>
                      );
                    })}
                  </>
                ))}
              </Box>
            </Box>
          )}

          <Group justify="space-between" wrap="wrap">
            <Group gap="xs">
              <Badge color="gray" variant="light">Ocupado</Badge>
              <Badge color="indigo" variant="light">Livre</Badge>
              <Badge color="green" variant="filled">Selecionado</Badge>
              <Badge color={manualSelectionComplete ? 'teal' : 'yellow'} variant="light">
                Selecionado: {manualSelectedSessionCount}/{manualWeeklyLimit} por semana
              </Badge>
            </Group>
            <Group gap="xs">
              <Button
                variant="default"
                onClick={() => setManualSelectedSlots([])}
                disabled={manualSelectedSlots.length === 0 || manualSaving}
              >
                Limpar seleção
              </Button>
              <Button
                color="green"
                onClick={handleManualConfirmReservation}
                loading={manualSaving}
                disabled={!manualSelectedTherapyId || manualSelectedSlots.length === 0 || manualSaving}
              >
                Confirmar reserva manual
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={manualAcceptDecisionOpened}
        onClose={() => setManualAcceptDecisionOpened(false)}
        title="Confirmar proposta manual"
        centered
        size="md"
        zIndex={455}
        withinPortal
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Escolha como deseja seguir após confirmar os horários da proposta manual.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => setManualAcceptDecisionOpened(false)}
              disabled={manualSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="light"
              color="indigo"
              onClick={async () => {
                await handleSubmitManualReservation('RESERVED');
              }}
              loading={manualSaving}
              disabled={!manualReservationDecisionState || manualSaving}
            >
              Apenas reservar
            </Button>
            <Button
              color="violet"
              onClick={async () => {
                await handleSubmitManualReservation('PROPOSED');
              }}
              loading={manualSaving}
              disabled={!manualReservationDecisionState || manualSaving}
            >
              Reservar e enviar para aprovação
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={timelineModalOpened}
        onClose={() => setTimelineModalOpened(false)}
        title={`Timeline • ${timelineReservationLabel || 'Pré-reserva'}`}
        centered
        size="lg"
      >
        <Stack gap="sm">
          {timelineLoading ? (
            <Group justify="center"><Loader size="sm" /></Group>
          ) : timelineEvents.length === 0 ? (
            <Text size="sm" c="dimmed">Sem eventos registrados para esta pré-reserva.</Text>
          ) : (
            timelineEvents.map((event) => (
              <Paper key={event.id} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Stack gap={4}>
                  <Group justify="space-between" wrap="wrap">
                    <Text size="sm" fw={600}>{event.eventLabel || event.eventType}</Text>
                    <Text size="xs" c="dimmed">{dayjs(event.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">Ator: {event.actor || 'SYSTEM'}</Text>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Modal>

      <Modal
        opened={deletePitConfirmModalOpened}
        onClose={() => {
          if (updatingId) return;
          setDeletePitConfirmModalOpened(false);
          setDeletePitTarget(null);
        }}
        title="Excluir PIT"
        centered
        size="md"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Deseja realmente excluir este PIT? As pré-reservas abertas vinculadas a ele serão canceladas.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => {
                setDeletePitConfirmModalOpened(false);
                setDeletePitTarget(null);
              }}
              disabled={!!updatingId}
            >
              Voltar
            </Button>
            <Button
              color="red"
              onClick={confirmDeletePit}
              loading={!!updatingId && !!deletePitTarget && updatingId === deletePitTarget.groupKey}
            >
              Confirmar exclusão
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(bulkStatusActionState)}
        onClose={() => {
          if (updatingId) return;
          setBulkStatusActionState(null);
          setBulkStatusSelectedReservationIds([]);
        }}
        title={bulkStatusActionState?.title || 'Selecionar terapias'}
        centered
        size="md"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {bulkStatusActionState
              ? `Selecione uma ou mais terapias de ${bulkStatusActionState.patientName} para aplicar a ação.`
              : 'Selecione uma ou mais terapias para continuar.'}
          </Text>

          {bulkStatusActionState?.options.map((option) => {
            const isChecked = bulkStatusSelectedReservationIds.includes(option.reservationId);
            return (
              <Paper key={option.reservationId} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Group justify="space-between" align="center" wrap="wrap">
                  <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const nextChecked = e.currentTarget.checked;
                        setBulkStatusSelectedReservationIds((prev) => {
                          if (nextChecked) return Array.from(new Set([...prev, option.reservationId]));
                          return prev.filter((id) => id !== option.reservationId);
                        });
                      }}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600} lineClamp={1}>{option.procedureName}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{option.professionalName}</Text>
                    </Stack>
                  </Group>
                </Group>
              </Paper>
            );
          })}

          <Group justify="space-between" wrap="wrap">
            <Group gap="xs">
              <Button
                size="xs"
                variant="default"
                onClick={() => setBulkStatusSelectedReservationIds(bulkStatusActionState?.options.map((option) => option.reservationId) || [])}
                disabled={!bulkStatusActionState?.options.length || !!updatingId}
              >
                Selecionar todas
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setBulkStatusSelectedReservationIds([])}
                disabled={bulkStatusSelectedReservationIds.length === 0 || !!updatingId}
              >
                Limpar
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              Selecionadas: {bulkStatusSelectedReservationIds.length}
            </Text>
          </Group>

          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => {
                setBulkStatusActionState(null);
                setBulkStatusSelectedReservationIds([]);
              }}
              disabled={!!updatingId}
            >
              Cancelar
            </Button>
            <Button
              color="indigo"
              onClick={confirmBulkStatusAction}
              loading={!!bulkStatusActionState?.groupKey && updatingId === bulkStatusActionState.groupKey}
              disabled={bulkStatusSelectedReservationIds.length === 0}
            >
              Confirmar ação
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={checklistModalOpened}
        onClose={() => setChecklistModalOpened(false)}
        title={`Checklist pré-conversão • ${checklistGroupLabel || 'PIT'}`}
        centered
        size="md"
      >
        <Stack gap="sm">
          {checklistLoading ? (
            <Group justify="center"><Loader size="sm" /></Group>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                Valide os itens de todas as terapias do PIT antes da conversão em lote.
              </Text>
              <Select
                label="Procedimento do PIT"
                placeholder="Selecione um procedimento"
                data={checklistProcedureOptions.map((procedure) => ({ value: procedure, label: procedure }))}
                value={selectedChecklistProcedure}
                onChange={setSelectedChecklistProcedure}
                allowDeselect={false}
              />
              {(() => {
                const selectedItems = checklistItems.filter(
                  (item) => (item.procedureName || 'Procedimento não definido') === selectedChecklistProcedure,
                );
                if (!selectedChecklistProcedure) {
                  return <Text size="sm" c="dimmed">Selecione um procedimento para visualizar o checklist.</Text>;
                }
                if (selectedItems.length === 0) {
                  return <Text size="sm" c="dimmed">Sem itens de checklist para este procedimento.</Text>;
                }

                const pendingCount = selectedItems.filter((item) => !item.valid).length;
                return (
                  <Stack gap={4}>
                    <Group justify="space-between" wrap="wrap">
                      <Text fw={600}>{selectedChecklistProcedure}</Text>
                      <Badge variant="light" color={pendingCount === 0 ? 'teal' : 'yellow'}>
                        {pendingCount === 0 ? 'Checklist OK' : `${pendingCount} pendência(s)`}
                      </Badge>
                    </Group>
                    {selectedItems.map((item) => (
                      <Paper key={item.key} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                        <Group justify="space-between" align="center" wrap="wrap">
                          <Text size="sm">{item.label}</Text>
                          <Badge color={item.valid ? 'teal' : 'red'} variant="light">
                            {item.valid ? 'OK' : 'Pendente'}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">{item.message}</Text>
                      </Paper>
                    ))}
                  </Stack>
                );
              })()}
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setChecklistModalOpened(false)}>
                  Fechar
                </Button>
                <Button
                  color="green"
                  disabled={!checklistCanConvertSelectedProcedure}
                  loading={!!checklistGroupKey && updatingId === checklistGroupKey}
                  onClick={() => openConversionConfirmationModal(checklistConvertibleSelectedReservations)}
                >
                  {`Finalizar Agendamento${checklistCanConvertSelectedProcedure ? ` (${checklistConvertibleSelectedReservations.length})` : ''}`}
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={14}>
          <Button variant="subtle" color="dark" leftSection={<ChevronLeft size={18} />} onClick={() => navigate('/tea')}>
            Voltar
          </Button>
          <Box>
            <Text fw={700} size="lg" style={{ color: 'var(--mantine-color-text)' }}>Pré-reserva TEA</Text>
            <Text size="sm" c="dimmed">Pendências de marcação com base no PIT</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="md">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="xs">
                <CalendarClock size={18} />
                <Text fw={700}>Painel de pendências</Text>
              </Group>
              <Group gap="xs">
                <ActionIcon variant="light" color="indigo" onClick={loadPending} title="Atualizar">
                  <RefreshCcw size={14} />
                </ActionIcon>
              </Group>
            </Group>

            <Text size="xs" c="dimmed">
              A aceitação automática agora usa recorrência semanal por padrão até {recurringUntilLabel}.
            </Text>

            <Group grow>
              <TextInput
                placeholder="Buscar por paciente, CPF, procedimento ou médico"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
            </Group>

            <Group gap="xs">
              {summaryBadgeDefinitions.map((badge) => {
                const isActive = badgeFilter === badge.key;
                return (
                  <Badge
                    key={badge.key}
                    variant={isActive ? 'filled' : 'light'}
                    color={badge.color}
                    component="button"
                    type="button"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleBadgeClick(badge.key, badge.status)}
                  >
                    {badge.label}
                  </Badge>
                );
              })}
            </Group>

            <Group gap="xs">
              <Button
                size="xs"
                color="indigo"
                variant={activeTab === 'pendencias' ? 'filled' : 'outline'}
                onClick={() => setActiveTab('pendencias')}
              >
                Pendências
              </Button>
              <Button
                size="xs"
                color="teal"
                variant={activeTab === 'concluidas' ? 'filled' : 'outline'}
                onClick={() => setActiveTab('concluidas')}
              >
                Concluídas
              </Button>
            </Group>

            <Divider />

            {loading ? (
              <Group justify="center"><Loader size="sm" /></Group>
            ) : activeTab === 'pendencias' ? (
              (() => {
                const hasPendingContent = pendingGroups.length > 0 || actionableExistingReservationGroupsWithoutPending.length > 0;
                if (!hasPendingContent) {
                  return <Text size="sm" c="dimmed">Nenhuma pendência encontrada.</Text>;
                }

                return (
                  <Stack gap="xs">
                    {pendingGroups.map((group) => {
                      const existingGroupForSamePit = actionableReservationsByGroupKey.get(group.groupKey);
                      const completedGroupForSamePit = completedReservationsByGroupKey.get(group.groupKey);
                      const pendingTherapyIdSet = new Set(
                        (group.therapies || [])
                          .map((item) => String(item?.pitTherapyId || ''))
                          .filter(Boolean),
                      );
                      const existingReservationsWithoutDuplicates = (existingGroupForSamePit?.reservations || []).filter(
                        (item) => !pendingTherapyIdSet.has(String(item?.pitTherapyId || '')),
                      );
                      const completedReservationsWithoutDuplicates = (completedGroupForSamePit?.reservations || []).filter(
                        (item) => !pendingTherapyIdSet.has(String(item?.pitTherapyId || '')),
                      );
                      const existingCount = existingReservationsWithoutDuplicates.length;
                      const completedCount = completedReservationsWithoutDuplicates.length;
                      const groupContext = buildGroupContextFromItems(group);
                      const groupTeaProfileId = String(group.therapies[0]?.teaProfileId || group.therapies[0]?.pitId || '');
                      const removedTherapies = group.therapies.filter((item) => Boolean(item?.removedFromPit));
                      const frequencyChangedTherapies = group.therapies.filter((item) => String(item?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE');
                      const pitProgress = buildPitProgressFromItems([
                        ...group.therapies,
                        ...existingReservationsWithoutDuplicates,
                        ...completedReservationsWithoutDuplicates,
                      ]);
                      const pitStageBadge = PIT_STAGE_BADGE[pitProgress.stage];
                      const hasRemovedTherapyAlert = removedTherapies.length > 0;
                      const hasFrequencyChangeAlert = frequencyChangedTherapies.length > 0;
                      const canScheduleGroup = groupContext.therapies.length > 0;
                      const existingSlotsByTherapy = buildExistingSlotsByTherapyFromReservations([
                        ...(group.therapies || []),
                        ...existingReservationsWithoutDuplicates,
                        ...completedReservationsWithoutDuplicates,
                      ]);
                      const hasSchedulableTherapiesInPending = group.therapies.some((item) => {
                        const status = String(item?.status || '');
                        if (status === 'PENDING_SCHEDULING') return true;
                        if (status !== 'RESERVED') return false;
                        const weeklyTarget = Math.max(1, Number(item?.preferences?.weeklyFrequency || 1));
                        const weeklyReserved = Math.max(0, Number(item?.weeklyReservationCount || 0));
                        return weeklyReserved < weeklyTarget;
                      });
                      const totalSuggested = groupContext.therapies.reduce(
                        (acc, therapy) => acc + (suggestionsByTherapyId[therapy.pitTherapyId]?.length || 0),
                        0,
                      );

                      return (
                        <Paper key={group.groupKey} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                          <Stack gap={8}>
                            <Group justify="space-between" align="center" wrap="wrap">
                              <Text fw={600}>{group.patientName}</Text>
                              <Group gap="xs">
                                <Badge variant="light" color={pitStageBadge.color}>{pitStageBadge.label}</Badge>
                                {hasFrequencyChangeAlert && (
                                  <Badge variant="light" color="blue">Frequência alterada</Badge>
                                )}
                              </Group>
                            </Group>

                            <Text size="xs" c="dimmed">
                              {group.patientCpf ? `CPF: ${formatCPF(group.patientCpf)} • ` : ''}
                              Itens do PIT: {group.therapies.length + existingCount + completedCount}
                            </Text>

                            <Box>
                              {renderProgressTrail(pitProgress, `pit-pending-${group.groupKey}`)}
                            </Box>

                            <Stack gap={6}>
                              {group.therapies.map((therapyItem) => {
                                const pendingCardKey = `pending-${group.groupKey}-${String(therapyItem.pitTherapyId || 'unknown')}`;
                                const isPendingCardCollapsed = Boolean(collapsedTherapyCards[pendingCardKey]);
                                return (
                                <Paper
                                  key={String(therapyItem.pitTherapyId)}
                                  p="xs"
                                  withBorder
                                  style={{ borderColor: 'var(--mantine-color-default-border)' }}
                                >
                                  <Group justify="space-between" align="center" wrap="wrap">
                                    <Text size="xs" fw={600}>
                                      {therapyItem.procedure?.name || 'Procedimento não definido'}
                                      {' • '}
                                      {therapyItem.professional?.name || 'Profissional não definido'}
                                    </Text>
                                    <ActionIcon
                                      variant="subtle"
                                      color="gray"
                                      onClick={() => toggleTherapyCard(pendingCardKey)}
                                      title={isPendingCardCollapsed ? 'Mostrar detalhes' : 'Esconder detalhes'}
                                    >
                                      <ChevronDown
                                        size={16}
                                        style={{
                                          transform: isPendingCardCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                                          transition: 'transform 150ms ease',
                                        }}
                                      />
                                    </ActionIcon>
                                  </Group>
                                  {!isPendingCardCollapsed && (
                                    <>
                                  {therapyItem?.removedFromPit && (
                                    <Group gap={6} mb={4}>
                                      <Badge variant="light" color="orange">Terapia removida do PIT</Badge>
                                      <Badge variant="light" color="red">Precisa desmarcar sessões</Badge>
                                    </Group>
                                  )}
                                  {String(therapyItem?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE' && (
                                    <Group gap={6} mb={4}>
                                      <Badge variant="light" color="blue">Frequência alterada</Badge>
                                      {Number.isFinite(Number(therapyItem?.previousWeeklyFrequency)) && Number.isFinite(Number(therapyItem?.currentWeeklyFrequency)) && (
                                        <Badge variant="light" color="indigo">
                                          {Number(therapyItem.previousWeeklyFrequency)}x {'>'} {Number(therapyItem.currentWeeklyFrequency)}x
                                        </Badge>
                                      )}
                                    </Group>
                                  )}
                                  <Text size="xs" c="dimmed">
                                    Frequência: {therapyItem.preferences?.weeklyFrequency || 1}x/semana
                                    {' • '}
                                    Dias: {Array.isArray(therapyItem.preferences?.weekdays) && therapyItem.preferences.weekdays.length > 0 ? therapyItem.preferences.weekdays.join(', ') : 'Não definido'}
                                    {' • '}
                                    Turno: {therapyItem.preferences?.shift || 'Não definido'}
                                  </Text>
                                  {String(therapyItem?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE' && therapyItem?.alertMessage && (
                                    <Text size="xs" c="blue">
                                      {String(therapyItem.alertMessage)}
                                    </Text>
                                  )}
                                  {therapyItem?.removedFromPit && therapyItem?.alertMessage && (
                                    <Text size="xs" c="orange">
                                      {String(therapyItem.alertMessage)}
                                    </Text>
                                  )}
                                    </>
                                  )}
                                </Paper>
                                );
                              })}
                            </Stack>

                            {existingReservationsWithoutDuplicates.length > 0 && (
                              <Stack gap={6}>
                                <Text size="xs" fw={600} c="dimmed">
                                  Terapias já criadas deste mesmo PIT
                                </Text>
                                {existingReservationsWithoutDuplicates.map((item) => {
                                  return (
                                  <Paper
                                    key={`existing-${String(item.preReservationId)}`}
                                    p="xs"
                                    withBorder
                                    style={{ borderColor: 'var(--mantine-color-default-border)' }}
                                  >
                                    <Group justify="space-between" align="center" wrap="wrap">
                                      <Text size="xs" fw={600}>
                                        {item.procedure?.name || 'Procedimento não definido'}
                                        {' • '}
                                        {item.professional?.name || 'Profissional não definido'}
                                      </Text>
                                      <Group gap="xs">
                                        <Badge variant="light" color={STATUS_COLOR[item.status] || 'gray'}>
                                          {STATUS_LABEL[item.status] || item.status}
                                        </Badge>
                                      </Group>
                                    </Group>
                                  </Paper>
                                  );
                                })}
                              </Stack>
                            )}

                            {completedReservationsWithoutDuplicates.length > 0 && (
                              <Stack gap={6}>
                                <Text size="xs" fw={600} c="dimmed">
                                  Terapias já agendadas deste mesmo PIT
                                </Text>
                                {completedReservationsWithoutDuplicates.map((item) => {
                                  return (
                                  <Paper
                                    key={`completed-${String(item.preReservationId)}`}
                                    p="xs"
                                    withBorder
                                    style={{ borderColor: 'var(--mantine-color-default-border)' }}
                                  >
                                    <Group justify="space-between" align="center" wrap="wrap">
                                      <Text size="xs" fw={600}>
                                        {item.procedure?.name || 'Procedimento não definido'}
                                        {' • '}
                                        {item.professional?.name || 'Profissional não definido'}
                                      </Text>
                                      <Group gap="xs">
                                        <Badge variant="light" color={STATUS_COLOR[item.status] || 'green'}>
                                          {STATUS_LABEL[item.status] || item.status}
                                        </Badge>
                                      </Group>
                                    </Group>
                                  </Paper>
                                  );
                                })}
                              </Stack>
                            )}

                            <Group justify="flex-end">
                              {hasSchedulableTherapiesInPending && (
                                <Button
                                  size="xs"
                                  variant="light"
                                  loading={loadingSuggestionsId === group.groupKey}
                                  onClick={() => handleLoadGroupSuggestions(groupContext, {
                                    existingSlotsByTherapy,
                                    daysAhead: 90,
                                  })}
                                  disabled={!canScheduleGroup}
                                >
                                  Sugerir horários automáticos
                                </Button>
                              )}
                              {hasSchedulableTherapiesInPending && (
                                <Button
                                  size="xs"
                                  bg={DARK_BLUE}
                                  loading={updatingId === group.groupKey}
                                  onClick={() => openManualProposalModal(groupContext, {
                                    existingSlotsByTherapy,
                                  })}
                                  disabled={!canScheduleGroup}
                                >
                                  Criar proposta manual
                                </Button>
                              )}
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                leftSection={<Trash2 size={14} />}
                                loading={updatingId === group.groupKey}
                                onClick={() => handleDeletePitByTeaProfileId(groupTeaProfileId, group.groupKey)}
                                disabled={!groupTeaProfileId}
                              >
                                Excluir PIT
                              </Button>
                              {hasRemovedTherapyAlert && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  color="orange"
                                  onClick={() => navigate(`/tea/desmarcacao-lote?teaProfileId=${encodeURIComponent(String(group.therapies[0]?.teaProfileId || ''))}`)}
                                >
                                  Desmarcar terapia removida
                                </Button>
                              )}
                            </Group>

                            {canScheduleGroup && totalSuggested > 0 && (
                              <Text size="xs" c="dimmed">
                                Grade do PIT sugerida com {totalSuggested} horário(s), pronta para revisão no calendário.
                              </Text>
                            )}
                          </Stack>
                        </Paper>
                      );
                    })}

                    {actionableExistingReservationGroupsWithoutPending.length > 0 && (
                      <>
                        <Divider />
                        <Group gap="xs" align="center">
                          <ClipboardList size={16} />
                          <Text size="sm" fw={600}>Pré-reservas já criadas</Text>
                        </Group>
                        {actionableExistingReservationGroupsWithoutPending.map((group) => renderReservationGroupCard(group))}
                      </>
                    )}
                  </Stack>
                );
              })()
            ) : (
              (() => {
                if (completedReservationGroupsWithoutPending.length === 0) {
                  return <Text size="sm" c="dimmed">Nenhuma pré-reserva concluída sem pendências.</Text>;
                }

                return (
                  <Stack gap="xs">
                    {pendingGroups.length > 0 && (
                      <Text size="xs" c="yellow">
                        Há terapias pendentes em outros PITs – verifique a aba "Pendências" para sugerir horários.
                      </Text>
                    )}
                    <Group gap="xs" align="center">
                      <ClipboardList size={16} />
                      <Text size="sm" fw={600}>Pré-reservas concluídas</Text>
                    </Group>
                    {completedReservationGroupsWithoutPending.map((group) => renderReservationGroupCard(group))}
                  </Stack>
                );
              })()
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
