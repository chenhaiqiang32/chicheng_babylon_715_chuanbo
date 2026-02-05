<template>
    <BasePanel title="属性">
        <el-scrollbar class="scrollbar">
            <div style="padding:  0 10px;">
                <component v-for="comp in comps" :key="comp.uniqueId" :is="comp" :object="selectedObject" />
            </div>
        </el-scrollbar>
    </BasePanel>
</template>
<script setup lang='ts'>
import BasePanel from '@/component/common/BasePanel.vue'
import Common from './inspector/Common.vue'
import Physics from './inspector/Physics.vue'
import { watch, shallowRef, computed, provide, toRaw } from 'vue'
import { storeToRefs } from 'pinia';
import { useScene } from '@/store/useScene';
import { Editor } from '@/3d/Editor';
import MaterialInspectorRouter from './inspector/material/MaterialRouter.vue'
import Transform from './inspector/Transform.vue'
import CameraComp from './inspector/Camera.vue'
import Event from './inspector/Event.vue'
import { Camera, Light, Material, Mesh, Node, TransformNode } from '@babylonjs/core';
import { _EventBus } from '@/utils/dispatch';
import LightComp from './inspector/Light.vue';
import CustomData from './inspector/CustomData.vue';
const { currentSelected, currentSelectResNode } = storeToRefs(useScene());
import { RuntimeLibrary } from "@/3d/assets/RuntimeLibrary";
import { MultiSelectedObject } from '@/3d/core/utils/MultiSelectedObject';
const selectedObject = shallowRef<any>(null);
const oldSelect = shallowRef<any>(null);
const oldResSelect = shallowRef<any>(null);
const multiSelectedObject = new MultiSelectedObject();
function propertyChanged(property: string, newValue: any, oldValue: any, type: string) {
    _EventBus.dispatch('onPropertyChanged', {
        object: toRaw(selectedObject.value),
        property,
        type,
        newValue,
        oldValue
    })
}
provide('propertyChanged', propertyChanged);

watch(currentSelected, (newSelected) => {
    if (newSelected && newSelected.length > 0) {
        const objectId = newSelected[0];
        const sceneObject = Editor.Instance.getNodeById(objectId);
        if (sceneObject) {
            selectedObject.value = sceneObject;
            oldSelect.value = sceneObject;
        }
        // if(newSelected.length == 1){
        //     const cur = Editor.Instance.getNodeById(newSelected[0]);
        //     selectedObject.value = cur;
        //     oldSelect.value = cur;
        // } else {
        //     let sceneObject: Node[] = [];
        //     newSelected.forEach((x:string) => {
        //         sceneObject.push(Editor.Instance.getNodeById(x));
        //     })
    } else {
        selectedObject.value = null;
        selectedObject.value = oldResSelect.value;
        oldSelect.value = null;
    }
}, { immediate: true });
watch(currentSelectResNode, (newObject) => {
    RuntimeLibrary.Instance.getMaterial(newObject).then(res => {
        const sceneResObject = res;
        if (sceneResObject) {
            selectedObject.value = sceneResObject;
            oldResSelect.value = sceneResObject;
        } else {
            selectedObject.value = null;
            selectedObject.value = oldSelect.value;
            oldResSelect.value = null;
        }
    });

})


const comps = computed(() => {
    if (!selectedObject.value) {
        return []
    }
    const arr = []
    //multiSelectedObject.Nodes = selectedObject.value;
    //if(multiSelectedObject.MultiType?.includes("TransformNode"))
    //    arr.push(Common, Transform);
    if (selectedObject.value instanceof Material) {
        arr.push(MaterialInspectorRouter)
    }

    if (selectedObject.value instanceof TransformNode) {
        arr.push(Common, Transform)
        // console.log(selectedObject.value);

    }
    if (selectedObject.value instanceof Mesh) {
        arr.push(MaterialInspectorRouter)
        arr.push(Physics)
    }
    if (selectedObject.value instanceof Camera) {
        arr.push(CameraComp)
    }
    if (selectedObject.value instanceof Light) {
        arr.push(LightComp)
    }
    arr.push(Event)
    arr.push(CustomData)
    return arr
})





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
