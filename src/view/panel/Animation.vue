<template>
  <div class="animation">
    <div class="timeline-container">
      <div class="timeline-header">
        <ElSelect v-model="currentSelect" style=" flex: 1;" @change="onSelectChange">
          <ElOption v-for="item in runtimeAnimations" :key="item.uuid" :label="item.name" :value="item.uuid"></ElOption>
        </ElSelect>
        <ElButton size="small" @click="createAnimation">{{ $t('animation.new') }}</ElButton>
      </div>
      <div class="clip-list">
        <div v-for="item in currentRuntimeAction?.clips" :key="item.uuid" class="clip-item">
          <div class="clip-name">{{ item.name.split('_')[0] }}</div>
          <div class="clip-key">{{ $t('animation.' + item.property) }}</div>
        </div>
      </div>
    </div>
    <div ref="domRef" class="canvas-container"></div>
    <div class="animation-controls">
      <div class="animation-controls-group">
        <div>
          <SVG name="end" @click="toStart" size="22px"></SVG>
        </div>
        <div>
          <SVG name="next" @click="prev" size="22px"></SVG>
        </div>
        <div>
          <SVG v-if="playing" @click="playing = false" name="play" size="30px"></SVG>
          <SVG v-else @click="playing = true" name="pause" size="30px"></SVG>
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
        <ElInput size="small" type="number" style="width:60px" v-model="time" @change="onTimeInput">
          <template #suffix>
            <span>s</span>
          </template>
        </ElInput>
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
import { ref, onMounted, onBeforeUnmount, watch, shallowRef, onUnmounted, toRaw } from 'vue'
import { Timeline } from "@/timeLine/Timeline";
import SVG from '@/component/common/SVG.vue';
import { TransformNode, Vector3 } from '@babylonjs/core';
import { ID } from '@/utils/id';
import { ElMessageBox } from 'element-plus';
import { Editor } from '@/3d/Editor';
import { Quaternion } from '@babylonjs/core';
import { CC } from '@/3d/assets/BaseRes';

const domRef = ref<HTMLDivElement | null>(null)

const playing = ref(false)
const width = ref(0)
const scale = ref(1)
const speed = ref(1)
const time = ref(0)



const runtimeAnimations = shallowRef<CC.Animation[]>([])
let currentRuntimeAction = shallowRef<CC.Animation>(null)
function onSelectChange(uuid: string) {
  currentRuntimeAction.value = runtimeAnimations.value.find(item => item.uuid == uuid) || null
  if (!currentRuntimeAction.value) {
    return
  }
  timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
}



watch(speed, (val) => {
  timeline.speed = val
})

watch(time, (val) => {
  if (timeline && timeline?.time != val) {
    timeline.time = val
  }
})

watch(scale, (val) => {
  timeline.scale = val
})

watch(playing, (val) => {
  if (val) {
    timeline.play()
  } else {
    timeline.pause()
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
      timeline.setTimeChanged((t: number) => {
        time.value = t
      })
    })
    resizeObserver.observe(domRef.value)
  }
  Editor.Instance.on('onPositionChanged', onPositionChanged)
  Editor.Instance.on('onPositionStartChanged', onPositionStartChanged)
  Editor.Instance.on('onRotationStartChanged', onRotationStartChanged)
  Editor.Instance.on('onScaleStartChanged', onScaleStartChanged)
  Editor.Instance.on('onRotationChanged', onRotationChanged)
  Editor.Instance.on('onScaleChanged', onScaleChanged)
  Editor.Instance.on('onSceneChanged', onSceneChange)
  onSceneChange()
});


onBeforeUnmount(() => {
  if (resizeObserver && domRef.value) {
    resizeObserver.unobserve(domRef.value)
    resizeObserver.disconnect()
  }
  timeline.dispose()
  Editor.Instance.off('onPositionChanged', onPositionChanged)
  Editor.Instance.off('onPositionStartChanged', onPositionStartChanged)
  Editor.Instance.off('onRotationChanged', onRotationChanged)
  Editor.Instance.off('onRotationStartChanged', onRotationStartChanged)
  Editor.Instance.off('onScaleChanged', onScaleChanged)
  Editor.Instance.off('onScaleStartChanged', onScaleStartChanged)
  Editor.Instance.off('onSceneChanged', onSceneChange)
})

function onSceneChange() {
  if (!Editor.Instance.Scene) {
    return
  }
  if (!Editor.Instance.Scene?.runtimeAnimation) {
    Editor.Instance.Scene.runtimeAnimation = []
  }
  runtimeAnimations.value = Editor.Instance.Scene.runtimeAnimation;
}
let lastPosition: Vector3;
let lastRotationQuaternion: Quaternion;
let lastScale: Vector3;



function onPositionStartChanged(e: { object: TransformNode }) {
  lastPosition = e.object.position.clone()
}


function onRotationStartChanged(e: { object: TransformNode }) {
  lastRotationQuaternion = e.object.rotationQuaternion.clone()
}

function onScaleStartChanged(e: { object: TransformNode }) {
  lastScale = e.object.scaling.clone()
}

function onPositionChanged(e: { object: TransformNode }) {
  if (!e.object.uuid) {
    e.object.uuid = ID.generateUUID()
  }
  if (currentRuntimeAction.value) {
    const clip = currentRuntimeAction.value.clips.find(x => x.objectUuid == e.object.uuid && x.property == 'position');
    if (clip) {
      const key = clip.key.find(x => x.time == time.value)
      if (key) {
        key.value = e.object.position.asArray()
      } else {
        clip.key.push({
          time: time.value,
          value: e.object.position.asArray()
        })
        clip.key.sort((a, b) => a.time - b.time)
      }
    } else {
      const clip: CC.Clip = {
        name: e.object.name + '_position',
        uuid: ID.generateUUID(),
        objectUuid: e.object.uuid,
        property: 'position',
        type: 'v3',
        key: [],
      }
      if (time.value != 0) {
        clip.key.push({
          time: 0,
          value: lastPosition.asArray()
        })
      }
      clip.key.push({
        time: time.value,
        value: e.object.position.asArray()
      })
      currentRuntimeAction.value.clips.push(clip)
      refreshClipList()

    }
  }
  timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))

}
function onRotationChanged(e: { object: TransformNode }) {
  if (!e.object.uuid) {
    e.object.uuid = ID.generateUUID()
  }
  if (currentRuntimeAction) {
    const clip = currentRuntimeAction.value.clips.find(x => x.objectUuid == e.object.uuid && x.property == 'rotationQuaternion');
    if (clip) {
      const key = clip.key.find(x => x.time == time.value)
      if (key) {
        key.value = e.object.rotationQuaternion.asArray()
      } else {
        clip.key.push({
          time: time.value,
          value: e.object.rotationQuaternion.asArray()
        })
        clip.key.sort((a, b) => a.time - b.time)
      }
    } else {
      const clip: CC.Clip = {
        name: e.object.name + '_rotationQuaternion',
        uuid: ID.generateUUID(),
        objectUuid: e.object.uuid,
        property: 'rotationQuaternion',
        type: 'quaternion',
        key: [],
      }
      if (time.value != 0) {
        clip.key.push({
          time: 0,
          value: lastRotationQuaternion.asArray()
        })
      }
      clip.key.push({
        time: time.value,
        value: e.object.rotationQuaternion.asArray()
      })
      currentRuntimeAction.value.clips.push(clip)
      refreshClipList()
    }
  }
  timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))

}
function onScaleChanged(e: { object: TransformNode }) {
  if (!e.object.uuid) {
    e.object.uuid = ID.generateUUID()
  }
  if (currentRuntimeAction) {
    const clip = currentRuntimeAction.value.clips.find(x => x.objectUuid == e.object.uuid && x.property == 'scaling');
    if (clip) {
      const key = clip.key.find(x => x.time == time.value)
      if (key) {
        key.value = e.object.scaling.asArray()
      } else {
        clip.key.push({
          time: time.value,
          value: e.object.scaling.asArray()
        })
        clip.key.sort((a, b) => a.time - b.time)
      }
    } else {
      const clip: CC.Clip = {
        name: e.object.name + '_scale',
        uuid: ID.generateUUID(),
        objectUuid: e.object.uuid,
        property: 'scaling',
        type: 'v3',
        key: [],
      }
      if (time.value != 0) {
        clip.key.push({
          time: 0,
          value: lastPosition.asArray()
        })
      }
      clip.key.push({
        time: time.value,
        value: e.object.scaling.asArray()
      })
      currentRuntimeAction.value.clips.push(clip)
      refreshClipList()
    }
    timeline.setKeyframes(currentRuntimeAction.value.clips.map(x => x.key))
  }
}


const currentSelect = ref('')

const playSpeed = [0.5, 1, 2, 4, 8]

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
const onTimeInput = (v: string) => {
  time.value = isNaN(Number(v)) ? 0 : Number(v)
}
const onSpeedChange = (e: Event) => {
  const v = Number((e.target as HTMLSelectElement).value)
  speed.value = isNaN(v) ? 1 : v
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
  runtimeAnimations.value.push({
    name: dbName.value,
    uuid: ID.generateUUID(),
    clips: []
  })
  runtimeAnimations.value = [...runtimeAnimations.value]
  Editor.Instance.Scene.runtimeAnimation = toRaw(runtimeAnimations.value)
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

    .timeline-header {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px;
      border-bottom: 1px solid #404040;
    }

    .clip-list {
      margin-top: 64px;
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
    overflow: auto;
    top: 32px;
  }
}
</style>
