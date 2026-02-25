import { useCallback, useEffect, useRef, useState } from 'react';
import { RenderingEngine, Enums as csEnums } from '@cornerstonejs/core';
import type { Types as csTypes } from '@cornerstonejs/core';
import {
  ToolGroupManager,
  Enums as toolsEnums,
  WindowLevelTool,
  ZoomTool,
  PanTool,
  LengthTool,
  annotation,
} from '@cornerstonejs/tools';
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

import { initCornerstone } from './cornerstoneInit';
import { addFile, getImageData, clearCache } from './saudyImageLoader';

/* ─────────── Constants ─────────── */

const VIEWPORT_ID = 'saudy-stack-vp';

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

const TOOL_NAME: Record<ActiveTool, string> = {
  wl: WindowLevelTool.toolName,
  zoom: ZoomTool.toolName,
  pan: PanTool.toolName,
  ruler: LengthTool.toolName,
};

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

interface DicomViewerProps {
  style?: React.CSSProperties;
}

/* ─────────── Helpers ─────────── */

function metaForImageId(imageId: string): DicomMeta | null {
  const data = getImageData(imageId);
  if (!data) return null;
  const m = data.metadata;
  return {
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
  };
}

/* ─────────── Component ─────────── */

export function DicomViewer({ style }: DicomViewerProps) {
  /* — DOM / engine refs — */
  const elementRef = useRef<HTMLDivElement>(null);
  // Unique IDs per component instance – stable across re-renders
  const engineIdRef = useRef('saudy-re-' + Math.random().toString(36).slice(2));
  const toolGroupIdRef = useRef('saudy-tg-' + Math.random().toString(36).slice(2));
  const engineRef = useRef<RenderingEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false); // guard without stale closure issues

  /* — series state — */
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  /* — viewer UI state — */
  const [activeTool, setActiveTool] = useState<ActiveTool>('wl');
  const [invert, setInvert] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [wlInfo, setWlInfo] = useState({ wc: 0, ww: 1 });
  const [dicomMeta, setDicomMeta] = useState<DicomMeta | null>(null);
  const [hasAnnotations, setHasAnnotations] = useState(false);

  /* — init flag — */
  const [csReady, setCsReady] = useState(false);

  /* ───────── Init Cornerstone once ───────── */
  useEffect(() => {
    initCornerstone()
      .then(() => setCsReady(true))
      .catch((e) => setError(String(e)));
  }, []);

  /* ───────── Create rendering engine + viewport + tools ───────── */
  useEffect(() => {
    if (!csReady) return;
    const el = elementRef.current;
    if (!el) return;

    const engineId = engineIdRef.current;
    const tgId = toolGroupIdRef.current;
    const { MouseBindings } = toolsEnums;

    const engine = new RenderingEngine(engineId);
    engineRef.current = engine;

    engine.enableElement({
      viewportId: VIEWPORT_ID,
      type: csEnums.ViewportType.STACK,
      element: el,
    });

    /* Tool group */
    const tg = ToolGroupManager.createToolGroup(tgId);
    if (tg) {
      for (const name of Object.values(TOOL_NAME)) {
        tg.addTool(name);
      }
      tg.setToolActive(TOOL_NAME.wl, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });
      for (const name of [TOOL_NAME.zoom, TOOL_NAME.pan, TOOL_NAME.ruler]) {
        tg.setToolPassive(name);
      }
      tg.addViewport(VIEWPORT_ID, engineId);
    }

    /* Sync W/L HUD and slice index on every rendered frame */
    const onRendered = () => {
      const vp = engine.getStackViewport(VIEWPORT_ID);
      if (!vp) return;

      setCurrentIndex(vp.getCurrentImageIdIndex());

      const props = vp.getProperties();
      if (props.voiRange) {
        const ww = props.voiRange.upper - props.voiRange.lower;
        const wc = (props.voiRange.upper + props.voiRange.lower) / 2;
        if (Number.isFinite(wc) && Number.isFinite(ww)) {
          setWlInfo({ wc: Math.round(wc), ww: Math.round(ww) });
        }
      }

      const all = annotation.state.getAllAnnotations();
      setHasAnnotations(all.length > 0);
    };

    el.addEventListener(csEnums.Events.IMAGE_RENDERED as string, onRendered);

    /* Scroll = next/prev slice; Ctrl+scroll = zoom */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vp = engine.getStackViewport(VIEWPORT_ID);
      if (!vp) return;

      if (e.ctrlKey || e.metaKey) {
        const cam = vp.getCamera() as csTypes.ICamera;
        const cur = cam.parallelScale ?? 1;
        const next = cur * (e.deltaY > 0 ? 1.1 : 0.9);
        vp.setCamera({ parallelScale: Math.max(0.01, Math.min(50, next)) });
        vp.render();
      } else {
        const ids = vp.getImageIds();
        if (ids.length <= 1) return;
        const cur = vp.getCurrentImageIdIndex();
        const next = e.deltaY > 0 ? Math.min(cur + 1, ids.length - 1) : Math.max(cur - 1, 0);
        if (next !== cur) {
          void vp.setImageIdIndex(next);
          vp.render();
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener(csEnums.Events.IMAGE_RENDERED as string, onRendered);
      el.removeEventListener('wheel', onWheel);
      try { ToolGroupManager.destroyToolGroup(tgId); } catch { /* ignore */ }
      try { engine.destroy(); } catch { /* ignore */ }
      engineRef.current = null;
    };
  }, [csReady]);

  /* ───────── Keyboard navigation ───────── */
  useEffect(() => {
    if (imageIds.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(-1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIds.length]);

  /* ───────── Helpers ───────── */

  const getVp = useCallback(
    () => engineRef.current?.getStackViewport(VIEWPORT_ID) ?? null,
    [],
  );

  const goTo = useCallback((offset: number) => {
    const vp = engineRef.current?.getStackViewport(VIEWPORT_ID);
    if (!vp) return;
    const ids = vp.getImageIds();
    const next = Math.max(0, Math.min(vp.getCurrentImageIdIndex() + offset, ids.length - 1));
    void vp.setImageIdIndex(next);
    vp.render();
  }, []);

  const applyInitialVoi = useCallback((imageId: string) => {
    const vp = getVp();
    if (!vp) return;

    const data = getImageData(imageId);
    if (!data) return;

    const { metadata: m } = data;
    const wc = m.windowCenter;
    const ww = m.windowWidth;
    const isMono1 = m.photometricInterpretation === 'MONOCHROME1';

    vp.setProperties({
      voiRange: { lower: wc - ww / 2, upper: wc + ww / 2 },
      invert: isMono1,
    });
    setInvert(isMono1);
    setWlInfo({ wc: Math.round(wc), ww: Math.round(ww) });
    vp.resetCamera();
    vp.render();
  }, [getVp]);

  /* ───────── Load files ───────── */
  const loadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      setLoadProgress({ loaded: 0, total: files.length });

      const sorted = [...files].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );

      // Clear previous cache
      clearCache();

      const ids: string[] = [];
      const names: string[] = [];

      try {
        for (let i = 0; i < sorted.length; i++) {
          const id = await addFile(sorted[i]);
          ids.push(id);
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

      setImageIds(ids);
      setFileNames(names);
      setCurrentIndex(0);
      setInvert(false);
      setRotation(0);
      annotation.state.removeAllAnnotations();
      setHasAnnotations(false);

      // Metadata is immediately available from the parsed data
      setDicomMeta(metaForImageId(ids[0]));

      // Give React one frame to flush the state update so elementRef renders
      // and the engine effect can run before we call getVp()
      await new Promise<void>((res) => setTimeout(res, 50));

      const vp = getVp();
      if (vp) {
        try {
          await vp.setStack(ids, 0);
          applyInitialVoi(ids[0]);
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erro ao carregar DICOM';
          setError(msg);
        }
      } else {
        setError('Viewer não inicializado — tente novamente em instantes.');
      }

      loadingRef.current = false;
      setLoading(false);
    },
    [applyInitialVoi, getVp],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) loadFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) loadFiles(Array.from(e.dataTransfer.files));
  };

  /* ───────── Tool switching ───────── */
  const switchTool = useCallback((tool: ActiveTool) => {
    const tg = ToolGroupManager.getToolGroup(toolGroupIdRef.current);
    if (!tg) return;
    for (const name of Object.values(TOOL_NAME)) {
      try { tg.setToolPassive(name); } catch { /* ignore */ }
    }
    tg.setToolActive(TOOL_NAME[tool], {
      bindings: [{ mouseButton: toolsEnums.MouseBindings.Primary }],
    });
    setActiveTool(tool);
  }, []);

  /* ───────── Viewport actions ───────── */
  const applyPreset = (wc: number, ww: number) => {
    const vp = getVp();
    if (!vp) return;
    vp.setProperties({ voiRange: { lower: wc - ww / 2, upper: wc + ww / 2 } });
    setWlInfo({ wc, ww });
    vp.render();
  };

  const toggleInvert = () => {
    const vp = getVp();
    if (!vp) return;
    const next = !invert;
    setInvert(next);
    vp.setProperties({ invert: next });
    vp.render();
  };

  const rotateView = () => {
    const vp = getVp();
    if (!vp) return;
    const next = (rotation + 90) % 360;
    setRotation(next);
    vp.setCamera({ rotation: next });
    vp.render();
  };

  const resetView = () => {
    const vp = getVp();
    if (!vp) return;
    vp.resetProperties();
    vp.resetCamera();
    setInvert(false);
    setRotation(0);
    vp.render();
  };

  const clearAnnotations = () => {
    annotation.state.removeAllAnnotations();
    getVp()?.render();
    setHasAnnotations(false);
  };

  const sliderNavigate = (i: number) => {
    const vp = getVp();
    if (!vp) return;
    void vp.setImageIdIndex(i);
    vp.render();
  };

  /* ───────── Hidden file input ───────── */
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".dcm,.dicom,.DCM,application/dicom"
      multiple
      onChange={handleFileInput}
      style={{ display: 'none' }}
    />
  );

  const hasImages = imageIds.length > 0;

  /* ═══════════════ RENDER ═══════════════
     IMPORTANT: the <div ref={elementRef}> must ALWAYS stay in the DOM so that
     the engine useEffect can attach Cornerstone to it when csReady fires.
     The drop-zone is shown as an absolute overlay on top when no images are loaded.
  ═══════════════════════════════════════ */
  return (
    <Paper
      withBorder
      bg="#000"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', ...style }}
    >
      {fileInput}

      {/* ===== Toolbar (only when images loaded) ===== */}
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
                onClick={() => switchTool(t)}
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
              <Button variant="subtle" color="gray" size="compact-xs" rightSection={<ChevronDown size={12} />}>
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

          {hasAnnotations && (
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
            <ActionIcon variant="subtle" color="gray" size="md" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}

      {/* ===== Slice nav bar ===== */}
      {imageIds.length > 1 && (
        <Group
          gap={8} px="xs" py={4} bg="dark.9"
          style={{ borderBottom: '1px solid #222', flexShrink: 0 }}
          wrap="nowrap"
        >
          <Tooltip label="Imagem anterior (↑/←)" position="bottom" withArrow>
            <ActionIcon
              variant="subtle" color="gray" size="sm"
              disabled={currentIndex === 0}
              onClick={() => goTo(-1)}
            >
              <ChevronLeft size={14} />
            </ActionIcon>
          </Tooltip>

          <Box style={{ flex: 1 }}>
            <Slider
              min={0} max={imageIds.length - 1} step={1}
              value={currentIndex}
              onChange={sliderNavigate}
              size="xs" color="blue"
              label={(v) => (v + 1) + ' / ' + imageIds.length}
              styles={{ thumb: { width: 12, height: 12 } }}
            />
          </Box>

          <Tooltip label="Próxima imagem (↓/→)" position="bottom" withArrow>
            <ActionIcon
              variant="subtle" color="gray" size="sm"
              disabled={currentIndex === imageIds.length - 1}
              onClick={() => goTo(1)}
            >
              <ChevronRight size={14} />
            </ActionIcon>
          </Tooltip>

          <Text size="xs" c="gray.4" style={{ minWidth: 60, textAlign: 'right' }}>
            {currentIndex + 1} / {imageIds.length}
          </Text>
        </Group>
      )}

      {/* ===== Main area ===== */}
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          cursor: hasImages ? TOOL_LABEL[activeTool].cursor : 'default',
        }}
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {/* ─── Cornerstone renders its canvas here — ALWAYS in DOM ─── */}
        <div ref={elementRef} style={{ width: '100%', height: '100%' }} />

        {/* ─── Drop-zone overlay — shown when no images loaded ─── */}
        {!hasImages && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
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

        {/* ─── HUD ─── */}
        {hasImages && (
          <Box style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
            <Text size="xs" c="yellow" ff="monospace">WC: {wlInfo.wc}  WW: {wlInfo.ww}</Text>
            {imageIds.length > 1 && (
              <Text size="xs" c="yellow" ff="monospace">
                Imagem: {currentIndex + 1} / {imageIds.length}
              </Text>
            )}
            {error && (
              <Text size="xs" c="red.4" ff="monospace" style={{ maxWidth: 520, whiteSpace: 'pre-wrap' }}>
                {error}
              </Text>
            )}
          </Box>
        )}

        {/* ─── Metadata overlay ─── */}
        {hasImages && showMetadata && dicomMeta && (
          <Paper
            p="xs" bg="rgba(0,0,0,0.85)"
            style={{ position: 'absolute', top: 8, right: 8, maxWidth: 280, borderRadius: 8, zIndex: 10 }}
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
                ['Dimensões', dicomMeta.columns && dicomMeta.rows ? `${dicomMeta.columns} × ${dicomMeta.rows}` : ''],
                ['Bits', dicomMeta.bitsAllocated ? `${dicomMeta.bitsStored} / ${dicomMeta.bitsAllocated}` : ''],
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

        {/* ─── Bottom badges ─── */}
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
