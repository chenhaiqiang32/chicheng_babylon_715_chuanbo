<!--
  仅负责三维画布 + message 桥接（与 /app 的 index.vue 解耦）。
  父页面（如 public/demo-3d-host.html）通过 iframe 加载 #/3d-viewer 或 #/app/3d，
  使用 postMessage：
  - 父 → 子：{ source: 'cc-app', type: 'invoke', id, method, args? }
  - 子 → 父：{ source: 'cc-3d', type: 'loading'|'ready'|'cameraDebug'|'invokeResult', ... }
  见 src/3d/app/appDemoBootstrap.ts
-->
<template>
    <canvas ref="canvasEl" class="viewer-canvas"></canvas>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { bootstrapAppDemo, setupAppDemoChildBridge } from '@/3d/app';
import { parseRendererPerformanceFromQuery } from '@/3d/app/demoConfig';

const route = useRoute();
const canvasEl = ref<HTMLCanvasElement | null>(null);

let destroyBootstrap: (() => void) | undefined;
let removeBridge: (() => void) | undefined;

onMounted(async () => {
    const canvas = canvasEl.value;
    if (!canvas) return;

    removeBridge = setupAppDemoChildBridge();

    const projectId = (route.query.projectId as string) || '';
    const rendererPerformance = parseRendererPerformanceFromQuery(route.query as any);
    const { destroy } = await bootstrapAppDemo({
        canvas,
        projectId,
        onLoading: () => {},
        rendererPerformance,
    });
    destroyBootstrap = destroy;
});

onUnmounted(() => {
    removeBridge?.();
    destroyBootstrap?.();
});
</script>

<style scoped>
.viewer-canvas {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
}
</style>
