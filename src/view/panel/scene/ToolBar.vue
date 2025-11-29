<template>
    <div class="tool-bar">
        <div class="transform">
            <div class="item-icon" :class="{ 'selected': selectedControlMode === ControlMode.Select }"
                @click="onControlIconClick(ControlMode.Select)">
                <SVG name="cursor" :size="iconSize" :title="$t('23123')"></SVG>
            </div>
            <div class="item-icon" :class="{ 'selected': selectedControlMode === ControlMode.Move }"
                @click="onControlIconClick(ControlMode.Move)">
                <SVG name="move" :size="iconSize" :title="$t('23123')"></SVG>
            </div>
            <div class="item-icon" :class="{ 'selected': selectedControlMode === ControlMode.Rotate }"
                @click="onControlIconClick(ControlMode.Rotate)">
                <SVG name="rotate" :size="iconSize" :title="$t('23123')"></SVG>
            </div>
            <div class="item-icon" :class="{ 'selected': selectedControlMode === ControlMode.Scale }"
                @click="onControlIconClick(ControlMode.Scale)">
                <SVG name="scale" :size="iconSize" :title="$t('23123')"></SVG>
            </div>
        </div>
        <div class="view">
            <div class="item-icon" name="gizmo" size="24px"
                :class="{ 'selected': hasViewFlag(viewFlagsMode, ViewFlagsMode.Gizmos) }"
                @click="onViewIconClick(ViewFlagsMode.Gizmos)">
                <SVG name="gizmo" :size="iconSize" :title="$t('23123')"></SVG>
            </div>
            <div class="item-icon" name="mask" size="24px"
                :class="{ 'selected': hasViewFlag(viewFlagsMode, ViewFlagsMode.Mask) }"
                @click="onViewIconClick(ViewFlagsMode.Mask)">
                <SVG name="mask" :size="iconSize" :title="$t('23123')"></SVG>
            </div>
        </div>
    </div>
</template>
<script setup lang='ts'>
import SVG from '@/component/common/SVG.vue';
import { ViewFlagsMode, hasViewFlag, toggleViewFlag } from '@/3d/core/utils/viewFlagsMode';
import { ControlMode, useScene } from '@/store/useScene';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, ref, shallowRef } from 'vue';

const iconSize: string = "20px";
const selectedControlMode = storeToRefs(useScene()).currentControlMode;
const viewFlagsMode = storeToRefs(useScene()).currentViewFlagsMode;

defineEmits<{
}>();

// ==================== 响应式数据 ====================

// ==================== 生命周期钩子 ====================
onMounted(() => {
});
onUnmounted(() => {

});

function onControlIconClick(mode: ControlMode) {
    useScene().setCurrentControlMode(mode);
}

function onViewIconClick(flag: ViewFlagsMode) {
    viewFlagsMode.value = toggleViewFlag(viewFlagsMode.value, flag);
}

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
        gap: 5px;
    }

    .view {
        position: relative;

        &::after {
            content: '';
            display: block;
            width: 2px;
            height: 80%;
            background-color: #888;
            position: absolute;
            top: 50%;
            left: 0px;
            transform: translateY(-50%);
        }

        margin-left: 10px;
        padding-left: 10px;
        display: flex;
        gap: 5px;
    }

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
</style>