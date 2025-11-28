import {
  BaseTexture,
  CubeTexture,
  Engine,
  Geometry,
  ImportMeshAsync,
  InternalTexture,
  Material,
  Scene,
  Texture,
  Tools,
  type Scene as BabylonScene,
} from '@babylonjs/core';

import { readZip, zipFiles } from '@/utils/Zip';
import { deserializeScene, serializeScene } from './serialze/Scene';
import { ID } from '@/utils/id';
import { CC } from './BaseRes';
import { bufferToVertex, vertexToBuffer } from './utils/GeometryUtils';
import JSZip from 'jszip';

export interface ICollectAssets {
  addCubeTexture(cubeTexture: CubeTexture): void;
  addTexture(texture: BaseTexture): void;
  addMaterial(material: Material): void;
  addGeometry(geometry: Geometry): void;
}

export interface ILoaderAssets {
  getGeometry(uuid: string): Promise<Geometry>;
  getMaterial(uuid: string): Promise<Material>;
  getTexture(uuid: string): Promise<BaseTexture>;
  getCubeTexture(uuid: string): Promise<CubeTexture>;
}

export class AssetsManager implements ICollectAssets, ILoaderAssets {
  private static instance: AssetsManager;
  cubeTexture: CubeTexture[] = [];
  texture: BaseTexture[] = [];
  material: Material[] = [];
  geometry: Geometry[] = [];
  scene: CC.Scene[] = [];
  private zipFiles: JSZip;
  static get Instance() {
    if (AssetsManager.instance == null) {
      AssetsManager.instance = new AssetsManager();
    }
    return AssetsManager.instance;
  }

  addGeometry(geometry: Geometry) {
    if (!geometry.uuid) {
      geometry.uuid = ID.generateUUID();
    }

    if (this.geometry.find((g) => g.uuid === geometry.uuid)) {
      return;
    }

    this.geometry.push(geometry);
  }
  addMaterial(material: Material) {
    if (!material.uuid) {
      material.uuid = ID.generateUUID();
    }
    if (this.material.find((m) => m.uuid === material.uuid)) {
      return;
    }

    this.material.push(material);
  }

  addTexture(texture: BaseTexture) {
    if (!texture.uuid) {
      texture.uuid = ID.generateUUID();
    }
    if (this.texture.find((t) => t.uuid === texture.uuid)) {
      return;
    }

    this.texture.push(texture);
  }
  addCubeTexture(cubeTexture: CubeTexture) {
    if (!cubeTexture.uuid) {
      cubeTexture.uuid = ID.generateUUID();
    }
    if (this.cubeTexture.find((t) => t.uuid === cubeTexture.uuid)) {
      return;
    }
    this.cubeTexture.push(cubeTexture);
  }

  async getGeometry(uuid: string): Promise<Geometry> {
    const geo = this.geometry.find((g) => g.uuid === uuid);
    if (geo) {
      return geo;
    } else {
      const arrayBuffer = await this.zipFiles.file(`geomertry/${uuid}`).async('arraybuffer');
      const vertexData = bufferToVertex(arrayBuffer);
      const geometry = new Geometry(uuid);
      geometry.uuid = uuid;
      for (const key in vertexData.buffer) {
        if (key === 'indices') {
          geometry.setIndices(vertexData.buffer[key]);
        } else {
          geometry.setVerticesData(key, vertexData.buffer[key]);
        }
      }
      this.addGeometry(geometry);
      return geometry;
    }
  }
  async getMaterial(uuid: string): Promise<Material> {
    const mat = this.material.find((m) => m.uuid === uuid);
    if (mat) {
      return mat;
    }
  }
  async getTexture(uuid: string): Promise<BaseTexture> {
    return this.texture.find((t) => t.uuid === uuid);
  }
  async getCubeTexture(uuid: string): Promise<CubeTexture> {
    return this.cubeTexture.find((t) => t.uuid === uuid);
  }

  async exportScene(scene: BabylonScene) {
    const files: [string, ArrayBuffer | string][] = [];
    const sceneData = serializeScene(scene, this);
    this.scene.push(sceneData);
    this.geometry.forEach((geo) => {
      const buffer = serializeGeometry(geo);
      files.push([`geomertry/${geo.uuid}`, buffer]);
    });
    const materials = this.material.map((mat) => {
      const data = mat.serialize();
      for (const key in mat) {
        //@ts-ignore
        const value = mat[key];
        if (
          //@ts-ignore
          mat[key] instanceof Texture
        ) {
          if (!key.startsWith('_') && key.indexOf('environment') == -1) {
            this.addTexture(value);
            data[key + '_MAP'] = value.uuid;
            delete data[key];
          }
        }
      }
      data.uuid = mat.uuid;
      return data;
    });
    Texture.SerializeBuffers = false;
    const textureArray = new Array<any>();
    for (const tex of this.texture) {
      const texture = tex.getInternalTexture();
      const data = tex.serialize();
      if (texture._buffer) {
        const buffer = (await serializeTextureBuffer(texture._buffer)) as ArrayBuffer;
        files.push([`texture/${tex.uuid}`, buffer]);
      } else {
        const buffer = await (await fetch(texture.url)).arrayBuffer();
        files.push([`texture/${tex.uuid}`, buffer]);
      }

      textureArray.push({
        uuid: tex.uuid,
        data,
      });
    }
    files.push(['scene.json', JSON.stringify(this.scene)]);
    files.push(['geomerty.json', JSON.stringify(this.geometry.map((g) => g.uuid))]);
    files.push(['material.json', JSON.stringify(materials)]);
    files.push(['texture.json', JSON.stringify(textureArray)]);
    const zipFile = await zipFiles(files);

    Tools.Download(zipFile, ID.generateUUID().replace(/-/g, '') + '.zip');
  }

  async loadFile(url: string, engine: Engine) {
    const rootScene = new Scene(engine);
    const env = CubeTexture.CreateFromPrefilteredData(
      './abandoned_factory_canteen_01.env',
      rootScene,
    );
    rootScene.environmentTexture = env;
    rootScene.iblIntensity = 0.5;
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const zip = await readZip(new Blob([arrayBuffer]));
    this.zipFiles = zip;
    const sceneJson = await zip.file('scene.json').async('text');
    this.scene = JSON.parse(sceneJson);
    const scene = this.scene[0];
    const materialJson = await zip.file('material.json').async('text');
    const materials = JSON.parse(materialJson);

    const textureJson = await zip.file('texture.json').async('text');
    const textures = JSON.parse(textureJson);
    Texture.UseSerializedUrlIfAny = true;
    for (let index = 0; index < textures.length; index++) {
      const element = textures[index];
      const file = await zip.file(`texture/${element.uuid}`).async('arraybuffer');
      const url = URL.createObjectURL(new Blob([file]));
      element.data.url = url;
      const texture = Texture.Parse(element.data, rootScene, '');
      texture.gammaSpace = element.data.gammaSpace;
      texture.uuid = element.uuid;
      this.addTexture(texture);
    }
    this.material = materials.map((mat: any) => {
      const material = Material.Parse(mat, rootScene, '');
      material.uuid = mat.uuid;
      for (const key in mat) {
        if (key.endsWith('_MAP')) {
          const uuid = mat[key];
          this.getTexture(uuid).then((t) => {
            //@ts-ignore
            material[key.replace('_MAP', '')] = t;
          });
        }
      }
      // if (material) {
      //   material.albedoTexture = new Texture('05.jpg', rootScene);
      // }
      return material;
    });
    const sceneObj = await deserializeScene(scene, engine, this, rootScene);
    return sceneObj;
  }

  importTexture(file: File, scene: Scene) {
    const texture = new Texture(
      file.name,
      scene,
      false,
      true,
      null,
      () => {},
      () => {},
      file,
    );

    this.addTexture(texture);
  }
  importGeomertry(file: File, scene: Scene) {
    ImportMeshAsync(file, scene);
  }
}

function serializeGeometry(geometry: Geometry) {
  const geo = geometry.serializeVerticeData();
  const geoInfo: GeoData = {
    id: geo.id,
    buffer: {},
  };
  for (const [key, arr] of Object.entries(geo)) {
    if (Array.isArray(arr)) {
      geoInfo.buffer[convertKey(key)] = arr;
    }
  }
  const buffer = vertexToBuffer(geoInfo);
  return buffer;
}

function convertKey(key: string) {
  switch (key) {
    case 'positions':
      return 'position';
    case 'normals':
      return 'normal';
    case 'tangents':
      return 'tangent';
    case 'uvs':
      return 'uv';
    default:
      return key;
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
