import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSceneToBuffer } from './skia-renderer';
import { SceneDocument } from '../shared/scene-model';

const app = express();
const port = Number(process.env.PORT ?? 4174);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../../dist');

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const readScene = (body: unknown): SceneDocument => {
  const scene = (body as { scene?: SceneDocument }).scene;

  if (!scene?.root || !scene.width || !scene.height) {
    throw new Error('Scene payload is invalid');
  }

  return scene;
};

app.post('/api/render', async (request, response) => {
  try {
    const scene = readScene(request.body);
    const buffer = await renderSceneToBuffer(scene, 'png');
    response.type('png').send(buffer);
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : String(error));
  }
});

app.post('/api/export-pdf', async (request, response) => {
  try {
    const scene = readScene(request.body);
    const buffer = await renderSceneToBuffer(scene, 'pdf');
    response
      .status(200)
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', 'attachment; filename="pixi-skia-scene.pdf"')
      .send(buffer);
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : String(error));
  }
});

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Skia export server is running on http://localhost:${port}`);
});
