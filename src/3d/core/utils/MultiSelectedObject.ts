import { Camera, Light, Material, Mesh, Node, TransformNode } from "@babylonjs/core";

export class MultiSelectedObject
{
    MultiType:string[];

    get Nodes(){
        return this.nodes;
    }

    // 如何判断多选的哪些组件支持多选修改？
    set Nodes(nodes:Node[]){
        if(!nodes.length) return;
        this.nodes = nodes;
        const typeMap:Map<string, number> = new Map();
        this.nodes.forEach((n:Node) => {
            if(n instanceof Material){
                this.addTypeMapValue(typeMap, "Material");
            }
            if(n instanceof TransformNode){
                this.addTypeMapValue(typeMap, "TransformNode");
            }
            if(n instanceof Mesh){
                this.addTypeMapValue(typeMap, "Mesh");
            }
            if(n instanceof Camera){
                this.addTypeMapValue(typeMap, "Camera");
            }
            if(n instanceof Light){
                this.addTypeMapValue(typeMap, "Light");
            }
        })
        this.MultiType = [];
        typeMap.forEach((v, k) => {
            if(v > 1){
                this.MultiType.push(k);
            }
        })
        console.log(this.MultiType);
    }

    private nodes:Node[];

    private addTypeMapValue(typeMap:Map<string, number>, typeName:string)
    {
        if(!typeMap.has(typeName)){
            typeMap.set(typeName, 1);
        } else {
            typeMap.set(typeName, typeMap.get(typeName) + 1);
        }
    }
}