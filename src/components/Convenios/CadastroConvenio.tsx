import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  TextInput,
  Table,
  Modal,
  Stack,
  ActionIcon,
  Badge,
  Paper,
  Skeleton,
  Menu,
  SimpleGrid,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { ChevronRight, Plus, Pencil, Trash2, MoreVertical, FilePlus, List, Search } from 'lucide-react';
import { showNotification } from '@/components/ui';
import { Header } from '../Header/Header';
import { PaginatedGrid } from '../common/PaginatedGrid';
import insuranceService from '../../services/insuranceService';
import { useInsurancesAdminQuery } from '../../hooks/useInsurancesAdminQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import './CadastroConvenioHub.css';
import './CadastroConvenioList.css';

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
  const [activeTab, setActiveTab] = useState<'hub' | 'lista'>('hub');

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<InsuranceRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InsuranceRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const insurancesQuery = useInsurancesAdminQuery();

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

  return (
    <Box className="cadastro-convenio-hub-page" bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => (activeTab === 'hub' ? navigate('/dashboard?secao=cadastros-clinicos') : setActiveTab('hub')) }} />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {activeTab === 'hub' ? (
          <>
            <Box className="cadastro-convenio-hub-hero">
              <Text className="cadastro-convenio-hub-eyebrow">CADASTROS CLÍNICOS</Text>
              <Text className="cadastro-convenio-hub-title" fw={700} size="2xl">Convênios</Text>
              <Text className="cadastro-convenio-hub-subtitle" size="sm">Gestão de convênios</Text>
            </Box>

            <SimpleGrid className="cadastro-convenio-hub-grid" cols={{ base: 1, sm: 2 }}>
              {[
                {
                  key: 'novo',
                  icon: FilePlus,
                  title: 'Cadastrar convênio',
                  desc: 'Registre um novo convênio com procedimentos aceitos, valores e prazos de autorização.',
                  onClick: () => navigate('/convenios/novo'),
                },
                {
                  key: 'lista',
                  icon: List,
                  title: 'Convênios cadastrados',
                  desc: 'Consulte, edite e gerencie os convênios já cadastrados.',
                  onClick: () => setActiveTab('lista'),
                },
              ].map((card) => (
                <Paper
                  key={card.key}
                  className="cadastro-convenio-hub-card"
                  withBorder
                  onClick={card.onClick}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <Box className="cadastro-convenio-hub-icon">
                        <card.icon size={20} />
                      </Box>
                      <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="md" lineClamp={1}>{card.title}</Text>
                        <Text size="sm" c="dimmed" lineClamp={2}>{card.desc}</Text>
                      </Box>
                    </Group>
                    <ChevronRight size={18} className="cadastro-convenio-hub-chevron" style={{ flexShrink: 0 }} />
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </>
        ) : (
          <Paper className="cadastro-convenio-list-panel" p="lg" withBorder radius="md">
        <Group justify="space-between" mb="lg" wrap="wrap" gap="sm">
          <Text fw={600} size="lg">Convênios cadastrados</Text>
          <Group gap="sm" wrap={isMobile ? 'wrap' : 'nowrap'} align="center" className="cadastro-convenio-list-actions">
            <TextInput
              className="cadastro-convenio-list-search"
              placeholder="Buscar por nome ou código"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              leftSection={<Search size={16} aria-hidden="true" />}
            />
            <Button leftSection={<Plus size={16} />} onClick={() => navigate('/convenios/novo')}>
              Novo convênio
            </Button>
          </Group>
        </Group>

        {itemsLoading ? (
          isMobile ? (
            <Stack gap="sm">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Paper key={idx} className="cadastro-convenio-list-card" withBorder radius="md" p="md">
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
            <Box className="cadastro-convenio-list-table-wrap">
              <Table horizontalSpacing="md" verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th className="cadastro-convenio-list-th">Nome</Table.Th>
                    <Table.Th className="cadastro-convenio-list-th">Código</Table.Th>
                    <Table.Th className="cadastro-convenio-list-th">Status</Table.Th>
                    <Table.Th className="cadastro-convenio-list-th">Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Table.Tr key={idx} className="cadastro-convenio-list-row">
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
              <Paper className="cadastro-convenio-list-empty" withBorder radius="md" p="xl">
                <Text size="sm" c="dimmed" ta="center">
                  Nenhum convênio encontrado. Ajuste a busca ou cadastre um novo convênio.
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm">
                {filtered.map((it) => (
                  <Paper key={it.id} className="cadastro-convenio-list-card" withBorder radius="md" p="md">
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
                    <Table.Th className="cadastro-convenio-list-th">Nome</Table.Th>
                    {!isTablet && <Table.Th className="cadastro-convenio-list-th">Código</Table.Th>}
                    {!isTablet && <Table.Th className="cadastro-convenio-list-th">Status</Table.Th>}
                    <Table.Th className="cadastro-convenio-list-th cadastro-convenio-list-th-actions" style={{ width: 96 }}>
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
                      <Table.Tr key={it.id} className="cadastro-convenio-list-row">
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
                            <Text size="sm" c={it.code ? undefined : 'dimmed'}>
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
                            <Menu shadow="md" width={210} position="bottom-end" withArrow>
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
          </Paper>
        )}
      </Box>

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
