<template>
  <div class="editor-string-field">
    <div class="editor-string-field__label">
      <slot name="label">{{ props.label }}</slot>
      <el-tooltip v-if="tooltip" :content="tooltip" placement="top">
        <el-icon>
          <InfoFilled />
        </el-icon>
      </el-tooltip>
    </div>

    <el-input v-if="!multiline" v-model="value" class="editor-string-field__input" @input="onInput"
      @keyup.enter.native="onEnter" @blur="onBlur" />

    <el-input v-else type="textarea" v-model="value" class="editor-string-field__input" @input="onInput"
      @blur="onBlur" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { InfoFilled } from "@element-plus/icons-vue"
import { registerSimpleUndoRedo } from "../../tools/undoredo"
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../tools/property"
const props = defineProps<{
  object: any;
  property: string;
  label?: string;
  tooltip?: string;
  multiline?: boolean;
  noUndoRedo?: boolean
}>()
const emit = defineEmits<{ (e: "change", value: string): void }>()
const value = ref<string>(getInspectorPropertyValue(props.object, props.property) ?? "")
const oldValue = ref<string>(getInspectorPropertyValue(props.object, props.property) ?? "")

watch(() => [props.object, props.property], () => {
  value.value = getInspectorPropertyValue(props.object, props.property) ?? ""
  oldValue.value = getInspectorPropertyValue(props.object, props.property) ?? ""
}, { immediate: true })

const onInput = (newValue: string) => {
  value.value = newValue
  setInspectorEffectivePropertyValue(props.object, props.property, newValue)
  emit("change", newValue)
}

const onEnter = () => {
  ; (document.activeElement as HTMLElement)?.blur()
}

const onBlur = () => {
  const newValue = value.value
  if (newValue !== oldValue.value && !props.noUndoRedo) {
    registerSimpleUndoRedo({ object: props.object, property: props.property, oldValue: oldValue.value, newValue })
    oldValue.value = newValue
  }
}
</script>
<style scoped>
.editor-string-field {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
}

.editor-string-field__label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 33.333%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--title--color);
}

.editor-string-field__input {
  width: 66.666%;
}

:deep(.el-input__wrapper) {
  background-color: var(--input-color);
  border-radius: 8px;
}

:deep(.el-input__inner) {
  color: var(--input-color-1);
}

:deep(.el-textarea__inner) {
  background: var(--input-color);
  color: var(--input-color);
  border-radius: 8px;
}
</style>