import type { TransformNode, Vector3 } from "@babylonjs/core";
import type { ICommand } from "./ICommand";

export class TranslateCommand implements ICommand
{
    constructor(
        private mesh : TransformNode,
        private from : Vector3,
        private to   : Vector3
    ) {}

    Execute(): void {
        this.mesh.position.copyFrom(this.to);
    }
    Undo(): void {
        this.mesh.position.copyFrom(this.from);
    }

}