import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Select,
  Textarea,
  NumberInput,
  Stack,
  Badge,
  Loader,
  ThemeIcon,
  useMantineColorScheme,
  TagsInput,
  Divider,
  ActionIcon,
  Alert,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Activity, Pencil, WandSparkles } from 'lucide-react';
import dayjs from 'dayjs';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import teaProfileService from '../../services/teaProfileService';
import doctorService from '../../services/doctorService';
import appointmentService from '../../services/appointmentService';
import teaEvolutionTemplateService from '../../services/teaEvolutionTemplateService';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF } from '../../utils/formatters';

interface TeaProfileOption {
  value: string;
  label: string;
}

interface TherapeuticPlanOption {
  value: string;
  label: string;
}

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
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const heroBg = colorScheme === 'dark' ? 'var(--mantine-color-body)' : 'var(--mantine-color-gray-0)';
  const cardBg = colorScheme === 'dark' ? 'var(--mantine-color-default)' : 'var(--mantine-color-white)';

  const [teaProfiles, setTeaProfiles] = useState<any[]>([]);
  const [teaProfileOptions, setTeaProfileOptions] = useState<TeaProfileOption[]>([]);
  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);

  const [planOptions, setPlanOptions] = useState<TherapeuticPlanOption[]>([]);
  const [pitProcedureOptions, setPitProcedureOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [appointmentOptions, setAppointmentOptions] = useState<Array<{ value: string; label: string }>>([]);

  const [form, setForm] = useState<EvolutionForm>(createInitialForm());
  const [editingEvolutionId, setEditingEvolutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  const selectedProfile = useMemo(
    () => teaProfiles.find((p) => String(p.id) === String(selectedTeaProfileId || '')) || null,
    [teaProfiles, selectedTeaProfileId],
  );

  const loadTeaProfiles = async () => {
    setLoading(true);
    try {
      const data: any = await teaProfileService.list({ limit: 200, offset: 0 });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);

      setTeaProfiles(list);
      const options = list.map((it: any) => ({
        value: String(it.id),
        label: `${it.patient?.name || 'Paciente sem nome'}${it.patient?.cpf ? ` • ${formatCPF(it.patient.cpf)}` : ''}`,
      }));
      setTeaProfileOptions(options);
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

  const loadPlans = async (teaProfileId: string) => {
    try {
      const data: any = await teaProfileService.listPlans(teaProfileId, { isActive: true });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);
      setPlanOptions(list.map((it: any) => ({ value: String(it.id), label: it.title || 'Plano sem título' })));
    } catch {
      setPlanOptions([]);
    }
  };

  const loadPitProcedureOptions = async (teaProfileId: string) => {
    try {
      const data: any = await teaProfileService.getPit(teaProfileId);
      const therapies = Array.isArray(data?.item?.therapies) ? data.item.therapies : [];
      const options = Array.from(
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
      setPitProcedureOptions(options);
    } catch {
      setPitProcedureOptions([]);
    }
  };

  const loadEvolutions = async (teaProfileId: string) => {
    setLoading(true);
    try {
      const data: any = await teaProfileService.listEvolutions(teaProfileId);
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);
      setEvolutions(list);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar evoluções',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async (patientId?: string) => {
    if (!patientId) {
      setAppointmentOptions([]);
      return;
    }
    try {
      const data: any = await appointmentService.list({ patientId, limit: 200, offset: 0 });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);
      const options = list
        .filter((item: any) => item?.id)
        .map((item: any) => {
          const label = `${item?.date || '-'} ${item?.time || ''} • ${item?.specialty || 'Sem procedimento'}`.trim();
          return { value: String(item.id), label };
        });
      setAppointmentOptions(options);
    } catch {
      setAppointmentOptions([]);
    }
  };

  const loadDoctors = async () => {
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
          const id = String(doctor?.id || doctor?.doctorId || '').trim();
          const name = String(doctor?.name || doctor?.nome || doctor?.fullName || '').trim();
          return id && name ? { value: id, label: name } : null;
        })
        .filter(Boolean) as Array<{ value: string; label: string }>;

      setDoctorOptions(options);
    } catch {
      setDoctorOptions([]);
    }
  };

  useEffect(() => {
    loadTeaProfiles();
    loadDoctors();
  }, []);

  useEffect(() => {
    if (!selectedTeaProfileId) {
      setEvolutions([]);
      setPlanOptions([]);
      setPitProcedureOptions([]);
      setAppointmentOptions([]);
      setEditingEvolutionId(null);
      setAutoTemplateInfo('');
      return;
    }
    loadPlans(selectedTeaProfileId);
    loadPitProcedureOptions(selectedTeaProfileId);
    loadEvolutions(selectedTeaProfileId);
  }, [selectedTeaProfileId]);

  useEffect(() => {
    loadAppointments(selectedProfile?.patient?.id);
  }, [selectedProfile?.patient?.id]);

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
      await loadEvolutions(selectedTeaProfileId);
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
      sessionDate: item.sessionDate ? new Date(item.sessionDate) : new Date(),
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
        <Group mb={14}>
          <Button variant="subtle" color="dark" leftSection={<ChevronLeft size={18} />} onClick={() => navigate('/tea')}>
            Voltar
          </Button>
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
            <Select
              label="Paciente TEA"
              placeholder={loading ? 'Carregando...' : 'Selecione um paciente'}
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

            <Group grow>
              <DateInput
                label="Data da sessão"
                value={form.sessionDate}
                onChange={(value) => setForm((prev) => ({ ...prev, sessionDate: value ? new Date(value) : null }))}
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
              />
              <Select
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
              <Select
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
              <Select
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
            </Group>
            <Group grow>
              <Select
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
              <Group align="flex-end" justify="flex-end">
                <Button
                  variant="light"
                  leftSection={<WandSparkles size={16} />}
                  onClick={() => void applyTemplate({
                    procedureName: form.procedureContextLabel || undefined,
                    procedureId: form.procedureContextId.startsWith('name:') ? undefined : form.procedureContextId,
                  })}
                  disabled={!form.procedureContextId}
                >
                  Aplicar template
                </Button>
              </Group>
            </Group>
            {autoTemplateInfo && (
              <Alert color="indigo" variant="light" title="Template da evolução">
                {autoTemplateInfo}
              </Alert>
            )}
            <Textarea
              label="Objetivo trabalhado na sessão"
              minRows={2}
              value={form.sessionGoal}
              onChange={(e) => setForm((prev) => ({ ...prev, sessionGoal: e.currentTarget.value }))}
            />
            <TagsInput
              label="Estratégias utilizadas"
              placeholder="Digite e pressione Enter"
              value={form.strategiesUsed}
              onChange={(value) => setForm((prev) => ({ ...prev, strategiesUsed: value }))}
              clearable
            />
            <Group grow>
              <Select
                label="Engajamento"
                data={engagementOptions}
                value={form.engagementLevel || null}
                onChange={(value) => setForm((prev) => ({ ...prev, engagementLevel: value || '' }))}
                clearable
              />
              <Select
                label="Regulação"
                data={regulationOptions}
                value={form.regulationLevel || null}
                onChange={(value) => setForm((prev) => ({ ...prev, regulationLevel: value || '' }))}
                clearable
              />
              <Select
                label="Comportamento"
                data={behaviorOptions}
                value={form.behaviorLevel || null}
                onChange={(value) => setForm((prev) => ({ ...prev, behaviorLevel: value || '' }))}
                clearable
              />
            </Group>

            <Textarea
              label="Intervenção realizada"
              minRows={2}
              value={form.interventionSummary}
              onChange={(e) => setForm((prev) => ({ ...prev, interventionSummary: e.currentTarget.value }))}
            />

            <Textarea
              label="Resposta do paciente"
              minRows={2}
              value={form.patientResponse}
              onChange={(e) => setForm((prev) => ({ ...prev, patientResponse: e.currentTarget.value }))}
            />

            <Group grow>
              <NumberInput
                label="Score de progresso (0-10)"
                value={form.progressScore ?? undefined}
                onChange={(value) => setForm((prev) => ({ ...prev, progressScore: typeof value === 'number' ? value : null }))}
                min={0}
                max={10}
              />
              <Textarea
                label="Observações"
                minRows={1}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.currentTarget.value }))}
              />
            </Group>
            <Group grow align="flex-start">
              <Textarea
                label="Devolutiva para família"
                minRows={2}
                value={form.familyFeedback}
                onChange={(e) => setForm((prev) => ({ ...prev, familyFeedback: e.currentTarget.value }))}
              />
              <Textarea
                label="Plano para casa / próxima sessão"
                minRows={2}
                value={form.homePlan}
                onChange={(e) => setForm((prev) => ({ ...prev, homePlan: e.currentTarget.value }))}
              />
            </Group>
            <Textarea
              label="Alertas clínicos / riscos"
              minRows={2}
              value={form.alerts}
              onChange={(e) => setForm((prev) => ({ ...prev, alerts: e.currentTarget.value }))}
            />
            {editingEvolutionId && (
              <Textarea
                label="Motivo da retificação"
                minRows={2}
                required
                value={form.editReason}
                onChange={(e) => setForm((prev) => ({ ...prev, editReason: e.currentTarget.value }))}
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
            {loading ? (
              <Group justify="center"><Loader size="sm" /></Group>
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
