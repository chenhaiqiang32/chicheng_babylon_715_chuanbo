import { ref, shallowReactive } from 'vue';
import { defineStore } from 'pinia';
import { Node, Scene } from '@babylonjs/core';
import { ViewFlagsMode } from '@/3d/core/utils/viewFlagsMode';
import { CC } from '@/3d/assets/BaseRes';

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

  const sceneList = shallowReactive<Scene[]>([]);

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

  return {
    hierarchy,
    sceneList,
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
