<template>
    <div class="assets-container">
        <el-tabs type="border-card" tab-position="left" class="demo-tabs" @tab-click="onchange">
            <el-tab-pane label="项目">
                <Grid :data="materialArray" :minWidth="minWidth" :row-height="rowHeight" style="padding: 10px;">
                    <template #default="{ item, index }">
                        <div class="grid-item" :title="item.name">
                            <SVG :name="getAssetsType(item)" size="32px"></SVG>
                            <span class="itme-name">{{ item.name }}</span>
                        </div>
                    </template>
                </Grid>
            </el-tab-pane>
            <el-tab-pane label="资源库">
            </el-tab-pane>
        </el-tabs>
    </div>

</template>
<script setup lang='ts'>
import Grid from '@/component/common/Grid.vue'
import SVG from '@/component/common/SVG.vue';
import { ResContainer } from '@/3d/assets/RuntimeAssets';
import { onMounted, shallowRef } from 'vue';
import { Material } from '@babylonjs/core';
import { Editor } from '@/3d/Editor';

const minWidth = 70
const rowHeight = 70

const materialArray = shallowRef<Material[]>([]);

onMounted(() => {

})


function getAssetsType(asset: any) {
    if (asset instanceof Material) {
        return 'material'
    }
}

function onchange(asset: ResContainer) {
    console.log(Editor.Instance.Scene.textures);
    materialArray.value = [...Editor.Instance.Scene.materials]
}

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