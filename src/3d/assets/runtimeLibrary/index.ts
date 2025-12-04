import {
  BaseTexture,
  Engine,
  ImportMeshAsync,
  InternalTexture,
  Material,
  Scene,
  PBRMaterial,
  Texture,
  Tools,
} from '@babylonjs/core';
import { Editor } from '../../Editor';
import { Dispatch } from '@/utils/dispatch';
import { deserializeNode, serializeNode } from '../serialze/node/Node';
import { CC } from '../BaseRes';
import { ZipFile } from '@/utils/Zip';
import { IFile } from '../file/IFile';
import { ICollectAssets, ILoaderAssets } from '../AssetsManager';
import { Geometry } from '@babylonjs/core/Meshes';
import { ID } from '@/utils/id';
import { ArrayUtils } from '@/utils/Array';
import { URLUtils } from '@/utils/URL';
import { bufferToVertex, vertexToBuffer } from '../utils/GeometryUtils';
import { deserializeScene } from '../serialze/Scene';

const TEXTURE = 'texture';
const GEOMETRY = 'geometry';

interface RuntimeAssetsEventBus {
  onChanged: () => void;
}

export class RuntimeLibrary
  extends Dispatch<RuntimeAssetsEventBus>
  implements ICollectAssets, ILoaderAssets
{
  private sceneList: CC.Scene[] = [];
  private static instance: RuntimeLibrary;

  private fileSystem: IFile;

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
  }

  async importMesh(file: File) {
    const scene = Editor.Instance.newResScene();
    const data = await ImportMeshAsync(file, scene, {});
    const all = [...data.meshes, ...data.transformNodes];
    const root = all.find((x) => x.name == '__root__');
    root.name = file.name.split('.')[0];
    const node = serializeNode(root, this, true);
    return node;
  }

  async loadAssets(fileSystem: IFile) {
    this.fileSystem = fileSystem;

    const assetsText = await fileSystem.getFileText('assets.json');
    if (!assetsText) {
      return [];
    }
    const assets = JSON.parse(assetsText) as any;
    this.texture = assets.texture;
    this.material = assets.material;
    this.rootNodes = assets.rootNode;
    const sceneText = await fileSystem.getFileText('scene.json');
    const scene = JSON.parse(sceneText) as CC.Scene[];
    return scene.filter((x) => x);
  }

  async saveAll() {
    const files: ZipFile[] = [];
    for (let index = 0; index < this.geometry.length; index++) {
      const element = this.geometry[index];
      if (!this.geomertyFile.has(element.uuid) && !this.tempGeometryFile.has(element.uuid)) {
        const buffer = vertexToBuffer(element);
        this.tempGeometryFile.set(element.uuid, buffer);
      }
    }
    if (this.tempGeometryFile.size > 0) {
      for (const key of this.tempGeometryFile.keys()) {
        const buffer = this.tempGeometryFile.get(key);
        files.push([GEOMETRY + '/' + key, buffer]);
      }
    }
    if (this.tempTextureFile.size > 0) {
      for (const key of this.tempTextureFile.keys()) {
        const buffer = this.tempTextureFile.get(key);
        files.push([TEXTURE + '/' + key, buffer]);
      }
    }
    const data = {
      texture: this.texture,
      material: this.material,
      geometry: this.geometry.map((x) => x.uuid),
      rootNode: this.rootNodes,
    };
    files.push(['assets.json', JSON.stringify(data)]);
    return files;
  }

  texture: any[] = [];
  material: any[] = [];
  geometry: any[] = [];

  rootNodes: CC.ObjectNode[] = [];
  sceneGeometry: Map<string, Geometry> = new Map();
  sceneMaterial: Map<string, Material> = new Map();
  sceneTexture: Map<string, BaseTexture> = new Map();
  currentScene: Scene;

  textureFile: Map<string, ArrayBuffer> = new Map();
  geomertyFile: Map<string, ArrayBuffer> = new Map();

  tempGeometryFile: Map<string, ArrayBuffer> = new Map();
  tempTextureFile: Map<string, ArrayBuffer> = new Map();

  async addTexture(texture: BaseTexture, force: boolean = true): Promise<void> {
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
      if (!this.textureFile.has(data.sourceUUID) && !this.tempTextureFile.has(data.sourceUUID)) {
        const t = texture.getInternalTexture();
        if (t._buffer) {
          const buffer = (await serializeTextureBuffer(t._buffer)) as ArrayBuffer;
          this.tempTextureFile.set(data.sourceUUID, buffer);
        }
      }
    }
  }

  addMaterial(material: Material, force: boolean = true): void {
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
      data.uuid = material.uuid;
      if (oldMat) {
        ArrayUtils.remove(oldMat, this.material);
      }
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

  async getGeometry(uuid: string): Promise<Geometry> {
    if (this.sceneGeometry.has(uuid)) {
      return Promise.resolve(this.sceneGeometry.get(uuid) as Geometry);
    } else {
      const data = this.geometry.find((x) => x.uuid == uuid);
      if (data) {
        const geo = Geometry.Parse(data, this.currentScene, null);
        this.sceneGeometry.set(uuid, geo);
        return Promise.resolve(geo);
      } else {
        const exit = this.geomertyFile.has(uuid);
        const buffer = exit
          ? this.geomertyFile.get(uuid)
          : await this.fileSystem.getFileArrayBuffer(uuid, GEOMETRY);

        if (!buffer) {
          console.log(uuid);
          return null;
        }

        const geoInfo = bufferToVertex(buffer);
        const geo = Geometry.Parse(geoInfo, this.currentScene, null);
        this.geometry.push(geo);
        if (!exit) {
          this.geomertyFile.set(uuid, buffer);
        }
        this.sceneGeometry.set(uuid, geo);
        return Promise.resolve(geo);
      }
    }
  }
  async getMaterial(uuid: string): Promise<Material> {
    if (this.sceneMaterial.has(uuid)) {
      return Promise.resolve(this.sceneMaterial.get(uuid) as Material);
    } else {
      const data = this.material.find((x) => x.uuid == uuid);
      if (data) {
        const mat = Material.Parse(data, this.currentScene, null);
        for (const key in data) {
          if (key.endsWith('_MAP')) {
            const uuid = data[key];
            const tex = await this.getTexture(uuid);
            //@ts-ignore
            mat[key.replace('_MAP', '')] = tex;
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
        const file =
          this.textureFile.get(data.sourceUUID) ??
          this.tempTextureFile.get(data.sourceUUID) ??
          (await this.fileSystem.getFileArrayBuffer(data.sourceUUID, TEXTURE));
        if (!file) {
          return Promise.reject('文件不存在');
        }
        const url = URLUtils.getArrayBufferURL(file);
        data.url = url;
        const tex = Texture.Parse(data, this.currentScene, null);
        tex.uuid = uuid;
        tex.sourceUUID = data.sourceUUID;
        this.sceneTexture.set(uuid, tex);
        return Promise.resolve(tex);
      }
    }
  }

  async addToScene(scene: Scene, rootNode: CC.ObjectNode) {
    this.currentScene = scene;
    this.sceneMaterial.clear();
    this.sceneGeometry.clear();
    this.sceneTexture.clear();
    await deserializeNode(rootNode, scene, this);
  }

  async deserializeScene(scene: Scene, rootNode: CC.Scene) {
    this.currentScene = scene;
    this.sceneMaterial.clear();
    this.sceneGeometry.clear();
    this.sceneTexture.clear();
    return await deserializeScene(rootNode, scene.getEngine() as Engine, this, scene);
  }
  saveComplate() {
    this.tempGeometryFile.forEach((item, key) => {
      this.geomertyFile.set(key, item);
    });
    this.tempGeometryFile.clear();
    this.tempTextureFile.forEach((item, key) => {
      this.textureFile.set(key, item);
    });
    this.tempTextureFile.clear();
  }
}

export async function serializeTextureBuffer(buffer: InternalTexture['_buffer']) {
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
