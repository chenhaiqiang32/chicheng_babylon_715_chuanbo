import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Node, Vector3 } from '@babylonjs/core';
import { ViewFlagsMode } from '@/core/ViewFlagsMode';

function buildHierarchy(node: Node): HierarchyNode {
  return {
    name: node.name,
    type: node.getClassName(),
    id: node.id,
    children: node.getChildren()?.map(buildHierarchy) ?? [],
  };
}

// 模型控制模式
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
  const currentViewFlagsMode  =ref<ViewFlagsMode>();

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy);
  }

  function setCurrentSelect(objectIds?: string[]) {
    currentSelected.value = objectIds ?? [];
  }

  function setCurrentControlMode(mode : ControlMode){
    currentControlMode.value = mode;
  }
  
  function setCurrentViewFlagsMode(...flags: ViewFlagsMode[]){
    currentViewFlagsMode.value = 0;
    for(const flag of flags){
      currentViewFlagsMode.value |= flag;
    }
  }

  return { hierarchy, setHierarchy, 
           currentSelected, setCurrentSelect, 
           currentControlMode, setCurrentControlMode,
           currentViewFlagsMode, setCurrentViewFlagsMode,
         };
});
export { ViewFlagsMode };

