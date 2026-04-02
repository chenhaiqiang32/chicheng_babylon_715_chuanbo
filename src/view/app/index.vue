<template>
    <div class="app-container">
        <canvas id="canvas" ref="canvas"></canvas>
    </div>
    <div class="btn">
        <div class="panel-tabs">
            <button
                class="tab-btn"
                :class="{ active: activePanel === 'camera' }"
                type="button"
                @click="activePanel = 'camera'"
            >
                相机
            </button>
            <button
                class="tab-btn"
                :class="{ active: activePanel === 'model' }"
                type="button"
                @click="activePanel = 'model'"
            >
                模型&动画
            </button>
            <button
                class="tab-btn"
                :class="{ active: activePanel === 'env' }"
                type="button"
                @click="activePanel = 'env'"
            >
                环境
            </button>
            <button
                class="tab-btn"
                :class="{ active: activePanel === 'sea' }"
                type="button"
                @click="activePanel = 'sea'"
            >
                海面
            </button>
            <button
                class="tab-btn"
                :class="{ active: activePanel === 'post' }"
                type="button"
                @click="activePanel = 'post'"
            >
                后处理
            </button>
            <button
                class="tab-btn"
                :class="{ active: activePanel === 'rope' }"
                type="button"
                @click="activePanel = 'rope'"
            >
                绳子
            </button>
        </div>

        <div class="panel-body">
            <section v-show="activePanel === 'camera'" class="panel">
                <div class="anim-label">镜头切换</div>
                <div class="camera-presets">
                    <div v-for="(p, key) in cameraPresets" :key="key" class="preset-btn" @click="switchCamera(key)">
                        {{ p.label }}
                    </div>
                </div>

                <div class="anim-label" style="margin-top:8px;">相机限制 Demo（调试）</div>
                <div class="preset-btn" @click="applyDefaultCameraViewLimits">应用默认限制范围</div>
                <div class="anim-row">
                    <label class="anim-checkbox">
                        <input type="checkbox" v-model="cameraHelperOn" @change="applyCameraHelpers" />
                        <span>相机辅助线</span>
                    </label>
                    <label class="anim-checkbox" style="margin-left:10px;">
                        <input type="checkbox" v-model="cameraTargetHelperOn" @change="applyCameraHelpers" />
                        <span>目标点辅助</span>
                    </label>
                </div>
                <div class="camera-debug-text">{{ cameraDebugText }}</div>
            </section>

            <section v-show="activePanel === 'model'" class="panel">
                <div class="panel-actions">
                    <div class="action-btn" @click="next">下一个</div>
                    <div class="action-btn" @click="prev">上一个</div>
                </div>

                <div class="action-btn" @click="togglePropellerWave" :class="{ active: propellerWaveOn }">
                    螺旋桨波浪（面片） {{ propellerWaveOn ? '开' : '关' }}
                </div>
                <div class="action-btn" @click="togglePropellerParticles" :class="{ active: propellerParticlesOn }">
                    浪花粒子 {{ propellerParticlesOn ? '开' : '关' }}
                </div>

                <div class="anim-row" style="margin-top:8px;">
                    <label class="anim-checkbox">
                        <input type="checkbox" v-model="propellerWaveParticlesOn" @change="applyPropellerWaveParticlesEnabled" />
                        <span>浪花粒子</span>
                    </label>
                </div>

                <template v-if="modelNames.length">
                    <div class="anim-label">模型</div>
                    <select v-model="currentModelName" class="anim-select" @change="onModelChange">
                        <option v-for="(name, i) in modelNames" :key="i" :value="name">{{ name }}</option>
                    </select>
                </template>

                <template v-if="animationNames.length">
                    <div class="anim-label">动画</div>
                    <select v-model="currentAnimName" class="anim-select">
                        <option value="">-- 选择动画 --</option>
                        <option v-for="(name, i) in animationNames" :key="i" :value="name">{{ name }}</option>
                    </select>
                    <div class="anim-row">
                        <label class="anim-checkbox">
                            <input type="checkbox" v-model="animationLoop" @change="onLoopChange" />
                            <span>循环播放</span>
                        </label>
                    </div>
                    <div class="anim-row clip-row">
                        <div class="anim-label">裁剪：起始帧 / 结束帧</div>
                        <div class="clip-inputs">
                            <input type="number" class="anim-num" v-model.number="clipFrom" min="0" step="1" />
                            <span class="clip-sep">–</span>
                            <input type="number" class="anim-num" v-model.number="clipTo" min="0" step="1" />
                        </div>
                        <div class="anim-util" @click="resetClipToFull">恢复完整</div>
                    </div>
                    <div class="anim-label">进度 {{ Math.round(animationProgress * 100) }}%</div>
                    <input
                        type="range"
                        class="anim-slider"
                        min="0"
                        max="100"
                        step="0.1"
                        :value="animationProgress * 100"
                        @input="onProgressInput"
                    />
                    <div class="panel-actions">
                        <div class="action-btn" @click="playCurrentAnim">正放</div>
                        <div class="action-btn" @click="playCurrentAnimReverse">倒放</div>
                        <div class="action-btn" @click="stopAnim">停止</div>
                    </div>
                </template>
            </section>

            <section v-show="activePanel === 'env'" class="panel">
                <div class="anim-label">HDR 环境（仅模型反射）</div>
                <div class="anim-label">环境贴图 URL</div>
                <select v-model="hdrUrl" class="anim-select" :disabled="hdrLoading" @change="onHdrUrlSelectChange">
                    <option v-for="(u, i) in hdrUrlOptions" :key="i" :value="u">{{ u }}</option>
                </select>
                <input
                    type="text"
                    class="anim-input"
                    v-model="hdrUrl"
                    :disabled="hdrLoading"
                    placeholder="/hdr/xxx.hdr 或 /xxx.hdr"
                />
                <div class="anim-label">贴图尺寸 {{ hdrSize }}</div>
                <input type="range" class="anim-slider" min="128" max="512" step="128" v-model.number="hdrSize" />
                <div class="anim-label">环境强度 {{ hdrIntensity.toFixed(2) }}</div>
                <input
                    type="range"
                    class="anim-slider"
                    min="0"
                    max="2"
                    step="0.05"
                    v-model.number="hdrIntensity"
                    @input="onHdrIntensityInput"
                />

                <div class="anim-label" style="margin-top:8px;">天空盒（用于水面反射）</div>
                <div class="anim-label">天空盒 URL</div>
                <input type="text" class="anim-input" v-model="skyboxUrl" placeholder="/environment/512/TropicalSunnyDay" />
                <div class="anim-label">天空盒尺寸 {{ skyboxSize }}</div>
                <input type="range" class="anim-slider" min="128" max="1024" step="128" v-model.number="skyboxSize" />
                <div class="action-btn btn-apply" @click="applySkybox">应用天空盒到水面</div>
            </section>

            <section v-show="activePanel === 'sea'" class="panel">
                <div class="anim-label">海面参数 Demo（WaterMaterial）</div>
                <div class="anim-label">风向 windDirection (x/y)</div>
                <div class="sea-row">
                    <input type="number" class="anim-num" v-model.number="seaWindDirX" step="0.05" />
                    <input type="number" class="anim-num" v-model.number="seaWindDirY" step="0.05" />
                </div>
                <div class="anim-label">风力 windForce {{ seaWindForce.toFixed(2) }}</div>
                <input type="range" class="anim-slider" min="0" max="20" step="0.1" v-model.number="seaWindForce" />
                <div class="anim-label">浪高 waveHeight {{ seaWaveHeight.toFixed(3) }}</div>
                <input type="range" class="anim-slider" min="0" max="2" step="0.01" v-model.number="seaWaveHeight" />
                <div class="anim-label">凹凸 bumpHeight {{ seaBumpHeight.toFixed(2) }}</div>
                <input type="range" class="anim-slider" min="0" max="4" step="0.02" v-model.number="seaBumpHeight" />
                <div class="anim-label">波长 waveLength {{ seaWaveLength.toFixed(3) }}</div>
                <input
                    type="range"
                    class="anim-slider"
                    min="0.01"
                    max="1"
                    step="0.005"
                    v-model.number="seaWaveLength"
                />
                <div class="anim-label">波速 waveSpeed {{ seaWaveSpeed.toFixed(1) }}</div>
                <input type="range" class="anim-slider" min="0" max="200" step="1" v-model.number="seaWaveSpeed" />
                <div class="anim-label">颜色混合 colorBlendFactor {{ seaColorBlendFactor.toFixed(2) }}</div>
                <input
                    type="range"
                    class="anim-slider"
                    min="0"
                    max="1"
                    step="0.01"
                    v-model.number="seaColorBlendFactor"
                />
                <div class="anim-label">法线平铺 bumpTexture u/v</div>
                <div class="sea-row">
                    <input type="number" class="anim-num" v-model.number="seaBumpU" min="0.1" step="0.1" />
                    <input type="number" class="anim-num" v-model.number="seaBumpV" min="0.1" step="0.1" />
                </div>
                <div class="anim-label">水色 waterColor</div>
                <input type="color" class="sea-color" v-model="seaColorHex" />
                <div class="anim-row sea-actions">
                    <div class="preset-btn" @click="applySeaParams">应用到海面</div>
                    <div class="preset-btn" @click="resetSeaParams">重置默认</div>
                </div>
            </section>

            <section v-show="activePanel === 'post'" class="panel">
                <div class="anim-label">相机后处理</div>
                <div class="action-btn" @click="toggleUnderwater" :class="{ active: underwaterOn }">
                    海水下效果 {{ underwaterOn ? '开' : '关' }}
                </div>

                <div class="anim-label" style="margin-top:8px;">场景颜色饱和度</div>
                <label class="anim-checkbox">
                    <input type="checkbox" v-model="saturationOn" @change="applySaturation" />
                    <span>启用饱和度增强</span>
                </label>
                <div class="anim-label">强度 {{ saturation.toFixed(0) }}</div>
                <input
                    type="range"
                    class="anim-slider"
                    min="-100"
                    max="100"
                    step="1"
                    v-model.number="saturation"
                    @input="applySaturation"
                    :disabled="!saturationOn"
                />
            </section>

            <section v-show="activePanel === 'rope'" class="panel">
                <template v-if="ropeDemoReady">
                    <div class="anim-label">绳子 Demo</div>
                    <div class="anim-label">当前操控绳子</div>
                    <select v-model="ropeControlTarget" class="anim-select" @change="onRopeControlTargetChange">
                        <option v-for="opt in ropeControlOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                    <div class="anim-label">距离（相对 A）: {{ ropeDistance.toFixed(2) }}</div>
                    <input
                        type="range"
                        class="anim-slider"
                        min="0.5"
                        max="20"
                        step="0.1"
                        v-model.number="ropeDistance"
                        @input="onRopeParamsChange"
                    />
                    <div class="anim-label">水平角 yaw（度，绕 Y 轴）: {{ ropeYaw.toFixed(1) }}</div>
                    <input
                        type="range"
                        class="anim-slider"
                        min="-180"
                        max="180"
                        step="1"
                        v-model.number="ropeYaw"
                        @input="onRopeParamsChange"
                    />
                    <div class="anim-label">俯仰角 pitch（度，向上为正）: {{ ropePitch.toFixed(1) }}</div>
                    <input
                        type="range"
                        class="anim-slider"
                        min="-89"
                        max="89"
                        step="1"
                        v-model.number="ropePitch"
                        @input="onRopeParamsChange"
                    />
                </template>

                <template v-if="flexibleRopeReady">
                    <div class="anim-label" style="margin-top:10px;">柔性绳子 Demo（17 个中间点）</div>
                    <div class="anim-label">当前绳子</div>
                    <select v-model="flexibleRopeFirstId" class="anim-select" @change="onFlexibleRopeControlTargetChange">
                        <option v-for="id in flexibleRopeIds" :key="id" :value="id">{{ id }}</option>
                    </select>
                    <div class="anim-label">绳子方向 水平角 yaw（度，绕 Y 轴）: {{ flexibleRopeYaw.toFixed(1) }}</div>
                    <input
                        type="range"
                        class="anim-slider"
                        min="-180"
                        max="180"
                        step="1"
                        v-model.number="flexibleRopeYaw"
                        @input="onFlexibleRopeDirectionChange"
                    />
                    <div class="anim-label">绳子方向 俯仰角 pitch（度，向上为正）: {{ flexibleRopePitch.toFixed(1) }}</div>
                    <input
                        type="range"
                        class="anim-slider"
                        min="-89"
                        max="89"
                        step="1"
                        v-model.number="flexibleRopePitch"
                        @input="onFlexibleRopeDirectionChange"
                    />
                    <label class="anim-checkbox" style="margin-bottom:6px;">
                        <input
                            type="checkbox"
                            v-model="flexibleRopePointsVisible"
                            @change="onFlexibleRopePointsVisibleChange"
                        />
                        <span>显示控制点小球</span>
                    </label>
                    <div v-for="(yaw, idx) in flexibleRopePointYaws" :key="idx" class="anim-row">
                        <div class="anim-label">
                            点 #{{ idx + 1 }} 偏移 yaw: {{ yaw.toFixed(1) }}° / pitch:
                            {{ flexibleRopePointPitches[idx]?.toFixed(1) }}°
                        </div>
                        <div class="anim-label" style="margin-top:4px;">水平偏移 yaw（度）</div>
                        <input
                            type="range"
                            class="anim-slider"
                            min="-180"
                            max="180"
                            step="1"
                            v-model.number="flexibleRopePointYaws[idx]"
                            @input="applyFlexibleRopeOffsets"
                        />
                        <div class="anim-label" style="margin-top:4px;">俯仰偏移 pitch（度）</div>
                        <input
                            type="range"
                            class="anim-slider"
                            min="-89"
                            max="89"
                            step="1"
                            v-model.number="flexibleRopePointPitches[idx]"
                            @input="applyFlexibleRopeOffsets"
                        />
                    </div>

                    <div class="anim-label" style="margin-top:10px;">柔性绳子信息牌</div>
                    <div class="anim-row">
                        <div class="preset-btn" @click="showAllFlexibleRopeBoards">全部显示</div>
                        <div class="preset-btn" @click="hideAllFlexibleRopeBoards">全部隐藏</div>
                    </div>
                    <div class="anim-label">按相机距离显示</div>
                    <div class="anim-row">
                        <label class="anim-checkbox">
                            <input
                                type="checkbox"
                                v-model="cameraDistanceFilterOn"
                                @change="applyFlexibleRopeCameraDistanceFilter"
                            />
                            <span>启用相机距离过滤</span>
                        </label>
                    </div>
                    <div class="anim-row">
                        <div class="anim-label">最大可见距离 {{ cameraMaxDistance.toFixed(1) }}</div>
                        <input
                            type="range"
                            class="anim-slider"
                            min="2"
                            max="60"
                            step="0.5"
                            v-model.number="cameraMaxDistance"
                            @input="applyFlexibleRopeCameraDistanceFilter"
                        />
                    </div>
                </template>
            </section>
        </div>
    </div>
    <Loading :progress="loading" v-if="loading > 0 && loading < 1"> </Loading>

</template>
<script lang="ts" setup>
import { App, MODEL_URLS, HDR_URLS, type CameraViewPreset, type SeaParams } from '@/3d/app';
import {
    cameraPresetsConfig,
    defaultCameraViewLimitConfig,
    hdrDemoConfig,
    hdrEnvironmentRotationDefaults,
    skyboxDemoConfig,
    seaDemoDefaults,
    sceneSaturationDefaults,
    ropeDemoConfig,
    ropeDemoModelBindings,
    flexibleRopeDemoConfig,
    flexibleRopeCreateExample,
} from '@/3d/app/demoConfig';
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { AppAssets } from '@/3d/assets/PublishLibrary';
import Loading from '@/component/common/Loading.vue'
import '../../ai'


const props = defineProps<{ projectId: string }>()

type PanelKey = 'camera' | 'model' | 'env' | 'sea' | 'post' | 'rope';
const ACTIVE_PANEL_STORAGE_KEY = 'cc-editor:activePanel';
const activePanel = ref<PanelKey>('camera');

function isPanelKey(v: unknown): v is PanelKey {
    return (
        v === 'camera' ||
        v === 'model' ||
        v === 'env' ||
        v === 'sea' ||
        v === 'post' ||
        v === 'rope'
    );
}

// 记住上次选择的面板，避免每次打开都从头翻找
try {
    const cached = localStorage.getItem(ACTIVE_PANEL_STORAGE_KEY);
    if (isPanelKey(cached)) activePanel.value = cached;
} catch {
    // ignore
}

watch(activePanel, (v) => {
    try {
        localStorage.setItem(ACTIVE_PANEL_STORAGE_KEY, v);
    } catch {
        // ignore
    }
});

const canvas = ref<HTMLCanvasElement>(null);
const loading = ref<number>(0);
const loadedAsModel = ref(false);
const currentModelName = ref('');
// 已加载模型名称列表（使用 ref，手动在加载完成后更新，避免计算属性在无依赖时不重新求值）
const modelNames = ref<string[]>([]);
const animationNames = computed(() => {
    if (!loadedAsModel.value) return [];
    const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
    if (!name) return [];
    return App.Instance.getAnimationNames(name);
});
const currentAnimName = ref('');
/** 是否循环播放动画，默认不循环 */
const animationLoop = ref(false);
/** 裁剪：起始帧、结束帧（用于播放区间） */
const clipFrom = ref(0);
const clipTo = ref(60);
/** 动画播放进度 0~1，用于显示与拖动 */
const animationProgress = ref(0);
let progressTick: ReturnType<typeof setInterval> | null = null;
let cameraDebugTick: ReturnType<typeof setInterval> | null = null;
let removeInfoBoardMessageListener: (() => void) | undefined;

// HDR 环境配置（仅用于模型反射）
const hdrUrl = ref(hdrDemoConfig.defaultUrl);
const hdrUrlOptions = computed(() => {
    const list = [hdrUrl.value, ...HDR_URLS].filter((x) => typeof x === 'string' && x.trim().length > 0);
    return Array.from(new Set(list));
});
const hdrSize = ref(hdrDemoConfig.defaultSize);
const hdrIntensity = ref(hdrDemoConfig.defaultIntensity);
const hdrLoading = ref(false);

function onHdrUrlSelectChange() {
    // 切换下拉后立刻生效
    applyHdr();
}

// 天空盒 + 水面反射配置（与 HDR 环境解耦）
const skyboxUrl = ref(skyboxDemoConfig.defaultUrl);
const skyboxSize = ref(skyboxDemoConfig.defaultSize);

// 海面参数 Demo（从 App.getSeaParams() 读取当前值作为默认；此处仅为 UI 初始值）
const seaWindForce = ref(seaDemoDefaults.params.windForce ?? 8);
const seaWaveHeight = ref(seaDemoDefaults.params.waveHeight ?? 0.1);
const seaBumpHeight = ref(seaDemoDefaults.params.bumpHeight ?? 0.5);
const seaWaveLength = ref(seaDemoDefaults.params.waveLength ?? 0.15);
const seaWaveSpeed = ref(seaDemoDefaults.params.waveSpeed ?? 50);
const seaColorBlendFactor = ref(seaDemoDefaults.params.colorBlendFactor ?? 0.25);
const seaBumpU = ref(seaDemoDefaults.params.bumpTextureScale?.u ?? 3);
const seaBumpV = ref(seaDemoDefaults.params.bumpTextureScale?.v ?? 3);
const seaWindDirX = ref(seaDemoDefaults.params.windDirection?.x ?? 1);
const seaWindDirY = ref(seaDemoDefaults.params.windDirection?.y ?? 0.35);
const seaColorHex = ref(
    typeof seaDemoDefaults.params.waterColor === 'string'
        ? seaDemoDefaults.params.waterColor
        : seaDemoDefaults.colorHex,
);

const cameraDistanceFilterOn = ref(true);
const cameraMaxDistance = ref(30);
const underwaterOn = ref(false);
const saturationOn = ref<boolean>(sceneSaturationDefaults.enabled);
const saturation = ref<number>(sceneSaturationDefaults.value);

// 相机限制 Demo（调试用）
const cameraHelperOn = ref(false);
const cameraTargetHelperOn = ref(false);
const cameraDebugText = ref('相机：未初始化');

function applyDefaultCameraViewLimits() {
    // 默认范围：方便拖拽/缩放时直观看到“被钳制”
    App.Instance.setCameraViewLimits({
        panRadius: defaultCameraViewLimitConfig.panRadius,
        maxRadius: defaultCameraViewLimitConfig.maxRadius,
        minTargetY: defaultCameraViewLimitConfig.minTargetY,
        maxTargetY: defaultCameraViewLimitConfig.maxTargetY,
        limitFlipTo90Deg: defaultCameraViewLimitConfig.limitFlipTo90Deg,
    });
    // 立刻刷新一次显示
    updateCameraDebugText();
}

function applyCameraHelpers() {
    App.Instance.setCameraHelperEnabled(cameraHelperOn.value);
    App.Instance.setCameraTargetHelperEnabled(cameraTargetHelperOn.value);
}

function updateCameraDebugText() {
    const s = App.Instance.getArcRotateCameraDebugState();
    if (!s) {
        cameraDebugText.value = '相机：非 ArcRotateCamera 或未就绪';
        return;
    }
    const deg = (r: number) => (r * 180) / Math.PI;
    const t = s.target;
    cameraDebugText.value =
        `target=(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})\n` +
        `radius=${s.radius.toFixed(2)}  beta=${deg(s.beta).toFixed(1)}°  alpha=${deg(s.alpha).toFixed(1)}°`;
}

// 绳子 Demo：是否已创建（用于显示控制面板）
const ropeDemoReady = ref(false);
// 绳子 Demo：当前要操控哪一根（用“绳子 id”作为更新定位 key）
const ropeControlTarget = ref<string>('');

const resolvedRopeBindings = computed(() => {
    const fallback = currentModelName.value || App.Instance.getCurrentModelName() || '';
    return ropeDemoModelBindings.map((b, idx) => {
        // if (idx === 2 && fallback) return { ...b, modelBName: fallback };
        return b;
    });
});

function getRopeInitConfigById(id: string) {
    const b = resolvedRopeBindings.value.find((x) => x.id === id);
    const c = b?.config ?? {};
    return {
        textureUrl: c.textureUrl ?? ropeDemoConfig.textureUrl,
        textureWidthPx: c.textureWidthPx ?? ropeDemoConfig.textureWidthPx,
        textureHeightPx: c.textureHeightPx ?? ropeDemoConfig.textureHeightPx,
        initialDistance: c.initialDistance ?? ropeDemoConfig.initialDistance,
        initialYawDeg: c.initialYawDeg ?? ropeDemoConfig.initialYawDeg,
        initialPitchDeg: c.initialPitchDeg ?? ropeDemoConfig.initialPitchDeg,
        ropeRadius: c.ropeRadius ?? ropeDemoConfig.ropeRadius,
        ropeShapeType: c.ropeShapeType ?? 'tube',
        boxFlipAngleDeg: c.boxFlipAngleDeg ?? 0,
        boxFaces: c.boxFaces,
        boxWidth: c.boxWidth,
        boxHeight: c.boxHeight,
    };
}

// 当前操控绳子的参数（切换 ropeControlTarget 时会自动切到该绳子的初始值）
const ropeDistance = ref<number>(Number(ropeDemoConfig.initialDistance));
const ropeYaw = ref<number>(Number(ropeDemoConfig.initialYawDeg));
const ropePitch = ref<number>(Number(ropeDemoConfig.initialPitchDeg));

const ropeControlOptions = computed(() => {
    return resolvedRopeBindings.value.map((b) => ({
        value: b.id,
        label: `${b.meshAName}（B: ${b.modelBName}）`,
    }));
});

// 柔性绳子 Demo：所有绳子 id、当前选中的绳子、其控制点 id 列表、各点角度偏移（度）、绳子方向 yaw/pitch
const flexibleRopeReady = ref(false);
const flexibleRopePointsVisible = ref(false);
const flexibleRopeIds = ref<string[]>([]);
const flexibleRopeFirstId = ref('');
const flexibleRopePointIds = ref<string[]>([]);
const flexibleRopePointYaws = ref<number[]>(
    Array.from({ length: flexibleRopeDemoConfig.pointCount }, () => 0),
);
const flexibleRopePointPitches = ref<number[]>(
    Array.from({ length: flexibleRopeDemoConfig.pointCount }, () => 0),
);
const flexibleRopeYaw = ref(0);
const flexibleRopePitch = ref(0);

function onRopeParamsChange() {
    // 使用“当前操控目标（绳子 id）”更新对应绳子的 B 端位置
    const targetId = ropeControlTarget.value || resolvedRopeBindings.value[0]?.id || '';
    if (!targetId) return;
    App.Instance.updateRopeDemoByAngleDistance(targetId, ropeDistance.value, ropeYaw.value, ropePitch.value);
}

function onRopeControlTargetChange() {
    const targetId = ropeControlTarget.value || resolvedRopeBindings.value[0]?.id || '';
    if (!targetId) return;
    const initCfg = getRopeInitConfigById(targetId);
    ropeDistance.value = initCfg.initialDistance;
    ropeYaw.value = initCfg.initialYawDeg;
    ropePitch.value = initCfg.initialPitchDeg;
    onRopeParamsChange();
}

function onFlexibleRopePointsVisibleChange() {
    App.Instance.setFlexibleRopePointsVisible(flexibleRopePointsVisible.value);
}

function onFlexibleRopeControlTargetChange() {
    const id = flexibleRopeFirstId.value;
    if (!id) return;
    flexibleRopePointIds.value = App.Instance.getFlexibleRopePointIds(id);
    const offsets = App.Instance.getFlexibleRopePointYawPitch(id);
    flexibleRopePointYaws.value = offsets.yawsDeg;
    flexibleRopePointPitches.value = offsets.pitchesDeg;
    const dir = App.Instance.getFlexibleRopeDirection(id);
    if (dir) {
        flexibleRopeYaw.value = dir.yaw;
        flexibleRopePitch.value = dir.pitch;
    }
}

function onFlexibleRopeDirectionChange() {
    if (!flexibleRopeFirstId.value) return;
    App.Instance.updateFlexibleRopeDirection(
        flexibleRopeFirstId.value,
        flexibleRopeYaw.value,
        flexibleRopePitch.value,
    );
}

function applyFlexibleRopeOffsets() {
    if (!flexibleRopeFirstId.value) return;
    App.Instance.updateFlexibleRopePoints({
        parentId: flexibleRopeFirstId.value,
        length: flexibleRopePointIds.value.map((id, i) => ({
            id,
            yaw: flexibleRopePointYaws.value[i] ?? 0,
            pitch: flexibleRopePointPitches.value[i] ?? 0,
        })),
    });
}

function showAllFlexibleRopeBoards() {
    const ids = App.Instance.getAllFlexibleRopePointMeshIds();
    App.Instance.setInfoBoardsVisible(ids);
}
function hideAllFlexibleRopeBoards() {
    App.Instance.setInfoBoardsVisible([]);
}

function applyFlexibleRopeCameraDistanceFilter() {
    // 这里的距离过滤是作用在“信息牌系统”层面的；为了确保控制对象是柔性绳子牌子，
    // 在开启过滤时先把可见集合切到柔性绳子控制点对应的 mesh.id 列表。
    if (cameraDistanceFilterOn.value) {
        const ids = App.Instance.getAllFlexibleRopePointMeshIds();
        App.Instance.setInfoBoardsVisible(ids);
    }
    App.Instance.setInfoBoardsCameraDistanceVisibility(
        cameraDistanceFilterOn.value,
        0,
        cameraMaxDistance.value,
    );
}

function toggleUnderwater() {
    underwaterOn.value = !underwaterOn.value;
    App.Instance.setUnderwaterEffectEnabled(underwaterOn.value, 1);
}

function applySaturation() {
    App.Instance.setSceneSaturationEffectEnabled(saturationOn.value, saturation.value);
}


/** 根据当前模型与动画更新裁剪范围为完整区间（不裁剪） */
function updateClipRangeToDefault() {
    const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
    if (!name) return;
    const animName = currentAnimName.value || undefined;
    const animIndex = currentAnimName.value ? undefined : 0;
    const range = App.Instance.getAnimationFrameRange(name, animName ?? animIndex);
    if (range) {
        clipFrom.value = range.from;
        clipTo.value = range.to;
    }
}

/** 恢复裁剪为完整动画区间 */
function resetClipToFull() {
    const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
    if (!name) return;
    const range = App.Instance.getAnimationFrameRange(name, currentAnimName.value || 0);
    if (range) {
        clipFrom.value = range.from;
        clipTo.value = range.to;
    }
}

/** 镜头预设 demo：从 3D 层配置文件读取，目标点 (0,0,0)，不同角度与距离 */
const cameraPresets: Record<string, { label: string; preset: CameraViewPreset }> = cameraPresetsConfig;
function switchCamera(presetKey: string) {
    const item = cameraPresets[presetKey];
    if (item) App.Instance.switchCameraView(item.preset, { duration: 0.8 });
}

const modelUrl = () => props.projectId || './Dancing.fbx';

const isModelUrl = (url: string) => /\.(glb|gltf|fbx)$/i.test(url);

async function initAppAndCameraDebug() {
    if (canvas.value) {
        await App.Instance.init(canvas.value, true);
    }
    // 同步辅助线开关默认值（init 后才可靠）
    cameraHelperOn.value = App.Instance.isCameraHelperEnabled;
    cameraTargetHelperOn.value = App.Instance.isCameraTargetHelperEnabled;
    updateCameraDebugText();
    if (!cameraDebugTick) {
        cameraDebugTick = setInterval(updateCameraDebugText, 120);
    }
}

function registerAnimationCallbacks() {
    // 注册动画结束回调（正放/倒放播放完成时触发）
    App.Instance.onAnimationEnd((info) => {
        console.log('动画播放结束', info);
    });
}

async function loadAllModels(modelUrls: string[]) {
    // 依次加载多个模型，动画会自动按名称存到 App.modelAnimationsMap 里
    for (const mUrl of modelUrls) {
        await App.Instance.loadModelAndScene(mUrl, (progress) => {
            // 这里是每个模型自己的进度，你可以简单用最后一次覆盖：
            loading.value = progress;
        });
    }
    loadedAsModel.value = true;
}

async function initEnvironmentForModel() {
    // 默认加载 HDR 环境贴图，仅用于模型反射
    await App.Instance.loadHdrEnvironment({
        url: hdrUrl.value || hdrDemoConfig.initFallbackUrl,
        size: hdrSize.value,
        onProgress: (p) => { loading.value = 0.85 + p * 0.15; },
    });
    App.Instance.setEnvironmentIntensity(hdrIntensity.value);
    // 环境贴图逐渐旋转：用于模拟环境光方向变化（默认开启，可在 demoConfig.ts 配置）
    App.Instance.setEnvironmentRotationEnabled(hdrEnvironmentRotationDefaults.enabled);
    App.Instance.setEnvironmentRotationSpeedRadPerSec(hdrEnvironmentRotationDefaults.speedRadPerSec);
    loading.value = 1;

    // 海面参数 demo：读取当前水面参数作为 UI 默认值（不改变现有默认参数）
    syncSeaParamsFromApp();
}

function syncModelUiAfterLoaded() {
    // 加载完成后更新模型名称列表，并同步裁剪区间为完整动画
    modelNames.value = App.Instance.getModelNames();
    currentModelName.value = App.Instance.getCurrentModelName() || '';
    updateClipRangeToDefault();
}

function initRopeDemo() {
    // 绳子 Demo：根据配置初始化生成三根绳子，B 端通过模型名称绑定
    // 若某个模型名称不存在，则对应端点会退回到默认小球。
    const bindings = resolvedRopeBindings.value;
    bindings.forEach((cfg) => {
        const initCfg = getRopeInitConfigById(cfg.id);
        App.Instance.createRopeDemo({
            // 多绳子管理 key：使用唯一 id，避免 rope_Third 重名覆盖
            name: cfg.id,
            // A/B 端按绑定模型名称查找
            meshAName: cfg.meshAName,
            meshBName: cfg.modelBName,
            textureUrl: initCfg.textureUrl,
            textureWidthPx: initCfg.textureWidthPx,
            textureHeightPx: initCfg.textureHeightPx,
            ropeRadius: initCfg.ropeRadius,
            ropeShapeType: initCfg.ropeShapeType,
            boxFlipAngleDeg: initCfg.boxFlipAngleDeg,
            boxFaces: initCfg.boxFaces,
            boxWidth: initCfg.boxWidth,
            boxHeight: initCfg.boxHeight,
            // 仅在 B 未绑定到模型时生效；若 B 已绑定模型，下面会用 updateRopeDemoByAngleDistance 统一初始化
            initialDistance: initCfg.initialDistance,
            initialAngleDeg: initCfg.initialYawDeg,
        });
        // 统一把“每根绳子的初始角度/距离/pitch”应用到该绳子（即使 B 端绑定了模型）
        App.Instance.updateRopeDemoByAngleDistance(
            cfg.id,
            initCfg.initialDistance,
            initCfg.initialYawDeg,
            initCfg.initialPitchDeg,
        );
    });

    ropeDemoReady.value = true;
    // 默认操控第三根，否则第一根
    ropeControlTarget.value = bindings[2]?.id || bindings[0]?.id || '';
    if (ropeControlTarget.value) {
        const initCfg = getRopeInitConfigById(ropeControlTarget.value);
        ropeDistance.value = initCfg.initialDistance;
        ropeYaw.value = initCfg.initialYawDeg;
        ropePitch.value = initCfg.initialPitchDeg;
    }
}

function initFlexibleRopeDemo() {
    App.Instance.createFlexibleRopes(flexibleRopeCreateExample);
    const ropeIds = App.Instance.getFlexibleRopeIds();
    flexibleRopeIds.value = ropeIds;
    if (ropeIds.length > 0) {
        flexibleRopeFirstId.value = ropeIds[0];
        flexibleRopePointIds.value = App.Instance.getFlexibleRopePointIds(ropeIds[0]);
        const offsets = App.Instance.getFlexibleRopePointYawPitch(ropeIds[0]);
        flexibleRopePointYaws.value = offsets.yawsDeg;
        flexibleRopePointPitches.value = offsets.pitchesDeg;
        const dir = App.Instance.getFlexibleRopeDirection(ropeIds[0]);
        if (dir) {
            flexibleRopeYaw.value = dir.yaw;
            flexibleRopePitch.value = dir.pitch;
        }
    }
    flexibleRopeReady.value = true;
    // 默认启用“相机距离过滤”时，初始化完柔性绳子后立刻应用一次，确保进入页面即生效
    if (cameraDistanceFilterOn.value) applyFlexibleRopeCameraDistanceFilter();
}

async function loadSceneFromProjectUrl(url: string) {
    const assets = new AppAssets();
    await assets.loadFromUrl(url, (progress) => {
        loading.value = progress * 0.4;
    });
    App.Instance.setAssetsLibrary(assets);
    await App.Instance.setScene((progress) => {
        loading.value = progress * 0.6 + 0.4;
    });
}

onMounted(async () => {
    await initAppAndCameraDebug();
    registerAnimationCallbacks();

    const url = modelUrl();
    if (isModelUrl(url)) {
        await loadAllModels(MODEL_URLS);
        await initEnvironmentForModel();
        syncModelUiAfterLoaded();
        // initInfoBoardDemo();
        initRopeDemo();
        initFlexibleRopeDemo();
    } else {
        await loadSceneFromProjectUrl(url);
    }
});

let currentIndex = ref(0);
const propellerWaveOn = ref(true);
const propellerParticlesOn = ref(true);
const propellerWaveParticlesOn = ref(true);

const togglePropellerWave = () => {
    propellerWaveOn.value = !propellerWaveOn.value;
    App.Instance.setPropellerWaveEffectEnabled(propellerWaveOn.value);
};

const togglePropellerParticles = () => {
    propellerParticlesOn.value = !propellerParticlesOn.value;
    App.Instance.setPropellerWaveParticlesEnabled(propellerParticlesOn.value);
};

const applyPropellerWaveParticlesEnabled = () => {
    App.Instance.setPropellerWaveParticlesEnabled(propellerWaveParticlesOn.value);
};

const onModelChange = () => {
    if (!currentModelName.value) return;
    App.Instance.setCurrentModel(currentModelName.value);
    currentAnimName.value = '';
    animationProgress.value = 0;
    stopProgressTick();
    updateClipRangeToDefault();
};

watch([currentModelName, currentAnimName], () => {
    if (loadedAsModel.value && (currentModelName.value || App.Instance.getCurrentModelName())) {
        updateClipRangeToDefault();
    }
});

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
};

const startProgressTick = () => {
    if (progressTick) return;
    progressTick = setInterval(() => {
        const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
        if (name) animationProgress.value = App.Instance.getAnimationProgress(name);
    }, 100);
};
const stopProgressTick = () => {
    if (progressTick) {
        clearInterval(progressTick);
        progressTick = null;
    }
};

const playCurrentAnim = () => {
    const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
    if (!name) return;
    App.Instance.setAnimationLoop(animationLoop.value, name);
    const from = clipFrom.value;
    const to = clipTo.value;
    if (currentAnimName.value) {
        App.Instance.playAnimation(currentAnimName.value, animationLoop.value, name, 'forward', from, to);
    } else {
        App.Instance.playAnimation(0, animationLoop.value, name, 'forward', from, to);
    }
    startProgressTick();
};

const playCurrentAnimReverse = () => {
    const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
    if (!name) return;
    App.Instance.setAnimationLoop(animationLoop.value, name);
    const from = clipFrom.value;
    const to = clipTo.value;
    if (currentAnimName.value) {
        App.Instance.playAnimation(currentAnimName.value, animationLoop.value, name, 'backward', from, to);
    } else {
        App.Instance.playAnimation(0, animationLoop.value, name, 'backward', from, to);
    }
    startProgressTick();
};
const stopAnim = () => {
    stopProgressTick();
    const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
    if (name) {
        App.Instance.stopAllAnimations(name);
    } else {
        App.Instance.stopAllAnimations();
    }
    animationProgress.value = 0;
};

const onLoopChange = () => {
    const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
    if (name) App.Instance.setAnimationLoop(animationLoop.value, name);
};

const onProgressInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const p = Number(target.value) / 100;
    animationProgress.value = p;
    const name = currentModelName.value || App.Instance.getCurrentModelName() || '';
    if (name) App.Instance.setAnimationProgress(p, name);
};

function onHdrIntensityInput() {
    App.Instance.setEnvironmentIntensity(hdrIntensity.value);
}

async function applyHdr() {
    if (hdrLoading.value) return;
    hdrLoading.value = true;
    try {
        await App.Instance.loadHdrEnvironment({
            url: hdrUrl.value || hdrDemoConfig.applyFallbackUrl,
            size: hdrSize.value,
            onProgress: (p) => { loading.value = 0.9 + p * 0.1; },
        });
        App.Instance.setEnvironmentIntensity(hdrIntensity.value);
        App.Instance.setEnvironmentRotationEnabled(hdrEnvironmentRotationDefaults.enabled);
        App.Instance.setEnvironmentRotationSpeedRadPerSec(hdrEnvironmentRotationDefaults.speedRadPerSec);
    } catch (e) {
        console.error('应用 HDR 失败', e);
    } finally {
        hdrLoading.value = false;
        loading.value = 1;
    }
}

async function applySkybox() {
    await App.Instance.setSkyboxForWater({
        url: skyboxUrl.value || skyboxDemoConfig.defaultUrl,
        size: skyboxSize.value,
        onProgress: (p) => { loading.value = 0.9 + p * 0.1; },
    });
}

function syncSeaParamsFromApp() {
    const p = App.Instance.getSeaParams();
    if (p.windDirection) {
        seaWindDirX.value = p.windDirection.x;
        seaWindDirY.value = p.windDirection.y;
    }
    if (typeof p.windForce === 'number') seaWindForce.value = p.windForce;
    if (typeof p.waveHeight === 'number') seaWaveHeight.value = p.waveHeight;
    if (typeof p.bumpHeight === 'number') seaBumpHeight.value = p.bumpHeight;
    if (typeof p.waveLength === 'number') seaWaveLength.value = p.waveLength;
    if (typeof p.waveSpeed === 'number') seaWaveSpeed.value = p.waveSpeed;
    if (typeof p.colorBlendFactor === 'number') seaColorBlendFactor.value = p.colorBlendFactor;
    if (p.bumpTextureScale) {
        seaBumpU.value = p.bumpTextureScale.u;
        seaBumpV.value = p.bumpTextureScale.v;
    }
}

function applySeaParams() {
    const params: SeaParams = {
        windDirection: { x: seaWindDirX.value, y: seaWindDirY.value },
        windForce: seaWindForce.value,
        waveHeight: seaWaveHeight.value,
        bumpHeight: seaBumpHeight.value,
        waveLength: seaWaveLength.value,
        waveSpeed: seaWaveSpeed.value,
        colorBlendFactor: seaColorBlendFactor.value,
        bumpTextureScale: { u: seaBumpU.value, v: seaBumpV.value },
        waterColor: seaColorHex.value,
    };
    App.Instance.setSeaParams(params);
}

function resetSeaParams() {
    App.Instance.resetSeaParams();
    syncSeaParamsFromApp();
}

/** 统一 message 监听：柔性绳子创建、柔性绳子更新 */
function setupMessageListeners() {
    const onMessageFn = (event: MessageEvent) => {
        const raw = event.data;
        if (!raw || typeof raw !== 'object') return;
        if (raw.type === 'flexibleRopeCreate' && Array.isArray(raw.data)) {
            App.Instance.createFlexibleRopes(raw.data);
            return;
        }
        if (raw.type === 'flexibleRopeUpdate' && raw.data?.parentId) {
            App.Instance.updateFlexibleRopePoints(raw.data);
            return;
        }
    };
    window.addEventListener('message', onMessageFn);
    return () => window.removeEventListener('message', onMessageFn);
}

onMounted(() => {
    removeInfoBoardMessageListener = setupMessageListeners();
});

onUnmounted(() => {
    stopProgressTick();
    if (cameraDebugTick) {
        clearInterval(cameraDebugTick);
        cameraDebugTick = null;
    }
    removeInfoBoardMessageListener?.();
});


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
    z-index: 10;
    min-width: 160px;
    max-height: calc(100vh - 20px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);

    .panel-tabs {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 0 10px;
        background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.72),
            rgba(0, 0, 0, 0.55) 60%,
            rgba(0, 0, 0, 0)
        );
        backdrop-filter: blur(6px);
    }

    .tab-btn {
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(0, 0, 0, 0.35);
        color: rgba(255, 255, 255, 0.92);
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        line-height: 1;
        cursor: pointer;
        user-select: none;
        transition:
            background-color 0.2s ease,
            border-color 0.2s ease,
            transform 0.05s ease;

        &:hover {
            border-color: rgba(255, 255, 255, 0.25);
            background: rgba(0, 0, 0, 0.5);
        }

        &:active {
            transform: translateY(1px);
        }

        &.active {
            border-color: rgba(0, 140, 255, 0.6);
            background: rgba(0, 100, 200, 0.45);
        }
    }

    .panel-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0;
    }

    .panel-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .action-btn {
        background-color: rgba(0, 0, 0, 0.5);
        padding: 5px;
        border-radius: 5px;
        width: 100%;
        min-width: 100px;
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

        &.active {
            background-color: rgba(0, 100, 200, 0.6);
        }
    }

    .anim-label {
        font-size: 12px;
        padding: 2px 0;
        width: 100%;
    }
    .camera-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
    .preset-btn {
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(0, 80, 160, 0.5);
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
        min-height: auto;
        height: auto;
        line-height: 1.3;
        &:hover {
            background: rgba(0, 100, 200, 0.7);
        }
    }
    .anim-select {
        width: 100%;
        padding: 4px;
        border-radius: 5px;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .anim-row {
        width: 100%;
    }

    .camera-debug-text {
        white-space: pre-line;
        font-size: 12px;
        line-height: 1.35;
        padding: 6px 8px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.12);
        user-select: text;
    }
    .clip-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .clip-inputs {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .anim-num {
        width: 72px;
        padding: 4px 6px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 12px;
    }
    .anim-input {
        width: 100%;
        padding: 6px 8px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 12px;
        box-sizing: border-box;
    }
    .anim-textarea {
        width: 100%;
        padding: 6px 8px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 12px;
        box-sizing: border-box;
        resize: vertical;
        min-height: 56px;
    }
    .info-board-visibility {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
        margin-bottom: 6px;
    }
    .btn-apply {
        margin-top: 4px;
    }
    .clip-sep {
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
    }
    .anim-util {
        font-size: 12px;
        color: rgba(255, 200, 100, 0.95);
        cursor: pointer;
        width: fit-content;
    }
    .anim-util:hover {
        text-decoration: underline;
    }
    .anim-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
        input { accent-color: rgba(0, 100, 200, 0.8); }
    }
    .anim-slider {
        width: 100%;
        height: 8px;
        margin: 4px 0;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.5);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        &::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            cursor: pointer;
        }
        &::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            border: none;
        }
    }

    .sea-row {
        display: flex;
        gap: 8px;
    }
    .sea-color {
        width: 100%;
        height: 32px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 0;
        background: transparent;
    }
    .sea-actions {
        display: flex;
        gap: 8px;
    }
}
</style>