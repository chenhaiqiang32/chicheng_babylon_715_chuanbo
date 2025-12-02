<template>
    <ElDialog v-model="model" draggable width="900px" :close-on-click-modal="false" :show-close="false"
        class="setup-dialog">
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
                        <ElButton type="primary" size="small" @click="createProject">新建项目</ElButton>
                        <ElButton type="primary" size="small" @click="openProject">打开项目</ElButton>
                    </div>
                </div>

                <div class="recent" v-if="recentProjects.length">
                    <div class="recent-title">最近项目</div>
                    <ElScrollbar class="recent-list">
                        <div class="recent-item" v-for="p in recentProjects" :key="p.name">
                            <span class="name">{{ p.name }}</span>
                            <ElButton text size="small" @click="openProject">打开</ElButton>
                        </div>
                    </ElScrollbar>
                </div>
            </div>
        </div>
    </ElDialog>
</template>
<script setup lang='ts'>
import { ElDialog, ElScrollbar, ElButton } from 'element-plus';
import { ref } from 'vue';
import { useScene } from '@/store/useScene';
import { Editor } from '@/3d/Editor';
import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';
import { LocalFileSystem } from '@/3d/assets/runtimeLibrary/File';

const model = ref(true);
const creating = ref(false);
const opening = ref(false);
const recentProjects = ref<Array<{ name: string; time: number }>>(JSON.parse(localStorage.getItem('recentProjects') || '[]'));

const props = defineProps<{ close: () => void }>();

async function createProject() {
    if (creating.value) return;
    creating.value = true;
    try {
        const scene = await Editor.Instance.createNewScene('默认场景');
        useScene().addScene(scene);
        Editor.Instance.setCurrentScene(scene.uuid);
        props.close();
    } finally {
        creating.value = false;
    }
}

async function openProject() {
    if (opening.value) return;
    opening.value = true;
    try {
        await LocalFileSystem.Instance.init();
        const sceneList = await RuntimeLibrary.Instance.loadAssets(LocalFileSystem.Instance);
        if (sceneList.length > 0) {
            useScene().setSceneList(sceneList);
            Editor.Instance.setCurrentScene(sceneList[0].uuid);
        } else {
            const scene = await Editor.Instance.createNewScene('默认场景');
            useScene().addScene(scene);
            Editor.Instance.setCurrentScene(scene.uuid);
        }
        const name = LocalFileSystem.Instance.root?.name;
        if (name) {
            const next = [{ name, time: Date.now() }, ...recentProjects.value.filter(i => i.name !== name)].slice(0, 5);
            recentProjects.value = next;
            localStorage.setItem('recentProjects', JSON.stringify(next));
        }
        props.close();

    } catch (error) {
        console.error(error);
    } finally {
        opening.value = false;
    }
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

            .recent-title {
                font-size: 12px;
                color: #bdbdbd;
                margin-bottom: 8px;
            }

            .recent-list {
                max-height: 180px;
            }

            .recent-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                border-radius: var(--border-radius);
            }

            .name {
                font-size: 12px;
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
