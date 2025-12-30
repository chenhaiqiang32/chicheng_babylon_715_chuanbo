import { Editor } from "@/3d/Editor";
import { RuntimeLibrary } from "@/3d/assets/runtimeLibrary";
import { Utils } from "@/utils";
import { BaseTexture, CreateBox, CubeTexture, EXRCubeTexture, HDRCubeTexture, Layer, Mesh, Nullable, PBRMaterial, Scene, StandardMaterial, Texture, Vector2 } from "@babylonjs/core";

let hdrSkybox: Mesh;
let bgImageLayer: Layer;

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
    let skyBox;
    switch(ext){
        case 'hdr':
            const hdr = await loadHdrSkybox(scene, url, 1024);
            skyBox = createSkybox(hdr, scene);
            break;
        case 'exr':
            const exr = await loadExrSkybox(scene, url, 1024);
            skyBox = createSkybox(exr, scene);
            break;
        case 'env':
            const env = await loadEnvSkybox(scene, url);
            skyBox = createSkybox(env, scene);
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

/**
 * 由于bjs的 createDefaultSkybox 会改变 environmentTexture 属性，所以实现一个只创建skybox网格的
 */
function createSkybox(texture:BaseTexture, scene:Scene, pbr = false, scale = 1000, blur = 0, setGlobalEnvTexture = true) : Nullable<Mesh> {
    /// Skybox
    closeEnv();
    hdrSkybox = CreateBox("hdrSkyBox", { size: scale }, scene);
    if (pbr) {
        const hdrSkyboxMaterial = new PBRMaterial("skyBox", scene);
        hdrSkyboxMaterial.backFaceCulling = false;
        hdrSkyboxMaterial.reflectionTexture = texture;
        if (hdrSkyboxMaterial.reflectionTexture) {
            hdrSkyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        }
        hdrSkyboxMaterial.microSurface = 1.0 - blur;
        hdrSkyboxMaterial.disableLighting = true;
        hdrSkyboxMaterial.twoSidedLighting = true;
        hdrSkybox.material = hdrSkyboxMaterial;
    } else {
        const skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = texture;
        if (skyboxMaterial.reflectionTexture) {
            skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        }
        skyboxMaterial.disableLighting = true;
        hdrSkybox.material = skyboxMaterial;
    }
    hdrSkybox.isPickable = false;
    hdrSkybox.infiniteDistance = true;
    hdrSkybox.ignoreCameraMaxZ = true;
    // 标记为isSkyBox不被序列化
    hdrSkybox.isSkyBox = true;
    return hdrSkybox;
}

export function loadImageBG(tex:Texture, scene:Scene) {
    closeEnv();
    const bgTex = new Texture(
        tex.url,
        scene,
        false,
        false,
        Texture.TRILINEAR_SAMPLINGMODE);

    // 创建一个背景 layer
    bgImageLayer = new Layer(
        "bgImage",
        bgTex.url,
        scene,
        true);
}

export function closeEnv(){
    if(hdrSkybox){
        hdrSkybox.dispose();
        hdrSkybox = null;
    }
    if(bgImageLayer) {
        bgImageLayer.dispose();
        bgImageLayer = null;
    }
}