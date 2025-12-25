import { Editor } from "@/3d/Editor";
import { RuntimeLibrary } from "@/3d/assets/runtimeLibrary";
import { Utils } from "@/utils";
import { BaseTexture, CubeTexture, EXRCubeTexture, HDRCubeTexture, Scene } from "@babylonjs/core";

/**
 * 将环境贴图导入为贴图资产
 */
export async function importSkyboxTexture(){
    const scene = Editor.Instance.Scene;
    const fileList = await Utils.chooseFile(".hdr,.exr,.env", true);
    for(let i=0; i<fileList.length; i++){
        const item = fileList[i];
        await RuntimeLibrary.Instance.importTexture(item);
    }
}

/**
 * 将环境贴图应用到当前场景的天空盒上
 * @param name 环境贴图的名字，需要根据其后缀判断贴图类型
 * @param sourceUUID 环境贴图资源在RuntimeLibrary里面的uuid
 */
export async function loadSkyBox(scene:Scene, name:string, sourceUUID:string){
    if(name == undefined || sourceUUID == undefined) return;
    const ext = name.toLowerCase().split('.').pop();
    const url = await RuntimeLibrary.Instance.getTextureURL(sourceUUID);
    switch(ext){
        case 'hdr':
            const hdr = await loadHdrSkybox(scene, url, 1024);
            // todo:这里会导致创建一个skybox的material，而被RuntimeLibrary.material收集
            const skyBox = scene.createDefaultSkybox(hdr, true);
            scene.environmentTexture.name = name;
            scene.environmentTexture.uuid = sourceUUID;
            skyBox.isSkyBox = true;
            break;
        case 'exr':
            const exr = await loadExrSkybox(scene, url, 1024);
            scene.createDefaultSkybox(exr, true);
            break;
        case 'env':
            const env = await loadEnvSkybox(scene, url);
            scene.createDefaultSkybox(env, true);
            break;

        default:
            console.error(`Unsupported file extension: ${ext}`);
            break;
    }
}

export function loadSkyboxWithExt(scene:Scene, url:string, ext:string, size:number):Promise<BaseTexture>{
    switch(ext){
        case "hdr":
            return loadHdrSkybox(scene, url, size);

        case "exr":
            return loadExrSkybox(scene, url, size);
        
        case "env":
            return loadEnvSkybox(scene, url);
    }
}

function loadHdrSkybox(scene:Scene, url:string, size=128):Promise<BaseTexture>{
    const hdr = new HDRCubeTexture(url, scene, size);
    return new Promise((resolve) => {
        hdr.onLoadObservable.addOnce(() => {
            resolve(hdr);
        })
    })
}

function loadExrSkybox(scene:Scene, url:string, size=128):Promise<BaseTexture>{
    const exr = new EXRCubeTexture(url, scene, size);
    return new Promise((resolve) => {
        exr.onLoadObservable.addOnce(() => {
            resolve(exr);
        })
    })
}

function loadEnvSkybox(scene:Scene, url:string):Promise<BaseTexture>{
    const envTexture = CubeTexture.CreateFromPrefilteredData(url, scene, ".env");
    return new Promise((resolve) => {
        envTexture.onLoadObservable.addOnce(() => {
            resolve(envTexture)
        })
    })
}