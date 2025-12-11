<template>
    <SectionField :title="$t('component.camera.title')">
        <Slider v-if="object.fov" :label="$t('component.camera.fov')" :object="object" property="fov" :min="0"
            :max="Math.PI" />
        <Number :label="$t('component.camera.nearClipPlane')" :object="object" property="minZ" />
        <Number :label="$t('component.camera.farClipPlane')" :object="object" property="maxZ" />
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue';
import SectionField from '@/component/common/SectionField.vue'
import Slider from '@/component/base/Slider.vue';
import Number from '@/component/base/Number.vue';



import { ArcRotateCamera, Camera } from '@babylonjs/core';


const props = defineProps<{
    object: Camera
}>()

// ==================== 响应式数据 ====================

// ==================== 生命周期钩子 ====================
onMounted(() => {

});
onUnmounted(() => {

});
</script>
<style scoped lang='scss'></style>