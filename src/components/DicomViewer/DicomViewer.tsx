import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Box, Group, Loader, Paper, Text, Tooltip } from '@mantine/core';
import { ZoomIn, Move, RefreshCw, Ruler, ChevronLeft, ChevronRight } from 'lucide-react';

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
    // Use same-origin cookies if needed (backend auth token)
    xhr.withCredentials = true;
  },
});

interface DicomViewerProps {
  style?: React.CSSProperties;
  /** optional series of buffers to load when viewer mounts */
  initialSeries?: ArrayBuffer[];
  /** optional single file buffer */
  initialData?: ArrayBuffer;
}

export function DicomViewer({ style, initialSeries, initialData }: DicomViewerProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageCount, setImageCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<'wwwc' | 'zoom' | 'pan' | 'scroll' | 'length'>('wwwc');

  const seriesBuffers = useMemo(() => {
    if (initialSeries && initialSeries.length > 0) return initialSeries;
    if (initialData) return [initialData];
    return [] as ArrayBuffer[];
  }, [initialSeries, initialData]);

  const viewerId = useMemo(() => Math.random().toString(36).slice(2), []);

  const cleanupBlobUrls = useRef<string[]>([]);
  const stackState = useRef<any>(null);

  const setTool = useCallback((tool: typeof activeTool) => {
    setActiveTool(tool);

    const element = elementRef.current;
    if (!element) return;

    // deactivate all known tools
    cornerstoneTools.setToolDisabled('Wwwc');
    cornerstoneTools.setToolDisabled('Pan');
    cornerstoneTools.setToolDisabled('Zoom');
    cornerstoneTools.setToolDisabled('Length');

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
      case 'scroll':
        cornerstoneTools.setToolActive('StackScrollMouseWheel', {});
        break;
    }
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    cornerstone.enable(element);

    // Register tools
    cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool);
    cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);

    setTool('wwwc');

    return () => {
      cornerstone.disable(element);
    };
  }, [setTool]);

  useEffect(() => {
    if (!seriesBuffers.length) {
      setError('Nenhum DICOM disponível.');
      setLoading(false);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    setLoading(true);
    setError(null);

    // Cleanup previous blob URLs
    cleanupBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    cleanupBlobUrls.current = [];

    const imageIds = seriesBuffers.map((buf) => {
      const blob = new Blob([buf], { type: 'application/dicom' });
      const url = URL.createObjectURL(blob);
      cleanupBlobUrls.current.push(url);
      return `wadouri:${url}`;
    });

    const stack = {
      currentImageIdIndex: 0,
      imageIds,
    };

    stackState.current = stack;

    cornerstoneTools.addStackStateManager(element, ['stack']);
    cornerstoneTools.addToolState(element, 'stack', stack);

    cornerstone.loadImage(imageIds[0])
      .then((image: any) => {
        cornerstone.displayImage(element, image);
        setImageCount(imageIds.length);
        setCurrentIndex(0);
        setLoading(false);
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
    };

    element.addEventListener('cornerstoneimagerendered', onNewImage);

    return () => {
      element.removeEventListener('cornerstoneimagerendered', onNewImage);
      cleanupBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      cleanupBlobUrls.current = [];
    };
  }, [seriesBuffers]);

  const displayImageAtIndex = async (index: number) => {
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
      setCurrentIndex(clamped);
    } catch (err: any) {
      setError(err?.message || 'Erro ao navegar entre cortes.');
    }
  };

  const scrollNext = () => {
    const element = elementRef.current;
    if (!element) return;
    const stackToolState = cornerstoneTools.getToolState(element, 'stack');
    const stack = stackToolState?.data?.[0];
    if (!stack) return;
    displayImageAtIndex(stack.currentImageIdIndex + 1);
  };

  const scrollPrevious = () => {
    const element = elementRef.current;
    if (!element) return;
    const stackToolState = cornerstoneTools.getToolState(element, 'stack');
    const stack = stackToolState?.data?.[0];
    if (!stack) return;
    displayImageAtIndex(stack.currentImageIdIndex - 1);
  };

  const hasImages = imageCount > 0;

  return (
    <Box style={{ ...style, position: 'relative', background: '#000' }}>
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

      {hasImages && (
        <>
          <Paper
            radius="md"
            p={6}
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              zIndex: 12,
              background: 'rgba(10, 14, 24, 0.92)',
              border: '1px solid rgba(95, 123, 255, 0.35)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Group gap={6} wrap="nowrap">
              <Tooltip label="Janela / Nível (W/L)">
                <ActionIcon
                  size="lg"
                  radius="md"
                  variant={activeTool === 'wwwc' ? 'filled' : 'light'}
                  color={activeTool === 'wwwc' ? 'blue' : 'gray'}
                  onClick={() => setTool('wwwc')}
                >
                  <Text fw={700} size="xs">WL</Text>
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Zoom">
                <ActionIcon
                  size="lg"
                  radius="md"
                  variant={activeTool === 'zoom' ? 'filled' : 'light'}
                  color={activeTool === 'zoom' ? 'blue' : 'gray'}
                  onClick={() => setTool('zoom')}
                >
                  <ZoomIn size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Pan">
                <ActionIcon
                  size="lg"
                  radius="md"
                  variant={activeTool === 'pan' ? 'filled' : 'light'}
                  color={activeTool === 'pan' ? 'blue' : 'gray'}
                  onClick={() => setTool('pan')}
                >
                  <Move size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Régua">
                <ActionIcon
                  size="lg"
                  radius="md"
                  variant={activeTool === 'length' ? 'filled' : 'light'}
                  color={activeTool === 'length' ? 'blue' : 'gray'}
                  onClick={() => setTool('length')}
                >
                  <Ruler size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Scroll (rodinha)">
                <ActionIcon
                  size="lg"
                  radius="md"
                  variant={activeTool === 'scroll' ? 'filled' : 'light'}
                  color={activeTool === 'scroll' ? 'blue' : 'gray'}
                  onClick={() => setTool('scroll')}
                >
                  <ChevronLeft size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Reset view">
                <ActionIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={() => cornerstone.reset(elementRef.current)}
                >
                  <RefreshCw size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Paper>

          <Paper
            radius="md"
            p={6}
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              zIndex: 12,
              background: 'rgba(10, 14, 24, 0.92)',
              border: '1px solid rgba(95, 123, 255, 0.35)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Group gap={8} wrap="nowrap">
              <ActionIcon
                size="lg"
                radius="md"
                variant="light"
                color="gray"
                onClick={scrollPrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={16} />
              </ActionIcon>

              <Text size="sm" c="white" fw={600} style={{ minWidth: 58, textAlign: 'center' }}>
                {currentIndex + 1} / {imageCount}
              </Text>

              <ActionIcon
                size="lg"
                radius="md"
                variant="light"
                color="gray"
                onClick={scrollNext}
                disabled={currentIndex + 1 >= imageCount}
              >
                <ChevronRight size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        </>
      )}
    </Box>
  );
}

