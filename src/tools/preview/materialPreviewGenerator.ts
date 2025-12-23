import { Color4, CubeTexture, DirectionalLight, Engine, FreeCamera, HemisphericLight, Material, Mesh, MeshBuilder, RenderTargetTexture, Scene, ScreenshotTools, StandardMaterial, Tools, Vector3 } from "@babylonjs/core";


/**
 * 材质预览生成器
 */
export class materialPreviewGenerator {
    private engine:Engine;
    private scene:Scene;
    private camera:FreeCamera;
    private sphere:Mesh;
    private rtt:RenderTargetTexture;
    private size:number;

    private cache:Map<string, string>;

    constructor(engine:Engine, size = 256){
        console.log("init");
        this.engine = engine;
        this.size = size;

        this.scene = new Scene(engine);
        this.scene.clearColor = new Color4(0,0,0,0);

        this.setCamera();
        this.setLight();
        this.setEnvironment();
        this.sphere = this.createSphere();
        this.rtt = this.createRtt();
        this.cache = new Map();
    }


    async render(material:Material, useCache = true): Promise<string> {
        // 默认使用缓存
        if(useCache){
            const url = this.checkMatCache(material.uuid);
            if(url){
                //console.log("use cache");
                return url;
            }
        }

        //console.log("render");
        // 材质依赖场景，需要手动修改
        const mat = material.clone(material.name + "preview");
        mat._scene = this.scene;
        this.sphere.material = mat;

        return new Promise((resolve) => {
            Tools.CreateScreenshotUsingRenderTarget(
                this.engine,
                this.camera,
                this.size,
                (data) => {
                    mat.dispose();
                    this.cache.set(material.uuid, data);
                    resolve(data);
                },
                'image/png'
            )
        });
    }

    /**
     * 检查是否在缓存中
     * @param matUuid 
     * @returns 预览图的data
     */
    checkMatCache(matUuid:string):string | null{
        if(this.cache.has(matUuid))
            return this.cache.get(matUuid);
        return null;
    }


    private setCamera()
    {
        this.camera = new FreeCamera(
            "MaterialPreviewCamera",
            new Vector3(0,0,-2),
            this.scene
        );

        this.scene.activeCamera = this.camera;
    }

    private setLight()
    {
        const hemi = new HemisphericLight(
            "hemi",
            new Vector3(0, 1, 0),
            this.scene
        );
        hemi.intensity = 0.6;

        const dir = new DirectionalLight(
          "dir",
          new Vector3(-1, -2, -1),
          this.scene
        );
        dir.position = new Vector3(2, 4, 2);
        dir.intensity = 0.8;
    }

    private createSphere()
    {
        const sphere = MeshBuilder.CreateSphere(
            "sphere",
            {diameter:1, segments: 32},
            this.scene
        )
        return sphere;
    }

    private setEnvironment()
    {
        // PBR材质需要环境光
        this.scene.createDefaultEnvironment();
        this.scene.environmentIntensity = 1.0;
    }

    private createRtt()
    {
        const rtt = new RenderTargetTexture(
            "rtt",
            this.size,
            this.scene,
            false
        );
        rtt.renderList = [this.sphere];
        rtt.clearColor = new Color4(0.2, 0.2, 0.2, 1);
        rtt.render();
        return rtt;
    }

    dispose() {
    }
}