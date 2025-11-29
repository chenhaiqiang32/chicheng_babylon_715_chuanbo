<template>
    <div class="texture-field" @drop.prevent="handleDrop" @dragover.prevent="handleDragOver"
        @dragleave="handleDragLeave" :class="{ 'is-over': dragOver }">
        <div class="texture-row">
            <div class="texture-preview" :class="previewClass">
                <el-popover v-if="textureUrl" :disabled="noPopover">
                    <template #reference>
                        <div class="texture-preview-inner">
                            <template v-if="isCube">
                                <span class="texture-icon">ENV</span>
                            </template>
                            <template v-else-if="isColorGrading">
                                <span class="texture-icon">3DL</span>
                            </template>
                            <template v-else-if="isExr">
                                <span class="texture-icon">EXR</span>
                            </template>
                            <template v-else-if="previewTemporaryUrl">
                                <img class="texture-img" :src="previewTemporaryUrl" />
                            </template>
                            <template v-else-if="previewError">
                                <span class="texture-error">Error</span>
                            </template>
                            <template v-else>
                                <el-icon>
                                    <Loading />
                                </el-icon>
                            </template>
                        </div>
                    </template>
                    <!-- <template #default>
                        <div class="popover-content">
                            <template v-if="isCube">
                                <SectionField title="Common">
                                    <div class="kv">
                                        <div class="kv-k">Path</div>
                                        <div class="kv-v link" @click="openAsset(textureName)">{{ textureName }}</div>
                                    </div>
                                    <Switch label="Gamma Space" :object="textureRef" property="gammaSpace"
                                        @change="emitChange(textureRef)" />
                                    <Switch label="Invert Z" :object="textureRef" property="invertZ"
                                        @change="emitChange(textureRef)" />
                                </SectionField>
                            </template>
                            <template v-else-if="isColorGrading">
                                <SectionField title="Common">
                                    <div class="kv">
                                        <div class="kv-k">Path</div>
                                        <div class="kv-v link" @click="openAsset(textureName)">{{ textureName }}</div>
                                    </div>
                                </SectionField>
                            </template>
                            <template v-else>
                                <SectionField title="Common">
                                    <div class="kv">
                                        <div class="kv-k">Dimensions</div>
                                        <div class="kv-v end">{{ sizeW }}x{{ sizeH }}</div>
                                    </div>
                                    <div class="kv">
                                        <div class="kv-k">Path</div>
                                        <div class="kv-v link" @click="openAsset(textureName)">{{ textureName }}</div>
                                    </div>
                                    <Switch label="Gamma Space" :object="textureRef" property="gammaSpace"
                                        @change="emitChange(textureRef)" />
                                    <Switch label="Get Alpha From RGB" :object="textureRef" property="getAlphaFromRGB"
                                        @change="emitChange(textureRef)" />
                                </SectionField>

                                <SectionField title="Scale">
                                    <Number :label="'U Scale'" :object="textureRef" property="uScale" @change="force"
                                        @finishChange="emitChange(textureRef)" />
                                    <Number :label="'V Scale'" :object="textureRef" property="vScale" @change="force"
                                        @finishChange="emitChange(textureRef)" />
                                </SectionField>

                                <SectionField title="Offset">
                                    <Number :label="'U Offset'" :object="textureRef" property="uOffset"
                                        @finishChange="emitChange(textureRef)" />
                                    <Number :label="'V Offset'" :object="textureRef" property="vOffset"
                                        @finishChange="emitChange(textureRef)" />
                                </SectionField>

                                <SectionField title="Coordinates">
                                    <Number :label="'Index'" :object="textureRef" property="coordinatesIndex" :step="1"
                                        :min="0" @change="roundCoordinatesIndex"
                                        @finishChange="emitChange(textureRef)" />
                                    <el-select v-model="coordinatesMode" @change="onCoordinatesModeChange">
                                        <el-option v-for="opt in coordinatesModeOptions" :key="opt.value"
                                            :label="opt.text" :value="opt.value" />
                                    </el-select>
                                </SectionField>

                                <SectionField title="Sampling">
                                    <el-select v-model="samplingMode" @change="onSamplingModeChange">
                                        <el-option v-for="opt in samplingModeOptions" :key="opt.value" :label="opt.text"
                                            :value="opt.value" />
                                    </el-select>
                                </SectionField>

                                <SectionField title="Wrap">
                                    <div class="wrap-row">
                                        <span>Wrap U</span>
                                        <el-select v-model="wrapU" @change="emitChange(textureRef)">
                                            <el-option v-for="opt in wrapOptions" :key="opt.value" :label="opt.text"
                                                :value="opt.value" />
                                        </el-select>
                                    </div>
                                    <div class="wrap-row">
                                        <span>Wrap V</span>
                                        <el-select v-model="wrapV" @change="emitChange(textureRef)">
                                            <el-option v-for="opt in wrapOptions" :key="opt.value" :label="opt.text"
                                                :value="opt.value" />
                                        </el-select>
                                    </div>
                                    <div class="wrap-row">
                                        <span>Wrap R</span>
                                        <el-select v-model="wrapR" @change="emitChange(textureRef)">
                                            <el-option v-for="opt in wrapOptions" :key="opt.value" :label="opt.text"
                                                :value="opt.value" />
                                        </el-select>
                                    </div>
                                </SectionField>
                            </template>
                        </div>
                    </template> -->
                </el-popover>
                <div v-else class="texture-preview-inner"><el-icon>
                        <QuestionFilled />
                    </el-icon></div>
            </div>

            <div class="texture-details">
                <div class="title">{{ title }}</div>

                <!-- <template v-if="textureUrl && !loadingError">
                    <div class="field-block">
                        <EditorInspectorNumberField v-if="!hideLevel" label="Level" :object="textureRef"
                            property="level" @change="emitChange(textureRef)" @finishChange="emitChange(textureRef)" />
                        <template v-if="isTextureRef">
                            <EditorInspectorNumberField v-if="!hideSize" label="Size" :object="textureRef"
                                property="uScale" @change="setVScale" @finishChange="emitChange(textureRef)" />
                            <EditorInspectorSwitchField v-if="!hideInvert" label="Invert Y" :object="textureRef"
                                property="_invertY" @change="reloadTexture" />
                        </template>
                        <EditorInspectorNumberField v-if="isCubeRef" label="Rotation Y" :object="textureRef"
                            property="rotationY" @finishChange="emitChange(textureRef)" />
                    </div>
                </template>

                <template v-if="loadingError">
                    <div class="error-text">Failed to load texture<br />Please ensure the file exists at the specified
                        path: <b>{{ textureUrl }}</b></div>
                    <el-button type="default" @click="reloadTexture">Reload</el-button>
                </template> -->
            </div>

            <div class="texture-actions" @click="clear">
                <span v-if="textureRef">Clear</span>
            </div>
        </div>

        <div v-if="textureRef">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue"

//mport sharp from "sharp"
import { Texture, CubeTexture, ColorGradingTexture } from "@babylonjs/core"

function getExtname(path: string) {
    const lastDotIndex = path.lastIndexOf(".");
    if (lastDotIndex === -1) {
        return "";
    }
    return path.substring(lastDotIndex);
}

// 浏览器兼容的dirname替代函数
function getDirname(path: string) {
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) return '';
    return path.substring(0, lastSlashIndex);
}

// 浏览器兼容的join替代函数
function joinPaths(...segments: string[]) {
    return segments.filter(seg => seg).join('/').replace(/\/\/+/g, '/');
}
import { Loading, QuestionFilled } from "@element-plus/icons-vue"
import SectionField from "../common/SectionField.vue"
import Switch from "./Switch.vue"
import Number from "./Number.vue"
import { isScene } from "../../tools/guards/scene"
import { registerUndoRedo } from "@/tools/undoredo"
//import { updateIblShadowsRenderPipeline } from "../../editor/tools/light/ibl"
import { onSelectedAssetChanged, onTextureAddedObservable } from "@/tools/observables"
import { isColorGradingTexture, isCubeTexture, isTexture } from "@/tools/guards/texture"
import { projectConfiguration } from "@/tools/configuration"
import { configureImportedTexture } from "@/tools/preview/import"

const props = defineProps<{
    object: any
    title: string
    property: string
    accept3dlTexture?: boolean
    acceptCubeTexture?: boolean
    noUndoRedo?: boolean
    hideLevel?: boolean
    hideSize?: boolean
    hideInvert?: boolean
    noPopover?: boolean
    scene?: any
}>()
const emit = defineEmits<{ (e: "change", t?: any): void }>()

const dragOver = ref(false)
const previewError = ref(false)
const previewTemporaryUrl = ref<string | null>(null)
const textureRef = computed<any>(() => props.object?.[props.property] ?? null)
const textureUrl = computed<string | null | false>(() => (isTexture(textureRef.value) || isCubeTexture(textureRef.value) || isColorGradingTexture(textureRef.value)) && textureRef.value?.url)
const isCube = computed(() => isCubeTexture(textureRef.value))
const isColorGrading = computed(() => isColorGradingTexture(textureRef.value))
const isExr = computed(() => textureUrl.value && getExtname(textureUrl.value).toLowerCase() === ".exr")
const isTextureRef = computed(() => isTexture(textureRef.value))
const isCubeRef = computed(() => isCubeTexture(textureRef.value))
const loadingError = computed(() => !!textureRef.value?.loadingError)
const textureName = computed(() => textureRef.value?.name ?? "")
const previewClass = computed(() => (textureUrl.value ? "has" : "none"))
const sizeW = computed(() => (isTextureRef.value ? textureRef.value?.getSize?.().width ?? 0 : 0))
const sizeH = computed(() => (isTextureRef.value ? textureRef.value?.getSize?.().height ?? 0 : 0))

const coordinatesModeOptions = [
    { text: "Explicit", value: Texture.EXPLICIT_MODE },
    { text: "Spherical", value: Texture.SPHERICAL_MODE },
    { text: "Planar", value: Texture.PLANAR_MODE },
    { text: "Cubic", value: Texture.CUBIC_MODE },
    { text: "Projection", value: Texture.PROJECTION_MODE },
    { text: "Skybox", value: Texture.SKYBOX_MODE },
    { text: "Inversed Cubic", value: Texture.INVCUBIC_MODE },
    { text: "Equirectangular", value: Texture.EQUIRECTANGULAR_MODE },
    { text: "Fixed Equirectangular", value: Texture.FIXED_EQUIRECTANGULAR_MODE },
    { text: "Equirectangular Mirrored", value: Texture.FIXED_EQUIRECTANGULAR_MIRRORED_MODE },
]

const samplingModeOptions = [
    { text: "Nearest", value: Texture.NEAREST_SAMPLINGMODE },
    { text: "Bilinear", value: Texture.BILINEAR_SAMPLINGMODE },
    { text: "Trilinear", value: Texture.TRILINEAR_SAMPLINGMODE },
]

const wrapOptions = [
    { text: "Wrap", value: Texture.WRAP_ADDRESSMODE },
    { text: "Clamp", value: Texture.CLAMP_ADDRESSMODE },
    { text: "Mirror", value: Texture.MIRROR_ADDRESSMODE },
]

const coordinatesMode = ref<number>(textureRef.value?.coordinatesMode ?? Texture.EXPLICIT_MODE)
const samplingMode = ref<number>(textureRef.value?.samplingMode ?? Texture.TRILINEAR_SAMPLINGMODE)
const wrapU = ref<number>(textureRef.value?.wrapU ?? Texture.WRAP_ADDRESSMODE)
const wrapV = ref<number>(textureRef.value?.wrapV ?? Texture.WRAP_ADDRESSMODE)
const wrapR = ref<number>(textureRef.value?.wrapR ?? Texture.WRAP_ADDRESSMODE)

const openAsset = (name: string) => {
    onSelectedAssetChanged.notifyObservers(joinPaths(getDirname(projectConfiguration.path!), name))
}

const emitChange = (t: any) => emit("change", t)
const force = () => { }
const roundCoordinatesIndex = (v: number) => { if (textureRef.value) textureRef.value.coordinatesIndex = Math.round(v) }
const onCoordinatesModeChange = (v: number) => { if (textureRef.value) { textureRef.value.coordinatesMode = v; emitChange(textureRef.value) } }
const onSamplingModeChange = (v: number) => { if (textureRef.value) { textureRef.value.updateSamplingMode(v); emitChange(textureRef.value) } }

const setVScale = (v: number) => { if (textureRef.value) { textureRef.value.vScale = v; emitChange(textureRef.value) } }

const clear = () => {
    const oldTexture = props.object[props.property]
    props.object[props.property] = null
    emitChange(null)
    if (!props.noUndoRedo) {
        registerUndoRedo({ executeRedo: true, undo: () => (props.object[props.property] = oldTexture), redo: () => (props.object[props.property] = null) })
    }
}

const handleDragOver = (ev: DragEvent) => { dragOver.value = true }
const handleDragLeave = (ev: DragEvent) => { dragOver.value = false }

const reloadTexture = () => {
    const texture = textureRef.value as Texture | CubeTexture
    if (!projectConfiguration.path || !texture?.url) return
    const wasError = texture.loadingError
    const projectDir = getDirname(projectConfiguration.path!)
    const texturePath = texture.url.startsWith(projectDir) ? texture.url : joinPaths(projectDir, texture.url)
    texture.updateURL(texturePath, undefined, () => { texture["_loadingError"] = false; if (wasError) computeTemporaryPreview() })
    texture.url = texturePath.replace(joinPaths(projectDir, "/"), "")
}

const handleDrop = (ev: DragEvent) => {
    dragOver.value = false
    const assets = ev.dataTransfer?.getData("assets")
    if (!assets) return
    const absolutePath = JSON.parse(assets)[0]
    const extension = getExtname(absolutePath).toLowerCase()
    switch (extension) {
        case ".png":
        case ".webp":
        case ".jpg":
        case ".jpeg":
        case ".bmp":
        case ".exr": {
            const oldTexture = props.object[props.property]
            const scene = props.scene ?? (isScene(props.object) ? props.object : props.object.getScene())
            const newTexture = configureImportedTexture(new Texture(absolutePath, scene))
            if (oldTexture !== newTexture) {
                props.object[props.property] = newTexture
                emitChange(newTexture)
                if (!props.noUndoRedo) {
                    registerUndoRedo({ executeRedo: true, undo: () => (props.object[props.property] = oldTexture), redo: () => (props.object[props.property] = newTexture), onLost: () => newTexture?.dispose() })
                }
                onTextureAddedObservable.notifyObservers(newTexture)
            }
            computeTemporaryPreview()
            break
        }
        case ".3dl": {
            if (props.accept3dlTexture) {
                const oldTexture = props.object[props.property]
                // const scene = props.scene ?? (isScene(props.object) ? props.object : props.object.getScene())
                const scene = props.scene
                //  const newTexture = configureImportedTexture(new ColorGradingTexture(absolutePath, scene))
                const newTexture = new ColorGradingTexture(absolutePath, scene)
                if (oldTexture !== newTexture) {
                    props.object[props.property] = newTexture
                    emitChange(newTexture)
                    if (!props.noUndoRedo) {
                        registerUndoRedo({ executeRedo: true, undo: () => (props.object[props.property] = oldTexture), redo: () => (props.object[props.property] = newTexture), onLost: () => newTexture?.dispose() })
                    }
                    onTextureAddedObservable.notifyObservers(newTexture)
                }
            }
            break
        }
        case ".env": {
            if (props.acceptCubeTexture) {
                const oldTexture = props.object[props.property]
                const scene = props.scene
                const newTexture = CubeTexture.CreateFromPrefilteredData(absolutePath, scene)
                const sc = newTexture.getScene()
                props.object[props.property] = newTexture
                emitChange(props.object[props.property])
                if (oldTexture !== newTexture && !props.noUndoRedo) {
                }
            }
            break
        }
    }
}

const computeTemporaryPreview = async () => {
    const texture: any = props.object[props.property]
    if (!texture?.url || getExtname(texture.url).toLowerCase() === ".exr") return
    previewError.value = false
    previewTemporaryUrl.value = texture.url
}



watch(textureRef, () => computeTemporaryPreview())
onMounted(() => computeTemporaryPreview())
</script>

<style scoped>
.texture-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding: 16px;
    border-radius: 8px;
    /* border: 1px solid var(--el-border-color); */
    transition: background .3s;
    background: var(--bg-color-2);
    margin-bottom: 8px;
}

.texture-field.is-over {
    background: var(--el-color-info-light-9);
}

.texture-row {
    display: flex;
    gap: 16px;
    width: 100%;
}

.texture-preview {
    display: flex;
    justify-content: center;
    align-items: center;
}

.texture-preview.has {
    width: 96px;
    height: 96px;
}

.texture-preview.none {
    width: 32px;
    height: 32px;
}

.texture-preview-inner {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.texture-img {
    width: 96px;
    height: 96px;
    object-fit: contain;
}

.texture-icon {
    font-size: 14px;
    font-weight: 600;
}

.texture-error {
    background: rgba(255, 0, 0, .35);
    border-radius: 8px;
    padding: 4px 8px;
}

.texture-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
}

.title {
    padding: 0 8px;
    font-weight: 600;
    color: var(--title--color);
}

.field-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
}

.texture-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 96px;
}

.kv {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
}

.kv-k {
    width: 50%;
}

.kv-v {
    width: 50%;
    text-align: end;
}

.kv-v.end {
    text-align: end;
}

.link {
    color: var(--el-color-primary);
    cursor: pointer;
}

.wrap-row {
    display: flex;
    gap: 8px;
    align-items: center;
}
</style>