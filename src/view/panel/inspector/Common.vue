<template>
    <SectionField title="Common">
        <Field title="Type">
            <div class="mesh-type-label">{{ objectType }}</div>
        </Field>
        <StringField :object="props.object" property="name" label="Name"
            @change="() => onNodeModifiedObservable.notifyObservers(object)" />
        <Switch :object="props.object" property="isVisible" label="Visible" />
    </SectionField>
</template>
<script setup lang='ts'>
import { computed, ref, watch } from "vue"
import SectionField from '@/component/common/SectionField.vue'
import StringField from '@/component/base/StringField.vue'
import Switch from "@/component/base/Switch.vue";
import { onNodeModifiedObservable } from "@/tools/observables"
import {
    Vector3,
    Node,
    InstancedMesh,
} from '@babylonjs/core';
import Field from "@/component/common/Field.vue";
const props = defineProps<{ object: any | null }>()
//const objectType = ref<string>("");
// 计算属性：获取物体类型信息
const objectType = computed(() => {
    console.log(props.object);

    if (!props.object) return 'None';

    return props.object.getClassName?.() || 'Unknown';
});

const isInstanced = computed(() => props.object instanceof InstancedMesh)
function isInstancedMesh(object: any): object is InstancedMesh {
    return object.getClassName?.() === "InstancedMesh";
}
watch(() => props.object, (newObject) => {
    console.log(newObject);
    if (!newObject) return;
}, { immediate: true })
</script>
<style scoped lang='scss'>
.common-list {
    // padding: 10px;
    background-color: var(--bg-color-1);
}

.mesh-type-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
}

.mesh-type-left {
    width: 50%;
    color: var(--title--color);
}

.mesh-type-right {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.mesh-type-label {
    color: rgba(255, 255, 255, 0.5);
}
</style>