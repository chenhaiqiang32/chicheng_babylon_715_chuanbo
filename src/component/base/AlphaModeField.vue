<template>
  <Field :title="$t('component.material.alphaMode')" :tooltip="tooltip">
    <el-select v-model="value" @change="ChangeTransparencyMode(value)">
      <el-option :label="$t('component.material.alphaModeDisable')" :value="Constants.ALPHA_DISABLE" />
      <el-option :label="$t('component.material.alphaModeAdd')" :value="Constants.ALPHA_ADD" />
      <el-option :label="$t('component.material.alphaModeCombine')" :value="Constants.ALPHA_COMBINE" />
      <el-option :label="$t('component.material.alphaModeSubtract')" :value="Constants.ALPHA_SUBTRACT" />
      <el-option :label="$t('component.material.alphaModeMultiply')" :value="Constants.ALPHA_MULTIPLY" />
      <el-option :label="$t('component.material.alphaModeONEONE')" :value="Constants.ALPHA_ONEONE" />
      <el-option :label="$t('component.material.alphaModePREMULTIPLIED')" :value="Constants.ALPHA_PREMULTIPLIED" />
      <el-option :label="$t('component.material.alphaModePORTERDUFF')"
        :value="Constants.ALPHA_PREMULTIPLIED_PORTERDUFF" />
      <el-option :label="$t('component.material.alphaModeINTERPOLATE')" :value="Constants.ALPHA_INTERPOLATE" />
      <el-option :label="$t('component.material.alphaModSCREENMODE')" :value="Constants.ALPHA_SCREENMODE" />
    </el-select>
  </Field>
</template>

<script setup lang="ts">
import { Constants } from "@babylonjs/core";
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
