<template>
    <ElDialog v-model="visible" :title="$t('chooseResDialog.title')" @close="close">
        <div class="choose-res-dialog-content" @click.stop="choose()">
            <div class="action">
                <ElInput style="width: 200px;" v-model="searchText">
                    <template #prefix>
                        搜索
                    </template>
                </ElInput>
                <ElButton type="primary" @click="add">新增</ElButton>
            </div>
            <Grid :data="showData" :minWidth="100" :rowHeight="100" :gap="30" :dense="true">
                <template #default="{ item }">
                    <div class="grid-item" @click.stop="choose(item)" :class="{ 'selected': item == selectedItem }">
                        <img v-if="item.url" :src="item.url" alt="" style="width: 100%; height: 100%;">
                        <SVG name="material" v-else size="42px"> </SVG>
                        <div class="grid-item-name">{{ item.name }}</div>
                    </div>
                </template>
            </Grid>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <ElButton type="info" @click="close">
                    {{ $t('chooseResDialog.cancel') }}
                </ElButton>
                <ElButton type="primary" :disabled="!selectedItem" @click="confirm()">
                    {{ $t('chooseResDialog.confirm') }}
                </ElButton>
            </div>
        </template>
    </ElDialog>
</template>
<script setup lang='ts'>
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import Grid from '@/component/common/Grid.vue';
import { Utils } from '@/utils';
import SVG from '@/component/common/SVG.vue';
import { ElDialog } from 'element-plus';
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { renderMaterail } from '@/tools/preview/materialPreviewGenerator';
const visible = ref<boolean>(true);
const props = defineProps<{
    close: () => void,
    choose: (res: any) => void,
    type: 'material' | 'texture' | 'envTexture'
}>();
const searchText = ref('')
const selectedItem = shallowRef<any>(null);
const data = ref<any[]>([]);


const showData = computed(() => {
    if (searchText.value) {
        return data.value.filter(item => item.name.includes(searchText.value))
    } else {
        return data.value
    }
})

onMounted(() => {
    getResList()
});

async function getResList() {
    if (props.type == 'material') {
        data.value = [...RuntimeLibrary.Instance.material]
        // 获取材质预览图
        for(let index = 0; index < data.value.length; index++) {
            const element = data.value[index];
            const mat = await RuntimeLibrary.Instance.getMaterial(element.uuid);
            element.url = await renderMaterail(mat, true);
        }
    } else if(props.type == 'envTexture') {
        // 环境贴图
        const array = [...RuntimeLibrary.Instance.envTexture].map(x => {
            return {
                name: x.name,
                sourceUUID: x.sourceUUID,
            }
        })
        const set = new Set<string>();
        data.value = array.filter(x => {
            if(set.has(x.sourceUUID))
                return false;
            set.add(x.sourceUUID);
            return true;
        });
        for(let index = 0; index < data.value.length; index++) {
            const element = data.value[index];
            if(!element.url) {
                const tex = await RuntimeLibrary.Instance.getEnvTexture(element.sourceUUID);
                element.url = tex.prevUrl;
            }
        }
    } else {
        // 普通贴图
        const array = [...RuntimeLibrary.Instance.texture].map(x => {
            return {
                name: x.name,
                sourceUUID: x.sourceUUID,
                uuid: x.uuid
            }
        })

        const set = new Set<string>()
        data.value = array.filter(x => {
            if (set.has(x.sourceUUID)) {
                return false
            }
            set.add(x.sourceUUID)
            return true
        })
        for (let index = 0; index < data.value.length; index++) {
            const element = data.value[index];
            if (!element.url) {
                RuntimeLibrary.Instance.getTextureURL(element.sourceUUID).then(url => {
                    element.url = url
                })
            }
        }
    }
}



function choose(item?: any) {
    selectedItem.value = item;
}

function close() {
    visible.value = false;
    props.close();
}

function confirm() {
    props.choose(selectedItem.value);
    visible.value = false;
}

async function add() {
    const fileList = await Utils.chooseFile('image/*', true);
    console.log(fileList)
    const array = [...fileList].filter(x => (x.type == 'image/png' || x.type == 'image/jpeg' || x.type == 'image/webp') || x.name.endsWith('.hdr'))
    console.log(array);
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        await RuntimeLibrary.Instance.importTexture(element)
    }
    getResList()
}



</script>
<style scoped lang='scss'>
.choose-res-dialog-content {
    height: 400px;
    overflow: auto;
    padding: 10px;
    background-color: var(--bg-color-1);
    border-radius: var(--border-radius);

    .action {
        margin-bottom: 10px;
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .grid-item {
        padding: 5px;
        border: 2px solid transparent;
    }

    .selected {
        border: 2px solid var(--el-color-primary);
    }
}

.dialog-footer {
    display: flex;
    justify-content: center;
    gap: 20px;

    .el-button {
        width: 100px;
    }
}
</style>
<style lang="scss">
.choose-res-dialog-content {
    .action {
        .el-input {
            .el-input__inner {
                padding-left: 10px;
            }
        }
    }
}
</style>