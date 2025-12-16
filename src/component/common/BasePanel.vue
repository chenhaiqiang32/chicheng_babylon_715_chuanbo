<template>
    <div class="base-panel">
        <div class="panel-header">
            <slot name="header"></slot>
            <span name="header" v-if="title">{{ title }}</span>
        </div>
        <div class="panel-content" :style="containerStyle">
            <slot></slot>
        </div>
    </div>
</template>
<script setup lang='ts'>
import { CSSProperties } from 'vue';

const props = defineProps<{
    title?: string,
    containerStyle?: CSSProperties
}>()
</script>
<style scoped lang='scss'>
.base-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;


    .panel-header {
        height: 32px;
        line-height: 32px;
        padding: 0 12px;
        border-bottom: 1px solid var(--el-border-color);
    }

    .panel-content {
        flex: 1;
        height: 0;
        //   background-color: var(--bg-color);
    }
}
</style>