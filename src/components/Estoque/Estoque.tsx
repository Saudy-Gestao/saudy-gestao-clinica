import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, Button, Table, Modal, Stack, ActionIcon, Badge, Paper, Skeleton, Textarea, Divider, SimpleGrid, useComputedColorScheme, Menu } from '@mantine/core';
import inventoryService from '../../services/inventoryService';
import { useMediaQuery } from '@mantine/hooks';
import { Plus, Minus, ChevronLeft, ChevronRight, Pencil, ArrowUpDown, History, Boxes, X, MoreVertical, Package, PackageOpen } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import ResultModal from '../common/ResultModal';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingNumberInput } from '../common/FloatingNumberInput';
import { FloatingDateInput } from '../common/FloatingDateInput';
import { useInventoryItemsQuery } from '../../hooks/useInventoryItemsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { PaginatedGrid } from '../common/PaginatedGrid';

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

interface StockMovement {
  id: string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | string;
  quantity: number;
  reason: string;
  notes?: string | null;
  previousQty: number;
  resultingQty: number;
  createdByName?: string | null;
  createdAt: string;
}

interface StockLot {
  id: string;
  lotCode: string;
  quantity: number;
  expiryDate?: string | null;
  unitPrice?: number | null;
  supplier?: string | null;
  notes?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

interface StockKit {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  items: Array<{
    id?: string;
    inventoryItemId: string;
    quantity: number;
    inventoryItem?: { id?: string; name?: string; code?: string };
  }>;
}

const EMPTY_INVENTORY_ITEMS: any[] = [];

// SAMPLE_ITEMS removed â€” items are now fetched from backend (/inventory/).

export function Estoque() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'hub' | 'itens' | 'kits'>('hub');
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);
  const [kitsPage, setKitsPage] = useState(1);
  const [kitsPageSize, setKitsPageSize] = useState(10);
  const [items, setItems] = useState<StockItem[]>([]);
  const [kits, setKits] = useState<StockKit[]>([]);
  const [kitsLoading, setKitsLoading] = useState(false);
  const [kitSaving, setKitSaving] = useState(false);
  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [kitQuery, setKitQuery] = useState('');
  const [kitForm, setKitForm] = useState({
    name: '',
    description: '',
    selectedItemId: null as string | null,
    selectedQuantity: 1 as number | '',
    items: [] as Array<{ inventoryItemId: string; quantity: number }>,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const {
    data: inventoryItemsData,
    isLoading: itemsLoading,
    error: inventoryError,
  } = useInventoryItemsQuery();
  const inventoryItems = Array.isArray(inventoryItemsData) ? inventoryItemsData : EMPTY_INVENTORY_ITEMS;

  // Saving & success modal states
  const [savingItem, setSavingItem] = useState(false);
  const [showItemSuccessModal, setShowItemSuccessModal] = useState(false);
  const [lastCreatedItemName, setLastCreatedItemName] = useState<string | null>(null);
  const [lastItemAction, setLastItemAction] = useState<'created'|'updated'|null>(null);

  // Error modal state
  const [showItemErrorModal, setShowItemErrorModal] = useState(false);
  const [itemErrorMessage, setItemErrorMessage] = useState<string | null>(null);
  const [itemErrorTitle, setItemErrorTitle] = useState<string | null>(null);
  const [inventoryEditUnavailable, setInventoryEditUnavailable] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementSaving, setMovementSaving] = useState(false);
  const [movementItem, setMovementItem] = useState<StockItem | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [historyRows, setHistoryRows] = useState<StockMovement[]>([]);
  const [lotsOpen, setLotsOpen] = useState(false);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotSaving, setLotSaving] = useState(false);
  const [lotsItem, setLotsItem] = useState<StockItem | null>(null);
  const [lotRows, setLotRows] = useState<StockLot[]>([]);
  const [lotForm, setLotForm] = useState({
    lotCode: '',
    quantity: null as number | null,
    expiryDate: null as Date | null,
    unitPrice: null as number | null,
    supplier: '',
    notes: '',
  });
  const [movementForm, setMovementForm] = useState({
    type: 'ENTRY' as 'ENTRY' | 'EXIT' | 'ADJUSTMENT',
    quantity: null as number | null,
    reason: '',
    notes: '',
  });

  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const isDarkMode = useComputedColorScheme('light') === 'dark';

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

  const filteredKits = kits.filter((kit) => {
    const q = kitQuery.trim().toLowerCase();
    if (!q) return true;
    const name = String(kit.name || '').toLowerCase();
    const description = String(kit.description || '').toLowerCase();
    return name.includes(q) || description.includes(q);
  });

  const paginatedItems = filtered.slice((itemsPage - 1) * itemsPageSize, itemsPage * itemsPageSize);
  const paginatedKits = filteredKits.slice((kitsPage - 1) * kitsPageSize, kitsPage * kitsPageSize);

  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    categoria: '',
    unidade: '',
    quantidade: null as number | null,
    minimo: null as number | null,
    maximo: null as number | null,
    precoUnitario: null as number | null,
    validade: null as Date | null,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});

  // date input helpers
  const [dateInput, setDateInput] = useState('');

  const formatDate = (d: Date | null | undefined) => {
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
  useEffect(() => {
    if (!inventoryItems) return;

    const mapped: StockItem[] = inventoryItems.map((it: any) => ({
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
  }, [inventoryItems]);

  useEffect(() => {
    if (!inventoryError) return;
    const err: any = inventoryError;
    const msg = resolveApiErrorMessage(err, 'Erro ao carregar itens');
    setItemErrorTitle('Erro ao carregar itens');
    setItemErrorMessage(msg);
    setShowItemErrorModal(true);
    showNotification({ title: 'Erro', message: msg, color: 'red' });
  }, [inventoryError]);

  useEffect(() => {
    setItemsPage(1);
  }, [query, category, itemsPageSize, items.length]);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(filtered.length / itemsPageSize));
    if (itemsPage > total) setItemsPage(total);
  }, [filtered.length, itemsPage, itemsPageSize]);

  useEffect(() => {
    setKitsPage(1);
  }, [kitQuery, kitsPageSize, kits.length]);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredKits.length / kitsPageSize));
    if (kitsPage > total) setKitsPage(total);
  }, [filteredKits.length, kitsPage, kitsPageSize]);

  const loadKits = async () => {
    setKitsLoading(true);
    try {
      const data = await inventoryService.getKits({ limit: 200, offset: 0 });
      setKits(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao carregar kits',
        message: resolveApiErrorMessage(err, 'Não foi possível carregar os kits de insumos.'),
        color: 'red',
      });
    } finally {
      setKitsLoading(false);
    }
  };

  useEffect(() => {
    void loadKits();
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

  const formatMovementType = (value?: string) => {
    const normalized = String(value || '').toUpperCase();
    if (normalized === 'ENTRY') return 'Entrada';
    if (normalized === 'EXIT') return 'Saída';
    if (normalized === 'ADJUSTMENT') return 'Ajuste';
    return humanize(value);
  };

  const isExpiringSoon = (value?: string) => {
    if (!value || value === '-') return false;
    const parsed = parseDate(value);
    if (!parsed) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expiry = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const openMovement = (item: StockItem) => {
    setMovementItem(item);
    setMovementForm({ type: 'ENTRY', quantity: null, reason: '', notes: '' });
    setMovementOpen(true);
  };

  const openHistory = async (item: StockItem) => {
    setHistoryItem(item);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await inventoryService.getMovements(item.id, { limit: 100, offset: 0 });
      setHistoryRows(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao carregar histórico',
        message: resolveApiErrorMessage(err, 'Não foi possível carregar as movimentações.'),
        color: 'red',
      });
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openLots = async (item: StockItem) => {
    setLotsItem(item);
    setLotsOpen(true);
    setLotsLoading(true);
    setLotForm({
      lotCode: '',
      quantity: null,
      expiryDate: null,
      unitPrice: null,
      supplier: '',
      notes: '',
    });
    try {
      const data = await inventoryService.getLots(item.id, { limit: 200, offset: 0 });
      setLotRows(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao carregar lotes',
        message: resolveApiErrorMessage(err, 'Não foi possível carregar os lotes desse item.'),
        color: 'red',
      });
      setLotRows([]);
    } finally {
      setLotsLoading(false);
    }
  };

  const handleCreateMovement = async () => {
    if (!movementItem) return;
    const qty = normalizeNumber(movementForm.quantity);
    if (!qty || qty <= 0) {
      showNotification({ title: 'Quantidade inválida', message: 'Informe uma quantidade maior que zero.', color: 'red' });
      return;
    }
    if (!movementForm.reason.trim()) {
      showNotification({ title: 'Motivo obrigatório', message: 'Descreva o motivo da movimentação.', color: 'red' });
      return;
    }

    setMovementSaving(true);
    try {
      const data = await inventoryService.createMovement(movementItem.id, {
        type: movementForm.type,
        quantity: qty,
        reason: movementForm.reason.trim(),
        notes: movementForm.notes.trim() || undefined,
      });
      const updated = data?.item;
      if (updated?.id) {
        setItems((prev) => prev.map((p) => (String(p.id) === String(updated.id)
          ? {
            ...p,
            quantidade: Number(updated.quantity ?? p.quantidade),
            minimo: Number(updated.minQuantity ?? p.minimo),
            maximo: Number(updated.maxQuantity ?? p.maximo),
            status: updated.status ? String(updated.status).toUpperCase() : p.status,
          }
          : p)));
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems });
      showNotification({ title: 'Movimentação registrada', message: 'Estoque atualizado com sucesso.', color: 'green' });
      setMovementOpen(false);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao movimentar',
        message: resolveApiErrorMessage(err, 'Não foi possível registrar a movimentação.'),
        color: 'red',
      });
    } finally {
      setMovementSaving(false);
    }
  };

  const handleCreateLot = async () => {
    if (!lotsItem) return;
    const quantity = normalizeNumber(lotForm.quantity);
    if (!lotForm.lotCode.trim()) {
      showNotification({ title: 'Lote obrigatório', message: 'Informe o código do lote.', color: 'red' });
      return;
    }
    if (!quantity || quantity <= 0) {
      showNotification({ title: 'Quantidade inválida', message: 'Informe uma quantidade maior que zero.', color: 'red' });
      return;
    }

    setLotSaving(true);
    try {
      const payload = {
        lotCode: lotForm.lotCode.trim(),
        quantity,
        expiryDate: formatISODate(lotForm.expiryDate),
        unitPrice: normalizeNumber(lotForm.unitPrice) ?? undefined,
        supplier: lotForm.supplier.trim() || undefined,
        notes: lotForm.notes.trim() || undefined,
      };
      const data = await inventoryService.createLot(lotsItem.id, payload);

      if (data?.lot) {
        setLotRows((prev) => [data.lot, ...prev]);
      }

      const updated = data?.item;
      if (updated?.id) {
        setItems((prev) => prev.map((p) => (String(p.id) === String(updated.id)
          ? {
            ...p,
            quantidade: Number(updated.quantity ?? p.quantidade),
            minimo: Number(updated.minQuantity ?? p.minimo),
            maximo: Number(updated.maxQuantity ?? p.maximo),
            status: updated.status ? String(updated.status).toUpperCase() : p.status,
            validade: updated.expiryDate ? (new Date(updated.expiryDate)).toLocaleDateString('en-GB') : p.validade,
          }
          : p)));
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems });
      showNotification({ title: 'Lote cadastrado', message: 'Lote registrado e estoque atualizado.', color: 'green' });
      setLotForm({
        lotCode: '',
        quantity: null,
        expiryDate: null,
        unitPrice: null,
        supplier: '',
        notes: '',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro ao cadastrar lote',
        message: resolveApiErrorMessage(err, 'Não foi possível cadastrar o lote.'),
        color: 'red',
      });
    } finally {
      setLotSaving(false);
    }
  };

  const handleAddItemToKitDraft = () => {
    const selectedItemId = kitForm.selectedItemId;
    if (!selectedItemId) return;
    const quantity = normalizeNumber(kitForm.selectedQuantity);
    if (!quantity || quantity <= 0) {
      showNotification({
        title: 'Quantidade inválida',
        message: 'Informe uma quantidade maior que zero para o item do kit.',
        color: 'red',
      });
      return;
    }

    setKitForm((prev) => {
      const existing = prev.items.find((item) => item.inventoryItemId === selectedItemId);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((item) => (
            item.inventoryItemId === selectedItemId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )),
          selectedItemId: null,
          selectedQuantity: 1,
        };
      }
      return {
        ...prev,
        items: [...prev.items, { inventoryItemId: selectedItemId, quantity }],
        selectedItemId: null,
        selectedQuantity: 1,
      };
    });
  };

  const handleRemoveItemFromKitDraft = (inventoryItemId: string) => {
    setKitForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.inventoryItemId !== inventoryItemId),
    }));
  };


  const handleChangeKitDraftItemQuantityByStep = (inventoryItemId: string, delta: number) => {
    setKitForm((prev) => {
      const found = prev.items.find((item) => item.inventoryItemId === inventoryItemId);
      if (!found) return prev;
      const nextQty = Math.floor(Number(found.quantity || 0) + delta);
      if (nextQty <= 0) {
        return {
          ...prev,
          items: prev.items.filter((item) => item.inventoryItemId !== inventoryItemId),
        };
      }
      return {
        ...prev,
        items: prev.items.map((item) => (
          item.inventoryItemId === inventoryItemId
            ? { ...item, quantity: nextQty }
            : item
        )),
      };
    });
  };

  const resetKitForm = () => {
    setKitForm({
      name: '',
      description: '',
      selectedItemId: null,
      selectedQuantity: 1,
      items: [],
    });
    setEditingKitId(null);
  };

  const openCreateKit = () => {
    resetKitForm();
    setKitModalOpen(true);
  };

  const openEditKit = (kit: StockKit) => {
    setEditingKitId(kit.id);
    setKitForm({
      name: String(kit.name || ''),
      description: String(kit.description || ''),
      selectedItemId: null,
      selectedQuantity: 1,
      items: Array.isArray(kit.items)
        ? kit.items
          .map((item) => ({
            inventoryItemId: String(item.inventoryItemId || '').trim(),
            quantity: Number(item.quantity || 0),
          }))
          .filter((item) => item.inventoryItemId && Number.isFinite(item.quantity) && item.quantity > 0)
        : [],
    });
    setKitModalOpen(true);
  };

  const handleSaveKit = async () => {
    const normalizedItems = kitForm.items
      .map((item) => ({
        inventoryItemId: String(item.inventoryItemId || '').trim(),
        quantity: Math.floor(Number(item.quantity || 0)),
      }))
      .filter((item) => item.inventoryItemId && Number.isFinite(item.quantity) && item.quantity > 0);

    if (editingKitId) {
      setKitSaving(true);
      try {
        if (!normalizedItems.length) {
          await inventoryService.updateKit(editingKitId, { isActive: false, items: [] });
          showNotification({ title: 'Kit inativado', message: 'Kit removido da listagem por não ter itens com quantidade.', color: 'green' });
          resetKitForm();
          setKitModalOpen(false);
          await loadKits();
          return;
        }

        await inventoryService.updateKit(editingKitId, {
          name: kitForm.name.trim() || undefined,
          description: kitForm.description.trim() || undefined,
          items: normalizedItems,
        });

        showNotification({ title: 'Kit atualizado', message: 'Quantidade dos itens atualizada com sucesso.', color: 'green' });
        resetKitForm();
        setKitModalOpen(false);
        await loadKits();
      } catch (err: any) {
        showNotification({
          title: 'Erro ao atualizar kit',
          message: resolveApiErrorMessage(err, 'Não foi possível atualizar o kit.'),
          color: 'red',
        });
      } finally {
        setKitSaving(false);
      }
      return;
    }

    const name = kitForm.name.trim();
    if (!name) {
      showNotification({ title: 'Nome obrigatório', message: 'Informe o nome do kit.', color: 'red' });
      return;
    }
    if (!normalizedItems.length) {
      showNotification({ title: 'Kit vazio', message: 'Adicione ao menos 1 item ao kit.', color: 'red' });
      return;
    }

    setKitSaving(true);
    try {
      const payload = {
        name,
        description: kitForm.description.trim() || undefined,
        items: normalizedItems,
      };

      await inventoryService.createKit(payload);

      showNotification({
        title: editingKitId ? 'Kit atualizado' : 'Kit cadastrado',
        message: editingKitId ? 'Kit atualizado com sucesso.' : 'Kit salvo com sucesso.',
        color: 'green',
      });
      resetKitForm();
      setKitModalOpen(false);
      await loadKits();
    } catch (err: any) {
      showNotification({
        title: 'Erro ao cadastrar kit',
        message: resolveApiErrorMessage(err, 'Não foi possível cadastrar o kit.'),
        color: 'red',
      });
    } finally {
      setKitSaving(false);
    }
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

  const getAvailableKitsCount = (kit: StockKit) => {
    const kitItems = Array.isArray(kit.items) ? kit.items : [];
    if (!kitItems.length) return 0;

    // Business rule: this value is manually controlled in kit editing.
    // Use the smallest configured qty among kit items as the remaining kits counter.
    const configuredCounts = kitItems
      .map((item) => Math.floor(Number(item.quantity || 0)))
      .filter((qty) => Number.isFinite(qty) && qty > 0);

    if (!configuredCounts.length) return 0;
    return Math.min(...configuredCounts);
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
        validade: it.validade ? (parseDate(it.validade) ?? null) : null,
      });
      setDateInput(it.validade || '');
    } else {
      setEditingId(null);
      setForm({ codigo: '', nome: '', categoria: '', unidade: '', quantidade: null, minimo: null, maximo: null, precoUnitario: null, validade: null });
      setDateInput('');
    }
    setModalOpen(true);
  };

  const formatISODate = (d?: Date | null) => {
    if (!d) return undefined;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatExpiryFromApi = (raw?: string | null, fallback?: string) => {
    if (!raw) return fallback;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toLocaleDateString('en-GB');
  };

  const isUpdateRouteMissingError = (err: any) => {
    const raw = String(
      err?.response?.data?.originalMessage
      || err?.response?.data?.message
      || err?.message
      || '',
    ).toLowerCase();
    return raw.includes('route put:/admin/inventory/') && raw.includes('not found');
  };
  const isMovementRouteMissingError = (err: any) => {
    const raw = String(
      err?.response?.data?.originalMessage
      || err?.response?.data?.message
      || err?.message
      || '',
    ).toLowerCase();
    return raw.includes('/admin/inventory/') && raw.includes('/movements/') && raw.includes('not found');
  };

  const handleAddOrUpdate = async () => {
    if (editingId && inventoryEditUnavailable) {
      setItemErrorTitle('Edição indisponível');
      setItemErrorMessage('O backend deste ambiente não possui rotas para atualizar item de estoque. Solicite a habilitação de edição e movimentação no backend para salvar alterações.');
      setShowItemErrorModal(true);
      return;
    }

    let stage = 'init';
    // clear previous field errors
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!form.nome || !form.nome.trim()) errors.name = 'Nome do item é obrigatório';
    if (!form.codigo || !form.codigo.trim()) errors.code = 'Código é obrigatório';
    // validade opcional, mas se digitada deve ser válida
    if (dateInput && !form.validade) errors.expiryDate = 'Validade inválida';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showNotification({ title: 'Erro', message: 'Preencha os campos obrigatórios', color: 'red' });
      return;
    }

    setSavingItem(true);

    try {
      if (editingId) {
        stage = 'edit:start';
        console.info('[Estoque] iniciando update', { editingId });
        const currentItem = items.find((item) => item.id === editingId) || null;
        const desiredQuantity = normalizeNumber(form.quantidade) ?? 0;
        const currentQuantity = normalizeNumber(currentItem?.quantidade) ?? 0;
        const quantityDelta = desiredQuantity - currentQuantity;
        const payload = {
          name: form.nome,
          code: form.codigo || undefined,
          category: form.categoria || '',
          unit: form.unidade || '',
          quantity: currentQuantity,
          minQuantity: normalizeNumber(form.minimo) ?? 0,
          maxQuantity: normalizeNumber(form.maximo) ?? 0,
          unitPrice: normalizeNumber(form.precoUnitario) ?? 0,
          expiryDate: formatISODate(form.validade),
        };

        console.info('[Estoque] payload update pronto', payload);
        stage = 'edit:updateItem';
        let updated: any = null;
        let metadataUpdated = true;
        let quantityUpdated = quantityDelta === 0;
        try {
          updated = await inventoryService.updateItem(editingId, payload);
          console.info('[Estoque] update concluido', updated);
        } catch (updateErr: any) {
          if (!isUpdateRouteMissingError(updateErr)) throw updateErr;
          setInventoryEditUnavailable(true);
          throw new Error('Edição indisponível neste ambiente: backend sem rota de atualização de estoque.');
        }

        if (quantityDelta !== 0) {
          try {
            stage = 'edit:createMovement';
            await inventoryService.createMovement(editingId, {
              type: quantityDelta > 0 ? 'ENTRY' : 'EXIT',
              quantity: Math.abs(quantityDelta),
              reason: 'Ajuste de quantidade via edição do item',
              notes: 'Movimentação automática ao atualizar quantidade no cadastro.',
            });
            quantityUpdated = true;
          } catch (movementErr: any) {
            if (isMovementRouteMissingError(movementErr)) setInventoryEditUnavailable(true);
            quantityUpdated = false;
            showNotification({
              title: 'Quantidade não atualizada',
              message: resolveApiErrorMessage(movementErr, 'O item foi atualizado, mas não foi possível ajustar a quantidade automaticamente. Use "Movimentar" para concluir o ajuste.'),
              color: 'yellow',
            });
          }
        }

        if (!metadataUpdated && !quantityUpdated) {
          throw new Error('Não foi possível salvar as alterações: o backend não possui rota de edição nem de movimentação para este item.');
        }

        stage = 'edit:setItems';
        setItems((prev) => prev.map((p) => p.id === editingId ? ({
          ...p,
          nome: metadataUpdated ? (updated.name ?? p.nome) : p.nome,
          codigo: metadataUpdated ? (updated.code ?? p.codigo) : p.codigo,
          categoria: metadataUpdated ? (updated.category ?? p.categoria) : p.categoria,
          unidade: metadataUpdated ? (updated.unit ?? p.unidade) : p.unidade,
          quantidade: quantityUpdated ? desiredQuantity : p.quantidade,
          minimo: metadataUpdated ? (updated.minQuantity ?? p.minimo) : p.minimo,
          maximo: metadataUpdated ? (updated.maxQuantity ?? p.maximo) : p.maximo,
          precoUnitario: metadataUpdated ? parseNumber(updated.unitPrice ?? updated.unitPrice ?? p.precoUnitario) : p.precoUnitario,
          validade: metadataUpdated ? formatExpiryFromApi(updated.expiryDate, p.validade) : p.validade,
          status: metadataUpdated
            ? (updated.status ? String(updated.status).toUpperCase() : ((quantityUpdated ? desiredQuantity : p.quantidade) <= (updated.minQuantity ?? p.minimo) ? 'LOW' : 'AVAILABLE'))
            : ((quantityUpdated ? desiredQuantity : p.quantidade) <= (p.minimo ?? 0) ? 'LOW' : 'AVAILABLE'),
        }) : p));

        setLastItemAction('updated');
        setLastCreatedItemName(updated.name || form.nome);
        setModalOpen(false);
        setShowItemSuccessModal(true);
        stage = 'edit:invalidateQueries';
        await queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems });
      } else {
        stage = 'create:start';
        const existingByCode = items.find((it) => it.codigo.trim().toLowerCase() === form.codigo.trim().toLowerCase());

        if (existingByCode) {
          const qtyToAdd = normalizeNumber(form.quantidade) ?? 0;
          const mergedQuantity = (existingByCode.quantidade ?? 0) + qtyToAdd;
          const mergedMin = normalizeNumber(form.minimo) ?? existingByCode.minimo ?? 0;
          const mergedPayload = {
            name: form.nome || existingByCode.nome,
            code: form.codigo,
            category: form.categoria || existingByCode.categoria || '',
            unit: form.unidade || existingByCode.unidade || '',
            quantity: mergedQuantity,
            minQuantity: mergedMin,
            maxQuantity: normalizeNumber(form.maximo) ?? existingByCode.maximo ?? 0,
            unitPrice: normalizeNumber(form.precoUnitario) ?? existingByCode.precoUnitario ?? 0,
            expiryDate: formatISODate(form.validade) || undefined,
            notes: undefined,
          };

          const updated = await inventoryService.updateItem(existingByCode.id, mergedPayload);

          setItems((prev) => prev.map((p) => p.id === existingByCode.id ? ({
            ...p,
            nome: updated.name ?? p.nome,
            codigo: updated.code ?? p.codigo,
            categoria: updated.category ?? p.categoria,
            unidade: updated.unit ?? p.unidade,
            quantidade: updated.quantity ?? p.quantidade,
            minimo: updated.minQuantity ?? p.minimo,
            maximo: updated.maxQuantity ?? p.maximo,
            precoUnitario: parseNumber(updated.unitPrice ?? p.precoUnitario),
            validade: updated.expiryDate ? (new Date(updated.expiryDate)).toLocaleDateString('en-GB') : p.validade,
            status: updated.status ? String(updated.status).toUpperCase() : ((updated.quantity ?? p.quantidade) <= (updated.minQuantity ?? p.minimo) ? 'LOW' : 'AVAILABLE'),
          }) : p));

          setLastItemAction('updated');
          setLastCreatedItemName(updated.name || form.nome);
          setModalOpen(false);
          setShowItemSuccessModal(true);
          await queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems });
          showNotification({
            title: 'Quantidade atualizada',
            message: `Item já existente. Quantidade somada em ${qtyToAdd}.`,
            color: 'blue',
          });
          return;
        }

        const payload = {
          code: form.codigo,
          name: form.nome,
          category: form.categoria || '',
          unit: form.unidade || '',
          quantity: normalizeNumber(form.quantidade) ?? 0,
          minQuantity: normalizeNumber(form.minimo) ?? 0,
          maxQuantity: normalizeNumber(form.maximo) ?? 0,
          unitPrice: normalizeNumber(form.precoUnitario) ?? 0,
          expiryDate: formatISODate(form.validade),
          notes: '',
        };

        const created = await inventoryService.createItem(payload);

        const newItem: StockItem = {
          id: created.id ? String(created.id) : `tmp-${Date.now()}`,
          codigo: created.code || form.codigo,
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
        await queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems });
      }
    } catch (err: any) {
      console.error('[Estoque] erro ao salvar item', { stage, err });

      // if backend returned per-field errors, map them to the form
      const serverFields: Record<string,string> | undefined = err?.response?.data?.fields;
      if (serverFields && typeof serverFields === 'object') {
        setFieldErrors(serverFields);
      }

      const responseData = err?.response?.data;
      const rawServerMessage = String(
        responseData?.originalMessage
        || responseData?.originalError
        || responseData?.originalDetail
        || responseData?.message
        || responseData?.error
        || responseData?.detail
        || '',
      ).trim();
      const msg = err?.response
        ? (rawServerMessage || resolveApiErrorMessage(err, 'Erro ao salvar item'))
        : (String(err?.message || err || '').trim() || 'Erro ao salvar item');
      const isControlledUnavailable = String(msg).toLowerCase().includes('edição indisponível neste ambiente');
      const debugStage = stage && !isControlledUnavailable ? `Etapa: ${stage}. ` : '';
      const finalMsg = `${debugStage}${msg}`.trim();
      // fallback to toast for some errors but also show error modal
      setItemErrorTitle('Erro ao salvar item');
      setItemErrorMessage(finalMsg);
      setShowItemErrorModal(true);
      showNotification({ title: 'Erro', message: finalMsg, color: 'red' });
    } finally {
      setSavingItem(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 24} justify="space-between" align="flex-start" wrap="wrap">
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Estoque
              </Text>
              <Text size="sm" c="dimmed">
                Cadastrar materiais
              </Text>
            </Box>
          </Group>

          <Button bg={DARK_BLUE} c="white" leftSection={<Plus size={16} />} onClick={() => openCadastrar()} size={isMobile ? 'sm' : 'md'}>
            Novo item
          </Button>
        </Group>

        {activeTab === 'hub' ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {[
              {
                key: 'itens',
                icon: Package,
                title: 'Itens',
                desc: 'Cadastre e gerencie os itens do estoque com controle de validade e movimentação.',
                onClick: () => setActiveTab('itens'),
              },
              {
                key: 'kits',
                icon: PackageOpen,
                title: 'Kits de insumos',
                desc: 'Monte kits com itens do estoque para uso rápido nos procedimentos.',
                onClick: () => setActiveTab('kits'),
              },
            ].map((card) => (
              <Paper
                key={card.key}
                p="lg"
                withBorder
                onClick={card.onClick}
                style={{ cursor: 'pointer', borderColor: 'var(--mantine-color-default-border)', minHeight: 96 }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <Box
                      w={44}
                      h={44}
                      style={{
                        borderRadius: 10,
                        border: `1px solid ${isDarkMode ? '#dbe7ff' : DARK_BLUE}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <card.icon size={22} color={isDarkMode ? '#dbe7ff' : DARK_BLUE} />
                    </Box>
                    <Box style={{ minWidth: 0 }}>
                      <Text fw={600} size="md" lineClamp={1}>{card.title}</Text>
                      <Text size="sm" c="dimmed" lineClamp={2}>{card.desc}</Text>
                    </Box>
                  </Group>
                  <ChevronRight size={18} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        ) : (
          <>
            <Group justify="space-between" align="center" mb="lg" wrap="wrap">
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<ChevronLeft size={16} />}
                  onClick={() => setActiveTab('hub')}
                >
                  Voltar
                </Button>
                <Text fw={600}>{activeTab === 'itens' ? 'Itens de estoque' : 'Kits de insumos'}</Text>
              </Group>
            </Group>

          {activeTab === 'itens' && (
            <>
            <Group mb={isMobile ? 20 : 30} align="flex-end" wrap="wrap" grow>
              <FloatingInput
                label="Buscar itens"
                placeholder={isMobile ? 'Buscar...' : 'Buscar item por nome ou código...'}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                containerProps={{ style: { flex: isMobile ? '1 1 100%' : '1 1 360px' } }}
              />
              <FloatingSelect
                data={[{ value: 'all', label: 'Todas as categorias' }, ...categoriesOptions]}
                value={category || 'all'}
                onChange={(val) => setCategory(val || '')}
                label="Categoria"
                placeholder="Todas as categorias"
                containerProps={{ style: { flex: isMobile ? '1 1 100%' : '0 0 280px' } }}
              />
            </Group>

            {itemsLoading ? (
              <Stack gap="sm">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Paper key={index} withBorder radius="md" p="md">
                    <Stack gap="sm">
                      <Skeleton height={20} width="30%" radius="xl" />
                      <Skeleton height={16} width="100%" radius="xl" />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <PaginatedGrid
                totalItems={filtered.length}
                page={itemsPage}
                pageSize={itemsPageSize}
                onPageChange={setItemsPage}
                onPageSizeChange={setItemsPageSize}
                isMobile={isMobile}
                maxHeight={isMobile ? 500 : 620}
                showFooter
              >
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
                      <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, width: 96, textAlign: 'center' }}>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filtered.length > 0 ? paginatedItems.map((it) => (
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
                    <Badge variant="light" color="blue" radius="xl">{formatCategory(it.categoria)}</Badge>
                  </Table.Td>
                )}

                {!isTablet && (
                  <Table.Td>
                    <Group gap={6}>
                      <Badge variant="light" color={String(it.status).toUpperCase() === 'LOW' ? 'yellow' : String(it.status).toUpperCase() === 'OUT_OF_STOCK' ? 'red' : String(it.status).toUpperCase() === 'EXPIRED' ? 'grape' : 'green'} radius="xl">
                        {formatStatus(it.status)}
                      </Badge>
                      {it.quantidade <= it.minimo ? <Badge variant="outline" color="orange" radius="xl">Baixo estoque</Badge> : null}
                      {isExpiringSoon(it.validade) ? <Badge variant="outline" color="yellow" radius="xl">Vencendo</Badge> : null}
                    </Group>
                  </Table.Td>
                )}
                <Table.Td style={{ textAlign: 'center' }}>
                  <Group justify="center">
                    <Menu shadow="md" width={220} position="bottom" withArrow>
                      <Menu.Target>
                        <ActionIcon variant="light" size="sm" aria-label={`Ações de ${it.nome}`}>
                          <MoreVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<ArrowUpDown size={14} />} onClick={() => openMovement(it)}>
                          Movimentar
                        </Menu.Item>
                        <Menu.Item leftSection={<Boxes size={14} />} onClick={() => { void openLots(it); }}>
                          Gerenciar lotes
                        </Menu.Item>
                        <Menu.Item leftSection={<History size={14} />} onClick={() => { void openHistory(it); }}>
                          Ver histórico
                        </Menu.Item>
                        <Menu.Item leftSection={<Pencil size={14} />} onClick={() => openCadastrar(it)}>
                          Editar item
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Table.Td>
                  </Table.Tr>
                    )) : (
                      <Table.Tr>
                        <Table.Td colSpan={isTablet ? 5 : 11}>
                          <Stack align="center" py="xl" gap={6}>
                            <Text fw={600}>Nenhum item encontrado</Text>
                            <Text c="dimmed" size="sm" ta="center">
                              Cadastre um novo item ou ajuste os filtros para localizar materiais no estoque.
                            </Text>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </PaginatedGrid>
            )}
            </>
          )}

          {activeTab === 'kits' && (
            <Stack gap="md">
              <Group justify="space-between" align="flex-end" wrap="wrap">
                <FloatingInput
                  label="Buscar kits"
                  placeholder="Nome ou descrição do kit"
                  value={kitQuery}
                  onChange={(event) => setKitQuery(event.currentTarget.value)}
                  containerProps={{ style: { flex: isMobile ? '1 1 100%' : '1 1 360px' } }}
                />
                <Button
                  bg={DARK_BLUE}
                  c="white"
                  leftSection={<Plus size={16} />}
                  onClick={openCreateKit}
                >
                  Novo kit
                </Button>
              </Group>

              <Text size="sm" c="dimmed">
                O kit é cadastrado no estoque. O convênio é definido no vínculo do kit com o procedimento.
              </Text>

              {kitsLoading ? (
                <Stack gap="sm">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Paper key={index} withBorder radius="md" p="md">
                      <Stack gap="sm">
                        <Skeleton height={20} width="35%" radius="xl" />
                        <Skeleton height={16} width="100%" radius="xl" />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <PaginatedGrid
                  totalItems={filteredKits.length}
                  page={kitsPage}
                  pageSize={kitsPageSize}
                  onPageChange={setKitsPage}
                  onPageSizeChange={setKitsPageSize}
                  isMobile={isMobile}
                  maxHeight={isMobile ? 500 : 620}
                  showFooter
                >
                  <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                    <Table.Thead>
                      <Table.Tr style={{ borderBottom: 'none' }}>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Kit</Table.Th>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Descrição</Table.Th>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Itens</Table.Th>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Kits possíveis</Table.Th>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                        <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center' }}>Ações</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredKits.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={7}>
                            <Stack align="center" py="xl" gap={6}>
                              <Text fw={600}>Nenhum kit encontrado</Text>
                              <Text c="dimmed" size="sm" ta="center">
                                Cadastre um novo kit ou ajuste a busca para localizar kits já cadastrados.
                              </Text>
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      ) : paginatedKits.map((kit) => (
                        <Table.Tr key={kit.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                          <Table.Td>
                            <Text size="sm" fw={600}>{kit.name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{kit.description || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color="blue" radius="xl">
                              {Array.isArray(kit.items) ? kit.items.length : 0} item(ns)
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={getAvailableKitsCount(kit) > 0 ? 'teal' : 'red'} radius="xl">
                              {getAvailableKitsCount(kit)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">Definido no procedimento</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={kit.isActive ? 'green' : 'gray'} radius="xl">
                              {kit.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <ActionIcon variant="light" size="sm" onClick={() => openEditKit(kit)} aria-label={`Editar kit ${kit.name}`}>
                              <Pencil size={14} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </PaginatedGrid>
              )}
            </Stack>
          )}
          </>
        )}
      </Box>

      <Modal
        opened={kitModalOpen}
        onClose={() => { setKitModalOpen(false); resetKitForm(); }}
        title={editingKitId ? 'Editar kit de insumos' : 'Cadastrar kit de insumos'}
        size={isMobile ? '100%' : 760}
        centered
        fullScreen={isMobile}
      >
        <Stack gap="lg">
          {!editingKitId ? (
            <>
              <Text size="sm" c="dimmed">
                O convênio não é definido no cadastro do kit. Esse vínculo é feito por procedimento.
              </Text>

              <Paper withBorder radius="md" p="md">
                <Stack gap="md">
                  <Text fw={700} size="sm" c="var(--mantine-color-text)">Dados do kit</Text>
                  <FloatingInput
                    label="Nome do kit"
                    value={kitForm.name}
                    onChange={(event) => {
                      const { value } = event.currentTarget;
                      setKitForm((prev) => ({ ...prev, name: value }));
                    }}
                  />
                  <FloatingInput
                    label="Descrição"
                    value={kitForm.description}
                    onChange={(event) => {
                      const { value } = event.currentTarget;
                      setKitForm((prev) => ({ ...prev, description: value }));
                    }}
                  />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <FloatingSelect
                  label="Item"
                      data={items.map((item) => ({ value: item.id, label: item.codigo ? `${item.nome} (${item.codigo})` : item.nome }))}
                      value={kitForm.selectedItemId}
                      onChange={(value) => setKitForm((prev) => ({ ...prev, selectedItemId: value }))}
                      searchable
                      clearable
                    />
                <FloatingNumberInput
                  label="Qtd por kit"
                  min={1}
                  value={kitForm.selectedQuantity}
                  onChange={(value) => setKitForm((prev) => ({ ...prev, selectedQuantity: typeof value === 'number' ? value : '' }))}
                />
              </SimpleGrid>
                  <Group justify="flex-end">
                    <Button variant="light" onClick={handleAddItemToKitDraft}>Adicionar item</Button>
                  </Group>
                </Stack>
              </Paper>
            </>
          ) : null}

          <Paper withBorder radius="md" p="md">
            <Stack gap="sm">
              <Text fw={700} size="sm" c="var(--mantine-color-text)">Itens do kit</Text>
              <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                <Table horizontalSpacing="sm" verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Item</Table.Th>
                      <Table.Th>Qtd</Table.Th>
                      <Table.Th style={{ width: 70 }}>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {kitForm.items.length === 0 ? (
                      <Table.Tr><Table.Td colSpan={3}><Text size="sm" c="dimmed" ta="center">Nenhum item no kit</Text></Table.Td></Table.Tr>
                    ) : kitForm.items.map((item) => {
                      const meta = items.find((it) => it.id === item.inventoryItemId);
                      const label = meta ? (meta.codigo ? `${meta.nome} (${meta.codigo})` : meta.nome) : item.inventoryItemId;
                      return (
                        <Table.Tr key={item.inventoryItemId}>
                          <Table.Td>{label}</Table.Td>
                          <Table.Td>
                            {editingKitId ? (
                              <Group gap={8} wrap="nowrap">
                                <ActionIcon
                                  variant="light"
                                  color="gray"
                                  onClick={() => handleChangeKitDraftItemQuantityByStep(item.inventoryItemId, -1)}
                                  aria-label="Diminuir quantidade"
                                >
                                  <Minus size={14} />
                                </ActionIcon>
                                <Text fw={600} miw={24} ta="center">{item.quantity}</Text>
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  onClick={() => handleChangeKitDraftItemQuantityByStep(item.inventoryItemId, 1)}
                                  aria-label="Aumentar quantidade"
                                >
                                  <Plus size={14} />
                                </ActionIcon>
                              </Group>
                            ) : item.quantity}
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon variant="subtle" color="red" onClick={() => handleRemoveItemFromKitDraft(item.inventoryItemId)}>
                              <X size={14} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Box>
            </Stack>
          </Paper>

          <Divider />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { setKitModalOpen(false); resetKitForm(); }}>Cancelar</Button>
            <Button
              bg={DARK_BLUE}
              loading={kitSaving}
              onClick={() => {
                void handleSaveKit();
              }}
            >
              {editingKitId ? 'Atualizar kit' : 'Salvar kit'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar item' : 'Cadastrar item'}
        size={isMobile ? '100%' : 760}
        centered
        fullScreen={isMobile}
      >
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>Dados do item</Text>
            <Text size="xs" c="dimmed">Campos com * são obrigatórios</Text>
          </Group>

          <Paper withBorder radius="md" p="md">
            <Stack gap="md">
              <Text fw={700} size="sm">Identificação</Text>
              <FloatingInput
                label={<><span>Nome do item</span><span style={{ color: '#fa5252' }}> *</span></>}
                value={form.nome}
                onChange={(e) => { setForm({ ...form, nome: e.currentTarget.value }); setFieldErrors((prev) => { const { name, ...rest } = prev; return rest; }); }}
                error={fieldErrors.name}
              />
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                <FloatingInput
                  label={<><span>Código</span><span style={{ color: '#fa5252' }}> *</span></>}
                  value={form.codigo}
                  onChange={(e) => { setForm({ ...form, codigo: e.currentTarget.value }); setFieldErrors((prev) => { const { code, ...rest } = prev; return rest; }); }}
                  error={fieldErrors.code}
                />
                <FloatingSelect data={categoriesOptions} value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v || '' })} label="Categoria" placeholder="Categoria" />
                <FloatingSelect data={[{ value: 'un', label: 'un' }, { value: 'cx', label: 'cx' }, { value: 'ml', label: 'ml' }]} value={form.unidade} onChange={(v) => setForm({ ...form, unidade: v || '' })} label="Unidade" placeholder="Unidade" />
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper withBorder radius="md" p="md">
            <Stack gap="md">
              <Text fw={700} size="sm">Controle de estoque</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <FloatingNumberInput
                  value={form.quantidade ?? undefined}
                  onChange={(val) => setForm({ ...form, quantidade: normalizeNumber(val) })}
                  label="Quantidade atual"
                  placeholder="Quantidade atual"
                  min={0}
                />
                <FloatingNumberInput value={form.precoUnitario ?? undefined} onChange={(val) => setForm({ ...form, precoUnitario: normalizeNumber(val) })} label="Preço unitário" placeholder="Preço unitário" min={0} step={0.01} />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                <FloatingNumberInput value={form.minimo ?? undefined} onChange={(val) => setForm({ ...form, minimo: normalizeNumber(val) })} label="Quant. mínima" placeholder="Quant. mínima" min={0} />
                <FloatingNumberInput value={form.maximo ?? undefined} onChange={(val) => setForm({ ...form, maximo: normalizeNumber(val) })} label="Quant. máxima" placeholder="Quant. máxima" min={0} />
                <FloatingDateInput
                  label="Validade"
                  value={form.validade}
                  onChange={(val) => {
                    const date = val ?? null;
                    setForm({ ...form, validade: date });
                    setDateInput(date ? formatDate(date) : '');
                    setFieldErrors((prev) => { const { expiryDate, ...rest } = prev; return rest; });
                  }}
                  valueFormat="DD/MM/YYYY"
                  clearable={false}
                />
              </SimpleGrid>
              {fieldErrors.expiryDate ? <Text size="xs" c="red">{fieldErrors.expiryDate}</Text> : null}
              <Text size="xs" c="dimmed">
                Após cadastrar, prefira usar "Movimentar" para registrar entradas, saídas e ajustes com histórico auditável.
              </Text>
              {editingId && inventoryEditUnavailable ? (
                <Text size="xs" c="orange">
                  Edição desabilitada neste ambiente: rotas de atualização/movimentação de estoque não encontradas no backend.
                </Text>
              ) : null}
            </Stack>
          </Paper>

          <Divider />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
            <Button bg={DARK_BLUE} onClick={handleAddOrUpdate} size="sm" loading={savingItem} disabled={savingItem || (Boolean(editingId) && inventoryEditUnavailable)}>
              {editingId ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={movementOpen}
        onClose={() => setMovementOpen(false)}
        title={`Movimentar estoque${movementItem ? ` • ${movementItem.nome}` : ''}`}
        centered
        size="md"
      >
        <Stack gap="sm">
          <FloatingSelect
            label="Tipo"
            value={movementForm.type}
            onChange={(value) => setMovementForm((prev) => ({ ...prev, type: (value as any) || 'ENTRY' }))}
            data={[
              { value: 'ENTRY', label: 'Entrada' },
              { value: 'EXIT', label: 'Saída' },
              { value: 'ADJUSTMENT', label: 'Ajuste (define saldo)' },
            ]}
          />
          <FloatingNumberInput
            label={movementForm.type === 'ADJUSTMENT' ? 'Saldo final' : 'Quantidade'}
            value={movementForm.quantity ?? undefined}
            onChange={(value) => setMovementForm((prev) => ({ ...prev, quantity: normalizeNumber(value) }))}
            min={0}
          />
          <FloatingInput
            label="Motivo"
            value={movementForm.reason}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setMovementForm((prev) => ({ ...prev, reason: value }));
            }}
            placeholder="Ex.: compra, consumo em consulta, perda, correção"
          />
          <Textarea
            label="Observações"
            value={movementForm.notes}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setMovementForm((prev) => ({ ...prev, notes: value }));
            }}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setMovementOpen(false)}>Cancelar</Button>
            <Button bg={DARK_BLUE} loading={movementSaving} onClick={() => { void handleCreateMovement(); }}>
              Registrar movimentação
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Histórico de movimentações${historyItem ? ` • ${historyItem.nome}` : ''}`}
        centered
        size={isMobile ? '100%' : 1100}
        fullScreen={isMobile}
      >
        {historyLoading ? (
          <Stack gap="xs">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={18} radius="xl" />)}
          </Stack>
        ) : (
          <Box style={{ maxHeight: isMobile ? 'calc(100vh - 180px)' : '70vh', overflow: 'auto' }}>
            <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 980, tableLayout: 'fixed' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 170 }}>Data</Table.Th>
                  <Table.Th style={{ width: 130 }}>Tipo</Table.Th>
                  <Table.Th style={{ width: 90 }}>Qtd</Table.Th>
                  <Table.Th style={{ width: 130 }}>De â†’ Para</Table.Th>
                  <Table.Th style={{ width: 340 }}>Motivo</Table.Th>
                  <Table.Th style={{ width: 180 }}>Usuário</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {historyRows.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center">Nenhuma movimentação registrada.</Text></Table.Td></Table.Tr>
                ) : historyRows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Text size="sm" style={{ whiteSpace: 'normal' }}>
                        {new Date(row.createdAt).toLocaleString('pt-BR')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{formatMovementType(row.type)}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.quantity}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.previousQty} â†’ {row.resultingQty}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.35 }}>
                        {row.reason}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {row.createdByName || '-'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}
      </Modal>

      <Modal
        opened={lotsOpen}
        onClose={() => setLotsOpen(false)}
        title={`Lotes${lotsItem ? ` • ${lotsItem.nome}` : ''}`}
        centered
        size={isMobile ? '100%' : 1100}
        fullScreen={isMobile}
      >
        <Stack gap="md">
          <Paper withBorder radius="md" p="md">
            <Stack gap="sm">
              <Text fw={700} size="sm">Novo lote</Text>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                <FloatingInput
                  label="Código do lote"
                  value={lotForm.lotCode}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setLotForm((prev) => ({ ...prev, lotCode: value }));
                  }}
                  placeholder="Ex.: LT-2026-001"
                />
                <FloatingNumberInput
                  label="Quantidade"
                  value={lotForm.quantity ?? undefined}
                  onChange={(value) => setLotForm((prev) => ({ ...prev, quantity: normalizeNumber(value) }))}
                  min={0}
                />
                <FloatingDateInput
                  label="Validade"
                  value={lotForm.expiryDate}
                  onChange={(value) => setLotForm((prev) => ({ ...prev, expiryDate: value ?? null }))}
                  valueFormat="DD/MM/YYYY"
                  clearable={false}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                <FloatingNumberInput
                  label="Preço unitário do item"
                  value={lotForm.unitPrice ?? undefined}
                  onChange={(value) => setLotForm((prev) => ({ ...prev, unitPrice: normalizeNumber(value) }))}
                  min={0}
                  step={0.01}
                />
                <FloatingInput
                  label="Fornecedor"
                  value={lotForm.supplier}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setLotForm((prev) => ({ ...prev, supplier: value }));
                  }}
                  placeholder="Opcional"
                />
                <FloatingInput
                  label="Observações"
                  value={lotForm.notes}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setLotForm((prev) => ({ ...prev, notes: value }));
                  }}
                  placeholder="Opcional"
                />
              </SimpleGrid>
              <Text size="xs" c="dimmed">
                O preço informado é por item. Total do lote = quantidade x preço unitário.
              </Text>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setLotsOpen(false)}>Fechar</Button>
                <Button bg={DARK_BLUE} loading={lotSaving} onClick={() => { void handleCreateLot(); }}>
                  Cadastrar lote
                </Button>
              </Group>
            </Stack>
          </Paper>

          <Paper withBorder radius="md" p="md">
            <Text fw={700} size="sm" mb="sm">Histórico de lotes</Text>
            {lotsLoading ? (
              <Stack gap="xs">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={18} radius="xl" />)}
              </Stack>
            ) : (
              <Box style={{ maxHeight: isMobile ? 'calc(100vh - 460px)' : '45vh', overflow: 'auto' }}>
                <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 980, tableLayout: 'fixed' }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 150 }}>Lote</Table.Th>
                      <Table.Th style={{ width: 100 }}>Qtd</Table.Th>
                      <Table.Th style={{ width: 130 }}>Validade</Table.Th>
                      <Table.Th style={{ width: 130 }}>Preço Unit.</Table.Th>
                      <Table.Th style={{ width: 140 }}>Total do lote</Table.Th>
                      <Table.Th style={{ width: 220 }}>Fornecedor</Table.Th>
                      <Table.Th style={{ width: 180 }}>Usuário</Table.Th>
                      <Table.Th style={{ width: 170 }}>Cadastro</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lotRows.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Text c="dimmed" ta="center">Nenhum lote cadastrado para este item.</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : lotRows.map((lot) => (
                      <Table.Tr key={lot.id}>
                        <Table.Td><Text size="sm">{lot.lotCode}</Text></Table.Td>
                        <Table.Td><Text size="sm">{lot.quantity}</Text></Table.Td>
                        <Table.Td>
                          <Text size="sm">{lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString('pt-BR') : '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{lot.unitPrice !== null && lot.unitPrice !== undefined ? `R$ ${Number(lot.unitPrice).toFixed(2)}` : '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {lot.unitPrice !== null && lot.unitPrice !== undefined
                              ? `R$ ${(Number(lot.quantity) * Number(lot.unitPrice)).toFixed(2)}`
                              : '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td><Text size="sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{lot.supplier || '-'}</Text></Table.Td>
                        <Table.Td><Text size="sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{lot.createdByName || '-'}</Text></Table.Td>
                        <Table.Td><Text size="sm">{new Date(lot.createdAt).toLocaleString('pt-BR')}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            )}
          </Paper>
        </Stack>
      </Modal>

      <ResultModal
        opened={showItemSuccessModal}
        onClose={() => setShowItemSuccessModal(false)}
        variant={lastItemAction === 'created' ? 'success' : 'success'}
        title={lastItemAction === 'created' ? 'Item cadastrado' : 'Item atualizado'}
        message={lastCreatedItemName ? `${lastCreatedItemName} ${lastItemAction === 'created' ? 'foi adicionado ao estoque.' : 'foi atualizado com sucesso.'}` : (lastItemAction === 'created' ? 'Item adicionado com sucesso.' : 'Item atualizado com sucesso.')}
        secondary={{ label: 'Voltar', onClick: () => setShowItemSuccessModal(false) }}
        primary={{ label: 'Cadastrar novo', onClick: () => { setForm({ codigo: '', nome: '', categoria: '', unidade: '', quantidade: null, minimo: null, maximo: null, precoUnitario: null, validade: null }); setShowItemSuccessModal(false); setModalOpen(true); setEditingId(null); } }}
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



