import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Tabs,
  TextInput,
  Badge,
  Textarea,
  Grid,
  Paper,
  Avatar,
  Text,
  Popover,
  ActionIcon,
  Menu,
} from '@mantine/core';
import { Calendar as CalendarIcon, MoreVertical, ChevronLeft } from 'lucide-react';
import { DatePicker } from '@mantine/dates';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import { FloatingInput } from '../components/common/FloatingInput';
import { Header } from '../components/Header/Header';
import { DARK_BLUE } from '../themes/theme';

interface Lancamento {
  id: number;
  nome: string;
  cpf?: string;
  dataHora: string;
  tipo: string;
  status: string;
  valor: number;
  desconto: number;
  valorTotal: number;
}

export function Financeiro() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const [activeTab, setActiveTab] = useState<string | null>('todos');
  const [searchValue, setSearchValue] = useState('');
  const [modalOpened, setModalOpened] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([
    {
      id: 1,
      nome: 'Maria Silva Santos',
      cpf: '123.456.789-00',
      dataHora: '28/12/2025 | 15:30:09',
      tipo: 'Laudo',
      status: 'Pago',
      valor: 350.0,
      desconto: 0,
      valorTotal: 350.0,
    },
    {
      id: 2,
      nome: 'João Pedro Oliveira',
      cpf: '987.654.321-00',
      dataHora: '30/12/2025 | 16:50:04',
      tipo: 'Consulta',
      status: 'Pendente',
      valor: 40.0,
      desconto: 10,
      valorTotal: 36.0,
    },
    {
      id: 3,
      nome: 'Luvas e Seringa',
      cpf: '000.000.000-00',
      dataHora: '30/12/2025 | 17:20:04',
      tipo: 'Material',
      status: 'Pendente',
      valor: 60.0,
      desconto: 10,
      valorTotal: 54.0,
    },
  ]);

  // Estado do formulário
  const [formData, setFormData] = useState({
    tipo: '',
    categoria: '',
    descricao: '',
    valor: '',
    desconto: '',
    vencimento: null as Date | null,
    formaPagamento: '',
    nome: '',
  });

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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

  const handleModalClose = () => {
    setModalOpened(false);
    setDateInput('');
    setFormData({
      tipo: '',
      categoria: '',
      descricao: '',
      valor: '',
      desconto: '',
      vencimento: null,
      formaPagamento: '',
      nome: '',
    });
  };

  const handleSaveLancamento = () => {
    const valor = parseFloat(formData.valor) || 0;
    const desconto = parseFloat(formData.desconto) || 0;
    const valorDesconto = (valor * desconto) / 100;
    const valorTotal = valor - valorDesconto;

    const newLancamento: Lancamento = {
      id: lancamentos.length + 1,
      nome: formData.nome,
      dataHora: new Date().toLocaleString('pt-BR'),
      tipo: formData.categoria || formData.tipo,
      status: 'Pendente',
      valor: valor,
      desconto: desconto,
      valorTotal: valorTotal,
    };
    setLancamentos(prev => [...prev, newLancamento]);
    console.log('Salvando lançamento:', formData);
    handleModalClose();
  };

  const getStatusColor = (status: string) => {
    if (status === 'Pago') return 'green';
    if (status === 'Pendente') return 'yellow';
    return 'gray';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'Pago') return 'Pago';
    if (status === 'Pendente') return 'Pendente';
    return status;
  };

  const filteredLancamentos = lancamentos.filter((lancamento) => {
    const term = searchValue.trim().toLowerCase();
    if (!term) return true;
    const nome = lancamento.nome.toLowerCase();
    const cpf = (lancamento.cpf || '').toLowerCase();
    const tipo = lancamento.tipo.toLowerCase();
    return nome.includes(term) || cpf.includes(term) || tipo.includes(term);
  });

  const rows = filteredLancamentos.map((lancamento) => (
    <Table.Tr key={lancamento.id}>
      <Table.Td>
        <Avatar color="blue" radius="xl" size="md">
          {lancamento.nome.charAt(0).toUpperCase()}
        </Avatar>
      </Table.Td>
      <Table.Td>{lancamento.nome}</Table.Td>
      <Table.Td>{lancamento.dataHora}</Table.Td>
      <Table.Td>{lancamento.tipo}</Table.Td>
      <Table.Td>
        <Badge color={getStatusColor(lancamento.status)} variant="light">
          {getStatusLabel(lancamento.status)}
        </Badge>
      </Table.Td>
      <Table.Td>R${lancamento.valor.toFixed(2)}</Table.Td>
      <Table.Td>{lancamento.desconto > 0 ? `${lancamento.desconto}%` : '-'}</Table.Td>
      <Table.Td fw={600}>R${lancamento.valorTotal.toFixed(2)}</Table.Td>
      <Table.Td>
        <Menu position="bottom-end" shadow="md">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <MoreVertical size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              color="green"
              disabled={lancamento.status === 'Pago'}
              onClick={() => {
                // Lógica para processar pagamento
                console.log('Processar pagamento:', lancamento.id);
              }}
            >
              Pagar
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Header />

      {/* Page Header */}
      <Box style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e9ecef', padding: isMobile ? '12px 16px' : '16px 24px' }}>
        <Container size="xl" px={isMobile ? 0 : 'md'}>
          <Group mb={isMobile ? 16 : 24} wrap="nowrap">
            <ActionIcon variant="default" color="black" size={isMobile ? 'lg' : 'xl'} onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={isMobile ? 22 : 28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
                Financeiro
              </Text>
              <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Gestão financeira
              </Text>
            </Box>
          </Group>

          <Group align="center" gap="md" wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Tabs value={activeTab} onChange={setActiveTab} style={{ flexGrow: isMobile ? 1 : 0 }}>
              <Tabs.List>
                <Tabs.Tab value="todos">Todos</Tabs.Tab>
                <Tabs.Tab value="receita">Receita</Tabs.Tab>
                <Tabs.Tab value="despesas">Despesas</Tabs.Tab>
              </Tabs.List>
            </Tabs>

            <TextInput
              placeholder="Buscar paciente por nome ou CPF..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.currentTarget.value)}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 240 }}
            />

            <Button
              onClick={() => setModalOpened(true)}
              fullWidth={isMobile}
              style={{
                backgroundColor: DARK_BLUE,
                color: '#ffffff',
                borderRadius: 10,
                paddingLeft: 18,
                paddingRight: 18,
              }}
            >
              + Novo lançamento
            </Button>
          </Group>
        </Container>
      </Box>

      {/* Content */}
      <Container size="xl" py={isMobile ? 'md' : 'xl'}>

        {/* Tabela */}
        <Paper style={{ borderRadius: '8px', overflowX: 'auto' }}>
          <Table striped highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#f8f9fa' }}>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Data/Hora</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Valor</Table.Th>
                <Table.Th>Desconto</Table.Th>
                <Table.Th>Valor Total</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Paper>
      </Container>

      {/* Modal Novo Lançamento */}
      <Modal
        opened={modalOpened}
        onClose={handleModalClose}
        title="Novo orçamento"
        centered
        size={isTablet ? 'lg' : 'md'}
        fullScreen={isMobile}
      >
        <Stack gap="md">
          <Grid grow>
            <Grid.Col span={isMobile ? 12 : 6}>
              <Select
                label="Tipo"
                placeholder="Selecione um tipo"
                data={[
                  { value: 'receita', label: 'Receita' },
                  { value: 'despesa', label: 'Despesa' },
                  { value: 'outro', label: 'Outro' },
                ]}
                value={formData.tipo}
                onChange={(value) => setFormData({ ...formData, tipo: value || '' })}
                searchable
                clearable
              />
            </Grid.Col>
            <Grid.Col span={isMobile ? 12 : 6}>
              <Select
                label="Categoria"
                placeholder="Selecione uma categoria"
                data={[
                  { value: 'consulta', label: 'Consulta' },
                  { value: 'laudo', label: 'Laudo' },
                  { value: 'material', label: 'Material' },
                ]}
                value={formData.categoria}
                onChange={(value) => setFormData({ ...formData, categoria: value || '' })}
                searchable
                clearable
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Descrição"
            placeholder="Descreva o lançamento"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.currentTarget.value })}
            rows={3}
          />

          <Grid grow>
            <Grid.Col span={isMobile ? 12 : 6}>
              <Box>
                <Text size="sm" fw={500} mb={4}>Valor (R$)</Text>
                <TextInput
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.currentTarget.value })}
                  type="number"
                />
              </Box>
            </Grid.Col>
            <Grid.Col span={isMobile ? 12 : 6}>
              <Box>
                <Text size="sm" fw={500} mb={4}>Desconto (%)</Text>
                <TextInput
                  value={formData.desconto}
                  onChange={(e) => setFormData({ ...formData, desconto: e.currentTarget.value })}
                  type="number"
                  min="0"
                  max="100"
                />
              </Box>
            </Grid.Col>
          </Grid>

          <Grid grow>
            <Grid.Col span={isMobile ? 12 : 6}>
              <Box>
                <Text size="sm" fw={500} mb={4}>Vencimento</Text>
                <Popover opened={popoverOpened} onClose={() => setPopoverOpened(false)} position="bottom" withArrow>
                  <Popover.Target>
                    <TextInput
                      placeholder="dd/mm/yyyy"
                      value={dateInput}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        setDateInput(v);
                        const parsed = parseDate(v);
                        setFormData({ ...formData, vencimento: parsed });
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
                      value={formData.vencimento} 
                      onChange={(d) => { 
                        setFormData({ ...formData, vencimento: d }); 
                        setDateInput(formatDate(d)); 
                        setPopoverOpened(false); 
                      }} 
                    />
                  </Popover.Dropdown>
                </Popover>
              </Box>
            </Grid.Col>
            <Grid.Col span={isMobile ? 12 : 6}>
              <Select
                label="Forma de pagamento"
                placeholder="Selecione uma forma de pagamento"
                data={[
                  { value: 'dinheiro', label: 'Dinheiro' },
                  { value: 'cartao', label: 'Cartão' },
                  { value: 'transferencia', label: 'Transferência' },
                  { value: 'cheque', label: 'Cheque' },
                ]}
                value={formData.formaPagamento}
                onChange={(value) => setFormData({ ...formData, formaPagamento: value || '' })}
                searchable
                clearable
              />
            </Grid.Col>
          </Grid>

          <Stack gap={4}>
            <FloatingInput
              label="Nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.currentTarget.value })}
              disabled={!formData.tipo}
            />
            <Text size="xs" c="dimmed">
              *só liberado após o Tipo selecionado
            </Text>
          </Stack>

          <Group justify="flex-end" gap="md" mt="xl">
            <Button variant="default" onClick={handleModalClose}>
              Cancelar
            </Button>
            <Button color="dark" onClick={handleSaveLancamento}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
