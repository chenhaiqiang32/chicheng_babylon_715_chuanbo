import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Node, Vector3 } from '@babylonjs/core';

function buildHierarchy(node: Node): HierarchyNode {
  return {
    name: node.name,
    type: node.getClassName(),
    id: node.id,
    children: node.getChildren()?.map(buildHierarchy) ?? [],
  };
}

export enum ControlMode {
    Select = "Select",
    Move = "Move",
    Rotate = "Rotate",
    Scale = "Scale"
}

export const useScene = defineStore('scene', () => {
  const hierarchy = ref<HierarchyNode[]>([]);
  const currentSelected = ref<Array<string>>([]);
  const currentControlMode = ref<ControlMode>();
  const modelPosition = ref<Vector3>();

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy);
  }

  function setCurrentSelect(objectIds?: string[]) {
    currentSelected.value = objectIds ?? [];
  }

  function setCurrentControlMode(mode : ControlMode){
    currentControlMode.value = mode;
  }

  

  return { hierarchy, setHierarchy, currentSelected, setCurrentSelect, currentControlMode, setCurrentControlMode };
});
