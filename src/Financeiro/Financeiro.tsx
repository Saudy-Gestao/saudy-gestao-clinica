import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Container,
  Group,
  Modal,
  Stack,
  Table,
  Badge,
  Grid,
  Paper,
  Avatar,
  Text,
  Popover,
  ActionIcon,
  Menu,
  Skeleton,
  SimpleGrid,
  useMantineColorScheme,
} from '@mantine/core';
import { Calendar as CalendarIcon, MoreVertical, ChevronLeft, ChevronRight, CircleDollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDateInput } from '../utils/formatters';
import { DatePicker } from '@mantine/dates';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import { FloatingInput } from '../components/common/FloatingInput';
import { FloatingSelect } from '../components/common/FloatingSelect';
import { FloatingTextarea } from '../components/common/FloatingTextarea';
import { Header } from '../components/Header/Header';
import { DARK_BLUE } from '../themes/theme';
import ResultModal from '../components/common/ResultModal';
import financeService from '../services/financeService';
import { useFinanceEntriesQuery } from '../hooks/useFinanceEntriesQuery';
import { resolveApiErrorMessage } from '../lib/apiError';
import { queryKeys } from '../lib/queryKeys';
import { PaginatedGrid } from '../components/common/PaginatedGrid';

interface Lancamento {
  id: string;
  nome: string;
  cpf?: string;
  dataHora: string;
  tipo: string;
  status: string;
  valor: number;
  desconto: number;
  valorTotal: number;
  metodoPagamento?: string;
  dueDate?: string | null;
}

export function Financeiro() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const [activeSubModule, setActiveSubModule] = useState<'hub' | 'todos' | 'receita' | 'despesas'>('hub');
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpened, setModalOpened] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const {
    data: entries = [],
    isLoading: entriesLoading,
    error: entriesError,
  } = useFinanceEntriesQuery();

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

  // Saving & result modal state
  const [savingLancamento, setSavingLancamento] = useState(false);
  const [showLancamentoSuccess, setShowLancamentoSuccess] = useState(false);
  const [lastLancamentoName, setLastLancamentoName] = useState<string | null>(null);
  const [showLancamentoError, setShowLancamentoError] = useState(false);
  const [lancamentoErrorMessage, setLancamentoErrorMessage] = useState<string | null>(null);

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

  const parseNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const humanize = (s?: string) => {
    if (!s) return '';
    return String(s).replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

  useEffect(() => {
    if (!entriesError) return;
    const err: any = entriesError;
    const msg = resolveApiErrorMessage(err, 'Erro ao carregar lançamentos');
    setLancamentoErrorMessage(msg);
    setShowLancamentoError(true);
  }, [entriesError]);

  const lancamentos = useMemo<Lancamento[]>(() => (
    entries.map((it: any) => {
      const valor = parseNumber(it.value ?? it.amount);
      const desconto = parseNumber(it.discount ?? 0);
      return {
        id: String(it.id),
        nome: it.relatedName || it.name || it.related_name || '-',
        dataHora: it.createdAt ? (new Date(it.createdAt)).toLocaleString('pt-BR') : (it.dueDate ? (new Date(it.dueDate)).toLocaleDateString('pt-BR') : ''),
        tipo: it.type || it.category || '-',
        status: it.status || 'Pendente',
        valor,
        desconto,
        valorTotal: valor - (valor * desconto / 100),
        metodoPagamento: it.paymentMethod || it.payment_method || '-',
        dueDate: it.dueDate || undefined,
      };
    })
  ), [entries]);

  const handleSaveLancamento = async () => {
    const valor = parseFloat(formData.valor) || 0;
    const desconto = parseFloat(formData.desconto) || 0;

    const payload = {
      type: formData.tipo || 'outro',
      category: formData.categoria || undefined,
      description: formData.descricao || undefined,
      value: valor,
      discount: desconto,
      dueDate: formData.vencimento ? formData.vencimento.toISOString().slice(0,10) : undefined,
      paymentMethod: formData.formaPagamento || undefined,
      relatedName: formData.nome || undefined,
    };

    setSavingLancamento(true);

    try {
      const created = await financeService.createEntry(payload);

      // Map response to Lancamento if possible
      const mapped: Lancamento = {
        id: (created.id ?? (lancamentos.length + 1)) as any,
        nome: created.relatedName || created.name || formData.nome,
        dataHora: created.createdAt ? (new Date(created.createdAt)).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
        tipo: created.type || formData.categoria || formData.tipo,
        status: created.status || 'Pendente',
        valor: created.value ?? valor,
        desconto: created.discount ?? desconto,
        valorTotal: (created.value ?? valor) - ((created.value ?? valor) * (created.discount ?? desconto) / 100),
        metodoPagamento: created.paymentMethod || formData.formaPagamento || undefined,
        dueDate: created.dueDate || payload.dueDate || undefined,
      }; 

      setLastLancamentoName(mapped.nome);
      setShowLancamentoSuccess(true);
      handleModalClose();
      await queryClient.invalidateQueries({ queryKey: queryKeys.financeEntries });
    } catch (e: any) {
      const msg = resolveApiErrorMessage(e, 'Erro ao criar lançamento');
      setLancamentoErrorMessage(msg);
      setShowLancamentoError(true);
    } finally {
      setSavingLancamento(false);
    }
  };

  const isOverdue = (status: string | undefined, dueDate?: string | null) => {
    if (!dueDate) return false;
    const s = String(status || '').toUpperCase();
    if (s === 'PAID' || s === 'PAGO') return false;
    const due = new Date(dueDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    return due.getTime() < today.getTime();
  };

  const getStatusColor = (status: string, dueDate?: string | null) => {
    if (isOverdue(status, dueDate)) return 'red';
    const s = String(status || '').toUpperCase();
    if (s === 'PAID' || s === 'PAGO') return 'teal';
    if (s === 'PENDING' || s === 'PENDENTE') return 'yellow';
    return 'gray';
  };

  const getStatusLabel = (status: string, dueDate?: string | null) => {
    if (isOverdue(status, dueDate)) return 'Atrasado';
    const s = String(status || '').toUpperCase();
    if (s === 'PAID' || s === 'PAGO') return 'Pago';
    if (s === 'PENDING' || s === 'PENDENTE') return 'Pendente';
    return humanize(status);
  }; 

  const [payingIds, setPayingIds] = useState<string[]>([]);

  useEffect(() => {
    setPage(1);
  }, [activeSubModule, searchValue]);

  const filteredLancamentos = lancamentos.filter((lancamento) => {
    const term = searchValue.trim().toLowerCase();

    // Normalize type text for robust matching
    const tipo = (lancamento.tipo || '').toLowerCase();

    // Tab-based filtering: accept a few synonyms coming from backend
    const receitaKeys = ['receita', 'income', 'revenue', 'in'];
    const despesaKeys = ['despesa', 'despesas', 'expense', 'expenses', 'out'];

    let matchesTab = true;
    if (activeSubModule === 'receita') {
      matchesTab = receitaKeys.some((k) => tipo.includes(k));
    } else if (activeSubModule === 'despesas') {
      matchesTab = despesaKeys.some((k) => tipo.includes(k));
    }

    if (!matchesTab) return false;

    // Search box filtering
    if (!term) return true;
    const nome = lancamento.nome.toLowerCase();
    const cpf = (lancamento.cpf || '').toLowerCase();

    return nome.includes(term) || cpf.includes(term) || tipo.includes(term);
  });

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredLancamentos.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredLancamentos.length, page, pageSize]);

  const paginatedLancamentos = useMemo(
    () => filteredLancamentos.slice((page - 1) * pageSize, page * pageSize),
    [filteredLancamentos, page, pageSize],
  );

  const rows = paginatedLancamentos.map((lancamento) => (
    <Table.Tr key={lancamento.id}>
      <Table.Td>
        <Avatar color="darkBlue" radius="xl" size="md">
          {lancamento.nome.charAt(0).toUpperCase()}
        </Avatar>
      </Table.Td>
      <Table.Td>{lancamento.nome}</Table.Td>
      <Table.Td>{lancamento.dataHora}</Table.Td>
      <Table.Td>{lancamento.tipo}</Table.Td>
      <Table.Td>
        <Badge color={getStatusColor(lancamento.status, lancamento.dueDate)} variant="light">
          {getStatusLabel(lancamento.status, lancamento.dueDate)}
        </Badge>
      </Table.Td>
      <Table.Td>R${lancamento.valor.toFixed(2)}</Table.Td>
      <Table.Td>{lancamento.desconto > 0 ? `${lancamento.desconto}%` : '-'}</Table.Td>
      <Table.Td fw={600}>R${lancamento.valorTotal.toFixed(2)}</Table.Td>
      <Table.Td>{lancamento.metodoPagamento || '-'}</Table.Td>
      <Table.Td style={{ textAlign: 'center' }}>
        <Group justify="center">
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle" color="darkBlue">
                <MoreVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown
              style={isDark ? {
                backgroundColor: 'var(--mantine-color-default)',
                borderColor: 'var(--mantine-color-default-border)',
              } : undefined}
            >
              <Menu.Item
                color="green"
                disabled={(String(lancamento.status || '').toUpperCase() === 'PAID') || payingIds.includes(lancamento.id)}
                onClick={() => handlePay(lancamento.id)}
              >
                {payingIds.includes(lancamento.id) ? 'Pagar...' : 'Pagar'}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const handlePay = async (id: string) => {
    if (payingIds.includes(id)) return;
    setPayingIds((p) => [...p, id]);
    try {
      await financeService.updateEntry(id, { status: 'PAID' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.financeEntries });
    } catch (e: any) {
      const msg = resolveApiErrorMessage(e, 'Erro ao processar pagamento');
      setLancamentoErrorMessage(msg);
      setShowLancamentoError(true);
    } finally {
      setPayingIds((p) => p.filter((x) => x !== id));
    }
  };

  const subModuleLabel = activeSubModule === 'receita'
    ? 'Receitas'
    : activeSubModule === 'despesas'
      ? 'Despesas'
      : 'Todos os lançamentos';

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
      <Header />

      {/* Page Header */}
      <Box
        style={{
          backgroundColor: 'var(--mantine-color-body)',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}
      >
        <Container size="xl" px={isMobile ? 0 : 'md'}>
          <Group mb={isMobile ? 16 : 24} wrap="nowrap">
            <ActionIcon variant="default" color="black" size={isMobile ? 'lg' : 'xl'} onClick={() => navigate(-1)}>
              <ChevronLeft size={isMobile ? 22 : 28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Financeiro
              </Text>
              <Text size="sm" c="dimmed">
                Gestão financeira
              </Text>
            </Box>
          </Group>

        </Container>
      </Box>

      {/* Content */}
      <Container size="xl" py={isMobile ? 'md' : 'xl'}>
        {activeSubModule === 'hub' ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {[
              {
                key: 'todos',
                icon: CircleDollarSign,
                title: 'Todos',
                desc: 'Visualize todos os lançamentos financeiros em um único painel.',
                onClick: () => setActiveSubModule('todos'),
              },
              {
                key: 'receita',
                icon: TrendingUp,
                title: 'Receita',
                desc: 'Acompanhe apenas entradas financeiras e recebimentos.',
                onClick: () => setActiveSubModule('receita'),
              },
              {
                key: 'despesas',
                icon: TrendingDown,
                title: 'Despesas',
                desc: 'Filtre e gerencie pagamentos e saídas financeiras.',
                onClick: () => setActiveSubModule('despesas'),
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
                        border: `1px solid ${isDark ? '#dbe7ff' : DARK_BLUE}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <card.icon size={22} color={isDark ? '#dbe7ff' : DARK_BLUE} />
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
                  onClick={() => setActiveSubModule('hub')}
                >
                  Voltar
                </Button>
                <Text fw={600}>{subModuleLabel}</Text>
              </Group>
            </Group>

            <Group align="center" gap="md" wrap={isMobile ? 'wrap' : 'nowrap'} mb="md">
              <FloatingInput
                label="Buscar lançamentos"
                placeholder="Buscar paciente por nome ou CPF..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.currentTarget.value)}
                containerProps={{ style: { flex: 1, minWidth: isMobile ? '100%' : 240 } }}
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

            {/* Tabela */}
            {entriesLoading ? (
              <Paper
                style={{
                  borderRadius: '8px',
                  padding: 24,
                  backgroundColor: 'var(--mantine-color-default)',
                  border: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <Stack gap="sm">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Stack key={index} gap="sm">
                      <Skeleton height={18} width="30%" radius="xl" />
                      <Skeleton height={16} width="100%" radius="xl" />
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            ) : (
              <PaginatedGrid
                totalItems={filteredLancamentos.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                isMobile={isMobile}
                maxHeight={isMobile ? 500 : 620}
                showFooter
              >
                <Table striped highlightOnHover>
                  <Table.Thead style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                    <Table.Tr>
                      <Table.Th c="dimmed"></Table.Th>
                      <Table.Th c="dimmed">Nome</Table.Th>
                      <Table.Th c="dimmed">Data/Hora</Table.Th>
                      <Table.Th c="dimmed">Tipo</Table.Th>
                      <Table.Th c="dimmed">Status</Table.Th>
                      <Table.Th c="dimmed">Valor</Table.Th>
                      <Table.Th c="dimmed">Desconto</Table.Th>
                      <Table.Th c="dimmed">Valor Total</Table.Th>
                      <Table.Th c="dimmed">Método Pagamento</Table.Th>
                      <Table.Th c="dimmed" style={{ textAlign: 'center', width: 96 }}>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.length > 0 ? rows : (
                      <Table.Tr>
                        <Table.Td colSpan={10}>
                          <Stack align="center" py="xl" gap={6}>
                            <Text fw={600}>Nenhum lançamento encontrado</Text>
                            <Text c="dimmed" size="sm" ta="center">
                              Cadastre um novo lançamento ou ajuste os filtros para localizar registros financeiros.
                            </Text>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </PaginatedGrid>
            )}
          </>
        )}
      </Container>

      {/* Modal Novo Lançamento */}
      <Modal
        opened={modalOpened}
        onClose={handleModalClose}
        title="Novo orçamento"
        centered
        size={isTablet ? 'lg' : 'md'}
        fullScreen={isMobile}
        styles={{
          content: {
            backgroundColor: 'var(--mantine-color-default)',
            border: '1px solid var(--mantine-color-default-border)',
          },
          header: {
            backgroundColor: 'var(--mantine-color-default)',
            borderBottom: '1px solid var(--mantine-color-default-border)',
          },
          body: {
            backgroundColor: 'var(--mantine-color-default)',
            paddingTop: 28,
          },
          title: {
            color: 'var(--mantine-color-text)',
            fontWeight: 600,
          },
        }}
      >
        <Stack gap="md">
          <Grid grow>
            <Grid.Col span={isMobile ? 12 : 6}>
              <FloatingSelect
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
              <FloatingSelect
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

          <FloatingTextarea
            label="Descrição"
            placeholder="Descreva o lançamento"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.currentTarget.value })}
            rows={3}
          />

          <Grid grow>
            <Grid.Col span={isMobile ? 12 : 6}>
              <FloatingInput
                label="Valor (R$)"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.currentTarget.value })}
                type="number"
                alwaysFloatLabel
              />
            </Grid.Col>
            <Grid.Col span={isMobile ? 12 : 6}>
              <FloatingInput
                label="Desconto (%)"
                value={formData.desconto}
                onChange={(e) => setFormData({ ...formData, desconto: e.currentTarget.value })}
                type="number"
                min="0"
                max="100"
                alwaysFloatLabel
              />
            </Grid.Col>
          </Grid>

          <Grid grow>
            <Grid.Col span={isMobile ? 12 : 6}>
              <Popover opened={popoverOpened} onClose={() => setPopoverOpened(false)} position="bottom" withArrow>
                <Popover.Target>
                  <FloatingInput
                    label="Vencimento"
                    placeholder="dd/mm/yyyy"
                    value={dateInput}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      setDateInput(formatDateInput(v));
                    }}
                    onBlur={() => {
                      if (!dateInput) {
                        setFormData({ ...formData, vencimento: null });
                        return;
                      }
                      const parsed = parseDate(dateInput);
                      if (!parsed) {
                        setFormData({ ...formData, vencimento: null });
                      } else {
                        setFormData({ ...formData, vencimento: parsed });
                      }
                    }}
                    rightSection={
                      <ActionIcon size="sm" variant="subtle" onClick={() => setPopoverOpened((s) => !s)} title="Abrir calendário">
                        <CalendarIcon size={16} />
                      </ActionIcon>
                    }
                    alwaysFloatLabel
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
            </Grid.Col>
            <Grid.Col span={isMobile ? 12 : 6}>
              <FloatingSelect
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
            <Button
              style={{ backgroundColor: DARK_BLUE, color: '#ffffff' }}
              onClick={handleSaveLancamento}
              loading={savingLancamento}
              disabled={savingLancamento}
            >
              {savingLancamento ? 'Salvando...' : 'Salvar'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ResultModal
        opened={showLancamentoSuccess}
        onClose={() => setShowLancamentoSuccess(false)}
        variant="success"
        title="Lançamento criado"
        message={lastLancamentoName ? `${lastLancamentoName} foi cadastrado com sucesso.` : 'Lançamento cadastrado com sucesso.'}
        secondary={{ label: 'Fechar', onClick: () => setShowLancamentoSuccess(false) }}
      />

      <ResultModal
        opened={showLancamentoError}
        onClose={() => setShowLancamentoError(false)}
        variant="error"
        title="Erro ao criar lançamento"
        message={lancamentoErrorMessage || 'Ocorreu um erro ao criar o lançamento'}
        secondary={{ label: 'Fechar', onClick: () => setShowLancamentoError(false) }}
      />
    </Box>
  );
}
