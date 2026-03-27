import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Stack,
  SimpleGrid,
  ActionIcon,
  Modal,
  Radio,
  ThemeIcon,
  useMantineColorScheme,
  Skeleton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Plus, Trash2, ClipboardList, Layers3 } from 'lucide-react';
import dayjs from 'dayjs';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import teaProfileService from '../../services/teaProfileService';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF, parseApiDateToLocalDate } from '../../utils/formatters';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useTeaPitQuery } from '../../hooks/useTeaPitQuery';
import { usePatientAppointmentsQuery } from '../../hooks/usePatientAppointmentsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingDateInput } from '../common/FloatingDateInput';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { FloatingNumberInput } from '../common/FloatingNumberInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';

interface TherapyItem {
  id?: string;
  procedureId: string;
  therapyType: string;
  weeklyFrequency: number;
  preferredWeekdays: string[];
  preferredShift: string[];
  durationMinutes: number | null;
  professionalDoctorId: string;
  professional: string;
  notes: string;
}

type RemovedTherapyDecision = {
  id: string;
  action: 'KEEP_FUTURE_APPOINTMENTS' | 'CANCEL_FUTURE_APPOINTMENTS';
};

const EMPTY_THERAPY: TherapyItem = {
  id: undefined,
  procedureId: '',
  therapyType: '',
  weeklyFrequency: 1,
  preferredWeekdays: [],
  preferredShift: [],
  durationMinutes: null,
  professionalDoctorId: '',
  professional: '',
  notes: '',
};

const WEEKDAY_OPTIONS = [
  { value: 'SEGUNDA', label: 'Segunda' },
  { value: 'TERCA', label: 'Terça' },
  { value: 'QUARTA', label: 'Quarta' },
  { value: 'QUINTA', label: 'Quinta' },
  { value: 'SEXTA', label: 'Sexta' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
];

const SHIFT_OPTIONS = [
  { value: 'MANHA', label: 'Manhã' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOITE', label: 'Noite' },
];

const WEEKDAY_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const timeToMinutes = (time?: string | null) => {
  const [hourRaw, minuteRaw] = String(time || '').split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return (hour * 60) + minute;
};

const formatScheduledSlotSummary = (slots: Array<{ date: string; time: string }> = []) => {
  return [...slots]
    .filter((slot) => slot?.date && slot?.time)
    .map((slot) => ({
      weekday: WEEKDAY_PT[dayjs(slot.date).day()] || '',
      time: String(slot.time).trim(),
    }))
    .filter((slot) => slot.weekday && slot.time)
    .filter((slot, index, arr) => arr.findIndex((item) => item.weekday === slot.weekday && item.time === slot.time) === index)
    .sort((a, b) => {
      const weekdayDiff = WEEKDAY_PT.indexOf(a.weekday) - WEEKDAY_PT.indexOf(b.weekday);
      if (weekdayDiff !== 0) return weekdayDiff;
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    })
    .map((slot) => `${slot.weekday} ${slot.time}`)
    .join(' | ');
};

const extractScheduledSlotsFromTherapy = (therapy: any) => {
  const slotCandidates: Array<{ date: string; time: string }> = [];
  const appendSlot = (dateRaw: unknown, timeRaw: unknown) => {
    const parsedDate = parseApiDateToLocalDate(dateRaw as string);
    const date = parsedDate ? dayjs(parsedDate).format('YYYY-MM-DD') : '';
    const time = String(timeRaw || '').trim();
    if (!date || !time) return;
    if (slotCandidates.some((slot) => slot.date === date && slot.time === time)) return;
    slotCandidates.push({ date, time });
  };

  const slotArrays = [
    therapy?.weeklySlotPattern,
    therapy?.scheduledSlots,
    therapy?.appointments,
    therapy?.futureAppointments,
    therapy?.preReservations,
    therapy?.reservations,
  ];

  slotArrays.forEach((items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item: any) => {
      appendSlot(
        item?.date || item?.sessionDate || item?.suggestedDate || item?.slotSuggestion?.suggestedDate,
        item?.time || item?.sessionTime || item?.suggestedTime || item?.slotSuggestion?.suggestedTime,
      );
    });
  });

  appendSlot(therapy?.sessionDate, therapy?.sessionTime);
  appendSlot(therapy?.suggestedDate, therapy?.suggestedTime);

  return slotCandidates;
};

export function TeaPIT() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const heroBg = colorScheme === 'dark' ? 'transparent' : 'var(--mantine-color-gray-0)';
  const contentBg = colorScheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'var(--mantine-color-white)';
  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('PIT - Plano Integrado de Terapias');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [reviewDate, setReviewDate] = useState<Date | null>(null);
  const [status, setStatus] = useState('Ativo');
  const [notes, setNotes] = useState('');
  const [therapies, setTherapies] = useState<TherapyItem[]>([{ ...EMPTY_THERAPY }]);
  const [removedTherapyDecisions, setRemovedTherapyDecisions] = useState<RemovedTherapyDecision[]>([]);
  const [removeTherapyModalOpened, setRemoveTherapyModalOpened] = useState(false);
  const [removeTherapyTargetIndex, setRemoveTherapyTargetIndex] = useState<number | null>(null);
  const [removeTherapyAction, setRemoveTherapyAction] = useState<'KEEP_FUTURE_APPOINTMENTS' | 'CANCEL_FUTURE_APPOINTMENTS'>('KEEP_FUTURE_APPOINTMENTS');

  const { data: teaProfiles = [], isLoading: loadingProfiles, error: teaProfilesError } = useTeaProfilesQuery();
  const { data: doctorsData, isLoading: loadingDoctors, error: doctorsError } = useDoctorsAdminQuery();
  const { data: proceduresData, isLoading: loadingProcedures, error: proceduresError } = useProceduresAdminQuery();
  const { data: pitData, error: pitError } = useTeaPitQuery(selectedTeaProfileId);
  const selectedTeaProfile = useMemo(
    () => teaProfiles.find((item: any) => String(item?.id || '') === String(selectedTeaProfileId || '')) || null,
    [teaProfiles, selectedTeaProfileId],
  );
  const { data: patientAppointments = [] } = usePatientAppointmentsQuery(selectedTeaProfile?.patient?.id || null);

  const teaProfileOptions = useMemo(
    () => teaProfiles.map((it: any) => ({
      value: String(it.id),
      label: `${it.patient?.name || 'Paciente sem nome'}${it.patient?.cpf ? ` • ${formatCPF(it.patient.cpf)}` : ''}`,
    })),
    [teaProfiles],
  );

  const doctorOptions = useMemo(() => {
    const doctorList: any[] = Array.isArray(doctorsData)
      ? doctorsData
      : (Array.isArray((doctorsData as any)?.items)
        ? (doctorsData as any).items
        : (Array.isArray((doctorsData as any)?.data?.items)
          ? (doctorsData as any).data.items
          : (Array.isArray((doctorsData as any)?.data)
            ? (doctorsData as any).data
            : [])));
    return doctorList
      .map((doctor: any) => {
        const id = String(doctor?.id || doctor?.doctorId || '').trim();
        const name = String(doctor?.name || doctor?.nome || doctor?.fullName || '').trim();
        return id && name ? { value: id, label: name } : null;
      })
      .filter(Boolean) as Array<{ value: string; label: string }>;
  }, [doctorsData]);

  const procedureOptions = useMemo(() => {
    const procedureList: any[] = Array.isArray(proceduresData)
      ? proceduresData
      : (Array.isArray((proceduresData as any)?.items)
        ? (proceduresData as any).items
        : (Array.isArray((proceduresData as any)?.data?.items)
          ? (proceduresData as any).data.items
          : (Array.isArray((proceduresData as any)?.data)
            ? (proceduresData as any).data
            : [])));
    return procedureList
      .map((item: any) => {
        const id = String(item?.id || '').trim();
        const name = String(item?.name || item?.nome || '').trim();
        return id && name ? { value: id, label: name } : null;
      })
      .filter(Boolean) as Array<{ value: string; label: string }>;
  }, [proceduresData]);

  const procedureDataMap = useMemo(() => {
    const procedureList: any[] = Array.isArray(proceduresData)
      ? proceduresData
      : (Array.isArray((proceduresData as any)?.items)
        ? (proceduresData as any).items
        : (Array.isArray((proceduresData as any)?.data?.items)
          ? (proceduresData as any).data.items
          : (Array.isArray((proceduresData as any)?.data)
            ? (proceduresData as any).data
            : [])));
    return procedureList.reduce((acc: Record<string, any>, item: any) => {
      const id = String(item?.id || '').trim();
      if (id) acc[id] = item;
      return acc;
    }, {});
  }, [proceduresData]);

  const loadingPit = Boolean(selectedTeaProfileId) && !pitData && !pitError;
  const showConfigSkeleton = loadingProfiles || loadingDoctors || loadingProcedures || loadingPit;

  useEffect(() => {
    if (!teaProfilesError) return;
    const err: any = teaProfilesError;
    showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes TEA', color: 'red' });
  }, [teaProfilesError]);

  useEffect(() => {
    if (!doctorsError) return;
    const err: any = doctorsError;
    showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Erro ao carregar médicos', color: 'red' });
  }, [doctorsError]);

  useEffect(() => {
    if (!proceduresError) return;
    const err: any = proceduresError;
    showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Erro ao carregar procedimentos', color: 'red' });
  }, [proceduresError]);

  useEffect(() => {
    if (!selectedTeaProfileId) return;
    if (pitError) {
      const err: any = pitError;
      showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Erro ao carregar PIT', color: 'red' });
      return;
    }
    const pit = (pitData as any)?.item;
    try {
      if (!pit) {
        setTitle('PIT - Plano Integrado de Terapias');
        setStartDate(new Date());
        setReviewDate(null);
        setStatus('Ativo');
        setNotes('');
        setTherapies([{ ...EMPTY_THERAPY }]);
        setRemovedTherapyDecisions([]);
        return;
      }

      setTitle(String(pit.title || 'PIT - Plano Integrado de Terapias'));
      setStartDate(parseApiDateToLocalDate(pit.startDate));
      setReviewDate(parseApiDateToLocalDate(pit.reviewDate));
      setStatus(String(pit.status || 'Ativo'));
      setNotes(String(pit.notes || ''));

      const mapped = Array.isArray(pit.therapies)
        ? pit.therapies.map((t: any) => ({
            id: String(t.id || ''),
            procedureId: String(t.procedureId || ''),
            therapyType: String(t.therapyType || ''),
            weeklyFrequency: Number.isFinite(t.weeklyFrequency) ? Number(t.weeklyFrequency) : 1,
            preferredWeekdays: Array.isArray(t.preferredWeekdays)
              ? t.preferredWeekdays.filter((day: any) => typeof day === 'string' && day.trim() !== '')
              : [],
            preferredShift: String(t.preferredShift || '')
              .split(',')
              .map((value) => String(value || '').trim().toUpperCase())
              .filter((value) => value === 'MANHA' || value === 'TARDE' || value === 'NOITE'),
            durationMinutes: Number.isFinite(t.durationMinutes) ? Number(t.durationMinutes) : null,
            professionalDoctorId: String(t.professionalDoctorId || ''),
            professional: String(t.professional || ''),
            notes: String(t.notes || ''),
          }))
        : [];
      setTherapies(mapped.length > 0 ? mapped : [{ ...EMPTY_THERAPY }]);
      setRemovedTherapyDecisions([]);
    } catch {
      setTherapies([{ ...EMPTY_THERAPY }]);
    }
  }, [selectedTeaProfileId, pitData, pitError]);

  useEffect(() => {
    // if navigated from patient list with preselected profile
    if (location.state && (location.state as any).teaProfileId) {
      const pid = String((location.state as any).teaProfileId);
      setSelectedTeaProfileId(pid);
    }
  }, [location.state]);

  const scheduledSummaryByTherapyId = useMemo(() => {
    const pit = (pitData as any)?.item;
    const pitTherapies = Array.isArray(pit?.therapies) ? pit.therapies : [];
    const appointments = Array.isArray(patientAppointments) ? patientAppointments : [];

    return pitTherapies.reduce((acc: Record<string, string>, therapy: any) => {
      const therapyId = String(therapy?.id || '');
      if (!therapyId) return acc;

      const procedureName = String(therapy?.therapyType || '').trim().toLowerCase();
      const professionalName = String(therapy?.professional || '').trim().toLowerCase();
      const appointmentSlots = appointments
        .filter((item: any) => {
          const specialty = String(item?.specialty || item?.procedure || item?.procedureName || '').trim().toLowerCase();
          const doctor = String(item?.doctorName || item?.professional || '').trim().toLowerCase();
          const status = String(item?.status || '').trim().toUpperCase();
          const isActiveAppointment = status !== 'CANCELADO' && status !== 'CANCELED';

          if (!isActiveAppointment) return false;
          if (!procedureName || specialty !== procedureName) return false;
          if (!professionalName) return true;
          return doctor === professionalName;
        })
        .map((item: any) => ({
          date: dayjs(item?.date || item?.data || '').isValid() ? dayjs(item?.date || item?.data).format('YYYY-MM-DD') : '',
          time: String(item?.time || item?.hora || '').trim(),
        }))
        .filter((slot) => slot.date && slot.time);

      const slots = [
        ...extractScheduledSlotsFromTherapy(therapy),
        ...appointmentSlots,
      ].filter((slot, index, arr) => arr.findIndex((item) => item.date === slot.date && item.time === slot.time) === index);
      const summary = formatScheduledSlotSummary(slots);
      if (summary) acc[therapyId] = summary;
      return acc;
    }, {});
  }, [pitData, patientAppointments]);

  const setTherapyField = (index: number, field: keyof TherapyItem, value: any) => {
    setTherapies((prev) => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const addTherapy = () => setTherapies((prev) => [...prev, { ...EMPTY_THERAPY }]);

  const askRemoveTherapy = (index: number) => {
    const target = therapies[index];
    if (!target) return;

    if (!target.id) {
      setTherapies((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }

    const existingDecision = removedTherapyDecisions.find((item) => item.id === target.id);
    setRemoveTherapyAction(existingDecision?.action || 'KEEP_FUTURE_APPOINTMENTS');
    setRemoveTherapyTargetIndex(index);
    setRemoveTherapyModalOpened(true);
  };

  const confirmRemoveTherapy = () => {
    if (removeTherapyTargetIndex === null) return;
    const target = therapies[removeTherapyTargetIndex];
    if (!target) return;

    if (target.id) {
      setRemovedTherapyDecisions((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== target.id);
        return [...withoutCurrent, { id: target.id as string, action: removeTherapyAction }];
      });
    }

    setTherapies((prev) => prev.filter((_, idx) => idx !== removeTherapyTargetIndex));
    setRemoveTherapyModalOpened(false);
    setRemoveTherapyTargetIndex(null);
  };

  const handleSave = async () => {
    if (!selectedTeaProfileId) {
      showNotification({ title: 'Atenção', message: 'Selecione um paciente TEA', color: 'yellow' });
      return;
    }
    if (!title.trim()) {
      showNotification({ title: 'Erro', message: 'Título do PIT é obrigatório', color: 'red' });
      return;
    }

    const therapiesToSave = therapies.filter((t) => t.procedureId.trim() !== '' || t.therapyType.trim() !== '');
    const therapyWithoutProfessional = therapiesToSave.find((t) => !String(t.professionalDoctorId || '').trim());
    if (therapyWithoutProfessional) {
      showNotification({
        title: 'Profissional obrigatório',
        message: 'Selecione um profissional para todas as terapias antes de seguir para a pré-reserva.',
        color: 'red',
      });
      return;
    }

    setSaving(true);
    try {
      await teaProfileService.upsertPit(selectedTeaProfileId, {
        title: title.trim(),
        startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
        reviewDate: reviewDate ? dayjs(reviewDate).format('YYYY-MM-DD') : undefined,
        status,
        notes: notes || undefined,
        removedTherapies: removedTherapyDecisions.map((item) => ({
          id: item.id,
          action: item.action,
        })),
        therapies: therapiesToSave
          .map((t) => ({
            id: t.id || undefined,
            procedureId: t.procedureId || undefined,
            therapyType: t.therapyType,
            weeklyFrequency: Number.isFinite(t.weeklyFrequency) ? Number(t.weeklyFrequency) : 1,
            preferredWeekdays: Array.isArray(t.preferredWeekdays) ? t.preferredWeekdays : [],
            preferredShift: Array.isArray(t.preferredShift) && t.preferredShift.length > 0
              ? t.preferredShift.join(',')
              : undefined,
            durationMinutes: Number.isFinite(t.durationMinutes as number) ? Number(t.durationMinutes) : undefined,
            professionalDoctorId: t.professionalDoctorId || undefined,
            professional: t.professional || undefined,
            notes: t.notes || undefined,
          })),
      });

      showNotification({ title: 'Sucesso', message: 'PIT salvo com sucesso', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.teaPit, selectedTeaProfileId] });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao salvar PIT',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

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
            <Text fw={800} size={isMobile ? 'lg' : 'xl'} style={{ color: titleColor }}>PIT de Terapias</Text>
            <Text size="sm" c="dimmed">Plano integrado de terapias por paciente TEA</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', borderRadius: 12, background: heroBg }}>
          <Group gap="sm" mb="sm">
            <ThemeIcon size="lg" variant="light" color="teal"><ClipboardList size={16} /></ThemeIcon>
            <Text fw={700}>Configuração do PIT</Text>
          </Group>
          <Stack gap="md">
            {showConfigSkeleton ? (
              <Stack gap="md">
                <Skeleton height={56} radius="md" />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Skeleton height={56} radius="md" />
                  <Skeleton height={56} radius="md" />
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Skeleton height={56} radius="md" />
                  <Skeleton height={56} radius="md" />
                </SimpleGrid>
                <Skeleton height={96} radius="md" />
                <Skeleton height={178} radius="md" />
              </Stack>
            ) : (
              <>
                <FloatingSelect
                  label="Paciente TEA"
                  placeholder={loadingProfiles ? 'Carregando...' : 'Selecione um paciente'}
                  data={teaProfileOptions}
                  value={selectedTeaProfileId}
                  onChange={setSelectedTeaProfileId}
                  searchable
                  clearable
                  nothingFoundMessage="Nenhum paciente TEA encontrado"
                />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
                  <FloatingInput
                    label="Título do PIT"
                    value={title}
                    onChange={(e) => setTitle(e.currentTarget.value)}
                  />
                  <FloatingSelect
                    label="Status"
                    value={status}
                    onChange={(value) => setStatus(value || 'Ativo')}
                    data={[
                      { value: 'Ativo', label: 'Ativo' },
                      { value: 'Em revisão', label: 'Em revisão' },
                      { value: 'Concluído', label: 'Concluído' },
                    ]}
                  />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
                  <FloatingDateInput
                    label="Início"
                    value={startDate}
                    onChange={(value) => setStartDate(value || null)}
                    valueFormat="DD/MM/YYYY"
                    locale="pt-br"
                  />
                  <FloatingDateInput
                    label="Revisão"
                    value={reviewDate}
                    onChange={(value) => setReviewDate(value || null)}
                    valueFormat="DD/MM/YYYY"
                    locale="pt-br"
                  />
                </SimpleGrid>

                <FloatingTextarea
                  label="Observações gerais"
                  minRows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.currentTarget.value)}
                />
              </>
            )}

            <Group justify="space-between" align="center">
              <Box>
                <Text fw={600}>Terapias do PIT</Text>
                <Text size="sm" c="dimmed">Defina frequência, profissional e preferências de agenda.</Text>
              </Box>
              <Button size="xs" variant="light" leftSection={<Plus size={14} />} onClick={addTherapy}>Adicionar terapia</Button>
            </Group>

            <Stack gap="xs">
              {therapies.map((therapy, index) => (
                <Paper key={therapy.id || `${index}-${therapy.procedureId || therapy.therapyType || 'therapy'}`} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', borderRadius: 10, background: contentBg }}>
                  <Text size="sm" fw={600} c="dimmed" mb={6}>Terapia {index + 1}</Text>
                  <Group gap={6} mb={8}>
                    <ThemeIcon size="sm" variant="light" color="blue"><Layers3 size={12} /></ThemeIcon>
                    <Text size="xs" c="dimmed">Dados clínicos e preferências de agenda</Text>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm" verticalSpacing="sm">
                    <div>
                      <FloatingSelect
                        label="Terapia"
                        placeholder={loadingProcedures ? 'Carregando procedimentos...' : 'Selecione um procedimento'}
                        data={procedureOptions}
                        value={therapy.procedureId}
                        onChange={(value) => {
                          const procedureId = value || '';
                          const selectedProcedure = procedureOptions.find((item) => item.value === procedureId);
                          const procedureFullData = procedureDataMap[procedureId];
                          const durationFromProcedure = procedureFullData?.durationMinutes || null;
                          
                          setTherapies((prev) => prev.map((item, idx) => (
                            idx === index
                              ? {
                                  ...item,
                                  procedureId,
                                  therapyType: selectedProcedure?.label || '',
                                  durationMinutes: durationFromProcedure,
                                }
                              : item
                          )));
                        }}
                        searchable
                        clearable
                        nothingFoundMessage="Nenhum procedimento encontrado"
                      />
                    </div>

                    <div>
                      <FloatingNumberInput
                        label="Freq. semanal"
                        value={therapy.weeklyFrequency}
                        min={1}
                        onChange={(value) => setTherapyField(index, 'weeklyFrequency', typeof value === 'number' ? value : 1)}
                      />
                    </div>

                    <div>
                      <FloatingNumberInput
                        label="Duração (min)"
                        value={therapy.durationMinutes ?? undefined}
                        min={0}
                        onChange={(value) => setTherapyField(index, 'durationMinutes', typeof value === 'number' ? value : null)}
                      />
                    </div>

                    <div>
                      <FloatingSelect
                        label="Profissional"
                        placeholder={loadingDoctors ? 'Carregando médicos...' : 'Selecione um médico'}
                        data={doctorOptions}
                        value={therapy.professionalDoctorId}
                        onChange={(value) => {
                          const doctorId = value || '';
                          const selectedDoctor = doctorOptions.find((item) => item.value === doctorId);
                          setTherapies((prev) => prev.map((item, idx) => (
                            idx === index
                              ? {
                                  ...item,
                                  professionalDoctorId: doctorId,
                                  professional: selectedDoctor?.label || '',
                                }
                              : item
                          )));
                        }}
                        searchable
                        clearable
                        nothingFoundMessage="Nenhum médico encontrado"
                      />
                    </div>
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="sm" mt="sm">
                    <div>
                      <FloatingMultiSelect
                        label="Dias preferenciais"
                        data={WEEKDAY_OPTIONS}
                        value={therapy.preferredWeekdays}
                        onChange={(value) => setTherapyField(index, 'preferredWeekdays', value)}
                        clearable
                        searchable
                      />
                    </div>

                    <div>
                      <FloatingMultiSelect
                        label="Turno preferencial"
                        data={SHIFT_OPTIONS}
                        value={therapy.preferredShift}
                        onChange={(value) => setTherapyField(index, 'preferredShift', value)}
                        clearable
                        searchable
                      />
                    </div>

                  </SimpleGrid>

                  <div style={{ marginTop: 8 }}>
                    <FloatingTextarea
                      label="Observações"
                      minRows={2}
                      value={therapy.notes}
                      onChange={(e) => setTherapyField(index, 'notes', e.currentTarget.value)}
                    />
                  </div>

                  <Group justify="space-between" mt="sm">
                    <Box>
                      <Text size="xs" c="dimmed">Preencha terapia e frequencia para manter consistencia no PIT</Text>
                      {therapy.id && scheduledSummaryByTherapyId[therapy.id] && (
                        <Text size="xs" c="blue" mt={4}>
                          Dias e horarios agendados: {scheduledSummaryByTherapyId[therapy.id]}
                        </Text>
                      )}
                    </Box>
                    <div>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => askRemoveTherapy(index)}
                        disabled={therapies.length === 1}
                        aria-label="Remover terapia"
                      >
                        <Trash2 size={14} />
                      </ActionIcon>
                    </div>
                  </Group>
                </Paper>
              ))}
            </Stack>

            <Group justify="flex-end">
              <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving}>Salvar PIT</Button>
            </Group>
          </Stack>
        </Paper>
      </Box>

      <Modal
        opened={removeTherapyModalOpened}
        onClose={() => {
          setRemoveTherapyModalOpened(false);
          setRemoveTherapyTargetIndex(null);
        }}
        title="Remover terapia do PIT"
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Essa terapia já existe no PIT. Escolha como tratar sessões futuras já agendadas.
          </Text>
          <Radio.Group value={removeTherapyAction} onChange={(value) => setRemoveTherapyAction(value as 'KEEP_FUTURE_APPOINTMENTS' | 'CANCEL_FUTURE_APPOINTMENTS')}>
            <Stack gap="xs">
              <Radio
                value="KEEP_FUTURE_APPOINTMENTS"
                label="Só remover do PIT (manter sessões futuras)"
              />
              <Radio
                value="CANCEL_FUTURE_APPOINTMENTS"
                label="Remover do PIT e cancelar sessões futuras"
              />
            </Stack>
          </Radio.Group>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setRemoveTherapyModalOpened(false);
                setRemoveTherapyTargetIndex(null);
              }}
            >
              Voltar
            </Button>
            <Button color="red" onClick={confirmRemoveTherapy}>
              Confirmar remoção
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

