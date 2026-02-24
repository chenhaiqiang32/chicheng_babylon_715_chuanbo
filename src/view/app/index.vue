<template>
    <div class="app-container">
        <canvas id="canvas" ref="canvas"></canvas>
    </div>
    <div class="btn">
        <div @click="next">下一个</div>
        <div @click="prev">上一个</div>
    </div>
    <Loading :progress="loading" v-if="loading > 0 && loading < 1"> </Loading>

</template>
<script lang="ts" setup>
import { App } from '@/3d/app';
import { onMounted, ref } from 'vue';
import { AppAssets } from '@/3d/assets/PublishLibrary';
import Loading from '@/component/common/Loading.vue'
import '../../ai'


const props = defineProps<{ projectId: string }>()

const canvas = ref<HTMLCanvasElement>(null);
const loading = ref<number>(0);

onMounted(async () => {
    if (canvas.value) {
        await App.Instance.init(canvas.value, true);
    }
    const assets = new AppAssets();
    await assets.loadFromUrl(props.projectId || './ship.zip', (progress) => {
        loading.value = progress * 0.4;
    });
    App.Instance.setAssetsLibrary(assets);
    await App.Instance.setScene((progress) => {
        loading.value = progress * 0.6 + 0.4;
    });
});

let currentIndex = ref(0);

const next = () => {
    if (currentIndex.value < App.Instance.allCount - 1) {
        currentIndex.value++;
        App.Instance.setIndex(currentIndex.value);
    }
}

const prev = () => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
        App.Instance.setIndex(currentIndex.value);
    }
}



</script>
<style scoped lang="scss">
.app-container {
    width: 100%;
    height: 100%;

    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
}

.btn {
    position: absolute;
    top: 10px;
    left: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    border-radius: 5px;
    color: #fff;

    div {
        background-color: rgba(0, 0, 0, 0.5);
        padding: 5px;
        border-radius: 5px;
        width: 100px;
        height: 60px;
        line-height: 60px;
        text-align: center;
        cursor: pointer;
        transition: background-color 0.3s ease-in-out;

        &:hover {
            background-color: rgba(0, 0, 0, 0.8);
        }

        &:active {
            background-color: rgba(0, 0, 0, 0.6);
        }
    }

}
</style>