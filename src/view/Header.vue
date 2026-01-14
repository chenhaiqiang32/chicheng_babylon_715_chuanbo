<template>
    <div class="editor-header">
        <div style="margin-left: 20px;">
        </div>
        <Menu :data="menuItems"></Menu>
        <div style="margin-left:auto; margin-right: 20px;">
            <ElButton type="primary" size="small" @click="publish">{{ $t('dialog.publish.title') }}</ElButton>
        </div>
    </div>
</template>
<script setup lang='ts'>
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { Editor } from '@/3d/Editor';
import Menu from '@/component/menu/Menu.vue';
import { useScene } from '@/store/useScene';
import { Utils } from '@/utils';
import { useDark, useToggle } from '@vueuse/core'
import { ElMessage } from 'element-plus';
import { onMounted, onUnmounted, ref } from 'vue'
import { EditorFileSystem, FileMode } from '@/3d/assets/file/IFile';
import { useIndexDBProject } from '@/store/useIndexDBProject';
import { useDialog } from './dialog';
import { useEditor } from '@/store/useEditor';
import { registerKeyDown, unregisterKeyDown } from '@/utils/ShortcutKey';



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
                callback: saveProject
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
            {
                name: 'menu.setting.layout.title',
                children: [
                    {
                        name: 'menu.setting.layout.default',
                        callback: setLayoutDefault
                    },

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

onMounted(() => {
    registerKeyDown(keyDonw);
});

function setLayoutDefault() {
    useEditor().setLayoutDefault();
}

function keyDonw(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (event.ctrlKey && key == 's') {
        saveProject()
        event.preventDefault();
    }
}
onUnmounted(() => {
    unregisterKeyDown(keyDonw);
});

async function saveProject() {
    try {
        await EditorFileSystem.Instance.check();
        await useScene().saveScene(Editor.Instance.Scene)
        const sceneList = useScene().sceneInfoList;
        const files = await RuntimeLibrary.Instance.saveAll()
        files.push(['scene.json', JSON.stringify(sceneList)]);
        let count = 0;
        const saveFiles = await Promise.all(files.map(x => {
            //@ts-ignore
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
                type: 'local',
            })
        } else if (EditorFileSystem.Instance.mode === FileMode.NET) {
            useIndexDBProject().addProject({
                name: EditorFileSystem.Instance.name,
                time: new Date().toLocaleString(),
                type: 'net',
            })
        }
        RuntimeLibrary.Instance.saveComplate();
        ElMessage.success('保存成功');
    } catch (error) {
        ElMessage.error(error);
    }

}

function importModel() {
    const ext = ".x_t,.rvm,.dgn,.rvt,.ifc,.xyz,.vtk,.vtp,.ply,.wrl,.dae,.amf,.3mf,.3dm,.obj,.3ds,.usdz,.stl";
    const extList = ["x_t", "rvm", "dgn", "rvt", "ifc", "xyz", "vtk", "vtp", "ply", "wrl", "dae", "amf", "3mf", "3dm", "obj", "3ds", "usdz", "stl"];
    Utils.chooseFile('.glb,.fbx' + "," + ext).then(async (fileList) => {
        if (fileList[0]) {
            const originFile = fileList[0];
            const fileExt = originFile.name.toLocaleLowerCase().split('.').pop();

            let fileName = originFile.name;
            if (extList.includes(fileExt)) {
                fileName = originFile.name.toLocaleLowerCase().split('.')[0] + ".glb";
            }
            const file = new File([originFile], fileName);
            const node = await RuntimeLibrary.Instance.importMesh(file, (v) => {
                useEditor().setLoading(v);
            });
            RuntimeLibrary.Instance.addToScene(Editor.Instance.Scene, node, (v) => {
                console.log(v);
                useEditor().setLoading(v);
            });
            RuntimeLibrary.Instance.dispatch('onChanged');
            setTimeout(() => {
                useScene().setHierarchy(Editor.Instance.Scene.rootNodes);
            }, 1000);
        }
    })
}

async function publish() {
    const dialog = (await import('./dialog/PublishDialog.vue')).default;
    useDialog(dialog)
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
