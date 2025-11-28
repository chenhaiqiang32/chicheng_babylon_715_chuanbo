<template>
    <BasePanel :title="$t('view.hierarchy')">
        <div class="hierarchy-panel">
            <ElInput size="small" placeholder="搜索" v-model="searchText">
                <template #prefix>
                    <el-icon>
                        <Search />
                    </el-icon>
                </template>
            </ElInput>
            <ElTree :filter-node-method="filterHierarchy" ref="treeRef" @click="handleNodeClick(null)" :data="hierarchy"
                highlight-current :props="treeProps" node-key="id" :default-expanded="true" :default-active="true"
                @node-click="handleNodeClick">
            </ElTree>
        </div>
    </BasePanel>
</template>
<script setup lang='ts'>
import BasePanel from '@/component/common/BasePanel.vue'
import { useScene } from '@/store/useScene';
import { ElInput, type ElTree, type TreeNodeData } from 'element-plus';
import { Search } from '@element-plus/icons-vue'

import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Editor } from '@/3d/Editor';

const searchText = ref('');
const treeProps = {
    label: 'name',
}

const { hierarchy, currentSelected } = storeToRefs(useScene());

const treeRef = ref<InstanceType<typeof ElTree>>()

onMounted(() => {
    Editor.Instance.on('nameChanged', onNameChanged)
})

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


onUnmounted(() => {

})


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