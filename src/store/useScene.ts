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


export const useScene = defineStore('scene', () => {

  // 模块化
  const hierarchyModule = useHierarchyModule();
  const controlModule = useControlModule();

  const currentSelected = ref<Array<string>>([]);
  const currentScene = ref<string>();
  const sceneInfoList = shallowRef<Partial<CC.Scene>[]>([]);

  const currentCopy = ref<CC.ObjectNode | null>(null);
  

  function setSceneList(scenes: CC.Scene[]) {
    sceneInfoList.value = scenes;
  }

  async function saveScene(scene: Scene) {
    const sceneData = await serializeScene(scene, RuntimeLibrary.Instance, false);
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

  async function addScene(scene: Scene) {
    const sceneData = await serializeScene(scene, RuntimeLibrary.Instance, true);
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
      const groupPadding = groupArray(padding, 20);
      for (let index = 0; index < groupPadding.length; index++) {
        const group = groupPadding[index].map((f) => f());
        // await Promise.all(group);
        await Timer.sleep(0);
        progressCallback((index + 1) / groupPadding.length);
      }
      return scene;
    }
  }

  return {

    // 模块化(兼容以前代码所以没有直接导出 Module)
    // hierarchy
    hierarchy: hierarchyModule.hierarchy,
    hierarchyMap: hierarchyModule.hierarchyMap,
    setHierarchy: hierarchyModule.setHierarchy,
    addHierarchy: hierarchyModule.addHierarchy,
    removeHierarchy: hierarchyModule.removeHierarchy,
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
  };
});
export { ViewFlagsMode };

function groupArray<T>(array: Array<T>, size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}
