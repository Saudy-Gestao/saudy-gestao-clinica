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
  CalendarClock,
  ChevronLeft,
  RefreshCcw,
  History,
  ClipboardList,
  ListChecks,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF, parseApiDateToLocalDate } from '../../utils/formatters';
import teaPreReservationService from '../../services/teaPreReservationService';
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

type GroupTherapyContext = {
  pitTherapyId: string;
  procedureName: string;
  professionalName: string;
  weeklyFrequency?: number;
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
  pendingCount: number;
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

const countManualSelectionGroups = (slots: Array<{ date: string; time: string }>, slotStepMinutes: number) => {
  if (!slots.length) return 0;
  const byDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot.time);
    return acc;
  }, {} as Record<string, string[]>);

  return Object.values(byDate).reduce((total, times) => {
    const sorted = [...times].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    let groups = 0;
    let prevMinutes: number | null = null;

    sorted.forEach((time) => {
      const current = timeToMinutes(time);
      if (prevMinutes === null || (current - prevMinutes) > slotStepMinutes) {
        groups += 1;
      }
      prevMinutes = current;
    });

    return total + groups;
  }, 0);
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

  const buildPreferredWeekdayPreviewDates = (
    startDate: string | undefined,
    preferredWeekdays: string[] | undefined,
    count = 5,
  ) => {
    const normalizedIndexes = Array.from(
      new Set(
        (preferredWeekdays || [])
          .map((day) => WEEKDAY_TO_DAY_INDEX[String(day || '').toUpperCase()])
          .filter((index): index is number => Number.isInteger(index)),
      ),
    ).sort((a, b) => a - b);

    if (!normalizedIndexes.length) {
      return buildRecurringPreviewDates(startDate ? [startDate] : [], count);
    }

    const base = startDate ? dayjs(startDate).startOf('day') : dayjs().startOf('day');
    const today = dayjs().startOf('day');
    const cursorStart = base.isBefore(today, 'day') ? today : base;
    const result: string[] = [];
    let cursor = cursorStart;

    while (result.length < count && !cursor.isAfter(recurringUntilYearEnd, 'day')) {
      if (normalizedIndexes.includes(cursor.day())) {
        result.push(cursor.format('YYYY-MM-DD'));
      }
      cursor = cursor.add(1, 'day');
    }

    return result;
  };

  const buildWeeklySlotsFromPreferences = (
    selectedDate: string,
    preferredWeekdays: string[] | undefined,
    weeklyFrequency: number,
  ) => {
    const limit = Math.max(1, Number(weeklyFrequency) || 1);
    const indexes = Array.from(
      new Set(
        (preferredWeekdays || [])
          .map((day) => WEEKDAY_TO_DAY_INDEX[String(day || '').toUpperCase()])
          .filter((index): index is number => Number.isInteger(index)),
      ),
    );

    if (!indexes.length) {
      return Array.from({ length: limit }).map((_, idx) => ({
        date: dayjs(selectedDate).add(idx, 'week').format('YYYY-MM-DD'),
        time: '09:00',
      }));
    }

    const slots: Array<{ date: string; time: string }> = [];
    let cursor = dayjs(selectedDate).startOf('day');

    while (slots.length < limit && !cursor.isAfter(recurringUntilYearEnd, 'day')) {
      if (indexes.includes(cursor.day())) {
        slots.push({
          date: cursor.format('YYYY-MM-DD'),
          time: '09:00',
        });
      }
      cursor = cursor.add(1, 'day');
    }

    return slots;
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
  const [manualSelectedSlots, setManualSelectedSlots] = useState<Array<{ date: string; time: string }>>([]);
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

  const checklistConvertibleReservations = useMemo(() => (
    checklistGroupReservations.filter((reservation) => {
      const procedure = getReservationProcedureName(reservation);
      return checklistCanConvertByProcedure.get(procedure) === true;
    })
  ), [checklistCanConvertByProcedure, checklistGroupReservations]);

  const checklistCanConvertAnyProcedure = checklistConvertibleReservations.length > 0;


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

  const actionableExistingReservationGroupsWithoutPending = useMemo(
    () => actionableExistingReservationGroups.filter((group) => !pendingGroupKeySet.has(group.groupKey)),
    [actionableExistingReservationGroups, pendingGroupKeySet],
  );

  const completedReservationGroupsWithoutPending = useMemo(
    () => completedReservationGroups.filter((group) => !pendingGroupKeySet.has(group.groupKey)),
    [completedReservationGroups, pendingGroupKeySet],
  );

  const pitProgressByGroupKey = useMemo(() => {
    const byGroup = new Map<string, {
      therapyIds: Set<string>;
      convertedCount: number;
      regressedScheduledCount: number;
      pendingCount: number;
      reservedCount: number;
      pendingApprovalCount: number;
      pendingApprovalRequestedAt: string | null;
      pendingApprovalDeadlineAt: string | null;
      inAuthorizationCount: number;
      authorizedCount: number;
    }>();

    filteredItems.forEach((item) => {
      const patientId = String(item?.patient?.id || 'unknown-patient');
      const pitId = String(item?.pitId || item?.preReservationId || 'unknown-pit');
      const groupKey = `${patientId}-${pitId}`;
      const pitTherapyId = String(item?.pitTherapyId || item?.preReservationId || '');
      const status = String(item?.status || '');
      const hasPreReservation = Boolean(item?.preReservationId);

      if (!byGroup.has(groupKey)) {
        byGroup.set(groupKey, {
          therapyIds: new Set<string>(),
          convertedCount: 0,
          regressedScheduledCount: 0,
          pendingCount: 0,
          reservedCount: 0,
          pendingApprovalCount: 0,
          pendingApprovalRequestedAt: null,
          pendingApprovalDeadlineAt: null,
          inAuthorizationCount: 0,
          authorizedCount: 0,
        });
      }

      const current = byGroup.get(groupKey)!;
      if (pitTherapyId) current.therapyIds.add(pitTherapyId);

      if (status === 'PENDING_SCHEDULING' && String(item?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE') {
        current.regressedScheduledCount += 1;
      }

      const isPendingScheduling = status === 'PENDING_SCHEDULING' || (!hasPreReservation && !status);

      if (isPendingScheduling) {
        current.pendingCount += 1;
      } else if (status === 'CONVERTED') {
        current.convertedCount += 1;
      } else if (status === 'RESERVED') {
        current.reservedCount += 1;
      } else if (status === 'PROPOSED') {
        current.pendingApprovalCount += 1;
        const requestedAt = item?.approvalRequestedAt ? dayjs(item.approvalRequestedAt) : null;
        const deadlineAt = item?.approvalDeadlineAt ? dayjs(item.approvalDeadlineAt) : null;

        if (requestedAt?.isValid()) {
          if (!current.pendingApprovalRequestedAt || requestedAt.isBefore(dayjs(current.pendingApprovalRequestedAt))) {
            current.pendingApprovalRequestedAt = requestedAt.toISOString();
          }
        }

        if (deadlineAt?.isValid()) {
          if (!current.pendingApprovalDeadlineAt || deadlineAt.isBefore(dayjs(current.pendingApprovalDeadlineAt))) {
            current.pendingApprovalDeadlineAt = deadlineAt.toISOString();
          }
        }
      } else if (status === 'PENDING_AUTHORIZATION') {
        current.inAuthorizationCount += 1;
      } else if (status === 'AUTHORIZED') {
        current.authorizedCount += 1;
      }
    });

    const resolved = new Map<string, PitProgressInfo>();
    byGroup.forEach((value, groupKey) => {
      const totalTherapies = Math.max(1, value.therapyIds.size);
      let stage: PitProgressStage = 'PIT_GERADO';
      let stepIndex = 1;

      const hasRegressionOrPendingAuthorization = value.regressedScheduledCount > 0 || value.inAuthorizationCount > 0;

      if (value.convertedCount >= totalTherapies && !hasRegressionOrPendingAuthorization) {
        stage = 'AGENDADO_COMPLETO';
        stepIndex = 7;
      } else if (value.convertedCount > 0 || value.regressedScheduledCount > 0 || value.inAuthorizationCount > 0) {
        stage = 'AGENDADO_PARCIAL';
        stepIndex = 6;
      } else if (value.inAuthorizationCount > 0 || value.authorizedCount > 0) {
        stage = 'EM_AUTORIZACAO';
        stepIndex = 5;
      } else if (value.pendingApprovalCount > 0) {
        stage = 'AGUARDANDO_APROVACAO';
        stepIndex = 4;
      } else if (value.reservedCount >= totalTherapies) {
        stage = 'RESERVADO_COMPLETO';
        stepIndex = 3;
      } else if (value.reservedCount > 0) {
        stage = 'RESERVADO_PARCIAL';
        stepIndex = 2;
      }

      resolved.set(groupKey, {
        stage,
        stepIndex,
        totalTherapies,
        convertedCount: value.convertedCount,
        regressedScheduledCount: value.regressedScheduledCount,
        pendingCount: value.pendingCount,
        pendingApprovalCount: value.pendingApprovalCount,
        pendingApprovalRequestedAt: value.pendingApprovalRequestedAt,
        pendingApprovalDeadlineAt: value.pendingApprovalDeadlineAt,
        inAuthorizationCount: value.inAuthorizationCount,
        authorizedCount: value.authorizedCount,
      });
    });

    return resolved;
  }, [filteredItems]);

  const renderPitProgress = (groupKey: string) => {
    const progress = pitProgressByGroupKey.get(groupKey);
    if (!progress) return null;

    const reservedTotal = progress.totalTherapies - progress.pendingCount;
    const reservedPartialActive = reservedTotal > 0;
    const reservedCompleteActive = reservedTotal >= progress.totalTherapies;
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
    const pendingApprovalStepCompleted = !hasLivePendingApproval && (inAuthorizationActive || stageFilledByStep[pendingApprovalStepIndex]);
    const pendingApprovalElapsedRatio = (() => {
      if (!hasLivePendingApproval) return pendingApprovalStepCompleted ? 1 : 0;
      if (!pendingRequested?.isValid() || !pendingDeadline?.isValid()) return 0.2;
      const totalMs = pendingDeadline.valueOf() - pendingRequested.valueOf();
      if (totalMs <= 0) return 1;
      const remainingMs = pendingDeadline.valueOf() - Date.now();
      const remainingRatio = Math.max(0, Math.min(1, remainingMs / totalMs));
      return 1 - remainingRatio;
    })();
    const authorizationDisplayRatio = stageFilledByStep[authorizationStepIndex] ? 1 : authorizationRatio;

    const activeByStep: boolean[] = [
      stageFilledByStep[0], // PIT gerado
      reservedPartialActive || stageFilledByStep[1],
      reservedCompleteActive || stageFilledByStep[2],
      pendingApprovalActive || stageFilledByStep[3],
      inAuthorizationActive || stageFilledByStep[4],
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
              <Box key={`${groupKey}-${label}`} style={{ minWidth: 0 }}>
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

  const openConversionConfirmationModal = (reservationsToConvert?: any[]) => {
    const scopedReservations = Array.isArray(reservationsToConvert)
      ? reservationsToConvert
      : checklistSelectedProcedureReservations;
    const scopedReservationIds = Array.from(
      new Set(
        scopedReservations
          .map((item) => String(item?.preReservationId || ''))
          .filter(Boolean),
      ),
    );
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
      if (!pitTherapyId || uniqueTherapies.has(pitTherapyId)) return;

      const suggestedDateRaw = reservation?.slotSuggestion?.suggestedDate || reservation?.suggestedDate;
      const suggestedDate = normalizeDateToIso(suggestedDateRaw) || dayjs().format('YYYY-MM-DD');
      const suggestedTime = String(reservation?.slotSuggestion?.suggestedTime || reservation?.suggestedTime || '09:00');

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
        slots: [{ date: suggestedDate, time: suggestedTime }],
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
    const isGroupFullyConverted = group.reservations.length > 0
      && group.reservations.every((item) => String(item?.status || '') === 'CONVERTED');
    const hasReservedReservations = group.reservations.some((item) => String(item?.status || '') === 'RESERVED');
    const hasPendingApprovalReservations = group.reservations.some((item) => String(item?.status || '') === 'PROPOSED');

    async function handleUpdateReservationStatus(reservationId: string, resolvedStatus: TeaPreReservationStatus) {
      if (!reservationId || !resolvedStatus) return;

      setUpdatingId(reservationId);
      try {
        await teaPreReservationService.updateStatus(reservationId, {
          status: resolvedStatus,
          applySeries: true,
        });

        showNotification({
          title: 'Sucesso',
          message: 'Status da terapia atualizado para toda a série do procedimento',
          color: 'green',
        });

        await loadPending();
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Falha ao atualizar status da terapia',
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

      const eligibleReservations = (group.reservations || []).filter((item) => {
        const status = String(item?.status || '');
        return status !== 'CONVERTED' && status !== 'CANCELED';
      });
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
          message: 'Este PIT não possui pré-reservas elegíveis para conversão.',
          color: 'yellow',
        });
        return;
      }

      const procedureOptions = Array.from(new Set(eligibleAnchors.map((item) => getReservationProcedureName(item))));

      setChecklistLoading(true);
      setChecklistModalOpened(true);
      setChecklistGroupKey(group.groupKey);
      setChecklistGroupLabel(`${group.patientName} • PIT`);
      setChecklistGroupReservations(eligibleAnchors);
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
      const anchorByTherapy = new Map<string, string>();
      group.reservations.forEach((item) => {
        const status = String(item?.status || '');
        const reservationId = String(item?.preReservationId || '');
        const therapyId = String(item?.pitTherapyId || '');
        if (status !== fromStatus || !reservationId || !therapyId) return;
        if (!anchorByTherapy.has(therapyId)) {
          anchorByTherapy.set(therapyId, reservationId);
        }
      });

      const reservationIds = Array.from(anchorByTherapy.values());
      if (reservationIds.length === 0) {
        showNotification({
          title: 'Sem itens para atualizar',
          message: 'Nenhuma terapia elegível para essa ação neste PIT.',
          color: 'yellow',
        });
        return;
      }

      setUpdatingId(group.groupKey);
      try {
        await Promise.all(
          reservationIds.map((reservationId) => teaPreReservationService.updateStatus(reservationId, {
            status: toStatus,
            applySeries: true,
          })),
        );
        showNotification({
          title: 'Sucesso',
          message: successMessage,
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

          {renderPitProgress(group.groupKey)}

          <Group grow align="flex-end">
            <Stack gap={4}>
              <Text size="xs" fw={500}>Status do PIT</Text>
              <Paper
                p={0}
                withBorder
                style={{
                  borderColor: 'var(--mantine-color-default-border)',
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                }}
              >
                <Text size="sm" c={groupStatus ? undefined : 'dimmed'}>
                  {groupStatus ? (STATUS_LABEL[groupStatus] || groupStatus) : 'Status misto entre terapias'}
                </Text>
              </Paper>
            </Stack>
            <Button
              variant="default"
              h={36}
              leftSection={<History size={16} />}
              onClick={() => handleOpenGroupTimeline(group)}
            >
              Histórico do PIT
            </Button>
            {!isGroupFullyConverted && (
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
            {group.reservations.map((item) => (
              <Paper key={String(item.preReservationId)} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Group justify="space-between" align="center" wrap="wrap">
                  <Text size="sm" fw={600}>
                    {item.procedure?.name || 'Procedimento não definido'}
                    {' • '}
                    {item.professional?.name || 'Profissional não definido'}
                  </Text>
                  <Group gap="xs">
                    <Badge variant="light" color={STATUS_COLOR[item.status] || 'gray'}>
                      {STATUS_LABEL[item.status] || item.status}
                    </Badge>
                    {item.isExpiringSoon && item.status !== 'EXPIRED' && item.status !== 'CONVERTED' && item.status !== 'AUTHORIZED' && (
                      <Badge variant="light" color="orange">Vence em breve</Badge>
                    )}
                    {(item.isExpired || item.status === 'EXPIRED') && (
                      <Badge variant="light" color="red">Expirada</Badge>
                    )}
                  </Group>
                </Group>
                <Group mt={8} justify="space-between" align="flex-end" wrap="wrap">
                  <Select
                    size="xs"
                    label="Status da terapia (toda a série)"
                    data={getTherapyStatusOptions(item.status)}
                    value={item.status}
                    onChange={(value) => {
                      if (!value) return;
                      if (isAuthorizationManagedStatus(item.status)) return;
                      handleUpdateReservationStatus(String(item.preReservationId), value as TeaPreReservationStatus);
                    }}
                    disabled={
                      !item?.preReservationId
                      || updatingId === String(item.preReservationId)
                      || isAuthorizationManagedStatus(item.status)
                    }
                    style={{ minWidth: 220 }}
                  />
                </Group>
                {isAuthorizationManagedStatus(item.status) && (
                  <Text size="xs" mt={4} c="dimmed">
                    Status de autorização gerenciado no módulo Autorização Convênio.
                  </Text>
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
              </Paper>
            ))}
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
    () => Math.max(1, Number(manualSelectedTherapy?.weeklyFrequency || 1)),
    [manualSelectedTherapy],
  );

  const manualSelectedSessionCount = useMemo(
    () => countManualSelectionGroups(manualSelectedSlots, manualSlotStepMinutes),
    [manualSelectedSlots, manualSlotStepMinutes],
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

  const openManualProposalModal = async (context: SuggestionGroupContext) => {
    setManualContext(context);
    setManualWeekStart(dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
    setManualSelectedTherapyId(context.therapies[0]?.pitTherapyId || null);
    setManualSelectedSlots([]);
    setManualModalOpened(true);
    await loadManualGridForContext(context, dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
  };

  const handleManualConfirmReservation = async () => {
    if (!manualContext || !manualSelectedTherapy) {
      showNotification({ title: 'Atenção', message: 'Selecione uma terapia para continuar.', color: 'yellow' });
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

    const selectedSessions = countManualSelectionGroups(sortedSlots, manualSlotStepMinutes);
    const weeklyLimit = Math.max(1, Number(manualSelectedTherapy.weeklyFrequency || 1));

    if (selectedSessions < weeklyLimit) {
      showNotification({
        title: 'Seleção incompleta',
        message: `Selecione exatamente ${weeklyLimit} marcação(ões) semanal(is) para esta terapia.`,
        color: 'yellow',
      });
      return;
    }

    if (selectedSessions > weeklyLimit) {
      showNotification({
        title: 'Limite semanal excedido',
        message: `Essa terapia permite até ${weeklyLimit} marcação(ões) por semana no PIT.`,
        color: 'yellow',
      });
      return;
    }

    setManualSaving(true);
    try {
      const sessionAnchors = getManualSelectionAnchors(sortedSlots, manualSlotStepMinutes);
      const firstDate = sessionAnchors[0]?.date;
      const weeks = getWeeksUntilYearEnd(firstDate);

      await teaPreReservationService.acceptGroup({
        recurring: true,
        recurrenceWeeks: weeks,
        recurringUntilDate,
        expiresAt: dayjs().add(2, 'day').toISOString(),
        items: sessionAnchors.map((slot) => ({
          pitTherapyId: manualSelectedTherapy.pitTherapyId,
          suggestedDate: slot.date,
          suggestedTime: slot.time,
          durationMinutes: manualSelectedTherapy.durationMinutes ?? null,
        })),
      });

      showNotification({
        title: 'Sucesso',
        message: `Reserva manual confirmada com ${selectedSessions} marcação(ões) semanal(is).`,
        color: 'green',
      });

      setManualModalOpened(false);
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
        preferredWeekdays: Array.isArray(item?.preferences?.weekdays) ? item.preferences.weekdays : [],
        preferredShift: item?.preferences?.shift || undefined,
        durationMinutes: item?.procedure?.durationMinutes || null,
      })),
  });

  const handleLoadGroupSuggestions = async (
    context: SuggestionGroupContext,
    options?: {
      excludeSlotsByTherapy?: Record<string, string[]>;
      daysAhead?: number;
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
        weeklyFrequency: number,
        therapy: GroupTherapyContext,
      ): Array<{ date: string; time: string }> => {
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

        const filtered = unique.filter((slot) => {
          const weekday = dayjs(slot.date).day();
          const weekdayOk = preferredWeekdaySet.size === 0 || preferredWeekdaySet.has(weekday);
          const shiftOk = isShiftMatch(slot.time);
          return weekdayOk && shiftOk;
        });

        const fullPool = filtered.length > 0 ? filtered : unique;
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
        const viableWeeks = weekStats.filter((item) => item.listLength >= weeklyFrequency);
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
          if (selected.length >= weeklyFrequency) break;
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
        if (selected.length < weeklyFrequency) {
          const shuffledPool = shuffle(pool);
          for (const slot of shuffledPool) {
            if (selected.length >= weeklyFrequency) break;
            const signature = `${slot.date}#${slot.time}`;
            if (usedSignatures.has(signature)) continue;
            selected.push(slot);
            usedSignatures.add(signature);
          }
        }

        return selected.slice(0, weeklyFrequency);
      };

      const results = await Promise.all(
        context.therapies.map(async (therapy) => {
          const weeklyFrequency = Math.max(1, Number(therapy.weeklyFrequency) || 1);
          const suggestionLimit = Math.max(90, Math.min(240, weeklyFrequency * 40));
          const previousTried = triedSlotsByTherapyId[therapy.pitTherapyId] || [];
          const exclude = Array.from(new Set([
            ...(excludeSlotsByTherapy[therapy.pitTherapyId] || []),
            ...previousTried,
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
          const list = pickBestSuggestions(sortedList, weeklyFrequency, therapy);
          return {
            pitTherapyId: therapy.pitTherapyId,
            list,
          };
        }),
      );

      const nextByTherapyId: Record<string, Array<{ date: string; time: string }>> = {};
      results.forEach((result) => {
        nextByTherapyId[result.pitTherapyId] = result.list;
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
                              return (
                                <Paper
                                  key={`${dayBlock.date}-${entry.pitTherapyId}-${entry.time}`}
                                  p={6}
                                  withBorder
                                  style={{
                                    borderColor: isTherapySelected
                                      ? 'var(--mantine-color-teal-5)'
                                      : 'var(--mantine-color-default-border)',
                                    opacity: isTherapySelected ? 1 : 0.45,
                                  }}
                                >
                                  <Text size="xs" fw={700}>{entry.time}</Text>
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

                  return (
                    <Paper
                      key={therapy.pitTherapyId}
                      p="xs"
                      withBorder
                      style={{
                        borderColor: validation && !validation.valid
                          ? 'var(--mantine-color-yellow-5)'
                          : isSelected
                            ? 'var(--mantine-color-teal-5)'
                            : 'var(--mantine-color-default-border)',
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
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--mantine-color-teal-6)' }}
                          />
                          <Stack gap={2}>
                            <Text size="xs" fw={600}>{therapy.procedureName}</Text>
                            <Text size="xs" c="dimmed">
                              {therapy.professionalName}
                              {slots.length > 0 ? ` • ${slots.length} horário(s)` : ' • sem sugestão'}
                            </Text>
                          </Stack>
                        </Group>
                        <Group gap="xs">
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
              const dates = acceptModalMode === 'conversion'
                ? buildPreferredWeekdayPreviewDates(allDates[0], entry.therapy.preferredWeekdays, 8)
                : buildRecurringPreviewDates(allDates, 5);
              const selectedDate = acceptDateByTherapy[entry.therapy.pitTherapyId] || dates[0] || '';
              
              // In conversion mode, calculate directly from weeklyFrequency
              // In suggestion mode, resolve from generated suggestions
              const selectedWeeklySlots = acceptModalMode === 'conversion'
                ? buildWeeklySlotsFromPreferences(
                    selectedDate || dayjs().format('YYYY-MM-DD'),
                    entry.therapy.preferredWeekdays,
                    entry.therapy.weeklyFrequency || 1,
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
                      data={dates.map((d) => ({ value: d, label: `${formatWeekdayPt(d)} • ${dayjs(d).format('DD/MM/YYYY')}` }))}
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
        onClose={() => setManualModalOpened(false)}
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
                      const isSelected = manualSelectedSlots.some((selected) => selected.date === day.date && selected.time === time);
                      const isOccupied = !!slot?.occupied;
                      const isSelectable = !!slot?.selectable;
                      const reachedWeeklyLimit = manualSelectedSessionCount >= manualWeeklyLimit;
                      const canAddNewSelection = !reachedWeeklyLimit || isSelected;
                      const isFree = !isOccupied && isSelectable && day.enabled;
                      const isUnavailable = !isOccupied && !isSelectable;
                      const stateLabel = isSelected
                        ? 'Selecionado'
                        : isOccupied
                          ? 'Ocupado'
                          : isFree
                            ? 'Livre'
                            : 'Indisponível';
                      const dayLabel = day.weekday || formatWeekdayPt(day.date) || dayjs(day.date).format('ddd');

                      return (
                        <Button
                          key={`${day.date}-${time}`}
                          size="compact-xs"
                          variant="filled"
                          disabled={!isSelectable || !manualSelectedTherapyId || !canAddNewSelection}
                          title={`${dayLabel} ${time} • ${stateLabel}`}
                          aria-label={`${dayLabel} ${time} • ${stateLabel}`}
                          onClick={() => {
                            if (!isSelectable) return;
                            const selectedDurationMinutes = Math.max(1, Number(manualSelectedTherapy?.durationMinutes || 30));
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
                              if (candidate.occupied || !candidate.selectable) {
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
                              const prevSignatureSet = new Set(prev.map(toSignature));
                              const rangeSignatureSet = new Set(rangeSlots.map(toSignature));
                              const isRangeAlreadySelected = rangeSlots.every((slotItem) => prevSignatureSet.has(toSignature(slotItem)));

                              // Toggle behavior: clicking an already selected range removes it.
                              if (isRangeAlreadySelected) {
                                return prev.filter((slotItem) => !rangeSignatureSet.has(toSignature(slotItem)));
                              }

                              const merged = [...prev];
                              rangeSlots.forEach((slotItem) => {
                                const signature = toSignature(slotItem);
                                if (!prevSignatureSet.has(signature)) {
                                  merged.push(slotItem);
                                }
                              });

                              const normalizedMerged = merged.sort((a, b) => {
                                const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
                                if (dateDiff !== 0) return dateDiff;
                                return timeToMinutes(a.time) - timeToMinutes(b.time);
                              });

                              const maxWeeklySessions = Math.max(1, Number(manualSelectedTherapy?.weeklyFrequency || 1));
                              const selectedSessions = countManualSelectionGroups(normalizedMerged, manualSlotStepMinutes);
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
                disabled={!manualSelectedTherapyId || manualSelectedSlots.length === 0 || !manualSelectionComplete || manualSaving}
              >
                Confirmar reserva manual
              </Button>
            </Group>
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
                  disabled={!checklistCanConvertAnyProcedure}
                  loading={!!checklistGroupKey && updatingId === checklistGroupKey}
                  onClick={() => openConversionConfirmationModal(checklistConvertibleReservations)}
                >
                  {`Finalizar Agendamento${checklistCanConvertAnyProcedure ? ` (${checklistConvertibleReservations.length})` : ''}`}
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
                      const completedGroupForSamePit = completedReservationsByGroupKey.get(group.groupKey);
                      const completedCount = completedGroupForSamePit?.reservations?.length || 0;
                      const groupContext = buildGroupContextFromItems(group);
                      const removedTherapies = group.therapies.filter((item) => Boolean(item?.removedFromPit));
                      const frequencyChangedTherapies = group.therapies.filter((item) => String(item?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE');
                      const hasRemovedTherapyAlert = removedTherapies.length > 0;
                      const hasFrequencyChangeAlert = frequencyChangedTherapies.length > 0;
                      const canScheduleGroup = groupContext.therapies.length > 0;
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
                                {hasFrequencyChangeAlert && (
                                  <Badge variant="light" color="blue">Agendado parcial</Badge>
                                )}
                                <Badge variant="light" color="gray">Pendente de marcação</Badge>
                              </Group>
                            </Group>

                            <Text size="xs" c="dimmed">
                              {group.patientCpf ? `CPF: ${formatCPF(group.patientCpf)} • ` : ''}
                              Itens do PIT: {group.therapies.length + completedCount}
                            </Text>

                            {renderPitProgress(group.groupKey)}

                            <Stack gap={6}>
                              {group.therapies.map((therapyItem) => (
                                <Paper
                                  key={String(therapyItem.pitTherapyId)}
                                  p="xs"
                                  withBorder
                                  style={{ borderColor: 'var(--mantine-color-default-border)' }}
                                >
                                  <Text size="xs" fw={600}>
                                    {therapyItem.procedure?.name || 'Procedimento não definido'}
                                    {' • '}
                                    {therapyItem.professional?.name || 'Profissional não definido'}
                                  </Text>
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
                                </Paper>
                              ))}
                            </Stack>

                            {completedGroupForSamePit && (
                              <Stack gap={6}>
                                <Text size="xs" fw={600} c="dimmed">
                                  Terapias já agendadas deste mesmo PIT
                                </Text>
                                {completedGroupForSamePit.reservations.map((item) => (
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
                                      <Badge variant="light" color={STATUS_COLOR[item.status] || 'green'}>
                                        {STATUS_LABEL[item.status] || item.status}
                                      </Badge>
                                    </Group>
                                  </Paper>
                                ))}
                              </Stack>
                            )}

                            <Group justify="flex-end">
                              <Button
                                size="xs"
                                variant="light"
                                loading={loadingSuggestionsId === group.groupKey}
                                onClick={() => handleLoadGroupSuggestions(groupContext)}
                                disabled={!canScheduleGroup}
                              >
                                Sugerir horários automáticos
                              </Button>
                              <Button
                                size="xs"
                                bg={DARK_BLUE}
                                loading={updatingId === group.groupKey}
                                onClick={() => openManualProposalModal(groupContext)}
                                disabled={!canScheduleGroup}
                              >
                                Criar proposta manual
                              </Button>
                              {hasRemovedTherapyAlert && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  color="orange"
                                  onClick={() => navigate('/tea/desmarcacao-lote')}
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
