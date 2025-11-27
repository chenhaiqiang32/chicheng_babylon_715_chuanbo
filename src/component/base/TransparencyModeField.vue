<template>
      <Number :object="object" property="transparencyMode" :min="0" :max="3" :step="1" />
  <!-- <SectionField title="Transparency Mode">
    <Number :object="object" property="transparencyMode" :min="0" :max="3" :step="1" />
  </SectionField> -->
</template>

<script setup lang="ts">
import SectionField from "@/component/base/SectionField.vue"
import Number from "@/component/base/Number.vue"
const props = defineProps<{ object: any }>()
</script>