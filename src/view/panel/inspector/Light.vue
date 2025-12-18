<!-- 灯光 inspector -->
<template>
    <SectionField :title="$t('component.light.title')">
        <!-- 共有属性 -->
        <Number :label="$t('component.light.intensity')" :object="object" property="intensity"/>
        <Color :label="$t('component.light.diffuse')" :object="object" property="diffuse"/>
        <Color :label="$t('component.light.specular')" :object="object" property="specular"/>

        <template v-if="lightClass === 'DirectionalLight'" >
            <Vector :label="$t('component.light.direction')" :object="object" property="direction"/>
        </template>
        <template v-else-if="lightClass === 'PointLight'">
            <Vector :label="$t('component.light.position')" :object="object" property="position"/>
            <Number :label="$t('component.light.range')" :object="object" property="range"/>
        </template>
        <template v-else-if="lightClass === 'SpotLight'">
            <Vector :label="$t('component.light.position')" :object="object" property="position"/>
            <Vector :label="$t('component.light.direction')" :object="object" property="direction"/>
            <Number :label="$t('component.light.angle')" :object="object" property="angle"/>
        </template>
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import SectionField from '@/component/common/SectionField.vue'
import Number from '@/component/base/Number.vue';
import Color from '@/component/base/Color.vue';
import Vector from '@/component/base/Vector.vue';
import { Light, DirectionalLight, PointLight, SpotLight  } from '@babylonjs/core';

const lightClass = ref<string>(null);

const props = defineProps<{
    object: Light
}>()

watch(() => props.object, (newVal) => {
    lightClass.value = newVal.getClassName();
}, {immediate:true})

onMounted(() => {
    //props.object.specular;
    //var dir = props.object as DirectionalLight;
    //dir.direction;
    //var point = props.object as PointLight;
    //point.radius;

    //spot.range
    //spot.angle
});
onUnmounted(() => {

});

// ==================== 事件 ====================

</script>
<style scoped lang='scss'>
    .active-camera{
        height: 32px;
        display: flex;
        align-items: center;
    }

</style>