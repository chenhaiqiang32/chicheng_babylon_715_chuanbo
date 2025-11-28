import {
  BaseTexture,
  CubeTexture,
  Geometry,
  ImportMeshAsync,
  InternalTexture,
  ISceneLoaderAsyncResult,
  Material,
  Scene,
  Texture,
  TransformNode,
} from '@babylonjs/core';
import { Editor } from '../Editor';
import { Dispatch } from '@/utils/dispatch';
import { serializeNode, deserializeNode } from './serialze/node/Node';
import { ICollectAssets, ILoaderAssets } from './AssetsManager';
import { ID } from '@/utils/id';
import { CC } from './BaseRes';

interface RuntimeAssetsEventBus {
  onChanged: () => void;
}

export interface ResContainer extends ISceneLoaderAsyncResult {
  uuid: string;
  name: string;
  createTime: string;
}

export class RuntimeAssets extends Dispatch<RuntimeAssetsEventBus> {
  getAsset(target: string) {
    return this.sceneAssets.find((asset) => asset.uuid === target);
  }
  private static instance: RuntimeAssets;

  static get Instance() {
    if (!RuntimeAssets.instance) {
      RuntimeAssets.instance = new RuntimeAssets();
    }
    return this.instance;
  }

  public sceneAssets: ResContainer[];

  constructor() {
    super();
    this.sceneAssets = [];
  }

  async importMesh(file: File) {
    const scene = Editor.Instance.newScene();
    const data = await ImportMeshAsync(file, scene);
    const assets = new Assets();
    const all = [...data.meshes, ...data.transformNodes];
    const root = all.find((x) => x.name == '__root__');
    assets.rootNode = serializeNode(root, assets);
    scene.dispose();
    return assets;
  }

  generateName(baseName: string) {
    const names = this.sceneAssets.map((asset) => asset.name);
    if (!names.includes(baseName)) {
      return baseName;
    }
    let i = 1;
    while (names.includes(`${baseName} (${i})`)) {
      i++;
    }
    return `${baseName} (${i})`;
  }
}

export class Assets implements ICollectAssets, ILoaderAssets {
  private currentScene: Scene;
  private sceneMaterial: Map<string, Material> = new Map();
  private sceneGeometry: Map<string, Geometry> = new Map();
  private sceneTexture: Map<string, BaseTexture> = new Map();
  rootNode: CC.ObjectNode;
  async addToScene(scene: Scene) {
    this.currentScene = scene;
    this.sceneMaterial.clear();
    this.sceneGeometry.clear();
    this.sceneTexture.clear();
    await deserializeNode(this.rootNode, scene, this);
  }

  getGeometry(uuid: string): Promise<Geometry> {
    if (this.sceneGeometry.has(uuid)) {
      return Promise.resolve(this.sceneGeometry.get(uuid) as Geometry);
    } else {
      const data = this.geometry.find((x) => x.uuid == uuid);
      if (data) {
        const geo = Geometry.Parse(data, this.currentScene, null);
        this.sceneGeometry.set(uuid, geo);
        return Promise.resolve(geo);
      }
    }
  }
  getMaterial(uuid: string): Promise<Material> {
    if (this.sceneMaterial.has(uuid)) {
      return Promise.resolve(this.sceneMaterial.get(uuid) as Material);
    } else {
      const data = this.material.find((x) => x.uuid == uuid);
      if (data) {
        const mat = Material.Parse(data, this.currentScene, null);
        for (const key in mat) {
          if (key.endsWith('_MAP')) {
            //@ts-ignore
            const uuid = mat[key];
            this.getTexture(uuid).then((t) => {
              //@ts-ignore
              material[key.replace('_MAP', '')] = t;
            });
          }
        }
        this.sceneMaterial.set(uuid, mat);
        return Promise.resolve(mat);
      }
    }
  }
  getTexture(uuid: string): Promise<BaseTexture> {
    return Promise.resolve(new Texture('./img/Avocado_baseColor.png', this.currentScene));
    if (this.sceneTexture.has(uuid)) {
      return Promise.resolve(this.sceneTexture.get(uuid) as BaseTexture);
    } else {
      const data = this.texture.find((x) => x.uuid == uuid);
      if (data) {
        const file = this.files.get(uuid);
        if (!file) {
          return Promise.reject('文件不存在');
        }
        const url = URL.createObjectURL(new Blob([file]));
        data.url = url;
        const tex = Texture.Parse(data, this.currentScene, null);
        this.sceneTexture.set(uuid, tex);
        return Promise.resolve(tex);
      }
    }
  }
  getCubeTexture(uuid: string): Promise<CubeTexture> {
    return null;
  }
  texture: any[] = [];
  material: any[] = [];
  geometry: any[] = [];

  files: Map<string, ArrayBuffer | Blob> = new Map();

  addCubeTexture(cubeTexture: CubeTexture): void {}
  async addTexture(texture: BaseTexture): Promise<void> {
    if (!texture.uuid) {
      texture.uuid = ID.generateUUID();
    }
    if (!this.texture.find((item) => item.uuid === texture.uuid)) {
      const data = texture.serialize();
      data.uuid = texture.uuid;
      this.texture.push(data);
      const t = texture.getInternalTexture();
      if (t._buffer) {
        const buffer = (await serializeTextureBuffer(t._buffer)) as ArrayBuffer;
        this.files.set(texture.uuid, buffer);
      }
    }
  }
  addMaterial(material: Material): void {
    if (!material.uuid) {
      material.uuid = ID.generateUUID();
    }
    if (!this.material.find((item) => item.uuid === material.uuid)) {
      const data = material.serialize();
      for (const key in material) {
        //@ts-ignore
        const value = material[key];
        if (
          //@ts-ignore
          material[key] instanceof Texture
        ) {
          if (!key.startsWith('_') && key.indexOf('environment') == -1) {
            this.addTexture(value);
            data[key + '_MAP'] = value.uuid;
            delete data[key];
          }
        }
      }
      data.uuid = material.uuid;
      this.material.push(data);
    }
  }
  addGeometry(geometry: Geometry): void {
    if (!geometry.uuid) {
      geometry.uuid = ID.generateUUID();
    }
    if (!this.geometry.find((item) => item.uuid === geometry.uuid)) {
      const data = geometry.serializeVerticeData();
      data.uuid = geometry.uuid;
      this.geometry.push(data);
    }
  }
}

async function serializeTextureBuffer(buffer: InternalTexture['_buffer']) {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  } else if (typeof buffer === 'string') {
    return new TextEncoder().encode(buffer);
  } else if (buffer instanceof Blob) {
    return buffer;
  } else if (buffer instanceof ImageBitmap || buffer instanceof HTMLImageElement) {
    return await imgToBlob(buffer);
  } else {
    return buffer;
  }
}

function imgToBlob(img: HTMLImageElement | ImageBitmap) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      resolve(blob);
    });
  });
}
