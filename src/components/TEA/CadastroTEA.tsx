import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Group,
  Text,
  Button,
  Stack,
  Checkbox,
  Paper,
  ThemeIcon,
  Divider,
  Transition,
  ActionIcon,
  Badge,
  SimpleGrid,
  Skeleton,
  useColorScheme,
  Modal,
  Tabs,
  TextInput,
  Table,
  Select,
  DateInput,
  Textarea,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { Pencil, Search, Plus, ClipboardList, Activity, BarChart3, Users, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { showNotification } from '@/components/ui';
import { Header } from '../Header/Header';
import { TeaHome } from './TeaHome';
import teaProfileService from '../../services/teaProfileService';
import { onlyDigits, formatCPF, isValidCPF, isValidEmail, normalizeEmail, parseApiDateToLocalDate } from '../../utils/formatters';
import { usePatientsAdminQuery } from '../../hooks/usePatientsAdminQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useInsurancesAdminQuery } from '../../hooks/useInsurancesAdminQuery';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useTeaPlansQuery } from '../../hooks/useTeaPlansQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import './CadastroTEA.css';
import { notifyUnsavedChangesSaved } from '../../hooks/useUnsavedChangesGuard';

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

const PARTICULAR_INSURANCE_VALUE = '__PARTICULAR__';

const INITIAL_FORM: TeaForm = {
  patientName: '',
  patientCpf: '',
  birthDate: null,
  gender: '',
  cellphone: '',
  email: '',
  healthInsuranceName: PARTICULAR_INSURANCE_VALUE,
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
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useColorScheme();
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

  const titleColor = 'var(--ui-foreground)';
  const pageBg = 'var(--ui-background)';
  const cardBg = 'var(--ui-surface)';
  const cardBorder = 'var(--ui-border)';
  const shellBg = 'color-mix(in srgb, var(--ui-foreground) 4%, var(--ui-surface))';
  const activeModuleBg = 'color-mix(in srgb, var(--ui-hue-indigo) 12%, var(--ui-surface))';
  const activeModuleBorder = 'var(--ui-hue-indigo)';

  const [form, setForm] = useState<TeaForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [teaSearch, setTeaSearch] = useState('');
  const [activeSubmodule, setActiveSubmodule] = useState<TeaSubmodule>(forcedSubmodule || 'pacientes');
  const isRebuiltView = activeSubmodule === 'pacientes' || activeSubmodule === 'plano';
  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(INITIAL_PLAN_FORM);
  const [savingPlan, setSavingPlan] = useState(false);
  const [cadastroModalOpened, setCadastroModalOpened] = useState(Boolean(forcedSubmodule === 'cadastro'));
  const [cadastroTab, setCadastroTab] = useState<string>('patient');
  const [profileTeaEnabled, setProfileTeaEnabled] = useState(false);

  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = usePatientsAdminQuery();
  const { data: doctorsData, isLoading: loadingDoctors, error: doctorsError } = useDoctorsAdminQuery();
  const { data: insurancesData, isLoading: loadingInsurances, error: insurancesError } = useInsurancesAdminQuery();
  const { data: teaProfilesData = [], isLoading: teaLoading, error: teaProfilesError } = useTeaProfilesQuery({ search: teaSearch || undefined });
  const { data: plansData = [], isLoading: plansLoading, error: plansError } = useTeaPlansQuery({
    teaProfileId: activeSubmodule === 'plano' ? selectedTeaProfileId : null,
    isActive: true,
  });

  const setTeaField = <K extends keyof TeaForm>(field: K, value: TeaForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setPlanField = <K extends keyof PlanForm>(field: K, value: PlanForm[K]) => {
    setPlanForm((prev) => ({ ...prev, [field]: value }));
  };

  const cpfDigits = useMemo(() => onlyDigits(form.patientCpf || '').slice(0, 11), [form.patientCpf]);
  const normalizedPatients = useMemo(() => {
    return Array.isArray(patientsData)
      ? patientsData
      : (Array.isArray((patientsData as any)?.patients)
        ? (patientsData as any).patients
        : (Array.isArray((patientsData as any)?.items)
          ? (patientsData as any).items
          : (Array.isArray((patientsData as any)?.data?.patients)
            ? (patientsData as any).data.patients
            : (Array.isArray((patientsData as any)?.data)
              ? (patientsData as any).data
              : []))));
  }, [patientsData]);
  const patientById = useMemo(() => {
    const byId: Record<string, any> = {};
    normalizedPatients.forEach((p: any) => {
      const id = String(p?.id || '');
      if (id) byId[id] = p;
    });
    return byId;
  }, [normalizedPatients]);
  const patientOptions = useMemo(() => normalizedPatients
    .map((p: any) => {
      const id = String(p?.id || '');
      if (!id) return null;
      const name = String(p?.name || '').trim();
      const cpf = String(p?.cpf || '').trim();
      return {
        value: id,
        label: cpf ? `${name} • ${formatCPF(cpf)}` : name,
      };
    })
    .filter(Boolean) as { value: string; label: string }[], [normalizedPatients]);
  const teaItems = useMemo(() => {
    const list: any[] = Array.isArray(teaProfilesData) ? teaProfilesData : [];
    return list.map((it: any) => ({
      id: String(it.id || ''),
      patientId: String(it.patient?.id || it.patientId || ''),
      patientName: String(it.patient?.name || ''),
      patientCpf: String(it.patient?.cpf || ''),
      supportLevel: String(it.supportLevel || ''),
      isActive: Boolean(it.isActive),
      raw: it,
    })).filter((it: TeaProfileRow) => it.id);
  }, [teaProfilesData]);
  const teaProfileOptions = useMemo(
    () => teaItems.map((item) => ({
      value: item.id,
      label: `${item.patientName || 'Paciente sem nome'}${item.patientCpf ? ` • ${formatCPF(item.patientCpf)}` : ''}${item.supportLevel ? ` • ${item.supportLevel}` : ''}`,
    })),
    [teaItems],
  );

  const plans = useMemo(() => {
    const list: any[] = Array.isArray(plansData) ? plansData : [];
    return list.map((it: any) => ({
      id: String(it.id || ''),
      title: String(it.title || ''),
      objective: String(it.objective || ''),
      priority: String(it.priority || ''),
      status: String(it.status || ''),
      responsibleDoctorId: String(it.responsibleDoctorId || ''),
      responsibleProfessional: String(it.responsibleProfessional || ''),
      targetDate: it.targetDate ? String(it.targetDate) : '',
      isActive: Boolean(it.isActive),
    })).filter((it: TherapeuticPlanRow) => it.id);
  }, [plansData]);

  useEffect(() => {
    if (activeSubmodule === 'cadastro') {
      setCadastroModalOpened(true);
    }
  }, [activeSubmodule]);
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
      .filter(Boolean) as { value: string; label: string }[];
  }, [doctorsData]);
  const insuranceOptions = useMemo(() => {
    const list: any[] = Array.isArray(insurancesData)
      ? insurancesData
      : Array.isArray((insurancesData as any)?.items)
        ? (insurancesData as any).items
        : Array.isArray((insurancesData as any)?.insurances)
          ? (insurancesData as any).insurances
          : Array.isArray((insurancesData as any)?.data?.items)
            ? (insurancesData as any).data.items
            : Array.isArray((insurancesData as any)?.data?.insurances)
              ? (insurancesData as any).data.insurances
              : Array.isArray((insurancesData as any)?.data)
                ? (insurancesData as any).data
                : [];
    return list
      .map((item: any) => {
        const name = String(item?.name || item?.nome || '').trim();
        if (!name) return null;
        return { value: name, label: name };
      })
      .filter((item: { value: string; label: string } | null): item is { value: string; label: string } => Boolean(item))
      .filter((item, index, arr) => arr.findIndex((candidate) => candidate.value === item.value) === index)
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [insurancesData]);
  const insuranceSelectOptions = useMemo(() => {
    const patientInsuranceOptions = Object.values(patientById)
      .map((patient: any) => String(patient?.healthInsuranceName || '').trim())
      .filter(Boolean)
      .filter((name, index, arr) => arr.indexOf(name) === index)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((name) => ({ value: name, label: name }));

    const mergedInsuranceOptions = [...insuranceOptions, ...patientInsuranceOptions]
      .filter((option, index, arr) => arr.findIndex((candidate) => candidate.value === option.value) === index)
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

    const base = [
      { value: PARTICULAR_INSURANCE_VALUE, label: 'Particular' },
      ...mergedInsuranceOptions,
    ];
    const current = String(form.healthInsuranceName || '').trim();
    if (
      current
      && current !== PARTICULAR_INSURANCE_VALUE
      && !base.some((option) => option.value === current)
    ) {
      base.push({ value: current, label: current });
    }
    return base;
  }, [insuranceOptions, patientById, form.healthInsuranceName]);

  useEffect(() => {
    if (!patientsError) return;
    const err: any = patientsError;
    showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao carregar pacientes'), color: 'red' });
  }, [patientsError]);

  useEffect(() => {
    if (!doctorsError) return;
    const err: any = doctorsError;
    showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao carregar médicos'), color: 'red' });
  }, [doctorsError]);

  useEffect(() => {
    if (!insurancesError) return;
    const err: any = insurancesError;
    showNotification({ title: 'Aviso', message: resolveApiErrorMessage(err, 'Não foi possível carregar a lista de convênios'), color: 'yellow' });
  }, [insurancesError]);

  useEffect(() => {
    if (!teaProfilesError) return;
    const err: any = teaProfilesError;
    showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao carregar pacientes de Terapias'), color: 'red' });
  }, [teaProfilesError]);

  useEffect(() => {
    if (!plansError || activeSubmodule !== 'plano' || !selectedTeaProfileId) return;
    const err: any = plansError;
    showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao carregar planos terapêuticos'), color: 'red' });
  }, [plansError, activeSubmodule, selectedTeaProfileId]);

  useEffect(() => {
    if (!forcedSubmodule) return;
    setActiveSubmodule(forcedSubmodule);
  }, [forcedSubmodule]);

  useEffect(() => {
    if (isStandaloneSubmodule) {
      setEnteredShell(true);
      setEnteredForm(true);
      return;
    }
    const shellDelay = isFromModuleHub ? 120 : 40;
    const formDelay = isFromModuleHub ? 320 : 180;
    const shellTimer = window.setTimeout(() => setEnteredShell(true), shellDelay);
    const formTimer = window.setTimeout(() => setEnteredForm(true), formDelay);
    return () => {
      window.clearTimeout(shellTimer);
      window.clearTimeout(formTimer);
    };
  }, [isFromModuleHub, isStandaloneSubmodule]);

  const handleSelectPatient = (value: string | null) => {
    setSelectedPatientId(value);
    if (!value) return;

    const p = patientById[value];
    if (!p) return;

    setForm((prev) => ({
      ...prev,
      patientName: p.name || prev.patientName,
      patientCpf: p.cpf || prev.patientCpf,
      birthDate: parseApiDateToLocalDate(p.birthDate) || prev.birthDate,
      gender: mapGender(p.gender) || prev.gender,
      cellphone: p.cellphone || prev.cellphone,
      email: p.email || prev.email,
      // Keep insurance fields scoped to the selected patient; never reuse prior patient values.
      healthInsuranceName: String(p.healthInsuranceName || '').trim() || PARTICULAR_INSURANCE_VALUE,
      healthInsuranceNumber: String(p.healthInsuranceNumber || ''),
    }));
  };

  const handleCloseCadastroModal = () => {
    setCadastroModalOpened(false);
    if (forcedSubmodule !== 'pacientes') {
      navigate('/tea');
    }
  };

  const handleProfileCheckboxChange = (checked: boolean) => {
    setProfileTeaEnabled(checked);
    setForm((prev) => ({ ...prev, isActive: checked }));
    if (!checked) {
      setCadastroTab('patient');
    }
  };

  const handleSave = async () => {
    if (!selectedPatientId) {
      if (!form.patientName.trim()) {
        showNotification({ title: 'Erro', message: 'Nome do paciente é obrigatório', color: 'red' });
        return;
      }
      if (!isValidCPF(cpfDigits)) {
        showNotification({ title: 'Erro', message: 'CPF inválido', color: 'red' });
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
      if (form.email.trim() && !isValidEmail(form.email)) {
        showNotification({ title: 'Erro', message: 'Email inválido', color: 'red' });
        return;
      }
    }

    setSaving(true);
    try {
      const isParticular = form.healthInsuranceName === PARTICULAR_INSURANCE_VALUE;
      const normalizedInsuranceName = isParticular
        ? ''
        : String(form.healthInsuranceName || '').trim();

      const payload = {
        patientId: selectedPatientId || undefined,
        patient: {
          name: form.patientName.trim() || undefined,
          cpf: cpfDigits || undefined,
          birthDate: form.birthDate ? dayjs(form.birthDate).format('YYYY-MM-DD') : undefined,
          gender: form.gender || undefined,
          cellphone: onlyDigits(form.cellphone) || undefined,
          email: normalizeEmail(form.email) || undefined,
          healthInsuranceName: normalizedInsuranceName || undefined,
          healthInsuranceNumber: isParticular ? undefined : (form.healthInsuranceNumber.trim() || undefined),
        },
        tea: profileTeaEnabled || selectedTeaProfileId ? {
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
        } : undefined,
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
        message: 'Dados de Terapias salvos com sucesso',
        color: 'green',
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.patientsAdmin }),
        queryClient.invalidateQueries({ queryKey: queryKeys.teaProfiles }),
      ]);

      notifyUnsavedChangesSaved();
      setCadastroModalOpened(false);
      if (forcedSubmodule !== 'pacientes') {
        navigate('/tea');
      }
    } catch (err: any) {
      const details = err?.response?.data?.fields
        ? Object.values(err.response.data.fields).join(' | ')
        : (err?.response?.data?.details || resolveApiErrorMessage(err, 'Falha ao salvar dados de Terapias'));

      showNotification({
        title: 'Erro ao salvar',
        message: details || 'Falha ao salvar dados de Terapias',
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
    setProfileTeaEnabled(true);
    setForm({
      patientName: String(patient.name || ''),
      patientCpf: String(patient.cpf || ''),
      birthDate: parseApiDateToLocalDate(patient.birthDate),
      gender: mapGender(patient.gender),
      cellphone: String(patient.cellphone || ''),
      email: String(patient.email || ''),
      healthInsuranceName: String(patient.healthInsuranceName || '').trim() || PARTICULAR_INSURANCE_VALUE,
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
    setCadastroTab('profile');
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

  useEffect(() => {
    if (activeSubmodule !== 'plano') return;

    if (selectedTeaProfileId) {
      return;
    }

    if (selectedPatientId) {
      const byPatient = teaItems.find((it) => it.patientId === selectedPatientId);
      if (byPatient?.id) {
        setSelectedTeaProfileId(byPatient.id);
        return;
      }
    }
  }, [activeSubmodule, selectedTeaProfileId, selectedPatientId, teaItems]);

  const submodules: Array<{
    key: TeaSubmodule;
    label: string;
    description: string;
    icon: any;
    enabled: boolean;
  }> = [
    {
      key: 'pacientes',
      label: 'Pacientes de Terapias',
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

  const cadastroModal = (
    <Modal
      opened={cadastroModalOpened}
      onClose={handleCloseCadastroModal}
      title="Conversão de Pacientes"
      size={900}
      centered
      styles={{ body: { paddingTop: 24 } }}
    >
      <Tabs value={cadastroTab} onChange={(value) => setCadastroTab(value || 'patient')}>
        <Tabs.List>
          <Tabs.Tab value="patient">Dados do Paciente</Tabs.Tab>
          <Tabs.Tab value="profile" disabled={!profileTeaEnabled}>Perfil de Terapias</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="patient" pt="md">
          <Stack gap="md">
            <Select
              label="Nome"
              placeholder={patientsLoading ? 'Carregando pacientes...' : 'Buscar paciente por nome/CPF'}
              data={patientOptions}
              value={selectedPatientId}
              onChange={handleSelectPatient}
              searchable
              clearable
              disabled={patientsLoading}
              nothingFoundMessage="Nenhum paciente encontrado"
            />

            <Group grow align="flex-start">
              <TextInput
                label="CPF"
                placeholder="XXX.XXX.XXX-XX"
                value={form.patientCpf}
                onChange={(e) => setTeaField('patientCpf', formatCPF(onlyDigits(e.currentTarget.value).slice(0, 11)))}
              />
              <DateInput
                label="Data de nascimento"
                value={form.birthDate}
                onChange={(value) => setTeaField('birthDate', value ?? null)}
              />
            </Group>

            <Group grow align="flex-start">
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
                placeholder="(xx) xxxxx-xxxx"
                value={form.cellphone}
                onChange={(e) => setTeaField('cellphone', e.currentTarget.value)}
              />
            </Group>

            <Select
              label="Status"
              value={form.isActive ? 'Em avaliação' : 'Inativo'}
              data={[
                { value: 'Em avaliação', label: 'Em avaliação' },
                { value: 'Inativo', label: 'Inativo' },
              ]}
              onChange={(value) => setTeaField('isActive', value !== 'Inativo')}
            />

            <Divider label="Responsável" labelPosition="left" />
            <Group grow align="flex-start">
              <TextInput label="Nome do Responsável" placeholder="Nome do responsável" />
              <TextInput
                label="E-mail"
                placeholder="xxxxxx@xxxxx.xxx"
                value={form.email}
                onChange={(e) => setTeaField('email', e.currentTarget.value)}
              />
            </Group>
            <Group grow align="flex-start">
              <TextInput label="Telefone" placeholder="(xx) xxxxx-xxxx" />
              <Box />
            </Group>

            <Divider label="Convênio" labelPosition="left" />
            <Group grow align="flex-start">
              <Select
                label="Convênio"
                placeholder={loadingInsurances ? 'Carregando convênios...' : 'Selecione'}
                clearable={false}
                data={insuranceSelectOptions}
                value={form.healthInsuranceName}
                onChange={(value) => {
                  const nextValue = value || PARTICULAR_INSURANCE_VALUE;
                  setTeaField('healthInsuranceName', nextValue);
                  if (nextValue === PARTICULAR_INSURANCE_VALUE) {
                    setTeaField('healthInsuranceNumber', '');
                  }
                }}
                disabled={loadingInsurances}
              />
              <TextInput
                label="Número do Convênio"
                value={form.healthInsuranceNumber}
                disabled={form.healthInsuranceName === PARTICULAR_INSURANCE_VALUE}
                onChange={(e) => setTeaField('healthInsuranceNumber', e.currentTarget.value)}
              />
            </Group>

            <Checkbox
              label="Perfil de Terapias"
              checked={profileTeaEnabled}
              onChange={(e) => handleProfileCheckboxChange(e.currentTarget.checked)}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={handleCloseCadastroModal}>Cancelar</Button>
              <Button variant="light" color="indigo" disabled={!profileTeaEnabled} onClick={() => setCadastroTab('profile')}>
                Continuar
              </Button>
              <Button onClick={handleSave} loading={saving} disabled={saving}>
                Salvar
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="profile" pt="md">
          <Stack gap="md">
            <Select
              label="Nível de Suporte TEA"
              placeholder="Selecione"
              value={form.supportLevel}
              onChange={(value) => setForm((prev) => ({ ...prev, supportLevel: value || '' }))}
              data={[
                { value: 'Nível 1', label: 'Nível 1 (necessita de apoio)' },
                { value: 'Nível 2', label: 'Nível 2 (apoio substancial)' },
                { value: 'Nível 3', label: 'Nível 3 (apoio muito substancial)' },
              ]}
              clearable
            />

            <Textarea label="Perfil de Comunicação" minRows={2} value={form.communicationProfile} onChange={(e) => setTeaField('communicationProfile', e.currentTarget.value)} />
            <Textarea label="Perfil Sensorial" minRows={2} value={form.sensoryProfile} onChange={(e) => setTeaField('sensoryProfile', e.currentTarget.value)} />
            <Textarea label="Comportamentos Observados" minRows={2} value={form.behaviorNotes} onChange={(e) => setTeaField('behaviorNotes', e.currentTarget.value)} />
            <TextInput label="Comorbidades (separadas por vírgula)" value={form.comorbiditiesInput} onChange={(e) => setTeaField('comorbiditiesInput', e.currentTarget.value)} />
            <Textarea label="Objetivos Terapêuticos" minRows={2} value={form.therapeuticGoals} onChange={(e) => setTeaField('therapeuticGoals', e.currentTarget.value)} />
            <Textarea label="Orientações para Família" minRows={2} value={form.familyGuidance} onChange={(e) => setTeaField('familyGuidance', e.currentTarget.value)} />
            <Textarea label="Anotações Escola" minRows={2} value={form.schoolNotes} onChange={(e) => setTeaField('schoolNotes', e.currentTarget.value)} />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCadastroTab('patient')}>Cancelar</Button>
              <Button onClick={handleSave} loading={saving} disabled={saving || !profileTeaEnabled}>
                Salvar
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );

  if (forcedSubmodule === 'cadastro') {
    return (
      <>
        <TeaHome />
        {cadastroModal}
      </>
    );
  }

  const handleCreatePlan = async () => {
    if (!selectedTeaProfileId) {
      showNotification({ title: 'Atenção', message: 'Salve ou selecione um perfil de Terapias antes de criar plano.', color: 'yellow' });
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
      notifyUnsavedChangesSaved();
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.teaPlans, selectedTeaProfileId] });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Falha ao criar plano terapêutico'),
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
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.teaPlans, selectedTeaProfileId] });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Falha ao inativar plano'),
        color: 'red',
      });
    }
  };

  return (
    <Box bg={pageBg} style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate('/tea') }} />

      <Box className={isRebuiltView ? 'tea-pacientes-content' : undefined} p={isMobile ? 'sm' : 'xl'} maw={1400} mx="auto" w="100%">
        {!isRebuiltView && (
          <Group mb={14}>
            <Box>
              <Text fw={700} size="lg" style={{ color: titleColor }}>Módulo Terapias</Text>
              <Text size="sm" c="dimmed">Subsistema clínico de Terapias</Text>
            </Box>
          </Group>
        )}

        <Transition mounted={enteredShell} transition={isFromModuleHub ? 'pop' : 'fade-up'} duration={isFromModuleHub ? 300 : 240} timingFunction="ease">
          {(styles) => (
            <Box style={styles}>
              {!isStandaloneSubmodule && (
                <Paper
                  p="md"
                  mb="md"
                  bg={shellBg}
                  style={{
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 12,
                  }}
                >
                  <Text size="xs" c="dimmed" mb="xs">Submódulos de Terapias</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xs">
                    {submodules.map((module) => {
                      const Icon = module.icon;
                      const active = activeSubmodule === module.key;
                      return (
                        <Paper
                          key={module.key}
                          p="xs"
                          withBorder
                          className={colorScheme === 'dark' ? 'module-card-dark' : undefined}
                          style={{
                            cursor: module.enabled ? 'pointer' : 'not-allowed',
                            opacity: module.enabled ? 1 : 0.6,
                            borderColor: active ? activeModuleBorder : 'var(--mantine-color-default-border)',
                            background: active ? activeModuleBg : undefined,
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
                  </SimpleGrid>
                </Paper>
              )}
              <Transition mounted={enteredForm} transition="fade" duration={isFromModuleHub ? 280 : 220} timingFunction="ease">
                {(formStyles) => (
        <Stack
          gap={isRebuiltView ? 'xl' : 'md'}
          p={isRebuiltView ? 0 : 'md'}
          bg={isRebuiltView ? 'transparent' : cardBg}
          style={isRebuiltView ? { ...formStyles } : { border: `1px solid ${cardBorder}`, borderRadius: 12, ...formStyles }}
        >
          {activeSubmodule === 'cadastro' ? (
            <>
              <Group justify="space-between" align="center" wrap="wrap">
                <Box>
                  <Text fw={700}>Vincular Paciente</Text>
                  <Text size="sm" c="dimmed">Converta um paciente base para o fluxo de Terapias em um modal guiado.</Text>
                </Box>
                <Button leftSection={<Plus size={16} />} onClick={() => setCadastroModalOpened(true)}>
                  Vincular paciente
                </Button>
              </Group>
              {cadastroModal}
            </>
          ) : activeSubmodule === 'pacientes' ? (
            <>
              <Group className="tea-view-hero ui-page-intro" justify="space-between" align="flex-end" wrap="wrap">
                <Box>
                  <Text className="tea-view-eyebrow">OPERAÇÃO CLÍNICA · TERAPIAS</Text>
                  <Text className="tea-view-title" fw={700} size="2xl">Pacientes de Terapias</Text>
                  <Text className="tea-view-subtitle" size="sm">Lista e edição dos pacientes vinculados ao módulo Terapias</Text>
                </Box>
              </Group>

              <Box className="tea-pacientes-search-panel">
                <Text className="tea-pacientes-search-kicker">BUSCAR</Text>
                <Box className="tea-pacientes-search-input">
                  <TextInput
                    label="Buscar paciente"
                    placeholder="Nome ou CPF"
                    value={teaSearch}
                    onChange={(e) => setTeaSearch(e.currentTarget.value)}
                    leftSection={<Search size={16} aria-hidden="true" />}
                  />
                </Box>
              </Box>

              <Paper className="tea-view-panel" p="md">
                <Table className="tea-pacientes-table" verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Paciente</Table.Th>
                      <Table.Th style={{ width: 200 }}>Nível de suporte</Table.Th>
                      <Table.Th style={{ width: 120 }}>Status</Table.Th>
                      <Table.Th style={{ width: 140 }}>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {teaLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <Table.Tr key={`tea-pacientes-skeleton-${index}`}>
                          <Table.Td>
                            <Skeleton height={14} width="55%" radius="xl" mb={8} />
                            <Skeleton height={12} width="35%" radius="xl" />
                          </Table.Td>
                          <Table.Td><Skeleton height={22} width={110} radius="xl" /></Table.Td>
                          <Table.Td><Skeleton height={22} width={70} radius="xl" /></Table.Td>
                          <Table.Td><Skeleton height={30} width={80} radius="md" /></Table.Td>
                        </Table.Tr>
                      ))
                    ) : teaItems.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Stack gap={4} align="center" py="xl">
                            <Text fw={600}>Nenhum paciente de Terapias encontrado</Text>
                            <Text size="sm" c="dimmed" ta="center">
                              Ajuste a busca ou marque um paciente como "Paciente de Terapias" em Cadastro de Paciente.
                            </Text>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      teaItems.map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            <Text fw={600} size="sm">{item.patientName || 'Paciente sem nome'}</Text>
                            <Text size="xs" c="dimmed">
                              {item.patientCpf ? formatCPF(item.patientCpf) : 'CPF não informado'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            {item.supportLevel ? (
                              <Badge variant="light" color="indigo" size="sm">{item.supportLevel}</Badge>
                            ) : (
                              <Text size="sm" c="dimmed">—</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={item.isActive ? 'green' : 'gray'} size="sm">
                              {item.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
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
                              <ActionIcon variant="light" color="indigo" onClick={() => handleEditTeaProfile(item)} title="Editar perfil de Terapias">
                                <Pencil size={14} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </>
          ) : activeSubmodule === 'plano' ? (
            <>
              <Group className="tea-view-hero ui-page-intro" justify="space-between" align="flex-end" wrap="wrap">
                <Box>
                  <Text className="tea-view-eyebrow">OPERAÇÃO CLÍNICA · TERAPIAS</Text>
                  <Text className="tea-view-title" fw={700} size="2xl">Plano Terapêutico</Text>
                  <Text className="tea-view-subtitle" size="sm">Objetivos e prioridades clínicas por paciente de Terapias</Text>
                </Box>
              </Group>

              <Paper className="tea-view-panel" p="md">
                <Stack gap="md">
                  <Select
                    label="Paciente de Terapias"
                    placeholder={teaLoading ? 'Carregando pacientes de Terapias...' : 'Selecione um paciente de Terapias'}
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
                    nothingFoundMessage="Nenhum paciente de Terapias encontrado"
                  />

                  {!selectedTeaProfileId ? (
                    <Box className="tea-plano-empty">
                      <Text fw={600}>Selecione um paciente de Terapias</Text>
                      <Text size="sm" c="dimmed" mt={4}>Escolha um paciente acima para ver e criar planos terapêuticos.</Text>
                    </Box>
                  ) : (
                    <Stack gap="lg">
                      <Box>
                        <Text className="tea-plano-section-title" mb="sm">Planos terapêuticos</Text>
                        {plansLoading ? (
                          <Stack gap="sm">
                            {Array.from({ length: 2 }).map((_, index) => (
                              <Box key={index} className="tea-plano-card">
                                <Skeleton height={16} width="30%" radius="xl" mb={10} />
                                <Skeleton height={12} width="55%" radius="xl" />
                              </Box>
                            ))}
                          </Stack>
                        ) : plans.length === 0 ? (
                          <Text size="sm" c="dimmed">Nenhum plano terapêutico cadastrado para este paciente.</Text>
                        ) : (
                          <Stack gap="sm">
                            {plans.map((plan) => (
                              <Box key={plan.id} className="tea-plano-card">
                                <Group justify="space-between" align="flex-start" wrap="wrap">
                                  <Box>
                                    <Text fw={600}>{plan.title}</Text>
                                    <Text className="tea-plano-card-meta">
                                      {plan.priority ? `${plan.priority} • ` : ''}
                                      {plan.status || 'Ativo'}
                                      {plan.responsibleProfessional ? ` • ${plan.responsibleProfessional}` : ''}
                                      {plan.targetDate ? ` • Prazo: ${dayjs(plan.targetDate).format('DD/MM/YYYY')}` : ''}
                                    </Text>
                                    {plan.objective && <Text className="tea-plano-card-objective">{plan.objective}</Text>}
                                  </Box>
                                  <ActionIcon variant="light" color="red" onClick={() => handleDeactivatePlan(plan.id)} aria-label="Inativar plano" title="Inativar plano">
                                    <Trash2 size={14} />
                                  </ActionIcon>
                                </Group>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Box>

                      <Box>
                        <Group justify="space-between" align="center" wrap="wrap" mb="sm">
                          <Text className="tea-plano-section-title">Novo plano terapêutico</Text>
                          <Badge variant="light" color="indigo">Perfil de Terapias ativo</Badge>
                        </Group>

                        <Stack gap="md">
                          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" verticalSpacing="md">
                            <TextInput
                              label="Título"
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
                          </SimpleGrid>

                          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
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
                              value={planForm.targetDate}
                              onChange={(value) => setPlanForm((prev) => ({ ...prev, targetDate: value || null }))}
                            />
                          </SimpleGrid>

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
                            <Button leftSection={<Plus size={14} />} onClick={handleCreatePlan} loading={savingPlan} disabled={savingPlan}>
                              Adicionar plano
                            </Button>
                          </Group>
                        </Stack>
                      </Box>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </>
          ) : (
            <>
              <Text fw={700} size="md">{activeSubmodule === 'evolucao' ? 'Evolução' : 'Relatórios'}</Text>
              <Text size="sm" c="dimmed">
                Este submódulo será a próxima etapa. Estrutura já separada para manter o módulo Terapias organizado por áreas.
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
