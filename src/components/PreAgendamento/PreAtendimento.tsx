import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  TextInput,
  Button,
  Table,
  Modal,
  Stack,
  Textarea,
  Select,
  ActionIcon,
  Tabs,
  Checkbox,
  Stepper,
  Badge,
  Divider,
  NumberInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, ChevronLeft, Lock, ClipboardCheck, Camera } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FacialCapture } from '../common/FacialCapture';
import preAttendanceService from '../../services/preAttendanceService';
import patientService from '../../services/patientService';
import insuranceService from '../../services/insuranceService';
import invoiceService from '../../services/invoiceService';
import facialRecognitionService from '../../services/facialRecognitionService';
import consultationService from '../../services/consultationService';
import { formatCPF, formatDateInput, formatPhone, onlyDigits } from '../../utils/formatters';

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
  const [checklistStep, setChecklistStep] = useState(0);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistPatient, setChecklistPatient] = useState<Patient | null>(null);
  const [checklistPreAttendanceId, setChecklistPreAttendanceId] = useState<string | null>(null);
  const [facialValidationOpen, setFacialValidationOpen] = useState(false);
  const [facialValidationLoading, setFacialValidationLoading] = useState(false);
  const [facialValidationVerified, setFacialValidationVerified] = useState(false);
  const [facialValidationTrust, setFacialValidationTrust] = useState<number | null>(null);
  const [facialValidationName, setFacialValidationName] = useState('');
  const [checklistData, setChecklistData] = useState({
    dadosConferidos: false,
    contatoConferido: false,
    autorizacaoConferida: false,
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
  const RECEPTION_QUEUE_TYPE = 'Autorização e Recepção';
  const RECEPTION_IN_PROGRESS_STATUS = 'Em atendimento na recepção';
  const RECEPTION_CHECKLIST_STATUS = 'Checklist em andamento';
  const RECEPTION_DONE_STATUS = 'Recepção concluída';
  const ACTIVE_RECEPTION_STATUSES = [RECEPTION_IN_PROGRESS_STATUS, RECEPTION_CHECKLIST_STATUS];

  const isPrivateCare = (patient: Patient | null) => {
    const convenio = (patient?.convenio || '').trim().toLowerCase();
    return !convenio || convenio === 'particular';
  };

  const extractDoctorNameFromAgenda = (agenda?: string | null) => {
    const value = String(agenda || '').trim();
    if (!value) return '';
    const parts = value.split('•').map((item) => item.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    return parts[parts.length - 1];
  };

  const resetChecklist = () => {
    setChecklistStep(0);
    setChecklistPatient(null);
    setChecklistPreAttendanceId(null);
    setFacialValidationOpen(false);
    setFacialValidationLoading(false);
    setFacialValidationVerified(false);
    setFacialValidationTrust(null);
    setFacialValidationName('');
    setChecklistData({
      dadosConferidos: false,
      contatoConferido: false,
      autorizacaoConferida: false,
      guiaNumero: '',
      atendimentoParticular: false,
      pagamentoRealizado: false,
      valorPagamento: 0,
      formaPagamento: '',
      agendaConferida: false,
      observacoes: '',
    });
  };

  const canAdvanceChecklist = () => {
    if (checklistStep === 0) {
      return checklistData.dadosConferidos && checklistData.contatoConferido;
    }
    if (checklistStep === 1) {
      if (isPrivateCare(checklistPatient) || checklistData.atendimentoParticular) return true;
      return checklistData.autorizacaoConferida && checklistData.guiaNumero.trim().length > 0;
    }
    if (checklistStep === 2) {
      if (isPrivateCare(checklistPatient) || checklistData.atendimentoParticular) {
        return checklistData.pagamentoRealizado && checklistData.valorPagamento > 0 && checklistData.formaPagamento.trim().length > 0;
      }
      return true;
    }
    if (checklistStep === 3) {
      return checklistData.agendaConferida;
    }
    if (checklistStep === 4) {
      return facialValidationVerified;
    }
    return false;
  };

  const loadReceptionPatients = async () => {
    try {
      const data: any = await preAttendanceService.list({
        queueType: RECEPTION_QUEUE_TYPE,
      });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data?.data)
            ? data.data
            : []));

      const mapped = list
        .map(mapApiToPatient)
        .filter((item) => ACTIVE_RECEPTION_STATUSES.includes(item.status || ''));

      setPatients(mapped);
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

  const mapApiToPatient = (it: any): Patient => {
    const raw = it?.item || it?.data || it;
    const id = raw?.id || raw?.preAttendanceId || raw?.pre_attendance_id || raw?.patientId || raw?.patient_id || `tmp-${Math.random().toString(36).slice(2)}`;
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

  useEffect(() => {
    loadReceptionPatients();
  }, []);

  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      try {
        const data: any = await patientService.listPatients();
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

    loadPatients();
  }, []);

  useEffect(() => {
    const loadInsurances = async () => {
      setInsurancesLoading(true);
      try {
        const data: any = await insuranceService.listInsurances({ isActive: true });
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
          .map((it: any) => {
            const name = (it.name || it.nome || '').toString().trim();
            return name ? { value: name, label: name } : null;
          })
          .filter(Boolean) as { value: string; label: string }[];

        setInsuranceOptions(options);
      } catch (err: any) {
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

  const filteredPatients = patients.filter((patient) => {
    const q = searchValue.toLowerCase();
    const totemValue = patient.totem !== undefined ? String(patient.totem) : '';
    return patient.nomeCompleto.toLowerCase().includes(q) || totemValue.includes(searchValue);
  });

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

  const handleStartChecklist = async (patient: Patient) => {
    if ((patient.status || '').trim() === RECEPTION_DONE_STATUS) {
      return;
    }

    try {
      setChecklistLoading(true);
      const updated = await preAttendanceService.update(patient.id, {
        status: RECEPTION_CHECKLIST_STATUS,
      });
      const mapped = mapApiToPatient(updated);
      const basePatient: Patient = {
        ...patient,
        ...mapped,
        patientId: mapped.patientId || patient.patientId,
        nomeCompleto: mapped.nomeCompleto || patient.nomeCompleto,
        cpf: mapped.cpf || patient.cpf,
        dataNascimento: mapped.dataNascimento || patient.dataNascimento,
        sexo: mapped.sexo || patient.sexo,
        telefone: mapped.telefone || patient.telefone,
        email: mapped.email || patient.email,
        endereco: mapped.endereco || patient.endereco,
        convenio: mapped.convenio || patient.convenio,
        validadeConvenio: mapped.validadeConvenio || patient.validadeConvenio,
        numCarteira: mapped.numCarteira || patient.numCarteira,
        status: mapped.status || patient.status,
        fila: mapped.fila || patient.fila,
        tipoFila: mapped.tipoFila || patient.tipoFila,
        agenda: mapped.agenda || patient.agenda,
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
        // Mantém os dados já disponíveis no pre-attendance se o fetch detalhado falhar.
      }

      setPatients((prev) => prev.map((item) => (item.id === patient.id ? basePatient : item)));
      setChecklistPreAttendanceId(patient.id);
      setChecklistPatient(enrichedPatient);
      setChecklistData((prev) => ({
        ...prev,
        atendimentoParticular: isPrivateCare(enrichedPatient),
        guiaNumero: enrichedPatient.numCarteira || '',
        valorPagamento: prev.valorPagamento || 0,
        formaPagamento: prev.formaPagamento || '',
      }));
      setChecklistStep(0);
      setChecklistOpen(true);

      await preAttendanceService.update(patient.id, {
        status: RECEPTION_CHECKLIST_STATUS,
        checklistStartedAt: new Date().toISOString(),
      });
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
    if (!checklistPatient || !checklistPreAttendanceId) return;
    try {
      setChecklistLoading(true);
      let generatedInvoice: any = null;

      if (checklistData.atendimentoParticular || isPrivateCare(checklistPatient)) {
        generatedInvoice = await invoiceService.createInvoice({
          patientName: checklistPatient.nomeCompleto,
          dueDate: new Date().toLocaleDateString('en-CA'),
          convention: 'Particular',
          value: checklistData.valorPagamento,
          discount: 0,
          paymentMethod: checklistData.formaPagamento,
        });
      }

      const updated = await preAttendanceService.update(checklistPreAttendanceId, {
        status: RECEPTION_DONE_STATUS,
        checklistCompletedAt: new Date().toISOString(),
        convenioStatus: checklistData.atendimentoParticular
          ? 'Pagamento realizado'
          : (checklistData.autorizacaoConferida ? 'Autorizado' : checklistPatient.statusAutorizacao || undefined),
        convenioNumber: checklistData.guiaNumero || checklistPatient.numCarteira || undefined,
        finalFacialValidationAt: facialValidationVerified ? new Date().toISOString() : undefined,
        finalFacialValidationStatus: facialValidationVerified ? 'VALIDADO' : 'PENDENTE',
        finalFacialValidationTrust: facialValidationTrust ?? undefined,
        finalFacialValidationName: facialValidationName || checklistPatient.nomeCompleto || undefined,
        finalFacialValidationCpf: checklistPatient.cpf || undefined,
        notes: [
          checklistPatient.observacoes,
          checklistData.observacoes,
          generatedInvoice?.number ? `Fatura gerada: ${generatedInvoice.number}` : '',
        ].filter(Boolean).join(' • ') || undefined,
      });

      await consultationService.create({
        patientName: checklistPatient.nomeCompleto,
        appointmentId: checklistPatient.appointmentId || undefined,
        doctorId: checklistPatient.doctorId || undefined,
        doctorName: checklistPatient.doctorName || extractDoctorNameFromAgenda(checklistPatient.agenda) || undefined,
        convenio: checklistData.atendimentoParticular || isPrivateCare(checklistPatient)
          ? 'Particular'
          : (checklistPatient.convenio || undefined),
        convenioStatus: checklistData.atendimentoParticular
          ? 'Pagamento realizado'
          : (checklistData.autorizacaoConferida ? 'Autorizado' : checklistPatient.statusAutorizacao || undefined),
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
    if (!checklistPatient || !checklistPreAttendanceId) return;

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
        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>
          {patient.agenda || '-'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>
          {patient.convenio || 'Particular'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }} c="#495057">
          {patient.status || '-'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end" align="center">
          {ACTIVE_RECEPTION_STATUSES.includes(patient.status || '') && (
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<ClipboardCheck size={14} />}
              onClick={() => handleStartChecklist(patient)}
              loading={checklistLoading && checklistPreAttendanceId === patient.id}
            >
              Iniciar checklist
            </Button>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {/* Breadcrumb/Back Button */}
        <Group mb={isMobile ? 20 : 30}>
          <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
              Autorização e Recepção
            </Text>
            <Text size="sm" c="dimmed">
              Pacientes chamados para atendimento na recepção
            </Text>
          </Box>
        </Group>

        {/* Search Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            <TextInput
              placeholder={isMobile ? "Buscar..." : "Buscar paciente por nome ou CPF..."}
              leftSection={<Search size={16} color="var(--mantine-color-dimmed)" />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.currentTarget.value)}
              radius="md"
              size={isMobile ? "sm" : "md"}
              style={{ flex: 1 }}
            />
          </Group>
        </Box>

        {/* Patients Table */}
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
            <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed">Nenhum paciente em atendimento na recepção</Text></Table.Td></Table.Tr>}</Table.Tbody>
          </Table>
        </Box>
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
                  label="Temp (°C)"
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
        title={checklistPatient ? `Checklist de recepção • ${checklistPatient.nomeCompleto}` : 'Checklist de recepção'}
        size={isMobile ? '100%' : '80rem'}
        centered
        fullScreen={isMobile}
      >
        <Stack gap="lg">
          {checklistPatient && (
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={6} style={{ flex: 1 }}>
                <Text fw={700}>{checklistPatient.nomeCompleto}</Text>
                <Group gap="md" wrap="wrap">
                  <Text size="sm" c="dimmed">CPF: {formatCPF(checklistPatient.cpf) || 'Não informado'}</Text>
                  <Text size="sm" c="dimmed">Nascimento: {checklistPatient.dataNascimento || 'Não informado'}</Text>
                  <Text size="sm" c="dimmed">Sexo: {checklistPatient.sexo || 'Não informado'}</Text>
                </Group>
                <Group gap="md" wrap="wrap">
                  <Text size="sm" c="dimmed">Telefone: {checklistPatient.telefone || 'Não informado'}</Text>
                  <Text size="sm" c="dimmed">E-mail: {checklistPatient.email || 'Não informado'}</Text>
                </Group>
                <Group gap="md" wrap="wrap">
                  <Text size="sm" c="dimmed">Convênio: {checklistPatient.convenio || 'Particular'}</Text>
                  <Text size="sm" c="dimmed">Carteira: {checklistPatient.numCarteira || 'Não informada'}</Text>
                  <Text size="sm" c="dimmed">Agenda: {checklistPatient.agenda || 'Não informada'}</Text>
                </Group>
              </Stack>
              <Badge variant="light" color={isPrivateCare(checklistPatient) ? 'orange' : 'blue'}>
                {isPrivateCare(checklistPatient) ? 'PARTICULAR' : (checklistPatient.convenio || 'CONVÊNIO')}
              </Badge>
            </Group>
          )}

          <Stepper active={checklistStep} onStepClick={setChecklistStep} allowNextStepsSelect={false}>
            <Stepper.Step label="Dados" description="Conferência básica">
              <Stack gap="md" mt="md">
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
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Convênio" description="Guia e autorização">
              <Stack gap="md" mt="md">
                <Box
                  p="md"
                  style={{
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: 12,
                    backgroundColor: 'var(--mantine-color-default)',
                  }}
                >
                  <Group justify="space-between" align="flex-start" wrap="wrap">
                    <Box>
                      <Text size="sm" c="dimmed">Convênio do cadastro</Text>
                      <Text fw={600}>{checklistPatient?.convenio || 'Particular'}</Text>
                    </Box>
                    <Group gap="xs">
                      <Badge color={checklistPatient?.statusAutorizacao ? 'blue' : 'gray'} variant="light">
                        {checklistPatient?.statusAutorizacao || 'Sem autorização prévia'}
                      </Badge>
                      {checklistPatient?.numCarteira && (
                        <Badge color="teal" variant="light">
                          Carteira {checklistPatient.numCarteira}
                        </Badge>
                      )}
                    </Group>
                  </Group>
                  <Group gap="lg" mt="sm" wrap="wrap">
                    <Text size="sm" c="dimmed">
                      Validade: {checklistPatient?.validadeConvenio || 'Não informada'}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Agenda: {checklistPatient?.agenda || 'Não informada'}
                    </Text>
                  </Group>
                </Box>
                <Checkbox
                  label="Atendimento particular"
                  checked={checklistData.atendimentoParticular}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setChecklistData((prev) => ({ ...prev, atendimentoParticular: checked }));
                  }}
                />
                {!checklistData.atendimentoParticular && !isPrivateCare(checklistPatient) && (
                  <>
                    <Checkbox
                      label="Autorização do convênio conferida"
                      checked={checklistData.autorizacaoConferida}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setChecklistData((prev) => ({ ...prev, autorizacaoConferida: checked }));
                      }}
                    />
                    <TextInput
                      label="Número da guia"
                      placeholder="Informe o número da guia"
                      value={checklistData.guiaNumero}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setChecklistData((prev) => ({ ...prev, guiaNumero: value }));
                      }}
                    />
                    {checklistPatient?.statusAutorizacao && (
                      <Text size="sm" c="dimmed">
                        Status prévio encontrado: {checklistPatient.statusAutorizacao}
                      </Text>
                    )}
                  </>
                )}
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Pagamento" description="Particular/coparticipação">
              <Stack gap="md" mt="md">
                {checklistData.atendimentoParticular || isPrivateCare(checklistPatient) ? (
                  <>
                    <Box
                      p="md"
                      style={{
                        border: '1px solid var(--mantine-color-default-border)',
                        borderRadius: 12,
                        backgroundColor: 'var(--mantine-color-default)',
                      }}
                    >
                      <Text fw={600}>Cobrança da recepção</Text>
                      <Text size="sm" c="dimmed" mt={4}>
                        Ao concluir essa etapa, o sistema gera automaticamente a fatura no módulo de Faturamento.
                      </Text>
                    </Box>
                    <NumberInput
                      label="Valor pago"
                      placeholder="Informe o valor recebido"
                      value={checklistData.valorPagamento}
                      onChange={(value) => {
                        setChecklistData((prev) => ({ ...prev, valorPagamento: typeof value === 'number' ? value : Number(value) || 0 }));
                      }}
                      min={0}
                      decimalScale={2}
                      fixedDecimalScale
                      prefix="R$ "
                    />
                    <Select
                      label="Forma de pagamento"
                      placeholder="Selecione a forma de pagamento"
                      value={checklistData.formaPagamento}
                      onChange={(value) => {
                        setChecklistData((prev) => ({ ...prev, formaPagamento: value || '' }));
                      }}
                      data={[
                        { value: 'PIX', label: 'PIX' },
                        { value: 'Cartão de crédito', label: 'Cartão de crédito' },
                        { value: 'Cartão de débito', label: 'Cartão de débito' },
                        { value: 'Dinheiro', label: 'Dinheiro' },
                        { value: 'Transferência', label: 'Transferência' },
                      ]}
                    />
                    <Checkbox
                      label="Pagamento realizado na recepção"
                      checked={checklistData.pagamentoRealizado}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setChecklistData((prev) => ({ ...prev, pagamentoRealizado: checked }));
                      }}
                    />
                  </>
                ) : (
                  <Box
                    p="md"
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 12,
                      backgroundColor: 'var(--mantine-color-default)',
                    }}
                  >
                    <Text fw={600}>Atendimento por convênio</Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      Não há cobrança direta nessa etapa. Seguimos apenas com a conferência da autorização e da guia.
                    </Text>
                    <Group gap="lg" mt="sm" wrap="wrap">
                      <Text size="sm" c="dimmed">
                        Guia: {checklistData.guiaNumero || 'Não informada'}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Autorização: {checklistData.autorizacaoConferida ? 'Conferida' : (checklistPatient?.statusAutorizacao || 'Pendente')}
                      </Text>
                    </Group>
                  </Box>
                )}
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Revisão" description="Checagem final">
              <Stack gap="md" mt="md">
                <Checkbox
                  label="Informações do agendamento conferidas"
                  checked={checklistData.agendaConferida}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setChecklistData((prev) => ({ ...prev, agendaConferida: checked }));
                  }}
                />
                <Textarea
                  label="Observações finais"
                  placeholder="Pendências, recados ou observações do atendimento"
                  value={checklistData.observacoes}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setChecklistData((prev) => ({ ...prev, observacoes: value }));
                  }}
                  minRows={3}
                />
                <Divider />
                <Text size="sm" c="dimmed">
                  Revise com calma o que foi conferido antes de fechar o atendimento da recepção.
                </Text>
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Validação facial" description="Identidade final">
              <Stack gap="md" mt="md">
                <Box
                  p="md"
                  style={{
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: 12,
                    backgroundColor: 'var(--mantine-color-default)',
                  }}
                >
                  <Text fw={600}>Reconhecimento facial final</Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    Antes de concluir a recepção, valide a identidade do paciente novamente para confirmar que o atendimento está sendo liberado para a pessoa correta.
                  </Text>
                </Box>

                <Group gap="md" align="center" wrap="wrap">
                  <Button
                    bg={DARK_BLUE}
                    leftSection={<Camera size={16} />}
                    onClick={() => setFacialValidationOpen(true)}
                    loading={facialValidationLoading}
                  >
                    Realizar validação facial
                  </Button>

                  {facialValidationVerified ? (
                    <Badge color="green" variant="light" size="lg">
                      Identidade validada
                    </Badge>
                  ) : (
                    <Badge color="orange" variant="light" size="lg">
                      Validação pendente
                    </Badge>
                  )}
                </Group>

                <Group gap="lg" wrap="wrap">
                  <Text size="sm" c="dimmed">
                    Paciente esperado: {checklistPatient?.nomeCompleto || 'Não informado'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    CPF esperado: {formatCPF(checklistPatient?.cpf || '') || 'Não informado'}
                  </Text>
                </Group>

                {(facialValidationName || facialValidationTrust !== null) && (
                  <Box
                    p="md"
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 12,
                    }}
                  >
                    <Text size="sm" c="dimmed">Último resultado da validação</Text>
                    <Text fw={600} mt={4}>
                      {facialValidationName || 'Paciente não identificado'}
                    </Text>
                    {facialValidationTrust !== null && (
                      <Text size="sm" c="dimmed" mt={4}>
                        Confiança do reconhecimento: {(facialValidationTrust * 100).toFixed(1)}%
                      </Text>
                    )}
                  </Box>
                )}
              </Stack>
            </Stepper.Step>
          </Stepper>

          <Group justify="space-between">
            <Button
              variant="default"
              onClick={() => setChecklistStep((prev) => Math.max(prev - 1, 0))}
              disabled={checklistStep === 0 || checklistLoading}
            >
              Voltar
            </Button>

            <Group>
              {checklistStep < 4 ? (
                <Button
                  bg={DARK_BLUE}
                  onClick={() => setChecklistStep((prev) => prev + 1)}
                  disabled={!canAdvanceChecklist() || checklistLoading}
                >
                  Próxima etapa
                </Button>
              ) : (
                <Button
                  bg={DARK_BLUE}
                  onClick={handleFinishChecklist}
                  disabled={!canAdvanceChecklist() || checklistLoading}
                  loading={checklistLoading}
                >
                  Concluir checklist
                </Button>
              )}
            </Group>
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
