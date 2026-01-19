import type {
  Scene,
  Node,
  Geometry,
  Material,
  BaseTexture,
  Light,
  LightGizmo,
  Texture,
} from '@babylonjs/core';
import type { Scene, Node, Geometry, Material, BaseTexture, TransformNode, ParticleSystem, GPUParticleSystem, ThinParticleSystem, IParticleSystem, ParticleSystemSet } from '@babylonjs/core';

declare module '@babylonjs/core' {
  interface Scene {
    name: string;
    uuid: string;
    runtimeAnimation: any[];
    bgType: number;
    bgTexture: Texture;
  }
  interface Node {
    uuid: string;
    isIgnore: boolean;
    active: boolean
  }
  interface Geometry {
    uuid: string;
  }
  interface Material {
    uuid: string;
    isDirty: boolean;
    share: boolean;
  }
  interface BaseTexture {
    uuid: string;
    sourceUUID: string;
    url: string;
    prevUrl: string;
    isDirty: boolean;
  }
  interface InternalTexture {
    uuid: string;
  }
  interface Light {
    gizmo: LightGizmo;
  }
  interface TransformNode {
  }
  interface ParticleSystem {
    isDefaultexture: boolean = true;

  }
  interface GPUParticleSystem {
    isDefaultexture: boolean = true;
  }

}
