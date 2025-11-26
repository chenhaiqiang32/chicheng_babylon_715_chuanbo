<template>
    <BasePanel title="属性">
        <KeepAlive>
            <Common v-if="selectedObject" :object="selectedObject" />
        </KeepAlive>
        <KeepAlive>
            <Transform :editor="props.editor" :object="selectedObject" />
        </KeepAlive>
        <KeepAlive>
            <Collision v-if="selectedObject?.geometry" :editor="props.editor" :object="selectedObject" />
        </KeepAlive>
        <KeepAlive>
            <MaterialInspectorRouter v-if="selectedObject?.geometry" :mesh="selectedObject"
                :material="selectedObject.material" :editor="props.editor" />
        </KeepAlive>
    </BasePanel>
</template>
<script setup lang='ts'>
import BasePanel from '@/component/common/BasePanel.vue'
import Common from '@/component/base/Common.vue'
import { isNode } from '@/tools/guards/nodes.ts';
import { ref, reactive, watch, computed, KeepAlive } from 'vue'
import { storeToRefs } from 'pinia';
import { useScene } from '@/store/useScene';
import { Editor } from '@/3d/Editor';
import MaterialInspectorRouter from '@/component/material/MaterialRouter.vue'
import Transform from '@/component/base/Transform.vue'
import Collision from '@/component/base/Collision.vue'
const { currentSelected } = storeToRefs(useScene());
const props = defineProps<{ editor: any }>()
const activeTab = ref("entity")
const search = ref("")
const editedObject = ref<any | null>(null)

const disabled = computed(() => !!(editedObject.value && isNode(editedObject.value)))

const setEditedObject = (obj: any) => {
    editedObject.value = obj;
    selectedObject.value = obj;
}

defineExpose({ setEditedObject })

// 当前选中的对象
const selectedObject = ref<any>(null);

// 监听 currentSelected 变化，更新选中的对象
watch(currentSelected, (newSelected) => {
    console.log('currentSelected 变化:', newSelected.values);

    if (newSelected && newSelected.length > 0) {
        // 获取第一个选中的对象
        const objectId = newSelected[0];
        console.log('设置选中对象:', objectId);

        try {
            const sceneObject = Editor.Instance.getNodeById(objectId);
            if (sceneObject) {
                selectedObject.value = sceneObject;
                editedObject.value = sceneObject;

            }
        } catch (error) {
            console.warn('无法获取选中的对象:', error);
            selectedObject.value = null;
            editedObject.value = null;
        }
    } else {
        selectedObject.value = null;
        editedObject.value = null;
    }
}, { immediate: true });

// 监听 editor 变化
watch(() => props.editor, (newEditor) => {
    if (newEditor && currentSelected.value && currentSelected.value.length > 0) {
        const objectId = currentSelected.value[0];
        try {
            const sceneObject = newEditor.getNodeById(objectId);
            if (sceneObject) {
                selectedObject.value = sceneObject;
                editedObject.value = sceneObject;
            }
        } catch (error) {
            console.warn('无法获取选中的对象:', error);
            selectedObject.value = null;
            editedObject.value = null;
        }
    }
});


</script>
<style scoped lang='scss'>
.block-list {
    padding: 10px;
}
</style>