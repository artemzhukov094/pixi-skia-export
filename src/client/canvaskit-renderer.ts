import CanvasKitInit from 'canvaskit-wasm';
import type {
  Canvas,
  CanvasKit,
  Image,
  Paint,
  Path,
  PathBuilder,
  Surface
} from 'canvaskit-wasm';
import wasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url';
import { GraphicsCommand, SceneDocument, SceneNode } from '../shared/scene-model';

let canvasKitPromise: Promise<CanvasKit> | null = null;
const imageCache = new Map<string, Image>();

const getCanvasKit = (): Promise<CanvasKit> => {
  if (!canvasKitPromise) {
    canvasKitPromise = CanvasKitInit({
      locateFile: (file) => (file.endsWith('.wasm') ? wasmUrl : file)
    });
  }

  return canvasKitPromise;
};

const makePaint = (
  CanvasKit: CanvasKit,
  color: string,
  alpha: number,
  style: 'fill' | 'stroke',
  lineWidth = 1
): Paint => {
  const paint = new CanvasKit.Paint();
  paint.setAntiAlias(true);
  paint.setColor(CanvasKit.multiplyByAlpha(CanvasKit.parseColorString(color), alpha));
  paint.setStyle(style === 'fill' ? CanvasKit.PaintStyle.Fill : CanvasKit.PaintStyle.Stroke);

  if (style === 'stroke') {
    paint.setStrokeWidth(lineWidth);
    paint.setStrokeCap(CanvasKit.StrokeCap.Butt);
    paint.setStrokeJoin(CanvasKit.StrokeJoin.Miter);
  }

  return paint;
};

const drawWithPaint = (
  CanvasKit: CanvasKit,
  color: string | undefined,
  alpha: number,
  style: 'fill' | 'stroke',
  lineWidth: number | undefined,
  draw: (paint: Paint) => void
): void => {
  if (!color) {
    return;
  }

  const paint = makePaint(CanvasKit, color, alpha, style, lineWidth);
  draw(paint);
  paint.delete();
};

const makePath = (CanvasKit: CanvasKit, command: Extract<GraphicsCommand, { type: 'path' | 'polygon' }>): Path => {
  const builder: PathBuilder = new CanvasKit.PathBuilder();
  const [first, ...rest] = command.points;

  if (first) {
    builder.moveTo(first.x, first.y);
    rest.forEach((point) => builder.lineTo(point.x, point.y));

    if (command.type === 'polygon') {
      builder.lineTo(first.x, first.y);
    }
  }

  const path = builder.detach();
  builder.delete();
  return path;
};

const drawCommand = (CanvasKit: CanvasKit, canvas: Canvas, command: GraphicsCommand, alpha: number): void => {
  if (command.type === 'ellipse') {
    const rect = [
      command.x - command.width / 2,
      command.y - command.height / 2,
      command.x + command.width / 2,
      command.y + command.height / 2
    ];
    drawWithPaint(CanvasKit, command.fill, alpha, 'fill', command.lineWidth, (paint) => canvas.drawOval(rect, paint));
    drawWithPaint(CanvasKit, command.stroke, alpha, 'stroke', command.lineWidth, (paint) => canvas.drawOval(rect, paint));
    return;
  }

  if (command.type === 'rect') {
    const rect = [command.x, command.y, command.x + command.width, command.y + command.height];
    drawWithPaint(CanvasKit, command.fill, alpha, 'fill', command.lineWidth, (paint) => canvas.drawRect(rect, paint));
    drawWithPaint(CanvasKit, command.stroke, alpha, 'stroke', command.lineWidth, (paint) => canvas.drawRect(rect, paint));
    return;
  }

  const path = makePath(CanvasKit, command);
  drawWithPaint(CanvasKit, 'fill' in command ? command.fill : undefined, alpha, 'fill', command.lineWidth, (paint) =>
    canvas.drawPath(path, paint)
  );
  drawWithPaint(CanvasKit, command.stroke, alpha, 'stroke', command.lineWidth, (paint) => canvas.drawPath(path, paint));
  path.delete();
};

const loadImage = async (CanvasKit: CanvasKit, imageSource: string): Promise<Image | null> => {
  const cached = imageCache.get(imageSource);

  if (cached) {
    return cached;
  }

  const response = await fetch(imageSource);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const image = CanvasKit.MakeImageFromEncoded(bytes);

  if (image) {
    imageCache.set(imageSource, image);
  }

  return image;
};

const renderNode = async (
  CanvasKit: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  inheritedAlpha: number
): Promise<void> => {
  const alpha = inheritedAlpha * node.transform.alpha;

  canvas.save();
  canvas.translate(node.transform.x, node.transform.y);
  canvas.rotate(node.transform.rotation, 0, 0);
  canvas.scale(node.transform.scaleX, node.transform.scaleY);

  if (node.kind === 'graphics') {
    node.commands.forEach((command) => drawCommand(CanvasKit, canvas, command, alpha));
  }

  if (node.kind === 'sprite') {
    const image = await loadImage(CanvasKit, node.image);

    if (image) {
      const paint = makePaint(CanvasKit, '#ffffff', alpha, 'fill');
      canvas.drawImageRect(image, [0, 0, image.width(), image.height()], [0, 0, node.width, node.height], paint);
      paint.delete();
    }
  }

  if (node.kind === 'text') {
    const paint = makePaint(CanvasKit, node.color, alpha, 'fill');
    const font = new CanvasKit.Font(CanvasKit.Typeface.GetDefault(), node.fontSize);
    const lineHeight = Math.round(node.fontSize * 1.2);
    node.text.split('\n').forEach((line, index) => {
      canvas.drawText(line, 0, index * lineHeight + node.fontSize, paint, font);
    });
    font.delete();
    paint.delete();
  }

  if (node.children) {
    for (const child of node.children) {
      await renderNode(CanvasKit, canvas, child, alpha);
    }
  }

  canvas.restore();
};

export const renderCanvasKitPreview = async (
  scene: SceneDocument,
  targetCanvas: HTMLCanvasElement
): Promise<void> => {
  const CanvasKit = await getCanvasKit();
  targetCanvas.width = scene.width;
  targetCanvas.height = scene.height;

  const surface: Surface | null = CanvasKit.MakeSWCanvasSurface(targetCanvas);

  if (!surface) {
    throw new Error('CanvasKit surface was not created');
  }

  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.parseColorString(scene.background));
  await renderNode(CanvasKit, canvas, scene.root, 1);
  surface.flush();
  surface.dispose();
};
