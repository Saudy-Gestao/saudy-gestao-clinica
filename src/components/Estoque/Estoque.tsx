import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon, Select, NumberInput, Center, ThemeIcon, Loader } from '@mantine/core';
import inventoryService from '../../services/inventoryService';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, Check } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { DatePickerInput } from '@mantine/dates';
import ResultModal from '../common/ResultModal';

interface StockItem {
  id: string;
  codigo: string;
  nome: string;
  quantidade: number;
  minimo: number;
  maximo: number;
  precoUnitario: number;
  validade?: string; // dd/mm/yyyy or '-' when empty
  categoria?: string;
  unidade?: string;
  status?: string;
}

// SAMPLE_ITEMS removed — items are now fetched from backend (/inventory/).

export function Estoque() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<StockItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Saving & success modal states
  const [savingItem, setSavingItem] = useState(false);
  const [showItemSuccessModal, setShowItemSuccessModal] = useState(false);
  const [lastCreatedItemName, setLastCreatedItemName] = useState<string | null>(null);
  const [lastItemAction, setLastItemAction] = useState<'created'|'updated'|null>(null);

  // Error modal state
  const [showItemErrorModal, setShowItemErrorModal] = useState(false);
  const [itemErrorMessage, setItemErrorMessage] = useState<string | null>(null);
  const [itemErrorTitle, setItemErrorTitle] = useState<string | null>(null);

  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  // Category options shared between filter and modal
  const categoriesOptions = [
    'Material Hospitalar',
    'Medicamento',
    'Equipamento',
    'Limpeza',
    'Descartável',
    'Outros',
  ].map((c) => ({ value: c, label: c }));

  const filtered = items.filter((i) => {
    const q = query.trim().toLowerCase();
    const matchQuery = !q || i.nome.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q);
    const matchCategory = !category || category === 'all' || i.categoria === category;
    return matchQuery && matchCategory;
  });

  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    categoria: '',
    unidade: '',
    quantidade: null as number | null,
    minimo: null as number | null,
    maximo: null as number | null,
    precoUnitario: null as number | null,
    validade: undefined as Date | undefined,
  });

  // date input helpers
  // eslint-disable-next-line no-empty-pattern
  const [] = useState(false);
  const [dateInput, setDateInput] = useState('');

  const formatDate = (d: Date | undefined) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (s: string) => {
    if (!s) return undefined;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return undefined;
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return undefined;
    return date;
  };
  // Fetch inventory items from backend
  useEffect(() => {
    const load = async () => {
      setItemsLoading(true);
      try {
        const data: any = await inventoryService.getItems();
        // backend may return array or wrapped object — handle both
        const list: any[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : []));
        const mapped: StockItem[] = list.map((it: any) => ({
          id: String(it.id),
          codigo: it.code || '',
          nome: it.name || '',
          quantidade: it.quantity ?? 0,
          minimo: it.minQuantity ?? 0,
          maximo: it.maxQuantity ?? 0,
          precoUnitario: parseNumber(it.unitPrice ?? it.unitPrice),
          validade: it.expiryDate ? (new Date(it.expiryDate)).toLocaleDateString('en-GB') : '-',
          categoria: it.category || '',
          unidade: it.unit || '',
          status: it.status ? String(it.status).toUpperCase() : ((it.quantity ?? 0) <= (it.minQuantity ?? 0) ? 'LOW' : 'AVAILABLE'),
        }));
        setItems(mapped);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar itens';
        setItemErrorTitle('Erro ao carregar itens');
        setItemErrorMessage(msg);
        setShowItemErrorModal(true);
        showNotification({ title: 'Erro', message: msg, color: 'red' });
      } finally {
        setItemsLoading(false);
      }
    };

    load();
  }, []);
  const normalizeNumber = (val?: number | string | null) => {
    if (val === undefined || val === null || val === '') return null;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : null;
  };

  const parseNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Helpers to format labels consistently
  const humanize = (s?: string) => {
    if (!s) return '-';
    return String(s).replace(/_/g, ' ').toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatStatus = (s?: string) => {
    if (!s) return '-';
    const map: Record<string, string> = {
      AVAILABLE: 'Disponível',
      LOW: 'Baixo',
      OUT_OF_STOCK: 'Esgotado',
      EXPIRED: 'Vencido',
      UNAVAILABLE: 'Indisponível',
      RESERVED: 'Reservado',
      DAMAGED: 'Danificado',
    };
    return map[String(s).toUpperCase()] || humanize(s);
  };

  const formatCategory = (c?: string) => {
    if (!c) return '-';
    const map: Record<string, string> = {
      'DESCARTÁVEL': 'Descartável',
      'DESCARTAVEL': 'Descartável',
      'MATERIAL HOSPITALAR': 'Material Hospitalar',
      'LIMPEZA': 'Limpeza',
      'MEDICAMENTO': 'Medicamento',
      'EQUIPAMENTO': 'Equipamento',
    };
    return map[String(c).toUpperCase()] || humanize(c);
  };

  const openCadastrar = (it?: StockItem) => {
    if (it) {
      setEditingId(it.id);
      setForm({
        codigo: it.codigo,
        nome: it.nome,
        categoria: it.categoria || '',
        unidade: it.unidade || '',
        quantidade: it.quantidade,
        minimo: it.minimo,
        maximo: it.maximo,
        precoUnitario: it.precoUnitario,
        validade: it.validade ? parseDate(it.validade) : undefined,
      });
      setDateInput(it.validade || '');
    } else {
      setEditingId(null);
      setForm({ codigo: '', nome: '', categoria: '', unidade: '', quantidade: null, minimo: null, maximo: null, precoUnitario: null, validade: undefined });
      setDateInput('');
    }
    setModalOpen(true);
  };

  const formatISODate = (d?: Date | undefined) => {
    if (!d) return undefined;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleAddOrUpdate = async () => {
    if (!form.nome.trim()) {
      showNotification({ title: 'Erro', message: 'Nome do item é obrigatório', color: 'red' });
      return;
    }

    if (dateInput && !form.validade) {
      showNotification({ title: 'Erro', message: 'Validade inválida', color: 'red' });
      return;
    }

    setSavingItem(true);

    try {
      if (editingId) {
        const payload = {
          name: form.nome,
          code: form.codigo || undefined,
          category: form.categoria || undefined,
          unit: form.unidade || undefined,
          quantity: normalizeNumber(form.quantidade) ?? 0,
          minQuantity: normalizeNumber(form.minimo) ?? 0,
          maxQuantity: normalizeNumber(form.maximo) ?? 0,
          unitPrice: normalizeNumber(form.precoUnitario) ?? 0,
          expiryDate: formatISODate(form.validade),
          notes: undefined,
        };

        const updated = await inventoryService.updateItem(editingId, payload);

        setItems((prev) => prev.map((p) => p.id === editingId ? ({
          ...p,
          nome: updated.name ?? p.nome,
          codigo: updated.code ?? p.codigo,
          categoria: updated.category ?? p.categoria,
          unidade: updated.unit ?? p.unidade,
          quantidade: updated.quantity ?? p.quantidade,
          minimo: updated.minQuantity ?? p.minimo,
          maximo: updated.maxQuantity ?? p.maximo,
          precoUnitario: parseNumber(updated.unitPrice ?? updated.unitPrice ?? p.precoUnitario),
          validade: updated.expiryDate ? (new Date(updated.expiryDate)).toLocaleDateString('en-GB') : p.validade,
          status: updated.status ? String(updated.status).toUpperCase() : ((updated.quantity ?? p.quantidade) <= (updated.minQuantity ?? p.minimo) ? 'LOW' : 'AVAILABLE'),
        }) : p));

        setLastItemAction('updated');
        setLastCreatedItemName(updated.name || form.nome);
        setModalOpen(false);
        setShowItemSuccessModal(true);
      } else {
        const payload = {
          code: form.codigo || `CODE${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          name: form.nome,
          category: form.categoria || '',
          unit: form.unidade || '',
          quantity: normalizeNumber(form.quantidade) ?? 0,
          minQuantity: normalizeNumber(form.minimo) ?? 0,
          maxQuantity: normalizeNumber(form.maximo) ?? 0,
          unitPrice: normalizeNumber(form.precoUnitario) ?? 0,
          expiryDate: formatISODate(form.validade) || '',
          notes: '',
        };

        const created = await inventoryService.createItem(payload);

        const newItem: StockItem = {
          id: created.id ? String(created.id) : `tmp-${Date.now()}`,
          codigo: created.code || form.codigo || `CODE${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          nome: created.name || form.nome,
          quantidade: created.quantity ?? (form.quantidade ?? 0),
          minimo: created.minQuantity ?? (form.minimo ?? 0),
          maximo: created.maxQuantity ?? (form.maximo ?? 0),
          precoUnitario: parseNumber(created.unitPrice ?? form.precoUnitario ?? 0),
          validade: created.expiryDate ? (new Date(created.expiryDate)).toLocaleDateString('en-GB') : (formatDate(form.validade) || '-'),
          categoria: created.category || form.categoria,
          unidade: created.unit || form.unidade,
          status: created.status ? String(created.status).toUpperCase() : ((created.quantity ?? form.quantidade ?? 0) <= (created.minQuantity ?? form.minimo ?? 0) ? 'LOW' : 'AVAILABLE'),
        };

        setItems((prev) => [newItem, ...prev]);

        setLastItemAction('created');
        setLastCreatedItemName(created.name || form.nome);
        setModalOpen(false);
        setShowItemSuccessModal(true);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao salvar item';
      // fallback to toast for some errors but also show error modal
      setItemErrorTitle('Erro ao salvar item');
      setItemErrorMessage(msg);
      setShowItemErrorModal(true);
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setSavingItem(false);
    }
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
                Estoque
              </Text>
              <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Cadastrar materiais
              </Text>
            </Box>
          </Group>

          <Group>
            <Select
              data={[{ value: 'all', label: 'Todas as categorias' }, ...categoriesOptions]}
              value={category || 'all'}
              onChange={(val) => setCategory(val || '')}
              placeholder="Todas as categorias"
              style={{ width: 220 }}
            />
            <Button bg={DARK_BLUE} c="white" leftSection={<Plus size={16} />} onClick={() => openCadastrar()} size={isMobile ? 'sm' : 'md'}>
              Novo item
            </Button>
          </Group>
        </Group>

        {/* Search */}
        <Box mb={isMobile ? 20 : 30}>
          <TextInput
            placeholder={isMobile ? 'Buscar...' : 'Buscar item por nome ou código...'}
            leftSection={<Search size={16} color="#999" />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            radius="md"
            size={isMobile ? 'sm' : 'md'}
            style={{ flex: 1 }}
          />
        </Box>

        {itemsLoading ? (
          <Center style={{ padding: 24, gap: 8 }}>
            <Loader />
            <Text>Carregando itens...</Text>
          </Center>
        ) : (
          <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
            <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
              <Table.Thead>
                <Table.Tr style={{ borderBottom: 'none' }}>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Código</Table.Th>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Prod.</Table.Th>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Quant.</Table.Th>
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Mín.</Table.Th>}
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Máx.</Table.Th>}
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Preço Unit.</Table.Th>}
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Valid.</Table.Th>}
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Categoria</Table.Th>}
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((it) => (
                  <Table.Tr key={it.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{it.codigo}</Text>
                    </Table.Td>
                  <Table.Td>
                    <Box
                      bg={DARK_BLUE}
                      w={32}
                      h={32}
                      style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <Text c="white" fw={600} size="sm">{it.nome.charAt(0).toUpperCase()}</Text>
                    </Box>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{it.nome}</Text>
                  </Table.Td>
                <Table.Td>
                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{it.quantidade}</Text>
                </Table.Td>

                {!isTablet && (
                  <Table.Td>
                    <Text size="xs">{it.minimo}</Text>
                  </Table.Td>
                )}

                {!isTablet && (
                  <Table.Td>
                    <Text size="xs">{it.maximo}</Text>
                  </Table.Td>
                )}

                {!isTablet && (
                  <Table.Td>
                    <Text size="xs">R${it.precoUnitario.toFixed(2)}</Text>
                  </Table.Td>
                )}

                {!isTablet && (
                  <Table.Td>
                    <Text size="xs">{it.validade || '-'}</Text>
                  </Table.Td>
                )}

                {!isTablet && (
                  <Table.Td>
                    <Text size="xs">{formatCategory(it.categoria)}</Text>
                  </Table.Td>
                )}

                {!isTablet && (
                  <Table.Td>
                    <Text size="xs">{formatStatus(it.status)}</Text>
                  </Table.Td>
                )}
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
        title={'Cadastrar item'}
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
            <Text size="sm" fw={600} mb={8}>Cadastrar item</Text>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.currentTarget.value })} placeholder=" " />
              <label>Nome do item</label>
            </Box>

            <Box style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 8 }}>
              <Box>
                <Box className="line-field">
                  <TextInput variant="unstyled" placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.currentTarget.value })} />
                </Box>

                <Box className="line-field">
                  <Select variant="unstyled" data={[{ value: 'un', label: 'un' }, { value: 'cx', label: 'cx' }, { value: 'ml', label: 'ml' }]} value={form.unidade} onChange={(v) => setForm({ ...form, unidade: v || '' })} placeholder="Unidade" />
                </Box>

                <Box className="line-field">
                  <NumberInput variant="unstyled" value={form.minimo ?? undefined} onChange={(val) => setForm({ ...form, minimo: normalizeNumber(val) })} placeholder="Quant. Mín." min={0} />
                </Box>

                <Box style={{ marginBottom: 8, borderBottom: '1px solid #dee2e6', paddingBottom: 6 }}>
                      <NumberInput variant="unstyled" value={form.precoUnitario ?? undefined} onChange={(val) => setForm({ ...form, precoUnitario: normalizeNumber(val) })} placeholder="Preço Unitário" min={0} step={0.01} />
                    </Box>
              </Box>

              <Box>
                <Box className="line-field">
                  <Select variant="unstyled" data={categoriesOptions} value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v || '' })} placeholder="Categoria" />
                </Box>

                <Box className="line-field">
                  <NumberInput variant="unstyled" value={form.quantidade ?? undefined} onChange={(val) => setForm({ ...form, quantidade: normalizeNumber(val) })} placeholder="Quantidade atual" min={0} />
                </Box>

                <Box className="line-field">
                  <NumberInput variant="unstyled" value={form.maximo ?? undefined} onChange={(val) => setForm({ ...form, maximo: normalizeNumber(val) })} placeholder="Quant. Máx." min={0} />
                </Box>

                <Box style={{ marginBottom: 8, borderBottom: '1px solid #dee2e6', paddingBottom: 6 }}>
                  <DatePickerInput
                    placeholder="Validade"
                    value={form.validade}
                    onChange={(val) => {
                      const date = val || undefined;
                      setForm({ ...form, validade: date });
                      setDateInput(date ? formatDate(date) : '');
                    }}
                    valueFormat="DD/MM/YYYY"
                    clearable
                    styles={{
                      input: { border: 'none', padding: 0, fontSize: '0.875rem' }
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Group justify="flex-end" mt={8}>
              <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
              <Button bg={DARK_BLUE} onClick={handleAddOrUpdate} size="sm" loading={savingItem} disabled={savingItem}>{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
            </Group>
          </Box>
        </Stack>
      </Modal>

      <ResultModal
        opened={showItemSuccessModal}
        onClose={() => setShowItemSuccessModal(false)}
        variant={lastItemAction === 'created' ? 'success' : 'success'}
        title={lastItemAction === 'created' ? 'Item cadastrado' : 'Item atualizado'}
        message={lastCreatedItemName ? `${lastCreatedItemName} ${lastItemAction === 'created' ? 'foi adicionado ao estoque.' : 'foi atualizado com sucesso.'}` : (lastItemAction === 'created' ? 'Item adicionado com sucesso.' : 'Item atualizado com sucesso.')}
        secondary={{ label: 'Voltar', onClick: () => setShowItemSuccessModal(false) }}
        primary={{ label: 'Cadastrar novo', onClick: () => { setForm({ codigo: '', nome: '', categoria: '', unidade: '', quantidade: null, minimo: null, maximo: null, precoUnitario: null, validade: undefined }); setShowItemSuccessModal(false); setModalOpen(true); setEditingId(null); } }}
      />

      <ResultModal
        opened={showItemErrorModal}
        onClose={() => setShowItemErrorModal(false)}
        variant="error"
        title={itemErrorTitle || 'Erro'}
        message={itemErrorMessage || 'Ocorreu um erro'}
        secondary={{ label: 'Fechar', onClick: () => setShowItemErrorModal(false) }}
      />
    </Box>
  );
}
