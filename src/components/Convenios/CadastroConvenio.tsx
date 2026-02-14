import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  TextInput,
  Button,
  Table,
  Modal,
  Stack,
  ActionIcon,
  Switch,
  Textarea,
  Paper,
  Center,
  Loader
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import insuranceService from '../../services/insuranceService';

interface InsuranceRow {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | null;
}

export function CadastroConvenio() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<InsuranceRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (
      it.name.toLowerCase().includes(q) ||
      (it.code || '').toLowerCase().includes(q)
    ));
  }, [items, query]);

  useEffect(() => {
    const load = async () => {
      setItemsLoading(true);
      try {
        const data: any = await insuranceService.listInsurances();
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
          isActive: it.isActive ?? true,
          createdAt: it.createdAt || it.created_at || null,
        })).filter((it: InsuranceRow) => it.id);

        setItems(mapped);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar convenios',
          color: 'red',
        });
      } finally {
        setItemsLoading(false);
      }
    };

    load();
  }, []);

  const openModal = (item?: InsuranceRow) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        name: item.name || '',
        code: item.code || '',
        description: item.description || '',
        isActive: item.isActive ?? true,
      });
    } else {
      setEditingId(null);
      setForm({ name: '', code: '', description: '', isActive: true });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showNotification({ title: 'Erro', message: 'Nome do convenio e obrigatorio', color: 'red' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updated: any = await insuranceService.updateInsurance(editingId, {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        });

        setItems((prev) => prev.map((it) => it.id === editingId ? ({
          ...it,
          name: updated.name ?? form.name.trim(),
          code: updated.code ?? (form.code.trim() || null),
          description: updated.description ?? (form.description.trim() || null),
          isActive: updated.isActive ?? form.isActive,
        }) : it));

        showNotification({ title: 'Atualizado', message: 'Convenio atualizado', color: 'green' });
      } else {
        const created: any = await insuranceService.createInsurance({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        });

        const newItem: InsuranceRow = {
          id: String(created.id ?? `tmp-${Date.now()}`),
          name: created.name || form.name.trim(),
          code: created.code || form.code.trim() || null,
          description: created.description || form.description.trim() || null,
          isActive: created.isActive ?? form.isActive,
          createdAt: created.createdAt || created.created_at || null,
        };

        setItems((prev) => [newItem, ...prev]);
        showNotification({ title: 'Adicionado', message: 'Convenio cadastrado', color: 'green' });
      }

      setModalOpen(false);
      setEditingId(null);
      setForm({ name: '', code: '', description: '', isActive: true });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao salvar convenio',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InsuranceRow) => {
    const ok = window.confirm(`Excluir convenio ${item.name}?`);
    if (!ok) return;

    try {
      await insuranceService.deleteInsurance(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      showNotification({ title: 'Removido', message: 'Convenio excluido', color: 'green' });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao excluir convenio',
        color: 'red',
      });
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

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
                Convenios
              </Text>
              <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Cadastro de convenios
              </Text>
            </Box>
          </Group>

          <Group>
            <Button bg={DARK_BLUE} c="white" leftSection={<Plus size={16} />} onClick={() => openModal()} size={isMobile ? 'sm' : 'md'}>
              Novo convenio
            </Button>
          </Group>
        </Group>

        <Box mb={isMobile ? 20 : 30}>
          <TextInput
            placeholder={isMobile ? 'Buscar...' : 'Buscar convenio por nome ou codigo...'}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            radius="md"
            size={isMobile ? 'sm' : 'md'}
          />
        </Box>

        {itemsLoading ? (
          <Center style={{ padding: 24, gap: 8 }}>
            <Loader />
            <Text>Carregando convenios...</Text>
          </Center>
        ) : (
          <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
            <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
              <Table.Thead>
                <Table.Tr style={{ borderBottom: 'none' }}>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Codigo</Table.Th>}
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Acoes</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((it) => (
                  <Table.Tr key={it.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{it.name}</Text>
                    </Table.Td>
                    {!isTablet && (
                      <Table.Td>
                        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{it.code || '-'}</Text>
                      </Table.Td>
                    )}
                    {!isTablet && (
                      <Table.Td>
                        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{it.isActive ? 'Ativo' : 'Inativo'}</Text>
                      </Table.Td>
                    )}
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" color="gray" onClick={() => openModal(it)}>
                          <Pencil size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(it)}>
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
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
            <TextInput
              label="Nome do convenio"
              placeholder="Ex: Unimed"
              value={form.name}
              onChange={(e) => handleNameChange(e?.currentTarget?.value ?? '')}
            />

            <TextInput
              mt="sm"
              label="Codigo"
              placeholder="Opcional"
              value={form.code}
              onChange={(e) => handleCodeChange(e?.currentTarget?.value ?? '')}
            />

            <Textarea
              mt="sm"
              label="Descricao"
              placeholder="Detalhes do convenio"
              minRows={3}
              value={form.description}
              onChange={(e) => handleDescriptionChange(e?.currentTarget?.value ?? '')}
            />

            <Switch
              mt="sm"
              label="Convenio ativo"
              checked={form.isActive}
              onChange={(e) => handleActiveChange(e?.currentTarget?.checked ?? !form.isActive)}
            />

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
    </Box>
  );
}
