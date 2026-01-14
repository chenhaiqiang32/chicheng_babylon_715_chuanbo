<template>
  <span class="svg-icon" :style="{ width: size, height: size }">
    <svg aria-hidden="true" :width="size" :height="size" :style="{ color: color }" fill="currentColor">
      <use :xlink:href="symbolId" />
    </svg>
  </span>

</template>
s
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  name: string,
  color?: string,
  size?: string,
}>();

const color = computed(() => props.color);
const size = computed(() => props.size ?? '16px');
const symbolId = computed(() => `#icon-${props.name}`);
</script>
<style lang="scss" scoped>
.svg-icon {
  display: inline-block;
  cursor: pointer;
  fill: currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
