<template>
    <ElDialog title="场景设置" v-model="model" draggable width="450px" :modal="false" :resizable="true">
        <div class="dialog-content">
            <ElScrollbar>
                <SceneSetting />
            </ElScrollbar>
        </div>
    </ElDialog>
</template>
<script setup lang='ts'>
import { ref } from 'vue';
import SceneSetting from '../panel/inspector/SceneSetting.vue'
const model = ref(true)
const props = defineProps<{
    close: () => void
}>();


</script>
<style scoped lang='scss'>
.dialog-content {
    height: 500px;
}
</style>