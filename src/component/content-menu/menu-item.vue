<template>
  <div v-if="e.subCommand" class="command-item has-children" :class="{ disable: e.disable }">
    <div>{{ e.name }}</div>
    <div class="sub-children" ref="dom">
      <MenuItem :index="index + 1" v-for="c in e.subCommand" :e="c">
      </MenuItem>
    </div>
  </div>
  <div v-else @click="e.callback?.()" class="command-item" :class="{ disable: e.disable }">{{ e.name }}</div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { ref } from 'vue';

const props = defineProps<{
  e: ContextMenuItem;
  index: number;
}>();

const dom = ref<HTMLDivElement>();
const transform = ref('translateX(100%)');
let resizeObserver: ResizeObserver;
onMounted(() => {
  if (dom.value) {
    resizeObserver = new ResizeObserver(() => {
      const rect = dom.value?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      transform.value = 'translateX(100%)';
      if (rect.right > window.innerWidth) {
        // transform.value += `translateX(-${(props.index + 2) * 120}px)`;
        transform.value += `translateX(-${(props.index + 2) * 115}px)`;
      }
      if (rect.bottom > window.innerHeight) {
        let height = rect.bottom - window.innerHeight;
        transform.value += `translateY(-${height}px)`;
      }
    });
    resizeObserver.observe(dom.value);
  }
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style lang="scss" scoped>
.command-item {


  min-width: 110px;
  height: 30px;
  padding: 0 15px;
  border-radius: 2px;
  line-height: 30px;
  text-align: left;
  position: relative;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: hidden;

  &>div {
    font-size: 14px;
  }

  .sub-children {
    display: none;
    overflow: visible !important;
    border-bottom: none;
    padding: 6px;
    border-radius: 5px;
    border: 1px solid var(--bg-color-2);
    background: var(--bg-color-1);
    position: absolute;
    top: -1px;
    right: 0;
    transform: v-bind(transform);
    overflow: auto;
  }

  &>.sub-children {
    border: 1px solid var(--bg-color-2);
  }

  transition: background-color 0.1s ease-in-out;

  &:hover {
    background-color: var(--bg-color-4);

    &>.sub-children {
      display: unset;
    }
  }

  &:active {
    background-color: var(--bg-color-4);
    color: var(--color-text-1);
  }
}

.disable {
  opacity: 0.35;
  pointer-events: none;
}

.has-children {
  &::before {
    content: '';
    width: 16px;
    height: 16px;
    position: absolute;
    right: 2px;
    top: 8px;
    background: url(@/assets/img/arrow.svg) no-repeat center;
  }
}
</style>
