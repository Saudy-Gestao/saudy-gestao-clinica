import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Info,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Search,
  Send,
  Settings,
  UserCheck,
  XCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { queryKeys } from '../../lib/queryKeys';
import { getApiBaseUrl } from '../../services/getApiBaseUrl';
import whatsappConversationService, {
  type HumanConversationFlow,
  type HumanConversationItem,
  type HumanConversationMessage,
  type HumanConversationOperatorConfig,
  type HumanConversationPatientAppointment,
  type HumanConversationPatientInfo,
  type HumanConversationProtocolSummary,
  type HumanConversationSettings,
} from '../../services/whatsappConversationService';
import { useCurrentUserProfileQuery } from '../../hooks/useCurrentUserProfileQuery';

const STATUS_LABEL: Record<string, string> = {
  QUEUED: 'Na fila',
  ASSIGNED: 'Em atendimento',
  CLOSED: 'Encerrada',
};

const STATUS_COLOR: Record<string, string> = {
  QUEUED: 'yellow',
  ASSIGNED: 'blue',
  CLOSED: 'gray',
};

type OperatorDraftMap = Record<string, {
  isActive: boolean;
  maxActiveConversations: number;
  flowKeys: string[];
  useCustomCapacity?: boolean;
}>;

const formatCpf = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value || 'Não informado';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatAppointmentType = (value?: string | null) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized.includes('EXAME') || normalized.includes('EXAM')) return 'Exame';
  return 'Consulta';
};

const isMediaMessage = (message: string) => /^\[(Imagem|Documento|Vídeo|Áudio) recebido\]/i.test(String(message || '').trim());
const extractFirstUrlFromText = (value?: string | null) => {
  const text = String(value || '');
  // Match URLs in the format: (http://...) or just http://...
  const match = text.match(/\(?(https?:\/\/[^\s\)]+)\)?/i);
  return match ? match[1] : '';
};

const parseMetadataObject = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
};

const findMetadataString = (root: Record<string, unknown>, candidateKeys: string[]): string => {
  const normalizedKeys = candidateKeys.map((key) => key.toLowerCase());
  const stack: unknown[] = [root];
  const seen = new Set<unknown>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }

    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      const keyLower = key.toLowerCase();
      if (typeof value === 'string' && normalizedKeys.includes(keyLower) && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'object' && value) {
        stack.push(value);
      }
    }
  }

  return '';
};

const resolveMediaUrl = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) return raw;
  const origin = String(getApiBaseUrl() || window.location.origin || '').replace(/\/$/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${origin}${path}`;
};

const extractMediaMetadata = (message: HumanConversationMessage) => {
  const metadata = parseMetadataObject(message.metadata);
  
  // Log metadata for debugging
  if (isMediaMessage(message.message)) {
    console.log('[Media Debug] Message:', message.message);
    console.log('[Media Debug] Full Metadata:', JSON.stringify(metadata, null, 2));
  }
  
  const rawUrl = findMetadataString(metadata, [
    'mediaUrl',
    'media_url',
    'url',
    'fileUrl',
    'file_url',
    'downloadUrl',
    'download_url',
    'attachmentUrl',
    'attachment_url',
    'documentUrl',
    'document_url',
    'imageUrl',
    'image_url',
    'videoUrl',
    'video_url',
    'audioUrl',
    'audio_url',
    'path',
    'mediaPath',
    'media_path',
    'link',
    'href',
  ]) || extractFirstUrlFromText(message.message);

  const mimeType = findMetadataString(metadata, [
    'mimeType',
    'mime_type',
    'mimetype',
    'contentType',
    'content_type',
  ]).toLowerCase();

  const fileName = findMetadataString(metadata, [
    'fileName',
    'file_name',
    'filename',
    'originalName',
    'original_name',
    'name',
  ]);

  const caption = findMetadataString(metadata, ['caption']);
  const mediaTypeHint = findMetadataString(metadata, ['mediaType', 'media_type', 'type']).toLowerCase();
  const resolvedUrl = resolveMediaUrl(rawUrl);
  
  // Log resolved URL for debugging
  if (isMediaMessage(message.message)) {
    console.log('[Media Debug] Raw URL:', rawUrl);
    console.log('[Media Debug] Resolved URL:', resolvedUrl);
  }

  const isImage = mimeType.startsWith('image/') || mediaTypeHint.includes('image');
  const isVideo = mimeType.startsWith('video/') || mediaTypeHint.includes('video');
  const isAudio = mimeType.startsWith('audio/') || mediaTypeHint.includes('audio');
  const isDocument = Boolean(resolvedUrl) && !isImage && !isVideo && !isAudio;

  return {
    url: resolvedUrl,
    mimeType,
    fileName,
    caption,
    isImage,
    isVideo,
    isAudio,
    isDocument,
  };
};

const isDeliveryEvent = (message: HumanConversationMessage) => {
  const event = String((message.metadata as any)?.event || '').trim().toUpperCase();
  return event === 'SENT' || event === 'DELIVERED' || event === 'READ';
};
const isEventMessage = (message: HumanConversationMessage) => (
  message.authorType === 'SYSTEM' && (
    String(message.message || '').startsWith('[Evento]')
    || String((message.metadata as any)?.event || '').trim().length > 0
  )
);

const bubbleStyles = (message: HumanConversationMessage, colorScheme: 'light' | 'dark' | 'auto') => {
  if (message.authorType === 'PATIENT') {
    return {
      alignSelf: 'flex-start',
      background: colorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
      borderColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)',
    };
  }

  if (message.authorType === 'OPERATOR') {
    return {
      alignSelf: 'flex-end',
      background: colorScheme === 'dark' ? 'rgba(34, 139, 230, 0.18)' : 'rgba(34, 139, 230, 0.09)',
      borderColor: colorScheme === 'dark' ? 'rgba(34, 139, 230, 0.35)' : 'rgba(34, 139, 230, 0.25)',
    };
  }

  if (isEventMessage(message)) {
    return {
      alignSelf: 'center',
      background: colorScheme === 'dark' ? 'rgba(255, 212, 59, 0.12)' : 'rgba(255, 212, 59, 0.18)',
      borderColor: colorScheme === 'dark' ? 'rgba(255, 212, 59, 0.28)' : 'rgba(255, 212, 59, 0.34)',
    };
  }

  return {
    alignSelf: 'center',
    background: colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  };
};

export function Conversations() {
  const { colorScheme } = useMantineColorScheme();
  const queryClient = useQueryClient();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const currentUserQuery = useCurrentUserProfileQuery();
  const currentUserId = String((currentUserQuery.data as any)?.id || '');

  const [status, setStatus] = useState<string>('QUEUED');
  const [search, setSearch] = useState('');
  const [flowKey, setFlowKey] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [operatorsModalOpen, setOperatorsModalOpen] = useState(false);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [protocolNumberInput, setProtocolNumberInput] = useState('');
  const [protocolLookupLoading, setProtocolLookupLoading] = useState(false);
  const [protocolSearch, setProtocolSearch] = useState('');
  const [protocolSearchOpen, setProtocolSearchOpen] = useState(false);
  const [protocolLookup, setProtocolLookup] = useState<{
    protocol: HumanConversationProtocolSummary | null;
    items: HumanConversationMessage[];
  } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [operatorDrafts, setOperatorDrafts] = useState<OperatorDraftMap>({});
  const [conversationSettingsDraft, setConversationSettingsDraft] = useState<HumanConversationSettings | null>(null);
  const [expandedOperators, setExpandedOperators] = useState<Record<string, boolean>>({});

  const conversationsQuery = useQuery({
    queryKey: [...queryKeys.whatsappConversations, status, search, flowKey || '', mineOnly ? 'mine' : 'all'],
    queryFn: () => whatsappConversationService.listConversations({
      status: status as any,
      search: search || undefined,
      flowKey: flowKey || undefined,
      mineOnly,
    }),
    refetchInterval: 10_000,
  });

  const flowsQuery = useQuery({
    queryKey: queryKeys.whatsappConversationFlows,
    queryFn: () => whatsappConversationService.listFlows(),
    staleTime: 60_000,
  });

  const operatorsQuery = useQuery({
    queryKey: queryKeys.whatsappConversationOperators,
    queryFn: () => whatsappConversationService.listOperators(),
    refetchInterval: 20_000,
  });

  const items = conversationsQuery.data || [];
  const selectedConversation = useMemo(
    () => items.find((item) => item.id === selectedConversationId) || items[0] || null,
    [items, selectedConversationId],
  );

  useEffect(() => {
    if (!selectedConversation && items[0]) {
      setSelectedConversationId(items[0].id);
    }
    if (selectedConversation && !items.some((item) => item.id === selectedConversation.id)) {
      setSelectedConversationId(items[0]?.id || null);
    }
  }, [items, selectedConversation]);

  const messagesQuery = useQuery({
    queryKey: [
      ...queryKeys.whatsappConversations,
      'messages',
      selectedConversation?.id || '',
      selectedConversation?.humanProtocolNumber || '',
    ],
    queryFn: () => whatsappConversationService.getMessages(selectedConversation!.id, {
      protocolNumber: selectedConversation?.humanProtocolNumber || undefined,
    }),
    enabled: Boolean(selectedConversation?.id),
    refetchInterval: selectedConversation?.id ? 5_000 : false,
  });

  useEffect(() => {
    const operators = operatorsQuery.data?.items || [];
    setOperatorDrafts((current) => {
      const next = { ...current };
      for (const operator of operators) {
        if (!next[operator.userId]) {
          next[operator.userId] = {
            isActive: operator.isActive,
            maxActiveConversations: operator.maxActiveConversations,
            flowKeys: operator.flowKeys,
            useCustomCapacity: ![1, 3, 5].includes(operator.maxActiveConversations),
          };
        }
      }
      return next;
    });
  }, [operatorsQuery.data]);

  useEffect(() => {
    if (operatorsQuery.data?.settings && !conversationSettingsDraft) {
      setConversationSettingsDraft(operatorsQuery.data.settings);
    }
  }, [conversationSettingsDraft, operatorsQuery.data]);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messagesQuery.data?.items?.length, selectedConversation?.id]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversations }),
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversationOperators }),
      queryClient.invalidateQueries({ queryKey: [...queryKeys.whatsappConversations, 'messages'] }),
    ]);
  };

  const claimMutation = useMutation({
    mutationFn: (conversationId: string) => whatsappConversationService.claimConversation(conversationId),
    onSuccess: async () => {
      notifications.show({ title: 'Conversa assumida', message: 'O atendimento foi assumido e a saudação automática já foi enviada.', color: 'green' });
      setStatus('ASSIGNED'); // Redirect to "Em atendimento" tab
      await refreshAll();
    },
    onError: (error: any) => {
      notifications.show({ title: 'Erro ao assumir', message: error?.response?.data?.error || error?.message || 'Não foi possível assumir a conversa.', color: 'red' });
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ conversationId, message }: { conversationId: string; message: string }) => whatsappConversationService.sendMessage(conversationId, message),
    onSuccess: async () => {
      setMessageDraft('');
      await refreshAll();
      await messagesQuery.refetch();
    },
    onError: (error: any) => {
      notifications.show({ title: 'Erro ao enviar', message: error?.response?.data?.error || error?.message || 'Não foi possível enviar a mensagem.', color: 'red' });
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ conversationId }: { conversationId: string }) => whatsappConversationService.closeConversation(conversationId),
    onSuccess: async () => {
      notifications.show({ title: 'Atendimento encerrado', message: 'A conversa foi encerrada com sucesso.', color: 'green' });
      await refreshAll();
      await messagesQuery.refetch();
    },
    onError: (error: any) => {
      notifications.show({ title: 'Erro ao encerrar', message: error?.response?.data?.error || error?.message || 'Não foi possível encerrar a conversa.', color: 'red' });
    },
  });

  const saveOperatorMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: OperatorDraftMap[string] }) => whatsappConversationService.saveOperatorConfig(userId, payload),
    onSuccess: async () => {
      notifications.show({ title: 'Configuração salva', message: 'As regras do atendente foram atualizadas.', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversationOperators });
    },
    onError: (error: any) => {
      notifications.show({ title: 'Erro ao salvar', message: error?.response?.data?.error || error?.message || 'Não foi possível salvar a configuração.', color: 'red' });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (payload: { idleTimeoutMinutes: number; closeWarningMinutes: number }) => whatsappConversationService.saveSettings(payload),
    onSuccess: async (data) => {
      setConversationSettingsDraft(data);
      notifications.show({ title: 'Configuração salva', message: 'Os tempos globais do atendimento foram atualizados.', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversationOperators });
    },
    onError: (error: any) => {
      notifications.show({ title: 'Erro ao salvar', message: error?.response?.data?.error || error?.message || 'Não foi possível salvar a configuração.', color: 'red' });
    },
  });

  const flowOptions = (flowsQuery.data || []).map((flow: HumanConversationFlow) => ({
    value: flow.key,
    label: flow.label,
  }));

  const handleSaveOperator = async (operator: HumanConversationOperatorConfig) => {
    const draft = operatorDrafts[operator.userId];
    if (!draft) return;
    await saveOperatorMutation.mutateAsync({ userId: operator.userId, payload: draft });
  };

  const selectedPatient = messagesQuery.data?.patient || null;
  const selectedPatientAppointments = messagesQuery.data?.appointments || { next: null, recent: [] };
  const rawMessages = messagesQuery.data?.items || [];
  const currentConversation = messagesQuery.data?.conversation || selectedConversation;

  const messageStatusMap = useMemo(() => {
    const map = new Map<string, 'SENT' | 'DELIVERED' | 'READ'>();
    for (const message of rawMessages) {
      if (!isDeliveryEvent(message)) continue;
      const providerMessageId = String((message.metadata as any)?.providerMessageId || '').trim();
      const event = String((message.metadata as any)?.event || '').trim().toUpperCase() as 'SENT' | 'DELIVERED' | 'READ';
      if (!providerMessageId || !event) continue;

      const current = map.get(providerMessageId);
      if (event === 'READ' || !current || (event === 'DELIVERED' && current === 'SENT')) {
        map.set(providerMessageId, event);
      }
    }
    return map;
  }, [rawMessages]);

  const currentMessages = useMemo(
    () => rawMessages.filter((message) => !isDeliveryEvent(message)),
    [rawMessages],
  );

  // Find matching messages for scroll
  const matchingMessageIndices = useMemo(() => {
    const searchTerm = messageSearch.trim().toLowerCase();
    if (!searchTerm) return [];
    const indices: number[] = [];
    currentMessages.forEach((message, index) => {
      const text = String(message.message || '').toLowerCase();
      const authorName = String(message.authorName || '').toLowerCase();
      if (text.includes(searchTerm) || authorName.includes(searchTerm)) {
        indices.push(index);
      }
    });
    return indices;
  }, [currentMessages, messageSearch]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Scroll to matching message when search changes
  useEffect(() => {
    if (matchingMessageIndices.length > 0 && viewportRef.current) {
      const targetIndex = matchingMessageIndices[currentMatchIndex % matchingMessageIndices.length];
      const messageElements = viewportRef.current.querySelectorAll('[data-message-index]');
      const targetElement = messageElements[targetIndex] as HTMLElement;
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [matchingMessageIndices, currentMatchIndex]);

  // Scroll to matching message in protocol modal
  useEffect(() => {
    if (protocolSearch.trim() && protocolLookup?.items) {
      const searchTerm = protocolSearch.trim().toLowerCase();
      const filteredMessages = protocolLookup.items.filter((msg) => !isDeliveryEvent(msg) && !isEventMessage(msg));
      const matchIndex = filteredMessages.findIndex((msg) => {
        const messageText = String(msg.message || '').toLowerCase();
        return messageText.includes(searchTerm);
      });
      
      if (matchIndex >= 0) {
        // Wait for next tick to ensure DOM is updated
        setTimeout(() => {
          const modalScrollArea = document.querySelector('[data-protocol-scroll]');
          if (modalScrollArea) {
            const messageElements = modalScrollArea.querySelectorAll('[data-protocol-message]');
            const targetElement = messageElements[matchIndex] as HTMLElement;
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 100);
      }
    }
  }, [protocolSearch, protocolLookup]);

  const isValidProtocolFormat = (value: string) => {
    const trimmed = value.trim();
    // Matches patterns like: WA-20260410-2014ED, WA-20260410-123456, etc.
    return /^WA-\d{8}-[A-Z0-9]{6}$/i.test(trimmed);
  };

  const openProtocolModal = (protocolNumber?: string) => {
    setProtocolModalOpen(true);
    const protocol = protocolNumber || String(currentConversation?.humanProtocolNumber || '').trim();
    setProtocolNumberInput(protocol);
    if (protocol) {
      void handleLookupProtocol(protocol);
    } else {
      setProtocolLookup(null);
    }
  };

  const handleLookupProtocol = async (customProtocol?: string) => {
    const conversationId = selectedConversation?.id;
    const protocolNumber = customProtocol || String(protocolNumberInput || '').trim();
    if (!conversationId) return;
    if (!protocolNumber) {
      setProtocolLookup(null);
      return;
    }

    setProtocolLookupLoading(true);
    try {
      const data = await whatsappConversationService.getProtocolHistory(conversationId, protocolNumber);
      setProtocolLookup({
        protocol: data.protocol || { number: protocolNumber },
        items: data.items || [],
      });
      if (!(data.items || []).length) {
        notifications.show({
          title: 'Protocolo sem mensagens',
          message: `Nenhuma mensagem encontrada para o protocolo ${protocolNumber}.`,
          color: 'yellow',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erro ao buscar protocolo',
        message: error?.response?.data?.error || error?.message || 'Não foi possível buscar o protocolo informado.',
        color: 'red',
      });
    } finally {
      setProtocolLookupLoading(false);
    }
  };

  const queueButtonLabel = (item: HumanConversationItem) => {
    if (item.humanStatus === 'QUEUED') return 'Assumir da fila';
    if (item.humanStatus === 'ASSIGNED') return 'Assumir atendimento';
    return 'Assumir';
  };

  const isAlreadyAssignedToMe = (item: HumanConversationItem) => {
    return item.humanStatus === 'ASSIGNED' && item.humanAssignedUserId === currentUserId;
  };

  const renderAppointmentCard = (appointment: HumanConversationPatientAppointment, title?: string) => (
    <Paper key={`${title || 'appointment'}-${appointment.id}`} withBorder radius="md" p="sm">
      {title ? <Text size="xs" c="dimmed" mb={6}>{title}</Text> : null}
      <Text fw={600}>
        {formatAppointmentType(appointment.type)}
        {appointment.specialty ? ` • ${appointment.specialty}` : ''}
      </Text>
      <Text size="sm" c="dimmed">
        {appointment.date ? dayjs(appointment.date).format('DD/MM/YYYY') : 'Data não informada'}
        {appointment.time ? ` às ${appointment.time}` : ''}
      </Text>
      <Text size="sm">{appointment.doctorName || 'Profissional não informado'}</Text>
      <Text size="xs" c="dimmed">
        {appointment.convenio || 'Convênio não informado'} • {appointment.status || 'Status não informado'}
      </Text>
    </Paper>
  );

  const renderPatientInfo = (patient: HumanConversationPatientInfo | null) => (
    <Stack gap="xs">
      <Group grow>
        <Box>
          <Text size="xs" c="dimmed">Nome</Text>
          <Text fw={600}>{patient?.name || currentConversation?.patientName || 'Não informado'}</Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">CPF</Text>
          <Text fw={600}>{formatCpf(patient?.cpf)}</Text>
        </Box>
      </Group>
      <Group grow>
        <Box>
          <Text size="xs" c="dimmed">Celular</Text>
          <Text>{patient?.cellphone || patient?.phone || currentConversation?.phone || 'Não informado'}</Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">Nascimento</Text>
          <Text>{patient?.birthDate ? dayjs(patient.birthDate).format('DD/MM/YYYY') : 'Não informado'}</Text>
        </Box>
      </Group>
      <Group grow>
        <Box>
          <Text size="xs" c="dimmed">Convênio</Text>
          <Text>{patient?.healthInsuranceName || 'Não informado'}</Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">Carteirinha</Text>
          <Text>{patient?.healthInsuranceNumber || 'Não informado'}</Text>
        </Box>
      </Group>
      <Box>
        <Text size="xs" c="dimmed">E-mail</Text>
        <Text>{patient?.email || 'Não informado'}</Text>
      </Box>
      <Box>
        <Text size="xs" c="dimmed">Endereço</Text>
        <Text>{patient?.address || 'Não informado'}</Text>
      </Box>
      <Box>
        <Text size="xs" c="dimmed">Observações</Text>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{patient?.observations || 'Nenhuma observação cadastrada'}</Text>
      </Box>

      <Divider my="xs" />

      <Box>
        <Text fw={600} mb="xs">Próximo agendamento</Text>
        {selectedPatientAppointments.next
          ? renderAppointmentCard(selectedPatientAppointments.next, 'Próximo')
          : <Text size="sm" c="dimmed">Nenhum próximo agendamento encontrado.</Text>}
      </Box>

      <Box>
        <Text fw={600} mb="xs">Últimos atendimentos</Text>
        <Stack gap="xs">
          {selectedPatientAppointments.recent.length
            ? selectedPatientAppointments.recent.map((appointment, index) => renderAppointmentCard(appointment, `${index + 1}. Mais recente`))
            : <Text size="sm" c="dimmed">Nenhum atendimento anterior encontrado.</Text>}
        </Stack>
      </Box>
    </Stack>
  );

  const renderMessageContent = (message: HumanConversationMessage) => {
    const media = extractMediaMetadata(message);
    const cleanText = String(message.message || '').trim();
    const isMediaIndicator = isMediaMessage(cleanText);
    const hasMediaUrl = Boolean(media.url);
    const shouldShowText = cleanText.length > 0 && !isMediaIndicator;

    return (
      <Stack gap={6}>
        {media.isImage && hasMediaUrl ? (
          <Box>
            <img
              src={media.url}
              alt={media.fileName || 'Imagem enviada'}
              style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </Box>
        ) : null}
        {media.isVideo && hasMediaUrl ? (
          <video src={media.url} controls style={{ width: '100%', borderRadius: 8 }} />
        ) : null}
        {media.isAudio && hasMediaUrl ? (
          <audio src={media.url} controls style={{ width: '100%' }} />
        ) : null}
        {media.isDocument && hasMediaUrl ? (
          <Button
            size="xs"
            variant="light"
            component="a"
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {media.fileName ? `Abrir documento: ${media.fileName}` : 'Abrir documento'}
          </Button>
        ) : null}
        {isMediaIndicator && !hasMediaUrl ? (
          <Stack gap={4}>
            <Badge variant="light" color="yellow">Mídia recebida • Aguardando processamento</Badge>
            {media.fileName ? (
              <Text size="xs" c="dimmed">Arquivo: {media.fileName}</Text>
            ) : null}
          </Stack>
        ) : null}
        {media.caption ? (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{media.caption}</Text>
        ) : null}
        {shouldShowText ? (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{message.message}</Text>
        ) : null}
      </Stack>
    );
  };

  return (
    <Box p={0}>
      <Header />
      <Stack gap="md" px="md" pb="md" pt="sm">
        <Group justify="space-between" align="center">
          <Box>
            <Text fw={700} size="xl">Conversas</Text>
            <Text c="dimmed" size="sm">Fila humanizada do WhatsApp com protocolo, histórico, eventos e acompanhamento em tempo real.</Text>
          </Box>
          <Group gap="xs">
            <Button variant="light" leftSection={<Settings size={16} />} onClick={() => setOperatorsModalOpen(true)}>
              Operadores
            </Button>
            <ActionIcon variant="light" size="lg" onClick={() => refreshAll()} disabled={conversationsQuery.isFetching || messagesQuery.isFetching}>
              <RefreshCcw size={16} />
            </ActionIcon>
          </Group>
        </Group>

        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: sidebarCollapsed ? '84px minmax(0, 1fr)' : 'minmax(320px, 420px) minmax(0, 1fr)',
            gap: '16px',
            alignItems: 'stretch',
            height: 'calc(100vh - 180px)',
          }}
        >
          <Paper withBorder p={sidebarCollapsed ? 'xs' : 'md'} radius="lg" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Stack gap="sm">
              {!sidebarCollapsed ? (
                <>
                  <Group align="center" wrap="nowrap">
                    <SegmentedControl
                      style={{ flex: 1 }}
                      value={status}
                      onChange={setStatus}
                      data={[
                        { value: 'QUEUED', label: 'Fila' },
                        { value: 'ASSIGNED', label: 'Em atendimento' },
                        { value: 'CLOSED', label: 'Encerradas' },
                      ]}
                    />
                    <Tooltip label={sidebarCollapsed ? 'Expandir lista' : 'Minimizar lista'}>
                      <ActionIcon
                        variant="light"
                        size="lg"
                        onClick={() => setSidebarCollapsed((value) => !value)}
                      >
                        {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <TextInput
                    label="Buscar"
                    placeholder="Paciente, telefone ou protocolo"
                    leftSection={<Search size={16} />}
                    value={search}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setSearch(value);
                      // Auto-open protocol modal when valid protocol is typed
                      if (isValidProtocolFormat(value)) {
                        openProtocolModal(value.trim());
                      }
                    }}
                  />
                  <Select
                    label="Fluxo"
                    placeholder="Todos"
                    clearable
                    data={flowOptions}
                    value={flowKey}
                    onChange={setFlowKey}
                  />
                  <Switch
                    label="Mostrar só as minhas"
                    checked={mineOnly}
                    onChange={(event) => setMineOnly(event.currentTarget.checked)}
                  />
                  <Divider />
                </>
              ) : null}
              {sidebarCollapsed ? (
                <Tooltip label="Expandir lista">
                  <ActionIcon
                    variant="light"
                    size="lg"
                    onClick={() => setSidebarCollapsed(false)}
                    mx="auto"
                  >
                    <PanelLeftOpen size={16} />
                  </ActionIcon>
                </Tooltip>
              ) : null}
              <ScrollArea style={{ flex: 1 }} offsetScrollbars>
                <Stack gap="sm">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      withBorder
                      radius="lg"
                      padding="md"
                      style={{
                        cursor: 'pointer',
                        borderColor: selectedConversation?.id === item.id ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-default-border)',
                        background: selectedConversation?.id === item.id
                          ? (colorScheme === 'dark' ? 'rgba(34, 139, 230, 0.09)' : 'rgba(34, 139, 230, 0.05)')
                          : undefined,
                        boxShadow: selectedConversation?.id === item.id ? '0 0 0 1px rgba(34, 139, 230, 0.1)' : 'none',
                      }}
                      onClick={() => setSelectedConversationId(item.id)}
                    >
                      <Stack gap={8}>
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Box style={{ flex: 1 }}>
                            <Group gap={8} wrap="nowrap">
                              <ThemeIcon variant="light" radius="xl" size="md">
                                <MessageCircle size={14} />
                              </ThemeIcon>
                              {!sidebarCollapsed ? (
                                <Box style={{ flex: 1 }}>
                                  <Text fw={700} lineClamp={1}>{item.patientName || item.phone}</Text>
                                  <Text size="xs" c="dimmed">{item.phone}</Text>
                                </Box>
                              ) : null}
                            </Group>
                          </Box>
                          {!sidebarCollapsed ? (
                            <Badge color={STATUS_COLOR[item.humanStatus || 'CLOSED']} variant="light">
                              {STATUS_LABEL[item.humanStatus || 'CLOSED']}
                            </Badge>
                          ) : null}
                        </Group>
                        {!sidebarCollapsed ? (
                          <>
                            <Group gap={6}>
                              <Badge variant="outline">{item.humanFlowLabel || item.humanFlowKey || 'Sem fluxo'}</Badge>
                              {item.humanProtocolNumber ? <Badge variant="light" color="dark">{item.humanProtocolNumber}</Badge> : null}
                            </Group>
                            <Text size="sm" c="dimmed" lineClamp={2}>
                              {item.lastInboundMessage || item.lastOutboundMessage || 'Sem mensagens recentes'}
                            </Text>
                            <Group justify="space-between" gap="xs">
                              <Text size="xs" c="dimmed">
                                {item.humanAssignedUserName ? `Atendente: ${item.humanAssignedUserName}` : 'Aguardando atendente'}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {dayjs(item.updatedAt).format('DD/MM HH:mm')}
                              </Text>
                            </Group>
                          </>
                        ) : (
                          <Stack gap={4} align="center">
                            <Badge color={STATUS_COLOR[item.humanStatus || 'CLOSED']} variant="light" size="xs">
                              {String(STATUS_LABEL[item.humanStatus || 'CLOSED']).split(' ')[0]}
                            </Badge>
                            <Text size="xs" c="dimmed">{dayjs(item.updatedAt).format('HH:mm')}</Text>
                          </Stack>
                        )}
                      </Stack>
                    </Card>
                  ))}
                  {!items.length ? <Text c="dimmed" size="sm">Nenhuma conversa encontrada.</Text> : null}
                </Stack>
              </ScrollArea>
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {!selectedConversation ? (
              <Stack align="center" justify="center" style={{ flex: 1 }}>
                <MessageCircle size={36} />
                <Text fw={600}>Selecione uma conversa</Text>
              </Stack>
            ) : (
              <Stack gap="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Box style={{ flex: 1 }}>
                    <Group gap="xs" wrap="nowrap" align="center">
                      <Text fw={700} size="lg">{selectedConversation.patientName || 'Paciente sem identificação'}</Text>
                      <Tooltip label="Informações do paciente">
                        <ActionIcon variant="subtle" onClick={() => setPatientModalOpen(true)}>
                          <Info size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <Text size="sm" c="dimmed">{selectedConversation.phone}</Text>
                    <Group gap={8} mt={6}>
                      <Badge color={STATUS_COLOR[selectedConversation.humanStatus || 'CLOSED']} variant="light">
                        {STATUS_LABEL[selectedConversation.humanStatus || 'CLOSED']}
                      </Badge>
                      <Badge variant="outline">{selectedConversation.humanFlowLabel || selectedConversation.humanFlowKey}</Badge>
                      {selectedConversation.humanProtocolNumber ? (
                        <Badge variant="light" color="dark">{selectedConversation.humanProtocolNumber}</Badge>
                      ) : null}
                    </Group>
                  </Box>
                  <Group gap="xs">
                    <Tooltip label="Buscar mensagens">
                      <ActionIcon
                        variant="light"
                        size="lg"
                        onClick={() => {
                          setMessageSearchOpen(!messageSearchOpen);
                          if (messageSearchOpen) {
                            setMessageSearch('');
                            setCurrentMatchIndex(0);
                          }
                        }}
                      >
                        <Search size={16} />
                      </ActionIcon>
                    </Tooltip>
                    {selectedConversation.humanStatus !== 'CLOSED' && !isAlreadyAssignedToMe(selectedConversation) ? (
                      <Button
                        leftSection={<UserCheck size={14} />}
                        onClick={() => claimMutation.mutate(selectedConversation.id)}
                        loading={claimMutation.isPending}
                      >
                        {queueButtonLabel(selectedConversation)}
                      </Button>
                    ) : null}
                    {selectedConversation.humanStatus !== 'CLOSED' ? (
                      <Button
                        color="red"
                        variant="light"
                        leftSection={<XCircle size={14} />}
                        onClick={() => closeMutation.mutate({ conversationId: selectedConversation.id })}
                        loading={closeMutation.isPending}
                      >
                        Encerrar
                      </Button>
                    ) : null}
                  </Group>
                </Group>

                {messageSearchOpen ? (
                  <Group gap="xs" wrap="nowrap">
                    <TextInput
                      placeholder="Digite para buscar e rolar até a mensagem"
                      leftSection={<Search size={16} />}
                      value={messageSearch}
                      onChange={(event) => {
                        setMessageSearch(event.currentTarget.value);
                        setCurrentMatchIndex(0);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && matchingMessageIndices.length > 0) {
                          setCurrentMatchIndex((prev) => (prev + 1) % matchingMessageIndices.length);
                        }
                      }}
                      style={{ flex: 1 }}
                      rightSection={
                        matchingMessageIndices.length > 0 ? (
                          <Text size="xs" c="dimmed">
                            {currentMatchIndex + 1}/{matchingMessageIndices.length}
                          </Text>
                        ) : null
                      }
                    />
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        setMessageSearchOpen(false);
                        setMessageSearch('');
                        setCurrentMatchIndex(0);
                      }}
                    >
                      <XCircle size={16} />
                    </ActionIcon>
                  </Group>
                ) : null}

                <ScrollArea style={{ flex: 1 }} offsetScrollbars viewportRef={viewportRef}>
                  <Stack gap="sm" pr="xs">
                    {currentMessages.map((message, index) => {
                      const styles = bubbleStyles(message, colorScheme);
                      const messageState = message.providerMessageId
                        ? messageStatusMap.get(message.providerMessageId) || 'SENT'
                        : null;
                      const isMatch = matchingMessageIndices.includes(index);
                      return (
                        <Paper
                          key={message.id}
                          data-message-index={index}
                          p="sm"
                          withBorder
                          radius="md"
                          style={{
                            ...styles,
                            maxWidth: isEventMessage(message) ? '70%' : '82%',
                            ...(isMatch && messageSearch ? {
                              boxShadow: '0 0 0 2px var(--mantine-color-blue-5)',
                              transition: 'box-shadow 0.3s ease',
                            } : {}),
                          }}
                        >
                          <Text size="xs" c="dimmed" mb={4}>
                            {message.authorName || message.authorType} • {dayjs(message.createdAt).format('DD/MM/YYYY HH:mm')}
                          </Text>
                          {renderMessageContent(message)}
                          {message.authorType === 'OPERATOR' && messageState ? (
                            <Group justify="flex-end" gap={4} mt={8}>
                              {messageState === 'SENT' ? (
                                <Check size={14} color="var(--mantine-color-gray-5)" />
                              ) : null}
                              {messageState === 'DELIVERED' ? (
                                <CheckCheck size={14} color="var(--mantine-color-gray-5)" />
                              ) : null}
                              {messageState === 'READ' ? (
                                <CheckCheck size={14} color="var(--mantine-color-blue-5)" />
                              ) : null}
                            </Group>
                          ) : null}
                        </Paper>
                      );
                    })}
                  </Stack>
                </ScrollArea>

                {selectedConversation.humanStatus !== 'CLOSED' ? (
                  <Card radius="lg" withBorder padding="md">
                    <Stack gap="xs">
                      <Textarea
                        label="Responder ao paciente"
                        minRows={4}
                        placeholder="Digite a mensagem do atendimento humano"
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.currentTarget.value)}
                      />
                      <Group justify="flex-end">
                        <Button
                          leftSection={<Send size={14} />}
                          onClick={() => selectedConversation && sendMutation.mutate({ conversationId: selectedConversation.id, message: messageDraft })}
                          loading={sendMutation.isPending}
                          disabled={!messageDraft.trim()}
                        >
                          Enviar mensagem
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                ) : (
                  <Badge color="gray" variant="light" w="fit-content">
                    Atendimento encerrado
                  </Badge>
                )}
              </Stack>
            )}
          </Paper>
        </Box>
      </Stack>

      <Modal
        opened={operatorsModalOpen}
        onClose={() => setOperatorsModalOpen(false)}
        title="Configuração de operadores"
        size="xl"
      >
        <Stack gap="sm">
          {conversationSettingsDraft ? (
            <Paper withBorder radius="lg" p="md">
              <Stack gap="md">
                <Box>
                  <Text fw={700}>Configuração geral do atendimento</Text>
                  <Text size="sm" c="dimmed">Esses tempos valem para toda a operação de conversas desta filial.</Text>
                </Box>
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  <NumberInput
                    label="Aviso de ociosidade"
                    description="Minutos sem resposta do paciente para enviar o aviso"
                    min={1}
                    value={conversationSettingsDraft.idleTimeoutMinutes}
                    onChange={(value) => setConversationSettingsDraft((current) => current ? ({
                      ...current,
                      idleTimeoutMinutes: Number(value || 25),
                    }) : current)}
                  />
                  <NumberInput
                    label="Prazo para encerrar"
                    description="Minutos após o aviso para encerrar automaticamente"
                    min={1}
                    value={conversationSettingsDraft.closeWarningMinutes}
                    onChange={(value) => setConversationSettingsDraft((current) => current ? ({
                      ...current,
                      closeWarningMinutes: Number(value || 5),
                    }) : current)}
                  />
                </SimpleGrid>
                <Group justify="flex-end">
                  <Button
                    onClick={() => conversationSettingsDraft && saveSettingsMutation.mutate({
                      idleTimeoutMinutes: conversationSettingsDraft.idleTimeoutMinutes,
                      closeWarningMinutes: conversationSettingsDraft.closeWarningMinutes,
                    })}
                    loading={saveSettingsMutation.isPending}
                  >
                    Salvar configuração geral
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ) : null}

          {(operatorsQuery.data?.items || []).map((operator) => {
            const draft = operatorDrafts[operator.userId] || {
              isActive: operator.isActive,
              maxActiveConversations: operator.maxActiveConversations,
              flowKeys: operator.flowKeys,
              useCustomCapacity: ![1, 3, 5].includes(operator.maxActiveConversations),
            };

            const isExpanded = Boolean(expandedOperators[operator.userId]);

            return (
              <Paper key={operator.userId} withBorder radius="lg" p="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Box>
                      <Text fw={700}>{operator.userName}</Text>
                      <Text size="sm" c="dimmed">{operator.userEmail}</Text>
                      <Text size="xs" c="dimmed">Ativas agora: {operator.activeConversationCount}</Text>
                    </Box>
                    <Group gap="xs" align="center" wrap="nowrap">
                      <Switch
                        checked={draft.isActive}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setOperatorDrafts((current) => ({
                            ...current,
                            [operator.userId]: {
                              ...draft,
                              isActive: checked,
                            },
                          }));
                        }}
                        label="Ativo"
                      />
                      <ActionIcon
                        variant="light"
                        onClick={() => setExpandedOperators((current) => ({
                          ...current,
                          [operator.userId]: !current[operator.userId],
                        }))}
                        aria-label={isExpanded ? 'Recolher operador' : 'Expandir operador'}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </ActionIcon>
                    </Group>
                  </Group>

                  <Collapse in={isExpanded}>
                    <Stack gap="md">
                      <Stack gap="xs">
                        <Text size="sm" fw={600}>Capacidade simultânea</Text>
                        <Group gap="xs">
                          {[1, 3, 5].map((preset) => (
                            <Button
                              key={preset}
                              variant={!draft.useCustomCapacity && draft.maxActiveConversations === preset ? 'filled' : 'light'}
                              onClick={() => setOperatorDrafts((current) => ({
                                ...current,
                                [operator.userId]: {
                                  ...draft,
                                  maxActiveConversations: preset,
                                  useCustomCapacity: false,
                                },
                              }))}
                            >
                              {preset}
                            </Button>
                          ))}
                          <Button
                            variant={draft.useCustomCapacity ? 'filled' : 'light'}
                            onClick={() => setOperatorDrafts((current) => ({
                              ...current,
                              [operator.userId]: {
                                ...draft,
                                maxActiveConversations: Math.max(1, Number(draft.maxActiveConversations || 1)),
                                useCustomCapacity: true,
                              },
                            }))}
                          >
                            Personalizado
                          </Button>
                        </Group>
                        {draft.useCustomCapacity ? (
                          <TextInput
                            label="Capacidade personalizada"
                            description="Digite quantas conversas simultâneas esse operador pode assumir"
                            inputMode="numeric"
                            value={String(draft.maxActiveConversations || '')}
                            onChange={(event) => {
                              const digits = event.currentTarget.value.replace(/\D/g, '');
                              setOperatorDrafts((current) => ({
                                ...current,
                                [operator.userId]: {
                                  ...draft,
                                  maxActiveConversations: Math.max(1, Number(digits || 1)),
                                  useCustomCapacity: true,
                                },
                              }));
                            }}
                          />
                        ) : null}
                      </Stack>

                      <MultiSelect
                        label="Fluxos atendidos"
                        placeholder="Selecione os fluxos do operador"
                        data={flowOptions}
                        value={draft.flowKeys}
                        onChange={(value) => setOperatorDrafts((current) => ({
                          ...current,
                          [operator.userId]: {
                            ...draft,
                            flowKeys: value,
                          },
                        }))}
                        searchable
                        maxDropdownHeight={240}
                        comboboxProps={{ withinPortal: false }}
                        styles={{
                          pillsList: { minHeight: 44, alignItems: 'center' },
                        }}
                      />

                      <Group justify="flex-end">
                        <Button onClick={() => handleSaveOperator(operator)} loading={saveOperatorMutation.isPending}>
                          Salvar operador
                        </Button>
                      </Group>
                    </Stack>
                  </Collapse>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Modal>

      <Modal
        opened={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
        title="Informações do paciente"
        size="lg"
      >
        {renderPatientInfo(selectedPatient)}
      </Modal>

      <Modal
        opened={protocolModalOpen}
        onClose={() => {
          setProtocolModalOpen(false);
          setProtocolSearch('');
          setProtocolSearchOpen(false);
        }}
        title="Protocolo do atendimento"
        size="lg"
      >
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <TextInput
              style={{ flex: 1 }}
              label="Número do protocolo"
              placeholder="Digite o protocolo para consultar"
              leftSection={<Search size={16} />}
              value={protocolNumberInput}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setProtocolNumberInput(value);
                // Auto-search when typed
                if (value.trim().length > 0) {
                  void handleLookupProtocol(value.trim());
                } else {
                  setProtocolLookup(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleLookupProtocol();
                }
              }}
              rightSection={protocolLookupLoading ? <RefreshCcw size={14} className="animate-spin" /> : null}
            />
            <Tooltip label="Buscar nas mensagens">
              <ActionIcon
                variant="light"
                size="lg"
                mt={24}
                onClick={() => {
                  setProtocolSearchOpen(!protocolSearchOpen);
                  if (protocolSearchOpen) {
                    setProtocolSearch('');
                  }
                }}
              >
                <Search size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {protocolSearchOpen ? (
            <Group gap="xs" wrap="nowrap">
              <TextInput
                placeholder="Digite para buscar e rolar até a mensagem"
                leftSection={<Search size={16} />}
                value={protocolSearch}
                onChange={(event) => setProtocolSearch(event.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => {
                  setProtocolSearchOpen(false);
                  setProtocolSearch('');
                }}
              >
                <XCircle size={16} />
              </ActionIcon>
            </Group>
          ) : null}

          <Group grow>
            <Box>
              <Text size="xs" c="dimmed">Número</Text>
              <Text fw={700}>{protocolLookup?.protocol?.number || '-'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Início</Text>
              <Text>{protocolLookup?.protocol?.startedAt ? dayjs(protocolLookup.protocol.startedAt).format('DD/MM/YYYY HH:mm') : 'Não informado'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Fim</Text>
              <Text>{protocolLookup?.protocol?.closedAt ? dayjs(protocolLookup.protocol.closedAt).format('DD/MM/YYYY HH:mm') : 'Em aberto'}</Text>
            </Box>
          </Group>
          <Divider />
          <ScrollArea h={protocolSearchOpen ? 310 : 360} data-protocol-scroll>
            <Stack gap="xs">
              {!protocolLookup ? (
                <Text size="sm" c="dimmed">Digite um protocolo para ver apenas o trecho desse atendimento.</Text>
              ) : null}
              {protocolLookup && protocolLookup.items.filter((msg) => !isDeliveryEvent(msg) && !isEventMessage(msg)).length === 0 ? (
                <Text size="sm" c="dimmed">Nenhuma mensagem encontrada para esse protocolo.</Text>
              ) : null}
              {(protocolLookup?.items || [])
                .filter((msg) => !isDeliveryEvent(msg) && !isEventMessage(msg))
                .map((message) => {
                  const searchTerm = protocolSearch.trim().toLowerCase();
                  const messageText = String(message.message || '').toLowerCase();
                  const isMatch = searchTerm && messageText.includes(searchTerm);
                  return (
                    <Paper
                      key={message.id}
                      data-protocol-message
                      withBorder
                      radius="md"
                      p="sm"
                      style={{
                        ...(isMatch ? {
                          boxShadow: '0 0 0 2px var(--mantine-color-blue-5)',
                          transition: 'box-shadow 0.3s ease',
                        } : {}),
                      }}
                    >
                      <Text size="xs" c="dimmed" mb={4}>
                        {dayjs(message.createdAt).format('DD/MM/YYYY HH:mm')} • {message.authorName || message.authorType}
                      </Text>
                      {renderMessageContent(message)}
                    </Paper>
                  );
                })}
            </Stack>
          </ScrollArea>
        </Stack>
      </Modal>
    </Box>
  );
}
