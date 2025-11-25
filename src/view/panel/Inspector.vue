<template>
    <BasePanel title="属性" v-show="selected">
        <div class="block-list">
            <Block title="属性">
                <Field title="名称" helper="请输入名称">
                    <el-input v-model="nodeName" @change="OnNodeChange" placeholder="请输入名称" size="small" />
                </Field>
            </Block>
        </div>

    </BasePanel>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import BasePanel from '@/component/common/BasePanel.vue'
import Block from '@/component/common/Block.vue'
import Field from '@/component/common/Field.vue'
import { useScene } from '@/store/useScene';
import { Vector3, type Node, type TransformNode } from '@babylonjs/core';

import {ElInput, type ElTree, type TreeNodeData} from 'element-plus';
import { storeToRefs } from 'pinia';
import {ref, watch} from 'vue';

const {currentSelected} = storeToRefs(useScene());

// 响应式数据用基础数据结构，保证足够小
let node:TransformNode

let nodeName= ref<string>();
let selected = ref(false);

watch(currentSelected, () => {
    node = Editor.Instance.getNodeById(currentSelected.value[0]) as TransformNode;

    nodeName.value = node?.name;
    selected.value = nodeName.value != "";
})

function OnNodeChange()
{
}

</script>
<style scoped lang='scss'>
.block-list {
    padding: 10px;
}
</style>