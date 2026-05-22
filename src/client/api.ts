import { SceneDocument } from '../shared/scene-model';

export const renderSkiaPreview = async (
  scene: SceneDocument,
  canvas: HTMLCanvasElement
): Promise<void> => {
  const response = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const blob = await response.blob();
  const image = await createImageBitmap(blob);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  canvas.width = scene.width;
  canvas.height = scene.height;
  ctx.clearRect(0, 0, scene.width, scene.height);
  ctx.drawImage(image, 0, 0);
};

export const exportPdf = async (scene: SceneDocument): Promise<void> => {
  const response = await fetch('/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pixi-skia-scene.pdf';
  link.click();
  URL.revokeObjectURL(url);
};
