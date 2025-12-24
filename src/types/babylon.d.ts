import type { Scene, Node, Geometry, Material, BaseTexture, TransformNode, ParticleSystem, GPUParticleSystem, ThinParticleSystem, IParticleSystem, ParticleSystemSet } from '@babylonjs/core';

declare module '@babylonjs/core' {
  interface Scene {
    name: string;
    uuid: string;
    runtimeAnimation: any[];
  }
  interface Node {
    uuid: string;
    isIgnore: boolean;
  }
  interface Geometry {
    uuid: string;
  }
  interface Material {
    uuid: string;
  }
  interface BaseTexture {
    uuid: string;
    sourceUUID: string;
  }
  interface InternalTexture {
    uuid: string;
  }
  interface TransformNode {
    particleSystem: ParticleSystemSet;
    //  gpuParticleSystem: GPUParticleSystem;
  }
  interface ParticleSystem {
    isDefaultexture: boolean = true;

  }
  interface GPUParticleSystem {
    isDefaultexture: boolean = true;
  }

}
