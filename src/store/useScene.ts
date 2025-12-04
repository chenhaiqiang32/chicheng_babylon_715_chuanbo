import { ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { Node, Scene } from '@babylonjs/core';
import { ViewFlagsMode } from '@/3d/core/utils/viewFlagsMode';
import { CC } from '@/3d/assets/BaseRes';
import { Editor } from '@/3d/Editor';
import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';

function buildHierarchy(node: Node): HierarchyNode {
  return {
    name: node.name,
    type: node.getClassName(),
    id: node.uniqueId,
    children: node.getChildren()?.map(buildHierarchy) ?? [],
  };
}

// 模型控制模式
export enum ControlMode {
  Select = 'Select',
  Move = 'Move',
  Rotate = 'Rotate',
  Scale = 'Scale',
}

export const useScene = defineStore('scene', () => {
  const hierarchy = ref<HierarchyNode[]>([]);
  const currentSelected = ref<Array<number>>([]);
  const currentControlMode = ref<ControlMode>();
  const currentViewFlagsMode = ref<ViewFlagsMode>();
  const currentScene = ref<string>();
  const scenelist = new Array<Scene>();
  const sceneInfoList = shallowRef<Partial<CC.Scene>[]>([]);

  function setSceneList(scenes: CC.Scene[]) {
    sceneInfoList.value = scenes;
  }

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy);
  }

  function setCurrentSelect(objectIds?: number[]) {
    currentSelected.value = objectIds ?? [];
  }

  function setCurrentControlMode(mode: ControlMode) {
    currentControlMode.value = mode;
  }

  function setCurrentViewFlagsMode(...flags: ViewFlagsMode[]) {
    currentViewFlagsMode.value = 0;
    for (const flag of flags) {
      currentViewFlagsMode.value |= flag;
    }
  }

  function addScene(scene: Scene) {
    scenelist.push(scene);
    sceneInfoList.value.push({ name: scene.name, uuid: scene.uuid });
    sceneInfoList.value = [...sceneInfoList.value];
  }

  async function getScene(uuid: string): Promise<Scene> {
    const scene = scenelist.find((x) => x.uuid == uuid);
    if (scene) {
      return scene;
    } else {
      const ccNode = sceneInfoList.value.find((x) => x.uuid == uuid) as CC.Scene;
      if (ccNode) {
        const scene = await RuntimeLibrary.Instance.deserializeScene(
          new Scene(Editor.Instance.Engine),
          ccNode,
        );
        scenelist.push(scene);
        return scene;
      }
    }
  }

  function getAllScene(): Scene[] {
    return scenelist;
  }

  return {
    getScene,
    currentScene,
    hierarchy,
    sceneInfoList,
    setSceneList,
    addScene,
    setHierarchy,
    getAllScene,
    currentSelected,
    setCurrentSelect,
    currentControlMode,
    setCurrentControlMode,
    currentViewFlagsMode,
    setCurrentViewFlagsMode,
  };
});
export { ViewFlagsMode };
