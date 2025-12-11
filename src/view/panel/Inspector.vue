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
import { ref, watch, KeepAlive, shallowRef, onMounted, onUnmounted, computed } from 'vue'
import { storeToRefs } from 'pinia';
import { useScene } from '@/store/useScene';
import { Editor } from '@/3d/Editor';
import MaterialInspectorRouter from './inspector/material/MaterialRouter.vue'
import Transform from './inspector/Transform.vue'
import CameraComp from './inspector/Camera.vue'
import SceneSetting from './inspector/SceneSetting.vue';
import { Camera, Mesh, TransformNode } from '@babylonjs/core';
const { currentSelected } = storeToRefs(useScene());
const sceneSettingVisible = ref(Editor.Instance.SceneSetting);
const selectedObject = shallowRef<any>(null);

watch(currentSelected, (newSelected) => {
    if (newSelected && newSelected.length > 0) {
        const objectId = newSelected[0];
        const sceneObject = Editor.Instance.getNodeById(objectId);
        if (sceneObject) {
            selectedObject.value = sceneObject;
        }
    } else {
        selectedObject.value = null;
    }
}, { immediate: true });


const comps = computed(() => {
    if (!selectedObject.value) {
        return []
    }
    const arr = []
    if (selectedObject.value instanceof TransformNode) {
        arr.push(Common, Transform)
    }
    if (selectedObject.value instanceof Mesh) {
        arr.push(MaterialInspectorRouter)
    }
    if (selectedObject.value instanceof Camera) {
        arr.push(CameraComp)
    }
    return arr
})

const handleSceneSettingChanged = (v: boolean) => {
    sceneSettingVisible.value = v;
}

onMounted(() => {
    Editor.Instance.on('sceneSettingChanged', handleSceneSettingChanged)
})

onUnmounted(() => {
    Editor.Instance.off('sceneSettingChanged', handleSceneSettingChanged)
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
