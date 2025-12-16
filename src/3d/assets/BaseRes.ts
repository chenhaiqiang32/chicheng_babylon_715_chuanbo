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
  }

  export interface TransformNode extends ObjectNode {
    type: 'transform';
    position: number[];
    rotation: number[];
    scale: number[];
  }

  export interface MeshNode extends ObjectNode {
    type: 'mesh';
    geometry: string;
    material: string;
    sideOrientation: number;
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
      texture: number;
      url: string;
      intensity: number;
    };
    iblIntensity: number;
    nodes: ObjectNode[];
    defaultRenderingPipeline: any;
    ssao2RenderingPipeline: any;
    ssrPostProcess: any;
  }
  export interface Clip {
    name: string;
    uuid: string;
    objectUuid: string;
    property: string;
    type: 'float' | 'v3' | 'quaternion' | 'v2' | 'color3' | 'boolean';
    key: {
      time: number;
      value: any;
    }[];
  }

  export interface Animation {
    name: string;
    uuid: string;
    clips: Clip[];
    desc?: string;
  }
}
