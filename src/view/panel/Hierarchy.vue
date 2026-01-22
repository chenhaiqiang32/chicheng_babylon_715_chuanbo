<template>
    <BasePanel :title="$t('view.scene')">
        <ElSplitter :lazy="true" layout="vertical">
            <ElSplitterPanel :min="120" :max="500" :size="120">
                <div class="scene-list">
                    <div class="title">
                        <span>{{ $t('view.sceneList') }}</span>
                        <SVG name="add" @click="addScene"></SVG>
                    </div>
                    <ElScrollbar>
                        <div class="scene-list-content">
                            <div v-for="scene in sceneInfoList" :key="scene.uuid" class="scene-item"
                                @click="changeScene(scene.uuid)">
                                <SVG size="14" name="check" v-show="scene.uuid === currentScene"></SVG>
                                {{ scene.name }}
                            </div>
                        </div>
                    </ElScrollbar>
                </div>
            </ElSplitterPanel>
            <ElSplitterPanel>
                <div class="hierarchy-panel" @contextmenu="contextMenu" @click="handlePanelClick">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <ElInput size="small" placeholder="搜索" v-model="searchText">
                            <template #prefix>
                                <el-icon>
                                    <Search />
                                </el-icon>
                            </template>
                        </ElInput>
                        <SVG name="setting" @click="toggleSceneSetting"></SVG>
                    </div>
                    <div style="height: 0;flex: 1;">
                        <ElScrollbar style="height: 100%;">
                            <ElTree :filter-node-method="filterHierarchy" ref="treeRef" @click="handleNodeClick(null)"
                                draggable @node-drag-start="handleNodeDragStart" @node-drop="handleNodeDrop" :data="hierarchy" highlight-current
                                :props="treeProps" node-key="id" :default-expanded="true" :default-active="true" :expand-on-click-node="false"
                                @node-click="handleNodeClick">
                                <!-- 节点类型图标 + 节点名 -->
                                <template #default="{ node, data }">
                                    <!-- 节点上也可以右键新增 -->
                                    <div class="tree-node" @contextmenu.stop="(e) => contextMenu(e, data)">
                                        <SVG size="14" :color="data.isActive ? '#ffffff' : '#7d7d7d'"
                                            :name="iconMap[data.type]"></SVG>
                                        {{ data.name }}
                                    </div>
                                    <div v-show="data.isSelected" class="tree-node-active"></div>
                                </template>
                            </ElTree>
                        </ElScrollbar>
                    </div>

                </div>
            </ElSplitterPanel>
        </ElSplitter>
    </BasePanel>
</template>
<script setup lang='ts'>
import BasePanel from '@/component/common/BasePanel.vue'
import { useScene } from '@/store/useScene';
import { ElInput, ElMessageBox, NodeDropType, type ElTree, type TreeNodeData } from 'element-plus';
import { Search } from '@element-plus/icons-vue'
import Node from 'element-plus/es/components/tree/src/model/node.mjs';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Editor } from '@/3d/Editor';
import SVG from '@/component/common/SVG.vue';
import { useDialog } from '../dialog';
import { openContextMenu } from '@/component/content-menu';
import { getHierarchyCtxMenuCommands, getHierarchyMultiCtxMenuCommands } from '@/view/panel/ContextMenuCommands';
import { Node as BJS_Node } from '@babylonjs/core';
import { registerKeyDown, registerKeyUp, unregisterKeyDown, unregisterkeyUp } from '@/utils/ShortcutKey';
import { nodeCRUD } from '@/3d/core/utils/nodeCRUD';
import { registerUndoRedo } from '@/tools/undoredo';
const searchText = ref('');
const treeProps = {
    label: 'name',
}

const { hierarchy, currentSelected, sceneInfoList, currentScene } = storeToRefs(useScene());

let dragParent:Node,dragPrev:Node,dragNext:Node;
let isShiftHolding = false;
let multiSelectBegin: HierarchyNode, multiSelectEnd: HierarchyNode;
let selectedList:Node[];

const treeRef = ref<InstanceType<typeof ElTree>>()
const sceneSettingVisible = ref(false);

const iconMap: Record<string, string> = {
    ArcRotateCamera: "cameraIcon",
    UniversalCamera: "cameraIcon",
    DirectionalLight: "lightIcon",
    SpotLight: "lightIcon",
    PointLight: "lightIcon",
    Mesh: "meshIcon",
    TransformNode: "transformNodeIcon"
}

onMounted(() => {
    Editor.Instance.on('nameChanged', onNameChanged)
    Editor.Instance.on('onActiveCameraChanged', onActiveCameraChanged);
    Editor.Instance.on('onNodeActiveChanged', onNodeActiveChanged)
    registerKeyDown(onKeydown);
    registerKeyUp(onKeyup)
})

onUnmounted(() => {
    Editor.Instance.off('nameChanged', onNameChanged)
    Editor.Instance.off('onActiveCameraChanged', onActiveCameraChanged);
    Editor.Instance.off('onNodeActiveChanged', onNodeActiveChanged)
    unregisterKeyDown(onKeydown);
    unregisterkeyUp(onkeyup);
})

function contextMenu(e: MouseEvent, nodeData?: HierarchyNode) {
    e.stopPropagation();
    e.preventDefault();

    // 多选模式
    if(selectedList.length > 0) {
        openContextMenu({
            position: {
                x: e.clientX,
                y: e.clientY
            },
            commands: getHierarchyMultiCtxMenuCommands(selectedList)
        })
    } else{
        // parent 优先为选中的节点；如果没有，则获取鼠标当前选中的节点
        let parentNode: BJS_Node | null = null;
        if (currentSelected.value.length > 0) {
            parentNode = Editor.Instance.getNodeById(currentSelected.value[0]);
        }
        else {
            parentNode = nodeData ? Editor.Instance.getNodeById(nodeData.id) : null;
        }

        openContextMenu({
            position: {
                x: e.clientX,
                y: e.clientY
            },
            commands: getHierarchyCtxMenuCommands(parentNode)
        })
    }
}

async function addScene() {
    const { value } = await ElMessageBox.prompt('', {
        title: $i18nT('view.addScene'),
        inputPlaceholder: $i18nT('view.newScenePlaceholder'),
        cancelButtonText: $i18nT('view.newSceneCancel'),
        confirmButtonText: $i18nT('view.newSceneConfirm')
    })
    if (value) {
        const scene = await Editor.Instance.createNewScene(value);
        useScene().addScene(scene);
    }
}


function changeScene(scene: string) {
    if (useScene().currentScene != scene) {
        currentSelected.value = [];
        Editor.Instance.setCurrentScene(scene);
    }

}


function onNameChanged(node: { id: string, newName: string }) {
    const treeNode = treeRef.value.getNode(node.id);
    if (treeNode) {
        treeNode.data.name = node.newName;
    }
}

/**
 * 切换当前激活的摄像机的节点isActive属性
 */
function onActiveCameraChanged(data: { newUuid: string, oldUuid: string }) {
    treeRef.value.getNode(data.oldUuid).data.isActive = false;
    const node = treeRef.value.getNode(data.newUuid);
    if (node) {
        node.data.isActive = true;
    }
}

/**
 * 切换节点的 isActive 字段
 */
function onNodeActiveChanged(data: { nodeUuid: string, isVisiable: boolean }) {
    treeRef.value.getNode(data.nodeUuid).data.isActive = data.isVisiable;
}

const handleNodeClick = (node: HierarchyNode) => {
    currentSelected.value = node ? [node.id] : [];
    if (node) {
        treeRef.value?.setCurrentKey(node.id);
        sceneSettingVisible.value = false;
    } else {
        treeRef.value?.setCurrentKey(null);
    }
    // 判断是否为多选
    if(multiSelectBegin && isShiftHolding){
        multiSelectEnd = node;
        handleMultiSelect();
    } else if(!multiSelectBegin) {
        multiSelectBegin = node;
        selectedList?.forEach((x) => x.data.isSelected = false);
        selectedList = [];
    }
}

function handlePanelClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.el-tree-node')) {
        handleNodeClick(null);
    }
}

// 多选节点
function handleMultiSelect() {
    selectedList?.forEach((x) => x.data.isSelected = false);
    const nodeA = treeRef.value.getNode(multiSelectBegin.id);
    const nodeB = treeRef.value.getNode(multiSelectEnd.id);
    const nodes = treeRef.value.store._getAllNodes();
    let min = nodes.findIndex((x) => x.id == nodeA.id);
    let max = nodes.findIndex((x) => x.id == nodeB.id)
    if(max < min) {
        const tmp = max;
        max = min;
        min = tmp;
    }
    // 填充多选选中节点的数组
    selectedList = nodes.splice(min, max - min + 1);
    selectedList.forEach((x) => x.data.isSelected = true);
    multiSelectBegin = null;
    multiSelectEnd = null;
}

watch(currentSelected, (val) => {
    if (val[0] != undefined) {
        treeRef.value.setCurrentKey(val[0], true);
    } else {
        treeRef.value?.setCurrentKey(null);
    }

})

function isElementInViewport(element: HTMLElement) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const elementRect = element.getBoundingClientRect();
    const elementTop = elementRect.top + scrollTop;
    const elementBottom = elementRect.bottom + scrollTop;
    return elementTop < scrollTop + windowHeight && elementBottom > scrollTop;
}

watch(searchText, (val) => {
    treeRef.value!.filter(val)
})


function filterHierarchy(value: any, data: TreeNodeData, child: any) {
    if (!value) {
        return true;
    }
    return data.name.includes(value);
}
const toggleSceneSetting = async () => {
    const SceneSettingDialog = (await import('../dialog/SceneSettingDialog.vue')).default
    useDialog(SceneSettingDialog)
}

// 记录拖拽之前Node的位置
const handleNodeDragStart = (
    draggingNode: Node,
    ev: DragEvent
) => {
    dragParent = draggingNode.parent;
    dragPrev =   draggingNode.previousSibling;
    dragNext =   draggingNode.nextSibling;
}

// 拖拽释放节点，修改该节点的层级
const handleNodeDrop = (
    draggingNode: Node,
    dropNode: Node,
    dropType: Exclude<NodeDropType, 'none'>,
    ev: DragEvent
) => {
    if (!draggingNode || !dropNode) return;

    // 多选拖拽
    if(selectedList?.length > 0) {
        const drop = Editor.Instance.getNodeById(dropNode.data.id);
        // 找到 level 最小的，因为我们只想移动第一层节点
        const level = Math.min(...selectedList.map(x => x.level));
        const moveList = selectedList.filter((x) => x.level == level);
        // todo: 顺序问题
        for(var i=moveList.length - 1; i >=0; i--){
            const node = Editor.Instance.getNodeById(moveList[i].data.id);
            nodeCRUD().updateNodeHierarchy(node, drop, dropType);
        }
        registerUndoRedo({
            undo: () => {
                if(dragPrev) {
                    for(var i=moveList.length - 1; i >=0; i--){
                        const node = Editor.Instance.getNodeById(moveList[i].data.id);
                        nodeCRUD().updateNodeHierarchy(node, Editor.Instance.getNodeById(dragPrev.data.id), "after");
                    }
                } else if(dragNext) {
                    for(var i=moveList.length - 1; i >=0; i--){
                        const node = Editor.Instance.getNodeById(moveList[i].data.id);
                        nodeCRUD().updateNodeHierarchy(node, Editor.Instance.getNodeById(dragNext.data.id), "before");
                    }
                } else {
                    for(var i=moveList.length - 1; i >=0; i--){
                        const node = Editor.Instance.getNodeById(moveList[i].data.id);
                        nodeCRUD().updateNodeHierarchy(node, Editor.Instance.getNodeById(dragParent.data.id), "inner");
                    }
                }
            },
            redo: () => {
                for(var i=moveList.length - 1; i >=0; i--){
                    const node = Editor.Instance.getNodeById(moveList[i].data.id);
                    nodeCRUD().updateNodeHierarchy(node, drop, dropType);
                }
            }
        })
    }
    // 单个拖拽
    else {
    const node = Editor.Instance.getNodeById(draggingNode.data.id);
    const drop = Editor.Instance.getNodeById(dropNode.data.id);
    nodeCRUD().updateNodeHierarchy(node, drop, dropType, false);
    registerUndoRedo({
        undo: () => {
            if(dragPrev) {
                nodeCRUD().updateNodeHierarchy(node, Editor.Instance.getNodeById(dragPrev.data.id), "after");
            } else if(dragNext) {
                nodeCRUD().updateNodeHierarchy(node, Editor.Instance.getNodeById(dragNext.data.id), "before");
            } else {
                nodeCRUD().updateNodeHierarchy(node, Editor.Instance.getNodeById(dragParent.data.id), "inner");
            }
        },
        redo: () => {
            nodeCRUD().updateNodeHierarchy(node, drop, dropType);
        }
    })
}
}

async function onKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    isShiftHolding = e.shiftKey;
    // 拷贝节点
    if (e.ctrlKey && key === 'c') {
        if (Editor.Instance.selectNodes.length > 0) {
            const node = Editor.Instance.selectNodes[0];
            const serializedNode = await nodeCRUD().copyNode(node);
            useScene().currentCopy = serializedNode;
        }
    }
    // 粘贴节点
    else if (e.ctrlKey && key === 'v') {
        if (useScene().currentCopy) {
            let parent = Editor.Instance.selectNodes.length > 0 ? Editor.Instance.selectNodes[0] : null;
            // 非shift则粘贴在同层级，shift则粘贴为子节点
            if (!e.shiftKey && parent)
                parent = parent.parent;
            const clone = await nodeCRUD().pasteNode(useScene().currentCopy, parent);
            registerUndoRedo({
                undo: () => {
                    nodeCRUD().deleteNode(clone);
                },
                redo: () => {
                    nodeCRUD().restoreNode(clone);
                }
            });
        }
    }
    // 删除节点
    else if (key == 'delete') {
        if (Editor.Instance.selectNodes.length > 0) {
            let node = Editor.Instance.selectNodes[0];
            // BJS中隐藏
            nodeCRUD().deleteNode(node);
            registerUndoRedo({
                undo: () =>  {
                    nodeCRUD().restoreNode(node);
                },
                redo: () => {
                    nodeCRUD().deleteNode(node);
                },
            })
        }
    }
}

async function onKeyup(e: KeyboardEvent) {
    isShiftHolding = e.shiftKey;
}



</script>
<style scoped lang='scss'>
.scene-list {
    height: 100%;
    display: flex;
    flex-direction: column;

    .title {
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .scene-list-content {
        flex: 1;
        height: 0;
        padding: 0px 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;

        .scene-item {
            position: relative;
            padding-left: 30px;
            padding-top: 5px;
            padding-bottom: 5px;

            &:hover {
                background-color: var(--bg-color-1);
            }

            .svg-icon {
                position: absolute;
                top: 50%;
                left: 3px;
                transform: translateY(-50%);
            }
        }
    }
}

.hierarchy-panel {

    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    gap: 10px;
    padding: 10px;

    .el-input {
        width: 100%;
    }

    .el-tree {
        flex: 1;
        height: 0;
    }

}

.sceneSetting {
    border: 1px solid var(--title--color);
    width: 100%;
    height: 20px;
    line-height: 20px;
    text-align: center;
}

.sceneSetting.selected {
    color: var(--select--color);

}

.tree-node {
    display: flex;
    gap: 10px;
    z-index: 1;
}

.tree-node-active {
    width: 100%;
    height: 100%;
    position: absolute;
    background-color: #2d72d2;
    z-index: 0;
}

:deep(.el-tree-node__content) {
    position:relative;
}
</style>