import { SceneDocument } from '../shared/scene-model';

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
