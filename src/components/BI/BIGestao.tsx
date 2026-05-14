import React, { useMemo, useState, type ElementType, type CSSProperties } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable, useDndContext, pointerWithin, getFirstCollision,
  type DragStartEvent, type DragEndEvent, type CollisionDetection, type Modifier,
} from '@dnd-kit/core';


import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  List,
  Loader,
  Modal,
  Paper,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  GripVertical,
  Clock3,
  DollarSign,
  FileCheck2,
  FileClock,
  Filter,
  HeartPulse,
  Lightbulb,
  LineChart as LineChartIcon,
  PackageCheck,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
  PlusCircle,
  Pencil,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as ChartLegend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Header } from '../Header/Header';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { useConvenioAuthorizationsQuery } from '../../hooks/useConvenioAuthorizationsQuery';
import { useFinanceEntriesQuery } from '../../hooks/useFinanceEntriesQuery';
import { useInventoryItemsQuery } from '../../hooks/useInventoryItemsQuery';
import { useInvoicesQuery } from '../../hooks/useInvoicesQuery';
import { usePreSchedulingsQuery } from '../../hooks/usePreSchedulingsQuery';
import { useReportsQuery } from '../../hooks/useReportsQuery';
import { useSettingsSectorsQuery } from '../../hooks/useSettingsSectorsQuery';
import { useTeaProfilesQuery } from '../../hooks/useTeaProfilesQuery';
import { useTissBatchesQuery } from '../../hooks/useTissBatchesQuery';
import { useBIAuthorizationsQuery, useBIClinicalQuery, useBICommunicationQuery, useBIFinancialQuery, useBIOccupancyQuery, useBIOverviewQuery, useBIReportsQuery, useBIResourcesQuery, useBITeaQuery } from '../../hooks/useBIOverviewQuery';
import { DARK_BLUE } from '../../themes/theme';
import biService from '../../services/biService';

function EmptyCell({ id, minHeight }: { id: string; minHeight: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const { active } = useDndContext();
  const hasActiveDrag = !!active;
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1, minWidth: 0, minHeight,
        border: `2px dashed ${isOver ? '#3b82f6' : 'rgba(128,128,128,0.13)'}`,
        borderRadius: 8,
        background: isOver ? 'rgba(59,130,246,0.07)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {isOver && hasActiveDrag ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            border: '1.5px solid rgba(59,130,246,0.75)',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(15,118,110,0.12))',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text size="xs" c="blue.2" fw={700} style={{ pointerEvents: 'none' }}>Pré-visualização</Text>
        </div>
      ) : null}
    </div>
  );
}

function InsertZone({ id, previewPercent }: { id: string; previewPercent: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        flexShrink: 0,
        width: isOver ? `${previewPercent}%` : 8,
        borderRadius: 4,
        background: isOver ? '#3b82f6' : 'rgba(128,128,128,0.18)',
        transition: 'width 0.12s, background 0.12s',
        alignSelf: 'stretch',
      }}
    />
  );
}

function RowDropZone({ id, minHeight, previewPercent }: { id: string; minHeight: number; previewPercent: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight,
        border: `2px dashed ${isOver ? '#3b82f6' : 'rgba(128,128,128,0.13)'}`,
        borderRadius: 8,
        background: isOver ? 'rgba(59,130,246,0.07)' : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {isOver ? (
        <div
          style={{
            width: `${previewPercent}%`,
            minWidth: 120,
            borderRadius: 8,
            border: '1.5px solid rgba(59,130,246,0.75)',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(15,118,110,0.12))',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text size="xs" c="blue.2" fw={700} style={{ pointerEvents: 'none' }}>
            Pré-visualização ({Math.round(previewPercent)}%)
          </Text>
        </div>
      ) : null}
    </div>
  );
}

function DraggableWidgetShell({ widget, heightPx, flex, onResize, isDragActive, children }: {
  widget: GeneratedWidget;
  heightPx: number;
  flex: number;
  onResize: (h: number) => void;
  isDragActive: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: widget.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: widget.id });

  const setRef = (node: HTMLDivElement | null) => { setDragRef(node); setDropRef(node); };

  const style: CSSProperties = {
    flex, minWidth: 0, height: heightPx, position: 'relative',
    opacity: isDragging ? 0 : 1,
    outline: isOver && isDragActive && !isDragging ? '2px solid #3b82f6' : undefined,
    borderRadius: 8,
    overflow: 'hidden',
  };

  return (
    <div ref={setRef} style={style}>
      <div style={{ position: 'absolute', top: 8, right: 40, zIndex: 10 }}>
        <Tooltip label="Arrastar para reordenar">
          <ActionIcon size="sm" variant="subtle" color="gray" style={{ cursor: 'grab' }} {...listeners} {...attributes}>
            <GripVertical size={14} />
          </ActionIcon>
        </Tooltip>
      </div>
      <div style={{ height: '100%' }}>{children}</div>
    </div>
  );
}

// ── Tab layout (drag/resize/delete for static panels) ─────────────────────────
type TabLayoutState = {
  order: string[];
  hidden: string[];
  heights: Record<string, number>;
  rowsLayout: (string | null)[][] | null;
};

const TAB_LABELS: Record<string, string> = {
  executivo: 'Executivo', operacao: 'Operação', financeiro: 'Financeiro',
  clinico: 'Clínico', recursos: 'Recursos', convenios: 'Convênios',
  tea: 'TEA', laudos: 'Laudos', comunicacao: 'Comunicação',
};

const DEFAULT_TAB_CARDS: Record<string, string[]> = {
  executivo:   ['exec_trend', 'exec_funnel', 'exec_alerts'],
  operacao:    ['op_metrics', 'op_rooms', 'op_demand', 'op_equipments', 'op_professionals'],
  financeiro:  ['fin_metrics', 'fin_mix', 'fin_cashflow'],
  clinico:     ['cli_metrics', 'cli_sla', 'cli_modalities'],
  recursos:    ['res_metrics', 'res_coverage'],
  convenios:   ['conv_metrics', 'conv_mix'],
  tea:         ['tea_metrics', 'tea_mix'],
  laudos:      ['laud_metrics', 'laud_volume'],
  comunicacao: ['com_metrics', 'com_flows'],
};

const DEFAULT_CARD_HEIGHTS: Record<string, number> = {
  exec_trend: 460, exec_funnel: 480, exec_alerts: 480,
  op_metrics: 460, op_rooms: 460, op_demand: 460, op_equipments: 500, op_professionals: 500,
  fin_metrics: 460, fin_mix: 460, fin_cashflow: 460,
  cli_metrics: 460, cli_sla: 540, cli_modalities: 500,
  res_metrics: 460, res_coverage: 500,
  conv_metrics: 460, conv_mix: 460,
  tea_metrics: 460, tea_mix: 460,
  laud_metrics: 460, laud_volume: 460,
  com_metrics: 460, com_flows: 460,
};

/** Packs a row so all non-null entries are at the leftmost positions (no internal gaps). */
function packRow(row: (string | null)[]): (string | null)[] {
  const cards = row.filter((c): c is string => c !== null);
  return [...cards, ...Array(MAX_PER_ROW - cards.length).fill(null)];
}

/** Removes consecutive duplicate empty rows — keeps at most 1 between card rows. */
function dedupeEmptyRows(matrix: (string | null)[][]): (string | null)[][] {
  const result: (string | null)[][] = [];
  let lastWasEmpty = false;
  for (const row of matrix) {
    const isEmpty = row.every((c) => c === null);
    if (isEmpty && lastWasEmpty) continue;
    result.push(row);
    lastWasEmpty = isEmpty;
  }
  // Remove leading empty rows so cards always snap back to the top.
  while (result.length > 0 && result[0].every((c) => c === null)) result.shift();
  // Remove trailing empty rows (the UI always adds one extra)
  while (result.length > 0 && result[result.length - 1].every((c) => c === null)) result.pop();
  return result;
}

/**
 * Builds a 4-column display matrix. Within each row, cards are always packed
 * to the left (no internal nulls). Fully-empty rows act as spacers between rows.
 */
function buildDisplayMatrix(ids: string[], rowsLayout: (string | null)[][] | null): (string | null)[][] {
  const empty = (): (string | null)[] => Array(MAX_PER_ROW).fill(null);
  if (!rowsLayout || rowsLayout.length === 0) {
    const matrix: (string | null)[][] = [];
    let r = 0, c = 0;
    for (const id of ids) {
      if (!matrix[r]) matrix[r] = empty();
      matrix[r][c] = id;
      c++;
      if (c >= MAX_PER_ROW) { c = 0; r++; }
    }
    return matrix;
  }
  const visible = new Set(ids);
  const placed = new Set<string>();
  const raw: (string | null)[][] = [];
  for (const row of rowsLayout) {
    const rowCards = row.filter((id): id is string => id !== null && visible.has(id) && !placed.has(id));
    rowCards.forEach((id) => placed.add(id));
    const isSpacerRow = row.every((c) => c === null);
    if (rowCards.length > 0) raw.push(packRow([...rowCards, ...empty()]));
    else if (isSpacerRow) raw.push(empty()); // preserve intentional spacer
  }
  // Orphans appended sequentially
  const orphans = ids.filter((id) => !placed.has(id));
  let r = raw.length, c = 0;
  for (const id of orphans) {
    if (!raw[r]) raw[r] = empty();
    raw[r][c] = id;
    c++;
    if (c >= MAX_PER_ROW) { c = 0; r++; }
  }
  return dedupeEmptyRows(raw);
}

function StaticDraggableCardShell({ id, heightPx, flex, onResize, isDragActive, onDelete, onEdit, children }: {
  id: string;
  heightPx: number;
  flex: number;
  onResize: (h: number) => void;
  isDragActive: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setRef = (node: HTMLDivElement | null) => { setDragRef(node); setDropRef(node); };

  const style: CSSProperties = {
    flex, minWidth: 0, height: heightPx, position: 'relative',
    opacity: isDragging ? 0 : 1,
    outline: isOver && isDragActive && !isDragging ? '2px solid #3b82f6' : undefined,
    borderRadius: 8,
    overflow: 'hidden',
  };

  return (
    <div ref={setRef} style={style}>
      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={<Group gap="sm"><ThemeIcon color="red" variant="light" radius="md" size={32}><Trash2 size={16} /></ThemeIcon><Text fw={700}>Ocultar card</Text></Group>}
        size="sm" centered
      >
        <Text size="sm" c="dimmed" mb="xl">
          O card será ocultado do painel. Use o botão <Text span fw={700}>"Resetar layout"</Text> para restaurá-lo.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="red" leftSection={<Trash2 size={14} />} onClick={() => { onDelete?.(); setConfirmOpen(false); }}>Ocultar</Button>
        </Group>
      </Modal>
      <div style={{ position: 'absolute', top: 8, right: (onDelete || onEdit) ? 56 : 40, zIndex: 10 }}>
        <Tooltip label="Arrastar para reordenar">
          <ActionIcon size="sm" variant="subtle" color="gray" style={{ cursor: 'grab' }} {...listeners} {...attributes}>
            <GripVertical size={14} />
          </ActionIcon>
        </Tooltip>
      </div>
      {onEdit && (
        <div style={{ position: 'absolute', top: 8, right: onDelete ? 32 : 8, zIndex: 10 }}>
          <Tooltip label="Editar título e subtítulo">
            <ActionIcon size="sm" variant="subtle" color="gray" onClick={onEdit}>
              <Pencil size={14} />
            </ActionIcon>
          </Tooltip>
        </div>
      )}
      {onDelete && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
          <Tooltip label="Ocultar card">
            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={14} />
            </ActionIcon>
          </Tooltip>
        </div>
      )}
      <div style={{ height: '100%' }}>{children}</div>
    </div>
  );
}

function StaticWidgetGrid({ cards, rowsLayout, isDragActive, onDelete, onResize, onEdit }: {
  cards: { id: string; node: React.ReactNode }[];
  rowsLayout: (string | null)[][] | null;
  isDragActive: boolean;
  onDelete: (id: string) => void;
  onResize: (id: string, h: number) => void;
  onEdit: (id: string) => void;
}) {
  const cardMap = new Map(cards.map((c) => [c.id, c.node]));
  const visibleIds = cards.map((c) => c.id);
  const baseMatrix = buildDisplayMatrix(visibleIds, rowsLayout);
  const allRows = [...baseMatrix, Array(MAX_PER_ROW).fill(null)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {allRows.map((row, rowIdx) => {
        const cardIds = (row as (string | null)[]).filter((id): id is string => !!id);
        const isEmptyRow = cardIds.length === 0;
        const rowMaxH = Math.max(...cardIds.map((id) => DEFAULT_CARD_HEIGHTS[id] ?? 300), 200);

        if (isEmptyRow) {
          return (
            <RowDropZone key={rowIdx} id={`grid-row-${rowIdx}`} minHeight={200} previewPercent={100} />
          );
        }

        const showInserts = isDragActive;
        const previewPercent = 100 / Math.min(MAX_PER_ROW, cardIds.length + 1);
        return (
          <div key={rowIdx} style={{ display: 'flex', alignItems: 'stretch', gap: showInserts ? 0 : 12 }}>
            {showInserts && <InsertZone id={`grid-insert-${rowIdx}-0`} previewPercent={previewPercent} />}
            {cardIds.map((id, i) => (
              <React.Fragment key={id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <StaticDraggableCardShell
                    id={id}
                    heightPx={rowMaxH}
                    flex={1}
                    isDragActive={isDragActive}
                    onDelete={() => onDelete(id)}
                    onEdit={() => onEdit(id)}
                    onResize={(h) => onResize(id, h)}
                  >
                    {cardMap.get(id)}
                  </StaticDraggableCardShell>
                </div>
                {showInserts && <InsertZone id={`grid-insert-${rowIdx}-${i + 1}`} previewPercent={previewPercent} />}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}

type PeriodKey = '7d' | '30d' | '90d' | 'month';

type GeneratedWidget = {
  id: string;
  type: 'metric' | 'text' | 'bar_chart' | 'area_chart' | 'pie_chart' | 'ranking';
  title: string;
  value?: string;
  hint?: string;
  color?: string;
  content?: string;
  data?: { label?: string; name?: string; value: number }[];
  items?: { label: string; value: string; score?: number }[];
};

type WidgetLayoutItem = { i: string; x: number; y: number; w: number; h: number };
type WidgetHeights = Record<string, number>; // widgetId → height in px

type PanelCustomState = {
  widgets: GeneratedWidget[];
  layout: WidgetLayoutItem[]; // kept for backwards compat (ignored)
  heights: WidgetHeights;
  prompt: string;
  loading: boolean;
  error: string | null;
  rowsLayout: (string | null)[][] | null; // sparse grid matrix; null = sequential fallback
};

const MAX_PER_ROW = 4;
const ROW_HEIGHT_PX = 280;

const DEFAULT_HEIGHT_PX: Record<string, number> = {
  metric: 220, text: 260, bar_chart: 300, area_chart: 300, pie_chart: 300, ranking: 280,
};

/** Computes row groups from ordered widgets array (sequential chunks of MAX_PER_ROW). */
function computeRows(widgets: GeneratedWidget[]): GeneratedWidget[][] {
  const rows: GeneratedWidget[][] = [];
  for (let i = 0; i < widgets.length; i += MAX_PER_ROW) {
    rows.push(widgets.slice(i, i + MAX_PER_ROW));
  }
  return rows;
}

/** Builds a left-packed 4-column matrix of GeneratedWidgets from rowsLayout. */
function buildWidgetMatrix(widgets: GeneratedWidget[], rowsLayout: (string | null)[][] | null): (GeneratedWidget | null)[][] {
  const empty = (): (GeneratedWidget | null)[] => Array(MAX_PER_ROW).fill(null);
  const widgetMap = new Map(widgets.map((w) => [w.id, w]));
  if (!rowsLayout || rowsLayout.length === 0) {
    const matrix: (GeneratedWidget | null)[][] = [];
    let r = 0, c = 0;
    for (const w of widgets) {
      if (!matrix[r]) matrix[r] = empty();
      matrix[r][c] = w;
      c++;
      if (c >= MAX_PER_ROW) { c = 0; r++; }
    }
    return matrix;
  }
  const placed = new Set<string>();
  const raw: (GeneratedWidget | null)[][] = [];
  for (const row of rowsLayout) {
    const rowWidgets = row
      .map((id) => (id ? widgetMap.get(id) : undefined))
      .filter((w): w is GeneratedWidget => !!w && !placed.has(w.id));
    rowWidgets.forEach((w) => placed.add(w.id));
    const isSpacerRow = row.every((c) => c === null);
    if (rowWidgets.length > 0) {
      const packed: (GeneratedWidget | null)[] = [...rowWidgets, ...Array(MAX_PER_ROW - rowWidgets.length).fill(null)];
      raw.push(packed);
    } else if (isSpacerRow) {
      raw.push(empty());
    }
  }
  const orphans = widgets.filter((w) => !placed.has(w.id));
  let r = raw.length, c = 0;
  for (const w of orphans) {
    if (!raw[r]) raw[r] = empty();
    raw[r][c] = w;
    c++;
    if (c >= MAX_PER_ROW) { c = 0; r++; }
  }
  // Remove trailing empty rows
  while (raw.length > 0 && raw[raw.length - 1].every((c) => c === null)) raw.pop();
  return raw;
}

/** @deprecated use buildWidgetMatrix */
function computeDisplayRows(widgets: GeneratedWidget[], rowsLayout: (string | null)[][] | null): GeneratedWidget[][] {
  return buildWidgetMatrix(widgets, rowsLayout).map((row) => row.filter(Boolean) as GeneratedWidget[]).filter((r) => r.length > 0);
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const normalizeText = (value?: unknown) => String(value || '').trim().toLowerCase();

const normalizeStatus = (value?: unknown) => normalizeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();

const asNumber = (value?: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstValue = (item: any, fields: string[]) => {
  for (const field of fields) {
    const value = item?.[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const itemDate = (item: any, fields: string[]) => {
  const value = firstValue(item, fields);
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const inRange = (date: dayjs.Dayjs | null, start: dayjs.Dayjs, end: dayjs.Dayjs) => {
  if (!date) return false;
  return (date.isSame(start, 'day') || date.isAfter(start, 'day')) && (date.isSame(end, 'day') || date.isBefore(end, 'day'));
};

const isAppointmentDone = (status?: unknown) => {
  const normalized = normalizeStatus(status);
  return ['ATENDIDO', 'ATENDIDA', 'FINALIZADO', 'FINALIZADA', 'CONCLUIDO', 'CONCLUIDA', 'REALIZADO', 'REALIZADA'].some((token) => normalized.includes(token));
};

const isCanceled = (status?: unknown) => {
  const normalized = normalizeStatus(status);
  return normalized.includes('CANCEL') || normalized.includes('DESMARC');
};

const isPending = (status?: unknown) => {
  const normalized = normalizeStatus(status);
  return !normalized || ['PENDENTE', 'AGENDADO', 'CONFIRMADO', 'WAITING', 'PENDING'].some((token) => normalized.includes(token));
};

const isRevenue = (entry: any) => {
  const type = normalizeStatus(entry?.type || entry?.tipo || entry?.category || entry?.categoria);
  return type.includes('RECEITA') || type.includes('ENTRADA') || type.includes('CREDIT') || type === 'INCOME';
};

const isExpense = (entry: any) => {
  const type = normalizeStatus(entry?.type || entry?.tipo || entry?.category || entry?.categoria);
  return type.includes('DESPESA') || type.includes('SAIDA') || type.includes('DEBIT') || type === 'EXPENSE';
};

const getEntryValue = (entry: any) => asNumber(firstValue(entry, ['value', 'valor', 'total', 'amount']));

const getInvoiceValue = (invoice: any) => asNumber(firstValue(invoice, ['value', 'total', 'totalValue', 'packageValue']));

const getItemName = (item: any, fields: string[], fallback = 'Não informado') => String(firstValue(item, fields) || fallback);

const withFunnelColors = (items: any[] = []) => {
  const colors = ['#0A2568', '#2563eb', '#0f766e', '#16a34a', '#7c3aed', '#b45309'];
  return items.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
  }));
};

const formatHours = (minutes: number) => `${integerFormatter.format(Math.round(minutes / 60))}h`;

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ElementType;
  tone: string;
  loading?: boolean;
}) {
  return (
    <Paper p="lg" withBorder shadow="sm" style={{ height: '100%', borderColor: 'var(--mantine-color-default-border)' }}>
      {loading ? (
        <Stack gap="sm">
          <Skeleton height={14} width="55%" radius="xl" />
          <Skeleton height={36} width="42%" radius="md" />
          <Skeleton height={12} width="72%" radius="xl" />
        </Stack>
      ) : (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Text size="sm" c="dimmed" fw={600}>{label}</Text>
            <ThemeIcon variant="light" color={tone} radius="md" size={38}>
              <Icon size={20} />
            </ThemeIcon>
          </Group>
          <Box>
            <Text fw={750} style={{ fontSize: 'clamp(1.7rem, 2.5vw, 2.35rem)', lineHeight: 1 }}>{value}</Text>
            <Text size="xs" c="dimmed" mt={8}>{hint}</Text>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ElementType;
  tone: string;
}) {
  return (
    <Box
      p="md"
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        minHeight: 132,
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="md">
        <Text size="sm" c="dimmed" fw={600}>{label}</Text>
        <ThemeIcon variant="light" color={tone} radius="md" size={34}>
          <Icon size={18} />
        </ThemeIcon>
      </Group>
      <Text fw={750} style={{ fontSize: 'clamp(1.35rem, 2vw, 1.85rem)', lineHeight: 1 }}>{value}</Text>
      <Text size="xs" c="dimmed" mt={8}>{hint}</Text>
    </Box>
  );
}

function PanelTitle({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ElementType;
}) {
  return (
    <Group justify="space-between" align="flex-start" mb="md">
      <Group gap="sm" align="flex-start">
        <ThemeIcon variant="light" color="darkBlue" radius="md" size={38}>
          <Icon size={20} />
        </ThemeIcon>
        <Box>
          <Text fw={700}>{title}</Text>
          <Text size="sm" c="dimmed">{description}</Text>
        </Box>
      </Group>
    </Group>
  );
}

type InsightAlert = { text: string; priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO' };
type InsightSuggestion = { text: string; timeframe: 'imediato' | 'esta semana' | 'este mês'; owner: string };

const extractInsightText = (obj: any) =>
  String(obj?.text || obj?.description || obj?.alert || obj?.suggestion || obj?.content || obj?.action || '').trim();

const normalizeInsightAlert = (item: unknown): InsightAlert => {
  if (typeof item === 'string') return { text: item, priority: 'MÉDIO' };
  const obj = item as any;
  return {
    text: extractInsightText(obj),
    priority: ['CRÍTICO', 'ALTO', 'MÉDIO'].includes(obj?.priority) ? obj.priority : 'MÉDIO',
  };
};

const normalizeInsightSuggestion = (item: unknown): InsightSuggestion => {
  if (typeof item === 'string') return { text: item, timeframe: 'esta semana', owner: 'gestão' };
  const obj = item as any;
  return {
    text: extractInsightText(obj),
    timeframe: ['imediato', 'esta semana', 'este mês'].includes(obj?.timeframe) ? obj.timeframe : 'esta semana',
    owner: String(obj?.owner || obj?.responsible || obj?.responsavel || 'gestão'),
  };
};

type InsightsResult = {
  summary: string;
  positives: string[];
  negatives: string[];
  alerts: InsightAlert[];
  suggestions: InsightSuggestion[];
  generatedAt: string;
  expiresAt: string;
  fromCache: boolean;
};

const WIDGET_CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
const AI_WIDGET_CARD_PREFIX = 'ai_widget::';

function AIWidgetHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Group gap="xs" align="flex-start" mb="sm" wrap="nowrap">
      <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} radius="md" size={32} mt={1}>
        <Sparkles size={16} />
      </ThemeIcon>
      <Box style={{ minWidth: 0 }}>
        <Text fw={700} style={{ fontSize: 14, lineHeight: 1.25 }}>{title}</Text>
        <Text size="xs" c="dimmed" style={{ lineHeight: 1.25 }}>{subtitle}</Text>
      </Box>
    </Group>
  );
}

function WidgetCardContent({
  widget,
  subtitle,
  panelBg,
  colorScheme,
  chartGridColor,
  onDelete,
  onEditTitle,
}: {
  widget: GeneratedWidget;
  subtitle: string;
  panelBg: string;
  colorScheme: 'light' | 'dark' | 'auto';
  chartGridColor: string;
  onDelete?: () => void;
  onEditTitle?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const textColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-2)' : undefined;

  return (
    <Box style={{ position: 'relative', height: '100%' }}>
      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={<Group gap="sm"><ThemeIcon color="red" variant="light" radius="md" size={32}><Trash2 size={16} /></ThemeIcon><Text fw={700}>Excluir widget</Text></Group>}
        size="sm" centered
      >
        <Text size="sm" c="dimmed" mb="xl">
          Tem certeza que deseja excluir o widget <Text span fw={700} c="dark">"{widget.title}"</Text>? Esta ação não pode ser desfeita.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="red" leftSection={<Trash2 size={14} />} onClick={() => { onDelete?.(); setConfirmOpen(false); }}>Excluir</Button>
        </Group>
      </Modal>

      {/* Botão excluir */}
      <Group gap={4} style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
        {onEditTitle && (
          <Tooltip label="Editar título e subtítulo">
            <ActionIcon size="sm" variant="subtle" color="gray" onClick={onEditTitle}>
              <Pencil size={14} />
            </ActionIcon>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip label="Remover widget">
            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {widget.type === 'metric' && (
        <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <AIWidgetHeader title={widget.title} subtitle={subtitle} />
          <Text fw={750} style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', lineHeight: 1 }}>{widget.value}</Text>
          {widget.hint && <Text size="xs" c="dimmed" mt={8}>{widget.hint}</Text>}
        </Paper>
      )}

      {widget.type === 'text' && (
        <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AIWidgetHeader title={widget.title} subtitle={subtitle} />
          <ScrollArea style={{ flex: 1 }} offsetScrollbars>
            <Text size="sm" lh={1.7} c={textColor}>{widget.content}</Text>
          </ScrollArea>
        </Paper>
      )}

      {widget.type === 'bar_chart' && (
        <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <AIWidgetHeader title={widget.title} subtitle={subtitle} />
          {widget.data && widget.data.length > 0 ? (
            <Box style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={widget.data.map((d) => ({ ...d, _key: d.name || d.label || '' }))}>
                  <CartesianGrid stroke={chartGridColor} vertical={false} />
                  <XAxis dataKey="_key" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <ChartTooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {widget.data.map((_, i) => <Cell key={i} fill={WIDGET_CHART_COLORS[i % WIDGET_CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : <Text size="sm" c="dimmed">Dados insuficientes para gerar este gráfico.</Text>}
        </Paper>
      )}

      {widget.type === 'area_chart' && (
        <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <AIWidgetHeader title={widget.title} subtitle={subtitle} />
          {widget.data && widget.data.length > 0 ? (
            <Box style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={widget.data.map((d) => ({ ...d, _key: d.name || d.label || '' }))}>
                  <CartesianGrid stroke={chartGridColor} vertical={false} />
                  <XAxis dataKey="_key" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <ChartTooltip />
                  <Area type="monotone" dataKey="value" stroke={widget.color || '#3b82f6'} fill={widget.color || '#3b82f6'} fillOpacity={0.15} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          ) : <Text size="sm" c="dimmed">Dados insuficientes para gerar este gráfico.</Text>}
        </Paper>
      )}

      {widget.type === 'pie_chart' && (() => {
        const MAX_SLICES = 8;
        const raw = (widget.data || [])
          .map((d) => ({ name: d.name || d.label || 'Sem nome', value: Number(d.value) || 0 }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value);
        const pieData = raw.length > MAX_SLICES
          ? [...raw.slice(0, MAX_SLICES - 1), { name: 'Outros', value: raw.slice(MAX_SLICES - 1).reduce((s, d) => s + d.value, 0) }]
          : raw;
        return (
          <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <AIWidgetHeader title={widget.title} subtitle={subtitle} />
            {pieData.length > 0 ? (
              <Box style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="30%" outerRadius="55%" paddingAngle={3}>
                      {pieData.map((_, i) => <Cell key={i} fill={WIDGET_CHART_COLORS[i % WIDGET_CHART_COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip formatter={(v: any, n: any) => [v, n]} />
                    <ChartLegend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            ) : <Text size="sm" c="dimmed">Dados insuficientes para gerar este gráfico.</Text>}
          </Paper>
        );
      })()}

      {widget.type === 'ranking' && widget.items && (
        <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AIWidgetHeader title={widget.title} subtitle={subtitle} />
          <ScrollArea style={{ flex: 1 }} offsetScrollbars>
            <Stack gap="xs">
              {widget.items.map((item, i) => (
                <Box key={i}>
                  <Group justify="space-between" mb={3}>
                    <Text size="sm" fw={600}>{item.label}</Text>
                    <Text size="sm" fw={700}>{item.value}</Text>
                  </Group>
                  {item.score !== undefined && (
                    <Progress value={Math.min(100, item.score)} color={WIDGET_CHART_COLORS[i % WIDGET_CHART_COLORS.length]} radius="xl" size="sm" />
                  )}
                </Box>
              ))}
            </Stack>
          </ScrollArea>
        </Paper>
      )}
    </Box>
  );
}

function WidgetGrid({ widgets, rowsLayout, heights, panelBg, colorScheme, chartGridColor, isDragActive, onDelete, onResize, getWidgetSubtitle, onEditWidgetTitle }: {
  widgets: GeneratedWidget[];
  rowsLayout: (string | null)[][] | null;
  heights: WidgetHeights;
  panelBg: string;
  colorScheme: 'light' | 'dark' | 'auto';
  chartGridColor: string;
  isDragActive: boolean;
  onDelete: (id: string) => void;
  onResize: (id: string, h: number) => void;
  getWidgetSubtitle: (widget: GeneratedWidget) => string;
  onEditWidgetTitle: (widget: GeneratedWidget) => void;
}) {
  const baseMatrix = buildWidgetMatrix(widgets, rowsLayout);
  const allRows = [...baseMatrix, Array(MAX_PER_ROW).fill(null)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {allRows.map((row, rowIdx) => {
        const rowWidgets = (row as (GeneratedWidget | null)[]).filter((w): w is GeneratedWidget => !!w);
        const isEmptyRow = rowWidgets.length === 0;
        const rowMaxH = Math.max(...rowWidgets.map((w) => heights[w.id] ?? DEFAULT_HEIGHT_PX[w.type] ?? ROW_HEIGHT_PX), ROW_HEIGHT_PX);

        if (isEmptyRow) {
          return (
            <RowDropZone key={rowIdx} id={`grid-row-${rowIdx}`} minHeight={ROW_HEIGHT_PX} previewPercent={100} />
          );
        }

        const showInserts = isDragActive;
        const previewPercent = 100 / Math.min(MAX_PER_ROW, rowWidgets.length + 1);
        return (
          <div key={rowIdx} style={{ display: 'flex', alignItems: 'stretch', gap: showInserts ? 0 : 12 }}>
            {showInserts && <InsertZone id={`grid-insert-${rowIdx}-0`} previewPercent={previewPercent} />}
            {rowWidgets.map((widget, i) => {
              const heightPx = heights[widget.id] ?? DEFAULT_HEIGHT_PX[widget.type] ?? ROW_HEIGHT_PX;
              return (
                <React.Fragment key={widget.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <DraggableWidgetShell
                      widget={widget}
                      heightPx={heightPx}
                      flex={1}
                      isDragActive={isDragActive}
                      onResize={(h) => onResize(widget.id, h)}
                    >
                      <WidgetCardContent
                        widget={widget}
                        subtitle={getWidgetSubtitle(widget)}
                        panelBg={panelBg}
                        colorScheme={colorScheme}
                        chartGridColor={chartGridColor}
                        onDelete={() => onDelete(widget.id)}
                        onEditTitle={() => onEditWidgetTitle(widget)}
                      />
                    </DraggableWidgetShell>
                  </div>
                  {showInserts && <InsertZone id={`grid-insert-${rowIdx}-${i + 1}`} previewPercent={previewPercent} />}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Centra a silhueta de 160×80 no cursor durante o drag
const centerSilhouette: Modifier = ({ transform, activatorEvent, activeNodeRect }) => {
  if (!activatorEvent || !activeNodeRect) return transform;
  const e = activatorEvent as MouseEvent;
  return {
    ...transform,
    x: transform.x + e.clientX - activeNodeRect.left - 80,
    y: transform.y + e.clientY - activeNodeRect.top - 40,
  };
};

// Prioriza: insert zone > card > empty cell
const gridCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const insertHit = hits.find((c) => String(c.id).startsWith('grid-insert-'));
  if (insertHit) return [insertHit];
  const cardHit = hits.find((c) => !String(c.id).startsWith('grid-'));
  if (cardHit) return [cardHit];
  const cellHit = hits.find((c) => String(c.id).startsWith('grid-cell-'));
  if (cellHit) return [cellHit];
  const first = getFirstCollision(hits);
  return first ? [first] : [];
};

export function BIGestao() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [activePanel, setActivePanel] = useState('executivo');
  const [doctorFilter, setDoctorFilter] = useState<string | null>(null);
  const [insuranceFilter, setInsuranceFilter] = useState<string | null>(null);
  const [procedureFilter, setProcedureFilter] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsResult, setInsightsResult] = useState<InsightsResult | null>(null);
  const [showNewDataAnimation, setShowNewDataAnimation] = useState(false);
  const [titleOverrides, setTitleOverrides] = useState<Record<string, { title: string; subtitle: string }>>({});
  const [titleEditorOpen, setTitleEditorOpen] = useState(false);
  const [titleEditorTarget, setTitleEditorTarget] = useState<{ mode: 'static' | 'ai'; tabId: string; cardId: string } | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [subtitleDraft, setSubtitleDraft] = useState('');

  const titleKey = (mode: 'static' | 'ai', tabId: string, cardId: string) => `${mode}::${tabId}::${cardId}`;
  const getEditedTitle = (mode: 'static' | 'ai', tabId: string, cardId: string, fallbackTitle: string, fallbackSubtitle: string) => {
    const o = titleOverrides[titleKey(mode, tabId, cardId)];
    return { title: o?.title || fallbackTitle, subtitle: o?.subtitle || fallbackSubtitle };
  };
  const openTitleEditor = (mode: 'static' | 'ai', tabId: string, cardId: string, currentTitle: string, currentSubtitle: string) => {
    setTitleEditorTarget({ mode, tabId, cardId });
    setTitleDraft(currentTitle);
    setSubtitleDraft(currentSubtitle);
    setTitleEditorOpen(true);
  };
  const saveTitleEditor = () => {
    if (!titleEditorTarget) return;
    const nextTitle = titleDraft.trim();
    const nextSubtitle = subtitleDraft.trim();
    if (!nextTitle || !nextSubtitle) return;
    const { mode, tabId, cardId } = titleEditorTarget;
    setTitleOverrides((prev) => ({ ...prev, [titleKey(mode, tabId, cardId)]: { title: nextTitle, subtitle: nextSubtitle } }));
    if (mode === 'ai') {
      setPanelCustom((prev) => {
        const cur = prev[tabId];
        if (!cur) return prev;
        const widgets = cur.widgets.map((w) => (w.id === cardId ? { ...w, title: nextTitle } : w));
        const next = { ...prev, [tabId]: { ...cur, widgets } };
        persistCustom(next);
        return next;
      });
    }
    setTitleEditorOpen(false);
    setTitleEditorTarget(null);
  };

  // Painel Personalizável

  const [panelCustom, setPanelCustom] = useState<Record<string, PanelCustomState>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('bi_panel_custom') || '{}');
      return Object.fromEntries(
        Object.entries(stored).map(([k, v]: [string, any]) => {
          const seen = new Set<string>();
          const widgets: GeneratedWidget[] = (v.widgets || []).map((w: any, i: number) => {
            const baseId = String(w.id || `w${i}`);
            const uid = seen.has(baseId) ? `${baseId}_${i}_${Date.now()}` : baseId;
            seen.add(uid);
            return { ...w, id: uid };
          });
          const heights: WidgetHeights = v.heights || {};
          return [k, { widgets, layout: [], heights, prompt: v.prompt || '', loading: false, error: null, rowsLayout: v.rowsLayout || null }];
        }),
      );
    } catch { return {}; }
  });

  const [customPromptDraft, setCustomPromptDraft] = useState<Record<string, string>>({});

  const persistCustom = (next: Record<string, PanelCustomState>) => {
    localStorage.setItem('bi_panel_custom', JSON.stringify(
      Object.fromEntries(Object.entries(next).map(([k, v]) => [k, { widgets: v.widgets, heights: v.heights, prompt: v.prompt, rowsLayout: v.rowsLayout }])),
    ));
  };

  const getBIData = () => {
    // Dados brutos com nomes reais — extraídos das queries locais
    const appts = (appointmentsQuery.data || []) as any[];
    const inPeriod = appts.filter((a: any) => inRange(itemDate(a, ['date', 'data', 'scheduledAt', 'appointmentDate']), startDate, endDate));

    // Médicos: nome + contagem de atendimentos
    const doctorMap = new Map<string, number>();
    inPeriod.forEach((a: any) => {
      const name = String(firstValue(a, ['doctorName', 'doctor', 'medico']) || '').trim();
      if (name) doctorMap.set(name, (doctorMap.get(name) || 0) + 1);
    });
    const doctors = Array.from(doctorMap.entries())
      .map(([name, appointments]) => ({ name, appointments }))
      .sort((a, b) => b.appointments - a.appointments);

    // Convênios: nome + contagem
    const convenioMap = new Map<string, number>();
    inPeriod.forEach((a: any) => {
      const name = String(firstValue(a, ['convenio', 'insurance', 'healthInsuranceName']) || 'Particular').trim();
      convenioMap.set(name, (convenioMap.get(name) || 0) + 1);
    });
    const convenios = Array.from(convenioMap.entries())
      .map(([name, appointments]) => ({ name, appointments }))
      .sort((a, b) => b.appointments - a.appointments);

    // Especialidades/procedimentos
    const specialtyMap = new Map<string, number>();
    inPeriod.forEach((a: any) => {
      const name = String(firstValue(a, ['specialty', 'procedureName', 'type', 'examType']) || 'Não informado').trim();
      if (name && name !== 'Não informado') specialtyMap.set(name, (specialtyMap.get(name) || 0) + 1);
    });
    const specialties = Array.from(specialtyMap.entries())
      .map(([name, appointments]) => ({ name, appointments }))
      .sort((a, b) => b.appointments - a.appointments);

    // Itens de estoque com nomes reais
    const inventory = ((inventoryQuery.data || []) as any[]).slice(0, 20).map((i: any) => ({
      name: String(firstValue(i, ['name', 'nome']) || ''),
      quantity: asNumber(firstValue(i, ['quantity', 'quantidade'])),
      minQuantity: asNumber(firstValue(i, ['minQuantity', 'minimo'])),
      unitPrice: asNumber(firstValue(i, ['unitPrice', 'preco'])),
      status: firstValue(i, ['status']),
    })).filter((i) => i.name);

    // Perfis TEA
    const teaProfiles = ((teaProfilesQuery.data || []) as any[]).slice(0, 20).map((p: any) => ({
      name: String(firstValue(p, ['patientName', 'name', 'nome', 'patient']) || ''),
      isActive: p?.isActive !== false,
    })).filter((p) => p.name);

    return {
      overview: biOverviewQuery.data,
      financial: biFinancialQuery.data,
      clinical: biClinicalQuery.data,
      occupancy: biOccupancyQuery.data,
      reports: biReportsQuery.data,
      authorizations: biAuthorizationsQuery.data,
      tea: biTeaQuery.data,
      resources: biResourcesQuery.data,
      communication: biCommunicationQuery.data,
      // Dados reais com nomes da clínica
      rawData: { doctors, convenios, specialties, inventory, teaProfiles },
    };
  };

  const handleGenerateWidgets = async (panelId: string, panelLabel: string, prompt: string) => {
    if (!prompt.trim()) return;
    setPanelCustom((prev) => {
      const cur = prev[panelId];
      const next: Record<string, PanelCustomState> = {
        ...prev,
        [panelId]: { widgets: cur?.widgets || [], layout: [], heights: cur?.heights || {}, prompt: prompt.trim(), loading: true, error: null, rowsLayout: cur?.rowsLayout || null },
      };
      persistCustom(next);
      return next;
    });
    try {
      const result = await biService.generateWidgets(
        getBIData() as any,
        { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') },
        { doctorId: doctorFilter, insuranceId: insuranceFilter, procedureId: procedureFilter, sectorId: sectorFilter } as any,
        panelLabel,
        prompt.trim(),
      );
      setPanelCustom((prev) => {
        const cur = prev[panelId];
        const prefix = Date.now();
        const newWidgets = result.widgets.map((w, i) => ({ ...w, id: `${prefix}_${i}` }));
        const next: Record<string, PanelCustomState> = {
          ...prev,
          [panelId]: { widgets: [...(cur?.widgets || []), ...newWidgets], layout: [], heights: cur?.heights || {}, prompt: prompt.trim(), loading: false, error: null, rowsLayout: cur?.rowsLayout || null },
        };
        persistCustom(next);
        return next;
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.originalError || err?.response?.data?.error || err?.message || 'Erro ao gerar widgets.';
      setPanelCustom((prev) => ({
        ...prev,
        [panelId]: { ...(prev[panelId] || { widgets: [], layout: [], heights: {}, prompt: '', rowsLayout: null }), loading: false, error: errorMsg },
      }));
    }
  };

  const handleDeleteWidget = (panelId: string, widgetId: string) => {
    setPanelCustom((prev) => {
      const cur = prev[panelId];
      const heights = { ...cur.heights };
      delete heights[widgetId];
      const newRowsLayout = cur.rowsLayout
        ? cur.rowsLayout.map((row) => row.map((id) => (id === widgetId ? null : id))).filter((row) => row.some((id) => id !== null))
        : null;
      const next: Record<string, PanelCustomState> = {
        ...prev,
        [panelId]: { ...cur, widgets: cur.widgets.filter((w) => w.id !== widgetId), layout: [], heights, rowsLayout: newRowsLayout },
      };
      persistCustom(next);
      return next;
    });
  };

  const handleReorderWidgets = (panelId: string, newWidgets: GeneratedWidget[], newRowsLayout: (string | null)[][] | null = null) => {
    setPanelCustom((prev) => {
      const cur = prev[panelId];
      if (!cur) return prev;
      const next: Record<string, PanelCustomState> = { ...prev, [panelId]: { ...cur, widgets: newWidgets, layout: [], rowsLayout: newRowsLayout } };
      persistCustom(next);
      return next;
    });
  };

  const handleResizeWidget = (panelId: string, widgetId: string, heightPx: number) => {
    setPanelCustom((prev) => {
      const cur = prev[panelId];
      if (!cur) return prev;
      const heights = { ...cur.heights, [widgetId]: heightPx };
      const next: Record<string, PanelCustomState> = { ...prev, [panelId]: { ...cur, heights, layout: [] } };
      persistCustom(next);
      return next;
    });
  };

  // ── Tab layout state ─────────────────────────────────────────────────────────

  const [tabLayouts, setTabLayouts] = useState<Record<string, TabLayoutState>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('bi_tab_layouts') || '{}') as Record<string, any>;
      // Strip stored heights — resize was removed, heights are always DEFAULT_CARD_HEIGHTS
      return Object.fromEntries(
        Object.entries(stored).map(([k, v]) => [k, { ...v, heights: {} }]),
      );
    } catch { return {}; }
  });

  const [hiddenTabs, setHiddenTabs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('bi_hidden_tabs') || '[]'); } catch { return []; }
  });
  const [tabToDelete, setTabToDelete] = useState<{ value: string; label: string } | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);

  const handleHideTab = (value: string) => {
    const next = hiddenTabs.includes(value) ? hiddenTabs : [...hiddenTabs, value];
    setHiddenTabs(next);
    localStorage.setItem('bi_hidden_tabs', JSON.stringify(next));
    if (activePanel === value) setActivePanel('executivo');
    setTabToDelete(null);
  };

  const handleRestoreTab = (value: string) => {
    const next = hiddenTabs.filter((t) => t !== value);
    setHiddenTabs(next);
    if (next.length === 0) {
      localStorage.removeItem('bi_hidden_tabs');
      setRestoreModalOpen(false);
    } else {
      localStorage.setItem('bi_hidden_tabs', JSON.stringify(next));
    }
  };

  const handleRestoreAllTabs = () => {
    setHiddenTabs([]);
    localStorage.removeItem('bi_hidden_tabs');
    setRestoreModalOpen(false);
  };

  // Abas customizadas (criadas pelo usuário via "+")
  const [customTabs, setCustomTabs] = useState<{ id: string; label: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('bi_custom_tabs') || '[]'); } catch { return []; }
  });
  const [newTabModalOpen, setNewTabModalOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  const handleCreateCustomTab = () => {
    const label = newTabName.trim();
    if (!label) return;
    const id = `custom_${Date.now()}`;
    const next = [...customTabs, { id, label }];
    setCustomTabs(next);
    localStorage.setItem('bi_custom_tabs', JSON.stringify(next));
    setNewTabName('');
    setNewTabModalOpen(false);
    setActivePanel(id);
  };

  const handleDeleteCustomTab = (id: string) => {
    const next = customTabs.filter((t) => t.id !== id);
    setCustomTabs(next);
    localStorage.setItem('bi_custom_tabs', JSON.stringify(next));
    // limpa estado do painel
    setPanelCustom((prev) => {
      const updated = { ...prev };
      delete updated[id];
      try { localStorage.setItem('bi_panel_custom', JSON.stringify(Object.fromEntries(Object.entries(updated).map(([k, v]) => [k, { widgets: (v as any).widgets, heights: (v as any).heights, prompt: (v as any).prompt, rowsLayout: (v as any).rowsLayout }])))); } catch {}
      return updated;
    });
    if (activePanel === id) setActivePanel('executivo');
    setTabToDelete(null);
  };

  const persistTabLayouts = (next: Record<string, TabLayoutState>) => {
    localStorage.setItem('bi_tab_layouts', JSON.stringify(next));
  };

  const getTabLayout = (tabId: string): TabLayoutState => {
    const stored = tabLayouts[tabId];
    const defaultOrder = DEFAULT_TAB_CARDS[tabId] || [];
    return {
      order: stored?.order?.length ? stored.order : defaultOrder,
      hidden: stored?.hidden || [],
      heights: stored?.heights || {},
      rowsLayout: stored?.rowsLayout ?? null,
    };
  };

  const handleTabCardHide = (tabId: string, cardId: string) => {
    setTabLayouts((prev) => {
      const cur = getTabLayout(tabId);
      const newRowsLayout = cur.rowsLayout
        ? cur.rowsLayout.map((row) => row.map((id) => (id === cardId ? null : id))).filter((row) => row.some((id) => id !== null))
        : null;
      const next = { ...prev, [tabId]: { ...cur, hidden: [...cur.hidden.filter((id) => id !== cardId), cardId], rowsLayout: newRowsLayout } };
      persistTabLayouts(next);
      return next;
    });
  };

  const handleTabCardResize = (tabId: string, cardId: string, heightPx: number) => {
    setTabLayouts((prev) => {
      const cur = getTabLayout(tabId);
      const next = { ...prev, [tabId]: { ...cur, heights: { ...cur.heights, [cardId]: heightPx } } };
      persistTabLayouts(next);
      return next;
    });
  };

  const handleTabLayoutReset = (tabId: string) => {
    setTabLayouts((prev) => {
      const next = { ...prev };
      delete next[tabId];
      persistTabLayouts(next);
      return next;
    });
  };

  const handleTabGridDndEnd = (tabId: string, e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const layout = getTabLayout(tabId);
    const aiVisibleIds = (panelCustom[tabId]?.widgets || []).map((w) => `${AI_WIDGET_CARD_PREFIX}${tabId}::${w.id}`);
    const visibleIds = [...layout.order.filter((id) => !layout.hidden.includes(id)), ...aiVisibleIds.filter((id) => !layout.hidden.includes(id))];
    const draggedId = String(active.id);
    if (!visibleIds.includes(draggedId)) return;

    const matrix = buildDisplayMatrix(visibleIds, layout.rowsLayout);
    const overId = String(over.id);

    // Find dragged card position
    let fromR = -1, fromC = -1;
    for (let r = 0; r < matrix.length; r++)
      for (let c = 0; c < MAX_PER_ROW; c++)
        if (matrix[r]?.[c] === draggedId) { fromR = r; fromC = c; }
    if (fromR < 0) return;

    const newMatrix: (string | null)[][] = matrix.map((row) => [...row]);

    if (overId.startsWith('grid-insert-')) {
      // grid-insert-{rowIdx}-{insertIdx}
      const parts = overId.split('-');
      const toR = parseInt(parts[2]);
      const insertAt = parseInt(parts[3]);
      while (newMatrix.length <= toR) newMatrix.push(Array(MAX_PER_ROW).fill(null));
      newMatrix[fromR][fromC] = null;
      const rowCards = newMatrix[toR].filter(Boolean) as string[];
      rowCards.splice(insertAt, 0, draggedId);
      const rebuilt: (string | null)[] = Array(MAX_PER_ROW).fill(null);
      rowCards.slice(0, MAX_PER_ROW).forEach((id, i) => { rebuilt[i] = id; });
      newMatrix[toR] = rebuilt;
      if (rowCards.length > MAX_PER_ROW) {
        const overflow: (string | null)[] = Array(MAX_PER_ROW).fill(null);
        rowCards.slice(MAX_PER_ROW).forEach((id, i) => { overflow[i] = id; });
        newMatrix.splice(toR + 1, 0, overflow);
      }
    } else if (overId.startsWith('grid-cell-') || overId.startsWith('grid-row-')) {
      const toR = parseInt(overId.split('-')[2]);
      while (newMatrix.length <= toR) newMatrix.push(Array(MAX_PER_ROW).fill(null));
      newMatrix[fromR][fromC] = null;
      const nextCol = newMatrix[toR].indexOf(null);
      if (nextCol >= 0) newMatrix[toR][nextCol] = draggedId;
      else { const nr: (string | null)[] = Array(MAX_PER_ROW).fill(null); nr[0] = draggedId; newMatrix.splice(toR + 1, 0, nr); }
    } else {
      let toR = -1, toC = -1;
      for (let r = 0; r < newMatrix.length; r++)
        for (let c = 0; c < MAX_PER_ROW; c++)
          if (newMatrix[r]?.[c] === overId) { toR = r; toC = c; }
      if (toR < 0 || (fromR === toR && fromC === toC)) return;
      newMatrix[fromR][fromC] = overId;
      newMatrix[toR][toC] = draggedId;
    }

    // Normalize: pack each row from left, remove trailing empty rows
    const normalized = dedupeEmptyRows(newMatrix.map((row) => packRow(row)));
    const newVisibleOrder = normalized.flat().filter(Boolean) as string[];
    const hiddenIds = [...layout.order, ...aiVisibleIds].filter((id) => layout.hidden.includes(id));
    const newOrder = [...newVisibleOrder, ...hiddenIds];

    setTabLayouts((prev) => {
      const next = { ...prev, [tabId]: { ...layout, order: newOrder, rowsLayout: normalized } };
      persistTabLayouts(next);
      return next;
    });
  };

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDndStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));
  const handleDndEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const cur = panelCustom[activePanel];
    if (!cur) return;
    const widgets = cur.widgets;
    const draggedId = String(active.id);
    const draggedWidget = widgets.find((w) => w.id === draggedId);
    if (!draggedWidget) return;

    const matrix = buildWidgetMatrix(widgets, cur.rowsLayout);
    const overId = String(over.id);

    let fromR = -1, fromC = -1;
    for (let r = 0; r < matrix.length; r++)
      for (let c = 0; c < MAX_PER_ROW; c++)
        if (matrix[r]?.[c]?.id === draggedId) { fromR = r; fromC = c; }
    if (fromR < 0) return;

    const newMatrix: (GeneratedWidget | null)[][] = matrix.map((row) => [...row]);

    if (overId.startsWith('grid-cell-') || overId.startsWith('grid-row-')) {
      const parts = overId.split('-');
      const toR = parseInt(parts[2]);
      while (newMatrix.length <= toR) newMatrix.push(Array(MAX_PER_ROW).fill(null));
      newMatrix[fromR][fromC] = null;
      const nextCol = newMatrix[toR].indexOf(null);
      if (nextCol >= 0) {
        newMatrix[toR][nextCol] = draggedWidget;
      } else {
        const newRow: (GeneratedWidget | null)[] = Array(MAX_PER_ROW).fill(null);
        newRow[0] = draggedWidget;
        newMatrix.splice(toR + 1, 0, newRow);
      }
    } else {
      let toR = -1, toC = -1;
      for (let r = 0; r < newMatrix.length; r++)
        for (let c = 0; c < MAX_PER_ROW; c++)
          if (newMatrix[r]?.[c]?.id === overId) { toR = r; toC = c; }
      if (toR < 0 || (fromR === toR && fromC === toC)) return;
      const tmp = newMatrix[fromR][fromC];
      newMatrix[fromR][fromC] = newMatrix[toR][toC];
      newMatrix[toR][toC] = tmp;
    }

    // Pack each row from left and remove extra empty rows
    const normalized = newMatrix
      .map((row): (GeneratedWidget | null)[] => { const cards = row.filter(Boolean) as GeneratedWidget[]; return [...cards, ...Array(MAX_PER_ROW - cards.length).fill(null)]; })
      .filter((row, i, arr) => row.some(Boolean) || (i < arr.length - 1 && arr[i + 1].some(Boolean)));
    while (normalized.length > 0 && normalized[0].every((c) => c === null)) normalized.shift();
    while (normalized.length > 0 && normalized[normalized.length - 1].every((c) => c === null)) normalized.pop();

    const newRowsLayout = normalized.map((row) => row.map((w) => w?.id ?? null));
    const newWidgets = normalized.flat().filter(Boolean) as GeneratedWidget[];
    handleReorderWidgets(activePanel, newWidgets, newRowsLayout);
  };



  const renderTabAISection = (tabId: string, tabLabel: string) => {
    const ps = panelCustom[tabId] || { widgets: [], prompt: '', loading: false, error: null, rowsLayout: null, heights: {}, layout: [] };
    const draft = customPromptDraft[tabId] ?? ps.prompt;
    return (
      <Stack gap="md" mt="md">
        <Paper p="md" withBorder style={{ background: panelBg, borderColor: 'rgba(10,37,104,0.18)' }}>
          <Group gap="xs" mb="xs">
            <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} radius="md" size={28}>
              <Sparkles size={14} />
            </ThemeIcon>
            <Text fw={700} size="sm">Descreva o que quer ver em "{tabLabel}"</Text>
          </Group>
          <Text size="xs" c="dimmed" mb="sm">
            Gere cards e análises personalizados para complementar os dados desta aba.
          </Text>
          <Group gap="xs" align="stretch">
            <Textarea
              style={{ flex: 1 }}
              placeholder="Ex: Quero ver um ranking dos 5 médicos com mais atendimentos e a taxa de cancelamento..."
              value={draft}
              onChange={(e) => { const val = e.currentTarget.value; setCustomPromptDraft((p) => ({ ...p, [tabId]: val })); }}
              minRows={2}
              autosize
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerateWidgets(tabId, tabLabel, draft); }}
            />
            <Tooltip label="Gerar (Ctrl+Enter)">
              <ActionIcon
                size="xl"
                variant="gradient"
                gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }}
                radius="md"
                style={{ alignSelf: 'stretch', height: 'auto' }}
                loading={ps.loading}
                disabled={!draft.trim()}
                onClick={() => handleGenerateWidgets(tabId, tabLabel, draft)}
              >
                <Send size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Paper>

        {ps.error && (
          <Alert color="red" title="Erro ao gerar widgets" icon={<XCircle size={16} />}>{ps.error}</Alert>
        )}

        {ps.loading && (
          <Paper p="xl" withBorder style={{ background: panelBg }}>
            <Stack align="center" gap="md" py="lg">
              <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} size={48} radius="xl"
                style={{ animation: 'bi-pulse 1.6s ease-in-out infinite' }}>
                <Sparkles size={22} />
              </ThemeIcon>
              <Text fw={600}>Gerando widgets com IA...</Text>
              <Loader size="sm" color="darkBlue" />
            </Stack>
          </Paper>
        )}

      </Stack>
    );
  };

  const buildTabCardsForGrid = (tabId: string, visibleOrder: string[], cardNodes: Record<string, React.ReactNode>) => {
    const aiWidgets = panelCustom[tabId]?.widgets || [];
    const aiCards = aiWidgets.map((widget) => ({
      id: `${AI_WIDGET_CARD_PREFIX}${tabId}::${widget.id}`,
      node: (
        <WidgetCardContent
          widget={widget}
          subtitle={getEditedTitle('ai', tabId, widget.id, widget.title, 'Informação gerada por IA').subtitle}
          panelBg={panelBg}
          colorScheme={colorScheme}
          chartGridColor={chartGridColor}
          // Em abas padrão, os ícones de ação ficam no shell (drag/lápis/lixeira).
          onDelete={undefined}
          onEditTitle={undefined}
        />
      ),
    }));
    const aiCardIds = aiCards.map((card) => card.id);
    const mergedOrder = [...visibleOrder, ...aiCardIds.filter((id) => !visibleOrder.includes(id))];
    const mergedNodes = new Map<string, React.ReactNode>([
      ...Object.entries(cardNodes),
      ...aiCards.map((card) => [card.id, card.node] as const),
    ]);
    return mergedOrder.map((id) => ({ id, node: mergedNodes.get(id) })).filter((c) => !!c.node);
  };

  const renderEditablePanelTitle = (tabId: string, cardId: string, title: string, subtitle: string, icon: ElementType) => {
    const current = getEditedTitle('static', tabId, cardId, title, subtitle);
    return (
      <PanelTitle
        title={current.title}
        description={current.subtitle}
        icon={icon}
      />
    );
  };

  const staticCardMeta: Record<string, { title: string; subtitle: string }> = {
    exec_trend: { title: 'Atendimentos x receita', subtitle: 'Tendência diária.' },
    exec_funnel: { title: 'Funil da jornada', subtitle: 'Do agendamento ao faturamento.' },
    exec_alerts: { title: 'Alertas de gestão', subtitle: 'Prioridades imediatas.' },
    op_metrics: { title: 'Operação — visão geral', subtitle: 'Ocupação e recursos.' },
    op_rooms: { title: 'Ocupação por sala', subtitle: 'Ranking de uso.' },
    op_demand: { title: 'Demanda por horário', subtitle: 'Picos por faixa.' },
    op_equipments: { title: 'Equipamentos', subtitle: 'Uso por equipamento e modalidade.' },
    op_professionals: { title: 'Profissionais', subtitle: 'Ocupação estimada por agenda profissional.' },
    fin_metrics: { title: 'Financeiro do período', subtitle: 'Entradas, saídas e faturamento.' },
    fin_mix: { title: 'Mix financeiro por convênio', subtitle: 'Participação no faturamento do período.' },
    fin_cashflow: { title: 'Fluxo de caixa diário', subtitle: 'Entradas, saídas e faturado por dia.' },
    cli_metrics: { title: 'Laudos e autorizações', subtitle: 'Backlog clínico e risco de atendimento.' },
    cli_sla: { title: 'SLA e backlog clínico', subtitle: 'Assinatura e envelhecimento.' },
    cli_modalities: { title: 'Modalidades com maior SLA', subtitle: 'Top exames/modalidades por volume assinado.' },
    res_metrics: { title: 'Recursos e estoque', subtitle: 'Insumos e riscos operacionais.' },
    res_coverage: { title: 'Cobertura e consumo', subtitle: 'Consumo e cobertura em dias.' },
    conv_metrics: { title: 'Autorizações por status', subtitle: 'Panorama do período.' },
    conv_mix: { title: 'Mix de status', subtitle: 'Distribuição das autorizações.' },
    tea_metrics: { title: 'Visão TEA', subtitle: 'Planejamento e conversão de reservas.' },
    tea_mix: { title: 'Mix das reservas TEA', subtitle: 'Pendentes, convertidas e canceladas.' },
    laud_metrics: { title: 'Laudos e exames', subtitle: 'Backlog e TAT.' },
    laud_volume: { title: 'Volume por modalidade', subtitle: 'Principais exames/modalidades do período.' },
    com_metrics: { title: 'Comunicação e experiência', subtitle: 'WhatsApp e entregas.' },
    com_flows: { title: 'Fluxos de conversa', subtitle: 'Fluxos mais acionados no WhatsApp.' },
  };

  const openStaticCardEditor = (tabId: string, cardId: string) => {
    const meta = staticCardMeta[cardId];
    if (!meta) return;
    const current = getEditedTitle('static', tabId, meta.title, meta.title, meta.subtitle);
    openTitleEditor('static', tabId, meta.title, current.title, current.subtitle);
  };

  const openAICardEditorFromCombinedId = (tabId: string, combinedId: string) => {
    const widgetId = combinedId.split('::').slice(2).join('::');
    const widget = (panelCustom[tabId]?.widgets || []).find((w) => w.id === widgetId);
    if (!widget) return;
    const current = getEditedTitle('ai', tabId, widgetId, widget.title, 'Informação gerada por IA');
    openTitleEditor('ai', tabId, widgetId, current.title, current.subtitle);
  };

  const buildInsightsPayload = () => ({
    data: {
      overview: biOverviewQuery.data,
      financial: biFinancialQuery.data,
      clinical: biClinicalQuery.data,
      occupancy: biOccupancyQuery.data,
      reports: biReportsQuery.data,
      authorizations: biAuthorizationsQuery.data,
      tea: biTeaQuery.data,
      resources: biResourcesQuery.data,
      communication: biCommunicationQuery.data,
    },
    period: {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
    },
    filters: {
      doctorId: doctorFilter,
      insuranceId: insuranceFilter,
      procedureId: procedureFilter,
      sectorId: sectorFilter,
    },
  });

  const handleOpenInsights = async () => {
    setInsightsOpen(true);
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const { data, period, filters } = buildInsightsPayload();
      const result = await biService.getInsights(data, period, filters, false);
      const isRefreshed = !result.fromCache;
      setInsightsResult(result);
      if (isRefreshed) {
        setShowNewDataAnimation(true);
        setTimeout(() => setShowNewDataAnimation(false), 3000);
      }
    } catch (err: any) {
      setInsightsError(err?.response?.data?.error || err?.message || 'Não foi possível gerar os insights. Tente novamente.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const appointmentsQuery = useAppointmentsQuery();
  const clinicalQueueQuery = useClinicalQueueQuery();
  const preSchedulingsQuery = usePreSchedulingsQuery({ resolvedOnly: true });
  const financeQuery = useFinanceEntriesQuery();
  const invoicesQuery = useInvoicesQuery();
  const tissQuery = useTissBatchesQuery();
  const reportsQuery = useReportsQuery();
  const authorizationsQuery = useConvenioAuthorizationsQuery({});
  const inventoryQuery = useInventoryItemsQuery();
  const teaProfilesQuery = useTeaProfilesQuery();
  const sectorsQuery = useSettingsSectorsQuery();

  const loading = [
    appointmentsQuery,
    clinicalQueueQuery,
    preSchedulingsQuery,
    financeQuery,
    invoicesQuery,
    reportsQuery,
  ].some((query) => query.isLoading);

  const today = dayjs();
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (period === '7d') return { startDate: today.subtract(6, 'day').startOf('day'), endDate: today.endOf('day'), periodLabel: 'ultimos 7 dias' };
    if (period === '90d') return { startDate: today.subtract(89, 'day').startOf('day'), endDate: today.endOf('day'), periodLabel: 'ultimos 90 dias' };
    if (period === 'month') return { startDate: today.startOf('month'), endDate: today.endOf('day'), periodLabel: 'mes atual' };
    return { startDate: today.subtract(29, 'day').startOf('day'), endDate: today.endOf('day'), periodLabel: 'ultimos 30 dias' };
  }, [period, today]);
  const biOverviewQuery = useBIOverviewQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });
  const biOccupancyQuery = useBIOccupancyQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });
  const biFinancialQuery = useBIFinancialQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });
  const biClinicalQuery = useBIClinicalQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });
  const biResourcesQuery = useBIResourcesQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });
  const biAuthorizationsQuery = useBIAuthorizationsQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });
  const biTeaQuery = useBITeaQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });
  const biReportsQuery = useBIReportsQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });
  const biCommunicationQuery = useBICommunicationQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    doctorId: doctorFilter,
    insuranceId: insuranceFilter,
    procedureId: procedureFilter,
    sectorId: sectorFilter,
  });

  const localData = useMemo(() => {
    const appointments = appointmentsQuery.data || [];
    const clinicalQueue = clinicalQueueQuery.data || [];
    const preSchedulings = preSchedulingsQuery.data || [];
    const financeEntries = financeQuery.data || [];
    const invoices = invoicesQuery.data || [];
    const tissBatches = tissQuery.data || [];
    const reports = reportsQuery.data || [];
    const authorizations = authorizationsQuery.data || [];
    const inventoryItems = inventoryQuery.data || [];
    const teaProfiles = teaProfilesQuery.data || [];

    const appointmentsInPeriod = appointments.filter((item: any) => inRange(itemDate(item, ['date', 'data', 'scheduledAt', 'appointmentDate']), startDate, endDate));
    const reportsInPeriod = reports.filter((item: any) => inRange(itemDate(item, ['scheduledFor', 'createdAt', 'updatedAt']), startDate, endDate));
    const invoicesInPeriod = invoices.filter((item: any) => inRange(itemDate(item, ['issuedAt', 'createdAt', 'dueDate']), startDate, endDate));
    const financeInPeriod = financeEntries.filter((item: any) => inRange(itemDate(item, ['dueDate', 'paidAt', 'createdAt']), startDate, endDate));

    const revenue = financeInPeriod.filter(isRevenue).reduce((sum: number, entry: any) => sum + getEntryValue(entry), 0);
    const expenses = financeInPeriod.filter(isExpense).reduce((sum: number, entry: any) => sum + getEntryValue(entry), 0);
    const invoiced = invoicesInPeriod.reduce((sum: number, invoice: any) => sum + getInvoiceValue(invoice), 0);
    const realized = appointmentsInPeriod.filter((item: any) => isAppointmentDone(item?.status)).length;
    const canceled = appointmentsInPeriod.filter((item: any) => isCanceled(item?.status)).length;
    const pendingAppointments = appointmentsInPeriod.filter((item: any) => isPending(item?.status)).length;
    const pendingReports = reports.filter((item: any) => {
      const status = normalizeStatus(item?.status);
      return !status || ['DRAFT', 'PENDENTE', 'EM ANDAMENTO', 'REVIEW', 'REVISAO'].some((token) => status.includes(token));
    }).length;
    const signedReports = reportsInPeriod.filter((item: any) => item?.issuerSignedAt || item?.reviewerSignedAt || normalizeStatus(item?.status).includes('ASSIN')).length;
    const pendingAuthorizations = authorizations.filter((item: any) => normalizeStatus(item?.status).includes('PENDING') || normalizeStatus(item?.status).includes('PENDENTE')).length;
    const deniedAuthorizations = authorizations.filter((item: any) => normalizeStatus(item?.status).includes('DENIED') || normalizeStatus(item?.status).includes('NEG')).length;
    const criticalStock = inventoryItems.filter((item: any) => {
      const quantity = asNumber(firstValue(item, ['quantity', 'quantidade']));
      const minimum = asNumber(firstValue(item, ['minQuantity', 'minimo', 'minimumQuantity']));
      const status = normalizeStatus(item?.status);
      return status.includes('LOW') || status.includes('CRIT') || (minimum > 0 && quantity <= minimum);
    }).length;
    const activeTeaProfiles = teaProfiles.filter((item: any) => item?.isActive !== false && item?.tea?.isActive !== false).length;
    const pendingTiss = tissBatches.filter((item: any) => ['DRAFT', 'GENERATED', 'SENT', 'REJECTED'].includes(normalizeStatus(item?.status))).length;
    const glosaValue = tissBatches.reduce((sum: number, batch: any) => {
      const items = Array.isArray(batch?.items) ? batch.items : [];
      return sum + items.reduce((itemSum: number, item: any) => itemSum + asNumber(item?.glosaValue), 0);
    }, 0);

    const days = Math.max(1, endDate.diff(startDate, 'day') + 1);
    const trend = Array.from({ length: Math.min(days, 45) }).map((_, index) => {
      const date = startDate.add(days > 45 ? Math.floor((index * days) / 45) : index, 'day');
      const key = date.format('YYYY-MM-DD');
      const label = date.format('DD/MM');
      const dailyAppointments = appointmentsInPeriod.filter((item: any) => itemDate(item, ['date', 'data', 'scheduledAt', 'appointmentDate'])?.format('YYYY-MM-DD') === key);
      const dailyInvoices = invoicesInPeriod.filter((item: any) => itemDate(item, ['issuedAt', 'createdAt', 'dueDate'])?.format('YYYY-MM-DD') === key);
      return {
        date: label,
        atendimentos: dailyAppointments.filter((item: any) => !isCanceled(item?.status)).length,
        realizados: dailyAppointments.filter((item: any) => isAppointmentDone(item?.status)).length,
        receita: Math.round(dailyInvoices.reduce((sum: number, invoice: any) => sum + getInvoiceValue(invoice), 0)),
      };
    });

    const funnel = [
      { name: 'Agendados', value: appointmentsInPeriod.length, color: '#0A2568' },
      { name: 'Pre-atendimento', value: preSchedulings.length, color: '#2563eb' },
      { name: 'Recepção', value: clinicalQueue.length, color: '#0f766e' },
      { name: 'Realizados', value: realized, color: '#16a34a' },
      { name: 'Laudos', value: signedReports, color: '#7c3aed' },
      { name: 'Faturados', value: invoicesInPeriod.length, color: '#b45309' },
    ];

    const specialtyMap = new Map<string, number>();
    appointmentsInPeriod.forEach((item: any) => {
      const name = getItemName(item, ['specialty', 'procedureName', 'type', 'examType'], 'Sem especialidade');
      specialtyMap.set(name, (specialtyMap.get(name) || 0) + 1);
    });
    const specialties = Array.from(specialtyMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const insuranceMap = new Map<string, number>();
    appointmentsInPeriod.forEach((item: any) => {
      const name = getItemName(item, ['convenio', 'insurance', 'healthInsuranceName'], 'Particular/sem convênio');
      insuranceMap.set(name, (insuranceMap.get(name) || 0) + 1);
    });
    const insuranceMix = Array.from(insuranceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const alerts = [
      {
        title: 'Autorizacoes pendentes',
        value: pendingAuthorizations,
        detail: deniedAuthorizations > 0 ? `${deniedAuthorizations} negadas exigem revisao` : 'Sem negativas relevantes',
        tone: pendingAuthorizations > 0 ? 'orange' : 'teal',
      },
      {
        title: 'Laudos no backlog',
        value: pendingReports,
        detail: 'Priorize exames com maior SLA',
        tone: pendingReports > 0 ? 'red' : 'teal',
      },
      {
        title: 'Estoque crítico',
        value: criticalStock,
        detail: 'Itens abaixo do minimo operacional',
        tone: criticalStock > 0 ? 'yellow' : 'teal',
      },
      {
        title: 'TISS pendente',
        value: pendingTiss,
        detail: glosaValue > 0 ? `${currencyFormatter.format(glosaValue)} em glosas` : 'Sem glosas registradas',
        tone: pendingTiss > 0 ? 'grape' : 'teal',
      },
    ];

    const attendanceRate = appointmentsInPeriod.length > 0 ? (realized / appointmentsInPeriod.length) * 100 : 0;
    const ticketAverage = realized > 0 ? (invoiced || revenue) / realized : 0;

    return {
      activeTeaProfiles,
      alerts,
      appointmentsInPeriod,
      attendanceRate,
      canceled,
      criticalStock,
      expenses,
      funnel,
      glosaValue,
      insuranceMix,
      invoiced,
      pendingAppointments,
      pendingAuthorizations,
      pendingReports,
      pendingTiss,
      realized,
      reportsInPeriod,
      revenue,
      signedReports,
      specialties,
      ticketAverage,
      trend,
    };
  }, [
    appointmentsQuery.data,
    authorizationsQuery.data,
    clinicalQueueQuery.data,
    endDate,
    financeQuery.data,
    inventoryQuery.data,
    invoicesQuery.data,
    preSchedulingsQuery.data,
    reportsQuery.data,
    startDate,
    teaProfilesQuery.data,
    tissQuery.data,
  ]);

  const data = useMemo(() => {
    const overview = biOverviewQuery.data as any;
    if (!overview?.kpis || !overview?.charts) return localData;

    return {
      activeTeaProfiles: asNumber(overview.kpis.activeTeaProfiles),
      alerts: Array.isArray(overview.alerts) ? overview.alerts : localData.alerts,
      appointmentsInPeriod: Array.from({ length: asNumber(overview.kpis.appointments) }),
      attendanceRate: asNumber(overview.kpis.attendanceRate),
      canceled: asNumber(overview.kpis.canceledAppointments),
      criticalStock: asNumber(overview.kpis.criticalStock),
      expenses: asNumber(overview.kpis.expenses),
      funnel: withFunnelColors(overview.charts.funnel || []),
      glosaValue: asNumber(overview.kpis.glosaValue),
      insuranceMix: Array.isArray(overview.charts.insuranceMix) ? overview.charts.insuranceMix : [],
      invoiced: asNumber(overview.kpis.invoiced),
      pendingAppointments: asNumber(overview.kpis.pendingAppointments),
      pendingAuthorizations: asNumber(overview.kpis.pendingAuthorizations),
      pendingReports: asNumber(overview.kpis.pendingReports),
      pendingTiss: asNumber(overview.kpis.pendingTiss),
      realized: asNumber(overview.kpis.realizedAppointments),
      reportsInPeriod: Array.from({ length: asNumber(overview.kpis.signedReports) }),
      revenue: asNumber(overview.kpis.revenue),
      signedReports: asNumber(overview.kpis.signedReports),
      specialties: Array.isArray(overview.charts.specialties) ? overview.charts.specialties : [],
      ticketAverage: asNumber(overview.kpis.ticketAverage),
      trend: Array.isArray(overview.charts.trend) ? overview.charts.trend : [],
    };
  }, [biOverviewQuery.data, localData]);

  const doctorOptions = useMemo(() => {
    const appointments = (appointmentsQuery.data || []) as any[];
    return Array.from(new Set(
      appointments
        .map((item: any) => String(firstValue(item, ['doctorName', 'doctor', 'medico']) || '').trim())
        .filter(Boolean),
    )).sort().map((name) => ({ value: name, label: name }));
  }, [appointmentsQuery.data]);

  const insuranceOptions = useMemo(() => {
    const appointments = (appointmentsQuery.data || []) as any[];
    return Array.from(new Set(
      appointments
        .map((item: any) => String(firstValue(item, ['convenio', 'insurance', 'healthInsuranceName']) || '').trim())
        .filter(Boolean),
    )).sort().map((name) => ({ value: name, label: name }));
  }, [appointmentsQuery.data]);

  const procedureOptions = useMemo(() => {
    const appointments = (appointmentsQuery.data || []) as any[];
    return Array.from(new Set(
      appointments
        .map((item: any) => String(firstValue(item, ['procedureName', 'specialty', 'type', 'examType']) || '').trim())
        .filter(Boolean),
    )).sort().map((name) => ({ value: name, label: name }));
  }, [appointmentsQuery.data]);

  const sectorOptions = useMemo(() => {
    const sectorData = sectorsQuery.data as any;
    const sectorItems = Array.isArray(sectorData)
      ? sectorData
      : Array.isArray(sectorData?.items)
        ? sectorData.items
        : [];
    const fromSettings = sectorItems
      .map((item: any) => String(firstValue(item, ['name', 'description']) || '').trim())
      .filter(Boolean);
    const appointments = (appointmentsQuery.data || []) as any[];
    const fromAppointments = appointments
      .map((item: any) => String(firstValue(item, ['sectorName', 'setor']) || '').trim())
      .filter(Boolean);
    return Array.from(new Set([
      ...fromSettings,
      ...fromAppointments,
    ]))
      .sort()
      .map((name) => ({ value: name, label: name }));
  }, [appointmentsQuery.data, sectorsQuery.data]);


  const chartGridColor = colorScheme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(10,37,104,0.09)';
  const panelBg = colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const occupancy = biOccupancyQuery.data as any;
  const occupancyRankings = occupancy?.rankings || {};
  const occupancyCharts = occupancy?.charts || {};
  const occupancyKpis = occupancy?.kpis || {};
  const financial = biFinancialQuery.data as any;
  const financialKpis = financial?.kpis || {};
  const financialCharts = financial?.charts || {};
  const financialMixData = ((financialCharts.insuranceRevenueMix as any[]) || []).length > 0
    ? (financialCharts.insuranceRevenueMix as any[])
    : data.insuranceMix;
  const financialCashflowData = ((financialCharts.cashflowTrend as any[]) || []).length > 0
    ? (financialCharts.cashflowTrend as any[])
    : data.trend.map((item: any) => ({
      date: item.date,
      revenue: asNumber(item.receita),
      expenses: 0,
      invoiced: asNumber(item.receita),
    }));
  const hasFinancialMixValues = financialMixData.some((item: any) => asNumber(item?.value) > 0);
  const hasFinancialCashflowValues = financialCashflowData.some((item: any) => (
    asNumber(item?.revenue) > 0 || asNumber(item?.expenses) > 0 || asNumber(item?.invoiced) > 0
  ));
  const hasExecutiveTrend = (data.trend || []).some((item: any) => asNumber(item?.atendimentos) > 0 || asNumber(item?.receita) > 0);
  const hasFunnelValues = (data.funnel || []).some((item: any) => asNumber(item?.value) > 0);
  const hasOperationalHourlyDemand = ((occupancyCharts.hourlyDemand as any[]) || []).some((item: any) => asNumber(item?.appointments) > 0);
  const hasOperationalRooms = ((occupancyRankings.rooms as any[]) || []).some((item: any) => asNumber(item?.occupancyRate) > 0 || asNumber(item?.appointments) > 0);
  const hasOperationalEquipments = ((occupancyRankings.equipments as any[]) || []).length > 0;
  const hasOperationalProfessionals = ((occupancyRankings.professionals as any[]) || []).length > 0;
  const hasResourceSignals = data.criticalStock > 0 || data.pendingTiss > 0;
  const clinical = biClinicalQuery.data as any;
  const clinicalKpis = clinical?.kpis || {};
  const clinicalCharts = clinical?.charts || {};
  const clinicalAgingData = ((clinicalCharts.backlogAging as any[]) || []);
  const clinicalModalityData = ((clinicalCharts.modalitySla as any[]) || []);
  const hasClinicalAging = clinicalAgingData.some((item: any) => asNumber(item?.value) > 0);
  const hasClinicalModality = clinicalModalityData.length > 0;
  const resources = biResourcesQuery.data as any;
  const resourcesKpis = resources?.kpis || {};
  const resourcesCriticalItems = (resources?.lists?.criticalItems || []) as any[];
  const authorizationsData = biAuthorizationsQuery.data as any;
  const authorizationsKpis = authorizationsData?.kpis || {};
  const authorizationsCharts = authorizationsData?.charts || {};
  const teaData = biTeaQuery.data as any;
  const teaKpis = teaData?.kpis || {};
  const teaCharts = teaData?.charts || {};
  const reportsData = biReportsQuery.data as any;
  const reportsKpis = reportsData?.kpis || {};
  const reportsCharts = reportsData?.charts || {};
  const communicationData = biCommunicationQuery.data as any;
  const communicationKpis = communicationData?.kpis || {};
  const communicationCharts = communicationData?.charts || {};

  return (
    <>
    <Drawer
      opened={insightsOpen}
      onClose={() => setInsightsOpen(false)}
      title={
        <Group gap="sm">
          <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} radius="md" size={32}>
            <Sparkles size={17} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="md">Insights com IA</Text>
            {insightsResult?.generatedAt && (
              <Text size="xs" c="dimmed">
                Gerado em {new Date(insightsResult.generatedAt).toLocaleString('pt-BR')}
              </Text>
            )}
          </Box>
        </Group>
      }
      position="right"
      size="lg"
      padding="xl"
      overlayProps={{ backgroundOpacity: 0.35, blur: 3 }}
    >
      {insightsLoading && (
        <Stack align="center" justify="center" gap="lg" mt="xl" pt="xl">
          <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} size={64} radius="xl"
            style={{ animation: 'bi-pulse 1.6s ease-in-out infinite' }}>
            <Sparkles size={30} />
          </ThemeIcon>
          <Stack gap={4} align="center">
            <Text fw={600} size="lg">Analisando os dados da clínica</Text>
            <Text c="dimmed" size="sm" ta="center">A IA está processando os indicadores.<br />Isso pode levar alguns segundos.</Text>
          </Stack>
          <Loader size="sm" color="darkBlue" />
          <style>{`@keyframes bi-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.85} }`}</style>
        </Stack>
      )}

      {insightsError && (
        <Alert color="red" title="Erro ao gerar insights" icon={<XCircle size={16} />} mt="md">
          {insightsError}
        </Alert>
      )}

      {insightsResult && !insightsLoading && (
        <Stack gap="xl">
          {showNewDataAnimation && (
            <Paper
              p="lg"
              radius="md"
              style={{
                background: 'linear-gradient(135deg, #0A2568, #0f766e)',
                animation: 'bi-fadein 0.5s ease',
                textAlign: 'center',
              }}
            >
              <style>{`@keyframes bi-fadein { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }`}</style>
              <Group justify="center" gap="sm" mb={6}>
                <Sparkles size={20} color="white" />
                <Text fw={700} c="white" size="md">Temos dados atualizados para você!</Text>
                <Sparkles size={20} color="white" />
              </Group>
              <Text c="rgba(255,255,255,0.75)" size="xs">
                Os insights foram regenerados agora com os dados mais recentes da clínica.
              </Text>
            </Paper>
          )}

          <Paper p="md" withBorder radius="md" style={{ background: colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8faff', borderColor: 'rgba(10,37,104,0.15)' }}>
            <Text size="sm" fw={500} c="dimmed" mb={4}>Resumo executivo</Text>
            <Text size="sm" lh={1.7}>{insightsResult.summary}</Text>
          </Paper>

          <Divider />

          {insightsResult.alerts.length > 0 && (
            <Box>
              <Group gap="xs" mb="sm">
                <ThemeIcon color="red" variant="light" size={26} radius="xl">
                  <AlertTriangle size={14} />
                </ThemeIcon>
                <Text fw={700} size="sm" c="red">Atenção imediata</Text>
              </Group>
              <Stack gap="xs">
                {insightsResult.alerts.map((raw, i) => {
                  const item = normalizeInsightAlert(raw);
                  const priorityColor = item.priority === 'CRÍTICO' ? 'red' : item.priority === 'ALTO' ? 'orange' : 'yellow';
                  const darkBg: Record<string, string> = { red: 'rgba(220,38,38,0.15)', orange: 'rgba(234,88,12,0.15)', yellow: 'rgba(202,138,4,0.12)' };
                  const darkBorder: Record<string, string> = { red: 'rgba(220,38,38,0.35)', orange: 'rgba(234,88,12,0.35)', yellow: 'rgba(202,138,4,0.3)' };
                  return (
                    <Paper key={i} p="sm" withBorder radius="sm" style={{
                      borderColor: colorScheme === 'dark' ? darkBorder[priorityColor] : `var(--mantine-color-${priorityColor}-3)`,
                      background: colorScheme === 'dark' ? darkBg[priorityColor] : `var(--mantine-color-${priorityColor}-0)`,
                    }}>
                      <Group gap="xs" align="flex-start" wrap="nowrap">
                        <Badge color={priorityColor} size="xs" variant="filled" style={{ flexShrink: 0, marginTop: 2 }}>{item.priority}</Badge>
                        <Text size="sm" lh={1.6} c={colorScheme === 'dark' ? 'var(--mantine-color-gray-2)' : undefined}>{item.text}</Text>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

          {insightsResult.negatives.length > 0 && (
            <Box>
              <Group gap="xs" mb="sm">
                <ThemeIcon color="orange" variant="light" size={26} radius="xl">
                  <TrendingDown size={14} />
                </ThemeIcon>
                <Text fw={700} size="sm" c="orange">Pontos negativos</Text>
              </Group>
              <List spacing="xs" size="sm" icon={<TrendingDown size={14} color="var(--mantine-color-orange-6)" style={{ marginTop: 2 }} />}>
                {insightsResult.negatives.map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Box>
          )}

          {insightsResult.positives.length > 0 && (
            <Box>
              <Group gap="xs" mb="sm">
                <ThemeIcon color="teal" variant="light" size={26} radius="xl">
                  <TrendingUp size={14} />
                </ThemeIcon>
                <Text fw={700} size="sm" c="teal">Pontos positivos</Text>
              </Group>
              <List spacing="xs" size="sm" icon={<CheckCircle2 size={14} color="var(--mantine-color-teal-6)" style={{ marginTop: 2 }} />}>
                {insightsResult.positives.map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Box>
          )}

          {insightsResult.suggestions.length > 0 && (
            <Box>
              <Group gap="xs" mb="sm">
                <ThemeIcon color="blue" variant="light" size={26} radius="xl">
                  <Lightbulb size={14} />
                </ThemeIcon>
                <Text fw={700} size="sm" c="blue">Sugestões de ação</Text>
              </Group>
              <Stack gap="xs">
                {insightsResult.suggestions.map((raw, i) => {
                  const item = normalizeInsightSuggestion(raw);
                  const timeframeColor = item.timeframe === 'imediato' ? 'red' : item.timeframe === 'esta semana' ? 'orange' : 'blue';
                  return (
                    <Paper key={i} p="sm" withBorder radius="sm" style={{
                      borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'var(--mantine-color-default-border)',
                      background: colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : undefined,
                    }}>
                      <Group gap="xs" mb={4} wrap="nowrap">
                        <Badge size="xs" color={timeframeColor} variant="light" style={{ flexShrink: 0 }}>{item.timeframe}</Badge>
                        <Badge size="xs" color="gray" variant="outline" style={{ flexShrink: 0 }}>{item.owner}</Badge>
                      </Group>
                      <Text size="sm" lh={1.6} c={colorScheme === 'dark' ? 'var(--mantine-color-gray-2)' : undefined}>{item.text}</Text>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

        </Stack>
      )}
    </Drawer>

    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Modal
        opened={titleEditorOpen}
        onClose={() => setTitleEditorOpen(false)}
        title="Editar card"
        centered
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Título"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.currentTarget.value)}
            placeholder="Digite o título do card"
          />
          <TextInput
            label="Subtítulo"
            value={subtitleDraft}
            onChange={(e) => setSubtitleDraft(e.currentTarget.value)}
            placeholder="Digite o subtítulo do card"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" color="gray" onClick={() => setTitleEditorOpen(false)}>Cancelar</Button>
            <Button onClick={saveTitleEditor} disabled={!titleDraft.trim() || !subtitleDraft.trim()}>Salvar</Button>
          </Group>
        </Stack>
      </Modal>
      <Box maw={1500} mx="auto" px={{ base: 'md', md: 'xl' }} py="xl">
        <Paper
          p={{ base: 'md', md: 'lg' }}
          mb="lg"
          withBorder
          style={{
            overflow: 'hidden',
            borderColor: 'rgba(10, 37, 104, 0.22)',
            background: colorScheme === 'dark'
              ? 'linear-gradient(135deg, rgba(10,37,104,0.55), rgba(15,118,110,0.2))'
              : 'linear-gradient(135deg, #f7fbff 0%, #eef7f4 52%, #fff7ed 100%)',
          }}
        >
          <Stack gap="sm">
            <Group gap="md" align="center" justify="space-between" wrap="wrap">
              <Group gap="md" align="center">
              <ActionIcon variant="white" color="dark" size="xl" onClick={() => navigate('/dashboard')}>
                <ArrowLeft size={20} />
              </ActionIcon>
              <Box>
                <Title
                  order={2}
                  fw={750}
                  c={colorScheme === 'dark' ? 'white' : 'dark'}
                  style={{ fontSize: 'clamp(1.5rem, 2.3vw, 2.2rem)', letterSpacing: 0 }}
                >
                  Cockpit executivo da clínica
                </Title>
              </Box>
            </Group>
            <Button
              leftSection={<Sparkles size={16} />}
              variant="gradient"
              gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }}
              size="sm"
              onClick={handleOpenInsights}
            >
              Visualizar Insights
            </Button>
            </Group>
            <Group align="flex-end" gap="sm" wrap="wrap">
              <Select
                w={190}
                label="Período"
                styles={{ label: { color: colorScheme === 'dark' ? 'white' : '#1f2937' } }}
                leftSection={<Filter size={16} />}
                data={[
                  { value: '7d', label: 'Últimos 7 dias' },
                  { value: '30d', label: 'Últimos 30 dias' },
                  { value: '90d', label: 'Últimos 90 dias' },
                  { value: 'month', label: 'Mês atual' },
                ]}
                value={period}
                onChange={(value) => setPeriod((value || '30d') as PeriodKey)}
              />
              <Select w={190} label="Médico" placeholder="Todos" searchable clearable value={doctorFilter} onChange={setDoctorFilter} data={doctorOptions} styles={{ label: { color: colorScheme === 'dark' ? 'white' : '#1f2937' } }} />
              <Select w={190} label="Convênio" placeholder="Todos" searchable clearable value={insuranceFilter} onChange={setInsuranceFilter} data={insuranceOptions} styles={{ label: { color: colorScheme === 'dark' ? 'white' : '#1f2937' } }} />
              <Select w={190} label="Procedimento" placeholder="Todos" searchable clearable value={procedureFilter} onChange={setProcedureFilter} data={procedureOptions} styles={{ label: { color: colorScheme === 'dark' ? 'white' : '#1f2937' } }} />
              <Select w={190} label="Setor" placeholder="Todos" searchable clearable value={sectorFilter} onChange={setSectorFilter} data={sectorOptions} styles={{ label: { color: colorScheme === 'dark' ? 'white' : '#1f2937' } }} />
            </Group>
          </Stack>
        </Paper>


        {/* Modal de criação de nova aba customizada */}
        <Modal
          opened={newTabModalOpen}
          onClose={() => { setNewTabModalOpen(false); setNewTabName(''); }}
          title={
            <Group gap="sm">
              <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} radius="md" size={32}><Sparkles size={16} /></ThemeIcon>
              <Text fw={700}>Nova aba personalizada</Text>
            </Group>
          }
          size="sm"
          centered
        >
          <Text size="sm" c="dimmed" mb="md">
            D? um nome para a nova aba. Depois você poder? usar a IA para gerar os cards que desejar.
          </Text>
          <input
            autoFocus
            placeholder="Ex: Análise por médico, Faturamento TEA..."
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustomTab(); }}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1.5px solid var(--mantine-color-default-border)',
              background: 'transparent',
              color: 'inherit',
              fontSize: 14,
              outline: 'none',
              marginBottom: 16,
            }}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={() => { setNewTabModalOpen(false); setNewTabName(''); }}>Cancelar</Button>
            <Button
              variant="gradient"
              gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }}
              leftSection={<PlusCircle size={14} />}
              disabled={!newTabName.trim()}
              onClick={handleCreateCustomTab}
            >
              Criar aba
            </Button>
          </Group>
        </Modal>

        {/* Modal de confirmação de exclusão de aba */}
        <Modal
          opened={tabToDelete !== null}
          onClose={() => setTabToDelete(null)}
          title={
            <Group gap="sm">
              <ThemeIcon color="red" variant="light" radius="md" size={32}><Trash2 size={16} /></ThemeIcon>
              <Text fw={700}>Excluir aba</Text>
            </Group>
          }
          size="sm"
          centered
        >
          <Text size="sm" c="dimmed" mb="xl">
            Tem certeza que deseja excluir a aba <Text span fw={700} c="dark">"{tabToDelete?.label}"</Text>?{' '}
            {tabToDelete && customTabs.some((ct) => ct.id === tabToDelete.value)
              ? 'Esta ação é permanente e não poderá ser desfeita.'
              : <span>Você pode restaurá-la clicando em <Text span fw={700}>"Restaurar abas"</Text> na barra de navegação.</span>}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={() => setTabToDelete(null)}>Cancelar</Button>
            <Button color="red" leftSection={<Trash2 size={14} />} onClick={() => {
              if (!tabToDelete) return;
              if (customTabs.some((ct) => ct.id === tabToDelete.value)) {
                handleDeleteCustomTab(tabToDelete.value);
              } else {
                handleHideTab(tabToDelete.value);
              }
            }}>
              Excluir
            </Button>
          </Group>
        </Modal>

        {/* Modal de restauração de abas */}
        {(() => {
          const ALL_TABS = [
            { value: 'executivo', label: 'Executivo' },
            { value: 'operacao', label: 'Operação' },
            { value: 'financeiro', label: 'Financeiro' },
            { value: 'clinico', label: 'Clínico' },
            { value: 'recursos', label: 'Recursos' },
            { value: 'convenios', label: 'Convênios' },
            { value: 'tea', label: 'TEA' },
            { value: 'laudos', label: 'Laudos' },
            { value: 'comunicacao', label: 'Comunicação' },
            { value: 'personalizavel', label: '✦ Personalizável' },
          ];
          const hiddenTabsInfo = ALL_TABS.filter((t) => hiddenTabs.includes(t.value));
          return (
            <Modal
              opened={restoreModalOpen}
              onClose={() => setRestoreModalOpen(false)}
              title={
                <Group gap="sm">
                  <ThemeIcon color="teal" variant="light" radius="md" size={32}><PlusCircle size={16} /></ThemeIcon>
                  <Text fw={700}>Restaurar abas</Text>
                </Group>
              }
              size="sm"
              centered
            >
              <Stack gap="xs" mb="lg">
                {hiddenTabsInfo.map((tab) => (
                  <Group key={tab.value} justify="space-between" p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                    <Text size="sm" fw={600}>{tab.label}</Text>
                    <Button size="xs" variant="light" color="teal" leftSection={<RotateCcw size={12} />} onClick={() => handleRestoreTab(tab.value)}>
                      Restaurar
                    </Button>
                  </Group>
                ))}
              </Stack>
              <Group justify="space-between">
                <Button variant="subtle" color="gray" size="sm" onClick={() => setRestoreModalOpen(false)}>Fechar</Button>
                <Button variant="light" color="teal" size="sm" leftSection={<RotateCcw size={13} />} onClick={handleRestoreAllTabs}>
                  Restaurar todas
                </Button>
              </Group>
            </Modal>
          );
        })()}

        {/* Navbar colorida */}
        <ScrollArea mb="lg" scrollbarSize={4} type="hover">
          <Group gap={6} wrap="nowrap" pb={4}>
            {([
              { value: 'executivo',   label: 'Executivo' },
              { value: 'operacao',    label: 'Operação' },
              { value: 'financeiro',  label: 'Financeiro' },
              { value: 'clinico',     label: 'Clínico' },
              { value: 'recursos',    label: 'Recursos' },
              { value: 'convenios',   label: 'Convênios' },
              { value: 'tea',         label: 'TEA' },
              { value: 'laudos',      label: 'Laudos' },
              { value: 'comunicacao', label: 'Comunicação' },
            ] as { value: string; label: string }[])
              .filter((tab) => !hiddenTabs.includes(tab.value))
              .concat(customTabs.map((ct) => ({ value: ct.id, label: ct.label })))
              .map((tab) => {
                const isActive = activePanel === tab.value;
                const isCustom = customTabs.some((ct) => ct.id === tab.value);
                return (
                  <Group
                    key={tab.value}
                    gap={0}
                    wrap="nowrap"
                    style={{
                      background: isActive ? (isCustom ? 'linear-gradient(135deg,#0A2568,#0f766e)' : DARK_BLUE) : 'transparent',
                      border: `1.5px solid ${isCustom ? 'rgba(15,118,110,0.6)' : 'rgba(255,255,255,0.25)'}`,
                      borderRadius: 8,
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      onClick={() => setActivePanel(tab.value)}
                      style={{ padding: '6px 8px 6px 14px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 650, fontSize: 13, color: '#fff' }}
                    >
                      {tab.label}
                    </Box>
                    <Tooltip label={`Excluir aba "${tab.label}"`} withArrow>
                      <Box
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setTabToDelete({ value: tab.value, label: tab.label }); }}
                        style={{ padding: '6px 8px 6px 4px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                      >
                        <XCircle size={13} />
                      </Box>
                    </Tooltip>
                  </Group>
                );
              })}

            {/* Botão + para criar nova aba customizada */}
            <Tooltip label="Criar nova aba personalizada" withArrow>
              <Box
                onClick={() => setNewTabModalOpen(true)}
                style={{
                  border: '1.5px solid rgba(15,118,110,0.5)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                  fontWeight: 650,
                  color: 'rgba(15,118,110,0.9)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = 'rgba(15,118,110,0.15)'; e.currentTarget.style.color = '#0f766e'; }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(15,118,110,0.9)'; }}
              >
                <PlusCircle size={14} />
                Nova aba
              </Box>
            </Tooltip>

            {hiddenTabs.length > 0 && (
              <Box
                onClick={() => setRestoreModalOpen(true)}
                style={{
                  border: '1.5px dashed rgba(255,255,255,0.25)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                <PlusCircle size={13} />
                Restaurar abas ({hiddenTabs.length})
              </Box>
            )}
          </Group>
        </ScrollArea>

        {/* Painel Personalizável */}
        {customTabs.some((ct) => ct.id === activePanel) && (() => {
          const panelId = activePanel;
          const panelLabel = customTabs.find((ct) => ct.id === panelId)?.label ?? panelId;
          const ps = panelCustom[panelId] || { widgets: [], prompt: '', loading: false, error: null };
          const draft = customPromptDraft[panelId] ?? ps.prompt;
          return (
            <Stack gap="lg">
              <Paper p="md" withBorder style={{ background: panelBg, borderColor: 'rgba(10,37,104,0.18)' }}>
                <Group gap="xs" mb="xs">
                  <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} radius="md" size={30}>
                    <Sparkles size={15} />
                  </ThemeIcon>
                  <Text fw={700} size="sm">Descreva o que quer ver em "{panelLabel}"</Text>
                </Group>
                <Text size="xs" c="dimmed" mb="sm">
                  A IA vai gerar cards, gráficos e análises com base nos dados reais do BI.
                </Text>
                <Group gap="xs" align="stretch">
                  <Textarea
                    style={{ flex: 1 }}
                    placeholder="Ex: Quero ver a receita por convênio em gráfico de pizza, os 5 médicos com mais atendimentos e o ticket médio."
                    value={draft}
                    onChange={(e) => { const val = e.currentTarget.value; setCustomPromptDraft((p) => ({ ...p, [panelId]: val })); }}
                    minRows={2}
                    autosize
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerateWidgets(panelId, panelLabel, draft); }}
                  />
                  <Tooltip label="Gerar (Ctrl+Enter)">
                    <ActionIcon
                      size="xl"
                      variant="gradient"
                      gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }}
                      radius="md"
                      style={{ alignSelf: 'stretch', height: 'auto' }}
                      loading={ps.loading}
                      disabled={!draft.trim()}
                      onClick={() => handleGenerateWidgets(panelId, panelLabel, draft)}
                    >
                      <Send size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Paper>

              {ps.error && (
                <Alert color="red" title="Erro ao gerar widgets" icon={<XCircle size={16} />}>{ps.error}</Alert>
              )}

              {ps.loading && (
                <Paper p="xl" withBorder style={{ background: panelBg }}>
                  <Stack align="center" gap="md" py="lg">
                    <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} size={56} radius="xl"
                      style={{ animation: 'bi-pulse 1.6s ease-in-out infinite' }}>
                      <Sparkles size={26} />
                    </ThemeIcon>
                    <Text fw={600}>Gerando widgets com IA...</Text>
                    <Loader size="sm" color="darkBlue" />
                    <style>{`@keyframes bi-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.85}}`}</style>
                  </Stack>
                </Paper>
              )}

              {!ps.loading && ps.widgets.length > 0 && (
                <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={handleDndStart} onDragEnd={handleDndEnd}>
                  <WidgetGrid
                    widgets={ps.widgets}
                    rowsLayout={ps.rowsLayout}
                    heights={ps.heights}
                    panelBg={panelBg}
                    colorScheme={colorScheme}
                    chartGridColor={chartGridColor}
                    isDragActive={!!activeDragId}
                    onDelete={(id) => handleDeleteWidget(panelId, id)}
                    onResize={(id, h) => handleResizeWidget(panelId, id, h)}
                    getWidgetSubtitle={(widget) => getEditedTitle('ai', panelId, widget.id, widget.title, 'Informação gerada por IA').subtitle}
                    onEditWidgetTitle={(widget) => {
                      const current = getEditedTitle('ai', panelId, widget.id, widget.title, 'Informação gerada por IA');
                      openTitleEditor('ai', panelId, widget.id, current.title, current.subtitle);
                    }}
                  />
                  <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                    {activeDragId ? (() => {
                      const w = ps.widgets.find((x) => x.id === activeDragId);
                      const h = w ? (ps.heights[w.id] ?? DEFAULT_HEIGHT_PX[w.type] ?? ROW_HEIGHT_PX) : ROW_HEIGHT_PX;
                      return w ? (
                        <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }}>
                          <WidgetCardContent
                            widget={w}
                            subtitle={getEditedTitle('ai', panelId, w.id, w.title, 'Informação gerada por IA').subtitle}
                            panelBg={panelBg}
                            colorScheme={colorScheme}
                            chartGridColor={chartGridColor}
                          />
                        </div>
                      ) : null;
                    })() : null}
                  </DragOverlay>
                </DndContext>
              )}

              {!ps.loading && !ps.error && ps.widgets.length === 0 && (
                <Paper p="xl" withBorder style={{ background: panelBg }}>
                  <Stack align="center" gap="sm" py="xl">
                    <ThemeIcon size={52} radius="xl" variant="light" color="gray"><Sparkles size={24} /></ThemeIcon>
                    <Text fw={600} ta="center">Nenhum widget gerado ainda</Text>
                    <Text size="sm" c="dimmed" ta="center" maw={400}>
                      Descreva o que você quer ver em "{panelLabel}" e clique em enviar. A IA vai criar cards, gráficos e análises com base nos dados reais.
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Stack>
          );
        })()}

        {activePanel === 'executivo' && (() => {
          const tabId = 'executivo';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const cardNodes: Record<string, React.ReactNode> = {
            exec_trend: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Atendimentos x receita", "Atendimentos x receita", "Tendência diária.", LineChartIcon)}
                <Box style={{ minWidth: 0 }}>
                  {hasExecutiveTrend ? (
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['exec_trend'] ?? 460) - 120}>
                      <AreaChart data={data.trend}>
                        <defs>
                          <linearGradient id="receitaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={chartGridColor} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <ChartTooltip formatter={(value: any, name: any) => (String(name) === 'receita' ? currencyFormatter.format(Number(value)) : integerFormatter.format(Number(value)))} />
                        <Bar yAxisId="left" dataKey="atendimentos" fill={DARK_BLUE} radius={[6, 6, 0, 0]} />
                        <Area yAxisId="right" type="monotone" dataKey="receita" stroke="#0f766e" fill="url(#receitaGradient)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center" gap="xs">
                      <ThemeIcon size={42} radius="xl" variant="light" color="gray"><LineChartIcon size={20} /></ThemeIcon>
                      <Text size="sm" fw={600}>Sem tendência no período</Text>
                      <Text size="xs" c="dimmed">Os atendimentos e receita diária aparecerão aqui automaticamente.</Text>
                    </Stack>
                  )}
                </Box>
              </Paper>
            ),
            exec_funnel: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Funil da jornada", "Funil da jornada", "Do agendamento ao faturamento.", TrendingUp)}
                <Stack gap="md">
                  {hasFunnelValues ? data.funnel.map((step, index) => {
                    const maxValue = Math.max(...data.funnel.map((item) => item.value), 1);
                    return (
                      <Box key={step.name}>
                        <Group justify="space-between" mb={6}>
                          <Group gap="xs">
                            <Badge size="sm" variant="light" color="gray">{index + 1}</Badge>
                            <Text size="sm" fw={650}>{step.name}</Text>
                          </Group>
                          <Text size="sm" fw={700}>{integerFormatter.format(step.value)}</Text>
                        </Group>
                        <Progress value={(step.value / maxValue) * 100} color={step.color} radius="xl" size="lg" />
                      </Box>
                    );
                  }) : (
                    <Stack h={250} justify="center" align="center" gap="xs">
                      <ThemeIcon size={42} radius="xl" variant="light" color="gray"><TrendingUp size={20} /></ThemeIcon>
                      <Text size="sm" fw={600}>Sem avanço de jornada no período</Text>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            ),
            exec_alerts: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Alertas de gestão", "Alertas de gestão", "Prioridades imediatas.", AlertTriangle)}
                <Stack gap="sm">
                  {data.alerts.map((alert: any) => (
                    <Box key={alert.title} p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Box>
                          <Text size="sm" fw={700}>{alert.title}</Text>
                          <Text size="xs" c="dimmed">{alert.detail}</Text>
                        </Box>
                        <Badge color={alert.tone} size="lg" variant="light">{alert.value}</Badge>
                      </Group>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && (
                  <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>
                )}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>
                  Resetar layout
                </Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        {activePanel === 'operacao' && (() => {
          const tabId = 'operacao';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const cardNodes: Record<string, React.ReactNode> = {
            op_metrics: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Operação — visão geral", "Operação — visão geral", "Ocupação e recursos.", BarChart3)}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <MetricTile label="Ocupação geral" value={`${percentFormatter.format(asNumber(occupancyKpis.occupancyRate))}%`} hint={`${formatHours(asNumber(occupancyKpis.bookedMinutes))} ocupadas`} icon={BarChart3} tone="darkBlue" />
                  <MetricTile label="Horas ociosas" value={formatHours(asNumber(occupancyKpis.idleMinutes))} hint="Capacidade estimada livre" icon={Clock3} tone="orange" />
                  <MetricTile label="Sem recurso" value={integerFormatter.format(asNumber(occupancyKpis.noResourceAppointments))} hint="Sem sala/equipamento" icon={AlertTriangle} tone="yellow" />
                  <MetricTile label="Recursos ativos" value={integerFormatter.format(asNumber(occupancyKpis.roomsCount) + asNumber(occupancyKpis.equipmentsCount))} hint={`${asNumber(occupancyKpis.roomsCount)} salas | ${asNumber(occupancyKpis.equipmentsCount)} equipamentos`} icon={PackageCheck} tone="teal" />
                </SimpleGrid>
              </Paper>
            ),
            op_rooms: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Ocupação por sala", "Ocupação por sala", "Ranking de uso.", CalendarCheck)}
                <Box style={{ minWidth: 0 }}>
                  {hasOperationalRooms ? (
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['op_rooms'] ?? 460) - 120}>
                      <BarChart data={occupancyRankings.rooms || []} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid stroke={chartGridColor} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <ChartTooltip formatter={(value: any, name: any) => (String(name) === 'occupancyRate' ? `${percentFormatter.format(Number(value))}%` : integerFormatter.format(Number(value)))} />
                        <Bar dataKey="occupancyRate" fill={DARK_BLUE} radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center" gap="xs">
                      <ThemeIcon size={42} radius="xl" variant="light" color="gray"><CalendarCheck size={20} /></ThemeIcon>
                      <Text size="sm" fw={600}>Sem ocupação por sala no período</Text>
                    </Stack>
                  )}
                </Box>
              </Paper>
            ),
            op_demand: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Demanda por horário", "Demanda por horário", "Picos por faixa.", Clock3)}
                <Box style={{ minWidth: 0 }}>
                  {hasOperationalHourlyDemand ? (
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['op_demand'] ?? 460) - 120}>
                      <AreaChart data={occupancyCharts.hourlyDemand || []}>
                        <CartesianGrid stroke={chartGridColor} vertical={false} />
                        <XAxis dataKey="hour" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <ChartTooltip />
                        <Area type="monotone" dataKey="appointments" stroke="#0f766e" fill="#0f766e" fillOpacity={0.18} strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center" gap="xs">
                      <ThemeIcon size={42} radius="xl" variant="light" color="gray"><Clock3 size={20} /></ThemeIcon>
                      <Text size="sm" fw={600}>Sem picos de agenda no período</Text>
                    </Stack>
                  )}
                </Box>
              </Paper>
            ),
            op_equipments: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Equipamentos", "Equipamentos", "Uso por equipamento e modalidade.", PackageCheck)}
                <Stack gap="sm">
                  {hasOperationalEquipments ? (occupancyRankings.equipments || []).slice(0, 6).map((item: any) => (
                    <Box key={item.id}>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={650} lineClamp={1}>{item.name}</Text>
                        <Text size="sm" fw={700}>{percentFormatter.format(asNumber(item.occupancyRate))}%</Text>
                      </Group>
                      <Progress value={Math.min(100, asNumber(item.occupancyRate))} color="teal" radius="xl" />
                    </Box>
                  )) : (
                    <Stack h={180} justify="center" align="center"><Text size="sm" c="dimmed">Sem dados de equipamentos no período</Text></Stack>
                  )}
                </Stack>
              </Paper>
            ),
            op_professionals: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Profissionais", "Profissionais", "Ocupação estimada por agenda profissional.", Users)}
                <Stack gap="sm">
                  {hasOperationalProfessionals ? (occupancyRankings.professionals || []).slice(0, 6).map((item: any) => (
                    <Box key={item.id}>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={650} lineClamp={1}>{item.name}</Text>
                        <Text size="sm" fw={700}>{percentFormatter.format(asNumber(item.occupancyRate))}%</Text>
                      </Group>
                      <Progress value={Math.min(100, asNumber(item.occupancyRate))} color="darkBlue" radius="xl" />
                    </Box>
                  )) : (
                    <Stack h={180} justify="center" align="center"><Text size="sm" c="dimmed">Sem dados de profissionais no período</Text></Stack>
                  )}
                </Stack>
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>Resetar layout</Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        {activePanel === 'financeiro' && (() => {
          const tabId = 'financeiro';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const cardNodes: Record<string, React.ReactNode> = {
            fin_metrics: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Financeiro do período", "Financeiro do período", "Entradas, saídas e faturamento.", DollarSign)}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <MetricTile label="Entradas" value={currencyFormatter.format(asNumber(financialKpis.revenue) || data.revenue)} hint="Lançamentos" icon={TrendingUp} tone="teal" />
                  <MetricTile label="Saídas" value={currencyFormatter.format(asNumber(financialKpis.expenses) || data.expenses)} hint="Despesas" icon={DollarSign} tone="red" />
                  <MetricTile label="Faturado" value={currencyFormatter.format(asNumber(financialKpis.invoiced) || data.invoiced)} hint="Notas/guias no período" icon={FileCheck2} tone="darkBlue" />
                  <MetricTile label="Glosas" value={currencyFormatter.format(asNumber(financialKpis.glosaValue) || data.glosaValue)} hint="Retornos TISS" icon={ShieldCheck} tone="orange" />
                </SimpleGrid>
              </Paper>
            ),
            fin_mix: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Mix financeiro por convênio", "Mix financeiro por convênio", "Participação no faturamento do período.", ShieldCheck)}
                <Box style={{ minWidth: 0 }}>
                  {financialMixData.length > 0 && hasFinancialMixValues ? (
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['fin_mix'] ?? 460) - 120}>
                      <PieChart>
                        <Pie data={financialMixData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={98} paddingAngle={2} isAnimationActive animationDuration={650}>
                          {financialMixData.map((_: any, index: number) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center" gap="xs">
                      <ThemeIcon size={42} radius="xl" variant="light" color="gray"><ShieldCheck size={20} /></ThemeIcon>
                      <Text size="sm" fw={600}>Sem faturamento por convênio no período</Text>
                      <Text size="xs" c="dimmed">Assim que houver notas/guias emitidas, o mix aparece aqui com animação.</Text>
                    </Stack>
                  )}
                </Box>
              </Paper>
            ),
            fin_cashflow: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Fluxo de caixa diário", "Fluxo de caixa diário", "Entradas, saídas e faturado por dia.", LineChartIcon)}
                <Box style={{ minWidth: 0 }}>
                  {financialCashflowData.length > 0 && hasFinancialCashflowValues ? (
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['fin_cashflow'] ?? 460) - 120}>
                      <AreaChart data={financialCashflowData}>
                        <CartesianGrid stroke={chartGridColor} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <ChartTooltip formatter={(value: any) => currencyFormatter.format(asNumber(value))} />
                        <Area type="monotone" dataKey="revenue" stroke="#0f766e" fill="#0f766e" fillOpacity={0.15} strokeWidth={2.5} isAnimationActive animationDuration={700} />
                        <Area type="monotone" dataKey="expenses" stroke="#be123c" fill="#be123c" fillOpacity={0.08} strokeWidth={2.5} isAnimationActive animationDuration={700} />
                        <Area type="monotone" dataKey="invoiced" stroke="#0A2568" fill="#0A2568" fillOpacity={0.08} strokeWidth={2.5} isAnimationActive animationDuration={700} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center" gap="xs">
                      <ThemeIcon size={42} radius="xl" variant="light" color="gray"><LineChartIcon size={20} /></ThemeIcon>
                      <Text size="sm" fw={600}>Sem movimentação financeira no período</Text>
                      <Text size="xs" c="dimmed">Entradas, saídas e faturamento aparecerão aqui automaticamente.</Text>
                    </Stack>
                  )}
                </Box>
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>Resetar layout</Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        {activePanel === 'clinico' && (() => {
          const tabId = 'clinico';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const cardNodes: Record<string, React.ReactNode> = {
            cli_metrics: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Laudos e autorizações", "Laudos e autorizações", "Backlog clínico e risco de atendimento.", FileClock)}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <MetricTile label="Autoriz. pendentes" value={integerFormatter.format(asNumber(clinicalKpis.pendingAuthorizations) || data.pendingAuthorizations)} hint="Convênios em análise" icon={ShieldCheck} tone="grape" />
                  <MetricTile label="Negativas" value={integerFormatter.format(asNumber(clinicalKpis.deniedAuthorizations))} hint="Autorizações negadas" icon={AlertTriangle} tone="red" />
                  <MetricTile label="SLA médio" value={`${percentFormatter.format(asNumber(clinicalKpis.slaAvgHours))}h`} hint="Assinatura de laudos" icon={Clock3} tone="teal" />
                  <MetricTile label="TEA ativos" value={integerFormatter.format(data.activeTeaProfiles)} hint="Perfis ativos carregados" icon={HeartPulse} tone="red" />
                </SimpleGrid>
              </Paper>
            ),
            cli_sla: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "SLA e backlog clínico", "SLA e backlog clínico", "Assinatura e envelhecimento.", BarChart3)}
                <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
                  <MetricTile label="SLA médio" value={`${percentFormatter.format(asNumber(clinicalKpis.slaAvgHours))}h`} hint="Da criação à assinatura" icon={Clock3} tone="teal" />
                  <MetricTile label="SLA p95" value={`${percentFormatter.format(asNumber(clinicalKpis.slaP95Hours))}h`} hint="Casos mais críticos" icon={AlertTriangle} tone="orange" />
                </SimpleGrid>
                {hasClinicalAging ? (
                  <Box style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['cli_sla'] ?? 540) - 290}>
                      <BarChart data={clinicalAgingData}>
                        <CartesianGrid stroke={chartGridColor} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <ChartTooltip />
                        <Bar dataKey="value" fill={DARK_BLUE} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Stack h={200} justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray"><FileClock size={20} /></ThemeIcon>
                    <Text size="sm" fw={600}>Sem backlog clínico no período</Text>
                  </Stack>
                )}
              </Paper>
            ),
            cli_modalities: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Modalidades com maior SLA", "Modalidades com maior SLA", "Top exames/modalidades por volume assinado.", Stethoscope)}
                {hasClinicalModality ? (
                  <Stack gap="sm">
                    {clinicalModalityData.slice(0, 6).map((item: any) => (
                      <Box key={item.name}>
                        <Group justify="space-between" mb={6}>
                          <Text size="sm" fw={650} lineClamp={1}>{item.name}</Text>
                          <Badge variant="light" color="darkBlue">{percentFormatter.format(asNumber(item.avgSlaHours))}h</Badge>
                        </Group>
                        <Text size="xs" c="dimmed">{integerFormatter.format(asNumber(item.signed))} laudos assinados</Text>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Stack h={200} justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray"><Stethoscope size={20} /></ThemeIcon>
                    <Text size="sm" fw={600}>Sem modalidades com assinaturas no período</Text>
                  </Stack>
                )}
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>Resetar layout</Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        {activePanel === 'recursos' && (() => {
          const tabId = 'recursos';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const getH = (id: string) => layout.heights[id] ?? DEFAULT_CARD_HEIGHTS[id] ?? 280;
          const cardNodes: Record<string, React.ReactNode> = {
            res_metrics: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Recursos e estoque", "Recursos e estoque", "Insumos e riscos operacionais.", PackageCheck)}
                {(asNumber(resourcesKpis.itemsCount) > 0 || hasResourceSignals) ? (
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <MetricTile label="Itens monitorados" value={integerFormatter.format(asNumber(resourcesKpis.itemsCount))} hint="Base ativa de estoque" icon={PackageCheck} tone="teal" />
                    <MetricTile label="Risco de ruptura" value={integerFormatter.format(asNumber(resourcesKpis.criticalCount) || data.criticalStock)} hint="Cobertura baixa/zerada" icon={AlertTriangle} tone="orange" />
                    <MetricTile label="Consumo no período" value={integerFormatter.format(asNumber(resourcesKpis.periodConsumption))} hint={periodLabel} icon={TrendingUp} tone="darkBlue" />
                    <MetricTile label="Valor em estoque" value={currencyFormatter.format(asNumber(resourcesKpis.stockValue))} hint="Estimativa por custo unitário" icon={DollarSign} tone="grape" />
                  </SimpleGrid>
                ) : (
                  <Stack h={180} justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray"><PackageCheck size={20} /></ThemeIcon>
                    <Text size="sm" fw={600}>Sem riscos de recursos no período</Text>
                  </Stack>
                )}
              </Paper>
            ),
            res_coverage: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Cobertura e consumo", "Cobertura e consumo", "Consumo e cobertura em dias.", Sparkles)}
                {resourcesCriticalItems.length > 0 ? (
                  <Stack gap="sm">
                    {resourcesCriticalItems.slice(0, 6).map((item: any) => (
                      <Box key={item.id}>
                        <Group justify="space-between" mb={4}>
                          <Text size="sm" fw={650} lineClamp={1}>{item.name}</Text>
                          <Badge color={asNumber(item.coverageDays) <= 7 ? 'red' : 'orange'} variant="light">
                            {asNumber(item.coverageDays) >= 999 ? 'Sem consumo' : `${percentFormatter.format(asNumber(item.coverageDays))} dias`}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">Consumo: {integerFormatter.format(asNumber(item.consumed))} | Estoque: {integerFormatter.format(asNumber(item.quantity))}</Text>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Stack h={180} justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray"><Sparkles size={20} /></ThemeIcon>
                    <Text size="sm" fw={600}>Sem risco de cobertura no período</Text>
                  </Stack>
                )}
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>Resetar layout</Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        {activePanel === 'convenios' && (() => {
          const tabId = 'convenios';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const getH = (id: string) => layout.heights[id] ?? DEFAULT_CARD_HEIGHTS[id] ?? 300;
          const cardNodes: Record<string, React.ReactNode> = {
            conv_metrics: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Autorizações por status", "Autorizações por status", "Panorama do período.", ShieldCheck)}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <MetricTile label="Pendentes" value={integerFormatter.format(asNumber(authorizationsKpis.pending))} hint={`${percentFormatter.format(asNumber(authorizationsKpis.pendingRate))}% do total`} icon={FileClock} tone="orange" />
                  <MetricTile label="Negadas" value={integerFormatter.format(asNumber(authorizationsKpis.denied))} hint={`${percentFormatter.format(asNumber(authorizationsKpis.deniedRate))}% do total`} icon={AlertTriangle} tone="red" />
                  <MetricTile label="Autorizadas" value={integerFormatter.format(asNumber(authorizationsKpis.authorized))} hint={`${percentFormatter.format(asNumber(authorizationsKpis.approvalRate))}% de aprovação`} icon={ShieldCheck} tone="teal" />
                  <MetricTile label="Volume total" value={integerFormatter.format(asNumber(authorizationsKpis.total))} hint={periodLabel} icon={BarChart3} tone="darkBlue" />
                </SimpleGrid>
              </Paper>
            ),
            conv_mix: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Mix de status", "Mix de status", "Distribuição das autorizações.", BarChart3)}
                <Box style={{ minWidth: 0 }}>
                  {(authorizationsCharts.statusMix || []).some((i: any) => asNumber(i?.value) > 0) ? (
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['conv_mix'] ?? 460) - 120}>
                      <PieChart>
                        <Pie data={authorizationsCharts.statusMix || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={98}>
                          {(authorizationsCharts.statusMix || []).map((_: any, index: number) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center"><Text size="sm" c="dimmed">Sem autorizações no período</Text></Stack>
                  )}
                </Box>
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>Resetar layout</Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        {activePanel === 'tea' && (() => {
          const tabId = 'tea';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const getH = (id: string) => layout.heights[id] ?? DEFAULT_CARD_HEIGHTS[id] ?? 300;
          const cardNodes: Record<string, React.ReactNode> = {
            tea_metrics: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Visão TEA", "Visão TEA", "Planejamento e conversão de reservas.", HeartPulse)}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <MetricTile label="Perfis ativos" value={integerFormatter.format(asNumber(teaKpis.activeProfiles) || data.activeTeaProfiles)} hint="Pacientes TEA ativos" icon={HeartPulse} tone="grape" />
                  <MetricTile label="Pendentes" value={integerFormatter.format(asNumber(teaKpis.pendingReservations))} hint="Reservas em aberto" icon={FileClock} tone="orange" />
                  <MetricTile label="Convertidas" value={integerFormatter.format(asNumber(teaKpis.convertedReservations))} hint={`${percentFormatter.format(asNumber(teaKpis.conversionRate))}% de conversão`} icon={ShieldCheck} tone="teal" />
                  <MetricTile label="Canceladas" value={integerFormatter.format(asNumber(teaKpis.canceledReservations))} hint={periodLabel} icon={AlertTriangle} tone="red" />
                </SimpleGrid>
              </Paper>
            ),
            tea_mix: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Mix das reservas TEA", "Mix das reservas TEA", "Pendentes, convertidas e canceladas.", BarChart3)}
                <Box style={{ minWidth: 0 }}>
                  {(teaCharts.reservationMix || []).some((item: any) => asNumber(item?.value) > 0) ? (
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['tea_mix'] ?? 460) - 120}>
                      <PieChart>
                        <Pie data={teaCharts.reservationMix || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={98}>
                          {(teaCharts.reservationMix || []).map((_: any, index: number) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center"><Text size="sm" c="dimmed">Sem movimentação TEA no período</Text></Stack>
                  )}
                </Box>
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>Resetar layout</Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        {activePanel === 'laudos' && (() => {
          const tabId = 'laudos';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const getH = (id: string) => layout.heights[id] ?? DEFAULT_CARD_HEIGHTS[id] ?? 300;
          const cardNodes: Record<string, React.ReactNode> = {
            laud_metrics: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Laudos e exames", "Laudos e exames", "Backlog e TAT.", FileCheck2)}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <MetricTile label="Pendentes" value={integerFormatter.format(asNumber(reportsKpis.pendingReports) || data.pendingReports)} hint="Fila ativa de laudos" icon={FileClock} tone="orange" />
                  <MetricTile label="Assinados" value={integerFormatter.format(asNumber(reportsKpis.signedReports) || data.signedReports)} hint={periodLabel} icon={FileCheck2} tone="teal" />
                  <MetricTile label="TAT médio" value={`${percentFormatter.format(asNumber(reportsKpis.tatAvgHours))}h`} hint="Da criação à assinatura" icon={Clock3} tone="darkBlue" />
                  <MetricTile label="TAT p95" value={`${percentFormatter.format(asNumber(reportsKpis.tatP95Hours))}h`} hint="Casos mais lentos" icon={AlertTriangle} tone="red" />
                </SimpleGrid>
              </Paper>
            ),
            laud_volume: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Volume por modalidade", "Volume por modalidade", "Principais exames/modalidades do período.", BarChart3)}
                <Box style={{ minWidth: 0 }}>
                  {(reportsCharts.examVolume || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={(DEFAULT_CARD_HEIGHTS['laud_volume'] ?? 460) - 120}>
                      <BarChart data={reportsCharts.examVolume || []}>
                        <CartesianGrid stroke={chartGridColor} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <ChartTooltip />
                        <Bar dataKey="value" fill={DARK_BLUE} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center"><Text size="sm" c="dimmed">Sem exames no período</Text></Stack>
                  )}
                </Box>
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>Resetar layout</Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        {activePanel === 'comunicacao' && (() => {
          const tabId = 'comunicacao';
          const layout = getTabLayout(tabId);
          const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));
          const getH = (id: string) => layout.heights[id] ?? DEFAULT_CARD_HEIGHTS[id] ?? 300;
          const cardNodes: Record<string, React.ReactNode> = {
            com_metrics: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%' }}>
                {renderEditablePanelTitle(tabId, "Comunicação e experiência", "Comunicação e experiência", "WhatsApp e entregas.", Users)}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <MetricTile label="Conversas abertas" value={integerFormatter.format(asNumber(communicationKpis.conversationsOpen))} hint="Fila humana ativa" icon={Users} tone="orange" />
                  <MetricTile label="Conversas fechadas" value={integerFormatter.format(asNumber(communicationKpis.conversationsClosed))} hint={periodLabel} icon={ShieldCheck} tone="teal" />
                  <MetricTile label="Mensagens enviadas" value={integerFormatter.format(asNumber(communicationKpis.messagesSent))} hint={`Falha ${percentFormatter.format(asNumber(communicationKpis.messageFailureRate))}%`} icon={TrendingUp} tone="darkBlue" />
                  <MetricTile label="Entregas pendentes" value={integerFormatter.format(asNumber(communicationKpis.deliveriesPending))} hint={`${integerFormatter.format(asNumber(communicationKpis.deliveriesCompleted))} concluídas`} icon={FileClock} tone="grape" />
                </SimpleGrid>
              </Paper>
            ),
            com_flows: (
              <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', minWidth: 0 }}>
                {renderEditablePanelTitle(tabId, "Fluxos de conversa", "Fluxos de conversa", "Fluxos mais acionados no WhatsApp.", BarChart3)}
                <Box style={{ minWidth: 0 }}>
                  {(communicationCharts.conversationFlows || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={getH('com_flows') - 120}>
                      <BarChart data={communicationCharts.conversationFlows || []}>
                        <CartesianGrid stroke={chartGridColor} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <ChartTooltip />
                        <Bar dataKey="value" fill={DARK_BLUE} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack h={250} justify="center" align="center"><Text size="sm" c="dimmed">Sem fluxo de comunicação no período</Text></Stack>
                  )}
                </Box>
              </Paper>
            ),
          };
          return (
            <Stack gap="lg">
              <Group justify="flex-end" gap="xs">
                {layout.hidden.length > 0 && <Text size="xs" c="dimmed">{layout.hidden.length} card(s) oculto(s)</Text>}
                <Button size="xs" variant="subtle" color="gray" leftSection={<RotateCcw size={13} />} onClick={() => handleTabLayoutReset(tabId)}>Resetar layout</Button>
              </Group>
              {renderTabAISection(tabId, TAB_LABELS[tabId] ?? tabId)}
              <DndContext sensors={dndSensors} collisionDetection={gridCollision} onDragStart={(e) => setActiveDragId(String(e.active.id))} onDragEnd={(e) => handleTabGridDndEnd(tabId, e)}>
                <StaticWidgetGrid
                  cards={buildTabCardsForGrid(tabId, visibleOrder, cardNodes)}
                  rowsLayout={layout.rowsLayout}
                  isDragActive={!!activeDragId}
                  onDelete={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? handleDeleteWidget(tabId, id.split("::").slice(2).join("::")) : handleTabCardHide(tabId, id)}
                  onResize={(id, h) => handleTabCardResize(tabId, id, h)}
                  onEdit={(id) => id.startsWith(AI_WIDGET_CARD_PREFIX) ? openAICardEditorFromCombinedId(tabId, id) : openStaticCardEditor(tabId, id)}
                />
                <DragOverlay dropAnimation={null} modifiers={[centerSilhouette]}>
                  {activeDragId ? (
                    <div style={{ height: 80, width: 160, borderRadius: 10, background: 'rgba(128,128,128,0.25)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Stack>
          );
        })()}

        <Text ta="center" size="xs" c="dimmed" mt="lg">
          Versão BI em evolução contínua com agregações dedicadas por domínio.
        </Text>
      </Box>
    </Box>
    </>
  );
}









