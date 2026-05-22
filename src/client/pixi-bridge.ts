import * as PIXI from 'pixi.js-legacy';
import {
  ContainerSceneNode,
  GraphicsCommand,
  GraphicsSceneNode,
  SceneDocument,
  SceneNode,
  SpriteSceneNode,
  TextSceneNode,
  Transform
} from '../shared/scene-model';

type BridgeDisplayObject = PIXI.DisplayObject & {
  __skiaNode?: SceneNode;
};

interface PixiMatrixLike {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

interface PixiGraphicsShape {
  closeStroke?: boolean;
  type: PIXI.SHAPES;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
}

interface PixiGraphicsStyle {
  alpha: number;
  color: number;
  visible: boolean;
  width?: number;
}

interface PixiGraphicsData {
  fillStyle: PixiGraphicsStyle;
  lineStyle: PixiGraphicsStyle;
  matrix?: PixiMatrixLike | null;
  shape: PixiGraphicsShape;
  type: PIXI.SHAPES;
}

interface ExtractedCommandStyle {
  fill?: string;
  lineWidth?: number;
  stroke?: string;
}

const toColorNumber = (color: string): number => Number.parseInt(color.replace('#', ''), 16);

const toHexColor = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

const applyTransform = (displayObject: PIXI.DisplayObject, transform: Transform): void => {
  displayObject.position.set(transform.x, transform.y);
  displayObject.angle = transform.rotation;
  displayObject.scale.set(transform.scaleX, transform.scaleY);
  displayObject.alpha = transform.alpha;
};

const transformFromPixi = (displayObject: PIXI.DisplayObject): Transform => ({
  x: displayObject.position.x,
  y: displayObject.position.y,
  rotation: displayObject.angle,
  scaleX: displayObject.scale.x,
  scaleY: displayObject.scale.y,
  alpha: displayObject.alpha
});

const pointFromMatrix = (
  matrix: PixiMatrixLike | null | undefined,
  x: number,
  y: number
): { x: number; y: number } => {
  if (!matrix) {
    return { x, y };
  }

  return {
    x: matrix.a * x + matrix.c * y + matrix.tx,
    y: matrix.b * x + matrix.d * y + matrix.ty
  };
};

const pointsFromFlatArray = (
  points: number[],
  matrix?: PixiMatrixLike | null
): Array<{ x: number; y: number }> => {
  const converted: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < points.length; index += 2) {
    converted.push(pointFromMatrix(matrix, points[index], points[index + 1]));
  }

  return converted;
};

const styleFromPixi = (
  fillStyle: PixiGraphicsStyle,
  lineStyle: PixiGraphicsStyle
): ExtractedCommandStyle => ({
  fill: fillStyle.visible && fillStyle.alpha > 0 ? toHexColor(fillStyle.color) : undefined,
  stroke:
    lineStyle.visible && lineStyle.alpha > 0 && (lineStyle.width ?? 0) > 0
      ? toHexColor(lineStyle.color)
      : undefined,
  lineWidth: lineStyle.width
});

const distanceToSegment = (
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projectedX = start.x + t * dx;
  const projectedY = start.y + t * dy;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
};

const pointInPolygon = (point: { x: number; y: number }, points: Array<{ x: number; y: number }>): boolean => {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const current = points[i];
    const previous = points[j];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const commandContainsPoint = (command: GraphicsCommand, point: { x: number; y: number }): boolean => {
  if (command.type === 'ellipse') {
    const rx = command.width / 2;
    const ry = command.height / 2;
    return ((point.x - command.x) ** 2) / (rx * rx) + ((point.y - command.y) ** 2) / (ry * ry) <= 1;
  }

  if (command.type === 'rect') {
    return (
      point.x >= command.x &&
      point.x <= command.x + command.width &&
      point.y >= command.y &&
      point.y <= command.y + command.height
    );
  }

  if (command.type === 'path') {
    return command.points.some((pathPoint, index) => {
      const next = command.points[index + 1];
      return next ? distanceToSegment(point, pathPoint, next) <= command.lineWidth / 2 + 4 : false;
    });
  }

  return pointInPolygon(point, command.points);
};

const createGraphicsHitArea = (commands: GraphicsCommand[]): PIXI.IHitArea => ({
  contains: (x: number, y: number) =>
    commands.some((command) => commandContainsPoint(command, { x, y }))
});

const extractGraphicsCommands = (graphics: PIXI.Graphics): GraphicsCommand[] => {
  graphics.finishPoly();
  const graphicsData = graphics.geometry.graphicsData as PixiGraphicsData[];

  return graphicsData.flatMap((data): GraphicsCommand[] => {
    const style = styleFromPixi(data.fillStyle, data.lineStyle);
    const shape = data.shape;
    const matrix = data.matrix;

    if (data.type === PIXI.SHAPES.RECT || data.type === PIXI.SHAPES.RREC) {
      const x = shape.x ?? 0;
      const y = shape.y ?? 0;
      const width = shape.width ?? 0;
      const height = shape.height ?? 0;

      if (matrix) {
        return [
          {
            type: 'polygon',
            points: [
              pointFromMatrix(matrix, x, y),
              pointFromMatrix(matrix, x + width, y),
              pointFromMatrix(matrix, x + width, y + height),
              pointFromMatrix(matrix, x, y + height)
            ],
            ...style
          }
        ];
      }

      return [{ type: 'rect', x, y, width, height, ...style }];
    }

    if (data.type === PIXI.SHAPES.CIRC) {
      const radius = shape.radius ?? 0;
      return [
        {
          type: 'ellipse',
          x: shape.x ?? 0,
          y: shape.y ?? 0,
          width: radius * 2,
          height: radius * 2,
          ...style
        }
      ];
    }

    if (data.type === PIXI.SHAPES.ELIP) {
      return [
        {
          type: 'ellipse',
          x: shape.x ?? 0,
          y: shape.y ?? 0,
          width: (shape.width ?? 0) * 2,
          height: (shape.height ?? 0) * 2,
          ...style
        }
      ];
    }

    if (data.type === PIXI.SHAPES.POLY) {
      const points = pointsFromFlatArray(shape.points ?? [], matrix);

      if (style.fill || shape.closeStroke) {
        return [{ type: 'polygon', points, ...style }];
      }

      if (style.stroke) {
        return [{ type: 'path', points, stroke: style.stroke, lineWidth: style.lineWidth ?? 1 }];
      }
    }

    return [];
  });
};

const imageFromSprite = (sprite: PIXI.Sprite): string => {
  const resource = sprite.texture.baseTexture.resource as { source?: unknown } | undefined;
  const source = resource?.source as
    | HTMLCanvasElement
    | HTMLImageElement
    | undefined;

  if (source instanceof HTMLCanvasElement) {
    return source.toDataURL('image/png');
  }

  if (source instanceof HTMLImageElement) {
    return source.currentSrc || source.src;
  }

  return '';
};

const drawGraphicsCommand = (graphics: PIXI.Graphics, command: GraphicsCommand): void => {
  if ('stroke' in command && command.stroke) {
    graphics.lineStyle(command.lineWidth ?? 1, toColorNumber(command.stroke), 1);
  } else {
    graphics.lineStyle(0, 0, 0);
  }

  if ('fill' in command && command.fill) {
    graphics.beginFill(toColorNumber(command.fill), 1);
  }

  if (command.type === 'ellipse') {
    graphics.drawEllipse(command.x, command.y, command.width / 2, command.height / 2);
  }

  if (command.type === 'rect') {
    graphics.drawRect(command.x, command.y, command.width, command.height);
  }

  if (command.type === 'path') {
    const [first, ...rest] = command.points;
    if (first) {
      graphics.moveTo(first.x, first.y);
      rest.forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.finishPoly();
    }
  }

  if (command.type === 'polygon') {
    graphics.drawShape(new PIXI.Polygon(command.points.flatMap((point) => [point.x, point.y])));
  }

  if ('fill' in command && command.fill) {
    graphics.endFill();
  }
};

export const createPixiDisplayObject = (node: SceneNode): PIXI.DisplayObject => {
  let displayObject: PIXI.DisplayObject;

  if (node.kind === 'container') {
    const container = new PIXI.Container();
    node.children.forEach((child) => container.addChild(createPixiDisplayObject(child)));
    displayObject = container;
  } else if (node.kind === 'graphics') {
    const graphics = new PIXI.Graphics();
    node.commands.forEach((command) => drawGraphicsCommand(graphics, command));
    graphics.hitArea = createGraphicsHitArea(node.commands);
    displayObject = graphics;
  } else if (node.kind === 'sprite') {
    const sprite = PIXI.Sprite.from(node.image);
    sprite.width = node.width;
    sprite.height = node.height;
    displayObject = sprite;
  } else {
    const textNode = node as TextSceneNode;
    const text = new PIXI.Text(textNode.text, {
      fontFamily: textNode.fontFamily,
      fontSize: textNode.fontSize,
      fill: toColorNumber(textNode.color),
      lineHeight: Math.round(textNode.fontSize * 1.2)
    }) as BridgeDisplayObject;
    displayObject = text;
  }

  displayObject.name = node.name;
  applyTransform(displayObject, node.transform);
  (displayObject as BridgeDisplayObject).__skiaNode = structuredClone(node);

  if (node.interactive) {
    displayObject.eventMode = 'static';
    displayObject.cursor = 'pointer';
  }

  return displayObject;
};

export const createPixiContainerFromScene = (scene: SceneDocument): PIXI.Container => {
  return createPixiDisplayObject(scene.root) as PIXI.Container;
};

export const convertPixiContainerToSkia = (
  container: PIXI.Container,
  width: number,
  height: number,
  background: string,
  label = 'Канвас2\nSkia'
): SceneDocument => {
  const convertNode = (displayObject: BridgeDisplayObject): SceneNode => {
    const source = displayObject.__skiaNode;

    if (source) {
      const transform = transformFromPixi(displayObject);

      if (source.kind === 'container') {
        return {
          ...structuredClone(source),
          transform,
          children: (displayObject as PIXI.Container).children.map((child) =>
            convertNode(child as BridgeDisplayObject)
          )
        };
      }

      if (source.kind === 'text' && source.id === 'renderer-label') {
        return {
          ...structuredClone(source),
          text: label,
          transform
        };
      }

      return {
        ...structuredClone(source),
        transform
      } as SceneNode;
    }

    if (displayObject instanceof PIXI.Graphics) {
      return {
        id: displayObject.name || `graphics-${Math.random().toString(16).slice(2)}`,
        name: displayObject.name || 'Pixi graphics',
        kind: 'graphics',
        interactive: displayObject.eventMode === 'static' || displayObject.eventMode === 'dynamic',
        transform: transformFromPixi(displayObject),
        commands: extractGraphicsCommands(displayObject)
      };
    }

    if (displayObject instanceof PIXI.Text) {
      const textStyle = displayObject.style;

      return {
        id: displayObject.name || `text-${Math.random().toString(16).slice(2)}`,
        name: displayObject.name || 'Pixi text',
        kind: 'text',
        text: displayObject.text,
        fontSize: Number(textStyle.fontSize) || 16,
        fontFamily: Array.isArray(textStyle.fontFamily)
          ? textStyle.fontFamily[0]
          : String(textStyle.fontFamily || 'Arial'),
        color: toHexColor(Number(textStyle.fill) || 0),
        transform: transformFromPixi(displayObject)
      };
    }

    if (displayObject instanceof PIXI.Sprite) {
      return {
        id: displayObject.name || `sprite-${Math.random().toString(16).slice(2)}`,
        name: displayObject.name || 'Pixi sprite',
        kind: 'sprite',
        image: imageFromSprite(displayObject),
        width: displayObject.texture.orig.width,
        height: displayObject.texture.orig.height,
        transform: transformFromPixi(displayObject)
      };
    }

    if (displayObject instanceof PIXI.Container) {
      return {
        id: displayObject.name || `node-${Math.random().toString(16).slice(2)}`,
        name: displayObject.name || 'Pixi object',
        kind: 'container',
        transform: transformFromPixi(displayObject),
        children: displayObject.children.map((child) => convertNode(child as BridgeDisplayObject))
      };
    }

    return {
      id: displayObject.name || `unsupported-${Math.random().toString(16).slice(2)}`,
      name: displayObject.name || 'Unsupported Pixi object',
      kind: 'container',
      transform: transformFromPixi(displayObject),
      children: []
    };
  };

  return {
    width,
    height,
    background,
    root: convertNode(container as BridgeDisplayObject) as ContainerSceneNode
  };
};

export const appendGraphicsNode = (
  container: PIXI.Container,
  node: GraphicsSceneNode
): PIXI.DisplayObject => {
  const displayObject = createPixiDisplayObject(node);
  container.addChild(displayObject);
  return displayObject;
};

export const attachPixiEventLogging = (
  container: PIXI.Container,
  writeLog: (line: string) => void
): void => {
  container.children.forEach((child) => {
    const bridged = child as BridgeDisplayObject;
    if (bridged.__skiaNode?.interactive) {
      child.on('pointerdown', () => writeLog(`${bridged.__skiaNode?.id}: pointerDown`));
      child.on('pointerup', () => writeLog(`${bridged.__skiaNode?.id}: pointerUp`));
    }

    if (child instanceof PIXI.Container) {
      attachPixiEventLogging(child, writeLog);
    }
  });
};

export type { PIXI };
