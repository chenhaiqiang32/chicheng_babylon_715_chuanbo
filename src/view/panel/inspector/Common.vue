<template>
    <SectionField :title="$t('component.common.title')">
        <Field :title="$t('component.common.type')">
            <div class="mesh-type-label">{{ objectType }}</div>
        </Field>
        <StringField :object="props.object" property="name" :label="$t('component.common.name')"
            @change="onNameChanged" />
        <Switch :object="props.object" property="active" :label="$t('component.common.visible')" />
        <Switch v-if="objectType == 'Mesh'" :object="props.object" property="checkCollisions"
            :label="$t('component.common.physics')" />
        <Switch v-if="objectType == 'Mesh'" :object="props.object" property="receiveShadows"
            :label="$t('component.common.receiveShadows')" />
        <Switch v-if="objectType == 'Mesh'" :object="props.object" property="castShadows"
            :label="$t('component.common.castShadows')" @change="onCastShadowsChanged" />
        <!-- <Field :title="$t('component.common.castShadows')">
            <el-switch style="margin-left: auto;" v-model="_castShadows"
                @change="onCastShadowsChanged(_castShadows)" />
        </Field> -->
    </SectionField>
</template>
<script setup lang='ts'>
import { computed, inject, onMounted, ref, watch } from "vue"
import SectionField from '@/component/common/SectionField.vue'
import StringField from '@/component/base/StringField.vue'
import Switch from "@/component/base/Switch.vue";
import Field from "@/component/common/Field.vue";
import { Editor } from "@/3d/Editor";
import { Mesh } from "@babylonjs/core";
const props = defineProps<{ object: any }>()
const objectType = computed(() => {
    if (!props.object) return 'None';
    return props.object.getClassName?.() || 'Unknown';
});
const _castShadows = ref(false)
// const _castShadows = computed(() => {
//     return Editor.Instance.Scene.lights.some((light) => {
//         return light.getShadowGenerator()?.getShadowMap()?.renderList?.includes(props.object);
//     });
// })
const propertyChanged = inject<(property: string, newValue: any, oldValue: any, type: string) => void>('propertyChanged')

function changeProperty(property: string, newValue: any, oldValue: any, type: string) {
    propertyChanged?.(property, newValue, oldValue, type);
}
// function setVisible(visible: boolean) {
//     props.object.isVisible = visible;
//     Editor.Instance.switchNodeActive(props.object.uuid, props.object.isVisible);
//     changeProperty('isVisible', visible, !visible, 'boolean');
// }

function onNameChanged(newName: string) {
    if (!props.object) return;
    Editor.Instance.dispatch('nameChanged', { newName, id: props.object.uuid })
}


function onCastShadowsChanged(v: boolean) {

    if (v) {
        Editor.Instance.shadow.addMeshToShadowGenerator(props.object as Mesh);
    } else {
        Editor.Instance.shadow.removeMeshFromShadowGenerator(props.object);
    }
}


watch(() => props.object, (newObject) => {
    if (!newObject) return;
    if (props.object && Editor.Instance.Scene) {
        _castShadows.value = Editor.Instance.Scene.lights.some((light) => {
            return light.getShadowGenerator()?.getShadowMap()?.renderList?.includes(props.object);
        });
    }
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