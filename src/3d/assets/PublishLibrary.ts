import {
  BaseTexture,
  Engine,
  InternalTexture,
  Material,
  Scene,
  PBRMaterial,
  Texture,
} from '@babylonjs/core';
import { CC } from './BaseRes';
import { readZip, ZipFile, zipFiles } from '@/utils/Zip';
import { DracoCompression, DracoEncoder, Geometry } from '@babylonjs/core/Meshes';
import { bufferToVertex } from './utils/GeometryUtils';
import { deserializeScene } from './serialze/Scene';
import { IGetBuffer } from './RuntimeLibrary';
import { strFromU8 } from 'fflate';
import { IFile } from './file/IFile';
import { loadSkyboxWithExt } from '../core/utils/EnvSkybox';
import { renderEnvTexture } from '@/tools/preview/materialPreviewGenerator';

const TEXTURE = 'texture';
const GEOMETRY = 'geometry';

interface RuntimeAssetsEventBus {
  onChanged: void;
}

const encoder = DracoEncoder.Default;

export class PublishAssets {
  textureMap: Map<string, Uint8Array> = new Map();
  texture: any[] = [];
  material: any[] = [];
  constructor(private getBufferSystem: IGetBuffer) {}
  async addScene(
    publishScenes: Partial<CC.Scene>[],
    onProgress?: (v: number) => void,
    meshCompress: boolean = true,
  ) {
    await encoder.whenReadyAsync();
    const files: ZipFile[] = [];
    const geometryList: string[] = [];
    const materialList: string[] = [];
    for (const item of publishScenes) {
      for (const node of item.nodes || []) {
        getAsset(node, geometryList, materialList);
      }
    }
    const geometrySet = [...new Set(geometryList)];
    const materialSet = [...new Set(materialList)];
    if (meshCompress) {
      for (let index = 0; index < geometrySet.length; index++) {
        const geometry = geometryList[index];
        const buffer = await this.getBufferSystem.getGeometry(geometry);
        if (buffer) {
          const dracoBuffer = await encoder.encodeMeshAsync(buffer);
          files.push([geometry + '.dmesh', dracoBuffer.data]);
        }
      }
    } else {
      for (let index = 0; index < geometrySet.length; index++) {
        const geometry = geometryList[index];
        const buffer = await this.getBufferSystem.getGeoBuffer(geometry);
        if (buffer) {
          files.push([geometry + '.mesh', buffer]);
        }
      }
    }
    const textureSet = new Set<string>();
    for (let index = 0; index < materialSet.length; index++) {
      const uuid = materialSet[index];
      const material = await this.getBufferSystem.getMaterialData(uuid);
      if (material) {
        this.material.push(material);
        getTextureUUIDs(material, textureSet);
      }
    }
    for (const texture of textureSet) {
      const tex = await this.getBufferSystem.getTexturelData(texture);
      if (tex) {
        this.texture.push(tex);
      }
    }

    for (let index = 0; index < this.texture.length; index++) {
      const element = this.texture[index];
      const buffer = await this.getBufferSystem.getTextureBuffer(element.sourceUUID);
      if (buffer) {
        this.textureMap.set(element.sourceUUID, buffer);
      }
    }
    for (const item of publishScenes) {
      if (item.background.texture) {
        const buffer = await this.getBufferSystem.getTextureBuffer(
          item.background.texture.sourceUUID,
        );
        if (buffer) {
          this.textureMap.set(item.background.texture.sourceUUID, buffer);
        }
      }
    }
    for (const texture of this.textureMap) {
      texture[0] += '.tex';
      files.push(texture);
    }
    const materialJson = JSON.stringify(this.material);
    const textureJson = JSON.stringify(this.texture);
    const sceneJson = JSON.stringify(publishScenes);
    files.push(['scene.json', sceneJson]);
    files.push(['material.json', materialJson]);
    files.push(['texture.json', textureJson]);
    return await zipFiles(files, (v) => {
      onProgress?.(v);
    });
  }
}

const ENVPIXEL = 512;
export class AppAssets {
  constructor() {
    Texture.UseSerializedUrlIfAny = true;
    Texture.SerializeBuffers = false;
    Texture.ForceSerializeBuffers = false;
  }

  sceneGeometry: Map<string, Geometry> = new Map();
  sceneMaterial: Map<string, Material> = new Map();
  sceneTexture: Map<string, BaseTexture> = new Map();
  textureMap: Map<string, Uint8Array> = new Map();
  geomertyFile: Map<string, Uint8Array> = new Map();
  envTexture: any[] = [];
  currentScene: Scene;
  private texture: any[] = [];
  private material: any[] = [];
  scene: CC.Scene[] = [];

  async loadFromUrl(url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const files = await readZip(buffer);
    const textureJson = strFromU8(files['texture.json']);
    const materialJson = strFromU8(files['material.json']);
    const sceneJson = strFromU8(files['scene.json']);
    this.scene = JSON.parse(sceneJson);
    this.texture = JSON.parse(textureJson);
    this.material = JSON.parse(materialJson);
    for (const item in files) {
      if (item.endsWith('.mesh')) {
        this.geomertyFile.set(item.replace('.mesh', ''), files[item]);
      }
      if (item.endsWith('.dmesh')) {
        this.geomertyFile.set(item.replace('.dmesh', ''), files[item]);
      }
      if (item.endsWith('.tex')) {
        this.textureMap.set(item.replace('.tex', ''), files[item]);
      }
    }
  }

  async getTextureURL(sourceUUID: string) {
    if (!sourceUUID) {
      return '';
    }
    let buffer = this.textureMap.get(sourceUUID);
    if (buffer) {
      //@ts-ignore
      const url = URL.createObjectURL(new Blob([buffer]));
      return url;
    }
  }

  async getGeometry(uuid: string): Promise<Geometry> {
    if (this.sceneGeometry.has(uuid)) {
      return Promise.resolve(this.sceneGeometry.get(uuid) as Geometry);
    } else {
      let buffer = this.geomertyFile.get(uuid);
      if (!buffer) {
        buffer = this.geomertyFile.get(uuid);
      }
      const geo = await DracoCompression.Default.decodeMeshToGeometryAsync(
        '',
        this.currentScene,
        buffer,
      );
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
  setFileSystrem(fileSystem: IFile) {}
  sceneEnvTexture: Map<string, BaseTexture> = new Map();
  async getEnvTexture(sourceUUID: string, withPrevUrl = true): Promise<BaseTexture> {
    if (this.sceneEnvTexture.has(sourceUUID)) {
      const oriTex = this.sceneEnvTexture.get(sourceUUID);
      const texture = oriTex.clone();
      texture.sourceUUID = sourceUUID;
      if (withPrevUrl) texture.prevUrl = await renderEnvTexture(sourceUUID);
      return Promise.resolve(texture);
    } else {
      const data = this.envTexture.find((x) => x.sourceUUID == sourceUUID);
      // envTexture保存的是原始文件的file
      if (data) {
        const url = await this.getTextureURL(data.sourceUUID);
        const ext = data.name.toLocaleLowerCase().split('.').pop();
        const texture = await loadSkyboxWithExt(this.currentScene, url, ext, ENVPIXEL);
        texture.sourceUUID = sourceUUID;
        texture.name = data.name;
        this.sceneEnvTexture.set(sourceUUID, texture);
        const retTex = texture.clone();
        retTex.sourceUUID = sourceUUID;
        if (withPrevUrl) retTex.prevUrl = await renderEnvTexture(sourceUUID);
        return Promise.resolve(retTex);
      }
    }
  }

  async deserializeScene(scene: Scene, rootNode: CC.Scene, padding: Array<Padding> = []) {
    this.currentScene = scene;
    this.sceneMaterial.clear();
    this.sceneGeometry.clear();
    this.sceneTexture.clear();
    return deserializeScene(rootNode, scene.getEngine() as Engine, this, scene, padding);
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

function getAsset(node: CC.ObjectNode, geometry: string[], material: string[]) {
  if (node.type == 'mesh') {
    const meshNode = node as CC.MeshNode;
    if (meshNode.geometry) {
      geometry.push(meshNode.geometry);
    }
    if (meshNode.material) {
      material.push(meshNode.material);
    }
  }
  node.children?.forEach((item) => getAsset(item, geometry, material));
}

function getTextureUUIDs(obj: any, textureUUIDs: Set<string>) {
  for (const element in obj) {
    if (element.endsWith('_MAP')) {
      textureUUIDs.add(obj[element]);
    }
    if (typeof obj[element] === 'object') {
      getTextureUUIDs(obj[element], textureUUIDs);
    }
  }
}
