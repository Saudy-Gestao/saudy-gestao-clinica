import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Table,
  Modal,
  Stack,
  ActionIcon,
  Switch,
  Badge,
  Paper,
  Skeleton,
  Menu,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Plus, Pencil, Trash2, MoreVertical, History } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { PaginatedGrid } from '../common/PaginatedGrid';
import especialidadeService, { type Especialidade, type EspecialidadeAuditLogEntry } from '../../services/especialidadeService';
import { useEspecialidadesAdminQuery } from '../../hooks/useEspecialidadesAdminQuery';
import { useModalidadesAdminQuery } from '../../hooks/useModalidadesAdminQuery';
import { useCbosQuery } from '../../hooks/useCbosQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criada',
  UPDATE: 'Editada',
  DELETE: 'Excluída',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function TagInput({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
  error,
}: {
  label: string;
  placeholder?: string;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  error?: string;
}) {
  const [input, setInput] = useState('');

  const commit = () => {
    const value = input.trim();
    if (!value) return;
    onAdd(value);
    setInput('');
  };

  return (
    <Box>
      <FloatingInput
        label={label}
        placeholder={placeholder}
        value={input}
        error={error}
        onChange={(e) => {
          const value = e?.currentTarget?.value ?? '';
          setInput(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
      {tags.length > 0 ? (
        <Group mt={6} gap="xs">
          {tags.map((tag) => (
            <Button
              key={tag}
              size="compact-xs"
              variant="light"
              color="blue"
              onClick={() => onRemove(tag)}
            >
              {tag} ×
            </Button>
          ))}
        </Group>
      ) : null}
    </Box>
  );
}

export function CadastroEspecialidades() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Especialidade[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const especialidadesQuery = useEspecialidadesAdminQuery();
  const modalidadesQuery = useModalidadesAdminQuery();
  const cbosQuery = useCbosQuery();

  const modalidadeOptions = useMemo(() => {
    const data: any = modalidadesQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return list
      .filter((m: any) => m?.id && m.isActive)
      .map((m: any) => ({ value: m.id, label: m.name }));
  }, [modalidadesQuery.data]);

  const cboOptions = useMemo(() => {
    const data: any = cbosQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return list
      .filter((c: any) => c?.id)
      .map((c: any) => ({ value: c.id, label: `${c.code} — ${c.title}` }));
  }, [cbosQuery.data]);

  const modalidadeIdsWithEspecialidade = useMemo(
    () => new Set(items.filter((it) => it.isActive).map((it) => it.modalidadeId)),
    [items],
  );

  const createModalidadeOptions = useMemo(
    () => modalidadeOptions.filter((opt) => !modalidadeIdsWithEspecialidade.has(opt.value)),
    [modalidadeOptions, modalidadeIdsWithEspecialidade],
  );

  // Modal criar (item único)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createModalidadeId, setCreateModalidadeId] = useState<string | null>(null);
  const [modalidadeError, setModalidadeError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createNameError, setCreateNameError] = useState<string | null>(null);
  const [pendingMetodos, setPendingMetodos] = useState<string[]>([]);
  const [createCboId, setCreateCboId] = useState<string | null>(null);
  const [createSimilarWarning, setCreateSimilarWarning] = useState<{ id: string; name: string }[] | null>(null);

  // Modal editar (item único)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<Especialidade | null>(null);
  const [editForm, setEditForm] = useState({ name: '', metodos: [] as string[], cboId: null as string | null, isActive: true });
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [editSimilarWarning, setEditSimilarWarning] = useState<{ id: string; name: string }[] | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Especialidade | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Especialidade | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<EspecialidadeAuditLogEntry[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (
      it.name.toLowerCase().includes(q) ||
      (it.modalidade?.name || '').toLowerCase().includes(q)
    ));
  }, [items, query]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, items.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setItemsLoading(especialidadesQuery.isLoading && items.length === 0);
  }, [especialidadesQuery.isLoading, items.length]);

  useEffect(() => {
    if (especialidadesQuery.error) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(especialidadesQuery.error, 'Erro ao carregar especialidades'),
        color: 'red',
      });
    }
  }, [especialidadesQuery.error]);

  useEffect(() => {
    const data: any = especialidadesQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    setItems(list.filter((it: any) => it?.id));
  }, [especialidadesQuery.data]);

  const resetCreateState = () => {
    setCreateModalidadeId(null);
    setModalidadeError(null);
    setCreateName('');
    setCreateNameError(null);
    setPendingMetodos([]);
    setCreateCboId(null);
    setCreateSimilarWarning(null);
  };

  const openCreateModal = () => {
    resetCreateState();
    setCreateModalOpen(true);
  };

  const openEditModal = (item: Especialidade) => {
    setEditingItem(item);
    setEditForm({ name: item.name, metodos: [...item.metodos], cboId: item.cboId || null, isActive: item.isActive });
    setEditNameError(null);
    setEditSimilarWarning(null);
    setEditModalOpen(true);
  };

  const runCreate = async (force: boolean) => {
    if (!createModalidadeId) {
      setModalidadeError('Selecione uma modalidade');
      return;
    }
    const name = createName.trim();
    if (!name) {
      setCreateNameError('Nome é obrigatório');
      return;
    }
    setModalidadeError(null);
    setCreateNameError(null);
    setCreateSimilarWarning(null);
    setCreating(true);

    try {
      await especialidadeService.createEspecialidade({
        modalidadeId: createModalidadeId,
        name,
        metodos: pendingMetodos,
        cboId: createCboId,
        force,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.especialidadesAdmin });
      showNotification({ title: 'Cadastrado', message: 'Especialidade cadastrada com sucesso', color: 'green' });
      setCreateModalOpen(false);
      resetCreateState();
    } catch (err: any) {
      const errorCode = err?.response?.data?.error;
      if (errorCode === 'DUPLICATE_EXACT') {
        setCreateNameError('Já existe uma especialidade com esse nome nessa modalidade');
      } else if (errorCode === 'SIMILAR_EXISTS') {
        setCreateSimilarWarning(err.response.data.similar || []);
      } else if (errorCode === 'MODALIDADE_ALREADY_HAS_ESPECIALIDADE') {
        setModalidadeError('Essa modalidade já tem uma especialidade cadastrada');
      } else {
        showNotification({
          title: 'Erro',
          message: resolveApiErrorMessage(err, 'Erro ao cadastrar especialidade'),
          color: 'red',
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSubmit = () => runCreate(false);
  const handleForceSimilar = () => runCreate(true);

  const submitEdit = async (force: boolean) => {
    if (!editingItem) return;
    const name = editForm.name.trim();
    if (!name) {
      setEditNameError('Nome é obrigatório');
      return;
    }
    setEditNameError(null);
    setEditSimilarWarning(null);
    setSaving(true);

    try {
      await especialidadeService.updateEspecialidade(editingItem.id, {
        name,
        metodos: editForm.metodos,
        cboId: editForm.cboId,
        isActive: editForm.isActive,
        force,
      });
      showNotification({ title: 'Atualizada', message: 'Especialidade atualizada com sucesso', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.especialidadesAdmin });
      setEditModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      const errorCode = err?.response?.data?.error;
      if (errorCode === 'DUPLICATE_EXACT') {
        setEditNameError('Já existe uma especialidade com esse nome nessa modalidade');
      } else if (errorCode === 'SIMILAR_EXISTS') {
        setEditSimilarWarning(err.response.data.similar || []);
      } else {
        showNotification({
          title: 'Erro',
          message: resolveApiErrorMessage(err, 'Erro ao salvar especialidade'),
          color: 'red',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Especialidade) => {
    setDeleting(true);
    try {
      await especialidadeService.deleteEspecialidade(item.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.especialidadesAdmin });
      showNotification({ title: 'Excluída', message: 'Especialidade excluída com sucesso', color: 'green' });
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao excluir especialidade'),
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const openHistoryModal = async (item: Especialidade) => {
    setHistoryTarget(item);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const data: any = await especialidadeService.getEspecialidadeAuditLog(item.id);
      const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setHistoryEntries(list);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao carregar histórico'),
        color: 'red',
      });
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderStatusBadge = (item: Especialidade) => (
    <Badge color={item.isActive ? 'green' : 'red'} variant="light" size="sm">
      {item.isActive ? 'Ativo' : 'Inativo'}
    </Badge>
  );

  const renderCbo = (item: Especialidade) => (
    item.cbo ? (
      <Text size="xs" c="dimmed">{item.cbo.code} — {item.cbo.title}</Text>
    ) : (
      <Text size="xs" c="dimmed">—</Text>
    )
  );

  const renderMetodos = (item: Especialidade) => (
    item.metodos.length === 0 ? (
      <Text size="xs" c="dimmed">—</Text>
    ) : (
      <Group gap={4}>
        {item.metodos.map((m) => (
          <Badge key={m} variant="outline" color="gray" size="xs">{m}</Badge>
        ))}
      </Group>
    )
  );

  const renderAuditInfo = (item: Especialidade) => {
    const name = item.updatedByName || item.createdByName;
    const date = formatDateTime(item.updatedAt || item.createdAt);
    if (!name) return <Text size="xs" c="dimmed">—</Text>;
    return (
      <Text size="xs" c="dimmed">
        {name}{date ? ` · ${date}` : ''}
      </Text>
    );
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Especialidades
              </Text>
              <Text size="sm" c="dimmed">
                Especialidades e métodos por modalidade
              </Text>
            </Box>
          </Group>

          <Button bg={DARK_BLUE} c="white" leftSection={<Plus size={16} />} onClick={openCreateModal} size={isMobile ? 'sm' : 'md'}>
            Nova especialidade
          </Button>
        </Group>

        <Box mb={isMobile ? 20 : 30}>
          <FloatingInput
            label="Buscar especialidades"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={isMobile ? 'Buscar...' : 'Buscar especialidade por nome ou modalidade...'}
          />
        </Box>

        {itemsLoading ? (
          isMobile ? (
            <Stack gap="sm">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Paper key={idx} withBorder radius="md" p="md">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={8} style={{ flex: 1 }}>
                      <Skeleton height={18} width="56%" radius="sm" />
                      <Skeleton height={14} width="28%" radius="sm" />
                    </Stack>
                    <Skeleton height={24} width={76} radius="xl" />
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
              <Table horizontalSpacing="md" verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nome</Table.Th>
                    <Table.Th>Modalidade</Table.Th>
                    <Table.Th>Métodos</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td><Skeleton height={16} width="70%" radius="sm" /></Table.Td>
                      <Table.Td><Skeleton height={16} width="50%" radius="sm" /></Table.Td>
                      <Table.Td><Skeleton height={16} width="40%" radius="sm" /></Table.Td>
                      <Table.Td><Skeleton height={24} width={78} radius="xl" /></Table.Td>
                      <Table.Td><Skeleton height={28} width={28} radius="xl" /></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          )
        ) : (
          isMobile ? (
            filtered.length === 0 ? (
              <Paper withBorder radius="md" p="xl">
                <Text size="sm" c="dimmed" ta="center">
                  Nenhuma especialidade encontrada. Ajuste a busca ou cadastre uma nova especialidade.
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm">
                {filtered.map((it) => (
                  <Paper key={it.id} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={600} size="sm">{it.name}</Text>
                        <Text size="xs" c="dimmed">{it.modalidade?.name || '—'}</Text>
                        {renderMetodos(it)}
                        {renderCbo(it)}
                        {renderAuditInfo(it)}
                      </Stack>
                      {renderStatusBadge(it)}
                    </Group>
                    <Group gap={8} mt="md" wrap="nowrap">
                      <ActionIcon variant="light" color="blue" onClick={() => openEditModal(it)}>
                        <Pencil size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="gray" onClick={() => openHistoryModal(it)}>
                        <History size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => {
                          setDeleteTarget(it);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )
          ) : (
            <PaginatedGrid
              totalItems={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              isMobile={isMobile}
              maxHeight={620}
              showFooter
            >
              <Table horizontalSpacing="md" verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: 'none' }}>
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Modalidade</Table.Th>
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Métodos</Table.Th>}
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>CBO</Table.Th>}
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Última alteração</Table.Th>}
                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500, textAlign: 'center', width: 96 }}>
                      Ações
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={isTablet ? 4 : 7}>
                        <Text size="sm" c="dimmed" ta="center">
                          Nenhuma especialidade encontrada. Ajuste a busca ou cadastre uma nova especialidade.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedItems.map((it) => (
                      <Table.Tr key={it.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <Table.Td>
                          <Text fw={600} size="sm">{it.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{it.modalidade?.name || '—'}</Text>
                        </Table.Td>
                        {!isTablet && <Table.Td>{renderMetodos(it)}</Table.Td>}
                        {!isTablet && <Table.Td>{renderCbo(it)}</Table.Td>}
                        <Table.Td>{renderStatusBadge(it)}</Table.Td>
                        {!isTablet && <Table.Td>{renderAuditInfo(it)}</Table.Td>}
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group justify="center">
                            <Menu shadow="md" width={200} position="bottom" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações da especialidade">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<Pencil size={14} />} onClick={() => openEditModal(it)}>
                                  Editar
                                </Menu.Item>
                                <Menu.Item leftSection={<History size={14} />} onClick={() => openHistoryModal(it)}>
                                  Ver histórico
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<Trash2 size={14} />}
                                  color="red"
                                  onClick={() => {
                                    setDeleteTarget(it);
                                    setDeleteModalOpen(true);
                                  }}
                                >
                                  Excluir
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </PaginatedGrid>
          )
        )}
      </Box>

      {/* Modal criar (item único) */}
      <Modal
        opened={createModalOpen}
        onClose={() => { if (!creating) setCreateModalOpen(false); }}
        title="Cadastrar especialidade"
        size={isMobile ? '100%' : 520}
        centered
        fullScreen={isMobile}
      >
        <Stack gap={10}>
          <FloatingSelect
            label="Modalidade"
            required
            placeholder="Selecione a modalidade"
            data={createModalidadeOptions}
            value={createModalidadeId}
            error={modalidadeError || undefined}
            searchable
            nothingFoundMessage="Todas as modalidades já têm uma especialidade cadastrada"
            onChange={(value) => {
              setCreateModalidadeId(value);
              setModalidadeError(null);
            }}
          />

          <FloatingInput
            label="Nome da especialidade"
            required
            value={createName}
            error={createNameError || undefined}
            onChange={(e) => {
              const value = e?.currentTarget?.value ?? '';
              setCreateName(value);
              setCreateNameError(null);
              setCreateSimilarWarning(null);
            }}
          />

          <TagInput
            label="Métodos"
            placeholder="Ex: Com contraste (opcional, digite e pressione Enter)"
            tags={pendingMetodos}
            onAdd={(value) => setPendingMetodos((prev) => (prev.includes(value) ? prev : [...prev, value]))}
            onRemove={(value) => setPendingMetodos((prev) => prev.filter((m) => m !== value))}
          />

          <FloatingSelect
            label="CBO"
            placeholder="Selecione o CBO (opcional)"
            data={cboOptions}
            value={createCboId}
            searchable
            clearable
            nothingFoundMessage="Nenhum CBO encontrado"
            onChange={(value) => setCreateCboId(value)}
          />

          {createSimilarWarning && createSimilarWarning.length > 0 ? (
            <Paper withBorder p="sm" radius="md" style={{ borderColor: 'var(--mantine-color-yellow-6)' }}>
              <Text size="sm" fw={600} mb={4}>Especialidade parecida encontrada</Text>
              <Text size="sm" c="dimmed" mb="sm">
                {`Já existe: ${createSimilarWarning.map((s) => `"${s.name}"`).join(', ')}. Deseja cadastrar mesmo assim?`}
              </Text>
              <Group justify="flex-end">
                <Button variant="default" size="xs" onClick={() => setCreateSimilarWarning(null)}>
                  Revisar nome
                </Button>
                <Button color="yellow" size="xs" onClick={handleForceSimilar} loading={creating}>
                  Cadastrar mesmo assim
                </Button>
              </Group>
            </Paper>
          ) : null}

          <Group justify="flex-end" mt={8}>
            <Button variant="default" onClick={() => setCreateModalOpen(false)} size="sm" disabled={creating}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} onClick={handleCreateSubmit} size="sm" loading={creating} disabled={creating}>
              Cadastrar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal editar (item único) */}
      <Modal
        opened={editModalOpen}
        onClose={() => { if (!saving) setEditModalOpen(false); }}
        title="Editar especialidade"
        size={isMobile ? '100%' : 480}
        centered
        fullScreen={isMobile}
      >
        <Stack gap={10}>
          <FloatingInput
            label="Modalidade"
            value={editingItem?.modalidade?.name || ''}
            disabled
            containerProps={{ opacity: 0.7 }}
          />

          <FloatingInput
            label="Nome da especialidade"
            required
            value={editForm.name}
            error={editNameError || undefined}
            onChange={(e) => {
              const value = e?.currentTarget?.value ?? '';
              setEditForm((prev) => ({ ...prev, name: value }));
              setEditNameError(null);
              setEditSimilarWarning(null);
            }}
          />

          <TagInput
            label="Métodos"
            placeholder="Ex: Com contraste"
            tags={editForm.metodos}
            onAdd={(value) => setEditForm((prev) => (prev.metodos.includes(value) ? prev : { ...prev, metodos: [...prev.metodos, value] }))}
            onRemove={(value) => setEditForm((prev) => ({ ...prev, metodos: prev.metodos.filter((m) => m !== value) }))}
          />

          <FloatingSelect
            label="CBO"
            placeholder="Selecione o CBO (opcional)"
            data={cboOptions}
            value={editForm.cboId}
            searchable
            clearable
            nothingFoundMessage="Nenhum CBO encontrado"
            onChange={(value) => setEditForm((prev) => ({ ...prev, cboId: value }))}
          />

          <Switch
            label="Especialidade ativa"
            checked={editForm.isActive}
            onChange={(e) => {
              const checked = e?.currentTarget?.checked ?? !editForm.isActive;
              setEditForm((prev) => ({ ...prev, isActive: checked }));
            }}
          />

          {editSimilarWarning && editSimilarWarning.length > 0 ? (
            <Paper withBorder p="sm" radius="md" style={{ borderColor: 'var(--mantine-color-yellow-6)' }}>
              <Text size="sm" fw={600} mb={4}>Especialidade parecida encontrada</Text>
              <Text size="sm" c="dimmed" mb="sm">
                {`Já existe: ${editSimilarWarning.map((s) => `"${s.name}"`).join(', ')}. Deseja atualizar mesmo assim?`}
              </Text>
              <Group justify="flex-end">
                <Button variant="default" size="xs" onClick={() => setEditSimilarWarning(null)}>
                  Revisar nome
                </Button>
                <Button color="yellow" size="xs" onClick={() => submitEdit(true)} loading={saving}>
                  Atualizar mesmo assim
                </Button>
              </Group>
            </Paper>
          ) : null}

          <Group justify="flex-end" mt={8}>
            <Button variant="default" onClick={() => setEditModalOpen(false)} size="sm" disabled={saving}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} onClick={() => submitEdit(false)} size="sm" loading={saving} disabled={saving}>
              Atualizar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal excluir */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { if (!deleting) { setDeleteModalOpen(false); setDeleteTarget(null); } }}
        title="Confirmar exclusão"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {`Confirma a exclusão da especialidade ${deleteTarget?.name || 'selecionada'}?`}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => { setDeleteModalOpen(false); setDeleteTarget(null); }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button color="red" onClick={() => deleteTarget && handleDelete(deleteTarget)} loading={deleting}>
              Excluir
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal histórico */}
      <Modal
        opened={historyModalOpen}
        onClose={() => { setHistoryModalOpen(false); setHistoryTarget(null); setHistoryEntries([]); }}
        title={`Histórico ${historyTarget ? `— ${historyTarget.name}` : ''}`}
        centered
        size={isMobile ? '100%' : 520}
      >
        {historyLoading ? (
          <Stack gap="sm">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} height={48} radius="md" />
            ))}
          </Stack>
        ) : historyEntries.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Nenhum registro de auditoria encontrado.
          </Text>
        ) : (
          <Stack gap="sm">
            {historyEntries.map((entry) => (
              <Paper key={entry.id} withBorder p="sm" radius="md">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Box>
                    <Text size="sm" fw={600}>{ACTION_LABELS[entry.action] || entry.action}</Text>
                    <Text size="xs" c="dimmed">{entry.performedByName || 'Usuário desconhecido'}</Text>
                    {entry.details ? <Text size="xs" c="dimmed" mt={4}>{entry.details}</Text> : null}
                  </Box>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.createdAt)}</Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
