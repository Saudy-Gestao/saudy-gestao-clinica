import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Select,
  TextInput,
  Textarea,
  Stack,
  Checkbox,
  Paper,
  ThemeIcon,
  Divider,
  Transition,
  ActionIcon,
  Loader,
  Badge,
  SimpleGrid,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { DateInput } from '@mantine/dates';
import { ChevronLeft, Brain, Pencil, Search, Plus, Trash2, ClipboardList, Activity, BarChart3, Users } from 'lucide-react';
import dayjs from 'dayjs';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import patientService from '../../services/patientService';
import teaProfileService from '../../services/teaProfileService';
import doctorService from '../../services/doctorService';
import { DARK_BLUE } from '../../themes/theme';
import { onlyDigits, formatCPF } from '../../utils/formatters';

type Gender = 'MALE' | 'FEMALE' | 'OTHER' | '';
export type TeaSubmodule = 'cadastro' | 'pacientes' | 'plano' | 'evolucao' | 'relatorios';

interface CadastroTEAProps {
  forcedSubmodule?: TeaSubmodule;
}

interface TeaForm {
  patientName: string;
  patientCpf: string;
  birthDate: Date | null;
  gender: Gender;
  cellphone: string;
  email: string;
  healthInsuranceName: string;
  healthInsuranceNumber: string;
  supportLevel: string;
  communicationProfile: string;
  sensoryProfile: string;
  behaviorNotes: string;
  comorbiditiesInput: string;
  therapeuticGoals: string;
  familyGuidance: string;
  schoolNotes: string;
  isActive: boolean;
}

interface TeaProfileRow {
  id: string;
  patientId: string;
  patientName: string;
  patientCpf: string;
  supportLevel: string;
  isActive: boolean;
  raw: any;
}

interface PlanForm {
  title: string;
  objective: string;
  priority: string;
  status: string;
  responsibleDoctorId: string;
  responsibleProfessional: string;
  targetDate: Date | null;
  notes: string;
}

interface TherapeuticPlanRow {
  id: string;
  title: string;
  objective: string;
  priority: string;
  status: string;
  responsibleDoctorId: string;
  responsibleProfessional: string;
  targetDate: string;
  isActive: boolean;
}

const INITIAL_FORM: TeaForm = {
  patientName: '',
  patientCpf: '',
  birthDate: null,
  gender: '',
  cellphone: '',
  email: '',
  healthInsuranceName: '',
  healthInsuranceNumber: '',
  supportLevel: '',
  communicationProfile: '',
  sensoryProfile: '',
  behaviorNotes: '',
  comorbiditiesInput: '',
  therapeuticGoals: '',
  familyGuidance: '',
  schoolNotes: '',
  isActive: true,
};

const INITIAL_PLAN_FORM: PlanForm = {
  title: '',
  objective: '',
  priority: 'Média',
  status: 'Ativo',
  responsibleDoctorId: '',
  responsibleProfessional: '',
  targetDate: null,
  notes: '',
};

function mapGender(value: any): Gender {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'MALE' || normalized === 'MASCULINO') return 'MALE';
  if (normalized === 'FEMALE' || normalized === 'FEMININO') return 'FEMALE';
  if (normalized === 'OTHER' || normalized === 'OUTRO') return 'OTHER';
  return '';
}

export function CadastroTEA({ forcedSubmodule }: CadastroTEAProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const [enteredShell, setEnteredShell] = useState(false);
  const [enteredForm, setEnteredForm] = useState(false);
  const locationState = (location.state as {
    fromModuleHub?: boolean;
    prefillTeaProfile?: any;
    prefillTeaProfileId?: string;
    prefillPatientId?: string;
  } | null);
  const isFromModuleHub = Boolean(locationState?.fromModuleHub);
  const isStandaloneSubmodule = Boolean(forcedSubmodule);

  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const pageBg = colorScheme === 'dark' ? 'var(--mantine-color-dark-8)' : '#f8f9fa';
  const cardBg = colorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-white)';
  const cardBorder = colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : '#e9ecef';
  const shellBg = colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)';
  const activeModuleBg = colorScheme === 'dark' ? 'rgba(59,130,246,0.16)' : 'var(--mantine-color-indigo-0)';
  const activeModuleBorder = colorScheme === 'dark' ? 'rgba(96,165,250,0.52)' : 'var(--mantine-color-indigo-6)';

  const [form, setForm] = useState<TeaForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);
  const [patientById, setPatientById] = useState<Record<string, any>>({});
  const [teaItems, setTeaItems] = useState<TeaProfileRow[]>([]);
  const [teaSearch, setTeaSearch] = useState('');
  const [teaLoading, setTeaLoading] = useState(false);
  const [activeSubmodule, setActiveSubmodule] = useState<TeaSubmodule>(forcedSubmodule || 'cadastro');
  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(INITIAL_PLAN_FORM);
  const [plans, setPlans] = useState<TherapeuticPlanRow[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const setTeaField = <K extends keyof TeaForm>(field: K, value: TeaForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setPlanField = <K extends keyof PlanForm>(field: K, value: PlanForm[K]) => {
    setPlanForm((prev) => ({ ...prev, [field]: value }));
  };

  const cpfDigits = useMemo(() => onlyDigits(form.patientCpf || '').slice(0, 11), [form.patientCpf]);
  const teaProfileOptions = useMemo(
    () => teaItems.map((item) => ({
      value: item.id,
      label: `${item.patientName || 'Paciente sem nome'}${item.patientCpf ? ` • ${formatCPF(item.patientCpf)}` : ''}${item.supportLevel ? ` • ${item.supportLevel}` : ''}`,
    })),
    [teaItems],
  );

  const loadPatients = async () => {
    setPatientsLoading(true);
    try {
      const data: any = await patientService.listPatients();
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.patients)
          ? data.patients
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.patients)
              ? data.data.patients
              : (Array.isArray(data?.data)
                ? data.data
                : []))));

      const byId: Record<string, any> = {};
      const options = list
        .map((p: any) => {
          const id = String(p.id || '');
          if (!id) return null;
          byId[id] = p;
          const name = String(p.name || '').trim();
          const cpf = String(p.cpf || '').trim();
          return {
            value: id,
            label: cpf ? `${name} • ${formatCPF(cpf)}` : name,
          };
        })
        .filter(Boolean) as { value: string; label: string }[];

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

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    const loadDoctors = async () => {
      setLoadingDoctors(true);
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
          .filter(Boolean) as { value: string; label: string }[];

        setDoctorOptions(options);
      } catch {
        setDoctorOptions([]);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  useEffect(() => {
    if (!forcedSubmodule) return;
    setActiveSubmodule(forcedSubmodule);
  }, [forcedSubmodule]);

  const loadTeaProfiles = async (search?: string) => {
    setTeaLoading(true);
    try {
      const data: any = await teaProfileService.list({ search: search || undefined, limit: 100, offset: 0 });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data?.data?.items)
            ? data.data.items
            : []));

      const mapped: TeaProfileRow[] = list.map((it: any) => ({
        id: String(it.id || ''),
        patientId: String(it.patient?.id || it.patientId || ''),
        patientName: String(it.patient?.name || ''),
        patientCpf: String(it.patient?.cpf || ''),
        supportLevel: String(it.supportLevel || ''),
        isActive: Boolean(it.isActive),
        raw: it,
      })).filter((it) => it.id);

      setTeaItems(mapped);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes TEA',
        color: 'red',
      });
    } finally {
      setTeaLoading(false);
    }
  };

  useEffect(() => {
    loadTeaProfiles(teaSearch);
  }, [teaSearch]);

  useEffect(() => {
    const shellDelay = isFromModuleHub ? 120 : 40;
    const formDelay = isFromModuleHub ? 320 : 180;
    const shellTimer = window.setTimeout(() => setEnteredShell(true), shellDelay);
    const formTimer = window.setTimeout(() => setEnteredForm(true), formDelay);
    return () => {
      window.clearTimeout(shellTimer);
      window.clearTimeout(formTimer);
    };
  }, [isFromModuleHub]);

  const handleSelectPatient = (value: string | null) => {
    setSelectedPatientId(value);
    if (!value) return;

    const p = patientById[value];
    if (!p) return;

    setForm((prev) => ({
      ...prev,
      patientName: p.name || prev.patientName,
      patientCpf: p.cpf || prev.patientCpf,
      birthDate: p.birthDate ? new Date(p.birthDate) : prev.birthDate,
      gender: mapGender(p.gender) || prev.gender,
      cellphone: p.cellphone || prev.cellphone,
      email: p.email || prev.email,
      healthInsuranceName: p.healthInsuranceName || prev.healthInsuranceName,
      healthInsuranceNumber: p.healthInsuranceNumber || prev.healthInsuranceNumber,
    }));
  };

  const handleSave = async () => {
    if (!selectedPatientId) {
      if (!form.patientName.trim()) {
        showNotification({ title: 'Erro', message: 'Nome do paciente é obrigatório', color: 'red' });
        return;
      }
      if (cpfDigits.length !== 11) {
        showNotification({ title: 'Erro', message: 'CPF deve conter 11 dígitos', color: 'red' });
        return;
      }
      if (!form.birthDate) {
        showNotification({ title: 'Erro', message: 'Data de nascimento é obrigatória', color: 'red' });
        return;
      }
      if (!form.gender) {
        showNotification({ title: 'Erro', message: 'Gênero é obrigatório', color: 'red' });
        return;
      }
      if (!form.cellphone.trim()) {
        showNotification({ title: 'Erro', message: 'Celular é obrigatório', color: 'red' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        patientId: selectedPatientId || undefined,
        patient: {
          name: form.patientName.trim() || undefined,
          cpf: cpfDigits || undefined,
          birthDate: form.birthDate ? dayjs(form.birthDate).format('YYYY-MM-DD') : undefined,
          gender: form.gender || undefined,
          cellphone: form.cellphone.trim() || undefined,
          email: form.email.trim() || undefined,
          healthInsuranceName: form.healthInsuranceName.trim() || undefined,
          healthInsuranceNumber: form.healthInsuranceNumber.trim() || undefined,
        },
        tea: {
          supportLevel: form.supportLevel || undefined,
          communicationProfile: form.communicationProfile || undefined,
          sensoryProfile: form.sensoryProfile || undefined,
          behaviorNotes: form.behaviorNotes || undefined,
          comorbidities: form.comorbiditiesInput
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          therapeuticGoals: form.therapeuticGoals || undefined,
          familyGuidance: form.familyGuidance || undefined,
          schoolNotes: form.schoolNotes || undefined,
          isActive: form.isActive,
        },
      };

      const saved: any = await teaProfileService.upsert(payload);
      const patient = saved?.patient;
      const teaProfileId = saved?.id;
      if (patient?.id) {
        setSelectedPatientId(String(patient.id));
      }
      if (teaProfileId) {
        setSelectedTeaProfileId(String(teaProfileId));
      }

      showNotification({
        title: 'Sucesso',
        message: 'Dados TEA salvos com sucesso',
        color: 'green',
      });

      await loadPatients();
      await loadTeaProfiles(teaSearch);
    } catch (err: any) {
      const details = err?.response?.data?.fields
        ? Object.values(err.response.data.fields).join(' | ')
        : (err?.response?.data?.details || err?.response?.data?.message || err?.message);

      showNotification({
        title: 'Erro ao salvar',
        message: details || 'Falha ao salvar dados TEA',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const applyTeaProfileToForm = (item: any, patientId?: string, teaProfileId?: string) => {
    const patient = item?.patient || {};

    setSelectedPatientId(patientId || item?.patientId || patient?.id || null);
    setSelectedTeaProfileId(teaProfileId || item?.id || null);
    setForm({
      patientName: String(patient.name || ''),
      patientCpf: String(patient.cpf || ''),
      birthDate: patient.birthDate ? new Date(patient.birthDate) : null,
      gender: mapGender(patient.gender),
      cellphone: String(patient.cellphone || ''),
      email: String(patient.email || ''),
      healthInsuranceName: String(patient.healthInsuranceName || ''),
      healthInsuranceNumber: String(patient.healthInsuranceNumber || ''),
      supportLevel: String(item.supportLevel || ''),
      communicationProfile: String(item.communicationProfile || ''),
      sensoryProfile: String(item.sensoryProfile || ''),
      behaviorNotes: String(item.behaviorNotes || ''),
      comorbiditiesInput: Array.isArray(item.comorbidities) ? item.comorbidities.join(', ') : '',
      therapeuticGoals: String(item.therapeuticGoals || ''),
      familyGuidance: String(item.familyGuidance || ''),
      schoolNotes: String(item.schoolNotes || ''),
      isActive: item.isActive !== false,
    });
  };

  useEffect(() => {
    if (!locationState?.prefillTeaProfile) return;
    applyTeaProfileToForm(locationState.prefillTeaProfile, locationState.prefillPatientId, locationState.prefillTeaProfileId);
  }, [locationState?.prefillTeaProfile, locationState?.prefillPatientId, locationState?.prefillTeaProfileId]);

  const handleEditTeaProfile = (row: TeaProfileRow) => {
    if (forcedSubmodule === 'pacientes') {
      navigate('/tea/cadastro', {
        state: {
          fromModuleHub: true,
          prefillTeaProfile: row.raw,
          prefillTeaProfileId: row.id,
          prefillPatientId: row.patientId,
        },
      });
      return;
    }

    const item = row.raw || {};
    applyTeaProfileToForm(item, row.patientId, row.id);

    setActiveSubmodule('cadastro');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadPlans = async (teaProfileId: string) => {
    setPlansLoading(true);
    try {
      const data: any = await teaProfileService.listPlans(teaProfileId, { isActive: true });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items)
          ? data.items
          : []);

      const mapped: TherapeuticPlanRow[] = list.map((it: any) => ({
        id: String(it.id || ''),
        title: String(it.title || ''),
        objective: String(it.objective || ''),
        priority: String(it.priority || ''),
        status: String(it.status || ''),
        responsibleDoctorId: String(it.responsibleDoctorId || ''),
        responsibleProfessional: String(it.responsibleProfessional || ''),
        targetDate: it.targetDate ? String(it.targetDate) : '',
        isActive: Boolean(it.isActive),
      })).filter((it) => it.id);

      setPlans(mapped);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar planos terapêuticos',
        color: 'red',
      });
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubmodule !== 'plano') return;

    if (selectedTeaProfileId) {
      loadPlans(selectedTeaProfileId);
      return;
    }

    if (selectedPatientId) {
      const byPatient = teaItems.find((it) => it.patientId === selectedPatientId);
      if (byPatient?.id) {
        setSelectedTeaProfileId(byPatient.id);
        loadPlans(byPatient.id);
        return;
      }
    }

    setPlans([]);
  }, [activeSubmodule, selectedTeaProfileId, selectedPatientId, teaItems]);

  const submodules: Array<{
    key: TeaSubmodule;
    label: string;
    description: string;
    icon: any;
    enabled: boolean;
  }> = [
    {
      key: 'cadastro',
      label: 'Cadastro TEA',
      description: 'Paciente base + perfil TEA',
      icon: Brain,
      enabled: true,
    },
    {
      key: 'pacientes',
      label: 'Pacientes TEA',
      description: 'Lista e edição dos cadastrados',
      icon: Users,
      enabled: true,
    },
    {
      key: 'plano',
      label: 'Plano Terapêutico',
      description: 'Objetivos e prioridades clínicas',
      icon: ClipboardList,
      enabled: true,
    },
    {
      key: 'evolucao',
      label: 'Evolução',
      description: 'Registros por sessão (próximo passo)',
      icon: Activity,
      enabled: false,
    },
    {
      key: 'relatorios',
      label: 'Relatórios',
      description: 'Consolidados e indicadores (próximo passo)',
      icon: BarChart3,
      enabled: false,
    },
  ];

  const handleCreatePlan = async () => {
    if (!selectedTeaProfileId) {
      showNotification({ title: 'Atenção', message: 'Salve ou selecione um perfil TEA antes de criar plano.', color: 'yellow' });
      return;
    }
    if (!planForm.title.trim()) {
      showNotification({ title: 'Erro', message: 'Título do plano é obrigatório', color: 'red' });
      return;
    }

    setSavingPlan(true);
    try {
      const selectedDoctorOption = doctorOptions.find((item) => item.value === planForm.responsibleDoctorId);
      await teaProfileService.createPlan(selectedTeaProfileId, {
        title: planForm.title.trim(),
        objective: planForm.objective || undefined,
        priority: planForm.priority || undefined,
        status: planForm.status || undefined,
        responsibleDoctorId: planForm.responsibleDoctorId || undefined,
        responsibleProfessional: selectedDoctorOption?.label || planForm.responsibleProfessional || undefined,
        targetDate: planForm.targetDate ? dayjs(planForm.targetDate).format('YYYY-MM-DD') : undefined,
        notes: planForm.notes || undefined,
      });

      showNotification({ title: 'Sucesso', message: 'Plano terapêutico criado com sucesso', color: 'green' });
      setPlanForm(INITIAL_PLAN_FORM);
      await loadPlans(selectedTeaProfileId);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao criar plano terapêutico',
        color: 'red',
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeactivatePlan = async (planId: string) => {
    if (!selectedTeaProfileId) return;
    try {
      await teaProfileService.deactivatePlan(planId);
      showNotification({ title: 'Sucesso', message: 'Plano terapêutico inativado', color: 'green' });
      await loadPlans(selectedTeaProfileId);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao inativar plano',
        color: 'red',
      });
    }
  };

  return (
    <Box bg={pageBg} style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={14}>
          <Button variant="subtle" color="dark" leftSection={<ChevronLeft size={18} />} onClick={() => navigate('/tea')}>
            Voltar
          </Button>
          <Box>
            <Text fw={700} size="lg" style={{ color: titleColor }}>Módulo TEA</Text>
            <Text size="sm" c="dimmed">Subsistema clínico TEA</Text>
          </Box>
        </Group>

        <Transition mounted={enteredShell} transition={isFromModuleHub ? 'pop' : 'fade-up'} duration={isFromModuleHub ? 300 : 240} timingFunction="ease">
          {(styles) => (
            <Box style={styles}>
              <Paper
                p="md"
                mb="md"
                bg={shellBg}
                style={{
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 12,
                }}
              >
                {!isStandaloneSubmodule && <Text size="xs" c="dimmed" mb="xs">Submódulos TEA</Text>}
                {!isStandaloneSubmodule && <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xs">
                  {submodules.map((module) => {
                    const Icon = module.icon;
                    const active = activeSubmodule === module.key;
                    return (
                      <Paper
                        key={module.key}
                        p="xs"
                        withBorder
                        style={{
                          cursor: module.enabled ? 'pointer' : 'not-allowed',
                          opacity: module.enabled ? 1 : 0.6,
                          borderColor: active ? activeModuleBorder : 'var(--mantine-color-default-border)',
                          background: active ? activeModuleBg : 'transparent',
                        }}
                        onClick={() => {
                          if (!module.enabled) return;
                          setActiveSubmodule(module.key);
                        }}
                      >
                        <Group gap={8} wrap="nowrap" align="flex-start">
                          <ThemeIcon size="sm" variant={active ? 'filled' : 'light'} color="indigo">
                            <Icon size={12} />
                          </ThemeIcon>
                          <Box>
                            <Text size="xs" fw={600}>{module.label}</Text>
                            <Text size="10px" c="dimmed" lh={1.2}>{module.description}</Text>
                          </Box>
                        </Group>
                      </Paper>
                    );
                  })}
                </SimpleGrid>}
              </Paper>
              <Transition mounted={enteredForm} transition="fade" duration={isFromModuleHub ? 280 : 220} timingFunction="ease">
                {(formStyles) => (
        <Stack gap="md" p="md" bg={cardBg} style={{ border: `1px solid ${cardBorder}`, borderRadius: 8, ...formStyles }}>
          {activeSubmodule === 'cadastro' ? (
            <>
          <Group justify="space-between" align="center" wrap="wrap">
            <Text fw={700}>Cadastro TEA</Text>
            <Badge variant="light" color="indigo">Submódulo ativo</Badge>
          </Group>

          <Select
            label="Paciente existente"
            placeholder={patientsLoading ? 'Carregando pacientes...' : 'Buscar paciente por nome/CPF'}
            data={patientOptions}
            value={selectedPatientId}
            onChange={handleSelectPatient}
            searchable
            clearable
            disabled={patientsLoading}
            nothingFoundMessage="Nenhum paciente encontrado"
          />

          <Group grow>
            <TextInput
              label="Nome do paciente"
              value={form.patientName}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setTeaField('patientName', value);
              }}
            />
            <TextInput
              label="CPF"
              value={form.patientCpf}
              onChange={(e) => {
                const value = formatCPF(onlyDigits(e.currentTarget.value).slice(0, 11));
                setTeaField('patientCpf', value);
              }}
            />
          </Group>

          <Group grow>
            <DateInput
              label="Data de nascimento"
              placeholder="Selecione"
              value={form.birthDate}
              onChange={(value) => setForm((prev) => ({ ...prev, birthDate: value ? new Date(value) : null }))}
              valueFormat="DD/MM/YYYY"
              locale="pt-br"
            />
            <Select
              label="Gênero"
              value={form.gender}
              onChange={(value) => setForm((prev) => ({ ...prev, gender: (value as Gender) || '' }))}
              data={[
                { value: 'MALE', label: 'Masculino' },
                { value: 'FEMALE', label: 'Feminino' },
                { value: 'OTHER', label: 'Outro' },
              ]}
            />
            <TextInput
              label="Celular"
              value={form.cellphone}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setTeaField('cellphone', value);
              }}
            />
          </Group>

          <Group grow>
            <TextInput
              label="E-mail"
              value={form.email}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setTeaField('email', value);
              }}
            />
            <TextInput
              label="Convênio"
              value={form.healthInsuranceName}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setTeaField('healthInsuranceName', value);
              }}
            />
            <TextInput
              label="Nº Convênio"
              value={form.healthInsuranceNumber}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setTeaField('healthInsuranceNumber', value);
              }}
            />
          </Group>

          <Select
            label="Nível de suporte TEA"
            placeholder="Selecione"
            value={form.supportLevel}
            onChange={(value) => setForm((prev) => ({ ...prev, supportLevel: value || '' }))}
            data={[
              { value: 'Nível 1', label: 'Nível 1 (necessita apoio)' },
              { value: 'Nível 2', label: 'Nível 2 (apoio substancial)' },
              { value: 'Nível 3', label: 'Nível 3 (apoio muito substancial)' },
            ]}
            clearable
          />

          <Textarea
            label="Perfil de comunicação"
            minRows={2}
            value={form.communicationProfile}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTeaField('communicationProfile', value);
            }}
          />

          <Textarea
            label="Perfil sensorial"
            minRows={2}
            value={form.sensoryProfile}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTeaField('sensoryProfile', value);
            }}
          />

          <Textarea
            label="Comportamentos observados"
            minRows={2}
            value={form.behaviorNotes}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTeaField('behaviorNotes', value);
            }}
          />

          <TextInput
            label="Comorbidades (separadas por vírgula)"
            value={form.comorbiditiesInput}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTeaField('comorbiditiesInput', value);
            }}
          />

          <Textarea
            label="Objetivos terapêuticos"
            minRows={2}
            value={form.therapeuticGoals}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTeaField('therapeuticGoals', value);
            }}
          />

          <Textarea
            label="Orientações para família"
            minRows={2}
            value={form.familyGuidance}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTeaField('familyGuidance', value);
            }}
          />

          <Textarea
            label="Anotações escola"
            minRows={2}
            value={form.schoolNotes}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTeaField('schoolNotes', value);
            }}
          />

          <Checkbox
            label="Perfil TEA ativo"
            checked={form.isActive}
            onChange={(e) => {
              const value = e.currentTarget.checked;
              setTeaField('isActive', value);
            }}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setForm(INITIAL_FORM)}>Limpar</Button>
            <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving}>Salvar dados TEA</Button>
          </Group>
            </>
          ) : activeSubmodule === 'pacientes' ? (
            <>
              <Group justify="space-between" align="center" wrap="wrap">
                <Text fw={700}>Pacientes TEA cadastrados</Text>
                <Badge variant="light" color="indigo">Submódulo ativo</Badge>
              </Group>

              <TextInput
                leftSection={<Search size={14} />}
                placeholder="Buscar por nome ou CPF"
                value={teaSearch}
                onChange={(e) => setTeaSearch(e.currentTarget.value)}
                style={{ maxWidth: isMobile ? '100%' : 360 }}
              />

                  {teaLoading ? (
                <Group justify="center" py="md"><Loader size="sm" /></Group>
              ) : teaItems.length === 0 ? (
                <Text size="sm" c="dimmed">Nenhum paciente TEA encontrado.</Text>
              ) : (
                <Stack gap="xs">
                  {teaItems.map((item) => (
                    <Paper key={item.id} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Box>
                          <Text fw={600}>{item.patientName || 'Paciente sem nome'}</Text>
                          <Text size="xs" c="dimmed">
                            {item.patientCpf ? formatCPF(item.patientCpf) : 'CPF não informado'}
                            {item.supportLevel ? ` • ${item.supportLevel}` : ''}
                            {item.isActive ? ' • Ativo' : ' • Inativo'}
                          </Text>
                        </Box>
                        <Group gap="xs" wrap="nowrap">
                          <ActionIcon
                            variant="light"
                            color="violet"
                            onClick={() => {
                              navigate('/tea/pit', { state: { teaProfileId: item.id } });
                            }}
                            title="Ver PIT deste paciente"
                          >
                            <ClipboardList size={14} />
                          </ActionIcon>
                          <ActionIcon variant="light" color="indigo" onClick={() => handleEditTeaProfile(item)} title="Editar perfil TEA">
                            <Pencil size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}

              {selectedTeaProfileId && (
                <>
                  <Divider my="xs" />
                  <Text fw={600}>Planos terapêuticos do paciente selecionado</Text>

                  {plansLoading ? (
                    <Group justify="center" py="md"><Loader size="sm" /></Group>
                  ) : plans.length === 0 ? (
                    <Text size="sm" c="dimmed">Nenhum plano terapêutico cadastrado para este paciente.</Text>
                  ) : (
                    <Stack gap="xs">
                      {plans.map((plan) => (
                        <Paper key={plan.id} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                          <Group justify="space-between" align="center" wrap="nowrap">
                            <Box>
                              <Text fw={600}>{plan.title}</Text>
                              <Text size="xs" c="dimmed">
                                {plan.priority ? `${plan.priority} • ` : ''}
                                {plan.status || 'Ativo'}
                                {plan.responsibleProfessional ? ` • ${plan.responsibleProfessional}` : ''}
                                {plan.targetDate ? ` • Prazo: ${dayjs(plan.targetDate).format('DD/MM/YYYY')}` : ''}
                              </Text>
                              {plan.objective && <Text size="xs" mt={4}>{plan.objective}</Text>}
                            </Box>
                            <ActionIcon variant="light" color="red" onClick={() => handleDeactivatePlan(plan.id)} title="Inativar plano">
                              <Trash2 size={14} />
                            </ActionIcon>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </>
              )}
            </>
          ) : activeSubmodule === 'plano' ? (
            <>
              <Group justify="space-between" align="center" wrap="wrap">
                <Text fw={700}>Plano Terapêutico</Text>
                <Badge variant="light" color="indigo">Submódulo ativo</Badge>
              </Group>

              <Select
                label="Paciente TEA"
                placeholder={teaLoading ? 'Carregando pacientes TEA...' : 'Selecione um paciente TEA'}
                data={teaProfileOptions}
                value={selectedTeaProfileId}
                onChange={(value) => {
                  const selectedId = value || null;
                  setSelectedTeaProfileId(selectedId);
                  const selected = teaItems.find((it) => it.id === selectedId);
                  setSelectedPatientId(selected?.patientId || null);
                }}
                searchable
                clearable
                disabled={teaLoading}
                nothingFoundMessage="Nenhum paciente TEA encontrado"
              />

              {!selectedTeaProfileId ? (
                <Text size="sm" c="dimmed">Selecione um paciente TEA para criar e visualizar planos terapêuticos.</Text>
              ) : (
                <>
                  <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                    <Text fw={600}>Novo plano terapêutico</Text>
                    <Badge variant="light" color="indigo">Perfil TEA ativo</Badge>
                  </Group>

                  <Group grow>
                    <TextInput
                      label="Título"
                      placeholder="Ex.: Desenvolver comunicação funcional"
                      value={planForm.title}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setPlanField('title', value);
                      }}
                    />
                    <Select
                      label="Prioridade"
                      value={planForm.priority}
                      onChange={(value) => setPlanForm((prev) => ({ ...prev, priority: value || 'Média' }))}
                      data={[
                        { value: 'Baixa', label: 'Baixa' },
                        { value: 'Média', label: 'Média' },
                        { value: 'Alta', label: 'Alta' },
                      ]}
                    />
                    <Select
                      label="Status"
                      value={planForm.status}
                      onChange={(value) => setPlanForm((prev) => ({ ...prev, status: value || 'Ativo' }))}
                      data={[
                        { value: 'Ativo', label: 'Ativo' },
                        { value: 'Pausado', label: 'Pausado' },
                        { value: 'Concluído', label: 'Concluído' },
                      ]}
                    />
                  </Group>

                  <Group grow>
                    <Select
                      label="Profissional responsável"
                      placeholder={loadingDoctors ? 'Carregando médicos...' : 'Selecione um médico'}
                      data={doctorOptions}
                      value={planForm.responsibleDoctorId}
                      onChange={(value) => {
                        const doctorId = value || '';
                        const selectedDoctor = doctorOptions.find((item) => item.value === doctorId);
                        setPlanForm((prev) => ({
                          ...prev,
                          responsibleDoctorId: doctorId,
                          responsibleProfessional: selectedDoctor?.label || '',
                        }));
                      }}
                      searchable
                      clearable
                      nothingFoundMessage="Nenhum médico encontrado"
                    />
                    <DateInput
                      label="Prazo alvo"
                      placeholder="Selecione"
                      value={planForm.targetDate}
                      onChange={(value) => setPlanForm((prev) => ({ ...prev, targetDate: value ? new Date(value) : null }))}
                      valueFormat="DD/MM/YYYY"
                      locale="pt-br"
                    />
                  </Group>

                  <Textarea
                    label="Objetivo clínico"
                    minRows={2}
                    value={planForm.objective}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setPlanField('objective', value);
                    }}
                  />

                  <Textarea
                    label="Observações"
                    minRows={2}
                    value={planForm.notes}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setPlanField('notes', value);
                    }}
                  />

                  <Group justify="flex-end">
                    <Button variant="default" onClick={() => setPlanForm(INITIAL_PLAN_FORM)}>Limpar</Button>
                    <Button bg={DARK_BLUE} leftSection={<Plus size={14} />} onClick={handleCreatePlan} loading={savingPlan} disabled={savingPlan}>
                      Adicionar plano
                    </Button>
                  </Group>

                </>
              )}
            </>
          ) : (
            <>
              <Text fw={700} size="md">{activeSubmodule === 'evolucao' ? 'Evolução' : 'Relatórios'}</Text>
              <Text size="sm" c="dimmed">
                Este submódulo será a próxima etapa. Estrutura já separada para manter o módulo TEA organizado por áreas.
              </Text>
            </>
          )}
        </Stack>
                )}
              </Transition>
            </Box>
          )}
        </Transition>
      </Box>
    </Box>
  );
}
