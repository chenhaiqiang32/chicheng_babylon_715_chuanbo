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
import { ZipFile, zipFiles } from '@/utils/Zip';
import { IFile } from '../file/IFile';
import { ICollectAssets, ILoaderAssets } from '../AssetsManager';
import { Geometry } from '@babylonjs/core/Meshes';
import { ID } from '@/utils/id';
import { ArrayUtils } from '@/utils/Array';
import { URLUtils } from '@/utils/URL';
import { bufferToVertex, vertexToBuffer } from '../utils/GeometryUtils';
import { deserializeScene } from '../serialze/Scene';
import { Utils } from '@/utils';
import JSZip from 'jszip';

const TEXTURE = 'texture';
const GEOMETRY = 'geometry';

interface RuntimeAssetsEventBus {
  onChanged: void;
}

export class RuntimeLibrary
  extends Dispatch<RuntimeAssetsEventBus>
  implements ICollectAssets, ILoaderAssets
{
  async getTextureURL(sourceUUID: string) {
    if (!sourceUUID) {
      return '';
    }
    let file = this.textureFile.get(sourceUUID);
    if (!file) {
      file = this.tempTextureFile.get(sourceUUID);
    }
    if (!file) {
      file = await this.fileSystem.getFileArrayBuffer(sourceUUID, TEXTURE);
      this.textureFile.set(sourceUUID, file);
    }
    if (!file) {
      return null;
    }
    return URLUtils.getArrayBufferURL(file);
  }
  private sceneList: CC.Scene[] = [];
  private static instance: RuntimeLibrary;
  private geomertyZips: string[] = [];

  private resScene: Scene;

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
    if (!this.resScene) {
      this.resScene = Editor.Instance.newResScene();
    }
    const data = await ImportMeshAsync(file, this.resScene, {});
    const all = [...data.meshes, ...data.transformNodes];
    const root = all.find((x) => x.name == '__root__');
    root.name = file.name.split('.')[0];
    const node = serializeNode(root, this, true);
    this.rootNodes.push(node);
    return node;
  }

  async importTexture(element: File) {
    const url = URLUtils.getBlobURL(element);
    const texture = new Texture(url, this.resScene);
    texture.name = element.name;
    texture.sourceUUID = ID.generateUUID();
    const buffer = await element.arrayBuffer();
    this.tempTextureFile.set(texture.sourceUUID, buffer);
    const data = await this.addTexture(texture);
    data.url = url;
    return texture;
  }

  async loadAssets(fileSystem: IFile, loading?: (v: number) => void) {
    this.fileSystem = fileSystem;

    const assetsText = await fileSystem.getFileText('assets.json');
    loading?.(0.1);
    if (!assetsText) {
      loading?.(1);
      return [];
    }
    const assets = JSON.parse(assetsText) as any;
    this.texture = assets.texture;
    for (let index = 0; index < this.texture.length; index++) {
      const element = this.texture[index];
      delete element.url;

      if (!this.textureFile.has(element.sourceUUID)) {
        const file = await this.fileSystem.getFileArrayBuffer(element.sourceUUID, TEXTURE);
        this.textureFile.set(element.sourceUUID, file);
      }
    }
    this.material = assets.material;
    this.geomertyZips = assets.geomertyZips;
    this.rootNodes = assets.rootNode;
    let index = 0;
    for (const zip of this.geomertyZips) {
      const blob = await fileSystem.getFileArrayBuffer(zip);
      const zipFile = new JSZip();
      await zipFile.loadAsync(blob);
      const files = zipFile.files;
      for (const element in files) {
        const buffer = await files[element].async('arraybuffer');
        this.geomertyFile.set(element, buffer);
      }
      loading?.(0.1 + (index / this.geomertyZips.length) * 0.9);
      this.geomertyZipFiles.push(zipFile);
    }
    const sceneText = await fileSystem.getFileText('scene.json');
    const scene = JSON.parse(sceneText) as CC.Scene[];
    this.dispatch('onChanged');
    loading?.(1);
    return scene.filter((x) => x);
  }

  async saveAll() {
    const files: ZipFile[] = [];
    if (this.tempGeometryFile.size > 0) {
      const gepFiles: ZipFile[] = [];
      for (const key of this.tempGeometryFile.keys()) {
        const buffer = this.tempGeometryFile.get(key);
        gepFiles.push([key, buffer]);
      }
      const blob = await zipFiles(gepFiles);
      const uuid = ID.generateUUID();
      this.geomertyZips.push(uuid);
      files.push([uuid, blob]);
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
      rootNode: this.rootNodes,
      geomertyZips: this.geomertyZips,
    };
    files.push(['assets.json', JSON.stringify(data)]);
    return files;
  }

  texture: any[] = [];
  material: any[] = [];
  // geometry: any[] = [];

  rootNodes: CC.ObjectNode[] = [];
  sceneGeometry: Map<string, Geometry> = new Map();
  sceneMaterial: Map<string, Material> = new Map();
  sceneTexture: Map<string, BaseTexture> = new Map();
  currentScene: Scene;

  textureFile: Map<string, ArrayBuffer> = new Map();
  geomertyFile: Map<string, ArrayBuffer> = new Map();

  geomertyZipFiles: JSZip[] = [];

  tempGeometryFile: Map<string, ArrayBuffer> = new Map();
  tempTextureFile: Map<string, ArrayBuffer> = new Map();

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
      if (!this.textureFile.has(data.sourceUUID) && !this.tempTextureFile.has(data.sourceUUID)) {
        const t = texture.getInternalTexture();
        if (t._buffer) {
          const buffer = (await serializeTextureBuffer(t._buffer)) as ArrayBuffer;
          this.tempTextureFile.set(data.sourceUUID, buffer);
        }
      }
      return data;
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
    if (this.tempGeometryFile.has(geometry.uuid)) {
      return;
    }
    const data = geometry.serializeVerticeData();
    const buffer = vertexToBuffer(data);
    this.tempGeometryFile.set(geometry.uuid, buffer);
  }

  async getGeometry(uuid: string): Promise<Geometry> {
    if (this.sceneGeometry.has(uuid)) {
      return Promise.resolve(this.sceneGeometry.get(uuid) as Geometry);
    } else {
      let buffer = this.geomertyFile.get(uuid);
      if (!buffer) {
        buffer = this.tempGeometryFile.get(uuid);
      }
      if (!buffer) {
        buffer = await this.getGeometryFile(uuid);
        if (!buffer) {
          return Promise.reject('geometry not found');
        }
        this.geomertyFile.set(uuid, buffer);
      }

      const geoInfo = bufferToVertex(buffer);
      const geo = Geometry.Parse(geoInfo, this.currentScene, null);
      this.sceneGeometry.set(uuid, geo);
      return Promise.resolve(geo);
    }
  }

  async getGeometryFile(uuid: string): Promise<ArrayBuffer> {
    for (const zip of this.geomertyZipFiles) {
      const file = zip.file(uuid);
      if (file) {
        return await file.async('arraybuffer');
      }
    }
    return Promise.reject('geometry not found');
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
              //@ts-ignore
              mat[key.replace('_MAP', '')] = tex;
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

  async addToScene(scene: Scene, rootNode: CC.ObjectNode | number) {
    if (scene != this.currentScene) {
      this.currentScene = scene;
      this.sceneMaterial.clear();
      this.sceneGeometry.clear();
      this.sceneTexture.clear();
    }

    const node: CC.ObjectNode =
      typeof rootNode === 'number'
        ? this.rootNodes.find((x) => x.id === rootNode)
        : <CC.ObjectNode>rootNode;
    await deserializeNode(node, scene, this, null, true);
  }

  async deserializeScene(scene: Scene, rootNode: CC.Scene, padding: Array<Promise<any>> = []) {
    this.currentScene = scene;
    this.sceneMaterial.clear();
    this.sceneGeometry.clear();
    this.sceneTexture.clear();
    return await deserializeScene(rootNode, scene.getEngine() as Engine, this, scene, padding);
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
