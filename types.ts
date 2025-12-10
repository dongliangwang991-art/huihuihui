export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export enum SceneMode {
  Tree = 0,
  Explode = 1,
  Text = 2
}

export interface ParticleData {
  id: number;
  color: string;
  shape: 'sphere' | 'cube';
}