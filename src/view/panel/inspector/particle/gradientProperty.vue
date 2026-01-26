<template>
  <SectionField :title=title>
    <template #right>
      <div class="RightContent" @click.stop>
        <ElButton type="primary" size="small" @click="handleAddGradient">添加</ElButton>
        <Switch :object="o" property="value" @change="handleUseChange" />

      </div>

    </template>
    <template v-if="!o.value">
      <slot />
    </template>

    <div v-if="o.value" class="ww">
      <GradientField v-for="(gradient, index) in props.getGradients()" :key="index" :gradient="gradient"
        :title=index.toString() @remove="() => handleRemoveGradient(gradient)" />

      <!-- <Button variant="ghost" @click="handleAddGradient" class="33">
        <Plus />
      </Button> -->
    </div>
  </SectionField>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { ParticleSystem, IValueGradient, FactorGradient, ColorGradient, Color3Gradient, IParticleSystem } from "@babylonjs/core";
import { registerUndoRedo } from "../../../../tools/undoredo";
import GradientField from "./gradient.vue";
import Block from "@/component/common/Block.vue";
import Switch from "@/component/base/Switch.vue";
import Field from "@/component/common/Field.vue";
import SectionField from "@/component/common/SectionField.vue";
import { Plus } from "@element-plus/icons-vue";

export interface IParticleSystemGradientInspectorProps {
  title?: string;
  label: string;
  object: IParticleSystem;

  getGradients: () => IValueGradient[] | null;
  createGradient: () => void;
  addGradient: (gradient: number, value1: any, value2?: any) => void;
  removeGradient: (gradient: number) => void;

  onUpdate: () => void;
}

const props = defineProps<IParticleSystemGradientInspectorProps>();

const o = reactive({
  value: !!props.getGradients()?.length,
});

function handleUseChange(value: boolean) {
  const oldGradients = props.getGradients()?.slice();
  if (value) {
    props.createGradient();
  } else {
    const gradients = props.getGradients();
    gradients?.slice().forEach((g) => {
      props.removeGradient(g.gradient);
    });
  }
  o.value = value;
  props.onUpdate();
  // registerUndoRedo({
  //   executeRedo: true,
  //   undo: () => {
  //     if (value) {
  //       const gradients = props.getGradients();
  //       gradients?.slice().forEach((g) => {
  //         props.removeGradient(g.gradient);
  //       });
  //     } else {
  //       oldGradients?.forEach((g) => {
  //         if (g instanceof FactorGradient) {
  //           return props.addGradient(g.gradient, g.factor1, g.factor2);
  //         }

  //         if (g instanceof ColorGradient) {
  //           return props.addGradient(g.gradient, g.color1, g.color2);
  //         }

  //         if (g instanceof Color3Gradient) {
  //           return props.addGradient(g.gradient, g.color);
  //         }
  //       });
  //     }
  //     o.value = !value;
  //     props.onUpdate();
  //   },
  //   redo: () => {
  //     if (value) {
  //       props.createGradient();
  //     } else {
  //       const gradients = props.getGradients();
  //       gradients?.slice().forEach((g) => {
  //         props.removeGradient(g.gradient);
  //       });
  //     }
  //     o.value = value;
  //     props.onUpdate();
  //   },
  // });

  // props.onUpdate();
}

function handleRemoveGradient(gradient: IValueGradient) {
  registerUndoRedo({
    executeRedo: true,
    undo: () => {
      if (gradient instanceof FactorGradient) {
        props.addGradient(1, gradient.factor1, gradient.factor2);
      } else if (gradient instanceof ColorGradient) {
        props.addGradient(1, gradient.color1.clone(), gradient.color2?.clone());
      } else if (gradient instanceof Color3Gradient) {
        props.addGradient(1, gradient.color);
      }
      props.onUpdate();
    },
    redo: () => {
      props.removeGradient(gradient.gradient);
      props.onUpdate();
    },
  });

  props.onUpdate();
}

function handleAddGradient() {
  let createdGradient: IValueGradient | null = null;
  const lastGradient = props
    .getGradients()
    ?.sort((a, b) => a.gradient - b.gradient)
    .slice()
    .pop();

  registerUndoRedo({
    executeRedo: true,
    undo: () => {
      if (createdGradient) {
        props.removeGradient(createdGradient.gradient);
      }
      props.onUpdate();
    },
    redo: () => {
      if (lastGradient instanceof FactorGradient) {
        props.addGradient(1, lastGradient.factor1, lastGradient.factor2);
      } else if (lastGradient instanceof ColorGradient) {
        props.addGradient(1, lastGradient.color1.clone(), lastGradient.color2?.clone());
      } else if (lastGradient instanceof Color3Gradient) {
        props.addGradient(1, lastGradient.color);
      }

      createdGradient = props.getGradients()?.slice().pop() ?? null;
      props.onUpdate();
    },
  });

  props.onUpdate();
}
</script>
<style lang="scss" scoped>
.RightContent {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
