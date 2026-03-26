import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Stack,
  Badge,
  ThemeIcon,
  useMantineColorScheme,
  TagsInput,
  Divider,
  ActionIcon,
  Alert,
  Skeleton,
  SimpleGrid,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Activity, Pencil, WandSparkles } from 'lucide-react';
import dayjs from 'dayjs';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import teaProfileService from '../../services/teaProfileService';
import teaEvolutionTemplateService from '../../services/teaEvolutionTemplateService';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF, parseApiDateToLocalDate } from '../../utils/formatters';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useTeaPlansQuery } from '../../hooks/useTeaPlansQuery';
import { useTeaPitQuery } from '../../hooks/useTeaPitQuery';
import { useTeaEvolutionsQuery } from '../../hooks/useTeaEvolutionsQuery';
import { usePatientAppointmentsQuery } from '../../hooks/usePatientAppointmentsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingDateInput } from '../common/FloatingDateInput';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { FloatingNumberInput } from '../common/FloatingNumberInput';

interface EvolutionForm {
  sessionDate: Date | null;
  therapeuticPlanId: string;
  appointmentId: string;
  professionalDoctorId: string;
  professional: string;
  sessionGoal: string;
  procedureContextId: string;
  procedureContextLabel: string;
  strategiesUsed: string[];
  engagementLevel: string;
  regulationLevel: string;
  behaviorLevel: string;
  interventionSummary: string;
  patientResponse: string;
  progressScore: number | null;
  familyFeedback: string;
  homePlan: string;
  alerts: string;
  editReason: string;
  notes: string;
}

const createInitialForm = (): EvolutionForm => ({
  sessionDate: new Date(),
  therapeuticPlanId: '',
  appointmentId: '',
  professionalDoctorId: '',
  professional: '',
  sessionGoal: '',
  procedureContextId: '',
  procedureContextLabel: '',
  strategiesUsed: [],
  engagementLevel: '',
  regulationLevel: '',
  behaviorLevel: '',
  interventionSummary: '',
  patientResponse: '',
  progressScore: null,
  familyFeedback: '',
  homePlan: '',
  alerts: '',
  editReason: '',
  notes: '',
});

type EvolutionTemplate = {
  sessionGoal: string;
  interventionSummary: string;
  patientResponse: string;
  familyFeedback: string;
  homePlan: string;
  strategiesUsed: string[];
};

const TEMPLATE_BY_PROCEDURE: Array<{ matcher: string[]; template: EvolutionTemplate }> = [
  {
    matcher: ['FONOAUDIOLOGIA', 'FONO'],
    template: {
      sessionGoal: 'Estimular comunicação funcional e compreensão de comandos.',
      interventionSummary: 'Aplicadas estratégias de comunicação alternativa, turnos conversacionais e modelagem de linguagem.',
      patientResponse: 'Paciente respondeu parcialmente aos estímulos, com melhora progressiva ao longo da sessão.',
      familyFeedback: 'Orientada continuidade de estimulação de linguagem funcional em rotinas curtas.',
      homePlan: 'Repetir atividades de nomeação e solicitação funcional por 10-15 min/dia.',
      strategiesUsed: ['Modelagem de linguagem', 'Reforço positivo', 'Comunicação funcional'],
    },
  },
  {
    matcher: ['PSICOLOGIA', 'PSICO'],
    template: {
      sessionGoal: 'Trabalhar regulação emocional e flexibilidade comportamental.',
      interventionSummary: 'Realizadas intervenções de regulação, treino de habilidades sociais e manejo de comportamento.',
      patientResponse: 'Paciente apresentou oscilação inicial, com maior adesão ao final da sessão.',
      familyFeedback: 'Reforçada rotina previsível e uso de combinados visuais em casa.',
      homePlan: 'Aplicar rotina de regulação com apoio visual antes de transições.',
      strategiesUsed: ['Treino de habilidades sociais', 'Regulação emocional', 'Combinados visuais'],
    },
  },
  {
    matcher: ['TERAPIA OCUPACIONAL', 'OCUPACIONAL', 'TO'],
    template: {
      sessionGoal: 'Evoluir integração sensorial e autonomia em atividades funcionais.',
      interventionSummary: 'Executadas atividades de coordenação motora fina, organização sensorial e sequenciamento funcional.',
      patientResponse: 'Paciente manteve participação com necessidade de prompts moderados.',
      familyFeedback: 'Sugeridas adaptações ambientais para facilitar autonomia nas rotinas.',
      homePlan: 'Praticar sequência funcional curta (3-4 passos) com suporte visual.',
      strategiesUsed: ['Integração sensorial', 'Treino funcional', 'Prompting graduado'],
    },
  },
];

const normalizeText = (value?: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const getFallbackTemplateByProcedure = (value?: string): EvolutionTemplate | null => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const found = TEMPLATE_BY_PROCEDURE.find((item) => item.matcher.some((token) => normalized.includes(token)));
  return found?.template || null;
};

export function TeaEvolucao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const heroBg = colorScheme === 'dark' ? 'var(--mantine-color-body)' : 'var(--mantine-color-gray-0)';
  const cardBg = colorScheme === 'dark' ? 'var(--mantine-color-default)' : 'var(--mantine-color-white)';

  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);

  const [form, setForm] = useState<EvolutionForm>(createInitialForm());
  const [editingEvolutionId, setEditingEvolutionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoTemplateInfo, setAutoTemplateInfo] = useState<string>('');
  const engagementOptions = [
    { value: 'MUITO_BAIXO', label: 'Muito baixo' },
    { value: 'BAIXO', label: 'Baixo' },
    { value: 'MODERADO', label: 'Moderado' },
    { value: 'ALTO', label: 'Alto' },
    { value: 'MUITO_ALTO', label: 'Muito alto' },
  ];
  const regulationOptions = [
    { value: 'DESREGULADO', label: 'Desregulado' },
    { value: 'PARCIAL', label: 'Regulação parcial' },
    { value: 'REGULADO', label: 'Regulado' },
  ];
  const behaviorOptions = [
    { value: 'ESTAVEL', label: 'Comportamento estável' },
    { value: 'OSCILANTE', label: 'Comportamento oscilante' },
    { value: 'DESAFIADOR', label: 'Comportamento desafiador' },
  ];

  const { data: teaProfiles = [], isLoading: loadingProfiles, error: teaProfilesError } = useTeaProfilesQuery();
  const { data: doctorsData, error: doctorsError } = useDoctorsAdminQuery();
  const selectedProfile = useMemo(
    () => teaProfiles.find((p: any) => String(p.id) === String(selectedTeaProfileId || '')) || null,
    [teaProfiles, selectedTeaProfileId],
  );
  const { data: plansData = [], error: plansError } = useTeaPlansQuery({ teaProfileId: selectedTeaProfileId, isActive: true });
  const { data: pitData, error: pitError } = useTeaPitQuery(selectedTeaProfileId);
  const { data: evolutions = [], isLoading: loadingEvolutions, error: evolutionsError } = useTeaEvolutionsQuery(selectedTeaProfileId);
  const { data: appointmentsData = [], error: appointmentsError } = usePatientAppointmentsQuery(selectedProfile?.patient?.id || null);

  const teaProfileOptions = useMemo(() => teaProfiles.map((it: any) => ({
    value: String(it.id),
    label: `${it.patient?.name || 'Paciente sem nome'}${it.patient?.cpf ? ` • ${formatCPF(it.patient.cpf)}` : ''}`,
  })), [teaProfiles]);

  const planOptions = useMemo(() => {
    const list: any[] = Array.isArray(plansData) ? plansData : [];
    return list.map((it: any) => ({ value: String(it.id), label: it.title || 'Plano sem título' }));
  }, [plansData]);

  const pitProcedureOptions = useMemo(() => {
    const therapies = Array.isArray((pitData as any)?.item?.therapies) ? (pitData as any).item.therapies : [];
    return Array.from(
      new Map(
        therapies
          .map((therapy: any) => {
            const procedureName = String(therapy?.therapyType || '').trim();
            const procedureId = String(therapy?.procedureId || '').trim();
            if (!procedureName && !procedureId) return null;
            const value = procedureId || `name:${procedureName}`;
            return [value, { value, label: procedureName || 'Procedimento' }] as const;
          })
          .filter(Boolean) as Array<readonly [string, { value: string; label: string }]>,
      ).values(),
    );
  }, [pitData]);

  const doctorOptions = useMemo(() => {
    const list: any[] = Array.isArray(doctorsData)
      ? doctorsData
      : (Array.isArray((doctorsData as any)?.items)
        ? (doctorsData as any).items
        : (Array.isArray((doctorsData as any)?.data?.items)
          ? (doctorsData as any).data.items
          : (Array.isArray((doctorsData as any)?.data)
            ? (doctorsData as any).data
            : [])));
    return list
      .map((doctor: any) => {
        const id = String(doctor?.id || doctor?.doctorId || '').trim();
        const name = String(doctor?.name || doctor?.nome || doctor?.fullName || '').trim();
        return id && name ? { value: id, label: name } : null;
      })
      .filter(Boolean) as Array<{ value: string; label: string }>;
  }, [doctorsData]);

  const appointmentOptions = useMemo(() => {
    const list: any[] = Array.isArray(appointmentsData) ? appointmentsData : [];
    return list
      .filter((item: any) => item?.id)
      .map((item: any) => {
        const label = `${item?.date || '-'} ${item?.time || ''} • ${item?.specialty || 'Sem procedimento'}`.trim();
        return { value: String(item.id), label };
      });
  }, [appointmentsData]);

  const showFormSkeleton = loadingProfiles || (Boolean(selectedTeaProfileId) && loadingEvolutions && !evolutions.length);

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
    if (!plansError || !selectedTeaProfileId) return;
    const err: any = plansError;
    showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Erro ao carregar planos', color: 'red' });
  }, [plansError, selectedTeaProfileId]);

  useEffect(() => {
    if (!pitError || !selectedTeaProfileId) return;
    const err: any = pitError;
    showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Erro ao carregar PIT', color: 'red' });
  }, [pitError, selectedTeaProfileId]);

  useEffect(() => {
    if (!evolutionsError || !selectedTeaProfileId) return;
    const err: any = evolutionsError;
    showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Erro ao carregar evoluções', color: 'red' });
  }, [evolutionsError, selectedTeaProfileId]);

  useEffect(() => {
    if (!appointmentsError || !selectedProfile?.patient?.id) return;
    const err: any = appointmentsError;
    showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos', color: 'red' });
  }, [appointmentsError, selectedProfile?.patient?.id]);

  useEffect(() => {
    if (!selectedTeaProfileId) {
      setEditingEvolutionId(null);
      setAutoTemplateInfo('');
    }
  }, [selectedTeaProfileId]);

  const handleSave = async () => {
    if (!selectedTeaProfileId) {
      showNotification({ title: 'Atenção', message: 'Selecione um paciente TEA', color: 'yellow' });
      return;
    }
    if (!form.sessionGoal.trim()) {
      showNotification({ title: 'Validação', message: 'Informe o objetivo trabalhado na sessão', color: 'yellow' });
      return;
    }
    if (form.strategiesUsed.length === 0) {
      showNotification({ title: 'Validação', message: 'Informe ao menos uma estratégia utilizada', color: 'yellow' });
      return;
    }
    if (!form.interventionSummary.trim()) {
      showNotification({ title: 'Validação', message: 'Informe a intervenção realizada', color: 'yellow' });
      return;
    }
    if (editingEvolutionId && !form.editReason.trim()) {
      showNotification({ title: 'Validação', message: 'Informe o motivo da retificação para atualizar', color: 'yellow' });
      return;
    }

    setSaving(true);
    try {
      const selectedDoctor = doctorOptions.find((item) => item.value === form.professionalDoctorId);
      const payload = {
        therapeuticPlanId: form.therapeuticPlanId || undefined,
        sessionDate: form.sessionDate ? dayjs(form.sessionDate).format('YYYY-MM-DD') : undefined,
        appointmentId: form.appointmentId || undefined,
        professionalDoctorId: form.professionalDoctorId || undefined,
        professional: selectedDoctor?.label || form.professional || undefined,
        sessionGoal: form.sessionGoal || undefined,
        strategiesUsed: form.strategiesUsed,
        engagementLevel: form.engagementLevel || undefined,
        regulationLevel: form.regulationLevel || undefined,
        behaviorLevel: form.behaviorLevel || undefined,
        interventionSummary: form.interventionSummary || undefined,
        patientResponse: form.patientResponse || undefined,
        progressScore: Number.isFinite(form.progressScore as number) ? Number(form.progressScore) : undefined,
        familyFeedback: form.familyFeedback || undefined,
        homePlan: form.homePlan || undefined,
        alerts: form.alerts || undefined,
        editReason: form.editReason || undefined,
        notes: form.notes || undefined,
      };
      if (editingEvolutionId) {
        await teaProfileService.updateEvolution(selectedTeaProfileId, editingEvolutionId, {
          ...payload,
          editReason: form.editReason.trim(),
        });
      } else {
        await teaProfileService.createEvolution(selectedTeaProfileId, payload);
      }

      showNotification({
        title: 'Sucesso',
        message: editingEvolutionId ? 'Evolução atualizada com sucesso' : 'Evolução registrada com sucesso',
        color: 'green',
      });
      setEditingEvolutionId(null);
      setForm(createInitialForm());
      setAutoTemplateInfo('');
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.teaEvolutions, selectedTeaProfileId] });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar evolução',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = async (ctx: { procedureName?: string; procedureId?: string; sourceLabel?: string }) => {
    const { procedureName, procedureId, sourceLabel } = ctx;
    let template: EvolutionTemplate | null = null;

    try {
      const response: any = await teaEvolutionTemplateService.resolve({
        procedureId: procedureId || undefined,
        procedureName: procedureName || undefined,
      });
      const item = response?.item;
      if (item) {
        template = {
          sessionGoal: String(item.sessionGoal || ''),
          interventionSummary: String(item.interventionSummary || ''),
          patientResponse: String(item.patientResponse || ''),
          familyFeedback: String(item.familyFeedback || ''),
          homePlan: String(item.homePlan || ''),
          strategiesUsed: Array.isArray(item.strategiesUsed) ? item.strategiesUsed : [],
        };
      }
    } catch {
      template = null;
    }

    if (!template) {
      template = getFallbackTemplateByProcedure(procedureName);
    }
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      procedureContextId: procedureId || prev.procedureContextId,
      procedureContextLabel: procedureName || prev.procedureContextLabel,
      sessionGoal: prev.sessionGoal || template.sessionGoal,
      interventionSummary: prev.interventionSummary || template.interventionSummary,
      patientResponse: prev.patientResponse || template.patientResponse,
      familyFeedback: prev.familyFeedback || template.familyFeedback,
      homePlan: prev.homePlan || template.homePlan,
      strategiesUsed: prev.strategiesUsed.length ? prev.strategiesUsed : template.strategiesUsed,
    }));
    setAutoTemplateInfo(sourceLabel
      ? `Template aplicado automaticamente a partir de ${sourceLabel}.`
      : 'Template aplicado para o procedimento selecionado.');
  };

  const handleStartEdit = (item: any) => {
    setEditingEvolutionId(String(item.id));
    setForm({
      sessionDate: parseApiDateToLocalDate(item.sessionDate) || new Date(),
      therapeuticPlanId: item.therapeuticPlanId || '',
      appointmentId: item.appointmentId || '',
      professionalDoctorId: item.professionalDoctorId || '',
      professional: item.professional || '',
      sessionGoal: item.sessionGoal || '',
      procedureContextId: '',
      procedureContextLabel: '',
      strategiesUsed: Array.isArray(item.strategiesUsed) ? item.strategiesUsed : [],
      engagementLevel: item.engagementLevel || '',
      regulationLevel: item.regulationLevel || '',
      behaviorLevel: item.behaviorLevel || '',
      interventionSummary: item.interventionSummary || '',
      patientResponse: item.patientResponse || '',
      progressScore: Number.isFinite(item.progressScore) ? Number(item.progressScore) : null,
      familyFeedback: item.familyFeedback || '',
      homePlan: item.homePlan || '',
      alerts: item.alerts || '',
      editReason: '',
      notes: item.notes || '',
    });
    setAutoTemplateInfo('');
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
            <Text fw={800} size="lg" style={{ color: titleColor }}>Evolução</Text>
            <Text size="sm" c="dimmed">Registro por sessão do paciente TEA</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: heroBg }}>
          <Group gap="sm" mb="sm">
            <ThemeIcon size="lg" variant="light" color="teal"><Activity size={16} /></ThemeIcon>
            <Text fw={700}>Acompanhamento clínico</Text>
          </Group>
          <Stack gap="md">
            <FloatingSelect
              label="Paciente TEA"
              placeholder={loadingProfiles ? 'Carregando...' : 'Selecione um paciente'}
              data={teaProfileOptions}
              value={selectedTeaProfileId}
              onChange={setSelectedTeaProfileId}
              searchable
              clearable={false}
            />

            {selectedProfile && (
              <Badge variant="light" color="indigo" size="lg">
                {selectedProfile.patient?.name || 'Paciente'}
              </Badge>
            )}
            {editingEvolutionId && (
              <Badge variant="light" color="orange" size="lg">
                Modo retificação ativo
              </Badge>
            )}

            {showFormSkeleton ? (
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} height={56} radius="md" />
                  ))}
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Skeleton height={56} radius="md" />
                  <Skeleton height={44} width={180} radius="md" ml="auto" />
                </SimpleGrid>
                <Skeleton height={92} radius="md" />
                <Skeleton height={72} radius="md" />
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <Skeleton height={56} radius="md" />
                  <Skeleton height={56} radius="md" />
                  <Skeleton height={56} radius="md" />
                </SimpleGrid>
                <Skeleton height={92} radius="md" />
                <Skeleton height={92} radius="md" />
              </Stack>
            ) : (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" verticalSpacing="md">
                  <FloatingDateInput
                    label="Data da sessão"
                    value={form.sessionDate}
                    onChange={(value) => setForm((prev) => ({ ...prev, sessionDate: value || null }))}
                    valueFormat="DD/MM/YYYY"
                    locale="pt-br"
                  />
                  <FloatingSelect
                    label="Plano terapêutico (opcional)"
                    data={planOptions}
                    value={form.therapeuticPlanId}
                    onChange={(value) => {
                      const planId = value || '';
                      const selectedPlan = planOptions.find((item) => item.value === planId);
                      setForm((prev) => ({ ...prev, therapeuticPlanId: planId }));
                      if (selectedPlan?.label) {
                        void applyTemplate({ procedureName: selectedPlan.label, sourceLabel: 'plano terapêutico' });
                      }
                    }}
                    searchable
                    clearable
                  />
                  <FloatingSelect
                    label="Sessão/agendamento vinculado (opcional)"
                    data={appointmentOptions}
                    value={form.appointmentId || null}
                    onChange={(value) => {
                      const appointmentId = value || '';
                      const selectedAppointment = appointmentOptions.find((item) => item.value === appointmentId);
                      const procedureName = selectedAppointment?.label?.split('•')[1]?.trim() || '';
                      setForm((prev) => ({ ...prev, appointmentId }));
                      if (procedureName) {
                        void applyTemplate({ procedureName, sourceLabel: 'sessão vinculada' });
                      }
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="Nenhum agendamento encontrado"
                  />
                  <FloatingSelect
                    label="Profissional"
                    data={doctorOptions}
                    value={form.professionalDoctorId}
                    onChange={(value) => {
                      const doctorId = value || '';
                      const selectedDoctor = doctorOptions.find((item) => item.value === doctorId);
                      setForm((prev) => ({
                        ...prev,
                        professionalDoctorId: doctorId,
                        professional: selectedDoctor?.label || '',
                      }));
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="Nenhum médico encontrado"
                  />
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" verticalSpacing="md">
                  <FloatingSelect
                    label="Procedimento da sessão (template)"
                    data={pitProcedureOptions}
                    value={form.procedureContextId || null}
                    onChange={(value) => {
                      const procedure = value || '';
                      const selectedProcedure = pitProcedureOptions.find((item) => item.value === procedure);
                      const procedureName = selectedProcedure?.label || '';
                      const procedureId = procedure.startsWith('name:') ? '' : procedure;
                      setForm((prev) => ({
                        ...prev,
                        procedureContextId: procedure,
                        procedureContextLabel: procedureName,
                      }));
                      if (procedure) {
                        void applyTemplate({ procedureName, procedureId, sourceLabel: 'procedimento selecionado' });
                      }
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="Sem procedimentos ativos no PIT"
                  />
                  <Group align="flex-end" justify={isMobile ? 'stretch' : 'flex-end'}>
                    <Button
                      variant="light"
                      leftSection={<WandSparkles size={16} />}
                      onClick={() => void applyTemplate({
                        procedureName: form.procedureContextLabel || undefined,
                        procedureId: form.procedureContextId.startsWith('name:') ? undefined : form.procedureContextId,
                      })}
                      disabled={!form.procedureContextId}
                      fullWidth={isMobile}
                    >
                      Aplicar template
                    </Button>
                  </Group>
                </SimpleGrid>
              </>
            )}
            {autoTemplateInfo && (
              <Alert color="indigo" variant="light" title="Template da evolução">
                {autoTemplateInfo}
              </Alert>
            )}
            <FloatingTextarea
              label="Objetivo trabalhado na sessão"
              minRows={2}
              value={form.sessionGoal}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((prev) => ({ ...prev, sessionGoal: value }));
              }}
            />
            <TagsInput
              label="Estratégias utilizadas"
              placeholder="Digite e pressione Enter"
              value={form.strategiesUsed}
              onChange={(value) => setForm((prev) => ({ ...prev, strategiesUsed: value }))}
              clearable
            />
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" verticalSpacing="md">
              <FloatingSelect
                label="Engajamento"
                data={engagementOptions}
                value={form.engagementLevel || null}
                onChange={(value) => setForm((prev) => ({ ...prev, engagementLevel: value || '' }))}
                clearable
              />
              <FloatingSelect
                label="Regulação"
                data={regulationOptions}
                value={form.regulationLevel || null}
                onChange={(value) => setForm((prev) => ({ ...prev, regulationLevel: value || '' }))}
                clearable
              />
              <FloatingSelect
                label="Comportamento"
                data={behaviorOptions}
                value={form.behaviorLevel || null}
                onChange={(value) => setForm((prev) => ({ ...prev, behaviorLevel: value || '' }))}
                clearable
              />
            </SimpleGrid>

            <FloatingTextarea
              label="Intervenção realizada"
              minRows={2}
              value={form.interventionSummary}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((prev) => ({ ...prev, interventionSummary: value }));
              }}
            />

            <FloatingTextarea
              label="Resposta do paciente"
              minRows={2}
              value={form.patientResponse}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((prev) => ({ ...prev, patientResponse: value }));
              }}
            />

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" verticalSpacing="md">
              <FloatingNumberInput
                label="Score de progresso (0-10)"
                value={form.progressScore ?? undefined}
                onChange={(value) => setForm((prev) => ({ ...prev, progressScore: typeof value === 'number' ? value : null }))}
                min={0}
                max={10}
              />
              <FloatingTextarea
                label="Observações"
                minRows={1}
                value={form.notes}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setForm((prev) => ({ ...prev, notes: value }));
                }}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" verticalSpacing="md">
              <FloatingTextarea
                label="Devolutiva para família"
                minRows={2}
                value={form.familyFeedback}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setForm((prev) => ({ ...prev, familyFeedback: value }));
                }}
              />
              <FloatingTextarea
                label="Plano para casa / próxima sessão"
                minRows={2}
                value={form.homePlan}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setForm((prev) => ({ ...prev, homePlan: value }));
                }}
              />
            </SimpleGrid>
            <FloatingTextarea
              label="Alertas clínicos / riscos"
              minRows={2}
              value={form.alerts}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setForm((prev) => ({ ...prev, alerts: value }));
              }}
            />
            {editingEvolutionId && (
              <FloatingTextarea
                label="Motivo da retificação"
                minRows={2}
                required
                value={form.editReason}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setForm((prev) => ({ ...prev, editReason: value }));
                }}
              />
            )}

            <Group justify="flex-end">
              <Button variant="default" onClick={() => { setEditingEvolutionId(null); setForm(createInitialForm()); setAutoTemplateInfo(''); }}>
                {editingEvolutionId ? 'Cancelar edição' : 'Limpar'}
              </Button>
              <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving}>
                {editingEvolutionId ? 'Atualizar evolução' : 'Salvar evolução'}
              </Button>
            </Group>

            <Text fw={600}>Evoluções registradas</Text>
            {loadingEvolutions ? (
              <Stack gap="xs">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Paper key={index} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                    <Skeleton height={16} width="32%" mb={10} radius="xl" />
                    <Skeleton height={12} width="48%" mb={8} radius="xl" />
                    <Skeleton height={10} width="76%" mb={8} radius="xl" />
                    <Skeleton height={10} width="64%" radius="xl" />
                  </Paper>
                ))}
              </Stack>
            ) : evolutions.length === 0 ? (
              <Text size="sm" c="dimmed">Nenhuma evolução registrada.</Text>
            ) : (
              <Stack gap="xs">
                {evolutions.map((item: any) => (
                  <Paper key={item.id} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                    <Group justify="space-between" align="flex-start">
                      <Text fw={600}>{dayjs(item.sessionDate).format('DD/MM/YYYY')} • {item.professional || 'Profissional não informado'}</Text>
                      <ActionIcon variant="subtle" color="blue" onClick={() => handleStartEdit(item)} title="Editar evolução">
                        <Pencil size={16} />
                      </ActionIcon>
                    </Group>
                    <Text size="xs" c="dimmed">Plano: {item.therapeuticPlan?.title || 'Não vinculado'}</Text>
                    {item.appointment && (
                      <Text size="xs" c="dimmed">
                        Sessão vinculada: {item.appointment.date || '-'} {item.appointment.time || ''} • {item.appointment.specialty || '-'}
                      </Text>
                    )}
                    {(item.engagementLevel || item.regulationLevel || item.behaviorLevel) && (
                      <Group gap={6} mt={6}>
                        {item.engagementLevel && <Badge size="xs" variant="light" color="indigo">Engajamento: {item.engagementLevel}</Badge>}
                        {item.regulationLevel && <Badge size="xs" variant="light" color="teal">Regulação: {item.regulationLevel}</Badge>}
                        {item.behaviorLevel && <Badge size="xs" variant="light" color="orange">Comportamento: {item.behaviorLevel}</Badge>}
                      </Group>
                    )}
                    {item.sessionGoal && <Text size="sm" mt={6}><b>Objetivo:</b> {item.sessionGoal}</Text>}
                    {Array.isArray(item.strategiesUsed) && item.strategiesUsed.length > 0 && (
                      <Group gap={6} mt={4}>
                        {item.strategiesUsed.map((strategy: string) => (
                          <Badge key={`${item.id}-${strategy}`} size="xs" variant="outline" color="blue">
                            {strategy}
                          </Badge>
                        ))}
                      </Group>
                    )}
                    {item.interventionSummary && <Text size="sm" mt={4}>{item.interventionSummary}</Text>}
                    {item.patientResponse && <Text size="xs" c="dimmed" mt={4}>Resposta: {item.patientResponse}</Text>}
                    {Number.isFinite(item.progressScore) && <Text size="xs" c="dimmed">Score: {item.progressScore}</Text>}
                    {(item.familyFeedback || item.homePlan || item.alerts || item.notes) && <Divider my={8} />}
                    {item.familyFeedback && <Text size="xs" c="dimmed">Devolutiva: {item.familyFeedback}</Text>}
                    {item.homePlan && <Text size="xs" c="dimmed">Plano próximo: {item.homePlan}</Text>}
                    {item.alerts && <Text size="xs" c="red.5">Alerta: {item.alerts}</Text>}
                    {item.notes && <Text size="xs" c="dimmed">Obs: {item.notes}</Text>}
                    {(item.lastEditedBy || item.lastEditReason || item.createdBy) && (
                      <Text size="xs" c="dimmed" mt={6}>
                        {item.lastEditedBy
                          ? `Retificado por ${item.lastEditedBy}${item.lastEditReason ? ` • Motivo: ${item.lastEditReason}` : ''}`
                          : `Registrado por ${item.createdBy || 'não informado'}`}
                      </Text>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
