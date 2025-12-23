import { Editor } from "@/3d/Editor";
import { RuntimeLibrary } from "@/3d/assets/runtimeLibrary";
import { Utils } from "@/utils";
import { CubeTexture, EXRCubeTexture, EnvironmentTextureTools, HDRCubeTexture, Scene } from "@babylonjs/core";


export class EnvFileHelper{
    /**
     * 将天空盒的贴图导入为资产
     */
    async importSkyboxTexture(){
        const scene = Editor.Instance.Scene;
        const fileList = await Utils.chooseFile(".hdr,.exr,.env", true);
        for(let i=0; i<fileList.length; i++){
            const item = fileList[i];
            await RuntimeLibrary.Instance.importTexture(item);
        }
    }

    /**
     * 根据选择文件类型加载对应环境贴图并渲染为天空盒
     * 目前只支持 hdr, exr, env 三种格式
     */
    async loadSkyBox(){
        const scene = Editor.Instance.Scene;
        const fileList = await Utils.chooseFile(".hdr,.exr,.env");
        if(fileList && fileList.length > 0){
            const file = fileList[0];
            const extension = file.name.split('.').pop();
            switch(extension){
                case 'hdr':
                    this.loadHdrSkybox(file, scene);
                    break;
                case 'exr':
                    this.loadExrSkybox(file, scene);
                    break;
                case 'env':
                    this.loadEnvSkybox(file, scene);
                    break;

                default:
                    console.error(`Unsupported file extension: ${extension}`);
                    break;
            }
        }
    }

    private loadHdrSkybox(file:File, scene:Scene){
        var url = URL.createObjectURL(file);
        const hdr = new HDRCubeTexture(url, scene, 1024, false, true, false, true, () => {
            scene.createDefaultSkybox(hdr, true);
        });
    }

    private loadExrSkybox(file:File, scene:Scene){
        var url = URL.createObjectURL(file);
        const exr = new EXRCubeTexture(url, scene, 1024, false, true, false, true, () => {
            scene.createDefaultSkybox(exr, true);
        });
    }

    private loadEnvSkybox(file:File, scene:Scene){
        var url = URL.createObjectURL(file);
        const envTexture = CubeTexture.CreateFromPrefilteredData(url, scene, ".env");
        scene.createDefaultSkybox(envTexture, true);
    }
}