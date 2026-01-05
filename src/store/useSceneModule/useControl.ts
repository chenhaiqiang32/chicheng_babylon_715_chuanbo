import { ref } from "vue";
import { ViewFlagsMode } from "../useScene";

// 模型控制模式
export enum ControlMode {
  Select = 'Select',
  Move = 'Move',
  Rotate = 'Rotate',
  Scale = 'Scale',
}

export function useControlModule() {
  const currentControlMode = ref<ControlMode>();
  const currentViewFlagsMode = ref<ViewFlagsMode>();

  function setCurrentControlMode(mode: ControlMode) {
    currentControlMode.value = mode;
  }

  function setCurrentViewFlagsMode(...flags: ViewFlagsMode[]) {
    currentViewFlagsMode.value = 0;
    for (const flag of flags) {
      currentViewFlagsMode.value |= flag;
    }
  }

  return {
    // state
    currentControlMode,
    currentViewFlagsMode,

    // function
    setCurrentControlMode,
    setCurrentViewFlagsMode,
  }
}