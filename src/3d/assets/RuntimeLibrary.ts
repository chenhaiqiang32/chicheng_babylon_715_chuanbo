import {
  BaseTexture,
  CubeTexture,
  Geometry,
  ImportMeshAsync,
  InternalTexture,
  Material,
  Scene,
  Texture,
  Tools,
} from '@babylonjs/core';
import { Editor } from '../Editor';
import { Dispatch } from '@/utils/dispatch';
import { serializeNode, deserializeNode } from './serialze/node/Node';
import { ICollectAssets, ILoaderAssets } from './AssetsManager';
import { ID } from '@/utils/id';
import { CC } from './BaseRes';
import { URLUtils } from '@/utils/URL';
import { bufferToVertex, vertexToBuffer } from './utils/GeometryUtils';
import { ZipFile, zipFiles } from '@/utils/Zip';
import JSZip, { file } from 'jszip';

interface RuntimeAssetsEventBus {
  onChanged: () => void;
}

export class RuntimeLibrary extends Dispatch<RuntimeAssetsEventBus> {
  getAsset(target: string) {
    return this.sceneAssets.find((asset) => asset.uuid === target);
  }
  private sceneList: CC.Scene[] = [];
  private static instance: RuntimeLibrary;
  static get Instance() {
    if (!RuntimeLibrary.instance) {
      RuntimeLibrary.instance = new RuntimeLibrary();
    }
    return this.instance;
  }

  public sceneAssets: Assets[];

  constructor() {
    super();
    Texture.UseSerializedUrlIfAny = true;
    Texture.SerializeBuffers = false;
    Texture.ForceSerializeBuffers = false;
    this.sceneAssets = [];
  }

  async importMesh(file: File) {
    const scene = Editor.Instance.newResScene();
    const data = await ImportMeshAsync(file, scene, {});
    const assets = new Assets();
    const all = [...data.meshes, ...data.transformNodes];
    const root = all.find((x) => x.name == '__root__');
    root.name = file.name.split('.')[0];
    assets.rootNode = serializeNode(root, assets, true);
    this.sceneAssets.push(assets);
    return assets;
  }

  async loadAssets(url: string) {
    const buffer = await (await fetch(url)).arrayBuffer();
    const zip = new JSZip();
    await zip.loadAsync(buffer);
    const assetsJson = await zip.file('assets.json')?.async('string');
    if (assetsJson) {
      const assetsData = JSON.parse(assetsJson);
      for (let index = 0; index < assetsData.length; index++) {
        const element = assetsData[index];
        const zipFile = zip.file(element.uuid + '.zip');
        if (zipFile) {
          const data = await zipFile.async('arraybuffer');
          const assets = await Assets.create(element, data);
          this.sceneAssets.push(assets);
        }
      }
    }
    const sceneJson = await zip.file('scene.json')?.async('string');

    this.sceneList = JSON.parse(sceneJson) as CC.Scene[];
    this.sceneList = this.sceneList.filter((x) => x);
    return this.sceneList;
  }

  async exportAll() {
    const files: ZipFile[] = [];
    const asssetsData: any[] = [];
    for (let index = 0; index < this.sceneAssets.length; index++) {
      const assets = this.sceneAssets[index];
      const { data, zip } = await assets.exportFile();
      files.push([assets.uuid + '.zip', zip]);
      asssetsData.push(data);
    }
    files.push(['assets.json', JSON.stringify(asssetsData)]);
    return files;
  }
}

export class Assets implements ICollectAssets, ILoaderAssets {
  static async create(data: any, buffer: ArrayBuffer) {
    const assets = new Assets();
    await assets.loadAssets(data, buffer);
    return assets;
  }

  fineTexture: (uuid: string) => Promise<BaseTexture>;

  private currentScene: Scene;
  private sceneMaterial: Map<string, Material> = new Map();
  private sceneGeometry: Map<string, Geometry> = new Map();
  private sceneTexture: Map<string, BaseTexture> = new Map();
  texture: any[] = [];
  material: any[] = [];
  geometry: any[] = [];
  files: Map<string, ArrayBuffer> = new Map();
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
        const file = this.files.get(uuid);
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

  async addTexture(texture: BaseTexture): Promise<void> {
    if (!texture.uuid) {
      texture.uuid = ID.generateUUID();
    }
    if (!this.texture.find((item) => item.uuid === texture.uuid)) {
      const data = texture.serialize();
      data.uuid = texture.uuid;
      delete data.url;
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
    for (let index = 0; index < this.geometry.length; index++) {
      const element = this.geometry[index];
      if (!this.files.has(element.uuid)) {
        const buffer = vertexToBuffer(element);
        this.files.set(element.uuid, buffer);
      }
    }

    const files: ZipFile[] = [...this.files.keys()].map(
      (x) => [x, this.files.get(x)] as [string, ArrayBuffer],
    );
    files.push(['assets.json', JSON.stringify(data)]);
    const zip = await zipFiles(files);
    return {
      data,
      zip,
    };
  }

  async loadAssets(assets: any, buffer: ArrayBuffer) {
    const jszip = await JSZip.loadAsync(buffer);
    this.material = assets.material;
    this.texture = assets.texture;
    this.rootNode = assets.rootNode;
    for (const key in jszip.files) {
      const file = jszip.file(key);
      if (file) {
        if (key === 'assets.json') {
          continue;
        }
        const data = await file.async('arraybuffer');
        this.files.set(key, data);
      }
    }
    this.geometry = [];
    for (let index = 0; index < assets.geometry.length; index++) {
      const element = assets.geometry[index];
      if (this.files.has(element)) {
        const geoBuffer = this.files.get(element);
        if (geoBuffer) {
          const geoInfo = bufferToVertex(geoBuffer);
          this.geometry.push(geoInfo);
        }
      }
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

export class MultiAssets implements ILoaderAssets {
  constructor(private assets: Assets[]) {
    assets.forEach((x) => (x.fineTexture = async (uuid) => this.getTexture(uuid)));
  }

  async getGeometry(uuid: string): Promise<Geometry> {
    for (let index = 0; index < this.assets.length; index++) {
      const element = this.assets[index];
      const geo = await element.getGeometry(uuid);
      if (geo) {
        return Promise.resolve(geo);
      }
    }
    return Promise.reject('Geometry not found');
  }
  async getMaterial(uuid: string): Promise<Material> {
    for (let index = 0; index < this.assets.length; index++) {
      const element = this.assets[index];
      const mat = await element.getMaterial(uuid);
      if (mat) {
        return Promise.resolve(mat);
      }
    }
    return Promise.reject('Material not found');
  }
  async getTexture(uuid: string): Promise<BaseTexture> {
    for (let index = 0; index < this.assets.length; index++) {
      const element = this.assets[index];
      const tex = await element.getTexture(uuid);
      if (tex) {
        return Promise.resolve(tex);
      }
    }
    return Promise.reject('Texture not found');
  }
}
