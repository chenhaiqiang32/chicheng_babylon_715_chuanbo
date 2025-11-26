<template>
    <div class="editor-header">
        <el-button type="primary" @click="toggleDark(!isDark)">切换主题</el-button>
        <el-button type="primary" @click="exportScene">序列化</el-button>
        <el-button type="primary" @click="importScene">加载</el-button>
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark({
    valueDark: 'dark',
    valueLight: ''
});

const toggleDark = useToggle(isDark);

function exportScene() {
    Editor.Instance.export();
}
function importScene() {
    Editor.Instance.loadScene('2.zip');
}

</script>
<style scoped lang='scss'>
.editor-header {
    width: 100%;
    height: 32px;
    border-bottom: 1px solid var(--el-border-color);
}
</style>