import type {
  Scene,
  Node,
  Geometry,
  Material,
  BaseTexture,
  Light,
  LightGizmo,
} from '@babylonjs/core';

declare module '@babylonjs/core' {
  interface Scene {
    name: string;
    uuid: string;
    runtimeAnimation: any[];
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
    sourceUUID: string;
  }
  interface InternalTexture {
    uuid: string;
  }
  interface Light {
    gizmo: LightGizmo;
  }
}
