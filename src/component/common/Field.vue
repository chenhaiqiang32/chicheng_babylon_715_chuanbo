<template>
    <div class="field" :class="{ 'show-hover': showHover }">
        <div class="field-label" :title="helper">{{ title }}</div>
        <div class="field-content">
            <slot></slot>
        </div>
    </div>
</template>
<script setup lang='ts'>

const props = defineProps<{
    title: string
    helper?: string
    showHover?: boolean
}>()
</script>
<style scoped lang='scss'>
.field {
    display: flex;
    align-items: center;
    padding: 0 10px;
    border-radius: var(--border-radius);

    &.show-hover {
        &:hover {
            background-color: var(--bg-color-3);
        }

    }


    .field-label {
        width: 80px;
        text-align: left;
        margin-right: 10px;
        height: 32px;
        line-height: 32px;
    }

    .field-content {
        flex: 1;
    }
}
</style>