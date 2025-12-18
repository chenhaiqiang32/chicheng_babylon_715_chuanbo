<template>
  <Field :title="$t('component.material.transparencyMode')" :tooltip="tooltip">
    <el-select v-model="value" @change="ChangeTransparencyMode(value)" :placeholder="$t('component.material.default')">
      <el-option :label="$t('component.material.default')" :value="null" />
      <el-option :label="$t('component.material.opaque')" :value="Material.MATERIAL_OPAQUE" />
      <el-option :label="$t('component.material.alphaTest')" :value="Material.MATERIAL_ALPHATEST" />
      <el-option :label="$t('component.material.alphaBlend')" :value="Material.MATERIAL_ALPHABLEND" />
      <el-option :label="$t('component.material.alphaTestandBlend')" :value="Material.MATERIAL_ALPHATESTANDBLEND" />
    </el-select>
  </Field>
</template>

<script setup lang="ts">
import { Material } from "@babylonjs/core";
import { ref, watch } from "vue";
import { getObjectValue, setObjectValue } from "@/tools/property"
import { registerUndoRedo, registerPropertyUndoRedo } from "@/tools/undoredo";
import Field from "../common/Field.vue";
const props = defineProps<{
  object: any;
  property: string;
  label?: string;
  tooltip?: string;
  noUndoRedo?: boolean
}>()
const value = ref(props.object[props.property] ?? null)
const oldValue = ref(props.object[props.property] ?? null)

watch(() => props.object, (newValue) => {
  if (newValue !== value.value) {
    syncFromObject()
  }
})

const emit = defineEmits(['change'])


function syncFromObject() {
  const v = getObjectValue(props.object, props.property) ?? 0
  value.value = v
  oldValue.value = v
}
const ChangeTransparencyMode = (changedValue: number) => {

  oldValue.value = getObjectValue(props.object, props.property)
  value.value = changedValue
  const newValue = value.value
  setObjectValue(props.object, props.property, value.value)
  if (newValue !== oldValue.value && !props.noUndoRedo) {
    registerPropertyUndoRedo({
      object: props.object,
      property: props.property,
      oldValue: oldValue.value,
      newValue,
      executeRedo: true,
      action: () => {
        syncFromObject()
        emit('change')
      }
    })
    oldValue.value = newValue
  }
}

</script>