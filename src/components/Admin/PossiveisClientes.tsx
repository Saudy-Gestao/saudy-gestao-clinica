import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Select,
  Skeleton,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Building2, Mail, MessageSquareText, Phone, RefreshCw, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { useAdminLeadsQuery } from '../../hooks/useAdminLeadsQuery';
import leadService, { type LeadItem, type LeadStatus } from '../../services/leadService';
import { queryKeys } from '../../lib/queryKeys';
import { showErrorToast, showSuccessToast } from '../../lib/toast';

const statusOptions = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'NEW', label: 'Novo' },
  { value: 'CONTACTED', label: 'Contatado' },
  { value: 'QUALIFIED', label: 'Qualificado' },
  { value: 'LOST', label: 'Perdido' },
] as const;

const statusLabels: Record<LeadStatus, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  LOST: 'Perdido',
};

const statusColors: Record<LeadStatus, string> = {
  NEW: 'blue',
  CONTACTED: 'yellow',
  QUALIFIED: 'green',
  LOST: 'red',
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

const normalizePhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

const AdminLeadsSkeleton = () => (
  <Stack gap="sm">
    {Array.from({ length: 6 }).map((_, idx) => (
      <Skeleton key={`admin-leads-skeleton-${idx}`} height={48} radius="md" />
    ))}
  </Stack>
);

export function PossiveisClientes() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [search, setSearch] = useState('');
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const { data, isLoading, isFetching, refetch } = useAdminLeadsQuery({
    status: statusFilter,
    search: search.trim() || undefined,
  });

  const items = data?.items || [];

  const stats = useMemo(() => ({
    total: items.length,
    novos: items.filter((lead) => lead.status === 'NEW').length,
    contatados: items.filter((lead) => lead.status === 'CONTACTED').length,
    qualificados: items.filter((lead) => lead.status === 'QUALIFIED').length,
  }), [items]);

  const handleStatusChange = async (leadId: string, status: string | null) => {
    if (!status) return;

    setUpdatingLeadId(leadId);
    try {
      await leadService.updateStatus(leadId, status as LeadStatus);
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminLeads });
      showSuccessToast({
        title: 'Lead atualizado',
        message: 'O status do possível cliente foi atualizado.',
      });
    } catch (error: unknown) {
      showErrorToast({
        title: 'Erro ao atualizar lead',
        error,
        fallback: 'Não foi possível salvar o novo status.',
      });
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const openMail = (lead: LeadItem) => {
    if (!lead.email) return;
    window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent('Contato Saudy')}`;
  };

  const openWhatsApp = (lead: LeadItem) => {
    const rawPhone = normalizePhone(lead.phone);
    if (!rawPhone) return;
    const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    window.open(`https://api.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=&type=phone_number&app_absent=0`, '_blank', 'noopener,noreferrer');
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
                    <MessageSquareText size={22} />
                  </ThemeIcon>
                  <Text size="sm" fw={700} tt="uppercase" c="rgba(255,255,255,0.72)" style={{ letterSpacing: '0.08em' }}>
                    Módulo ADM
                  </Text>
                </Group>
                <Title order={2} c="white">
                  Possíveis Clientes
                </Title>
                <Text c="rgba(255,255,255,0.84)">
                  Centralize os contatos recebidos pela landing page para que o time comercial consiga responder,
                  qualificar e acompanhar novas oportunidades.
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
              <Text c="dimmed" size="sm" mb="xs">Total de leads</Text>
              <Text fw={700} size="2rem">{String(stats.total).padStart(2, '0')}</Text>
            </Paper>
            <Paper p="lg" withBorder radius="lg">
              <Text c="dimmed" size="sm" mb="xs">Novos</Text>
              <Text fw={700} size="2rem">{String(stats.novos).padStart(2, '0')}</Text>
            </Paper>
            <Paper p="lg" withBorder radius="lg">
              <Text c="dimmed" size="sm" mb="xs">Contatados</Text>
              <Text fw={700} size="2rem">{String(stats.contatados).padStart(2, '0')}</Text>
            </Paper>
            <Paper p="lg" withBorder radius="lg">
              <Text c="dimmed" size="sm" mb="xs">Qualificados</Text>
              <Text fw={700} size="2rem">{String(stats.qualificados).padStart(2, '0')}</Text>
            </Paper>
          </SimpleGrid>

          <Paper p="lg" withBorder radius="lg">
            <Group justify="space-between" align="flex-end" gap="md">
              <TextInput
                label="Buscar lead"
                placeholder="Nome, e-mail, telefone ou empresa"
                leftSection={<Search size={16} />}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Select
                label="Status"
                data={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
                value={statusFilter}
                onChange={(value) => setStatusFilter((value as 'ALL' | LeadStatus | null) || 'ALL')}
                w={220}
              />
            </Group>
          </Paper>

          <Paper p="lg" withBorder radius="lg">
            {isLoading ? (
              <AdminLeadsSkeleton />
            ) : items.length === 0 ? (
              <Stack align="center" py="xl" gap="sm">
                <ThemeIcon size={54} radius="xl" color="darkBlue" variant="light">
                  <Building2 size={24} />
                </ThemeIcon>
                <Text fw={600}>Nenhum possível cliente encontrado</Text>
                <Text size="sm" c="dimmed" ta="center" maw={520}>
                  Nenhum lead corresponde aos filtros aplicados no momento.
                </Text>
              </Stack>
            ) : (
              <Table.ScrollContainer minWidth={980}>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Contato</Table.Th>
                      <Table.Th>Mensagem</Table.Th>
                      <Table.Th>Origem</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Entrada</Table.Th>
                      <Table.Th>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {items.map((lead) => (
                      <Table.Tr key={lead.id}>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text fw={600}>{lead.name}</Text>
                            <Text size="sm" c="dimmed">{lead.email}</Text>
                            {lead.phone ? <Text size="sm" c="dimmed">{lead.phone}</Text> : null}
                            {lead.companyName ? <Text size="sm" c="dimmed">Empresa: {lead.companyName}</Text> : null}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" maw={320} lineClamp={4}>
                            {lead.message || 'Sem mensagem informada'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text size="sm">{lead.source || 'Landing page'}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap="xs">
                            <Badge color={statusColors[lead.status]} variant="light" w="fit-content">
                              {statusLabels[lead.status]}
                            </Badge>
                            <Select
                              size="xs"
                              data={statusOptions.filter((option) => option.value !== 'ALL').map((option) => ({
                                value: option.value,
                                label: option.label,
                              }))}
                              value={lead.status}
                              disabled={updatingLeadId === lead.id}
                              onChange={(value) => handleStatusChange(lead.id, value)}
                            />
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text size="sm">{formatDateTime(lead.createdAt)}</Text>
                            <Text size="xs" c="dimmed">
                              Atualizado: {formatDateTime(lead.updatedAt || lead.createdAt)}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <ActionIcon variant="light" color="darkBlue" onClick={() => openMail(lead)} aria-label="Enviar e-mail">
                              <Mail size={16} />
                            </ActionIcon>
                            <ActionIcon variant="light" color="green" onClick={() => openWhatsApp(lead)} aria-label="Abrir WhatsApp" disabled={!lead.phone}>
                              <Phone size={16} />
                            </ActionIcon>
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
