import { Canvas, loadImage } from 'skia-canvas';
import { GraphicsCommand, SceneDocument, SceneNode } from '../shared/scene-model';

type CanvasContext = CanvasRenderingContext2D & {
  drawImage: (...args: unknown[]) => void;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const applyPaint = (ctx: CanvasContext, command: GraphicsCommand): void => {
  if ('fill' in command && command.fill) {
    ctx.fillStyle = command.fill;
    ctx.fill();
  }

  if ('stroke' in command && command.stroke && command.lineWidth) {
    ctx.strokeStyle = command.stroke;
    ctx.lineWidth = command.lineWidth;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.stroke();
  }
};

const drawCommand = (ctx: CanvasContext, command: GraphicsCommand): void => {
  ctx.beginPath();

  if (command.type === 'ellipse') {
    ctx.ellipse(command.x, command.y, command.width / 2, command.height / 2, 0, 0, Math.PI * 2);
  }

  if (command.type === 'rect') {
    ctx.rect(command.x, command.y, command.width, command.height);
  }

  if (command.type === 'path') {
    const [first, ...rest] = command.points;
    if (first) {
      ctx.moveTo(first.x, first.y);
      rest.forEach((point) => ctx.lineTo(point.x, point.y));
    }
  }

  if (command.type === 'polygon') {
    const [first, ...rest] = command.points;
    if (first) {
      ctx.moveTo(first.x, first.y);
      rest.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
    }
  }

  applyPaint(ctx, command);
};

const renderNode = async (ctx: CanvasContext, node: SceneNode): Promise<void> => {
  ctx.save();
  ctx.globalAlpha *= node.transform.alpha;
  ctx.translate(node.transform.x, node.transform.y);
  ctx.rotate(toRadians(node.transform.rotation));
  ctx.scale(node.transform.scaleX, node.transform.scaleY);

  if (node.kind === 'graphics') {
    node.commands.forEach((command) => drawCommand(ctx, command));
  }

  if (node.kind === 'sprite') {
    const image = await loadImage(node.image);
    ctx.drawImage(image, 0, 0, node.width, node.height);
  }

  if (node.kind === 'text') {
    ctx.fillStyle = node.color;
    ctx.font = `${node.fontSize}px ${node.fontFamily}`;
    const lineHeight = Math.round(node.fontSize * 1.2);
    node.text.split('\n').forEach((line, index) => {
      ctx.fillText(line, 0, index * lineHeight + node.fontSize);
    });
  }

  if (node.children) {
    for (const child of node.children) {
      await renderNode(ctx, child);
    }
  }

  ctx.restore();
};

export const renderSceneToBuffer = async (
  scene: SceneDocument,
  format: 'png' | 'pdf'
): Promise<Buffer> => {
  const canvas = new Canvas(scene.width, scene.height);
  const ctx = canvas.getContext('2d') as unknown as CanvasContext;

  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, scene.width, scene.height);
  await renderNode(ctx, scene.root);

  return canvas.toBuffer(format);
};
