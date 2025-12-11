<template>
    <div class="editor-header">
        <div style="margin-left: 20px;">
        </div>
        <Menu :data="menuItems"></Menu>
    </div>
</template>
<script setup lang='ts'>
import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';
import { serializeScene } from '@/3d/assets/serialze/Scene';
import { Editor } from '@/3d/Editor';
import Menu from '@/component/menu/Menu.vue';
import { useScene } from '@/store/useScene';
import { Utils } from '@/utils';
import { useDark, useToggle } from '@vueuse/core'
import { ElMessage } from 'element-plus';
import { ref } from 'vue'
import { EditorFileSystem, FileMode } from '@/3d/assets/file/IFile';
import { useIndexDBProject } from '@/store/useIndexDBProject';

const isDark = useDark({
    valueDark: 'dark',
    valueLight: ''
});

const toggleDark = useToggle(isDark);
const fileInput = ref<HTMLInputElement>();

const menuItems: MenuItem[] = [
    {
        name: 'menu.file.title',
        children: [
            {
                name: 'menu.file.import',
                callback: importModel
            }, {
                name: 'menu.file.save',
                callback: exportFile
            }
        ]
    },
    {
        name: 'menu.editor.title',
        children: [
            {
                name: 'menu.editor.redo',
            },
            {
                name: 'menu.editor.undo',
            },
            {
                name: 'menu.editor.cut',
            },
            {
                name: 'menu.editor.copy',
            },
        ]
    },
    {
        name: 'menu.setting.title',
        children: [
            {
                name: 'menu.setting.language.title',
                children: [
                    {
                        name: 'menu.setting.language.zh',
                        callback: toggleDark
                    },
                    {
                        name: 'menu.setting.language.en',
                        callback: () => toggleDark(false)
                    }
                ]
            },
            {
                name: 'menu.setting.theme.title',
                children: [
                    {
                        name: 'menu.setting.theme.dark',
                        callback: toggleDark
                    },
                    {
                        name: 'menu.setting.theme.light',
                        callback: () => toggleDark(false)
                    }
                ]

            },

        ]
    },
    {
        name: 'menu.help.title',
        children: [
            {
                name: 'menu.help.guide',
            },
            {
                name: 'menu.help.feedback',
            },
            {
                name: 'menu.help.about',
            }
        ]
    },
]

async function exportFile() {
    try {
        await EditorFileSystem.Instance.check();
        useScene().saveScene(Editor.Instance.Scene)
        const sceneList = useScene().sceneInfoList;
        const files = await RuntimeLibrary.Instance.saveAll()
        files.push(['scene.json', JSON.stringify(sceneList)]);
        let count = 0;
        const saveFiles = await Promise.all(files.map(x => {
            const message = EditorFileSystem.Instance.saveFile(x[0], x[1])
            message.then(() => {
                count++;
                console.log(`保存成功${count / (files.length) * 100}%`);
            });
            return message;
        }));

        if (EditorFileSystem.Instance.mode === FileMode.INDEXEDDB) {
            useIndexDBProject().addProject({
                name: EditorFileSystem.Instance.name,
                time: new Date().toLocaleString(),
            })
        }
        RuntimeLibrary.Instance.saveComplate();
        ElMessage.success('保存成功');
    } catch (error) {
        ElMessage.error(error);
    }

}

function importModel() {
    Utils.chooseFile('.glb').then(async (fileList) => {
        if (fileList[0]) {
            const node = await RuntimeLibrary.Instance.importMesh(fileList[0]);
            await RuntimeLibrary.Instance.addToScene(Editor.Instance.Scene, node);
            setTimeout(() => {
                useScene().setHierarchy(Editor.Instance.Scene.rootNodes);
            }, 1000);
        }
    })
}
function importAssets() {

}



</script>
<style scoped lang='scss'>
.editor-header {
    width: 100%;
    height: 40px;
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
