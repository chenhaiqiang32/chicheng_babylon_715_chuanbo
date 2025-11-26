<template>
  <SectionField title="Tri-Planar Material">
    <StringField label="Name" :object="material" property="name" />
  </SectionField>
</template>

<script setup lang="ts">
import SectionField from "@/component/base/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
const props = defineProps<{ mesh?: any; material: any; editor: any }>()
</script>