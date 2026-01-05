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
                        <div class="desc">创建或打开你的项目</div>
                    </div>
                    <div class="actions">
                        <ElButton type="primary" @click="createProject">新建项目</ElButton>
                        <ElButton type="primary" @click="openLocalProject">打开本地项目</ElButton>
                    </div>
                </div>
                <div class="recent" v-if="projects.length > 0">
                    <div class="recent-title">最近项目</div>
                    <ElScrollbar class="recent-list">
                        <div class="recent-item" v-for="p in projects" :key="p.name">
                            <span class="name">{{ p.name }}</span>
                            <ElButton text size="small" @click="openIndexDBProject(p.name)">打开</ElButton>
                            <SVG name="remove" @click="deleteProject(p.name)"></SVG>
                        </div>
                    </ElScrollbar>
                </div>
            </div>
        </div>
    </ElDialog>
</template>
<script setup lang='ts'>
import { ElDialog, ElScrollbar, ElButton } from 'element-plus';
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

async function openLocalProject() {
    try {
        await EditorFileSystem.Instance.init(FileMode.LOCAL);
        const sceneList = await RuntimeLibrary.Instance.loadAssets((v) => {
            console.log(v);
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
async function openIndexDBProject(name: string) {
    try {
        await EditorFileSystem.Instance.init(FileMode.INDEXEDDB, name);
        const sceneList = await RuntimeLibrary.Instance.loadAssets((v) => {
            loading.value = v;
        });

        if (sceneList.length > 0) {
            useScene().setSceneList(sceneList);
            Editor.Instance.setCurrentScene(sceneList[0].uuid);
        } else {
            const scene = await Editor.Instance.createNewScene('默认场景');
            useScene().addScene(scene);
            Editor.Instance.setCurrentScene(scene.uuid);
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
