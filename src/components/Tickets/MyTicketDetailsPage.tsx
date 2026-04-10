import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, LifeBuoy, Paperclip, Send, X } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import ticketService, { type TicketItem, type TicketType, type TicketStatus, type TicketMessageItem, type TicketPriority } from '../../services/ticketService';
import { showErrorToast, showSuccessToast } from '../../lib/toast';

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

const toDateKey = (value?: string | Date) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDayLabel = (value?: string) => {
  if (!value) return 'Data indefinida';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indefinida';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const key = toDateKey(value);
  if (key === toDateKey(today)) return 'Hoje';
  if (key === toDateKey(yesterday)) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date);
};

const humanizeKey = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  return raw.split('_').map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()).join(' ');
};

const shortTicketId = (id: string) => (id.length <= 14 ? id : `${id.slice(0, 8)}...${id.slice(-4)}`);
const formatBytes = (size?: number | null) => {
  const value = Number(size || 0);
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const TicketDetailsSkeleton = () => (
  <Stack gap="md">
    <Skeleton height={80} radius="md" />
    <Skeleton height={160} radius="md" />
    <Skeleton height={280} radius="md" />
  </Stack>
);

const adaptiveSubtleSurface = 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))';
const adaptiveNestedSurface = 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))';
const adaptiveTimelineLine = 'light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-3))';
const adaptiveWarningSurface = 'light-dark(var(--mantine-color-yellow-0), rgba(255, 212, 59, 0.12))';
const adaptiveWarningBorder = 'light-dark(var(--mantine-color-yellow-3), rgba(255, 212, 59, 0.30))';

export function MyTicketDetailsPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessageItem[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [attachmentDraft, setAttachmentDraft] = useState<{ name: string; mimeType: string; sizeBytes: number; base64: string } | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ticketData, messageData] = await Promise.all([
        ticketService.getMineById(id),
        ticketService.listMyMessages(id),
      ]);
      setTicket(ticketData);
      setMessages(messageData);
    } catch (error: any) {
      showErrorToast({
        title: 'Erro ao carregar chamado',
        error,
        fallback: 'Não foi possível carregar os detalhes do chamado.',
      });
      navigate('/meus-chamados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const handleSendMessage = async () => {
    if (!ticket || !messageDraft.trim()) return;
    setSendingMessage(true);
    try {
      await ticketService.sendMyMessage(ticket.id, { message: messageDraft.trim(), attachment: attachmentDraft });
      setMessageDraft('');
      setAttachmentDraft(null);
      await loadAll();
      showSuccessToast({ title: 'Atualização registrada', message: 'Seu registro foi adicionado ao chamado.' });
    } catch (error: any) {
      showErrorToast({
        title: 'Erro ao registrar atualização',
        error,
        fallback: 'Não foi possível enviar a atualização.',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAttachmentPick = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notifications.show({ title: 'Arquivo muito grande', message: 'Anexe arquivos de até 5MB por mensagem.', color: 'yellow' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentDraft({ name: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, base64: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAttachment = async (messageId: string, fileName?: string | null) => {
    setOpeningAttachmentId(messageId);
    try {
      const blob = await ticketService.viewMyMessageAttachment(messageId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error: any) {
      showErrorToast({
        title: 'Erro ao abrir anexo',
        error,
        fallback: `Não foi possível abrir ${fileName || 'o anexo'}.`,
      });
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const handleConfirmClose = async () => {
    if (!ticket) return;
    setConfirmingClose(true);
    try {
      await ticketService.confirmMyTicketClose(ticket.id);
      await loadAll();
      showSuccessToast({
        title: 'Ticket fechado',
        message: 'Você confirmou a resolução e o ticket foi fechado.',
      });
    } catch (error: any) {
      showErrorToast({
        title: 'Erro ao confirmar fechamento',
        error,
        fallback: 'Não foi possível confirmar o fechamento.',
      });
    } finally {
      setConfirmingClose(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1280} mx="auto">
        <Stack gap="lg">
          <Paper p="xl" radius="lg" style={{ background: `linear-gradient(135deg, ${DARK_BLUE} 0%, #16357f 100%)`, color: 'white' }}>
            <Group justify="space-between" align="flex-start">
              <Stack gap="sm">
                <Group gap="sm">
                  <ThemeIcon size={42} radius="md" variant="light" color="white">
                    <LifeBuoy size={20} />
                  </ThemeIcon>
                  <Title order={2} c="white">Chamado #{ticket ? shortTicketId(ticket.id) : shortTicketId(id)}</Title>
                </Group>
                <Text c="rgba(255,255,255,0.84)">Histórico assíncrono do chamado.</Text>
              </Stack>
              <Button variant="white" color="dark" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/meus-chamados')}>
                Voltar
              </Button>
            </Group>
          </Paper>

          {loading ? (
            <TicketDetailsSkeleton />
          ) : !ticket ? null : (
            <>
              <Paper withBorder radius="md" p="sm" style={{ background: adaptiveSubtleSurface }}>
                <Group justify="space-between" align="flex-start" gap="sm">
                  <Stack gap={4}>
                    <Group gap={6}>
                      <Badge color={statusColors[ticket.status]} variant="light">{statusLabels[ticket.status]}</Badge>
                      <Badge color={typeColors[ticket.type]} variant="light">{typeLabels[ticket.type]}</Badge>
                      <Badge color={priorityColors[ticket.priority]} variant="light">{priorityLabels[ticket.priority]}</Badge>
                    </Group>
                    <Text size="xs" c="dimmed">Fluxo: {humanizeKey(ticket.flow)} | Módulo: {humanizeKey(ticket.module)}</Text>
                    <Text size="xs" c="dimmed">Atualizado em {formatDateTime(ticket.updatedAt || ticket.createdAt)}</Text>
                  </Stack>
                </Group>
              </Paper>

              {ticket.status === 'RESOLVED' ? (
                <Paper withBorder radius="md" p="md" style={{ background: adaptiveWarningSurface, borderColor: adaptiveWarningBorder }}>
                  <Stack gap="xs">
                    <Text fw={600}>Confirmação de fechamento pendente</Text>
                    <Text size="sm" c="dimmed">
                      Se estiver tudo certo, confirme para fechar o ticket. Caso não confirme em até 24h da resolução,
                      ele será fechado automaticamente.
                    </Text>
                    {ticket.resolutionConfirmationDeadlineAt ? (
                      <Text size="xs" c="dimmed">
                        Fechamento automático previsto para: {formatDateTime(ticket.resolutionConfirmationDeadlineAt)}
                      </Text>
                    ) : null}
                    <Group justify="flex-end">
                      <Button size="xs" color="green" onClick={handleConfirmClose} loading={confirmingClose}>
                        Confirmar e fechar ticket
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              ) : null}

              <Paper withBorder radius="md" p="md">
                <ScrollArea h={420}>
                  <Stack gap="sm">
                    {messages.length === 0 ? (
                      <Text size="sm" c="dimmed">Sem mensagens ainda.</Text>
                    ) : (() => {
                      let lastDateKey = '';
                      return messages.map((message, index) => {
                        const dateKey = toDateKey(message.createdAt);
                        const showDateDivider = dateKey !== lastDateKey;
                        if (showDateDivider) lastDateKey = dateKey;
                        const roleColor = message.authorRole === 'ADMIN' ? 'indigo' : message.authorRole === 'USER' ? 'blue' : 'gray';
                        const roleLabel = message.authorRole === 'ADMIN' ? 'Atualização da Equipe Interna' : message.authorRole === 'USER' ? 'Interação do Solicitante' : 'Registro de Sistema';
                        const roleDot = message.authorRole === 'ADMIN' ? 'var(--mantine-color-indigo-6)' : message.authorRole === 'USER' ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)';
                        return (
                          <Stack key={message.id} gap={8}>
                            {showDateDivider ? <Group justify="center" py={4}><Badge variant="filled" color="gray">{formatDayLabel(message.createdAt)}</Badge></Group> : null}
                            <Box style={{ position: 'relative', paddingLeft: 24 }}>
                              {index < messages.length - 1 ? <Box style={{ position: 'absolute', left: 7, top: 18, bottom: -14, borderLeft: `1px solid ${adaptiveTimelineLine}` }} /> : null}
                              <Box style={{ position: 'absolute', left: 2, top: 10, width: 10, height: 10, borderRadius: '50%', background: roleDot }} />
                              <Paper withBorder p="md" radius="md">
                                <Group justify="space-between" align="flex-start" mb={6}>
                                  <Stack gap={2}>
                                    <Badge variant="light" color={roleColor} w="fit-content">{roleLabel}</Badge>
                                    <Text size="sm" fw={600}>{message.authorName || 'Sem identificação'}</Text>
                                    {message.authorEmail ? <Text size="xs" c="dimmed">{message.authorEmail}</Text> : null}
                                  </Stack>
                                  <Text size="xs" c="dimmed">{formatDateTime(message.createdAt)}</Text>
                                </Group>
                                <Divider my={8} />
                                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{message.message}</Text>
                                {message.attachmentName || message.attachmentObjectName ? (
                                  <Paper withBorder p="xs" radius="sm" mt="sm" style={{ background: adaptiveNestedSurface }}>
                                    <Group justify="space-between" wrap="nowrap">
                                      <Stack gap={0}>
                                        <Text size="xs" fw={600} lineClamp={1}>{message.attachmentName || 'Anexo'}</Text>
                                        <Text size="xs" c="dimmed">{formatBytes(message.attachmentSizeBytes)}</Text>
                                      </Stack>
                                      <Button size="compact-xs" variant="light" loading={openingAttachmentId === message.id} onClick={() => handleOpenAttachment(message.id, message.attachmentName)}>
                                        Visualizar
                                      </Button>
                                    </Group>
                                  </Paper>
                                ) : null}
                              </Paper>
                            </Box>
                          </Stack>
                        );
                      });
                    })()}
                  </Stack>
                </ScrollArea>
              </Paper>

              <Paper withBorder radius="md" p="md">
                <Stack gap="md">
                  {ticket.status === 'CLOSED' ? (
                    <Text size="sm" c="dimmed">
                      Este ticket está fechado e não aceita novas mensagens.
                    </Text>
                  ) : null}
                  <Textarea
                    label="Adicionar atualização"
                    placeholder="Inclua mais contexto para o histórico do chamado..."
                    minRows={3}
                    autosize
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.currentTarget.value)}
                    disabled={ticket.status === 'CLOSED'}
                  />
                  {attachmentDraft ? (
                    <Paper withBorder p="xs" radius="sm">
                      <Group justify="space-between" wrap="nowrap">
                        <Stack gap={0}>
                          <Text size="xs" fw={600} lineClamp={1}>{attachmentDraft.name}</Text>
                          <Text size="xs" c="dimmed">{formatBytes(attachmentDraft.sizeBytes)}</Text>
                        </Stack>
                        <Button size="compact-xs" variant="subtle" color="red" leftSection={<X size={12} />} onClick={() => setAttachmentDraft(null)}>
                          Remover
                        </Button>
                      </Group>
                    </Paper>
                  ) : null}
                  <Group justify="flex-end">
                    <Button component="label" variant="default" leftSection={<Paperclip size={14} />}>
                      Anexar
                      <input type="file" style={{ display: 'none' }} onChange={(event) => { handleAttachmentPick(event.currentTarget.files?.[0] || null); event.currentTarget.value = ''; }} disabled={ticket.status === 'CLOSED'} />
                    </Button>
                    <Button leftSection={<Send size={14} />} onClick={handleSendMessage} loading={sendingMessage} disabled={!messageDraft.trim() || ticket.status === 'CLOSED'}>
                      Registrar atualização
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
