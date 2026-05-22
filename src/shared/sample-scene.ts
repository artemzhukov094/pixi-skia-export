import { SceneDocument, defaultTransform } from './scene-model';

export const createSampleSprite = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 92;
  canvas.height = 58;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const gradient = ctx.createLinearGradient(0, 0, 92, 58);
  gradient.addColorStop(0, '#dbeafe');
  gradient.addColorStop(0.45, '#f8fafc');
  gradient.addColorStop(1, '#94a3b8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 92, 58);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 38, 92, 20);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(12, 30, 18, 18);
  ctx.fillStyle = '#475569';
  ctx.fillRect(52, 22, 24, 26);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(56, 26, 6, 7);
  ctx.fillRect(66, 26, 6, 7);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 45);
  ctx.lineTo(92, 41);
  ctx.stroke();

  return canvas.toDataURL('image/png');
};

export const createEmptySceneDocument = (
  spriteImage: string,
  label = 'Канвас1\nPixi.js'
): SceneDocument => ({
  width: 420,
  height: 260,
  background: '#f3f4f6',
  root: {
    id: 'root',
    name: 'Root',
    kind: 'container',
    transform: defaultTransform(),
    children: [
      {
        id: 'renderer-label',
        name: 'Renderer label',
        kind: 'text',
        text: label,
        fontSize: 22,
        fontFamily: 'Arial',
        color: '#111827',
        transform: { ...defaultTransform(), x: 28, y: 22 }
      },
      {
        id: 'sub-container',
        name: 'Prepared nested container',
        kind: 'container',
        transform: { ...defaultTransform(), x: 138, y: 78 },
        children: [
          {
            id: 'g3',
            name: 'White line',
            kind: 'graphics',
            interactive: true,
            transform: { ...defaultTransform(), rotation: -20 },
            commands: [
              {
                type: 'path',
                points: [
                  { x: 0, y: 0 },
                  { x: 150, y: 100 }
                ],
                stroke: '#ffffff',
                lineWidth: 10
              }
            ]
          },
          {
            id: 'g4',
            name: 'Green line',
            kind: 'graphics',
            interactive: true,
            transform: { ...defaultTransform(), rotation: 20 },
            commands: [
              {
                type: 'path',
                points: [
                  { x: 0, y: 70 },
                  { x: 150, y: -30 }
                ],
                stroke: '#22c55e',
                lineWidth: 10
              }
            ]
          },
          {
            id: 'sprite-1',
            name: 'PNG sprite',
            kind: 'sprite',
            image: spriteImage,
            width: 92,
            height: 58,
            transform: { ...defaultTransform(), x: 24, y: 70 }
          }
        ]
      },
      {
        id: 'g1',
        name: 'Blue ellipse',
        kind: 'graphics',
        interactive: true,
        transform: { ...defaultTransform(), x: 200, y: 100, rotation: 30 },
        commands: [
          {
            type: 'ellipse',
            x: 0,
            y: 0,
            width: 44,
            height: 54,
            fill: '#0ea5e9',
            stroke: '#0369a1',
            lineWidth: 1
          }
        ]
      },
      {
        id: 'g2',
        name: 'Orange rect',
        kind: 'graphics',
        interactive: true,
        transform: { ...defaultTransform(), x: 245, y: 58, rotation: 15, scaleX: 1.5, scaleY: 1.7 },
        commands: [
          {
            type: 'rect',
            x: -12,
            y: -28,
            width: 24,
            height: 56,
            fill: '#fb923c',
            stroke: '#9a3412',
            lineWidth: 1
          }
        ]
      },
      {
        id: 'g5',
        name: 'Lime polygon',
        kind: 'graphics',
        interactive: true,
        transform: { ...defaultTransform(), x: 190, y: 54, rotation: -22 },
        commands: [
          {
            type: 'polygon',
            points: [
              { x: -23, y: -18 },
              { x: 18, y: -26 },
              { x: 28, y: 13 },
              { x: -10, y: 23 }
            ],
            fill: '#84cc16',
            stroke: '#4d7c0f',
            lineWidth: 1
          }
        ]
      }
    ]
  }
});
