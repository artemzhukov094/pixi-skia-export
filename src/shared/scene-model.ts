export type NodeKind = 'container' | 'graphics' | 'sprite' | 'text';

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
}

export interface BaseSceneNode {
  id: string;
  name: string;
  kind: NodeKind;
  transform: Transform;
  interactive?: boolean;
  children?: SceneNode[];
}

export interface ContainerSceneNode extends BaseSceneNode {
  kind: 'container';
  children: SceneNode[];
}

export interface GraphicsSceneNode extends BaseSceneNode {
  kind: 'graphics';
  commands: GraphicsCommand[];
}

export interface SpriteSceneNode extends BaseSceneNode {
  kind: 'sprite';
  image: string;
  width: number;
  height: number;
}

export interface TextSceneNode extends BaseSceneNode {
  kind: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export type SceneNode =
  | ContainerSceneNode
  | GraphicsSceneNode
  | SpriteSceneNode
  | TextSceneNode;

export interface SceneDocument {
  width: number;
  height: number;
  background: string;
  root: ContainerSceneNode;
}

export type GraphicsCommand =
  | {
      type: 'ellipse';
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
    }
  | {
      type: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
    }
  | {
      type: 'path';
      points: Array<{ x: number; y: number }>;
      stroke: string;
      lineWidth: number;
    }
  | {
      type: 'polygon';
      points: Array<{ x: number; y: number }>;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
    };

export const defaultTransform = (): Transform => ({
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  alpha: 1
});
