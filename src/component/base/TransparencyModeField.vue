<template>
  <Field :title="$t('component.material.transparencyMode')" :tooltip="tooltip">
    <el-select v-model="value" @change="ChangeTransparencyMode(value)">
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
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "@/tools/property"
import { registerUndoRedo, registerSimpleUndoRedo } from "@/tools/undoredo";
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
function syncFromObject() {
  const v = getInspectorPropertyValue(props.object, props.property) ?? 0
  value.value = v
  oldValue.value = v
}
const ChangeTransparencyMode = (changedValue: number) => {

  oldValue.value = getInspectorPropertyValue(props.object, props.property)
  value.value = changedValue
  const newValue = value.value
  setInspectorEffectivePropertyValue(props.object, props.property, value.value)
  if (newValue !== oldValue.value && !props.noUndoRedo) {
    registerSimpleUndoRedo({
      object: props.object, property: props.property, oldValue: oldValue.value, newValue, executeRedo: true, action: () => {
        syncFromObject()
      }
    })
    oldValue.value = newValue
  }
}

</script>