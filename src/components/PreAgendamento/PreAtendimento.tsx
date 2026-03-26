import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Table,
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  ActionIcon,
  Tabs,
  Checkbox,
  Badge,
  Divider,
  NumberInput,
  Paper,
  Skeleton,
  SimpleGrid,
  Grid,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, ChevronLeft, Lock, ClipboardCheck, Camera, Upload, Wallet, CreditCard, QrCode, Eye } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { FloatingInput } from '../common/FloatingInput';
import { FacialCapture } from '../common/FacialCapture';
import preAttendanceService from '../../services/preAttendanceService';
import patientService from '../../services/patientService';
import invoiceService from '../../services/invoiceService';
import facialRecognitionService from '../../services/facialRecognitionService';
import consultationService from '../../services/consultationService';
import convenioAuthorizationService, { type ConvenioAuthorizationAttachment } from '../../services/convenioAuthorizationService';
import { formatCPF, formatDateInput, formatPhone, onlyDigits } from '../../utils/formatters';
import { fetchReceptionQueue, useReceptionQueueQuery } from '../../hooks/useReceptionQueueQuery';
import { usePatientsAdminQuery } from '../../hooks/usePatientsAdminQuery';
import { useInsurancesAdminQuery } from '../../hooks/useInsurancesAdminQuery';
import { queryKeys } from '../../lib/queryKeys';
import type { ChangeEvent } from 'react';

interface Patient extends NovoPatiente {
  id: string;
  patientId?: string;
  appointmentId?: string;
  doctorId?: string;
  doctorName?: string;
  totem?: number;
  status?: string;
  fila?: string;
  tipoFila?: string;
  agenda?: string;
}

interface NovoPatiente {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  sexo: string;
  telefone: string;
  email: string;
  endereco: string;
  convenio: string;
  tipoConvenio: string;
  validadeConvenio: string;
  numCarteira: string;
  statusAutorizacao: string;
  observacoesConvenio: string;
  pressaoArterial: string;
  frequenciaCardiaca: string;
  temperatura: string;
  saturacao: string;
  peso: string;
  altura: string;
  glicemia: string;
  imc: string;
  queixaPrincipal: string;
  historiaDoenca: string;
  alergias: string;
  medicamentos: string;
  antecedentes: string;
  observacoesTriagem: string;
  observacoes: string;
}

const INITIAL_NOVO_PACIENTE: NovoPatiente = {
  nomeCompleto: '',
  cpf: '',
  dataNascimento: '',
  sexo: '',
  telefone: '',
  email: '',
  endereco: '',
  convenio: '',
  tipoConvenio: '',
  validadeConvenio: '',
  numCarteira: '',
  statusAutorizacao: '',
  observacoesConvenio: '',
  pressaoArterial: '',
  frequenciaCardiaca: '',
  temperatura: '',
  saturacao: '',
  peso: '',
  altura: '',
  glicemia: '',
  imc: '',
  queixaPrincipal: '',
  historiaDoenca: '',
  alergias: '',
  medicamentos: '',
  antecedentes: '',
  observacoesTriagem: '',
  observacoes: '',
};

export function PreAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { colorScheme } = useMantineColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState<NovoPatiente>(INITIAL_NOVO_PACIENTE);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);
  const [patientById, setPatientById] = useState<Record<string, any>>({});
  const [insuranceOptions, setInsuranceOptions] = useState<{ value: string; label: string }[]>([]);
  const [insurancesLoading, setInsurancesLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [, setChecklistStep] = useState(0);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistPatient, setChecklistPatient] = useState<Patient | null>(null);
  const [checklistPreAttendanceId, setChecklistPreAttendanceId] = useState<string | null>(null);
  const [facialValidationOpen, setFacialValidationOpen] = useState(false);
  const [facialValidationLoading, setFacialValidationLoading] = useState(false);
  const [facialValidationVerified, setFacialValidationVerified] = useState(false);
  const [facialValidationTrust, setFacialValidationTrust] = useState<number | null>(null);
  const [facialValidationName, setFacialValidationName] = useState('');
  const [checklistAttachments, setChecklistAttachments] = useState<ConvenioAuthorizationAttachment[]>([]);
  const [checklistAttachmentsLoading, setChecklistAttachmentsLoading] = useState(false);
  const [checklistAttachmentUploading, setChecklistAttachmentUploading] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [checklistData, setChecklistData] = useState({
    dadosConferidos: false,
    contatoConferido: false,
    guiaNumero: '',
    atendimentoParticular: false,
    pagamentoRealizado: false,
    valorPagamento: 0,
    formaPagamento: '',
    agendaConferida: false,
    observacoes: '',
  });
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const RECEPTION_IN_PROGRESS_STATUS = 'Em atendimento na recepção';
  const RECEPTION_CHECKLIST_STATUS = 'Checklist em andamento';
  const RECEPTION_DONE_STATUS = 'Recepção concluída';
  const ACTIVE_RECEPTION_STATUSES = [RECEPTION_IN_PROGRESS_STATUS, RECEPTION_CHECKLIST_STATUS];
  const receptionQueueQuery = useReceptionQueueQuery();
  const patientsQuery = usePatientsAdminQuery();
  const insurancesQuery = useInsurancesAdminQuery();
  const checklistFieldLabelStyle = {
    fontSize: '0.95rem',
    color: 'var(--mantine-color-text)',
    opacity: 0.78,
    marginBottom: 2,
  } as const;
  const checklistFieldValueStyle = {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.3,
  } as const;
  const checklistUnderlineStyle = {
    borderBottom: '1px solid var(--mantine-color-default-border)',
    paddingBottom: 2,
    minHeight: 26,
  } as const;
  const paymentChoiceStyle = (selected: boolean) => ({
    minHeight: isMobile ? 64 : 86,
    borderRadius: 10,
    border: isDarkMode
      ? `1px solid ${selected ? '#0b4ec2' : '#0b3b93'}`
      : '1px solid rgba(8, 31, 84, 0.08)',
    background: isDarkMode
      ? selected ? '#123b86' : '#0b2c6d'
      : selected ? '#0b2f78' : '#0d3178',
    color: 'white',
    boxShadow: isDarkMode
      ? selected ? '0 8px 24px rgba(0, 31, 84, 0.18)' : 'none'
      : '0 10px 24px rgba(11, 47, 120, 0.14)',
  });
  const checklistCardStyle = {
    borderColor: isDarkMode ? '#0b3b93' : 'rgba(15, 38, 84, 0.14)',
    background: isDarkMode ? 'rgba(10, 17, 40, 0.18)' : '#ffffff',
    boxShadow: isDarkMode ? 'none' : '0 6px 18px rgba(16, 24, 40, 0.08)',
  } as const;
  const checklistMutedBlueStyle = {
    color: isDarkMode ? '#7f97ea' : '#6f8eef',
  } as const;
  const checklistUploadBoxStyle = {
    minHeight: 72,
    borderStyle: 'solid',
    borderColor: isDarkMode ? 'rgba(159, 178, 223, 0.42)' : 'rgba(15, 38, 84, 0.12)',
    justifyContent: 'center',
    background: isDarkMode ? 'rgba(10, 17, 40, 0.22)' : '#ffffff',
  } as const;
  function isPrivateCare(patient: Patient | null) {
    const convenio = (patient?.convenio || '').trim().toLowerCase();
    return !convenio || convenio === 'particular';
  }

  const getReceptionStatusColor = (status?: string) => {
    const normalized = String(status || '').trim();
    if (normalized === RECEPTION_IN_PROGRESS_STATUS) return 'blue';
    if (normalized === RECEPTION_CHECKLIST_STATUS) return 'violet';
    if (normalized === RECEPTION_DONE_STATUS) return 'green';
    return 'gray';
  };

  const hasValidPreAttendanceId = (value?: string | null) => {
    const normalized = String(value || '').trim();
    return Boolean(normalized) && !normalized.startsWith('tmp-');
  };

  const canEditPayment = checklistData.atendimentoParticular;
  const invalidateReceptionQueue = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.receptionQueue });
  };

  const extractDoctorNameFromAgenda = (agenda?: string | null) => {
    const value = String(agenda || '').trim();
    if (!value) return '';
    const parts = value.split('Ã¢â‚¬Â¢').map((item) => item.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    return parts[parts.length - 1];
  };

  const resetChecklist = () => {
    setChecklistStep(0);
    setChecklistPatient(null);
    setChecklistPreAttendanceId(null);
    setChecklistAttachments([]);
    setChecklistAttachmentsLoading(false);
    setChecklistAttachmentUploading(false);
    setOpeningAttachmentId(null);
    setFacialValidationOpen(false);
    setFacialValidationLoading(false);
    setFacialValidationVerified(false);
    setFacialValidationTrust(null);
    setFacialValidationName('');
    setChecklistData({
      dadosConferidos: false,
      contatoConferido: false,
      guiaNumero: '',
      atendimentoParticular: false,
      pagamentoRealizado: false,
      valorPagamento: 0,
      formaPagamento: '',
      agendaConferida: false,
      observacoes: '',
    });
  };

  const canCompleteChecklist = () => {
    const basicChecks = checklistData.dadosConferidos && checklistData.contatoConferido;
    const authorizationChecks = checklistData.atendimentoParticular
      ? checklistData.pagamentoRealizado && checklistData.valorPagamento > 0 && checklistData.formaPagamento.trim().length > 0
      : checklistData.guiaNumero.trim().length > 0;

    return basicChecks && authorizationChecks && checklistData.agendaConferida && facialValidationVerified;
  };

  const fileToBase64 = async (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const loadChecklistAttachments = async (appointmentId?: string | null) => {
    if (!appointmentId) {
      setChecklistAttachments([]);
      return;
    }

    try {
      setChecklistAttachmentsLoading(true);
      const response = await convenioAuthorizationService.listAttachments('APPOINTMENT', appointmentId);
      setChecklistAttachments(response?.items || []);
    } catch {
      setChecklistAttachments([]);
    } finally {
      setChecklistAttachmentsLoading(false);
    }
  };

  const handleChecklistAttachmentSelect = async (file: File | null) => {
    if (!file || !checklistPatient?.appointmentId) return;

    try {
      setChecklistAttachmentUploading(true);
      const fileBase64 = await fileToBase64(file);
      await convenioAuthorizationService.uploadAttachment('APPOINTMENT', checklistPatient.appointmentId, {
        fileName: file.name,
        fileBase64,
        mimeType: file.type || undefined,
      });
      showNotification({
        title: 'Anexo enviado',
        message: `${file.name} anexado com sucesso.`,
        color: 'green',
      });
      await loadChecklistAttachments(checklistPatient.appointmentId);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao anexar',
        message: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Falha ao anexar documento',
        color: 'red',
      });
    } finally {
      setChecklistAttachmentUploading(false);
    }
  };

  const handleOpenChecklistAttachment = async (attachmentId: string) => {
    try {
      setOpeningAttachmentId(attachmentId);
      const blob = await convenioAuthorizationService.viewAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao abrir anexo',
        message: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Não foi possível abrir o anexo.',
        color: 'red',
      });
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const getAgendaSummary = (agenda?: string | null) => {
    const value = String(agenda || '').trim();
    if (!value) {
      return {
        horario: 'Não informado',
        procedimento: 'Não informado',
      };
    }

    const parts = value.split(' • ').map((item) => item.trim()).filter(Boolean);
    return {
      horario: parts[0] || value,
      procedimento: parts[1] || value,
    };
  };

  const getChecklistAppointmentDate = (patient: Patient | null) => {
    const rawDate = (patient as any)?.appointmentDate || (patient as any)?.date || (patient as any)?.scheduledDate;
    return formatDateDisplay(rawDate) || 'Não informada';
  };

  const normalizeComparableText = (value?: string | null): string => {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  };

  const parseDisplayDateToApi = (value?: string | null) => {
    const normalized = String(value || '').trim();
    const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return undefined;
    return `${match[3]}-${match[2]}-${match[1]}`;
  };

  const normalizeChecklistGenderForApi = (value?: string | null) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return undefined;
    if (normalized === 'M' || normalized === 'MASCULINO' || normalized === 'MALE') return 'MALE';
    if (normalized === 'F' || normalized === 'FEMININO' || normalized === 'FEMALE') return 'FEMALE';
    if (normalized === 'O' || normalized === 'OUTRO' || normalized === 'OTHER') return 'OTHER';
    return undefined;
  };

  const updateChecklistPatientField = <K extends keyof Patient>(field: K, value: Patient[K]) => {
    setChecklistPatient((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateChecklistAgendaPart = (part: 'horario' | 'procedimento' | 'profissional', value: string) => {
    setChecklistPatient((prev) => {
      if (!prev) return prev;

      const summary = getAgendaSummary(prev.agenda);
      const currentHorario = normalizeComparableText(summary.horario) === 'nao informado' ? '' : summary.horario;
      const currentProcedimento = normalizeComparableText(summary.procedimento) === 'nao informado' ? '' : summary.procedimento;
      const currentProfissional = extractDoctorNameFromAgenda(prev.agenda) || prev.doctorName || '';

      const nextHorario = part === 'horario' ? value : currentHorario;
      const nextProcedimento = part === 'procedimento' ? value : currentProcedimento;
      const nextProfissional = part === 'profissional' ? value : currentProfissional;

      return {
        ...prev,
        agenda: [nextHorario, nextProcedimento, nextProfissional]
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .join(' • '),
        doctorName: nextProfissional || prev.doctorName,
      };
    });
  };

  const loadReceptionPatients = async () => {
    try {
      await receptionQueueQuery.refetch();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes',
        color: 'red',
      });
    }
  };

  const formatDateDisplay = (value?: string) => {
    if (!value) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [y, m, d] = value.split('T')[0].split('-');
      return `${d}/${m}/${y}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isSameReceptionPatient = (left: Patient, right: Patient) => {
    const leftAppointmentId = String(left.appointmentId || '').trim();
    const rightAppointmentId = String(right.appointmentId || '').trim();
    if (leftAppointmentId && rightAppointmentId && leftAppointmentId === rightAppointmentId) return true;

    const leftPatientId = String(left.patientId || '').trim();
    const rightPatientId = String(right.patientId || '').trim();
    if (leftPatientId && rightPatientId && leftPatientId === rightPatientId) return true;

    const leftCpf = onlyDigits(left.cpf || '');
    const rightCpf = onlyDigits(right.cpf || '');
    if (leftCpf && rightCpf && leftCpf === rightCpf) return true;

    return false;
  };

  const dedupeReceptionPatients = (items: Patient[]): Patient[] => {
    const deduped: Patient[] = [];

    for (const item of items) {
      const existingIndex = deduped.findIndex((current) => isSameReceptionPatient(current, item));
      if (existingIndex === -1) {
        deduped.push(item);
        continue;
      }

      const existing = deduped[existingIndex];
      const shouldReplace =
        (!hasValidPreAttendanceId(existing.id) && hasValidPreAttendanceId(item.id))
        || ((existing.status || '') !== RECEPTION_CHECKLIST_STATUS && (item.status || '') === RECEPTION_CHECKLIST_STATUS);

      if (shouldReplace) {
        deduped[existingIndex] = item;
      }
    }

    return deduped;
  };

  const mapApiToPatient = (it: any): Patient => {
    const raw = it?.item || it?.data || it;
    const id = raw?.id || raw?.preAttendanceId || raw?.pre_attendance_id || raw?.preAttendance?.id || raw?.pre_attendance?.id || '';
    const nomeCompleto = (raw?.fullName || raw?.full_name || raw?.name || raw?.patientName || raw?.patient_name || raw?.patient?.name || '').toString().trim();

    return {
      id: String(id),
      patientId: raw?.patientId || raw?.patient_id || raw?.patient?.id || undefined,
      appointmentId: raw?.appointmentId || raw?.appointment_id || undefined,
      nomeCompleto,
      cpf: raw?.cpf || raw?.patientCpf || raw?.patient_cpf || raw?.patient?.cpf || '',
      dataNascimento: raw?.birthDate || raw?.birth_date || '',
      sexo: raw?.gender || raw?.sexo || '',
      telefone: raw?.phone || raw?.cellphone || '',
      email: raw?.email || '',
      endereco: raw?.address || raw?.endereco || '',
      convenio: raw?.convenio || raw?.insurance || raw?.healthInsuranceName || '',
      tipoConvenio: raw?.convenioType || raw?.convenio_type || '',
      validadeConvenio: raw?.convenioValidUntil || raw?.convenio_valid_until || raw?.healthInsuranceExpiry || raw?.healthInsuranceValidity || '',
      numCarteira: raw?.convenioNumber || raw?.convenio_number || raw?.healthInsuranceNumber || '',
      statusAutorizacao: raw?.convenioStatus || raw?.convenio_status || '',
      observacoesConvenio: raw?.convenioNotes || raw?.convenio_notes || '',
      pressaoArterial: raw?.bloodPressure || raw?.blood_pressure || '',
      frequenciaCardiaca: raw?.heartRate || raw?.heart_rate || '',
      temperatura: raw?.temperature || '',
      saturacao: raw?.oxygenSaturation || raw?.oxygen_saturation || '',
      peso: raw?.weight || '',
      altura: raw?.height || '',
      glicemia: raw?.glucose || '',
      imc: raw?.bmi || '',
      queixaPrincipal: raw?.mainComplaint || raw?.main_complaint || '',
      historiaDoenca: raw?.diseaseHistory || raw?.disease_history || '',
      alergias: raw?.allergies || '',
      medicamentos: raw?.medications || '',
      antecedentes: raw?.antecedentes || '',
      observacoesTriagem: raw?.triageNotes || raw?.triage_notes || '',
      observacoes: raw?.notes || raw?.observacoes || '',
      totem: raw?.totem ?? undefined,
      status: raw?.status || '',
      fila: raw?.queue || raw?.fila || '',
      tipoFila: raw?.queueType || raw?.queue_type || raw?.tipoFila || '',
      agenda: raw?.agenda || '',
      doctorId: raw?.doctorId || raw?.doctor_id || raw?.doctor?.id || '',
      doctorName: raw?.doctorName || raw?.doctor_name || raw?.doctor?.name || '',
    };
  };

  const resolvePatientWithValidPreAttendanceId = async (patient: Patient): Promise<Patient | null> => {
    if (hasValidPreAttendanceId(patient.id)) return patient;

    try {
      const list = await queryClient.fetchQuery({
        queryKey: queryKeys.receptionQueue,
        queryFn: fetchReceptionQueue,
      });
      const mapped = dedupeReceptionPatients(
        list
          .map(mapApiToPatient)
          .filter((item: Patient) => ACTIVE_RECEPTION_STATUSES.includes(item.status || '')),
      );

      if (mapped.length > 0) {
        setPatients(dedupeReceptionPatients(mapped.filter((item) => hasValidPreAttendanceId(item.id))));
      }

      return mapped.find((item) => hasValidPreAttendanceId(item.id) && isSameReceptionPatient(item, patient)) || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const mapped = dedupeReceptionPatients(
      ((receptionQueueQuery.data as any[]) || [])
        .map(mapApiToPatient)
        .filter((item) => hasValidPreAttendanceId(item.id))
        .filter((item) => ACTIVE_RECEPTION_STATUSES.includes(item.status || '')),
    );
    setPatients(mapped);
  }, [receptionQueueQuery.data]);

  useEffect(() => {
    setPatientsLoading(patientsQuery.isFetching);
  }, [patientsQuery.isFetching]);

  useEffect(() => {
    setInsurancesLoading(insurancesQuery.isFetching);
  }, [insurancesQuery.isFetching]);

  useEffect(() => {
    if (!patientsQuery.error) return;
    const err: any = patientsQuery.error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes',
      color: 'red',
    });
  }, [patientsQuery.error]);

  useEffect(() => {
    if (!insurancesQuery.error) return;
    const err: any = insurancesQuery.error;
    showNotification({
      title: 'Erro',
      message: err?.response?.data?.message || err?.message || 'Erro ao carregar convênios',
      color: 'red',
    });
  }, [insurancesQuery.error]);

  useEffect(() => {
    const data: any = patientsQuery.data;
    const listRaw = Array.isArray(data)
      ? data
      : (Array.isArray(data?.patients)
        ? data.patients
        : (Array.isArray(data?.data?.patients)
          ? data.data.patients
          : (Array.isArray(data?.data)
            ? data.data
            : (Array.isArray(data?.items) ? data.items : []))));

    const list: any[] = Array.isArray(listRaw) ? listRaw : [];
    const options = list.map((p: any) => {
      const id = String(p.id ?? p.patientId ?? '');
      const name = (p.name || p.fullName || p.patientName || p.email || p.cpf || '').toString().trim();
      const label = name || 'Paciente';
      return { value: id || label, label };
    });

    const byId: Record<string, any> = {};
    list.forEach((p: any) => {
      const id = String(p.id ?? p.patientId ?? '');
      if (id) byId[id] = p;
    });

    setPatientById(byId);
    setPatientOptions(options);
  }, [patientsQuery.data]);

  useEffect(() => {
    const data: any = insurancesQuery.data;
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
      .filter((it: any) => it?.isActive !== false)
      .map((it: any) => {
        const name = (it.name || it.nome || '').toString().trim();
        return name ? { value: name, label: name } : null;
      })
      .filter(Boolean) as { value: string; label: string }[];

    setInsuranceOptions(options);
  }, [insurancesQuery.data]);

  const filteredPatients = patients.filter((patient) => {
    const q = searchValue.toLowerCase();
    const totemValue = patient.totem !== undefined ? String(patient.totem) : '';
    return patient.nomeCompleto.toLowerCase().includes(q) || totemValue.includes(searchValue);
  });

  const receptionQueueLoading = receptionQueueQuery.isLoading && patients.length === 0;

  const renderReceptionAction = (patient: Patient) => {
    const isChecklistInProgress = (patient.status || '').trim() === RECEPTION_CHECKLIST_STATUS;

    return (
      <Button
        size="xs"
        variant={isChecklistInProgress ? 'filled' : 'light'}
        color={isChecklistInProgress ? 'violet' : 'blue'}
        leftSection={<ClipboardCheck size={14} />}
        onClick={() => handleStartChecklist(patient)}
        loading={checklistLoading && checklistPreAttendanceId === patient.id}
      >
        {isChecklistInProgress ? 'Continuar checklist' : 'Iniciar checklist'}
      </Button>
    );
  };

  const handleAddPatient = async () => {
    if (!novoPaciente.nomeCompleto || !novoPaciente.cpf) {
      alert('Por favor, preencha os campos obrigatórios');
      return;
    }

    const payload = {
      patientId: selectedPatientId || undefined,
      fullName: novoPaciente.nomeCompleto,
      cpf: onlyDigits(novoPaciente.cpf),
      birthDate: novoPaciente.dataNascimento || undefined,
      gender: novoPaciente.sexo || undefined,
      phone: onlyDigits(novoPaciente.telefone) || undefined,
      email: novoPaciente.email || undefined,
      address: novoPaciente.endereco || undefined,
      convenio: novoPaciente.convenio || undefined,
      convenioType: novoPaciente.tipoConvenio || undefined,
      convenioValidUntil: novoPaciente.validadeConvenio || undefined,
      convenioNumber: novoPaciente.numCarteira || undefined,
      convenioStatus: novoPaciente.statusAutorizacao || undefined,
      convenioNotes: novoPaciente.observacoesConvenio || undefined,
      bloodPressure: novoPaciente.pressaoArterial || undefined,
      heartRate: novoPaciente.frequenciaCardiaca || undefined,
      temperature: novoPaciente.temperatura || undefined,
      oxygenSaturation: novoPaciente.saturacao || undefined,
      weight: novoPaciente.peso || undefined,
      height: novoPaciente.altura || undefined,
      glucose: novoPaciente.glicemia || undefined,
      bmi: novoPaciente.imc || undefined,
      mainComplaint: novoPaciente.queixaPrincipal || undefined,
      diseaseHistory: novoPaciente.historiaDoenca || undefined,
      allergies: novoPaciente.alergias || undefined,
      medications: novoPaciente.medicamentos || undefined,
      antecedentes: novoPaciente.antecedentes || undefined,
      triageNotes: novoPaciente.observacoesTriagem || undefined,
      notes: novoPaciente.observacoes || undefined,
    };

    if (isEditing && editingPatientId !== null) {
      try {
        const updated = await preAttendanceService.update(editingPatientId, payload);
        setPatients((prev) => prev.map((p) => (p.id === editingPatientId ? mapApiToPatient(updated) : p)));
        await invalidateReceptionQueue();
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao atualizar paciente',
          color: 'red',
        });
        return;
      }
    } else {
      try {
        let createdPatientId = selectedPatientId;

        if (!createdPatientId) {
          const toIsoDate = (value?: string) => {
            if (!value) return undefined;
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
            const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (!m) return undefined;
            return `${m[3]}-${m[2]}-${m[1]}`;
          };

          const genderMap: Record<string, string> = { M: 'MALE', F: 'FEMALE', O: 'OTHER' };
          const gender = genderMap[novoPaciente.sexo] || undefined;

          const createdPatient = await patientService.createPatient({
            name: novoPaciente.nomeCompleto,
            cpf: onlyDigits(novoPaciente.cpf),
            birthDate: toIsoDate(novoPaciente.dataNascimento),
            gender,
            phone: onlyDigits(novoPaciente.telefone) || undefined,
            email: novoPaciente.email || undefined,
            address: novoPaciente.endereco || undefined,
            healthInsuranceName: novoPaciente.convenio || undefined,
            healthInsuranceNumber: novoPaciente.numCarteira || undefined,
            healthInsuranceExpiry: toIsoDate(novoPaciente.validadeConvenio),
            observations: novoPaciente.observacoes || undefined,
          } as any);

          createdPatientId = String(createdPatient?.id ?? createdPatient?.patientId ?? '');
        }

        const created = await preAttendanceService.create({
          ...payload,
          patientId: createdPatientId || undefined,
          totem: Math.floor(Math.random() * 100) + 1,
          status: 'Em atendimento',
          queue: 'Recepção 01',
          queueType: 'Exames',
          agenda: 'Mamografia',
        });
        setPatients((prev) => [mapApiToPatient(created), ...prev]);
        await invalidateReceptionQueue();
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao cadastrar paciente',
          color: 'red',
        });
        return;
      }
    }

    setNovoPaciente(INITIAL_NOVO_PACIENTE);
    setModalOpen(false);
    setIsEditing(false);
    setEditingPatientId(null);
    setSelectedPatientId(null);
  };

  const handleSelectPatient = (value: string | null) => {
    if (!value) {
      setSelectedPatientId(null);
      setNovoPaciente(INITIAL_NOVO_PACIENTE);
      return;
    }

    setSelectedPatientId(value);
    const p = patientById[value];
    if (!p) return;

    setNovoPaciente((prev) => ({
      ...prev,
      nomeCompleto: p.name || p.fullName || p.patientName || prev.nomeCompleto || '',
      cpf: formatCPF(p.cpf || prev.cpf || ''),
      dataNascimento: formatDateDisplay(p.birthDate || prev.dataNascimento || ''),
      sexo: p.gender ? String(p.gender).charAt(0).toUpperCase() : prev.sexo || '',
      telefone: formatPhone(p.phone || p.cellphone || prev.telefone || ''),
      email: p.email || prev.email || '',
      endereco: p.address || prev.endereco || '',
      convenio: p.healthInsuranceName || prev.convenio || '',
      validadeConvenio: formatDateDisplay(p.healthInsuranceExpiry || prev.validadeConvenio || ''),
      numCarteira: p.healthInsuranceNumber || prev.numCarteira || '',
    }));
  };

  const openChecklistForPatient = async (patient: Patient) => {
    const resolvedPatient = await resolvePatientWithValidPreAttendanceId(patient);
    const targetPatient = resolvedPatient || patient;

    if (!hasValidPreAttendanceId(targetPatient.id)) {
      showNotification({
        title: 'Registro inconsistente',
        message: 'Este paciente não possui um identificador válido de pré-atendimento. Atualize a fila e tente novamente.',
        color: 'red',
      });
      await loadReceptionPatients();
      return;
    }

    const basePatient: Patient = {
      ...targetPatient,
      patientId: targetPatient.patientId,
      nomeCompleto: targetPatient.nomeCompleto,
      cpf: targetPatient.cpf,
      dataNascimento: targetPatient.dataNascimento,
      sexo: targetPatient.sexo,
      telefone: targetPatient.telefone,
      email: targetPatient.email,
      endereco: targetPatient.endereco,
      convenio: targetPatient.convenio,
      validadeConvenio: targetPatient.validadeConvenio,
      numCarteira: targetPatient.numCarteira,
      status: targetPatient.status,
      fila: targetPatient.fila,
      tipoFila: targetPatient.tipoFila,
      agenda: targetPatient.agenda,
    };
    let enrichedPatient = basePatient;

    try {
      let fullPatient: any = null;

      if (basePatient.patientId) {
        const response = await patientService.getPatientById(basePatient.patientId);
        fullPatient = response?.item || response?.data || response;
      }

      if (!fullPatient && basePatient.cpf) {
        try {
          const response = await patientService.getPatientByCpf(onlyDigits(basePatient.cpf));
          fullPatient = response?.item || response?.data || response;
        } catch {
          const localPatient = Object.values(patientById).find((item: any) => onlyDigits(item?.cpf || '') === onlyDigits(basePatient.cpf));
          fullPatient = localPatient || null;
        }
      }

      if (fullPatient) {
        enrichedPatient = {
          ...basePatient,
          patientId: fullPatient?.id || basePatient.patientId,
          nomeCompleto: fullPatient?.name || basePatient.nomeCompleto,
          cpf: fullPatient?.cpf || basePatient.cpf,
          dataNascimento: formatDateDisplay(fullPatient?.birthDate || basePatient.dataNascimento),
          sexo: fullPatient?.gender ? String(fullPatient.gender).charAt(0).toUpperCase() : basePatient.sexo,
          telefone: formatPhone(fullPatient?.phone || fullPatient?.cellphone || basePatient.telefone || ''),
          email: fullPatient?.email || basePatient.email,
          endereco: fullPatient?.address || basePatient.endereco,
          convenio: fullPatient?.healthInsuranceName || basePatient.convenio,
          validadeConvenio: formatDateDisplay(fullPatient?.healthInsuranceExpiry || basePatient.validadeConvenio),
          numCarteira: fullPatient?.healthInsuranceNumber || basePatient.numCarteira,
        };
      }
    } catch {
      // Mantém os dados já disponíveis no pré-atendimento se o carregamento detalhado falhar.
    }

    setPatients((prev) => prev.map((item) => (
      isSameReceptionPatient(item, targetPatient) ? { ...item, ...basePatient, id: targetPatient.id } : item
    )));
    setChecklistPreAttendanceId(targetPatient.id);
    setChecklistPatient(enrichedPatient);
    setChecklistData((prev) => ({
      ...prev,
      atendimentoParticular: isPrivateCare(enrichedPatient),
      guiaNumero: isPrivateCare(enrichedPatient) ? '' : (enrichedPatient.numCarteira || prev.guiaNumero || ''),
      valorPagamento: prev.valorPagamento || 0,
      formaPagamento: prev.formaPagamento || '',
    }));
    setChecklistStep(0);
    setChecklistOpen(true);
    await loadChecklistAttachments(enrichedPatient.appointmentId || basePatient.appointmentId);
  };

  const handleStartChecklist = async (patient: Patient) => {
    const resolvedPatient = await resolvePatientWithValidPreAttendanceId(patient);
    const targetPatient = resolvedPatient || patient;

    if (!hasValidPreAttendanceId(targetPatient.id)) {
      showNotification({
        title: 'Registro inconsistente',
        message: 'Não foi possível localizar o pré-atendimento desse paciente. Atualize a fila.',
        color: 'red',
      });
      await loadReceptionPatients();
      return;
    }

    if ((targetPatient.status || '').trim() === RECEPTION_DONE_STATUS) {
      return;
    }

    try {
      setChecklistLoading(true);
      const alreadyStarted = (targetPatient.status || '').trim() === RECEPTION_CHECKLIST_STATUS;

      if (alreadyStarted) {
        await openChecklistForPatient(targetPatient);
        return;
      }

      const updated = await preAttendanceService.update(targetPatient.id, {
        status: RECEPTION_CHECKLIST_STATUS,
      });
      const mapped = mapApiToPatient(updated);
      const startedPatient: Patient = {
        ...targetPatient,
        ...mapped,
        patientId: mapped.patientId || targetPatient.patientId,
        nomeCompleto: mapped.nomeCompleto || targetPatient.nomeCompleto,
        cpf: mapped.cpf || targetPatient.cpf,
        dataNascimento: mapped.dataNascimento || targetPatient.dataNascimento,
        sexo: mapped.sexo || targetPatient.sexo,
        telefone: mapped.telefone || targetPatient.telefone,
        email: mapped.email || targetPatient.email,
        endereco: mapped.endereco || targetPatient.endereco,
        convenio: mapped.convenio || targetPatient.convenio,
        validadeConvenio: mapped.validadeConvenio || targetPatient.validadeConvenio,
        numCarteira: mapped.numCarteira || targetPatient.numCarteira,
        status: mapped.status || targetPatient.status,
        fila: mapped.fila || targetPatient.fila,
        tipoFila: mapped.tipoFila || targetPatient.tipoFila,
        agenda: mapped.agenda || targetPatient.agenda,
      };
      await openChecklistForPatient(startedPatient);

      await preAttendanceService.update(targetPatient.id, {
        status: RECEPTION_CHECKLIST_STATUS,
        checklistStartedAt: new Date().toISOString(),
      });
      await invalidateReceptionQueue();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao iniciar checklist',
        color: 'red',
      });
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleFinishChecklist = async () => {
    if (!checklistPatient || !checklistPreAttendanceId || !hasValidPreAttendanceId(checklistPreAttendanceId)) {
      showNotification({
        title: 'Pré-atendimento inválido',
        message: 'Não encontramos um identificador válido para concluir o checklist.',
        color: 'red',
      });
      return;
    }
    try {
      setChecklistLoading(true);
      let generatedInvoice: any = null;
      const checklistPatientBirthDate = parseDisplayDateToApi(checklistPatient.dataNascimento);
      const checklistPatientGender = normalizeChecklistGenderForApi(checklistPatient.sexo);

      if (checklistData.atendimentoParticular) {
        generatedInvoice = await invoiceService.createInvoice({
          patientName: checklistPatient.nomeCompleto,
          dueDate: new Date().toLocaleDateString('en-CA'),
          convention: 'Particular',
          value: checklistData.valorPagamento,
          discount: 0,
          paymentMethod: checklistData.formaPagamento,
        });
      }

      if (checklistPatient.patientId) {
        await patientService.updatePatient(checklistPatient.patientId, {
          name: checklistPatient.nomeCompleto || undefined,
          cpf: onlyDigits(checklistPatient.cpf || '') || undefined,
          birthDate: checklistPatientBirthDate,
          gender: checklistPatientGender,
          phone: checklistPatient.telefone || undefined,
          cellphone: checklistPatient.telefone || undefined,
          email: checklistPatient.email || undefined,
          address: checklistPatient.endereco || undefined,
          hasHealthInsurance: !isPrivateCare(checklistPatient),
          healthInsuranceName: checklistPatient.convenio || undefined,
          healthInsuranceNumber: checklistPatient.numCarteira || undefined,
          healthInsuranceExpiry: parseDisplayDateToApi(checklistPatient.validadeConvenio),
        });
      }

      const updated = await preAttendanceService.update(checklistPreAttendanceId, {
        status: RECEPTION_DONE_STATUS,
        checklistCompletedAt: new Date().toISOString(),
        fullName: checklistPatient.nomeCompleto || undefined,
        cpf: onlyDigits(checklistPatient.cpf || '') || undefined,
        birthDate: checklistPatientBirthDate,
        gender: checklistPatientGender,
        phone: checklistPatient.telefone || undefined,
        email: checklistPatient.email || undefined,
        address: checklistPatient.endereco || undefined,
        convenio: checklistData.atendimentoParticular
          ? 'Particular'
          : (checklistPatient.convenio || undefined),
        convenioValidUntil: parseDisplayDateToApi(checklistPatient.validadeConvenio),
        convenioStatus: checklistData.atendimentoParticular
          ? 'Pagamento realizado'
          : (checklistData.guiaNumero.trim().length > 0 ? 'Autorizado' : checklistPatient.statusAutorizacao || undefined),
        convenioNumber: checklistData.guiaNumero || checklistPatient.numCarteira || undefined,
        agenda: checklistPatient.agenda || undefined,
        doctorName: checklistPatient.doctorName || extractDoctorNameFromAgenda(checklistPatient.agenda) || undefined,
        finalFacialValidationAt: facialValidationVerified ? new Date().toISOString() : undefined,
        finalFacialValidationStatus: facialValidationVerified ? 'VALIDADO' : 'PENDENTE',
        finalFacialValidationTrust: facialValidationTrust ?? undefined,
        finalFacialValidationName: facialValidationName || checklistPatient.nomeCompleto || undefined,
        finalFacialValidationCpf: checklistPatient.cpf || undefined,
        notes: [
          checklistPatient.observacoes,
          checklistData.observacoes,
          generatedInvoice?.number ? `Fatura gerada: ${generatedInvoice.number}` : '',
        ].filter(Boolean).join(' Ã¢â‚¬Â¢ ') || undefined,
      });

      await consultationService.create({
        patientName: checklistPatient.nomeCompleto,
        appointmentId: checklistPatient.appointmentId || undefined,
        doctorId: checklistPatient.doctorId || undefined,
        doctorName: checklistPatient.doctorName || extractDoctorNameFromAgenda(checklistPatient.agenda) || undefined,
        convenio: checklistData.atendimentoParticular
          ? 'Particular'
          : (checklistPatient.convenio || undefined),
        convenioStatus: checklistData.atendimentoParticular
          ? 'Pagamento realizado'
          : (checklistData.guiaNumero.trim().length > 0 ? 'Autorizado' : checklistPatient.statusAutorizacao || undefined),
        scheduledFor: checklistPatient.agenda || undefined,
        queueType: 'Fila clínica',
        agenda: checklistPatient.agenda || undefined,
        queue: 'Aguardando atendimento',
        bloodPressure: checklistPatient.pressaoArterial || undefined,
        heartRate: checklistPatient.frequenciaCardiaca || undefined,
        temperature: checklistPatient.temperatura || undefined,
        oxygenSaturation: checklistPatient.saturacao || undefined,
        weight: checklistPatient.peso || undefined,
        height: checklistPatient.altura || undefined,
        glucose: checklistPatient.glicemia || undefined,
        bmi: checklistPatient.imc || undefined,
        mainComplaint: checklistPatient.queixaPrincipal || undefined,
        diseaseHistory: checklistPatient.historiaDoenca || undefined,
        allergies: checklistPatient.alergias || undefined,
        medications: checklistPatient.medicamentos || undefined,
        antecedentes: checklistPatient.antecedentes || undefined,
        triageNotes: [
          checklistPatient.observacoesTriagem,
          checklistData.observacoes,
        ].filter(Boolean).join(' • ') || undefined,
      });

      await loadReceptionPatients();
      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
      setChecklistOpen(false);
      resetChecklist();

      showNotification({
        title: 'Checklist concluído',
        message: generatedInvoice?.number
          ? `${updated.fullName || checklistPatient.nomeCompleto} está pronto para seguir no atendimento. Fatura ${generatedInvoice.number} criada.`
          : `${updated.fullName || checklistPatient.nomeCompleto} está pronto para seguir no atendimento.`,
        color: 'green',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao concluir checklist',
        color: 'red',
      });
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleFinalFacialValidation = async (imageBase64: string) => {
    if (!checklistPatient || !checklistPreAttendanceId || !hasValidPreAttendanceId(checklistPreAttendanceId)) {
      showNotification({
        title: 'Pré-atendimento inválido',
        message: 'Não encontramos um identificador válido para finalizar a validação facial.',
        color: 'red',
      });
      return;
    }

    try {
      setFacialValidationLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const unitId = user?.branchId || user?.branch?.id || '';

      const result = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: unitId,
      });

      const recognizedCpf = onlyDigits(result?.patient?.cpf || '');
      const patientCpf = onlyDigits(checklistPatient.cpf || '');

      if (!recognizedCpf || !patientCpf || recognizedCpf !== patientCpf) {
        setFacialValidationVerified(false);
        setFacialValidationTrust(result?.trust ?? null);
        setFacialValidationName(result?.patient?.name || '');
        await preAttendanceService.update(checklistPreAttendanceId, {
          finalFacialValidationAt: new Date().toISOString(),
          finalFacialValidationStatus: 'REPROVADO',
          finalFacialValidationTrust: result?.trust ?? undefined,
          finalFacialValidationName: result?.patient?.name || undefined,
          finalFacialValidationCpf: result?.patient?.cpf || undefined,
        });
        await invalidateReceptionQueue();
        showNotification({
          title: 'Identidade não confirmada',
          message: 'A face reconhecida não corresponde ao paciente em atendimento.',
          color: 'red',
        });
        return;
      }

      setFacialValidationVerified(true);
      setFacialValidationTrust(result?.trust ?? null);
      setFacialValidationName(result?.patient?.name || checklistPatient.nomeCompleto);
      await preAttendanceService.update(checklistPreAttendanceId, {
        finalFacialValidationAt: new Date().toISOString(),
        finalFacialValidationStatus: 'VALIDADO',
        finalFacialValidationTrust: result?.trust ?? undefined,
        finalFacialValidationName: result?.patient?.name || checklistPatient.nomeCompleto || undefined,
        finalFacialValidationCpf: result?.patient?.cpf || checklistPatient.cpf || undefined,
      });
      await invalidateReceptionQueue();
      showNotification({
        title: 'Identidade confirmada',
        message: `${result.patient.name} validado com sucesso na recepção.`,
        color: 'green',
      });
    } catch (error: any) {
      setFacialValidationVerified(false);
      await preAttendanceService.update(checklistPreAttendanceId, {
        finalFacialValidationAt: new Date().toISOString(),
        finalFacialValidationStatus: 'ERRO',
      }).catch(() => undefined);
      await invalidateReceptionQueue();
      showNotification({
        title: 'Erro na validação facial',
        message: error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Não foi possível validar a identidade do paciente.',
        color: 'red',
      });
    } finally {
      setFacialValidationLoading(false);
    }
  };

  const rows = filteredPatients.map((patient) => (
    <Table.Tr key={patient.id} style={{ borderBottom: '1px solid #e9ecef' }}>
      <Table.Td>
        <Group gap={isMobile ? "xs" : "sm"}>
          {!isMobile && (
            <Box
              bg={DARK_BLUE}
              w={32}
              h={32}
              style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Text c="white" fw={600} size="sm">
                {patient.nomeCompleto.charAt(0).toUpperCase()}
              </Text>
            </Box>
          )}
          <Box>
            <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
              {patient.nomeCompleto}
            </Text>
            <Text size="xs" c="dimmed">
              CPF: {patient.cpf || 'Não informado'}
            </Text>
          </Box>
        </Group>
      </Table.Td>
      <Table.Td>
        <Stack gap={2}>
          <Text size="xs" fw={600} style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>
            {getAgendaSummary(patient.agenda).horario} • {getAgendaSummary(patient.agenda).procedimento}
          </Text>
          <Text size="xs" c="dimmed">
            {extractDoctorNameFromAgenda(patient.agenda) || patient.doctorName || 'Profissional não informado'}
          </Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Badge variant="outline" radius="xl" color={isPrivateCare(patient) ? 'gray' : 'blue'}>
          {patient.convenio || 'Particular'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color={getReceptionStatusColor(patient.status)} radius="xl">
          {patient.status || '-'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end" align="center">
          {ACTIVE_RECEPTION_STATUSES.includes(patient.status || '') && renderReceptionAction(patient)}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const mobileCards = filteredPatients.map((patient) => {
    const agendaSummary = getAgendaSummary(patient.agenda);
    const doctorSummary = extractDoctorNameFromAgenda(patient.agenda) || patient.doctorName || 'Profissional não informado';

    return (
      <Paper key={patient.id} p="md" withBorder radius="md" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm" align="flex-start">
              <Box
                bg={DARK_BLUE}
                w={36}
                h={36}
                style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Text c="white" fw={600} size="sm">
                  {patient.nomeCompleto.charAt(0).toUpperCase()}
                </Text>
              </Box>
              <Box>
                <Text fw={600} size="sm">{patient.nomeCompleto}</Text>
                <Text size="xs" c="dimmed">CPF: {patient.cpf || 'Não informado'}</Text>
              </Box>
            </Group>
            <Badge variant="light" color={getReceptionStatusColor(patient.status)} radius="xl">
              {patient.status || '-'}
            </Badge>
          </Group>

          <Box>
            <Text size="xs" c="dimmed" fw={600}>Agendamento</Text>
            <Text size="sm" fw={500}>{agendaSummary.horario} • {agendaSummary.procedimento}</Text>
            <Text size="xs" c="dimmed">{doctorSummary}</Text>
          </Box>

          <Group justify="space-between" align="center">
            <Badge variant="outline" radius="xl" color={isPrivateCare(patient) ? 'gray' : 'blue'}>
              {patient.convenio || 'Particular'}
            </Badge>
            {ACTIVE_RECEPTION_STATUSES.includes(patient.status || '') ? renderReceptionAction(patient) : null}
          </Group>
        </Stack>
      </Paper>
    );
  });

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30}>
          <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">Autorização e Recepção</Text>
            <Text size="sm" c="dimmed">Pacientes chamados para atendimento na recepção</Text>
          </Box>
        </Group>

        {/* Search Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            <FloatingInput
              label="Buscar"
              alwaysFloatLabel
              placeholder={isMobile ? "Buscar..." : "Buscar paciente por nome ou CPF..."}
              value={searchValue}
              onChange={(e) => setSearchValue(e.currentTarget.value)}
              rightSection={<Search size={16} color="var(--mantine-color-dimmed)" style={{ pointerEvents: 'none' }} />}
              containerProps={{ style: { flex: 1, minHeight: 64 } }}
            />
          </Group>
        </Box>

        {/* Patients Table */}
        {receptionQueueLoading ? (
          isMobile ? (
            <Stack gap="sm">
              {Array.from({ length: 4 }).map((_, index) => (
                <Paper key={index} p="md" withBorder radius="md" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Group gap="sm" align="flex-start">
                        <Skeleton height={36} width={36} radius="xl" />
                        <Stack gap={6}>
                          <Skeleton height={14} width={140} radius="xl" />
                          <Skeleton height={10} width={100} radius="xl" />
                        </Stack>
                      </Group>
                      <Skeleton height={24} width={120} radius="xl" />
                    </Group>
                    <Skeleton height={12} width="70%" radius="xl" />
                    <Skeleton height={12} width="45%" radius="xl" />
                    <Group justify="space-between" align="center">
                      <Skeleton height={24} width={90} radius="xl" />
                      <Skeleton height={32} width={138} radius="md" />
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
              <Table horizontalSpacing="md" verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: 'none' }}>
                    <Table.Th>Paciente</Table.Th>
                    <Table.Th>Agendamento</Table.Th>
                    <Table.Th>Convênio</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Group gap="sm">
                          <Skeleton height={32} width={32} radius="xl" />
                          <Stack gap={6}>
                            <Skeleton height={14} width={140} radius="xl" />
                            <Skeleton height={10} width={100} radius="xl" />
                          </Stack>
                        </Group>
                      </Table.Td>
                      <Table.Td><Skeleton height={14} width={180} radius="xl" /></Table.Td>
                      <Table.Td><Skeleton height={24} width={90} radius="xl" /></Table.Td>
                      <Table.Td><Skeleton height={24} width={150} radius="xl" /></Table.Td>
                      <Table.Td>
                        <Group justify="flex-end">
                          <Skeleton height={30} width={128} radius="md" />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          )
        ) : isMobile ? (
          mobileCards.length > 0 ? (
            <Stack gap="sm">{mobileCards}</Stack>
          ) : (
            <Paper withBorder radius="md" p="xl" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
              <Text ta="center" fw={600}>Fila da recepção vazia</Text>
              <Text ta="center" c="dimmed" size="sm" mt={4}>
                Assim que um paciente for chamado do check-in, ele aparecerá aqui para conferência e checklist.
              </Text>
            </Paper>
          )
        ) : (
          <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
            <Table horizontalSpacing={isMobile ? "sm" : "md"} verticalSpacing={isMobile ? "sm" : "md"}>
              <Table.Thead>
                <Table.Tr style={{ borderBottom: 'none' }}>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Paciente</Table.Th>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Agendamento</Table.Th>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'right' }}>Ações</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Box py="xl">
                      <Text ta="center" fw={600}>Fila da recepção vazia</Text>
                      <Text ta="center" c="dimmed" size="sm" mt={4}>
                        Assim que um paciente for chamado do check-in, ele aparecerá aqui para conferência e checklist.
                      </Text>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              )}</Table.Tbody>
            </Table>
          </Box>
        )}
      </Box>

      {/* Modal - Novo Paciente */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setIsEditing(false);
          setEditingPatientId(null);
          setNovoPaciente(INITIAL_NOVO_PACIENTE);
        }}
        title={isEditing ? "Editar Paciente" : "Novo Paciente"}
        size={isMobile ? "100%" : isTablet ? "90%" : "lg"}
        centered
        fullScreen={isMobile}
        styles={{
          content: {
            '::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            overflow: 'hidden',
          },
          body: {
            '::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            overflow: 'hidden',
          },
        }}
      >
        <Tabs defaultValue="dados-pessoais" color="darkBlue">
          <Tabs.List mb={isMobile ? "sm" : "md"}>
            <Tabs.Tab value="dados-pessoais">Dados pessoais</Tabs.Tab>
            <Tabs.Tab value="convenio">Convênio</Tabs.Tab>
            <Tabs.Tab value="triagem">Triagem</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dados-pessoais">
            <Stack gap={isMobile ? "sm" : "md"} mih={isMobile ? undefined : 750}>
              <Box>
                <Select
                  label="Paciente"
                  placeholder={patientsLoading ? 'Carregando pacientes...' : 'Selecione um paciente'}
                  data={patientOptions}
                  value={selectedPatientId}
                  onChange={handleSelectPatient}
                  searchable
                  clearable
                  nothingFoundMessage="Nenhum paciente encontrado"
                  disabled={patientsLoading}
                />
              </Box>

              <FloatingInput
                label="Nome completo"
                value={novoPaciente.nomeCompleto}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, nomeCompleto: e.currentTarget.value })
                }
                disabled={isEditing}
                style={isEditing ? { color: '#adb5bd' } : {}}
                rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
              />

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="CPF"
                  value={novoPaciente.cpf}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, cpf: formatCPF(e.currentTarget.value) })}
                  disabled={isEditing}
                  style={isEditing ? { color: '#adb5bd' } : {}}
                  rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                />
                <FloatingInput
                  label="Data de nascimento"
                  value={novoPaciente.dataNascimento}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, dataNascimento: formatDateInput(e.currentTarget.value) })}
                  disabled={isEditing}
                  style={isEditing ? { color: '#adb5bd' } : {}}
                  rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                />
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <Box>
                  <Select
                    label="Sexo"
                    placeholder="Selecione"
                    data={[
                      { value: 'M', label: 'Masculino' },
                      { value: 'F', label: 'Feminino' },
                      { value: 'O', label: 'Outro' },
                    ]}
                    value={novoPaciente.sexo}
                    onChange={(value) =>
                      setNovoPaciente({ ...novoPaciente, sexo: value || '' })
                    }
                  />
                </Box>
                <FloatingInput
                  label="Telefone"
                  value={novoPaciente.telefone}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, telefone: formatPhone(e.currentTarget.value) })}
                />
              </Group>

              <FloatingInput
                type="email"
                label="E-mail"
                value={novoPaciente.email}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, email: e.currentTarget.value })}
              />

              <FloatingInput
                label="Endereço"
                value={novoPaciente.endereco}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, endereco: e.currentTarget.value })}
              />

              <Textarea
                label="Observações"
                placeholder="Observações adicionais"
                rows={3}
                value={novoPaciente.observacoes}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, observacoes: e.currentTarget.value })
                }
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="convenio">
            <Stack gap={isMobile ? "sm" : "md"} mih={isMobile ? undefined : 750}>
              <Box>
                <Select
                  label="Convênio"
                  placeholder={insurancesLoading ? 'Carregando convênios...' : 'Selecione um convênio'}
                  data={insuranceOptions}
                  value={novoPaciente.convenio}
                  onChange={(value) => setNovoPaciente({ ...novoPaciente, convenio: value || '' })}
                  searchable
                  clearable
                  disabled={insurancesLoading}
                  nothingFoundMessage="Nenhum convênio encontrado"
                />
              </Box>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="Tipo"
                  value={novoPaciente.tipoConvenio}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, tipoConvenio: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="Validade"
                  value={novoPaciente.validadeConvenio}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, validadeConvenio: formatDateInput(e.currentTarget.value) })}
                />
              </Group>

              <FloatingInput
                label="Número (ID beneficiário)"
                value={novoPaciente.numCarteira}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, numCarteira: e.currentTarget.value })
                }
              />

              <Box>
                <Select
                  label="Status da Autorização"
                  placeholder="Selecione"
                  data={[
                    { value: 'aguardando', label: 'Aguardando aut.' },
                    { value: 'autorizado', label: 'Autorizado' },
                    { value: 'negado', label: 'Negado' },
                  ]}
                  value={novoPaciente.statusAutorizacao}
                  onChange={(value) =>
                    setNovoPaciente({ ...novoPaciente, statusAutorizacao: value || '' })
                  }
                />
              </Box>

              <Textarea
                label="Observações"
                placeholder="Observações do convênio"
                rows={3}
                value={novoPaciente.observacoesConvenio}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, observacoesConvenio: e.currentTarget.value })
                }
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="triagem">
            <Stack gap="xs" mih={isMobile ? undefined : 750}>
              <Group grow>
                <FloatingInput
                  label="Nome"
                  value={novoPaciente.nomeCompleto}
                  readOnly
                  disabled
                  placeholder=" "
                  style={{ color: '#adb5bd' }}
                  rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                />
                <FloatingInput
                  label="Convênio"
                  value={novoPaciente.convenio}
                  readOnly
                  disabled
                  placeholder=" "
                  style={{ color: '#adb5bd' }}
                  rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                />
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="PA (mmHg)"
                  value={novoPaciente.pressaoArterial}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, pressaoArterial: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="FC (bmp)"
                  value={novoPaciente.frequenciaCardiaca}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, frequenciaCardiaca: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="Temp (Ã‚Â°C)"
                  value={novoPaciente.temperatura}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, temperatura: e.currentTarget.value })
                  }
                />
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="SpO2 (%)"
                  value={novoPaciente.saturacao}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, saturacao: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="Peso (kg)"
                  value={novoPaciente.peso}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, peso: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="Altura (cm)"
                  value={novoPaciente.altura}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, altura: e.currentTarget.value })
                  }
                />
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="Glicemia"
                  value={novoPaciente.glicemia}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, glicemia: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="IMC"
                  value={novoPaciente.imc}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, imc: e.currentTarget.value })
                  }
                />
              </Group>

              <FloatingInput
                label="Queixa principal"
                value={novoPaciente.queixaPrincipal}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, queixaPrincipal: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="História da Doença"
                value={novoPaciente.historiaDoenca}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, historiaDoenca: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="Alergias"
                value={novoPaciente.alergias}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, alergias: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="Medicamentos"
                value={novoPaciente.medicamentos}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, medicamentos: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="Antecedentes"
                value={novoPaciente.antecedentes}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, antecedentes: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="Observação"
                value={novoPaciente.observacoesTriagem}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, observacoesTriagem: e.currentTarget.value })
                }
              />

              <Group justify="flex-end" gap="md" mt={isMobile ? "sm" : "lg"}>
                <Button variant="default" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button bg={DARK_BLUE} onClick={handleAddPatient}>
                  Salvar
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>

      <Modal
        opened={checklistOpen}
        onClose={() => {
          setChecklistOpen(false);
          resetChecklist();
        }}
        title="Checklist de recepção"
        size={isMobile ? "100%" : isTablet ? "95%" : "xl"}
        centered={!isMobile}
        fullScreen={isMobile}
        closeButtonProps={{ 'aria-label': 'Fechar checklist' }}
      >
        <Stack gap="xl">
          {checklistPatient && (
            <Box>
              <Stack gap="xl">
                <Box style={{ position: 'relative' }}>
                  <ThemeIcon
                    radius="xl"
                    size={30}
                    color="dark"
                    bg={DARK_BLUE}
                    style={{ position: 'absolute', left: isMobile ? -42 : -50, top: 0 }}
                  >
                    <Text fw={700} size="sm" c="white">1</Text>
                  </ThemeIcon>
                  <Text fw={500} size={isMobile ? 'lg' : 'xl'} lh={1.15}>Dados e Convênio</Text>
                  <Text size="sm" style={checklistMutedBlueStyle}>Conferência e autorização</Text>

                  <Paper withBorder radius="md" p={isMobile ? 'sm' : 'md'} mt="md" shadow="xs" style={checklistCardStyle}>
                    <Stack gap="md">
                      <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
                        <TextInput
                          label="Nome completo"
                          value={checklistPatient?.nomeCompleto || ''}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('nomeCompleto', event.currentTarget.value)}
                        />
                        <TextInput
                          label="Convênio"
                          value={checklistPatient?.convenio || 'Particular'}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('convenio', event.currentTarget.value)}
                        />
                      </SimpleGrid>

                      <Grid gutter="md">
                        <Grid.Col span={isMobile ? 12 : 3}>
                          <TextInput
                            label="CPF"
                            value={formatCPF(checklistPatient?.cpf || '')}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('cpf', onlyDigits(event.currentTarget.value))}
                          />
                        </Grid.Col>
                        <Grid.Col span={isMobile ? 12 : 3}>
                          <TextInput
                            label="Data de nascimento"
                            value={checklistPatient?.dataNascimento || ''}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('dataNascimento', formatDateInput(event.currentTarget.value))}
                          />
                        </Grid.Col>
                        <Grid.Col span={isMobile ? 12 : 2}>
                          <Select
                            label="Sexo"
                            data={[
                              { value: 'M', label: 'Masculino' },
                              { value: 'F', label: 'Feminino' },
                              { value: 'O', label: 'Outro' },
                            ]}
                            value={checklistPatient?.sexo || ''}
                            onChange={(value) => updateChecklistPatientField('sexo', value || '')}
                          />
                        </Grid.Col>
                        <Grid.Col span={isMobile ? 12 : 2}>
                          <TextInput
                            label="Telefone"
                            value={formatPhone(checklistPatient?.telefone || '')}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('telefone', onlyDigits(event.currentTarget.value))}
                          />
                        </Grid.Col>
                        <Grid.Col span={isMobile ? 12 : 2}>
                          <TextInput
                            label="E-mail"
                            value={checklistPatient?.email || ''}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('email', event.currentTarget.value)}
                          />
                        </Grid.Col>
                      </Grid>

                      <TextInput
                        label="Endereço"
                        value={checklistPatient?.endereco || ''}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('endereco', event.currentTarget.value)}
                      />

                      <Divider />

                      <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
                        <TextInput
                          label="Convênio do cadastro"
                          value={checklistPatient?.convenio || 'Particular'}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('convenio', event.currentTarget.value)}
                        />
                        <TextInput
                          label="Status da autorização"
                          value={checklistPatient?.statusAutorizacao || ''}
                          placeholder="Sem autorização prévia"
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('statusAutorizacao', event.currentTarget.value)}
                        />
                      </SimpleGrid>

                      <SimpleGrid cols={isMobile ? 1 : 4} spacing="md" verticalSpacing="xs">
                        <TextInput
                          label="Validade"
                          value={checklistPatient?.validadeConvenio || ''}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistPatientField('validadeConvenio', formatDateInput(event.currentTarget.value))}
                        />
                        <TextInput
                          label="Horário"
                          value={normalizeComparableText(getAgendaSummary(checklistPatient?.agenda).horario) === 'nao informado' ? '' : getAgendaSummary(checklistPatient?.agenda).horario}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistAgendaPart('horario', event.currentTarget.value)}
                        />
                        <TextInput
                          label="Procedimento"
                          value={normalizeComparableText(getAgendaSummary(checklistPatient?.agenda).procedimento) === 'nao informado' ? '' : getAgendaSummary(checklistPatient?.agenda).procedimento}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistAgendaPart('procedimento', event.currentTarget.value)}
                        />
                        <TextInput
                          label="Profissional"
                          value={extractDoctorNameFromAgenda(checklistPatient?.agenda) || checklistPatient?.doctorName || ''}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateChecklistAgendaPart('profissional', event.currentTarget.value)}
                        />
                      </SimpleGrid>

                      <Divider />

                      <Divider />

                      <Group gap="xl" wrap="wrap">
                        <Checkbox
                          label="Dados pessoais conferidos com o paciente"
                          checked={checklistData.dadosConferidos}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setChecklistData((prev) => ({ ...prev, dadosConferidos: checked }));
                          }}
                        />
                        <Checkbox
                          label="Telefone, e-mail e endereço conferidos"
                          checked={checklistData.contatoConferido}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setChecklistData((prev) => ({ ...prev, contatoConferido: checked }));
                          }}
                        />
                      </Group>

                      <Group gap="xl" wrap="wrap">
                        <Checkbox
                          label="Atendimento particular"
                          checked={checklistData.atendimentoParticular}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setChecklistData((prev) => ({
                              ...prev,
                              atendimentoParticular: checked,
                              guiaNumero: checked ? '' : prev.guiaNumero,
                              pagamentoRealizado: checked ? prev.pagamentoRealizado : false,
                              valorPagamento: checked ? prev.valorPagamento : 0,
                              formaPagamento: checked ? prev.formaPagamento : '',
                            }));
                          }}
                        />
                        <Checkbox
                          label="Autorização do convênio conferida"
                          style={{ display: 'none' }}
                          checked={false}
                          onChange={(event) => {
                            void event;
                          }}
                        />
                      </Group>

                      <Box maw={isMobile ? '100%' : 380}>
                        <FloatingInput
                          label="Número da Guia"
                          value={checklistData.guiaNumero}
                          disabled={checklistData.atendimentoParticular}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setChecklistData((prev) => ({ ...prev, guiaNumero: value }));
                          }}
                        />
                      </Box>

                      <Box>
                        <Text size="sm" mb={8}>Anexos</Text>
                        <Button
                          component="label"
                          variant="default"
                          fullWidth
                          loading={checklistAttachmentUploading}
                          disabled={!checklistPatient?.appointmentId}
                          style={checklistUploadBoxStyle}
                          leftSection={<Upload size={18} />}
                        >
                          Coloque o anexo aqui
                          <input
                            type="file"
                            hidden
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={(e) => {
                              const file = e.currentTarget.files?.[0] || null;
                              handleChecklistAttachmentSelect(file);
                              e.currentTarget.value = '';
                            }}
                          />
                        </Button>
                        {checklistAttachmentsLoading ? (
                          <Text size="xs" c="dimmed" mt={8}>Carregando anexos...</Text>
                        ) : checklistAttachments.length > 0 ? (
                          <Stack gap={6} mt={8}>
                            {checklistAttachments.map((doc) => (
                              <Group key={doc.id} justify="space-between" wrap="nowrap">
                                <Text size="sm" lineClamp={1}>{doc.fileName}</Text>
                                <ActionIcon
                                  variant="subtle"
                                  color="blue"
                                  loading={openingAttachmentId === doc.id}
                                  onClick={() => handleOpenChecklistAttachment(doc.id)}
                                >
                                  <Eye size={16} />
                                </ActionIcon>
                              </Group>
                            ))}
                          </Stack>
                        ) : (
                          <Text size="xs" c="dimmed" mt={8}>
                            {checklistPatient.appointmentId ? 'Nenhum anexo enviado ainda.' : 'Esse atendimento não possui vínculo de agendamento para anexos.'}
                          </Text>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                </Box>

                <Box style={{ position: 'relative' }}>
                  <ThemeIcon
                    radius="xl"
                    size={30}
                    color="dark"
                    bg={DARK_BLUE}
                    style={{ position: 'absolute', left: isMobile ? -42 : -50, top: 0 }}
                  >
                    <Text fw={700} size="sm" c="white">2</Text>
                  </ThemeIcon>
                  <Text fw={500} size={isMobile ? 'lg' : 'xl'} lh={1.15}>Pagamento</Text>
                  <Text size="sm" style={checklistMutedBlueStyle}>Particular e coparticipação</Text>

                  <Stack gap="md" mt="md">
                    <Box maw={isMobile ? '100%' : 380}>
                      <NumberInput
                        label="Valor"
                        value={checklistData.valorPagamento}
                        onChange={(value) => {
                          setChecklistData((prev) => ({ ...prev, valorPagamento: typeof value === 'number' ? value : Number(value) || 0 }));
                        }}
                        min={0}
                        decimalScale={2}
                        fixedDecimalScale
                        prefix="R$ "
                        disabled={!canEditPayment}
                      />
                    </Box>

                    <SimpleGrid cols={isMobile ? 1 : 3} spacing="md">
                      {[
                        { label: 'Dinheiro', value: 'Dinheiro', icon: Wallet },
                        { label: 'Cartão', value: 'Cartão', icon: CreditCard },
                        { label: 'Pix', value: 'PIX', icon: QrCode },
                      ].map((option) => {
                        const Icon = option.icon;
                        const selected = checklistData.formaPagamento === option.value;
                        return (
                          <Button
                            key={option.value}
                            variant="default"
                            leftSection={<Icon size={18} />}
                            disabled={!canEditPayment}
                            style={paymentChoiceStyle(selected)}
                            onClick={() => {
                              if (!canEditPayment) return;
                              setChecklistData((prev) => ({ ...prev, formaPagamento: option.value }));
                            }}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </SimpleGrid>

                    <Checkbox
                      label="Pagamento realizado na recepção"
                      checked={checklistData.pagamentoRealizado}
                      disabled={!canEditPayment}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setChecklistData((prev) => ({ ...prev, pagamentoRealizado: checked }));
                      }}
                    />
                  </Stack>
                </Box>

                <Box style={{ position: 'relative' }}>
                  <ThemeIcon
                    radius="xl"
                    size={30}
                    color="dark"
                    bg={DARK_BLUE}
                    style={{ position: 'absolute', left: isMobile ? -42 : -50, top: 0 }}
                  >
                    <Text fw={700} size="sm" c="white">3</Text>
                  </ThemeIcon>
                  <Text fw={500} size={isMobile ? 'lg' : 'xl'} lh={1.15}>Revisão e Validação</Text>
                  <Text size="sm" style={checklistMutedBlueStyle}>Checagem e identidade</Text>

                  <Paper withBorder radius="md" p={isMobile ? 'sm' : 'md'} mt="md" shadow="xs" style={checklistCardStyle}>
                    <Stack gap="md">
                      <Text fw={600}>Resumo</Text>
                      <SimpleGrid cols={isMobile ? 2 : 3} spacing="lg" verticalSpacing="md">
                        <Box>
                          <Text style={checklistFieldLabelStyle}>Nome completo</Text>
                          <Text style={{ ...checklistFieldValueStyle, ...checklistUnderlineStyle }}>{checklistPatient?.nomeCompleto || ''}</Text>
                        </Box>
                        <Box>
                          <Text style={checklistFieldLabelStyle}>Convênio</Text>
                          <Text style={{ ...checklistFieldValueStyle, ...checklistUnderlineStyle }}>{checklistPatient?.convenio || 'Particular'}</Text>
                        </Box>
                        <Box>
                          <Text style={checklistFieldLabelStyle}>Procedimento</Text>
                          <Text style={{ ...checklistFieldValueStyle, ...checklistUnderlineStyle }}>{getAgendaSummary(checklistPatient?.agenda).procedimento}</Text>
                        </Box>
                        <Box>
                          <Text style={checklistFieldLabelStyle}>Data</Text>
                          <Text style={{ ...checklistFieldValueStyle, ...checklistUnderlineStyle }}>{getChecklistAppointmentDate(checklistPatient)}</Text>
                        </Box>
                        <Box>
                          <Text style={checklistFieldLabelStyle}>Horário</Text>
                          <Text style={{ ...checklistFieldValueStyle, ...checklistUnderlineStyle }}>{getAgendaSummary(checklistPatient?.agenda).horario}</Text>
                        </Box>
                        <Box>
                          <Text style={checklistFieldLabelStyle}>Profissional Respons.</Text>
                          <Text style={{ ...checklistFieldValueStyle, ...checklistUnderlineStyle }}>{extractDoctorNameFromAgenda(checklistPatient.agenda) || checklistPatient.doctorName || 'Não informado'}</Text>
                        </Box>
                      </SimpleGrid>
                    </Stack>
                  </Paper>

                  <Stack gap="md" mt="md">
                    <Group gap="xl" wrap="wrap">
                      <Checkbox
                        label="Dados do paciente conferidos"
                        checked={checklistData.agendaConferida}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setChecklistData((prev) => ({ ...prev, agendaConferida: checked }));
                        }}
                      />
                      <Checkbox
                        label="Validação de identidade realizada"
                        checked={facialValidationVerified}
                        readOnly
                      />
                    </Group>

                    <Group gap="md" wrap="wrap">
                      <Button
                        bg={DARK_BLUE}
                        leftSection={<Camera size={16} />}
                        onClick={() => setFacialValidationOpen(true)}
                        loading={facialValidationLoading}
                      >
                        Realizar validação facial
                      </Button>

                      {(facialValidationName || facialValidationTrust !== null) && (
                        <Badge color={facialValidationVerified ? 'green' : 'red'} variant="light" size="lg">
                          {facialValidationVerified ? 'Validado' : 'Divergente'}
                          {facialValidationTrust !== null ? ` • ${(facialValidationTrust * 100).toFixed(1)}%` : ''}
                        </Badge>
                      )}
                    </Group>

                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}

          <Group justify="flex-end">
            <Button
              bg={DARK_BLUE}
              onClick={handleFinishChecklist}
              disabled={!canCompleteChecklist() || checklistLoading}
              loading={checklistLoading}
            >
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <FacialCapture
        opened={facialValidationOpen}
        onClose={() => setFacialValidationOpen(false)}
        onCapture={handleFinalFacialValidation}
        title="Validação facial final"
        description="Posicione o paciente em frente à câmera para confirmar a identidade antes de concluir a recepção."
      />
    </Box>
  );
}
