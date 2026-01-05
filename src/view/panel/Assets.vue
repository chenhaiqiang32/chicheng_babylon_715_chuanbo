<template>
    <div class="assets-container">
        <el-tabs type="border-card" tab-position="left" class="demo-tabs">
            <el-tab-pane label="模型" @contextmenu="modelContextMenu">
                <Grid :data="objectList" :minWidth="minWidth" :row-height="rowHeight" style="padding: 10px;">
                    <template #default="{ item, index }">
                        <div class="grid-item" draggable="true" :title="item.name"
                            @dragstart="e => handleDragStart(e, item)">
                            <SVG name="model" size="42px" :title="item.name"></SVG>
                            <span class="itme-name">{{ item.name }}</span>
                        </div>
                    </template>
                </Grid>
            </el-tab-pane>
            <el-tab-pane label="材质" @contextmenu="materialContextMenu">
                <Grid :data="materialList" :minWidth="minWidth" :row-height="rowHeight" style="padding: 10px;">
                    <template #default="{ item, index }">
                        <div class="grid-item" :title="item.name" draggable="true"
                            :class="{ selected: selectResItem === item }" @dragstart="e => handleDragStart(e, item)"
                            @click="handleMaterialClick(item)">
                            <img v-if="item.previewUrl" :src="item.previewUrl" style="width: 42px; height: 42px;" />
                            <span class="itme-name">{{ item.name }}</span>
                        </div>
                    </template>
                </Grid>
            </el-tab-pane>
            <el-tab-pane label="贴图" @contextmenu="textureContextMenu">
                <Grid :data="textureList" :minWidth="minWidth" :row-height="rowHeight" style="padding: 10px;">
                    <template #default="{ item, index }">
                        <div class="grid-item" :title="item.name" draggable="true"
                            @dragstart="e => handleDragStart(e, item)">
                            <img v-if="item.url" :src="item.url" alt="" style="width: 80%; height: 80%;">
                            <span class="itme-name">{{ item.name }}</span>
                        </div>
                    </template>
                </Grid>
            </el-tab-pane>
            <el-tab-pane label="环境贴图" @contextmenu="hdrContextMenu">
                <Grid :data="hdrTextureList" :minWidth="minWidth" :row-height="rowHeight" style="padding: 10px;">
                    <template #default="{ item, index }">
                        <div class="grid-item" :title="item.name" draggable="true"
                            @dragstart="e => handleDragStart(e, item)">
                            <img v-if="item.url" :src="item.url" alt="" style="width: 80%; height: 80%;">
                            <span class="itme-name">{{ item.name }}</span>
                        </div>
                    </template>
                </Grid>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>
<script setup lang='ts'>
import Grid from '@/component/common/Grid.vue'
import { onMounted, onUnmounted, ref } from 'vue';
import SVG from '@/component/common/SVG.vue';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { Editor } from '@/3d/Editor';
import { openContextMenu } from '@/component/content-menu';
import { renderMaterail } from '@/tools/preview/materialPreviewGenerator';
import {
    getAssetsHdrContextMenuCommands, getAssetsMaterialContextMenuCommands,
    getAssetsModelContextMenuCommands, getAssetsTextureContextMenuCommands
} from '@/view/panel/ContextMenuCommands';
import { storeToRefs } from 'pinia';
import { useScene } from '@/store/useScene';
const minWidth = 70
const rowHeight = 70

const objectList = ref<any[]>([]);
const materialList = ref<any[]>([]);
const textureList = ref<any[]>([]);
const hdrTextureList = ref<any[]>([]);


// 添加选中状态跟踪
const selectResItem = ref<any>(null)
// 添加点击处理函数
function handleMaterialClick(item: any) {
    if (selectResItem.value === item) {
        selectResItem.value = null
        useScene().setCurrentSelectResNode(null)
    } else {
        selectResItem.value = item
        useScene().setCurrentSelectResNode(item.uuid)
    }
}
function handleDragStart(ev: DragEvent, data: any) {
    ev.dataTransfer?.setData('assets', JSON.stringify(data))
}


onMounted(() => {
    RuntimeLibrary.Instance.on('onChanged', onChange)
})


async function onChange() {
    objectList.value = RuntimeLibrary.Instance.rootNodes.map(x => {
        return {
            type: 'object',
            name: x.name,
            uuid: x.uuid,
        }
    })
    materialList.value = RuntimeLibrary.Instance.material.map(x => {
        return {
            type: 'material',
            name: x.name,
            uuid: x.uuid,
        }
    });
    const texstureArray = RuntimeLibrary.Instance.texture.map(x => {
        return {
            type: 'texture',
            name: x.name,
            sourceUUID: x.sourceUUID,
        }
    });
    const set = new Set<string>()
    textureList.value = texstureArray.filter(x => {
        if (set.has(x.sourceUUID)) {
            return false
        }
        set.add(x.sourceUUID)
        return true
    })
    for (let index = 0; index < textureList.value.length; index++) {
        const element = textureList.value[index];
        if (!element.url) {
            RuntimeLibrary.Instance.getTextureURL(element.sourceUUID).then(url => {
                element.url = url
            })
        }
    }

    for (var i = 0; i < materialList.value.length; i++) {
        const material = materialList.value[i];
        const mat = await RuntimeLibrary.Instance.getMaterial(material.uuid);
        const prevUrl = await renderMaterail(mat, true, Editor.Instance.Engine);
        material.previewUrl = prevUrl;
    }
    Editor.Instance.Engine.resize()
}



function modelContextMenu(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    openContextMenu({
        position: {
            x: e.clientX,
            y: e.clientY
        },
        commands: getAssetsModelContextMenuCommands()
    })
}

function materialContextMenu(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    openContextMenu({
        position: {
            x: e.clientX,
            y: e.clientY
        },
        commands: getAssetsMaterialContextMenuCommands()
    })
}

function textureContextMenu(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    openContextMenu({
        position: {
            x: e.clientX,
            y: e.clientY
        },
        commands: getAssetsTextureContextMenuCommands()
    })
}

function hdrContextMenu(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    openContextMenu({
        position: {
            x: e.clientX,
            y: e.clientY
        },
        commands: getAssetsHdrContextMenuCommands()
    })
}

onUnmounted(() => {
    RuntimeLibrary.Instance.off('onChanged', onChange)
})

</script>
<style lang='scss'>
.assets-container {
    height: 100%;

    .el-tabs {
        height: 100%;
        border: none !important;
    }

    .grid-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        width: 100%;
        height: 100%;
        aspect-ratio: 1/1;
        padding: 5px;
        border-radius: var(--border-radius);

        &:hover {
            background-color: var(--bg-color-3);
        }

        &.selected {
            background-color: var(--bg-color-3);
        }

        .itme-name {
            width: 100%;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
        }
    }



    .is-left {
        .el-tabs__nav {
            .el-tabs__item {
                margin-left: 0px;
            }
        }

        &.is-active {
            border-top-color: var(--el-border-color) !important;
            border-bottom-color: var(--el-border-color) !important;
        }
    }
}
</style>
<style lang='scss' scoped></style>