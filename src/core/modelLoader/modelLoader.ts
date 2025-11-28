import { Editor } from "@/3d/Editor";
import { useScene } from "@/store/useScene";
import { ISceneLoaderAsyncResult, ImportMeshAsync, Scene, SceneLoader } from "@babylonjs/core";
import { IGLTF } from "@babylonjs/loaders/glTF/2.0";
import JSZip from "jszip";

// 模型加载
export class ModelLoader {
    private scene:Scene
    constructor(private files: FileList){
        this.scene = Editor.Instance['scene'];
    }

    async load():Promise<ISceneLoaderAsyncResult>{
        const file = this.files[0];

        // todo:后期再用设计模式优化
        if(file.name.endsWith(".glb")){
            return await this.loadGlb(file);
        }
        else if(file.name.endsWith(".zip")){
            return await this.loadGLTF(file);
        }
    }

    async loadGlb(file: File){
        const result =  await ImportMeshAsync(file, this.scene);
        useScene().setHierarchy(this.scene.rootNodes);
        return result;
    }

    async loadGLTF(file: File){
        // 反序列化 zip
        const zip = await JSZip.loadAsync(file);
        let gltfFile: JSZip.JSZipObject | null = null;
        // 找到 .gltf 文件
        Object.keys(zip.files).forEach(path => {
            if(path.endsWith(".gltf")){
                gltfFile = zip.files[path];
            }
        })

        if(gltfFile == null){
            console.error("Can't find .gltf file")
            return;
        }

        const gltfText = await gltfFile.async("string");
        const gltfJson = JSON.parse(gltfText) as IGLTF;

        async function getBlobAsDataURL(file: JSZip.JSZipObject){
            const blob = await file.async("blob");
            return new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            })
        }

        // 根据 gltf 文件将对应文件转换为 blob
        for(const buf of gltfJson.buffers){
            const uri = buf.uri;
            if(!uri || uri.startsWith("data:")) continue;

            const file = zip.files[uri]
            if(!file){
                console.warn("buffer file missing");
                continue;
            }
            buf.uri = await getBlobAsDataURL(file);
        }


        // 将 image 转换为 url
        if(gltfJson.images){
            for(const img of gltfJson.images){
                const uri = img.uri;
                if(!uri || uri.startsWith("data:")) continue;

                const file = zip.files[uri];
                if(!file){
                    console.warn("image file missing");
                    continue;
                }
                img.uri = await getBlobAsDataURL(file);
            }
        }

        const finalGLTF = "data:" + JSON.stringify(gltfJson);

        const result = await SceneLoader.ImportMeshAsync("", "", finalGLTF, this.scene);
        useScene().setHierarchy(this.scene.rootNodes);
        return result;
    }
}