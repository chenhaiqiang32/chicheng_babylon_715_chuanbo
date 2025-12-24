import { ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { Node, Scene } from '@babylonjs/core';
import { ViewFlagsMode } from '@/3d/core/utils/viewFlagsMode';
import { CC } from '@/3d/assets/BaseRes';
import { Editor } from '@/3d/Editor';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { serializeScene } from '@/3d/assets/serialze/Scene';
import { ID } from '@/utils/id';

function buildHierarchy(node: Node): HierarchyNode {
  if (!node.uuid) {
    node.uuid = ID.generateUUID();
  }

  // todo:根据不同类型设置 isActive 字段
  var isActive = true;
  // 如果是摄像机，判断是否为 scene.activeCamera，如果是则=true
  if (node.getClassName() === 'ArcRotateCamera' || node.getClassName() === 'UniversalCamera') {
    isActive = Editor.Instance.Scene.activeCamera.uuid === node.uuid;
  }

  return {
    name: node.name,
    type: node.getClassName(),
    id: node.uuid,
    children: node.getChildren()?.map(buildHierarchy) ?? [],
    isActive: isActive,
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

  // uuid -> HeirarchyNode 映射
  const hierarychyMap = ref<Map<string, HierarchyNode>>(new Map());

  // 递归构建映射
  function buildMap(nodes: HierarchyNode[], map: Map<string, HierarchyNode>) {
    for (const node of nodes) {
      map.set(node.id, node);
      if (node.children) {
        buildMap(node.children, map);
      }
    }
  }

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

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy);
    hierarychyMap.value.clear();
    rootNodes.forEach((x) => {
      if (x.name == 'SubemitterSystemEmitter') {
        x.isIgnore = true;
      }
    });
    hierarchy.value = rootNodes.filter((node) => !node.isIgnore).map(buildHierarchy);
    buildMap(hierarchy.value, hierarychyMap.value);
  }

  function addHierarchy(node: Node, parent: Node | null) {
    const newNode = buildHierarchy(node);
    // 由于 Node 没有 parent 属性，所以只能通过找 parent 然后设置 childrent lai实现层级关系
    if (parent) {
      const parentNode = hierarychyMap.value.get(parent.uuid);
      //const parentNode = hierarchy.value.find((n) => n.id == parent.uuid);
      if (parentNode) {
        // 需要双向绑定
        node.parent = parent;
        parentNode.children?.push(newNode);
      } else {
        hierarchy.value.push(newNode);
      }
    } else {
      hierarchy.value.push(newNode);
    }
    hierarychyMap.value.set(newNode.id, newNode);
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

  async function addScene(scene: Scene) {
    const sceneData = await serializeScene(scene, RuntimeLibrary.Instance, true);
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
    addHierarchy,
    currentSelected,
    setCurrentSelect,
    currentControlMode,
    setCurrentControlMode,
    currentViewFlagsMode,
    setCurrentViewFlagsMode,
  };
});
export { ViewFlagsMode };
