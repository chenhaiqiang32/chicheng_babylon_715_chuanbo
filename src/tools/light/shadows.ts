import { CascadedShadowGenerator, DirectionalLight, IShadowGenerator, Light, RenderTargetTexture, Scene, ShadowGenerator, ShadowLight, Vector3 } from "@babylonjs/core";

import { isDirectionalLight, isPointLight, isSpotLight } from "@/tools/guards/nodes";

/**
 * Updates the shadow map render list predicate of the given point light.
 * Will basically filter out meshes that are too far from the light according to
 * the current light's `range` value.
 * @param light defines the reference to the point light to configure.
 */
export function updatePointLightShadowMapRenderListPredicate(light: Light): void {
	if (!isPointLight(light) && !isSpotLight(light)) {
		return;
	}

	const shadowMap = light.getShadowGenerator()?.getShadowMap();
	if (!shadowMap) {
		return;
	}

	shadowMap.renderListPredicate = (mesh) => {
		const distance = Vector3.Distance(mesh.getAbsolutePosition(), light.getAbsolutePosition());
		return distance <= light.range;
	};
}

/**
 * In case the light has a refresh rate of 0, let's update them to reset refresh rate to
 * 0 in order to re-trigger a render of the shadow map. This is typically used when a light is moved in the editor.
 * @param light defines the reference to the light to configure.
 */
export function updateLightShadowMapRefreshRate(light: Light): void {
	const shadowMap = light.getShadowGenerator()?.getShadowMap();
	if (!shadowMap) {
		return;
	}

	if (shadowMap.refreshRate === RenderTargetTexture.REFRESHRATE_RENDER_ONCE) {
		shadowMap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
	}
}

/**
 * Updates all the lights properties (shadow maps, list predicates etc.).
 * @param scene defines the reference to the scene that contains all lights to update.
 */
export function updateAllLights(scene: Scene) {
	scene.lights.forEach((light) => {
		updateLightShadowMapRefreshRate(light);
		updatePointLightShadowMapRenderListPredicate(light);
	});
}
export function isCascadedShadowGenerator(object: any): object is CascadedShadowGenerator {
	return object.getClassName?.() === "CascadedShadowGenerator";
}
export function isShadowGenerator(object: any): object is ShadowGenerator {
	return object.getClassName?.() === "ShadowGenerator";
}
export function _createShadowGenerator(light: Light, generator1: IShadowGenerator, type: "none" | "classic" | "cascaded"): void {
	const mapSize = generator1?.getShadowMap()?.getSize();
	const renderList = generator1?.getShadowMap()?.renderList?.slice(0);

	generator1?.dispose();

	if (type === "none") {
		//return this._refreshShadowGenerator();
	}

	if (!isDirectionalLight(light)) {
		type = "classic";
	}

	const generator =
		type === "classic"
			? new ShadowGenerator(mapSize?.width ?? 1024, light as ShadowLight, true)
			: new CascadedShadowGenerator(mapSize?.width ?? 1024, light as DirectionalLight, true);

	if (isCascadedShadowGenerator(generator)) {
		generator.lambda = 1;
		generator.depthClamp = true;
		generator.autoCalcDepthBounds = true;
		generator.autoCalcDepthBoundsRefreshRate = 60;
	}

	if (!isPointLight(light)) {
		generator.usePercentageCloserFiltering = true;
		generator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
	}

	generator.transparencyShadow = true;
	generator.enableSoftTransparentShadow = true;

	if (renderList) {
		generator.getShadowMap()?.renderList?.push(...renderList);
	} else {
		generator.getShadowMap()?.renderList?.push(...generator.getLight().getScene().meshes);
	}
	//light.setShadowGenerator(generator);
	//_refreshShadowGenerator();
}
function _refreshShadowGenerator(generator: IShadowGenerator) {
	// const generator = this.props.light.getShadowGenerator();

	// this._generatorType = !generator ? "none" : isCascadedShadowGenerator(generator) ? "cascaded" : "classic";

	// this._softShadowType = this._getSoftShadowType(generator);
	// this._generatorSize = generator?.getShadowMap()?.getSize().width ?? 1024;

	// this.setState({ generator });
}

