import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
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
  AlertCircle,
  Check,
  CheckCheck,
  FileClock,
  Info,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Send,
  Settings,
  UserCheck,
  XCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { queryKeys } from '../../lib/queryKeys';
import whatsappConversationService, {
  type HumanConversationFlow,
  type HumanConversationItem,
  type HumanConversationMessage,
  type HumanConversationOperatorConfig,
  type HumanConversationPatientInfo,
} from '../../services/whatsappConversationService';

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
  idleTimeoutMinutes: number;
  closeWarningMinutes: number;
  flowKeys: string[];
}>;

const formatCpf = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value || 'Não informado';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const isMediaMessage = (message: string) => /^\[(Imagem|Documento|Vídeo|Áudio) recebido\]/i.test(String(message || '').trim());
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

const getCapacityPreset = (value: number) => {
  if (value === 1 || value === 3 || value === 5) return String(value);
  return 'custom';
};

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

  const [status, setStatus] = useState<string>('QUEUED');
  const [search, setSearch] = useState('');
  const [flowKey, setFlowKey] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [operatorsModalOpen, setOperatorsModalOpen] = useState(false);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [operatorDrafts, setOperatorDrafts] = useState<OperatorDraftMap>({});

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
    queryKey: [...queryKeys.whatsappConversations, 'messages', selectedConversation?.id || ''],
    queryFn: () => whatsappConversationService.getMessages(selectedConversation!.id),
    enabled: Boolean(selectedConversation?.id),
    refetchInterval: selectedConversation?.id ? 5_000 : false,
  });

  useEffect(() => {
    const operators = operatorsQuery.data || [];
    setOperatorDrafts((current) => {
      const next = { ...current };
      for (const operator of operators) {
        if (!next[operator.userId]) {
          next[operator.userId] = {
            isActive: operator.isActive,
            maxActiveConversations: operator.maxActiveConversations,
            idleTimeoutMinutes: operator.idleTimeoutMinutes,
            closeWarningMinutes: operator.closeWarningMinutes,
            flowKeys: operator.flowKeys,
          };
        }
      }
      return next;
    });
  }, [operatorsQuery.data]);

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

  const queueButtonLabel = (item: HumanConversationItem) => {
    if (item.humanStatus === 'QUEUED') return 'Assumir da fila';
    if (item.humanStatus === 'ASSIGNED') return 'Assumir atendimento';
    return 'Assumir';
  };

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
    </Stack>
  );

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
          }}
        >
          <Paper withBorder p={sidebarCollapsed ? 'xs' : 'md'} radius="lg" style={{ minHeight: 760, overflow: 'hidden' }}>
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
                    placeholder="Paciente, telefone, protocolo ou mensagem"
                    value={search}
                    onChange={(event) => setSearch(event.currentTarget.value)}
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
              <ScrollArea h={610} offsetScrollbars>
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

          <Paper withBorder p="md" radius="lg" style={{ minHeight: 760 }}>
            {!selectedConversation ? (
              <Stack align="center" justify="center" h={700}>
                <MessageCircle size={36} />
                <Text fw={600}>Selecione uma conversa</Text>
              </Stack>
            ) : (
              <Stack gap="md" h="100%">
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
                    <Button variant="light" leftSection={<FileClock size={14} />} onClick={() => setProtocolModalOpen(true)}>
                      Protocolo
                    </Button>
                    {selectedConversation.humanStatus !== 'CLOSED' ? (
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

                <Card
                  radius="lg"
                  withBorder
                  padding="md"
                  style={{
                    background: colorScheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  }}
                >
                  <Group justify="space-between" align="center">
                    <Box>
                      <Text fw={600}>Resumo rápido</Text>
                      <Text size="sm" c="dimmed">
                        {selectedConversation.humanAssignedUserName
                          ? `Em atendimento com ${selectedConversation.humanAssignedUserName}`
                          : 'Aguardando alguém assumir na fila'}
                      </Text>
                    </Box>
                    {selectedConversation.humanStatus === 'QUEUED' ? (
                      <Group gap={6}>
                        <AlertCircle size={16} />
                        <Text size="sm">Conversa aguardando atendimento humano</Text>
                      </Group>
                    ) : null}
                  </Group>
                </Card>

                <ScrollArea h={430} offsetScrollbars viewportRef={viewportRef}>
                  <Stack gap="sm" pr="xs">
                    {currentMessages.map((message) => {
                      const styles = bubbleStyles(message, colorScheme);
                      const messageState = message.providerMessageId
                        ? messageStatusMap.get(message.providerMessageId) || 'SENT'
                        : null;
                      return (
                        <Paper
                          key={message.id}
                          p="sm"
                          withBorder
                          radius="md"
                          style={{
                            ...styles,
                            maxWidth: isEventMessage(message) ? '70%' : '82%',
                          }}
                        >
                          <Text size="xs" c="dimmed" mb={4}>
                            {message.authorName || message.authorType} • {dayjs(message.createdAt).format('DD/MM/YYYY HH:mm')}
                          </Text>
                          {isMediaMessage(message.message) ? (
                            <Badge variant="light" color="indigo" mb={6}>Mídia / documento</Badge>
                          ) : null}
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{message.message}</Text>
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
          {(operatorsQuery.data || []).map((operator) => {
            const draft = operatorDrafts[operator.userId] || {
              isActive: operator.isActive,
              maxActiveConversations: operator.maxActiveConversations,
              idleTimeoutMinutes: operator.idleTimeoutMinutes,
              closeWarningMinutes: operator.closeWarningMinutes,
              flowKeys: operator.flowKeys,
            };

            const capacityPreset = getCapacityPreset(draft.maxActiveConversations);

            return (
              <Paper key={operator.userId} withBorder radius="lg" p="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={700}>{operator.userName}</Text>
                      <Text size="sm" c="dimmed">{operator.userEmail}</Text>
                      <Text size="xs" c="dimmed">Ativas agora: {operator.activeConversationCount}</Text>
                    </Box>
                    <Switch
                      checked={draft.isActive}
                      onChange={(event) => setOperatorDrafts((current) => ({
                        ...current,
                        [operator.userId]: {
                          ...draft,
                          isActive: event.currentTarget.checked,
                        },
                      }))}
                      label="Ativo"
                    />
                  </Group>

                  <Stack gap="xs">
                    <Text size="sm" fw={600}>Capacidade simultânea</Text>
                    <SegmentedControl
                      value={capacityPreset}
                      onChange={(value) => setOperatorDrafts((current) => ({
                        ...current,
                        [operator.userId]: {
                          ...draft,
                          maxActiveConversations: value === 'custom' ? draft.maxActiveConversations : Number(value),
                        },
                      }))}
                      data={[
                        { value: '1', label: '1' },
                        { value: '3', label: '3' },
                        { value: '5', label: '5' },
                        { value: 'custom', label: 'Personalizado' },
                      ]}
                    />
                    {capacityPreset === 'custom' ? (
                      <NumberInput
                        label="Capacidade personalizada"
                        min={1}
                        value={draft.maxActiveConversations}
                        onChange={(value) => setOperatorDrafts((current) => ({
                          ...current,
                          [operator.userId]: {
                            ...draft,
                            maxActiveConversations: Number(value || 1),
                          },
                        }))}
                      />
                    ) : null}
                  </Stack>

                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <NumberInput
                      label="Aviso de ociosidade"
                      description="Minutos sem resposta do paciente para avisar sobre encerramento"
                      min={1}
                      value={draft.idleTimeoutMinutes}
                      onChange={(value) => setOperatorDrafts((current) => ({
                        ...current,
                        [operator.userId]: {
                          ...draft,
                          idleTimeoutMinutes: Number(value || 25),
                        },
                      }))}
                    />
                    <NumberInput
                      label="Prazo para encerrar"
                      description="Minutos após o aviso para encerrar automaticamente"
                      min={1}
                      value={draft.closeWarningMinutes}
                      onChange={(value) => setOperatorDrafts((current) => ({
                        ...current,
                        [operator.userId]: {
                          ...draft,
                          closeWarningMinutes: Number(value || 5),
                        },
                      }))}
                    />
                  </SimpleGrid>

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
        onClose={() => setProtocolModalOpen(false)}
        title="Protocolo do atendimento"
        size="lg"
      >
        <Stack gap="sm">
          <Group grow>
            <Box>
              <Text size="xs" c="dimmed">Número</Text>
              <Text fw={700}>{currentConversation?.humanProtocolNumber || 'Não gerado'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Início</Text>
              <Text>{currentConversation?.humanProtocolStartedAt ? dayjs(currentConversation.humanProtocolStartedAt).format('DD/MM/YYYY HH:mm') : 'Não informado'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Fim</Text>
              <Text>{currentConversation?.humanProtocolClosedAt ? dayjs(currentConversation.humanProtocolClosedAt).format('DD/MM/YYYY HH:mm') : 'Em aberto'}</Text>
            </Box>
          </Group>
          <Divider />
          <ScrollArea h={360}>
            <Stack gap="xs">
              {currentMessages.map((message) => (
                <Paper key={message.id} withBorder radius="md" p="sm">
                  <Text size="xs" c="dimmed" mb={4}>
                    {dayjs(message.createdAt).format('DD/MM/YYYY HH:mm')} • {message.authorName || message.authorType}
                  </Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{message.message}</Text>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Modal>
    </Box>
  );
}
