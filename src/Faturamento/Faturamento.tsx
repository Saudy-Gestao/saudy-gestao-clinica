import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon, Select, Textarea, NumberInput } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, User, ExternalLink } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../themes/theme';
import { DatePickerInput } from '@mantine/dates';

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
  id: number;
  codigo: string;
  emissao: string;
  vencimento: string;
  status: string;
  convenio: string;
  valor: number;
  descontoPercent?: number;
  valorTotal: number;
}

const SAMPLE_ROWS: InvoiceRow[] = [
  { id: 1, codigo: 'FAT-2025-001', emissao: '28/12/2025 | 15:30:09', vencimento: '28/12/2025 | 15:30:09', status: 'Enviada', convenio: 'Unimed', valor: 350, descontoPercent: 0, valorTotal: 350 },
  { id: 2, codigo: 'FAT-2025-002', emissao: '30/12/2025 | 16:50:04', vencimento: '30/12/2025 | 16:50:04', status: 'Emitida', convenio: 'Bradesco', valor: 40, descontoPercent: 10, valorTotal: 36 },
  { id: 3, codigo: 'FAT-2025-003', emissao: '30/12/2025 | 17:20:04', vencimento: '30/12/2025 | 17:20:04', status: 'Glosada', convenio: '-', valor: 60, descontoPercent: 10, valorTotal: 54 },
];



export function Faturamento() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(SAMPLE_ROWS);
  const [modalOpen, setModalOpen] = useState(false);
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
  }>({ tipo: '', categoria: '', descricao: '', valor: undefined, vencimento: null, formaPagamento: '', nome: '' });

  const [editingId, setEditingId] = useState<number | null>(null);







  const openInvoice = (r?: InvoiceRow) => {
    if (r) {
      setInvoiceData({
        tipo: '',
        categoria: '',
        descricao: '',
        valor: r.valor,
        vencimento: null,
        formaPagamento: '',
        nome: '',
      });
      setEditingId(r.id);
    } else {
      setInvoiceData({ tipo: '', categoria: '', descricao: '', valor: undefined, vencimento: null, formaPagamento: '', nome: '' });
      setEditingId(null);
    }
    setModalOpen(true);
  };

  const handleAddOrUpdate = () => {
    if (!invoiceData.valor || invoiceData.valor <= 0) {
      showNotification({ title: 'Erro', message: 'Valor é obrigatório e deve ser maior que 0', color: 'red' });
      return;
    }

    if (!invoiceData.tipo) {
      showNotification({ title: 'Erro', message: 'Tipo é obrigatório', color: 'red' });
      return;
    }

    if (editingId) {
      const updatedValor = invoiceData.valor ?? 0;
      setRows((prev) => prev.map((r) => r.id === editingId ? { ...r, valor: updatedValor, valorTotal: updatedValor } : r));
      showNotification({ title: 'Atualizado', message: 'Fatura atualizada', color: 'green' });
    } else {
      const id = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
      const now = new Date();
      const dataHora = `${now.toLocaleDateString()} | ${now.toLocaleTimeString()}`;
      const codigo = `FAT-${now.getFullYear()}-${String(id).padStart(3, '0')}`;
      const newRow: InvoiceRow = {
        id,
        codigo,
        emissao: dataHora,
        vencimento: invoiceData.vencimento ? `${invoiceData.vencimento.toLocaleDateString()} | 00:00:00` : dataHora,
        status: 'Emitida',
        convenio: '-',
        valor: invoiceData.valor || 0,
        valorTotal: invoiceData.valor || 0,
      };
      setRows((prev) => [newRow, ...prev]);
      showNotification({ title: 'Adicionado', message: 'Fatura adicionada', color: 'green' });
    }

    setModalOpen(false);
  };  

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
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
            <Text fw={600} size={isMobile ? 'lg' : 'xl'} style={{ color: '#212529' }}>
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
              leftSection={<Search size={16} color="#999" />}
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
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
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
            <Text fw={600} size="lg" c="#212529">Novo lançamento</Text>
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
              <DatePickerInput
                placeholder="Vencimento"
                value={invoiceData.vencimento} 
                onChange={(val) => setInvoiceData({ ...invoiceData, vencimento: val })} 
              />
            </Group>

            {/* Forma de pagamento */}
            <Select 
              data={[{ value: 'dinheiro', label: 'Dinheiro' }, { value: 'cartao', label: 'Cartão' }, { value: 'boleto', label: 'Boleto' }]} 
              placeholder="Forma de pagamento" 
              value={invoiceData.formaPagamento} 
              onChange={(val) => setInvoiceData({ ...invoiceData, formaPagamento: val || '' })} 
              styles={{ input: { fontSize: '14px', borderColor: '#dee2e6' } }}
            />

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
              <Button bg={DARK_BLUE} onClick={handleAddOrUpdate} size="sm">
                Salvar
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
