import { ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { Node, Scene } from '@babylonjs/core';
import { ViewFlagsMode } from '@/3d/core/utils/viewFlagsMode';
import { CC } from '@/3d/assets/BaseRes';
import { Editor } from '@/3d/Editor';
import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';
import { serializeScene } from '@/3d/assets/serialze/Scene';
import { ID } from '@/utils/id';

function buildHierarchy(node: Node): HierarchyNode {
  if (!node.uuid) {
    node.uuid = ID.generateUUID();
  }
  return {
    name: node.name,
    type: node.getClassName(),
    id: node.uuid,
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
  const currentSelected = ref<Array<string>>([]);
  const currentControlMode = ref<ControlMode>();
  const currentViewFlagsMode = ref<ViewFlagsMode>();
  const currentScene = ref<string>();
  const sceneInfoList = shallowRef<Partial<CC.Scene>[]>([]);

  function setSceneList(scenes: CC.Scene[]) {
    sceneInfoList.value = scenes;
  }

  function saveScene(scene: Scene) {
    const sceneData = serializeScene(scene, RuntimeLibrary.Instance, false);
    sceneInfoList.value = sceneInfoList.value.map((x) => {
      if (x.uuid == scene.uuid) {
        return sceneData;
      }
      return x;
    });
  }

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy);
  }

  function setCurrentSelect(objectIds?: string[]) {
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
    const sceneData = serializeScene(scene, RuntimeLibrary.Instance, true);
    sceneInfoList.value.push(sceneData);
    sceneInfoList.value = [...sceneInfoList.value];
  }

  async function getScene(uuid: string): Promise<Scene> {
    const ccNode = sceneInfoList.value.find((x) => x.uuid == uuid) as CC.Scene;
    if (ccNode) {
      const padding: Array<Promise<any>> = [];
      const scene = await RuntimeLibrary.Instance.deserializeScene(
        new Scene(Editor.Instance.Engine),
        ccNode,
        padding,
      );
      return scene;
    }
  }

  return {
    getScene,
    saveScene,
    currentScene,
    hierarchy,
    sceneInfoList,
    setSceneList,
    addScene,
    setHierarchy,
    currentSelected,
    setCurrentSelect,
    currentControlMode,
    setCurrentControlMode,
    currentViewFlagsMode,
    setCurrentViewFlagsMode,
  };
});
export { ViewFlagsMode };
