import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Node } from '@babylonjs/core';

function buildHierarchy(node: Node): HierarchyNode {
  return {
    name: node.name,
    type: node.getClassName(),
    id: node.id,
    children: node.getChildren()?.map(buildHierarchy) ?? [],
  };
}

export const useScene = defineStore('scene', () => {
  const hierarchy = ref<HierarchyNode[]>([]);
  const currentSelected = ref<Array<string>>([]);

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy);
  }

  function setCurrentSelect(objectIds?: string[]) {
    currentSelected.value = objectIds ?? [];
  }

  return { hierarchy, setHierarchy, currentSelected, setCurrentSelect };
});
