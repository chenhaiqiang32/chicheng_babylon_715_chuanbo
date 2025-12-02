<template>
    <div class="editor-header">
        <div style="margin-left: 20px;">
        </div>
        <Menu :data="menuItems"></Menu>
    </div>
</template>
<script setup lang='ts'>
import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';
import { LocalFileSystem } from '@/3d/assets/runtimeLibrary/File';
import { MultiCollectAssets } from '@/3d/assets/runtimeLibrary/MultiCollectAssets';
import { serializeScene } from '@/3d/assets/serialze/Scene';
import { Editor } from '@/3d/Editor';
import Menu from '@/component/menu/Menu.vue';
import { useScene } from '@/store/useScene';
import { Utils } from '@/utils';
import { useDark, useToggle } from '@vueuse/core'
import { ElMessage } from 'element-plus';
import { ref } from 'vue'

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
                name: 'menu.file.open',
                callback: open
            },
            {
                name: 'menu.file.import',
                callback: importScene
            }, {
                name: '加载并导出',
                callback: exportFile
            }, {
                name: '加载资产包',
                callback: importAssets
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
        await LocalFileSystem.Instance.init();
        const sceneList = useScene().getAllScene();
        const multiCollectAssets = new MultiCollectAssets(RuntimeLibrary.Instance.sceneAssets)
        const sceneDatas = new Array<any>(sceneList.length);
        for (let index = 0; index < sceneList.length; index++) {
            const scene = sceneList[index];
            const sceneData = serializeScene(scene, multiCollectAssets);
            sceneDatas.push(sceneData);
        }
        const files = await RuntimeLibrary.Instance.saveAll()
        files.push(['scene.json', JSON.stringify(sceneDatas)]);
        files.forEach((file) => {
            LocalFileSystem.Instance.saveFile(file[0], file[1]);
        })
        RuntimeLibrary.Instance.sceneAssets.forEach((asset) => {
            asset.createNew = false;
        })
    } catch (error) {
        ElMessage.error(error);
    }

}

function importScene() {
    Utils.chooseFile('.glb').then(async (fileList) => {
        if (fileList[0]) {
            RuntimeLibrary.Instance.importMesh(fileList[0]).then(async (assets) => {
                await assets.addToScene(Editor.Instance.Scene);
                setTimeout(() => {
                    useScene().setHierarchy(Editor.Instance.Scene.rootNodes);
                }, 1000);
            })
        }
    })
}
function importAssets() {

}

async function open() {
    await LocalFileSystem.Instance.init();
    const sceneList = await RuntimeLibrary.Instance.loadAssets(LocalFileSystem.Instance);
    if (sceneList.length > 0) {
        useScene().setSceneList(sceneList)
        Editor.Instance.setCurrentScene(sceneList[0].uuid);
    } else {
        const scene = await Editor.Instance.createNewScene('默认场景');
        useScene().addScene(scene);
        Editor.Instance.setCurrentScene(scene.uuid)
    }
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
