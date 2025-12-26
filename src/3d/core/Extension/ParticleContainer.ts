import { ParticleSystemSet, Scene, TransformNode } from "@babylonjs/core";

export class ParticleContainer extends TransformNode {
    public particleSystems: ParticleSystemSet;
    constructor(name: string, scene: Scene) {
        super(name, scene);
    }
    
    public getClassName(): string {
        return "ParticleContainer";
    }
}