import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon, Select, NumberInput } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { DatePickerInput } from '@mantine/dates';

interface StockItem {
  id: number;
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

const SAMPLE_ITEMS: StockItem[] = [
  {
    id: 1,
    codigo: 'LUV001',
    nome: 'Luvas de Procedimento',
    quantidade: 150,
    minimo: 50,
    maximo: 100000,
    precoUnitario: 45.9,
    validade: '30/06/2026',
    categoria: 'Material Hospitalar',
    unidade: 'cx',
    status: 'Disponível',
  },
  {
    id: 2,
    codigo: 'SE010',
    nome: 'Seringa 100ml',
    quantidade: 30,
    minimo: 40,
    maximo: 100000,
    precoUnitario: 30.9,
    validade: '30/06/2026',
    categoria: 'Descartável',
    unidade: 'un',
    status: 'Baixo',
  },
];

export function Estoque() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<StockItem[]>(SAMPLE_ITEMS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

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

  const normalizeNumber = (val?: number | string | null) => {
    if (val === undefined || val === null || val === '') return null;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : null;
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

  const handleAddOrUpdate = () => {
    if (!form.nome.trim()) {
      showNotification({ title: 'Erro', message: 'Nome do item é obrigatório', color: 'red' });
      return;
    }

    if (dateInput && !form.validade) {
      showNotification({ title: 'Erro', message: 'Validade inválida', color: 'red' });
      return;
    }

    if (editingId) {
      setItems((prev) => prev.map((p) => p.id === editingId ? ({ ...p, nome: form.nome, codigo: form.codigo, categoria: form.categoria, unidade: form.unidade, quantidade: form.quantidade ?? p.quantidade, minimo: form.minimo ?? p.minimo, maximo: form.maximo ?? p.maximo, precoUnitario: form.precoUnitario ?? p.precoUnitario, validade: formatDate(form.validade) }) : p));
      showNotification({ title: 'Atualizado', message: 'Item atualizado', color: 'green' });
    } else {
      const id = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      const newItem: StockItem = {
        id,
        codigo: form.codigo || `CODE${id}`,
        nome: form.nome,
        quantidade: form.quantidade ?? 0,
        minimo: form.minimo ?? 0,
        maximo: form.maximo ?? 0,
        precoUnitario: form.precoUnitario ?? 0,
        validade: formatDate(form.validade) || '-',
        categoria: form.categoria,
        unidade: form.unidade,
        status: (form.quantidade ?? 0) <= (form.minimo ?? 0) ? 'Baixo' : 'Disponível',
      };
      setItems((prev) => [newItem, ...prev]);
      showNotification({ title: 'Adicionado', message: 'Item adicionado ao estoque', color: 'green' });
    }

    setModalOpen(false);
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
              data={[{ value: 'all', label: 'Todas as categorias' }, { value: 'Medicamento', label: 'Medicamento' }, { value: 'Equipamento', label: 'Equipamento' }, { value: 'Limpeza', label: 'Limpeza' }, { value: 'Descartável', label: 'Descartável' }]}
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
                      <Text size="xs">{it.categoria === 'Descartável' ? 'Descartável' : 'Não descartável'}</Text>
                    </Table.Td>
                  )}

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs">{it.status}</Text>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
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
                  <Select variant="unstyled" data={[{ value: 'Material Hospitalar', label: 'Material Hospitalar' }, { value: 'Medicamento', label: 'Medicamento' }, { value: 'Limpeza', label: 'Limpeza' }, { value: 'Descartável', label: 'Descartável' }]} value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v || '' })} placeholder="Categoria" />
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
              <Button bg={DARK_BLUE} onClick={handleAddOrUpdate} size="sm">Cadastrar</Button>
            </Group>
          </Box>
        </Stack>
      </Modal>
    </Box>
  );
}
