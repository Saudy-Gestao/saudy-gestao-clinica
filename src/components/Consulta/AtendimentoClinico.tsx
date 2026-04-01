import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionIcon, Alert, Badge, Box, Button, Group, Paper, Select, SimpleGrid, Skeleton, Stack, Tabs, Text, Textarea, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { BellRing, CheckCircle2, ChevronLeft, FlaskConical, Play, Printer, Save, ShieldAlert, WandSparkles } from 'lucide-react';
import { Header } from '../Header/Header';
import consultationService from '../../services/consultationService';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import medicalRecordService from '../../services/medicalRecordService';
import reportService from '../../services/reportService';
import { formatCPF } from '../../utils/formatters';

const CALLED_STATUS = 'Chamado para atendimento';
const IN_PROGRESS_STATUS = 'Em atendimento';
const DONE_STATUS = 'Atendimento concluido';
const QUEUE_AUDIT_PREFIX = '[queue-transition]';

const normalizeArray = (response: any) => (
  Array.isArray(response) ? response : (Array.isArray(response?.items) ? response.items : (Array.isArray(response?.data?.items) ? response.data.items : []))
);

const printDoc = (title: string, patient: string, doctor: string, text: string) => {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title></head><body style="font-family:Arial;padding:24px"><h2>${title}</h2><p>Paciente: ${patient || '-'} | Médico: ${doctor || '-'} | ${new Date().toLocaleString('pt-BR')}</p><pre style="white-space:pre-wrap;border:1px solid #ccc;padding:12px;border-radius:8px">${text || 'Sem conteúdo informado.'}</pre></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
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
  const [signals, setSignals] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [triageAuditNotes, setTriageAuditNotes] = useState('');
  const [examConfig, setExamConfig] = useState<{ doctorCanScheduleExamFromConsultation: boolean }>({ doctorCanScheduleExamFromConsultation: false });
  const [examProcedures, setExamProcedures] = useState<Array<{ value: string; label: string; durationMinutes: number }>>([]);
  const [slotOptions, setSlotOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState<any>({
    riskClassification: '',
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
  const pendingSignals = useMemo(() => signals.filter((s: any) => s.reportStatus !== 'FINALIZED'), [signals]);

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

  const loadExamSignals = async (params: { patientId?: string; patientCpf?: string }) => {
    const appointmentsRes = await appointmentService.list({
      patientId: params.patientId || undefined,
      patientCpf: params.patientCpf || undefined,
      limit: 120,
      offset: 0,
    });
    const all = normalizeArray(appointmentsRes);
    const exams = all.filter((a: any) => String(a?.type || '').toUpperCase() === 'EXAME');
    setOrders(exams.filter((a: any) => String(a?.status || '').toUpperCase() === 'PEDIDO_MEDICO'));
    const realized = exams.filter((a: any) => ['REALIZADO', 'COMPLETED', 'FINALIZADO'].includes(String(a?.status || '').toUpperCase()));
    const rows = await Promise.all(realized.map(async (a: any) => {
      const reportsRes = await reportService.list({ appointmentId: String(a.id), limit: 10, offset: 0 });
      const reports = normalizeArray(reportsRes);
      const finalized = reports.some((r: any) => String(r?.status || '').toLowerCase() === 'finalizado');
      return { appointmentId: String(a.id), examType: a.specialty || 'Exame', date: [a.date, a.time].filter(Boolean).join(' '), reportStatus: finalized ? 'FINALIZED' : (reports.length ? 'DRAFT' : 'NONE') };
    }));
    setSignals(rows);
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
          ? loadExamSignals({ patientId: resolvedPatientId || undefined, patientCpf: patientCpf || undefined })
          : Promise.resolve().then(() => { setOrders([]); setSignals([]); }),
      ]);
      const triageParts = splitTriageNotes(c?.triageNotes);
      setTriageAuditNotes(triageParts.auditNotes);
      setHistoryRecords(Array.isArray(h?.records) ? h.records : normalizeArray(h));
      setForm((prev: any) => ({
        ...prev,
        chiefComplaint: String(c?.mainComplaint || ''),
        historyOfPresentIllness: String(c?.anamnese || ''),
        treatment: String(c?.diseaseHistory || ''),
        prescriptions: String(c?.medications || ''),
        notes: triageParts.clinicalNotes,
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
          const value = `${date}|${time}`;
          return { value, label: `${date} às ${time}` };
        }).filter((item: any) => item.value !== '|');
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
      await medicalRecordService.create({
        patientId,
        doctorId: consultation?.doctorId || undefined,
        chiefComplaint: form.chiefComplaint || undefined,
        historyOfPresentIllness: form.historyOfPresentIllness || undefined,
        physicalExamination: form.physicalExamination || undefined,
        diagnosis: form.diagnosis || undefined,
        treatment: form.treatment || undefined,
        prescriptions: form.prescriptions || undefined,
        examRequests: form.examRequests || undefined,
        notes: form.notes || undefined,
      });
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
    const [scheduleDate, scheduleTime] = slotRaw.includes('|') ? slotRaw.split('|') : ['', ''];
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
      });
      setOrders((prev: any[]) => [res?.appointment || examOrder, ...prev]);
      setForm((prev: any) => ({ ...prev, examRequests: [prev.examRequests, `${examType}${examOrder.notes ? ` - ${examOrder.notes}` : ''}`].filter(Boolean).join('\n') }));
      setHasPendingRecordSave(true);
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

  if (loading) return <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}><Header /><Box p="xl"><Skeleton h={80} /><Skeleton mt="md" h={300} /></Box></Box>;

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <Group mb="lg" justify="space-between"><Group><ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/consulta')}><ChevronLeft size={28} /></ActionIcon><Box><Text fw={700} size="xl">Atendimento Clínico</Text><Text size="sm" c="dimmed">PEP e condução completa da consulta médica</Text></Box></Group><Badge color={isDone ? 'green' : 'blue'} variant="light">{status || '-'}</Badge></Group>
        {pendingSignals.length > 0 && <Alert mb="md" color="orange" title="Exame pronto pendente de laudo" icon={<BellRing size={16} />}><Group justify="space-between"><Text size="sm">Paciente com {pendingSignals.length} exame(s) executados aguardando laudo/finalização.</Text><Button size="xs" variant="light" onClick={() => navigate('/laudo-exames')}>Abrir laudo</Button></Group></Alert>}
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
              <Select label="Classificação de risco" data={[{ value: 'NAO_CLASSIFICADO', label: 'Não classificado' }, { value: 'AMARELO', label: 'Amarelo' }, { value: 'VERMELHO', label: 'Vermelho' }]} value={form.riskClassification} onChange={(v) => setForm((p: any) => ({ ...p, riskClassification: v || '' }))} leftSection={<ShieldAlert size={14} />} />
              <Textarea mt="sm" label="Queixa principal" value={form.chiefComplaint} onChange={(e) => { const value = e.currentTarget.value; setFormField('chiefComplaint', value); }} />
              <Textarea mt="sm" label="História da doença atual" value={form.historyOfPresentIllness} onChange={(e) => { const value = e.currentTarget.value; setFormField('historyOfPresentIllness', value); }} />
              <Textarea mt="sm" label="Exame físico" value={form.physicalExamination} onChange={(e) => { const value = e.currentTarget.value; setFormField('physicalExamination', value); }} />
              <Textarea mt="sm" label="Diagnóstico/CID" value={form.diagnosis} onChange={(e) => { const value = e.currentTarget.value; setFormField('diagnosis', value); }} />
              <Textarea mt="sm" label="Observações" value={form.notes} onChange={(e) => { const value = e.currentTarget.value; setFormField('notes', value); }} />
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
                  <TextInput label="Data preferencial" placeholder="YYYY-MM-DD" value={examOrder.preferredDate} onChange={(e) => { const value = e.currentTarget.value; setExamOrder((p: any) => ({ ...p, preferredDate: value })); }} />
                  <TextInput label="Horário preferencial" placeholder="HH:mm" value={examOrder.preferredTime} onChange={(e) => { const value = e.currentTarget.value; setExamOrder((p: any) => ({ ...p, preferredTime: value })); }} />
                </SimpleGrid>
              )}
              <Textarea mt="sm" label="Observações do pedido" value={examOrder.notes} onChange={(e) => { const value = e.currentTarget.value; setExamOrder((p: any) => ({ ...p, notes: value })); }} />
              <Group justify="space-between" mt="sm"><Button variant="light" leftSection={<Printer size={14} />} onClick={() => printDoc('Pedido Médico', patient?.name || '', consultation?.doctorName || '', form.examRequests)}>Imprimir pedido</Button><Button leftSection={<FlaskConical size={14} />} onClick={emitExamOrder} loading={saving}>{examConfig.doctorCanScheduleExamFromConsultation ? 'Agendar exame' : 'Emitir pedido'}</Button></Group>
              {orders.length > 0 && <Paper withBorder p="sm" mt="sm"><Text fw={600} mb="xs">Pedidos emitidos</Text>{orders.slice(0, 5).map((o: any) => <Text key={String(o.id)} size="sm">- {o.specialty || examOrder.examType} ({o.status || 'PEDIDO_MEDICO'})</Text>)}</Paper>}
              <Textarea mt="sm" label="Pedidos (texto livre)" value={form.examRequests} onChange={(e) => { const value = e.currentTarget.value; setFormField('examRequests', value); }} />
            </Tabs.Panel>
            <Tabs.Panel value="receita" pt="md">
              <Textarea label="Conduta/tratamento" value={form.treatment} onChange={(e) => { const value = e.currentTarget.value; setFormField('treatment', value); }} />
              <Group justify="space-between" mt="sm"><Text fw={600}>Receituário</Text><Button size="xs" variant="light" leftSection={<Printer size={14} />} onClick={() => printDoc('Receituário Médico', patient?.name || '', consultation?.doctorName || '', form.prescriptions)}>Imprimir receituario</Button></Group>
              <Textarea mt="xs" value={form.prescriptions} onChange={(e) => { const value = e.currentTarget.value; setFormField('prescriptions', value); }} />
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

