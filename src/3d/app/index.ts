import {
  AbstractEngine,
  ActionManager,
  CascadedShadowGenerator,
  Engine,
  ExecuteCodeAction,
  Mesh,
  Scene,
  Node,
  ShadowGenerator,
  WebGPUEngine,
} from '@babylonjs/core';
import { AppAssets } from '../assets/PublishLibrary';
import { ArrayUtils } from '@/utils/Array';
import { Shadow } from '../Shadow';
import { isDirectionalLight, isPointLight, isSpotLight } from '@/tools/guards/nodes';

export class App {
  private engine: AbstractEngine;
  private static instance: App;
  private assets: AppAssets;
  scene: Scene;
  private shadow: Shadow;
  private canvas: HTMLCanvasElement;
  weakMap: Map<string, Node> = new Map();
  static get Instance(): App {
    if (!this.instance) {
      this.instance = new App();
    }
    return this.instance;
  }

  async init(canvas: HTMLCanvasElement, gpu: boolean) {
    this.canvas = canvas;
    if (gpu) {
      this.engine = new Engine(canvas, true, {
        antialias: true,
        adaptToDeviceRatio: true,
        limitDeviceRatio: 2,
      });
      // this.engine = new WebGPUEngine(canvas, {
      //   adaptToDeviceRatio: true,
      //   limitDeviceRatio: 2,
      // });
      if (this.engine instanceof WebGPUEngine) {
        await this.engine.initAsync();
      }
    } else {
      this.engine = new Engine(canvas, true, {
        adaptToDeviceRatio: true,
        limitDeviceRatio: 2,
      });
    }
    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });
    this.shadow = new Shadow();
    window.addEventListener('resize', this.resize);
  }

  resize = () => {
    this.engine.resize();
  };

  onDispose() {
    window.removeEventListener('resize', this.resize);
    this.engine.dispose();
  }

  setAssetsLibrary(assets: AppAssets) {
    this.assets = assets;
  }

  async setScene(onProgress?: (progress: number) => void) {
    if (!this.assets) {
      return;
    }
    const sceneNode = this.assets.scene[0];
    const scene = new Scene(this.engine);
    const padding = new Array<Padding>();
    this.assets.deserializeScene(scene, sceneNode, padding);

    this.scene = scene;
    //scene.clearColor = new Color4(1, 1, 1, 1);
    scene.activeCamera.attachControl(this.canvas, true);
    this.registerAction();
    const groupCount = Math.ceil(padding.length / 20);
    const group = ArrayUtils.groupArray(padding, groupCount);
    for (let index = 0; index < group.length; index++) {
      await Promise.all(group[index].map((x) => x()));
      onProgress?.(index / (group.length - 1));
    }
    scene.lights.forEach((light) => {
      if (light.shadowGenerator) {
        const generator = light.isShadowGenerator
          ? ShadowGenerator.Parse(light.shadowGenerator, scene)
          : CascadedShadowGenerator.Parse(light.shadowGenerator, scene);
        this.shadow.addShadowGeneratorMap(light.uuid, generator);
      }
      if (isDirectionalLight(light) || isPointLight(light) || isSpotLight(light)) {
        {
          const sg = this.shadow.getShadowGenerator(light);
          if (!sg) {
            return;
          }
          sg.getLight()
            .getScene()
            .meshes.forEach((item) => {
              if (item.castShadows) {
                this.shadow.addMeshToShadowGenerator(item, light);
              }
            });
        }
      }
    });
    return scene;
  }
  getNodeById(id: string): Node {
    let node: Node = getSceneNodeByUUid(this.scene, id, this.weakMap);
    return node;
  }
  registerAction() {
    this.scene.rootNodes.forEach((node) => {
      const children = node.getChildren(null, false);
      children.forEach((child) => {
        function getTriggerType(x: string) {
          console.log(x);
        }

        if (child.metadata?.events?.length > 0) {
          const events = new Set<string>(
            child.metadata?.events.map((x: { triggerType: string }) => x.triggerType),
          );
          const actions = [...events]
            .map((x) => {
              if (x === 'onClick') {
                return new ExecuteCodeAction(
                  {
                    trigger: ActionManager.OnPickTrigger,
                  },
                  function () {
                    getTriggerType('onClick');
                  },
                );
              } else if (x === 'onDoubleClick') {
                return new ExecuteCodeAction(
                  {
                    trigger: ActionManager.OnDoublePickTrigger,
                  },
                  function () {
                    getTriggerType('onDoubleClick');
                  },
                );
              } else if (x === 'onMouseEnter') {
                return new ExecuteCodeAction(
                  {
                    trigger: ActionManager.OnPointerOverTrigger,
                  },
                  function () {
                    getTriggerType('onMouseEnter');
                  },
                );
              } else if (x === 'onMouseLeave') {
                return new ExecuteCodeAction(
                  {
                    trigger: ActionManager.OnPointerOutTrigger,
                  },
                  function () {
                    getTriggerType('onMouseLeave');
                  },
                );
              } else {
                console.log(x);
              }
            })
            .filter((x) => x);
          if (child instanceof Mesh) {
            child.actionManager = new ActionManager();
            actions.forEach((action) => {
              child.actionManager.registerAction(action);
            });
          } else {
            child.getChildMeshes().forEach((mesh) => {
              mesh.actionManager = new ActionManager();
              actions.forEach((action) => {
                mesh.actionManager.registerAction(action);
              });
            });
          }
        }
      });
    });
  }
}

function getSceneNodeByUUid(scene: Scene, uuid: string, weakMap?: Map<string, Node>) {
  if (weakMap) {
    const ret = weakMap.get(uuid);
    if (ret) {
      return ret;
    }
  }
  for (const item of scene.rootNodes) {
    const ret = getNodeByUUid(item, uuid, weakMap);
    if (ret) {
      return ret;
    }
  }
}
function getNodeByUUid(node: Node, uuid: string, weakMap?: Map<string, Node>): Node | null {
  if (weakMap) {
    weakMap.set(node.uuid, node);
  }
  if (node.uuid === uuid) {
    if (node.isDeleted) return null;
    return node;
  }
  const children = node.getChildren();
  if (children?.length > 0) {
    for (let index = 0; index < children.length; index++) {
      const ret = getNodeByUUid(children[index], uuid, weakMap);
      if (ret) {
        if (node.isDeleted) return null;
        return ret;
      }
    }
  }
}
