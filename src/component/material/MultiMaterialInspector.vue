<template>
  <SectionField title="Multi Material">
    <StringField label="Name" :object="material" property="name" />
  </SectionField>
</template>

<script setup lang="ts">
import SectionField from "@/component/base/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
const props = defineProps<{ material: any; editor: any }>()
</script>