import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  SimpleGrid,
  Stack,
  Paper,
  Title,
  Popover,
  ActionIcon,
  Menu,
  Modal,
  Tabs,
  Table,
  Loader,
  Skeleton,
  Badge,
  Switch,
  FileInput,
  useComputedColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar as CalendarIcon, Eye, Pencil, Trash, Power, MoreVertical, UserPlus, Users } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { DatePicker } from '@mantine/dates';
import { onlyDigits, formatCPF, formatCEP, formatPhone, formatDateInput, isValidCPF, isValidEmail, normalizeEmail } from '../../utils/formatters';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { PaginatedGrid } from '../common/PaginatedGrid';
import doctorService from '../../services/doctorService';
import cepService from '../../services/cepService';
import ResultModal from '../common/ResultModal';
import { findExistingCpf } from '../../utils/cpfRegistry';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useEspecialidadesAdminQuery } from '../../hooks/useEspecialidadesAdminQuery';
import { useModalidadesAdminQuery } from '../../hooks/useModalidadesAdminQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

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
const ALL_BRANCHES_VALUE = '__ALL_BRANCHES__';

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

interface DoctorEspecialidadeGroup {
  modalidadeId: string | null;
  especialidadeId: string | null;
  registrationType: string;
  registrationNumber: string;
  registrationState: string;
  metodos: string[];
  procedimentoIds: string[];
  branchIds: string[];
}

interface DoctorProcedureDuration {
  procedureId: string;
  procedureName?: string;
  modalidadeId?: string | null;
  durationMinutes: number;
}

interface DoctorForm {
  nome: string;
  crmType: string;
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
  teleconsultationEnabled: boolean;
  biography: string;
  signatureImageBase64: string;
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
  especialidadeGroups: DoctorEspecialidadeGroup[];
  branchIds: string[];
  appointmentDurations: number[];
  procedureDurations: DoctorProcedureDuration[];
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
  crmType: 'CRM',
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
  teleconsultationEnabled: false,
  biography: '',
  signatureImageBase64: '',
  address: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  isActive: true,
  workingSchedules: [],
  especialidadeGroups: [],
  branchIds: [],
  appointmentDurations: [],
  procedureDurations: [],
};

const TELECONSULTATION_SPECIALTY_FLAG = '__TELECONSULTA__';

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
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const isDarkMode = useComputedColorScheme('light') === 'dark';

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

  const handleSignatureFileChange = (file: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, signatureImageBase64: '' }));
      return;
    }

    const isValidType = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
    if (!isValidType) {
      showNotification({ title: 'Arquivo inválido', message: 'Envie PNG ou JPG para assinatura.', color: 'red' });
      return;
    }

    const maxBytes = 300 * 1024;
    if (file.size > maxBytes) {
      showNotification({ title: 'Arquivo grande', message: 'A assinatura deve ter no máximo 300 KB.', color: 'red' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setForm((prev) => ({ ...prev, signatureImageBase64: result }));
    };
    reader.readAsDataURL(file);
  };

  const [form, setForm] = useState<DoctorForm>({ ...INITIAL_DOCTOR_FORM });
  const [activeTab, setActiveTab] = useState<'hub' | 'cadastro' | 'lista'>('hub');
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorPage, setDoctorPage] = useState(1);
  const [doctorPageSize, setDoctorPageSize] = useState(10);
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
  const lastValidatedCpfRef = useRef<string>('');
  const doctorsQuery = useDoctorsAdminQuery();
  const especialidadesQuery = useEspecialidadesAdminQuery();
  const modalidadesQuery = useModalidadesAdminQuery();
  const branchesQuery = useSettingsBranchesQuery();
  const proceduresQuery = useProceduresAdminQuery();

  const especialidadeList = useMemo(() => {
    const data: any = especialidadesQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return list.filter((e: any) => e?.id && e.isActive);
  }, [especialidadesQuery.data]);

  const modalidadeOptions = useMemo(() => {
    const data: any = modalidadesQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return list.filter((m: any) => m?.id && m.isActive).map((m: any) => ({ value: m.id, label: m.name }));
  }, [modalidadesQuery.data]);

  const procedureList = useMemo(() => {
    const list: any[] = Array.isArray(proceduresQuery.data) ? proceduresQuery.data : [];
    return list.filter((p: any) => p?.id && p.isActive !== false);
  }, [proceduresQuery.data]);

  const selectedModalidadeIds = useMemo(() => (
    new Set(
      form.especialidadeGroups
        .map((group) => group.modalidadeId)
        .filter((modalidadeId): modalidadeId is string => Boolean(modalidadeId)),
    )
  ), [form.especialidadeGroups]);

  const procedureOptions = useMemo(() => (
    procedureList
      .filter((procedure: any) => {
        const procedureModalidadeId = String(procedure.modalidadeId || procedure.modalidade?.id || '').trim();
        if (procedureModalidadeId && selectedModalidadeIds.has(procedureModalidadeId)) return true;

        const selectedModalidades = modalidadeOptions.filter((option) => selectedModalidadeIds.has(option.value));
        const legacyModalidades = Array.isArray(procedure.modalidades)
          ? procedure.modalidades.map((value: unknown) => String(value).trim().toLowerCase())
          : [];
        return selectedModalidades.some((option) => (
          legacyModalidades.includes(String(option.value).toLowerCase())
          || legacyModalidades.includes(String(option.label).trim().toLowerCase())
        ));
      })
      .map((procedure: any) => ({
        value: String(procedure.id),
        label: String(procedure.name || 'Procedimento sem nome'),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  ), [modalidadeOptions, procedureList, selectedModalidadeIds]);

  const especialidadeByModalidadeId = useMemo(() => {
    const map = new Map<string, any>();
    especialidadeList.forEach((e: any) => map.set(e.modalidadeId, e));
    return map;
  }, [especialidadeList]);

  const branchOptions = useMemo(() => {
    const data: any = branchesQuery.data;
    const list: any[] = Array.isArray(data)
      ? data
      : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : []));
    return list
      .filter((b: any) => b?.id)
      .map((b: any) => ({ value: String(b.id), label: b.tradeName || b.socialName || 'Filial sem nome' }));
  }, [branchesQuery.data]);

  const branchOptionsWithAll = useMemo(
    () => [{ value: ALL_BRANCHES_VALUE, label: 'Todas as unidades' }, ...branchOptions],
    [branchOptions],
  );

  const metodoOptionsForModalidade = (modalidadeId: string | null) => {
    const especialidade = modalidadeId ? especialidadeByModalidadeId.get(modalidadeId) : null;
    const metodos: string[] = Array.isArray(especialidade?.metodos) ? especialidade.metodos : [];
    return metodos.map((m) => ({ value: m, label: m }));
  };

  const EMPTY_GROUP_DRAFT: DoctorEspecialidadeGroup = {
    modalidadeId: null,
    especialidadeId: null,
    registrationType: form.crmType || 'CRM',
    registrationNumber: form.crm,
    registrationState: form.crmState,
    metodos: [],
    procedimentoIds: [],
    branchIds: [ALL_BRANCHES_VALUE],
  };
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [groupDraft, setGroupDraft] = useState<DoctorEspecialidadeGroup>(EMPTY_GROUP_DRAFT);
  const [groupModalidadeError, setGroupModalidadeError] = useState<string | null>(null);
  const [availableProcedureSearch, setAvailableProcedureSearch] = useState('');
  const [linkedProcedureSearch, setLinkedProcedureSearch] = useState('');
  const [selectedAvailableProcedureIds, setSelectedAvailableProcedureIds] = useState<string[]>([]);
  const [selectedLinkedProcedureIds, setSelectedLinkedProcedureIds] = useState<string[]>([]);

  const linkedProcedureIds = useMemo(
    () => new Set(form.procedureDurations.map((item) => item.procedureId)),
    [form.procedureDurations],
  );

  const availableProcedureOptions = useMemo(
    () => procedureOptions.filter((option) => !linkedProcedureIds.has(option.value)),
    [linkedProcedureIds, procedureOptions],
  );

  const filteredAvailableProcedures = useMemo(() => {
    const query = availableProcedureSearch.trim().toLowerCase();
    if (!query) return availableProcedureOptions;
    return availableProcedureOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [availableProcedureOptions, availableProcedureSearch]);

  const filteredLinkedProcedures = useMemo(() => {
    const query = linkedProcedureSearch.trim().toLowerCase();
    return form.procedureDurations.filter((item) => {
      const procedure = procedureList.find((candidate: any) => String(candidate.id) === item.procedureId);
      const name = item.procedureName || procedure?.name || '';
      return !query || name.toLowerCase().includes(query);
    });
  }, [form.procedureDurations, linkedProcedureSearch, procedureList]);

  const openAddGroupModal = () => {
    setEditingGroupIndex(null);
    setGroupDraft({
      ...EMPTY_GROUP_DRAFT,
      registrationType: form.crmType || 'CRM',
      registrationNumber: form.crm,
      registrationState: form.crmState,
    });
    setGroupModalidadeError(null);
    setGroupModalOpen(true);
  };

  const openEditGroupModal = (index: number) => {
    setEditingGroupIndex(index);
    const group = form.especialidadeGroups[index];
    setGroupDraft({ ...group, branchIds: group.branchIds || [ALL_BRANCHES_VALUE] });
    setGroupModalidadeError(null);
    setGroupModalOpen(true);
  };

  const handleGroupDraftModalidadeChange = (modalidadeId: string | null) => {
    const especialidade = modalidadeId ? especialidadeByModalidadeId.get(modalidadeId) : null;
    setGroupDraft({
      modalidadeId,
      especialidadeId: especialidade?.id || null,
      registrationType: groupDraft.registrationType || form.crmType || 'CRM',
      registrationNumber: groupDraft.registrationNumber || form.crm,
      registrationState: groupDraft.registrationState || form.crmState,
      metodos: [],
      procedimentoIds: groupDraft.procedimentoIds,
      branchIds: groupDraft.branchIds || [ALL_BRANCHES_VALUE],
    });
    setGroupModalidadeError(null);
  };

  const handleSaveGroup = () => {
    if (!groupDraft.modalidadeId) {
      setGroupModalidadeError('Selecione uma modalidade');
      return;
    }
    if (!groupDraft.registrationType || !groupDraft.registrationNumber.trim() || !groupDraft.registrationState) {
      setGroupModalidadeError('Preencha o tipo, número e UF do registro');
      return;
    }
    setForm((prev) => {
      const especialidadeGroups = editingGroupIndex === null
        ? [...prev.especialidadeGroups, groupDraft]
        : prev.especialidadeGroups.map((group, i) => (i === editingGroupIndex ? groupDraft : group));
      return { ...prev, especialidadeGroups };
    });
    setGroupModalOpen(false);
  };

  const removeEspecialidadeGroup = (index: number) => {
    setForm((prev) => ({
      ...prev,
      especialidadeGroups: prev.especialidadeGroups.filter((_, i) => i !== index),
    }));
  };

  const moveProceduresToLinked = () => {
    if (selectedAvailableProcedureIds.length === 0) return;
    const selectedIds = new Set(selectedAvailableProcedureIds);
    const newLinks = availableProcedureOptions
      .filter((option) => selectedIds.has(option.value))
      .map((option) => {
        const procedure = procedureList.find((candidate: any) => String(candidate.id) === option.value);
        const defaultDuration = Number(procedure?.durationMinutes);
        return {
          procedureId: option.value,
          procedureName: option.label,
          modalidadeId: procedure?.modalidadeId ? String(procedure.modalidadeId) : null,
          durationMinutes: Number.isFinite(defaultDuration) && defaultDuration > 0 ? Math.round(defaultDuration) : 0,
        };
      });

    setForm((prev) => ({
      ...prev,
      procedureDurations: [...prev.procedureDurations, ...newLinks]
        .sort((a, b) => (a.procedureName || '').localeCompare(b.procedureName || '', 'pt-BR')),
    }));
    setSelectedAvailableProcedureIds([]);
  };

  const moveProceduresToAvailable = () => {
    if (selectedLinkedProcedureIds.length === 0) return;
    const selectedIds = new Set(selectedLinkedProcedureIds);
    setForm((prev) => ({
      ...prev,
      procedureDurations: prev.procedureDurations.filter((item) => !selectedIds.has(item.procedureId)),
    }));
    setSelectedLinkedProcedureIds([]);
  };

  const moveAllProceduresToLinked = () => {
    if (availableProcedureOptions.length === 0) return;
    const newLinks = availableProcedureOptions.map((option) => {
      const procedure = procedureList.find((candidate: any) => String(candidate.id) === option.value);
      const defaultDuration = Number(procedure?.durationMinutes);
      return {
        procedureId: option.value,
        procedureName: option.label,
        modalidadeId: procedure?.modalidadeId ? String(procedure.modalidadeId) : null,
        durationMinutes: Number.isFinite(defaultDuration) && defaultDuration > 0 ? Math.round(defaultDuration) : 0,
      };
    });

    setForm((prev) => ({
      ...prev,
      procedureDurations: [...prev.procedureDurations, ...newLinks]
        .sort((a, b) => (a.procedureName || '').localeCompare(b.procedureName || '', 'pt-BR')),
    }));
    setSelectedAvailableProcedureIds([]);
  };

  const moveAllProceduresToAvailable = () => {
    if (form.procedureDurations.length === 0) return;
    setForm((prev) => ({ ...prev, procedureDurations: [] }));
    setSelectedLinkedProcedureIds([]);
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateCpfUniqueness = async (cpfValue: string, notify = true) => {
    const normalizedCpf = onlyDigits(cpfValue);

    if (normalizedCpf.length !== 11 || !isValidCPF(normalizedCpf)) {
      lastValidatedCpfRef.current = '';
      return false;
    }

    if (lastValidatedCpfRef.current === normalizedCpf) {
      return fieldErrors.cpf === 'CPF já cadastrado';
    }

    const duplicateCpf = await findExistingCpf({
      cpf: normalizedCpf,
      currentEntityType: 'doctor',
      currentEntityId: editingDoctorId,
    });

    lastValidatedCpfRef.current = normalizedCpf;

    if (duplicateCpf.exists) {
      const cpfError = 'CPF já cadastrado';
      setFieldErrors((prev) => ({ ...prev, cpf: cpfError }));
      if (notify) {
        showNotification({ title: 'Erro', message: cpfError, color: 'red' });
      }
      return true;
    }

    setFieldErrors((prev) => {
      if (prev.cpf !== 'CPF já cadastrado') return prev;
      const next = { ...prev };
      delete next.cpf;
      return next;
    });

    return false;
  };

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((item) => item.name.toLowerCase().includes(q));
  }, [doctors, doctorQuery]);

  const paginatedDoctors = useMemo(() => {
    const start = (doctorPage - 1) * doctorPageSize;
    return filteredDoctors.slice(start, start + doctorPageSize);
  }, [doctorPage, doctorPageSize, filteredDoctors]);

  const doctorTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredDoctors.length / doctorPageSize)),
    [doctorPageSize, filteredDoctors.length],
  );

  useEffect(() => {
    setDoctorPage(1);
  }, [doctorQuery, doctorPageSize, doctors.length]);

  useEffect(() => {
    if (doctorPage > doctorTotalPages) {
      setDoctorPage(doctorTotalPages);
    }
  }, [doctorPage, doctorTotalPages]);

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
    const rawSpecialties = Array.isArray(raw.specialties)
      ? (raw.specialties as unknown[]).map((item) => getString(item)).filter(Boolean)
      : [];
    const teleconsultationEnabled = rawSpecialties.includes(TELECONSULTATION_SPECIALTY_FLAG);
    const specialties = rawSpecialties.filter((item) => item !== TELECONSULTATION_SPECIALTY_FLAG);

    const workingSchedules = getWorkingSchedulesFromRaw(raw);
    setForm({
      nome: getString(raw.name ?? raw.nome),
      crmType: getString(raw.crmType) || 'CRM',
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
      teleconsultationEnabled,
      biography: getString(raw.biography),
      signatureImageBase64: getString(raw.signatureImageBase64),
      address: getString(raw.address),
      addressNumber: getString(raw.addressNumber),
      addressComplement: getString(raw.addressComplement),
      neighborhood: getString(raw.neighborhood),
      city: getString(raw.city),
      state: getString(raw.state),
      zipCode: getString(raw.zipCode),
      isActive: getBoolean(raw.isActive, true),
      workingSchedules,
      especialidadeGroups: Array.isArray(raw.especialidadeGroups)
        ? (raw.especialidadeGroups as unknown[]).map((item: unknown) => {
          const groupRecord = isRecord(item) ? item : {};
          return {
            modalidadeId: getString(groupRecord.modalidadeId) || null,
            especialidadeId: getString(groupRecord.especialidadeId) || null,
            registrationType: getString(groupRecord.registrationType) || getString(raw.crmType) || 'CRM',
            registrationNumber: getString(groupRecord.registrationNumber) || getString(raw.crm),
            registrationState: getString(groupRecord.registrationState) || getString(raw.crmState ?? raw.ufCrm),
            metodos: Array.isArray(groupRecord.metodos) ? (groupRecord.metodos as unknown[]).map((v) => getString(v)).filter(Boolean) : [],
            procedimentoIds: Array.isArray(groupRecord.procedimentoIds) ? (groupRecord.procedimentoIds as unknown[]).map((v) => getString(v)).filter(Boolean) : [],
            branchIds: Array.isArray(groupRecord.branchIds) ? (groupRecord.branchIds as unknown[]).map((v) => getString(v)).filter(Boolean) : [],
          };
        })
        : [],
      branchIds: Array.isArray(raw.branchIds) ? (raw.branchIds as unknown[]).map((v) => getString(v)).filter(Boolean) : [],
      appointmentDurations: Array.isArray(raw.appointmentDurations)
        ? (raw.appointmentDurations as unknown[]).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
        : [],
      procedureDurations: Array.isArray(raw.procedureDurations)
        ? (raw.procedureDurations as unknown[]).map((item: unknown) => {
          const record = isRecord(item) ? item : {};
          return {
            procedureId: getString(record.procedureId),
            procedureName: getString(record.procedureName),
            modalidadeId: getString(record.modalidadeId) || null,
            durationMinutes: Number(record.durationMinutes),
          };
        }).filter((item) => item.procedureId && Number.isFinite(item.durationMinutes) && item.durationMinutes > 0)
        : [],
    });
  };

  useEffect(() => {
    setDoctorsLoading(doctorsQuery.isLoading && doctors.length === 0);
  }, [doctors.length, doctorsQuery.isLoading]);

  useEffect(() => {
    if (doctorsQuery.error) {
      const err = doctorsQuery.error as ApiError;
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao carregar profissionais'),
        color: 'red',
      });
    }
  }, [doctorsQuery.error]);

  useEffect(() => {
    const list = getApiList(doctorsQuery.data);
    const mapped: DoctorListItem[] = list.map((item: ApiRecord) => {
      const name = getString(item.name ?? item.nome ?? item.fullName ?? 'Profissional');
      const specialties = Array.isArray(item.specialties)
        ? (item.specialties as unknown[]).map((value) => String(value)).filter((value) => value !== TELECONSULTATION_SPECIALTY_FLAG)
        : [];
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
  }, [doctorsQuery.data]);

  const crmTypeOptions = [
    { value: 'CRM', label: 'CRM – Medicina' },
    { value: 'CRO', label: 'CRO – Odontologia' },
    { value: 'CRP', label: 'CRP – Psicologia' },
    { value: 'CRN', label: 'CRN – Nutrição' },
    { value: 'CREFITO', label: 'CREFITO – Fisioterapia/T.O.' },
    { value: 'COREN', label: 'COREN – Enfermagem' },
    { value: 'CRF', label: 'CRF – Farmácia' },
    { value: 'CFFa', label: 'CFFa – Fonoaudiologia' },
    { value: 'CRMV', label: 'CRMV – Med. Veterinária' },
    { value: 'Outro', label: 'Outro' },
  ];

  const statesOptions = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ].map((s) => ({ value: s, label: s }));

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
    if (data.procedureDurations.some((item) => !Number.isFinite(item.durationMinutes) || item.durationMinutes <= 0)) {
      errors.procedureDurations = 'Informe o tempo de todos os procedimentos vinculados';
    }
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

    const duplicateCpf = await findExistingCpf({
      cpf: form.cpf,
      currentEntityType: 'doctor',
      currentEntityId: editingDoctorId,
    });

    if (duplicateCpf.exists) {
      const cpfError = 'CPF já cadastrado';
      setFieldErrors((prev) => ({ ...prev, cpf: cpfError }));
      showNotification({ title: 'Erro', message: cpfError, color: 'red' });
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

      // Especialidade principal foi removida da tela; deriva um rótulo a partir
      // das especialidades vinculadas pra manter os consumidores legados (busca, BI) funcionando.
      const derivedSpecialty = form.especialidadeGroups
        .map((group) => especialidadeList.find((e: any) => e.id === group.especialidadeId)?.name)
        .filter(Boolean)
        .join(', ') || form.specialty || '';

      const payload = {
        crmType: form.crmType || 'CRM',
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
        specialty: derivedSpecialty,
        specialties: [
          ...(form.specialties || []),
          ...(form.teleconsultationEnabled ? [TELECONSULTATION_SPECIALTY_FLAG] : []),
        ],
        biography: form.biography || undefined,
        signatureImageBase64: form.signatureImageBase64?.trim() || null,
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
        especialidadeGroups: form.especialidadeGroups
          .filter((group) => group.modalidadeId)
          .map((group) => ({
            ...group,
            registrationType: group.registrationType || form.crmType || 'CRM',
            registrationNumber: group.registrationNumber.trim() || form.crm.trim(),
            registrationState: group.registrationState || form.crmState.trim().toUpperCase(),
            branchIds: (group.branchIds || []).length === 0 || (group.branchIds || []).includes(ALL_BRANCHES_VALUE)
              ? branchOptions.map((option) => option.value)
              : group.branchIds,
          })),
        appointmentDurations: form.appointmentDurations,
        procedureDurations: form.procedureDurations.map((item) => ({
          procedureId: item.procedureId,
          durationMinutes: item.durationMinutes,
        })),
      };

      if (editingDoctorId) {
        await doctorService.updateDoctor(editingDoctorId, payload);
        setEditingDoctorId(null);
        setForm({ ...INITIAL_DOCTOR_FORM });
        setFieldErrors({});
        setActiveTab('lista');
        showNotification({ title: 'Profissional atualizado', message: 'Dados atualizados com sucesso.', color: 'green' });
      } else {
        await doctorService.createDoctor(payload);

        setLastCreatedName(payload.name);
        setFieldErrors({});
        setShowSuccessModal(true);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.doctorsAdmin });
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
        const msg = resolveApiErrorMessage(err, 'Erro ao registrar profissional');
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.doctorsAdmin });
      showNotification({ title: 'Profissional excluído', message: 'Registro removido com sucesso.', color: 'green' });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (e: unknown) {
      const err = e as ApiError;
      const msg = resolveApiErrorMessage(err, 'Erro ao excluir profissional');
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    }
  };

  const handleToggleActive = async (item: DoctorListItem) => {
    try {
      await doctorService.updateDoctor(item.id, { isActive: !item.isActive } as any);
      await queryClient.invalidateQueries({ queryKey: queryKeys.doctorsAdmin });

      showNotification({
        title: 'Status atualizado',
        message: `Profissional ${!item.isActive ? 'ativado' : 'desativado'} com sucesso.`,
        color: 'green',
      });
    } catch (e: unknown) {
      const err = e as ApiError;
      const msg = resolveApiErrorMessage(err, 'Erro ao atualizar status');
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    }
  };

  const handleViewDoctor = (item: DoctorListItem) => {
    setSelectedDoctor(item);
    setDetailsOpen(true);
  };

  const handleEditDoctor = (item: DoctorListItem) => {
    setSelectedDoctor(item);
    setEditingDoctorId(item.id);
    populateFormFromDoctor(item.raw);
    setActiveTab('cadastro');
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {/* Header da página */}
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" size="xl" onClick={() => navigate(-1)}>
              <ChevronLeft size={28} />
            </ActionIcon>

            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Cadastro de Profissional
              </Text>
              <Text size="sm" c="dimmed">
                Registro de profissionais
              </Text>
            </Box>
          </Group>

        </Group>
        {activeTab === 'hub' ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {[
              {
                key: 'cadastro',
                icon: UserPlus,
                title: 'Cadastrar profissional',
                desc: 'Registrar profissional com dados profissionais, contatos e turnos de atendimento.',
                onClick: () => setActiveTab('cadastro'),
              },
              {
                key: 'lista',
                icon: Users,
                title: 'Profissionais',
                desc: 'Visualize, edite e gerencie o status dos profissionais registrados no sistema.',
                onClick: () => setActiveTab('lista'),
              },
            ].map((card) => (
              <Paper
                key={card.key}
                p="lg"
                withBorder
                onClick={card.onClick}
                style={{ cursor: 'pointer', borderColor: 'var(--mantine-color-default-border)', minHeight: 96 }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <Box
                      w={44}
                      h={44}
                      style={{
                        borderRadius: 10,
                        border: `1px solid ${isDarkMode ? '#dbe7ff' : DARK_BLUE}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <card.icon size={22} color={isDarkMode ? '#dbe7ff' : DARK_BLUE} />
                    </Box>
                    <Box style={{ minWidth: 0 }}>
                      <Text fw={600} size="md" lineClamp={1}>{card.title}</Text>
                      <Text size="sm" c="dimmed" lineClamp={2}>{card.desc}</Text>
                    </Box>
                  </Group>
                  <ChevronRight size={18} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        ) : (
          <>
            <Group justify="space-between" align="center" mb="lg" wrap="wrap">
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<ChevronLeft size={16} />}
                  onClick={() => setActiveTab('hub')}
                >
                  Voltar
                </Button>
                <Text fw={600}>
                  {activeTab === 'cadastro' ? 'Cadastrar profissional' : 'Profissionais cadastrados'}
                </Text>
              </Group>
            </Group>

        <Tabs value={activeTab} onChange={(value) => setActiveTab((value as 'cadastro' | 'lista') || 'cadastro')} keepMounted={false}>
          <Tabs.Panel value="cadastro" pt={0}>
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
                  <FloatingInput label="Nome completo" value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.currentTarget.value }); clearFieldError('nome'); }} error={fieldErrors.nome} required />
                  <FloatingInput
                    label="CPF"
                    value={formatCPF(form.cpf)}
                    onChange={(e) => {
                      const nextCpf = onlyDigits(e.currentTarget.value);
                      setForm({ ...form, cpf: nextCpf });
                      clearFieldError('cpf');
                      if (nextCpf.length < 11) {
                        lastValidatedCpfRef.current = '';
                      }
                      if (nextCpf.length === 11) {
                        void validateCpfUniqueness(nextCpf);
                      }
                    }}
                    onBlur={() => {
                      if (form.cpf.length === 11) {
                        void validateCpfUniqueness(form.cpf);
                      }
                    }}
                    maxLength={14}
                    error={fieldErrors.cpf}
                    required
                  />
                  <FloatingInput label="RG" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.currentTarget.value })} />

                  <Popover opened={datePopoverOpened} onClose={() => setDatePopoverOpened(false)} position="bottom-start" withArrow>
                    <Popover.Target>
                      <FloatingInput
                        label="Data de nascimento"
                        placeholder="dd/mm/aaaa"
                        value={birthDateInput}
                        maxLength={10}
                        required
                        error={fieldErrors.birthDate}
                        rightSection={
                          <ActionIcon size="sm" variant="subtle" onClick={() => setDatePopoverOpened((o) => !o)}>
                            <CalendarIcon size={16} />
                          </ActionIcon>
                        }
                        onChange={(e) => {
                          const formatted = formatDateInput(e.currentTarget.value);
                          setBirthDateInput(formatted);
                          clearFieldError('birthDate');
                          const d = parseDate(formatted);
                          setForm({ ...form, birthDate: d });
                        }}
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

                  <FloatingSelect
                    label="Gênero"
                    data={[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Feminino' }, { value: 'other', label: 'Outro' }]}
                    value={form.gender}
                    onChange={(v) => { setForm({ ...form, gender: (v as Gender) || '' }); clearFieldError('gender'); }}
                    error={fieldErrors.gender}
                    required
                  />

                  <FloatingInput label="Email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.currentTarget.value }); clearFieldError('email'); }} required error={fieldErrors.email} />
                  <FloatingInput label="Telefone" value={formatPhone(form.phone)} onChange={(e) => { setForm({ ...form, phone: onlyDigits(e.currentTarget.value) }); clearFieldError('phone'); }} error={fieldErrors.phone} />
                  <FloatingInput label="Celular" value={formatPhone(form.cellphone)} onChange={(e) => { setForm({ ...form, cellphone: onlyDigits(e.currentTarget.value) }); clearFieldError('cellphone'); }} required error={fieldErrors.cellphone} />
                </SimpleGrid>
              </Paper>

              {/* Dados Profissionais */}
              <Paper p="md" withBorder radius="md">
                <SectionTitle>Dados Profissionais</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <FloatingSelect
                    label="Tipo de registro"
                    data={crmTypeOptions}
                    value={form.crmType}
                    onChange={(v) => { setForm({ ...form, crmType: v || 'CRM' }); }}
                    required
                  />
                  <FloatingInput label={`Número do ${form.crmType || 'registro'}`} value={form.crm} onChange={(e) => { setForm({ ...form, crm: e.currentTarget.value }); clearFieldError('crm'); }} required error={fieldErrors.crm} />
                  <FloatingSelect
                    label="UF do registro"
                    data={statesOptions}
                    value={form.crmState}
                    onChange={(v) => { setForm({ ...form, crmState: v || '' }); clearFieldError('crmState'); }}
                    required
                    error={fieldErrors.crmState}
                  />
                </SimpleGrid>

                <Stack gap="sm" mt="md">
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={600}>Modalidades, especialidades e procedimentos</Text>
                    <Button variant="light" size="xs" onClick={openAddGroupModal}>
                      + Adicionar conjunto
                    </Button>
                  </Group>

                  {form.especialidadeGroups.length === 0 ? (
                    <Paper withBorder radius="md" p="md">
                      <Text size="sm" c="dimmed" ta="center">Nenhum conjunto cadastrado ainda.</Text>
                    </Paper>
                  ) : (
                    <Box style={{ overflowX: 'auto', border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                      <Table horizontalSpacing="sm" verticalSpacing="sm">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Modalidade</Table.Th>
                            <Table.Th>Especialidade</Table.Th>
                            <Table.Th>Registro</Table.Th>
                            <Table.Th>Métodos</Table.Th>
                            <Table.Th>Unidades</Table.Th>
                            <Table.Th style={{ textAlign: 'center', width: 90 }}>Ações</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {form.especialidadeGroups.map((group, index) => {
                            const especialidade = group.modalidadeId ? especialidadeByModalidadeId.get(group.modalidadeId) : null;
                            const modalidadeName = modalidadeOptions.find((opt) => opt.value === group.modalidadeId)?.label || '—';
                            return (
                              <Table.Tr key={index}>
                                <Table.Td><Text size="sm">{modalidadeName}</Text></Table.Td>
                                <Table.Td><Text size="sm" c="dimmed">{especialidade?.name || '—'}</Text></Table.Td>
                                <Table.Td>
                                  <Text size="sm" c="dimmed">
                                    {group.registrationNumber
                                      ? `${group.registrationType || 'Registro'} ${group.registrationNumber}${group.registrationState ? `/${group.registrationState}` : ''}`
                                      : '—'}
                                  </Text>
                                </Table.Td>
                                <Table.Td><Text size="sm" c="dimmed">{group.metodos.length > 0 ? group.metodos.join(', ') : '—'}</Text></Table.Td>
                                <Table.Td>
                                  <Text size="sm" c="dimmed">
                                    {(group.branchIds || []).length === 0 || (group.branchIds || []).includes(ALL_BRANCHES_VALUE)
                                      ? 'Todas as unidades'
                                      : (group.branchIds || []).map((id) => branchOptions.find((option) => option.value === id)?.label || id).join(', ')}
                                  </Text>
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'center' }}>
                                  <Group gap={4} justify="center">
                                    <ActionIcon variant="light" color="blue" size="sm" onClick={() => openEditGroupModal(index)}>
                                      <Pencil size={14} />
                                    </ActionIcon>
                                    <ActionIcon variant="light" color="red" size="sm" onClick={() => removeEspecialidadeGroup(index)}>
                                      <Trash size={14} />
                                    </ActionIcon>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  )}
                </Stack>

                <Modal
                  opened={groupModalOpen}
                  onClose={() => setGroupModalOpen(false)}
                  title={editingGroupIndex === null ? 'Adicionar conjunto' : 'Editar conjunto'}
                  size={isMobile ? '100%' : 520}
                  centered
                  fullScreen={isMobile}
                >
                  <Stack gap={10}>
                    <FloatingSelect
                      label="Modalidade"
                      required
                      placeholder="Selecione a modalidade"
                      data={modalidadeOptions}
                      value={groupDraft.modalidadeId}
                      error={groupModalidadeError || undefined}
                      searchable
                      clearable
                      nothingFoundMessage="Nenhuma modalidade encontrada"
                      onChange={handleGroupDraftModalidadeChange}
                    />
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                      <FloatingSelect
                        label="Tipo do registro"
                        required
                        data={crmTypeOptions}
                        value={groupDraft.registrationType}
                        onChange={(value) => setGroupDraft((prev) => ({ ...prev, registrationType: value || '' }))}
                        searchable
                      />
                      <FloatingInput
                        label="Número do registro"
                        required
                        value={groupDraft.registrationNumber}
                        onChange={(event) => {
                          const registrationNumber = event.currentTarget.value;
                          setGroupDraft((prev) => ({ ...prev, registrationNumber }));
                        }}
                      />
                      <FloatingSelect
                        label="UF do registro"
                        required
                        data={statesOptions}
                        value={groupDraft.registrationState}
                        onChange={(value) => setGroupDraft((prev) => ({ ...prev, registrationState: value || '' }))}
                        searchable
                      />
                    </SimpleGrid>
                    <FloatingInput
                      label="Especialidade"
                      value={(groupDraft.modalidadeId ? especialidadeByModalidadeId.get(groupDraft.modalidadeId) : null)?.name || ''}
                      disabled
                      containerProps={{ opacity: 0.7 }}
                      placeholder={groupDraft.modalidadeId ? 'Modalidade sem especialidade cadastrada' : 'Selecione uma modalidade'}
                    />
                    <FloatingMultiSelect
                      label="Métodos"
                      placeholder={!groupDraft.modalidadeId ? 'Selecione uma modalidade primeiro' : 'Selecione os métodos'}
                      data={metodoOptionsForModalidade(groupDraft.modalidadeId)}
                      value={groupDraft.metodos}
                      disabled={!groupDraft.modalidadeId}
                      searchable
                      clearable
                      nothingFoundMessage="Nenhum método disponível"
                      onChange={(values) => setGroupDraft((prev) => ({ ...prev, metodos: values }))}
                    />
                    <FloatingMultiSelect
                      label="Unidades atendidas"
                      placeholder="Selecione as unidades"
                      data={branchOptionsWithAll}
                      value={(groupDraft.branchIds || []).length > 0 ? groupDraft.branchIds : [ALL_BRANCHES_VALUE]}
                      searchable
                      clearable
                      nothingFoundMessage="Nenhuma unidade encontrada"
                      onChange={(values) => setGroupDraft((prev) => ({
                        ...prev,
                        branchIds: values.includes(ALL_BRANCHES_VALUE) ? [ALL_BRANCHES_VALUE] : values,
                      }))}
                    />
                    <Group justify="flex-end" mt={8}>
                      <Button variant="default" onClick={() => setGroupModalOpen(false)} size="sm">
                        Cancelar
                      </Button>
                      <Button bg={DARK_BLUE} onClick={handleSaveGroup} size="sm">
                        {editingGroupIndex === null ? 'Cadastrar' : 'Salvar'}
                      </Button>
                    </Group>
                  </Stack>
                </Modal>

                <Paper withBorder radius="md" p="md" mt="md">
                  <Group justify="space-between" align="flex-start" mb="md">
                    <Box>
                      <Text size="sm" fw={600}>Procedimentos do profissional</Text>
                      <Text size="xs" c="dimmed">Defina o tempo específico de atendimento para cada procedimento.</Text>
                    </Box>
                    <Badge variant="light" color="blue">
                      {form.procedureDurations.length} vinculado(s)
                    </Badge>
                  </Group>

                  {selectedModalidadeIds.size === 0 ? (
                    <Paper withBorder radius="sm" p="md" mt="md" bg="var(--mantine-color-gray-light)">
                      <Text size="sm" c="dimmed" ta="center">Adicione uma modalidade nos conjuntos acima para listar os procedimentos disponíveis.</Text>
                    </Paper>
                  ) : (
                    <SimpleGrid
                      cols={{ base: 1, md: 3 }}
                      spacing="sm"
                      mt="md"
                      style={{
                        alignItems: 'stretch',
                        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 72px minmax(0, 1fr)',
                      }}
                    >
                      <Paper withBorder radius="sm" p="sm">
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" fw={600}>Disponíveis</Text>
                          <Badge variant="light" color="gray">{availableProcedureOptions.length}</Badge>
                        </Group>
                        <FloatingInput
                          label="Buscar procedimento"
                          value={availableProcedureSearch}
                          onChange={(event) => setAvailableProcedureSearch(event.currentTarget.value)}
                          containerProps={{ mb: 'sm' }}
                        />
                        <Box style={{ height: 'min(420px, 45vh)', minHeight: 260, overflowY: 'auto' }}>
                          {filteredAvailableProcedures.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="xl">Nenhum procedimento disponível.</Text>
                          ) : filteredAvailableProcedures.map((option) => {
                            const selected = selectedAvailableProcedureIds.includes(option.value);
                            const procedure = procedureList.find((candidate: any) => String(candidate.id) === option.value);
                            return (
                              <Paper
                                key={option.value}
                                withBorder
                                radius="sm"
                                p="xs"
                                mb={6}
                                onClick={() => setSelectedAvailableProcedureIds((prev) => selected ? prev.filter((id) => id !== option.value) : [...prev, option.value])}
                                style={{
                                  cursor: 'pointer',
                                  borderColor: selected ? 'var(--mantine-color-blue-6)' : undefined,
                                  background: selected ? 'var(--mantine-color-blue-light)' : undefined,
                                }}
                              >
                                <Text size="sm" fw={500}>{option.label}</Text>
                                <Text size="xs" c="dimmed">
                                  {procedure?.durationMinutes ? `${procedure.durationMinutes} min padrão` : 'Sem duração padrão'}
                                </Text>
                              </Paper>
                            );
                          })}
                        </Box>
                      </Paper>

                      <Stack justify="center" align="center" gap="xs" visibleFrom="md">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="lg"
                          disabled={selectedAvailableProcedureIds.length === 0}
                          onClick={moveProceduresToLinked}
                          aria-label="Vincular procedimentos selecionados"
                        >
                          <ChevronRight size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="lg"
                          disabled={availableProcedureOptions.length === 0}
                          onClick={moveAllProceduresToLinked}
                          aria-label="Vincular todos os procedimentos"
                        >
                          <ChevronsRight size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="gray"
                          size="lg"
                          disabled={selectedLinkedProcedureIds.length === 0}
                          onClick={moveProceduresToAvailable}
                          aria-label="Remover procedimentos selecionados"
                        >
                          <ChevronLeft size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="gray"
                          size="lg"
                          disabled={form.procedureDurations.length === 0}
                          onClick={moveAllProceduresToAvailable}
                          aria-label="Remover todos os procedimentos"
                        >
                          <ChevronsLeft size={18} />
                        </ActionIcon>
                      </Stack>

                      <Paper withBorder radius="sm" p="sm" hiddenFrom="md">
                        <Group justify="center" gap="xs">
                          <Button variant="light" leftSection={<ChevronRight size={16} />} disabled={selectedAvailableProcedureIds.length === 0} onClick={moveProceduresToLinked}>
                            Vincular selecionados
                          </Button>
                          <Button variant="light" leftSection={<ChevronsRight size={16} />} disabled={availableProcedureOptions.length === 0} onClick={moveAllProceduresToLinked}>
                            Vincular todos
                          </Button>
                          <Button variant="subtle" leftSection={<ChevronLeft size={16} />} disabled={selectedLinkedProcedureIds.length === 0} onClick={moveProceduresToAvailable}>
                            Remover selecionados
                          </Button>
                          <Button variant="subtle" leftSection={<ChevronsLeft size={16} />} disabled={form.procedureDurations.length === 0} onClick={moveAllProceduresToAvailable}>
                            Remover todos
                          </Button>
                        </Group>
                      </Paper>

                      <Paper withBorder radius="sm" p="sm">
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" fw={600}>Vinculados</Text>
                          <Badge variant="light" color="blue">{form.procedureDurations.length}</Badge>
                        </Group>
                        <FloatingInput
                          label="Buscar vinculados"
                          value={linkedProcedureSearch}
                          onChange={(event) => setLinkedProcedureSearch(event.currentTarget.value)}
                          containerProps={{ mb: 'sm' }}
                        />
                        <Box style={{ height: 'min(420px, 45vh)', minHeight: 260, overflowY: 'auto' }}>
                          {filteredLinkedProcedures.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="xl">Nenhum procedimento vinculado.</Text>
                          ) : filteredLinkedProcedures.map((item) => {
                            const selected = selectedLinkedProcedureIds.includes(item.procedureId);
                            const procedure = procedureList.find((candidate: any) => String(candidate.id) === item.procedureId);
                            const invalidDuration = !Number.isFinite(item.durationMinutes) || item.durationMinutes <= 0;
                            return (
                              <Paper
                                key={item.procedureId}
                                withBorder
                                radius="sm"
                                p="xs"
                                mb={6}
                                onClick={() => setSelectedLinkedProcedureIds((prev) => selected ? prev.filter((id) => id !== item.procedureId) : [...prev, item.procedureId])}
                                style={{
                                  cursor: 'pointer',
                                  borderColor: selected ? 'var(--mantine-color-blue-6)' : undefined,
                                  background: selected ? 'var(--mantine-color-blue-light)' : undefined,
                                }}
                              >
                                <Group justify="space-between" align="center" wrap={isMobile ? 'wrap' : 'nowrap'} gap="sm">
                                  <Box style={{ minWidth: 0, flex: '1 1 140px' }}>
                                    <Text size="sm" fw={500} truncate>{item.procedureName || procedure?.name || 'Procedimento'}</Text>
                                    <Text size="xs" c="dimmed">{procedure?.modalidade?.name || 'Modalidade não informada'}</Text>
                                  </Box>
                                    <Box
                                      onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
                                      style={{
                                        width: 112,
                                        padding: '5px 9px 6px',
                                        borderRadius: 8,
                                        border: `1px solid ${invalidDuration ? 'var(--mantine-color-red-5)' : 'var(--mantine-color-default-border)'}`,
                                        background: isDarkMode ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
                                      }}
                                    >
                                      <Text size="xs" c={invalidDuration ? 'red' : 'dimmed'} mb={2}>Duração</Text>
                                      <Group gap={5} wrap="nowrap" align="center">
                                      <input
                                        aria-label={`Duração de ${item.procedureName || 'procedimento'}`}
                                        type="number"
                                        min={1}
                                        value={String(item.durationMinutes || '')}
                                        onChange={(event) => {
                                          const durationMinutes = Number(event.currentTarget.value);
                                          setForm((prev) => ({
                                            ...prev,
                                            procedureDurations: prev.procedureDurations.map((row) => (
                                              row.procedureId === item.procedureId ? { ...row, durationMinutes } : row
                                            )),
                                          }));
                                        }}
                                        style={{
                                          width: 55,
                                          border: 0,
                                          outline: 0,
                                          background: 'transparent',
                                          color: 'var(--mantine-color-text)',
                                          fontSize: 15,
                                          fontWeight: 600,
                                          textAlign: 'right',
                                        }}
                                      />
                                      <Text size="xs" c="dimmed">min</Text>
                                      </Group>
                                      {invalidDuration ? <Text size="xs" c="red" mt={2}>Informe o tempo</Text> : null}
                                    </Box>
                                </Group>
                              </Paper>
                            );
                          })}
                        </Box>
                      </Paper>
                    </SimpleGrid>
                  )}
                </Paper>

                <Switch
                  mt="md"
                  label="Profissional habilitado para teleconsulta"
                  checked={form.teleconsultationEnabled}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setForm((prev) => ({ ...prev, teleconsultationEnabled: checked }));
                  }}
                />
                <FloatingTextarea
                  label="Biografia"
                  placeholder="Breve descrição profissional"
                  value={form.biography}
                  onChange={(e) => setForm({ ...form, biography: e.currentTarget.value })}
                  minRows={3}
                  mt="md"
                />
                <Stack gap={6} mt="md">
                  <Text size="sm" fw={500}>Assinatura do profissional</Text>
                  <FileInput
                    placeholder="Selecionar assinatura"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(file) => handleSignatureFileChange(file)}
                    clearable
                  />
                  <Text size="xs" c="dimmed">Formatos aceitos: PNG/JPG. Tamanho máximo: 300 KB.</Text>
                  {form.signatureImageBase64 ? (
                    <Text size="xs" c="green">Assinatura carregada.</Text>
                  ) : null}
                  {form.signatureImageBase64 ? (
                    <Group justify="flex-start">
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => setForm((prev) => ({ ...prev, signatureImageBase64: '' }))}
                      >
                        Remover assinatura
                      </Button>
                    </Group>
                  ) : null}
                  {form.signatureImageBase64 ? (
                    <Paper withBorder radius="sm" p="xs" bg={isDarkMode ? 'dark.6' : 'gray.0'}>
                      <Text size="xs" c="dimmed" mb={6}>Pré-visualização da assinatura</Text>
                      <Box
                        style={{
                          minHeight: 64,
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'flex-start',
                        }}
                      >
                        <img
                          src={form.signatureImageBase64}
                          alt="Assinatura do profissional"
                          style={{
                            maxWidth: '100%',
                            maxHeight: 72,
                            objectFit: 'contain',
                            objectPosition: 'left bottom',
                          }}
                        />
                      </Box>
                    </Paper>
                  ) : null}
                </Stack>
              </Paper>

              {/* Endereço */}
              <Paper p="md" withBorder radius="md">
                <SectionTitle>Endereço</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                  <FloatingInput
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
                  <FloatingInput label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }} />
                  <FloatingInput label="Número" value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.currentTarget.value })} />
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
                  <FloatingInput label="Complemento" value={form.addressComplement} onChange={(e) => setForm({ ...form, addressComplement: e.currentTarget.value })} />
                  <FloatingInput label="Bairro" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.currentTarget.value })} />
                  <FloatingInput label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.currentTarget.value })} />
                  <FloatingSelect
                    label="Estado"
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
                        <FloatingMultiSelect
                          label="Dias de trabalho"
                          data={daysOptions}
                          value={schedule.days}
                          onChange={(v) => {
                            const updated = [...form.workingSchedules];
                            updated[idx].days = v;
                            setForm({ ...form, workingSchedules: updated });
                          }}
                        />
                        <FloatingInput
                          label="Horário início"
                          placeholder="08:00"
                          value={schedule.hoursStart}
                          onChange={(e) => {
                            const updated = [...form.workingSchedules];
                            updated[idx].hoursStart = e.currentTarget.value;
                            setForm({ ...form, workingSchedules: updated });
                          }}
                        />
                        <FloatingInput
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
                  {isEditing ? 'Salvar alterações' : 'Salvar'}
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="lista" pt={0}>
            <Paper p="md" withBorder radius="md">
              <Group justify="space-between" mb="md" wrap="wrap">
                <SectionTitle>Profissionais cadastrados</SectionTitle>
                <FloatingInput
                  label="Buscar profissionais"
                  value={doctorQuery}
                  onChange={(e) => setDoctorQuery(e.currentTarget.value)}
                  containerProps={{ w: isMobile ? '100%' : 320 }}
                />
              </Group>

              {doctorsLoading ? (
                isMobile ? (
                  <Stack gap="sm">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <Paper key={idx} withBorder radius="md" p="md">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Stack gap={8} style={{ flex: 1 }}>
                            <Skeleton height={18} width="52%" radius="sm" />
                            <Skeleton height={14} width="38%" radius="sm" />
                            <Skeleton height={14} width="46%" radius="sm" />
                          </Stack>
                          <Stack gap={8} align="flex-end">
                            <Skeleton height={24} width={82} radius="xl" />
                            <Group gap={8}>
                              <Skeleton height={28} width={28} radius="xl" />
                              <Skeleton height={28} width={28} radius="xl" />
                              <Skeleton height={28} width={28} radius="xl" />
                            </Group>
                          </Stack>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                    <Table horizontalSpacing="md" verticalSpacing="md">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Nome</Table.Th>
                          <Table.Th>CRM</Table.Th>
                          <Table.Th>Especialidade</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th style={{ textAlign: 'center', width: 96 }}>Ações</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Table.Tr key={idx}>
                            <Table.Td><Skeleton height={16} width="70%" radius="sm" /></Table.Td>
                            <Table.Td><Skeleton height={16} width="60%" radius="sm" /></Table.Td>
                            <Table.Td><Skeleton height={16} width="72%" radius="sm" /></Table.Td>
                            <Table.Td><Skeleton height={24} width={78} radius="xl" /></Table.Td>
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <Skeleton height={28} width={28} radius="xl" />
                                <Skeleton height={28} width={28} radius="xl" />
                                <Skeleton height={28} width={28} radius="xl" />
                                <Skeleton height={28} width={28} radius="xl" />
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Box>
                )
              ) : (
                isMobile ? (
                  filteredDoctors.length === 0 ? (
                    <Paper withBorder radius="md" p="xl">
                      <Text size="sm" c="dimmed" ta="center">
                        Nenhum profissional encontrado. Ajuste a busca ou cadastre um novo profissional.
                      </Text>
                    </Paper>
                  ) : (
                    <Stack gap="sm">
                      {filteredDoctors.map((item) => (
                        <Paper key={item.id} withBorder radius="md" p="md">
                          <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Stack gap={4} style={{ flex: 1 }}>
                              <Text fw={600} size="sm">{item.name}</Text>
                              <Text size="xs" c="dimmed">
                                {item.crm ? `${item.crm}${item.crmState ? `/${item.crmState}` : ''}` : 'CRM não informado'}
                              </Text>
                              <Text size="xs" c="dimmed">{item.specialty || 'Especialidade não informada'}</Text>
                            </Stack>
                            <Badge color={item.isActive ? 'green' : 'red'} variant="light" size="sm">
                              {item.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </Group>
                          <Group justify="flex-end" mt="md">
                            <Menu shadow="md" width={210} position="bottom-end" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações do profissional">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<Eye size={14} />} onClick={() => handleViewDoctor(item)}>
                                  Visualizar
                                </Menu.Item>
                                <Menu.Item leftSection={<Pencil size={14} />} onClick={() => handleEditDoctor(item)}>
                                  Editar
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<Power size={14} />}
                                  color={item.isActive ? 'orange' : 'green'}
                                  onClick={() => handleToggleActive(item)}
                                >
                                  {item.isActive ? 'Desativar' : 'Ativar'}
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<Trash size={14} />}
                                  color="red"
                                  onClick={() => {
                                    setDeleteTarget(item);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  Excluir
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  )
                ) : (
                  <PaginatedGrid
                    totalItems={filteredDoctors.length}
                    page={doctorPage}
                    pageSize={doctorPageSize}
                    onPageChange={setDoctorPage}
                    onPageSizeChange={setDoctorPageSize}
                    isMobile={isMobile}
                    maxHeight={isMobile ? 500 : 620}
                    showFooter
                  >
                    <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                      <Table.Thead>
                        <Table.Tr style={{ borderBottom: 'none' }}>
                          <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>CRM</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Especialidade</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                          <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center', width: 96 }}>Ações</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredDoctors.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={isTablet ? 2 : 5}>
                              <Text size="sm" c="dimmed" ta="center">
                                Nenhum profissional encontrado. Ajuste a busca ou cadastre um novo profissional.
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          paginatedDoctors.map((item) => (
                            <Table.Tr key={item.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text fw={600} size="sm">{item.name}</Text>
                                  <Text size="xs" c="dimmed">
                                    {item.crm ? `${item.crm}${item.crmState ? `/${item.crmState}` : ''}` : 'CRM não informado'}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="sm">{item.crm ? `${item.crm}${item.crmState ? `/${item.crmState}` : ''}` : '-'}</Text>
                                </Table.Td>
                              )}
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="sm" c={item.specialty ? 'var(--mantine-color-text)' : 'dimmed'}>
                                    {item.specialty || 'Especialidade não informada'}
                                  </Text>
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
                              <Table.Td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <Group justify="center" align="center">
                                  <Menu shadow="md" width={220} position="bottom-end" withArrow>
                                    <Menu.Target>
                                      <ActionIcon variant="light" size="sm" aria-label="Ações do profissional">
                                        <MoreVertical size={16} />
                                      </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                      <Menu.Item leftSection={<Eye size={14} />} onClick={() => handleViewDoctor(item)}>
                                        Visualizar
                                      </Menu.Item>
                                      <Menu.Item leftSection={<Pencil size={14} />} onClick={() => handleEditDoctor(item)}>
                                        Editar
                                      </Menu.Item>
                                      <Menu.Item
                                        leftSection={<Power size={14} />}
                                        color={item.isActive ? 'orange' : 'green'}
                                        onClick={() => handleToggleActive(item)}
                                      >
                                        {item.isActive ? 'Desativar' : 'Ativar'}
                                      </Menu.Item>
                                      <Menu.Item
                                        leftSection={<Trash size={14} />}
                                        color="red"
                                        onClick={() => {
                                          setDeleteTarget(item);
                                          setDeleteConfirmOpen(true);
                                        }}
                                      >
                                        Excluir
                                      </Menu.Item>
                                    </Menu.Dropdown>
                                  </Menu>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </PaginatedGrid>
                )
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
          </>
        )}

        <Modal
          opened={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          title="Detalhes do profissional"
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
                <Text fw={600} span>Registro/UF:</Text>{' '}
                {(() => {
                  const type = selectedDoctor?.raw?.crmType ? String(selectedDoctor.raw.crmType) : 'CRM';
                  const crm = selectedDoctor?.raw?.crm ? String(selectedDoctor.raw.crm) : '';
                  const uf = selectedDoctor?.raw?.crmState || selectedDoctor?.raw?.ufCrm || '';
                  if (!crm && !uf) return '-';
                  return `${type} ${crm}${uf ? `/${uf}` : ''}`;
                })()}
              </Text>
              <Text size="sm"><Text fw={600} span>Especialidade:</Text> {formatDetailValue(selectedDoctor?.raw?.specialty)}</Text>
              <Text size="sm"><Text fw={600} span>Teleconsulta:</Text> {Array.isArray(selectedDoctor?.raw?.specialties) && (selectedDoctor?.raw?.specialties as unknown[]).some((item) => String(item) === TELECONSULTATION_SPECIALTY_FLAG) ? 'Habilitado' : 'Desabilitado'}</Text>
              <Text size="sm"><Text fw={600} span>Assinatura:</Text> {selectedDoctor?.raw?.signatureImageBase64 ? 'Cadastrada' : '-'}</Text>
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
          title="Profissional cadastrado"
          message={lastCreatedName ? `${lastCreatedName} foi cadastrado com sucesso.` : 'Profissional cadastrado com sucesso.'}
          primary={{ label: 'Cadastrar novo', onClick: () => { setForm({ ...INITIAL_DOCTOR_FORM }); setShowSuccessModal(false); } }}
          secondary={{ label: 'Voltar para o dashboard', onClick: () => { setShowSuccessModal(false); navigate('/dashboard'); } }}
        />

        <ResultModal opened={showErrorModal} onClose={() => setShowErrorModal(false)} variant="error" title="Erro ao cadastrar profissional" message={errorMessage || 'Erro ao registrar profissional'} secondary={{ label: 'Fechar', onClick: () => setShowErrorModal(false) }} />

        <ResultModal
          opened={deleteConfirmOpen}
          onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
          variant="error"
          title="Confirmar exclusão"
          message={`Tem certeza que deseja excluir ${deleteTarget?.name || 'este profissional'}?`}
          primary={{ label: 'Excluir', onClick: () => { if (deleteTarget) handleDeleteDoctor(deleteTarget); } }}
          secondary={{ label: 'Cancelar', onClick: () => { setDeleteConfirmOpen(false); setDeleteTarget(null); } }}
        />
      </Box>
    </Box>
  );
}
