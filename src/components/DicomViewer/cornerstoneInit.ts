import * as csCore from '@cornerstonejs/core';
import {
  init as csToolsInit,
  addTool,
  WindowLevelTool,
  ZoomTool,
  PanTool,
  LengthTool,
} from '@cornerstonejs/tools';
import { registerSaudyLoader } from './saudyImageLoader';

type InitState = 'idle' | 'running' | 'done';
let state: InitState = 'idle';
let promise: Promise<void> | null = null;

export function initCornerstone(): Promise<void> {
  if (state === 'done') return Promise.resolve();
  if (state === 'running') return promise!;

  state = 'running';
  promise = (async () => {
    // 1) Initialise Cornerstone core (WebGL rendering backend)
    await csCore.init();

    // 2) Register our custom image loader + metadata provider
    //    Uses dicom-parser on the main thread – no web workers / WASM needed
    registerSaudyLoader();

    // 3) Initialise tools framework
    csToolsInit();

    // 4) Register the tools we use
    for (const Tool of [WindowLevelTool, ZoomTool, PanTool, LengthTool]) {
      try {
        addTool(Tool);
      } catch {
        // already registered on HMR – safe to ignore
      }
    }

    state = 'done';
  })();

  return promise;
}
