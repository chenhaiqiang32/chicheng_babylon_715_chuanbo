<template>
    <SectionField :title="$t('component.scripts.title')">
        <div class="drop-box">
            {{ $t('component.scripts.drop') }}
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
<style scoped lang='scss'>
.drop-box {
    height: 50px;
    margin: 5px;
    border: 1px dashed var(--border-color);
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--el-text-color-secondary);
}
</style>