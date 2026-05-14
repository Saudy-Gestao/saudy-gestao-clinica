import { useMemo, useRef, useState, type ElementType, type CSSProperties } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable, useDndContext, pointerWithin, getFirstCollision,
  type DragStartEvent, type DragEndEvent, type CollisionDetection,
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
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
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
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1, minWidth: 0, minHeight,
        border: `2px dashed ${isOver ? '#3b82f6' : 'rgba(128,128,128,0.22)'}`,
        borderRadius: 8,
        background: isOver ? 'rgba(59,130,246,0.07)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <Text size="xs" c="dimmed" style={{ pointerEvents: 'none' }}>Soltar aqui</Text>
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
  const resizeStartY = useRef<number | null>(null);
  const resizeStartH = useRef<number>(heightPx);

  const setRef = (node: HTMLDivElement | null) => { setDragRef(node); setDropRef(node); };

  const style: CSSProperties = {
    flex, minWidth: 0, height: heightPx, position: 'relative',
    opacity: isDragging ? 0 : 1,
    outline: isOver && isDragActive && !isDragging ? '2px solid #3b82f6' : undefined,
    borderRadius: 8,
  };

  const onMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartY.current = e.clientY;
    resizeStartH.current = heightPx;
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      if (resizeStartY.current === null) return;
      onResize(Math.max(160, resizeStartH.current + ev.clientY - resizeStartY.current));
    };
    const onUp = () => {
      resizeStartY.current = null;
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
      <div
        onMouseDown={onMouseDownResize}
        style={{
          position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 6,
          cursor: 'ns-resize', borderRadius: '0 0 4px 4px',
          background: 'rgba(128,128,128,0.25)', zIndex: 10,
        }}
      />
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
  rowsLayout: string[][] | null; // explicit row grouping by widget id; null = sequential fallback
};

const MAX_PER_ROW = 3;
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

/** Computes display rows using explicit rowsLayout when available, falling back to sequential chunking. */
function computeDisplayRows(widgets: GeneratedWidget[], rowsLayout: string[][] | null): GeneratedWidget[][] {
  if (!rowsLayout || rowsLayout.length === 0) return computeRows(widgets);
  const widgetMap = new Map(widgets.map((w) => [w.id, w]));
  const placed = new Set<string>();
  const rows: GeneratedWidget[][] = [];
  for (const rowIds of rowsLayout) {
    const row = rowIds.map((id) => widgetMap.get(id)).filter(Boolean) as GeneratedWidget[];
    if (row.length > 0) { rows.push(row); row.forEach((w) => placed.add(w.id)); }
  }
  const orphans = widgets.filter((w) => !placed.has(w.id));
  for (let i = 0; i < orphans.length; i += MAX_PER_ROW) rows.push(orphans.slice(i, i + MAX_PER_ROW));
  return rows;
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

function WidgetCardContent({
  widget,
  panelBg,
  colorScheme,
  chartGridColor,
  onDelete,
}: {
  widget: GeneratedWidget;
  panelBg: string;
  colorScheme: 'light' | 'dark' | 'auto';
  chartGridColor: string;
  onDelete?: () => void;
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
          <Text size="sm" c="dimmed" fw={600} pr={90} mb="sm">{widget.title}</Text>
          <Text fw={750} style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', lineHeight: 1 }}>{widget.value}</Text>
          {widget.hint && <Text size="xs" c="dimmed" mt={8}>{widget.hint}</Text>}
        </Paper>
      )}

      {widget.type === 'text' && (
        <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Text fw={700} mb="xs" pr={90}>{widget.title}</Text>
          <ScrollArea style={{ flex: 1 }} offsetScrollbars>
            <Text size="sm" lh={1.7} c={textColor}>{widget.content}</Text>
          </ScrollArea>
        </Paper>
      )}

      {widget.type === 'bar_chart' && (
        <Paper p="lg" withBorder style={{ background: panelBg, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Text fw={700} mb="sm" pr={90} style={{ fontSize: 14 }}>{widget.title}</Text>
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
          <Text fw={700} mb="sm" pr={90} style={{ fontSize: 14 }}>{widget.title}</Text>
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
            <Text fw={700} mb="sm" pr={90} style={{ fontSize: 14 }}>{widget.title}</Text>
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
          <Text fw={700} mb="sm" pr={90} style={{ fontSize: 14 }}>{widget.title}</Text>
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

function WidgetGrid({ widgets, rowsLayout, heights, panelBg, colorScheme, chartGridColor, isDragActive, onDelete, onResize }: {
  widgets: GeneratedWidget[];
  rowsLayout: string[][] | null;
  heights: WidgetHeights;
  panelBg: string;
  colorScheme: 'light' | 'dark' | 'auto';
  chartGridColor: string;
  isDragActive: boolean;
  onDelete: (id: string) => void;
  onResize: (id: string, h: number) => void;
}) {
  const { active } = useDndContext();
  const dragging = active !== null;

  const baseRows = computeDisplayRows(widgets, rowsLayout).map((row) => {
    const padded: (GeneratedWidget | null)[] = [...row];
    while (padded.length < MAX_PER_ROW) padded.push(null);
    return padded;
  });
  const extraRow: (GeneratedWidget | null)[] = [null, null, null];
  const allRows: (GeneratedWidget | null)[][] = dragging
    ? [...baseRows, extraRow]
    : baseRows;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {allRows.map((row, rowIdx) => {
        const rowMaxH = Math.max(...row.map((w) =>
          w ? (heights[w.id] ?? DEFAULT_HEIGHT_PX[w.type] ?? ROW_HEIGHT_PX) : ROW_HEIGHT_PX,
        ));
        return (
          <div key={rowIdx} style={{ display: 'flex', gap: 12 }}>
            {row.map((widget, colIdx) => {
              if (widget) {
                const heightPx = heights[widget.id] ?? DEFAULT_HEIGHT_PX[widget.type] ?? ROW_HEIGHT_PX;
                return (
                  <DraggableWidgetShell
                    key={widget.id}
                    widget={widget}
                    heightPx={heightPx}
                    flex={1}
                    isDragActive={isDragActive}
                    onResize={(h) => onResize(widget.id, h)}
                  >
                    <WidgetCardContent
                      widget={widget}
                      panelBg={panelBg}
                      colorScheme={colorScheme}
                      chartGridColor={chartGridColor}
                      onDelete={() => onDelete(widget.id)}
                    />
                  </DraggableWidgetShell>
                );
              }
              if (!dragging) return null;
              return (
                <EmptyCell
                  key={`grid-cell-${rowIdx}-col-${colIdx}`}
                  id={`grid-cell-${rowIdx}-col-${colIdx}`}
                  minHeight={rowMaxH} 
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Usa somente a posição do ponteiro como referência (não o rect do overlay)
const gridCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const emptyCellHit = hits.find((c) => String(c.id).startsWith('grid-cell-'));
  if (emptyCellHit) return [emptyCellHit];
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

  // ── Painel Personalizável ──────────────────────────────────────────────────

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
        ? cur.rowsLayout.map((row) => row.filter((id) => id !== widgetId)).filter((row) => row.length > 0)
        : null;
      const next: Record<string, PanelCustomState> = {
        ...prev,
        [panelId]: { ...cur, widgets: cur.widgets.filter((w) => w.id !== widgetId), layout: [], heights, rowsLayout: newRowsLayout },
      };
      persistCustom(next);
      return next;
    });
  };

  const handleReorderWidgets = (panelId: string, newWidgets: GeneratedWidget[], newRowsLayout: string[][] | null = null) => {
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

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDndStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));
  const handleDndEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const cur = panelCustom['personalizavel'];
    if (!cur) return;
    const widgets = cur.widgets;
    const draggedWidget = widgets.find((w) => w.id === active.id);
    if (!draggedWidget) return;

    const displayRows = computeDisplayRows(widgets, cur.rowsLayout);
    const overId = String(over.id);

    if (overId.startsWith('grid-cell-')) {
      // Drop numa célula vazia: mover para aquela linha/coluna
      const parts = overId.split('-'); // ["grid","cell",rowIdx,"col",colIdx]
      const targetRowIdx = parseInt(parts[2]);
      const targetColIdx = parseInt(parts[4]);

      // Remove o widget e conta quantas linhas ANTES do alvo foram eliminadas
      const newRows: GeneratedWidget[][] = [];
      let removedBeforeTarget = 0;
      for (let i = 0; i < displayRows.length; i++) {
        const filtered = displayRows[i].filter((w) => w.id !== draggedWidget.id);
        if (filtered.length > 0) {
          newRows.push(filtered);
        } else if (i < targetRowIdx) {
          removedBeforeTarget++;
        }
      }
      const adjustedTarget = targetRowIdx - removedBeforeTarget;

      if (adjustedTarget >= newRows.length) {
        // Soltar após a última linha → nova linha com o widget
        newRows.push([draggedWidget]);
      } else {
        // Soltar numa linha existente com espaço vazio
        const targetRow = [...newRows[adjustedTarget]];
        targetRow.splice(Math.min(targetColIdx, targetRow.length), 0, draggedWidget);
        if (targetRow.length > MAX_PER_ROW) {
          // Linha ficou cheia: overflow vai para nova linha após
          const overflow = targetRow.splice(MAX_PER_ROW);
          newRows[adjustedTarget] = targetRow;
          newRows.splice(adjustedTarget + 1, 0, overflow);
        } else {
          newRows[adjustedTarget] = targetRow;
        }
      }

      const newRowsLayout = newRows.map((row) => row.map((w) => w.id));
      handleReorderWidgets('personalizavel', newRows.flat(), newRowsLayout);
    } else {
      // Drop em outro card: trocar posições dentro das linhas
      const newRows = displayRows.map((row) => [...row]);
      let fromR = -1, fromC = -1, toR = -1, toC = -1;
      for (let r = 0; r < newRows.length; r++) {
        for (let c = 0; c < newRows[r].length; c++) {
          if (newRows[r][c].id === active.id) { fromR = r; fromC = c; }
          if (newRows[r][c].id === overId) { toR = r; toC = c; }
        }
      }
      if (fromR < 0 || toR < 0 || (fromR === toR && fromC === toC)) return;
      const tmp = newRows[fromR][fromC];
      newRows[fromR][fromC] = newRows[toR][toC];
      newRows[toR][toC] = tmp;
      const newRowsLayout = newRows.map((row) => row.map((w) => w.id));
      handleReorderWidgets('personalizavel', newRows.flat(), newRowsLayout);
    }
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

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="lg">
          <KpiCard
            label="Receita/faturamento"
            value={currencyFormatter.format(data.invoiced || data.revenue)}
            hint={`Ticket médio ${currencyFormatter.format(data.ticketAverage)}`}
            icon={DollarSign}
            tone="teal"
            loading={loading}
          />
          <KpiCard
            label="Atendimentos realizados"
            value={integerFormatter.format(data.realized)}
            hint={`${percentFormatter.format(data.attendanceRate)}% dos agendamentos do período`}
            icon={Stethoscope}
            tone="darkBlue"
            loading={loading}
          />
          <KpiCard
            label="Pendencias criticas"
            value={integerFormatter.format(data.pendingAuthorizations + data.pendingReports + data.criticalStock)}
            hint="Autorizações, laudos e estoque exigindo ação"
            icon={AlertTriangle}
            tone="orange"
            loading={loading}
          />
          <KpiCard
            label="Saúde TEA"
            value={integerFormatter.format(data.activeTeaProfiles)}
            hint="Pacientes ativos"
            icon={HeartPulse}
            tone="grape"
            loading={loading}
          />
        </SimpleGrid>

        {/* Navbar colorida */}
        <ScrollArea mb="lg" scrollbarSize={4} type="hover">
          <Group gap={6} wrap="nowrap" pb={4}>
            {([
              { value: 'executivo',      label: 'Executivo'},
              { value: 'operacao',       label: 'Operação'},
              { value: 'financeiro',     label: 'Financeiro'},
              { value: 'clinico',        label: 'Clínico'},
              { value: 'recursos',       label: 'Recursos'},
              { value: 'convenios',      label: 'Convênios'},
              { value: 'tea',            label: 'TEA'},
              { value: 'laudos',         label: 'Laudos'},
              { value: 'comunicacao',    label: 'Comunicação'},
              { value: 'personalizavel', label: '✦ Personalizável'},
            ] as { value: string; label: string; color: string }[]).map((tab) => {
              const isActive = activePanel === tab.value;
              const isPersonalizavel = tab.value === 'personalizavel';
              return (
                <Box
                  key={tab.value}
                  onClick={() => setActivePanel(tab.value)}
                  style={{
                    background: isActive ? (isPersonalizavel ? 'linear-gradient(135deg,#0A2568,#0f766e)' : tab.color) : 'transparent',
                    border: `1.5px solid ${tab.color}`,
                    borderRadius: 8,
                    padding: '6px 14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: 650,
                    fontSize: 13,
                    color: isActive ? '#fff' : tab.color,
                    boxShadow: isActive ? `0 2px 8px ${tab.color}55` : undefined,
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  {tab.label}
                </Box>
              );
            })}
          </Group>
        </ScrollArea>

        {/* ── Painel Personalizável ─────────────────────────────────────────── */}
        {activePanel === 'personalizavel' && (() => {
          const ps = panelCustom['personalizavel'] || { widgets: [], prompt: '', loading: false, error: null };
          const draft = customPromptDraft['personalizavel'] ?? ps.prompt;
          return (
            <Stack gap="lg">
              {/* Campo de prompt */}
              <Paper p="md" withBorder style={{ background: panelBg, borderColor: 'rgba(10,37,104,0.18)' }}>
                <Group gap="xs" mb="xs">
                  <ThemeIcon variant="gradient" gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }} radius="md" size={30}>
                    <Sparkles size={15} />
                  </ThemeIcon>
                  <Text fw={700} size="sm">Descreva o que quer ver neste painel</Text>
                </Group>
                <Text size="xs" c="dimmed" mb="sm">
                  A IA vai gerar cards, gráficos e análises com base nos dados reais do BI.
                </Text>
                <Group gap="xs" align="flex-end">
                  <Textarea
                    style={{ flex: 1 }}
                    placeholder={`Ex: Quero ver a receita por convênio em gráfico de pizza, os 5 médicos com mais atendimentos e o ticket médio.`}
                    value={draft}
                    onChange={(e) => { const val = e.currentTarget.value; setCustomPromptDraft((p) => ({ ...p, personalizavel: val })); }}
                    minRows={2}
                    autosize
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerateWidgets('personalizavel', 'Personalizável', draft);
                    }}
                  />
                  <Tooltip label="Gerar (Ctrl+Enter)">
                    <ActionIcon
                      size="xl"
                      variant="gradient"
                      gradient={{ from: '#0A2568', to: '#0f766e', deg: 135 }}
                      radius="md"
                      loading={ps.loading}
                      disabled={!draft.trim()}
                      onClick={() => handleGenerateWidgets('personalizavel', 'Personalizável', draft)}
                    >
                      <Send size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Paper>

              {/* Erro */}
              {ps.error && (
                <Alert color="red" title="Erro ao gerar widgets" icon={<XCircle size={16} />}>
                  {ps.error}
                </Alert>
              )}

              {/* Loading */}
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

              {/* Widgets gerados */}
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
                    onDelete={(id) => handleDeleteWidget('personalizavel', id)}
                    onResize={(id, h) => handleResizeWidget('personalizavel', id, h)}
                  />
                  <DragOverlay dropAnimation={null}>
                    {activeDragId ? (() => {
                      const w = ps.widgets.find((x) => x.id === activeDragId);
                      const h = w ? (ps.heights[w.id] ?? DEFAULT_HEIGHT_PX[w.type] ?? ROW_HEIGHT_PX) : ROW_HEIGHT_PX;
                      return w ? (
                        <div style={{ height: h, opacity: 0.9, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', borderRadius: 8 }}>
                          <WidgetCardContent widget={w} panelBg={panelBg} colorScheme={colorScheme} chartGridColor={chartGridColor} />
                        </div>
                      ) : null;
                    })() : null}
                  </DragOverlay>
                </DndContext>
              )}

              {/* Empty state */}
              {!ps.loading && !ps.error && ps.widgets.length === 0 && (
                <Paper p="xl" withBorder style={{ background: panelBg }}>
                  <Stack align="center" gap="sm" py="xl">
                    <ThemeIcon size={52} radius="xl" variant="light" color="gray"><Sparkles size={24} /></ThemeIcon>
                    <Text fw={600} ta="center">Nenhum widget gerado ainda</Text>
                    <Text size="sm" c="dimmed" ta="center" maw={400}>
                      Descreva o que você quer ver neste painel e clique em enviar. A IA vai criar cards, gráficos e análises com base nos dados reais.
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Stack>
          );
        })()}

        {activePanel === 'executivo' ? (
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Atendimentos x receita" description="Tendência diária." icon={LineChartIcon} />
                                <Box style={{ minWidth: 0 }}>
                {hasExecutiveTrend ? (
                  <ResponsiveContainer width="100%" height={270}>
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
                  <Stack h="100%" justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray"><LineChartIcon size={20} /></ThemeIcon>
                    <Text size="sm" fw={600}>Sem tendência no período</Text>
                    <Text size="xs" c="dimmed">Os atendimentos e receita diária aparecerão aqui automaticamente.</Text>
                  </Stack>
                )}
              </Box>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Funil da jornada" description="Do agendamento ao faturamento." icon={TrendingUp} />
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

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360 }}>
              <PanelTitle title="Alertas de gestão" description="Prioridades imediatas." icon={AlertTriangle} />
              <Stack gap="sm">
                {data.alerts.map((alert: any) => (
                  <Box
                    key={alert.title}
                    p="md"
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 8,
                    }}
                  >
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
          </SimpleGrid>
        ) : null}

        {activePanel === 'operacao' ? (
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <MetricTile
                label="Ocupação geral"
                value={`${percentFormatter.format(asNumber(occupancyKpis.occupancyRate))}%`}
                hint={`${formatHours(asNumber(occupancyKpis.bookedMinutes))} ocupadas`}
                icon={BarChart3}
                tone="darkBlue"
              />
              <MetricTile
                label="Horas ociosas"
                value={formatHours(asNumber(occupancyKpis.idleMinutes))}
                hint="Capacidade estimada livre"
                icon={Clock3}
                tone="orange"
              />
              <MetricTile
                label="Sem recurso"
                value={integerFormatter.format(asNumber(occupancyKpis.noResourceAppointments))}
                hint="Sem sala/equipamento"
                icon={AlertTriangle}
                tone="yellow"
              />
              <MetricTile
                label="Recursos ativos"
                value={integerFormatter.format(asNumber(occupancyKpis.roomsCount) + asNumber(occupancyKpis.equipmentsCount))}
                hint={`${asNumber(occupancyKpis.roomsCount)} salas | ${asNumber(occupancyKpis.equipmentsCount)} equipamentos`}
                icon={PackageCheck}
                tone="teal"
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360 }}>
              <PanelTitle title="Ocupação por sala" description="Ranking de uso." icon={CalendarCheck} />
                                <Box style={{ minWidth: 0 }}>
                {hasOperationalRooms ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={occupancyRankings.rooms || []} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke={chartGridColor} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <ChartTooltip formatter={(value: any, name: any) => (String(name) === 'occupancyRate' ? `${percentFormatter.format(Number(value))}%` : integerFormatter.format(Number(value)))} />
                    <Bar dataKey="occupancyRate" fill={DARK_BLUE} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack h="100%" justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray"><CalendarCheck size={20} /></ThemeIcon>
                    <Text size="sm" fw={600}>Sem ocupação por sala no período</Text>
                  </Stack>
                )}
              </Box>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Demanda por horário" description="Picos por faixa." icon={Clock3} />
                                <Box style={{ minWidth: 0 }}>
                {hasOperationalHourlyDemand ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={occupancyCharts.hourlyDemand || []}>
                    <CartesianGrid stroke={chartGridColor} vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <ChartTooltip />
                    <Area type="monotone" dataKey="appointments" stroke="#0f766e" fill="#0f766e" fillOpacity={0.18} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack h="100%" justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray"><Clock3 size={20} /></ThemeIcon>
                    <Text size="sm" fw={600}>Sem picos de agenda no período</Text>
                  </Stack>
                )}
              </Box>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Equipamentos" description="Uso por equipamento e modalidade." icon={PackageCheck} />
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

            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Profissionais" description="Ocupação estimada por agenda profissional." icon={Users} />
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
            </SimpleGrid>
          </Stack>
        ) : null}

        {activePanel === 'financeiro' ? (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Financeiro do período" description="Entradas, saídas e faturamento." icon={DollarSign} />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <MetricTile label="Entradas" value={currencyFormatter.format(asNumber(financialKpis.revenue) || data.revenue)} hint="Lançamentos" icon={TrendingUp} tone="teal" />
                <MetricTile label="Saídas" value={currencyFormatter.format(asNumber(financialKpis.expenses) || data.expenses)} hint="Despesas" icon={DollarSign} tone="red" />
                <MetricTile label="Faturado" value={currencyFormatter.format(asNumber(financialKpis.invoiced) || data.invoiced)} hint="Notas/guias no período" icon={FileCheck2} tone="darkBlue" />
                <MetricTile label="Glosas" value={currencyFormatter.format(asNumber(financialKpis.glosaValue) || data.glosaValue)} hint="Retornos TISS" icon={ShieldCheck} tone="orange" />
              </SimpleGrid>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Mix financeiro por convênio" description="Participação no faturamento do período." icon={ShieldCheck} />
                                <Box style={{ minWidth: 0 }}>
                {financialMixData.length > 0 && hasFinancialMixValues ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={financialMixData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={98}
                        paddingAngle={2}
                        isAnimationActive
                        animationDuration={650}
                      >
                        {financialMixData.map((_: any, index: number) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack h="100%" justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray">
                      <ShieldCheck size={20} />
                    </ThemeIcon>
                    <Text size="sm" fw={600}>Sem faturamento por convênio no período</Text>
                    <Text size="xs" c="dimmed">Assim que houver notas/guias emitidas, o mix aparece aqui com animação.</Text>
                  </Stack>
                )}
              </Box>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Fluxo de caixa diário" description="Entradas, saídas e faturado por dia." icon={LineChartIcon} />
                                <Box style={{ minWidth: 0 }}>
                {financialCashflowData.length > 0 && hasFinancialCashflowValues ? (
                  <ResponsiveContainer width="100%" height={280}>
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
                  <Stack h="100%" justify="center" align="center" gap="xs">
                    <ThemeIcon size={42} radius="xl" variant="light" color="gray">
                      <LineChartIcon size={20} />
                    </ThemeIcon>
                    <Text size="sm" fw={600}>Sem movimentação financeira no período</Text>
                    <Text size="xs" c="dimmed">Entradas, saídas e faturamento aparecerão aqui automaticamente.</Text>
                  </Stack>
                )}
              </Box>
            </Paper>
          </SimpleGrid>
        ) : null}

        {activePanel === 'clinico' ? (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Laudos e autorizações" description="Backlog clínico e risco de atendimento." icon={FileClock} />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <MetricTile label="Autoriz. pendentes" value={integerFormatter.format(asNumber(clinicalKpis.pendingAuthorizations) || data.pendingAuthorizations)} hint="Convênios em análise" icon={ShieldCheck} tone="grape" />
                <MetricTile label="Negativas" value={integerFormatter.format(asNumber(clinicalKpis.deniedAuthorizations))} hint="Autorizações negadas" icon={AlertTriangle} tone="red" />
                <MetricTile label="SLA médio" value={`${percentFormatter.format(asNumber(clinicalKpis.slaAvgHours))}h`} hint="Assinatura de laudos" icon={Clock3} tone="teal" />
                <MetricTile label="TEA ativos" value={integerFormatter.format(data.activeTeaProfiles)} hint="Perfis ativos carregados" icon={HeartPulse} tone="red" />
              </SimpleGrid>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="SLA e backlog clínico" description="Assinatura e envelhecimento." icon={BarChart3} />
              <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
                <MetricTile label="SLA médio" value={`${percentFormatter.format(asNumber(clinicalKpis.slaAvgHours))}h`} hint="Da criação à assinatura" icon={Clock3} tone="teal" />
                <MetricTile label="SLA p95" value={`${percentFormatter.format(asNumber(clinicalKpis.slaP95Hours))}h`} hint="Casos mais críticos" icon={AlertTriangle} tone="orange" />
              </SimpleGrid>
              <ScrollArea h={230}>
                {hasClinicalAging ? (
                  <Box style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={210}>
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
              </ScrollArea>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Modalidades com maior SLA" description="Top exames/modalidades por volume assinado." icon={Stethoscope} />
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
          </SimpleGrid>
        ) : null}

        {activePanel === 'recursos' ? (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Recursos e estoque" description="Insumos e riscos operacionais." icon={PackageCheck} />
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

            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Cobertura e consumo" description="Consumo e cobertura em dias." icon={Sparkles} />
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
                      <Text size="xs" c="dimmed">
                        Consumo: {integerFormatter.format(asNumber(item.consumed))} | Estoque: {integerFormatter.format(asNumber(item.quantity))}
                      </Text>
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
          </SimpleGrid>
        ) : null}

        {activePanel === 'convenios' ? (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Autorizações por status" description="Panorama do período." icon={ShieldCheck} />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <MetricTile label="Pendentes" value={integerFormatter.format(asNumber(authorizationsKpis.pending))} hint={`${percentFormatter.format(asNumber(authorizationsKpis.pendingRate))}% do total`} icon={FileClock} tone="orange" />
                <MetricTile label="Negadas" value={integerFormatter.format(asNumber(authorizationsKpis.denied))} hint={`${percentFormatter.format(asNumber(authorizationsKpis.deniedRate))}% do total`} icon={AlertTriangle} tone="red" />
                <MetricTile label="Autorizadas" value={integerFormatter.format(asNumber(authorizationsKpis.authorized))} hint={`${percentFormatter.format(asNumber(authorizationsKpis.approvalRate))}% de aprovação`} icon={ShieldCheck} tone="teal" />
                <MetricTile label="Volume total" value={integerFormatter.format(asNumber(authorizationsKpis.total))} hint={periodLabel} icon={BarChart3} tone="darkBlue" />
              </SimpleGrid>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Mix de status" description="Distribuição das autorizações." icon={BarChart3} />
                                <Box style={{ minWidth: 0 }}>
                {(authorizationsCharts.statusMix || []).some((i: any) => asNumber(i?.value) > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={authorizationsCharts.statusMix || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={98}>
                        {(authorizationsCharts.statusMix || []).map((_: any, index: number) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack h="100%" justify="center" align="center"><Text size="sm" c="dimmed">Sem autorizações no período</Text></Stack>
                )}
              </Box>
            </Paper>
          </SimpleGrid>
        ) : null}

        {activePanel === 'tea' ? (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Visão TEA" description="Planejamento e conversão de reservas." icon={HeartPulse} />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <MetricTile label="Perfis ativos" value={integerFormatter.format(asNumber(teaKpis.activeProfiles) || data.activeTeaProfiles)} hint="Pacientes TEA ativos" icon={HeartPulse} tone="grape" />
                <MetricTile label="Pendentes" value={integerFormatter.format(asNumber(teaKpis.pendingReservations))} hint="Reservas em aberto" icon={FileClock} tone="orange" />
                <MetricTile label="Convertidas" value={integerFormatter.format(asNumber(teaKpis.convertedReservations))} hint={`${percentFormatter.format(asNumber(teaKpis.conversionRate))}% de conversão`} icon={ShieldCheck} tone="teal" />
                <MetricTile label="Canceladas" value={integerFormatter.format(asNumber(teaKpis.canceledReservations))} hint={periodLabel} icon={AlertTriangle} tone="red" />
              </SimpleGrid>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Mix das reservas TEA" description="Pendentes, convertidas e canceladas." icon={BarChart3} />
                                <Box style={{ minWidth: 0 }}>
                {(teaCharts.reservationMix || []).some((item: any) => asNumber(item?.value) > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={teaCharts.reservationMix || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={98}>
                        {(teaCharts.reservationMix || []).map((_: any, index: number) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack h="100%" justify="center" align="center"><Text size="sm" c="dimmed">Sem movimentação TEA no período</Text></Stack>
                )}
              </Box>
            </Paper>
          </SimpleGrid>
        ) : null}

        {activePanel === 'laudos' ? (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Laudos e exames" description="Backlog e TAT." icon={FileCheck2} />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <MetricTile label="Pendentes" value={integerFormatter.format(asNumber(reportsKpis.pendingReports) || data.pendingReports)} hint="Fila ativa de laudos" icon={FileClock} tone="orange" />
                <MetricTile label="Assinados" value={integerFormatter.format(asNumber(reportsKpis.signedReports) || data.signedReports)} hint={periodLabel} icon={FileCheck2} tone="teal" />
                <MetricTile label="TAT médio" value={`${percentFormatter.format(asNumber(reportsKpis.tatAvgHours))}h`} hint="Da criação à assinatura" icon={Clock3} tone="darkBlue" />
                <MetricTile label="TAT p95" value={`${percentFormatter.format(asNumber(reportsKpis.tatP95Hours))}h`} hint="Casos mais lentos" icon={AlertTriangle} tone="red" />
              </SimpleGrid>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Volume por modalidade" description="Principais exames/modalidades do período." icon={BarChart3} />
                                <Box style={{ minWidth: 0 }}>
                {(reportsCharts.examVolume || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reportsCharts.examVolume || []}>
                      <CartesianGrid stroke={chartGridColor} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <ChartTooltip />
                      <Bar dataKey="value" fill={DARK_BLUE} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack h="100%" justify="center" align="center"><Text size="sm" c="dimmed">Sem exames no período</Text></Stack>
                )}
              </Box>
            </Paper>
          </SimpleGrid>
        ) : null}

        {activePanel === 'comunicacao' ? (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" withBorder style={{ background: panelBg }}>
              <PanelTitle title="Comunicação e experiência" description="WhatsApp e entregas." icon={Users} />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <MetricTile label="Conversas abertas" value={integerFormatter.format(asNumber(communicationKpis.conversationsOpen))} hint="Fila humana ativa" icon={Users} tone="orange" />
                <MetricTile label="Conversas fechadas" value={integerFormatter.format(asNumber(communicationKpis.conversationsClosed))} hint={periodLabel} icon={ShieldCheck} tone="teal" />
                <MetricTile label="Mensagens enviadas" value={integerFormatter.format(asNumber(communicationKpis.messagesSent))} hint={`Falha ${percentFormatter.format(asNumber(communicationKpis.messageFailureRate))}%`} icon={TrendingUp} tone="darkBlue" />
                <MetricTile label="Entregas pendentes" value={integerFormatter.format(asNumber(communicationKpis.deliveriesPending))} hint={`${integerFormatter.format(asNumber(communicationKpis.deliveriesCompleted))} concluídas`} icon={FileClock} tone="grape" />
              </SimpleGrid>
            </Paper>

            <Paper p="lg" withBorder style={{ background: panelBg, minHeight: 360, minWidth: 0 }}>
              <PanelTitle title="Fluxos de conversa" description="Fluxos mais acionados no WhatsApp." icon={BarChart3} />
                                <Box style={{ minWidth: 0 }}>
                {(communicationCharts.conversationFlows || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={communicationCharts.conversationFlows || []}>
                      <CartesianGrid stroke={chartGridColor} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <ChartTooltip />
                      <Bar dataKey="value" fill={DARK_BLUE} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack h="100%" justify="center" align="center"><Text size="sm" c="dimmed">Sem fluxo de comunicação no período</Text></Stack>
                )}
              </Box>
            </Paper>
          </SimpleGrid>
        ) : null}

        <Text ta="center" size="xs" c="dimmed" mt="lg">
          Versão BI em evolução contínua com agregações dedicadas por domínio.
        </Text>
      </Box>
    </Box>
    </>
  );
}
