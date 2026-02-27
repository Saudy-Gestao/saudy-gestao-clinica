import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Paper,
  Progress,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  Sun,
  ZoomIn,
  Move,
  Ruler,
  RefreshCw,
  RotateCw,
  CircleDot,
  Info,
  Upload,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import {
  parseDicomFile,
  buildDisplayPixels,
  screenToImage,
  imageToScreen,
  calculateDistance,
  type DicomImage,
  type Measurement,
} from './dicomUtils';

/* ─────────── Constants ─────────── */

const WL_PRESETS = [
  { name: 'Pulmão', wc: -600, ww: 1500 },
  { name: 'Osso', wc: 300, ww: 1500 },
  { name: 'Partes moles', wc: 40, ww: 400 },
  { name: 'Cérebro', wc: 40, ww: 80 },
  { name: 'Fígado', wc: 60, ww: 150 },
  { name: 'Mediastino', wc: 40, ww: 350 },
  { name: 'Abdômen', wc: 40, ww: 400 },
];

type ActiveTool = 'wl' | 'zoom' | 'pan' | 'ruler';

const TOOL_LABEL: Record<ActiveTool, { label: string; cursor: string }> = {
  wl: { label: 'Janela / Nível', cursor: 'crosshair' },
  zoom: { label: 'Zoom', cursor: 'zoom-in' },
  pan: { label: 'Mover', cursor: 'grab' },
  ruler: { label: 'Régua', cursor: 'crosshair' },
};

/* ─────────── Types ─────────── */

interface DicomMeta {
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  studyDescription: string;
  seriesDescription: string;
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  pixelSpacing: [number, number] | null;
}

interface DragState {
  active: boolean;
  startX: number;
  startY: number;
  startWc: number;
  startWw: number;
  startPanX: number;
  startPanY: number;
  startZoom: number;
}

interface RulerDraw {
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
}

interface DicomViewerProps {
  style?: React.CSSProperties;
}

/* ─────────── Component ─────────── */

export function DicomViewer({ style }: DicomViewerProps) {
  /* — Refs — */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef(0);
  const loadingRef = useRef(false);
  const dragRef = useRef<DragState>({
    active: false, startX: 0, startY: 0,
    startWc: 0, startWw: 0, startPanX: 0, startPanY: 0, startZoom: 1,
  });

  /* — Data state — */
  const [images, setImages] = useState<DicomImage[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  /* — View state — */
  const [wc, setWc] = useState(0);
  const [ww, setWw] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [invert, setInvert] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>('wl');
  const [showMetadata, setShowMetadata] = useState(false);
  const [dicomMeta, setDicomMeta] = useState<DicomMeta | null>(null);

  /* — Measurements — */
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const rulerRef = useRef<RulerDraw>({ start: null, end: null });
  const [rulerLive, setRulerLive] = useState<RulerDraw>({ start: null, end: null });

  /* Stable refs – avoid stale closures in mouse handlers */
  const stateRef = useRef({
    wc, ww, zoom, pan, rotation, invert, activeTool,
    images, currentIndex, measurements,
  });
  stateRef.current = {
    wc, ww, zoom, pan, rotation, invert, activeTool,
    images, currentIndex, measurements,
  };

  /* ═══════════ Canvas rendering ═══════════ */

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      images: imgs, currentIndex: idx,
      wc: cWc, ww: cWw, zoom: cZoom,
      pan: cPan, rotation: cRot, invert: cInv,
      measurements: meas,
    } = stateRef.current;

    /* Size canvas to its container (retina-aware) */
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cw = rect.width;
    const ch = rect.height;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Clear to black */
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    if (imgs.length === 0 || idx >= imgs.length) return;

    const image = imgs[idx];
    const { metadata: m } = image;
    const iw = m.columns;
    const ih = m.rows;

    /* Build RGBA display pixels with current W/L */
    const rgba = buildDisplayPixels(image, cWc, cWw, cInv);
    // Copy into a fresh Uint8ClampedArray backed by a plain ArrayBuffer
    // (avoids TS SharedArrayBuffer incompatibility with ImageData)
    const clamped = new Uint8ClampedArray(rgba.length);
    clamped.set(rgba);
    const imgData = new ImageData(clamped, iw, ih);

    /* Offscreen canvas at native DICOM resolution */
    const offCanvas = document.createElement('canvas');
    offCanvas.width = iw;
    offCanvas.height = ih;
    const offCtx = offCanvas.getContext('2d')!;
    offCtx.putImageData(imgData, 0, 0);

    /* Fit scale so image fills the viewport */
    const fitScale = Math.min(cw / iw, ch / ih);

    /* Draw image with zoom / pan / rotation */
    ctx.save();
    ctx.translate(cw / 2 + cPan.x, ch / 2 + cPan.y);
    ctx.rotate((cRot * Math.PI) / 180);
    ctx.scale(cZoom * fitScale, cZoom * fitScale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offCanvas, -iw / 2, -ih / 2);
    ctx.restore();

    /* ─── Draw ruler measurements ─── */
    const allMeas = [...meas];
    const ruler = rulerRef.current;
    if (ruler.start && ruler.end) {
      const dist = calculateDistance(ruler.start, ruler.end, m.pixelSpacing);
      allMeas.push({
        id: '__live__',
        startImg: ruler.start,
        endImg: ruler.end,
        distanceMm: dist.distanceMm,
        distancePx: dist.distancePx,
      });
    }

    for (const ms of allMeas) {
      const s = imageToScreen(ms.startImg.x, ms.startImg.y, cw, ch, iw, ih, cZoom, cPan.x, cPan.y, cRot);
      const e = imageToScreen(ms.endImg.x, ms.endImg.y, cw, ch, iw, ih, cZoom, cPan.x, cPan.y, cRot);
      const isLive = ms.id === '__live__';
      const color = isLive ? '#4dabf7' : '#51cf66';

      /* Line */
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(isLive ? [6, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      /* Endpoints */
      for (const p of [s, e]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      /* Distance label */
      const label = ms.distanceMm != null
        ? `${ms.distanceMm.toFixed(1)} mm`
        : `${ms.distancePx.toFixed(1)} px`;
      const mx = (s.x + e.x) / 2;
      const my = (s.y + e.y) / 2;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const tm = ctx.measureText(label);
      const pad = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(mx - tm.width / 2 - pad, my - 18 - pad, tm.width + pad * 2, 16 + pad);
      ctx.fillStyle = color;
      ctx.fillText(label, mx, my - 8);
    }
  }, []);

  /** Schedule a render on the next animation frame */
  const requestRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(renderFrame);
  }, [renderFrame]);

  /* Re-render when any view state changes */
  useEffect(() => {
    requestRender();
  }, [images, currentIndex, wc, ww, zoom, pan, rotation, invert, measurements, rulerLive, requestRender]);

  /* Resize observer */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => requestRender());
    obs.observe(el);
    return () => obs.disconnect();
  }, [requestRender]);

  /* ═══════════ Mouse interaction ═══════════ */

  const getCanvasPos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const toImgCoord = useCallback((sx: number, sy: number) => {
    const { images: imgs, currentIndex: idx, zoom: z, pan: p, rotation: r } = stateRef.current;
    if (imgs.length === 0) return { x: 0, y: 0 };
    const m = imgs[idx].metadata;
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return screenToImage(sx, sy, rect.width, rect.height, m.columns, m.rows, z, p.x, p.y, r);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (stateRef.current.images.length === 0) return;
    const pos = getCanvasPos(e);
    const st = stateRef.current;

    if (st.activeTool === 'ruler') {
      const imgPos = toImgCoord(pos.x, pos.y);
      rulerRef.current = { start: imgPos, end: imgPos };
      setRulerLive({ start: imgPos, end: imgPos });
      return;
    }

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startWc: st.wc,
      startWw: st.ww,
      startPanX: st.pan.x,
      startPanY: st.pan.y,
      startZoom: st.zoom,
    };
  }, [getCanvasPos, toImgCoord]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const st = stateRef.current;
    if (st.images.length === 0) return;

    /* Ruler live preview */
    if (st.activeTool === 'ruler' && rulerRef.current.start) {
      const pos = getCanvasPos(e);
      const imgPos = toImgCoord(pos.x, pos.y);
      rulerRef.current.end = imgPos;
      setRulerLive({ start: rulerRef.current.start, end: imgPos });
      return;
    }

    const d = dragRef.current;
    if (!d.active) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    switch (st.activeTool) {
      case 'wl': {
        setWw(Math.max(1, d.startWw + dx * 2));
        setWc(d.startWc - dy * 2);
        break;
      }
      case 'zoom': {
        const factor = 1 - dy * 0.005;
        setZoom(Math.max(0.1, Math.min(20, d.startZoom * factor)));
        break;
      }
      case 'pan': {
        setPan({ x: d.startPanX + dx, y: d.startPanY + dy });
        break;
      }
    }
  }, [getCanvasPos, toImgCoord]);

  const handleMouseUp = useCallback(() => {
    const st = stateRef.current;

    /* Finalise ruler measurement */
    const start = rulerRef.current.start;
    const end = rulerRef.current.end;

    if (start && end) {
      const startImg = { x: start.x, y: start.y };
      const endImg = { x: end.x, y: end.y };

      if (
        Number.isFinite(startImg.x) && Number.isFinite(startImg.y) &&
        Number.isFinite(endImg.x) && Number.isFinite(endImg.y)
      ) {
        const m = st.images[st.currentIndex]?.metadata;
        if (m) {
          const dist = calculateDistance(startImg, endImg, m.pixelSpacing);
          if (Number.isFinite(dist.distancePx) && dist.distancePx > 3) {
            setMeasurements((prev) => [
              ...prev,
              {
                id: 'meas-' + Date.now(),
                startImg,
                endImg,
                distanceMm: dist.distanceMm,
                distancePx: dist.distancePx,
              },
            ]);
          }
        }
      }

      rulerRef.current = { start: null, end: null };
      setRulerLive({ start: null, end: null });
    }

    dragRef.current.active = false;
    requestRender();
  }, [requestRender]);

  /* ═══════════ Scroll ═══════════ */

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const st = stateRef.current;
    if (st.images.length === 0) return;

    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.1, Math.min(20, z * factor)));
    } else if (st.images.length > 1) {
      const next = e.deltaY > 0
        ? Math.min(st.currentIndex + 1, st.images.length - 1)
        : Math.max(st.currentIndex - 1, 0);
      if (next !== st.currentIndex) {
        setCurrentIndex(next);
        syncMeta(next);
      }
    }
  }, []);

  /* ═══════════ Keyboard ═══════════ */

  useEffect(() => {
    if (images.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((i) => { const n = Math.max(0, i - 1); syncMeta(n); return n; });
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((i) => { const n = Math.min(images.length - 1, i + 1); syncMeta(n); return n; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  /* ═══════════ Helpers ═══════════ */

  const syncMeta = useCallback((idx: number) => {
    const imgs = stateRef.current.images;
    if (idx >= imgs.length) return;
    const m = imgs[idx].metadata;
    setDicomMeta({
      patientName: m.patientName,
      patientId: m.patientId,
      studyDate: m.studyDate,
      modality: m.modality,
      studyDescription: m.studyDescription,
      seriesDescription: m.seriesDescription,
      rows: m.rows,
      columns: m.columns,
      bitsAllocated: m.bitsAllocated,
      bitsStored: m.bitsStored,
      pixelSpacing: m.pixelSpacing,
    });
  }, []);

  /* ═══════════ Load files ═══════════ */

  const loadFiles = useCallback(async (files: File[]) => {
    if (!files.length || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setLoadProgress({ loaded: 0, total: files.length });

    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    );

    const parsed: DicomImage[] = [];
    const names: string[] = [];

    try {
      for (let i = 0; i < sorted.length; i++) {
        const ab = await sorted[i].arrayBuffer();
        const img = parseDicomFile(ab);
        parsed.push(img);
        names.push(sorted[i].name);
        setLoadProgress({ loaded: i + 1, total: sorted.length });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo DICOM';
      setError(msg);
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    const first = parsed[0];
    const m = first.metadata;
    const isMono1 = m.photometricInterpretation === 'MONOCHROME1';

    setImages(parsed);
    setFileNames(names);
    setCurrentIndex(0);
    setWc(m.windowCenter);
    setWw(m.windowWidth);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setInvert(isMono1);
    setMeasurements([]);
    rulerRef.current = { start: null, end: null };
    setRulerLive({ start: null, end: null });

    setDicomMeta({
      patientName: m.patientName,
      patientId: m.patientId,
      studyDate: m.studyDate,
      modality: m.modality,
      studyDescription: m.studyDescription,
      seriesDescription: m.seriesDescription,
      rows: m.rows,
      columns: m.columns,
      bitsAllocated: m.bitsAllocated,
      bitsStored: m.bitsStored,
      pixelSpacing: m.pixelSpacing,
    });

    loadingRef.current = false;
    setLoading(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) loadFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) loadFiles(Array.from(e.dataTransfer.files));
  };

  /* ═══════════ Viewport actions ═══════════ */

  const applyPreset = (pWc: number, pWw: number) => { setWc(pWc); setWw(pWw); };
  const toggleInvert = () => setInvert((v) => !v);
  const rotateView = () => setRotation((r) => (r + 90) % 360);

  const resetView = () => {
    if (images.length === 0) return;
    const m = images[currentIndex].metadata;
    setWc(m.windowCenter);
    setWw(m.windowWidth);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setInvert(m.photometricInterpretation === 'MONOCHROME1');
  };

  const clearAnnotations = () => {
    setMeasurements([]);
    rulerRef.current = { start: null, end: null };
    setRulerLive({ start: null, end: null });
  };

  const sliderNavigate = (i: number) => { setCurrentIndex(i); syncMeta(i); };

  /* ═══════════ Derived ═══════════ */
  const hasImages = images.length > 0;

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <Paper
      withBorder
      bg="#000"
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden', ...style,
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dcm,.dicom,.DCM,application/dicom"
        multiple
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      {/* ===== Toolbar ===== */}
      {hasImages && (
        <Group
          gap={4} px="xs" py={4} bg="dark.8"
          style={{ borderBottom: '1px solid #333', flexShrink: 0 }}
          wrap="nowrap"
        >
          {(['wl', 'zoom', 'pan', 'ruler'] as ActiveTool[]).map((t) => (
            <Tooltip key={t} label={TOOL_LABEL[t].label} position="bottom" withArrow>
              <ActionIcon
                variant={activeTool === t ? 'filled' : 'subtle'}
                color={activeTool === t ? 'blue' : 'gray'}
                size="md"
                onClick={() => setActiveTool(t)}
              >
                {t === 'wl' && <Sun size={16} />}
                {t === 'zoom' && <ZoomIn size={16} />}
                {t === 'pan' && <Move size={16} />}
                {t === 'ruler' && <Ruler size={16} />}
              </ActionIcon>
            </Tooltip>
          ))}

          <Divider orientation="vertical" color="dark.5" />

          <Tooltip label="Inverter" position="bottom" withArrow>
            <ActionIcon
              variant={invert ? 'filled' : 'subtle'}
              color={invert ? 'yellow' : 'gray'}
              size="md"
              onClick={toggleInvert}
            >
              <CircleDot size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Rotacionar 90°" position="bottom" withArrow>
            <ActionIcon variant="subtle" color="gray" size="md" onClick={rotateView}>
              <RotateCw size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Resetar" position="bottom" withArrow>
            <ActionIcon variant="subtle" color="gray" size="md" onClick={resetView}>
              <RefreshCw size={16} />
            </ActionIcon>
          </Tooltip>

          <Divider orientation="vertical" color="dark.5" />

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button
                variant="subtle" color="gray" size="compact-xs"
                rightSection={<ChevronDown size={12} />}
              >
                Presets W/L
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {WL_PRESETS.map((p) => (
                <Menu.Item key={p.name} onClick={() => applyPreset(p.wc, p.ww)}>
                  <Group justify="space-between">
                    <Text size="sm">{p.name}</Text>
                    <Text size="xs" c="dimmed">{p.wc} / {p.ww}</Text>
                  </Group>
                </Menu.Item>
              ))}
              <Menu.Divider />
              <Menu.Item onClick={resetView}>
                <Text size="sm">Automático (DICOM)</Text>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Box style={{ flex: 1 }} />

          {measurements.length > 0 && (
            <Tooltip label="Limpar medições" position="bottom" withArrow>
              <ActionIcon variant="subtle" color="red" size="md" onClick={clearAnnotations}>
                <Trash2 size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label="Metadados DICOM" position="bottom" withArrow>
            <ActionIcon
              variant={showMetadata ? 'filled' : 'subtle'}
              color={showMetadata ? 'blue' : 'gray'}
              size="md"
              onClick={() => setShowMetadata((v) => !v)}
            >
              <Info size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Carregar outros arquivos" position="bottom" withArrow>
            <ActionIcon
              variant="subtle" color="gray" size="md"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}

      {/* ===== Slice navigation ===== */}
      {images.length > 1 && (
        <Group
          gap={8} px="xs" py={4} bg="dark.9"
          style={{ borderBottom: '1px solid #222', flexShrink: 0 }}
          wrap="nowrap"
        >
          <Tooltip label="Imagem anterior (↑/←)" position="bottom" withArrow>
            <ActionIcon
              variant="subtle" color="gray" size="sm"
              disabled={currentIndex === 0}
              onClick={() => sliderNavigate(Math.max(0, currentIndex - 1))}
            >
              <ChevronLeft size={14} />
            </ActionIcon>
          </Tooltip>

          <Box style={{ flex: 1 }}>
            <Slider
              min={0} max={images.length - 1} step={1}
              value={currentIndex}
              onChange={sliderNavigate}
              size="xs" color="blue"
              label={(v) => `${v + 1} / ${images.length}`}
              styles={{ thumb: { width: 12, height: 12 } }}
            />
          </Box>

          <Tooltip label="Próxima imagem (↓/→)" position="bottom" withArrow>
            <ActionIcon
              variant="subtle" color="gray" size="sm"
              disabled={currentIndex === images.length - 1}
              onClick={() => sliderNavigate(Math.min(images.length - 1, currentIndex + 1))}
            >
              <ChevronRight size={14} />
            </ActionIcon>
          </Tooltip>

          <Text size="xs" c="gray.4" style={{ minWidth: 60, textAlign: 'right' }}>
            {currentIndex + 1} / {images.length}
          </Text>
        </Group>
      )}

      {/* ===== Main canvas area ===== */}
      <Box
        ref={containerRef}
        style={{
          flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
          cursor: hasImages ? TOOL_LABEL[activeTool].cursor : 'default',
        }}
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Canvas — always in DOM */}
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: hasImages ? 'block' : 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Drop-zone overlay */}
        {!hasImages && (
          <Box
            style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: isDragOver ? 'rgba(66,99,235,0.12)' : '#0a0a0a',
              border: isDragOver ? '2px dashed #4263eb' : '2px dashed #333',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            <Stack align="center" gap="md" p="xl">
              <Upload size={56} color="#555" />
              <Text size="lg" fw={600} c="gray.5" ta="center">Visualizador DICOM</Text>
              <Text size="sm" c="gray.6" ta="center" maw={280}>
                Arraste arquivos DICOM para cá ou clique para selecionar
              </Text>
              {error && (
                <Text size="sm" c="red.5" ta="center" style={{ whiteSpace: 'pre-line' }}>{error}</Text>
              )}
              {loading && (
                <Stack gap={4} w="100%" maw={280}>
                  <Text size="sm" c="blue.5" ta="center">
                    Carregando… {loadProgress.loaded}/{loadProgress.total}
                  </Text>
                  <Progress
                    value={loadProgress.total > 0 ? (loadProgress.loaded / loadProgress.total) * 100 : 0}
                    size="sm"
                  />
                </Stack>
              )}
              <Button
                variant="outline" color="gray"
                onClick={() => fileInputRef.current?.click()}
                leftSection={<Upload size={16} />}
              >
                Selecionar arquivos
              </Button>
              <Text size="xs" c="gray.7" ta="center">Suporta .dcm / .dicom (série inteira)</Text>
            </Stack>
          </Box>
        )}

        {/* HUD */}
        {hasImages && (
          <Box style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
            <Text size="xs" c="yellow" ff="monospace">
              WC: {Math.round(wc)}  WW: {Math.round(ww)}
            </Text>
            <Text size="xs" c="yellow" ff="monospace">
              Zoom: {(zoom * 100).toFixed(0)}%
            </Text>
            {images.length > 1 && (
              <Text size="xs" c="yellow" ff="monospace">
                Imagem: {currentIndex + 1} / {images.length}
              </Text>
            )}
            {error && (
              <Text
                size="xs" c="red.4" ff="monospace"
                style={{ maxWidth: 520, whiteSpace: 'pre-wrap' }}
              >
                {error}
              </Text>
            )}
          </Box>
        )}

        {/* Metadata overlay */}
        {hasImages && showMetadata && dicomMeta && (
          <Paper
            p="xs" bg="rgba(0,0,0,0.85)"
            style={{
              position: 'absolute', top: 8, right: 8,
              maxWidth: 280, borderRadius: 8, zIndex: 10,
            }}
          >
            <Text size="xs" fw={700} c="white" mb={4}>Metadados DICOM</Text>
            {(
              [
                ['Paciente', dicomMeta.patientName],
                ['ID', dicomMeta.patientId],
                ['Data', dicomMeta.studyDate],
                ['Modalidade', dicomMeta.modality],
                ['Estudo', dicomMeta.studyDescription],
                ['Série', dicomMeta.seriesDescription],
                ['Dimensões', dicomMeta.columns && dicomMeta.rows
                  ? `${dicomMeta.columns} × ${dicomMeta.rows}` : ''],
                ['Bits', dicomMeta.bitsAllocated
                  ? `${dicomMeta.bitsStored} / ${dicomMeta.bitsAllocated}` : ''],
                ['Pixel Spacing', dicomMeta.pixelSpacing
                  ? `${dicomMeta.pixelSpacing[0].toFixed(2)} × ${dicomMeta.pixelSpacing[1].toFixed(2)} mm`
                  : ''],
              ] as [string, string][]
            )
              .filter(([, v]) => v && v !== 'N/A' && v.trim() !== '')
              .map(([label, value]) => (
                <Group key={label} gap={8} wrap="nowrap">
                  <Text size="xs" c="gray.5" style={{ minWidth: 76 }}>{label}:</Text>
                  <Text size="xs" c="white" style={{ wordBreak: 'break-all' }}>{value}</Text>
                </Group>
              ))}
          </Paper>
        )}

        {/* Bottom badges */}
        {hasImages && (
          <>
            <Badge
              variant="filled" color="dark" size="sm"
              style={{ position: 'absolute', bottom: 8, left: 8, opacity: 0.8 }}
            >
              {fileNames[currentIndex] ?? ''}
            </Badge>
            <Badge
              variant="filled" color="blue" size="sm"
              style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.8 }}
            >
              {TOOL_LABEL[activeTool].label}
            </Badge>
          </>
        )}
      </Box>
    </Paper>
  );
}
