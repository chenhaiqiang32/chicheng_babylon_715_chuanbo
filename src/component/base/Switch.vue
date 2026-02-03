<template>
  <Field :title="label" v-if="label">
    <el-switch style="margin-left: auto;" v-model="value" @change="change" :disabled="disabled" />
  </Field>
  <el-switch @click.stop v-else style="margin-left: auto; height: auto;" v-model="value" @change="change" :disabled="disabled" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { registerPropertyUndoRedo } from "../../tools/undoredo"
import { getObjectValue } from "../../tools/property"
import Field from "../common/Field.vue";
import { _EventBus } from "@/utils/dispatch";
const props = defineProps<{
  object: any;
  property: string;
  label?: any;
  noUndoRedo?: boolean;
  disabled?: boolean;
}>()
const emit = defineEmits<{
  (e: "change", newV: boolean, oldV: boolean): void
}>()

const value = ref<boolean>()
let oldValue = false;

onMounted(() => {
  _EventBus.on('onBooleanChanged', onBooleanChangeEvent)
})

function onBooleanChangeEvent(data: {
  key: string;
  object: any;
}) {
  if (props.object == data.object && props.property == data.key) {
    getValue()
  }
}

onUnmounted(() => {
  _EventBus.off('onBooleanChanged', onBooleanChangeEvent)
})


watch(
  () => props.object,
  (newVal) => {
    getValue()
  },
  { immediate: true, }
)

function getValue() {
  value.value = getObjectValue(props.object, props.property) ?? false
  oldValue = value.value;
}

const change = () => {
  if (props.disabled) {
    // 如果禁用，恢复原值
    value.value = oldValue;
    return;
  }
  
  const _newValue = value.value;
  const _oldValue = oldValue;

  registerPropertyUndoRedo({
    object: props.object,
    property: props.property,
    oldValue: _oldValue,
    newValue: _newValue,
    executeRedo: true,
    action: () => {
      _EventBus.dispatch('onBooleanChanged', { key: props.property, object: props.object })
    }
  })
  emit("change", _newValue, _oldValue);
}

</script>

<style scoped>
.inspector-switch {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 0 8px;
  cursor: pointer;
  border-radius: 8px;
  transition: all .3s;
}

.inspector-switch:hover {
  background: rgba(255, 255, 255, 0.1);
  padding-left: 8px;
  padding-right: 8px;
}

.inspector-switch__label {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--title--color);
}

.inspector-switch__control {
  display: flex;
  justify-content: flex-end;
  width: 56px;
}
</style>