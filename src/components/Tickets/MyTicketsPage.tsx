import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Group,
  Skeleton,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { MessageCircleMore, Search } from 'lucide-react';
import { Header } from '../Header/Header';
import { useMyTicketsQuery } from '../../hooks/useMyTicketsQuery';
import { type TicketPriority, type TicketStatus, type TicketType } from '../../services/ticketService';
import { PaginatedGrid } from '../common/PaginatedGrid';
import './MyTicketsPage.css';

const statusOptions: Array<{ value: TicketStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'TRIAGE', label: 'Triagem' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'CLOSED', label: 'Fechado' },
];

const typeOptions: Array<{ value: TicketType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos os tipos' },
  { value: 'BUG', label: 'Bug' },
  { value: 'ERROR', label: 'Erro' },
  { value: 'IMPROVEMENT', label: 'Melhoria' },
];

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  TRIAGE: 'Triagem',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const statusColors: Record<TicketStatus, string> = {
  OPEN: 'blue',
  TRIAGE: 'yellow',
  IN_PROGRESS: 'indigo',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

const typeLabels: Record<TicketType, string> = {
  BUG: 'Bug',
  ERROR: 'Erro',
  IMPROVEMENT: 'Melhoria',
};

const typeColors: Record<TicketType, string> = {
  BUG: 'red',
  ERROR: 'orange',
  IMPROVEMENT: 'teal',
};

const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const priorityColors: Record<TicketPriority, string> = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'orange',
  CRITICAL: 'red',
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const humanizeKey = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  return raw
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
};

const shortTicketId = (id: string) => (id.length <= 14 ? id : `${id.slice(0, 8)}...${id.slice(-4)}`);

const MyTicketsSkeleton = () => (
  <Stack gap="sm">
    {Array.from({ length: 6 }).map((_, idx) => (
      <Skeleton key={`my-tickets-skeleton-${idx}`} height={48} radius="md" />
    ))}
  </Stack>
);

export function MyTicketsPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TicketType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useMyTicketsQuery({
    status: statusFilter,
    type: typeFilter,
    search: search.trim() || undefined,
  });

  const items = data?.items || [];
  const paginatedItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [items.length, page, pageSize]);

  const openConversation = (ticket: any) => {
    navigate(`/meus-chamados/${ticket.id}`);
  };

  return (
    <Box bg="var(--ui-background)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate('/dashboard?secao=gestao-e-apoio') }} />
      <Box p={isMobile ? 'sm' : 'md'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Stack gap="xl">
          <Box className="my-tickets-hero ui-page-intro">
            <Text className="my-tickets-eyebrow">GESTÃO E APOIO</Text>
            <Text className="my-tickets-title" fw={700} size="2xl">Meus Chamados</Text>
            <Text className="my-tickets-subtitle" size="sm">Acompanhe os tickets que você abriu e os status da análise interna.</Text>
          </Box>

          <Paper p="lg" withBorder radius="lg">
            <Group align="flex-end" gap="md" wrap="wrap">
              <TextInput
                label="Buscar"
                placeholder="Descrição, fluxo ou módulo"
                leftSection={<Search size={16} />}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                style={{ flex: '1 1 220px' }}
              />
              <Select
                label="Status"
                data={statusOptions}
                value={statusFilter}
                onChange={(value) => setStatusFilter((value as TicketStatus | 'ALL' | null) || 'ALL')}
                style={{ flex: '1 1 180px' }}
              />
              <Select
                label="Tipo"
                data={typeOptions}
                value={typeFilter}
                onChange={(value) => setTypeFilter((value as TicketType | 'ALL' | null) || 'ALL')}
                style={{ flex: '1 1 160px' }}
              />
            </Group>
          </Paper>

          <Paper p="lg" withBorder radius="lg">
            {isLoading ? (
              <MyTicketsSkeleton />
            ) : items.length === 0 ? (
              <Stack align="center" py="xl" gap="sm">
                <Text fw={600}>Você ainda não possui chamados</Text>
                <Text size="sm" c="dimmed">Abra um chamado no botão de ajuda para acompanhar por aqui.</Text>
              </Stack>
            ) : (
              <PaginatedGrid
                totalItems={items.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                isMobile={isMobile}
                maxHeight={isMobile ? 500 : 620}
                showFooter
              >
                <Table.ScrollContainer minWidth={1100}>
                  <Table verticalSpacing="md" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={170}>Ticket</Table.Th>
                        <Table.Th w={240}>Contexto</Table.Th>
                        <Table.Th>Descrição</Table.Th>
                        <Table.Th w={210}>Atualização</Table.Th>
                        <Table.Th w={170}>Status</Table.Th>
                        <Table.Th w={130}>Conversa</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedItems.map((ticket) => (
                        <Table.Tr key={ticket.id}>
                          <Table.Td>
                            <Stack gap={8}>
                              <Text fw={700} ff="monospace" title={ticket.id}>#{shortTicketId(ticket.id)}</Text>
                              <Badge color={typeColors[ticket.type]} variant="light" w="fit-content">{typeLabels[ticket.type]}</Badge>
                              <Badge color={priorityColors[ticket.priority]} variant="light" w="fit-content">{priorityLabels[ticket.priority]}</Badge>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={8}>
                              <Box>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Fluxo</Text>
                                <Text size="sm" fw={600}>{humanizeKey(ticket.flow)}</Text>
                              </Box>
                              <Box>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Módulo</Text>
                                <Text size="sm" fw={600}>{humanizeKey(ticket.module)}</Text>
                              </Box>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" maw={440} lineClamp={4}>{ticket.description}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={4}>
                              <Text size="xs" c="dimmed">Abertura</Text>
                              <Text size="sm">{formatDateTime(ticket.createdAt)}</Text>
                              <Text size="xs" c="dimmed">Última atualização</Text>
                              <Text size="sm">{formatDateTime(ticket.updatedAt || ticket.createdAt)}</Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={statusColors[ticket.status]} variant="light">
                              {statusLabels[ticket.status]}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={6} wrap="nowrap">
                              <Button
                                variant="subtle"
                                size="xs"
                                leftSection={<MessageCircleMore size={14} />}
                                onClick={() => openConversation(ticket)}
                              >
                                Abrir chamado
                              </Button>
                              {ticket.hasUnreadAdminMessage ? <Badge color="red" size="xs">Nova</Badge> : null}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </PaginatedGrid>
            )}
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
