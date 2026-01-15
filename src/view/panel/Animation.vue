<template>
  <div class="animation">
    <div class="timeline-container">
      <div class="timeline-header">
        <ElSelect v-model="currentSelect" style=" flex: 1;" @change="onSelectChange">
          <ElOption v-for="item in runtimeAnimations" :key="item.uuid" :label="item.name" :value="item.uuid">
            <div class="animation-item" style="display: flex; align-items: center; justify-content: space-between;">
              {{ item.name }}
              <SVG name="delete" @click.stop="deleteAnimation(item.uuid)"></SVG>
            </div>
          </ElOption>
        </ElSelect>
        <ElButton size="small" @click="createAnimation">{{ $t('animation.new') }}</ElButton>
      </div>
      <div class="camera-track">
        <ElButton style="margin-left: auto;" type="text" size="small" @click="addCameraTrack">添加相机</ElButton>
      </div>
      <ElScrollbar style=" margin-bottom: 15px;" @scroll="onScroll">
        <div class="clip-list">
          <div v-for="item in currentRuntimeAction?.clips" :key="item.uuid" class="clip-item">
            <div class="clip-name">{{ getClipName(item.name) }}</div>
            <div class="clip-key">{{ getAnimPropertyLabel(item.property) }}</div>
          </div>
        </div>
      </ElScrollbar>

    </div>
    <div ref="domRef" class="canvas-container"></div>
    <div class="right">
      <div class="panel-header" v-if="currentRuntimeAction">
        <div class="title">动画信息</div>
      </div>
      <div class="panel-body" v-if="currentRuntimeAction">
        <Field title="名称" :showHover="true">
          <ElInput v-model="animName" size="small" style="width: 160px" />
        </Field>
        <Field title="循环" :showHover="true">
          <ElSwitch v-model="animLoop" style="margin-left:auto" />
        </Field>
        <!-- <Field title="当前时间" :showHover="true">
          <ElInput class="readonly" :value="displayTime" readonly size="small" style="width:160px" />
        </Field> -->

        <!-- 动画时刻下的当前变换展示（只读） -->
        <!-- <Field title="坐标" :showHover="true">
          <ElInput class="readonly" :value="displayPositionStr" readonly size="small" style="width:160px" />
        </Field>
        <Field title="旋转" :showHover="true">
          <ElInput class="readonly" :value="displayRotationStr" readonly size="small" style="width:160px" />
        </Field>
        <Field title="缩放" :showHover="true">
          <ElInput class="readonly" :value="displayScaleStr" readonly size="small" style="width:160px" />
        </Field> -->

        <!-- 关键帧信息：单选显示可编辑字段，多选保持上方动画信息 -->
        <div v-if="selectionCount === 1" class="keyframe-info">
          <div class="title">关键帧信息</div>
          <Field title="属性" :showHover="true">
            <ElInput class="readonly" :value="getAnimPropertyLabel(currentSelection?.clip?.property || '')" readonly
              size="small" style="width:160px" />
          </Field>
          <Field title="帧时间" :showHover="true">
            <ElInput size="small" type="number" style="width:160px" v-model.number="keyTimeLocal"
              @change="onKeyTimeLocalChange" />
          </Field>

          <Field title="曲线" :showHover="true">
            <ElCascader v-model="easingLocal" :options="easingOptions" :props="easingCascaderProps" size="small"
              style="width:160px" @change="onEasingLocalChange" />
          </Field>

          <!-- rotation (quaternion) 显示为欧拉角（度）并可编辑 -->
          <Field
            v-if="currentSelection?.clip?.property === 'rotationQuaternion' || currentSelection?.clip?.type === 'quaternion'"
            title="旋转 (Euler)" :showHover="true" :textWidth="120">
            <div style="display:flex;gap:6px;align-items:center; margin-left:auto;">
              <ElInput size="small" v-model.number="rotationX" type="number" style="width:60px"
                @change="onRotationLocalChange" />
              <ElInput size="small" v-model.number="rotationY" type="number" style="width:60px"
                @change="onRotationLocalChange" />
              <ElInput size="small" v-model.number="rotationZ" type="number" style="width:60px"
                @change="onRotationLocalChange" />
            </div>
          </Field>

          <!-- v3 (position/scale/rotation) -->
          <Field
            v-if="currentSelection?.clip?.type === 'v3' || ['position', 'scale'].includes(currentSelection?.clip?.property || '')"
            title="坐标" :showHover="true">
            <div style="display:flex;gap:6px;align-items:center; margin-left:auto;">
              <ElInput size="small" v-model.number="vectorX" type="number" style="width:60px"
                @change="onVectorLocalChange" />
              <ElInput size="small" v-model.number="vectorY" type="number" style="width:60px"
                @change="onVectorLocalChange" />
              <ElInput size="small" v-model.number="vectorZ" type="number" style="width:60px"
                @change="onVectorLocalChange" />
            </div>
          </Field>

          <!-- color (尝试支持 hex 字符串或数组) -->
          <Field
            v-else-if="currentSelection?.clip?.property?.toLowerCase().includes('color') || typeof (currentSelection?.key?.value) === 'string'"
            title="颜色" :showHover="true">
            <ElInput size="small" type="text" style="width:160px" v-model="colorLocal" @change="onColorLocalChange" />
          </Field>

          <!-- number -->
          <Field v-else-if="typeof (currentSelection?.key?.value) === 'number'" title="值" :showHover="true">
            <ElInput size="small" type="number" style="width:160px" v-model.number="numberLocal"
              @change="onNumberLocalChange" />
          </Field>
          <Field v-else-if="typeof (currentSelection?.key?.value) === 'boolean'" title="值" :showHover="true">
            <ElSwitch v-model="booleanLocal" style="margin-left:auto" @change="onBooleanLocalChange" />
          </Field>

        </div>

        <div v-else-if="selectionCount > 1" class="keyframe-info">
          <div class="title">多选关键帧（{{ selectionCount }}）</div>

          <Field title="属性" :showHover="true">
            <ElInput class="readonly" :value="multiCommonPropertyLabel" readonly size="small" style="width:160px" />
          </Field>

          <Field title="曲线" :showHover="true">
            <ElCascader v-model="multiEasingLocal" :options="easingOptions" :props="easingCascaderProps" size="small"
              style="width:160px" :placeholder="multiEasingMixed ? '-' : ''" @change="onMultiEasingChange" />
          </Field>

          <!-- 仅在“共同属性”存在时提供批量编辑（不提供统一帧时间编辑） -->
          <template v-if="multiCommonProperty">
            <!-- rotationQuaternion: 用欧拉角（度）批量编辑 -->
            <Field v-if="multiEditorKind === 'quaternion'" title="旋转 (Euler)" :showHover="true" :textWidth="120">
              <div style="display:flex;gap:6px;align-items:center; margin-left:auto;">
                <ElInput size="small" type="text" style="width:60px" v-model="multiRotationXLocal"
                  @change="(v: any) => onMultiRotationChange('x', v)" />
                <ElInput size="small" type="text" style="width:60px" v-model="multiRotationYLocal"
                  @change="(v: any) => onMultiRotationChange('y', v)" />
                <ElInput size="small" type="text" style="width:60px" v-model="multiRotationZLocal"
                  @change="(v: any) => onMultiRotationChange('z', v)" />
              </div>
            </Field>

            <!-- v3 (position/scale) -->
            <Field v-else-if="multiEditorKind === 'v3'" :title="multiCommonPropertyLabel" :showHover="true">
              <div style="display:flex;gap:6px;align-items:center; margin-left:auto;">
                <ElInput size="small" type="text" style="width:60px" v-model="multiVectorXLocal"
                  @change="(v: any) => onMultiVectorChange('x', v)" />
                <ElInput size="small" type="text" style="width:60px" v-model="multiVectorYLocal"
                  @change="(v: any) => onMultiVectorChange('y', v)" />
                <ElInput size="small" type="text" style="width:60px" v-model="multiVectorZLocal"
                  @change="(v: any) => onMultiVectorChange('z', v)" />
              </div>
            </Field>

            <!-- color -->
            <Field v-else-if="multiEditorKind === 'color'" title="颜色" :showHover="true">
              <ElInput size="small" type="text" style="width:160px" v-model="multiColorLocal"
                @change="(v: any) => onMultiColorChange(v)" />
            </Field>

            <!-- number -->
            <Field v-else-if="multiEditorKind === 'number'" title="值" :showHover="true">
              <ElInput size="small" type="text" style="width:160px" v-model="multiNumberLocal"
                @change="(v: any) => onMultiNumberChange(v)" />
            </Field>
            <Field v-else-if="multiEditorKind === 'boolean'" title="值" :showHover="true">
              <ElSwitch v-model="multiBooleanLocal" style="margin-left:auto"
                @change="(v: any) => onMultiBooleanChange(v)" />
            </Field>
          </template>
        </div>
      </div>
      <div class="empty" v-else>请选择动画</div>
    </div>
    <div class="animation-controls">
      <div class="animation-controls-group">
        <div>
          <SVG name="end" @click="toStart" size="22px"></SVG>
        </div>
        <div>
          <SVG name="next" @click="prev" size="22px"></SVG>
        </div>
        <div>
          <SVG v-if="!playing" @click="playing = true" name="play" size="30px"></SVG>
          <SVG v-else @click="playing = false" name="pause" size="30px"></SVG>
        </div>
        <div>
          <SVG name="next" style="transform: rotate(180deg);" size="22px" @click="next"></SVG>
        </div>
        <div>
          <SVG name="end" style="transform: rotate(180deg);" size="22px" @click="toEnd"></SVG>
        </div>
      </div>
      <div class="item">
        <span class="name" v-if="width > 800" style="margin-right:10px ;">时间</span>
        <ElInputNumber size="small" type="number" :precision="2" style="width:80px" v-model="time" @change="onTimeInput"
          :controls="false">
          <template #suffix>
            <span>s</span>
          </template>
        </ElInputNumber>
      </div>
      <div class="item">
        <span class="name">{{ $t('animation.speed') }}</span>
        <ElSelect v-model="speed" @change="onSpeedChange" style="width:60px">
          <ElOption v-for="opt in playSpeed" :key="opt" :value="opt">{{ opt }}</ElOption>
        </ElSelect>
      </div>
      <div class="item" style="margin-left: auto">
        <span class="name">{{ $t('animation.scaling') }}</span>
        <ElSlider class="small-slider" v-model="scale" :min="0.5" :max="5" :step="0.1" style="width:80px"
          @change="onScaleInput" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef, onUnmounted, toRaw, computed } from 'vue'
import { Timeline } from "@/timeLine/Timeline";
import SVG from '@/component/common/SVG.vue';
import { ArcRotateCamera, TransformNode, Vector3 } from '@babylonjs/core';
import { ID } from '@/utils/id';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Editor } from '@/3d/Editor';
import { CC } from '@/3d/assets/BaseRes';
import { Animator } from '@/3d/animation/animator';
import { _EventBus } from '@/utils/dispatch';
import { TimeController } from '@/utils/Time';
import { EasingTree } from '@/timeLine/keyframe/Easing';
import { registerUndoRedo } from '@/tools/undoredo';
import Field from '@/component/common/Field.vue'

const domRef = ref<HTMLDivElement | null>(null)

const playing = ref(false)
const width = ref(0)
const scale = ref(1)
const speed = ref(1)
const time = ref(0)

function onScroll(v: { scrollTop: number }) {
  timeline.setTop(v.scrollTop || 0)
}


function addCameraTrack() {
  if (!currentRuntimeAction.value) {
    return
  }
  const camera = Editor.Instance.Scene.activeCamera as ArcRotateCamera
  const value = {
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
    targetX: camera.target.x,
    targetY: camera.target.y,
    targetZ: camera.target.z
  }

  const matched = selectedKeyframes.value.filter(s => s.clip && s.clip.objectUuid == 'camera');
  if (matched.length > 0) {
    matched.forEach(m => updateSelectedKeyValue(m.line, m.key, value))
    animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
    return
  }
  const clip = currentRuntimeAction.value.clips.find(x => x.objectUuid == 'camera');
  if (clip) {
    const key = clip.key.find(x => x.time == time.value)
    if (key) {
      key.value = value;
      syncSelectionForKey(currentRuntimeAction.value.clips.indexOf(clip), key.time)
    } else {
      clip.key.push({
        time: time.value,
        value: value,
        easing: 0
      })
      clip.key.sort((a, b) => a.time - b.time)
      // 新增 key 需重建视图
      const sel = timeline.getSelectedKeyframeInfos()
      timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
      if (sel && sel.length > 0) timeline.setSelectedKeyframes(sel)
    }
  } else {
    const clip: CC.Clip = {
      name: "相机" + '%camera',
      uuid: ID.generateUUID(),
      objectUuid: 'camera',
      property: 'camera',
      type: 'camera',
      key: [],
    }
    clip.key.push({
      time: time.value,
      value: value,
      easing: 0
    })
    currentRuntimeAction.value.clips.push(clip)
    refreshClipList()
    const sel = timeline.getSelectedKeyframeInfos()
    timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
    if (sel && sel.length > 0) {
      timeline.setSelectedKeyframes(sel)
    }
    animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))

  }
}


const animName = ref('')
const animDuration = ref(0)
const animLoop = ref(false)
const runtimeAnimations = shallowRef<CC.Animation[]>([])
const currentRuntimeAction = shallowRef<CC.Animation>(null)
let animator: Animator

function loopStorageKey(uuid: string) {
  return `cc_editor_anim_loop_${uuid}`
}

function loadAnimLoop(uuid: string): boolean | null {
  try {
    const v = localStorage.getItem(loopStorageKey(uuid))
    if (v == null) return null
    return v === '1'
  } catch {
    return null
  }
}

function saveAnimLoop(uuid: string, value: boolean) {
  try {
    localStorage.setItem(loopStorageKey(uuid), value ? '1' : '0')
  } catch {
    // ignore
  }
}

type SelectedKey = { line: number; clip: CC.Clip | null; key: KeyframeData }
const selectedKeyframes = ref<SelectedKey[]>([])
const selectionCount = computed(() => selectedKeyframes.value.length)

const currentSelection = computed<SelectedKey | null>(() => selectedKeyframes.value.length === 1 ? selectedKeyframes.value[0] : null)

//本地双向绑定变量（用于在 UI 中编辑并回写到 keyframe 数据）
const vectorX = ref(0)
const vectorY = ref(0)
const vectorZ = ref(0)
//关键帧面板的旋转（以欧拉角度显示并可编辑）
const rotationX = ref(0)
const rotationY = ref(0)
const rotationZ = ref(0)
const keyTimeLocal = ref(0)
const colorLocal = ref('')
const numberLocal = ref(0)
const booleanLocal = ref(false)
const jsonValueLocal = ref('')
const easingLocal = ref<number>(0)
let applyingLocal = false

const easingOptions = EasingTree
const easingCascaderProps = { emitPath: false }

// 多选输入本地状态：允许在显示 '-' 时仍可编辑
const multiVectorXLocal = ref<string>('-')
const multiVectorYLocal = ref<string>('-')
const multiVectorZLocal = ref<string>('-')
const multiRotationXLocal = ref<string>('-')
const multiRotationYLocal = ref<string>('-')
const multiRotationZLocal = ref<string>('-')
const multiColorLocal = ref<string>('-')
const multiNumberLocal = ref<string>('-')
const multiBooleanLocal = ref<boolean>(false)
const multiEasingLocal = ref<number | null>(null)
let applyingMultiLocal = false

// 多选批量编辑（展示“共同属性”，值不一致显示为 '-')
// 框选时 SelectedKey.clip 可能为空或过期，这里以 currentRuntimeAction.clips[line] 为准。
const multiCommonProperty = computed<string | null>(() => {
  if (!currentRuntimeAction.value) return null
  if (selectedKeyframes.value.length < 2) return null

  const firstLine = selectedKeyframes.value[0]?.line
  const firstClip = typeof firstLine === 'number' ? currentRuntimeAction.value.clips?.[firstLine] : null
  const first = firstClip?.property
  if (!first) return null

  for (const s of selectedKeyframes.value) {
    const clip = currentRuntimeAction.value.clips?.[s.line]
    if (!clip || clip.property !== first) return null
  }
  return first
})

const multiCommonPropertyLabel = computed(() => {
  if (!multiCommonProperty.value) return '-'
  return getAnimPropertyLabel(multiCommonProperty.value)
})

type MultiEditorKind = 'v3' | 'quaternion' | 'color' | 'number' | null | 'boolean'
const multiEditorKind = computed<MultiEditorKind>(() => {
  const p = multiCommonProperty.value
  if (!p) return null
  if (p === 'rotationQuaternion') return 'quaternion'
  if (p === 'position' || p === 'scale') return 'v3'
  if (p === 'boolean') return 'boolean'
  if (p.toLowerCase().includes('color')) return 'color'
  // 兜底：若所有都是 number，则支持批量 number
  const allNum = selectedKeyframes.value.length > 0 && selectedKeyframes.value.every(s => typeof s.key?.value === 'number')
  if (allNum) return 'number'
  // 若所有都是 v3 数组
  const allV3 = selectedKeyframes.value.length > 0 && selectedKeyframes.value.every(s => Array.isArray(s.key?.value) && s.key.value.length >= 3)
  if (allV3) return 'v3'
  return null
})

function isSameNumber(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) <= eps
}

function quatToEulerDeg(q: any): { x: number; y: number; z: number } | null {
  if (!Array.isArray(q) || q.length !== 4) return null
  const qx = Number(q[0])
  const qy = Number(q[1])
  const qz = Number(q[2])
  const qw = Number(q[3])
  if (![qx, qy, qz, qw].every(n => Number.isFinite(n))) return null
  const radToDeg = 180 / Math.PI
  const sinr_cosp = 2 * (qw * qx + qy * qz)
  const cosr_cosp = 1 - 2 * (qx * qx + qy * qy)
  const roll = Math.atan2(sinr_cosp, cosr_cosp)

  const sinp = 2 * (qw * qy - qz * qx)
  let pitch
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * (Math.PI / 2)
  } else {
    pitch = Math.asin(sinp)
  }

  const siny_cosp = 2 * (qw * qz + qx * qy)
  const cosy_cosp = 1 - 2 * (qy * qy + qz * qz)
  const yaw = Math.atan2(siny_cosp, cosy_cosp)
  return { x: roll * radToDeg, y: pitch * radToDeg, z: yaw * radToDeg }
}

function eulerDegToQuat(e: { x: number; y: number; z: number }) {
  const rad = Math.PI / 180
  const roll = e.x * rad
  const pitch = e.y * rad
  const yaw = e.z * rad
  const cy = Math.cos(yaw * 0.5)
  const sy = Math.sin(yaw * 0.5)
  const cp = Math.cos(pitch * 0.5)
  const sp = Math.sin(pitch * 0.5)
  const cr = Math.cos(roll * 0.5)
  const sr = Math.sin(roll * 0.5)
  const qw = cr * cp * cy + sr * sp * sy
  const qx = sr * cp * cy - cr * sp * sy
  const qy = cr * sp * cy + sr * cp * sy
  const qz = cr * cp * sy - sr * sp * cy
  return [qx, qy, qz, qw]
}

function mixedNumberDisplay(values: (number | null | undefined)[]) {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (nums.length === 0) return '-'
  const first = nums[0]
  const same = nums.every(v => isSameNumber(v, first))
  return same ? String(first) : '-'
}

const multiVectorX = computed(() => {
  if (multiEditorKind.value !== 'v3') return '-'
  return mixedNumberDisplay(selectedKeyframes.value.map(s => Array.isArray(s.key?.value) ? Number(s.key.value[0]) : null))
})
const multiVectorY = computed(() => {
  if (multiEditorKind.value !== 'v3') return '-'
  return mixedNumberDisplay(selectedKeyframes.value.map(s => Array.isArray(s.key?.value) ? Number(s.key.value[1]) : null))
})
const multiVectorZ = computed(() => {
  if (multiEditorKind.value !== 'v3') return '-'
  return mixedNumberDisplay(selectedKeyframes.value.map(s => Array.isArray(s.key?.value) ? Number(s.key.value[2]) : null))
})

const multiRotationX = computed(() => {
  if (multiEditorKind.value !== 'quaternion') return '-'
  return mixedNumberDisplay(selectedKeyframes.value.map(s => quatToEulerDeg(s.key?.value)?.x))
})
const multiRotationY = computed(() => {
  if (multiEditorKind.value !== 'quaternion') return '-'
  return mixedNumberDisplay(selectedKeyframes.value.map(s => quatToEulerDeg(s.key?.value)?.y))
})
const multiRotationZ = computed(() => {
  if (multiEditorKind.value !== 'quaternion') return '-'
  return mixedNumberDisplay(selectedKeyframes.value.map(s => quatToEulerDeg(s.key?.value)?.z))
})

const multiColor = computed(() => {
  if (multiEditorKind.value !== 'color') return '-'
  const vals = selectedKeyframes.value.map(s => (typeof s.key?.value === 'string' ? s.key.value : null))
  const strs = vals.filter((v): v is string => typeof v === 'string')
  if (strs.length === 0) return '-'
  const first = strs[0]
  return strs.every(v => v === first) ? first : '-'
})

const multiNumber = computed(() => {
  if (multiEditorKind.value !== 'number') return '-'
  return mixedNumberDisplay(selectedKeyframes.value.map(s => (typeof s.key?.value === 'number' ? s.key.value : null)))
})

// 当多选集合/共同属性变化时，刷新本地输入显示（允许 '-'）
watch([selectedKeyframes, multiEditorKind, multiCommonProperty], () => {
  applyingMultiLocal = true
  try {
    multiVectorXLocal.value = String(multiVectorX.value)
    multiVectorYLocal.value = String(multiVectorY.value)
    multiVectorZLocal.value = String(multiVectorZ.value)
    multiRotationXLocal.value = String(multiRotationX.value)
    multiRotationYLocal.value = String(multiRotationY.value)
    multiRotationZLocal.value = String(multiRotationZ.value)
    multiColorLocal.value = String(multiColor.value)
    multiNumberLocal.value = String(multiNumber.value)

    const easingVals = selectedKeyframes.value.map(s => (typeof s.key?.easing === 'number' ? s.key.easing : 0))
    const first = easingVals[0]
    const same = easingVals.every(v => v === first)
    multiEasingLocal.value = same ? first : null
  } finally {
    applyingMultiLocal = false
  }
}, { deep: true })

const multiEasingMixed = computed(() => multiEasingLocal.value == null)

// 关键帧选中/取消选中也纳入 Undo/Redo（仅作用于当前动画 action）
let suppressSelectionUndoRedo = false
let lastSelectionSnapshot: { line: number; time: number }[] = []

function normalizeSelectionSnapshot(sel: { line: number; time: number }[]) {
  return (sel || []).slice().sort((a, b) => (a.line - b.line) || (a.time - b.time))
}

function sameSelectionSnapshot(a: { line: number; time: number }[], b: { line: number; time: number }[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].line !== b[i].line) return false
    if (a[i].time !== b[i].time) return false
  }
  return true
}

function applyTimelineSelectionSnapshot(actionUuid: string, selection: { line: number; time: number }[]) {
  // timeline 尚未初始化或当前不在该 action 时，不做处理
  if (!timeline) return
  if (!currentRuntimeAction.value) return
  if (currentRuntimeAction.value.uuid !== actionUuid) return

  suppressSelectionUndoRedo = true
  try {
    const sel = normalizeSelectionSnapshot(selection)
    if (sel.length === 0) {
      timeline.setSelectedKeyframes([] as any)
      return
    }

    const items = sel
      .map(s => {
        const clip = currentRuntimeAction.value?.clips?.[s.line]
        const data = clip?.key?.find(k => k.time === s.time) || null
        return data ? ({ line: s.line, data }) : null
      })
      .filter(Boolean) as { line: number; data: KeyframeData }[]
    timeline.setSelectedKeyframes(items)
  } finally {
    suppressSelectionUndoRedo = false
  }
}

function parseMixedNumberInput(v: any): number | null {
  const s = String(v ?? '').trim()
  if (!s || s === '-') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function batchUpdateSelectedKeyValues(updateValue: (sel: SelectedKey, oldValue: any) => any) {
  if (!currentRuntimeAction.value) return
  if (selectedKeyframes.value.length === 0) return

  const actionUuid = currentRuntimeAction.value.uuid
  const beforeClips = deepClone(currentRuntimeAction.value.clips)
  const beforeSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []

  for (const sel of selectedKeyframes.value) {
    const clip = currentRuntimeAction.value.clips[sel.line]
    if (!clip) continue
    const k = clip.key.find(x => x.time === sel.key.time)
    if (!k) continue
    const next = updateValue(sel, k.value)
    if (next !== undefined) {
      k.value = next
    }
  }

  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
  // 同步选中引用（防止外部依赖旧引用）
  selectedKeyframes.value.forEach(s => syncSelectionForKey(s.line, s.key.time))
  updateCurrentTransforms()

  const afterClips = deepClone(currentRuntimeAction.value.clips)
  const afterSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []
  if (JSON.stringify(beforeClips) !== JSON.stringify(afterClips)) {
    registerUndoRedo({
      undo: () => applyActionClipsSnapshot(actionUuid, beforeClips, beforeSel),
      redo: () => applyActionClipsSnapshot(actionUuid, afterClips, afterSel),
    })
  }
}

function onMultiVectorChange(axis: 'x' | 'y' | 'z', v: any) {
  if (!multiCommonProperty.value || multiEditorKind.value !== 'v3') return
  if (applyingMultiLocal) return
  const n = parseMixedNumberInput(v)
  if (n === null) return
  const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  batchUpdateSelectedKeyValues((_sel, oldValue) => {
    const arr = Array.isArray(oldValue) ? oldValue.slice(0, 3) : [0, 0, 0]
    arr[idx] = n
    return arr
  })
  // 本轴输入变为确定值
  if (axis === 'x') multiVectorXLocal.value = String(n)
  if (axis === 'y') multiVectorYLocal.value = String(n)
  if (axis === 'z') multiVectorZLocal.value = String(n)
}

function onMultiRotationChange(axis: 'x' | 'y' | 'z', v: any) {
  if (multiCommonProperty.value !== 'rotationQuaternion' || multiEditorKind.value !== 'quaternion') return
  if (applyingMultiLocal) return
  const n = parseMixedNumberInput(v)
  if (n === null) return
  batchUpdateSelectedKeyValues((_sel, oldValue) => {
    const e = quatToEulerDeg(oldValue) ?? { x: 0, y: 0, z: 0 }
    const next = { ...e, [axis]: n }
    return eulerDegToQuat(next)
  })
  if (axis === 'x') multiRotationXLocal.value = String(n)
  if (axis === 'y') multiRotationYLocal.value = String(n)
  if (axis === 'z') multiRotationZLocal.value = String(n)
}

function onMultiColorChange(v: any) {
  if (!multiCommonProperty.value || multiEditorKind.value !== 'color') return
  if (applyingMultiLocal) return
  const s = String(v ?? '').trim()
  if (!s || s === '-') return
  batchUpdateSelectedKeyValues(() => s)
  multiColorLocal.value = s
}

function onMultiNumberChange(v: any) {
  if (!multiCommonProperty.value || multiEditorKind.value !== 'number') return
  if (applyingMultiLocal) return
  const n = parseMixedNumberInput(v)
  if (n === null) return
  batchUpdateSelectedKeyValues(() => n)
  multiNumberLocal.value = String(n)
}

function onMultiBooleanChange(v: any) {
  if (!multiCommonProperty.value || multiEditorKind.value !== 'boolean') return
  if (applyingMultiLocal) return
  batchUpdateSelectedKeyValues(() => v)
  multiBooleanLocal.value = v
}

function getAnimPropertyLabel(property: string) {
  if (!property) return ''
  const key = `animation.${property}`
  const label = $i18nT(key)
  return label === key ? property : label
}


//当选中项发生变化时，填充本地变量，更新旋转和位置面板
watch(currentSelection, (v) => {
  applyingLocal = true
  if (v) {
    const val = v.key.value
    keyTimeLocal.value = Number(v.key.time) || 0

    // v3 值（position/scale）
    if (Array.isArray(val) && (v.clip?.type === 'v3' || ['position', 'scale'].includes(v.clip?.property || ''))) {
      vectorX.value = Number(val[0]) || 0
      vectorY.value = Number(val[1]) || 0
      vectorZ.value = Number(val[2]) || 0
    } else {
      vectorX.value = 0
      vectorY.value = 0
      vectorZ.value = 0
    }

    // 旋转四元数 -> 欧拉角（度）
    if (Array.isArray(val) && val.length === 4 && (v.clip?.property === 'rotationQuaternion' || v.clip?.type === 'quaternion')) {
      const qx = Number(val[0])
      const qy = Number(val[1])
      const qz = Number(val[2])
      const qw = Number(val[3])
      const radToDeg = 180 / Math.PI
      const sinr_cosp = 2 * (qw * qx + qy * qz)
      const cosr_cosp = 1 - 2 * (qx * qx + qy * qy)
      const roll = Math.atan2(sinr_cosp, cosr_cosp)

      const sinp = 2 * (qw * qy - qz * qx)
      let pitch
      if (Math.abs(sinp) >= 1) {
        pitch = Math.sign(sinp) * (Math.PI / 2)
      } else {
        pitch = Math.asin(sinp)
      }

      const siny_cosp = 2 * (qw * qz + qx * qy)
      const cosy_cosp = 1 - 2 * (qy * qy + qz * qz)
      const yaw = Math.atan2(siny_cosp, cosy_cosp)

      rotationX.value = roll * radToDeg
      rotationY.value = pitch * radToDeg
      rotationZ.value = yaw * radToDeg
    } else {
      rotationX.value = 0
      rotationY.value = 0
      rotationZ.value = 0
    }

    colorLocal.value = typeof val === 'string' ? val : (Array.isArray(val) ? JSON.stringify(val) : '')
    numberLocal.value = typeof val === 'number' ? val : 0
    jsonValueLocal.value = JSON.stringify(val ?? {})
    booleanLocal.value = typeof val === 'boolean' ? val : false



    easingLocal.value = typeof (v.key as any)?.easing === 'number' ? (v.key as any).easing : 0
  } else {
    vectorX.value = 0
    vectorY.value = 0
    vectorZ.value = 0
    rotationX.value = 0
    rotationY.value = 0
    rotationZ.value = 0
    colorLocal.value = ''
    booleanLocal.value = false
    numberLocal.value = 0
    jsonValueLocal.value = ''
    keyTimeLocal.value = 0

    easingLocal.value = 0
  }
  applyingLocal = false
})

function onKeyTimeLocalChange() {
  if (selectionCount.value !== 1 || !currentSelection.value) return
  if (applyingLocal) return
  const n = Number(keyTimeLocal.value)
  updateSelectedKeyTime(currentSelection.value.line, currentSelection.value.key, isNaN(n) ? 0 : n)
}

//本地变化回写
function onVectorLocalChange() {
  if (selectionCount.value !== 1 || !currentSelection.value) return
  if (applyingLocal) return
  const arr = [vectorX.value, vectorY.value, vectorZ.value]
  updateSelectedKeyValue(currentSelection.value.line, currentSelection.value.key, arr)
  currentSelection.value.key.value = arr
}

function onRotationLocalChange() {
  if (selectionCount.value !== 1 || !currentSelection.value) return
  if (applyingLocal) return
  //输入为度，转换为弧度后计算四元数
  const rad = Math.PI / 180
  const roll = rotationX.value * rad
  const pitch = rotationY.value * rad
  const yaw = rotationZ.value * rad
  const cy = Math.cos(yaw * 0.5)
  const sy = Math.sin(yaw * 0.5)
  const cp = Math.cos(pitch * 0.5)
  const sp = Math.sin(pitch * 0.5)
  const cr = Math.cos(roll * 0.5)
  const sr = Math.sin(roll * 0.5)

  const qw = cr * cp * cy + sr * sp * sy
  const qx = sr * cp * cy - cr * sp * sy
  const qy = cr * sp * cy + sr * cp * sy
  const qz = cr * cp * sy - sr * sp * cy

  const quat = [qx, qy, qz, qw]
  updateSelectedKeyValue(currentSelection.value.line, currentSelection.value.key, quat)
  currentSelection.value.key.value = quat
}
function onColorLocalChange() {
  if (selectionCount.value !== 1 || !currentSelection.value) return
  if (applyingLocal) return
  updateSelectedKeyValue(currentSelection.value.line, currentSelection.value.key, colorLocal.value)
  currentSelection.value.key.value = colorLocal.value
}
function onNumberLocalChange() {
  if (selectionCount.value !== 1 || !currentSelection.value) return
  if (applyingLocal) return
  const n = Number(numberLocal.value)
  updateSelectedKeyValue(currentSelection.value.line, currentSelection.value.key, isNaN(n) ? 0 : n)
  currentSelection.value.key.value = isNaN(n) ? 0 : n
}
function onBooleanLocalChange() {
  if (selectionCount.value !== 1 || !currentSelection.value) return
  if (applyingLocal) return
  updateSelectedKeyValue(currentSelection.value.line, currentSelection.value.key, booleanLocal.value)
  currentSelection.value.key.value = booleanLocal.value
}



function onEasingLocalChange() {
  if (selectionCount.value !== 1 || !currentSelection.value) return
  if (applyingLocal) return
  const n = Number(easingLocal.value)
  updateSelectedKeyEasing(currentSelection.value.line, currentSelection.value.key, Number.isFinite(n) ? n : 0)
    ; (currentSelection.value.key as any).easing = Number.isFinite(n) ? n : 0
}

function onMultiEasingChange(v: any) {
  if (applyingMultiLocal) return
  if (selectedKeyframes.value.length < 2) return
  const n = Number(v)
  if (!Number.isFinite(n)) return
  batchUpdateSelectedKeyEasing(n)
  multiEasingLocal.value = n
}

function updateSelectedKeyTime(line: number, key: KeyframeData, newTime: number) {
  if (!currentRuntimeAction.value) return
  if (isNaN(newTime)) return
  if (newTime < 0) newTime = 0

  const actionUuid = currentRuntimeAction.value.uuid
  const beforeClips = deepClone(currentRuntimeAction.value.clips)
  const beforeSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []

  const clip = currentRuntimeAction.value.clips[line]
  if (!clip) return

  const oldTime = key.time
  let idx = clip.key.findIndex(k => k === key)
  if (idx === -1) idx = clip.key.findIndex(k => k.time === oldTime)
  if (idx === -1) return

  // 如果时间没变，直接返回
  if (clip.key[idx].time === newTime) return

  // 处理时间冲突：如果存在另一条 key 占用了 newTime，则不允许修改，直接返回
  const conflictIdx = clip.key.findIndex((k, i) => i !== idx && k.time === newTime)
  if (conflictIdx !== -1) {
    // 冲突时保持原值并回填输入框
    keyTimeLocal.value = oldTime
    return
  }

  const keyRef = clip.key[idx]
  keyRef.time = newTime
  clip.key.sort((a, b) => a.time - b.time)

  // 重建时间线并恢复选中到该 key（时间改变会影响位置）
  const selItem = { line, data: keyRef }
  timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
  timeline.setSelectedKeyframes([selItem])

  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
  updateCurrentTransforms()

  animDuration.value = computeDurationFromClips(currentRuntimeAction.value.clips) ?? 0
  if (time.value > animDuration.value) {
    time.value = animDuration.value
  }

  const afterClips = deepClone(currentRuntimeAction.value.clips)
  const afterSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []
  if (JSON.stringify(beforeClips) !== JSON.stringify(afterClips)) {
    registerUndoRedo({
      undo: () => applyActionClipsSnapshot(actionUuid, beforeClips, beforeSel),
      redo: () => applyActionClipsSnapshot(actionUuid, afterClips, afterSel),
    })
  }
}


//把数据变更同步到选中项（当外部事件更新 key）
function syncSelectionForKey(line: number, time: number) {
  if (!currentRuntimeAction.value) return
  const idx = selectedKeyframes.value.findIndex((s) => s.line === line && s.key && s.key.time === time)
  if (idx === -1) return
  const clip = currentRuntimeAction.value.clips[line]
  if (!clip) return
  const newKey = clip.key.find((k) => k.time === time)
  if (!newKey) return
  selectedKeyframes.value[idx].key = newKey
  // 如果是单选，更新本地编辑值
  if (selectionCount.value === 1) {
    applyingLocal = true
    const v = newKey.value
    keyTimeLocal.value = Number(newKey.time) || 0
    easingLocal.value = typeof (newKey as any)?.easing === 'number' ? (newKey as any).easing : 0
    if (Array.isArray(v)) {
      vectorX.value = Number(v[0]) || 0
      vectorY.value = Number(v[1]) || 0
      vectorZ.value = Number(v[2]) || 0
    } else {
      vectorX.value = 0
      vectorY.value = 0
      vectorZ.value = 0
    }

    // 如果是四元数（rotation）则转换为欧拉角度并填入旋转输入
    if (Array.isArray(v) && v.length === 4 && clip.property === 'rotationQuaternion') {
      const qx = Number(v[0])
      const qy = Number(v[1])
      const qz = Number(v[2])
      const qw = Number(v[3])
      const radToDeg = 180 / Math.PI
      const sinr_cosp = 2 * (qw * qx + qy * qz)
      const cosr_cosp = 1 - 2 * (qx * qx + qy * qy)
      const roll = Math.atan2(sinr_cosp, cosr_cosp)

      const sinp = 2 * (qw * qy - qz * qx)
      let pitch
      if (Math.abs(sinp) >= 1) {
        pitch = Math.sign(sinp) * (Math.PI / 2)
      } else {
        pitch = Math.asin(sinp)
      }

      const siny_cosp = 2 * (qw * qz + qx * qy)
      const cosy_cosp = 1 - 2 * (qy * qy + qz * qz)
      const yaw = Math.atan2(siny_cosp, cosy_cosp)

      rotationX.value = roll * radToDeg
      rotationY.value = pitch * radToDeg
      rotationZ.value = yaw * radToDeg
    } else {
      rotationX.value = 0
      rotationY.value = 0
      rotationZ.value = 0
    }

    colorLocal.value = typeof v === 'string' ? v : (Array.isArray(v) ? JSON.stringify(v) : '')
    numberLocal.value = typeof v === 'number' ? v : 0
    jsonValueLocal.value = JSON.stringify(v ?? {})
    applyingLocal = false
  }
}

function getClipName(v: string) {
  const array = v.split("%")
  array.pop()
  return array.join('%')
}



function deleteAnimation(uuid: string) {
  ElMessageBox.confirm('确认删除动画吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    runtimeAnimations.value = runtimeAnimations.value.filter(item => item.uuid != uuid)
    Editor.Instance.Scene.runtimeAnimation = toRaw(runtimeAnimations.value)
    if (currentRuntimeAction.value?.uuid == uuid) {
      currentRuntimeAction.value = null
      currentSelect.value = ''
      onSelectChange('')
    }
  })
}

let timeController: TimeController

function computeDurationFromClips(clips: CC.Clip[] = []) {
  let max = 0
  clips.forEach(c => {
    (c.key || []).forEach(k => { if (k.time > max) max = k.time })
  })
  return max
}

function commitAnimationChange() {
  if (!currentRuntimeAction.value) return
  currentRuntimeAction.value.name = animName.value
  runtimeAnimations.value = [...runtimeAnimations.value]
  Editor.Instance.Scene.runtimeAnimation = toRaw(runtimeAnimations.value)
}

watch(currentRuntimeAction, (v) => {
  if (v) {
    animName.value = v.name || ''
    animDuration.value = computeDurationFromClips(v.clips) ?? 0

    // 循环状态：优先从动画对象本身读取，其次从 localStorage 读取，默认 false
    const fromAction = (v as any).loop
    const fromStorage = loadAnimLoop(v.uuid)
    const loopVal = typeof fromAction === 'boolean' ? fromAction : (fromStorage ?? false)
    animLoop.value = loopVal

    // 若 action 上没有存储字段，则补齐，保证切换/回放/保存时一致
    if (typeof fromAction !== 'boolean') {
      ; (v as any).loop = loopVal
    }
  } else {
    animName.value = ''
    animDuration.value = 0
    animLoop.value = false
  }
  // 清空选中信息
  selectedKeyframes.value = []
  lastSelectionSnapshot = []
})

function deepClone<T>(value: T): T {
  try {
    const sc = (globalThis as any).structuredClone
    if (typeof sc === 'function') return sc(value)
  } catch {
    // ignore
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function applyActionClipsSnapshot(
  actionUuid: string,
  clipsSnapshot: CC.Clip[],
  selection: { line: number; time: number }[] = [],
) {
  const action = runtimeAnimations.value.find(a => a.uuid === actionUuid)
  if (!action) return

  action.clips = deepClone(clipsSnapshot)
  runtimeAnimations.value = [...runtimeAnimations.value]
  Editor.Instance.Scene.runtimeAnimation = toRaw(runtimeAnimations.value)

  // 仅当当前面板正在查看这个动画时才重建 timeline/animator
  if (currentRuntimeAction.value?.uuid === actionUuid) {
    suppressSelectionUndoRedo = true
    try {
      refreshClipList()

      animDuration.value = computeDurationFromClips(action.clips) ?? 0
      if (time.value > animDuration.value) {
        time.value = animDuration.value
      }

      timeline.setKeyframes(action.clips.map(x => x.key))
      if (selection.length > 0) {
        const items = selection
          .map(s => {
            const clip = action.clips[s.line]
            const data = clip?.key?.find(k => k.time === s.time) || null
            return data ? ({ line: s.line, data }) : null
          })
          .filter(Boolean) as { line: number; data: KeyframeData }[]
        if (items.length > 0) timeline.setSelectedKeyframes(items)
      } else {
        // 显式恢复“无选中”状态
        timeline.setSelectedKeyframes([] as any)
      }
      animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
      updateCurrentTransforms()
    } finally {
      suppressSelectionUndoRedo = false
    }
  }
}

function updateSelectedKeyValue(line: number, key: KeyframeData, newValue: any) {
  if (!currentRuntimeAction.value) return

  const actionUuid = currentRuntimeAction.value.uuid
  const beforeClips = deepClone(currentRuntimeAction.value.clips)
  const beforeSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []

  const clip = currentRuntimeAction.value.clips[line]
  if (!clip) return
  // 找到对应的 key（通过 time 匹配）
  let added = false
  const k = clip.key.find((x) => x.time === key.time)
  if (k) {
    k.value = newValue
  } else {
    // 如果没找到，尝试按引用或索引匹配
    const idx = clip.key.findIndex((x) => x === key)
    if (idx !== -1) {
      clip.key[idx].value = newValue
    } else {
      // 如果找不到对应项，则新增一个 key（时间保持不变）
      clip.key.push({ time: key.time, value: newValue, easing: 0 })
      clip.key.sort((a, b) => a.time - b.time)
      added = true
    }
  }

  // 仅在新增 key 时重建视图，否则直接更新动画数据以避免清空 selection
  if (added) {
    // 保存当前选中（line,time）以便重建后恢复
    const sel = timeline.getSelectedKeyframeInfos()
    timeline.setKeyframes(currentRuntimeAction.value.clips.map((x) => x.key))
    // 恢复选中
    if (sel && sel.length > 0) {
      timeline.setSelectedKeyframes(sel)
    }
  }

  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))

  // 同步面板选中项（如果更新的 key 属于当前选中）
  syncSelectionForKey(line, key.time)

  // 若此次操作导致新增关键帧或时间分布变化，同步最大时长显示
  animDuration.value = computeDurationFromClips(currentRuntimeAction.value.clips) ?? 0
  if (time.value > animDuration.value) {
    time.value = animDuration.value
  }

  const afterClips = deepClone(currentRuntimeAction.value.clips)
  const afterSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []

  // 避免无变化也入栈（例如重复写入同值）
  if (JSON.stringify(beforeClips) !== JSON.stringify(afterClips)) {
    registerUndoRedo({
      undo: () => applyActionClipsSnapshot(actionUuid, beforeClips, beforeSel),
      redo: () => applyActionClipsSnapshot(actionUuid, afterClips, afterSel),
    })
  }
}

function updateSelectedKeyEasing(line: number, key: KeyframeData, easing: number) {
  if (!currentRuntimeAction.value) return

  const actionUuid = currentRuntimeAction.value.uuid
  const beforeClips = deepClone(currentRuntimeAction.value.clips)
  const beforeSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []

  const clip = currentRuntimeAction.value.clips[line]
  if (!clip) return
  const k = clip.key.find((x) => x.time === key.time) || clip.key.find((x) => x === key)
  if (!k) return
    ; (k as any).easing = easing

  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
  syncSelectionForKey(line, key.time)

  const afterClips = deepClone(currentRuntimeAction.value.clips)
  const afterSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []
  if (JSON.stringify(beforeClips) !== JSON.stringify(afterClips)) {
    registerUndoRedo({
      undo: () => applyActionClipsSnapshot(actionUuid, beforeClips, beforeSel),
      redo: () => applyActionClipsSnapshot(actionUuid, afterClips, afterSel),
    })
  }
}

function batchUpdateSelectedKeyEasing(easing: number) {
  if (!currentRuntimeAction.value) return
  if (selectedKeyframes.value.length === 0) return

  const actionUuid = currentRuntimeAction.value.uuid
  const beforeClips = deepClone(currentRuntimeAction.value.clips)
  const beforeSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []

  for (const sel of selectedKeyframes.value) {
    const clip = currentRuntimeAction.value.clips[sel.line]
    if (!clip) continue
    const k = clip.key.find(x => x.time === sel.key.time)
    if (!k) continue
      ; (k as any).easing = easing
  }

  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
  selectedKeyframes.value.forEach(s => syncSelectionForKey(s.line, s.key.time))
  updateCurrentTransforms()

  const afterClips = deepClone(currentRuntimeAction.value.clips)
  const afterSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []
  if (JSON.stringify(beforeClips) !== JSON.stringify(afterClips)) {
    registerUndoRedo({
      undo: () => applyActionClipsSnapshot(actionUuid, beforeClips, beforeSel),
      redo: () => applyActionClipsSnapshot(actionUuid, afterClips, afterSel),
    })
  }
}


watch(animName, () => commitAnimationChange())
function onSelectChange(uuid: string) {
  timeline.stop()
  timeline.seek(0)
  animator?.restoreDefault()
  currentRuntimeAction.value = runtimeAnimations.value.find(item => item.uuid == uuid) || null
  if (!currentRuntimeAction.value) {
    timeline.setKeyframes([])
    animator = null
    return
  }
  timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
  animator = new Animator(currentRuntimeAction.value)
  animator.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
  animator.collectInfo()
  // 更新面板中的当前 transform 显示（初始时）
  updateCurrentTransforms()
}

// 本地 color/number handlers 使用 colorLocal/numberLocal/onColorLocalChange/onNumberLocalChange

// 当选中项变化时，更新本地编辑值的显示
watch(selectedKeyframes, (val) => {
  if (val.length === 1) {
    const v = val[0].key.value
    if (typeof v === 'string') {
      colorLocal.value = v
    } else if (Array.isArray(v)) {
      colorLocal.value = JSON.stringify(v)
    } else {
      colorLocal.value = ''
    }
  } else {
    colorLocal.value = ''
  }
})


watch(speed, (val) => {
  timeline.speed = val
})

watch(time, (val) => {
  if (timeline && timeline?.time != val) {
    timeline.time = val
  }
  updateCurrentTransforms()
})

watch(scale, (val) => {
  if (!timeline) return
  if (Math.abs(timeline.scale - val) > 1e-6) {
    timeline.scale = val
  }
})

watch(playing, (val) => {
  if (val) {
    timeline.play()
  } else {
    timeline.pause()
  }
})

watch(animLoop, (val) => {
  if (!timeline) return
  const loopVal = !!val
  timeline.setLoop(loopVal)

  const action = currentRuntimeAction.value
  if (action) {
    (action as any).loop = loopVal
    // 同步到运行时动画列表，保证下次打开仍保持
    runtimeAnimations.value = [...runtimeAnimations.value]
    Editor.Instance.Scene.runtimeAnimation = toRaw(runtimeAnimations.value)
    saveAnimLoop(action.uuid, loopVal)
  }
})

let resizeObserver: ResizeObserver | null = null
let timeline: Timeline
onMounted(() => {
  timeline = new Timeline()
  resizeObserver = new ResizeObserver((entries) => {
    width.value = entries[0].contentRect.width
  })
  if (domRef.value) {
    timeline.init({ maxTime: 60 * 10 }, domRef.value).then(() => {
      // 循环开关同步到时间线
      timeline.setLoop(!!animLoop.value)

      // 时间线内部自动停止（非循环播完）时，同步回 UI 播放按钮
      timeline.setPlayingChanged((p: boolean) => {
        if (playing.value !== p) playing.value = p
      })

      // 时间线内部（例如 Ctrl+滚轮）缩放时，同步回面板 scale
      timeline.setScaleChanged((s: number) => {
        if (Math.abs(scale.value - s) > 1e-6) {
          scale.value = s
        }
      })

      timeline.setTimeChanged((t: number) => {
        if (t == 0) {
          animator.reset()
        }
        time.value = t
        if (animator) {
          animator.execute(t)
        }
        // 更新当前 time 下的 transform 显示
        updateCurrentTransforms()
      })      // 订阅时间线选中变化
      timeline.setSelectionChanged((items) => {
        const actionUuid = currentRuntimeAction.value?.uuid || ''
        const beforeSel = normalizeSelectionSnapshot(lastSelectionSnapshot)
        const afterSel = normalizeSelectionSnapshot(items.map(x => ({ line: x.line, time: x.data.time })))

        // 选中变化也纳入 Undo/Redo（含取消选中）。避免在撤销/重建视图时递归入栈。
        if (!suppressSelectionUndoRedo && actionUuid) {
          if (!sameSelectionSnapshot(beforeSel, afterSel)) {
            registerUndoRedo({
              undo: () => applyTimelineSelectionSnapshot(actionUuid, beforeSel),
              redo: () => applyTimelineSelectionSnapshot(actionUuid, afterSel),
            })
          }
        }

        // 无论是否入栈，都同步 lastSelectionSnapshot（确保下一次 beforeSel 正确）
        lastSelectionSnapshot = afterSel

        // items: { line, data }
        selectedKeyframes.value = items.map((item) => {
          const clip = currentRuntimeAction.value?.clips?.[item.line] || null
          return {
            line: item.line,
            clip,
            key: item.data,
          }
        })
        // 当前选中变化也需要刷新显示目标（例如选中其它对象）
        updateCurrentTransforms()
      })

      // 订阅拖拽结束事件：移动/删除 keyframe 后记录 Undo/Redo，并排序/重建并恢复选中
      timeline.setMoveEnd((payload) => {
        if (!currentRuntimeAction.value) return

        if (payload?.before?.keyframes && payload?.after?.keyframes) {
          const actionUuid = currentRuntimeAction.value.uuid
          const templateClips = deepClone(currentRuntimeAction.value.clips)
          const normalize = (rows: KeyframeData[][]) => rows.map(r => (r || []).slice().sort((a, b) => a.time - b.time))

          const makeClips = (rows: KeyframeData[][]) => {
            const clips = deepClone(templateClips)
            const normalized = normalize(rows)
            clips.forEach((c, i) => {
              c.key = (normalized[i] ?? []) as any
            })
            return clips
          }

          const beforeClips = makeClips(payload.before.keyframes)
          const afterClips = makeClips(payload.after.keyframes)
          const beforeSel = payload.before.selection ?? []
          const afterSel = payload.after.selection ?? []

          registerUndoRedo({
            undo: () => applyActionClipsSnapshot(actionUuid, beforeClips, beforeSel),
            redo: () => applyActionClipsSnapshot(actionUuid, afterClips, afterSel),
          })
        }

        const sel = timeline.getSelectedKeyframeInfos()

        // move/delete/paste 的 Undo/Redo 已经在上面入栈（并包含 selection 快照），
        // 这里重建视图/恢复选中时不应再额外产生“选中变化”的 Undo。
        suppressSelectionUndoRedo = true
        try {
          currentRuntimeAction.value.clips.forEach((clip) => {
            clip.key.sort((a, b) => a.time - b.time)
          })

          // 拖拽/删除后同步最大时长显示，并把当前 time 夹到合法范围
          animDuration.value = computeDurationFromClips(currentRuntimeAction.value.clips) ?? 0
          if (time.value > animDuration.value) {
            time.value = animDuration.value
          }

          timeline.setKeyframes(currentRuntimeAction.value.clips.map((x) => x.key))
          if (sel && sel.length > 0) {
            timeline.setSelectedKeyframes(sel)
          }
          else timeline.setSelectedKeyframes([] as any)
          animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
          updateCurrentTransforms()
        } finally {
          suppressSelectionUndoRedo = false
        }
      })
    })
    resizeObserver.observe(domRef.value)
  }
  Editor.Instance.on('onPositionChanged', onPositionChanged)
  Editor.Instance.on('onRotationChanged', onRotationChanged)
  Editor.Instance.on('onScaleChanged', onScaleChanged)
  Editor.Instance.on('onSceneChangeBefore', onSceneChangeBefore)
  Editor.Instance.on('onSceneChanged', onSceneChange)
  _EventBus.on('onSceneSaveBefore', onSceneChangeBefore)
  _EventBus.on('onPropertyChanged', onPropertyChanged)
  _EventBus.on('addCameraKeyframe', addCameraTrack)
  onSceneChange()
  // 初始化显示
  updateCurrentTransforms()
});
function onSceneChangeBefore() {
  timeline.stop()
  timeline?.seek(0);
  animator?.reset()
}
function onPropertyChanged(e: {
  object: any;
  property: string
  type: any
  newValue: any
  oldValue: any
}) {
  if (!e.object.uuid) {
    e.object.uuid = ID.generateUUID()
  }
  if (!currentRuntimeAction.value) {
    return
  }

  const actionUuid = currentRuntimeAction.value.uuid
  const beforeClips = deepClone(currentRuntimeAction.value.clips)
  const beforeSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []

  const clip = currentRuntimeAction.value.clips.find(x => x.objectUuid == e.object.uuid && x.property == e.property);
  if (clip) {
    const key = clip.key.find(x => x.time == time.value)
    if (key) {
      key.value = e.newValue
    } else {
      clip.key.push({
        time: time.value,
        value: e.newValue,
        easing: 0
      })
      clip.key.sort((a, b) => a.time - b.time)
    }
  } else {
    const clip: CC.Clip = {
      name: e.object.name + '%' + e.property,
      uuid: ID.generateUUID(),
      objectUuid: e.object.uuid,
      property: e.property,
      type: e.type,
      key: [],
    }
    animator.addCollectInfo(e.object, e.property, e.oldValue, e.type)
    if (time.value != 0) {
      clip.key.push({
        time: 0,
        value: e.oldValue,
        easing: 0
      })
    }
    clip.key.push({
      time: time.value,
      value: e.newValue,
      easing: 0
    })
    currentRuntimeAction.value.clips.push(clip)
    refreshClipList()
  }
  timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))

  animDuration.value = computeDurationFromClips(currentRuntimeAction.value.clips) ?? 0
  if (time.value > animDuration.value) {
    time.value = animDuration.value
  }

  const afterClips = deepClone(currentRuntimeAction.value.clips)
  const afterSel = timeline?.getSelectedKeyframeInfos?.()?.map(x => ({ line: x.line, time: x.data.time })) ?? []
  if (JSON.stringify(beforeClips) !== JSON.stringify(afterClips)) {
    registerUndoRedo({
      undo: () => applyActionClipsSnapshot(actionUuid, beforeClips, beforeSel),
      redo: () => applyActionClipsSnapshot(actionUuid, afterClips, afterSel),
    })
  }

}


onBeforeUnmount(() => {
  if (resizeObserver && domRef.value) {
    resizeObserver.unobserve(domRef.value)
    resizeObserver.disconnect()
  }
  if (timeController) {
    timeController.dispose()
    timeController = null
  }
  timeline.seek(0)
  timeline.dispose()
  timeline = null;
  animator?.dispose()
  animator = null
  Editor.Instance.off('onPositionChanged', onPositionChanged)
  Editor.Instance.off('onRotationChanged', onRotationChanged)
  Editor.Instance.off('onScaleChanged', onScaleChanged)
  Editor.Instance.off('onSceneChanged', onSceneChange)
  Editor.Instance.off('onSceneChangeBefore', onSceneChangeBefore)
  _EventBus.off('onSceneSaveBefore', onSceneChangeBefore)
  _EventBus.off('onPropertyChanged', onPropertyChanged)
})

function onSceneChange() {
  if (!Editor.Instance.Scene) {
    return
  }
  if (!Editor.Instance.Scene?.runtimeAnimation) {
    Editor.Instance.Scene.runtimeAnimation = []
  }
  runtimeAnimations.value = Editor.Instance.Scene.runtimeAnimation;
  timeline.setKeyframes([])
  currentRuntimeAction.value = null
  currentSelect.value = ''
}

function onPositionChanged(e: { object: TransformNode, newPosition: number[], oldPosition: number[] }) {
  if (!e.object.uuid) {
    e.object.uuid = ID.generateUUID()
  }
  if (!currentRuntimeAction.value) {
    return
  }

  // 如果用户已选中该对象的关键帧，优先更新选中的关键帧（不依赖当前时间）
  const matched = selectedKeyframes.value.filter(s => s.clip && s.clip.objectUuid === e.object.uuid && s.clip.property === 'position');
  if (matched.length > 0) {
    matched.forEach(m => {
      updateSelectedKeyValue(m.line, m.key, e.object.position.asArray())
    })
    animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
    updateCurrentTransforms()
    return
  }

  const clip = currentRuntimeAction.value.clips.find(x => x.objectUuid == e.object.uuid && x.property == 'position');
  if (clip) {
    const key = clip.key.find(x => x.time == time.value)
    if (key) {
      key.value = e.object.position.asArray()
      // 同步面板选中项（无需重建视图）
      syncSelectionForKey(currentRuntimeAction.value.clips.indexOf(clip), key.time)
    } else {
      clip.key.push({
        time: time.value,
        value: e.object.position.asArray(),
        easing: 0
      })
      clip.key.sort((a, b) => a.time - b.time)
      // 新增 key 需重建视图
      const sel = timeline.getSelectedKeyframeInfos()
      timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
      if (sel && sel.length > 0) timeline.setSelectedKeyframes(sel)
    }
  } else {
    const clip: CC.Clip = {
      name: e.object.name + '%position',
      uuid: ID.generateUUID(),
      objectUuid: e.object.uuid,
      property: 'position',
      type: 'v3',
      key: [],
    }
    animator.addCollectInfo(e.object, 'position', e.oldPosition, 'v3')
    if (time.value != 0) {
      clip.key.push({
        time: 0,
        value: e.oldPosition,
        easing: 0
      })
    }
    clip.key.push({
      time: time.value,
      value: e.newPosition,
      easing: 0
    })
    currentRuntimeAction.value.clips.push(clip)
    refreshClipList()
    const sel = timeline.getSelectedKeyframeInfos()
    timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
    if (sel && sel.length > 0) timeline.setSelectedKeyframes(sel)
  }
  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))

}
function onRotationChanged(e: { object: TransformNode, newRotation: number[], oldRotation: number[] }) {
  if (!e.object.uuid) {
    e.object.uuid = ID.generateUUID()
  }
  if (!currentRuntimeAction.value) {
    return
  }

  // 优先更新选中的关键帧（如果匹配对象与属性）
  const matched = selectedKeyframes.value.filter(s => s.clip && s.clip.objectUuid === e.object.uuid && s.clip.property === 'rotationQuaternion');
  if (matched.length > 0) {
    matched.forEach(m => updateSelectedKeyValue(m.line, m.key, e.object.rotationQuaternion.asArray()))
    animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
    updateCurrentTransforms()
    return
  }

  const clip = currentRuntimeAction.value.clips.find(x => x.objectUuid == e.object.uuid && x.property == 'rotationQuaternion');
  if (clip) {
    const key = clip.key.find(x => x.time == time.value)
    if (key) {
      key.value = e.object.rotationQuaternion.asArray()
      syncSelectionForKey(currentRuntimeAction.value.clips.indexOf(clip), key.time)
    } else {
      clip.key.push({
        time: time.value,
        value: e.object.rotationQuaternion.asArray(),
        easing: 0
      })
      clip.key.sort((a, b) => a.time - b.time)
      const sel = timeline.getSelectedKeyframeInfos()
      timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
      if (sel && sel.length > 0) timeline.setSelectedKeyframes(sel)
    }
  } else {
    const clip: CC.Clip = {
      name: e.object.name + '%rotationQuaternion',
      uuid: ID.generateUUID(),
      objectUuid: e.object.uuid,
      property: 'rotationQuaternion',
      type: 'quaternion',
      key: [],
    }
    animator.addCollectInfo(e.object, 'rotationQuaternion', e.oldRotation, 'quaternion')
    if (time.value != 0) {
      clip.key.push({
        time: 0,
        value: e.oldRotation,
        easing: 0
      })
    }
    clip.key.push({
      time: time.value,
      value: e.newRotation,
      easing: 0
    })
    currentRuntimeAction.value.clips.push(clip)
    refreshClipList()
    const sel = timeline.getSelectedKeyframeInfos()
    timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
    if (sel && sel.length > 0) timeline.setSelectedKeyframes(sel)
  }
  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
}
function onScaleChanged(e: { object: TransformNode, newScale: number[], oldScale: number[] }) {
  if (!e.object.uuid) {
    e.object.uuid = ID.generateUUID()
  }
  if (!currentRuntimeAction.value) {
    return
  }

  // 优先更新选中的关键帧（如果匹配对象与属性）
  const matched = selectedKeyframes.value.filter(s => s.clip && s.clip.objectUuid === e.object.uuid && s.clip.property === 'scaling');
  if (matched.length > 0) {
    matched.forEach(m => updateSelectedKeyValue(m.line, m.key, e.newScale))
    animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
    updateCurrentTransforms()
    return
  }

  const clip = currentRuntimeAction.value.clips.find(x => x.objectUuid == e.object.uuid && x.property == 'scaling');
  if (clip) {
    const key = clip.key.find(x => x.time == time.value)
    if (key) {
      key.value = e.newScale
      syncSelectionForKey(currentRuntimeAction.value.clips.indexOf(clip), key.time)
    } else {
      clip.key.push({
        time: time.value,
        value: e.newScale,
        easing: 0
      })
      clip.key.sort((a, b) => a.time - b.time)
      const sel = timeline.getSelectedKeyframeInfos()
      timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
      if (sel && sel.length > 0) timeline.setSelectedKeyframes(sel)
    }
  } else {
    const clip: CC.Clip = {
      name: e.object.name + '%scale',
      uuid: ID.generateUUID(),
      objectUuid: e.object.uuid,
      property: 'scaling',
      type: 'v3',
      key: [],
    }
    animator.addCollectInfo(e.object, 'scaling', e.oldScale, 'v3')
    if (time.value != 0) {
      clip.key.push({
        time: 0,
        value: e.oldScale,
        easing: 0
      })
    }
    clip.key.push({
      time: time.value,
      value: e.newScale,
      easing: 0
    })
    currentRuntimeAction.value.clips.push(clip)
    refreshClipList()
    const sel = timeline.getSelectedKeyframeInfos()
    timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
    if (sel && sel.length > 0) timeline.setSelectedKeyframes(sel)
  }
  animator?.updateClip((uuid) => Editor.Instance.getNodeById(uuid))
}


const currentSelect = ref('')

const playSpeed = [0.5, 1, 2, 4, 8]

const FPS = 60
const displayTime = computed(() => `${(time.value || 0).toFixed(2)} / ${(animDuration.value || 0).toFixed(2)} s`)

// 显示当前 time 下的 transform（只读）
const displayPosition = ref<number[]>([0, 0, 0])
// 旋转按欧拉角（度）显示 [x, y, z]
const displayRotation = ref<number[]>([0, 0, 0])
const displayScale = ref<number[]>([1, 1, 1])

const displayPositionStr = computed(() => displayPosition.value.map(n => Number(n).toFixed(2)).join(', '))
// 显示为度，带单位符号
const displayRotationStr = computed(() => displayRotation.value.map(n => `${Number(n).toFixed(2)}`).join(', '))
const displayScaleStr = computed(() => displayScale.value.map(n => Number(n).toFixed(2)).join(', '))

function getDisplayTargetUuid(): string | null {
  // 优先使用当前选中的 keyframe 所属 clip 的对象
  if (currentSelection.value && currentSelection.value.clip && currentSelection.value.clip.objectUuid) {
    return currentSelection.value.clip.objectUuid
  }
  // 否则使用当前动画的第一个 clip 的对象（若存在）
  if (currentRuntimeAction.value && currentRuntimeAction.value.clips && currentRuntimeAction.value.clips.length > 0) {
    const c = currentRuntimeAction.value.clips[0]
    return c.objectUuid || null
  }
  return null
}

function updateCurrentTransforms() {
  const uuid = getDisplayTargetUuid()
  if (!uuid) {
    displayPosition.value = [0, 0, 0]
    displayRotation.value = [0, 0, 0, 1]
    displayScale.value = [1, 1, 1]
    return
  }
  const node = Editor.Instance.getNodeById(uuid) as TransformNode | null
  if (!node) return
  // position
  try {
    if ((node as any).position && typeof (node as any).position.asArray === 'function') {
      displayPosition.value = (node as any).position.asArray().slice(0, 3)
    } else if (node.position) {
      displayPosition.value = [node.position.x, node.position.y, node.position.z]
    }
  } catch (err) {
    // ignore
  }
  // rotation：优先 quaternion，显示为欧拉角（度）
  try {
    const radToDeg = 180 / Math.PI
    if ((node as any).rotationQuaternion && typeof (node as any).rotationQuaternion.asArray === 'function') {
      const q = (node as any).rotationQuaternion.asArray().slice(0, 4)
      const qx = Number(q[0])
      const qy = Number(q[1])
      const qz = Number(q[2])
      const qw = Number(q[3])
      // 转换四元数到欧拉角（roll, pitch, yaw）
      const sinr_cosp = 2 * (qw * qx + qy * qz)
      const cosr_cosp = 1 - 2 * (qx * qx + qy * qy)
      const roll = Math.atan2(sinr_cosp, cosr_cosp)

      const sinp = 2 * (qw * qy - qz * qx)
      let pitch
      if (Math.abs(sinp) >= 1) {
        pitch = Math.sign(sinp) * (Math.PI / 2)
      } else {
        pitch = Math.asin(sinp)
      }

      const siny_cosp = 2 * (qw * qz + qx * qy)
      const cosy_cosp = 1 - 2 * (qy * qy + qz * qz)
      const yaw = Math.atan2(siny_cosp, cosy_cosp)

      displayRotation.value = [roll * radToDeg, pitch * radToDeg, yaw * radToDeg]
    } else if ((node as any).rotation && typeof (node as any).rotation.asArray === 'function') {
      const r = (node as any).rotation.asArray().slice(0, 3)
      displayRotation.value = [Number(r[0]) * radToDeg, Number(r[1]) * radToDeg, Number(r[2]) * radToDeg]
    } else if ((node as any).rotation) {
      displayRotation.value = [node.rotation.x * radToDeg, node.rotation.y * radToDeg, node.rotation.z * radToDeg]
    }
  } catch (err) {
    // ignore
  }
  // scaling
  try {
    if ((node as any).scaling && typeof (node as any).scaling.asArray === 'function') {
      displayScale.value = (node as any).scaling.asArray().slice(0, 3)
    } else if (node.scaling) {
      displayScale.value = [node.scaling.x, node.scaling.y, node.scaling.z]
    }
  } catch (err) {
    // ignore
  }
}

const toStart = () => {
  timeline.toStart()
}
const prev = () => {
  timeline.prev()
}
const next = () => {
  timeline.next()
}
const toEnd = () => {
  timeline.toEnd()
}
const onTimeInput = (v: any) => {
  time.value = isNaN(Number(v)) ? 0 : Number(v)
}
const onSpeedChange = (a: number) => {
  speed.value = isNaN(a) ? 1 : a
}
const onScaleInput = (e: any) => {
  const v = Number(e)
  scale.value = isNaN(v) ? 1 : v
}
const createAnimation = async () => {
  const dbName = await ElMessageBox.prompt('请输入动画名称', '名称', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: '',
  });
  if (!dbName) {
    return
  }
  const ani: CC.Animation = {
    name: dbName.value,
    uuid: ID.generateUUID(),
    clips: [],
  }
  runtimeAnimations.value.push(ani)
  runtimeAnimations.value = [...runtimeAnimations.value]
  Editor.Instance.Scene.runtimeAnimation = toRaw(runtimeAnimations.value)
  Editor.Instance.dispatch('animationChange')
  currentSelect.value = ani.uuid
  onSelectChange(ani.uuid)
}


function refreshClipList() {
  let runtimeAction = currentRuntimeAction.value;
  currentRuntimeAction.value = null;
  currentRuntimeAction.value = runtimeAction;

}
</script>

<style scoped lang="scss">
.animation {
  display: flex;
  height: 100%;

  .animation-controls {
    position: absolute;
    top: 0;
    width: calc(100% - 280px);
    left: 280px;
    z-index: 1;
    height: 32px;
    display: flex;
    align-items: center;
    gap: 20px;
    overflow: hidden;
    background-color: var(--bg-color-2);

    .animation-controls-group {
      display: flex;
      align-items: center;
      padding-left: 10px;
      gap: 2px;

      div {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 2px;

        &:hover {
          background-color: var(--bg-color-4);
        }
      }
    }

    .item {
      display: flex;
      justify-content: center;
      align-items: center;

      .name {
        margin-right: 10px;
      }
    }
  }

  .timeline-container {
    position: relative;
    width: 280px;
    border-right: 1px solid #404040;
    display: flex;
    flex-direction: column;

    .timeline-header {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px;
      border-bottom: 1px solid #404040;

      .animation-item {
        display: flex;
        align-items: center;
        justify-content: center;
      }


    }

    .camera-track {
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 5px;
      padding: 5px;
      border-bottom: 1px solid #404040;

    }

    .clip-list {
      display: flex;
      flex-direction: column;

      .clip-item {
        height: 28px;
        line-height: 28px;
        padding: 0 5px;
        border-bottom: 2px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 5px;

        .clip-name {
          flex: 1;
          margin-left: 5px;
        }

        .clip-key {
          margin-left: auto;
          background-color: var(--bg-color-2);
          height: 20px;
          padding: 0 5px;
          line-height: 20px;
          border-radius: 2px;
        }
      }
    }
  }

  .canvas-container {
    flex: 1;
    height: calc(100% - 32px);
    width: 0;
    overflow-y: hidden;
    top: 32px;
  }

  .right {
    width: 300px;
    border-left: 1px solid #404040;
    position: relative;
    background-color: var(--c1);
    padding: 12px;
    overflow-y: auto;
    height: calc(100% - 32px);
    top: 32px;

    .panel-header {
      .title {
        font-weight: 700;
        margin-bottom: 8px;
        font-size: 13px;
        padding: 6px 8px;
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), transparent);
        border-radius: 4px;
        border-left: 3px solid var(--accent-color, #4ea1ff);
      }
    }

    /* 更紧凑的动画信息样式 */
    .panel-body>.field {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .field {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;

      .label {
        width: 60px;
        color: var(--text-color);
      }

      .readonly {
        .el-input__inner {
          background-color: transparent;
          color: var(--text-color-muted);
          border-color: transparent;
          cursor: default;
        }
      }
    }

    /* 关键帧信息标题更醒目 */
    .keyframe-info {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.03);

      .title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 10px;
        color: var(--text-color);
      }
    }

    .empty {
      color: var(--text-color-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
  }
}
</style>
