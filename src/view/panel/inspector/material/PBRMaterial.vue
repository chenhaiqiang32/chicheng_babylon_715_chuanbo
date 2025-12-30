<template>
  <SectionField :title="$t('component.material.title')">
    <div style="display: flex; align-items: center; gap: 4px; width: 100%;">
      <StringField style="flex: 1;" :label="$t('component.material.name')" :object="material" property="name" />
      <ElButton type="info" size="small" @click="changeMaterial">更换</ElButton>
    </div>
    <SectionField :title="$t('component.material.base')">
      <Color :label="$t('component.material.albedo')" :object="material" property="albedoColor"
        @change="(newC, oldC) => changeProperty('albedoColor', newC, oldC, 'color3')" />
      <Color :label="$t('component.material.emissive')" :object="material" property="emissiveColor" />
      <Slider v-if="material.metallicTexture" :label="$t('component.material.metallic')" :object="material"
        property="metallicF0Factor" :min="0"
        @change="(newC, oldC) => changeProperty('metallicF0Factor', newC, oldC, 'float')" />
      <Slider v-if="!material.metallicTexture" :label="$t('component.material.metallic')" :object="material"
        property="metallic" :min="0" @change="(newC, oldC) => changeProperty('metallic', newC, oldC, 'float')" />
      <Slider :label="$t('component.material.roughness')" :object="material" property="roughness" :min="0"
        @change="(newC, oldC) => changeProperty('roughness', newC, oldC, 'float')" />
      <TransparencyModeField :object="material" property="transparencyMode" @change="changeTransparencyMode" />
      <AlphaModeField v-if="transparencyMode != 0" :object="material" property="alphaMode" />
      <Slider v-if="transparencyMode != 0" :label="$t('component.material.alpha')" :object="material" property="alpha"
        :min="0" :max="1" @change="(newC, oldC) => changeProperty('alpha', newC, oldC, 'float')" />
      <Slider v-if="transparencyMode === 1 || transparencyMode === 3" :label="$t('component.material.alphaCutOff')"
        :object="material" property="alphaCutOff" :min="0" :max="1"
        @change="(newC, oldC) => changeProperty('alphaCutOff', newC, oldC, 'float')" />
      <Switch :label="$t('component.material.disableLighting')" :object="material" property="disableLighting" />
      <Switch :label="$t('component.material.pointsCloud')" :object="material" property="pointsCloud" />
      <Slider :label="$t('component.material.pointSize')" :object="material" property="pointSize" :min="0" :max="10" />
      <Switch :label="$t('component.material.wireframe')" :object="material" property="wireframe" />

    </SectionField>

    <SectionField :title="$t('component.material.texture')">
      <Texture :object="material" :title="$t('component.material.albedoTexture')" property="albedoTexture"
        @change="force">
        <Switch :label="$t('component.material.useAlphaFromAlbedoTexture')" :object="material"
          property="useAlphaFromAlbedoTexture" />
      </Texture>
      <Texture :object="material" :title="$t('component.material.bumpTexture')" property="bumpTexture" @change="force">
        <template v-if="material.bumpTexture">
          <Switch :label="$t('component.material.invertNormalMapX')" :object="material" property="invertNormalMapX" />
          <Switch :label="$t('component.material.invertNormalMapY')" :object="material" property="invertNormalMapY" />
          <Switch :label="$t('component.material.useObjectSpaceNormalMap')" :object="material"
            property="useObjectSpaceNormalMap" />
          <Switch :label="$t('component.material.useParallax')" :object="material" property="useParallax"
            @change="force" />
          <template v-if="material.useParallax">
            <Switch :label="$t('component.material.useParallaxOcclusion')" :object="material"
              property="useParallaxOcclusion" />
            <Slider :label="$t('component.material.parallaxScaleBias')" :object="material"
              property="parallaxScaleBias" />
          </template>
          <Switch :label="$t('component.material.disableBumpMap')" :object="material" property="disableBumpMap"
            @change="force" />
        </template>
      </Texture>
      <Texture :object="material" :title="$t('component.material.emissiveTexture')" property="emissiveTexture">
      </Texture>
      <Texture :object="material" :title="$t('component.material.metallicTexture')" property="metallicTexture"
        @change="force">
        <template v-if="material.metallicTexture">
          <Switch :label="$t('component.material.useRoughnessFromMetallicTextureAlpha')" :object="material"
            property="useRoughnessFromMetallicTextureAlpha" />
          <Switch :label="$t('component.material.useRoughnessFromMetallicTextureGreen')" :object="material"
            property="useRoughnessFromMetallicTextureGreen" />
          <Switch :label="$t('component.material.useMetallnessFromMetallicTextureBlue')" :object="material"
            property="useMetallnessFromMetallicTextureBlue" />
          <Switch :label="$t('component.material.useAmbientOcclusionFromMetallicTextureRed')" :object="material"
            property="useAmbientOcclusionFromMetallicTextureRed" @change="force" />
          <template v-if="material.useAmbientOcclusionFromMetallicTextureRed">
            <Slider :label="$t('component.material.ambientTextureStrength')" :object="material"
              property="ambientTextureStrength" :min="0" />
          </template>
        </template>
      </Texture>
      <Texture :object="material" :title="$t('component.material.ambientTexture')" property="ambientTexture"
        @change="force">
        <template v-if="material.ambientTexture">
          <Switch :label="$t('component.material.useAmbientInGrayScale')" :object="material"
            property="useAmbientInGrayScale" />
          <Slider :label="$t('component.material.ambientTextureStrength')" :object="material"
            property="ambientTextureStrength" :min="0" />
          <Slider :label="$t('component.material.ambientTextureImpactOnAnalyticalLights')" :object="material"
            property="ambientTextureImpactOnAnalyticalLights" :min="0" :max="1" />
        </template>
      </Texture>
      <Texture :object="material" :title="$t('component.material.reflectionTexture')" property="reflectionTexture"
        @change="force" />
      <!-- <Texture :object="material" :title="$t('component.material.metallicReflectanceTexture')"
        property="metallicReflectanceTexture" @change="force">
        <template v-if="material.metallicReflectanceTexture">
          <Switch :label="$t('component.material.useOnlyMetallicFromMetallicReflectanceTexture')" :object="material"
            property="useOnlyMetallicFromMetallicReflectanceTexture" @change="force" />
        </template>
      </Texture> -->
      <Texture :object="material" :title="$t('component.material.lightmapTexture')" property="lightmapTexture">
        <template v-if="material.lightmapTexture">
          <Switch :label="$t('component.material.useLightmapAsShadowmap')" :object="material"
            property="useLightmapAsShadowmap" />
        </template>
      </Texture>
      <Texture :object="material" :title="$t('component.material.opacityTexture')" property="opacityTexture" />

      <template v-if="!material.metallicTexture">
        <Texture :object="material" :title="$t('component.material.reflectivityTexture')" property="reflectivityTexture"
          @change="force" />
        <Texture :object="material" :title="$t('component.material.microSurfaceTexture')" property="microSurfaceTexture"
          @change="force" />
      </template>

    </SectionField>
    <SectionField :title="$t('component.material.light')">
      <Slider :label="$t('component.material.directIntensity')" :object="material" property="directIntensity" :min="0"
        :max="5" />
      <Slider :label="$t('component.material.environmentIntensity')" :object="material" property="environmentIntensity"
        :min="0" :max="5" />
      <Slider :label="$t('component.material.specularIntensity')" :object="material" property="specularIntensity"
        :min="0" :max="5" />
      <Slider :label="$t('component.material.emissiveIntensity')" :object="material" property="emissiveIntensity"
        :min="0" :max="5" />


    </SectionField>
    <SectionField :title="$t('component.material.clearCoat')">
      <template #right>
        <Switch :object="material" property="clearCoat.isEnabled" />
      </template>
      <Switch :label="$t('component.material.isTintEnabled')" :object="material" property="clearCoat.isTintEnabled" />
      <Slider :label="$t('component.material.intensity')" :object="material" property="clearCoat.intensity" :min="0"
        :max="1" />
      <Texture :object="material" :title="$t('component.material.clearCoatTexture')" property="clearCoat.texture" />
      <!-- <Texture :object="material" :title="$t('component.material.clearCoatTextureRoughness')"
        property="clearCoat.textureRoughness" /> -->
      <Color :object="material" :title="$t('component.material.clearCoatTintColor')" property="clearCoat.tintColor" />
      <Texture :object="material" :title="$t('component.material.clearCoatTintTexture')"
        property="clearCoat.tintTexture" />
      <Texture :object="material" :title="$t('component.material.bumpTexture')" property="clearCoat.bumpTexture" />
      <Slider :label="$t('component.material.clearCoatTintThickness')" :object="material"
        property="clearCoat.tintThickness" :min="0" :max="2" />
      <Slider :label="$t('component.material.clearCoatRoughness')" :object="material" property="clearCoat.roughness"
        :min="0" :max="1" />
      <Slider :label="$t('component.material.indexOfRefraction')" :object="material"
        property="clearCoat.indexOfRefraction" :min="0" :max="3" />
    </SectionField>

    <SectionField :title="$t('component.material.refraction')">

      <template #right>
        <Switch :object="material" property="subSurface.isRefractionEnabled" />
      </template>

      <Slider :label="$t('component.material.refractionIntensity')" :object="material"
        property="subSurface.refractionIntensity" :min="0" :max="1" />
      <Slider :label="$t('component.material.indexOfRefraction')" :object="material" property="indexOfRefraction"
        :min="1" :max="2.5" />
      <Color :label="$t('component.material.subSurface.tintColor')" :object="material" property="subSurface.tintColor"
        @change="(newC, oldC) => changeProperty('subSurface.tintColor', newC, oldC, 'color3')" />
    </SectionField>

    <SectionField :title="$t('component.material.translucency')">
      <template #right>
        <Switch :object="material" property="subSurface.isTranslucencyEnabled" />
      </template>
      <Slider :label="$t('component.material.subSurface.translucencyIntensity')" :object="material"
        property="subSurface.translucencyIntensity" :min="0" :max="1" />
    </SectionField>

    <SectionField :title="$t('component.material.anisotropy')">
      <template #right>
        <Switch :object="material" property="anisotropy.isEnabled" />
      </template>
      <Slider :label="$t('component.material.anisotropyIntensity')" :object="material" property="anisotropy.intensity"
        :min="0" :max="1" />
      <Slider :label="$t('component.material.directionX')" :object="material" property="anisotropy.direction.x" :min="0"
        :max="1" />
      <Slider :label="$t('component.material.directionY')" :object="material" property="anisotropy.direction.y" :min="0"
        :max="1" />
    </SectionField>

    <SectionField :title="$t('component.material.sheen')">
      <template #right>
        <Switch :object="material" property="sheen.isEnabled" />
      </template>
      <Slider :label="$t('component.material.sheenIntensity')" :object="material" property="sheen.intensity" :min="0"
        :max="10" />
      <Color :label="$t('component.material.sheenColor')" :object="material" property="sheen.color" />
    </SectionField>

    <SectionField title="其他">
      <Switch :label="$t('component.material.backFaceCulling')" :object="material" property="backFaceCulling" />
    </SectionField>
  </SectionField>
</template>

<script setup lang="ts">
import { inject, onMounted, ref, watch, } from "vue"
import SectionField from "@/component/common/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
import Switch from "@/component/base/Switch.vue"
import Texture from "@/component/base/Texture.vue"
import Color from "@/component/base/Color.vue"
import Slider from "@/component/base/Slider.vue"
import TransparencyModeField from "@/component/base/TransparencyModeField.vue"
import AlphaModeField from "@/component/base/AlphaModeField.vue"
import { useDialog } from "@/view/dialog"
import { RuntimeLibrary } from "@/3d/assets/RuntimeLibrary"
import { PBRMaterial } from "@babylonjs/core"

const props = defineProps<{ mesh?: any; material: PBRMaterial; }>()
const force = () => { }
const transparencyMode = ref(0)

watch(() => props.material, () => {
  transparencyMode.value = props.material.transparencyMode;
}, {
  immediate: true
})

function changeTransparencyMode() {
  transparencyMode.value = props.material.transparencyMode;
}

const propertyChanged = inject<(property: string, newValue: any, oldValue: any, type: string) => void>('propertyChanged')

function changeProperty(property: string, newValue: any, oldValue: any, type: string) {
  propertyChanged?.('material.' + property, newValue, oldValue, type);
  // 更新材质球的效果
  RuntimeLibrary.Instance.dispatch('onMaterialChanged', {useCache: false});
}

async function changeMaterial() {
  const ChooseResDialog = (await import('@/view/dialog/ChooseResDialog.vue')).default
  useDialog(ChooseResDialog, {
    choose: async (res: any) => {
      if (res) {
        const material = await RuntimeLibrary.Instance.getMaterial(res.uuid)
        if (material) {
          props.mesh.material = material
        }
      }
    },
    type: 'material'
  })
}
onMounted(() => {
})
</script>