import type { Scene, Node, Geometry, Material, BaseTexture } from '@babylonjs/core';

declare module '@babylonjs/core' {
  interface Scene {
    name: string;
    uuid: string;
  }
  interface Node {
    uuid: string;
  }
  interface Geometry {
    uuid: string;
  }
  interface Material {
    uuid: string;
  }
  interface BaseTexture {
    uuid: string;
  }
}
