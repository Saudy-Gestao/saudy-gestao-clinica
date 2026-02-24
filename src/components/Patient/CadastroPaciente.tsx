import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Select,
  Textarea,
  TextInput,
  Switch,
  SimpleGrid,
  Stack,
  Paper,
  Title,
  Popover,
  ActionIcon,
  Modal,
  Center,
  Tabs,
  Table,
  Loader,
  Badge
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Calendar as CalendarIcon, Eye, Pencil, Trash } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { DatePicker } from '@mantine/dates';
import { onlyDigits, formatCPF, formatCEP, formatPhone, formatDateInput } from '../../utils/formatters';
import patientService from '../../services/patientService';
import insuranceService from '../../services/insuranceService';
import ResultModal from '../common/ResultModal';

type Gender = 'male' | 'female' | 'other' | '';
type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | '';

type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';

type ApiRecord = Record<string, unknown>;

type ApiError = {
  response?: {
    data?: {
      message?: string;
      fields?: Record<string, string>;
      details?: string;
      error?: string;
    };
  };
  message?: string;
};

const isRecord = (value: unknown): value is ApiRecord => typeof value === 'object' && value !== null;

const getString = (value: unknown) => (typeof value === 'string' ? value : value == null ? '' : String(value));

const getDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const getBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;
  return Boolean(value);
};

const getApiList = (response: unknown): ApiRecord[] => {
  if (Array.isArray(response)) return response as ApiRecord[];
  const record = isRecord(response) ? response : {};
  const keys = ['patients', 'items', 'results'];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value as ApiRecord[];
  }
  const nested = record.data;
  if (Array.isArray(nested)) return nested as ApiRecord[];
  const nestedRecord = isRecord(nested) ? nested : {};
  for (const key of keys) {
    const value = nestedRecord[key];
    if (Array.isArray(value)) return value as ApiRecord[];
  }
  return [];
};

interface PatientForm {
  name: string;
  email: string;
  phone: string;
  cellphone: string;
  birthDate: Date | null;
  gender: Gender;
  cpf: string;
  rg: string;
  maritalStatus: MaritalStatus;
  occupation: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  hasGuardian: boolean;
  guardianName: string;
  guardianCpf: string;
  guardianPhone: string;
  guardianRelationship: string;
  hasHealthInsurance: boolean;
  healthInsuranceName: string;
  healthInsuranceNumber: string;
  healthInsuranceExpiry: Date | null;
  bloodType: BloodType;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  observations: string;
  isActive: boolean;
}

interface PatientListItem {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  insuranceName: string;
  raw: ApiRecord;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={5} fw={600} c="var(--mantine-color-text)" mb="sm" mt="md">
      {children}
    </Title>
  );
}

export function CadastroPaciente() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  // Ensure the page starts at the top (header) when this route/component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [datePopoverOpened, setDatePopoverOpened] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedName, setLastCreatedName] = useState<string | null>(null);

  // Error modal
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [healthInsuranceInput, setHealthInsuranceInput] = useState('');
  const [, setHealthInsurancePopover] = useState(false);
  const [insuranceOptions, setInsuranceOptions] = useState<{ value: string; label: string }[]>([]);
  const [insurancesLoading, setInsurancesLoading] = useState(false);

  // Inputs temporários para campos que representam arrays — mantêm texto livre durante a digitação
  const [allergiesInput, setAllergiesInput] = useState('');
  const [chronicInput, setChronicInput] = useState('');
  const [medsInput, setMedsInput] = useState('');

  const INITIAL_PATIENT_FORM: PatientForm = {
    name: '',
    email: '',
    phone: '',
    cellphone: '',
    birthDate: null,
    gender: '',
    cpf: '',
    rg: '',
    maritalStatus: '',
    occupation: '',
    address: '',
    addressNumber: '',
    addressComplement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    hasGuardian: false,
    guardianName: '',
    guardianCpf: '',
    guardianPhone: '',
    guardianRelationship: '',
    hasHealthInsurance: false,
    healthInsuranceName: '',
    healthInsuranceNumber: '',
    healthInsuranceExpiry: null,
    bloodType: '',
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    observations: '',
    isActive: true,
  };

  const [form, setForm] = useState<PatientForm>({ ...INITIAL_PATIENT_FORM });
  const [activeTab, setActiveTab] = useState('cadastro');
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Sincroniza os inputs temporários com os arrays do form
  useEffect(() => {
    setAllergiesInput(form.allergies.join(', '));
  }, [form.allergies]);

  useEffect(() => {
    setChronicInput(form.chronicConditions.join(', '));
  }, [form.chronicConditions]);

  useEffect(() => {
    setMedsInput(form.currentMedications.join(', '));
  }, [form.currentMedications]);

  useEffect(() => setBirthDateInput(formatDate(form.birthDate)), [form.birthDate]);
  useEffect(() => setHealthInsuranceInput(formatDate(form.healthInsuranceExpiry)), [form.healthInsuranceExpiry]);

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((item) => item.name.toLowerCase().includes(q));
  }, [patients, patientQuery]);

  const isEditing = Boolean(editingPatientId);

  const mapEnumToBloodType = (value?: string | null): BloodType => {
    const map: Record<string, BloodType> = {
      A_POSITIVE: 'A+',
      A_NEGATIVE: 'A-',
      B_POSITIVE: 'B+',
      B_NEGATIVE: 'B-',
      AB_POSITIVE: 'AB+',
      AB_NEGATIVE: 'AB-',
      O_POSITIVE: 'O+',
      O_NEGATIVE: 'O-'
    };
    if (!value) return '';
    return map[value] || '';
  };

  const populateFormFromPatient = (raw: ApiRecord) => {
    const birthDate = getDate(raw.birthDate);
    const insuranceExpiry = getDate(raw.healthInsuranceExpiry);
    const allergies = Array.isArray(raw.allergies)
      ? (raw.allergies as unknown[]).map((item) => getString(item)).filter(Boolean)
      : [];
    const chronicConditions = Array.isArray(raw.chronicConditions)
      ? (raw.chronicConditions as unknown[]).map((item) => getString(item)).filter(Boolean)
      : [];
    const currentMedications = Array.isArray(raw.currentMedications)
      ? (raw.currentMedications as unknown[]).map((item) => getString(item)).filter(Boolean)
      : [];
    const rawBloodType = typeof raw.bloodType === 'string' ? raw.bloodType : null;
    setForm({
      name: getString(raw.name ?? raw.nome),
      email: getString(raw.email),
      phone: getString(raw.phone),
      cellphone: getString(raw.cellphone),
      birthDate,
      gender: (raw?.gender ? String(raw.gender).toLowerCase() : '') as Gender,
      cpf: getString(raw.cpf),
      rg: getString(raw.rg),
      maritalStatus: (raw?.maritalStatus ? String(raw.maritalStatus).toLowerCase() : '') as MaritalStatus,
      occupation: getString(raw.occupation),
      address: getString(raw.address),
      addressNumber: getString(raw.addressNumber),
      addressComplement: getString(raw.addressComplement),
      neighborhood: getString(raw.neighborhood),
      city: getString(raw.city),
      state: getString(raw.state),
      zipCode: getString(raw.zipCode),
      emergencyContactName: getString(raw.emergencyContactName),
      emergencyContactPhone: getString(raw.emergencyContactPhone),
      emergencyContactRelationship: getString(raw.emergencyContactRelationship),
      hasGuardian: getBoolean(raw.hasGuardian),
      guardianName: getString(raw.guardianName),
      guardianCpf: getString(raw.guardianCpf),
      guardianPhone: getString(raw.guardianPhone),
      guardianRelationship: getString(raw.guardianRelationship),
      hasHealthInsurance: getBoolean(raw.hasHealthInsurance),
      healthInsuranceName: getString(raw.healthInsuranceName),
      healthInsuranceNumber: getString(raw.healthInsuranceNumber),
      healthInsuranceExpiry: insuranceExpiry,
      bloodType: mapEnumToBloodType(rawBloodType),
      allergies,
      chronicConditions,
      currentMedications,
      observations: getString(raw.observations),
      isActive: getBoolean(raw.isActive, true),
    });
  };

  const formatDetailValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
    return String(value);
  };

  const formatDateValue = (value: unknown) => {
    const date = getDate(value);
    if (!date) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  const formatCpfValue = (value: unknown) => {
    if (!value) return '-';
    return formatCPF(String(value));
  };

  const formatPhoneValue = (value: unknown) => {
    if (!value) return '-';
    return formatPhone(String(value));
  };

  const formatGenderValue = (value: unknown) => {
    const normalized = String(value || '').toUpperCase();
    if (!normalized) return '-';
    if (normalized === 'MALE') return 'Masculino';
    if (normalized === 'FEMALE') return 'Feminino';
    if (normalized === 'OTHER') return 'Outro';
    return normalized;
  };

  const formatMaritalStatusValue = (value: unknown) => {
    const normalized = String(value || '').toUpperCase();
    if (!normalized) return '-';
    if (normalized === 'SINGLE') return 'Solteiro(a)';
    if (normalized === 'MARRIED') return 'Casado(a)';
    if (normalized === 'DIVORCED') return 'Divorciado(a)';
    if (normalized === 'WIDOWED') return 'Viúvo(a)';
    if (normalized === 'OTHER') return 'Outro';
    return normalized;
  };

  const formatBloodTypeValue = (value: unknown) => {
    const normalized = String(value || '').toUpperCase();
    if (!normalized) return '-';
    const map: Record<string, string> = {
      A_POSITIVE: 'A+',
      A_NEGATIVE: 'A-',
      B_POSITIVE: 'B+',
      B_NEGATIVE: 'B-',
      AB_POSITIVE: 'AB+',
      AB_NEGATIVE: 'AB-',
      O_POSITIVE: 'O+',
      O_NEGATIVE: 'O-'
    };
    return map[normalized] || normalized;
  };

  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      try {
        const data: unknown = await patientService.listPatients();
        const list = getApiList(data);

        const mapped: PatientListItem[] = list.map((item: ApiRecord, index: number) => {
          const name = String(item.name ?? item.nome ?? item.fullName ?? 'Paciente');
          const phone = String(item.cellphone ?? item.phone ?? '');
          const insuranceName = String(item.healthInsuranceName ?? item.insuranceName ?? item.convenio ?? '');
          return {
            id: String(item.id ?? item.patientId ?? item._id ?? item.uuid ?? index),
            name,
            cpf: String(item.cpf ?? ''),
            phone,
            insuranceName,
            raw: item,
          };
        });

        setPatients(mapped);
      } catch (e: unknown) {
        const err = e as ApiError;
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes',
          color: 'red',
        });
      } finally {
        setPatientsLoading(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    const loadInsurances = async () => {
      setInsurancesLoading(true);
      try {
        const data: unknown = await insuranceService.listInsurances({ isActive: true });
        const list = getApiList(data);

        const options = list
          .map((it: ApiRecord) => {
            const name = String(it.name ?? it.nome ?? '').trim();
            return name ? { value: name, label: name } : null;
          })
          .filter(Boolean) as { value: string; label: string }[];

        setInsuranceOptions(options);
      } catch (e: unknown) {
        const err = e as ApiError;
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar convênios',
          color: 'red',
        });
      } finally {
        setInsurancesLoading(false);
      }
    };

    loadInsurances();
  }, []);

  const statesOptions = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ].map((s) => ({ value: s, label: s }));

  const genderOptions = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Feminino' },
    { value: 'other', label: 'Outro' },
  ];

  const maritalOptions = [
    { value: 'single', label: 'Solteiro(a)' },
    { value: 'married', label: 'Casado(a)' },
    { value: 'divorced', label: 'Divorciado(a)' },
    { value: 'widowed', label: 'Viúvo(a)' },
    { value: 'other', label: 'Outro' },
  ];

  const bloodTypes = [
    { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
  ];

  const validateFields = (data: PatientForm) => {
    const errors: Record<string, string> = {};
    if (!data.name.trim()) errors.name = 'Nome é obrigatório';
    if (!/^\d{11}$/.test(String(data.cpf))) errors.cpf = 'CPF deve conter 11 dígitos numéricos';
    if (!data.birthDate) errors.birthDate = 'Data de nascimento é obrigatória';
    if (data.birthDate && data.birthDate > new Date()) errors.birthDate = 'Data de nascimento inválida';
    // Gênero agora é obrigatório
    if (!data.gender) errors.gender = 'Gênero é obrigatório';
    if (data.hasHealthInsurance && !data.healthInsuranceName.trim()) errors.healthInsuranceName = 'Nome do convênio é obrigatório';

    if (data.email && !/^[\w-.]+@[\w-]+\.[\w-.]+$/.test(String(data.email))) errors.email = 'Email inválido';

    // Celular é obrigatório e deve ter 10 ou 11 dígitos (apenas números)
    if (!data.cellphone) errors.cellphone = 'Celular é obrigatório';
    else if (!/^\d{10,11}$/.test(String(data.cellphone))) errors.cellphone = 'Celular inválido';

    // Valida apenas limites máximos razoáveis
    if (data.phone && data.phone.length > 15) errors.phone = 'Telefone muito longo';
    if (data.cellphone && data.cellphone.length > 15) errors.cellphone = 'Celular muito longo';
    if (data.emergencyContactPhone && data.emergencyContactPhone.length > 15) errors.emergencyContactPhone = 'Telefone de emergência muito longo';
    if (data.guardianCpf && data.guardianCpf.length > 11) errors.guardianCpf = 'CPF do responsável muito longo';
    if (data.guardianPhone && data.guardianPhone.length > 15) errors.guardianPhone = 'Telefone do responsável muito longo';
    if (data.zipCode && data.zipCode.length > 8) errors.zipCode = 'CEP muito longo';

    return errors;
  };

  const parseDate = (s: string) => {
    if (!s) return null;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return date;
  }; 

  const handleSave = async () => {
    // clear previous field errors
    setFieldErrors({});

    // run field-level validation
    const fErrors = validateFields(form);
    if (Object.keys(fErrors).length) {
      setFieldErrors(fErrors);
      showNotification({ title: 'Erro', message: Object.values(fErrors)[0], color: 'red' });
      return;
    }

    setSaving(true);
    try {
      // Converte tipo sanguíneo para o formato enum do backend
      const bloodTypeMap: Record<string, string> = {
        'A+': 'A_POSITIVE',
        'A-': 'A_NEGATIVE',
        'B+': 'B_POSITIVE',
        'B-': 'B_NEGATIVE',
        'AB+': 'AB_POSITIVE',
        'AB-': 'AB_NEGATIVE',
        'O+': 'O_POSITIVE',
        'O-': 'O_NEGATIVE',
      };

      const payload = {
        name: form.name.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone || undefined,
        cellphone: form.cellphone || undefined,
        birthDate: form.birthDate ? form.birthDate.toISOString().slice(0,10) : undefined,
        gender: form.gender ? form.gender.toUpperCase() : undefined,
        cpf: form.cpf,
        rg: form.rg?.trim() || undefined,
        maritalStatus: form.maritalStatus ? form.maritalStatus.toUpperCase() : undefined,
        occupation: form.occupation || undefined,
        address: form.address || undefined,
        addressNumber: form.addressNumber || undefined,
        addressComplement: form.addressComplement || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        emergencyContactRelationship: form.emergencyContactRelationship || undefined,
        hasGuardian: !!form.hasGuardian,
        guardianName: form.guardianName || undefined,
        guardianCpf: form.guardianCpf || undefined,
        guardianPhone: form.guardianPhone || undefined,
        guardianRelationship: form.guardianRelationship || undefined,
        hasHealthInsurance: !!form.hasHealthInsurance,
        healthInsuranceName: form.healthInsuranceName || undefined,
        healthInsuranceNumber: form.healthInsuranceNumber || undefined,
        healthInsuranceExpiry: form.healthInsuranceExpiry ? form.healthInsuranceExpiry.toISOString().slice(0,10) : undefined,
        bloodType: form.bloodType ? bloodTypeMap[form.bloodType] : undefined,
        allergies: form.allergies || [],
        chronicConditions: form.chronicConditions || [],
        currentMedications: form.currentMedications || [],
        observations: form.observations || undefined,
      };

      if (editingPatientId) {
        await patientService.updatePatient(editingPatientId, payload);
        setEditingPatientId(null);
        setForm({ ...INITIAL_PATIENT_FORM });
        setFieldErrors({});
        setActiveTab('lista');
        showNotification({ title: 'Paciente atualizado', message: 'Dados atualizados com sucesso.', color: 'green' });
      } else {
        await patientService.createPatient(payload);

        setLastCreatedName(payload.name);
        setFieldErrors({});
        setShowSuccessModal(true);
      }
      try {
        const refreshed: unknown = await patientService.listPatients();
        const list = getApiList(refreshed);

        const mapped: PatientListItem[] = list.map((item: ApiRecord, index: number) => {
          const name = String(item.name ?? item.nome ?? item.fullName ?? 'Paciente');
          const phone = String(item.cellphone ?? item.phone ?? '');
          const insuranceName = String(item.healthInsuranceName ?? item.insuranceName ?? item.convenio ?? '');
          return {
            id: String(item.id ?? item.patientId ?? item._id ?? item.uuid ?? index),
            name,
            cpf: String(item.cpf ?? ''),
            phone,
            insuranceName,
            raw: item,
          };
        });

        setPatients(mapped);
      } catch {
        // Silent refresh failure after save.
      }
    } catch (e: unknown) {
      const err = e as ApiError;
      // handle field-level errors returned by server
      const serverFields: Record<string,string> | undefined = err?.response?.data?.fields;
      if (serverFields && typeof serverFields === 'object') {
        setFieldErrors(serverFields);
        showNotification({ title: 'Erro', message: Object.values(serverFields)[0], color: 'red' });
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Erro ao registrar paciente';
        setErrorMessage(msg);
        setShowErrorModal(true);
        showNotification({ title: 'Erro', message: msg, color: 'red' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (editingPatientId) {
      setEditingPatientId(null);
      setForm({ ...INITIAL_PATIENT_FORM });
      setActiveTab('cadastro');
      return;
    }
    navigate('/dashboard');
  };

  const handleDeletePatient = async (item: PatientListItem) => {
    const name = item.name || 'este paciente';
    if (!window.confirm(`Tem certeza que deseja excluir ${name}?`)) {
      return;
    }

    try {
      await patientService.deletePatient(item.id);
      setPatients((prev) => prev.filter((p) => p.id !== item.id));
      showNotification({ title: 'Paciente excluído', message: 'Registro removido com sucesso.', color: 'green' });
    } catch (e: unknown) {
      const err = e as ApiError;
      const msg = err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Erro ao excluir paciente';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1000} mx="auto">
        {/* Header */}
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>

            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Cadastro de Paciente
              </Text>
              <Text size="sm" c="dimmed">
                Registro de pacientes
              </Text>
            </Box>
          </Group>

        </Group>
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'cadastro')} keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="cadastro">Cadastrar</Tabs.Tab>
            <Tabs.Tab value="lista">Cadastrados</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="cadastro" pt="md">
            <Stack gap="md">
              {isEditing && (
                <Text size="sm" c="dimmed">
                  Editando paciente. Ajuste os dados e salve as alteracoes.
                </Text>
              )}
              <Paper p="md" withBorder radius="md">
                <SectionTitle>Dados Pessoais</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <TextInput label="Nome completo" value={form.name} onChange={(e) => { setForm({ ...form, name: e.currentTarget.value }); clearFieldError('name'); }} error={fieldErrors.name} required />
                  <TextInput label="CPF" value={formatCPF(form.cpf)} onChange={(e) => { setForm({ ...form, cpf: onlyDigits(e.currentTarget.value) }); clearFieldError('cpf'); }} maxLength={14} required error={fieldErrors.cpf} />
                  <TextInput label="RG" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.currentTarget.value })} />

                  <Popover opened={datePopoverOpened} onClose={() => setDatePopoverOpened(false)} position="bottom-start" withArrow>
                    <Popover.Target>
                      <TextInput
                        label="Data de nascimento"
                        placeholder="dd/mm/aaaa"
                        value={birthDateInput}
                        onChange={(e) => setBirthDateInput(formatDateInput(e.currentTarget.value))}
                        onBlur={() => {
                          if (!birthDateInput) {
                            setForm({ ...form, birthDate: null });
                            clearFieldError('birthDate');
                            return;
                          }
                          const d = parseDate(birthDateInput);
                          if (!d) {
                            setFieldErrors((p) => ({ ...p, birthDate: 'Data de nascimento inválida' }));
                            showNotification({ title: 'Erro', message: 'Data de nascimento inválida', color: 'red' });
                            setForm({ ...form, birthDate: null });
                          } else {
                            clearFieldError('birthDate');
                            setForm({ ...form, birthDate: d });
                          }
                        }}
                        required
                        rightSection={
                          <ActionIcon size="sm" variant="subtle" onClick={() => setDatePopoverOpened((o) => !o)}>
                            <CalendarIcon size={16} />
                          </ActionIcon>
                        }
                        onClick={() => setDatePopoverOpened(true)}
                        style={{ cursor: 'text' }}
                      />
                    </Popover.Target>
                    <Popover.Dropdown>
                      <DatePicker
                        value={form.birthDate}
                        onChange={(d) => {
                          setForm({ ...form, birthDate: d });
                          setBirthDateInput(formatDate(d));
                          setDatePopoverOpened(false);
                        }}
                        maxDate={new Date()}
                      />
                    </Popover.Dropdown>
                  </Popover>

                  <Select
                    label="Gênero"
                    placeholder="Selecione"
                    data={genderOptions}
                    value={form.gender}
                    onChange={(v) => { setForm({ ...form, gender: (v as Gender) || '' }); clearFieldError('gender'); }}
                    error={fieldErrors.gender}
                    required
                  />

                  <Select
                    label="Estado civil"
                    placeholder="Selecione"
                    data={maritalOptions}
                    value={form.maritalStatus}
                    onChange={(v) => setForm({ ...form, maritalStatus: (v as MaritalStatus) || '' })}
                  />

                  <TextInput label="Ocupação/Profissão" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.currentTarget.value })} />

                  <TextInput label="Email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.currentTarget.value }); clearFieldError('email'); }} error={fieldErrors.email} />
                  <TextInput label="Telefone" value={formatPhone(form.phone)} onChange={(e) => { setForm({ ...form, phone: onlyDigits(e.currentTarget.value) }); clearFieldError('phone'); }} error={fieldErrors.phone} />
                  <TextInput label="Celular" value={formatPhone(form.cellphone)} onChange={(e) => { setForm({ ...form, cellphone: onlyDigits(e.currentTarget.value) }); clearFieldError('cellphone'); }} error={fieldErrors.cellphone} required />
                </SimpleGrid>
              </Paper>

              <Paper p="md" withBorder radius="md">
                <SectionTitle>Contato de Emergência / Responsáveis</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <TextInput label="Nome contato" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.currentTarget.value })} />
                  <TextInput label="Telefone contato" value={formatPhone(form.emergencyContactPhone)} onChange={(e) => { setForm({ ...form, emergencyContactPhone: onlyDigits(e.currentTarget.value) }); clearFieldError('emergencyContactPhone'); }} error={fieldErrors.emergencyContactPhone} />
                  <TextInput label="Parentesco" value={form.emergencyContactRelationship} onChange={(e) => setForm({ ...form, emergencyContactRelationship: e.currentTarget.value })} />
                </SimpleGrid>

                <Group align="center" mt="md" mb="sm" gap="sm">
                  <Switch label="Possui responsável legal" checked={form.hasGuardian} onChange={(e) => setForm({ ...form, hasGuardian: e.currentTarget.checked })} />
                  <Text size="sm" c="dimmed">Preencha os dados do responsável, se aplicável.</Text>
                </Group>

                {form.hasGuardian && (
                  <Box style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 12 }}>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                      <TextInput label="Nome do responsável" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.currentTarget.value })} />
                      <TextInput label="CPF do responsável" value={formatCPF(form.guardianCpf)} onChange={(e) => { setForm({ ...form, guardianCpf: onlyDigits(e.currentTarget.value) }); clearFieldError('guardianCpf'); }} maxLength={14} error={fieldErrors.guardianCpf} />
                      <TextInput label="Telefone do responsável" value={formatPhone(form.guardianPhone)} onChange={(e) => { setForm({ ...form, guardianPhone: onlyDigits(e.currentTarget.value) }); clearFieldError('guardianPhone'); }} maxLength={15} error={fieldErrors.guardianPhone} />
                      <TextInput label="Parentesco" value={form.guardianRelationship} onChange={(e) => setForm({ ...form, guardianRelationship: e.currentTarget.value })} />
                    </SimpleGrid>
                  </Box>
                )}
              </Paper>

              <Paper p="md" withBorder radius="md">
                <SectionTitle>Convênio</SectionTitle>

                <Group align="center" mt="md" mb="sm">
                  <Switch
                    label="Possui convênio"
                    checked={form.hasHealthInsurance}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setForm({
                        ...form,
                        hasHealthInsurance: checked,
                        healthInsuranceName: checked ? form.healthInsuranceName : '',
                        healthInsuranceNumber: checked ? form.healthInsuranceNumber : '',
                        healthInsuranceExpiry: checked ? form.healthInsuranceExpiry : null,
                      });
                    }}
                  />
                </Group>

                {form.hasHealthInsurance && (
                  <Box style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 12 }}>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                      <Select
                        label="Convênio"
                        placeholder={insurancesLoading ? 'Carregando convênios...' : 'Selecione um convênio'}
                        data={insuranceOptions}
                        value={form.healthInsuranceName}
                        onChange={(value) => { setForm({ ...form, healthInsuranceName: value || '' }); clearFieldError('healthInsuranceName'); }}
                        searchable
                        clearable
                        disabled={insurancesLoading}
                        nothingFoundMessage="Nenhum convênio encontrado"
                        error={fieldErrors.healthInsuranceName}
                      />
                      <TextInput label="Número do convênio" value={form.healthInsuranceNumber} onChange={(e) => setForm({ ...form, healthInsuranceNumber: e.currentTarget.value })} />

                      <Popover position="bottom-start" withArrow>
                        <Popover.Target>
                          <TextInput
                            label="Validade"
                            placeholder="dd/mm/aaaa"
                            value={healthInsuranceInput}
                            onChange={(e) => setHealthInsuranceInput(formatDateInput(e.currentTarget.value))}
                            onBlur={() => {
                              if (!healthInsuranceInput) {
                                setForm({ ...form, healthInsuranceExpiry: null });
                                return;
                              }
                              const m = healthInsuranceInput.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                              if (!m) {
                                showNotification({ title: 'Erro', message: 'Validade do convênio inválida', color: 'red' });
                                setForm({ ...form, healthInsuranceExpiry: null });
                              } else {
                                const day = Number(m[1]);
                                const month = Number(m[2]) - 1;
                                const year = Number(m[3]);
                                const date = new Date(year, month, day);
                                if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
                                  showNotification({ title: 'Erro', message: 'Validade do convênio inválida', color: 'red' });
                                  setForm({ ...form, healthInsuranceExpiry: null });
                                } else {
                                  setForm({ ...form, healthInsuranceExpiry: date });
                                }
                              }
                            }}
                            rightSection={<ActionIcon size="sm" variant="subtle" onClick={() => setHealthInsurancePopover((s) => !s)}><CalendarIcon size={16} /></ActionIcon>}
                            onClick={() => setHealthInsurancePopover(true)}
                            style={{ cursor: 'text' }}
                          />
                        </Popover.Target>
                        <Popover.Dropdown>
                          <DatePicker value={form.healthInsuranceExpiry} onChange={(d) => setForm({ ...form, healthInsuranceExpiry: d })} />
                        </Popover.Dropdown>
                      </Popover>
                    </SimpleGrid>
                  </Box>
                )}
              </Paper>

              <Paper p="md" withBorder radius="md">
                <SectionTitle>Saúde</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <Select label="Tipo sanguíneo" placeholder="Selecione" data={bloodTypes} value={form.bloodType} onChange={(v) => setForm({ ...form, bloodType: (v as BloodType) || '' })} />

                  <TextInput
                    label="Alergias"
                    placeholder="Separe por vírgula"
                    value={allergiesInput}
                    onChange={(e) => setAllergiesInput(e.currentTarget.value)}
                    onBlur={() => setForm({ ...form, allergies: allergiesInput.split(',').map(s => s.trim()).filter(Boolean) })}
                  />

                  <TextInput
                    label="Doenças crônicas"
                    placeholder="Separe por vírgula"
                    value={chronicInput}
                    onChange={(e) => setChronicInput(e.currentTarget.value)}
                    onBlur={() => setForm({ ...form, chronicConditions: chronicInput.split(',').map(s => s.trim()).filter(Boolean) })}
                  />

                  <TextInput
                    label="Medicamentos em uso"
                    placeholder="Separe por vírgula"
                    value={medsInput}
                    onChange={(e) => setMedsInput(e.currentTarget.value)}
                    onBlur={() => setForm({ ...form, currentMedications: medsInput.split(',').map(s => s.trim()).filter(Boolean) })}
                  />
                </SimpleGrid>
                <Textarea label="Observações" placeholder="Observações clínicas" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.currentTarget.value })} minRows={3} mt="md" />
              </Paper>

              <Paper p="md" withBorder radius="md">
                <SectionTitle>Endereço</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                  <TextInput label="CEP" value={formatCEP(form.zipCode)} onChange={(e) => { setForm({ ...form, zipCode: onlyDigits(e.currentTarget.value) }); clearFieldError('zipCode'); }} maxLength={9} error={fieldErrors.zipCode} />
                  <TextInput label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} />
                  <TextInput label="Número" value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.currentTarget.value })} />
                  <TextInput label="Complemento" value={form.addressComplement} onChange={(e) => setForm({ ...form, addressComplement: e.currentTarget.value })} />

                  <TextInput label="Bairro" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.currentTarget.value })} />
                  <TextInput label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.currentTarget.value })} />
                  <Select label="Estado" data={statesOptions} value={form.state} onChange={(v) => setForm({ ...form, state: v || '' })} />
                </SimpleGrid>
              </Paper>

              <Group justify="right">
                <Button variant="default" onClick={handleCancel}>Cancelar</Button>
                <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving} size="md" c="white">
                  {isEditing ? 'Salvar alteracoes' : 'Salvar'}
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="lista" pt="md">
            <Paper p="md" withBorder radius="md">
              <Group justify="space-between" mb="md" wrap="wrap">
                <SectionTitle>Pacientes cadastrados</SectionTitle>
                <TextInput
                  placeholder="Buscar por nome"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.currentTarget.value)}
                  w={isMobile ? '100%' : 280}
                />
              </Group>

              {patientsLoading ? (
                <Center style={{ padding: 16, gap: 8 }}>
                  <Loader size={18} />
                  <Text size="sm">Carregando pacientes...</Text>
                </Center>
              ) : (
                <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                  <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                    <Table.Thead>
                      <Table.Tr style={{ borderBottom: 'none' }}>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                        {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>CPF</Table.Th>}
                        {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Contato</Table.Th>}
                        {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>}
                        {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Ações</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredPatients.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={6}>
                            <Text size="sm" c="dimmed" ta="center">Nenhum paciente encontrado</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        filteredPatients.map((item) => (
                          <Table.Tr key={item.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                            <Table.Td>
                              <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.name}</Text>
                            </Table.Td>
                            {!isTablet && (
                              <Table.Td>
                                <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.cpf ? formatCPF(item.cpf) : '-'}</Text>
                              </Table.Td>
                            )}
                            {!isTablet && (
                              <Table.Td>
                                <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.phone ? formatPhone(item.phone) : '-'}</Text>
                              </Table.Td>
                            )}
                            {!isTablet && (
                              <Table.Td>
                                <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.insuranceName || '-'}</Text>
                              </Table.Td>
                            )}
                            {!isTablet && (
                              <Table.Td>
                                <Badge
                                  color={item.raw?.isActive ? 'green' : 'red'}
                                  variant="light"
                                  size="sm"
                                >
                                  {item.raw?.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </Table.Td>
                            )}
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <ActionIcon
                                  variant="subtle"
                                  style={{ color: 'var(--mantine-color-text)' }}
                                  onClick={() => {
                                    setSelectedPatient(item);
                                    setDetailsOpen(true);
                                  }}
                                >
                                  <Eye size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  style={{ color: 'var(--mantine-color-text)' }}
                                  onClick={() => {
                                    setSelectedPatient(item);
                                    setEditingPatientId(item.id);
                                    populateFormFromPatient(item.raw);
                                    setActiveTab('cadastro');
                                  }}
                                >
                                  <Pencil size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => handleDeletePatient(item)}
                                >
                                  <Trash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </Box>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>

        <Modal
          opened={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          title="Detalhes do paciente"
          centered
          size="lg"
        >
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Text size="sm"><Text fw={600} span>Nome:</Text> {formatDetailValue(selectedPatient?.raw?.name || selectedPatient?.raw?.nome)}</Text>
              <Text size="sm"><Text fw={600} span>CPF:</Text> {formatCpfValue(selectedPatient?.raw?.cpf)}</Text>
              <Text size="sm"><Text fw={600} span>Email:</Text> {formatDetailValue(selectedPatient?.raw?.email)}</Text>
              <Text size="sm"><Text fw={600} span>Telefone:</Text> {formatPhoneValue(selectedPatient?.raw?.phone)}</Text>
              <Text size="sm"><Text fw={600} span>Celular:</Text> {formatPhoneValue(selectedPatient?.raw?.cellphone)}</Text>
              <Text size="sm"><Text fw={600} span>Nascimento:</Text> {formatDateValue(selectedPatient?.raw?.birthDate)}</Text>
              <Text size="sm"><Text fw={600} span>Gênero:</Text> {formatGenderValue(selectedPatient?.raw?.gender)}</Text>
              <Text size="sm"><Text fw={600} span>RG:</Text> {formatDetailValue(selectedPatient?.raw?.rg)}</Text>
              <Text size="sm"><Text fw={600} span>Estado civil:</Text> {formatMaritalStatusValue(selectedPatient?.raw?.maritalStatus)}</Text>
              <Text size="sm"><Text fw={600} span>Profissão:</Text> {formatDetailValue(selectedPatient?.raw?.occupation)}</Text>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Text size="sm"><Text fw={600} span>Convênio:</Text> {formatDetailValue(selectedPatient?.raw?.healthInsuranceName)}</Text>
              <Text size="sm"><Text fw={600} span>Número convênio:</Text> {formatDetailValue(selectedPatient?.raw?.healthInsuranceNumber)}</Text>
              <Text size="sm"><Text fw={600} span>Validade convênio:</Text> {formatDateValue(selectedPatient?.raw?.healthInsuranceExpiry)}</Text>
              <Text size="sm"><Text fw={600} span>Tipo sanguíneo:</Text> {formatBloodTypeValue(selectedPatient?.raw?.bloodType)}</Text>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Text size="sm"><Text fw={600} span>Endereço:</Text> {formatDetailValue(selectedPatient?.raw?.address)}</Text>
              <Text size="sm"><Text fw={600} span>Número:</Text> {formatDetailValue(selectedPatient?.raw?.addressNumber)}</Text>
              <Text size="sm"><Text fw={600} span>Complemento:</Text> {formatDetailValue(selectedPatient?.raw?.addressComplement)}</Text>
              <Text size="sm"><Text fw={600} span>Bairro:</Text> {formatDetailValue(selectedPatient?.raw?.neighborhood)}</Text>
              <Text size="sm"><Text fw={600} span>Cidade:</Text> {formatDetailValue(selectedPatient?.raw?.city)}</Text>
              <Text size="sm"><Text fw={600} span>Estado:</Text> {formatDetailValue(selectedPatient?.raw?.state)}</Text>
              <Text size="sm"><Text fw={600} span>CEP:</Text> {selectedPatient?.raw?.zipCode ? formatCEP(String(selectedPatient?.raw?.zipCode)) : '-'}</Text>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Text size="sm"><Text fw={600} span>Contato emergência:</Text> {formatDetailValue(selectedPatient?.raw?.emergencyContactName)}</Text>
              <Text size="sm"><Text fw={600} span>Telefone emergência:</Text> {formatPhoneValue(selectedPatient?.raw?.emergencyContactPhone)}</Text>
              <Text size="sm"><Text fw={600} span>Parentesco emergência:</Text> {formatDetailValue(selectedPatient?.raw?.emergencyContactRelationship)}</Text>
              <Text size="sm"><Text fw={600} span>Responsável:</Text> {formatDetailValue(selectedPatient?.raw?.guardianName)}</Text>
              <Text size="sm"><Text fw={600} span>CPF responsável:</Text> {formatCpfValue(selectedPatient?.raw?.guardianCpf)}</Text>
              <Text size="sm"><Text fw={600} span>Telefone responsável:</Text> {formatPhoneValue(selectedPatient?.raw?.guardianPhone)}</Text>
              <Text size="sm"><Text fw={600} span>Parentesco responsável:</Text> {formatDetailValue(selectedPatient?.raw?.guardianRelationship)}</Text>
            </SimpleGrid>

            <Text size="sm"><Text fw={600} span>Alergias:</Text> {formatDetailValue(selectedPatient?.raw?.allergies)}</Text>
            <Text size="sm"><Text fw={600} span>Condições crônicas:</Text> {formatDetailValue(selectedPatient?.raw?.chronicConditions)}</Text>
            <Text size="sm"><Text fw={600} span>Medicamentos:</Text> {formatDetailValue(selectedPatient?.raw?.currentMedications)}</Text>
            <Text size="sm"><Text fw={600} span>Observações:</Text> {formatDetailValue(selectedPatient?.raw?.observations)}</Text>
          </Stack>
        </Modal>

        <ResultModal
          opened={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          variant="success"
          title="Paciente cadastrado"
          message={lastCreatedName ? `${lastCreatedName} foi cadastrado com sucesso.` : 'Paciente cadastrado com sucesso.'}
          secondary={{ label: 'Voltar para o dashboard', onClick: () => { setShowSuccessModal(false); navigate('/dashboard'); } }}
          primary={{ label: 'Cadastrar novo', onClick: () => { setForm({ ...INITIAL_PATIENT_FORM }); setShowSuccessModal(false); } }}
        />

        <ResultModal opened={showErrorModal} onClose={() => setShowErrorModal(false)} variant="error" title="Erro ao cadastrar paciente" message={errorMessage || 'Erro ao registrar paciente'} secondary={{ label: 'Fechar', onClick: () => setShowErrorModal(false) }} />
      </Box>
    </Box>
  );
}
