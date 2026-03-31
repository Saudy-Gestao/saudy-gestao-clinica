import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, MessageCircleMore, RefreshCw, Search } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { queryKeys } from '../../lib/queryKeys';
import { useAdminTicketsQuery } from '../../hooks/useAdminTicketsQuery';
import ticketService, { type TicketStatus, type TicketType, type TicketPriority, type TicketSort } from '../../services/ticketService';

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

const priorityOptions: Array<{ value: TicketPriority | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todas as prioridades' },
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
];

const sortOptions: Array<{ value: TicketSort; label: string }> = [
  { value: 'NEWEST', label: 'Mais recentes' },
  { value: 'OLDEST', label: 'Mais antigos' },
  { value: 'PRIORITY_HIGH', label: 'Prioridade alta primeiro' },
  { value: 'PRIORITY_LOW', label: 'Prioridade baixa primeiro' },
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

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const humanizeKey = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  return raw
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
};

const shortTicketId = (id: string) => {
  if (!id) return '-';
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
};

export function AdminTickets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TicketType | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<TicketSort>('NEWEST');
  const [search, setSearch] = useState('');
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useAdminTicketsQuery({
    status: statusFilter,
    type: typeFilter,
    priority: priorityFilter,
    sort: sortBy,
    search: search.trim() || undefined,
  });

  const items = data?.items || [];

  const stats = useMemo(() => ({
    total: items.length,
    aberto: items.filter((ticket) => ticket.status === 'OPEN').length,
    andamento: items.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolvido: items.filter((ticket) => ticket.status === 'RESOLVED').length,
  }), [items]);

  const handleStatusChange = async (ticketId: string, status: string | null) => {
    if (!status) return;

    setUpdatingTicketId(ticketId);
    try {
      await ticketService.updateStatus(ticketId, status as TicketStatus);
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminTickets });
      notifications.show({
        title: 'Status atualizado',
        message: 'Ticket atualizado com sucesso.',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erro ao atualizar ticket',
        message: error?.response?.data?.message || error?.message || 'Não foi possível atualizar o ticket.',
        color: 'red',
      });
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const openConversation = (ticket: any) => {
    navigate(`/adm-tickets/${ticket.id}`);
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <Stack gap="xl">
          <Paper
            p="xl"
            radius="lg"
            style={{
              background: `linear-gradient(135deg, ${DARK_BLUE} 0%, #16357f 100%)`,
              color: 'white',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Group justify="space-between" align="flex-start" gap="xl">
              <Stack gap="sm" maw={760}>
                <Group gap="sm">
                  <ThemeIcon size={46} radius="md" variant="light" color="white">
                    <LifeBuoy size={22} />
                  </ThemeIcon>
                  <Text size="sm" fw={700} tt="uppercase" c="rgba(255,255,255,0.72)" style={{ letterSpacing: '0.08em' }}>
                    Módulo ADM
                  </Text>
                </Group>
                <Title order={2} c="white">
                  Chamados e Tickets
                </Title>
                <Text c="rgba(255,255,255,0.84)">
                  Central de tickets abertos pelos usuários para triagem, priorização e acompanhamento pelo time interno.
                </Text>
              </Stack>

              <Button
                variant="white"
                color="dark"
                leftSection={<RefreshCw size={16} />}
                onClick={() => refetch()}
                loading={isFetching}
              >
                Atualizar lista
              </Button>
            </Group>
          </Paper>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            <Paper p="lg" withBorder radius="lg">
              <Text c="dimmed" size="sm" mb="xs">Total de tickets</Text>
              <Text fw={700} size="2rem">{String(stats.total).padStart(2, '0')}</Text>
            </Paper>
            <Paper p="lg" withBorder radius="lg">
              <Text c="dimmed" size="sm" mb="xs">Abertos</Text>
              <Text fw={700} size="2rem">{String(stats.aberto).padStart(2, '0')}</Text>
            </Paper>
            <Paper p="lg" withBorder radius="lg">
              <Text c="dimmed" size="sm" mb="xs">Em andamento</Text>
              <Text fw={700} size="2rem">{String(stats.andamento).padStart(2, '0')}</Text>
            </Paper>
            <Paper p="lg" withBorder radius="lg">
              <Text c="dimmed" size="sm" mb="xs">Resolvidos</Text>
              <Text fw={700} size="2rem">{String(stats.resolvido).padStart(2, '0')}</Text>
            </Paper>
          </SimpleGrid>

          <Paper p="lg" withBorder radius="lg">
            <Group justify="space-between" align="flex-end" gap="md">
              <TextInput
                label="Buscar ticket"
                placeholder="Descrição, fluxo, módulo ou usuário"
                leftSection={<Search size={16} />}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Select
                label="Status"
                data={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
                value={statusFilter}
                onChange={(value) => setStatusFilter((value as TicketStatus | 'ALL' | null) || 'ALL')}
                w={220}
              />
              <Select
                label="Tipo"
                data={typeOptions.map((option) => ({ value: option.value, label: option.label }))}
                value={typeFilter}
                onChange={(value) => setTypeFilter((value as TicketType | 'ALL' | null) || 'ALL')}
                w={180}
              />
              <Select
                label="Prioridade"
                data={priorityOptions.map((option) => ({ value: option.value, label: option.label }))}
                value={priorityFilter}
                onChange={(value) => setPriorityFilter((value as TicketPriority | 'ALL' | null) || 'ALL')}
                w={190}
              />
              <Select
                label="Ordenar"
                data={sortOptions.map((option) => ({ value: option.value, label: option.label }))}
                value={sortBy}
                onChange={(value) => setSortBy((value as TicketSort | null) || 'NEWEST')}
                w={250}
              />
            </Group>
          </Paper>

          <Paper p="lg" withBorder radius="lg">
            {isLoading ? (
              <Group justify="center" py="xl">
                <Loader color="darkBlue" />
              </Group>
            ) : items.length === 0 ? (
              <Stack align="center" py="xl" gap="sm">
                <ThemeIcon size={54} radius="xl" color="darkBlue" variant="light">
                  <LifeBuoy size={24} />
                </ThemeIcon>
                <Text fw={600}>Nenhum ticket encontrado</Text>
                <Text size="sm" c="dimmed" ta="center" maw={520}>
                  Nenhum chamado corresponde aos filtros aplicados neste momento.
                </Text>
              </Stack>
            ) : (
              <Table.ScrollContainer minWidth={1180}>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={170}>Ticket</Table.Th>
                      <Table.Th w={260}>Contexto</Table.Th>
                      <Table.Th>Descrição</Table.Th>
                      <Table.Th w={260}>Abertura</Table.Th>
                      <Table.Th w={190}>Status</Table.Th>
                      <Table.Th w={150}>Conversa</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {items.map((ticket) => (
                      <Table.Tr key={ticket.id}>
                        <Table.Td>
                          <Stack gap={8}>
                            <Text fw={700} ff="monospace" title={ticket.id}>
                              #{shortTicketId(ticket.id)}
                            </Text>
                            <Badge color={typeColors[ticket.type]} variant="light" w="fit-content">
                              {typeLabels[ticket.type]}
                            </Badge>
                            <Badge color={priorityColors[ticket.priority]} variant="light" w="fit-content">
                              {priorityLabels[ticket.priority]}
                            </Badge>
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
                          <Text size="sm" maw={440} lineClamp={5}>
                            {ticket.description}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={5}>
                            <Text size="sm" fw={600}>{ticket.createdByName || 'Usuário não identificado'}</Text>
                            {ticket.createdByEmail ? <Text size="sm" c="dimmed" lineClamp={1}>{ticket.createdByEmail}</Text> : null}
                            {ticket.branchName ? <Text size="sm" c="dimmed" lineClamp={1}>Unidade: {ticket.branchName}</Text> : null}
                            <Text size="xs" c="dimmed">{formatDateTime(ticket.createdAt)}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap="xs">
                            <Badge color={statusColors[ticket.status]} variant="light" w="fit-content">
                              {statusLabels[ticket.status]}
                            </Badge>
                            <Select
                              size="xs"
                              data={statusOptions.filter((option) => option.value !== 'ALL').map((option) => ({
                                value: option.value,
                                label: option.label,
                              }))}
                              value={ticket.status}
                              onChange={(value) => handleStatusChange(ticket.id, value)}
                              disabled={updatingTicketId === ticket.id}
                            />
                          </Stack>
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
                            {ticket.hasUnreadUserMessage ? <Badge color="red" size="xs">Nova</Badge> : null}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
