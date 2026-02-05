import {
  AbstractEngine,
  ActionManager,
  CascadedShadowGenerator,
  Color3,
  Color4,
  Engine,
  ExecuteCodeAction,
  Mesh,
  Scene,
  ShadowGenerator,
  WebGPUEngine,
} from '@babylonjs/core';
import { AppAssets } from '../assets/PublishLibrary';
import { Animator } from '../animation/animator';
import { Timer } from '@/utils/Time';
import { ArrayUtils } from '@/utils/Array';
import { Shadow } from '../Shadow';
import { isDirectionalLight, isPointLight, isSpotLight } from '@/tools/guards/nodes';
import { Editor } from '../Editor';

export class App {
  private engine: AbstractEngine;
  private static instance: App;
  private assets: AppAssets;
  scene: Scene;
  private shadow: Shadow;
  private canvas: HTMLCanvasElement;
  static get Instance(): App {
    if (!this.instance) {
      this.instance = new App();
    }
    return this.instance;
  }

  animator: Animator;

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
    for (let index = 0; index < padding.length; index++) {
      await padding[index]();
      //await Promise.all(group[index].map((x) => x()));
      //await Timer.sleep(10);
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
          const sg = Editor.Instance.shadow.getShadowGenerator(light);
          if (!sg) {
            return;
          }
          sg.getLight()
            .getScene()
            .meshes.forEach((item) => {
              if (item.castShadows) {
                Editor.Instance.shadow.addMeshToShadowGenerator(item, light);
              }
            });
        }
      }
    });

    return scene;
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
