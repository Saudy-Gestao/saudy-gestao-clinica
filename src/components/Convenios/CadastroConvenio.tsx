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
import { ChevronLeft, Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { PaginatedGrid } from '../common/PaginatedGrid';
import insuranceService from '../../services/insuranceService';
import { useInsurancesAdminQuery } from '../../hooks/useInsurancesAdminQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

interface InsuranceRow {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  tissRegistroAns?: string | null;
  tissOperadoraCnpj?: string | null;
  tissVersao?: string | null;
  tissPrestadorCnpj?: string | null;
  tissPrestadorCnes?: string | null;
  tissCodigoPrestadorOperadora?: string | null;
  isActive: boolean;
  subInsurances: string[];
  createdAt?: string | null;
}

export function CadastroConvenio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<InsuranceRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InsuranceRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const insurancesQuery = useInsurancesAdminQuery();

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    tissRegistroAns: '',
    tissOperadoraCnpj: '',
    tissVersao: '3.05.00',
    tissPrestadorCnpj: '',
    tissPrestadorCnes: '',
    tissCodigoPrestadorOperadora: '',
    isActive: true,
    subInsurances: [] as string[],
  });
  const [subInsuranceInput, setSubInsuranceInput] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (
      it.name.toLowerCase().includes(q) ||
      (it.code || '').toLowerCase().includes(q)
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
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setItemsLoading(insurancesQuery.isLoading && items.length === 0);
  }, [insurancesQuery.isLoading, items.length]);

  useEffect(() => {
    if (insurancesQuery.error) {
      const err: any = insurancesQuery.error;
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao carregar convenios'),
        color: 'red',
      });
    }
  }, [insurancesQuery.error]);

  useEffect(() => {
    const data: any = insurancesQuery.data;
    const list: any[] = Array.isArray(data)
      ? data
      : (Array.isArray(data?.items)
        ? data.items
        : (Array.isArray(data?.data?.items)
          ? data.data.items
          : (Array.isArray(data?.data)
            ? data.data
            : [])));

    const mapped: InsuranceRow[] = list.map((it: any) => ({
      id: String(it.id ?? it.insuranceId ?? ''),
      name: it.name || it.nome || '',
      code: it.code || it.codigo || null,
      description: it.description || it.descricao || null,
      tissRegistroAns: it.tissRegistroAns || null,
      tissOperadoraCnpj: it.tissOperadoraCnpj || null,
      tissVersao: it.tissVersao || null,
      tissPrestadorCnpj: it.tissPrestadorCnpj || null,
      tissPrestadorCnes: it.tissPrestadorCnes || null,
      tissCodigoPrestadorOperadora: it.tissCodigoPrestadorOperadora || null,
      isActive: it.isActive ?? true,
      subInsurances: Array.isArray(it.subInsurances)
        ? it.subInsurances.map((sub: any) => String(sub?.name || sub || '').trim()).filter(Boolean)
        : [],
      createdAt: it.createdAt || it.created_at || null,
    })).filter((it: InsuranceRow) => it.id);

    setItems(mapped);
  }, [insurancesQuery.data]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showNotification({ title: 'Erro', message: 'Nome do convenio e obrigatorio', color: 'red' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await insuranceService.updateInsurance(editingId, {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
          tissRegistroAns: form.tissRegistroAns.trim() || undefined,
          tissOperadoraCnpj: form.tissOperadoraCnpj.trim() || undefined,
          tissVersao: form.tissVersao.trim() || undefined,
          tissPrestadorCnpj: form.tissPrestadorCnpj.trim() || undefined,
          tissPrestadorCnes: form.tissPrestadorCnes.trim() || undefined,
          tissCodigoPrestadorOperadora: form.tissCodigoPrestadorOperadora.trim() || undefined,
          isActive: form.isActive,
          subInsurances: form.subInsurances,
        });

        await queryClient.invalidateQueries({ queryKey: queryKeys.insurancesAdmin });
        showNotification({ title: 'Atualizado', message: 'Convenio atualizado', color: 'green' });
      } else {
        await insuranceService.createInsurance({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
          tissRegistroAns: form.tissRegistroAns.trim() || undefined,
          tissOperadoraCnpj: form.tissOperadoraCnpj.trim() || undefined,
          tissVersao: form.tissVersao.trim() || undefined,
          tissPrestadorCnpj: form.tissPrestadorCnpj.trim() || undefined,
          tissPrestadorCnes: form.tissPrestadorCnes.trim() || undefined,
          tissCodigoPrestadorOperadora: form.tissCodigoPrestadorOperadora.trim() || undefined,
          isActive: form.isActive,
          subInsurances: form.subInsurances,
        });

        await queryClient.invalidateQueries({ queryKey: queryKeys.insurancesAdmin });
        showNotification({ title: 'Adicionado', message: 'Convenio cadastrado', color: 'green' });
      }

      setModalOpen(false);
      setEditingId(null);
      setForm({
        name: '',
        code: '',
        description: '',
        tissRegistroAns: '',
        tissOperadoraCnpj: '',
        tissVersao: '3.05.00',
        tissPrestadorCnpj: '',
        tissPrestadorCnes: '',
        tissCodigoPrestadorOperadora: '',
        isActive: true,
        subInsurances: [],
      });
      setSubInsuranceInput('');
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao salvar convenio'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item: InsuranceRow) => {
    setDeleting(true);
    try {
      await insuranceService.updateInsurance(item.id, { isActive: false });
      await queryClient.invalidateQueries({ queryKey: queryKeys.insurancesAdmin });
      showNotification({ title: 'Desativado', message: 'Convenio desativado com sucesso', color: 'green' });
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao desativar convenio'),
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
  };

  const handleCodeChange = (value: string) => {
    setForm((prev) => ({ ...prev, code: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setForm((prev) => ({ ...prev, description: value }));
  };

  const handleActiveChange = (checked: boolean) => {
    setForm((prev) => ({ ...prev, isActive: checked }));
  };

  const handleAddSubInsurance = () => {
    const name = subInsuranceInput.trim();
    if (!name) return;
    setForm((prev) => (
      prev.subInsurances.includes(name)
        ? prev
        : { ...prev, subInsurances: [...prev.subInsurances, name] }
    ));
    setSubInsuranceInput('');
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Convenios
              </Text>
              <Text size="sm" c="dimmed">
                Cadastro de convenios
              </Text>
            </Box>
          </Group>

          <Group>
            <Button bg={DARK_BLUE} c="white" leftSection={<Plus size={16} />} onClick={() => navigate('/convenios/novo')} size={isMobile ? 'sm' : 'md'}>
              Novo convenio
            </Button>
          </Group>
        </Group>

        <Box mb={isMobile ? 20 : 30}>
          <FloatingInput
            label="Buscar convênios"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={isMobile ? 'Buscar...' : 'Buscar convenio por nome ou codigo...'}
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
          ) : (
            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
              <Table horizontalSpacing="md" verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nome</Table.Th>
                    <Table.Th>Código</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td><Skeleton height={16} width="70%" radius="sm" /></Table.Td>
                      <Table.Td><Skeleton height={14} width="45%" radius="sm" /></Table.Td>
                      <Table.Td><Skeleton height={24} width={78} radius="xl" /></Table.Td>
                      <Table.Td>
                        <Group gap={8}>
                          <Skeleton height={28} width={28} radius="xl" />
                          <Skeleton height={28} width={28} radius="xl" />
                        </Group>
                      </Table.Td>
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
                  Nenhum convênio encontrado. Ajuste a busca ou cadastre um novo convênio.
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm">
                {filtered.map((it) => (
                  <Paper key={it.id} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={600} size="sm">{it.name}</Text>
                        <Text size="xs" c="dimmed">{it.code || 'Sem código'}</Text>
                        {it.subInsurances.length > 0 ? (
                          <Text size="xs" c="dimmed">{it.subInsurances.length} subconvênio(s)</Text>
                        ) : null}
                      </Stack>
                      <Badge color={it.isActive ? 'green' : 'red'} variant="light" size="sm">
                        {it.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </Group>
                    <Group gap={8} mt="md" wrap="nowrap">
                      <ActionIcon variant="light" color="blue" onClick={() => navigate(`/convenios/${it.id}`)}>
                        <Pencil size={16} />
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
              maxHeight={isMobile ? 500 : 620}
              showFooter
            >
              <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: 'none' }}>
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Código</Table.Th>}
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center', width: 96 }}>
                      Ações
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={isTablet ? 2 : 4}>
                        <Text size="sm" c="dimmed" ta="center">
                          Nenhum convênio encontrado. Ajuste a busca ou cadastre um novo convênio.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedItems.map((it) => (
                      <Table.Tr key={it.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={600} size="sm">{it.name}</Text>
                            {it.subInsurances.length > 0 ? (
                              <Text size="xs" c="dimmed">{it.subInsurances.length} subconvênio(s)</Text>
                            ) : null}
                          </Stack>
                        </Table.Td>
                        {!isTablet && (
                          <Table.Td>
                            <Text size="sm" c={it.code ? 'var(--mantine-color-text)' : 'dimmed'}>
                              {it.code || 'Sem código'}
                            </Text>
                          </Table.Td>
                        )}
                        {!isTablet && (
                          <Table.Td>
                            <Badge color={it.isActive ? 'green' : 'red'} variant="light" size="sm">
                              {it.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </Table.Td>
                        )}
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group justify="center">
                            <Menu shadow="md" width={210} position="bottom" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações do convênio">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<Pencil size={14} />} onClick={() => navigate(`/convenios/${it.id}`)}>
                                  Editar
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<Trash2 size={14} />}
                                  color="red"
                                  onClick={() => {
                                    setDeleteTarget(it);
                                    setDeleteModalOpen(true);
                                  }}
                                >
                                  Desativar
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

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar convenio' : 'Cadastrar convenio'}
        size={isMobile ? '100%' : 520}
        centered={false}
        fullScreen={isMobile}
        styles={{
          content: { left: 48, bottom: 96, top: 'auto', transform: 'none', width: isMobile ? '100%' : 520 },
          body: { overflowY: 'auto' },
        }}
      >
        <Stack gap={10}>
          <Box style={{ padding: 8 }}>
            <FloatingInput
              label="Nome do convênio"
              required
              placeholder="Ex: Unimed"
              value={form.name}
              onChange={(e) => handleNameChange(e?.currentTarget?.value ?? '')}
            />

            <Box mt="sm">
              <FloatingInput
                label="Código"
                placeholder="Opcional"
                value={form.code}
                onChange={(e) => handleCodeChange(e?.currentTarget?.value ?? '')}
              />
            </Box>

            <FloatingTextarea
              mt="sm"
              label="Descrição"
              placeholder="Detalhes do convenio"
              minRows={3}
              value={form.description}
              onChange={(e) => handleDescriptionChange(e?.currentTarget?.value ?? '')}
            />

            <Text fw={600} size="sm" mt="md">Configuração TISS</Text>
            <Text size="xs" c="dimmed" mb="xs">
              Esses dados são usados na geração do XML TISS.
            </Text>

            <FloatingInput
              label="Registro ANS da operadora"
              placeholder="Ex: 123456"
              value={form.tissRegistroAns}
              onChange={(e) => {
                const value = e?.currentTarget?.value ?? '';
                setForm((prev) => ({ ...prev, tissRegistroAns: value }));
              }}
            />

            <Box mt="sm">
              <FloatingInput
                label="CNPJ da operadora"
                placeholder="Somente números"
                value={form.tissOperadoraCnpj}
                onChange={(e) => {
                  const value = e?.currentTarget?.value ?? '';
                  setForm((prev) => ({ ...prev, tissOperadoraCnpj: value }));
                }}
              />
            </Box>

            <Box mt="sm">
              <FloatingInput
                label="Versão TISS"
                placeholder="Ex: 3.05.00"
                value={form.tissVersao}
                onChange={(e) => {
                  const value = e?.currentTarget?.value ?? '';
                  setForm((prev) => ({ ...prev, tissVersao: value }));
                }}
              />
            </Box>

            <Box mt="sm">
              <FloatingInput
                label="CNPJ do prestador executante"
                placeholder="Somente números"
                value={form.tissPrestadorCnpj}
                onChange={(e) => {
                  const value = e?.currentTarget?.value ?? '';
                  setForm((prev) => ({ ...prev, tissPrestadorCnpj: value }));
                }}
              />
            </Box>

            <Box mt="sm">
              <FloatingInput
                label="CNES do prestador executante"
                placeholder="Ex: 1234567"
                value={form.tissPrestadorCnes}
                onChange={(e) => {
                  const value = e?.currentTarget?.value ?? '';
                  setForm((prev) => ({ ...prev, tissPrestadorCnes: value }));
                }}
              />
            </Box>

            <Box mt="sm">
              <FloatingInput
                label="Código do prestador na operadora"
                placeholder="Código contratado"
                value={form.tissCodigoPrestadorOperadora}
                onChange={(e) => {
                  const value = e?.currentTarget?.value ?? '';
                  setForm((prev) => ({ ...prev, tissCodigoPrestadorOperadora: value }));
                }}
              />
            </Box>

            <Switch
              mt="sm"
              label="Convenio ativo"
              checked={form.isActive}
              onChange={(e) => handleActiveChange(e?.currentTarget?.checked ?? !form.isActive)}
            />

            <Box mt="sm">
              <FloatingInput
                label="Subconvênio"
                placeholder="Digite e pressione Enter"
                value={subInsuranceInput}
                onChange={(e) => {
                  const value = e?.currentTarget?.value ?? '';
                  setSubInsuranceInput(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubInsurance();
                  }
                }}
              />
            </Box>
            <Group mt={6} gap="xs">
              {form.subInsurances.map((sub) => (
                <Button
                  key={sub}
                  size="compact-xs"
                  variant="light"
                  color="blue"
                  onClick={() => setForm((prev) => ({ ...prev, subInsurances: prev.subInsurances.filter((item) => item !== sub) }))}
                >
                  {sub} ×
                </Button>
              ))}
            </Group>

            <Group justify="flex-end" mt={16}>
              <Button variant="default" onClick={() => setModalOpen(false)} size="sm">
                Cancelar
              </Button>
              <Button bg={DARK_BLUE} onClick={handleSave} size="sm" loading={saving} disabled={saving}>
                {editingId ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </Group>
          </Box>
        </Stack>
      </Modal>

      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Confirmar desativação"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {`Confirma a desativação do convênio ${deleteTarget?.name || 'selecionado'}?`}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteTarget(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button color="red" onClick={() => deleteTarget && handleDeactivate(deleteTarget)} loading={deleting}>
              Desativar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
