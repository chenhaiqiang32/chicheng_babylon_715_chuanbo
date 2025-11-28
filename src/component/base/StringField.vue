<template>
  <Field :title="label" :tooltip="tooltip">
    <el-input size="small" v-if="!multiline" v-model="value" class="editor-string-field__input" @input="onInput"
      @keyup.enter.native="onEnter" @blur="onBlur" />
    <el-input size="small" v-else type="textarea" v-model="value" class="editor-string-field__input" @input="onInput"
      @blur="onBlur" />
  </Field>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import Field from "@/component/common/Field.vue"
import { InfoFilled } from "@element-plus/icons-vue"
import { registerSimpleUndoRedo, onUndoObservable, onRedoObservable } from "../../tools/undoredo"
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

function syncFromObject() {
  const v = props.object ? getInspectorPropertyValue(props.object, props.property) ?? '' : ''
  value.value = v
  oldValue.value = v
}

watch(
  () => [props.object, props.property],
  () => {
    syncFromObject()
  },
  { immediate: true }
)

let undoObserver: any = null
let redoObserver: any = null

onMounted(() => {
  undoObserver = onUndoObservable.add(() => syncFromObject())
  redoObserver = onRedoObservable.add(() => syncFromObject())
})

onUnmounted(() => {
  if (undoObserver) onUndoObservable.remove(undoObserver)
  if (redoObserver) onRedoObservable.remove(redoObserver)
})

const onInput = (newValue: string) => {
  if (newValue !== value.value) {
    const oldVal = value.value
    value.value = newValue
    setInspectorEffectivePropertyValue(props.object, props.property, newValue)

    if (!props.noUndoRedo) {
      registerSimpleUndoRedo({
        object: props.object,
        property: props.property,
        oldValue: oldVal,
        newValue: newValue
      })
    }

    emit("change", newValue)
  }
}

const onEnter = () => {
  (document.activeElement as HTMLElement)?.blur()
}

const onBlur = () => {
  const newValue = value.value
  if (newValue !== oldValue.value && !props.noUndoRedo) {
    registerSimpleUndoRedo({ object: props.object, property: props.property, oldValue: oldValue.value, newValue })
    oldValue.value = newValue
  }
}
</script>
<style scoped lang="scss">
.el-input {
  width: 100%;
}
</style>
