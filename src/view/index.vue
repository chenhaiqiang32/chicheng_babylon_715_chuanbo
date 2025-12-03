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
                        <el-tabs type="border-card">
                            <el-tab-pane label="资源">
                                <Assets />
                            </el-tab-pane>
                            <el-tab-pane label="动画">
                                <Animation />
                            </el-tab-pane>
                        </el-tabs>
                    </ElSplitterPanel>
                </ElSplitter>
            </ElSplitterPanel>
            <ElSplitterPanel min="280px" :size="editorLayout.right + 'px'" collapsible
                @update:size="e => sizeChange(e, 'right')">
                <Inspector />
            </ElSplitterPanel>
        </ElSplitter>
    </div>
</template>
<script setup lang='ts'>
import Header from './Header.vue'
import Scene from './panel/Scene.vue'

import Animation from './panel/Animation.vue'
import Assets from './panel/Assets.vue'
import Inspector from './panel/Inspector.vue'
import Hierarchy from './panel/Hierarchy.vue'
import { ElTabPane } from 'element-plus';
import { storeToRefs } from 'pinia';
import { useEditor } from '@/store/useEditor';

import { useDialog } from './dialog/index';
import SetupDialog from './dialog/SetupDialog.vue'

import { onMounted } from 'vue'


onMounted(() => {
    useDialog(SetupDialog)
})


const { editorLayout } = storeToRefs(useEditor());

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

    .el-tabs {
        height: 100%;
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
