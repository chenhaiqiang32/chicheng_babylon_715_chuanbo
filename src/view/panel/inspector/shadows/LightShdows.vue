<template>
  <div>
    <SectionField :title="$t('component.shadows.Shadows')">
      <template v-if="true">
        <Field :title="$t('component.shadows.GeneratorType')">
          <el-select v-model="generatorType" @change="createShadowGenerator" class="flex-1">
            <el-option :label="$t('component.shadows.None')" value="none" />
            <el-option :label="$t('component.shadows.Classic')" value="classic" />
            <el-option :label="$t('component.shadows.Cascaded')" value="cascaded" />
          </el-select>
        </Field>
        <Field :title="$t('component.shadows.GeneratorSize')">
          <el-select v-model="generatorSize" @change="resizeShadowGenerator" class="flex-1">
            <el-option
              v-for="size in sizes"
              :key="size.value"
              :label="size.text"
              :value="size.value"
            />
          </el-select>
        </Field>
      </template>

      <template v-else>
        <Field :title="$t('component.shadows.GeneratorType')">
          <el-select v-model="generatorType" @change="createShadowGenerator" class="flex-1">
            <el-option :label="$t('component.shadows.None')" value="none" />
            <el-option :label="$t('component.shadows.Classic')" value="classic" />
            <el-option :label="$t('component.shadows.Cascaded')" value="cascaded" />
          </el-select>
        </Field>
      </template>

      <slot></slot>

      <template v-if="generator">
        <NumberField
          :object="generator"
          property="bias"
          :step="0.000001"
          :min="0"
          :max="1"
          :label="$t('component.shadows.Bias')"
          @change="updateShadowMapRefreshRate"
        />
        <NumberField
          :object="generator"
          property="normalBias"
          :step="0.000001"
          :min="0"
          :max="1"
          :label="$t('component.shadows.NormalBias')"
          @change="updateShadowMapRefreshRate"
        />
        <NumberField
          :object="generator"
          property="darkness"
          :step="0.01"
          :min="0"
          :max="1"
          :label="$t('component.shadows.Darkness')"
        />

        <template v-if="generator.getShadowMap()">
          <Field :title="$t('component.shadows.RefreshRate')">
            <el-select
              v-model="shadowMapRefreshRate"
              @change="onShadowMapRefreshRateChange"
              class="flex-1"
            >
              <el-option :label="$t('component.shadows.Once')" :value="RenderTargetTexture.REFRESHRATE_RENDER_ONCE" />
              <el-option
                :label="$t('component.shadows.2Frames')"
                :value="RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES"
              />
              <el-option
                :label="$t('component.shadows.EveryFrame')"
                :value="RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME"
              />
            </el-select>
          </Field>
        </template>

        <SwitchField
          :object="generator"
          property="transparencyShadow"
          :label="$t('component.shadows.EnableTransparencyShadow')"
        />
        <SwitchField
          :object="generator"
          property="enableSoftTransparentShadow"
          :label="$t('component.shadows.EnableSoftTransparentShadow')"
        />
      </template>

      <template v-if="generator && generatorType === 'cascaded'">
        <slot></slot>
        <SwitchField
          :object="generator"
          property="stabilizeCascades"
          :label="$t('component.shadows.StabilizeCascades')"
          @change="updateShadowMapRefreshRate"
        />
        <SwitchField
          :object="generator"
          property="depthClamp"
          :label="$t('component.shadows.DepthClamp')"
          @change="updateShadowMapRefreshRate"
        />
        <SwitchField
          :object="generator"
          property="autoCalcDepthBounds"
          :label="$t('component.shadows.AutoCalcDepthBounds')"
          @change="
            () => {
              updateShadowMapRefreshRate();
            }
          "
        />
        <template
          v-if="
            generatorType === 'cascaded' &&
            (generator as CascadedShadowGenerator).autoCalcDepthBounds
          "
        >
          <EditorInspectorNumberField
            :object="generator"
            property="autoCalcDepthBoundsRefreshRate"
            :step="1"
            :min="0"
            :max="60"
            :label="$t('component.shadows.AutoCalcDepthBoundsRefreshRate')"
            @change="updateShadowMapRefreshRate"
          />
        </template>
        <NumberField
          :object="generator"
          property="lambda"
          :min="0"
          :max="1"
          :label="$t('component.shadows.Lambda')"
          @change="updateShadowMapRefreshRate"
        />
        <NumberField
          :object="generator"
          property="cascadeBlendPercentage"
          :min="0"
          :max="1"
          :label="$t('component.shadows.BlendPercentage')"
          @change="updateShadowMapRefreshRate"
        />
        <NumberField
          :object="generator"
          property="penumbraDarkness"
          :min="0"
          :max="1"
          :label="$t('component.shadows.PenumbraDarkness')"
          @change="updateShadowMapRefreshRate"
        />
      </template>
          <template v-if="generator">
<Field :title="$t('component.shadows.SoftShadowType')">
          <el-select v-model="softShadowType" @change="onSoftShadowTypeChange" class="flex-1">
            <el-option
              v-for="item in softShadowItems"
              :key="item.value"
              :label="item.text"
              :value="item.value"
            />
          </el-select>
</Field>
        <template v-if="softShadowType === 'usePoissonSampling'">
          <NumberField
            :object="generator"
            property="blurScale"
            :step="0.1"
            :min="0"
            :max="10"
            :label="$t('component.shadows.BlurScale')"
          />
        </template>

        <template v-if="softShadowType === 'usePercentageCloserFiltering'">
          <Field :title="$t('component.shadows.FilteringQuality')"> 
            <el-select v-model="filteringQuality" @change="onFilteringQualityChange" class="flex-1">
              <el-option :label="$t('component.shadows.Low')" :value="ShadowGenerator.QUALITY_LOW" />
              <el-option :label="$t('component.shadows.Medium')" :value="ShadowGenerator.QUALITY_MEDIUM" />
              <el-option :label="$t('component.shadows.High')" :value="ShadowGenerator.QUALITY_HIGH" />
            </el-select>
          </Field>
        </template>

        <template v-if="softShadowType === 'useContactHardeningShadow'">
          <NumberField
            :object="(generator as ShadowGenerator).contactHardeningLightSizeUVRatio"
            property="blurScale"
            :step="0.001"
            :min="0"
            :max="1"
            :label="$t('component.shadows.LightSizeUVRatio')"
            @change="updateShadowMapRefreshRate"
          />
        </template>
    </template>
    </SectionField>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import {
  CascadedShadowGenerator,
  DirectionalLight,
  IShadowGenerator,
  IShadowLight,
  PointLight,
  RenderTargetTexture,
  ShadowGenerator,
  SpotLight,
} from '@babylonjs/core';

import { waitNextAnimationFrame } from '@/tools/tools';
import { isDirectionalLight, isPointLight, isSpotLight } from '@/tools/guards/nodes';
import { isCascadedShadowGenerator, isShadowGenerator, updateAllLights } from '@/tools/light/shadows';
import {
  updateLightShadowMapRefreshRate,
  updatePointLightShadowMapRenderListPredicate,
} from '@/tools/light/shadows';

import SectionField from '@/component/common/SectionField.vue';
import NumberField from '@/component/base/Number.vue';
import SwitchField from '@/component/base/Switch.vue';
import Field from '@/component/common/Field.vue';
import { Editor } from '@/3d/Editor';

interface IEditorLightShadowsInspectorProps {
  light: IShadowLight;
}

type SoftShadowType =
  | 'usePoissonSampling'
  | 'useExponentialShadowMap'
  | 'useCloseExponentialShadowMap'
  | 'usePercentageCloserFiltering'
  | 'useContactHardeningShadow'
  | 'none';

const props = defineProps<IEditorLightShadowsInspectorProps>();

defineSlots<{
  default: () => any;
}>();

const generatorSize = ref(1024);
const generatorType = ref<'none' | 'classic' | 'cascaded'>('none');
const softShadowType = ref<SoftShadowType>('none');
const generator = ref<IShadowGenerator | null>(null);
const shadowMapRefreshRate = ref(RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME);
const filteringQuality = ref(ShadowGenerator.QUALITY_HIGH);

const sizes = computed(() => {
  return getPowerOfTwoSizesUntil(4096, 256).map((s) => ({
    value: s,
    text: `${s}px`,
  }));
});

const softShadowItems = computed(() => {
  const items: Array<{ text: string; value: SoftShadowType }> = [{ text: 'None', value: 'none' }];

  if (isPointLight(props.light)) {
    items.push({ text: 'Poisson Sampling', value: 'usePoissonSampling' });
  } else {
    items.push({ text: 'Percentage Closer Filtering', value: 'usePercentageCloserFiltering' });
    items.push({ text: 'Contact Hardening Shadow', value: 'useContactHardeningShadow' });
  }

  return items;
});

const refreshShadowGenerator = () => {
 if (isDirectionalLight(props.light) || isPointLight(props.light) || isSpotLight(props.light)) {
    console.log(props.light.uuid);
    
 const gen = Editor.Instance.shadow.getShadowGenerator(props.light);
  generatorType.value = !gen ? 'none' : isCascadedShadowGenerator(gen) ? 'cascaded' : 'classic';
  softShadowType.value = getSoftShadowType(gen);
  generatorSize.value = gen?.getShadowMap()?.getSize().width ?? 1024;
  generator.value = gen;
  
  if (gen?.getShadowMap()) {
    shadowMapRefreshRate.value = gen.getShadowMap().refreshRate;
  }
 }
};

const getSoftShadowType = (gen: IShadowGenerator | null): SoftShadowType => {
  if (gen && (isShadowGenerator(gen) || isCascadedShadowGenerator(gen))) {
    if (gen.usePercentageCloserFiltering) {
      return 'usePercentageCloserFiltering';
    } else if (gen.useContactHardeningShadow) {
      return 'useContactHardeningShadow';
    }
  }

  return 'none';
};

const createShadowGenerator = (type: 'none' | 'classic' | 'cascaded') => {
  const mapSize = generator.value?.getShadowMap()?.getSize();
  const renderList = generator.value?.getShadowMap()?.renderList?.slice(0).filter((item) => item.castShadows);
  generator.value?.dispose();
    

  if (isDirectionalLight(props.light) || isPointLight(props.light) || isSpotLight(props.light)) {
        Editor.Instance.shadow.closeShadow(props.light);
    if (type === 'none') {
      return refreshShadowGenerator();
    }

    if (!isDirectionalLight(props.light)) {
      type = 'classic';
    }
    
    const gen =  Editor.Instance.shadow.openShadow(props.light, type, mapSize);    
    //console.log(gen);
    if (isCascadedShadowGenerator(gen)) {
      gen.lambda = 1;
      gen.depthClamp = true;
      gen.autoCalcDepthBounds = true;
      gen.autoCalcDepthBoundsRefreshRate = 60;

    }

    if (!isPointLight(props.light)) {
      gen.usePercentageCloserFiltering = true;
      gen.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    }

    gen.transparencyShadow = true;
    gen.enableSoftTransparentShadow = true;


    if (renderList) {
      gen.getShadowMap()?.renderList?.push(...renderList);
    } else {
      gen.getShadowMap()?.renderList?.push(...gen.getLight().getScene().meshes.filter((item) => item.castShadows));
    }
     
 if (isDirectionalLight(props.light) || isPointLight(props.light) || isSpotLight(props.light)) {
      gen.getLight().getScene().meshes.forEach((item) => {
        if (item.castShadows) {
           // console.log(item);
          Editor.Instance.shadow.addMeshToShadowGenerator(item, props.light as DirectionalLight | PointLight | SpotLight);
        }
      });
    }

}
//Editor.Instance.Scene

refreshShadowGenerator();
};

const resizeShadowGenerator = (size: number) => {
    console.log(generator);
  const shadowMap = generator.value?.getShadowMap();
  if (shadowMap) {
    const refreshRate = shadowMap.refreshRate;
    shadowMap.resize(size);

    waitNextAnimationFrame().then(() => {
      updatePointLightShadowMapRenderListPredicate(props.light);

      const newShadowMap = generator.value?.getShadowMap();
      if (newShadowMap) {
        newShadowMap.refreshRate = refreshRate;
      }
    });
  }
};

const updateSoftShadowType = (type: SoftShadowType) => {
  if (
    generator.value &&
    (isShadowGenerator(generator.value) || isCascadedShadowGenerator(generator.value))
  ) {
    generator.value.usePoissonSampling = false;
    generator.value.useExponentialShadowMap = false;
    generator.value.useBlurExponentialShadowMap = false;
    generator.value.useCloseExponentialShadowMap = false;
    generator.value.useBlurCloseExponentialShadowMap = false;
    generator.value.usePercentageCloserFiltering = false;
    generator.value.useContactHardeningShadow = false;

    if (type !== 'none') {
      (generator.value as any)[type] = true;
    }
  }
};

const onSoftShadowTypeChange = (type: SoftShadowType) => {
  updateSoftShadowType(type);
  updateShadowMapRefreshRate();
};

const onShadowMapRefreshRateChange = (rate: number) => {
  if (generator.value?.getShadowMap()) {
    generator.value.getShadowMap().refreshRate = rate;
  }
};

const onFilteringQualityChange = (quality: number) => {
  if (
    generator.value &&
    (isShadowGenerator(generator.value) || isCascadedShadowGenerator(generator.value))
  ) {
    generator.value.filteringQuality = quality;
  }
  updateShadowMapRefreshRate();
};

const updateShadowMapRefreshRate = () => {
  updateLightShadowMapRefreshRate(props.light);
};

function getPowerOfTwoSizesUntil(limit: number = 4096, from?: number): number[] {
  let size = from ?? 1;

  const result: number[] = [];

  while (size <= limit) {
    result.push(size);
    size <<= 1;
  }

  return result;
}
// ...

onMounted(() => {
  refreshShadowGenerator();
});

// 添加监听
watch(() => props.light, (newLight, oldLight) => {
  if (newLight) {
    refreshShadowGenerator();
  }
}, { 
  immediate: true, 
  deep: true 
});
</script>
