import { ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { Node, Scene } from '@babylonjs/core';
import { ViewFlagsMode } from '@/3d/core/utils/viewFlagsMode';
import { CC } from '@/3d/assets/BaseRes';
import { Editor } from '@/3d/Editor';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { serializeScene } from '@/3d/assets/serialze/Scene';
import { Timer } from '@/utils/Time';
import { useHierarchyModule } from './useSceneModule/useHierarchy';
import { useControlModule } from './useSceneModule/useControl';
import { ArrayUtils } from '@/utils/Array';
import { _EventBus } from '@/utils/dispatch';

export const useScene = defineStore('scene', () => {
  // 模块化
  const hierarchyModule = useHierarchyModule();
  const controlModule = useControlModule();

  const currentSelected = ref<Array<string>>([]);
  const currentScene = ref<string>();
  const sceneInfoList = shallowRef<Partial<CC.Scene>[]>([]);

  const currentCopy = ref<CC.ObjectNode | null>(null);

  const currentSelectResNode = ref<string>();
  function setSceneList(scenes: CC.Scene[]) {
    sceneInfoList.value = scenes;
  }

  async function saveScene(scene: Scene) {
    _EventBus.dispatch('onSceneSaveBefore');
    const padding = new Array<Padding>();
    const sceneData = serializeScene(scene, RuntimeLibrary.Instance, padding);
    await Promise.all(padding.map((x) => x()));
    sceneInfoList.value = sceneInfoList.value.map((x) => {
      if (x.uuid == scene.uuid) {
        return sceneData;
      }
      return x;
    });
  }

  function setCurrentSelect(objectIds?: string[]) {
    currentSelected.value = objectIds ?? [];
  }
  function setCurrentSelectResNode(uuid: string) {
    currentSelectResNode.value = uuid;
  }

  async function addScene(scene: Scene) {
    const padding = new Array<Padding>();
    const sceneData = serializeScene(scene, RuntimeLibrary.Instance, padding);
    await Promise.all(padding.map((x) => x()));
    sceneInfoList.value.push(sceneData);
    sceneInfoList.value = [...sceneInfoList.value];
  }

  async function getScene(
    uuid: string,
    progressCallback: (percent: number) => void,
    sceneRef?: Scene,
  ): Promise<Scene> {
    const ccNode = sceneInfoList.value.find((x) => x.uuid == uuid) as CC.Scene;
    if (ccNode) {
      const padding: Array<Padding> = [];
      const scene = RuntimeLibrary.Instance.deserializeScene(
        sceneRef ?? new Scene(Editor.Instance.Engine),
        ccNode,
        padding,
      );

      const groupPadding = ArrayUtils.groupArray(padding, Math.ceil(padding.length / 40));
      for (let index = 0; index < groupPadding.length; index++) {
        const group = groupPadding[index].map((f) => f());
        await Promise.all(group);
        await Timer.sleep(0);
        progressCallback((index + 1) / groupPadding.length);
      }
      progressCallback(1);
      return scene;
    }
  }

  return {
    // 模块化(兼容以前代码所以没有直接导出 Module)
    // hierarchy
    hierarchy: hierarchyModule.hierarchy,
    setHierarchy: hierarchyModule.setHierarchy,
    addHierarchy: hierarchyModule.addHierarchy,
    updateHierarchy: hierarchyModule.updateHierarchy,
    // control
    currentControlMode: controlModule.currentControlMode,
    currentViewFlagsMode: controlModule.currentViewFlagsMode,
    setCurrentControlMode: controlModule.setCurrentControlMode,
    setCurrentViewFlagsMode: controlModule.setCurrentViewFlagsMode,

    getScene,
    saveScene,
    currentScene,
    sceneInfoList,
    setSceneList,
    addScene,
    currentSelected,
    currentCopy,
    setCurrentSelect,
    currentSelectResNode,
    setCurrentSelectResNode
  };
});
export { ViewFlagsMode };
