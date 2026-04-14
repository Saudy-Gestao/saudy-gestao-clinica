import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Skeleton,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Menu,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, ClipboardCheck, Pencil, Plus, Power, Trash2, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import procedureNursingTemplateService, {
  type NursingQuestionPayload,
  type ProcedureNursingTemplateItem,
} from '../../services/procedureNursingTemplateService';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useNursingTemplatesQuery } from '../../hooks/useNursingTemplatesQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { PaginatedGrid } from '../common/PaginatedGrid';

type QuestionForm = NursingQuestionPayload & {
  id: string;
  optionsText: string;
};

type TemplateForm = {
  procedureId: string;
  name: string;
  description: string;
  isActive: boolean;
  collectHeight: boolean;
  collectWeight: boolean;
  collectBloodPressure: boolean;
  collectTemperature: boolean;
  collectHeartRate: boolean;
  collectOxygenSaturation: boolean;
  collectGlucose: boolean;
  collectPregnancyCheck: boolean;
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

const STANDARD_FIELDS = [
  { key: 'collectHeight', label: 'Altura' },
  { key: 'collectWeight', label: 'Peso' },
  { key: 'collectBloodPressure', label: 'Pressão arterial' },
  { key: 'collectTemperature', label: 'Temperatura' },
  { key: 'collectHeartRate', label: 'Frequência cardíaca' },
  { key: 'collectOxygenSaturation', label: 'Saturação' },
  { key: 'collectGlucose', label: 'Glicemia' },
  { key: 'collectPregnancyCheck', label: 'Checagem de gestação' },
] as const;

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
  collectHeight: false,
  collectWeight: false,
  collectBloodPressure: false,
  collectTemperature: false,
  collectHeartRate: false,
  collectOxygenSaturation: false,
  collectGlucose: false,
  collectPregnancyCheck: false,
  questions: [buildQuestion(0)],
};

const mapItemToForm = (item: ProcedureNursingTemplateItem): TemplateForm => ({
  procedureId: item.procedureId || '',
  name: item.name || '',
  description: item.description || '',
  isActive: Boolean(item.isActive),
  collectHeight: Boolean(item.collectHeight),
  collectWeight: Boolean(item.collectWeight),
  collectBloodPressure: Boolean(item.collectBloodPressure),
  collectTemperature: Boolean(item.collectTemperature),
  collectHeartRate: Boolean(item.collectHeartRate),
  collectOxygenSaturation: Boolean(item.collectOxygenSaturation),
  collectGlucose: Boolean(item.collectGlucose),
  collectPregnancyCheck: Boolean(item.collectPregnancyCheck),
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

export function CadastroEnfermagem() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

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
  } = useNursingTemplatesQuery();
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
        message: resolveApiErrorMessage(err, 'Erro ao carregar cadastro de enfermagem'),
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

  const openEdit = (item: ProcedureNursingTemplateItem) => {
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
        message: 'Informe o procedimento e o nome da triagem.',
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

    const choiceQuestionWithoutOptions = normalizedQuestions.find((question) =>
      shouldShowOptions(question.responseType) && question.options.length === 0,
    );

    if (choiceQuestionWithoutOptions) {
      showNotification({
        title: 'Opções obrigatórias',
        message: `A pergunta "${choiceQuestionWithoutOptions.label}" precisa ter pelo menos uma opção.`,
        color: 'yellow',
      });
      return;
    }

    const payload = {
      procedureId: form.procedureId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
      collectHeight: form.collectHeight,
      collectWeight: form.collectWeight,
      collectBloodPressure: form.collectBloodPressure,
      collectTemperature: form.collectTemperature,
      collectHeartRate: form.collectHeartRate,
      collectOxygenSaturation: form.collectOxygenSaturation,
      collectGlucose: form.collectGlucose,
      collectPregnancyCheck: form.collectPregnancyCheck,
      questions: normalizedQuestions,
    };

    try {
      setSaving(true);
      if (editingId) {
        await procedureNursingTemplateService.update(editingId, payload);
        showNotification({
          title: 'Triagem atualizada',
          message: 'As regras de enfermagem foram atualizadas com sucesso.',
          color: 'green',
        });
      } else {
        await procedureNursingTemplateService.create(payload);
        showNotification({
          title: 'Triagem cadastrada',
          message: 'A triagem de enfermagem foi criada com sucesso.',
          color: 'green',
        });
      }
      setModalOpen(false);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: queryKeys.nursingTemplates });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao salvar triagem'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await procedureNursingTemplateService.deactivate(id);
      showNotification({
        title: 'Triagem desativada',
        message: 'O template foi removido da operação.',
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.nursingTemplates });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao desativar triagem'),
        color: 'red',
      });
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">Cadastro de Enfermagem</Text>
              <Text size="sm" c="dimmed">Triagens e preparos por procedimento para exames.</Text>
            </Box>
          </Group>
          <Button bg={DARK_BLUE} leftSection={<Plus size={16} />} onClick={openCreate}>
            Nova triagem
          </Button>
        </Group>

        <Paper withBorder radius="lg" p="md" mb="lg">
          <FloatingInput
            label="Buscar triagens"
            placeholder="Buscar por procedimento, nome da triagem ou pergunta..."
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </Paper>

        <Paper withBorder radius="lg" p="md">
          {loading ? (
            <Stack gap="md">
              <Skeleton height={20} width="28%" radius="xl" />
              {(isMobile ? Array.from({ length: 3 }) : Array.from({ length: 5 })).map((_, index) => (
                <Paper key={index} withBorder radius="md" p="md">
                  <Stack gap="sm">
                    <Skeleton height={20} width={isMobile ? '70%' : '30%'} radius="xl" />
                    <Skeleton height={16} width={isMobile ? '45%' : '20%'} radius="xl" />
                    <Skeleton height={16} width={isMobile ? '55%' : '24%'} radius="xl" />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <>
              {!isMobile ? (
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
                  <Table highlightOnHover verticalSpacing="md">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Triagem</Table.Th>
                        <Table.Th>Procedimento</Table.Th>
                        <Table.Th>Campos padrão</Table.Th>
                        <Table.Th>Perguntas livres</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th style={{ textAlign: 'center', width: 96 }}>Ações</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredItems.length > 0 ? paginatedItems.map((item) => {
                        const standardCount = STANDARD_FIELDS.filter((field) => Boolean(item[field.key])).length;
                        return (
                          <Table.Tr key={item.id}>
                            <Table.Td>
                              <Text fw={700}>{item.name}</Text>
                              {item.description && (
                                <Text size="sm" c="dimmed" lineClamp={2}>{item.description}</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light" color="blue" radius="xl">
                                {item.procedure?.name || 'Sem procedimento'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={600}>{standardCount > 0 ? `${standardCount} habilitado(s)` : 'Nenhum'}</Text>
                              <Text size="sm" c="dimmed">
                                {standardCount > 0 ? 'Sinais vitais e checagens padrão ativos' : 'Nenhum campo padrão selecionado'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={600}>{item.questions?.length || 0}</Text>
                              <Text size="sm" c="dimmed">
                                {(item.questions?.length || 0) === 1 ? 'pergunta específica' : 'perguntas específicas'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={item.isActive ? 'green' : 'gray'} variant="light" radius="xl">
                                {item.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              <Group justify="center">
                                <Menu shadow="md" width={210} position="bottom" withArrow>
                                  <Menu.Target>
                                    <ActionIcon variant="light" size="sm" aria-label="Ações da triagem">
                                      <MoreVertical size={16} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item leftSection={<Pencil size={14} />} onClick={() => openEdit(item)}>
                                      Editar
                                    </Menu.Item>
                                    <Menu.Item leftSection={<Power size={14} />} color="red" onClick={() => handleDeactivate(item.id)}>
                                      Desativar
                                    </Menu.Item>
                                  </Menu.Dropdown>
                                </Menu>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      }) : (
                        <Table.Tr>
                          <Table.Td colSpan={6}>
                            <Stack align="center" py="xl" gap={6}>
                              <Text fw={600}>Nenhuma triagem cadastrada</Text>
                              <Text c="dimmed" size="sm">Cadastre uma triagem por procedimento para organizar o preparo dos exames.</Text>
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </PaginatedGrid>
              ) : (
                <Stack gap="sm">
                  {filteredItems.length > 0 ? filteredItems.map((item) => {
                    const standardCount = STANDARD_FIELDS.filter((field) => Boolean(item[field.key])).length;
                    return (
                      <Paper key={item.id} withBorder radius="md" p="md">
                        <Stack gap="sm">
                          <Group justify="space-between" align="flex-start">
                            <Box style={{ flex: 1 }}>
                              <Text fw={700}>{item.name}</Text>
                              <Text size="sm" c="dimmed">{item.procedure?.name || 'Sem procedimento'}</Text>
                            </Box>
                            <Badge color={item.isActive ? 'green' : 'gray'} variant="light" radius="xl">
                              {item.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </Group>
                          {item.description && (
                            <Text size="sm" c="dimmed" lineClamp={3}>{item.description}</Text>
                          )}
                          <Group gap="xs">
                            <Badge variant="light" color="blue" radius="xl">
                              {standardCount > 0 ? `${standardCount} campos padrão` : 'Sem padrão'}
                            </Badge>
                            <Badge variant="light" color="grape" radius="xl">
                              {item.questions?.length || 0} perguntas
                            </Badge>
                          </Group>
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon variant="light" color="blue" onClick={() => openEdit(item)}>
                              <Pencil size={16} />
                            </ActionIcon>
                            <ActionIcon variant="light" color="red" onClick={() => handleDeactivate(item.id)}>
                              <Power size={16} />
                            </ActionIcon>
                          </Group>
                        </Stack>
                      </Paper>
                    );
                  }) : (
                    <Paper withBorder radius="md" p="xl">
                      <Stack align="center" gap={6}>
                        <Text fw={600}>Nenhuma triagem cadastrada</Text>
                        <Text c="dimmed" size="sm" ta="center">
                          Cadastre uma triagem por procedimento para organizar o preparo dos exames.
                        </Text>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}
            </>
          )}
        </Paper>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingId ? 'Editar triagem' : 'Nova triagem'}
        size="xl"
        centered
        styles={{ body: { paddingTop: 28 } }}
      >
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <FloatingSelect
              label="Procedimento"
              placeholder="Selecione"
              data={procedures}
              searchable
              alwaysFloatLabel
              value={form.procedureId}
              onChange={(value) => setForm((prev) => ({ ...prev, procedureId: value || '' }))}
            />
            <FloatingInput
              label="Nome da triagem"
              placeholder="Ex.: Triagem de contraste"
              alwaysFloatLabel
              value={form.name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((prev) => ({ ...prev, name: value }));
              }}
            />
          </SimpleGrid>

          <FloatingTextarea
            label="Descrição"
            placeholder="Instruções gerais e contexto da triagem"
            minRows={2}
            value={form.description}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((prev) => ({ ...prev, description: value }));
            }}
          />

          <Paper withBorder radius="md" p="md">
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Box>
                  <Text fw={600}>Campos clínicos padrão</Text>
                  <Text size="sm" c="dimmed">Ative os sinais vitais e checagens que devem aparecer sempre nessa triagem.</Text>
                </Box>
                <Switch
                  label="Template ativo"
                  checked={form.isActive}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setForm((prev) => ({ ...prev, isActive: checked }));
                  }}
                />
              </Group>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
                {STANDARD_FIELDS.map((field) => (
                  <Checkbox
                    key={field.key}
                    label={field.label}
                    checked={Boolean(form[field.key])}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setForm((prev) => ({ ...prev, [field.key]: checked }));
                    }}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Paper>

          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Box>
                <Text fw={600}>Perguntas específicas do procedimento</Text>
                <Text size="sm" c="dimmed">Use para contraste, preparo, jejum, alergias específicas e qualquer orientação extra.</Text>
              </Box>
              <Button variant="light" leftSection={<Plus size={16} />} onClick={addQuestion}>
                Adicionar pergunta
              </Button>
            </Group>

            {form.questions.map((question, index) => (
              <Paper key={question.id} withBorder radius="md" p="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Badge variant="light" color="blue">Pergunta {index + 1}</Badge>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => removeQuestion(question.id)}
                      disabled={form.questions.length === 1}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <FloatingInput
                      label="Pergunta"
                      placeholder="Ex.: Vai realizar contraste?"
                      value={question.label}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        updateQuestion(question.id, { label: value });
                      }}
                    />
                    <FloatingSelect
                      label="Tipo de resposta"
                      data={RESPONSE_TYPE_OPTIONS}
                      value={question.responseType}
                      onChange={(value) => updateQuestion(question.id, { responseType: value || 'TEXT' })}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <FloatingInput
                      label="Ajuda"
                      placeholder="Texto complementar"
                      value={question.helpText || ''}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        updateQuestion(question.id, { helpText: value });
                      }}
                    />
                    <FloatingInput
                      label="Placeholder"
                      placeholder="Ex.: Informe o medicamento"
                      value={question.placeholder || ''}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        updateQuestion(question.id, { placeholder: value });
                      }}
                    />
                  </SimpleGrid>

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
                      placeholder="Uma opção por linha"
                      minRows={3}
                      value={question.optionsText}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        updateQuestion(question.id, { optionsText: value });
                      }}
                    />
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Group justify="space-between">
            <Button variant="default" onClick={() => {
              setModalOpen(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} leftSection={<ClipboardCheck size={16} />} onClick={handleSave} loading={saving}>
              {editingId ? 'Salvar alterações' : 'Cadastrar triagem'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
