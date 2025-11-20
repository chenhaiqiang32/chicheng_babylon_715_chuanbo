<template>
    <BasePanel title="层级">
        <div class="hierarchy-panel">
            <ElInput size="small" placeholder="搜索">

            </ElInput>
            <ElTree ref="treeRef" :data="hierarchy" highlight-current :props="treeProps" node-key="id"
                :default-expanded="true" :default-active="true" @node-click="handleNodeClick">
            </ElTree>
        </div>
    </BasePanel>
</template>
<script setup lang='ts'>
import BasePanel from '@/component/common/BasePanel.vue'
import { useScene } from '@/store/useScene';
import { ElInput, type ElTree } from 'element-plus';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const treeProps = {
    label: 'name',
}

const { hierarchy, currentSelected } = storeToRefs(useScene());

const treeRef = ref<InstanceType<typeof ElTree>>()

const handleNodeClick = (node: HierarchyNode) => {
    currentSelected.value = [node.id];
}
</script>
<style scoped lang='scss'>
.hierarchy-panel {
    display: flex;
    flex-direction: column;
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
</style>