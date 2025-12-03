<template>
    <ElDialog :title="$t(`dialog.chooseSaveMode.title`)" v-model="model" @close="close" width="550">
        <div class="dialog-content">
            <div class="item" @click="onChooseMode?.(FileMode.LOCAL)">
                {{ $t(`dialog.chooseSaveMode.local`) }}
            </div>
            <div class="item" @click="onChooseMode?.(FileMode.INDEXEDDB)">
                {{ $t(`dialog.chooseSaveMode.indexDB`) }}
            </div>
        </div>
    </ElDialog>
</template>

<script lang="ts" setup>
import { FileMode } from '@/3d/assets/file/IFile';
import { ElDialog } from 'element-plus';
import { ref } from 'vue';
const model = ref(true);
const props = defineProps<{
    close: () => void,
    onChooseMode: (mode: FileMode) => void
}>()




</script>
<style scoped lang="scss">
.dialog-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;

    .item {
        width: 200px;
        height: 80px;
        background-color: var(--bg-color-2);
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
            background-color: var(--bg-color-3);
        }

        &:active {
            opacity: .8;
        }
    }
}
</style>
