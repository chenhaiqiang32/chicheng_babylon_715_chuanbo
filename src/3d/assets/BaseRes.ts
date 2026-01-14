import { ParticleSystemSet } from '@babylonjs/core';

export namespace CC {
  export interface BaseRes {
    uuid: string;
    name: string;
    type: string;
    url: string;
  }

  export interface Folder extends BaseRes {
    type: 'folder';
    children: BaseRes[];
  }

  export interface ObjectNode {
    uuid: string;
    name: string;
    type: string;
    children: ObjectNode[];
    visible?: boolean;
    metadata?: any;
    isIgnore?: boolean; // 对应 bjs.Node.isIgnore 自定义属性
  }

  export interface TransformNode extends ObjectNode {
    type: 'transform';
    position: number[];
    rotation: number[];
    scale: number[];
    particleSet: any;
  }
  export interface ParticleContainer extends ObjectNode {
    type: 'particle';
    position: number[];
    rotation: number[];
    scale: number[];
    particleSet: any;
  }

  export interface MeshNode extends ObjectNode {
    type: 'mesh';
    geometry: string;
    material: string;
    sideOrientation: number;
    checkCollisions: boolean;
  }
  export interface LightNode extends ObjectNode {
    type: 'light';
    data: any;
  }

  export interface Model extends BaseRes {
    type: 'model';
    hierarchy: ObjectNode[];
  }

  export interface Texture extends BaseRes {
    type: 'texture';
  }
  export interface Material extends BaseRes {
    type: 'material';
  }
  export interface CameraNode extends ObjectNode {
    type: 'camera';
    data: any;
  }

  export interface Audio extends BaseRes {
    type: 'audio';
  }
  export interface Video extends BaseRes {
    type: 'video';
  }
  export interface Geometry extends BaseRes {
    type: 'geometry';
  }

  export interface EnvMap extends BaseRes {
    type: 'env';
  }

  export interface Arg {
    name: string;
    type: string;
    defaultValue: any;
  }

  export interface ScriptData {
    name: string;
    uuid: string;
    code: string;
    args: Arg[];
  }

  export interface Scene extends BaseRes {
    type: 'scene';
    uuid: string;
    autoClear: boolean;
    clearColor: number[];
    collisionsEnabled: boolean;
    useRightHandedSystem: boolean;
    animation: CC.Animation[];
    fog: {
      fogMode: number;
      color: number[];
      fogStart: number;
      fogEnd: number;
      fogDensity: number;
    };
    physic: {
      enabled: boolean;
      gravity: number[];
      physicsEngine: string;
    };
    metadata: any;
    activeCamera: string;
    reflectionProbes: number[];
    environment: {
      sourceUUID: string; // 用户修改后的环境贴图需要使用
      url: string; // bjs默认环境贴图需要使用
      intensity: number;
    };
    background: {
      type: number;
      texture: BgTexture;
      clearColor: number[];
    };
    iblIntensity: number;
    nodes: ObjectNode[];
    defaultRenderingPipeline: any;
    ssao2RenderingPipeline: any;
    ssrPostProcess: any;
    particleSystemSet: any;
  }
  export type KeyType = 'float' | 'v3' | 'quaternion' | 'v2' | 'color3' | 'boolean' | 'camera';
  export interface Clip {
    name: string;
    uuid: string;
    objectUuid: string;
    property: string;
    type: KeyType;
    key: {
      time: number;
      value: any;
      easing: number;
    }[];
  }

  export interface Animation {
    name: string;
    uuid: string;
    clips: Clip[];
    desc?: string;
  }

  export interface BgTexture {
    name: string;
    sourceUUID: string;
    uuid: string;
  }
}
