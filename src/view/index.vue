<template>
    <div class="editor-container">
        <Header></Header>
        <ElSplitter :lazy="true" style="height: 0 ; flex: 1;">
            <ElSplitterPanel min="600px">
                <ElSplitter :lazy="true" layout="vertical">
                    <ElSplitterPanel>
                        <ElSplitter :lazy="true">
                            <ElSplitterPanel min="280px" :size="editorLayout.left + 'px'" collapsible
                                @update:size="e => sizeChange(e, 'left')">
                                <Hierarchy />
                            </ElSplitterPanel>
                            <ElSplitterPanel min="280px">
                                <Scene />
                            </ElSplitterPanel>
                        </ElSplitter>
                    </ElSplitterPanel>
                    <ElSplitterPanel min="280px" :size="editorLayout.bottom + 'px'" collapsible
                        @update:size="e => sizeChange(e, 'bottom')">
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
                @update:size="e => sizeChange(e, 'right')">
                <Inspector />
            </ElSplitterPanel>
        </ElSplitter>
        <!-- <Loading :progress="loading"> </Loading> -->
    </div>
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
import SetupDialog from './dialog/SetupDialog.vue'
import { onMounted, ref } from 'vue'
import BasePanel from '@/component/common/BasePanel.vue'
onMounted(() => {
    useDialog(SetupDialog)
})
const activeTab = ref('assets')

const { editorLayout } = storeToRefs(useEditor());

const { loading } = storeToRefs(useEditor());


function sizeChange(size: number, type: 'left' | 'bottom' | 'right') {
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
