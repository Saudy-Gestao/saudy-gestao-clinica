import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Skeleton,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  useMantineColorScheme,
  Menu,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, ClipboardPenLine, Pencil, Plus, Power, Trash2, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';
import procedureAnamnesisTemplateService, {
  type AnamnesisQuestionPayload,
  type ProcedureAnamnesisTemplateItem,
} from '../../services/procedureAnamnesisTemplateService';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useAnamnesisTemplatesQuery } from '../../hooks/useAnamnesisTemplatesQuery';
import { queryKeys } from '../../lib/queryKeys';
import { PaginatedGrid } from '../common/PaginatedGrid';

type QuestionForm = AnamnesisQuestionPayload & {
  id: string;
  optionsText: string;
};

type TemplateForm = {
  procedureId: string;
  name: string;
  description: string;
  isActive: boolean;
  questions: QuestionForm[];
};

const RESPONSE_TYPE_OPTIONS = [
  { value: 'TEXT', label: 'Texto curto' },
  { value: 'TEXTAREA', label: 'Texto longo' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'DATE', label: 'Data' },
  { value: 'TIME', label: 'Hora' },
  { value: 'DATETIME', label: 'Data e hora' },
  { value: 'BOOLEAN', label: 'Sim / Não' },
  { value: 'SINGLE_CHOICE', label: 'Escolha única' },
  { value: 'MULTIPLE_CHOICE', label: 'Múltipla escolha' },
];

const buildQuestion = (index: number): QuestionForm => ({
  id: `question-${Date.now()}-${index}`,
  label: '',
  helpText: '',
  responseType: 'TEXT',
  placeholder: '',
  isRequired: false,
  orderIndex: index,
  options: [],
  optionsText: '',
});

const INITIAL_FORM: TemplateForm = {
  procedureId: '',
  name: '',
  description: '',
  isActive: true,
  questions: [buildQuestion(0)],
};

const responseTypeLabel = (value?: string) => (
  RESPONSE_TYPE_OPTIONS.find((item) => item.value === value)?.label || value || 'Não informado'
);

const mapItemToForm = (item: ProcedureAnamnesisTemplateItem): TemplateForm => ({
  procedureId: item.procedureId || '',
  name: item.name || '',
  description: item.description || '',
  isActive: Boolean(item.isActive),
  questions: (item.questions || []).length > 0
    ? item.questions.map((question, index) => ({
        id: question.id || `question-${index}`,
        label: question.label || '',
        helpText: question.helpText || '',
        responseType: question.responseType || 'TEXT',
        placeholder: question.placeholder || '',
        isRequired: Boolean(question.isRequired),
        orderIndex: Number(question.orderIndex ?? index),
        options: question.options?.map((option, optionIndex) => ({
          label: option.label,
          value: option.value,
          orderIndex: Number(option.orderIndex ?? optionIndex),
        })) || [],
        optionsText: (question.options || []).map((option) => option.label).join('\n'),
      }))
    : [buildQuestion(0)],
});

const shouldShowOptions = (responseType?: string) => (
  responseType === 'SINGLE_CHOICE' || responseType === 'MULTIPLE_CHOICE'
);

export function CadastroAnamnese() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const { colorScheme } = useMantineColorScheme();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(INITIAL_FORM);
  const {
    data: items = [],
    isLoading: loading,
    error: templatesError,
  } = useAnamnesisTemplatesQuery();
  const {
    data: proceduresData = [],
    error: proceduresError,
  } = useProceduresAdminQuery();

  const procedures = useMemo(() => (
    proceduresData.map((procedure: any) => ({
      value: String(procedure.id),
      label: String(procedure.name || 'Procedimento sem nome'),
    }))
  ), [proceduresData]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      return [
        item.name,
        item.description,
        item.procedure?.name,
        ...(item.questions || []).map((question) => question.label),
      ].some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [items, query]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / pageSize)),
    [filteredItems.length, pageSize],
  );

  useEffect(() => {
    const err: any = templatesError || proceduresError;
    if (err) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao carregar cadastro de anamnese'),
        color: 'red',
      });
    }
  }, [templatesError, proceduresError]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, items.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: ProcedureAnamnesisTemplateItem) => {
    setForm(mapItemToForm(item));
    setEditingId(item.id);
    setModalOpen(true);
  };

  const updateQuestion = (questionId: string, patch: Partial<QuestionForm>) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question) => (
        question.id === questionId
          ? { ...question, ...patch }
          : question
      )),
    }));
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, buildQuestion(prev.questions.length)],
    }));
  };

  const removeQuestion = (questionId: string) => {
    setForm((prev) => {
      if (prev.questions.length === 1) return prev;
      return {
        ...prev,
        questions: prev.questions
          .filter((question) => question.id !== questionId)
          .map((question, index) => ({ ...question, orderIndex: index })),
      };
    });
  };

  const handleSave = async () => {
    if (!form.procedureId || !form.name.trim()) {
      showNotification({
        title: 'Campos obrigatórios',
        message: 'Informe o procedimento e o nome da anamnese.',
        color: 'yellow',
      });
      return;
    }

    const normalizedQuestions = form.questions
      .map((question, index) => {
        const responseType = String(question.responseType || 'TEXT').trim().toUpperCase();
        const options = shouldShowOptions(responseType)
          ? question.optionsText
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((label, optionIndex) => ({
                label,
                value: label,
                orderIndex: optionIndex,
              }))
          : [];

        return {
          label: question.label.trim(),
          helpText: question.helpText?.trim() || null,
          responseType,
          placeholder: question.placeholder?.trim() || null,
          isRequired: Boolean(question.isRequired),
          orderIndex: index,
          options,
        };
      })
      .filter((question) => question.label);

    if (normalizedQuestions.length === 0) {
      showNotification({
        title: 'Perguntas obrigatórias',
        message: 'Cadastre pelo menos uma pergunta válida na anamnese.',
        color: 'yellow',
      });
      return;
    }

    const choiceQuestionWithoutOptions = normalizedQuestions.find((question) =>
      shouldShowOptions(question.responseType) && question.options.length === 0);
    if (choiceQuestionWithoutOptions) {
      showNotification({
        title: 'Opções obrigatórias',
        message: `A pergunta "${choiceQuestionWithoutOptions.label}" precisa ter opções cadastradas.`,
        color: 'yellow',
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        procedureId: form.procedureId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        isActive: form.isActive,
        questions: normalizedQuestions,
      };

      if (editingId) {
        await procedureAnamnesisTemplateService.update(editingId, payload);
      } else {
        await procedureAnamnesisTemplateService.create(payload);
      }

      showNotification({
        title: editingId ? 'Anamnese atualizada' : 'Anamnese cadastrada',
        message: editingId
          ? 'As perguntas da anamnese foram atualizadas com sucesso.'
          : 'A anamnese foi cadastrada com sucesso.',
        color: 'green',
      });

      setModalOpen(false);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: queryKeys.anamnesisTemplates });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Não foi possível salvar a anamnese'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await procedureAnamnesisTemplateService.deactivate(id);
      showNotification({
        title: 'Anamnese desativada',
        message: 'O template foi desativado com sucesso.',
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.anamnesisTemplates });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Não foi possível desativar a anamnese'),
        color: 'red',
      });
    }
  };

  return (
    <Box>
      <Header />
      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group justify="space-between" align="center" mb={isMobile ? 20 : 30}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')} aria-label="Voltar">
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">Cadastro de Anamnese</Text>
              <Text size="sm" c="dimmed">Perguntas estruturadas por procedimento</Text>
            </Box>
          </Group>

          <Button leftSection={<Plus size={18} />} bg={DARK_BLUE} onClick={openCreate}>
            Nova anamnese
          </Button>
        </Group>

        <Paper
          p="lg"
          radius="lg"
          withBorder
          style={colorScheme === 'dark' ? {
            backgroundColor: 'transparent',
            borderColor: 'var(--mantine-color-default-border)',
          } : undefined}
        >
          <Stack gap="md">
            <FloatingInput
              label="Buscar anamneses"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Nome da anamnese, procedimento ou pergunta..."
            />

            {loading ? (
              <Stack gap="sm">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Paper key={idx} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={8} style={{ flex: 1 }}>
                        <Skeleton height={18} width="48%" radius="sm" />
                        <Skeleton height={14} width="36%" radius="sm" />
                        <Skeleton height={14} width="62%" radius="sm" />
                      </Stack>
                      <Stack gap={8} align="flex-end">
                        <Skeleton height={24} width={76} radius="xl" />
                        <Group gap={8}>
                          <Skeleton height={28} width={28} radius="xl" />
                          <Skeleton height={28} width={28} radius="xl" />
                        </Group>
                      </Stack>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : filteredItems.length === 0 ? (
              <Paper withBorder p="xl" ta="center">
                <Text fw={600}>Nenhuma anamnese cadastrada</Text>
                <Text c="dimmed" size="sm" mt="xs">
                  Cadastre perguntas por procedimento para usar no fluxo clínico.
                </Text>
              </Paper>
            ) : (
              <>
                <Box visibleFrom="sm">
                  <PaginatedGrid
                    totalItems={filteredItems.length}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    isMobile={isMobile}
                    maxHeight={isMobile ? 500 : 620}
                    showFooter
                  >
                    <Box style={{ minWidth: 920 }}>
                      <Table highlightOnHover verticalSpacing="md">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Anamnese</Table.Th>
                            <Table.Th>Procedimento</Table.Th>
                            <Table.Th>Perguntas</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th style={{ textAlign: 'center', width: 96 }}>Ações</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {paginatedItems.map((item) => (
                            <Table.Tr key={item.id}>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text fw={700}>{item.name}</Text>
                                  <Text size="sm" c="dimmed">{item.description || 'Sem descrição'}</Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="light" color="blue">
                                  {item.procedure?.name || 'Procedimento não informado'}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={4}>
                                  <Text fw={600}>{item.questions.length} pergunta(s)</Text>
                                  <Text size="sm" c="dimmed">
                                    {(item.questions || []).slice(0, 2).map((question) => question.label).join(' • ') || 'Sem perguntas'}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Badge color={item.isActive ? 'green' : 'gray'} variant="light">
                                  {item.isActive ? 'Ativa' : 'Inativa'}
                                </Badge>
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center' }}>
                                <Group justify="center">
                                  <Menu shadow="md" width={210} position="bottom" withArrow>
                                    <Menu.Target>
                                      <ActionIcon variant="light" size="sm" aria-label="Ações da anamnese">
                                        <MoreVertical size={16} />
                                      </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                      <Menu.Item leftSection={<Pencil size={14} />} onClick={() => openEdit(item)}>
                                        Editar
                                      </Menu.Item>
                                      <Menu.Item
                                        leftSection={<Power size={14} />}
                                        color={item.isActive ? 'red' : 'gray'}
                                        onClick={() => handleDeactivate(item.id)}
                                      >
                                        Desativar
                                      </Menu.Item>
                                    </Menu.Dropdown>
                                  </Menu>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  </PaginatedGrid>
                </Box>
                <Stack hiddenFrom="sm" gap="sm">
                  {filteredItems.map((item) => (
                    <Paper key={item.id} withBorder radius="md" p="md">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Text fw={700}>{item.name}</Text>
                          <Text size="sm" c="dimmed">{item.procedure?.name || 'Procedimento não informado'}</Text>
                          <Text size="sm" c="dimmed">{item.questions.length} pergunta(s)</Text>
                          {item.description ? <Text size="sm" c="dimmed" lineClamp={2}>{item.description}</Text> : null}
                        </Stack>
                        <Badge color={item.isActive ? 'green' : 'gray'} variant="light">
                          {item.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </Group>
                      <Group gap="xs" mt="md">
                        <ActionIcon variant="light" color="blue" onClick={() => openEdit(item)} aria-label="Editar anamnese">
                          <Pencil size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color={item.isActive ? 'red' : 'gray'} onClick={() => handleDeactivate(item.id)} aria-label="Desativar anamnese">
                          <Power size={16} />
                        </ActionIcon>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingId ? 'Editar anamnese' : 'Nova anamnese'}
        centered
        size="xl"
        styles={{
          body: {
            paddingTop: 28,
          },
        }}
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <FloatingSelect
              label="Procedimento"
              data={procedures}
              value={form.procedureId}
              onChange={(value) => setForm((prev) => ({ ...prev, procedureId: value || '' }))}
              searchable
              required
              alwaysFloatLabel
            />
            <FloatingInput
              label="Nome da anamnese"
              placeholder="Ex.: Anamnese de ultrassom abdominal"
              value={form.name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((prev) => ({ ...prev, name: value }));
              }}
              required
              alwaysFloatLabel
            />
          </SimpleGrid>

          <FloatingTextarea
            label="Descrição"
            placeholder="Contexto, observações ou instruções de uso da anamnese"
            value={form.description}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((prev) => ({ ...prev, description: value }));
            }}
            minRows={2}
          />

          <Switch
            label="Anamnese ativa"
            checked={form.isActive}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setForm((prev) => ({ ...prev, isActive: checked }));
            }}
          />

          <Group justify="space-between" align="center" mt="sm">
            <Group gap="xs">
              <ClipboardPenLine size={18} />
              <Text fw={700}>Perguntas</Text>
            </Group>
            <Button variant="light" leftSection={<Plus size={16} />} onClick={addQuestion}>
              Adicionar pergunta
            </Button>
          </Group>

          <Stack gap="md">
            {form.questions.map((question, index) => (
              <Paper key={question.id} p="md" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={700}>Pergunta {index + 1}</Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => removeQuestion(question.id)}
                      aria-label="Remover pergunta"
                      disabled={form.questions.length === 1}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>

                  <FloatingInput
                    label="Pergunta"
                    placeholder="Digite a pergunta"
                    value={question.label}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      updateQuestion(question.id, { label: value });
                    }}
                    required
                  />

                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <FloatingSelect
                      label="Tipo de resposta"
                      data={RESPONSE_TYPE_OPTIONS}
                      value={question.responseType}
                      onChange={(value) => updateQuestion(question.id, {
                        responseType: value || 'TEXT',
                        optionsText: shouldShowOptions(value || 'TEXT') ? question.optionsText : '',
                      })}
                    />
                    <FloatingInput
                      label="Placeholder"
                      placeholder="Texto de apoio da resposta"
                      value={question.placeholder || ''}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        updateQuestion(question.id, { placeholder: value });
                      }}
                    />
                  </SimpleGrid>

                  <FloatingTextarea
                    label="Texto de ajuda"
                    placeholder="Orientação adicional para quem vai responder"
                    value={question.helpText || ''}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      updateQuestion(question.id, { helpText: value });
                    }}
                    minRows={2}
                  />

                  <Switch
                    label="Pergunta obrigatória"
                    checked={Boolean(question.isRequired)}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      updateQuestion(question.id, { isRequired: checked });
                    }}
                  />

                  {shouldShowOptions(question.responseType) && (
                    <FloatingTextarea
                      label="Opções"
                      description="Uma opção por linha"
                      placeholder={'Sim\nNão\nNão sei informar'}
                      value={question.optionsText}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        updateQuestion(question.id, { optionsText: value });
                      }}
                      minRows={3}
                    />
                  )}

                  <Badge variant="light" color="blue" w="fit-content">
                    {responseTypeLabel(question.responseType)}
                  </Badge>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Group justify="space-between" mt="md">
            <Button variant="default" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} onClick={handleSave} loading={saving}>
              {editingId ? 'Salvar alterações' : 'Cadastrar anamnese'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default CadastroAnamnese;
