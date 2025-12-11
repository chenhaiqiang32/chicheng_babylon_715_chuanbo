<template>
  <div class="animation">
    <div class="timeline-container">
      <div class="timeline-header">
        <ElSelect v-model="animation" style=" flex: 1;">
          <ElOption disabled value="">{{ $t('animation.select') }}</ElOption>
        </ElSelect>
        <ElButton size="small" @click="newAnimation">{{ $t('animation.new') }}</ElButton>
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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Timeline } from "@/timeLine/Timeline";
import SVG from '@/component/common/SVG.vue';

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
  }

  .canvas-container {
    flex: 1;
    width: 0;
    overflow: auto;
    top: 32px;
  }
}
</style>
