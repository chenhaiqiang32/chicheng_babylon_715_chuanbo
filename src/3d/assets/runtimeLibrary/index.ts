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
  SceneLoader,
  StandardMaterial,
  HDRCubeTexture,
} from '@babylonjs/core';
import { Editor } from '../../Editor';
import { Dispatch } from '@/utils/dispatch';
import { deserializeNode, serializeNode } from '../serialze/node/Node';
import { CC } from '../BaseRes';
import { ZipFile, zipFiles } from '@/utils/Zip';
import { IFile } from '../file/IFile';
import { ICollectAssets, ILoaderAssets } from '../AssetsManager';
import { Geometry, TransformNode } from '@babylonjs/core/Meshes';
import { ID } from '@/utils/id';
import { ArrayUtils } from '@/utils/Array';
import { bufferToVertex, vertexToBuffer } from '../utils/GeometryUtils';
import { deserializeScene } from '../serialze/Scene';
import { FBXLoader } from 'babylonjs-fbx-loader';
import JSZip from 'jszip';

const TEXTURE = 'texture';
const GEOMETRY = 'geometry';

interface RuntimeAssetsEventBus {
  onChanged: void;
}

export class RuntimeLibrary
  extends Dispatch<RuntimeAssetsEventBus>
  implements ICollectAssets, ILoaderAssets {
  async getTextureURL(sourceUUID: string) {
    if (!sourceUUID) {
      return '';
    }

    let buffer = this.textureMap.get(sourceUUID);
    if (!buffer) {
      buffer = this.tempTextureFile.get(sourceUUID);
    }
    if (!buffer) {
      buffer = await this.fileSystem.getFileArrayBuffer(sourceUUID, TEXTURE);
    }
    const url = URL.createObjectURL(new Blob([buffer]));
    return url;
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
    SceneLoader.RegisterPlugin(new FBXLoader());
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
    const node = serializeNode(root, this, true);
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
    const ids = new Set<string>();
    const padding = new Set<Promise<any>>();
    for (let index = 0; index < this.texture.length; index++) {
      const element = this.texture[index];
      delete element.url;
      if (ids.has(element.sourceUUID)) {
        continue;
      }
      ids.add(element.sourceUUID);
      const loadFile = this.fileSystem.getFileArrayBuffer(element.sourceUUID, TEXTURE);
      loadFile.then((file) => {
        this.textureMap.set(element.sourceUUID, file);
      });
      padding.add(loadFile);
    }
    await Promise.all(padding);
    padding.clear();
    ids.clear();
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
        const buffer = files[element].async('arraybuffer');
        buffer.then((buffer) => {
          this.geomertyFile.set(element, buffer);
        });
        padding.add(buffer);
      }
      index++;
      loading?.(0.1 + (index / this.geomertyZips.length) * 0.9);
    }
    await Promise.all(padding);
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
  rootNodes: CC.ObjectNode[] = [];
  sceneGeometry: Map<string, Geometry> = new Map();
  sceneMaterial: Map<string, Material> = new Map();
  sceneTexture: Map<string, BaseTexture> = new Map();
  currentScene: Scene;

  textureMap: Map<string, ArrayBuffer> = new Map();
  geomertyFile: Map<string, ArrayBuffer> = new Map();

  tempGeometryFile: Map<string, ArrayBuffer> = new Map();
  tempTextureFile: Map<string, ArrayBuffer> = new Map();

  private scriptMap: Map<string, CC.ScriptData> = new Map();

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
      if (!this.tempTextureFile.has(data.sourceUUID) && !this.textureMap.has(data.sourceUUID)) {
        const t = texture.getInternalTexture();
        if (t._buffer) {
          const buffer = (await serializeTextureBuffer(t._buffer)) as ArrayBuffer;
          this.tempTextureFile.set(data.sourceUUID, buffer);
        }
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
      '/particle/textures/smoke/Smoke_SpriteSheet_8x8.png'
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
      const geoInfo = bufferToVertex(buffer);
      const geo = Geometry.Parse(geoInfo, this.currentScene, null);
      this.sceneGeometry.set(uuid, geo);
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

  async addToScene(scene: Scene, rootNode: CC.ObjectNode | string) {
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
    return await deserializeNode(node, scene, this, null, true);
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

function fixMaterial(node: TransformNode) {
  // const map = new WeakMap<Material, PBRMaterial>();
  // const meshes = node.getChildMeshes(true);
  // meshes.forEach((mesh) => {
  //   const mat = new PBRMaterial(mesh.material.name);
  //   mesh.material = mat;
  //   mat.cullBackFaces = false;
  // });
}
