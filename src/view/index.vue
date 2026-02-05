<template>
    <ElConfigProvider :locale="zhCn">
        <div class="editor-container">
            <Header v-show="edit"></Header>
            <ElSplitter :lazy="true" style="height: 0 ; flex: 1;">
                <ElSplitterPanel min="600px">
                    <ElSplitter :lazy="true" layout="vertical">
                        <ElSplitterPanel>
                            <ElSplitter :lazy="true">
                                <ElSplitterPanel min="280px" :size="editorLayout.left + 'px'" collapsible
                                    @update:size="e => sizeChange(e, 'left')" v-if="edit">
                                    <Hierarchy />
                                </ElSplitterPanel>
                                <ElSplitterPanel min="280px">
                                    <Scene />
                                </ElSplitterPanel>
                            </ElSplitter>
                        </ElSplitterPanel>
                        <ElSplitterPanel min="280px" :size="editorLayout.bottom + 'px'" collapsible
                            @update:size="e => sizeChange(e, 'bottom')" v-if="edit">
                            <div class="tab-container-panel">
                                <div class="tab-title">
                                    <div class="item" :class="{ 'active': activeTab === 'assets' }"
                                        @click="activeTab = 'assets'">资产</div>
                                    <div class="item" :class="{ 'active': activeTab === 'animation' }"
                                        @click="activeTab = 'animation'">动画</div>
                                </div>
                                <div class="tab-content">
                                    <Assets v-if="activeTab === 'assets'" />
                                    <Animation v-else-if="activeTab === 'animation'" />
                                </div>
                            </div>
                        </ElSplitterPanel>
                    </ElSplitter>
                </ElSplitterPanel>
                <ElSplitterPanel min="280px" :size="editorLayout.right + 'px'" collapsible
                    @update:size="e => sizeChange(e, 'right')" v-if="edit">
                    <Inspector />
                </ElSplitterPanel>
            </ElSplitter>
            <Loading :progress="loading" v-if="loading > 0 && loading < 1"> </Loading>
        </div>
    </ElConfigProvider>
</template>
<script setup lang='ts'>
import Header from './Header.vue'
import Scene from './panel/Scene.vue'
import Animation from './panel/Animation.vue'
import Assets from './panel/Assets.vue'
import Inspector from './panel/Inspector.vue'
import Hierarchy from './panel/Hierarchy.vue'
import { storeToRefs } from 'pinia';
import { useEditor } from '@/store/useEditor';
import { useDialog } from './dialog/index';
import Loading from '@/component/common/Loading.vue'
import SetupDialog from './dialog/SetupDialog.vue'
import { onMounted, ref } from 'vue'
import { EditorFileSystem, FileMode } from '@/3d/assets/file/IFile'
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary'
import { Editor } from '@/3d/Editor'
import { useScene } from '@/store/useScene'
import { ArcRotateCamera } from '@babylonjs/core'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
const props = defineProps<{
    edit?: boolean,
    projectId?: string,
}>()
onMounted(() => {
    useEditor().edit = props.edit;
    if (!props.projectId) {
        useDialog(SetupDialog)
    } else {
        loadProject(props.projectId)
    }
})
const activeTab = ref('assets')
const { editorLayout } = storeToRefs(useEditor());
const { loading, edit } = storeToRefs(useEditor());

async function loadProject(name: string) {
    await EditorFileSystem.Instance.init(FileMode.ZIP, name);
    const sceneList = await RuntimeLibrary.Instance.loadAssets((v) => {

    });
    if (sceneList.length > 0) {
        useScene().setSceneList(sceneList);
        await Editor.Instance.setCurrentScene(sceneList[0].uuid, (v) => {
            loading.value = v;
        });
    } else {
        const scene = await Editor.Instance.createNewScene('默认场景');
        await useScene().addScene(scene);
        await Editor.Instance.setCurrentScene(scene.uuid);
    }
    if (!edit.value) {
        const camera = Editor.Instance.Scene.activeCamera as ArcRotateCamera;
        camera.useAutoRotationBehavior = true;
        camera.autoRotationBehavior.idleRotationSpeed = -0.5;
    }
}


function sizeChange(size: number, type: 'left' | 'bottom' | 'right') {
    if (size <= 0) return;
    editorLayout.value[type] = size;

}

</script>
<style scoped lang='scss'>
.editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;

    .tab-container-panel {
        height: 100%;
        display: flex;
        flex-direction: column;

        .tab-title {
            height: 32px;
            line-height: 32px;
            display: flex;
            gap: 20px;
            padding-left: 10px;
            border-bottom: 1px solid var(--el-border-color);

            .item {
                cursor: pointer;

                &.active {
                    color: var(--el-color-primary);
                }
            }
        }

        .tab-content {
            flex: 1;
            height: 0;
            position: relative;
        }
    }




}
</style>
<style lang='scss'>
.editor-container {
    .el-tab-pane {
        height: 100%;
    }

    .el-tabs__item {
        padding-left: 12px !important;
        padding-right: 12px !important;

    }

    .el-tabs--border-card>.el-tabs__content {
        padding: 0px;
    }
}
</style>
