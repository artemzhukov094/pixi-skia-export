import * as PIXI from 'pixi.js-legacy';
import { exportPdf } from './api';
import { renderCanvasKitPreview } from './canvaskit-renderer';
import { hitTestScene } from './hit-test';
import {
  appendGraphicsNode,
  attachPixiEventLogging,
  convertPixiContainerToSkia,
  createPixiContainerFromScene,
  createPixiDisplayObject
} from './pixi-bridge';
import { createAlternateContainer, createRandomGraphicsNode } from './scene-tools';
import './styles.css';
import { createEmptySceneDocument, createSampleSprite } from '../shared/sample-scene';
import { SceneDocument, SceneNode } from '../shared/scene-model';

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('App root was not found');
}

appRoot.innerHTML = `
  <main class="shell">
    <aside class="toolbar">
      <button id="random-shape" class="primary">Сгенерировать фигуру</button>
      <button id="switch-scene">Сменить контейнер</button>
      <button id="export-pdf" class="primary">Экспорт в PDF</button>
      <div id="status" class="status">Готово</div>
      <div id="log" class="log"></div>
    </aside>
    <section class="workspace">
      <div id="pixi-panel" class="canvas-panel"></div>
      <div class="canvas-panel"><canvas id="skia-canvas" width="420" height="260"></canvas></div>
    </section>
  </main>
`;

const pixiPanel = document.querySelector<HTMLDivElement>('#pixi-panel');
const skiaCanvas = document.querySelector<HTMLCanvasElement>('#skia-canvas');
const status = document.querySelector<HTMLDivElement>('#status');
const log = document.querySelector<HTMLDivElement>('#log');
const randomButton = document.querySelector<HTMLButtonElement>('#random-shape');
const switchButton = document.querySelector<HTMLButtonElement>('#switch-scene');
const exportButton = document.querySelector<HTMLButtonElement>('#export-pdf');

if (!pixiPanel || !skiaCanvas || !status || !log || !randomButton || !switchButton || !exportButton) {
  throw new Error('UI was not initialized');
}

const writeLog = (line: string): void => {
  const time = new Date().toLocaleTimeString();
  log.textContent = `${time} ${line}\n${log.textContent ?? ''}`.slice(0, 1800);
};

const setBusy = (message: string, busy: boolean): void => {
  status.textContent = message;
  randomButton.disabled = busy;
  switchButton.disabled = busy;
  exportButton.disabled = busy;
};

const sourceScene = createEmptySceneDocument(createSampleSprite());
const preparedContainerNode = sourceScene.root.children.find((node) => node.id === 'sub-container');

if (!preparedContainerNode) {
  throw new Error('Prepared container was not found');
}

const pixiApp = new PIXI.Application({
  width: sourceScene.width,
  height: sourceScene.height,
  backgroundColor: 0xf3f4f6,
  antialias: true,
  forceCanvas: true
});

pixiPanel.appendChild(pixiApp.view as HTMLCanvasElement);

let sourceContainer = createPixiContainerFromScene(sourceScene);
let currentSkiaScene: SceneDocument = convertPixiContainerToSkia(
  sourceContainer,
  sourceScene.width,
  sourceScene.height,
  sourceScene.background
);
let randomIndex = 0;
let isAlternateContainerVisible = false;

const wireInteractiveEvents = (displayObject: PIXI.DisplayObject): void => {
  const bridged = displayObject as PIXI.DisplayObject & { __skiaNode?: SceneNode };

  if (bridged.__skiaNode?.interactive) {
    displayObject.eventMode = 'static';
    displayObject.cursor = 'pointer';
    displayObject.on('pointerdown', () => writeLog(`${bridged.__skiaNode?.id}: pointerDown`));
    displayObject.on('pointerup', () => writeLog(`${bridged.__skiaNode?.id}: pointerUp`));
  }

  if (displayObject instanceof PIXI.Container) {
    displayObject.children.forEach(wireInteractiveEvents);
  }
};

const redrawSkia = async (): Promise<void> => {
  currentSkiaScene = convertPixiContainerToSkia(
    sourceContainer,
    sourceScene.width,
    sourceScene.height,
    sourceScene.background
  );

  setBusy('Рендер Skia WASM...', true);
  await renderCanvasKitPreview(currentSkiaScene, skiaCanvas);
  setBusy('Готово', false);
};

const mountPixiScene = async (): Promise<void> => {
  pixiApp.stage.removeChildren();
  pixiApp.stage.addChild(sourceContainer);
  attachPixiEventLogging(sourceContainer, writeLog);
  await redrawSkia();
};

randomButton.addEventListener('click', async () => {
  randomIndex += 1;
  const node = createRandomGraphicsNode(randomIndex);
  const displayObject = appendGraphicsNode(sourceContainer, node);
  wireInteractiveEvents(displayObject);
  pixiApp.render();
  writeLog(`${node.id}: added`);
  await redrawSkia();
});

switchButton.addEventListener('click', async () => {
  const nextContainerNode = isAlternateContainerVisible
    ? structuredClone(preparedContainerNode)
    : createAlternateContainer();
  const replacement = createPixiDisplayObject(nextContainerNode);
  wireInteractiveEvents(replacement);
  const previousIndex = sourceContainer.children.findIndex((child) => {
    const bridged = child as PIXI.DisplayObject & { __skiaNode?: SceneNode };
    return bridged.__skiaNode?.id === 'sub-container' || bridged.__skiaNode?.id.startsWith('alternate-');
  });

  if (previousIndex >= 0) {
    sourceContainer.removeChildAt(previousIndex);
    sourceContainer.addChildAt(replacement, previousIndex);
  } else {
    sourceContainer.addChild(replacement);
  }

  pixiApp.render();
  isAlternateContainerVisible = !isAlternateContainerVisible;
  switchButton.textContent = isAlternateContainerVisible ? 'Вернуть контейнер' : 'Сменить контейнер';
  writeLog(`prepared container: ${isAlternateContainerVisible ? 'alternate' : 'original'}`);
  await redrawSkia();
});

exportButton.addEventListener('click', async () => {
  setBusy('Экспорт PDF...', true);
  try {
    await exportPdf(currentSkiaScene);
    setBusy('PDF сформирован', false);
  } catch (error) {
    setBusy('Ошибка экспорта PDF', false);
    writeLog(error instanceof Error ? error.message : String(error));
  }
});

const getSkiaPointerPosition = (event: PointerEvent): { x: number; y: number } => {
  const rect = skiaCanvas.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * currentSkiaScene.width,
    y: ((event.clientY - rect.top) / rect.height) * currentSkiaScene.height
  };
};

skiaCanvas.addEventListener('pointermove', (event) => {
  const hit = hitTestScene(currentSkiaScene, getSkiaPointerPosition(event));
  skiaCanvas.style.cursor = hit ? 'pointer' : 'default';
});

skiaCanvas.addEventListener('pointerleave', () => {
  skiaCanvas.style.cursor = 'default';
});

skiaCanvas.addEventListener('pointerdown', (event) => {
  const hit = hitTestScene(currentSkiaScene, getSkiaPointerPosition(event));

  if (hit) {
    writeLog(`${hit.id}: pointerDown on Skia`);
  }
});

skiaCanvas.addEventListener('pointerup', (event) => {
  const hit = hitTestScene(currentSkiaScene, getSkiaPointerPosition(event));

  if (hit) {
    writeLog(`${hit.id}: pointerUp on Skia`);
  }
});

void mountPixiScene();
