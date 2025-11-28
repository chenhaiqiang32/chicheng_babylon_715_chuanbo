<template>
  <Number :object="object" property="alphaMode" :min="0" :max="10" :step="1" />
  <!-- <SectionField title="Alpha Mode">
    <Number :object="object" property="alphaMode" :min="0" :max="10" :step="1" />
  </SectionField> -->
</template>

<script setup lang="ts">
import SectionField from "@/component/common/SectionField.vue"
import Number from "@/component/base/Number.vue"
const props = defineProps<{ object: any }>()
</script>