<template>
  <SectionField :title="$t('component.material.title')" :label="material.getClassName()">

    <div style="display: flex; align-items: center; gap: 4px; width: 100%;">
      <StringField style="flex: 1;" :label="$t('component.material.name')" :object="material" property="name" />
      <ElButton type="info" size="small" @click="changeMaterial">更换</ElButton>
    </div>
    <SectionField :title="$t('component.material.base')">

      <Color :label="$t('component.material.albedo')" :object="material" property="albedoColor" />
      <Color :label="$t('component.material.emissive')" :object="material" property="emissiveColor" />


      <Slider v-if="material.metallicTexture" :label="$t('component.material.metallic')" :object="material"
        property="metallicF0Factor" :min="0" />
      <Slider v-if="!material.metallicTexture" :label="$t('component.material.metallic')" :object="material"
        property="metallic" :min="0" />
      <Slider :label="$t('component.material.roughness')" :object="material" property="roughness" :min="0" />

      <TransparencyModeField :object="material" property="transparencyMode" @change="changeTransparencyMode" />
      <AlphaModeField v-if="transparencyMode != 0" :object="material" property="alphaMode" />
      <Slider v-if="transparencyMode != 0" :label="$t('component.material.alpha')" :object="material" property="alpha"
        :min="0" :max="1" />
      <Slider v-if="transparencyMode === 1" :label="$t('component.material.alphaCutOff')" :object="material"
        property="alphaCutOff" :min="0" :max="1" />
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
    </SectionField>
    <SectionField :title="$t('component.material.clearCoat')">
      <Switch :label="$t('component.material.enable')" :object="material" property="clearCoat.isEnabled" />
      <Switch :label="$t('component.material.enable')" :object="material" property="clearCoat.isTintEnabled" />
      <Texture :object="material" :title="$t('component.material.clearCoatTexture')" property="clearCoat.texture" />
      <!-- <Texture :object="material" :title="$t('component.material.clearCoatTextureRoughness')"
        property="clearCoat.textureRoughness" /> -->
      <Color :object="material" :title="$t('component.material.clearCoatTintColor')" property="clearCoat.tintColor" />
      <Texture :object="material" :title="$t('component.material.clearCoatTintTexture')"
        property="clearCoat.tintTexture" />
      <Slider :label="$t('component.material.clearCoatTintThickness')" :object="material"
        property="clearCoat.tintThickness" :min="0" :max="1" />
    </SectionField>



    <SectionField title="其他">
      <Switch :label="$t('component.material.backFaceCulling')" :object="material" property="backFaceCulling" />
    </SectionField>
  </SectionField>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, } from "vue"
import SectionField from "@/component/common/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
import Switch from "@/component/base/Switch.vue"
import Texture from "@/component/base/Texture.vue"
import Color from "@/component/base/Color.vue"
import Slider from "@/component/base/Slider.vue"
import TransparencyModeField from "@/component/base/TransparencyModeField.vue"
import AlphaModeField from "@/component/base/AlphaModeField.vue"
import { useDialog } from "@/view/dialog"
import { RuntimeLibrary } from "@/3d/assets/runtimeLibrary"
import { PBRMaterial } from "@babylonjs/core"

const props = defineProps<{ mesh?: any; material: PBRMaterial; }>()
const force = () => { }

const transparencyMode = ref(0)


function changeTransparencyMode() {
  transparencyMode.value = props.material.transparencyMode;
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