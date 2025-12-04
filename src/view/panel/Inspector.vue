<template>
    <BasePanel title="属性">
        <el-scrollbar class="scrollbar">
            <div style="padding:  0 10px;">
                <KeepAlive>
                    <Common v-if="selectedObject" :object="selectedObject" />
                </KeepAlive>
                <KeepAlive>
                    <Transform v-if="selectedObject" :object="selectedObject" />
                </KeepAlive>
                <!-- <KeepAlive>
                    <Collision v-if="selectedObject?.geometry" :object="selectedObject" />
                </KeepAlive> -->
                <KeepAlive>
                    <MaterialInspectorRouter v-if="selectedObject?.material" :mesh="selectedObject"
                        :material="selectedObject.material" />
                </KeepAlive>
                <KeepAlive>
                    <SceneSetting v-if="sceneSettingVisible && !selectedObject" :object="Editor.Instance.Scene" />
                </KeepAlive>
            </div>
        </el-scrollbar>
    </BasePanel>
</template>
<script setup lang='ts'>
import BasePanel from '@/component/common/BasePanel.vue'
import Common from './inspector/Common.vue'
import { isNode } from '@/tools/guards/nodes.ts';
import { ref, watch, computed, KeepAlive, shallowRef, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia';
import { useScene } from '@/store/useScene';
import { Editor } from '@/3d/Editor';
import MaterialInspectorRouter from './inspector/material/MaterialRouter.vue'
import Transform from './inspector/Transform.vue'
import SceneSetting from './inspector/SceneSetting.vue';
const { currentSelected } = storeToRefs(useScene());
const editedObject = ref<any | null>(null)
const sceneSettingVisible = ref(Editor.Instance.SceneSetting);
const disabled = computed(() => !!(editedObject.value && isNode(editedObject.value)))

const setEditedObject = (obj: any) => {
    editedObject.value = obj;
    selectedObject.value = obj;
}

defineExpose({ setEditedObject })

// 当前选中的对象
const selectedObject = shallowRef<any>(null);

// 监听 currentSelected 变化，更新选中的对象
watch(currentSelected, (newSelected) => {
    console.log('newSelected', currentSelected);

    if (newSelected && newSelected.length > 0) {
        const objectId = newSelected[0];
        try {
            const sceneObject = Editor.Instance.getNodeById(objectId);
            console.log('sceneObject', sceneObject);

            if (sceneObject) {
                selectedObject.value = sceneObject;
                editedObject.value = sceneObject;
            }
        } catch (error) {
            selectedObject.value = null;
            editedObject.value = null;
        }
    } else {
        selectedObject.value = null;
        editedObject.value = null;
    }
}, { immediate: true });

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
