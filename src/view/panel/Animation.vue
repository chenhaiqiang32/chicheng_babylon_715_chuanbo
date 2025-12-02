<template>
  <div class="animation">
    <div class="timeline-container">
      <div class="timeline-header">
        <select class="flex-1" v-model="animation">
          <option disabled value="">{{ $t('component.animation.selectAnimation') }}</option>
          <!-- <option value="jack">Jack</option>
          <option value="lucy">Lucy</option>
          <option value="tom">Tom</option> -->
        </select>
        <button @click="newAnimation">{{ $t('component.animation.newAnimation') }}</button>
      </div>
    </div>
    <div ref="domRef" class="canvas-container"></div>
    <div class="animation-controls">
      <div class="animation-controls-group">
        <button @click="toStart">⏮</button>
        <button @click="prev">◀</button>
        <button v-if="playing" @click="playing = false">⏸</button>
        <button v-else @click="playing = true">▶</button>
        <button @click="next">⏭</button>
        <button @click="toEnd">⏭</button>
      </div>
      <div>
        <label v-if="width > 800" class="mr-1.5">时间</label>
        <input type="number" step="0.1" style="width:60px" :value="time" @input="onTimeInput" />
        <span>s</span>
      </div>
      <div>
        <label v-if="width > 800" class="mr-1.5">播放速度</label>
        <select :value="speed" @change="onSpeedChange" style="width:60px">
          <option v-for="opt in playSpeed" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
      <div class="flex items-center mr-10">
        <label v-if="width > 800" class="mr-1.5">缩放</label>
        <input type="range" min="0.5" max="5" step="0.1" style="width:80px" :value="scale" @input="onScaleInput" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Timeline } from "@/timeLine/Timeline";

const domRef = ref<HTMLDivElement | null>(null)

const playing = ref(false)
const width = ref(0)
const scale = ref(1)
const speed = ref(1)
const time = ref(0)

watch(speed, (val) => {
  Timeline.Instance.speed = val
})

watch(time, (val) => {
  if (Timeline.Instance && Timeline.Instance?.time != val) {
    Timeline.Instance.time = val
  }
})

watch(scale, (val) => {
  Timeline.Instance.scale = val
})

watch(playing, (val) => {
  if (val) {
    Timeline.Instance.play()
  } else {
    Timeline.Instance.pause()
  }
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    width.value = entries[0].contentRect.width
  })
  if (domRef.value) {
    Timeline.Instance.init({ maxTime: 60 * 10 }, domRef.value).then(() => {
      Timeline.Instance.setTimeChanged((t: number) => {
        time.value = t
      })
    })
    resizeObserver.observe(domRef.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver && domRef.value) {
    resizeObserver.unobserve(domRef.value)
    resizeObserver.disconnect()
  }
  Timeline.Instance.dispose()
})

const animation = ref('')

const playSpeed = [0.5, 1, 2, 4, 8]

const toStart = () => {
  Timeline.Instance.toStart()
}
const prev = () => {
  Timeline.Instance.prev()
}
const next = () => {
  Timeline.Instance.next()
}
const toEnd = () => {
  Timeline.Instance.toEnd()
}

const onTimeInput = (e: Event) => {
  const v = Number((e.target as HTMLInputElement).value)
  time.value = isNaN(v) ? 0 : v
}
const onSpeedChange = (e: Event) => {
  const v = Number((e.target as HTMLSelectElement).value)
  speed.value = isNaN(v) ? 1 : v
}
const onScaleInput = (e: Event) => {
  const v = Number((e.target as HTMLInputElement).value)
  scale.value = isNaN(v) ? 1 : v
}

const newAnimation = () => {

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
    gap: 10px;
    overflow: hidden;

    .animation-controls-group {
      display: flex;
      align-items: center;
      gap: 2px;
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
  }

  .canvas-container {
    flex: 1;
    width: 0;
    overflow: auto;
    top: 32px;
  }
}
</style>
