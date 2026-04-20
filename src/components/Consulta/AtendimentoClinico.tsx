import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionIcon, Alert, Badge, Box, Button, Group, Paper, Select, SimpleGrid, Skeleton, Stack, Tabs, Text, Textarea, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { CheckCircle2, ChevronLeft, FlaskConical, Play, Printer, Save, WandSparkles } from 'lucide-react';
import { Header } from '../Header/Header';
import consultationService from '../../services/consultationService';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import medicalRecordService from '../../services/medicalRecordService';
import { formatCNPJ, formatCPF, formatPhone } from '../../utils/formatters';

const CALLED_STATUS = 'Chamado para atendimento';
const IN_PROGRESS_STATUS = 'Em atendimento';
const DONE_STATUS = 'Atendimento concluido';
const QUEUE_AUDIT_PREFIX = '[queue-transition]';

const normalizeArray = (response: any) => (
  Array.isArray(response) ? response : (Array.isArray(response?.items) ? response.items : (Array.isArray(response?.data?.items) ? response.data.items : []))
);

const escapeHtml = (value: any) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const openPrintWindow = (title: string, contentHtml: string) => {
  const popup = window.open('', '_blank', 'width=980,height=760');
  if (!popup) return;
  popup.document.write(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 16mm; }
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        color: #1f2937;
        margin: 0;
      }
      .sheet {
        border: 1px solid #d1d5db;
        border-radius: 10px;
        padding: 18px;
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #0f4c81;
        padding-bottom: 10px;
        margin-bottom: 14px;
      }
      .title {
        margin: 0;
        font-size: 22px;
        color: #0f172a;
      }
      .meta {
        margin-top: 6px;
        font-size: 12px;
        color: #475569;
        line-height: 1.45;
      }
      .section {
        margin-top: 12px;
      }
      .section h3 {
        margin: 0 0 8px 0;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: .4px;
        color: #0f4c81;
      }
      .card {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 8px;
      }
      .line {
        margin: 2px 0;
        font-size: 13px;
      }
      .pill {
        display: inline-block;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 11px;
        color: #334155;
      }
      .free {
        white-space: pre-wrap;
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        padding: 10px 12px;
        min-height: 38px;
      }
      .footer {
        margin-top: 16px;
        font-size: 11px;
        color: #64748b;
        text-align: right;
      }
    </style>
  </head>
  <body>
    ${contentHtml}
  </body>
</html>`);
  popup.document.close();
  popup.focus();
  popup.print();
};

const getClinicPrintInfo = () => {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : {};
    const branch = user?.sector?.branch || user?.branch || {};
    const company = branch?.company || user?.company || {};

    const clinicName = String(
      branch?.tradeName
      || branch?.socialName
      || company?.tradeName
      || company?.legalName
      || 'Clínica',
    ).trim();
    const cnpjRaw = String(company?.cnpj || branch?.cnpj || '').trim();
    const address = String(branch?.address || company?.address || '').trim();
    const phoneRaw = String(branch?.phone || company?.phone || '').trim();

    return {
      clinicName,
      cnpj: cnpjRaw ? formatCNPJ(cnpjRaw) : '',
      address,
      phone: phoneRaw ? formatPhone(phoneRaw) : '',
    };
  } catch {
    return {
      clinicName: 'Clínica',
      cnpj: '',
      address: '',
      phone: '',
    };
  }
};

const formatClinicalField = (value: any) => {
  const normalized = String(value || '').trim();
  return normalized || 'Não informado';
};

const formatRecordDate = (value: any) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleString('pt-BR');
};

const formatDateOnlyPtBr = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

const normalizeStatus = (value?: string | null) => String(value || '').trim().toUpperCase();

const isExamOrderStatus = (value?: string | null) => {
  const status = normalizeStatus(value);
  return [
    'PEDIDO_MEDICO',
    'AGENDADO',
    'CONFIRMADO',
    'EM_ANDAMENTO',
    'EM ATENDIMENTO',
    'REALIZADO',
    'FINALIZADO',
    'CANCELADO',
    'NAO_COMPARECEU',
    'NÃO_COMPARECEU',
  ].includes(status);
};

const formatOrderStatusLabel = (value?: string | null) => {
  const status = normalizeStatus(value);
  if (!status) return 'Pedido médico';
  if (status === 'PEDIDO_MEDICO') return 'Pedido médico';
  if (status === 'AGENDADO') return 'Agendado';
  if (status === 'CONFIRMADO') return 'Confirmado';
  if (status === 'EM_ANDAMENTO' || status === 'EM ATENDIMENTO') return 'Em andamento';
  if (status === 'REALIZADO' || status === 'FINALIZADO') return 'Realizado';
  if (status === 'CANCELADO') return 'Cancelado';
  if (status === 'NAO_COMPARECEU' || status === 'NÃO_COMPARECEU') return 'Não compareceu';
  return status;
};

const getOrderStatusColor = (value?: string | null) => {
  const status = normalizeStatus(value);
  if (!status || status === 'PEDIDO_MEDICO') return 'gray';
  if (status === 'AGENDADO' || status === 'CONFIRMADO') return 'blue';
  if (status === 'EM_ANDAMENTO' || status === 'EM ATENDIMENTO') return 'teal';
  if (status === 'REALIZADO' || status === 'FINALIZADO') return 'green';
  if (status === 'CANCELADO' || status === 'NAO_COMPARECEU' || status === 'NÃO_COMPARECEU') return 'red';
  return 'gray';
};

const formatOrderDateTime = (order: any) => {
  const scheduledDate = String(order?.date || '').trim();
  const scheduledTime = String(order?.time || '').trim();
  if (scheduledDate || scheduledTime) {
    return `${scheduledDate ? formatDateOnlyPtBr(scheduledDate) : 'Data não definida'}${scheduledTime ? ` às ${scheduledTime}` : ''}`;
  }

  const preferredDate = String(order?.preferredDate || '').trim();
  const preferredTime = String(order?.preferredTime || '').trim();
  if (preferredDate || preferredTime) {
    return `${preferredDate ? `${formatDateOnlyPtBr(preferredDate)} (preferencial)` : 'Data preferencial não definida'}${preferredTime ? ` às ${preferredTime}` : ''}`;
  }

  return 'Data não definida';
};

const splitTriageNotes = (value: any) => {
  const lines = String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const auditLines = lines.filter((line) => line.startsWith(QUEUE_AUDIT_PREFIX));
  const clinicalLines = lines.filter((line) => !line.startsWith(QUEUE_AUDIT_PREFIX));
  return {
    clinicalNotes: clinicalLines.join('\n'),
    auditNotes: auditLines.join('\n'),
  };
};

export function AtendimentoClinico() {
  const navigate = useNavigate();
  const { consultationId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPendingRecordSave, setHasPendingRecordSave] = useState(false);
  const [consultation, setConsultation] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [currentMedicalRecordId, setCurrentMedicalRecordId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [triageAuditNotes, setTriageAuditNotes] = useState('');
  const [examConfig, setExamConfig] = useState<{ doctorCanScheduleExamFromConsultation: boolean }>({ doctorCanScheduleExamFromConsultation: false });
  const [examProcedures, setExamProcedures] = useState<Array<{ value: string; label: string; durationMinutes: number }>>([]);
  const [slotOptions, setSlotOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState<any>({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    physicalExamination: '',
    diagnosis: '',
    treatment: '',
    examRequests: '',
    prescriptions: '',
    notes: '',
  });
  const [examOrder, setExamOrder] = useState<any>({
    procedureId: '',
    examType: '',
    priority: 'ROTINA',
    notes: '',
    preferredDate: '',
    preferredTime: '',
    scheduleSlot: '',
  });

  const status = String(consultation?.queue || '');
  const isDone = status === DONE_STATUS;
  const hasFinalizedExamReport = Boolean(consultation?.hasFinalizedExamReport);
  const hasExamImagesAvailable = Boolean(consultation?.hasExamImagesAvailable);
  const latestFinalizedExamReport = consultation?.latestFinalizedExamReport || null;

  const setFormField = (field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
    setHasPendingRecordSave(true);
  };

  const resolvePatientFromAppointment = async (appointmentRef: any) => {
    const patientId = String(appointmentRef?.patientId || '').trim();
    if (patientId) {
      return patientService.getPatientById(patientId);
    }
    const patientCpf = String(appointmentRef?.patientCpf || '').replace(/\D/g, '').trim();
    if (!patientCpf) return null;
    try {
      return await patientService.getPatientByCpf(patientCpf);
    } catch {
      return null;
    }
  };

  const loadExamOrders = async (params: { consultationId: string; patientId?: string; patientCpf?: string }) => {
    const appointmentsRes = await appointmentService.list({
      patientId: params.patientId || undefined,
      patientCpf: params.patientCpf || undefined,
      limit: 300,
      offset: 0,
    });
    const all = normalizeArray(appointmentsRes);
    const exams = all.filter((a: any) => String(a?.type || '').toUpperCase() === 'EXAME');
    const sameConsultation = exams
      .filter((a: any) => String(a?.sourceConsultationId || '').trim() === params.consultationId)
      .filter((a: any) => isExamOrderStatus(a?.status))
      .sort((a: any, b: any) => new Date(String(b?.createdAt || 0)).getTime() - new Date(String(a?.createdAt || 0)).getTime());
    setOrders(sameConsultation);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [c, configRes, proceduresRes] = await Promise.all([
        consultationService.getById(consultationId),
        consultationService.getExamOrderConfig(),
        consultationService.listExamProcedures(consultationId),
      ]);
      setConsultation(c);
      setExamConfig({ doctorCanScheduleExamFromConsultation: Boolean(configRes?.doctorCanScheduleExamFromConsultation) });
      const procedures = normalizeArray(proceduresRes).map((item: any) => ({
        value: String(item?.id || ''),
        label: String(item?.name || 'Procedimento'),
        durationMinutes: Number(item?.durationMinutes || 30),
      })).filter((item: any) => item.value);
      setExamProcedures(procedures);
      const appointmentId = String(c?.appointmentId || c?.appointment?.id || '').trim();
      const a = appointmentId ? await appointmentService.getById(appointmentId) : null;
      setAppointment(a);
      const patientId = String(a?.patientId || '').trim();
      const patientCpf = String(a?.patientCpf || '').replace(/\D/g, '').trim();
      const p = await resolvePatientFromAppointment(a);
      setPatient(p);
      const resolvedPatientId = String(p?.id || patientId || '').trim();
      const [h] = await Promise.all([
        resolvedPatientId ? medicalRecordService.list({ patientId: resolvedPatientId, limit: 20, offset: 0 }) : Promise.resolve({ records: [] }),
        (resolvedPatientId || patientCpf)
          ? loadExamOrders({
              consultationId,
              patientId: resolvedPatientId || undefined,
              patientCpf: patientCpf || undefined,
            })
          : Promise.resolve().then(() => { setOrders([]); }),
      ]);
      const triageParts = splitTriageNotes(c?.triageNotes);
      setTriageAuditNotes(triageParts.auditNotes);
      const loadedRecords = Array.isArray(h?.records) ? h.records : normalizeArray(h);
      const currentConsultationRecord = loadedRecords.find((item: any) => String(item?.consultationId || '').trim() === consultationId) || null;
      setCurrentMedicalRecordId(currentConsultationRecord?.id ? String(currentConsultationRecord.id) : null);
      setHistoryRecords(currentConsultationRecord?.id
        ? loadedRecords.filter((item: any) => String(item?.id || '') !== String(currentConsultationRecord.id))
        : loadedRecords);
      setForm((prev: any) => ({
        ...prev,
        chiefComplaint: String(currentConsultationRecord?.chiefComplaint || c?.mainComplaint || ''),
        historyOfPresentIllness: String(currentConsultationRecord?.historyOfPresentIllness || c?.anamnese || ''),
        physicalExamination: String(currentConsultationRecord?.physicalExamination || ''),
        diagnosis: String(currentConsultationRecord?.diagnosis || ''),
        treatment: String(currentConsultationRecord?.treatment || c?.diseaseHistory || ''),
        prescriptions: String(currentConsultationRecord?.prescriptions || c?.medications || ''),
        examRequests: String(currentConsultationRecord?.examRequests || prev.examRequests || ''),
        notes: String(currentConsultationRecord?.notes || triageParts.clinicalNotes || ''),
      }));
      setHasPendingRecordSave(false);
    } catch (err: any) {
      showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Falha ao abrir atendimento.', color: 'red' });
      navigate('/consulta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [consultationId]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!examConfig.doctorCanScheduleExamFromConsultation) {
        setSlotOptions([]);
        return;
      }
      const procedureId = String(examOrder?.procedureId || '').trim();
      if (!procedureId) {
        setSlotOptions([]);
        return;
      }
      try {
        setLoadingSlots(true);
        const res = await consultationService.listExamSlots(consultationId, { procedureId, limit: 5 });
        const items = normalizeArray(res).map((item: any) => {
          const date = String(item?.date || '').trim();
          const time = String(item?.time || '').trim();
          const dateLabel = formatDateOnlyPtBr(date);
          const roomId = String(item?.roomId || '').trim();
          const equipmentId = String(item?.medicalEquipmentId || '').trim();
          const roomName = String(item?.roomName || 'Sala').trim();
          const equipmentName = String(item?.medicalEquipmentName || 'Equipamento').trim();
          const value = `${date}|${time}|${roomId}|${equipmentId}`;
          return { value, label: `${dateLabel || date} às ${time} • ${roomName} • ${equipmentName}` };
        }).filter((item: any) => !String(item.value).includes('|||'));
        setSlotOptions(items);
      } catch {
        setSlotOptions([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    void loadSlots();
  }, [consultationId, examConfig.doctorCanScheduleExamFromConsultation, examOrder?.procedureId]);

  const saveMedicalRecord = async () => {
    try {
      const resolvedPatient = await resolvePatientFromAppointment(appointment);
      const patientId = String(resolvedPatient?.id || '').trim();
      if (!patientId) return showNotification({ title: 'Paciente não vinculado', message: 'Não foi possível salvar.', color: 'red' });
      setSaving(true);
      const payload = {
        patientId,
        consultationId: consultationId || undefined,
        doctorId: consultation?.doctorId || undefined,
        chiefComplaint: form.chiefComplaint || undefined,
        historyOfPresentIllness: form.historyOfPresentIllness || undefined,
        physicalExamination: form.physicalExamination || undefined,
        diagnosis: form.diagnosis || undefined,
        treatment: form.treatment || undefined,
        prescriptions: form.prescriptions || undefined,
        examRequests: form.examRequests || undefined,
        notes: form.notes || undefined,
      };

      if (currentMedicalRecordId) {
        await medicalRecordService.update(currentMedicalRecordId, payload);
      } else {
        const created = await medicalRecordService.create(payload);
        if (created?.id) setCurrentMedicalRecordId(String(created.id));
      }
      await consultationService.update(consultationId, {
        mainComplaint: form.chiefComplaint || undefined,
        anamnese: form.historyOfPresentIllness || undefined,
        diseaseHistory: form.treatment || undefined,
        medications: form.prescriptions || undefined,
        triageNotes: [String(form.notes || '').trim(), triageAuditNotes].filter(Boolean).join('\n') || undefined,
      });
      showNotification({ title: 'Prontuário salvo', message: 'Registro clínico salvo.', color: 'green' });
      setHasPendingRecordSave(false);
      await loadData();
    } catch (err: any) {
      showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Falha ao salvar.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const emitExamOrder = async () => {
    const procedureId = String(examOrder.procedureId || '').trim();
    const selectedProcedure = examProcedures.find((item) => item.value === procedureId);
    const examType = String(selectedProcedure?.label || examOrder.examType || '').trim();
    if (!examType) return showNotification({ title: 'Informe o exame', message: 'Selecione o procedimento solicitado.', color: 'yellow' });

    const slotRaw = String(examOrder.scheduleSlot || '').trim();
    const [scheduleDate, scheduleTime, scheduleRoomId, scheduleMedicalEquipmentId] = slotRaw.includes('|') ? slotRaw.split('|') : ['', '', '', ''];
    if (examConfig.doctorCanScheduleExamFromConsultation && (!scheduleDate || !scheduleTime)) {
      return showNotification({
        title: 'Selecione um horário',
        message: 'Para agendar o exame agora, escolha uma das opções de agenda sugeridas.',
        color: 'yellow',
      });
    }

    try {
      setSaving(true);
      const res = await consultationService.createExamOrder(consultationId, {
        ...examOrder,
        procedureId: procedureId || undefined,
        examType,
        scheduleDate: examConfig.doctorCanScheduleExamFromConsultation && scheduleDate ? scheduleDate : undefined,
        scheduleTime: examConfig.doctorCanScheduleExamFromConsultation && scheduleTime ? scheduleTime : undefined,
        scheduleRoomId: examConfig.doctorCanScheduleExamFromConsultation && scheduleRoomId ? scheduleRoomId : undefined,
        scheduleMedicalEquipmentId: examConfig.doctorCanScheduleExamFromConsultation && scheduleMedicalEquipmentId ? scheduleMedicalEquipmentId : undefined,
      });
      const createdOrder = {
        ...(res?.appointment || {}),
        specialty: res?.appointment?.specialty || examType,
        status: res?.appointment?.status || (scheduleDate ? 'AGENDADO' : 'PEDIDO_MEDICO'),
        preferredDate: res?.appointment?.preferredDate || examOrder.preferredDate || undefined,
        preferredTime: res?.appointment?.preferredTime || examOrder.preferredTime || undefined,
      };
      setOrders((prev: any[]) => [createdOrder, ...prev]);
      setExamOrder({ procedureId: '', examType: '', priority: 'ROTINA', notes: '', preferredDate: '', preferredTime: '', scheduleSlot: '' });
      setSlotOptions([]);
      showNotification({
        title: examConfig.doctorCanScheduleExamFromConsultation && scheduleDate ? 'Exame agendado' : 'Pedido emitido',
        message: examConfig.doctorCanScheduleExamFromConsultation && scheduleDate
          ? 'Exame agendado diretamente na consulta.'
          : 'Pedido estruturado registrado.',
        color: 'green',
      });
    } catch (err: any) {
      showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Falha ao emitir pedido.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const finishConsultation = async () => {
    if (hasPendingRecordSave) {
      return showNotification({
        title: 'Salve o prontuário',
        message: 'Existem alterações clínicas não salvas. Clique em "Salvar no prontuário" antes de finalizar.',
        color: 'yellow',
      });
    }
    if (!form.chiefComplaint || !form.historyOfPresentIllness || !form.diagnosis || !form.treatment || (!form.prescriptions && !form.examRequests)) {
      return showNotification({ title: 'Campos obrigatórios', message: 'Preencha evolução mínima antes de finalizar.', color: 'red' });
    }
    try {
      setSaving(true);
      await consultationService.update(consultationId, {
        queue: DONE_STATUS,
        mainComplaint: form.chiefComplaint,
        anamnese: form.historyOfPresentIllness,
        diseaseHistory: form.treatment,
        medications: form.prescriptions,
        triageNotes: [String(form.notes || '').trim(), triageAuditNotes].filter(Boolean).join('\n') || undefined,
      });
      showNotification({ title: 'Atendimento finalizado', message: 'Consulta concluida.', color: 'green' });
      navigate('/consulta');
    } catch (err: any) {
      showNotification({ title: 'Erro', message: err?.response?.data?.message || err?.message || 'Falha ao finalizar.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintExamOrder = () => {
    const clinic = getClinicPrintInfo();
    const orderItems = orders
      .slice(0, 20)
      .map((o: any) => {
        const exam = escapeHtml(String(o?.specialty || o?.examType || 'Exame solicitado'));
        const dateTimeText = formatOrderDateTime(o);
        const statusText = formatOrderStatusLabel(o?.status);
        const notesText = String(o?.orderNotes || '').trim();
        return `
          <div class="card">
            <div class="line"><strong>${exam}</strong></div>
            <div class="line">${escapeHtml(`${dateTimeText} - ${statusText}`)}</div>
            ${notesText ? `<div class="line"><strong>Observações:</strong> ${escapeHtml(notesText)}</div>` : ''}
          </div>
        `;
      })
      .join('');

    const freeText = String(form.examRequests || '').trim();

    openPrintWindow(
      'Pedido Médico',
      `
      <div class="sheet">
        <div class="head">
          <div>
            <h1 class="title">Pedido Médico</h1>
            <div class="meta">
              <div><strong>Clínica:</strong> ${escapeHtml(clinic.clinicName)}</div>
              ${clinic.cnpj ? `<div><strong>CNPJ:</strong> ${escapeHtml(clinic.cnpj)}</div>` : ''}
              ${clinic.address ? `<div><strong>Endereço:</strong> ${escapeHtml(clinic.address)}</div>` : ''}
              ${clinic.phone ? `<div><strong>Telefone:</strong> ${escapeHtml(clinic.phone)}</div>` : ''}
            </div>
            <div class="meta" style="margin-top:8px;">
              <div><strong>Paciente:</strong> ${escapeHtml(patient?.name || consultation?.patientName || '-')}</div>
              <div><strong>Médico:</strong> ${escapeHtml(consultation?.doctorName || appointment?.doctorName || '-')}</div>
            </div>
          </div>
          <div class="meta">${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>
        </div>

        <div class="section">
          <h3>Pedidos estruturados desta consulta</h3>
          ${orderItems || '<div class="card"><div class="line">Nenhum pedido estruturado encontrado.</div></div>'}
        </div>

        <div class="section">
          <h3>Pedidos (texto livre)</h3>
          <div class="free">${escapeHtml(freeText || 'Sem conteúdo informado.')}</div>
        </div>

        <div class="footer">Documento gerado pelo sistema Saudy</div>
      </div>
      `,
    );
  };

  const handlePrintPrescription = () => {
    const clinic = getClinicPrintInfo();
    const treatmentText = String(form.treatment || '').trim();
    const prescriptionText = String(form.prescriptions || '').trim();
    openPrintWindow(
      'Receituário Médico',
      `
      <div class="sheet">
        <div class="head">
          <div>
            <h1 class="title">Receituário Médico</h1>
            <div class="meta">
              <div><strong>Clínica:</strong> ${escapeHtml(clinic.clinicName)}</div>
              ${clinic.cnpj ? `<div><strong>CNPJ:</strong> ${escapeHtml(clinic.cnpj)}</div>` : ''}
              ${clinic.address ? `<div><strong>Endereço:</strong> ${escapeHtml(clinic.address)}</div>` : ''}
              ${clinic.phone ? `<div><strong>Telefone:</strong> ${escapeHtml(clinic.phone)}</div>` : ''}
            </div>
            <div class="meta" style="margin-top:8px;">
              <div><strong>Paciente:</strong> ${escapeHtml(patient?.name || consultation?.patientName || '-')}</div>
              <div><strong>Médico:</strong> ${escapeHtml(consultation?.doctorName || appointment?.doctorName || '-')}</div>
            </div>
          </div>
          <div class="meta">${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>
        </div>

        <div class="section">
          <h3>Conduta / Tratamento</h3>
          <div class="free">${escapeHtml(treatmentText || 'Não informado')}</div>
        </div>

        <div class="section">
          <h3>Prescrição</h3>
          <div class="free">${escapeHtml(prescriptionText || 'Não informado')}</div>
        </div>

        <div class="footer">Documento gerado pelo sistema Saudy</div>
      </div>
      `,
    );
  };

  if (loading) return <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}><Header /><Box p="xl"><Skeleton h={80} /><Skeleton mt="md" h={300} /></Box></Box>;

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <Group mb="lg" justify="space-between"><Group><ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/consulta')}><ChevronLeft size={28} /></ActionIcon><Box><Text fw={700} size="xl">Atendimento Clínico</Text><Text size="sm" c="dimmed">PEP e condução completa da consulta médica</Text></Box></Group><Badge color={isDone ? 'green' : 'blue'} variant="light">{status || '-'}</Badge></Group>
        {hasFinalizedExamReport && <Alert mb="md" color="teal" title="Laudo de exame finalizado" icon={<CheckCircle2 size={16} />}><Group justify="space-between"><Text size="sm">{latestFinalizedExamReport?.exam ? `Último laudo finalizado: ${latestFinalizedExamReport.exam}.` : 'Paciente com laudo finalizado para acompanhamento médico.'}{hasExamImagesAvailable ? ' Imagens disponíveis para revisão.' : ''}</Text><Button size="xs" variant="light" onClick={() => navigate('/laudo-exames')}>Abrir laudo</Button></Group></Alert>}
        <Paper p="md" withBorder radius="md" mb="md"><SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}><Text>Paciente: <b>{patient?.name || consultation?.patientName || '-'}</b></Text><Text>CPF: <b>{patient?.cpf ? formatCPF(patient.cpf) : '-'}</b></Text><Text>Médico: <b>{consultation?.doctorName || appointment?.doctorName || '-'}</b></Text></SimpleGrid></Paper>
        <Paper p="md" withBorder radius="md">
          <Tabs defaultValue="evolucao">
            <Tabs.List>
              <Tabs.Tab value="evolucao">Evolução</Tabs.Tab>
              <Tabs.Tab value="pedidos">Pedidos</Tabs.Tab>
              <Tabs.Tab value="receita">Receituário</Tabs.Tab>
              <Tabs.Tab value="historia">Histórico</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="evolucao" pt="md">
              <Textarea mt="sm" label="Queixa principal" autosize minRows={3} maxRows={8} value={form.chiefComplaint} onChange={(e) => { const value = e.currentTarget.value; setFormField('chiefComplaint', value); }} />
              <Textarea mt="sm" label="História da doença atual" autosize minRows={4} maxRows={12} value={form.historyOfPresentIllness} onChange={(e) => { const value = e.currentTarget.value; setFormField('historyOfPresentIllness', value); }} />
              <Textarea mt="sm" label="Exame físico" autosize minRows={3} maxRows={10} value={form.physicalExamination} onChange={(e) => { const value = e.currentTarget.value; setFormField('physicalExamination', value); }} />
              <Textarea mt="sm" label="Diagnóstico/CID" autosize minRows={3} maxRows={8} value={form.diagnosis} onChange={(e) => { const value = e.currentTarget.value; setFormField('diagnosis', value); }} />
              <Textarea mt="sm" label="Observações" autosize minRows={4} maxRows={12} value={form.notes} onChange={(e) => { const value = e.currentTarget.value; setFormField('notes', value); }} />
            </Tabs.Panel>
            <Tabs.Panel value="pedidos" pt="md">
              <Group mb="xs" justify="space-between"><Text fw={600}>Pedido estruturado</Text><Button size="xs" variant="light" leftSection={<WandSparkles size={14} />} onClick={() => setExamOrder((p: any) => ({ ...p, notes: p.notes || 'Solicitação médica registrada em consulta.' }))}>Sugerir texto</Button></Group>
              {!examConfig.doctorCanScheduleExamFromConsultation && <Alert mb="sm" color="blue" variant="light">Nesta filial, o médico emite o pedido e o agendamento do exame é realizado pela recepção.</Alert>}
              {examConfig.doctorCanScheduleExamFromConsultation && <Alert mb="sm" color="teal" variant="light">Agendamento médico habilitado: selecione um dos horários sugeridos para já sair com o exame marcado.</Alert>}
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select
                  label="Procedimento de exame"
                  placeholder="Selecione o procedimento"
                  data={examProcedures}
                  searchable
                  value={examOrder.procedureId}
                  onChange={(v) => setExamOrder((p: any) => ({ ...p, procedureId: v || '', examType: examProcedures.find((i) => i.value === (v || ''))?.label || '', scheduleSlot: '' }))}
                />
                <Select label="Prioridade" data={[{ value: 'ROTINA', label: 'Rotina' }, { value: 'URGENTE', label: 'Urgente' }]} value={examOrder.priority} onChange={(v) => setExamOrder((p: any) => ({ ...p, priority: v || 'ROTINA' }))} />
              </SimpleGrid>
              {examConfig.doctorCanScheduleExamFromConsultation ? (
                <Select
                  mt="sm"
                  label="Sugestões de agenda (3-5 opções)"
                  placeholder={loadingSlots ? 'Buscando horários livres...' : 'Selecione uma data/horário'}
                  data={slotOptions}
                  value={examOrder.scheduleSlot}
                  onChange={(v) => setExamOrder((p: any) => ({ ...p, scheduleSlot: v || '' }))}
                  disabled={loadingSlots || !examOrder.procedureId}
                />
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }} mt="sm">
                  <TextInput
                    label="Data preferencial"
                    type="date"
                    value={examOrder.preferredDate}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setExamOrder((p: any) => ({ ...p, preferredDate: value }));
                    }}
                  />
                  <TextInput
                    label="Horário preferencial"
                    type="time"
                    step={60}
                    value={examOrder.preferredTime}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setExamOrder((p: any) => ({ ...p, preferredTime: value }));
                    }}
                  />
                </SimpleGrid>
              )}
              <Textarea mt="sm" label="Observações do pedido" autosize minRows={3} maxRows={8} value={examOrder.notes} onChange={(e) => { const value = e.currentTarget.value; setExamOrder((p: any) => ({ ...p, notes: value })); }} />
              <Group justify="space-between" mt="sm"><Button variant="light" leftSection={<Printer size={14} />} onClick={handlePrintExamOrder}>Imprimir pedido</Button><Button leftSection={<FlaskConical size={14} />} onClick={emitExamOrder} loading={saving}>{examConfig.doctorCanScheduleExamFromConsultation ? 'Agendar exame' : 'Emitir pedido'}</Button></Group>
              {orders.length > 0 && (
                <Paper withBorder p="sm" mt="sm">
                  <Text fw={600} mb="xs">Pedidos emitidos nesta consulta</Text>
                  <Stack gap={8}>
                    {orders.slice(0, 8).map((o: any) => (
                      <Group key={String(o.id)} justify="space-between" align="center" wrap="wrap">
                        <Box>
                          <Text size="sm" fw={600}>{String(o.specialty || o.examType || 'Exame solicitado')}</Text>
                          <Text size="xs" c="dimmed">
                            {formatOrderDateTime(o)}
                            {o?.orderNotes ? ` • ${String(o.orderNotes)}` : ''}
                          </Text>
                        </Box>
                        <Badge variant="light" color={getOrderStatusColor(o?.status)}>
                          {formatOrderStatusLabel(o?.status)}
                        </Badge>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              )}
              <Textarea mt="sm" label="Pedidos (texto livre)" value={form.examRequests} onChange={(e) => { const value = e.currentTarget.value; setFormField('examRequests', value); }} />
            </Tabs.Panel>
            <Tabs.Panel value="receita" pt="md">
              <Textarea label="Conduta/tratamento" autosize minRows={4} maxRows={12} value={form.treatment} onChange={(e) => { const value = e.currentTarget.value; setFormField('treatment', value); }} />
              <Group justify="space-between" mt="sm"><Text fw={600}>Receituário</Text><Button size="xs" variant="light" leftSection={<Printer size={14} />} onClick={handlePrintPrescription}>Imprimir receituario</Button></Group>
              <Textarea mt="xs" autosize minRows={4} maxRows={12} value={form.prescriptions} onChange={(e) => { const value = e.currentTarget.value; setFormField('prescriptions', value); }} />
            </Tabs.Panel>
            <Tabs.Panel value="historia" pt="md">
              {historyRecords.length === 0 ? (
                <Text c="dimmed">Nenhum histórico encontrado.</Text>
              ) : (
                <Stack gap="sm">
                  {historyRecords.map((r: any) => (
                    <Paper
                      key={r.id}
                      p="md"
                      radius="md"
                      withBorder
                      style={{
                        borderColor: 'rgba(99, 146, 255, 0.35)',
                        background: 'linear-gradient(180deg, rgba(18,33,78,0.35) 0%, rgba(8,18,52,0.2) 100%)',
                      }}
                    >
                      <Group justify="space-between" align="flex-start" mb="sm">
                        <Box>
                          <Text fw={700} size="md">{formatClinicalField(r.diagnosis || 'Registro clínico')}</Text>
                          <Text size="xs" c="dimmed">Consulta anterior</Text>
                        </Box>
                        <Badge variant="light" color="blue">{formatRecordDate(r.recordDate || r.createdAt)}</Badge>
                      </Group>
                      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                        <Box style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Queixa principal</Text>
                          <Text size="sm">{formatClinicalField(r.chiefComplaint)}</Text>
                        </Box>
                        <Box style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Doença atual</Text>
                          <Text size="sm">{formatClinicalField(r.historyOfPresentIllness)}</Text>
                        </Box>
                        <Box style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Conduta</Text>
                          <Text size="sm">{formatClinicalField(r.treatment)}</Text>
                        </Box>
                        <Box style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Receituário</Text>
                          <Text size="sm">{formatClinicalField(r.prescriptions)}</Text>
                        </Box>
                        <Box style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Pedidos</Text>
                          <Text size="sm">{formatClinicalField(r.examRequests)}</Text>
                        </Box>
                        <Box style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Observações</Text>
                          <Text size="sm">{formatClinicalField(r.notes)}</Text>
                        </Box>
                      </SimpleGrid>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Tabs.Panel>
          </Tabs>
        </Paper>
        <Group justify="space-between" mt="md"><Text size="sm" c="dimmed">Última atualização: {new Date(consultation?.updatedAt || Date.now()).toLocaleString('pt-BR')}</Text><Group>{status === CALLED_STATUS && <Button variant="light" color="green" leftSection={<Play size={14} />} onClick={async () => { await consultationService.update(consultationId, { queue: IN_PROGRESS_STATUS }); await loadData(); }}>Marcar em atendimento</Button>}<Button color={hasPendingRecordSave ? 'orange' : 'blue'} leftSection={<Save size={14} />} onClick={saveMedicalRecord} loading={saving}>{hasPendingRecordSave ? 'Salvar no prontuário*' : 'Salvar no prontuário'}</Button>{!isDone && <Button color="teal" variant="light" leftSection={<CheckCircle2 size={14} />} onClick={finishConsultation} loading={saving}>Finalizar atendimento</Button>}</Group></Group>
      </Box>
    </Box>
  );
}

