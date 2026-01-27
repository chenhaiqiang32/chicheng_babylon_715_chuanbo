import {
  CascadedShadowGenerator,
  Color3,
  DirectionalLight,
  Light,
  Mesh,
  AbstractMesh,
  PointLight,
  ShadowGenerator,
  SpotLight,
} from '@babylonjs/core';

export class Shadow {
  private shadowGeneratorMap: Map<string, ShadowGenerator | CascadedShadowGenerator> = new Map();

  openShadow(
    light: DirectionalLight | PointLight | SpotLight,
    type: 'classic' | 'cascaded',
    mapSize?: { width: number; height: number },
  ) {
    if (this.shadowGeneratorMap.has(light.uuid)) {
      return this.shadowGeneratorMap.get(light.uuid);
    }
    //  const shadowGenerator = new ShadowGenerator(1024, light);
    const shadowGenerator =
      type === 'classic'
        ? new ShadowGenerator(mapSize?.width ?? 1024, light, true)
        : new CascadedShadowGenerator(mapSize?.width ?? 1024, light as DirectionalLight, true);
    //  shadowGenerator.useExponentialShadowMap = true;
    const id = light.uuid;
    this.shadowGeneratorMap.set(id, shadowGenerator);
    return shadowGenerator;
  }
  closeShadow(light: DirectionalLight | PointLight | SpotLight) {
    if (this.shadowGeneratorMap.has(light.uuid)) {
      this.shadowGeneratorMap.get(light.uuid)?.dispose();
      this.shadowGeneratorMap.delete(light.uuid);
    }
  }

  getShadowGenerator(light: DirectionalLight | PointLight | SpotLight) {
    if (this.shadowGeneratorMap.has(light.uuid)) {
      return this.shadowGeneratorMap.get(light.uuid);
    }
    return null;
  }

  addMeshToShadowGenerator(mesh: AbstractMesh, light?: DirectionalLight | PointLight | SpotLight) {
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

  removeMeshFromShadowGenerator(
    mesh: AbstractMesh,
    light?: DirectionalLight | PointLight | SpotLight,
  ) {
    if (light) {
      const shadowGenerator = this.getShadowGenerator(light);
      if (shadowGenerator) {
        shadowGenerator.removeShadowCaster(mesh);
      }
    } else {
      this.shadowGeneratorMap.forEach((shadowGenerator) => {
        shadowGenerator.removeShadowCaster(mesh);
      });
    }
  }
  addShadowGeneratorMap(uuid: string, shadowGenerator: ShadowGenerator | CascadedShadowGenerator) {
    this.shadowGeneratorMap.set(uuid, shadowGenerator);
  }
  getShadowGeneratorMap() {
    return this.shadowGeneratorMap;
  }
}
