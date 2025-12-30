import { Color4, Scene, Texture } from "@babylonjs/core";
import { CC } from "../BaseRes";
import { RuntimeLibrary } from "../RuntimeLibrary";
import { loadImageBG, loadSkyBox } from "@/3d/core/utils/EnvSkybox";

/**
 * 背景环境序列化
 */
export interface BackgroundEnv {
    serialize(scene: Scene) : Promise<CC.Scene['background']>;
    deserialize(scene: Scene, data: CC.Scene): void;
}

export class NoneBgEnv implements BackgroundEnv {
    serialize(scene: Scene): Promise<CC.Scene['background']> {
        return Promise.resolve({
            type: 0,
            texture: null,
            clearColor: [],
        })
    }
    deserialize(scene: Scene, sceneData: CC.Scene){
    }
}

export class TextureBgEnv implements BackgroundEnv {
    serialize(scene: Scene): Promise<CC.Scene['background']> {
        return Promise.resolve({
            type: 1,
            texture: {
                name: scene.bgTexture?.name || '',
                sourceUUID: scene.bgTexture?.sourceUUID || '',
                uuid: ""
            },
            clearColor: [],
        })
    }
    deserialize(scene: Scene, sceneData: CC.Scene){
        if(sceneData.background.texture){
            loadSkyBox(scene, sceneData.background.texture.name, sceneData.background.texture.sourceUUID);
        }
    }
}

export class ColorBgEnv implements BackgroundEnv {
    serialize(scene: Scene): Promise<CC.Scene['background']> {
        return Promise.resolve({
            type: 4,
            texture: null,
            clearColor: scene.clearColor.asArray()
        })
    }
    deserialize(scene: Scene, sceneData: CC.Scene): void {
        scene.clearColor = new Color4(...sceneData.clearColor);
    }
}

export class ImageBgEnv implements BackgroundEnv {
    async serialize(scene: Scene): Promise<CC.Scene["background"]> {
        const data = await RuntimeLibrary.Instance.addTexture(scene.bgTexture);
        return {
            type: 2,
            texture: {
                name: data.name,
                sourceUUID: data.sourceUUID,
                uuid:  data.uuid
            },
            clearColor: [],
        }
    }
    deserialize(scene: Scene, sceneData: CC.Scene){
        const uuid = sceneData.background.texture.uuid;
        if(uuid){
            RuntimeLibrary.Instance.getTexture(uuid).then((texture) => {
                loadImageBG(texture as Texture, scene);
            })
        }
    }
}

/** -----------工厂------------- */
export class BackgroundEnvFactory {
    private static strategies: Map<number, BackgroundEnv> = new Map([
        [1, new TextureBgEnv()],
        [2, new ImageBgEnv()]
        // todo: 添加其他类型
    ]);

    static create(type: number): BackgroundEnv {
        const strategy = this.strategies.get(type);
        if(!strategy) {
            return new NoneBgEnv();
        }
        return strategy;
    }

    static createFromScene(type: number): BackgroundEnv {
        return this.create(type);
    }
}