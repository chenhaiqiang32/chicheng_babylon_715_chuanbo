<template>
    <BasePanel title="属性" v-show="selected">
        <div class="block-list">
            <Block title="属性">
                <Field title="名称" helper="请输入名称">
                    <el-input v-model="nodeName" @change="OnNodeChange" placeholder="请输入名称" size="small" />
                </Field>
                <Field title="位置">
                    <div class="translate-content">
                        <el-input v-model="transform.position.x"/>
                        <el-input v-model="transform.position.y"/>
                        <el-input v-model="transform.position.z"/>
                    </div>
                </Field>
                <Field title="旋转">
                    <div class="translate-content">
                        <el-input v-model="transform.rotation.x"/>
                        <el-input v-model="transform.rotation.y"/>
                        <el-input v-model="transform.rotation.z"/>
                    </div>
                </Field>
                <Field title="缩放">
                    <div class="translate-content">
                        <el-input v-model="transform.scale.x"/>
                        <el-input v-model="transform.scale.y"/>
                        <el-input v-model="transform.scale.z"/>
                    </div>
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
import { Scene, Vector3, type Node, type TransformNode } from '@babylonjs/core';

import {ElInput, type ElTree, type TreeNodeData} from 'element-plus';
import { storeToRefs } from 'pinia';
import {reactive, ref, watch} from 'vue';

const {currentSelected} = storeToRefs(useScene());

// 响应式数据用基础数据结构，保证足够小
let node:TransformNode

let nodeName= ref<string>();
let selected = ref(false);

const transform = {
    position: reactive({x:0, y:0, z:0}),
    rotation: reactive({x:0, y:0, z:0}),
    scale: reactive({x:0, y:0, z:0}),
};

let positionObserver : any = null;

function syncTransform(node: TransformNode)
{
    transform.position.x = node.position.x;
    transform.position.y = node.position.y;
    transform.position.z = node.position.z;

    transform.rotation.x = node.rotationQuaternion.x;
    transform.rotation.y = node.rotationQuaternion.y;
    transform.rotation.z = node.rotationQuaternion.z;

    transform.scale.x = node.scaling.x;
    transform.scale.y = node.scaling.y;
    transform.scale.z = node.scaling.z;
}

watch(currentSelected, () => {
    if(positionObserver){
        positionObserver.remove();
        positionObserver = null;
    }

    node = Editor.Instance.getNodeById(currentSelected.value[0]) as TransformNode;
    if(node == null) return;

    nodeName.value = node?.name;
    selected.value = nodeName.value != "";

    syncTransform(node);

    const scene = Editor.Instance['scene'] as Scene;
    positionObserver = scene.onBeforeRenderObservable.add(() => {
        syncTransform(node);
    })
})

function OnNodeChange()
{
}

</script>
<style scoped lang='scss'>
.block-list {
    padding: 10px;

    .translate-content {
        display: flex;
        flex-direction: row;
        gap: 5px;
    }
}

</style>