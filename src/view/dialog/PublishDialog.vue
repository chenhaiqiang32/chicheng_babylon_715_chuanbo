<template>
    <ElDialog :title="$t(`dialog.publish.title`)" v-model="model" @close="close" width="550">
        <div class="dialog-content">
            <Field :title="$t('dialog.publish.selectScene')">
                <Grid :data="sceneInfoList" :minWidth="100" :rowHeight="20" :gap="10" :dense="true">
                    <template #default="{ item }">
                        <span class="item" :class="{ 'selected': !excludeScene.includes(item.uuid) }"
                            @click="onSelectScene(item)">
                            {{ item.name }}
                        </span>
                    </template>
                </Grid>
            </Field>
            <Field :title="$t('dialog.publish.meshCompress')">
                <ElRadioGroup v-model="meshCompress" type="button">
                    <el-radio-button :label="$t('dialog.publish.noCompress')" :value="0" />
                    <el-radio-button :label="$t('dialog.publish.lowCompress')" :value="2" />
                    <el-radio-button :label="$t('dialog.publish.midCompress')" :value="3" />
                    <el-radio-button :label="$t('dialog.publish.highCompress')" :value="5" />
                </ElRadioGroup>
            </Field>
            <Field :title="$t('dialog.publish.textureCompress')">
                <ElSwitch v-model="textureCompress" active-value="true" inactive-value="false" />
            </Field>
            <Field :title="$t('dialog.publish.offline')">
                <ElSwitch v-model="offline" active-value="true" inactive-value="false" />
            </Field>
            <Field title="">
                <ElButton type="primary" style="width: 100%; " @click="onPublish">{{ $t('dialog.publish.title') }}
                </ElButton>
            </Field>
        </div>
    </ElDialog>
</template>

<script lang="ts" setup>
import { PublishAssets } from '@/3d/assets/PublishLibrary';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { Editor } from '@/3d/Editor';
import Field from '@/component/common/Field.vue';
import Grid from '@/component/common/Grid.vue';
import { useEditor } from '@/store/useEditor';
import { useScene } from '@/store/useScene';
import { Tools } from '@babylonjs/core';
import { ElDialog } from 'element-plus';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
const model = ref(true);
const { sceneInfoList } = storeToRefs(useScene())
const meshCompress = ref(0);
const textureCompress = ref(false);
const offline = ref(false);
const { loading } = storeToRefs(useEditor());


const excludeScene = ref<string[]>([])
const props = defineProps<{
    close: () => void,
}>()

function onSelectScene(item: { uuid?: string }) {
    if (excludeScene.value?.includes(item.uuid)) {
        excludeScene.value = excludeScene.value.filter((uuid) => uuid !== item.uuid);
    } else {
        excludeScene.value?.push(item.uuid);
    }
}


async function onPublish() {
    await useScene().saveScene(Editor.Instance.Scene);
    let publishScenes = sceneInfoList.value.filter(x => !excludeScene.value?.includes(x.uuid))
    const publish = new PublishAssets(RuntimeLibrary.Instance);
    const buffer = await publish.addScene(publishScenes, (v) => {
        loading.value = v;
    }, meshCompress.value);
    //@ts-ignore
    Tools.Download(new Blob([buffer], { type: 'application/zip' }), 'publish.zip');
}
</script>
<style scoped lang="scss">
.dialog-content {
    display: flex;
    flex-direction: column;
    gap: 20px;

    .item {
        min-width: 80px;
        height: 30px;
        padding: 5px 10px;
        border-radius: 5px;
        background-color: var(--bg-color-2);
        cursor: pointer;

        &.selected {
            background-color: var(--select--color);
            color: #fff;
        }
    }


}
</style>
