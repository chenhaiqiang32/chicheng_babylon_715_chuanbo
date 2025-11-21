<template>
    <div class="editor-container">
        <Header></Header>
        <ElSplitter :lazy="true">
            <ElSplitterPanel min="600px">
                <ElSplitter :lazy="true" layout="vertical">
                    <ElSplitterPanel>
                        <ElSplitter :lazy="true">
                            <ElSplitterPanel min="280px" size="280px" collapsible>
                                <Hierarchy />
                            </ElSplitterPanel>
                            <ElSplitterPanel min="280px">
                                <Scene />
                            </ElSplitterPanel>
                        </ElSplitter>
                    </ElSplitterPanel>
                    <ElSplitterPanel min="280px" size="280px">
                        <Animation />
                    </ElSplitterPanel>
                </ElSplitter>
            </ElSplitterPanel>
            <ElSplitterPanel min="280px" size="280px" collapsible>
                <Inspector />
            </ElSplitterPanel>

        </ElSplitter>
    </div>
</template>
<script setup lang='ts'>
import { onMounted, } from 'vue';
import Header from './Header.vue'
import Scene from './panel/Scene.vue'
import Animation from './panel/Animation.vue'
import Inspector from './panel/Inspector.vue'


import Hierarchy from './panel/Hierarchy.vue'

onMounted(() => {

})


</script>
<style scoped lang='scss'>
.editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;

}
</style>
