<template>
  <SectionField :title="title">
    <template #right>
      <!-- <ElButton type="primary" size="small" @click="onRemove">删除</ElButton> -->
      <el-tooltip class="box-item" effect="dark" content="删除" placement="top-start">
        <Minus @click="onRemove" style="width: 15px; height: 15px; margin-right: 8px" tooltip="删除" />
      </el-tooltip>

    </template>
    <div class="flex gap-2 w-full">
      <div v-if="typeof gradient['factor1'] === 'number'" class="flex-1">
        <Number :object="gradient" property="factor1" :step="0.01" />
        <Number :object="gradient" property="factor2" :step="0.01" />
      </div>

      <div v-if="gradient['color1']" class="flex-1">
        <Color :object="gradient" property="color1" label="Color 1" />
        <Color :object="gradient" property="color2" label="Color 2" />
      </div>

      <!-- <Button variant="ghost" @click="onRemove">
        <HiOutlineTrash class="w-5 h-5" />
      </Button> -->
    </div>

    <div class="Slider">
      <Slider :label="'Gradient'" :object="gradient" property="gradient" :min="0" :max="1" :step="0.01"
        :value="[localGradient]" @valuechange="handleValueChange" />
    </div>
  </SectionField>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IValueGradient } from '@babylonjs/core';
import { registerUndoRedo } from '@/tools/undoredo';
import Color from '@/component/base/Color4.vue';
import Block from '@/component/common/Block.vue';
import Slider from '@/component/base/Slider.vue';
import SectionField from '@/component/common/SectionField.vue';
import { Minus, Plus } from '@element-plus/icons-vue';
interface IValueGradientExtended extends IValueGradient {
  factor1?: number;
  factor2?: number;
  color1?: string;
  color2?: string;
}
interface IGradientFieldProps {
  title?: string;
  gradient: IValueGradientExtended;
  onRemove: () => void;
}

const props = defineProps<IGradientFieldProps>();

const localGradient = ref(props.gradient.gradient);
const oldGradient = ref(props.gradient.gradient);
const pointerOver = ref(false);

const setPointerOver = (value: boolean) => {
  pointerOver.value = value;
};

const handleValueChange = (value: number[]) => {
  const newGradient = value[0];
  if (newGradient !== oldGradient.value) {
    props.gradient.gradient = newGradient;

    // registerSimpleUndoRedo({
    //   object: props.gradient,
    //   property: 'gradient',
    //   oldValue: oldGradient.value,
    //   newValue: newGradient,
    // });

    localGradient.value = newGradient;
    oldGradient.value = newGradient;
  }
};
</script>
