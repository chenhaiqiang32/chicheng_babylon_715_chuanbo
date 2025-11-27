<template>
    <div ref="gridEl" class="grid-container" :style="{
        gridTemplateColumns: `repeat(auto-fill, minmax(${props.minWidth}px, 1fr))`,
        gridAutoRows: props.gap ? `calc(${props.rowHeight || 10}px + ${props.gap}px)` : '10px',
        gap: gapPx
    }">
        <slot v-for="(item, index) in props.data" :key="item.id ?? item" :item="item" :index="index" />
    </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, computed, watch } from 'vue'

const props = withDefaults(
    defineProps<{
        /** 数据源 */
        data: any[]
        /** 每列最小宽度（会自动计算列数） */
        minWidth?: number
        /** 每行高度（用于 grid-auto-rows，建议设置一个合理值） */
        rowHeight?: number
        /** 网格间距（px） */
        gap?: number | string
        /** 是否开启 dense 填充（推荐开启，能减少底部空白） */
        dense?: boolean
    }>(),
    {
        minWidth: 240,
        rowHeight: 10,
        gap: 16,
        dense: true
    }
)

// 响应式根元素
const gridEl = shallowRef<HTMLElement | null>(null)

// 计算 gap 的像素值（支持数字或字符串）
const gapPx = computed(() => {
    if (typeof props.gap === 'number') return `${props.gap}px`
    return props.gap
})

// 动态控制 dense 模式
watch(
    () => props.dense,
    (val) => {
        if (gridEl.value) {
            gridEl.value.style.gridAutoFlow = val ? 'dense row' : 'row'
        }
    },
    { immediate: true }
)

onMounted(() => {
    // 强制触发一次 dense 设置
    if (gridEl.value && props.dense) {
        gridEl.value.style.gridAutoFlow = 'dense row'
    }
})
</script>

<style scoped lang="scss">
.grid-container {
    display: grid;
    width: 100%;
    /* grid-template-columns 在 style 中动态设置 */
    grid-auto-flow: row dense;
    /* 默认开启 dense */
    align-items: start;
    /* 重要：让子项顶部对齐，避免拉伸 */

    /* 可选：添加动画 */
    &>* {
        transition: transform 0.2s ease;
    }
}
</style>