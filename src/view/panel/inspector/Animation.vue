<template>
    <SectionField :title="$t('component.animation.title')">
        <div class="animation-list">

        </div>
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, } from 'vue';
import { Node } from '@babylonjs/core';
import SectionField from '@/component/common/SectionField.vue';

const props = defineProps<{
    object: Node
}>();


onMounted(() => {
    props.object.animations
});
onUnmounted(() => {

});
</script>
<style scoped lang='scss'></style>