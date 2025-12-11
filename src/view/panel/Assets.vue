<template>
    <div class="assets-container">
        <el-tabs type="border-card" tab-position="left" class="demo-tabs" @tab-click="onchange">
            <el-tab-pane label="模型">
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
            <el-tab-pane label="材质">
                <Grid :data="materialList" :minWidth="minWidth" :row-height="rowHeight" style="padding: 10px;">
                    <template #default="{ item, index }">
                        <div class="grid-item" :title="item.name">
                            <SVG name="material" size="42px" :title="item.name"></SVG>
                            <span class="itme-name">{{ item.name }}</span>
                        </div>
                    </template>
                </Grid>
            </el-tab-pane>
            <el-tab-pane label="贴图">
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
        </el-tabs>
    </div>

</template>
<script setup lang='ts'>
import Grid from '@/component/common/Grid.vue'
import { onMounted, onUnmounted, ref } from 'vue';
import SVG from '@/component/common/SVG.vue';
import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';

const minWidth = 70
const rowHeight = 70

const objectList = ref<any[]>([]);
const materialList = ref<any[]>([]);
const textureList = ref<any[]>([]);

function handleDragStart(ev: DragEvent, data: any) {
    ev.dataTransfer?.setData('assets', JSON.stringify(data))
}


onMounted(() => {
    RuntimeLibrary.Instance.on('onChanged', onchange)
})

function onchange() {
    objectList.value = RuntimeLibrary.Instance.rootNodes.map(x => {
        return {
            type: 'object',
            name: x.name,
            uuid: x.id,
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






}

onUnmounted(() => {
    RuntimeLibrary.Instance.off('onChanged', onchange)
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