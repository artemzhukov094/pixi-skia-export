import { GraphicsCommand, SceneDocument, SceneNode, Transform } from '../shared/scene-model';

interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

const identity = (): Matrix => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

const multiply = (left: Matrix, right: Matrix): Matrix => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
  e: left.a * right.e + left.c * right.f + left.e,
  f: left.b * right.e + left.d * right.f + left.f
});

const fromTransform = (transform: Transform): Matrix => {
  const radians = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    a: cos * transform.scaleX,
    b: sin * transform.scaleX,
    c: -sin * transform.scaleY,
    d: cos * transform.scaleY,
    e: transform.x,
    f: transform.y
  };
};

const invert = (matrix: Matrix): Matrix => {
  const det = matrix.a * matrix.d - matrix.b * matrix.c || 1;

  return {
    a: matrix.d / det,
    b: -matrix.b / det,
    c: -matrix.c / det,
    d: matrix.a / det,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / det,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / det
  };
};

const apply = (matrix: Matrix, x: number, y: number): { x: number; y: number } => ({
  x: matrix.a * x + matrix.c * y + matrix.e,
  y: matrix.b * x + matrix.d * y + matrix.f
});

const distanceToSegment = (
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
  const px = a.x + t * dx;
  const py = a.y + t * dy;

  return Math.hypot(point.x - px, point.y - py);
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

const commandContains = (command: GraphicsCommand, point: { x: number; y: number }): boolean => {
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
      return next ? distanceToSegment(point, pathPoint, next) <= command.lineWidth / 2 + 3 : false;
    });
  }

  return pointInPolygon(point, command.points);
};

const hitNode = (node: SceneNode, point: { x: number; y: number }, parentMatrix: Matrix): SceneNode | null => {
  const matrix = multiply(parentMatrix, fromTransform(node.transform));

  if (node.children) {
    for (const child of [...node.children].reverse()) {
      const result = hitNode(child, point, matrix);
      if (result) {
        return result;
      }
    }
  }

  if (!node.interactive || node.kind !== 'graphics') {
    return null;
  }

  const localPoint = apply(invert(matrix), point.x, point.y);
  return node.commands.some((command) => commandContains(command, localPoint)) ? node : null;
};

export const hitTestScene = (
  scene: SceneDocument,
  point: { x: number; y: number }
): SceneNode | null => hitNode(scene.root, point, identity());
