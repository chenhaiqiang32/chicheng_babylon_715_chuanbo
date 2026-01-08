<template>
    <SectionField :title="$t('component.camera.title')">
        <Slider v-if="object.fov" :label="$t('component.camera.fov')" :object="object" property="fov" :min="0"
            :max="Math.PI" />
        <Number :label="$t('component.camera.nearClipPlane')" :object="object" property="minZ" />
        <Number :label="$t('component.camera.farClipPlane')" :object="object" property="maxZ" />
        <Slider :label="$t('component.camera.dragResistance')" :object="object" property="inputs.attached.pointers.panningSensibility"
        :min="1" :max="1000"  />
        <Number v-if="object instanceof UniversalCamera" :label="$t('component.camera.speed')" :object="object"
            property="speed" />
        <Switch v-if="object instanceof UniversalCamera" :label="$t('component.camera.collision')" :object="object"
            property="checkCollisions" />
        <Switch v-if="object instanceof UniversalCamera" :label="$t('component.camera.gravity')" :object="object"
            property="applyGravity" @change="onGravity" />
        <div class="active-camera">
            <ElButton style="margin-left: auto; margin-right: 10px;" type="info" size="small" @click="activeCamera">
                激活当前摄像机</ElButton>
        </div>
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue';
import SectionField from '@/component/common/SectionField.vue'
import Slider from '@/component/base/Slider.vue';
import Number from '@/component/base/Number.vue';
import Switch from '@/component/base/Switch.vue';
import { ElButton } from 'element-plus';
import { Editor } from '@/3d/Editor';
import { UniversalCamera } from '@babylonjs/core';



import { ArcRotateCamera, Camera } from '@babylonjs/core';
import { FirstPersonJump } from '@/3d/core/utils/FirstPersonJump';


const props = defineProps<{
    object: Camera
}>()

// ==================== 响应式数据 ====================

// ==================== 生命周期钩子 ====================
onMounted(() => {

});
onUnmounted(() => {

});

// ==================== 事件 ====================
function activeCamera() {
    if (props.object) {
        Editor.Instance.activeCamera(props.object);
    }
}

function onGravity() {

}

</script>
<style scoped lang='scss'>
.active-camera {
    height: 32px;
    display: flex;
    align-items: center;
}
</style>