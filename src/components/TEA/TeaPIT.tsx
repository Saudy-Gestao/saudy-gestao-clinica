import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Select,
  MultiSelect,
  TextInput,
  Textarea,
  Stack,
  SimpleGrid,
  NumberInput,
  ActionIcon,
  Modal,
  Radio,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Plus, Trash2, ClipboardList, Layers3 } from 'lucide-react';
import dayjs from 'dayjs';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import teaProfileService from '../../services/teaProfileService';
import doctorService from '../../services/doctorService';
import procedureService from '../../services/procedureService';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF, parseApiDateToLocalDate } from '../../utils/formatters';

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

export function TeaPIT() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const heroBg = colorScheme === 'dark' ? 'transparent' : 'var(--mantine-color-gray-0)';
  const contentBg = colorScheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'var(--mantine-color-white)';
  const [teaProfiles, setTeaProfiles] = useState<any[]>([]);
  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('PIT - Plano Integrado de Terapias');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [reviewDate, setReviewDate] = useState<Date | null>(null);
  const [status, setStatus] = useState('Ativo');
  const [notes, setNotes] = useState('');
  const [therapies, setTherapies] = useState<TherapyItem[]>([{ ...EMPTY_THERAPY }]);
  const [doctorOptions, setDoctorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [procedureOptions, setProcedureOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [procedureDataMap, setProcedureDataMap] = useState<Record<string, any>>({});
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [removedTherapyDecisions, setRemovedTherapyDecisions] = useState<RemovedTherapyDecision[]>([]);
  const [removeTherapyModalOpened, setRemoveTherapyModalOpened] = useState(false);
  const [removeTherapyTargetIndex, setRemoveTherapyTargetIndex] = useState<number | null>(null);
  const [removeTherapyAction, setRemoveTherapyAction] = useState<'KEEP_FUTURE_APPOINTMENTS' | 'CANCEL_FUTURE_APPOINTMENTS'>('KEEP_FUTURE_APPOINTMENTS');

  const teaProfileOptions = useMemo(
    () => teaProfiles.map((it: any) => ({
      value: String(it.id),
      label: `${it.patient?.name || 'Paciente sem nome'}${it.patient?.cpf ? ` • ${formatCPF(it.patient.cpf)}` : ''}`,
    })),
    [teaProfiles],
  );

  const loadTeaProfiles = async () => {
    setLoading(true);
    try {
      const data: any = await teaProfileService.list({ limit: 200, offset: 0 });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);
      setTeaProfiles(list);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes TEA',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    try {
      const [doctorData, procedureData] = await Promise.all([
        doctorService.listDoctors(),
        procedureService.listProcedures({ limit: 300, offset: 0 }),
      ]);

      const doctorList: any[] = Array.isArray(doctorData)
        ? doctorData
        : (Array.isArray((doctorData as any)?.items)
          ? (doctorData as any).items
          : (Array.isArray((doctorData as any)?.data?.items)
            ? (doctorData as any).data.items
            : (Array.isArray((doctorData as any)?.data)
              ? (doctorData as any).data
              : [])));

      const procedureList: any[] = Array.isArray(procedureData)
        ? procedureData
        : (Array.isArray((procedureData as any)?.items)
          ? (procedureData as any).items
          : (Array.isArray((procedureData as any)?.data?.items)
            ? (procedureData as any).data.items
            : (Array.isArray((procedureData as any)?.data)
              ? (procedureData as any).data
              : [])));

      setDoctorOptions(
        doctorList
          .map((doctor: any) => {
            const id = String(doctor?.id || doctor?.doctorId || '').trim();
            const name = String(doctor?.name || doctor?.nome || doctor?.fullName || '').trim();
            return id && name ? { value: id, label: name } : null;
          })
          .filter(Boolean) as Array<{ value: string; label: string }>,
      );

      setProcedureOptions(
        procedureList
          .map((item: any) => {
            const id = String(item?.id || '').trim();
            const name = String(item?.name || item?.nome || '').trim();
            return id && name ? { value: id, label: name } : null;
          })
          .filter(Boolean) as Array<{ value: string; label: string }>,
      );

      // Manter referência aos dados completos dos procedimentos
      const procDataMap: Record<string, any> = {};
      procedureList.forEach((item: any) => {
        const id = String(item?.id || '').trim();
        if (id) {
          procDataMap[id] = item;
        }
      });
      setProcedureDataMap(procDataMap);
    } catch {
      setDoctorOptions([]);
      setProcedureOptions([]);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const loadPit = async (teaProfileId: string) => {
    setLoading(true);
    try {
      const data: any = await teaProfileService.getPit(teaProfileId);
      const pit = data?.item;
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
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar PIT',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeaProfiles();
    loadCatalogs();

    // if navigated from patient list with preselected profile
    if (location.state && (location.state as any).teaProfileId) {
      const pid = String((location.state as any).teaProfileId);
      setSelectedTeaProfileId(pid);
    }
  }, [location.state]);

  useEffect(() => {
    if (!selectedTeaProfileId) return;
    loadPit(selectedTeaProfileId);
  }, [selectedTeaProfileId]);

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
        therapies: therapies
          .filter((t) => t.procedureId.trim() !== '' || t.therapyType.trim() !== '')
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
      await loadPit(selectedTeaProfileId);
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
        <Group mb={14}>
          <Button variant="subtle" color="dark" leftSection={<ChevronLeft size={18} />} onClick={() => navigate('/tea')}>
            Voltar
          </Button>
          <Box>
            <Text fw={800} size="lg" style={{ color: titleColor }}>PIT de Terapias</Text>
            <Text size="sm" c="dimmed">Plano Integrado de Terapias por paciente TEA</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', borderRadius: 12, background: heroBg }}>
          <Group gap="sm" mb="sm">
            <ThemeIcon size="lg" variant="light" color="teal"><ClipboardList size={16} /></ThemeIcon>
            <Text fw={700}>Configuração do PIT</Text>
          </Group>
          <Stack gap="md">
            <Select
              label="Paciente TEA"
              placeholder={loading ? 'Carregando...' : 'Selecione um paciente'}
              data={teaProfileOptions}
              value={selectedTeaProfileId}
              onChange={setSelectedTeaProfileId}
              searchable
              clearable
            />

            <Group grow>
              <TextInput
                label="Título do PIT"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
              />
              <Select
                label="Status"
                value={status}
                onChange={(value) => setStatus(value || 'Ativo')}
                data={[
                  { value: 'Ativo', label: 'Ativo' },
                  { value: 'Em revisão', label: 'Em revisão' },
                  { value: 'Concluído', label: 'Concluído' },
                ]}
              />
            </Group>

            <Group grow>
              <DateInput
                label="Início"
                value={startDate}
                onChange={(value) => setStartDate(value || null)}
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
              />
              <DateInput
                label="Revisão"
                value={reviewDate}
                onChange={(value) => setReviewDate(value || null)}
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
              />
            </Group>

            <Textarea
              label="Observações gerais"
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
            />

            <Group justify="space-between" align="center">
              <Text fw={600}>Terapias do PIT</Text>
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
                      <Select
                        label="Terapia"
                        placeholder={loadingCatalogs ? 'Carregando procedimentos...' : 'Selecione um procedimento'}
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
                      <NumberInput
                        label="Freq. semanal"
                        value={therapy.weeklyFrequency}
                        min={1}
                        onChange={(value) => setTherapyField(index, 'weeklyFrequency', typeof value === 'number' ? value : 1)}
                      />
                    </div>

                    <div>
                      <NumberInput
                        label="Duração (min)"
                        value={therapy.durationMinutes ?? undefined}
                        min={0}
                        onChange={(value) => setTherapyField(index, 'durationMinutes', typeof value === 'number' ? value : null)}
                      />
                    </div>

                    <div>
                      <Select
                        label="Profissional"
                        placeholder={loadingCatalogs ? 'Carregando médicos...' : 'Selecione um médico'}
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
                      <MultiSelect
                        label="Dias preferenciais"
                        data={WEEKDAY_OPTIONS}
                        value={therapy.preferredWeekdays}
                        onChange={(value) => setTherapyField(index, 'preferredWeekdays', value)}
                        clearable
                        searchable
                      />
                    </div>

                    <div>
                      <MultiSelect
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
                    <Textarea
                      label="Observações"
                      minRows={2}
                      value={therapy.notes}
                      onChange={(e) => setTherapyField(index, 'notes', e.currentTarget.value)}
                    />
                  </div>

                  <Group justify="space-between" mt="sm">
                    <Text size="xs" c="dimmed">Preencha terapia e frequência para manter consistência no PIT</Text>
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
