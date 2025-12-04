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
            <ElSplitterPanel>.
                <div class="hierarchy-panel">
                    <ElInput size="small" placeholder="搜索" v-model="searchText">
                        <template #prefix>
                            <el-icon>
                                <Search />
                            </el-icon>
                        </template>
                    </ElInput>
                    <div class="sceneSetting" :class="{ selected: sceneSettingVisible }" @click="toggleSceneSetting">{{
                        $t('view.sceneSetting') }}</div>
                    <ElTree :filter-node-method="filterHierarchy" ref="treeRef" @click="handleNodeClick(null)"
                        :data="hierarchy" highlight-current :props="treeProps" node-key="id" :default-expanded="true"
                        :default-active="true" @node-click="handleNodeClick">
                    </ElTree>
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
import SVG from '@/component/common/SVG.vue'



import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Editor } from '@/3d/Editor';
import { Scene } from '@babylonjs/core';

const searchText = ref('');
const treeProps = {
    label: 'name',
}

const { hierarchy, currentSelected, sceneInfoList, currentScene } = storeToRefs(useScene());

const treeRef = ref<InstanceType<typeof ElTree>>()
const sceneSettingVisible = ref(false);
onMounted(() => {
    Editor.Instance.on('nameChanged', onNameChanged)
})

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

watch(searchText, (val) => {
    treeRef.value!.filter(val)
})


function filterHierarchy(value: any, data: TreeNodeData, child: any) {
    if (!value) {
        return true;
    }
    return data.name.includes(value);
}
const toggleSceneSetting = () => {
    sceneSettingVisible.value = !sceneSettingVisible.value;
    if (sceneSettingVisible.value) {
        Editor.Instance.SceneSetting = true;
        currentSelected.value = [];

    } else {
        treeRef.value?.setCurrentKey(null);
        Editor.Instance.SceneSetting = false;
    }
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