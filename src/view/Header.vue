<template>
    <div class="editor-header">
        <div style="margin-left: 20px;">
        </div>
        <Menu :data="menuItems"></Menu>
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import Menu from '@/component/menu/Menu.vue';
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark({
    valueDark: 'dark',
    valueLight: ''
});

const toggleDark = useToggle(isDark);

const menuItems: MenuItem[] = [
    {
        name: 'menu.file.title',
        children: [
            {
                name: 'menu.file.save',
                callback: exportScene
            },
            {
                name: 'menu.file.import',
                callback: importScene
            }
        ]
    }
]

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
    height: 60px;
    border-bottom: 1px solid var(--el-border-color);
    display: flex;
    align-items: center;
    white-space: nowrap;

    .el-menu--horizontal {
        --el-menu-horizontal-height: 32px;
    }
}
</style>

<style lang='scss'>
.el-popper.is-customized {
    border-radius: 5px !important;
    width: unset !important;
    min-width: 120px !important;
    border: 1px solid var(--el-border-color);
    --el-popover-padding: 5px !important;
    padding: 5px !important;
}
</style>
