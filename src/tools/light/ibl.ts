import { Scene, Mesh } from "@babylonjs/core";

import { getIblShadowsRenderingPipeline } from "@/rendering/ibl-shadows";

import { unique } from "@/tools/tools";

import { isMesh } from "@/tools/guards/nodes";

export function updateIblShadowsRenderPipeline(scene: Scene, updateVoxelization?: boolean) {
	const iblShadowRenderPipeline = getIblShadowsRenderingPipeline();
	if (!iblShadowRenderPipeline) {
		return;
	}

	scene.meshes.forEach((mesh) => {
		if (isMesh(mesh)) {
			iblShadowRenderPipeline.removeShadowCastingMesh(mesh);
		}
	});

	const meshes: Mesh[] = [];

	const shadowGenerators = scene.lights.map((l) => l.getShadowGenerator());
	shadowGenerators.forEach((shadowGenerator) => {
		shadowGenerator?.getShadowMap()?.renderList?.forEach((mesh) => {
			if (isMesh(mesh)) {
				meshes.push(mesh);
			}
		});
	});

	const castMeshes = unique(meshes);

	castMeshes.forEach((mesh) => {
		iblShadowRenderPipeline.addShadowCastingMesh(mesh);
	});

	iblShadowRenderPipeline.updateSceneBounds();

	if (updateVoxelization) {
		iblShadowRenderPipeline.updateVoxelization();
	}
}
