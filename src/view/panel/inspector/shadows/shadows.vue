<template>
    <SectionField title='Shadows'>
        <Field title="CastShadows">
            <el-switch style="margin-left: auto;" v-model="_castShadows"
                @change="_handleCastShadowsChanged(_castShadows)" />
        </Field>
        <Switch label="Receive Shadows" :object="props.object" property="receiveShadows" />
    </SectionField>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import { ParticleSystem, IValueGradient, FactorGradient, ColorGradient, Color3Gradient, IParticleSystem, AbstractMesh } from "@babylonjs/core";
import { registerUndoRedo } from "../../../../tools/undoredo";
import Switch from "@/component/base/Switch.vue";
import SectionField from "@/component/common/SectionField.vue";
import { Editor } from "@/3d/Editor";
import { updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "@/tools/light/shadows";
const props = defineProps<{ editor: any; object: AbstractMesh }>()
const _castShadows = computed(() => {
    return Editor.Instance.Scene.lights.some((light) => {
        return light.getShadowGenerator()?.getShadowMap()?.renderList?.includes(props.object);
    });
})
function _handleCastShadowsChanged(enabled: boolean) {
    const lightsWithShadows = Editor.Instance.Scene.lights.filter((light) => {
        return light.getShadowGenerator()?.getShadowMap()?.renderList;
    });
    lightsWithShadows.forEach((light) => {
        if (enabled) {
            light.getShadowGenerator()?.getShadowMap()?.renderList?.push(props.object);
        } else {
            const index = light.getShadowGenerator()?.getShadowMap()?.renderList?.indexOf(props.object);
            if (index !== undefined && index !== -1) {
                light.getShadowGenerator()?.getShadowMap()?.renderList?.splice(index, 1);
            }
        }

        updateLightShadowMapRefreshRate(light);
        updatePointLightShadowMapRenderListPredicate(light);
    });
}
</script>
