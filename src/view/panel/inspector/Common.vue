<template>
    <SectionField :title="$t('component.common.title')">
        <Field :title="$t('component.common.type')">
            <div class="mesh-type-label">{{ objectType }}</div>
        </Field>
        <StringField :object="props.object" property="name" :label="$t('component.common.name')"
            @change="onNameChanged" />
        <Switch :object="props.object" property="isVisible" :label="$t('component.common.visible')"
            @change="setVisible" />
        <Switch v-if="props.object instanceof AbstractMesh" :object="props.object" property="checkCollisions" :label="$t('component.common.physics')"/>
    </SectionField>
</template>
<script setup lang='ts'>
import { computed, onMounted, ref, watch } from "vue"
import SectionField from '@/component/common/SectionField.vue'
import StringField from '@/component/base/StringField.vue'
import Switch from "@/component/base/Switch.vue";
import Field from "@/component/common/Field.vue";
import { Editor } from "@/3d/Editor";
import { AbstractMesh, PhysicsImpostor} from "@babylonjs/core";
const props = defineProps<{ object: any }>()
//const objectType = ref<string>("");
// 计算属性：获取物体类型信息
const objectType = computed(() => {
    if (!props.object) return 'None';
    return props.object.getClassName?.() || 'Unknown';
});
function setVisible(visible: boolean) {
    props.object.isVisible = visible;
    Editor.Instance.switchNodeActive(props.object.uuid, props.object.isVisible);
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