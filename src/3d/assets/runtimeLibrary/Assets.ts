import { ID } from '@/utils/id';
import { URLUtils } from '@/utils/URL';
import { ZipFile, zipFiles } from '@/utils/Zip';
import { BaseTexture, Scene, Material, Texture } from '@babylonjs/core';
import { Geometry } from '@babylonjs/core/Meshes';
import { ICollectAssets, ILoaderAssets } from '../AssetsManager';
import { CC } from '../BaseRes';
import { deserializeNode } from '../serialze/node/Node';
import { vertexToBuffer, bufferToVertex } from '../utils/GeometryUtils';
import { serializeTextureBuffer } from '.';
import { IFile } from '../file/IFile';
import { ArrayUtils } from '@/utils/Array';

export class Assets implements ICollectAssets, ILoaderAssets {
  hasMaterial(uuid: string): boolean {
    return this.material.some((x) => x.uuid == uuid);
  }
  hasTexture(uuid: string): boolean {
    return this.texture.some((x) => x.uuid == uuid);
  }

  static async create(data: any, file: IFile) {
    const assets = new Assets();
    await assets.loadAssets(data, file);
    assets.createNew = false;
    return assets;
  }

  fineTexture: (uuid: string) => Promise<BaseTexture>;
  saveTexture: (uuid: BaseTexture) => void;

  private currentScene: Scene;
  createNew: boolean = true;
  private sceneMaterial: Map<string, Material> = new Map();
  private sceneGeometry: Map<string, Geometry> = new Map();
  private sceneTexture: Map<string, BaseTexture> = new Map();
  texture: any[] = [];
  material: any[] = [];
  geometry: any[] = [];
  textureFile: Map<string, ArrayBuffer> = new Map();
  geomertyFile: Map<string, ArrayBuffer> = new Map();
  rootNode: CC.ObjectNode;

  constructor(public uuid?: string) {
    this.uuid = uuid ?? ID.generateUUID();
  }

  async addToScene(scene: Scene) {
    this.currentScene = scene;
    this.sceneMaterial.clear();
    this.sceneGeometry.clear();
    this.sceneTexture.clear();
    await deserializeNode(this.rootNode, scene, this);
  }

  async serializeToScene(scene: Scene) {
    this.currentScene = scene;
    this.sceneMaterial.clear();
    this.sceneGeometry.clear();
    this.sceneTexture.clear();
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
            const tex = await (this.fineTexture ? this.fineTexture(uuid) : this.getTexture(uuid));
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
        const file = this.textureFile.get(uuid);
        if (!file) {
          return Promise.reject('文件不存在');
        }
        const url = URLUtils.getArrayBufferURL(file);
        data.url = url;
        const tex = Texture.Parse(data, this.currentScene, null);
        tex.uuid = uuid;
        this.sceneTexture.set(uuid, tex);
        return Promise.resolve(tex);
      }
    }
  }

  async addTexture(texture: BaseTexture, force: boolean = false): Promise<void> {
    if (!texture.uuid) {
      texture.uuid = ID.generateUUID();
    }
    const old = this.texture.find((item) => item.uuid === texture.uuid);
    if (!old || force) {
      const data = texture.serialize();
      data.uuid = texture.uuid;
      delete data.url;
      if (old) {
        ArrayUtils.remove(old, this.texture);
      }
      this.texture.push(data);
      if (!this.textureFile.has(texture.uuid)) {
        const t = texture.getInternalTexture();
        if (t._buffer) {
          const buffer = (await serializeTextureBuffer(t._buffer)) as ArrayBuffer;
          this.textureFile.set(texture.uuid, buffer);
        }
      }
    }
  }
  addMaterial(material: Material, force: boolean = false): void {
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
            this.saveTexture ? this.saveTexture(value) : this.addTexture(value);
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

  async exportFile() {
    const data = {
      uuid: this.uuid,
      texture: this.texture,
      material: this.material,
      geometry: this.geometry.map((x) => x.uuid),
      rootNode: this.rootNode,
    };
    if (!this.createNew) {
      return { data };
    }

    for (let index = 0; index < this.geometry.length; index++) {
      const element = this.geometry[index];
      if (!this.textureFile.has(element.uuid)) {
        const buffer = vertexToBuffer(element);
        this.geomertyFile.set(element.uuid, buffer);
      }
    }

    const textureFile: ZipFile[] = [...this.textureFile.keys()].map(
      (x) => [x, this.textureFile.get(x)] as [string, ArrayBuffer],
    );
    const geoFiles: ZipFile[] = [...this.geomertyFile.keys()].map(
      (x) => [x, this.geomertyFile.get(x)] as [string, ArrayBuffer],
    );
    return {
      data,
      textureFile,
      geoFiles,
    };
  }

  async loadAssets(assets: any, file: IFile) {
    this.uuid = assets.uuid;
    this.material = assets.material;
    this.texture = assets.texture;
    this.rootNode = assets.rootNode;
    for (let index = 0; index < this.texture.length; index++) {
      const element = this.texture[index];
      const buffer = await file.getFileArrayBuffer(element.uuid, this.uuid);
      this.textureFile.set(element.uuid, buffer);
    }
    this.geometry = [];
    for (let index = 0; index < assets.geometry.length; index++) {
      const element = assets.geometry[index];
      const geoBuffer = await file.getFileArrayBuffer(element, this.uuid);
      if (geoBuffer) {
        const geoInfo = bufferToVertex(geoBuffer);
        this.geometry.push(geoInfo);
      }
    }
  }
}
