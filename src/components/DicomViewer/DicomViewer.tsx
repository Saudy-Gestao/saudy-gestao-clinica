import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Box, Button, Group, Loader, Paper, Text, Tooltip } from '@mantine/core';
import styles from './DicomViewer.module.css';
import {
  ZoomIn,
  Move,
  RefreshCw,
  Ruler,
  ChevronLeft,
  ChevronRight,
  Eraser,
  RotateCcw,
  Play,
  Pause,
  Camera,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
} from 'lucide-react';

import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import * as cornerstoneMath from 'cornerstone-math';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import Hammer from 'hammerjs';
import dicomParser from 'dicom-parser';

/* Cornerstone setup */
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.cornerstoneMath = cornerstoneMath;
cornerstoneWADOImageLoader.external.Hammer = Hammer;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneTools.init();

cornerstoneWADOImageLoader.configure({
  useWebWorkers: false,
  beforeSend: (xhr: XMLHttpRequest) => {
    const token = localStorage.getItem('token') || localStorage.getItem('patient_portal_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
  },
});

const CINE_BASE_FPS = 8;

const WINDOW_PRESETS = [
  { name: 'Auto', width: null as number | null, center: null as number | null, short: 'A' },
  { name: 'Tecidos moles', width: 400, center: 40, short: 'M' },
  { name: 'Pulmão', width: 1500, center: -600, short: 'P' },
  { name: 'Osso', width: 2000, center: 350, short: 'O' },
  { name: 'Cérebro', width: 80, center: 40, short: 'C' },
];

interface DicomViewerProps {
  style?: React.CSSProperties;
  /** Pre-built WADO imageIds (e.g. `wadouri:/dicom/file/{id}`). Takes priority over buffer props. */
  initialImageIds?: string[];
  /** optional series of buffers to load when viewer mounts */
  initialSeries?: ArrayBuffer[];
  /** optional single file buffer */
  initialData?: ArrayBuffer;
}

type ActiveTool =
  | 'wwwc'
  | 'zoom'
  | 'pan'
  | 'length'
  | 'angle'
  | 'rect'
  | 'ellipse'
  | 'probe'
  | 'arrow'
  | 'magnify';

export function DicomViewer({ style, initialImageIds, initialSeries, initialData }: DicomViewerProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageCount, setImageCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ActiveTool>('wwwc');
  const [isInverted, setIsInverted] = useState(false);
  const [windowPresetIndex, setWindowPresetIndex] = useState(0);
  const [cinePlaying, setCinePlaying] = useState(false);
  const [cineSpeed, setCineSpeed] = useState(1);
  // Keep an up-to-date ref of isInverted so the loading effect doesn't need it as a dep
  const isInvertedRef = useRef(isInverted);
  useEffect(() => {
    isInvertedRef.current = isInverted;
  });

  const seriesBuffers = useMemo(() => {
    // Only used when initialImageIds is not provided
    if (initialImageIds && initialImageIds.length > 0) return [] as ArrayBuffer[];
    if (initialSeries && initialSeries.length > 0) return initialSeries;
    if (initialData) return [initialData];
    return [] as ArrayBuffer[];
  }, [initialImageIds, initialSeries, initialData]);

  const viewerId = useMemo(() => Math.random().toString(36).slice(2), []);
  const cleanupBlobUrls = useRef<string[]>([]);
  // Prefetch tracking: key increments each time a new series is loaded so any
  // in-flight prefetch from the previous series knows it should abort.
  const prefetchKeyRef = useRef(0);
  const [prefetchProgress, setPrefetchProgress] = useState<{ loaded: number; total: number } | null>(null);

  const applyViewportState = useCallback((element: HTMLDivElement, invert: boolean) => {
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    if (viewport.invert !== invert) {
      viewport.invert = invert;
      cornerstone.setViewport(element, viewport);
    }
  }, []);

  const setTool = useCallback((tool: ActiveTool) => {
    setActiveTool(tool);

    const element = elementRef.current;
    if (!element) return;

    // Deactivate all interaction tools and activate selected one for left mouse button.
    cornerstoneTools.setToolDisabled('Wwwc');
    cornerstoneTools.setToolDisabled('Pan');
    cornerstoneTools.setToolDisabled('Zoom');
    cornerstoneTools.setToolDisabled('Length');
    cornerstoneTools.setToolDisabled('Angle');
    cornerstoneTools.setToolDisabled('RectangleRoi');
    cornerstoneTools.setToolDisabled('EllipticalRoi');
    cornerstoneTools.setToolDisabled('Probe');
    cornerstoneTools.setToolDisabled('ArrowAnnotate');
    cornerstoneTools.setToolDisabled('Magnify');

    switch (tool) {
      case 'wwwc':
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        break;
      case 'zoom':
        cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 });
        break;
      case 'pan':
        cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
        break;
      case 'length':
        cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
        break;
      case 'angle':
        cornerstoneTools.setToolActive('Angle', { mouseButtonMask: 1 });
        break;
      case 'rect':
        cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 1 });
        break;
      case 'ellipse':
        cornerstoneTools.setToolActive('EllipticalRoi', { mouseButtonMask: 1 });
        break;
      case 'probe':
        cornerstoneTools.setToolActive('Probe', { mouseButtonMask: 1 });
        break;
      case 'arrow':
        cornerstoneTools.setToolActive('ArrowAnnotate', { mouseButtonMask: 1 });
        break;
      case 'magnify':
        cornerstoneTools.setToolActive('Magnify', { mouseButtonMask: 1 });
        break;
    }

    // Keep wheel scrolling available regardless of active left-button tool.
    cornerstoneTools.setToolActive('StackScrollMouseWheel', {});
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    cornerstone.enable(element);

    // Register tools commonly used in radiology workflows.
    cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool);
    cornerstoneTools.addTool(cornerstoneTools.AngleTool);
    cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
    cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool);
    cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
    cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
    cornerstoneTools.addTool(cornerstoneTools.MagnifyTool);
    cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);

    setTool('wwwc');

    return () => {
      cornerstone.disable(element);
    };
  }, [setTool]);

  useEffect(() => {
    // Resolve imageIds from either prop source
    let imageIds: string[];

    if (initialImageIds && initialImageIds.length > 0) {
      // Direct WADO imageIds provided – no pre-download needed
      cleanupBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      cleanupBlobUrls.current = [];
      imageIds = initialImageIds;
    } else if (seriesBuffers.length > 0) {
      // Fallback: create blob URLs from in-memory buffers
      cleanupBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      cleanupBlobUrls.current = [];
      imageIds = seriesBuffers.map((buf) => {
        const blob = new Blob([buf], { type: 'application/dicom' });
        const url = URL.createObjectURL(blob);
        cleanupBlobUrls.current.push(url);
        return `wadouri:${url}`;
      });
    } else {
      setError(null);
      setLoading(false);
      setImageCount(0);
      setCurrentIndex(0);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    setLoading(true);
    setError(null);
    setCinePlaying(false);
    setPrefetchProgress(null);
    const prefetchKey = ++prefetchKeyRef.current;

    const stack = { currentImageIdIndex: 0, imageIds };

    // Clear stale stack state from a previous series before registering new one
    try { cornerstoneTools.clearToolState(element, 'stack'); } catch { /* no-op */ }
    cornerstoneTools.addStackStateManager(element, ['stack']);
    cornerstoneTools.addToolState(element, 'stack', stack);

    cornerstone.loadImage(imageIds[0])
      .then(async (image: any) => {
        cornerstone.displayImage(element, image);
        applyViewportState(element, isInvertedRef.current);
        setImageCount(imageIds.length);
        setCurrentIndex(0);
        setLoading(false);

        // Pre-cache all remaining images in the background so scrolling is instant.
        // Uses batches of 4 concurrent requests to avoid saturating the browser.
        if (imageIds.length > 1 && prefetchKeyRef.current === prefetchKey) {
          const remaining = imageIds.slice(1);
          setPrefetchProgress({ loaded: 0, total: remaining.length });
          let loaded = 0;
          const BATCH = 4;
          for (let i = 0; i < remaining.length; i += BATCH) {
            if (prefetchKeyRef.current !== prefetchKey) break;
            const batch = remaining.slice(i, i + BATCH);
            await Promise.all(
              batch.map(async (id) => {
                try { await cornerstone.loadAndCacheImage(id); } catch { /* ignore individual failures */ }
                loaded++;
                if (prefetchKeyRef.current === prefetchKey) {
                  setPrefetchProgress({ loaded, total: remaining.length });
                }
              }),
            );
          }
          if (prefetchKeyRef.current === prefetchKey) {
            setPrefetchProgress(null);
          }
        }
      })
      .catch((err: any) => {
        setError(err?.message || 'Erro ao carregar DICOM.');
        setLoading(false);
      });

    const onNewImage = () => {
      const state = cornerstoneTools.getToolState(element, 'stack');
      const stackStateItem = state?.data?.[0];
      if (stackStateItem) {
        setCurrentIndex(stackStateItem.currentImageIdIndex);
      }
      applyViewportState(element, isInvertedRef.current);
    };

    element.addEventListener('cornerstoneimagerendered', onNewImage);

    return () => {
      // Invalidate the current prefetch key so any in-flight batch loop aborts.
      prefetchKeyRef.current++;
      setPrefetchProgress(null);
      element.removeEventListener('cornerstoneimagerendered', onNewImage);
      cleanupBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      cleanupBlobUrls.current = [];
      setCinePlaying(false);
    };
    // NOTE: isInverted intentionally omitted – tracked via isInvertedRef to avoid
    // reloading the entire stack on every invert toggle.
  }, [applyViewportState, initialImageIds, seriesBuffers]);

  const displayImageAtIndex = useCallback(async (index: number) => {
    const element = elementRef.current;
    if (!element) return;

    const state = cornerstoneTools.getToolState(element, 'stack');
    const stackStateItem = state?.data?.[0];
    if (!stackStateItem) return;

    const clamped = Math.max(0, Math.min(index, stackStateItem.imageIds.length - 1));
    stackStateItem.currentImageIdIndex = clamped;

    try {
      const imageId = stackStateItem.imageIds[clamped];
      const image = await cornerstone.loadImage(imageId);
      cornerstone.displayImage(element, image);
      applyViewportState(element, isInverted);
      setCurrentIndex(clamped);
    } catch (err: any) {
      setError(err?.message || 'Erro ao navegar entre cortes.');
    }
  }, [applyViewportState, isInverted]);

  const scrollNext = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    const stackToolState = cornerstoneTools.getToolState(element, 'stack');
    const stack = stackToolState?.data?.[0];
    if (!stack) return;
    displayImageAtIndex(stack.currentImageIdIndex + 1);
  }, [displayImageAtIndex]);

  const scrollPrevious = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    const stackToolState = cornerstoneTools.getToolState(element, 'stack');
    const stack = stackToolState?.data?.[0];
    if (!stack) return;
    displayImageAtIndex(stack.currentImageIdIndex - 1);
  }, [displayImageAtIndex]);

  useEffect(() => {
    if (!cinePlaying || imageCount <= 1) return;

    const intervalMs = Math.max(40, 1000 / (CINE_BASE_FPS * cineSpeed));
    const handle = setInterval(() => {
      const element = elementRef.current;
      if (!element) return;
      const stackToolState = cornerstoneTools.getToolState(element, 'stack');
      const stack = stackToolState?.data?.[0];
      if (!stack) return;

      const next = (stack.currentImageIdIndex + 1) % stack.imageIds.length;
      displayImageAtIndex(next);
    }, intervalMs);

    return () => clearInterval(handle);
  }, [cinePlaying, cineSpeed, imageCount, displayImageAtIndex]);

  const toggleInvert = () => {
    const element = elementRef.current;
    if (!element) return;

    const next = !isInverted;
    setIsInverted(next);
    applyViewportState(element, next);
  };

  const applyWindowPreset = (presetIndex: number) => {
    const element = elementRef.current;
    if (!element) return;

    const preset = WINDOW_PRESETS[presetIndex];
    setWindowPresetIndex(presetIndex);

    if (!preset) return;
    if (preset.width === null || preset.center === null) return;

    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;

    viewport.voi = viewport.voi || { windowWidth: 0, windowCenter: 0 };
    viewport.voi.windowWidth = preset.width;
    viewport.voi.windowCenter = preset.center;
    cornerstone.setViewport(element, viewport);
  };

  const cycleWindowPreset = () => {
    const next = (windowPresetIndex + 1) % WINDOW_PRESETS.length;
    applyWindowPreset(next);
  };

  const flipHorizontal = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.hflip = !viewport.hflip;
    cornerstone.setViewport(element, viewport);
  };

  const flipVertical = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.vflip = !viewport.vflip;
    cornerstone.setViewport(element, viewport);
  };

  const rotate90 = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.rotation = ((viewport.rotation || 0) + 90) % 360;
    cornerstone.setViewport(element, viewport);
  };

  const clearMeasurements = () => {
    const element = elementRef.current;
    if (!element) return;

    const measurementTools = ['Length', 'Angle', 'Probe', 'RectangleRoi', 'EllipticalRoi', 'ArrowAnnotate'];
    measurementTools.forEach((toolName) => {
      cornerstoneTools.clearToolState(element, toolName);
    });
    cornerstone.updateImage(element);
  };

  const exportScreenshot = async () => {
    const element = elementRef.current;
    if (!element) return;

    const canvas = element.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `dicom-slice-${currentIndex + 1}.png`;
    link.click();
  };

  const resetView = () => {
    const element = elementRef.current;
    if (!element) return;
    cornerstone.reset(element);
    applyViewportState(element, isInverted);
    setWindowPresetIndex(0);
  };

  const cycleCineSpeed = () => {
    setCineSpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
  };

  const hasImages = imageCount > 0;

  return (
    <Box style={{ ...style, position: 'relative', background: '#000' }}>
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          padding: hasImages ? 12 : 0,
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gridTemplateRows: hasImages ? 'auto 1fr' : '1fr',
          gap: hasImages ? 12 : 0,
        }}
      >
        {hasImages && (
          <Paper
            className={styles.toolbar}
            radius="md"
            p={6}
            style={{
              gridColumn: 1,
              gridRow: 1,
              overflowX: 'auto',
              background: 'rgba(10, 14, 24, 0.92)',
              border: '1px solid rgba(95, 123, 255, 0.35)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Group gap={6} wrap="nowrap" style={{ minWidth: 'max-content' }}>
              {/* Cine */}
              <Tooltip label={cinePlaying ? 'Pausar Cine' : 'Iniciar Cine'}>
                <Button
                  size="xs"
                  variant={cinePlaying ? 'filled' : 'light'}
                  color={cinePlaying ? 'blue' : 'gray'}
                  leftSection={cinePlaying ? <Pause size={14} /> : <Play size={14} />}
                  onClick={() => setCinePlaying((p) => !p)}
                >
                  Cine
                </Button>
              </Tooltip>

              <Tooltip label={`Velocidade cine: x${cineSpeed}`}>
                <Button size="xs" variant="light" color="gray" onClick={cycleCineSpeed} style={{ minWidth: 44, paddingInline: 8 }}>
                  x{cineSpeed}
                </Button>
              </Tooltip>

              {/* Contador de imagens */}
              <ActionIcon size="sm" radius="md" variant="light" color="gray" onClick={scrollPrevious} disabled={currentIndex === 0}>
                <ChevronLeft size={14} />
              </ActionIcon>
              <Text size="sm" c="white" fw={600} style={{ whiteSpace: 'nowrap', minWidth: 52, textAlign: 'center' }}>
                {currentIndex + 1} / {imageCount}
              </Text>
              <ActionIcon size="sm" radius="md" variant="light" color="gray" onClick={scrollNext} disabled={currentIndex + 1 >= imageCount}>
                <ChevronRight size={14} />
              </ActionIcon>

              {/* Pre-cache progress: shown while background loading is in progress */}
              {prefetchProgress && (
                <Tooltip label={`Pré-carregando imagens: ${prefetchProgress.loaded + 1}/${prefetchProgress.total}`}>
                  <Group gap={5} wrap="nowrap" style={{ cursor: 'default' }}>
                    <Loader size={11} color="blue" />
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {prefetchProgress.loaded}/{prefetchProgress.total}
                    </Text>
                  </Group>
                </Tooltip>
              )}

              <Box style={{ width: 1, height: 20, background: 'rgba(95,123,255,0.3)', margin: '0 4px' }} />

              <Tooltip label="Janela / Nível (W/L)">
                <Button size="xs" variant={activeTool === 'wwwc' ? 'filled' : 'light'} color={activeTool === 'wwwc' ? 'blue' : 'gray'} onClick={() => setTool('wwwc')}>
                  WL
                </Button>
              </Tooltip>

              <Tooltip label="Lupa">
                <Button size="xs" leftSection={<ZoomIn size={14} />} variant={activeTool === 'magnify' ? 'filled' : 'light'} color={activeTool === 'magnify' ? 'blue' : 'gray'} onClick={() => setTool('magnify')}>
                  Lupa
                </Button>
              </Tooltip>

              <Tooltip label="Pan">
                <Button size="xs" leftSection={<Move size={14} />} variant={activeTool === 'pan' ? 'filled' : 'light'} color={activeTool === 'pan' ? 'blue' : 'gray'} onClick={() => setTool('pan')}>
                  Pan
                </Button>
              </Tooltip>

              <Tooltip label="Distância">
                <Button size="xs" leftSection={<Ruler size={14} />} variant={activeTool === 'length' ? 'filled' : 'light'} color={activeTool === 'length' ? 'blue' : 'gray'} onClick={() => setTool('length')}>
                  Distância
                </Button>
              </Tooltip>

              <Tooltip label="Ângulo">
                <Button size="xs" variant={activeTool === 'angle' ? 'filled' : 'light'} color={activeTool === 'angle' ? 'blue' : 'gray'} onClick={() => setTool('angle')}>
                  Ângulo
                </Button>
              </Tooltip>

              <Tooltip label="ROI Retangular">
                <Button size="xs" variant={activeTool === 'rect' ? 'filled' : 'light'} color={activeTool === 'rect' ? 'blue' : 'gray'} onClick={() => setTool('rect')}>
                  ROI Ret.
                </Button>
              </Tooltip>

              <Tooltip label="ROI Elíptica">
                <Button size="xs" variant={activeTool === 'ellipse' ? 'filled' : 'light'} color={activeTool === 'ellipse' ? 'blue' : 'gray'} onClick={() => setTool('ellipse')}>
                  ROI Elíp.
                </Button>
              </Tooltip>

              <Tooltip label="Probe (HU / intensidade)">
                <Button size="xs" variant={activeTool === 'probe' ? 'filled' : 'light'} color={activeTool === 'probe' ? 'blue' : 'gray'} onClick={() => setTool('probe')}>
                  Probe
                </Button>
              </Tooltip>

              <Tooltip label="Anotação com seta">
                <Button size="xs" variant={activeTool === 'arrow' ? 'filled' : 'light'} color={activeTool === 'arrow' ? 'blue' : 'gray'} onClick={() => setTool('arrow')}>
                  Anotar
                </Button>
              </Tooltip>

              <Tooltip label={`Preset de janela: ${WINDOW_PRESETS[windowPresetIndex].name}`}>
                <Button size="xs" variant="light" color="gray" onClick={cycleWindowPreset}>
                  Janela {WINDOW_PRESETS[windowPresetIndex].short}
                </Button>
              </Tooltip>

              <Tooltip label="Flip horizontal">
                <Button size="xs" leftSection={<FlipHorizontal size={14} />} variant="light" color="gray" onClick={flipHorizontal}>
                  Flip H
                </Button>
              </Tooltip>

              <Tooltip label="Flip vertical">
                <Button size="xs" leftSection={<FlipVertical size={14} />} variant="light" color="gray" onClick={flipVertical}>
                  Flip V
                </Button>
              </Tooltip>

              <Tooltip label="Rotacionar 90°">
                <Button size="xs" leftSection={<RotateCw size={14} />} variant="light" color="gray" onClick={rotate90}>
                  Rot. 90°
                </Button>
              </Tooltip>

              <Tooltip label={isInverted ? 'Desfazer invert' : 'Invert'}>
                <Button size="xs" leftSection={<RotateCcw size={14} />} variant={isInverted ? 'filled' : 'light'} color={isInverted ? 'orange' : 'gray'} onClick={toggleInvert}>
                  Invert
                </Button>
              </Tooltip>

              <Tooltip label="Exportar PNG">
                <Button size="xs" leftSection={<Camera size={14} />} variant="light" color="gray" onClick={exportScreenshot}>
                  Exportar
                </Button>
              </Tooltip>

              <Tooltip label="Limpar medidas e anotações">
                <Button size="xs" leftSection={<Eraser size={14} />} variant="light" color="gray" onClick={clearMeasurements}>
                  Limpar
                </Button>
              </Tooltip>

              <Tooltip label="Reset view">
                <Button size="xs" leftSection={<RefreshCw size={14} />} variant="light" color="gray" onClick={resetView}>
                  Reset
                </Button>
              </Tooltip>
            </Group>
          </Paper>
        )}

        <Box
          style={{
            gridColumn: 1,
            gridRow: hasImages ? 2 : 1,
            position: 'relative',
            minHeight: 0,
            borderRadius: 10,
            overflow: 'hidden',
            border: hasImages ? '1px solid rgba(95, 123, 255, 0.25)' : 'none',
            background: '#000',
          }}
        >
          <Box
            ref={elementRef}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            id={`cornerstone-viewer-${viewerId}`}
          />

          {loading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
              <Loader color="blue" />
            </Box>
          )}

          {error && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
              <Text color="red">{error}</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
