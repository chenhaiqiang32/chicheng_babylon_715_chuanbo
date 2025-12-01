<template>
    <div class="block">
        <div class="block-header" @click="isCollapse = !isCollapse">
            <el-icon :size="16">
                <Plus v-show="isCollapse" />
                <Minus v-show="!isCollapse" />
            </el-icon>
            <span class="block-title">{{ title }}</span>
        </div>
        <div v-if="isCollapse" class="block-content">
            <slot></slot>
        </div>
    </div>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref } from 'vue';
import { Plus, Minus } from '@element-plus/icons-vue'

const isCollapse = ref(true);
defineProps<{
    title: string
}>();

onMounted(() => {

});
onUnmounted(() => {

});
</script>
<style scoped lang='scss'>
.block {
    padding: 10px;
    width: 100%;
    background-color: var(--bg-color-1);
    border-radius: var(--border-radius);

    .block-header {
        height: 32px;
        line-height: 32px;
        padding: 0 12px;
        display: flex;
        align-items: center;
        border-radius: var(--border-radius);
        background-color: var(--bg-color-2);
        cursor: pointer;

        .block-title {
            margin-left: 5px;
        }

        &:hover {
            background-color: var(--bg-color-3);
        }

    }

    .block-content {
        padding-top: 10px;
    }
}
</style>