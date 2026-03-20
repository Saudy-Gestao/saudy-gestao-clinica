import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon, Select, Textarea, NumberInput, Paper, Loader, Popover, Grid } from '@mantine/core';
import invoiceService from '../services/invoiceService';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, User, ExternalLink, Calendar as CalendarIcon, Pencil } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../themes/theme';
import { DatePicker } from '@mantine/dates';
import { formatDateInput } from '../utils/formatters';
import ResultModal from '../components/common/ResultModal';

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
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const filtered = rows.filter((r) => r.codigo.toLowerCase().includes(query.toLowerCase()) || r.convenio.toLowerCase().includes(query.toLowerCase()));



  const [invoiceData, setInvoiceData] = useState<{
    tipo: string;
    categoria: string;
    descricao: string;
    valor: number | undefined;
    vencimento: Date | null;
    formaPagamento: string;
    nome: string;
    desconto?: number;
  }>({ tipo: '', categoria: '', descricao: '', valor: undefined, vencimento: null, formaPagamento: '', nome: '', desconto: 0 });

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [showInvoiceSuccess, setShowInvoiceSuccess] = useState(false);
  const [lastInvoiceCode, setLastInvoiceCode] = useState<string | null>(null);
  const [showInvoiceError, setShowInvoiceError] = useState(false);
  const [invoiceErrorMessage, setInvoiceErrorMessage] = useState<string | null>(null);
  const [invoiceErrorTitle, setInvoiceErrorTitle] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState('');
  const [popoverOpened, setPopoverOpened] = useState(false);

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

  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const response: any = await invoiceService.getInvoices();
      const items = Array.isArray(response) ? response : response?.items;

      if (Array.isArray(items)) {
        setRows(items.map(mapInvoiceToRow));
      } else {
        setRows([]);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar faturas';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);







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
      });
      setDateInput(parsed ? formatDate(parsed) : '');
      setEditingId(r.id);
    } else {
      setInvoiceData({ tipo: '', categoria: '', descricao: '', valor: undefined, vencimento: null, formaPagamento: '', nome: '' });
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
          value: invoiceData.valor || 0,
          discount: invoiceData.desconto ?? 0,
          paymentMethod: invoiceData.formaPagamento || undefined,
        };
        const updated: any = await invoiceService.updateInvoice(editingId, payload);

        setRows((prev) =>
          prev.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  codigo: updated.number || r.codigo,
                  nome: updated.patientName ?? invoiceData.nome ?? r.nome,
                  vencimento: updated.dueDate ? formatBackendDate(updated.dueDate) : r.vencimento,
                  convenio: updated.convention || invoiceData.categoria || invoiceData.tipo || r.convenio,
                  valor: updated.value ?? invoiceData.valor ?? r.valor,
                  descontoPercent: updated.discount ?? invoiceData.desconto ?? r.descontoPercent,
                  valorTotal:
                    updated.total ??
                    ((updated.value ?? invoiceData.valor ?? r.valor) - (updated.discount ?? invoiceData.desconto ?? r.descontoPercent ?? 0)),
                  formaPagamento: updated.paymentMethod ?? invoiceData.formaPagamento ?? r.formaPagamento,
                }
              : r,
          ),
        );
        setLastInvoiceCode(updated.number || String(editingId));
        setShowInvoiceSuccess(true);
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

        setRows((prev) => [newRow, ...prev]);
        setLastInvoiceCode(newRow.codigo);
        setShowInvoiceSuccess(true);
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

        {/* Search and Button Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            <TextInput
              placeholder={isMobile ? 'Buscar...' : 'Buscar paciente por nome ou número..'}
              leftSection={<Search size={16} color="var(--mantine-color-dimmed)" />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              radius="md"
              size={isMobile ? 'sm' : 'md'}
              style={{ flex: 1 }}
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
          </Group>
        </Box>

        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
          {invoicesLoading ? (
            <Paper style={{ padding: 24, textAlign: 'center' }}>
              <Loader />
              <Text mt={8}>Carregando faturas...</Text>
            </Paper>
          ) : (
            <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
              <Table.Thead>
                <Table.Tr style={{ borderBottom: 'none' }}>
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
                      <Text size="xs">{r.status}</Text>
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
              <Select 
                data={[{ value: 'lancamento', label: 'Lançamento' }, { value: 'nota', label: 'Nota Fiscal' }]} 
                placeholder="Tipo" 
                value={invoiceData.tipo} 
                onChange={(val) => setInvoiceData({ ...invoiceData, tipo: val || '' })} 
                styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
              />
              <Select 
                data={[{ value: 'consulta', label: 'Consulta' }, { value: 'exame', label: 'Exame' }, { value: 'outro', label: 'Outro' }]} 
                placeholder="Categoria" 
                value={invoiceData.categoria} 
                onChange={(val) => setInvoiceData({ ...invoiceData, categoria: val || '' })} 
                styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
              />
            </Group>

            {/* Descrição */}
            <Textarea 
              placeholder="Descrição" 
              value={invoiceData.descricao} 
              onChange={(e) => setInvoiceData({ ...invoiceData, descricao: e.currentTarget.value })} 
              minRows={2} 
              styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
            />

            {/* Valor e Vencimento */}
            <Group grow>
              <NumberInput 
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
                  <TextInput
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
                    styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
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
                  <NumberInput
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
                  <Select 
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
            <TextInput 
              placeholder="Nome" 
              value={invoiceData.nome}
              onChange={(e) => setInvoiceData({ ...invoiceData, nome: e.currentTarget.value })}
              disabled={!invoiceData.tipo}
              styles={{ 
                input: { 
                  fontSize: '14px', 
                  borderColor: '#dee2e6',
                  backgroundColor: !invoiceData.tipo ? '#f8f9fa' : 'white',
                  color: !invoiceData.tipo ? '#6c757d' : 'inherit'
                } 
              }}
            />
            
            <Text size="xs" c="dimmed" mt="xs">
              * só liberado após o Tipo selecionado
            </Text>

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
