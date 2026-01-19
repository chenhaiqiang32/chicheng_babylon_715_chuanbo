import { Color3, DirectionalLight, Light, Mesh, PointLight, ShadowGenerator, SpotLight } from "@babylonjs/core";

export class Shadow {


    private shadowGeneratorMap: Map<Light, ShadowGenerator> = new Map();

    openShadow(light: DirectionalLight | PointLight | SpotLight) {
        if (this.shadowGeneratorMap.has(light)) {
            return;
        }
        const shadowGenerator = new ShadowGenerator(1024, light);
        shadowGenerator.useExponentialShadowMap = true;
        this.shadowGeneratorMap.set(light, shadowGenerator);
    }
    closeShadow(light: DirectionalLight | PointLight | SpotLight) {
        if (this.shadowGeneratorMap.has(light)) {
            this.shadowGeneratorMap.get(light).dispose();
            this.shadowGeneratorMap.delete(light);
        }
    }

    getShadowGenerator(light: DirectionalLight | PointLight | SpotLight) {
        return this.shadowGeneratorMap.get(light);
    }

    addMeshToShadowGenerator(mesh: Mesh, light?: DirectionalLight | PointLight | SpotLight) {
        if (light) {
            const shadowGenerator = this.getShadowGenerator(light);
            if (shadowGenerator) {
                shadowGenerator.addShadowCaster(mesh);
            }
        } else {
            this.shadowGeneratorMap.forEach((shadowGenerator) => {
                shadowGenerator.addShadowCaster(mesh);
            });
        }
    }

    removeMeshFromShadowGenerator(mesh: Mesh, light?: DirectionalLight | PointLight | SpotLight) {
        if (light) {
            const shadowGenerator = this.getShadowGenerator(light);
            if (shadowGenerator) {
                shadowGenerator.removeShadowCaster(mesh);
            }
        }
    }
}