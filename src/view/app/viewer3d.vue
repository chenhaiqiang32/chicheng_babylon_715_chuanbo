<!--
  仅负责三维画布 + message 桥接（与 /app 的 index.vue 解耦）。
  父页面（如 public/demo-3d-host.html）通过 iframe 加载 #/3d-viewer 或 #/app/3d，
  使用 postMessage：
  - 父 → 子：{ source: 'cc-app', type: 'invoke', id, method, args? }
  - 子 → 父：{ source: 'cc-3d', type: 'loading'|'ready'|'cameraDebug'|'invokeResult', ... }
  见 src/3d/app/appDemoBootstrap.ts
-->
<template>
    <div class="viewer-wrap">
        <canvas ref="canvasEl" class="viewer-canvas"></canvas>
        <div class="fps" v-if="fpsVisible">{{ fpsText }}</div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { bootstrapAppDemo, setupAppDemoChildBridge } from '@/3d/app';
import { parseRendererPerformanceFromQuery } from '@/3d/app/demoConfig';

const route = useRoute();
const canvasEl = ref<HTMLCanvasElement | null>(null);

let destroyBootstrap: (() => void) | undefined;
let removeBridge: (() => void) | undefined;
let fpsRaf: number | null = null;
const fps = ref(0);
const fpsVisible = ref(true);
const fpsText = computed(() => `FPS: ${Math.round(fps.value)}`);

onMounted(async () => {
    const canvas = canvasEl.value;
    if (!canvas) return;

    removeBridge = setupAppDemoChildBridge();

    const projectId = (route.query.projectId as string) || '';
    const rendererPerformance = parseRendererPerformanceFromQuery(route.query as any);
    const { destroy, app } = await bootstrapAppDemo({
        canvas,
        projectId,
        onLoading: () => {},
        rendererPerformance,
    });
    destroyBootstrap = destroy;

    // 帧率显示：用于 demo-3d-host 高频推送（0.5s）时观察卡顿/抖动
    const tick = () => {
        fps.value = app.getRenderFps();
        fpsRaf = requestAnimationFrame(tick);
    };
    fpsRaf = requestAnimationFrame(tick);
});

onUnmounted(() => {
    removeBridge?.();
    destroyBootstrap?.();
    if (fpsRaf != null) {
        cancelAnimationFrame(fpsRaf);
        fpsRaf = null;
    }
});
</script>

<style scoped>
.viewer-wrap {
    position: relative;
    width: 100%;
    height: 100%;
}
.viewer-canvas {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
}
.fps {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 6px 8px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 12px;
    line-height: 1;
    user-select: none;
    pointer-events: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}
</style>
