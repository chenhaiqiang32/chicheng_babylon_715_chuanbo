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
                            @dragstart="e => handleDragStart(e, item)">
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
                <Grid :data="envTextureList" :minWidth="minWidth" :row-height="rowHeight" style="padding: 10px;">
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
import { renderEnvTexture, renderMaterail } from '@/tools/preview/materialPreviewGenerator';
import {
    getAssetsHdrContextMenuCommands, getAssetsMaterialContextMenuCommands,
    getAssetsModelContextMenuCommands, getAssetsTextureContextMenuCommands
} from '@/view/panel/ContextMenuCommands';

const minWidth = 70
const rowHeight = 70

const objectList = ref<any[]>([]);
const materialList = ref<any[]>([]);
const textureList = ref<any[]>([]);
const envTextureList = ref<any[]>([]);



function handleDragStart(ev: DragEvent, data: any) {
    ev.dataTransfer?.setData('assets', JSON.stringify(data))
}


onMounted(() => {
    RuntimeLibrary.Instance.on('onChanged', onChange);
    RuntimeLibrary.Instance.on('onMaterialChanged', onMaterialChanged);
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
            type: 'envTexture',
            name: x.name,
            sourceUUID: x.sourceUUID,
            uuid: x.uuid
        }
    });
    const set = new Set<string>();
    const envSet = new Set<string>();
    const textures = [];
    const envTextures = [];
    
    // 分流普通贴图和环境贴图
    for(const item of texstureArray) {
        const ext = item.name.toLowerCase().split('.').pop();
        const isEnvTexture = ['hdr', 'env', 'exr'].includes(ext);
        if(isEnvTexture){
            if(!envSet.has(item.sourceUUID)){
                envSet.add(item.sourceUUID);
                envTextures.push(item);
            }
        } else {
            if(!set.has(item.sourceUUID)){
                set.add(item.sourceUUID);
                textures.push(item);
            }
        }
    }
    textureList.value = textures;
    envTextureList.value = envTextures;

    for (let index = 0; index < textureList.value.length; index++) {
        const element = textureList.value[index];
        if (!element.url) {
            RuntimeLibrary.Instance.getTextureURL(element.sourceUUID).then(url => {
                element.url = url
            })
        }
    }
    for (let index = 0; index < envTextureList.value.length; index++) {
        const element = envTextureList.value[index];
        if (!element.url) {
            const ext = element.name.toLowerCase().split('.').pop();
            element.url = await RuntimeLibrary.Instance.getEnvTextureURL(element.sourceUUID, element.uuid, ext);
        }
    }

    for (var i = 0; i < materialList.value.length; i++) {
        const material = materialList.value[i];
        const mat = await RuntimeLibrary.Instance.getMaterial(material.uuid);
        const prevUrl = await renderMaterail(mat, true);
        material.previewUrl = prevUrl;
    }
    Editor.Instance.Engine.resize()
}

// 当材质属性发生改变时
async function onMaterialChanged(e: {useCache:boolean}) {
    for (var i = 0; i < materialList.value.length; i++) {
        const material = materialList.value[i];
        const mat = await RuntimeLibrary.Instance.getMaterial(material.uuid);
        const prevUrl = await renderMaterail(mat, e.useCache);
        material.previewUrl = prevUrl;
    }
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
    RuntimeLibrary.Instance.off('onChanged', onChange);
    RuntimeLibrary.Instance.off('onMaterialChanged', onMaterialChanged);
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