<template>
    <ElDialog v-model="model" @close="close" align-center draggable width="900px" :close-on-click-modal="false"
        :show-close="false" class="setup-dialog">
        <div class="dialog-content">
            <div class="left">
                <img src="@/assets/setup.png" alt="">
            </div>
            <div class="right">
                <div class="title">
                    <div>
                        <div class="brand">编辑器</div>
                    </div>

                </div>
                <div class="recent">
                    <div class="recent-title">
                        最近项目
                        <div class="actions">
                            <ElButton size="small" type="primary" @click="openProject(FileMode.INDEXEDDB)">本地项目
                            </ElButton>
                            <ElButton size="small" type="primary" @click="openProject(FileMode.NET)">网络项目</ElButton>
                            <!-- <ElButton type="primary" @click="openLocalProject">打开本地项目</ElButton> -->
                        </div>
                    </div>
                    <ElScrollbar class="recent-list" v-if="projects.length > 0">
                        <div class="recent-item" v-for="p in projects" :key="p.time">
                            <ElTag size="small" type="success" style="margin-right: 8px;">{{ p.type === 'net' ? '网络' :
                                '本地' }}
                            </ElTag>
                            <span class="name">{{ p.name }}</span>
                            <ElButton text size="small" @click="openIndexDBProject(p)">打开</ElButton>
                            <SVG name="remove" @click="deleteProject(p.name)"></SVG>
                        </div>
                    </ElScrollbar>
                </div>
            </div>
        </div>
    </ElDialog>
</template>
<script setup lang='ts'>
import { ElDialog, ElScrollbar, ElButton, ElMessageBox, ElTag, ElMessage } from 'element-plus';
import SVG from '@/component/common/SVG.vue';
import { onMounted, ref } from 'vue';
import { useScene } from '@/store/useScene';
import { Editor } from '@/3d/Editor';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { EditorFileSystem, FileMode } from '@/3d/assets/file/IFile';
import { useIndexDBProject } from '@/store/useIndexDBProject';
import { storeToRefs } from 'pinia';
import { useEditor } from '@/store/useEditor';

const { projects } = storeToRefs(useIndexDBProject());

const model = ref(true);
const creating = ref(false);
const recentProjects = ref<Array<{ name: string; time: number }>>(JSON.parse(localStorage.getItem('recentProjects') || '[]'));
const props = defineProps<{ close: () => void }>();
const { loading } = storeToRefs(useEditor());


async function createProject() {
    try {
        await EditorFileSystem.Instance.check();
        const scene = await Editor.Instance.createNewScene('默认场景');
        await useScene().addScene(scene);
        Editor.Instance.setCurrentScene(scene.uuid);
        props.close();
    } finally {
    }
}


async function openProject(mode: FileMode) {
    try {
        const { value: name } = await ElMessageBox.prompt('请输入项目名称', '新建项目', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputValue: '默认项目',
        });
        if (!name) {
            return;
        }
        // 检查是否和数据库中的项目名重复
        for (let i = 0; i < projects.value.length; i++) {
            const item = projects.value[i];
            if (item.name == name) {
                ElMessage.error('项目名重复');
                throw "项目名重复"
            }
        }
        await EditorFileSystem.Instance.init(mode, name);
        const sceneList = await RuntimeLibrary.Instance.loadAssets((v) => {

        });
        if (sceneList.length > 0) {
            useScene().setSceneList(sceneList);
            Editor.Instance.setCurrentScene(sceneList[0].uuid);
        } else {
            const scene = await Editor.Instance.createNewScene('默认场景');
            await useScene().addScene(scene);
            Editor.Instance.setCurrentScene(scene.uuid);
        }
        props.close();
    } catch (error) {
        console.error(error);
    } finally {
    }
}

async function openIndexDBProject(p: { name: string; time: string; type: string }) {
    try {
        if (p.type === 'net') {
            await EditorFileSystem.Instance.init(FileMode.NET, p.name);
        } else {
            await EditorFileSystem.Instance.init(FileMode.INDEXEDDB, p.name);
        }
        const sceneList = await RuntimeLibrary.Instance.loadAssets((v) => {
            loading.value = v * 0.2;
        });

        if (sceneList.length > 0) {
            useScene().setSceneList(sceneList);
            Editor.Instance.setCurrentScene(sceneList[0].uuid, (v) => {
                loading.value = v * 0.8 + 0.2;
            });
        } else {
            const scene = await Editor.Instance.createNewScene('默认场景');
            useScene().addScene(scene);
            Editor.Instance.setCurrentScene(scene.uuid, (v) => {
                loading.value = v * 0.8 + 0.2;
            });
        }
        RuntimeLibrary.Instance.dispatch('onChanged');
        props.close();
    } catch (error) {
        console.error(error);
    } finally {
    }
}

function deleteProject(name: string) {
    useIndexDBProject().deleteProject(name);
}
</script>
<style lang='scss'>
.setup-dialog {
    --el-dialog-padding-primary: 0 !important;

    .el-dialog__body {
        background: linear-gradient(135deg, #1e1e1e, #242424);
    }
}
</style>

<style scoped lang='scss'>
.dialog-content {
    width: 100%;
    height: 500px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    overflow: hidden;
    gap: 20px;
    background-color: #1b1b1b;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

    .left {
        width: 50%;
        height: 100%;
        position: relative;
        border-right: 1px solid var(--el-border-color);

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .right {
        flex: 1;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 24px 24px;

        .title {
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 24px;

            .brand {
                font-size: 24px;
                font-weight: 600;
            }

            .desc {
                margin-top: 4px;
                font-size: 12px;
                color: #bdbdbd;
            }

            .actions {
                display: flex;
                gap: 12px;
                margin-left: auto;
            }

        }




        .recent {
            margin-top: 12px;
            flex: 1;
            height: 0;
            padding-bottom: 24px;

            .recent-title {
                font-size: 12px;
                color: #bdbdbd;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }



            .recent-item {
                display: flex;
                align-items: center;
                padding: 6px 20px;
                border-radius: var(--border-radius);
                cursor: pointer;

                .svg-icon {
                    opacity: 0;
                    pointer-events: none;
                }

                &:hover {
                    background-color: var(--bg-color-2);

                    .svg-icon {
                        opacity: 1;
                        pointer-events: auto;
                    }
                }
            }

            .name {
                font-size: 12px;
                margin-right: auto;
            }
        }

        .hint {
            margin-top: auto;
            font-size: 12px;
            color: #8c8c8c;
        }
    }

}
</style>
