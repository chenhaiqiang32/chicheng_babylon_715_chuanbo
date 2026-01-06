import { loadSkyboxWithExt } from '@/3d/core/utils/EnvSkybox';
import {
  AbstractEngine,
  Color4,
  DirectionalLight,
  Effect,
  FreeCamera,
  HemisphericLight,
  Material,
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  Tools,
  Vector3,
} from '@babylonjs/core';
import { envTextureVertexShader, envTextureFragmentShader } from '@/shaders/envTexture';
import { Editor } from '@/3d/Editor';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';

let scene: Scene;
let camera: FreeCamera;
let sphere: Mesh;
let plane: Mesh;
const size = 128;
let cache: Map<string, string> = new Map();
let envCache: Map<string, string> = new Map();


function initScene(engine: AbstractEngine) {
  scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  camera = new FreeCamera('MaterialPreviewCamera', new Vector3(0, 0, -2), scene);
  scene.activeCamera = camera;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;

  const dir = new DirectionalLight('dir', new Vector3(-1, -2, -1), scene);
  dir.position = new Vector3(2, 4, 2);
  dir.intensity = 0.8;
  sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1, segments: 32 }, scene);
  plane = MeshBuilder.CreatePlane('plane', {width:2, height: 1});
  scene.createDefaultEnvironment();
}

export function renderMaterail(material: Material, useCache = true, engine=Editor.Instance.Engine) {
  // 默认使用缓存
  if (useCache) {
    const url = cache.get(material.uuid);
    if (url) {
      return url;
    }
  }
  if (!scene) {
    initScene(engine);
  }

  sphere.isVisible = true;
  plane.isVisible = false;
  const mat = material.clone(material.name + 'preview');
  //@ts-ignore
  mat._scene = scene;
  sphere.material = mat;

  return new Promise((resolve) => {
    Tools.CreateScreenshotUsingRenderTarget(
      engine,
      camera,
      size,
      (data) => {
        mat.dispose();
        cache.set(material.uuid, data);
        resolve(data);
      },
      'image/png',
    );
  });
}

/**
 * 生成环境贴图的缩略图 url
 */
export async function renderEnvTexture(sourceUUID:string, useCache = true, engine: AbstractEngine=Editor.Instance.Engine):Promise<string> {
    if (useCache) {
        const url = envCache.get(sourceUUID);
        if (url) 
          return url;
    }
    if (!scene) {
      initScene(engine);
    }

    sphere.isVisible = false;
    plane.isVisible = true;

    const env = await RuntimeLibrary.Instance.getEnvTexture(sourceUUID);

    const shaderMaterial = new ShaderMaterial("envTextureShader", scene,
      {
        vertex: "envTexture",
        fragment: "envTexture",
      },
      {
        attributes: ["position", "uv"],
        uniforms: ["worldViewProjection", "cubeTexture"],
        samplers: ["cubeTexture"]
      }
    );

    if(!Effect.ShadersStore["envTextureVertexShader"]) {
      Effect.ShadersStore["envTextureVertexShader"] = envTextureVertexShader;
      Effect.ShadersStore["envTextureFragmentShader"] = envTextureFragmentShader;
    }

    shaderMaterial.setTexture("cubeTexture", env);
    plane.material = shaderMaterial;

    return new Promise((resolve) => {
        Tools.CreateScreenshotUsingRenderTarget(
          engine,
          camera,
          size,
          (data) => {
            shaderMaterial.dispose();
            envCache.set(sourceUUID, data);
            resolve(data);
          },
          'image/png',
        )
    })
}