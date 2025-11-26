<template>
    <BasePanel title="属性">
        <div class="block-list">
            <Block title="属性">
                <Field title="名称" helper="请输入名称">
                    <el-input placeholder="请输入名称" size="small" />
                </Field>
            </Block>
        </div>
    </BasePanel>
</template>
<script setup lang='ts'>
import BasePanel from '@/component/common/BasePanel.vue'
import Block from '@/component/common/Block.vue'
import Field from '@/component/common/Field.vue'
import { onMounted } from 'vue'


onMounted(() => {

})






</script>
<style scoped lang='scss'>
.block-list {
    padding: 10px;
}
</style>