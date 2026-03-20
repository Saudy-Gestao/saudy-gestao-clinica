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
  MultiSelect,
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
import { ChevronLeft, Calendar as CalendarIcon, Eye, Pencil, Trash, Power } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { DatePicker } from '@mantine/dates';
import { onlyDigits, formatCPF, formatCEP, formatPhone, formatDateInput, isValidCPF, isValidEmail, normalizeEmail } from '../../utils/formatters';
import doctorService from '../../services/doctorService';
import cepService from '../../services/cepService';
import ResultModal from '../common/ResultModal';

type Gender = 'male' | 'female' | 'other' | '';

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
  if (typeof value === 'string') {
    const normalized = value.trim();
    const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      const localDate = new Date(year, month, day);
      if (
        localDate.getFullYear() === year
        && localDate.getMonth() === month
        && localDate.getDate() === day
      ) {
        return localDate;
      }
    }
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'number') {
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
  if (Array.isArray(record.items)) return record.items as ApiRecord[];
  const nested = record.data;
  if (Array.isArray(nested)) return nested as ApiRecord[];
  const nestedRecord = isRecord(nested) ? nested : {};
  if (Array.isArray(nestedRecord.items)) return nestedRecord.items as ApiRecord[];
  return [];
};

interface DoctorForm {
  nome: string;
  crm: string;
  crmState: string;
  email: string;
  phone: string;
  cellphone: string;
  birthDate: Date | null;
  gender: Gender;
  cpf: string;
  rg: string;
  specialty: string;
  specialties: string[];
  biography: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isActive: boolean;
  workingSchedules: Array<{
    days: string[];
    hoursStart: string;
    hoursEnd: string;
  }>;
}

interface DoctorListItem {
  id: string;
  name: string;
  crm: string;
  crmState: string;
  specialty: string;
  isActive: boolean;
  raw: ApiRecord;
}

type WorkingSchedule = {
  days: string[];
  hoursStart: string;
  hoursEnd: string;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={5} fw={600} c="var(--mantine-color-text)" mb="sm" mt="md">
      {children}
    </Title>
  );
}

const INITIAL_DOCTOR_FORM: DoctorForm = {
  nome: '',
  crm: '',
  crmState: '',
  email: '',
  phone: '',
  cellphone: '',
  birthDate: null,
  gender: '',
  cpf: '',
  rg: '',
  specialty: '',
  specialties: [],
  biography: '',
  address: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  isActive: true,
  workingSchedules: [],
};

const getWorkingSchedulesFromRaw = (raw: ApiRecord): WorkingSchedule[] => {
  const explicitSchedules = Array.isArray(raw.workingSchedules)
    ? (raw.workingSchedules as unknown[])
        .map((item: unknown) => {
          const scheduleRecord = isRecord(item) ? item : {};
          return {
            days: Array.isArray(scheduleRecord.days)
              ? (scheduleRecord.days as unknown[]).map((d) => getString(d)).filter(Boolean)
              : [],
            hoursStart: getString(scheduleRecord.hoursStart),
            hoursEnd: getString(scheduleRecord.hoursEnd),
          };
        })
        .filter((schedule) => schedule.days.length > 0 || schedule.hoursStart || schedule.hoursEnd)
    : [];

  if (explicitSchedules.length > 0) {
    return explicitSchedules;
  }

  const workingDays = Array.isArray(raw.workingDays)
    ? (raw.workingDays as unknown[]).map((day) => getString(day)).filter(Boolean)
    : [];
  const workingHoursStart = getString(raw.workingHoursStart);
  const workingHoursEnd = getString(raw.workingHoursEnd);

  if (workingDays.length > 0 || workingHoursStart || workingHoursEnd) {
    return [
      {
        days: workingDays,
        hoursStart: workingHoursStart,
        hoursEnd: workingHoursEnd,
      },
    ];
  }

  return [];
};

export function CadastroMedico() {
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

  const formatDateForApi = (d: Date | null) => {
    if (!d) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const [form, setForm] = useState<DoctorForm>({ ...INITIAL_DOCTOR_FORM });
  const [activeTab, setActiveTab] = useState('cadastro');
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorListItem | null>(null);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  const [datePopoverOpened, setDatePopoverOpened] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState('');
  useEffect(() => setBirthDateInput(formatDate(form.birthDate)), [form.birthDate]);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedName, setLastCreatedName] = useState<string | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DoctorListItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [zipLoading, setZipLoading] = useState(false);
  const [lastZipLookup, setLastZipLookup] = useState('');
  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((item) => item.name.toLowerCase().includes(q));
  }, [doctors, doctorQuery]);

  const isEditing = Boolean(editingDoctorId);

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

  const selectedDoctorSchedules = selectedDoctor ? getWorkingSchedulesFromRaw(selectedDoctor.raw) : [];

  const formatGenderValue = (value: unknown) => {
    const normalized = String(value || '').toUpperCase();
    if (!normalized) return '-';
    if (normalized === 'MALE') return 'Masculino';
    if (normalized === 'FEMALE') return 'Feminino';
    if (normalized === 'OTHER') return 'Outro';
    return normalized;
  };

  const populateFormFromDoctor = (raw: ApiRecord) => {
    const birthDate = getDate(raw.birthDate);
    const specialties = Array.isArray(raw.specialties)
      ? (raw.specialties as unknown[]).map((item) => getString(item)).filter(Boolean)
      : [];

    const workingSchedules = getWorkingSchedulesFromRaw(raw);
    setForm({
      nome: getString(raw.name ?? raw.nome),
      crm: getString(raw.crm),
      crmState: getString(raw.crmState ?? raw.ufCrm),
      email: getString(raw.email),
      phone: getString(raw.phone),
      cellphone: getString(raw.cellphone),
      birthDate,
      gender: (raw?.gender ? String(raw.gender).toLowerCase() : '') as Gender,
      cpf: getString(raw.cpf),
      rg: getString(raw.rg),
      specialty: getString(raw.specialty),
      specialties,
      biography: getString(raw.biography),
      address: getString(raw.address),
      addressNumber: getString(raw.addressNumber),
      addressComplement: getString(raw.addressComplement),
      neighborhood: getString(raw.neighborhood),
      city: getString(raw.city),
      state: getString(raw.state),
      zipCode: getString(raw.zipCode),
      isActive: getBoolean(raw.isActive, true),
      workingSchedules,
    });
  };

  useEffect(() => {
    const loadDoctors = async () => {
      setDoctorsLoading(true);
      try {
        const data: unknown = await doctorService.listDoctors();
        const list = getApiList(data);

        const mapped: DoctorListItem[] = list.map((item: ApiRecord) => {
          const name = getString(item.name ?? item.nome ?? item.fullName ?? 'Médico');
          const specialties = Array.isArray(item.specialties) ? (item.specialties as unknown[]) : [];
          return {
            id: String(item.id ?? item.doctorId ?? ''),
            name,
            crm: String(item.crm ?? ''),
            crmState: String(item.crmState ?? item.ufCrm ?? ''),
            specialty: String(item.specialty ?? specialties[0] ?? ''),
            isActive: Boolean(item.isActive ?? item.active ?? true),
            raw: item,
          };
        }).filter((item: DoctorListItem) => item.id);

        setDoctors(mapped);
      } catch (e: unknown) {
        const err = e as ApiError;
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar médicos',
          color: 'red',
        });
      } finally {
        setDoctorsLoading(false);
      }
    };

    loadDoctors();
  }, []);

  const statesOptions = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ].map((s) => ({ value: s, label: s }));

  const specialtyOptions = [
    { value: 'clinico', label: 'Clínico Geral' },
    { value: 'cardiologista', label: 'Cardiologia' },
    { value: 'ortopedista', label: 'Ortopedia' },
    { value: 'ginecologista', label: 'Ginecologia' },
  ];

  const daysOptions = [
    { value: 'Segunda', label: 'Segunda' },
    { value: 'Terca', label: 'Terça' },
    { value: 'Quarta', label: 'Quarta' },
    { value: 'Quinta', label: 'Quinta' },
    { value: 'Sexta', label: 'Sexta' },
    { value: 'Sabado', label: 'Sábado' },
    { value: 'Domingo', label: 'Domingo' },
  ];

  const validateFields = (data: DoctorForm) => {
    const errors: Record<string,string> = {};
    if (!data.nome.trim()) errors.nome = 'Nome é obrigatório';
    if (!data.crm.trim()) errors.crm = 'CRM é obrigatório';
    if (!data.crmState) errors.crmState = 'UF do CRM é obrigatório';
    if (!data.email || !isValidEmail(data.email)) errors.email = 'Email inválido';
    if (data.phone && !/^\d{10,11}$/.test(String(data.phone))) errors.phone = 'Telefone inválido';
    if (!data.cellphone || !/^\d{10,11}$/.test(String(data.cellphone))) errors.cellphone = 'Celular inválido';
    if (!isValidCPF(data.cpf)) errors.cpf = 'CPF inválido';
    if (!data.birthDate) errors.birthDate = 'Data de nascimento é obrigatória';
    if (data.birthDate && data.birthDate > new Date()) errors.birthDate = 'Data de nascimento inválida';
    if (!data.gender) errors.gender = 'Gênero é obrigatório';
    if (!data.specialty) errors.specialty = 'Especialidade é obrigatória';
    if (data.workingSchedules.length > 0) {
      data.workingSchedules.forEach((schedule, idx) => {
        if (!schedule.days.length) errors[`workingSchedules.${idx}.days`] = 'Selecione pelo menos um dia';
        if (schedule.hoursStart && !/^\d{2}:\d{2}$/.test(schedule.hoursStart)) errors[`workingSchedules.${idx}.hoursStart`] = 'Formato inválido (HH:MM)';
        if (schedule.hoursEnd && !/^\d{2}:\d{2}$/.test(schedule.hoursEnd)) errors[`workingSchedules.${idx}.hoursEnd`] = 'Formato inválido (HH:MM)';
      });
    }
    return errors;
  };

  const handleZipLookup = async (zipCode: string) => {
    const normalizedZip = onlyDigits(zipCode);
    if (normalizedZip.length !== 8) return;
    if (lastZipLookup === normalizedZip) return;

    setZipLoading(true);
    try {
      const result = await cepService.lookup(normalizedZip);
      if (!result) {
        showNotification({
          title: 'CEP não encontrado',
          message: 'Não foi possível localizar o endereço para este CEP.',
          color: 'yellow',
        });
        return;
      }

      setForm((prev) => ({
        ...prev,
        zipCode: normalizedZip,
        address: result.street || prev.address,
        neighborhood: result.neighborhood || prev.neighborhood,
        city: result.city || prev.city,
        state: result.state || prev.state,
        addressComplement: prev.addressComplement || result.complement || '',
      }));
      setLastZipLookup(normalizedZip);
    } catch {
      showNotification({
        title: 'Erro ao consultar CEP',
        message: 'Falha ao buscar endereço automaticamente.',
        color: 'red',
      });
    } finally {
      setZipLoading(false);
    }
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
      // Converter workingSchedules para o formato esperado pelo backend
      const validSchedules = form.workingSchedules.filter((s) => s.days.length > 0);
      const allDays = new Set<string>();
      validSchedules.forEach((schedule) => {
        schedule.days.forEach((day) => allDays.add(day));
      });

      const payload = {
        crm: form.crm.trim(),
        crmState: form.crmState.trim().toUpperCase(),
        name: form.nome.trim(),
        email: normalizeEmail(form.email) || undefined,
        phone: form.phone || undefined,
        cellphone: form.cellphone || undefined,
        birthDate: formatDateForApi(form.birthDate),
        gender: form.gender ? form.gender.toUpperCase() : undefined,
        cpf: form.cpf,
        rg: form.rg?.trim() || undefined,
        specialty: form.specialty || undefined,
        specialties: form.specialties || [],
        biography: form.biography || undefined,
        address: form.address || undefined,
        addressNumber: form.addressNumber || undefined,
        addressComplement: form.addressComplement || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        // Persist all shifts (new format) while keeping legacy fields for compatibility
        workingSchedules: validSchedules,
        workingDays: Array.from(allDays),
        workingHoursStart: validSchedules.length > 0 ? validSchedules[0].hoursStart : undefined,
        workingHoursEnd: validSchedules.length > 0 ? validSchedules[0].hoursEnd : undefined,
      };

      if (editingDoctorId) {
        await doctorService.updateDoctor(editingDoctorId, payload);
        setEditingDoctorId(null);
        setForm({ ...INITIAL_DOCTOR_FORM });
        setFieldErrors({});
        setActiveTab('lista');
        showNotification({ title: 'Médico atualizado', message: 'Dados atualizados com sucesso.', color: 'green' });
      } else {
        await doctorService.createDoctor(payload);

        setLastCreatedName(payload.name);
        setFieldErrors({});
        setShowSuccessModal(true);
      }
      try {
        const refreshed: unknown = await doctorService.listDoctors();
        const list = getApiList(refreshed);
        const mapped: DoctorListItem[] = list.map((item: ApiRecord) => {
          const name = getString(item.name ?? item.nome ?? item.fullName ?? 'Médico');
          const specialties = Array.isArray(item.specialties) ? (item.specialties as unknown[]) : [];
          return {
            id: String(item.id ?? item.doctorId ?? ''),
            name,
            crm: String(item.crm ?? ''),
            crmState: String(item.crmState ?? item.ufCrm ?? ''),
            specialty: String(item.specialty ?? specialties[0] ?? ''),
            isActive: Boolean(item.isActive ?? item.active ?? true),
            raw: item,
          };
        }).filter((item: DoctorListItem) => item.id);
        setDoctors(mapped);
      } catch {
        // Silent refresh failure after save.
      }
    } catch (e: unknown) {
      const err = e as ApiError;
      // handle field-level errors returned by server
      const serverFields: Record<string,string> | undefined = err?.response?.data?.fields;
      if (serverFields && typeof serverFields === 'object') {
        // map API field names to front-end form keys where necessary
        const mapped: Record<string,string> = {};
        for (const [k, v] of Object.entries(serverFields)) {
          if (k === 'name') mapped['nome'] = v as string;
          else mapped[k] = v as string;
        }
        setFieldErrors(mapped);
        showNotification({ title: 'Erro', message: Object.values(mapped)[0], color: 'red' });
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Erro ao registrar médico';
        setErrorMessage(msg);
        setShowErrorModal(true);
        showNotification({ title: 'Erro', message: msg, color: 'red' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (editingDoctorId) {
      setEditingDoctorId(null);
      setForm({ ...INITIAL_DOCTOR_FORM });
      setFieldErrors({});
      setActiveTab('cadastro');
      return;
    }
    navigate('/dashboard');
  };

  const handleDeleteDoctor = async (item: DoctorListItem) => {
    try {
      await doctorService.deleteDoctor(item.id);
      setDoctors((prev) => prev.filter((d) => d.id !== item.id));
      showNotification({ title: 'Médico excluído', message: 'Registro removido com sucesso.', color: 'green' });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (e: unknown) {
      const err = e as ApiError;
      const msg = err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Erro ao excluir médico';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    }
  };

  const handleToggleActive = async (item: DoctorListItem) => {
    try {

      setDoctors((prev) =>
        prev.map((d) =>
          d.id === item.id
            ? {
                ...d,
                isActive: !d.isActive,
                raw: { ...d.raw, isActive: !d.isActive },
              }
            : d
        )
      );

      showNotification({
        title: 'Status atualizado',
        message: `Médico ${!item.isActive ? 'ativado' : 'desativado'} com sucesso.`,
        color: 'green',
      });
    } catch (e: unknown) {
      const err = e as ApiError;
      const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar status';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1000} mx="auto">
        {/* Header da página */}
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>

            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Cadastro de Médico
              </Text>
              <Text size="sm" c="dimmed">
                Registro de médicos
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
                  Editando medico. Ajuste os dados e salve as alteracoes.
                </Text>
              )}
              {/* Dados Pessoais */}
              <Paper p="md" withBorder radius="md">
                <SectionTitle>Dados Pessoais</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <TextInput label="Nome completo" value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.currentTarget.value }); clearFieldError('nome'); }} error={fieldErrors.nome} required />
                  <TextInput label="CPF" value={formatCPF(form.cpf)} onChange={(e) => { setForm({ ...form, cpf: onlyDigits(e.currentTarget.value) }); clearFieldError('cpf'); }} maxLength={14} error={fieldErrors.cpf} required />
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
                            return;
                          }
                          const d = parseDate(birthDateInput);
                          if (!d) {
                            setFieldErrors((p) => ({ ...p, birthDate: 'Data de nascimento inválida' }));
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
                        error={fieldErrors.birthDate}
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
                    data={[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Feminino' }, { value: 'other', label: 'Outro' }]}
                    value={form.gender}
                    onChange={(v) => { setForm({ ...form, gender: (v as Gender) || '' }); clearFieldError('gender'); }}
                    error={fieldErrors.gender}
                    required
                  />

                  <TextInput label="Email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.currentTarget.value }); clearFieldError('email'); }} required error={fieldErrors.email} />
                  <TextInput label="Telefone" value={formatPhone(form.phone)} onChange={(e) => { setForm({ ...form, phone: onlyDigits(e.currentTarget.value) }); clearFieldError('phone'); }} error={fieldErrors.phone} />
                  <TextInput label="Celular" value={formatPhone(form.cellphone)} onChange={(e) => { setForm({ ...form, cellphone: onlyDigits(e.currentTarget.value) }); clearFieldError('cellphone'); }} required error={fieldErrors.cellphone} />
                </SimpleGrid>
              </Paper>

              {/* Dados Profissionais */}
              <Paper p="md" withBorder radius="md">
                <SectionTitle>Dados Profissionais</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <TextInput label="CRM" value={form.crm} onChange={(e) => { setForm({ ...form, crm: e.currentTarget.value }); clearFieldError('crm'); }} required error={fieldErrors.crm} />
                  <Select
                    label="UF do CRM"
                    placeholder="Selecione"
                    data={statesOptions}
                    value={form.crmState}
                    onChange={(v) => { setForm({ ...form, crmState: v || '' }); clearFieldError('crmState'); }}
                    required
                    error={fieldErrors.crmState}
                  />
                  <Select
                    label="Especialidade principal"
                    placeholder="Escolha uma"
                    data={specialtyOptions}
                    value={form.specialty}
                    onChange={(v) => { setForm({ ...form, specialty: v || '' }); clearFieldError('specialty'); }}
                    error={fieldErrors.specialty}
                    required
                  />
                  <MultiSelect
                    label="Outras especialidades"
                    placeholder="Adicionar"
                    data={specialtyOptions}
                    value={form.specialties}
                    onChange={(v) => setForm({ ...form, specialties: v })}
                  />
                </SimpleGrid>
                <Textarea
                  label="Biografia"
                  placeholder="Breve descrição profissional"
                  value={form.biography}
                  onChange={(e) => setForm({ ...form, biography: e.currentTarget.value })}
                  minRows={3}
                  mt="md"
                />
              </Paper>

              {/* Endereço */}
              <Paper p="md" withBorder radius="md">
                <SectionTitle>Endereço</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                  <TextInput
                    label="CEP"
                    value={formatCEP(form.zipCode)}
                    onChange={(e) => {
                      const normalized = onlyDigits(e.currentTarget.value);
                      setForm({ ...form, zipCode: normalized });
                      if (normalized.length < 8) setLastZipLookup('');
                    }}
                    onBlur={() => void handleZipLookup(form.zipCode)}
                    maxLength={9}
                    style={{ gridColumn: 'span 1' }}
                    rightSection={zipLoading ? <Loader size={16} /> : undefined}
                  />
                  <TextInput label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }} />
                  <TextInput label="Número" value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.currentTarget.value })} />
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
                  <TextInput label="Complemento" value={form.addressComplement} onChange={(e) => setForm({ ...form, addressComplement: e.currentTarget.value })} />
                  <TextInput label="Bairro" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.currentTarget.value })} />
                  <TextInput label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.currentTarget.value })} />
                  <Select
                    label="Estado"
                    placeholder="UF"
                    data={statesOptions}
                    value={form.state}
                    onChange={(v) => setForm({ ...form, state: v || '' })}
                  />
                </SimpleGrid>
              </Paper>

              {/* Horário de Trabalho */}
              <Paper p="md" withBorder radius="md">
                <SectionTitle>Horário de Trabalho</SectionTitle>
                <Stack gap="md">
                  {form.workingSchedules.map((schedule, idx) => (
                    <Paper key={idx} p="md" bg="rgba(0,0,0,0.02)" withBorder radius="md">
                      <Group justify="space-between" mb="md">
                        <Text size="sm" fw={500}>Turno {idx + 1}</Text>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => {
                            setForm({
                              ...form,
                              workingSchedules: form.workingSchedules.filter((_, i) => i !== idx),
                            });
                          }}
                        >
                          <Trash size={16} />
                        </ActionIcon>
                      </Group>
                      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mb="md">
                        <MultiSelect
                          label="Dias de trabalho"
                          placeholder="Selecione os dias"
                          data={daysOptions}
                          value={schedule.days}
                          onChange={(v) => {
                            const updated = [...form.workingSchedules];
                            updated[idx].days = v;
                            setForm({ ...form, workingSchedules: updated });
                          }}
                        />
                        <TextInput
                          label="Horário início"
                          placeholder="08:00"
                          value={schedule.hoursStart}
                          onChange={(e) => {
                            const updated = [...form.workingSchedules];
                            updated[idx].hoursStart = e.currentTarget.value;
                            setForm({ ...form, workingSchedules: updated });
                          }}
                        />
                        <TextInput
                          label="Horário fim"
                          placeholder="18:00"
                          value={schedule.hoursEnd}
                          onChange={(e) => {
                            const updated = [...form.workingSchedules];
                            updated[idx].hoursEnd = e.currentTarget.value;
                            setForm({ ...form, workingSchedules: updated });
                          }}
                        />
                      </SimpleGrid>
                    </Paper>
                  ))}
                  <Button
                    variant="light"
                    onClick={() => {
                      setForm({
                        ...form,
                        workingSchedules: [
                          ...form.workingSchedules,
                          { days: [], hoursStart: '', hoursEnd: '' },
                        ],
                      });
                    }}
                  >
                    + Adicionar turno
                  </Button>
                </Stack>
              </Paper>

              {/* Botões finais */}
              <Group justify="flex-end" mt="md">
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
                <SectionTitle>Médicos cadastrados</SectionTitle>
                <TextInput
                  placeholder="Buscar por nome"
                  value={doctorQuery}
                  onChange={(e) => setDoctorQuery(e.currentTarget.value)}
                  w={isMobile ? '100%' : 280}
                />
              </Group>

              {doctorsLoading ? (
                <Center style={{ padding: 16, gap: 8 }}>
                  <Loader size={18} />
                  <Text size="sm">Carregando médicos...</Text>
                </Center>
              ) : (
                <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                  <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                    <Table.Thead>
                      <Table.Tr style={{ borderBottom: 'none' }}>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                        {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>CRM</Table.Th>}
                        {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Especialidade</Table.Th>}
                        {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Ações</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredDoctors.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={5}>
                            <Text size="sm" c="dimmed" ta="center">Nenhum médico encontrado</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        filteredDoctors.map((item) => (
                          <Table.Tr key={item.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                            <Table.Td>
                              <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.name}</Text>
                            </Table.Td>
                            {!isTablet && (
                              <Table.Td>
                                <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>
                                  {item.crm ? `${item.crm}${item.crmState ? `/${item.crmState}` : ''}` : '-'}
                                </Text>
                              </Table.Td>
                            )}
                            {!isTablet && (
                              <Table.Td>
                                <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.specialty || '-'}</Text>
                              </Table.Td>
                            )}
                            {!isTablet && (
                              <Table.Td>
                                <Badge
                                  color={item.isActive ? 'green' : 'red'}
                                  variant="light"
                                  size="sm"
                                >
                                  {item.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </Table.Td>
                            )}
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <ActionIcon
                                  variant="subtle"
                                  style={{ color: 'var(--mantine-color-text)' }}
                                  onClick={() => {
                                    setSelectedDoctor(item);
                                    setDetailsOpen(true);
                                  }}
                                  title="Visualizar"
                                >
                                  <Eye size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  style={{ color: 'var(--mantine-color-text)' }}
                                  onClick={() => {
                                    setSelectedDoctor(item);
                                    setEditingDoctorId(item.id);
                                    populateFormFromDoctor(item.raw);
                                    setActiveTab('cadastro');
                                  }}
                                  title="Editar"
                                >
                                  <Pencil size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  color={item.isActive ? 'orange' : 'green'}
                                  onClick={() => handleToggleActive(item)}
                                  title={item.isActive ? 'Desativar' : 'Ativar'}
                                >
                                  <Power size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => {
                                    setDeleteTarget(item);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  title="Excluir"
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
          title="Detalhes do médico"
          centered
          size="lg"
        >
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Text size="sm"><Text fw={600} span>Nome:</Text> {formatDetailValue(selectedDoctor?.raw?.name || selectedDoctor?.raw?.nome)}</Text>
              <Text size="sm"><Text fw={600} span>CPF:</Text> {formatCpfValue(selectedDoctor?.raw?.cpf)}</Text>
              <Text size="sm"><Text fw={600} span>Email:</Text> {formatDetailValue(selectedDoctor?.raw?.email)}</Text>
              <Text size="sm"><Text fw={600} span>Telefone:</Text> {formatPhoneValue(selectedDoctor?.raw?.phone)}</Text>
              <Text size="sm"><Text fw={600} span>Celular:</Text> {formatPhoneValue(selectedDoctor?.raw?.cellphone)}</Text>
              <Text size="sm"><Text fw={600} span>Nascimento:</Text> {formatDateValue(selectedDoctor?.raw?.birthDate)}</Text>
              <Text size="sm"><Text fw={600} span>Gênero:</Text> {formatGenderValue(selectedDoctor?.raw?.gender)}</Text>
              <Text size="sm"><Text fw={600} span>RG:</Text> {formatDetailValue(selectedDoctor?.raw?.rg)}</Text>
              <Text size="sm">
                <Text fw={600} span>CRM/UF:</Text>{' '}
                {(() => {
                  const crm = selectedDoctor?.raw?.crm ? String(selectedDoctor.raw.crm) : '';
                  const uf = selectedDoctor?.raw?.crmState || selectedDoctor?.raw?.ufCrm || '';
                  if (!crm && !uf) return '-';
                  return `${crm}${uf ? `/${uf}` : ''}`;
                })()}
              </Text>
              <Text size="sm"><Text fw={600} span>Especialidade:</Text> {formatDetailValue(selectedDoctor?.raw?.specialty)}</Text>
              <Text size="sm"><Text fw={600} span>Outras especialidades:</Text> {formatDetailValue(selectedDoctor?.raw?.specialties)}</Text>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Text size="sm"><Text fw={600} span>Endereço:</Text> {formatDetailValue(selectedDoctor?.raw?.address)}</Text>
              <Text size="sm"><Text fw={600} span>Número:</Text> {formatDetailValue(selectedDoctor?.raw?.addressNumber)}</Text>
              <Text size="sm"><Text fw={600} span>Complemento:</Text> {formatDetailValue(selectedDoctor?.raw?.addressComplement)}</Text>
              <Text size="sm"><Text fw={600} span>Bairro:</Text> {formatDetailValue(selectedDoctor?.raw?.neighborhood)}</Text>
              <Text size="sm"><Text fw={600} span>Cidade:</Text> {formatDetailValue(selectedDoctor?.raw?.city)}</Text>
              <Text size="sm"><Text fw={600} span>Estado:</Text> {formatDetailValue(selectedDoctor?.raw?.state)}</Text>
              <Text size="sm"><Text fw={600} span>CEP:</Text> {selectedDoctor?.raw?.zipCode ? formatCEP(String(selectedDoctor?.raw?.zipCode)) : '-'}</Text>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Text size="sm"><Text fw={600} span>Dias de trabalho:</Text></Text>
            </SimpleGrid>
            {selectedDoctorSchedules.length > 0 ? (
              <Stack gap="xs">
                {selectedDoctorSchedules.map((schedule, idx: number) => {
                  const days = schedule.days.length > 0 ? schedule.days.join(', ') : '-';
                  const hoursStart = schedule.hoursStart;
                  const hoursEnd = schedule.hoursEnd;
                  return (
                    <Paper key={idx} p="xs" bg="rgba(0,0,0,0.02)" radius="sm">
                      <Text size="sm">
                        <Text fw={600} span>Turno {idx + 1}:</Text> {days} ({hoursStart}-{hoursEnd})
                      </Text>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">-</Text>
            )}
          </Stack>
        </Modal>

        <ResultModal
          opened={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          variant="success"
          title="Médico cadastrado"
          message={lastCreatedName ? `${lastCreatedName} foi cadastrado com sucesso.` : 'Médico cadastrado com sucesso.'}
          primary={{ label: 'Cadastrar novo', onClick: () => { setForm({ ...INITIAL_DOCTOR_FORM }); setShowSuccessModal(false); } }}
          secondary={{ label: 'Voltar para o dashboard', onClick: () => { setShowSuccessModal(false); navigate('/dashboard'); } }}
        />

        <ResultModal opened={showErrorModal} onClose={() => setShowErrorModal(false)} variant="error" title="Erro ao cadastrar médico" message={errorMessage || 'Erro ao registrar médico'} secondary={{ label: 'Fechar', onClick: () => setShowErrorModal(false) }} />

        <ResultModal
          opened={deleteConfirmOpen}
          onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
          variant="error"
          title="Confirmar exclusão"
          message={`Tem certeza que deseja excluir ${deleteTarget?.name || 'este médico'}?`}
          primary={{ label: 'Excluir', onClick: () => { if (deleteTarget) handleDeleteDoctor(deleteTarget); } }}
          secondary={{ label: 'Cancelar', onClick: () => { setDeleteConfirmOpen(false); setDeleteTarget(null); } }}
        />
      </Box>
    </Box>
  );
}
