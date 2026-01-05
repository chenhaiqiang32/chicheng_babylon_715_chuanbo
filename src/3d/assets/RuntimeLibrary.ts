import {
  BaseTexture,
  Engine,
  ImportMeshAsync,
  InternalTexture,
  Material,
  Scene,
  PBRMaterial,
  Texture,
  SceneLoader,
  HDRCubeTexture,
} from '@babylonjs/core';
import { Editor } from '../Editor';
import { Dispatch } from '@/utils/dispatch';
import { deserializeNode, serializeNode } from './serialze/node/Node';
import { CC } from './BaseRes';
import { ZipFile } from '@/utils/Zip';
import { EditorFileSystem, IFile } from './file/IFile';
import { ICollectAssets, ILoaderAssets } from './AssetsManager';
import { Geometry, TransformNode } from '@babylonjs/core/Meshes';
import { ID } from '@/utils/id';
import { ArrayUtils } from '@/utils/Array';
import { bufferToVertex, vertexToBuffer } from './utils/GeometryUtils';
import { deserializeScene } from './serialze/Scene';
import { FBXLoader } from 'babylonjs-fbx-loader';
import '@babylonjs/loaders/SPLAT/splatFileLoader';
import { renderEnvTexture } from '@/tools/preview/materialPreviewGenerator';

const TEXTURE = 'texture';
const GEOMETRY = 'geometry';

interface RuntimeAssetsEventBus {
  onChanged: void;
  onMaterialChanged: { useCache: boolean };
}

export interface IGetBuffer {
  getGeoBuffer(uuid: string): any;
  getTextureBuffer(uuid: string): any;
  getMaterialData(uuid: string): any;
  getTexturelData(uuid: string): any;
}

export class RuntimeLibrary
  extends Dispatch<RuntimeAssetsEventBus>
  implements ICollectAssets, ILoaderAssets, IGetBuffer {
  async getTextureURL(sourceUUID: string) {
    if (!sourceUUID) {
      return '';
    }

    let buffer = await this.fileSystem.getFileArrayBuffer(sourceUUID, TEXTURE);
    ///@ts-ignore
    const url = URL.createObjectURL(new Blob([buffer]));
    return url;
  }
  // 环境贴图的缩略图url
  async getEnvTextureURL(sourceUUID: string, uuid: string, ext: string, useCache = true) {
    const url = await this.getTextureURL(sourceUUID);
    const texture = await this.getTexture(uuid);
    const envUrl = await renderEnvTexture(texture.uuid, url, ext, useCache, Editor.Instance.Engine);
    return envUrl;
  }
  private sceneList: CC.Scene[] = [];
  private static instance: RuntimeLibrary;
  private geomertyZips: string[] = [];

  private resScene: Scene;

  private _fileSystem: IFile;

  get fileSystem() {
    if (!this._fileSystem) {
      this._fileSystem = EditorFileSystem.Instance.file;
    }
    return this._fileSystem;
  }

  static get Instance() {
    if (!RuntimeLibrary.instance) {
      RuntimeLibrary.instance = new RuntimeLibrary();
    }
    return this.instance;
  }

  constructor() {
    super();
    Texture.UseSerializedUrlIfAny = true;
    Texture.SerializeBuffers = false;
    Texture.ForceSerializeBuffers = false;
    SceneLoader.RegisterPlugin(new FBXLoader());
  }
  getTexturelData(uuid: string) {
    const texture = this.texture.find((x) => x.uuid == uuid);
    return texture;
  }
  getMaterialData(uuid: string) {
    const material = this.material.find((x) => x.uuid == uuid);
    return material;
  }

  getGeoBuffer(uuid: string): Promise<Uint8Array> {
    return this.fileSystem.getFileArrayBuffer(uuid, GEOMETRY);
  }
  getTextureBuffer(uuid: string): Promise<Uint8Array> {
    return this.fileSystem.getFileArrayBuffer(uuid, TEXTURE);
  }

  async importMesh(file: File) {
    if (!this.resScene) {
      this.resScene = Editor.Instance.newResScene();
    }
    const data = await ImportMeshAsync(file, this.resScene, {});
    const all = [...data.meshes, ...data.transformNodes];
    let root = all.find((x) => x.name == '__root__');
    if (!root) {
      const list = all.filter((x) => x.parent == null);
      if (list.length == 1) {
        root = list[0];
      } else {
        root = new TransformNode(file.name.split('.')[0], this.resScene);
        list.forEach((x) => (x.parent = root));
      }
    }
    root.name = file.name.split('.')[0];
    fixMaterial(root);
    const node = await serializeNode(root, this, true);
    this.rootNodes.push(node);
    return node;
  }

  async importTexture(element: File) {
    const url = URL.createObjectURL(element);
    let texture: BaseTexture;
    if (element.name.endsWith('.hdr')) {
      texture = new HDRCubeTexture(url, this.resScene, 1024);
    } else {
      texture = new Texture(url, this.resScene);
    }
    texture.name = element.name;
    texture.sourceUUID = ID.generateUUID();
    const buffer = await element.arrayBuffer();
    this.fileSystem.saveFile(texture.sourceUUID, new Uint8Array(buffer), TEXTURE);
    const data = await this.addTexture(texture);
    data.url = url;
    return texture;
  }

  async loadAssets(loading?: (v: number) => void) {
    let progress = 0.1;
    const assetsText = await this.fileSystem.getFileText('assets.json');
    loading?.(progress);
    if (!assetsText) {
      progress = 1;
      loading?.(progress);
      return [];
    }
    const assets = JSON.parse(assetsText) as any;
    this.texture = assets.texture;
    const ids = new Set<string>();
    const padding = new Set<Promise<any>>();
    this.material = assets.material;
    this.rootNodes = assets.rootNode;

    promiseEvery([...padding], (v) => {
      loading?.(progress + v * 0.9);
    });
    await Promise.all(padding);
    progress = 1;
    const sceneText = await this.fileSystem.getFileText('scene.json');
    const scene = JSON.parse(sceneText) as CC.Scene[];
    loading?.(progress);
    return scene.filter((x) => x);
  }

  async saveAll() {
    const files: ZipFile[] = [];
    const data = {
      texture: this.texture,
      material: this.material,
      rootNode: this.rootNodes,
      geomertyZips: this.geomertyZips,
    };
    files.push(['assets.json', JSON.stringify(data)]);
    return files;
  }

  texture: any[] = [];
  material: any[] = [];
  rootNodes: CC.ObjectNode[] = [];
  sceneGeometry: Map<string, Geometry> = new Map();
  sceneMaterial: Map<string, Material> = new Map();
  sceneTexture: Map<string, BaseTexture> = new Map();
  currentScene: Scene;
  geomertyIDs: Set<string> = new Set();
  textureIds: Set<string> = new Set();

  private needUpdateScript: Map<string, CC.ScriptData> = new Map();

  addScript(script: CC.ScriptData): void {
    if (!script.uuid) {
      script.uuid = ID.generateUUID();
    }
    this.needUpdateScript.set(script.uuid, script);
  }

  async addTexture(texture: BaseTexture, force: boolean = true): Promise<any> {
    if (!texture.uuid) {
      texture.uuid = ID.generateUUID();
    }
    if (!texture.sourceUUID) {
      texture.sourceUUID = ID.generateUUID();
    }
    const old = this.texture.find((item) => item.uuid === texture.uuid);
    if (!old || force) {
      const data = texture.serialize();
      data.uuid = texture.uuid;
      delete data.url;
      if (old) {
        ArrayUtils.remove(old, this.texture);
      }
      data.sourceUUID = texture.sourceUUID;
      this.texture.push(data);
      if (!this.textureIds.has(data.sourceUUID)) {
        const t = texture.getInternalTexture();
        if (t._buffer) {
          const buffer = await serializeTextureBuffer(t._buffer);
          //@ts-ignore
          this.fileSystem.saveFile(data.sourceUUID, buffer, TEXTURE);
        } else {
          if (t.url) {
            const buffer = await (await fetch(t.url)).arrayBuffer();
            this.fileSystem.saveFile(data.sourceUUID, new Uint8Array(buffer), TEXTURE);
          }
        }
        this.textureIds.add(data.sourceUUID);
      }
      return data;
    }
  }
  InitResIntoLibrary(scene: Scene) {
    const texturePaths = [
      '/particle/textures/default/flare.png',
      '/particle/textures/explosion/FlameBlastSpriteSheet.png',
      '/particle/textures/explosion/Flare.png',
      '/particle/textures/explosion/FlashParticle.png',
      '/particle/textures/explosion/Smoke_SpriteSheet.png',
      '/particle/textures/fire/Fire_SpriteSheet1_8x8.png',
      '/particle/textures/fire/Fire_SpriteSheet2_8x8.png',
      '/particle/textures/fire/Fire_SpriteSheet3_8x8.png',
      '/particle/textures/fire/sparks.png',
      '/particle/textures/rain/Rain.png',
      '/particle/textures/smoke/Smoke_SpriteSheet_8x8.png',
    ];

    texturePaths.forEach(async (path) => {
      try {
        const texture = new Texture(path, scene);
        texture.name = path.split('/').pop() || path;
        texture.sourceUUID = ID.generateUUID();
        await this.addTexture(texture);
      } catch (error) {
        console.warn(`Failed to load texture from ${path}:`, error);
      }
    });
  }
  async addMaterial(material: Material, force: boolean = true) {
    if (!material.uuid) {
      material.uuid = ID.generateUUID();
    }
    const oldMat = this.material.find((item) => item.uuid === material.uuid);
    if (!oldMat || force) {
      const data = material.serialize();
      for (const key in material) {
        //@ts-ignore
        const value = material[key];
        //@ts-ignore
        if (material[key] instanceof Texture) {
          if (!key.startsWith('_') && key.indexOf('environment') == -1) {
            this.addTexture(value);
            data[key + '_MAP'] = value.uuid;
            delete data[key];
          }
        }
      }
      //@ts-ignore
      const clearCoat = material['clearCoat'];
      if (clearCoat) {
        for (const key in clearCoat) {
          //@ts-ignore
          const value = clearCoat[key];
          const clearCoatData = data['plugins']['PBRClearCoatConfiguration'];
          //@ts-ignore
          if (clearCoat[key] instanceof Texture) {
            if (!key.startsWith('_') && key.indexOf('environment') == -1) {
              this.addTexture(value);
              data['clearCoat.' + key + '_MAP'] = value.uuid;
              delete clearCoatData[key];
            }
          } else {
          }
        }
      }

      data.uuid = material.uuid;
      if (oldMat) {
        ArrayUtils.remove(oldMat, this.material);
      }
      this.material.push(data);
    }
  }
  async addGeometry(geometry: Geometry) {
    if (!geometry.uuid) {
      geometry.uuid = ID.generateUUID();
    }
    if (this.geomertyIDs.has(geometry.uuid)) {
      return;
    }
    const data = geometry.serializeVerticeData();
    const buffer = vertexToBuffer(data);
    await this.fileSystem.saveFile(geometry.uuid, buffer, GEOMETRY);
    this.geomertyIDs.add(geometry.uuid);
  }

  async getGeometry(uuid: string): Promise<Geometry> {
    if (this.sceneGeometry.has(uuid)) {
      return Promise.resolve(this.sceneGeometry.get(uuid) as Geometry);
    } else {
      let buffer = await this.fileSystem.getFileArrayBuffer(uuid, GEOMETRY);
      if (!buffer) {
        return Promise.reject(`Failed to load geometry from ${uuid}`);
      }
      const geoInfo = bufferToVertex(buffer);
      const geo = Geometry.Parse(geoInfo, this.currentScene, null);
      this.sceneGeometry.set(uuid, geo);
      buffer = null;
      return Promise.resolve(geo);
    }
  }
  async getMaterial(uuid: string): Promise<Material> {
    if (this.sceneMaterial.has(uuid)) {
      return Promise.resolve(this.sceneMaterial.get(uuid) as Material);
    } else {
      const data = this.material.find((x) => x.uuid == uuid);
      if (data) {
        const mat = Material.Parse(data, this.currentScene, null) as PBRMaterial;
        for (const key in data) {
          if (key.endsWith('_MAP')) {
            const uuid = data[key];
            this.getTexture(uuid).then((tex) => {
              if (!key.includes('.')) {
                //@ts-ignore
                mat[key.replace('_MAP', '')] = tex;
              } else {
                let result = key.replace('_MAP', '');
                const keyArray = result.split('.');
                //@ts-ignore
                mat[keyArray[0]][keyArray[1]] = tex;
              }
            });
          }
        }

        mat.uuid = uuid;
        this.sceneMaterial.set(uuid, mat);
        return Promise.resolve(mat);
      }
    }
  }
  async getTexture(uuid: string): Promise<BaseTexture> {
    if (this.sceneTexture.has(uuid)) {
      return Promise.resolve(this.sceneTexture.get(uuid) as BaseTexture);
    } else {
      const data = this.texture.find((x) => x.uuid == uuid);
      if (data) {
        const url = await this.getTextureURL(data.sourceUUID);
        data.url = url;
        const tex = Texture.Parse(data, this.currentScene, null);
        tex.uuid = uuid;
        tex.sourceUUID = data.sourceUUID;
        this.sceneTexture.set(uuid, tex);
        return Promise.resolve(tex);
      }
    }
  }

  addToScene(scene: Scene, rootNode: CC.ObjectNode | string, progress?: (v: number) => void) {
    if (scene != this.currentScene) {
      this.currentScene = scene;
      this.sceneMaterial.clear();
      this.sceneGeometry.clear();
      this.sceneTexture.clear();
    }
    const node: CC.ObjectNode =
      typeof rootNode === 'string'
        ? this.rootNodes.find((x) => x.uuid === rootNode)
        : <CC.ObjectNode>rootNode;
    const array = new Array<Padding>();
    const objectNode = deserializeNode(node, scene, this, null, true, array) as TransformNode;
    const groupPadding = ArrayUtils.groupArray(array, 20);
    for (let index = 0; index < groupPadding.length; index++) {
      groupPadding[index].map((f) => f());
      progress?.((index + 1) / groupPadding.length);
    }
    return objectNode;
  }

  deserializeScene(scene: Scene, rootNode: CC.Scene, padding: Array<Padding> = []) {
    this.currentScene = scene;
    this.sceneMaterial.clear();
    this.sceneGeometry.clear();
    this.sceneTexture.clear();
    return deserializeScene(rootNode, scene.getEngine() as Engine, this, scene, padding);
  }
  saveComplate() { }
}

export async function serializeTextureBuffer(
  buffer: InternalTexture['_buffer'],
): Promise<Uint8Array> {
  if (buffer instanceof ArrayBuffer) {
    return new Uint8Array(buffer);
  } else if (typeof buffer === 'string') {
    return new TextEncoder().encode(buffer);
  } else if (buffer instanceof Blob) {
    return new Uint8Array(await buffer.arrayBuffer());
  } else if (buffer instanceof ImageBitmap || buffer instanceof HTMLImageElement) {
    return new Uint8Array(await (await imgToBlob(buffer)).arrayBuffer());
  } else if (buffer instanceof Uint8Array) {
    return buffer;
  } else {
    return null;
  }
}

function imgToBlob(img: HTMLImageElement | ImageBitmap) {
  return new Promise<Blob>((resolve, reject) => {
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

function fixMaterial(node: TransformNode) {
  // const map = new WeakMap<Material, PBRMaterial>();
  // const meshes = node.getChildMeshes(true);
  // meshes.forEach((mesh) => {
  //   const mat = new PBRMaterial(mesh.material.name);
  //   mesh.material = mat;
  //   mat.cullBackFaces = false;
  // });
}

function promiseEvery<T>(events: Promise<T>[], callback: (percent: number) => void) {
  events.forEach((item, index) => {
    item.then(() => callback((index + 1) / events.length));
  });
}
