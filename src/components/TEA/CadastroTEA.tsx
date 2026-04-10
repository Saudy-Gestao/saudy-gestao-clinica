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
  useMantineColorScheme,
  Modal,
  Tabs,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Brain, Pencil, Search, Plus, Trash2, ClipboardList, Activity, BarChart3, Users } from 'lucide-react';
import dayjs from 'dayjs';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import { TeaHome } from './TeaHome';
import teaProfileService from '../../services/teaProfileService';
import { DARK_BLUE } from '../../themes/theme';
import { onlyDigits, formatCPF, isValidCPF, isValidEmail, normalizeEmail, parseApiDateToLocalDate } from '../../utils/formatters';
import { usePatientsAdminQuery } from '../../hooks/usePatientsAdminQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useInsurancesAdminQuery } from '../../hooks/useInsurancesAdminQuery';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useTeaPlansQuery } from '../../hooks/useTeaPlansQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { FloatingDateInput } from '../common/FloatingDateInput';

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
  const pageBg = colorScheme === 'dark' ? 'var(--mantine-color-body)' : '#f8f9fa';
  const cardBg = colorScheme === 'dark' ? 'transparent' : 'var(--mantine-color-white)';
  const cardBorder = colorScheme === 'dark' ? 'var(--mantine-color-default-border)' : '#e9ecef';
  const shellBg = colorScheme === 'dark' ? 'transparent' : 'var(--mantine-color-gray-0)';
  const activeModuleBg = colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'var(--mantine-color-indigo-0)';
  const activeModuleBorder = colorScheme === 'dark' ? '#3a5392' : 'var(--mantine-color-indigo-6)';

  const [form, setForm] = useState<TeaForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [teaSearch, setTeaSearch] = useState('');
  const [activeSubmodule, setActiveSubmodule] = useState<TeaSubmodule>(forcedSubmodule || 'cadastro');
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
    showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao carregar pacientes TEA'), color: 'red' });
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
    navigate('/tea');
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
        message: 'Dados TEA salvos com sucesso',
        color: 'green',
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.patientsAdmin }),
        queryClient.invalidateQueries({ queryKey: queryKeys.teaProfiles }),
      ]);

      setCadastroModalOpened(false);
      navigate('/tea');
    } catch (err: any) {
      const details = err?.response?.data?.fields
        ? Object.values(err.response.data.fields).join(' | ')
        : (err?.response?.data?.details || resolveApiErrorMessage(err, 'Falha ao salvar dados TEA'));

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
      key: 'cadastro',
      label: 'Vincular Paciente',
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
          <Tabs.Tab value="profile" disabled={!profileTeaEnabled}>Perfil TEA</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="patient" pt="md">
          <Stack gap="md">
            <FloatingSelect
              label="Nome"
              placeholder={patientsLoading ? 'Carregando pacientes...' : 'Buscar paciente por nome/CPF'}
              data={patientOptions}
              value={selectedPatientId}
              onChange={handleSelectPatient}
              searchable
              clearable
              disabled={patientsLoading}
              nothingFoundMessage="Nenhum paciente encontrado"
              alwaysFloatLabel
            />

            <Group grow align="flex-start">
              <FloatingInput
                label="CPF"
                placeholder="XXX.XXX.XXX-XX"
                value={form.patientCpf}
                onChange={(e) => setTeaField('patientCpf', formatCPF(onlyDigits(e.currentTarget.value).slice(0, 11)))}
                alwaysFloatLabel
              />
              <FloatingDateInput
                label="Data de nascimento"
                value={form.birthDate}
                onChange={(value) => setTeaField('birthDate', value)}
                valueFormat="DD/MM/YYYY"
                placeholder="dd/mm/aaaa"
              />
            </Group>

            <Group grow align="flex-start">
              <FloatingSelect
                label="Gênero"
                value={form.gender}
                onChange={(value) => setForm((prev) => ({ ...prev, gender: (value as Gender) || '' }))}
                data={[
                  { value: 'MALE', label: 'Masculino' },
                  { value: 'FEMALE', label: 'Feminino' },
                  { value: 'OTHER', label: 'Outro' },
                ]}
                alwaysFloatLabel
              />
              <FloatingInput
                label="Celular"
                placeholder="(xx) xxxxx-xxxx"
                value={form.cellphone}
                onChange={(e) => setTeaField('cellphone', e.currentTarget.value)}
                alwaysFloatLabel
              />
            </Group>

            <FloatingSelect
              label="Status"
              value={form.isActive ? 'Em avaliação' : 'Inativo'}
              data={[
                { value: 'Em avaliação', label: 'Em avaliação' },
                { value: 'Inativo', label: 'Inativo' },
              ]}
              onChange={(value) => setTeaField('isActive', value !== 'Inativo')}
              alwaysFloatLabel
            />

            <Divider label="Responsável" labelPosition="left" />
            <Group grow align="flex-start">
              <FloatingInput label="Nome do Responsável" placeholder="Nome do responsável" alwaysFloatLabel />
              <FloatingInput
                label="E-mail"
                placeholder="xxxxxx@xxxxx.xxx"
                value={form.email}
                onChange={(e) => setTeaField('email', e.currentTarget.value)}
                alwaysFloatLabel
              />
            </Group>
            <Group grow align="flex-start">
              <FloatingInput label="Telefone" placeholder="(xx) xxxxx-xxxx" alwaysFloatLabel />
              <Box />
            </Group>

            <Divider label="Convênio" labelPosition="left" />
            <Group grow align="flex-start">
              <FloatingSelect
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
                alwaysFloatLabel
              />
              <FloatingInput
                label="Número do Convênio"
                value={form.healthInsuranceNumber}
                disabled={form.healthInsuranceName === PARTICULAR_INSURANCE_VALUE}
                onChange={(e) => setTeaField('healthInsuranceNumber', e.currentTarget.value)}
                alwaysFloatLabel
              />
            </Group>

            <Checkbox
              label="Perfil TEA"
              checked={profileTeaEnabled}
              onChange={(e) => handleProfileCheckboxChange(e.currentTarget.checked)}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={handleCloseCadastroModal}>Cancelar</Button>
              <Button variant="light" color="indigo" disabled={!profileTeaEnabled} onClick={() => setCadastroTab('profile')}>
                Continuar
              </Button>
              <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving}>
                Salvar
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="profile" pt="md">
          <Stack gap="md">
            <FloatingSelect
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
              alwaysFloatLabel
            />

            <FloatingTextarea label="Perfil de Comunicação" minRows={2} value={form.communicationProfile} onChange={(e) => setTeaField('communicationProfile', e.currentTarget.value)} />
            <FloatingTextarea label="Perfil Sensorial" minRows={2} value={form.sensoryProfile} onChange={(e) => setTeaField('sensoryProfile', e.currentTarget.value)} />
            <FloatingTextarea label="Comportamentos Observados" minRows={2} value={form.behaviorNotes} onChange={(e) => setTeaField('behaviorNotes', e.currentTarget.value)} />
            <FloatingInput label="Comorbidades (separadas por vírgula)" value={form.comorbiditiesInput} onChange={(e) => setTeaField('comorbiditiesInput', e.currentTarget.value)} alwaysFloatLabel />
            <FloatingTextarea label="Objetivos Terapêuticos" minRows={2} value={form.therapeuticGoals} onChange={(e) => setTeaField('therapeuticGoals', e.currentTarget.value)} />
            <FloatingTextarea label="Orientações para Família" minRows={2} value={form.familyGuidance} onChange={(e) => setTeaField('familyGuidance', e.currentTarget.value)} />
            <FloatingTextarea label="Anotações Escola" minRows={2} value={form.schoolNotes} onChange={(e) => setTeaField('schoolNotes', e.currentTarget.value)} />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCadastroTab('patient')}>Cancelar</Button>
              <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving || !profileTeaEnabled}>
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
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} maw={1400} mx="auto" w="100%">
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
                  <Text size="xs" c="dimmed" mb="xs">Submódulos TEA</Text>
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
        <Stack gap="md" p="md" bg={cardBg} style={{ border: `1px solid ${cardBorder}`, borderRadius: 12, ...formStyles }}>
          {activeSubmodule === 'cadastro' ? (
            <>
              <Group justify="space-between" align="center" wrap="wrap">
                <Box>
                  <Text fw={700}>Vincular Paciente</Text>
                  <Text size="sm" c="dimmed">Converta um paciente base para o fluxo TEA em um modal guiado.</Text>
                </Box>
                <Button bg={DARK_BLUE} leftSection={<Plus size={16} />} onClick={() => setCadastroModalOpened(true)}>
                  Vincular paciente
                </Button>
              </Group>
              {cadastroModal}
            </>
          ) : activeSubmodule === 'pacientes' ? (
            <>
              <Group justify="space-between" align="center" wrap="wrap">
                <Box>
                  <Text fw={700}>Pacientes TEA</Text>
                  <Text size="sm" c="dimmed">Lista e edição dos pacientes vinculados ao módulo TEA.</Text>
                </Box>
              </Group>

              <FloatingInput
                label="Buscar paciente"
                rightSection={<Search size={14} />}
                value={teaSearch}
                onChange={(e) => setTeaSearch(e.currentTarget.value)}
                placeholder="Nome ou CPF"
                alwaysFloatLabel
                containerProps={{ maw: isMobile ? '100%' : 360 }}
              />

                  {teaLoading ? (
                <Stack gap="xs">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Paper key={index} p="sm" withBorder radius="md">
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Box style={{ flex: 1 }}>
                          <Skeleton height={16} width="28%" mb={8} radius="xl" />
                          <Skeleton height={12} width="42%" radius="xl" />
                        </Box>
                        <Group gap="xs" wrap="nowrap">
                          <Skeleton height={32} width={32} radius="md" />
                          <Skeleton height={32} width={32} radius="md" />
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              ) : teaItems.length === 0 ? (
                <Paper withBorder radius="md" p="xl">
                  <Stack gap={6} align="center">
                    <Text fw={600}>Nenhum paciente TEA encontrado</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Ajuste a busca ou vincule um novo paciente ao módulo TEA.
                    </Text>
                  </Stack>
                </Paper>
              ) : (
                <Stack gap="xs">
                  {teaItems.map((item) => (
                    <Paper key={item.id} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                      <Group justify="space-between" align={isMobile ? 'flex-start' : 'center'} wrap={isMobile ? 'wrap' : 'nowrap'}>
                        <Box style={{ flex: 1 }}>
                          <Text fw={600}>{item.patientName || 'Paciente sem nome'}</Text>
                          <Group gap={8} mt={4} wrap="wrap">
                            <Text size="xs" c="dimmed">
                              {item.patientCpf ? formatCPF(item.patientCpf) : 'CPF não informado'}
                            </Text>
                            {item.supportLevel ? (
                              <Badge variant="light" color="indigo" size="sm">{item.supportLevel}</Badge>
                            ) : null}
                            <Badge variant="light" color={item.isActive ? 'green' : 'gray'} size="sm">
                              {item.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </Group>
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
                    <Stack gap="xs" py="xs">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <Paper key={index} p="sm" withBorder radius="md">
                          <Skeleton height={16} width="28%" mb={10} radius="xl" />
                          <Skeleton height={12} width="52%" mb={8} radius="xl" />
                          <Skeleton height={10} width="72%" radius="xl" />
                        </Paper>
                      ))}
                    </Stack>
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
              </Group>

              <FloatingSelect
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

                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" verticalSpacing="md">
                    <FloatingInput
                      label="Título"
                      value={planForm.title}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setPlanField('title', value);
                      }}
                    />
                    <FloatingSelect
                      label="Prioridade"
                      value={planForm.priority}
                      onChange={(value) => setPlanForm((prev) => ({ ...prev, priority: value || 'Média' }))}
                      data={[
                        { value: 'Baixa', label: 'Baixa' },
                        { value: 'Média', label: 'Média' },
                        { value: 'Alta', label: 'Alta' },
                      ]}
                    />
                    <FloatingSelect
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
                    <FloatingSelect
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
                    <FloatingDateInput
                      label="Prazo alvo"
                      value={planForm.targetDate}
                      onChange={(value) => setPlanForm((prev) => ({ ...prev, targetDate: value || null }))}
                      valueFormat="DD/MM/YYYY"
                      locale="pt-br"
                    />
                  </SimpleGrid>

                  <FloatingTextarea
                    label="Objetivo clínico"
                    minRows={2}
                    value={planForm.objective}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setPlanField('objective', value);
                    }}
                  />

                  <FloatingTextarea
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
