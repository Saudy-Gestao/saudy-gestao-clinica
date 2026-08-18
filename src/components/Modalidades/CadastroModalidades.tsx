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
import { FloatingTextarea } from '../common/FloatingTextarea';
import { PaginatedGrid } from '../common/PaginatedGrid';
import modalidadeService, { type Modalidade, type ModalidadeAuditLogEntry } from '../../services/modalidadeService';
import { useModalidadesAdminQuery } from '../../hooks/useModalidadesAdminQuery';
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

export function CadastroModalidades() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Modalidade[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });

  const [similarWarning, setSimilarWarning] = useState<{ id: string; name: string }[] | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Modalidade | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Modalidade | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<ModalidadeAuditLogEntry[]>([]);

  const modalidadesQuery = useModalidadesAdminQuery();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q));
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
    setItemsLoading(modalidadesQuery.isLoading && items.length === 0);
  }, [modalidadesQuery.isLoading, items.length]);

  useEffect(() => {
    if (modalidadesQuery.error) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(modalidadesQuery.error, 'Erro ao carregar modalidades'),
        color: 'red',
      });
    }
  }, [modalidadesQuery.error]);

  useEffect(() => {
    const data: any = modalidadesQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    setItems(list.filter((it: any) => it?.id));
  }, [modalidadesQuery.data]);

  const resetForm = () => {
    setForm({ name: '', description: '', isActive: true });
    setNameError(null);
    setSimilarWarning(null);
  };

  const openCreateModal = () => {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item: Modalidade) => {
    setEditingId(item.id);
    setForm({ name: item.name, description: item.description || '', isActive: item.isActive });
    setNameError(null);
    setSimilarWarning(null);
    setModalOpen(true);
  };

  const submit = async (force: boolean) => {
    const name = form.name.trim();
    if (!name) {
      setNameError('Nome é obrigatório');
      return;
    }
    setNameError(null);
    setSimilarWarning(null);
    setSaving(true);

    try {
      if (editingId) {
        await modalidadeService.updateModalidade(editingId, {
          name,
          description: form.description.trim() || undefined,
          isActive: form.isActive,
          force,
        });
        showNotification({ title: 'Atualizada', message: 'Modalidade atualizada com sucesso', color: 'green' });
      } else {
        await modalidadeService.createModalidade({
          name,
          description: form.description.trim() || undefined,
          force,
        });
        showNotification({ title: 'Cadastrada', message: 'Modalidade cadastrada com sucesso', color: 'green' });
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.modalidadesAdmin });
      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      const errorCode = err?.response?.data?.error;
      if (errorCode === 'DUPLICATE_EXACT') {
        setNameError('Já existe uma modalidade com esse nome');
      } else if (errorCode === 'SIMILAR_EXISTS') {
        setSimilarWarning(err.response.data.similar || []);
      } else {
        showNotification({
          title: 'Erro',
          message: resolveApiErrorMessage(err, 'Erro ao salvar modalidade'),
          color: 'red',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Modalidade) => {
    setDeleting(true);
    try {
      await modalidadeService.deleteModalidade(item.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.modalidadesAdmin });
      showNotification({ title: 'Excluída', message: 'Modalidade excluída com sucesso', color: 'green' });
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao excluir modalidade'),
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const openHistoryModal = async (item: Modalidade) => {
    setHistoryTarget(item);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const data: any = await modalidadeService.getModalidadeAuditLog(item.id);
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

  const renderStatusBadge = (item: Modalidade) => (
    <Badge color={item.isActive ? 'green' : 'red'} variant="light" size="sm">
      {item.isActive ? 'Ativo' : 'Inativo'}
    </Badge>
  );

  const renderAuditInfo = (item: Modalidade) => {
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
                Modalidades
              </Text>
              <Text size="sm" c="dimmed">
                Tipos de exame (Tomografia, Ressonância, Ultrassonografia...)
              </Text>
            </Box>
          </Group>

          <Button bg={DARK_BLUE} c="white" leftSection={<Plus size={16} />} onClick={openCreateModal} size={isMobile ? 'sm' : 'md'}>
            Nova modalidade
          </Button>
        </Group>

        <Box mb={isMobile ? 20 : 30}>
          <FloatingInput
            label="Buscar modalidades"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={isMobile ? 'Buscar...' : 'Buscar modalidade por nome...'}
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
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Última alteração</Table.Th>
                    <Table.Th>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td><Skeleton height={16} width="70%" radius="sm" /></Table.Td>
                      <Table.Td><Skeleton height={24} width={78} radius="xl" /></Table.Td>
                      <Table.Td><Skeleton height={14} width="60%" radius="sm" /></Table.Td>
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
                  Nenhuma modalidade encontrada. Ajuste a busca ou cadastre uma nova modalidade.
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm">
                {filtered.map((it) => (
                  <Paper key={it.id} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={600} size="sm">{it.name}</Text>
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
                      <Table.Td colSpan={isTablet ? 3 : 4}>
                        <Text size="sm" c="dimmed" ta="center">
                          Nenhuma modalidade encontrada. Ajuste a busca ou cadastre uma nova modalidade.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedItems.map((it) => (
                      <Table.Tr key={it.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={600} size="sm">{it.name}</Text>
                            {it.description ? <Text size="xs" c="dimmed" lineClamp={1}>{it.description}</Text> : null}
                          </Stack>
                        </Table.Td>
                        <Table.Td>{renderStatusBadge(it)}</Table.Td>
                        {!isTablet && <Table.Td>{renderAuditInfo(it)}</Table.Td>}
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group justify="center">
                            <Menu shadow="md" width={200} position="bottom" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações da modalidade">
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

      {/* Modal criar/editar */}
      <Modal
        opened={modalOpen}
        onClose={() => { if (!saving) setModalOpen(false); }}
        title={editingId ? 'Editar modalidade' : 'Cadastrar modalidade'}
        size={isMobile ? '100%' : 480}
        centered
        fullScreen={isMobile}
      >
        <Stack gap={10}>
          <FloatingInput
            label="Nome da modalidade"
            required
            placeholder="Ex: Tomografia"
            value={form.name}
            error={nameError || undefined}
            onChange={(e) => {
              const value = e?.currentTarget?.value ?? '';
              setForm((prev) => ({ ...prev, name: value }));
              setNameError(null);
              setSimilarWarning(null);
            }}
          />

          <FloatingTextarea
            label="Descrição"
            placeholder="Opcional"
            minRows={2}
            value={form.description}
            onChange={(e) => {
              const value = e?.currentTarget?.value ?? '';
              setForm((prev) => ({ ...prev, description: value }));
            }}
          />

          {editingId ? (
            <Switch
              label="Modalidade ativa"
              checked={form.isActive}
              onChange={(e) => {
                const checked = e?.currentTarget?.checked ?? !form.isActive;
                setForm((prev) => ({ ...prev, isActive: checked }));
              }}
            />
          ) : null}

          {similarWarning && similarWarning.length > 0 ? (
            <Paper withBorder p="sm" radius="md" style={{ borderColor: 'var(--mantine-color-yellow-6)' }}>
              <Text size="sm" fw={600} mb={4}>Modalidade parecida encontrada</Text>
              <Text size="sm" c="dimmed" mb="sm">
                {`Já existe: ${similarWarning.map((s) => `"${s.name}"`).join(', ')}. Deseja cadastrar mesmo assim?`}
              </Text>
              <Group justify="flex-end">
                <Button variant="default" size="xs" onClick={() => setSimilarWarning(null)}>
                  Revisar nome
                </Button>
                <Button color="yellow" size="xs" onClick={() => submit(true)} loading={saving}>
                  Cadastrar mesmo assim
                </Button>
              </Group>
            </Paper>
          ) : null}

          <Group justify="flex-end" mt={8}>
            <Button variant="default" onClick={() => setModalOpen(false)} size="sm" disabled={saving}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} onClick={() => submit(false)} size="sm" loading={saving} disabled={saving}>
              {editingId ? 'Atualizar' : 'Cadastrar'}
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
            {`Confirma a exclusão da modalidade ${deleteTarget?.name || 'selecionada'}?`}
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
