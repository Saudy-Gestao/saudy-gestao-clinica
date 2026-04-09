import { useEffect, useMemo, useState } from 'react';
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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { MessageCircle, RefreshCcw, Send, Settings, UserCheck, XCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { queryKeys } from '../../lib/queryKeys';
import whatsappConversationService, {
  type HumanConversationFlow,
  type HumanConversationOperatorConfig,
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
  flowKeys: string[];
}>;

export function Conversations() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('QUEUED');
  const [search, setSearch] = useState('');
  const [flowKey, setFlowKey] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [closeMessage, setCloseMessage] = useState('');
  const [operatorsModalOpen, setOperatorsModalOpen] = useState(false);
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
            flowKeys: operator.flowKeys,
          };
        }
      }
      return next;
    });
  }, [operatorsQuery.data]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversations }),
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversationOperators }),
    ]);
  };

  const claimMutation = useMutation({
    mutationFn: (conversationId: string) => whatsappConversationService.claimConversation(conversationId),
    onSuccess: async () => {
      notifications.show({ title: 'Conversa assumida', message: 'Você assumiu o atendimento.', color: 'green' });
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
    mutationFn: ({ conversationId, message }: { conversationId: string; message?: string }) => whatsappConversationService.closeConversation(conversationId, message),
    onSuccess: async () => {
      setCloseMessage('');
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

  return (
    <Box p="md">
      <Header />
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Box>
            <Text fw={700} size="xl">Conversas</Text>
            <Text c="dimmed" size="sm">Atendimento humanizado do WhatsApp com fila por fluxo, histórico e encerramento.</Text>
          </Box>
          <Group gap="xs">
            <Button variant="light" leftSection={<Settings size={16} />} onClick={() => setOperatorsModalOpen(true)}>
              Operadores
            </Button>
            <ActionIcon variant="light" size="lg" onClick={() => refreshAll()}>
              <RefreshCcw size={16} />
            </ActionIcon>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
          <Paper withBorder p="md">
            <Stack gap="sm">
              <SegmentedControl
                value={status}
                onChange={setStatus}
                data={[
                  { value: 'QUEUED', label: 'Fila' },
                  { value: 'ASSIGNED', label: 'Em atendimento' },
                  { value: 'CLOSED', label: 'Encerradas' },
                ]}
              />
              <TextInput
                label="Buscar"
                placeholder="Paciente, telefone ou mensagem"
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
              <ScrollArea h={620}>
                <Stack gap="xs">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      withBorder
                      padding="sm"
                      style={{
                        cursor: 'pointer',
                        borderColor: selectedConversation?.id === item.id ? 'var(--mantine-color-blue-5)' : undefined,
                      }}
                      onClick={() => setSelectedConversationId(item.id)}
                    >
                      <Stack gap={6}>
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text fw={700}>{item.patientName || item.phone}</Text>
                            <Text size="xs" c="dimmed">{item.phone}</Text>
                          </Box>
                          <Badge color={STATUS_COLOR[item.humanStatus || 'CLOSED']} variant="light">
                            {STATUS_LABEL[item.humanStatus || 'CLOSED']}
                          </Badge>
                        </Group>
                        <Text size="sm" fw={600}>{item.humanFlowLabel || item.humanFlowKey || 'Sem fluxo'}</Text>
                        <Text size="sm" c="dimmed" lineClamp={2}>
                          {item.lastInboundMessage || item.lastOutboundMessage || 'Sem mensagens recentes'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {item.humanAssignedUserName ? `Atendente: ${item.humanAssignedUserName}` : 'Sem atendente'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Atualizado em {dayjs(item.updatedAt).format('DD/MM/YYYY HH:mm')}
                        </Text>
                      </Stack>
                    </Card>
                  ))}
                  {!items.length ? <Text c="dimmed" size="sm">Nenhuma conversa encontrada.</Text> : null}
                </Stack>
              </ScrollArea>
            </Stack>
          </Paper>

          <Paper withBorder p="md" style={{ gridColumn: 'span 2' }}>
            {!selectedConversation ? (
              <Stack align="center" justify="center" h={620}>
                <MessageCircle size={36} />
                <Text fw={600}>Selecione uma conversa</Text>
              </Stack>
            ) : (
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text fw={700} size="lg">{selectedConversation.patientName || 'Paciente sem identificação'}</Text>
                    <Text size="sm" c="dimmed">{selectedConversation.phone}</Text>
                    <Text size="sm" c="dimmed">{selectedConversation.humanFlowLabel || selectedConversation.humanFlowKey}</Text>
                  </Box>
                  <Group gap="xs">
                    {selectedConversation.humanStatus !== 'ASSIGNED' ? (
                      <Button
                        leftSection={<UserCheck size={14} />}
                        onClick={() => claimMutation.mutate(selectedConversation.id)}
                        loading={claimMutation.isPending}
                      >
                        Assumir
                      </Button>
                    ) : null}
                    {selectedConversation.humanStatus !== 'CLOSED' ? (
                      <Button
                        color="red"
                        variant="light"
                        leftSection={<XCircle size={14} />}
                        onClick={() => closeMutation.mutate({ conversationId: selectedConversation.id, message: closeMessage || undefined })}
                        loading={closeMutation.isPending}
                      >
                        Encerrar
                      </Button>
                    ) : null}
                  </Group>
                </Group>

                <ScrollArea h={420} offsetScrollbars>
                  <Stack gap="xs">
                    {(messagesQuery.data?.items || []).map((message) => (
                      <Paper
                        key={message.id}
                        p="sm"
                        withBorder
                        style={{
                          alignSelf: message.authorType === 'PATIENT' ? 'flex-start' : 'flex-end',
                          maxWidth: '80%',
                          background: message.authorType === 'PATIENT' ? 'white' : 'var(--mantine-color-blue-0)',
                        }}
                      >
                        <Text size="xs" c="dimmed" mb={4}>
                          {message.authorName || message.authorType} • {dayjs(message.createdAt).format('DD/MM HH:mm')}
                        </Text>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{message.message}</Text>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea>

                {selectedConversation.humanStatus !== 'CLOSED' ? (
                  <Stack gap="xs">
                    <Textarea
                      label="Responder ao paciente"
                      minRows={4}
                      placeholder="Digite a mensagem do atendimento humano"
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.currentTarget.value)}
                    />
                    <Textarea
                      label="Mensagem de encerramento"
                      minRows={2}
                      placeholder="Opcional. Se vazio, usamos a mensagem padrão de encerramento."
                      value={closeMessage}
                      onChange={(event) => setCloseMessage(event.currentTarget.value)}
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
                ) : (
                  <Badge color="gray" variant="light" w="fit-content">
                    Atendimento encerrado
                  </Badge>
                )}
              </Stack>
            )}
          </Paper>
        </SimpleGrid>
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
              flowKeys: operator.flowKeys,
            };

            return (
              <Paper key={operator.userId} withBorder p="md">
                <Stack gap="sm">
                  <Group justify="space-between">
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
                  <Group grow align="flex-end">
                    <NumberInput
                      label="Capacidade máxima"
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
                    <MultiSelect
                      label="Fluxos atendidos"
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
                    />
                  </Group>
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
    </Box>
  );
}
