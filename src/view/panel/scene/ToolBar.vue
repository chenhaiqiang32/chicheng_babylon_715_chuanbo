<template>
    <div class="tool-bar">
        <div class="transform">
            <div class="item-icon" :class="{ 'selected': selectedModel === 'move' }" @click="selectedModel = 'move'">
                <SVG name="move" size="22px"></SVG>
            </div>
            <div class="item-icon" :class="{ 'selected': selectedModel === 'rotate' }"
                @click="selectedModel = 'rotate'">
                <SVG name="rotate" size="20px"></SVG>
            </div>
            <div class="item-icon" :class="{ 'selected': selectedModel === 'scale' }" @click="selectedModel = 'scale'">
                <SVG name="scale" size="20px"></SVG>
            </div>
        </div>
        <SVG style="margin-left: auto;" name="gizmo" size="24px" :color="showGizmo ? '#fff' : '#555'"
            @click="showGizmo = !showGizmo"></SVG>
    </div>
</template>
<script setup lang='ts'>
import SVG from '@/component/common/SVG.vue';
import { onMounted, onUnmounted, ref, shallowRef } from 'vue';

const selectedModel = ref('move');
const showGizmo = ref(false);
defineEmits<{
}>();

// ==================== 响应式数据 ====================

// ==================== 生命周期钩子 ====================
onMounted(() => {

});
onUnmounted(() => {

});
</script>
<style scoped lang='scss'>
.tool-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 40px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    color: #ffffff;
    background-color: var(--bg-color);
    cursor: pointer;

    .transform {
        display: flex;

        .item-icon {
            aspect-ratio: 1 / 1;
            padding: 3px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #888;
            border-radius: 5px;

            &.selected {
                background-color: var(--el-bg-color);
                color: #fff;
            }
        }
    }
}
</style>