import { GraphicsSceneNode, SceneDocument, SceneNode, defaultTransform } from '../shared/scene-model';

export const createRandomGraphicsNode = (index: number): GraphicsSceneNode => {
  const x = 82 + Math.random() * 260;
  const y = 70 + Math.random() * 140;
  const palette = ['#ef4444', '#06b6d4', '#f59e0b', '#22c55e', '#a855f7'];
  const fill = palette[index % palette.length];
  const shapeType = index % 3;

  if (shapeType === 0) {
    return {
      id: `random-ellipse-${index}`,
      name: `Random ellipse ${index}`,
      kind: 'graphics',
      interactive: true,
      transform: { ...defaultTransform(), x, y, rotation: Math.random() * 50 - 25 },
      commands: [{ type: 'ellipse', x: 0, y: 0, width: 36, height: 28, fill, stroke: '#111827', lineWidth: 1 }]
    };
  }

  if (shapeType === 1) {
    return {
      id: `random-rect-${index}`,
      name: `Random rect ${index}`,
      kind: 'graphics',
      interactive: true,
      transform: { ...defaultTransform(), x, y, rotation: Math.random() * 70 - 35 },
      commands: [{ type: 'rect', x: -18, y: -16, width: 36, height: 32, fill, stroke: '#111827', lineWidth: 1 }]
    };
  }

  return {
    id: `random-path-${index}`,
    name: `Random path ${index}`,
    kind: 'graphics',
    interactive: true,
    transform: { ...defaultTransform(), x, y, rotation: Math.random() * 90 - 45 },
    commands: [
      {
        type: 'path',
        points: [
          { x: -32, y: 0 },
          { x: 0, y: -28 },
          { x: 34, y: 18 }
        ],
        stroke: fill,
        lineWidth: 8
      }
    ]
  };
};

export const createAlternateContainer = (): SceneNode => ({
  id: `alternate-${Date.now()}`,
  name: 'Alternate prepared container',
  kind: 'container',
  transform: { ...defaultTransform(), x: 126, y: 82, rotation: -8 },
  children: [
    {
      id: 'alternate-poly',
      name: 'Prepared polygon',
      kind: 'graphics',
      interactive: true,
      transform: { ...defaultTransform(), x: 62, y: 42, rotation: 14 },
      commands: [
        {
          type: 'polygon',
          points: [
            { x: -50, y: -26 },
            { x: 38, y: -36 },
            { x: 60, y: 18 },
            { x: -14, y: 46 }
          ],
          fill: '#38bdf8',
          stroke: '#075985',
          lineWidth: 2
        }
      ]
    },
    {
      id: 'alternate-line',
      name: 'Prepared line',
      kind: 'graphics',
      interactive: true,
      transform: { ...defaultTransform(), x: 24, y: 88, rotation: 24 },
      commands: [
        {
          type: 'path',
          points: [
            { x: 0, y: 0 },
            { x: 170, y: -40 }
          ],
          stroke: '#f97316',
          lineWidth: 12
        }
      ]
    }
  ]
});

export const cloneScene = (scene: SceneDocument): SceneDocument => structuredClone(scene);
