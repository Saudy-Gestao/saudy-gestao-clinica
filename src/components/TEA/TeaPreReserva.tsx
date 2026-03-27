import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  CalendarClock,
  CalendarX2,
  CircleCheck,
  CircleX,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Paperclip,
  ShieldCheck,
  AlarmClock,
  SquarePen,
  Hand,
  Upload,
  RefreshCcw,
  History,
  ClipboardList,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { formatCPF, parseApiDateToLocalDate } from '../../utils/formatters';
import teaPreReservationService from '../../services/teaPreReservationService';
import teaProfileService from '../../services/teaProfileService';
import convenioAuthorizationService from '../../services/convenioAuthorizationService';
import type { TeaPreReservationStatus } from '../../services/teaPreReservationService';
import { useTeaPendingReservationsQuery } from '../../hooks/useTeaPendingReservationsQuery';
import { useTeaReservationTimelineQuery } from '../../hooks/useTeaReservationTimelineQuery';
import { useTeaReservationChecklistQuery, type TeaConversionChecklistItem } from '../../hooks/useTeaReservationChecklistQuery';
import { useTeaManualGridQuery, type TeaManualGridDay, type TeaManualGridSlot } from '../../hooks/useTeaManualGridQuery';
import { queryKeys } from '../../lib/queryKeys';

const FINAL_RESERVATION_STATUSES: TeaPreReservationStatus[] = [
  'CONVERTED',
  'EXPIRED',
  'CANCELED',
];

const EXPIRABLE_RESERVATION_STATUSES: TeaPreReservationStatus[] = [
  'PROPOSED',
  'PENDING_AUTHORIZATION',
];

const PERSISTED_RESERVATION_SLOT_STATUSES: TeaPreReservationStatus[] = [
  'RESERVED',
  'PROPOSED',
  'PENDING_AUTHORIZATION',
  'AUTHORIZED',
  'CONVERTED',
];

const EMPTY_PENDING_ITEMS: any[] = [];
const EMPTY_TIMELINE_EVENTS: any[] = [];
const EMPTY_CHECKLIST_ITEMS: TeaConversionChecklistItem[] = [];
const EMPTY_MANUAL_GRID_BY_THERAPY_ID: Record<string, { days: TeaManualGridDay[] }> = {};

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

const normalizeWeekdayPreferenceToken = (value: string) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/-FEIRA/g, '')
    .replace(/\s+/g, '')
    .trim()
);

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

const formatWeekdaySummary = (weekdays?: string[]) => {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return 'Nao definido';
  return weekdays
    .map((day) => {
      const normalized = String(day || '').trim().toLowerCase();
      if (!normalized) return null;
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .filter(Boolean)
    .join(', ');
};

const getPitGroupKey = (item: any) => {
  const patientId = String(item?.patient?.id || 'unknown-patient');
  const pitId = String(item?.pitId || item?.preReservationId || 'unknown-pit');
  return `${patientId}-${pitId}`;
};

const isTherapyStillSchedulable = (item: any) => {
  const status = String(item?.status || '');
  if (status === 'PENDING_SCHEDULING') return true;
  if (status !== 'RESERVED') return false;
  const weeklyTarget = Math.max(1, Number(item?.preferences?.weeklyFrequency || 1));
  const weeklyReserved = Math.max(0, Number(item?.weeklyReservationCount || 0));
  return weeklyReserved < weeklyTarget;
};

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

type SuggestedSlot = {
  date: string;
  time: string;
  professionalDoctorId?: string | null;
  professionalName?: string | null;
};

type SuggestionFallbackLevel =
  | 'preferred_day_and_shift'
  | 'nearest_day_same_shift'
  | 'nearest_day_any_shift'
  | 'existing_slots';

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

type AuthorizationAttachmentItem = {
  id: string;
  fileName: string;
  uploadedAt?: string;
};

const getAuthorizationAttachmentsFromItems = (items: any[]) => {
  const attachmentMap = new Map<string, AuthorizationAttachmentItem>();
  (items || []).forEach((item) => {
    const docs = Array.isArray(item?.authorizationAttachments) ? item.authorizationAttachments : [];
    docs.forEach((doc: any) => {
      const id = String(doc?.id || '');
      if (!id || attachmentMap.has(id)) return;
      attachmentMap.set(id, {
        id,
        fileName: String(doc?.fileName || 'Anexo'),
        uploadedAt: doc?.uploadedAt ? String(doc.uploadedAt) : undefined,
      });
    });
  });

  return Array.from(attachmentMap.values()).sort((a, b) => dayjs(b.uploadedAt).valueOf() - dayjs(a.uploadedAt).valueOf());
};

const isSlotCoveredBySession = (
  daySlots: TeaManualGridSlot[],
  anchorTime: string,
  targetTime: string,
  durationMinutes: number,
): boolean => {
  const coveredSlots = getCoveredSlotsForSession(daySlots, anchorTime, durationMinutes);
  return coveredSlots.includes(targetTime);
};

const getCoveredSlotsForSession = (
  daySlots: TeaManualGridSlot[],
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
  reservationStageCompletedCount: number;
  authorizationStageCompletedCount: number;
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

const minutesToTime = (value: number) => {
  const normalized = Math.max(0, Number(value) || 0);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const doSlotsOverlap = (
  first: { date: string; time: string; durationMinutes?: number | null },
  second: { date: string; time: string; durationMinutes?: number | null },
) => {
  if (first.date !== second.date) return false;
  const firstStart = timeToMinutes(first.time);
  const secondStart = timeToMinutes(second.time);
  const firstDuration = Math.max(1, Number(first.durationMinutes || 30));
  const secondDuration = Math.max(1, Number(second.durationMinutes || 30));
  const firstEnd = firstStart + firstDuration;
  const secondEnd = secondStart + secondDuration;
  return firstStart < secondEnd && secondStart < firstEnd;
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

const getTeaActionButtonClass = (tone: 'primary' | 'secondary' | 'success' | 'danger' | 'neutral' = 'primary') => (
  `tea-pre-reserva-action-btn tea-pre-reserva-action-btn--${tone}`
);

export function TeaPreReserva() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const lastScrollYRef = useRef<number>(0);

  const [search, setSearch] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [suggestionsByTherapyId, setSuggestionsByTherapyId] = useState<Record<string, SuggestedSlot[]>>({});
  const [suggestionFallbackByTherapyId, setSuggestionFallbackByTherapyId] = useState<Record<string, SuggestionFallbackLevel>>({});
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

  const formatScheduledSlotsSummary = (slots: Array<{ date: string; time: string }> = []) => {
    const groupedByDate = [...slots]
      .filter((slot) => slot?.date && slot?.time)
      .sort((a, b) => {
        const aStamp = dayjs(`${a.date}T${a.time}:00`).valueOf();
        const bStamp = dayjs(`${b.date}T${b.time}:00`).valueOf();
        return aStamp - bStamp;
      })
      .reduce((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(String(slot.time).trim());
        return acc;
      }, {} as Record<string, string[]>);

    return Object.entries(groupedByDate)
      .map(([date, times]) => {
        const sortedTimes = Array.from(new Set(times)).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
        const slotStepMinutes = sortedTimes.length > 1
          ? Math.max(15, timeToMinutes(sortedTimes[1]) - timeToMinutes(sortedTimes[0]))
          : 15;
        const ranges: Array<{ start: string; end: string }> = [];

        sortedTimes.forEach((time) => {
          const lastRange = ranges[ranges.length - 1];
          if (!lastRange) {
            ranges.push({ start: time, end: time });
            return;
          }

          const isSequential = timeToMinutes(time) - timeToMinutes(lastRange.end) === 15;
          if (isSequential) {
            lastRange.end = time;
            return;
          }

          ranges.push({ start: time, end: time });
        });

        const formattedRanges = ranges
          .map((range) => {
            if (range.start === range.end) return range.start;
            const rangeEnd = minutesToTime(timeToMinutes(range.end) + slotStepMinutes);
            return `${range.start} - ${rangeEnd}`;
          })
          .join(' | ');

        return `${formatWeekdayPt(date)} ${formattedRanges}`.trim();
      })
      .join(' | ');
  };

  const getPersistedSlotsFromReservation = (item: any): Array<{ date: string; time: string }> => {
    const slots: Array<{ date: string; time: string }> = [];

    const appendSlot = (dateRaw: string, timeRaw: string) => {
      const suggestedDate = normalizeDateToIso(dateRaw);
      const suggestedTime = String(timeRaw || '').trim();
      if (!suggestedDate || !suggestedTime) return;

      const signature = `${suggestedDate}#${suggestedTime}`;
      const alreadyExists = slots.some((slot) => `${slot.date}#${slot.time}` === signature);
      if (!alreadyExists) {
        slots.push({ date: suggestedDate, time: suggestedTime });
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

    appendSlot(
      String(item?.slotSuggestion?.suggestedDate || item?.suggestedDate || ''),
      String(item?.slotSuggestion?.suggestedTime || item?.suggestedTime || ''),
    );

    return slots.sort((a, b) => {
      const aStamp = dayjs(`${a.date}T${a.time}:00`).valueOf();
      const bStamp = dayjs(`${b.date}T${b.time}:00`).valueOf();
      return aStamp - bStamp;
    });
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
  const [suggestionExistingSlotsByTherapyId, setSuggestionExistingSlotsByTherapyId] = useState<Record<string, Array<{ date: string; time: string }>>>({});
  const [rejectDecisionOpened, setRejectDecisionOpened] = useState(false);
  const [acceptSuggestionDecisionOpened, setAcceptSuggestionDecisionOpened] = useState(false);
  const [manualModalOpened, setManualModalOpened] = useState(false);
  const [manualContext, setManualContext] = useState<SuggestionGroupContext | null>(null);
  const [manualWeekStart, setManualWeekStart] = useState<string>(dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
  const [manualSelectedTherapyId, setManualSelectedTherapyId] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualAcceptDecisionOpened, setManualAcceptDecisionOpened] = useState(false);
  const [manualReservationDecisionState, setManualReservationDecisionState] = useState<ManualReservationDecisionState | null>(null);
  const [manualSelectedSlotsByTherapyId, setManualSelectedSlotsByTherapyId] = useState<Record<string, Array<{ date: string; time: string }>>>({});
  const [manualEditableExistingSlotsByTherapyId, setManualEditableExistingSlotsByTherapyId] = useState<Record<string, Array<{ date: string; time: string }>>>({});
  const [triedSlotsByTherapyId, setTriedSlotsByTherapyId] = useState<Record<string, string[]>>({});
  const [weeklyValidationByTherapyId, setWeeklyValidationByTherapyId] = useState<Record<string, {
    valid: boolean;
    missingWeeks: number;
    exceedsWeeks: number;
    missingSlots: number;
    exceedsSlots: number;
  }>>({});
  const [timelineModalOpened, setTimelineModalOpened] = useState(false);
  const [timelineReservations, setTimelineReservations] = useState<Array<{ reservationId: string; procedureName: string }>>([]);
  const [timelineReservationLabel, setTimelineReservationLabel] = useState('');
  const [authorizationAttachmentsModalOpened, setAuthorizationAttachmentsModalOpened] = useState(false);
  const [authorizationAttachmentsLabel, setAuthorizationAttachmentsLabel] = useState('');
  const [authorizationAttachmentsItems, setAuthorizationAttachmentsItems] = useState<AuthorizationAttachmentItem[]>([]);
  const [openingAuthorizationAttachmentId, setOpeningAuthorizationAttachmentId] = useState<string | null>(null);
  const [checklistModalOpened, setChecklistModalOpened] = useState(false);
  const [checklistReservations, setChecklistReservations] = useState<Array<{ reservationId: string; procedureName: string }>>([]);
  const [conversionReservationIds, setConversionReservationIds] = useState<string[]>([]);
  const [checklistGroupKey, setChecklistGroupKey] = useState<string | null>(null);
  const [checklistGroupLabel, setChecklistGroupLabel] = useState<string>('');
  const [checklistGroupReservations, setChecklistGroupReservations] = useState<any[]>([]);
  const [acceptModalOpened, setAcceptModalOpened] = useState(false);
  const [acceptModalMode, setAcceptModalMode] = useState<'suggestion' | 'conversion'>('suggestion');
  const [deletePitConfirmModalOpened, setDeletePitConfirmModalOpened] = useState(false);
  const [deletePitTarget, setDeletePitTarget] = useState<{ teaProfileId: string; pitId?: string; groupKey: string } | null>(null);
  const {
    data: pendingItemsData,
    isLoading: loading,
    error: pendingError,
  } = useTeaPendingReservationsQuery({
    search,
    status: null,
  });
  const {
    data: timelineEventsData,
    isLoading: timelineLoading,
    error: timelineError,
  } = useTeaReservationTimelineQuery(timelineReservations, timelineModalOpened);
  const {
    data: checklistItemsData,
    isLoading: checklistLoading,
    error: checklistError,
  } = useTeaReservationChecklistQuery(checklistReservations, checklistModalOpened);
  const {
    data: manualGridByTherapyIdData,
    isLoading: manualLoadingGrid,
    error: manualGridError,
  } = useTeaManualGridQuery(
    manualContext?.therapies || [],
    manualWeekStart,
    manualModalOpened && Boolean(manualContext?.therapies?.length),
  );
  const items = pendingItemsData ?? EMPTY_PENDING_ITEMS;
  const timelineEvents = timelineEventsData ?? EMPTY_TIMELINE_EVENTS;
  const checklistItems = checklistItemsData ?? EMPTY_CHECKLIST_ITEMS;
  const manualGridByTherapyId = manualGridByTherapyIdData ?? EMPTY_MANUAL_GRID_BY_THERAPY_ID;
  useEffect(() => {
    if (!manualSelectedTherapyId) {
      return;
    }

    const grid = manualGridByTherapyId[manualSelectedTherapyId];
    if (!grid?.days?.length) return;

    setManualSelectedSlotsByTherapyId((prev) => {
      const currentSelections = prev[manualSelectedTherapyId] || [];
      if (currentSelections.length === 0) return prev;

      let changed = false;

      const nextSelections = currentSelections.filter((selected) => {
        const isExistingEditableSlot = (manualEditableExistingSlotsByTherapyId[manualSelectedTherapyId] || [])
          .some((slot) => slot.date === selected.date && slot.time === selected.time);
        if (isExistingEditableSlot) return true;

        const day = grid.days.find((item: TeaManualGridDay) => item.date === selected.date);
        const slot = day?.slots?.find((item: TeaManualGridSlot) => item.time === selected.time);
        const keep = Boolean(slot && !slot.occupied && slot.selectable);
        if (!keep) changed = true;
        return keep;
      });

      if (!changed && nextSelections.length === currentSelections.length) {
        return prev;
      }

      return {
        ...prev,
        [manualSelectedTherapyId]: nextSelections,
      };
    });
  }, [manualEditableExistingSlotsByTherapyId, manualGridByTherapyId, manualSelectedTherapyId]);
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

  const checklistCanConvertByProcedure = useMemo(() => {
    const byProcedure = new Map<string, boolean>();
    Array.from(new Set(
      checklistItems.map((item: TeaConversionChecklistItem) => item.procedureName || 'Procedimento não definido'),
    )).forEach((procedure: string) => {
      const procedureItems = checklistItems.filter(
        (item: TeaConversionChecklistItem) => (item.procedureName || 'Procedimento não definido') === procedure,
      );
      byProcedure.set(
        procedure,
        procedureItems.length > 0 && procedureItems.every((item: TeaConversionChecklistItem) => item.valid),
      );
    });
    return byProcedure;
  }, [checklistItems]);

  const checklistConvertiblePitReservations = useMemo(() => checklistGroupReservations.filter((reservation) => {
    const procedure = getReservationProcedureName(reservation);
    return checklistCanConvertByProcedure.get(procedure) === true;
  }), [checklistCanConvertByProcedure, checklistGroupReservations]);

  const checklistCanConvertWholePit = (
    checklistGroupReservations.length > 0
    && checklistConvertiblePitReservations.length === checklistGroupReservations.length
  );
  const checklistPatient = checklistGroupReservations[0]?.patient || {};
  const checklistPatientName = String(checklistPatient?.name || '').trim() || 'Paciente não identificado';
  const checklistPatientCpf = String(checklistPatient?.cpf || '').trim();
  const checklistPatientBirthDate = parseApiDateToLocalDate(
    checklistPatient?.birthDate || checklistPatient?.birth_date || checklistPatient?.birthdate,
  );

  const acceptConversionHasMissingStartDate = (
    acceptModalMode === 'conversion'
    && acceptTherapies.some((entry) => !String(acceptDateByTherapy[entry.therapy.pitTherapyId] || '').trim())
  );

  const itemsByPitGroup = useMemo(() => {
    const map = new Map<string, any[]>();
    items.forEach((item: any) => {
      const groupKey = getPitGroupKey(item);
      const existing = map.get(groupKey) ?? [];
      existing.push(item);
      map.set(groupKey, existing);
    });
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!badgeFilter || badgeFilter === 'all') return items;

    const allowedGroupKeys = new Set<string>();

    itemsByPitGroup.forEach((groupItems, groupKey) => {
      const hasPendingScheduling = groupItems.some((item) => !item?.preReservationId);
      const statuses = new Set(
        groupItems
          .map((item) => String(item?.status || ''))
          .filter(Boolean),
      );
      const hasExpiringSoon = groupItems.some((item) => (
        item?.isExpiringSoon
        && EXPIRABLE_RESERVATION_STATUSES.includes(String(item?.status || '') as TeaPreReservationStatus)
        && item?.status !== 'EXPIRED'
      ));
      const hasExpired = groupItems.some((item) => item?.isExpired || item?.status === 'EXPIRED');

      const matchesFilter = (
        (badgeFilter === 'pending-scheduling' && hasPendingScheduling)
        || (badgeFilter === 'pending-approval' && statuses.has('PROPOSED'))
        || (badgeFilter === 'pending-authorization' && statuses.has('PENDING_AUTHORIZATION'))
        || (badgeFilter === 'authorized' && statuses.has('AUTHORIZED'))
        || (badgeFilter === 'expiring-soon' && hasExpiringSoon)
        || (badgeFilter === 'expired' && hasExpired)
      );

      if (matchesFilter) {
        allowedGroupKeys.add(groupKey);
      }
    });

    return items.filter((item: any) => allowedGroupKeys.has(getPitGroupKey(item)));
  }, [badgeFilter, items, itemsByPitGroup]);

  const summary = useMemo(() => {
    let pendingScheduling = 0;
    let pendingApproval = 0;
    let pendingAuthorization = 0;
    let authorized = 0;
    let expiringSoon = 0;
    let expired = 0;

    itemsByPitGroup.forEach((groupItems) => {
      const statuses = new Set(
        groupItems
          .map((item) => String(item?.status || '') as TeaPreReservationStatus)
          .filter(Boolean),
      );

      if (groupItems.some((item) => !item?.preReservationId)) pendingScheduling += 1;
      if (statuses.has('PROPOSED')) pendingApproval += 1;
      if (statuses.has('PENDING_AUTHORIZATION')) pendingAuthorization += 1;
      if (statuses.has('AUTHORIZED')) authorized += 1;
      if (groupItems.some((item) => (
        item?.isExpiringSoon
        && EXPIRABLE_RESERVATION_STATUSES.includes(String(item?.status || '') as TeaPreReservationStatus)
        && item?.status !== 'EXPIRED'
      ))) expiringSoon += 1;
      if (groupItems.some((item) => item?.isExpired || item?.status === 'EXPIRED')) expired += 1;
    });

    return {
      total: itemsByPitGroup.size,
      pendingScheduling,
      pendingApproval,
      pendingAuthorization,
      authorized,
      expiringSoon,
      expired,
    };
  }, [itemsByPitGroup]);

  const summaryBadgeDefinitions: Array<{
    key: string;
    label: string;
    count: number;
    color: string;
    iconColor?: string;
    icon?: LucideIcon;
  }> = [
    { key: 'all', label: 'Todas', count: summary.total, color: 'dark' },
    { key: 'pending-scheduling', label: 'Pend. Marcação', count: summary.pendingScheduling, color: 'gray', icon: SquarePen, iconColor: '#3f2f2f' },
    { key: 'pending-approval', label: 'Aguard. Aprov.', count: summary.pendingApproval, color: 'violet', icon: CircleCheck, iconColor: '#5ca34a' },
    { key: 'pending-authorization', label: 'Pend. Autoriz.', count: summary.pendingAuthorization, color: 'yellow', icon: Clock3, iconColor: '#f0b400' },
    { key: 'authorized', label: 'Autorizado', count: summary.authorized, color: 'teal', icon: ShieldCheck, iconColor: '#6488ff' },
    { key: 'expiring-soon', label: 'Venc. em 48h', count: summary.expiringSoon, color: 'orange', icon: AlarmClock, iconColor: '#f08a00' },
    { key: 'expired', label: 'Expirados', count: summary.expired, color: 'red', icon: CalendarX2, iconColor: '#ff2a1f' },
  ];

  const handleBadgeClick = (pillKey: string) => {
    if (badgeFilter === pillKey) {
      setBadgeFilter(null);
      return;
    }

    setBadgeFilter(pillKey);
  };

  const pendingGroups = useMemo(() => {
    const map = new Map<string, {
      groupKey: string;
      patientName: string;
      patientCpf?: string;
      therapies: any[];
    }>();

    filteredItems
      .filter((item: any) => !item?.preReservationId)
      .forEach((item: any) => {
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
      .filter((item: any) => !!item?.preReservationId)
      .forEach((item: any) => {
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
    const secondMilestoneReached = (
      progress.stage === 'RESERVADO_COMPLETO'
      || progress.stage === 'AGUARDANDO_APROVACAO'
      || progress.stage === 'EM_AUTORIZACAO'
      || progress.stage === 'AGENDADO_PARCIAL'
      || progress.stage === 'AGENDADO_COMPLETO'
    );
    const secondLabel = progress.stage === 'RESERVADO_PARCIAL'
      ? 'Reservado parcial'
      : secondMilestoneReached
        ? 'Reservado'
        : 'Reserva';
    const thirdLabel = (
      progress.stage === 'AGENDADO_PARCIAL'
      || progress.stage === 'AGENDADO_COMPLETO'
      || progress.authorizedCount > 0
    )
      ? 'Autorizado'
      : 'Autorização';
    const fillPercent = (() => {
      switch (progress.stage) {
        case 'RESERVADO_PARCIAL':
          return 16.666;
        case 'RESERVADO_COMPLETO':
          return 33.333;
        case 'AGUARDANDO_APROVACAO':
          return 28;
        case 'EM_AUTORIZACAO':
          return 50;
        case 'AGENDADO_PARCIAL':
          return 83.333;
        case 'AGENDADO_COMPLETO':
          return 100;
        default:
          return 0;
      }
    })();
    const milestones = [
      { label: 'PIT Gerado', active: true, align: 'left' as const },
      { label: secondLabel, active: fillPercent >= 33.333, align: 'center' as const },
      { label: thirdLabel, active: fillPercent >= 66.666, align: 'center' as const },
      { label: 'Agendado', active: fillPercent >= 100, align: 'right' as const },
    ];
    const labelPositions = ['0%', '33.333%', '66.666%', '100%'];

    return (
      <Stack gap={6} className="tea-pre-reserva-progress">
        <Box className="tea-pre-reserva-progress-track">
          <Box className="tea-pre-reserva-progress-fill" style={{ width: `${fillPercent}%` }} />
          <Box className="tea-pre-reserva-progress-nodes">
            {milestones.map((milestone) => (
              <Box
                key={`${keyPrefix}-${milestone.label}`}
                className="tea-pre-reserva-progress-node"
                data-active={milestone.active ? 'true' : undefined}
              >
                {milestone.active ? <Check size={11} strokeWidth={3} /> : null}
              </Box>
            ))}
          </Box>
        </Box>

        <Box className="tea-pre-reserva-progress-labels">
          {milestones.map((milestone, index) => (
            <Text
              key={`${keyPrefix}-${milestone.label}-label`}
              className="tea-pre-reserva-progress-label"
              data-active={milestone.active ? 'true' : undefined}
              data-align={milestone.align}
              style={{ left: labelPositions[index] }}
            >
              {milestone.label}
            </Text>
          ))}
        </Box>
      </Stack>
    );
  };

  const buildTherapyProgressFromItem = (item: any): PitProgressInfo => {
    const status = String(item?.status || 'PENDING_SCHEDULING');
    const isFrequencyAdjustedFlow = String(item?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE';
    const weeklyTarget = Math.max(1, Number(item?.preferences?.weeklyFrequency || 1));
    const weeklyReserved = Math.max(0, Number(item?.weeklyReservationCount || 0));
    const previousWeeklyFrequency = isFrequencyAdjustedFlow
      ? Math.max(0, Number(item?.previousWeeklyFrequency || 0))
      : 0;
    const regressionCompletedSessions = previousWeeklyFrequency;
    const regressionTargetSessions = isFrequencyAdjustedFlow
      ? Math.max(1, Number(item?.currentWeeklyFrequency || item?.preferences?.weeklyFrequency || 1))
      : 0;
    const carriedReservedSessions = isFrequencyAdjustedFlow
      ? Math.max(weeklyReserved, previousWeeklyFrequency)
      : weeklyReserved;
    const isRegressionPending = (
      isFrequencyAdjustedFlow
      && (
        status === 'PENDING_SCHEDULING'
        || (status === 'RESERVED' && weeklyReserved === 0)
      )
    );
    const isReservationPreparedStatus = status === 'RESERVED' || status === 'PROPOSED';
    const reservedComplete = status === 'PROPOSED'
      || (isReservationPreparedStatus && carriedReservedSessions >= weeklyTarget);
    const reservedPartial = (
      (isReservationPreparedStatus && !reservedComplete)
      || (isFrequencyAdjustedFlow && status === 'PENDING_SCHEDULING' && carriedReservedSessions > 0)
    );

    let stage: PitProgressStage = 'PIT_GERADO';
    let stepIndex = 1;

    if (status === 'CONVERTED') {
      stage = 'AGENDADO_COMPLETO';
      stepIndex = 7;
    } else if (status === 'PROPOSED') {
      stage = 'AGUARDANDO_APROVACAO';
      stepIndex = 4;
    } else if (status === 'PENDING_AUTHORIZATION') {
      stage = 'EM_AUTORIZACAO';
      stepIndex = 5;
    } else if (status === 'AUTHORIZED') {
      stage = 'AGENDADO_PARCIAL';
      stepIndex = 6;
    } else if (reservedComplete) {
      stage = 'RESERVADO_COMPLETO';
      stepIndex = 3;
    } else if (reservedPartial) {
      stage = 'RESERVADO_PARCIAL';
      stepIndex = 2;
    } else if (isRegressionPending) {
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
      reservationStageCompletedCount: (
        reservedComplete
        || status === 'PENDING_AUTHORIZATION'
        || status === 'AUTHORIZED'
        || status === 'CONVERTED'
      ) ? 1 : 0,
      authorizationStageCompletedCount: (
        status === 'PENDING_AUTHORIZATION'
        || status === 'AUTHORIZED'
        || status === 'CONVERTED'
      ) ? 1 : 0,
      pendingApprovalCount: status === 'PROPOSED' || status === 'PENDING_AUTHORIZATION' ? 1 : 0,
      pendingApprovalRequestedAt: status === 'PROPOSED' || status === 'PENDING_AUTHORIZATION'
        ? String(item?.approvalRequestedAt || item?.updatedAt || item?.createdAt || '') || null
        : null,
      pendingApprovalDeadlineAt: status === 'PROPOSED' || status === 'PENDING_AUTHORIZATION'
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
        reservationStageCompletedCount: 0,
        authorizationStageCompletedCount: 0,
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
      acc.reservationStageCompletedCount += progress.reservationStageCompletedCount;
      acc.authorizationStageCompletedCount += progress.authorizationStageCompletedCount;
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
      reservationStageCompletedCount: 0,
      authorizationStageCompletedCount: 0,
      pendingApprovalCount: 0,
      pendingApprovalRequestedAt: null as string | null,
      pendingApprovalDeadlineAt: null as string | null,
      inAuthorizationCount: 0,
      authorizedCount: 0,
    });

    const allTherapiesReachedReservationStage = (
      aggregated.totalTherapies > 0
      && aggregated.reservationStageCompletedCount >= aggregated.totalTherapies
    );
    const allTherapiesReachedAuthorizationStage = (
      aggregated.totalTherapies > 0
      && aggregated.authorizationStageCompletedCount >= aggregated.totalTherapies
    );

    if (aggregated.convertedCount >= aggregated.totalTherapies && aggregated.totalTherapies > 0) {
      aggregated.stage = 'AGENDADO_COMPLETO';
      aggregated.stepIndex = 7;
    } else if (allTherapiesReachedAuthorizationStage && (aggregated.convertedCount > 0 || aggregated.authorizedCount > 0)) {
      aggregated.stage = 'AGENDADO_PARCIAL';
      aggregated.stepIndex = 6;
    } else if (allTherapiesReachedAuthorizationStage && aggregated.inAuthorizationCount > 0) {
      aggregated.stage = 'EM_AUTORIZACAO';
      aggregated.stepIndex = 5;
    } else if (allTherapiesReachedReservationStage && aggregated.pendingApprovalCount > 0) {
      aggregated.stage = 'AGUARDANDO_APROVACAO';
      aggregated.stepIndex = 4;
    } else if (aggregated.reservedCompleteCount >= aggregated.totalTherapies && aggregated.totalTherapies > 0) {
      aggregated.stage = 'RESERVADO_COMPLETO';
      aggregated.stepIndex = 3;
    } else if (aggregated.reservedPartialCount > 0 || aggregated.reservationStageCompletedCount > 0) {
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
      : checklistGroupReservations;
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

    setAcceptTherapies(preparedTherapies);
    setAcceptDateByTherapy({});
    setConversionReservationIds(scopedReservationIds);
    setChecklistModalOpened(false);
    setAcceptModalMode('conversion');
    setAcceptModalOpened(true);
  };

  const handleOpenAuthorizationAttachment = async (attachmentId: string) => {
    setOpeningAuthorizationAttachmentId(attachmentId);
    try {
      const blob = await convenioAuthorizationService.viewAttachment(attachmentId);
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
      setOpeningAuthorizationAttachmentId(null);
    }
  };

  const handleOpenPitAuthorizationAttachments = (label: string, items: any[]) => {
    const attachments = getAuthorizationAttachmentsFromItems(items);
    if (attachments.length === 0) {
      showNotification({
        title: 'Sem anexos',
        message: 'Este PIT ainda não possui anexos enviados na autorização de convênio.',
        color: 'yellow',
      });
      return;
    }

    setAuthorizationAttachmentsItems(attachments);
    setAuthorizationAttachmentsLabel(label);
    setAuthorizationAttachmentsModalOpened(true);
  };

  const renderReservationGroupCard = (group: ReservationGroup) => {
    const schedulableReservations = (group.reservations || []).filter(isTherapyStillSchedulable);
    const suggestionContext = buildGroupContextFromReservations({
      ...group,
      reservations: schedulableReservations,
    });
    const existingSlotsByTherapy = buildExistingSlotsByTherapyFromReservations(group.reservations, {
      includeStatuses: PERSISTED_RESERVATION_SLOT_STATUSES,
    });
    const teaProfileId = String(group.reservations[0]?.teaProfileId || group.reservations[0]?.pitId || group.pitId || '');
    const hasPendingApprovalReservations = group.reservations.some((item) => String(item?.status || '') === 'PROPOSED');
    const hasAuthorizedReservations = group.reservations.some((item) => String(item?.status || '') === 'AUTHORIZED');
    const hasPreApprovalReservations = group.reservations.some((item) => {
      const itemStatus = String(item?.status || '');
      if (itemStatus === 'PENDING_SCHEDULING') return true;
      if (itemStatus !== 'RESERVED') return false;
      const itemWeeklyTarget = Math.max(1, Number(item?.preferences?.weeklyFrequency || 1));
      const itemWeeklyReserved = Math.max(0, Number(item?.weeklyReservationCount || 0));
      return itemWeeklyReserved < itemWeeklyTarget;
    });
    const pitProgress = buildPitProgressFromItems(group.reservations);
    const groupAuthorizationAttachments = getAuthorizationAttachmentsFromItems(group.reservations);
    const canScheduleGroup = suggestionContext.therapies.length > 0;
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


        const actionLabel = toStatus === 'PROPOSED'
          ? 'Enviar para aprovação'
          : toStatus === 'PENDING_SCHEDULING'
            ? 'Retornar para reserva'
            : 'Aprovar reserva';
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

    async function handleRejectGroupApproval() {
      await handleMoveGroupSeriesStatus(
        'PROPOSED',
        'PENDING_SCHEDULING',
        'Reservas retornadas para a etapa de reserva para nova tentativa.',
      );
    }

    async function handleOpenGroupTimeline() {
      const timelineRefs = (group.reservations || [])
        .map((item) => ({
          reservationId: String(item?.preReservationId || ''),
          procedureName: item?.procedure?.name || 'Terapia',
        }))
        .filter((item) => Boolean(item.reservationId));

      if (timelineRefs.length === 0) return;

      setTimelineReservations(timelineRefs);
      setTimelineReservationLabel(`${group.patientName} • PIT`);
      setTimelineModalOpened(true);
    }

    function handleOpenGroupAuthorizationAttachments() {
      handleOpenPitAuthorizationAttachments(`${group.patientName} • PIT`, group.reservations);
    }

    async function handleOpenGroupConversionChecklist() {
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
          message: 'Este PIT ainda não possui terapias autorizadas para reservar.',
          color: 'yellow',
        });
        return;
      }

      setChecklistModalOpened(true);
      setChecklistGroupKey(group.groupKey);
      setChecklistGroupLabel(`${group.patientName} • PIT`);
      setChecklistGroupReservations(eligibleReservations);
      setConversionReservationIds(eligibleAnchors.map((item) => String(item?.preReservationId || '')).filter(Boolean));
      setChecklistReservations(
        eligibleAnchors.map((reservation) => ({
          reservationId: String(reservation?.preReservationId || ''),
          procedureName: getReservationProcedureName(reservation),
        })).filter((item) => Boolean(item.reservationId)),
      );
    }

    async function handleDeletePit() {
      await handleDeletePitByTeaProfileId(teaProfileId, group.groupKey, group.pitId);
    }
    return (
      <Paper key={group.groupKey} p="sm" withBorder className="tea-pre-reserva-card" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
        <Stack gap={8}>
          <Group justify="space-between" align="center" wrap="wrap">
            <Text fw={600}>{group.patientName}</Text>
            <Text fw={500}>PIT Reserva</Text>
          </Group>

          <Text size="xs" c="dimmed">
            {group.patientCpf ? `CPF: ${formatCPF(group.patientCpf)}` : 'CPF: Nao informado'}
          </Text>

          <Box>
            {renderProgressTrail(pitProgress, `pit-${group.groupKey}`)}
          </Box>

          <Stack gap={6}>
            {group.reservations.map((item) => {
              const itemTherapyId = String(item?.pitTherapyId || item?.preReservationId || '');
              const reservationCardKey = `reservation-${group.groupKey}-${String(item.preReservationId || itemTherapyId || 'unknown')}`;
              const isReservationCardCollapsed = Boolean(collapsedTherapyCards[reservationCardKey]);
              const itemWeeklyTarget = Math.max(1, Number(item?.preferences?.weeklyFrequency || 1));
              const persistedReservedSlots = getPersistedSlotsFromReservation(item);
              const shouldShowPersistedReservedSlots = (
                ['PENDING_AUTHORIZATION', 'AUTHORIZED', 'CONVERTED'].includes(String(item?.status || ''))
                && persistedReservedSlots.length > 0
              );
              const scheduleSummaryLabel = shouldShowPersistedReservedSlots
                ? formatScheduledSlotsSummary(persistedReservedSlots)
                : formatWeekdaySummary(item?.preferences?.weekdays);

              return (
              <Paper key={String(item.preReservationId)} p="xs" withBorder className="tea-pre-reserva-subcard" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={8} wrap="wrap" align="center">
                      <Text size="sm" fw={500}>
                        {item.procedure?.name || 'Procedimento não definido'}
                      </Text>
                      {item.status === 'PROPOSED' && (
                        <Box className="tea-pre-reserva-inline-status tea-pre-reserva-inline-status--approval">
                          Aguardando aprovação
                        </Box>
                      )}
                      {item.status === 'PENDING_AUTHORIZATION' && (
                        <Box className="tea-pre-reserva-inline-status tea-pre-reserva-inline-status--authorization">
                          Em autorização
                        </Box>
                      )}
                      {item.status === 'AUTHORIZED' && (
                        <Box className="tea-pre-reserva-inline-status tea-pre-reserva-inline-status--authorized">
                          Autorizado
                        </Box>
                      )}
                      {item.status === 'CONVERTED' && (
                        <Box className="tea-pre-reserva-inline-status tea-pre-reserva-inline-status--scheduled">
                          Agendado
                        </Box>
                      )}
                    </Group>
                    {item.status === 'PROPOSED' && item.expiresAt && (
                    <Text size="xs" mt={6} c={item.isExpired ? 'red' : 'orange'}>
                        Aprovação da reserva expira em: {dayjs(item.expiresAt).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    )}
                    {item.status === 'PENDING_AUTHORIZATION' && (
                      <Text size="xs" mt={6} c="blue">
                        Reserva aprovada e aguardando retorno da autorização.
                      </Text>
                    )}
                    {shouldShowPersistedReservedSlots && (
                      <Text size="xs" mt={6} c="dimmed">
                        Horários reservados: {formatScheduledSlotsSummary(persistedReservedSlots)}
                      </Text>
                    )}
                    {item.status === 'CONVERTED' && (
                      <Text size="xs" mt={6} c="teal">
                        Procedimento convertido em agendamento.
                      </Text>
                    )}
                  </Box>
                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                      <Text size="sm" fw={500}>
                        {itemWeeklyTarget}x/semana
                      </Text>
                      <Text size="sm" ta="right">
                        {scheduleSummaryLabel}
                      </Text>
                    </Stack>
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
                {item.status === 'CONVERTED' && item.convertedAt && (
                  <Text size="xs" mt={4} c="teal">
                    Agendado em: {dayjs(item.convertedAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                )}
                  </>
                )}
              </Paper>
              );
            })}
          </Stack>

          {hasPendingApprovalReservations ? (
            <Box className="tea-pre-reserva-actions-grid tea-pre-reserva-actions-grid--approval">
              <Button
                className={getTeaActionButtonClass('success')}
                leftSection={<CircleCheck size={18} />}
                onClick={() => handleMoveGroupSeriesStatus(
                  'PROPOSED',
                  'PENDING_AUTHORIZATION',
                  'Reservas aprovadas e enviadas para autorização.',
                )}
                loading={updatingId === group.groupKey}
                disabled={!hasPendingApprovalReservations}
              >
                Aprovar reserva
              </Button>
              <Button
                className={getTeaActionButtonClass('danger')}
                leftSection={<CircleX size={18} />}
                onClick={() => void handleRejectGroupApproval()}
                loading={updatingId === group.groupKey}
                disabled={!hasPendingApprovalReservations}
              >
                Não aprovar reserva
              </Button>
            </Box>
          ) : hasPreApprovalReservations ? (
            <Box className="tea-pre-reserva-actions-grid">
              {hasAuthorizedReservations && (
                <Button
                  className={getTeaActionButtonClass('primary')}
                  leftSection={<CalendarClock size={18} />}
                  onClick={() => void handleOpenGroupConversionChecklist()}
                >
                  Agendar
                </Button>
              )}
              <Button
                className={getTeaActionButtonClass('primary')}
                leftSection={<Hand size={18} />}
                onClick={() => openManualProposalModal(suggestionContext, {
                  existingSlotsByTherapy,
                })}
                loading={manualLoadingGrid && manualContext?.groupKey === group.groupKey}
                disabled={!canScheduleGroup}
              >
                Reserva Manual
              </Button>
              <Button
                className={getTeaActionButtonClass('secondary')}
                leftSection={<Paperclip size={18} />}
                onClick={handleOpenGroupAuthorizationAttachments}
                disabled={groupAuthorizationAttachments.length === 0}
              >
                Ver anexos
              </Button>
              <Button
                className={getTeaActionButtonClass('secondary')}
                leftSection={<Sparkles size={18} />}
                onClick={() => handleLoadGroupSuggestions(suggestionContext, {
                  daysAhead: 90,
                })}
                loading={loadingSuggestionsId === group.groupKey}
                disabled={!canScheduleGroup}
              >
                Sugerir horários automáticos
              </Button>
              <Button
                className={getTeaActionButtonClass('danger')}
                leftSection={<Trash2 size={18} />}
                onClick={() => void handleDeletePit()}
                loading={deletePitTarget?.groupKey === group.groupKey && updatingId === group.groupKey}
                disabled={!teaProfileId}
              >
                Excluir PIT
              </Button>
            </Box>
          ) : (
            <Box className="tea-pre-reserva-actions-grid tea-pre-reserva-actions-grid--approval tea-pre-reserva-actions-grid--compact">
              {hasAuthorizedReservations && (
                <Button
                  className={getTeaActionButtonClass('primary')}
                  leftSection={<CalendarClock size={18} />}
                  onClick={() => void handleOpenGroupConversionChecklist()}
                >
                  Agendar
                </Button>
              )}
              <Button
                className={getTeaActionButtonClass('secondary')}
                leftSection={<History size={18} />}
                onClick={() => void handleOpenGroupTimeline()}
              >
                Histórico
              </Button>
              <Button
                className={getTeaActionButtonClass('secondary')}
                leftSection={<Paperclip size={18} />}
                onClick={handleOpenGroupAuthorizationAttachments}
                disabled={groupAuthorizationAttachments.length === 0}
              >
                Ver anexos
              </Button>
              <Button
                className={getTeaActionButtonClass('danger')}
                leftSection={<Trash2 size={18} />}
                onClick={() => void handleDeletePit()}
                loading={deletePitTarget?.groupKey === group.groupKey && updatingId === group.groupKey}
                disabled={!teaProfileId}
                style={{ gridColumn: '1 / -1' }}
              >
                Excluir PIT
              </Button>
            </Box>
          )}
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
        professionalName: slot.professionalName || therapy.professionalName || 'Profissional conforme disponibilidade',
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
      setWeeklyValidationByTherapyId({});
    }
  }, [suggestionModalContext]);

  const autoSuggestionReadinessByTherapyId = useMemo(() => {
    if (!suggestionModalContext) return {} as Record<string, boolean>;

    return suggestionModalContext.therapies.reduce((acc, therapy) => {
      const weeklyFrequency = Math.max(1, Number(therapy.weeklyFrequency || 1));
      const existingSlots = suggestionExistingSlotsByTherapyId[therapy.pitTherapyId] || [];
      const suggestedSlots = suggestionsByTherapyId[therapy.pitTherapyId] || [];
      const combinedWeeklyCount = buildWeeklySlotSignatures([
        ...existingSlots,
        ...suggestedSlots,
      ]).length;
      const previousWeeklyFrequency = Math.max(0, Number(therapy.previousWeeklyFrequency || 0));
      const baselineReserved = String(therapy.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE'
        ? Math.max(buildWeeklySlotSignatures(existingSlots).length, previousWeeklyFrequency)
        : buildWeeklySlotSignatures(existingSlots).length;
      const resolvedWeeklyCount = String(therapy.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE'
        ? Math.max(combinedWeeklyCount, baselineReserved)
        : combinedWeeklyCount;

      acc[therapy.pitTherapyId] = resolvedWeeklyCount >= weeklyFrequency;
      return acc;
    }, {} as Record<string, boolean>);
  }, [suggestionExistingSlotsByTherapyId, suggestionModalContext, suggestionsByTherapyId]);

  const autoSuggestionWholePitReady = useMemo(() => {
    if (!suggestionModalContext?.therapies?.length) return false;
    return suggestionModalContext.therapies.every((therapy) => autoSuggestionReadinessByTherapyId[therapy.pitTherapyId] === true);
  }, [autoSuggestionReadinessByTherapyId, suggestionModalContext]);

  const manualTherapyOptions = useMemo(() => {
    if (!manualContext) return [];
    return manualContext.therapies.map((therapy) => ({
      value: therapy.pitTherapyId,
      label: `${therapy.procedureName} • ${therapy.professionalName}${(manualSelectedSlotsByTherapyId[therapy.pitTherapyId] || []).length > 0 ? ` • ${(manualSelectedSlotsByTherapyId[therapy.pitTherapyId] || []).length} selecionada(s)` : ''}`,
    }));
  }, [manualContext, manualSelectedSlotsByTherapyId]);

  const manualSelectedTherapy = useMemo(
    () => manualContext?.therapies.find((therapy) => therapy.pitTherapyId === manualSelectedTherapyId) || null,
    [manualContext, manualSelectedTherapyId],
  );

  const manualSelectedSlots = useMemo(
    () => (manualSelectedTherapyId ? (manualSelectedSlotsByTherapyId[manualSelectedTherapyId] || []) : []),
    [manualSelectedSlotsByTherapyId, manualSelectedTherapyId],
  );

  const manualSelectionsFromOtherTherapies = useMemo(
    () => Object.entries(manualSelectedSlotsByTherapyId)
      .filter(([therapyId]) => therapyId !== manualSelectedTherapyId)
      .flatMap(([therapyId, slots]) => {
        const durationMinutes = Math.max(
          1,
          Number(manualContext?.therapies.find((therapy) => therapy.pitTherapyId === therapyId)?.durationMinutes || 30),
        );

        return slots.map((slot) => ({
          date: slot.date,
          time: slot.time,
          durationMinutes,
        }));
      }),
    [manualContext?.therapies, manualSelectedSlotsByTherapyId, manualSelectedTherapyId],
  );

  const manualSelectedGrid = useMemo(
    () => (manualSelectedTherapyId ? manualGridByTherapyId[manualSelectedTherapyId] : undefined),
    [manualSelectedTherapyId, manualGridByTherapyId],
  );

  const manualWeekDays = useMemo<TeaManualGridDay[]>(() => {
    if (manualSelectedGrid?.days?.length) return manualSelectedGrid.days;

    return WEEKDAY_COLUMNS.map((column) => {
      const date = dayjs(manualWeekStart).add(column.offset, 'day').format('YYYY-MM-DD');
      return {
        date,
        weekday: '',
        enabled: false,
        slots: [],
      };
    });
  }, [manualSelectedGrid, manualWeekStart]);

  const manualTimeRows = useMemo(() => {
    const allTimes = new Set<string>();
    manualWeekDays.forEach((day: TeaManualGridDay) => {
      day.slots.forEach((slot: TeaManualGridSlot) => allTimes.add(slot.time));
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


  const refreshPending = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (silent && typeof window !== 'undefined') {
      lastScrollYRef.current = window.scrollY || 0;
    }

    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.teaPendingReservations, search || '', ''],
    });

    if (silent && typeof window !== 'undefined') {
      const targetY = lastScrollYRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, targetY);
        });
      });
    }
  };

  const handleDeletePitByTeaProfileId = async (teaProfileId: string, groupKey: string, pitId?: string) => {
    if (!teaProfileId) {
      showNotification({
        title: 'PIT inválido',
        message: 'Não foi possível identificar o perfil TEA para excluir este PIT.',
        color: 'yellow',
      });
      return;
    }

    setDeletePitTarget({ teaProfileId, pitId, groupKey });
    setDeletePitConfirmModalOpened(true);
  };

  const confirmDeletePit = async () => {
    if (!deletePitTarget?.teaProfileId || !deletePitTarget?.groupKey) {
      setDeletePitConfirmModalOpened(false);
      setDeletePitTarget(null);
      return;
    }

    const { teaProfileId, pitId, groupKey } = deletePitTarget;

    setUpdatingId(groupKey);
    try {
      await teaProfileService.deletePit(teaProfileId, pitId);
      showNotification({
        title: 'Sucesso',
        message: 'PIT excluído com sucesso.',
        color: 'green',
      });
      setDeletePitConfirmModalOpened(false);
      setDeletePitTarget(null);
      await refreshPending();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Falha ao excluir PIT',
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
      await refreshPending();
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
    if (!pendingError) return;
    const err: any = pendingError;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar pendências de pré-reserva',
      color: 'red',
    });
  }, [pendingError]);

  useEffect(() => {
    if (!timelineError || !timelineModalOpened) return;
    const err: any = timelineError;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Falha ao carregar timeline do PIT',
      color: 'red',
    });
  }, [timelineError, timelineModalOpened]);

  useEffect(() => {
    if (!checklistError || !checklistModalOpened) return;
    const err: any = checklistError;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Falha ao carregar checklist de conversão',
      color: 'red',
    });
  }, [checklistError, checklistModalOpened]);

  useEffect(() => {
    if (!manualGridError || !manualModalOpened) return;
    const err: any = manualGridError;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Falha ao carregar grade manual',
      color: 'red',
    });
  }, [manualGridError, manualModalOpened]);

  const openManualProposalModal = (
    context: SuggestionGroupContext,
    options?: { existingSlotsByTherapy?: Record<string, Array<{ date: string; time: string }>> },
  ) => {
    const existingSlotsByTherapy = options?.existingSlotsByTherapy || {};
    const firstTherapyId = context.therapies[0]?.pitTherapyId || null;

    setManualContext(context);
    setManualWeekStart(dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
    setManualSelectedTherapyId(firstTherapyId);
    setManualEditableExistingSlotsByTherapyId(existingSlotsByTherapy);
    setManualSelectedSlotsByTherapyId({});
    setManualModalOpened(true);
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
      setManualSelectedSlotsByTherapyId({});
      await refreshPending();
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

  const buildExistingSlotsByTherapyFromReservations = (
    reservations: any[],
    options?: { includeStatuses?: TeaPreReservationStatus[] },
  ) => {
    const byTherapy: Record<string, Array<{ date: string; time: string }>> = {};
    const includeStatuses = options?.includeStatuses || null;

    (reservations || []).forEach((item) => {
      const status = String(item?.status || '') as TeaPreReservationStatus;
      if (includeStatuses && !includeStatuses.includes(status)) return;

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
        rawList: SuggestedSlot[],
        targetCount: number,
        therapy: GroupTherapyContext,
      ): { list: SuggestedSlot[]; fallbackLevel: SuggestionFallbackLevel } => {
        if (targetCount <= 0) {
          return { list: [], fallbackLevel: 'preferred_day_and_shift' };
        }

        const unique = rawList.filter((slot, idx, arr) => arr.findIndex((it) => it.date === slot.date && it.time === slot.time) === idx);

        const normalizedPreferredWeekdays = (therapy.preferredWeekdays || [])
          .map((day) => WEEKDAY_TO_DAY_INDEX[normalizeWeekdayPreferenceToken(String(day))])
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

        const getWeekdayPreferenceScore = (slot: SuggestedSlot) => {
          if (preferredWeekdaySet.size === 0) return 1;
          return preferredWeekdaySet.has(dayjs(slot.date).day()) ? 2 : 0;
        };

        const getShiftPreferenceScore = (slot: SuggestedSlot) => {
          if (shiftTokenSet.size === 0) return 1;
          return isShiftMatch(slot.time) ? 2 : 0;
        };

        const sortByPreference = (a: SuggestedSlot, b: SuggestedSlot) => {
          const weekdayScoreDiff = getWeekdayPreferenceScore(b) - getWeekdayPreferenceScore(a);
          if (weekdayScoreDiff !== 0) return weekdayScoreDiff;

          const shiftScoreDiff = getShiftPreferenceScore(b) - getShiftPreferenceScore(a);
          if (shiftScoreDiff !== 0) return shiftScoreDiff;

          const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
          if (dateDiff !== 0) return dateDiff;
          return a.time.localeCompare(b.time);
        };

        const fullPool = [...unique].sort(sortByPreference);
        const slotsByWeekStart = new Map<string, SuggestedSlot[]>();

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
          const preferredMatches = list.filter((slot) => getWeekdayPreferenceScore(slot) > 1 && getShiftPreferenceScore(slot) > 1).length;
          const weekdayMatches = list.filter((slot) => getWeekdayPreferenceScore(slot) > 1).length;
          const shiftMatches = list.filter((slot) => getShiftPreferenceScore(slot) > 1).length;
          return {
            weekStart,
            listLength: list.length,
            uniqueWeekdays,
            preferredMatches,
            weekdayMatches,
            shiftMatches,
          };
        });
        const viableWeeks = weekStats.filter((item) => item.listLength >= targetCount);
        const preferredWeek = (viableWeeks.length > 0 ? viableWeeks : weekStats)
          .sort((a, b) => {
            if (b.preferredMatches !== a.preferredMatches) return b.preferredMatches - a.preferredMatches;
            if (b.weekdayMatches !== a.weekdayMatches) return b.weekdayMatches - a.weekdayMatches;
            if (b.shiftMatches !== a.shiftMatches) return b.shiftMatches - a.shiftMatches;
            if (b.uniqueWeekdays !== a.uniqueWeekdays) return b.uniqueWeekdays - a.uniqueWeekdays;
            if (b.listLength !== a.listLength) return b.listLength - a.listLength;
            return dayjs(a.weekStart).valueOf() - dayjs(b.weekStart).valueOf();
          })[0];
        const baseWeekStart = preferredWeek?.weekStart || sortedWeekStarts[0];
        const pool = (baseWeekStart ? (slotsByWeekStart.get(baseWeekStart) || []) : fullPool).slice().sort(sortByPreference);
        const nearestPreferredWeekdayDistance = (slot: SuggestedSlot) => {
          if (preferredWeekdaySet.size === 0) return 0;
          const weekday = dayjs(slot.date).day();
          const distances = Array.from(preferredWeekdaySet).map((preferredWeekday) => {
            const diff = (weekday - preferredWeekday + 7) % 7;
            return Math.min(diff, (preferredWeekday - weekday + 7) % 7);
          });
          return distances.length ? Math.min(...distances) : 7;
        };

        const selectFromPool = (candidatePool: SuggestedSlot[]) => {
          const selected: SuggestedSlot[] = [];
          const usedSignatures = new Set<string>();
          const usedDates = new Set<string>();

          const slotsByWeekday = new Map<number, SuggestedSlot[]>();
          candidatePool.forEach((slot) => {
            const weekday = dayjs(slot.date).day();
            const list = slotsByWeekday.get(weekday) || [];
            list.push(slot);
            slotsByWeekday.set(weekday, list);
          });

          const availableWeekdays = Array.from(slotsByWeekday.keys()).sort((a, b) => {
            const weekdayScoreA = preferredWeekdaySet.size === 0 ? 1 : (preferredWeekdaySet.has(a) ? 2 : 0);
            const weekdayScoreB = preferredWeekdaySet.size === 0 ? 1 : (preferredWeekdaySet.has(b) ? 2 : 0);
            if (weekdayScoreB !== weekdayScoreA) return weekdayScoreB - weekdayScoreA;
            return a - b;
          });

          for (const weekday of availableWeekdays) {
            if (selected.length >= targetCount) break;
            const weekdaySlots = [...(slotsByWeekday.get(weekday) || [])].sort(sortByPreference);
            const candidate = weekdaySlots.find((slot) => !usedDates.has(slot.date));
            if (!candidate) continue;
            const signature = `${candidate.date}#${candidate.time}`;
            if (usedSignatures.has(signature)) continue;
            selected.push(candidate);
            usedSignatures.add(signature);
            usedDates.add(candidate.date);
          }

          if (selected.length < targetCount) {
            for (const slot of candidatePool) {
              if (selected.length >= targetCount) break;
              const signature = `${slot.date}#${slot.time}`;
              if (usedSignatures.has(signature)) continue;
              selected.push(slot);
              usedSignatures.add(signature);
            }
          }

          return selected.slice(0, targetCount);
        };

        const strictPool = pool.filter((slot) => getWeekdayPreferenceScore(slot) > 1 && getShiftPreferenceScore(slot) > 1);
        const nearestDaySameShiftPool = pool
          .filter((slot) => getShiftPreferenceScore(slot) > 1)
          .slice()
          .sort((a, b) => {
            const distanceDiff = nearestPreferredWeekdayDistance(a) - nearestPreferredWeekdayDistance(b);
            if (distanceDiff !== 0) return distanceDiff;
            return sortByPreference(a, b);
          });
        const nearestDayAnyShiftPool = pool
          .slice()
          .sort((a, b) => {
            const distanceDiff = nearestPreferredWeekdayDistance(a) - nearestPreferredWeekdayDistance(b);
            if (distanceDiff !== 0) return distanceDiff;
            return sortByPreference(a, b);
          });

        const strictSelection = selectFromPool(strictPool);
        if (strictSelection.length >= targetCount) {
          return { list: strictSelection, fallbackLevel: 'preferred_day_and_shift' };
        }

        const sameShiftSelection = selectFromPool(nearestDaySameShiftPool);
        if (sameShiftSelection.length >= targetCount) {
          return { list: sameShiftSelection, fallbackLevel: 'nearest_day_same_shift' };
        }

        const anyShiftSelection = selectFromPool(nearestDayAnyShiftPool);
        return {
          list: anyShiftSelection,
          fallbackLevel: 'nearest_day_any_shift',
        };
      };

      const reservedDoctorSlots = new Map<string, Array<{ date: string; time: string; durationMinutes: number }>>();
      const reservedPatientSlots: Array<{ date: string; time: string; durationMinutes: number }> = [];
      const results: Array<{ pitTherapyId: string; list: SuggestedSlot[]; fallbackLevel: SuggestionFallbackLevel }> = [];

      for (const therapy of context.therapies) {
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
            const existingList = existingBase
              .filter((slot) => slot?.date && slot?.time)
              .sort((a, b) => {
                const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
                if (dateDiff !== 0) return dateDiff;
                return String(a.time).localeCompare(String(b.time));
              })
              .filter((slot, idx, arr) => arr.findIndex((it) => it.date === slot.date && it.time === slot.time) === idx);

            results.push({
              pitTherapyId: therapy.pitTherapyId,
              list: existingList,
              fallbackLevel: 'existing_slots',
            });
            reservedPatientSlots.push(
              ...existingList.map((slot) => ({
                date: slot.date,
                time: slot.time,
                durationMinutes: Math.max(1, Number(therapy.durationMinutes || 30)),
              })),
            );
            continue;
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

          const rawList: SuggestedSlot[] = Array.isArray(data?.items)
            ? data.items.map((item: any) => ({
              date: String(item?.date || ''),
              time: String(item?.time || ''),
              professionalDoctorId: item?.doctorId ? String(item.doctorId) : null,
              professionalName: item?.doctorName ? String(item.doctorName) : null,
            }))
            : [];
          const sortedList: SuggestedSlot[] = rawList
            .sort((a, b) => {
              const dateDiff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
              if (dateDiff !== 0) return dateDiff;
              return String(a.time).localeCompare(String(b.time));
            });
          const pickedSuggestions = pickBestSuggestions(sortedList, missingWeeklySlots, therapy);
          const list = pickedSuggestions.list
            .filter((slot) => {
              const patientHasConflict = reservedPatientSlots.some((reservedSlot) => (
                doSlotsOverlap(
                  {
                    date: slot.date,
                    time: slot.time,
                    durationMinutes: therapy.durationMinutes || 30,
                  },
                  reservedSlot,
                )
              ));
              if (patientHasConflict) return false;

              const doctorReservationKey = String(slot.professionalName || '').trim().toLowerCase();
              const doctorReservedSlots = reservedDoctorSlots.get(doctorReservationKey) || [];
              return !doctorReservedSlots.some((reservedSlot) => (
                doSlotsOverlap(
                  {
                    date: slot.date,
                    time: slot.time,
                    durationMinutes: therapy.durationMinutes || 30,
                  },
                  reservedSlot,
                )
              ));
            });

          list.forEach((slot) => {
            const doctorReservationKey = String(slot.professionalName || '').trim().toLowerCase();
            if (!doctorReservationKey) return;

            const currentReserved = reservedDoctorSlots.get(doctorReservationKey) || [];
            reservedDoctorSlots.set(
              doctorReservationKey,
              [
                ...currentReserved,
                {
                  date: slot.date,
                  time: slot.time,
                  durationMinutes: Math.max(1, Number(therapy.durationMinutes || 30)),
                },
              ],
            );
          });

          reservedPatientSlots.push(
            ...list.map((slot) => ({
              date: slot.date,
              time: slot.time,
              durationMinutes: Math.max(1, Number(therapy.durationMinutes || 30)),
            })),
          );

          results.push({
            pitTherapyId: therapy.pitTherapyId,
            list,
            fallbackLevel: pickedSuggestions.fallbackLevel,
          });
        }

      const nextByTherapyId: Record<string, SuggestedSlot[]> = {};
      const nextFallbackByTherapyId: Record<string, SuggestionFallbackLevel> = {};
      results.forEach((result) => {
        nextByTherapyId[result.pitTherapyId] = result.list.filter(
          (slot, idx, arr) => arr.findIndex((it) => it.date === slot.date && it.time === slot.time) === idx,
        );
        nextFallbackByTherapyId[result.pitTherapyId] = result.fallbackLevel;
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
      setSuggestionFallbackByTherapyId((prev) => ({ ...prev, ...nextFallbackByTherapyId }));
      setSuggestionExistingSlotsByTherapyId((prev) => {
        const next = { ...prev };
        context.therapies.forEach((therapy) => {
          next[therapy.pitTherapyId] = options?.existingSlotsByTherapy?.[therapy.pitTherapyId] || [];
        });
        return next;
      });
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
    setSuggestionExistingSlotsByTherapyId((prev) => {
      const next = { ...prev };
      context.therapies.forEach((therapy) => {
        delete next[therapy.pitTherapyId];
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
    const incompleteTherapies = context.therapies.filter(
      (therapy) => autoSuggestionReadinessByTherapyId[therapy.pitTherapyId] !== true,
    );

    if (incompleteTherapies.length > 0) {
      showNotification({
        title: 'Sugestão incompleta',
        message: 'A sugestão automática só pode seguir quando todas as terapias do PIT estiverem cobertas.',
        color: 'yellow',
      });
      return;
    }

    const therapiesWithSlots = context.therapies
      .map((therapy) => {
        const override = acceptDateByTherapy[therapy.pitTherapyId] || startDate;
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
          const weeklyFrequency = Math.max(1, Number(entry.therapy.weeklyFrequency || 1));
          const existingSlots = suggestionExistingSlotsByTherapyId[entry.therapy.pitTherapyId] || [];
          const existingWeeklyCount = buildWeeklySlotSignatures(existingSlots).length;
          const combinedWeeklyCount = buildWeeklySlotSignatures([
            ...existingSlots,
            ...entry.slotsToApply,
          ]).length;
          const previousWeeklyFrequency = Math.max(0, Number(entry.therapy.previousWeeklyFrequency || 0));
          const baselineReserved = String(entry.therapy.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE'
            ? Math.max(existingWeeklyCount, previousWeeklyFrequency)
            : existingWeeklyCount;
          const resolvedWeeklyCount = String(entry.therapy.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE'
            ? Math.max(combinedWeeklyCount, baselineReserved)
            : combinedWeeklyCount;
          if (String(entry.therapy.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE') {
            return {
              pitTherapyId: entry.therapy.pitTherapyId,
              valid: resolvedWeeklyCount >= weeklyFrequency,
              missingWeeks: resolvedWeeklyCount >= weeklyFrequency ? 0 : 1,
              exceedsWeeks: resolvedWeeklyCount > weeklyFrequency ? 1 : 0,
              missingSlots: Math.max(0, weeklyFrequency - resolvedWeeklyCount),
              exceedsSlots: Math.max(0, resolvedWeeklyCount - weeklyFrequency),
            };
          }

          const validationSuggestions = Array.from(new Map(
            [
              ...existingSlots,
              ...entry.slotsToApply,
            ]
              .filter((slot) => slot?.date && slot?.time)
              .map((slot) => [`${slot.date}#${slot.time}`, slot] as const),
          ).values());
          const data: any = await teaPreReservationService.validateWeekly({
            pitTherapyId: entry.therapy.pitTherapyId,
            suggestions: validationSuggestions,
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
          message: 'Algumas terapias não batem a frequência semanal do PIT. Ajuste a sugestão completa ou regerar.',
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
          professionalDoctorId: slot.professionalDoctorId || null,
          professionalName: slot.professionalName || null,
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
      await refreshPending();
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

    setUpdatingId(checklistGroupKey || reservationIds[0]);
    try {
      const results = await Promise.allSettled(
        reservationIds.map((reservationId) => {
          const reservation = checklistGroupReservations.find(
            (item) => String(item?.preReservationId || '') === String(reservationId),
          );
          const pitTherapyId = String(reservation?.pitTherapyId || reservation?.preReservationId || '').trim();
          const seriesStartDate = pitTherapyId ? String(acceptDateByTherapy[pitTherapyId] || '').trim() : '';

          return teaPreReservationService.convertToAppointment(reservationId, {
            convertSeries: true,
            seriesStartDate: seriesStartDate || undefined,
          });
        }),
      );

      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        await refreshPending();
        await queryClient.invalidateQueries({ queryKey: queryKeys.teaWeeklyAgenda });
        await queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
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
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }} className="tea-pre-reserva-page">
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
        classNames={{
          content: 'tea-pre-reserva-suggestion-modal',
          header: 'tea-pre-reserva-suggestion-modal__header',
          title: 'tea-pre-reserva-suggestion-modal__title',
          body: 'tea-pre-reserva-suggestion-modal__body',
          close: 'tea-pre-reserva-suggestion-modal__close',
        }}
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
        <Stack gap="md" className="tea-pre-reserva-suggestion-shell">
          <Paper p="md" withBorder className="tea-pre-reserva-suggestion-hero">
            <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
              <Box>
                <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-suggestion-hero__eyebrow">
                  Sugestao automatica
                </Text>
                <Text size="lg" fw={700} mt={6}>{suggestionModalContext?.patientName || 'Paciente'}</Text>
                <Text size="sm" className="tea-pre-reserva-muted" mt={6}>
                  Terapias do PIT: {suggestionModalContext?.therapies.length || 0}
                  {suggestionModalContext?.patientCpf ? ` • CPF: ${formatCPF(suggestionModalContext.patientCpf)}` : ''}
                </Text>
              </Box>
              <Box className="tea-pre-reserva-suggestion-hero__meta">
                <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-suggestion-label">
                  Recorrencia
                </Text>
                <Text size="sm" fw={700}>Semanal ate {recurringUntilLabel}</Text>
              </Box>
            </Group>
          </Paper>

          <Stack gap="sm">
            <Text size="sm" fw={700}>Distribuição semanal sugerida</Text>

          {modalSuggestions.length === 0 ? (
            <Paper p="md" withBorder className="tea-pre-reserva-suggestion-empty">
              <Text size="sm" c="dimmed">Sem horários sugeridos para visualização.</Text>
            </Paper>
          ) : (
            <>
              <Box className="tea-pre-reserva-suggestion-calendar-scroll">
                <Box className="tea-pre-reserva-suggestion-calendar-grid" style={{ minWidth: isMobile ? 840 : 'auto' }}>
                  {weeklyCalendarSuggestions.map((dayBlock) => (
                    <Paper key={dayBlock.date} p="sm" withBorder className="tea-pre-reserva-suggestion-day">
                      <Stack gap={6}>
                        <Text size="sm" fw={700}>{dayBlock.label}</Text>
                        {dayBlock.entries.length === 0 ? (
                          <Text size="xs" c="dimmed">—</Text>
                        ) : (
                          <Stack gap={4}>
                            {dayBlock.entries.map((entry) => {
                              const colorToken = therapyColorById[entry.pitTherapyId] || THERAPY_COLOR_TOKENS[0];
                              return (
                                <Paper
                                  key={`${dayBlock.date}-${entry.pitTherapyId}-${entry.time}`}
                                  p={6}
                                  withBorder
                                  className="tea-pre-reserva-suggestion-slot"
                                  style={{
                                    borderColor: colorToken.borderColor,
                                    backgroundColor: colorToken.backgroundColor,
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

          <Paper p="md" withBorder className="tea-pre-reserva-suggestion-panel">
                <Text size="sm" fw={700} mb="sm">Sugestão completa do PIT</Text>

                <Stack gap={8}>
                  {suggestionModalContext?.therapies.map((therapy) => {
                    const slots = suggestionsByTherapyId[therapy.pitTherapyId] || [];
                    const validation = weeklyValidationByTherapyId[therapy.pitTherapyId];
                    const isTherapyReady = autoSuggestionReadinessByTherapyId[therapy.pitTherapyId] === true;
                    const isRegenerating = loadingSuggestionsId === therapy.pitTherapyId;
                    const colorToken = therapyColorById[therapy.pitTherapyId] || THERAPY_COLOR_TOKENS[0];
                    const fallbackLevel = suggestionFallbackByTherapyId[therapy.pitTherapyId];
                    const fallbackLabel = fallbackLevel === 'nearest_day_same_shift'
                      ? 'Preferência ajustada para o dia útil mais próximo no mesmo turno'
                      : fallbackLevel === 'nearest_day_any_shift'
                        ? 'Preferência ajustada por indisponibilidade de dia/turno'
                        : null;

                    return (
                      <Paper
                        key={therapy.pitTherapyId}
                        p="sm"
                        withBorder
                        className="tea-pre-reserva-suggestion-therapy"
                        style={{
                          borderColor: validation && !validation.valid
                            ? 'var(--mantine-color-yellow-5)'
                            : colorToken.borderColor,
                          backgroundColor: colorToken.backgroundColor,
                        }}
                      >
                        <Group justify="space-between" wrap="wrap" gap="sm">
                          <Group gap="sm" style={{ flexShrink: 0 }}>
                            <Box
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                backgroundColor: isTherapyReady ? colorToken.accentColor : 'var(--mantine-color-yellow-5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: 5,
                              }}
                            />
                            <Stack gap={3}>
                              <Group gap={8} wrap="nowrap" align="center">
                                <Box
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    backgroundColor: colorToken.accentColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <Text size="sm" fw={700}>{therapy.procedureName}</Text>
                              </Group>
                              <Text size="xs" c="dimmed">
                                {therapy.professionalName}
                                {slots.length > 0 ? ` • ${slots.length} horário(s)` : ' • aguardando composição completa'}
                              </Text>
                            </Stack>
                          </Group>
                          <Group gap="xs" className="tea-pre-reserva-suggestion-therapy__meta">
                            {validation && (
                              <Box className={`tea-pre-reserva-suggestion-pill ${validation.valid ? 'tea-pre-reserva-suggestion-pill--success' : 'tea-pre-reserva-suggestion-pill--warning'}`}>
                                {validation.valid
                                  ? 'Frequência OK'
                                  : validation.missingSlots > 0
                                    ? `Faltam ${validation.missingSlots} horário(s)`
                                    : `Ajuste ${validation.exceedsSlots} horário(s)`}
                              </Box>
                            )}
                            {therapy.weeklyFrequency && (
                              <Box className="tea-pre-reserva-suggestion-pill tea-pre-reserva-suggestion-pill--neutral">
                                {therapy.weeklyFrequency}x/sem
                              </Box>
                            )}
                            {fallbackLabel && (
                              <Box className="tea-pre-reserva-suggestion-pill tea-pre-reserva-suggestion-pill--warning">
                                {fallbackLabel}
                              </Box>
                            )}
                            <Button
                              size="compact-sm"
                              className="tea-pre-reserva-suggestion-regenerate"
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
              </Paper>
            </>
          )}
          </Stack>

          <Paper p="md" withBorder className="tea-pre-reserva-suggestion-footer">
            <Group justify="flex-end" gap="sm">
              <Button
                className={getTeaActionButtonClass('secondary')}
                onClick={() => {
                  if (!suggestionModalContext) return;
                  setRejectDecisionOpened(true);
                }}
                disabled={!suggestionModalContext?.groupKey || updatingId === suggestionModalContext?.groupKey}
              >
                Recusar sugestão
              </Button>
              <Button
                className={getTeaActionButtonClass('success')}
                onClick={() => {
                  if (!suggestionModalContext) return;
                  setAcceptSuggestionDecisionOpened(true);
                }}
                loading={!!suggestionModalContext?.groupKey && updatingId === suggestionModalContext.groupKey}
                disabled={!suggestionModalContext?.groupKey || modalSuggestions.length === 0 || !autoSuggestionWholePitReady}
              >
                Aceitar sugestão
              </Button>
            </Group>
          </Paper>
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
        classNames={{
          content: 'tea-pre-reserva-decision-modal',
          header: 'tea-pre-reserva-decision-modal__header',
          title: 'tea-pre-reserva-decision-modal__title',
          body: 'tea-pre-reserva-decision-modal__body',
          close: 'tea-pre-reserva-decision-modal__close',
        }}
      >
        <Stack gap="md" className="tea-pre-reserva-decision-shell">
          <Paper p="md" withBorder className="tea-pre-reserva-decision-hero">
            <Stack gap={6}>
              <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-decision-hero__eyebrow">
                Decisao da Sugestao
              </Text>
              <Text size="sm" className="tea-pre-reserva-muted">
                A sugestão automática só pode seguir com o PIT completo. Depois disso, você escolhe se deseja apenas reservar ou enviar para aprovação.
              </Text>
            </Stack>
          </Paper>

          <Paper p="md" withBorder className="tea-pre-reserva-decision-footer">
            <Stack gap="sm">
              <Button
                className={getTeaActionButtonClass('success')}
                onClick={async () => {
                  if (!suggestionModalContext) return;
                  setAcceptSuggestionDecisionOpened(false);
                  await handleAcceptSuggestions(suggestionModalContext, { targetStatus: 'PROPOSED' });
                }}
                loading={!!suggestionModalContext?.groupKey && updatingId === suggestionModalContext.groupKey}
                disabled={!suggestionModalContext}
                fullWidth
              >
                Reservar e enviar para aprovação
              </Button>
              <Button
                className={getTeaActionButtonClass('primary')}
                onClick={async () => {
                  if (!suggestionModalContext) return;
                  setAcceptSuggestionDecisionOpened(false);
                  await handleAcceptSuggestions(suggestionModalContext, { targetStatus: 'PENDING_AUTHORIZATION' });
                }}
                loading={!!suggestionModalContext?.groupKey && updatingId === suggestionModalContext.groupKey}
                disabled={!suggestionModalContext}
                fullWidth
              >
                Apenas reservar
              </Button>
            </Stack>
          </Paper>
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
        classNames={{
          content: 'tea-pre-reserva-accept-modal',
          header: 'tea-pre-reserva-accept-modal__header',
          title: 'tea-pre-reserva-accept-modal__title',
          body: 'tea-pre-reserva-accept-modal__body',
          close: 'tea-pre-reserva-accept-modal__close',
        }}
        styles={{
          content: {
            width: 'min(96vw, 980px)',
            maxWidth: '980px',
          },
        }}
      >
        <Stack gap="md" className="tea-pre-reserva-accept-shell">
          <Paper p="md" withBorder className="tea-pre-reserva-accept-hero">
            <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
              <Box>
                <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-accept-eyebrow">
                  Etapa de Conversao
                </Text>
                <Group gap="xs" align="center" mt={6}>
                  <CalendarClock size={22} />
                  <Text size="lg" fw={700}>Confirmar agendamento</Text>
                </Group>
                <Text size="sm" className="tea-pre-reserva-muted" mt={8}>
                  Defina a primeira data disponivel para cada terapia antes de concluir a conversao.
                </Text>
              </Box>
              <Box className="tea-pre-reserva-accept-hero__counter">
                <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-accept-label">
                  Terapias
                </Text>
                <Text size="xl" fw={700}>{acceptTherapies.length}</Text>
              </Box>
            </Group>
          </Paper>

          <Stack gap="sm">
            {acceptTherapies.map((entry) => {
              const allDates = Array.from(new Set(entry.slots.map((s) => s.date))).sort((a,b)=>dayjs(a).valueOf()-dayjs(b).valueOf());
              const previewDates = buildRecurringPreviewDates(allDates, 6);
              const fallbackDates = allDates
                .filter((date) => !dayjs(date).isBefore(dayjs(), 'day'))
                .slice(0, 6);
              const dates = previewDates.length > 0 ? previewDates : fallbackDates;
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
              const selectedDate = acceptModalMode === 'conversion'
                ? (acceptDateByTherapy[entry.therapy.pitTherapyId] || '')
                : (acceptDateByTherapy[entry.therapy.pitTherapyId] || dateOptions[0]?.value || '');
              
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
                <Paper
                  key={entry.therapy.pitTherapyId}
                  p="md"
                  withBorder
                  className="tea-pre-reserva-accept-card"
                >
                  <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                    <Group align="center" gap="xs">
                      <Box className="tea-pre-reserva-accept-card__icon">
                        <CalendarClock size={16} />
                      </Box>
                      <Box>
                        <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-accept-label">
                          Procedimento
                        </Text>
                        <Text size="lg" fw={700}>{entry.therapy.procedureName}</Text>
                      </Box>
                    </Group>
                    <Group gap="xs" className="tea-pre-reserva-accept-stats">
                      <Box className="tea-pre-reserva-accept-pill tea-pre-reserva-accept-pill--primary">
                        {weeks} semana{weeks !== 1 ? 's' : ''}
                      </Box>
                      <Box className="tea-pre-reserva-accept-pill tea-pre-reserva-accept-pill--success">
                        {totalSessions} sess{totalSessions !== 1 ? 'oes' : 'ao'} (estimado)
                      </Box>
                    </Group>
                  </Group>
                  <Box className="tea-pre-reserva-accept-card__body">
                    <Stack gap={8}>
                      <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-accept-label">
                        Primeira data disponivel
                      </Text>
                      <Select
                        size="sm"
                        className="tea-pre-reserva-accept-select"
                        data={dateOptions}
                        value={selectedDate}
                        placeholder="Selecione a primeira data disponivel"
                        onChange={(v) => {
                          if (!v) return;
                          setAcceptDateByTherapy((prev) => ({ ...prev, [entry.therapy.pitTherapyId]: v }));
                        }}
                      />
                    </Stack>
                  </Box>
                  {selectedWeeklySlots.length > 0 && (
                    <Paper p="sm" withBorder className="tea-pre-reserva-accept-summary" mt="md">
                      <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-accept-label">
                        {acceptModalMode === 'suggestion' ? 'Sessoes na semana' : 'Horarios disponiveis para conversao'}
                      </Text>
                      <Text size="sm" className="tea-pre-reserva-accept-summary__text" mt={6}>
                        {selectedWeeklySlots.map((slot) => `${formatWeekdayPt(slot.date)} ${slot.time}`).join(' | ')}
                      </Text>
                    </Paper>
                  )}
                </Paper>
              );
            })}
          </Stack>

          <Paper p="md" withBorder className="tea-pre-reserva-accept-footer">
            <Group justify="flex-end" gap="sm">
              <Button className={getTeaActionButtonClass('secondary')} onClick={() => setAcceptModalOpened(false)}>
                Cancelar
              </Button>
              <Button
                className={getTeaActionButtonClass('primary')}
                disabled={acceptConversionHasMissingStartDate}
                onClick={async () => {
                  setAcceptModalOpened(false);
                  if (acceptModalMode === 'suggestion') {
                    if (!suggestionModalContext) return;
                    setAcceptSuggestionDecisionOpened(true);
                  } else if (acceptModalMode === 'conversion') {
                    if (conversionReservationIds.length === 0 || checklistItems.length === 0) {
                      showNotification({
                        title: 'Checklist pendente',
                        message: 'O PIT não possui terapias elegíveis para conversão.',
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
          </Paper>
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
        classNames={{
          content: 'tea-pre-reserva-manual-modal',
          header: 'tea-pre-reserva-manual-modal__header',
          title: 'tea-pre-reserva-manual-modal__title',
          body: 'tea-pre-reserva-manual-modal__body',
          close: 'tea-pre-reserva-manual-modal__close',
        }}
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
        <Stack gap="md" className="tea-pre-reserva-manual-shell">
          <Paper p="md" withBorder className="tea-pre-reserva-manual-hero">
            <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
              <Box>
                <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-manual-hero__eyebrow">
                  Proposta manual
                </Text>
                <Text size="lg" fw={700} mt={6}>{manualContext?.patientName || 'Paciente'}</Text>
                <Text size="sm" className="tea-pre-reserva-muted" mt={6}>
                  {manualContext?.patientCpf ? `CPF: ${formatCPF(manualContext.patientCpf)} • ` : ''}
                  Selecione uma terapia, clique em horarios livres e monte a proposta.
                </Text>
              </Box>
              <Box className="tea-pre-reserva-manual-hero__meta">
                <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-manual-label">
                  Status da selecao
                </Text>
                <Text size="sm" fw={700}>
                  {manualSelectedSessionCount}/{manualWeeklyLimit} por semana
                </Text>
              </Box>
            </Group>
          </Paper>

          <Paper p="md" withBorder className="tea-pre-reserva-manual-toolbar">
            <Group grow align="flex-end">
              <Select
                label="Terapia para preencher"
                className="tea-pre-reserva-manual-select"
                data={manualTherapyOptions}
                value={manualSelectedTherapyId}
                onChange={(value) => {
                  setManualSelectedTherapyId(value);
                }}
              />
            </Group>
          </Paper>

          {manualLoadingGrid ? (
            <Group justify="center"><Loader size="sm" /></Group>
          ) : manualTimeRows.length === 0 ? (
            <Paper p="md" withBorder className="tea-pre-reserva-manual-empty">
              <Text size="sm" c="dimmed">Sem horários disponíveis para esta semana.</Text>
            </Paper>
          ) : (
            <Paper p="md" withBorder className="tea-pre-reserva-manual-grid-card">
              <Box className="tea-pre-reserva-manual-grid-scroll">
                <Box className="tea-pre-reserva-manual-grid" style={{ minWidth: 860, gridTemplateColumns: '86px repeat(7, minmax(96px, 1fr))' }}>
                <Paper p="xs" withBorder className="tea-pre-reserva-manual-grid__head">
                  <Text size="xs" fw={700}>Horário</Text>
                </Paper>
                {manualWeekDays.map((day) => (
                  <Paper key={`head-${day.date}`} p="xs" withBorder className="tea-pre-reserva-manual-grid__head">
                    <Text size="xs" fw={700}>
                      {day.weekday ? String(day.weekday).slice(0, 3) : formatWeekdayPt(day.date).slice(0, 3)}
                    </Text>
                  </Paper>
                ))}

                {manualTimeRows.map((time) => (
                  <>
                    <Paper p="xs" withBorder className="tea-pre-reserva-manual-grid__time">
                      <Text size="xs" fw={600}>{time}</Text>
                    </Paper>
                    {manualWeekDays.map((day: TeaManualGridDay) => {
                      const slot = day.slots.find((item: TeaManualGridSlot) => item.time === time);
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
                      const isBlockedByOtherTherapySelection = manualSelectionsFromOtherTherapies.some((selected) => (
                        doSlotsOverlap(
                          {
                            date: day.date,
                            time,
                            durationMinutes: selectedDurationMinutes,
                          },
                          selected,
                        )
                      ));
                      const isExistingEditableSlot = !!manualSelectedTherapyId && (
                        manualEditableExistingSlotsByTherapyId[manualSelectedTherapyId] || []
                      ).some((selected) => selected.date === day.date && selected.time === time);
                      const canToggleExistingSlot = isExistingEditableSlot;
                      const effectiveSelectable = ((!isOccupied && isSelectable) || canToggleExistingSlot)
                        && !isBlockedBySelectedSession
                        && !isBlockedByOtherTherapySelection;
                      const reachedWeeklyLimit = manualSelectedSessionCount >= manualWeeklyLimit;
                      const canAddNewSelection = !reachedWeeklyLimit || isSelected;
                      const isFree = !isOccupied && effectiveSelectable && day.enabled;
                      const isUnavailable = !isOccupied && !isSelectable;
                      const isBlocked = !isOccupied && (isBlockedBySelectedSession || isBlockedByOtherTherapySelection);
                      const stateLabel = isSelected
                        ? 'Selecionado'
                        : isOccupied
                          ? 'Ocupado'
                          : isBlocked
                            ? (isBlockedByOtherTherapySelection ? 'Bloqueado por outra terapia selecionada' : 'Bloqueado pela sessão selecionada')
                          : isFree
                            ? 'Livre'
                            : 'Indisponível';
                      const dayLabel = day.weekday || formatWeekdayPt(day.date) || dayjs(day.date).format('ddd');

                      return (
                        <Button
                          key={`${day.date}-${time}`}
                          size="compact-xs"
                          variant="filled"
                          className="tea-pre-reserva-manual-grid__slot"
                          disabled={isOccupied || !effectiveSelectable || !manualSelectedTherapyId || !canAddNewSelection}
                          title={`${dayLabel} ${time} • ${stateLabel}`}
                          aria-label={`${dayLabel} ${time} • ${stateLabel}`}
                          onClick={() => {
                            if (isOccupied && !canToggleExistingSlot) {
                              showNotification({
                                title: 'Horário ocupado',
                                message: 'Esse horário já está reservado para outra consulta e não pode ser marcado.',
                                color: 'yellow',
                              });
                              return;
                            }
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

                            setManualSelectedSlotsByTherapyId((prev) => {
                              if (!manualSelectedTherapyId) return prev;

                              const currentSelections = prev[manualSelectedTherapyId] || [];
                              const toSignature = (slotItem: { date: string; time: string }) => `${slotItem.date}#${slotItem.time}`;
                              const anchorSlot = { date: day.date, time };
                              const anchorSignature = toSignature(anchorSlot);
                              const prevSignatureSet = new Set(currentSelections.map(toSignature));

                              const coveredAnchor = currentSelections.find((slotItem) => (
                                slotItem.date === day.date
                                && isSlotCoveredBySession(day.slots, slotItem.time, time, selectedDurationMinutes)
                              ));
                              if (coveredAnchor) {
                                const coveredAnchorSignature = toSignature(coveredAnchor);
                                return {
                                  ...prev,
                                  [manualSelectedTherapyId]: currentSelections.filter((slotItem) => toSignature(slotItem) !== coveredAnchorSignature),
                                };
                              }

                              // Toggle behavior: clicking an already selected start slot removes it.
                              if (prevSignatureSet.has(anchorSignature)) {
                                return {
                                  ...prev,
                                  [manualSelectedTherapyId]: currentSelections.filter((slotItem) => toSignature(slotItem) !== anchorSignature),
                                };
                              }

                              const anchorStartMinutes = timeToMinutes(anchorSlot.time);
                              const anchorEndMinutes = anchorStartMinutes + selectedDurationMinutes;
                              const hasOverlap = currentSelections.some((slotItem) => {
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

                              const merged = [...currentSelections, anchorSlot];

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

                              return {
                                ...prev,
                                [manualSelectedTherapyId]: normalizedMerged,
                              };
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
            </Paper>
          )}

          <Paper p="md" withBorder className="tea-pre-reserva-manual-footer">
            <Group justify="space-between" wrap="wrap" gap="sm">
              <Group gap="xs">
                <Box className="tea-pre-reserva-manual-pill tea-pre-reserva-manual-pill--neutral">Ocupado</Box>
                <Box className="tea-pre-reserva-manual-pill tea-pre-reserva-manual-pill--primary">Livre</Box>
                <Box className="tea-pre-reserva-manual-pill tea-pre-reserva-manual-pill--success">Selecionado</Box>
                <Box className={`tea-pre-reserva-manual-pill ${manualSelectionComplete ? 'tea-pre-reserva-manual-pill--success-soft' : 'tea-pre-reserva-manual-pill--warning'}`}>
                  Selecionado: {manualSelectedSessionCount}/{manualWeeklyLimit} por semana
                </Box>
              </Group>
              <Group gap="xs">
                <Button
                  className={getTeaActionButtonClass('secondary')}
                  onClick={() => {
                    if (!manualSelectedTherapyId) return;
                    setManualSelectedSlotsByTherapyId((prev) => ({
                      ...prev,
                      [manualSelectedTherapyId]: [],
                    }));
                  }}
                  disabled={manualSelectedSlots.length === 0 || manualSaving}
                >
                  Limpar seleção
                </Button>
                <Button
                  className={getTeaActionButtonClass('success')}
                  onClick={handleManualConfirmReservation}
                  loading={manualSaving}
                  disabled={!manualSelectedTherapyId || manualSelectedSlots.length === 0 || manualSaving}
                >
                  Confirmar reserva manual
                </Button>
              </Group>
            </Group>
          </Paper>
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
                await handleSubmitManualReservation('PENDING_AUTHORIZATION');
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
            timelineEvents.map((event: any) => (
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
        opened={authorizationAttachmentsModalOpened}
        onClose={() => setAuthorizationAttachmentsModalOpened(false)}
        title={`Anexos do convênio • ${authorizationAttachmentsLabel || 'PIT'}`}
        centered
        size="md"
      >
        <Stack gap="sm">
          {authorizationAttachmentsItems.length === 0 ? (
            <Text size="sm" c="dimmed">Nenhum anexo enviado para este PIT.</Text>
          ) : (
            authorizationAttachmentsItems.map((attachment) => (
              <Paper key={attachment.id} p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Group justify="space-between" align="center" wrap="wrap">
                  <Stack gap={2}>
                    <Text size="sm" fw={600}>{attachment.fileName}</Text>
                    <Text size="xs" c="dimmed">
                      {attachment.uploadedAt ? dayjs(attachment.uploadedAt).format('DD/MM/YYYY HH:mm') : 'Data não informada'}
                    </Text>
                  </Stack>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<Upload size={14} />}
                    onClick={() => handleOpenAuthorizationAttachment(attachment.id)}
                    loading={openingAuthorizationAttachmentId === attachment.id}
                  >
                    Visualizar
                  </Button>
                </Group>
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
        size="lg"
        classNames={{
          content: 'tea-pre-reserva-bulk-modal',
          header: 'tea-pre-reserva-bulk-modal__header',
          title: 'tea-pre-reserva-bulk-modal__title',
          body: 'tea-pre-reserva-bulk-modal__body',
          close: 'tea-pre-reserva-bulk-modal__close',
        }}
      >
        <Stack gap="md" className="tea-pre-reserva-bulk-shell">
          <Paper p="md" withBorder className="tea-pre-reserva-bulk-hero">
            <Stack gap={6}>
              <Text size="xs" fw={700} tt="uppercase" className="tea-pre-reserva-bulk-hero__eyebrow">
                Ação em lote
              </Text>
              <Text size="sm" className="tea-pre-reserva-muted">
                {bulkStatusActionState
                  ? `Selecione uma ou mais terapias de ${bulkStatusActionState.patientName} para aplicar a ação.`
                  : 'Selecione uma ou mais terapias para continuar.'}
              </Text>
            </Stack>
          </Paper>

          <Stack gap="sm">
            {bulkStatusActionState?.options.map((option) => {
              const isChecked = bulkStatusSelectedReservationIds.includes(option.reservationId);
              return (
                <UnstyledButton
                  key={option.reservationId}
                  type="button"
                  className="tea-pre-reserva-bulk-option"
                  data-selected={isChecked ? 'true' : undefined}
                  onClick={() => {
                    setBulkStatusSelectedReservationIds((prev) => (
                      isChecked
                        ? prev.filter((id) => id !== option.reservationId)
                        : Array.from(new Set([...prev, option.reservationId]))
                    ));
                  }}
                >
                  <Group gap="md" wrap="nowrap" align="center">
                    <Box className="tea-pre-reserva-bulk-option__check" data-selected={isChecked ? 'true' : undefined}>
                      {isChecked ? <Check size={15} strokeWidth={3} /> : null}
                    </Box>
                    <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                      <Text size="lg" fw={700} lineClamp={1}>{option.procedureName}</Text>
                      <Text size="sm" c="dimmed" lineClamp={1}>{option.professionalName}</Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>

          <Paper p="md" withBorder className="tea-pre-reserva-bulk-footer">
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap" className="tea-pre-reserva-bulk-toolbar">
                <Group gap="xs">
                  <Button
                    size="sm"
                    className={getTeaActionButtonClass('secondary')}
                    onClick={() => setBulkStatusSelectedReservationIds(bulkStatusActionState?.options.map((option) => option.reservationId) || [])}
                    disabled={!bulkStatusActionState?.options.length || !!updatingId}
                  >
                    Selecionar todas
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    color="blue"
                    onClick={() => setBulkStatusSelectedReservationIds([])}
                    disabled={bulkStatusSelectedReservationIds.length === 0 || !!updatingId}
                  >
                    Limpar
                  </Button>
                </Group>
                <Text size="sm" className="tea-pre-reserva-muted">
                  Selecionadas: {bulkStatusSelectedReservationIds.length}
                </Text>
              </Group>

              <Group justify="flex-end" gap="sm">
                <Button
                  className={getTeaActionButtonClass('secondary')}
                  onClick={() => {
                    setBulkStatusActionState(null);
                    setBulkStatusSelectedReservationIds([]);
                  }}
                  disabled={!!updatingId}
                >
                  Cancelar
                </Button>
                <Button
                  className={getTeaActionButtonClass('primary')}
                  onClick={confirmBulkStatusAction}
                  loading={!!bulkStatusActionState?.groupKey && updatingId === bulkStatusActionState.groupKey}
                  disabled={bulkStatusSelectedReservationIds.length === 0}
                >
                  Confirmar ação
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Modal>

      <Modal
        opened={checklistModalOpened}
        onClose={() => setChecklistModalOpened(false)}
        title={`Checklist pré-conversão • ${checklistGroupLabel || 'PIT'}`}
        centered
        size="lg"
        classNames={{
          content: 'tea-pre-reserva-checklist-modal',
          header: 'tea-pre-reserva-checklist-modal__header',
          title: 'tea-pre-reserva-checklist-modal__title',
          body: 'tea-pre-reserva-checklist-modal__body',
          close: 'tea-pre-reserva-checklist-modal__close',
        }}
      >
        <Stack gap="md">
          {checklistLoading ? (
            <Group justify="center"><Loader size="sm" /></Group>
          ) : (
            <>
              <Text size="sm" className="tea-pre-reserva-muted">
                Validação dos itens de todas as terapias do PIT antes da conversão.
              </Text>

              <Box className="tea-pre-reserva-checklist-patient">
                <Box className="tea-pre-reserva-checklist-patient__field tea-pre-reserva-checklist-patient__field--full">
                  <Text size="sm" className="tea-pre-reserva-checklist-patient__label">Nome</Text>
                  <Text size="xl" className="tea-pre-reserva-checklist-patient__value">{checklistPatientName}</Text>
                </Box>
                <Box className="tea-pre-reserva-checklist-patient__grid">
                  <Box className="tea-pre-reserva-checklist-patient__field">
                    <Text size="sm" className="tea-pre-reserva-checklist-patient__label">CPF</Text>
                    <Text size="lg" className="tea-pre-reserva-checklist-patient__value">
                      {checklistPatientCpf ? formatCPF(checklistPatientCpf) : '-'}
                    </Text>
                  </Box>
                  <Box className="tea-pre-reserva-checklist-patient__field">
                    <Text size="sm" className="tea-pre-reserva-checklist-patient__label">Data de nascimento</Text>
                    <Text size="lg" className="tea-pre-reserva-checklist-patient__value">
                      {checklistPatientBirthDate ? dayjs(checklistPatientBirthDate).format('DD/MM/YYYY') : '-'}
                    </Text>
                  </Box>
                </Box>
              </Box>
              {(() => {
                const groupedItems = Array.from(
                  checklistItems.reduce<Map<string, TeaConversionChecklistItem[]>>((acc, item: TeaConversionChecklistItem) => {
                    const procedure = item.procedureName || 'Procedimento não definido';
                    if (!acc.has(procedure)) acc.set(procedure, []);
                    acc.get(procedure)?.push(item);
                    return acc;
                  }, new Map<string, TeaConversionChecklistItem[]>()),
                ) as Array<[string, TeaConversionChecklistItem[]]>;
                if (groupedItems.length === 0) {
                  return <Text size="sm" c="dimmed">Sem itens de checklist para este PIT.</Text>;
                }

                return (
                  <Stack gap="md">
                    {groupedItems.map(([procedure, procedureItems]: [string, TeaConversionChecklistItem[]]) => {
                      const pendingCount = procedureItems.filter((item: TeaConversionChecklistItem) => !item.valid).length;
                      return (
                        <Stack key={procedure} gap="sm" className="tea-pre-reserva-checklist-group">
                          <Paper p="sm" withBorder className="tea-pre-reserva-checklist-group__header">
                            <Group justify="space-between" wrap="wrap">
                              <Text fw={600} size="lg">{procedure}</Text>
                              <Text
                                fw={500}
                                size="md"
                                c={pendingCount === 0 ? 'green' : 'orange'}
                              >
                                {pendingCount === 0 ? 'Checklist OK' : `${pendingCount} pendência(s)`}
                              </Text>
                            </Group>
                          </Paper>
                          {procedureItems.map((item: TeaConversionChecklistItem) => (
                            <Paper
                              key={item.key}
                              p="sm"
                              withBorder
                              className="tea-pre-reserva-checklist-item"
                              style={{ borderColor: 'var(--mantine-color-default-border)' }}
                            >
                              <Group justify="space-between" align="center" wrap="wrap">
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                  <Text size="lg">{item.label}</Text>
                                  <Text size="sm" className="tea-pre-reserva-muted">{item.message || '-'}</Text>
                                </Box>
                                <Box
                                  className={`tea-pre-reserva-checklist-badge ${item.valid ? 'is-valid' : 'is-invalid'}`}
                                >
                                  {item.valid ? <CircleCheck size={18} /> : <CircleX size={18} />}
                                  {item.valid ? 'OK' : 'Pendente'}
                                </Box>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      );
                    })}
                  </Stack>
                );
              })()}
              <Group justify="flex-end">
                <Button className={getTeaActionButtonClass('secondary')} onClick={() => setChecklistModalOpened(false)}>
                  Fechar
                </Button>
                <Button
                  className={getTeaActionButtonClass('primary')}
                  disabled={!checklistCanConvertWholePit}
                  loading={!!checklistGroupKey && updatingId === checklistGroupKey}
                  onClick={() => openConversionConfirmationModal(checklistConvertiblePitReservations)}
                >
                  Finalizar
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      <Box p={isMobile ? 'sm' : 'xl'} w="100%" className="tea-pre-reserva-shell">
        <Group mb={18} align="center" wrap="nowrap">
          <Button className="tea-pre-reserva-back-button" onClick={() => navigate('/tea')} aria-label="Voltar">
            <ChevronLeft size={18} />
          </Button>
          <Box>
            <Text fw={700} size="lg" style={{ color: 'var(--mantine-color-text)' }}>Pré-reserva TEA</Text>
            <Text size="sm" c="dimmed">Pendências de marcação com base no PIT</Text>
          </Box>
        </Group>

        <Group gap="xs" mb="md">
          <Button
            size="xs"
            className="tea-pre-reserva-tab-button"
            data-active={activeTab === 'pendencias' ? 'true' : undefined}
            onClick={() => setActiveTab('pendencias')}
          >
            <Group gap={10} wrap="nowrap">
              <Text span inherit>Pendências</Text>
              <Box component="span" className="tea-pre-reserva-tab-count">
                {pendingGroups.length}
              </Box>
            </Group>
          </Button>
          <Button
            size="xs"
            className="tea-pre-reserva-tab-button"
            data-active={activeTab === 'concluidas' ? 'true' : undefined}
            onClick={() => setActiveTab('concluidas')}
          >
            <Group gap={10} wrap="nowrap">
              <Text span inherit>Concluídas</Text>
              <Box component="span" className="tea-pre-reserva-tab-count">
                {completedReservationGroupsWithoutPending.length}
              </Box>
            </Group>
          </Button>
        </Group>

        <Group grow className="tea-pre-reserva-search" mb="md">
          <TextInput
            placeholder="Buscar paciente por nome ou CPF.."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
        </Group>

        <Paper p="md" withBorder className="tea-pre-reserva-panel" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="md">
            <Group align="center" wrap="wrap">
              <Text fw={700} className="tea-pre-reserva-section-title">Filtrar PITs</Text>
            </Group>

            <Group gap="xs">
              {summaryBadgeDefinitions.map((badge) => {
                const isActive = badgeFilter === badge.key;
                const Icon = badge.icon;
                return (
                  <UnstyledButton
                    key={badge.key}
                    type="button"
                    className="tea-pre-reserva-filter-chip"
                    data-active={isActive ? 'true' : undefined}
                    onClick={() => handleBadgeClick(badge.key)}
                  >
                    <Group gap={8} wrap="nowrap">
                      {Icon ? <Icon size={16} color={badge.iconColor} /> : null}
                      <Text span inherit>{badge.label}</Text>
                      <Box component="span" className="tea-pre-reserva-filter-chip-count">
                        {badge.count}
                      </Box>
                    </Group>
                  </UnstyledButton>
                );
              })}
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
                      const allPitTherapiesForSummary = [
                        ...(group.therapies || []),
                        ...existingReservationsWithoutDuplicates,
                        ...completedReservationsWithoutDuplicates,
                      ];
                      const schedulablePitTherapies = allPitTherapiesForSummary.filter(isTherapyStillSchedulable);
                      const schedulableGroupContext = buildGroupContextFromItems({
                        ...group,
                        therapies: schedulablePitTherapies,
                      });
                      const groupTeaProfileId = String(group.therapies[0]?.teaProfileId || group.therapies[0]?.pitId || '');
                      const frequencyChangedTherapies = group.therapies.filter((item) => String(item?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE');
                      const allReservationsForSamePit = [
                        ...(existingGroupForSamePit?.reservations || []),
                        ...(completedGroupForSamePit?.reservations || []),
                      ];
                      const pitAuthorizationAttachments = getAuthorizationAttachmentsFromItems([
                        ...allPitTherapiesForSummary,
                      ]);
                      const pitProgress = buildPitProgressFromItems([
                        ...allPitTherapiesForSummary,
                      ]);
                      const hasFrequencyChangeAlert = frequencyChangedTherapies.length > 0;
                      const canScheduleGroup = schedulableGroupContext.therapies.length > 0;
                      const existingSlotsByTherapy = buildExistingSlotsByTherapyFromReservations([
                        ...(group.therapies || []),
                        ...allReservationsForSamePit,
                      ], {
                        includeStatuses: PERSISTED_RESERVATION_SLOT_STATUSES,
                      });
                      const hasSchedulableTherapiesInPending = schedulablePitTherapies.length > 0;
                      const totalSuggested = schedulableGroupContext.therapies.reduce(
                        (acc, therapy) => acc + (suggestionsByTherapyId[therapy.pitTherapyId]?.length || 0),
                        0,
                      );
                      const hasPendingApprovalReservationsInPit = allReservationsForSamePit.some(
                        (item) => String(item?.status || '') === 'PROPOSED',
                      );
                      const hasAuthorizedReservationsInPit = allReservationsForSamePit.some(
                        (item) => String(item?.status || '') === 'AUTHORIZED',
                      );

                      const openPendingPitBulkStatusAction = (
                        fromStatus: TeaPreReservationStatus,
                        toStatus: TeaPreReservationStatus,
                        successMessage: string,
                      ) => {
                        const anchorByTherapy = new Map<string, any>();
                        allReservationsForSamePit.forEach((item) => {
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

                        const actionLabel = toStatus === 'PENDING_SCHEDULING' ? 'Retornar para reserva' : 'Aprovar reserva';
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
                      };

                      const handleOpenPendingPitConversionChecklist = async () => {
                        const eligibleReservations = allReservationsForSamePit.filter(
                          (item) => String(item?.status || '') === 'AUTHORIZED',
                        );
                        const anchorByTherapy = new Map<string, any>();
                        eligibleReservations.forEach((item) => {
                          const therapyId = String(item?.pitTherapyId || '');
                          if (!therapyId || anchorByTherapy.has(therapyId)) return;
                          anchorByTherapy.set(therapyId, item);
                        });
                        const eligibleAnchors = Array.from(anchorByTherapy.values());

                        if (eligibleAnchors.length === 0) {
                          showNotification({
                            title: 'Sem itens elegíveis',
                            message: 'Este PIT ainda não possui terapias autorizadas para reservar.',
                            color: 'yellow',
                          });
                          return;
                        }

                        setChecklistModalOpened(true);
                        setChecklistGroupKey(group.groupKey);
                        setChecklistGroupLabel(`${group.patientName} • PIT`);
                        setChecklistGroupReservations(eligibleReservations);
                        setConversionReservationIds(
                          eligibleAnchors.map((item) => String(item?.preReservationId || '')).filter(Boolean),
                        );
                        setChecklistReservations(
                          eligibleAnchors.map((reservation) => ({
                            reservationId: String(reservation?.preReservationId || ''),
                            procedureName: getReservationProcedureName(reservation),
                          })).filter((item) => Boolean(item.reservationId)),
                        );
                      };

                      return (
                        <Paper key={group.groupKey} p="sm" withBorder className="tea-pre-reserva-card" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                          <Stack gap={8}>
                            <Group justify="space-between" align="center" wrap="wrap">
                              <Text fw={600}>{group.patientName}</Text>
                              <Group gap="xs">
                                <Text fw={500}>PIT Reserva</Text>
                                {hasFrequencyChangeAlert && (
                                  <Badge variant="light" color="blue">Frequência alterada</Badge>
                                )}
                              </Group>
                            </Group>

                            <Text size="xs" c="dimmed">
                              {group.patientCpf ? `CPF: ${formatCPF(group.patientCpf)}` : 'CPF: Nao informado'}
                            </Text>

                            <Box>
                              {renderProgressTrail(pitProgress, `pit-pending-${group.groupKey}`)}
                            </Box>

                            <Paper
                              p="xs"
                              withBorder
                              className="tea-pre-reserva-subcard"
                              style={{ borderColor: 'var(--mantine-color-default-border)' }}
                            >
                              <Stack gap={0}>
                              {group.therapies.map((therapyItem, index) => {
                                const pendingCardKey = `pending-${group.groupKey}-${String(therapyItem.pitTherapyId || 'unknown')}`;
                                const isPendingCardCollapsed = Boolean(collapsedTherapyCards[pendingCardKey]);
                                const existingScheduledSlots = existingSlotsByTherapy[String(therapyItem?.pitTherapyId || '')] || [];
                                const hasExpandableAlerts = Boolean(
                                  therapyItem?.removedFromPit
                                  || String(therapyItem?.source || '') === 'PIT_PENDING_FREQUENCY_CHANGE'
                                );
                                return (
                                <Box key={String(therapyItem.pitTherapyId)}>
                                  {index > 0 && <Divider my="xs" />}
                                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                                    <Box style={{ flex: 1, minWidth: 0 }}>
                                      <Text size="sm" fw={500}>
                                        {therapyItem.procedure?.name || 'Procedimento nao definido'}
                                      </Text>
                                    </Box>
                                    <Group gap="xs" align="flex-start" wrap="nowrap">
                                      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                                        <Text size="sm" fw={500}>
                                          {Math.max(1, Number(therapyItem.preferences?.weeklyFrequency || 1))}x/semana
                                        </Text>
                                        <Text size="sm" ta="right">
                                          {formatWeekdaySummary(therapyItem.preferences?.weekdays)}
                                        </Text>
                                        {existingScheduledSlots.length > 0 && (
                                          <Text size="xs" c="dimmed" ta="right" style={{ whiteSpace: 'nowrap' }}>
                                            Horários já agendados: {formatScheduledSlotsSummary(existingScheduledSlots)}
                                          </Text>
                                        )}
                                    </Stack>
                                    {hasExpandableAlerts && (
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
                                    )}
                                    </Group>
                                  </Group>
                                  {false && existingScheduledSlots.length > 0 && (
                                    <Text size="xs" c="dimmed" mt={4}>
                                      Horários já agendados: {formatScheduledSlotsSummary(existingScheduledSlots)}
                                    </Text>
                                  )}
                                  {hasExpandableAlerts && !isPendingCardCollapsed && (
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
                                </Box>
                                );
                              })}
                              {[...existingReservationsWithoutDuplicates, ...completedReservationsWithoutDuplicates].map((item) => (
                                <Box key={`summary-${String(item.preReservationId)}`}>
                                  {(() => {
                                    const persistedReservedSlots = getPersistedSlotsFromReservation(item);
                                    const shouldShowPersistedReservedSlots = (
                                      ['PENDING_AUTHORIZATION', 'AUTHORIZED', 'CONVERTED'].includes(String(item?.status || ''))
                                      && persistedReservedSlots.length > 0
                                    );
                                    const scheduleSummaryLabel = shouldShowPersistedReservedSlots
                                      ? formatScheduledSlotsSummary(persistedReservedSlots)
                                      : formatWeekdaySummary(item?.preferences?.weekdays);
                                    return (
                                      <>
                                  <Divider my="xs" />
                                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                                    <Box style={{ flex: 1, minWidth: 0 }}>
                                      <Group gap={8} wrap="wrap" align="center">
                                        <Text size="sm" fw={500}>
                                          {item.procedure?.name || item.procedureName || 'Procedimento não definido'}
                                        </Text>
                                        {item.status === 'PROPOSED' && (
                                          <Box className="tea-pre-reserva-inline-status tea-pre-reserva-inline-status--approval">
                                            Aguardando aprovação
                                          </Box>
                                        )}
                                        {item.status === 'PENDING_AUTHORIZATION' && (
                                          <Box className="tea-pre-reserva-inline-status tea-pre-reserva-inline-status--authorization">
                                            Em autorização
                                          </Box>
                                        )}
                                        {item.status === 'AUTHORIZED' && (
                                          <Box className="tea-pre-reserva-inline-status tea-pre-reserva-inline-status--authorized">
                                            Autorizado
                                          </Box>
                                        )}
                                        {item.status === 'CONVERTED' && (
                                          <Box className="tea-pre-reserva-inline-status tea-pre-reserva-inline-status--scheduled">
                                            Agendado
                                          </Box>
                                        )}
                                      </Group>
                                      {item.status === 'CONVERTED' && (
                                        <Text size="xs" mt={6} c="teal">
                                          Procedimento convertido em agendamento.
                                        </Text>
                                      )}
                                      {shouldShowPersistedReservedSlots && (
                                        <Text size="xs" mt={6} c="dimmed">
                                          Horários reservados: {formatScheduledSlotsSummary(persistedReservedSlots)}
                                        </Text>
                                      )}
                                    </Box>
                                    <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                                      <Text size="sm" fw={500}>
                                        {Math.max(1, Number(item?.preferences?.weeklyFrequency || 1))}x/semana
                                      </Text>
                                      <Text size="sm" ta="right">
                                        {scheduleSummaryLabel}
                                      </Text>
                                    </Stack>
                                  </Group>
                                      </>
                                    );
                                  })()}
                                </Box>
                              ))}
                              </Stack>
                            </Paper>

                            {hasPendingApprovalReservationsInPit && (
                              <Box className="tea-pre-reserva-actions-grid tea-pre-reserva-actions-grid--approval">
                                <Button
                                  className={getTeaActionButtonClass('success')}
                                  leftSection={<CircleCheck size={18} />}
                                  onClick={() => openPendingPitBulkStatusAction(
                                    'PROPOSED',
                                    'PENDING_AUTHORIZATION',
                                    'Reservas aprovadas e enviadas para autorização.',
                                  )}
                                  loading={updatingId === group.groupKey}
                                >
                                  Aprovar reserva
                                </Button>
                                <Button
                                  className={getTeaActionButtonClass('danger')}
                                  leftSection={<CircleX size={18} />}
                                  onClick={() => openPendingPitBulkStatusAction(
                                    'PROPOSED',
                                    'PENDING_SCHEDULING',
                                    'Reservas retornadas para a etapa de reserva para nova tentativa.',
                                  )}
                                  loading={updatingId === group.groupKey}
                                >
                                  Não aprovar reserva
                                </Button>
                              </Box>
                            )}

                            <Box className="tea-pre-reserva-actions-grid">
                              {hasAuthorizedReservationsInPit && (
                                <Button
                                  size="xs"
                                  className={getTeaActionButtonClass('primary')}
                                  leftSection={<CalendarClock size={16} />}
                                  onClick={() => void handleOpenPendingPitConversionChecklist()}
                                >
                                  Agendar
                                </Button>
                              )}
                              <Button
                                size="xs"
                                className={getTeaActionButtonClass('primary')}
                                leftSection={<Hand size={16} />}
                                loading={updatingId === group.groupKey}
                                onClick={() => openManualProposalModal(schedulableGroupContext, {
                                  existingSlotsByTherapy,
                                })}
                                disabled={!canScheduleGroup}
                              >
                                Reserva Manual
                              </Button>
                              <Button
                                size="xs"
                                className={getTeaActionButtonClass('secondary')}
                                leftSection={<Paperclip size={16} />}
                                onClick={() => handleOpenPitAuthorizationAttachments(`${group.patientName} • PIT`, allPitTherapiesForSummary)}
                                disabled={pitAuthorizationAttachments.length === 0}
                              >
                                Ver Anexos
                              </Button>
                              {hasSchedulableTherapiesInPending && (
                                <Button
                                  size="xs"
                                  className={getTeaActionButtonClass('secondary')}
                                  leftSection={<Sparkles size={16} />}
                                  loading={loadingSuggestionsId === group.groupKey}
                                  onClick={() => handleLoadGroupSuggestions(schedulableGroupContext, {
                                    existingSlotsByTherapy,
                                    daysAhead: 90,
                                  })}
                                  disabled={!canScheduleGroup}
                                >
                                  Sugerir horários automáticos
                                </Button>
                              )}
                              <Button
                                size="xs"
                                className={getTeaActionButtonClass('danger')}
                                leftSection={<Trash2 size={16} />}
                                loading={deletePitTarget?.groupKey === group.groupKey && updatingId === group.groupKey}
                                onClick={() => handleDeletePitByTeaProfileId(groupTeaProfileId, group.groupKey, String(group.therapies[0]?.pitId || ''))}
                                disabled={!groupTeaProfileId}
                              >
                                Excluir PIT
                              </Button>
                            </Box>

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
