<template>
    <SectionField :title="$t('component.common.title')">
        <Field :title="$t('component.common.type')">
            <div class="mesh-type-label">{{ objectType }}</div>
        </Field>
        <StringField :object="props.object" property="name" :label="$t('component.common.name')"
            @change="onNameChanged" />
        <Switch :object="props.object" property="isVisible" :label="$t('component.common.visible')"
            @change="setVisible" />
    </SectionField>
</template>
<script setup lang='ts'>
import { computed, ref, watch } from "vue"
import SectionField from '@/component/common/SectionField.vue'
import StringField from '@/component/base/StringField.vue'
import Switch from "@/component/base/Switch.vue";
import { onNodeModifiedObservable } from "@/tools/observables"
import Field from "@/component/common/Field.vue";
import { Editor } from "@/3d/Editor";
const props = defineProps<{ object: any | null }>()
//const objectType = ref<string>("");
// 计算属性：获取物体类型信息
const objectType = computed(() => {
    if (!props.object) return 'None';
    return props.object.getClassName?.() || 'Unknown';
});
function setVisible(visible: boolean) {
    props.object.setEnabled(visible)
    onNodeModifiedObservable.notifyObservers(props.object)
}

function onNameChanged(newName: string) {

    if (!props.object) return;
    Editor.Instance.dispatch('nameChanged', { newName, id: props.object.id })
}


watch(() => props.object, (newObject) => {
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