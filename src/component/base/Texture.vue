<template>


    <Field :title="title">
        <el-popover width="350" v-if="textureUrl" :disabled="noPopover" placement="left" popper-class="texture-popover"
            transition="el-fade-in" :offset="8">
            <template #reference>
                <div class="texture-preview-inner" @drop="handleDrop" @dragover="e => e.preventDefault()">
                    <img class="texture-img" :src="previewTemporaryUrl" />
                </div>
            </template>
            <template #default>
                <div class="popover-content">
                    <Switch :label="$t('texture.gammaSpace')" :object="textureRef" property="gammaSpace"
                        @change="emitChange(textureRef)" />
                    <!-- <Number :label="$t('texture.vScale')" :object="textureRef" property="vScale"
                        @change="emitChange(textureRef)" />
                    <Number :label="$t('texture.uScale')" :object="textureRef" property="uScale"
                        @change="emitChange(textureRef)" /> -->
                    <Number :label="$t('texture.vScale')" :object="textureRef" property="vScale"
                        @change="(newC, oldC) => changeProperty('vScale', newC, oldC, 'float')" />
                    <Number :label="$t('texture.uScale')" :object="textureRef" property="uScale"
                        @change="(newC, oldC) => changeProperty('uScale', newC, oldC, 'float')" />
                    <Number :label="$t('texture.uOffset')" :object="textureRef" property="uOffset"
                        @change="(newC, oldC) => changeProperty('uOffset', newC, oldC, 'float')" />
                    <Number :label="$t('texture.vOffset')" :object="textureRef" property="vOffset"
                        @change="(newC, oldC) => changeProperty('vOffset', newC, oldC, 'float')" />
                    <Switch :label="$t('texture.hasAlpha')" :object="textureRef" property="hasAlpha"
                        @change="emitChange(textureRef)" />
                    <slot />
                    <div class="texture-actions">
                        <ElButton type="info" style="width: 100%;" @click="clear">
                            移除
                        </ElButton>
                        <ElButton type="info" style="width: 100%;" @click="changeTexture">
                            更换
                        </ElButton>
                    </div>

                </div>
            </template>
        </el-popover>
        <v-else class="texture-preview-inner" v-else @click="changeTexture" @drop="handleDrop" @dragover.prevent="">
            <img src="@/assets/img/transparent.svg" alt="" class="empty-img">
        </v-else>
    </Field>

</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject, } from "vue"

//mport sharp from "sharp"
import { Texture, CubeTexture } from "@babylonjs/core"
import Field from "../common/Field.vue"
import Switch from "./Switch.vue"
import Number from "./Number.vue"
import { registerUndoRedo } from "@/tools/undoredo"
import { onSelectedAssetChanged, onTextureAddedObservable } from "@/tools/observables"
import { isColorGradingTexture, isCubeTexture, isTexture } from "@/tools/guards/texture"
import { projectConfiguration } from "@/tools/configuration"
import { getObjectValue, setObjectValue } from "../../tools/property"
import { useDialog } from "@/view/dialog"
import { Editor } from "@/3d/Editor"
import { ElMessageBox } from "element-plus"

const propertyChanged = inject<(property: string, newValue: any, oldValue: any, type: string) => void>('propertyChanged')

function changeProperty(property: string, newValue: any, oldValue: any, type: string) {
    console.log('changeProperty', property, newValue, oldValue, type);

    propertyChanged?.('material.' + props.property + "." + property, newValue, oldValue, type);
}
function updataTexture() {

}

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
const textureRef = ref<any>(getObjectValue(props.object, props.property))
const textureUrl = computed<string | null | false>(() => (isTexture(textureRef.value) || isCubeTexture(textureRef.value) || isColorGradingTexture(textureRef.value)) && textureRef.value?.url)
const isCube = computed(() => isCubeTexture(textureRef.value))
const isColorGrading = computed(() => isColorGradingTexture(textureRef.value))
const isExr = computed(() => textureUrl.value && getExtname(textureUrl.value).toLowerCase() === ".exr")
const isTextureRef = computed(() => isTexture(textureRef.value))
const isCubeRef = computed(() => isCubeTexture(textureRef.value))
const loadingError = computed(() => !!textureRef.value?.loadingError)
const textureName = computed(() => textureRef.value?.name ?? "")
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

const emitChange = (t: any) => {
    emit("change", t)
}
const force = () => { }
const roundCoordinatesIndex = (v: number) => { if (textureRef.value) textureRef.value.coordinatesIndex = Math.round(v) }
const onCoordinatesModeChange = (v: number) => { if (textureRef.value) { textureRef.value.coordinatesMode = v; emitChange(textureRef.value) } }
const onSamplingModeChange = (v: number) => { if (textureRef.value) { textureRef.value.updateSamplingMode(v); emitChange(textureRef.value) } }

const setVScale = (v: number) => { if (textureRef.value) { textureRef.value.vScale = v; emitChange(textureRef.value) } }

const clear = () => {
    ElMessageBox.confirm("确认移除当前纹理吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
    }).then(() => {
        const oldTexture = getObjectValue(props.object, props.property)
        setObjectValue(props.object, props.property, null)
        textureRef.value = null
        emitChange(null)
        if (!props.noUndoRedo) {
            registerUndoRedo({
                executeRedo: true, undo: () => (props.object[props.property] = oldTexture), redo: () => (props.object[props.property] = null), action: () => {
                    textureRef.value = getObjectValue(props.object, props.property)
                }
            })
        }
    })

    //  console.log(textureRef.value);

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
    const json = ev.dataTransfer.getData('assets');
    if (!json) return
    const data = JSON.parse(json);
    if (data.type === 'texture') {
        const texture = new Texture(data.url, Editor.Instance.Scene, true, false);
        texture.sourceUUID = data.sourceUUID;
        const oldTexture = getObjectValue(props.object, props.property)
        setObjectValue(props.object, props.property, null)
        textureRef.value = texture
        emitChange(texture)
        if (!props.noUndoRedo) {
            registerUndoRedo({
                executeRedo: true, undo: () => (props.object[props.property] = oldTexture), redo: () => (props.object[props.property] = texture), action: () => {
                    textureRef.value = getObjectValue(props.object, props.property)
                }
            })
        }
    }

}

const computeTemporaryPreview = async () => {
    const texture: any = getObjectValue(props.object, props.property)
    if (!texture?.url || getExtname(texture.url).toLowerCase() === ".exr") return
    previewError.value = false
    previewTemporaryUrl.value = texture.url

}



watch(() => [props.object, props.property], () => {
    textureRef.value = getObjectValue(props.object, props.property)
})
watch(textureRef, () => computeTemporaryPreview())
onMounted(() => {
    computeTemporaryPreview()
})

async function changeTexture() {
    const ChooseResDialog = (await import('@/view/dialog/ChooseResDialog.vue')).default
    useDialog(ChooseResDialog, {
        choose: (res: any) => {
            if (res) {
                const texture = new Texture(res.url, Editor.Instance.Scene, true, false);
                texture.sourceUUID = res.sourceUUID;
                const oldTexture = getObjectValue(props.object, props.property)

                textureRef.value = texture
                emitChange(texture)
                if (!props.noUndoRedo) {
                    registerUndoRedo({
                        executeRedo: true,
                        undo: () => {
                            setObjectValue(props.object, props.property, oldTexture)
                        },
                        redo: () => {
                            setObjectValue(props.object, props.property, texture)
                        },
                        action: () => {
                            textureRef.value = getObjectValue(props.object, props.property)
                        }
                    })
                }
            }

        },
        type: 'texture'
    })
}
</script>

<style lang="scss" scoped>
.texture-preview-inner {
    height: 64px;
    width: 64px;
    padding: 10px;
    margin: 2px 0;
    margin-left: auto;
    background-color: var(--bg-color);
    display: flex;
    align-items: center;
    justify-content: center;

    .empty-img {
        width: 100%;
        height: 100%;
        background-color: var(--bg-color-2);
    }

    img {
        max-width: 100%;
        max-height: 100%;
    }


}

.texture-actions {
    display: flex;
}
</style>
