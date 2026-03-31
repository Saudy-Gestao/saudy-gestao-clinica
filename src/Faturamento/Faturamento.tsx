import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, Button, Table, Modal, Stack, ActionIcon, Paper, Popover, Grid, Badge, Skeleton, Checkbox, SimpleGrid, Tabs } from '@mantine/core';
import invoiceService from '../services/invoiceService';
import { useMediaQuery } from '@mantine/hooks';
import { Plus, ChevronLeft, User, ExternalLink, Calendar as CalendarIcon, Pencil, FileCode2 } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../themes/theme';
import { DatePicker } from '@mantine/dates';
import { formatDateInput } from '../utils/formatters';
import ResultModal from '../components/common/ResultModal';
import { useInvoicesQuery } from '../hooks/useInvoicesQuery';
import { queryKeys } from '../lib/queryKeys';
import { FloatingInput } from '../components/common/FloatingInput';
import { FloatingSelect } from '../components/common/FloatingSelect';
import { FloatingTextarea } from '../components/common/FloatingTextarea';
import { FloatingNumberInput } from '../components/common/FloatingNumberInput';
import tissBatchService from '../services/tissBatchService';
import { useTissBatchesQuery } from '../hooks/useTissBatchesQuery';

export function Header() {
  const isMobile = useMediaQuery('(max-width: 799px)');

  const currentTime = new Date();
  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const day = currentTime.getDate().toString().padStart(2, '0');
  const month = currentTime.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
  const year = currentTime.getFullYear();
  const dateStr = `${day} de ${month}, ${year}`;

  return (
    <Box bg={DARK_BLUE} c="white" py="md" px="xl">
      <Group justify="space-between">
        <Group>
          <Box bg="white" w={40} h={40} style={{ borderRadius: 8 }} />
          <Text fw={500} size="lg">Logo Clínica</Text>
        </Group>

        <Group gap="xl">
          {!isMobile && <Text size="sm">{timeStr} | {dateStr}</Text>}
          <Group gap="xs">
            <ActionIcon variant="subtle" color="white" size="sm">
              <User size={16} color="white" />
            </ActionIcon>
            <Text c="white" size="xs">|</Text>
            <ActionIcon variant="subtle" color="white" size="sm">
              <ExternalLink size={16} color="white" />
            </ActionIcon>
          </Group>
        </Group>
      </Group>
    </Box>
  );
}

interface InvoiceRow {
  id: string | number;
  codigo: string;
  emissao: string;
  vencimento: string;
  status: string;
  convenio: string;
  valor: number;
  descontoPercent?: number;
  valorTotal: number;
  nome?: string;
  formaPagamento?: string;
}




export function Faturamento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const {
    data: invoices = [],
    isLoading: invoicesLoading,
    error: invoicesError,
  } = useInvoicesQuery();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');



  const [invoiceData, setInvoiceData] = useState<{
    tipo: string;
    categoria: string;
    descricao: string;
    valor: number | undefined;
    vencimento: Date | null;
    formaPagamento: string;
    nome: string;
    desconto?: number;
    operatorGuideNumber: string;
    authorizationPassword: string;
    authorizationDate: string;
    authorizationExpiryDate: string;
    authorizedAttendanceType: string;
    packageValue: number;
    materialsValue: number;
    feesValue: number;
    dailyValue: number;
    gasesValue: number;
    opmeValue: number;
    expectedDiscountValue: number;
    expectedGlosaValue: number;
  }>({
    tipo: '',
    categoria: '',
    descricao: '',
    valor: undefined,
    vencimento: null,
    formaPagamento: '',
    nome: '',
    desconto: 0,
    operatorGuideNumber: '',
    authorizationPassword: '',
    authorizationDate: '',
    authorizationExpiryDate: '',
    authorizedAttendanceType: '',
    packageValue: 0,
    materialsValue: 0,
    feesValue: 0,
    dailyValue: 0,
    gasesValue: 0,
    opmeValue: 0,
    expectedDiscountValue: 0,
    expectedGlosaValue: 0,
  });

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [showInvoiceSuccess, setShowInvoiceSuccess] = useState(false);
  const [lastInvoiceCode, setLastInvoiceCode] = useState<string | null>(null);
  const [showInvoiceError, setShowInvoiceError] = useState(false);
  const [invoiceErrorMessage, setInvoiceErrorMessage] = useState<string | null>(null);
  const [invoiceErrorTitle, setInvoiceErrorTitle] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState('');
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<string>('invoices');
  const [tissQuery, setTissQuery] = useState('');
  const [tissModalOpen, setTissModalOpen] = useState(false);
  const [tissCompetenceMonth, setTissCompetenceMonth] = useState('');
  const [creatingTissBatch, setCreatingTissBatch] = useState(false);
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);
  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [protocolBatchId, setProtocolBatchId] = useState<string | null>(null);
  const [protocolNumberInput, setProtocolNumberInput] = useState('');
  const [savingProtocol, setSavingProtocol] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnBatchId, setReturnBatchId] = useState<string | null>(null);
  const [savingReturn, setSavingReturn] = useState(false);
  const [representingBatchId, setRepresentingBatchId] = useState<string | null>(null);
  const [returnRows, setReturnRows] = useState<Array<{
    itemId: string;
    guideNumber: string;
    invoiceNumber: string;
    status: 'ACCEPTED' | 'PARTIAL' | 'REJECTED';
    glosaValue: number;
    returnCode: string;
    returnMessage: string;
  }>>([]);
  const { data: tissBatches = [], isLoading: tissLoading } = useTissBatchesQuery();

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForApi = (d: Date | null) => {
    if (!d) return undefined;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatBackendDate = (value?: string | null) => {
    if (!value) return '';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('pt-BR');
  };

  const formatBackendDateTime = (value?: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('pt-BR');
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

  const mapInvoiceToRow = (invoice: any): InvoiceRow => {
    const value = Number(invoice?.value ?? invoice?.amount ?? 0);
    const discount = Number(invoice?.discount ?? 0);
    const total = Number(invoice?.total ?? (value - discount));

    return {
      id: invoice?.id ?? invoice?.number ?? `local-${Date.now()}`,
      codigo: invoice?.number || '-',
      emissao: formatBackendDateTime(invoice?.issuedAt),
      vencimento: formatBackendDate(invoice?.dueDate) || '-',
      status: invoice?.status || '-',
      convenio: invoice?.convention || invoice?.convention_name || '-',
      valor: value,
      descontoPercent: discount,
      valorTotal: total,
      nome: invoice?.patientName || '',
      formaPagamento: invoice?.paymentMethod || '',
    };
  };

  const parseIsoDateToInput = (value?: string | null) => {
    if (!value) return '';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (!invoicesError) return;
    const err: any = invoicesError;
    const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar faturas';
    showNotification({ title: 'Erro', message: msg, color: 'red' });
  }, [invoicesError]);

  const rows = useMemo<InvoiceRow[]>(() => invoices.map(mapInvoiceToRow), [invoices]);
  const invoiceById = useMemo(
    () => new Map(invoices.map((invoice: any) => [String(invoice.id), invoice])),
    [invoices],
  );
  const filtered = rows.filter((r) => r.codigo.toLowerCase().includes(query.toLowerCase()) || r.convenio.toLowerCase().includes(query.toLowerCase()));
  const filteredBatches = useMemo(() => {
    const list = Array.isArray(tissBatches) ? tissBatches : [];
    const q = String(tissQuery || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((batch: any) => (
      String(batch?.batchNumber || '').toLowerCase().includes(q)
      || String(batch?.convention || '').toLowerCase().includes(q)
      || String(batch?.status || '').toLowerCase().includes(q)
      || String(batch?.competenceMonth || '').toLowerCase().includes(q)
    ));
  }, [tissBatches, tissQuery]);
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedInvoiceIds.includes(String(row.id))),
    [rows, selectedInvoiceIds],
  );
  const selectedConventions = useMemo(
    () => Array.from(new Set(selectedRows.map((row) => row.convenio).filter((value) => value && value !== '-'))),
    [selectedRows],
  );
  const canCreateTissBatch = selectedRows.length > 0 && selectedConventions.length === 1;
  const allFilteredSelected = filtered.length > 0 && filtered.every((row) => selectedInvoiceIds.includes(String(row.id)));

  const toggleInvoiceSelection = (invoiceId: string, checked: boolean) => {
    setSelectedInvoiceIds((current) => {
      if (checked) return current.includes(invoiceId) ? current : [...current, invoiceId];
      return current.filter((id) => id !== invoiceId);
    });
  };

  const toggleAllFilteredSelection = (checked: boolean) => {
    setSelectedInvoiceIds((current) => {
      if (!checked) {
        const filteredIds = new Set(filtered.map((row) => String(row.id)));
        return current.filter((id) => !filteredIds.has(id));
      }
      const merged = new Set(current);
      filtered.forEach((row) => {
        merged.add(String(row.id));
      });
      return Array.from(merged);
    });
  };

  const openTissBatchModal = () => {
    if (!selectedRows.length) {
      showNotification({ title: 'Selecione faturas', message: 'Escolha pelo menos uma fatura para montar o lote TISS.', color: 'yellow' });
      return;
    }
    if (selectedConventions.length !== 1) {
      showNotification({ title: 'Convênio inválido', message: 'Selecione faturas do mesmo convênio para gerar o lote TISS.', color: 'yellow' });
      return;
    }
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setTissCompetenceMonth(`${now.getFullYear()}-${month}`);
    setTissModalOpen(true);
  };

  const handleCreateTissBatch = async () => {
    if (!canCreateTissBatch) return;
    const competence = String(tissCompetenceMonth || '').trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) {
      showNotification({ title: 'Competência inválida', message: 'Use o formato YYYY-MM (ex: 2026-03).', color: 'red' });
      return;
    }

    setCreatingTissBatch(true);
    try {
      const payload = {
        competenceMonth: competence,
        convention: selectedConventions[0],
        invoiceIds: selectedRows.map((row) => String(row.id)),
      };
      const created = await tissBatchService.create(payload);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tissBatches });
      showNotification({
        title: 'Lote TISS criado',
        message: `Lote ${created.batchNumber} criado com ${selectedRows.length} fatura(s).`,
        color: 'green',
      });
      setSelectedInvoiceIds([]);
      setTissModalOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Falha ao criar lote TISS';
      showNotification({ title: 'Erro ao criar lote TISS', message: msg, color: 'red' });
    } finally {
      setCreatingTissBatch(false);
    }
  };

  const handleDownloadBatchXml = async (batch: any) => {
    setDownloadingBatchId(String(batch.id));
    try {
      const blob = await tissBatchService.downloadXml(String(batch.id));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${batch.batchNumber || 'lote-tiss'}.xml`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tissBatches });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Não foi possível gerar o XML do lote.';
      showNotification({ title: 'Erro ao gerar XML', message: msg, color: 'red' });
    } finally {
      setDownloadingBatchId(null);
    }
  };

  const openProtocolModal = (batch: any) => {
    setProtocolBatchId(String(batch?.id || ''));
    setProtocolNumberInput(String(batch?.protocolNumber || ''));
    setProtocolModalOpen(true);
  };

  const handleRegisterProtocol = async () => {
    if (!protocolBatchId) return;
    const protocolNumber = protocolNumberInput.trim();
    if (!protocolNumber) {
      showNotification({ title: 'Protocolo obrigatório', message: 'Informe o protocolo de envio da operadora.', color: 'yellow' });
      return;
    }

    setSavingProtocol(true);
    try {
      await tissBatchService.registerProtocol(protocolBatchId, { protocolNumber });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tissBatches });
      showNotification({ title: 'Protocolo registrado', message: 'Lote marcado como enviado com sucesso.', color: 'green' });
      setProtocolModalOpen(false);
      setProtocolBatchId(null);
      setProtocolNumberInput('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Falha ao registrar protocolo';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setSavingProtocol(false);
    }
  };

  const openReturnModal = (batch: any) => {
    const rows = Array.isArray(batch?.items) ? batch.items.map((item: any) => ({
      itemId: String(item.id),
      guideNumber: String(item.guideNumber || '-'),
      invoiceNumber: String(item?.invoice?.number || '-'),
      status: (String(item?.returnStatus || '').toUpperCase() === 'PARTIAL'
        ? 'PARTIAL'
        : String(item?.returnStatus || '').toUpperCase() === 'REJECTED'
          ? 'REJECTED'
          : 'ACCEPTED') as 'ACCEPTED' | 'PARTIAL' | 'REJECTED',
      glosaValue: Number(item?.glosaValue || 0),
      returnCode: String(item?.returnCode || ''),
      returnMessage: String(item?.returnMessage || ''),
    })) : [];

    setReturnBatchId(String(batch?.id || ''));
    setReturnRows(rows);
    setReturnModalOpen(true);
  };

  const handleRegisterReturn = async () => {
    if (!returnBatchId || returnRows.length === 0) return;
    setSavingReturn(true);
    try {
      await tissBatchService.registerReturn(returnBatchId, {
        items: returnRows.map((row) => ({
          itemId: row.itemId,
          status: row.status,
          glosaValue: row.glosaValue || 0,
          returnCode: row.returnCode || undefined,
          returnMessage: row.returnMessage || undefined,
        })),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tissBatches });
      showNotification({ title: 'Retorno registrado', message: 'Retorno da operadora aplicado com sucesso.', color: 'green' });
      setReturnModalOpen(false);
      setReturnBatchId(null);
      setReturnRows([]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Falha ao registrar retorno';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setSavingReturn(false);
    }
  };

  const handleRepresentBatch = async (batch: any) => {
    const batchId = String(batch?.id || '');
    if (!batchId) return;
    setRepresentingBatchId(batchId);
    try {
      await tissBatchService.represent(batchId, {});
      await queryClient.invalidateQueries({ queryKey: queryKeys.tissBatches });
      showNotification({ title: 'Reapresentação criada', message: 'Novo lote criado para guias glosadas/parciais.', color: 'green' });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Falha ao reapresentar lote';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setRepresentingBatchId(null);
    }
  };







  const openInvoice = (r?: InvoiceRow) => {
    if (r) {
      // If the row has a vencimento like '28/12/2025 | 15:30:09', try to parse the date part
      const parsed = r.vencimento ? ((): Date | null => {
        const m = r.vencimento.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (!m) return null;
        return parseDate(m[1]);
      })() : null;

      setInvoiceData({
        tipo: '',
        categoria: '',
        descricao: '',
        valor: r.valor,
        vencimento: parsed,
        formaPagamento: r.formaPagamento || '',
        nome: r.nome || '',
        desconto: r.descontoPercent ?? 0,
        operatorGuideNumber: '',
        authorizationPassword: '',
        authorizationDate: '',
        authorizationExpiryDate: '',
        authorizedAttendanceType: '',
        packageValue: 0,
        materialsValue: 0,
        feesValue: 0,
        dailyValue: 0,
        gasesValue: 0,
        opmeValue: 0,
        expectedDiscountValue: 0,
        expectedGlosaValue: 0,
      });
      const rawInvoice: any = invoiceById.get(String(r.id));
      if (rawInvoice) {
        setInvoiceData((prev) => ({
          ...prev,
          operatorGuideNumber: String(rawInvoice.operatorGuideNumber || '').trim(),
          authorizationPassword: String(rawInvoice.authorizationPassword || '').trim(),
          authorizationDate: parseIsoDateToInput(rawInvoice.authorizationDate),
          authorizationExpiryDate: parseIsoDateToInput(rawInvoice.authorizationExpiryDate),
          authorizedAttendanceType: String(rawInvoice.authorizedAttendanceType || rawInvoice.guideType || '').trim(),
          packageValue: Number(rawInvoice.packageValue || 0),
          materialsValue: Number(rawInvoice.materialsValue || 0),
          feesValue: Number(rawInvoice.feesValue || 0),
          dailyValue: Number(rawInvoice.dailyValue || 0),
          gasesValue: Number(rawInvoice.gasesValue || 0),
          opmeValue: Number(rawInvoice.opmeValue || 0),
          expectedDiscountValue: Number(rawInvoice.expectedDiscountValue || 0),
          expectedGlosaValue: Number(rawInvoice.expectedGlosaValue || 0),
        }));
      }
      setDateInput(parsed ? formatDate(parsed) : '');
      setEditingId(r.id);
    } else {
      setInvoiceData({
        tipo: '',
        categoria: '',
        descricao: '',
        valor: undefined,
        vencimento: null,
        formaPagamento: '',
        nome: '',
        desconto: 0,
        operatorGuideNumber: '',
        authorizationPassword: '',
        authorizationDate: '',
        authorizationExpiryDate: '',
        authorizedAttendanceType: '',
        packageValue: 0,
        materialsValue: 0,
        feesValue: 0,
        dailyValue: 0,
        gasesValue: 0,
        opmeValue: 0,
        expectedDiscountValue: 0,
        expectedGlosaValue: 0,
      });
      setDateInput('');
      setEditingId(null);
    }
    setModalOpen(true);
  };

  const handleAddOrUpdate = async () => {
    if (!invoiceData.valor || invoiceData.valor <= 0) {
      showNotification({ title: 'Erro', message: 'Valor é obrigatório e deve ser maior que 0', color: 'red' });
      return;
    }

    if (!invoiceData.tipo) {
      showNotification({ title: 'Erro', message: 'Tipo é obrigatório', color: 'red' });
      return;
    }

    if (editingId) {
      setSavingInvoice(true);
      try {
        const payload = {
          patientName: invoiceData.nome || undefined,
          dueDate: formatDateForApi(invoiceData.vencimento),
          convention: invoiceData.categoria || invoiceData.tipo || undefined,
          operatorGuideNumber: invoiceData.operatorGuideNumber || undefined,
          authorizationPassword: invoiceData.authorizationPassword || undefined,
          authorizationDate: invoiceData.authorizationDate || undefined,
          authorizationExpiryDate: invoiceData.authorizationExpiryDate || undefined,
          authorizedAttendanceType: invoiceData.authorizedAttendanceType || undefined,
          packageValue: invoiceData.packageValue || 0,
          materialsValue: invoiceData.materialsValue || 0,
          feesValue: invoiceData.feesValue || 0,
          dailyValue: invoiceData.dailyValue || 0,
          gasesValue: invoiceData.gasesValue || 0,
          opmeValue: invoiceData.opmeValue || 0,
          expectedDiscountValue: invoiceData.expectedDiscountValue || 0,
          expectedGlosaValue: invoiceData.expectedGlosaValue || 0,
          value: invoiceData.valor || 0,
          discount: invoiceData.desconto ?? 0,
          paymentMethod: invoiceData.formaPagamento || undefined,
        };
        const updated: any = await invoiceService.updateInvoice(editingId, payload);
        setLastInvoiceCode(updated.number || String(editingId));
        setShowInvoiceSuccess(true);
        await queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.response?.data?.details || err?.message || 'Erro ao atualizar fatura';
        setInvoiceErrorTitle('Erro ao atualizar fatura');
        setInvoiceErrorMessage(msg);
        setShowInvoiceError(true);
      } finally {
        setSavingInvoice(false);
      }
    } else {
      setSavingInvoice(true);
      try {
        const payload = {
          patientName: invoiceData.nome || undefined,
          dueDate: formatDateForApi(invoiceData.vencimento),
          convention: invoiceData.categoria || invoiceData.tipo || undefined,
          operatorGuideNumber: invoiceData.operatorGuideNumber || undefined,
          authorizationPassword: invoiceData.authorizationPassword || undefined,
          authorizationDate: invoiceData.authorizationDate || undefined,
          authorizationExpiryDate: invoiceData.authorizationExpiryDate || undefined,
          authorizedAttendanceType: invoiceData.authorizedAttendanceType || undefined,
          packageValue: invoiceData.packageValue || 0,
          materialsValue: invoiceData.materialsValue || 0,
          feesValue: invoiceData.feesValue || 0,
          dailyValue: invoiceData.dailyValue || 0,
          gasesValue: invoiceData.gasesValue || 0,
          opmeValue: invoiceData.opmeValue || 0,
          expectedDiscountValue: invoiceData.expectedDiscountValue || 0,
          expectedGlosaValue: invoiceData.expectedGlosaValue || 0,
          value: invoiceData.valor || 0,
          discount: invoiceData.desconto ?? 0,
          paymentMethod: invoiceData.formaPagamento || undefined,
        };
        const created: any = await invoiceService.createInvoice(payload);

        const now = new Date();
        const createdId = created.id ?? created.number ?? `local-${rows.length + 1}`;
        const emissao = created.issuedAt ? new Date(created.issuedAt).toLocaleString('pt-BR') : `${now.toLocaleDateString()} | ${now.toLocaleTimeString()}`;
        const venc = created.dueDate ? formatBackendDate(created.dueDate) : (invoiceData.vencimento ? formatDate(invoiceData.vencimento) : emissao);

        const newRow: InvoiceRow = {
          id: created.id ?? createdId,
          codigo: (created.number as string) || `FAT-${new Date().getFullYear()}-${String(createdId).padStart(3, '0')}`,
          emissao: emissao,
          vencimento: venc,
          status: created.status || 'Emitida',
          convenio: created.convention || created.convention_name || invoiceData.categoria || '-',
          valor: created.value ?? created.amount ?? invoiceData.valor ?? 0,
          descontoPercent: created.discount ?? invoiceData.desconto ?? 0,
          valorTotal: created.total ?? ((created.value ?? invoiceData.valor ?? 0) - (created.discount ?? invoiceData.desconto ?? 0)),
          nome: created.patientName ?? invoiceData.nome,
          formaPagamento: created.paymentMethod ?? invoiceData.formaPagamento,
        };

        setLastInvoiceCode(newRow.codigo);
        setShowInvoiceSuccess(true);
        await queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Erro ao criar fatura';
        setInvoiceErrorTitle('Erro ao criar fatura');
        setInvoiceErrorMessage(msg);
        setShowInvoiceError(true);
      } finally {
        setSavingInvoice(false);
      }
    }

    setModalOpen(false);
  };  

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} align="center">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={() => navigate('/dashboard')}
            style={{
              border: '1px solid #dee2e6',
              borderRadius: '6px',
            }}
          >
            <ChevronLeft size={20} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ? 'lg' : 'xl'} c="black">
              Faturamento
            </Text>
            <Text size="sm" c="dimmed">
              Cobranças e notas fiscais
            </Text>
          </Box>
        </Group>

        <Tabs value={activeWorkspace} onChange={(value) => setActiveWorkspace(value || 'invoices')}>
          <Tabs.List>
            <Tabs.Tab value="invoices">Faturas ({rows.length})</Tabs.Tab>
            <Tabs.Tab value="tiss">Lotes TISS ({tissBatches.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="invoices" pt="md">
            <Box mb={isMobile ? 20 : 30}>
              <Group gap="md" align="flex-end">
                <FloatingInput
                  label="Buscar faturas"
                  placeholder={isMobile ? 'Buscar...' : 'Buscar paciente por nome ou número...'}
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  containerProps={{ style: { flex: 1 } }}
                />
                <Button
                  bg={DARK_BLUE}
                  c="white"
                  leftSection={isMobile ? undefined : <Plus size={18} />}
                  onClick={() => openInvoice()}
                  size={isMobile ? 'sm' : 'md'}
                  fw={600}
                  px={isMobile ? 'sm' : 'xl'}
                >
                  {isMobile ? <Plus size={16} /> : 'Nova fatura'}
                </Button>
                <Button
                  variant="light"
                  color="blue"
                  leftSection={isMobile ? undefined : <FileCode2 size={18} />}
                  onClick={openTissBatchModal}
                  size={isMobile ? 'sm' : 'md'}
                  fw={600}
                  disabled={!canCreateTissBatch}
                >
                  {isMobile ? 'TISS' : 'Criar lote TISS'}
                </Button>
              </Group>
              {selectedRows.length > 0 && (
                <Text size="xs" mt={8} c={selectedConventions.length === 1 ? 'dimmed' : 'orange'}>
                  {selectedRows.length} fatura(s) selecionada(s){selectedConventions.length === 1
                    ? ` | Convênio: ${selectedConventions[0]}`
                    : ' | Selecione faturas do mesmo convênio para gerar o lote'}
                </Text>
              )}
            </Box>

            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
              {invoicesLoading ? (
                <Paper style={{ padding: 24 }}>
                  <Stack gap="sm">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Stack key={index} gap="sm">
                        <Skeleton height={18} width="28%" radius="xl" />
                        <Skeleton height={16} width="100%" radius="xl" />
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              ) : (
                <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                  <Table.Thead>
                    <Table.Tr style={{ borderBottom: 'none' }}>
                      <Table.Th style={{ width: 32 }}>
                        <Checkbox
                          checked={allFilteredSelected}
                          indeterminate={!allFilteredSelected && filtered.some((row) => selectedInvoiceIds.includes(String(row.id)))}
                          onChange={(event) => toggleAllFilteredSelection(event.currentTarget.checked)}
                          aria-label="Selecionar todas"
                        />
                      </Table.Th>
                      <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                      <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Data/Hora Emissão</Table.Th>
                      {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Data/Hora Vencimento</Table.Th>}
                      <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                      {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Convenio</Table.Th>}
                      <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Valor</Table.Th>
                      <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Desconto</Table.Th>
                      <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Valor Total</Table.Th>
                      <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filtered.map((r) => (
                      <Table.Tr key={r.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <Table.Td>
                          <Checkbox
                            checked={selectedInvoiceIds.includes(String(r.id))}
                            onChange={(event) => toggleInvoiceSelection(String(r.id), event.currentTarget.checked)}
                            aria-label={`Selecionar ${r.codigo}`}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Group gap={isMobile ? 'xs' : 'sm'}>
                            {!isMobile && (
                              <Box
                                bg={DARK_BLUE}
                                w={32}
                                h={32}
                                style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              >
                                <Text c="white" fw={600} size="sm">{r.codigo.charAt(0).toUpperCase()}</Text>
                              </Box>
                            )}
                            <Box>
                              <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>{r.codigo}</Text>
                              {isMobile && <Text size="xs" c="dimmed">Status: {r.status}</Text>}
                            </Box>
                          </Group>
                        </Table.Td>

                        <Table.Td>
                          <Text size="xs">{r.emissao}</Text>
                        </Table.Td>

                        {!isTablet && (
                          <Table.Td>
                            <Text size="xs">{r.vencimento}</Text>
                          </Table.Td>
                        )}

                        <Table.Td>
                          <Badge variant="light" color={String(r.status).toLowerCase().includes('paga') || String(r.status).toLowerCase().includes('emitida') ? 'blue' : 'gray'} radius="xl">
                            {r.status}
                          </Badge>
                        </Table.Td>

                        {!isTablet && (
                          <Table.Td>
                            <Text size="xs">{r.convenio}</Text>
                          </Table.Td>
                        )}

                        <Table.Td>
                          <Text size="xs">R${r.valor.toFixed(2)}</Text>
                        </Table.Td>

                        <Table.Td>
                          <Text size="xs">{r.descontoPercent ? `${r.descontoPercent}%` : '-'}</Text>
                        </Table.Td>

                        <Table.Td>
                          <Text size="xs">R${r.valorTotal.toFixed(2)}</Text>
                        </Table.Td>

                        <Table.Td>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => openInvoice(r)}
                            title="Editar fatura"
                          >
                            <Pencil size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="tiss" pt="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md" align="flex-end">
                <FloatingInput
                  label="Buscar lotes TISS"
                  placeholder="Número, convênio, competência ou status"
                  value={tissQuery}
                  onChange={(event) => setTissQuery(event.currentTarget.value)}
                  containerProps={{ style: { flex: 1, maxWidth: 420 } }}
                />
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.tissBatches })}
                >
                  Atualizar
                </Button>
              </Group>

              {tissLoading ? (
                <Skeleton height={48} radius="md" />
              ) : filteredBatches.length === 0 ? (
                <Text size="sm" c="dimmed">Nenhum lote TISS encontrado.</Text>
              ) : (
                <Stack gap="sm">
                  {filteredBatches.slice(0, 10).map((batch: any) => (
                    <Paper key={batch.id} withBorder p="sm" radius="md">
                      <Group justify="space-between" align="center" wrap="wrap">
                        <Box>
                          <Text size="sm" fw={600}>{batch.batchNumber}</Text>
                          <Text size="xs" c="dimmed">
                            {batch.competenceMonth} | {batch.convention} | {batch.invoicesCount || batch.items?.length || 0} guia(s)
                          </Text>
                          <Text size="xs" c="dimmed">
                            Glosa total: R$ {(Array.isArray(batch?.items)
                              ? batch.items.reduce((sum: number, item: any) => sum + Number(item?.glosaValue || 0), 0)
                              : 0).toFixed(2)}
                          </Text>
                        </Box>
                        <Group gap="xs" wrap="wrap" justify="flex-end">
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => handleDownloadBatchXml(batch)}
                            loading={downloadingBatchId === String(batch.id)}
                          >
                            Baixar XML
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="blue"
                            onClick={() => openProtocolModal(batch)}
                          >
                            Protocolo
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="grape"
                            onClick={() => openReturnModal(batch)}
                          >
                            Retorno
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            onClick={() => handleRepresentBatch(batch)}
                            loading={representingBatchId === String(batch.id)}
                            disabled={!Array.isArray(batch?.items) || !batch.items.some((item: any) => {
                              const status = String(item?.returnStatus || '').toUpperCase();
                              return (status === 'REJECTED' || status === 'PARTIAL') && !item?.isRepresented;
                            })}
                          >
                            Reapresentar
                          </Button>
                          <Badge variant="light" color={batch.status === 'SENT' ? 'blue' : batch.status === 'ACCEPTED' ? 'green' : batch.status === 'REJECTED' ? 'red' : 'gray'}>
                            {batch.status}
                          </Badge>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={null}
        size={420}
        centered
        overlayProps={{ opacity: 0.3, blur: 1 }}
        styles={{
          body: { padding: 0 },
          content: { borderRadius: '8px' },
          header: { display: 'none' },
        }}
      >
        <Box p="lg">
          <Group justify="space-between" align="center" mb="lg">
            <Text fw={600} size="lg" c="#212529">{editingId ? 'Editar fatura' : 'Novo lançamento'}</Text>
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              onClick={() => setModalOpen(false)}
              size="sm"
            >
              <Text size="lg">×</Text>
            </ActionIcon>
          </Group>
          <Stack gap="md">
            {/* Tipo e Categoria */}
            <Group grow>
              <FloatingSelect 
                label="Tipo"
                data={[{ value: 'lancamento', label: 'Lançamento' }, { value: 'nota', label: 'Nota Fiscal' }]} 
                placeholder="Tipo" 
                value={invoiceData.tipo} 
                onChange={(val) => setInvoiceData({ ...invoiceData, tipo: val || '' })} 
                styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
              />
              <FloatingSelect 
                label="Categoria"
                data={[{ value: 'consulta', label: 'Consulta' }, { value: 'exame', label: 'Exame' }, { value: 'outro', label: 'Outro' }]} 
                placeholder="Categoria" 
                value={invoiceData.categoria} 
                onChange={(val) => setInvoiceData({ ...invoiceData, categoria: val || '' })} 
                styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
              />
            </Group>

            {/* Descrição */}
            <FloatingTextarea 
              label="Descrição"
              placeholder="Descrição" 
              value={invoiceData.descricao} 
              onChange={(e) => setInvoiceData({ ...invoiceData, descricao: e.currentTarget.value })} 
              minRows={2} 
              styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
            />

            {/* Valor e Vencimento */}
            <Group grow>
              <FloatingNumberInput 
                label="Valor (R$)"
                placeholder="Valor (R$)" 
                value={invoiceData.valor || ''} 
                min={0} 
                step={0.01} 
                hideControls
                onChange={(val) => setInvoiceData({ ...invoiceData, valor: typeof val === 'number' ? val : Number(val) || 0 })} 
                styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
              />
              <Popover opened={popoverOpened} onClose={() => setPopoverOpened(false)} position="bottom" withArrow>
                <Popover.Target>
                  <FloatingInput
                    label="Vencimento"
                    placeholder="dd/mm/yyyy"
                    value={dateInput}
                    onChange={(e) => setDateInput(formatDateInput(e.currentTarget.value))}
                    onBlur={() => {
                      if (!dateInput) {
                        setInvoiceData({ ...invoiceData, vencimento: null });
                        return;
                      }
                      const parsed = parseDate(dateInput);
                      if (!parsed) setInvoiceData({ ...invoiceData, vencimento: null });
                      else setInvoiceData({ ...invoiceData, vencimento: parsed });
                    }}
                    rightSection={
                      <ActionIcon size="sm" variant="subtle" onClick={() => setPopoverOpened((s) => !s)} title="Abrir calendário">
                        <CalendarIcon size={16} />
                      </ActionIcon>
                    }
                  />
                </Popover.Target>
                <Popover.Dropdown style={{ padding: 8 }}>
                  <DatePicker 
                    value={invoiceData.vencimento}
                    onChange={(d) => {
                      setInvoiceData({ ...invoiceData, vencimento: d });
                      setDateInput(formatDate(d));
                      setPopoverOpened(false);
                    }}
                  />
                </Popover.Dropdown>
              </Popover>
            </Group>

            <Grid grow>
              <Grid.Col span={isMobile ? 12 : 6}>
                <Box>
                  <Text size="sm" fw={500} mb={4}>Desconto (%)</Text>
                  <FloatingNumberInput
                    label="Desconto (%)"
                    placeholder="Desconto (%)"
                    value={invoiceData.desconto ?? 0}
                    min={0}
                    max={100}
                    step={0.01}
                    hideControls
                    onChange={(val) => setInvoiceData({ ...invoiceData, desconto: typeof val === 'number' ? val : Number(val) || 0 })}
                    styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
                  />
                </Box>
              </Grid.Col>

              <Grid.Col span={isMobile ? 12 : 6}>
                <Box>
                  <Text size="sm" fw={500} mb={4}>Forma de pagamento</Text>
                  <FloatingSelect 
                    label="Forma de pagamento"
                    data={[{ value: 'dinheiro', label: 'Dinheiro' }, { value: 'cartao', label: 'Cartão' }, { value: 'boleto', label: 'Boleto' }]} 
                    placeholder="Forma de pagamento" 
                    value={invoiceData.formaPagamento} 
                    onChange={(val) => setInvoiceData({ ...invoiceData, formaPagamento: val || '' })} 
                    styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }} 
                  />
                </Box>
              </Grid.Col>
            </Grid>

            {/* Nome */}
            <FloatingInput 
              label="Nome"
              placeholder="Nome" 
              value={invoiceData.nome}
              onChange={(e) => setInvoiceData({ ...invoiceData, nome: e.currentTarget.value })}
              disabled={!invoiceData.tipo}
            />
            
            <Text size="xs" c="dimmed" mt="xs">
              * só liberado após o Tipo selecionado
            </Text>

            <Text size="sm" fw={600} c="dimmed" mt="sm">
              Autorização do convênio (TISS)
            </Text>

            <FloatingInput
              label="Número da guia da operadora"
              placeholder="Ex: 123456789"
              value={invoiceData.operatorGuideNumber}
              onChange={(e) => setInvoiceData({ ...invoiceData, operatorGuideNumber: e.currentTarget.value })}
            />

            <FloatingInput
              label="Senha de autorização"
              placeholder="Ex: ABC123"
              value={invoiceData.authorizationPassword}
              onChange={(e) => setInvoiceData({ ...invoiceData, authorizationPassword: e.currentTarget.value })}
            />

            <Group grow>
              <FloatingInput
                label="Data de autorização"
                placeholder="YYYY-MM-DD"
                value={invoiceData.authorizationDate}
                onChange={(e) => setInvoiceData({ ...invoiceData, authorizationDate: e.currentTarget.value })}
              />
              <FloatingInput
                label="Validade da autorização"
                placeholder="YYYY-MM-DD"
                value={invoiceData.authorizationExpiryDate}
                onChange={(e) => setInvoiceData({ ...invoiceData, authorizationExpiryDate: e.currentTarget.value })}
              />
            </Group>

            <FloatingSelect
              label="Tipo de atendimento autorizado"
              data={[
                { value: 'CONSULTA', label: 'Consulta' },
                { value: 'SP_SADT', label: 'SP-SADT' },
                { value: 'EXAME', label: 'Exame' },
                { value: 'INTERNACAO', label: 'Internação' },
                { value: 'OUTRO', label: 'Outro' },
              ]}
              value={invoiceData.authorizedAttendanceType || null}
              onChange={(value) => setInvoiceData({ ...invoiceData, authorizedAttendanceType: value || '' })}
              clearable
            />

            <Text size="sm" fw={600} c="dimmed" mt="sm">
              Composição financeira da guia
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <FloatingNumberInput
                label="Pacotes"
                value={invoiceData.packageValue}
                min={0}
                step={0.01}
                hideControls
                onChange={(value) => setInvoiceData({ ...invoiceData, packageValue: typeof value === 'number' ? value : 0 })}
              />
              <FloatingNumberInput
                label="Materiais"
                value={invoiceData.materialsValue}
                min={0}
                step={0.01}
                hideControls
                onChange={(value) => setInvoiceData({ ...invoiceData, materialsValue: typeof value === 'number' ? value : 0 })}
              />
              <FloatingNumberInput
                label="Taxas"
                value={invoiceData.feesValue}
                min={0}
                step={0.01}
                hideControls
                onChange={(value) => setInvoiceData({ ...invoiceData, feesValue: typeof value === 'number' ? value : 0 })}
              />
              <FloatingNumberInput
                label="Diárias"
                value={invoiceData.dailyValue}
                min={0}
                step={0.01}
                hideControls
                onChange={(value) => setInvoiceData({ ...invoiceData, dailyValue: typeof value === 'number' ? value : 0 })}
              />
              <FloatingNumberInput
                label="Gases"
                value={invoiceData.gasesValue}
                min={0}
                step={0.01}
                hideControls
                onChange={(value) => setInvoiceData({ ...invoiceData, gasesValue: typeof value === 'number' ? value : 0 })}
              />
              <FloatingNumberInput
                label="OPME"
                value={invoiceData.opmeValue}
                min={0}
                step={0.01}
                hideControls
                onChange={(value) => setInvoiceData({ ...invoiceData, opmeValue: typeof value === 'number' ? value : 0 })}
              />
              <FloatingNumberInput
                label="Desconto previsto"
                value={invoiceData.expectedDiscountValue}
                min={0}
                step={0.01}
                hideControls
                onChange={(value) => setInvoiceData({ ...invoiceData, expectedDiscountValue: typeof value === 'number' ? value : 0 })}
              />
              <FloatingNumberInput
                label="Glosa prevista"
                value={invoiceData.expectedGlosaValue}
                min={0}
                step={0.01}
                hideControls
                onChange={(value) => setInvoiceData({ ...invoiceData, expectedGlosaValue: typeof value === 'number' ? value : 0 })}
              />
            </SimpleGrid>

            <Group justify="flex-end" mt="lg">
              <Button variant="default" onClick={() => setModalOpen(false)} size="sm">
                Cancelar
              </Button>
              <Button bg={DARK_BLUE} onClick={handleAddOrUpdate} size="sm" loading={savingInvoice} disabled={savingInvoice}>
                {editingId ? 'Salvar alterações' : 'Salvar'}
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>

      <Modal
        opened={tissModalOpen}
        onClose={() => setTissModalOpen(false)}
        title="Criar lote TISS"
        centered
      >
        <Stack gap="md">
          <FloatingInput
            label="Competência (YYYY-MM)"
            placeholder="2026-03"
            value={tissCompetenceMonth}
            onChange={(event) => setTissCompetenceMonth(event.currentTarget.value)}
          />
          <FloatingInput
            label="Convênio"
            value={selectedConventions[0] || ''}
            readOnly
          />
          <Text size="xs" c="dimmed">
            {selectedRows.length} fatura(s) selecionada(s) para este lote.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setTissModalOpen(false)}>Cancelar</Button>
            <Button
              bg={DARK_BLUE}
              onClick={handleCreateTissBatch}
              loading={creatingTissBatch}
              disabled={!canCreateTissBatch || creatingTissBatch}
            >
              Criar lote
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={protocolModalOpen}
        onClose={() => setProtocolModalOpen(false)}
        title="Registrar protocolo de envio"
        centered
      >
        <Stack gap="md">
          <FloatingInput
            label="Protocolo da operadora"
            placeholder="Ex: PROT-2026-000123"
            value={protocolNumberInput}
            onChange={(event) => setProtocolNumberInput(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setProtocolModalOpen(false)}>Cancelar</Button>
            <Button bg={DARK_BLUE} onClick={handleRegisterProtocol} loading={savingProtocol}>
              Confirmar envio
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Leitura de retorno da operadora"
        size="xl"
        centered
      >
        <Stack gap="md">
          {returnRows.length === 0 ? (
            <Text size="sm" c="dimmed">Nenhuma guia disponível para retorno.</Text>
          ) : (
            returnRows.map((row, index) => (
              <Paper key={row.itemId} withBorder p="sm" radius="md">
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    Guia {row.guideNumber} • Fatura {row.invoiceNumber}
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <FloatingSelect
                      label="Status retorno"
                      data={[
                        { value: 'ACCEPTED', label: 'Aceita' },
                        { value: 'PARTIAL', label: 'Parcial' },
                        { value: 'REJECTED', label: 'Glosada' },
                      ]}
                      value={row.status}
                      onChange={(value) => {
                        const next = (value === 'PARTIAL' || value === 'REJECTED' || value === 'ACCEPTED') ? value : 'ACCEPTED';
                        setReturnRows((current) => current.map((item, idx) => idx === index ? { ...item, status: next } : item));
                      }}
                    />
                    <FloatingNumberInput
                      label="Glosa (R$)"
                      value={row.glosaValue}
                      min={0}
                      step={0.01}
                      hideControls
                      onChange={(value) => {
                        const next = typeof value === 'number' ? value : 0;
                        setReturnRows((current) => current.map((item, idx) => idx === index ? { ...item, glosaValue: next } : item));
                      }}
                    />
                    <FloatingInput
                      label="Código retorno"
                      value={row.returnCode}
                      onChange={(event) => {
                        const next = event.currentTarget.value;
                        setReturnRows((current) => current.map((item, idx) => idx === index ? { ...item, returnCode: next } : item));
                      }}
                    />
                  </SimpleGrid>
                  <FloatingTextarea
                    label="Motivo/observação"
                    minRows={2}
                    value={row.returnMessage}
                    onChange={(event) => {
                      const next = event.currentTarget.value;
                      setReturnRows((current) => current.map((item, idx) => idx === index ? { ...item, returnMessage: next } : item));
                    }}
                  />
                </Stack>
              </Paper>
            ))
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setReturnModalOpen(false)}>Cancelar</Button>
            <Button
              bg={DARK_BLUE}
              onClick={handleRegisterReturn}
              loading={savingReturn}
              disabled={returnRows.length === 0 || savingReturn}
            >
              Salvar retorno
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ResultModal
        opened={showInvoiceSuccess}
        onClose={() => setShowInvoiceSuccess(false)}
        variant="success"
        title={editingId ? 'Fatura atualizada' : 'Fatura criada'}
        message={lastInvoiceCode ? `Fatura ${lastInvoiceCode} ${editingId ? 'atualizada' : 'criada'} com sucesso.` : `Fatura ${editingId ? 'atualizada' : 'criada'} com sucesso.`}
        primary={{
          label: 'Nova fatura',
          onClick: () => {
            setShowInvoiceSuccess(false);
            openInvoice();
          },
        }}
        secondary={{ label: 'Fechar', onClick: () => setShowInvoiceSuccess(false) }}
      />

      <ResultModal
        opened={showInvoiceError}
        onClose={() => setShowInvoiceError(false)}
        variant="error"
        title={invoiceErrorTitle || 'Erro'}
        message={invoiceErrorMessage || 'Ocorreu um erro ao criar a fatura.'}
      />
    </Box>
  );
}
