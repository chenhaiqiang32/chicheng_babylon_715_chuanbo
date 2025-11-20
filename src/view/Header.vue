<template>
    <div class="editor-header">
        <el-button type="primary" @click="toggleDark(!isDark)">切换主题</el-button>
    </div>
</template>
<script setup lang='ts'>
import { useDark, useToggle } from '@vueuse/core'
const isDark = useDark({
    valueDark: 'dark',
    valueLight: ''
});
const toggleDark = useToggle(isDark);




</script>
<style scoped lang='scss'>
.editor-header {
    width: 100%;
    height: 32px;
    border-bottom: 1px solid var(--el-border-color);
}
</style>