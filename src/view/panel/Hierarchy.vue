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
                <div class="hierarchy-panel" @contextmenu="contextMenu">
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
                                :data="hierarchy" highlight-current :props="treeProps" node-key="id"
                                :default-expanded="true" :default-active="true" @node-click="handleNodeClick">
                                <template #default="{ node, data }">
                                    <div class="tree-node">
                                        <SVG size="14" :name="iconMap[data.type]" ></SVG>
                                        {{ data.name }}
                                    </div>
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
import { ElInput, ElMessageBox, type ElTree, type TreeNodeData } from 'element-plus';
import { Search } from '@element-plus/icons-vue'



import { storeToRefs } from 'pinia';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { Editor } from '@/3d/Editor';
import SVG from '@/component/common/SVG.vue';
import { useDialog } from '../dialog';
import { openContextMenu } from '@/component/content-menu';
import { Camera } from '@babylonjs/core';

const searchText = ref('');
const treeProps = {
    label: 'name',
}

const { hierarchy, currentSelected, sceneInfoList, currentScene } = storeToRefs(useScene());

const treeRef = ref<InstanceType<typeof ElTree>>()
const sceneSettingVisible = ref(false);

const iconMap: Record<string, string> = {
    ArcRotateCamera: "cameraIcon",
    DirectionalLight: "lightIcon",
    Mesh: "meshIcon",
    TransformNode: "meshIcon"
}

onMounted(() => {
    Editor.Instance.on('nameChanged', onNameChanged)

})

function contextMenu(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault()
    openContextMenu({
        position: {
            x: e.clientX,
            y: e.clientY
        },
        commands: [
            {
                name: '添加场景',
                callback: () => {
                    console.log('添加场景');
                },
            },
            {
                name: '添加节点',
                subCommand: [{
                    name: '添加空节点',
                    callback: () => {
                        console.log('添加空节点');
                    }
                }, {
                    name: '添加空节点2',
                    callback: () => {
                        console.log('添加空节点2');
                    }
                }]
            },
            {
                name: '添加相机',
                callback: () => {
                    addCamera();
                },
            }
        ]
    })

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
    currentSelected.value = [];
    Editor.Instance.setCurrentScene(scene);
}


function onNameChanged(node: { id: string, newName: string }) {
    const treeNode = treeRef.value.getNode(node.id);
    if (treeNode) {
        treeNode.data.name = node.newName;
    }
}

const handleNodeClick = (node: HierarchyNode) => {
    currentSelected.value = node ? [node.id] : [];
    if (node) {
        treeRef.value?.setCurrentKey(node.id);
        sceneSettingVisible.value = false;
    } else {
        treeRef.value?.setCurrentKey(null);
    }
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

function addCamera()
{
    Editor.Instance.addCamera();
    const scene = Editor.Instance['scene'];
    useScene().setHierarchy(scene.rootNodes);
}

onUnmounted(() => {

})


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
</style>