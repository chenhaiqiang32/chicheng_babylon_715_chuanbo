<template>
    <ElDialog v-model="visible" :title="$t('chooseResDialog.title')" @close="close">
        <div class="choose-res-dialog-content" @click.stop="choose()">
            <Grid :data="data" :minWidth="100" :rowHeight="100" :gap="30" :dense="true">
                <template #default="{ item }">
                    <div class="grid-item" @click.stop="choose(item)" :class="{ 'selected': item == selectedItem }">
                        <img :src="item.url" alt="" style="width: 100%; height: 100%;">
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
import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';
import Grid from '@/component/common/Grid.vue';
import { ElDialog } from 'element-plus';
import { onMounted, onUnmounted, ref, shallowRef } from 'vue';
const visible = ref<boolean>(true);
const props = defineProps<{
    close: () => void,
    choose: (res: any) => void,
    type: 'materail' | 'texture'
}>();

const selectedItem = shallowRef<any>(null);
const data = shallowRef<any[]>([]);

onMounted(() => {
    if (props.type == 'materail') {
        data.value = RuntimeLibrary.Instance.sceneAssets.flatMap(item => item.material);
    } else {
        data.value = RuntimeLibrary.Instance.sceneAssets.flatMap(item => item.texture);
    }
});

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

</script>
<style scoped lang='scss'>
.choose-res-dialog-content {
    height: 400px;
    overflow: auto;
    padding: 20px;
    background-color: var(--bg-color-1);
    border-radius: var(--border-radius);

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