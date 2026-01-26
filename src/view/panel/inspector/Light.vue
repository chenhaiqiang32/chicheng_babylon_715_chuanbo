<!-- 灯光 inspector -->
<template>
    <SectionField :title="$t('component.light.title')">
        <!-- 共有属性 -->
        <Number :label="$t('component.light.intensity')" :object="object" property="intensity" />
        <Color :label="$t('component.light.diffuse')" :object="object" property="diffuse" />
        <Color :label="$t('component.light.specular')" :object="object" property="specular" />

        <Vector ref="positionRef" :label="$t('component.light.position')" :object="object" property="position" />
        <Vector ref="rotationRef" :label="$t('component.light.direction')" :object="object" property="direction" />
        <template v-if="lightClass === 'DirectionalLight'">
        </template>
        <template v-else-if="lightClass === 'PointLight'">
            <Number :label="$t('component.light.range')" :object="object" property="range" />
        </template>
        <template v-else-if="lightClass === 'SpotLight'">
            <Number :label="$t('component.light.angle')" :object="object" property="angle" />
        </template>
        <!-- <Switch :label="$t('component.light.shadow')" :object="object" property="shadow" @change="onShadowChanged" /> -->
<LightShdows :light="object as IShadowLight" />
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import SectionField from '@/component/common/SectionField.vue'
import Number from '@/component/base/Number.vue';
import Color from '@/component/base/Color.vue';
import Vector from '@/component/base/Vector.vue';
import { Light, DirectionalLight, PointLight, SpotLight, TransformNode, LightGizmo, Node, IShadowLight } from '@babylonjs/core';
import { Editor } from '@/3d/Editor';
import Switch from '@/component/base/Switch.vue';
import LightShdows from './shadows/LightShdows.vue';

const lightClass = ref<string>(null);

const positionRef = ref<InstanceType<typeof Vector>>();
const rotationRef = ref<InstanceType<typeof Vector>>()

const props = defineProps<{
    object: Light
}>()

watch(() => props.object, (newVal) => {
    lightClass.value = newVal.getClassName();
}, { immediate: true })

onMounted(() => {
    Editor.Instance.on('onPositionChanged', onPositionChanged);
    Editor.Instance.on('onRotationChanged', onRotationChanged);
});
onUnmounted(() => {
});

// ==================== 事件 ====================

function onPositionChanged(e: { object: TransformNode }) {
    if (e.object === props.object.gizmo.attachedMesh) {
        positionRef.value?.syncFromObject();
    }
} 

function onRotationChanged(e: { object: TransformNode }) {
    if (e.object === props.object.gizmo.attachedMesh) {
        rotationRef.value?.syncFromObject()
    }
}

function onShadowChanged(v: boolean) {
    if (v) {
      //  Editor.Instance.shadow.openShadow(props.object as DirectionalLight | PointLight | SpotLight);
    } else {
       // Editor.Instance.shadow.closeShadow(props.object as DirectionalLight | PointLight | SpotLight);
    }
}

</script>
<style scoped lang='scss'>
.active-camera {
    height: 32px;
    display: flex;
    align-items: center;
}
</style>