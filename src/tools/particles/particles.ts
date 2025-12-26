import {
  ParticleSystem,
  GPUParticleSystem,
  IParticleSystem,
  AbstractMesh,
  Vector3,
  TransformNode,
  ParticleHelper,
  ParticleSystemSet,
  Scene,
  EngineStore,
  Tools,
  Nullable,
  Color4,
  Texture,
} from '@babylonjs/core';

import { UniqueNumber } from '../../tools/tools';
import { Editor } from '@/3d/Editor';

ParticleSystemSet.BaseAssetsUrl = '/particle';
ParticleHelper.BaseAssetsUrl = '/particle';
export function addParticleSystem(type: string) {
  if (type == 'default') {
    const pos = new TransformNode(type, Editor.Instance.Scene);
    const particleSystem = CreateDefault(pos.position);
    particleSystem.start();
    const set = new ParticleSystemSet();
    set.systems.push(particleSystem);
    pos.particleSystem = set;
    set.emitterNode = pos.position;
    Editor.Instance.UpdateHierarchy();
  } else {
    ParticleHelper.CreateAsync(type, Editor.Instance.Scene).then((set) => {
      const pos = new TransformNode(type, Editor.Instance.Scene);
      set.start();
      pos.particleSystem = set;
      set.systems.forEach((system) => {
        system.particleTexture.sourceUUID = system.particleTexture.name.split('/').pop() || '';
      });
      set.emitterNode = pos.position;
      Editor.Instance.UpdateHierarchy();
    });
  }
  function CreateDefault(
    emitter: Nullable<AbstractMesh | Vector3>,
    capacity: number = 500,
    scene?: Scene,
    useGPU?: boolean,
  ): IParticleSystem {
    let system;
    if (useGPU) {
      system = new GPUParticleSystem('default system', { capacity: capacity }, scene);
    } else {
      system = new ParticleSystem('default system', capacity, scene);
    }
    system.emitter = emitter;
    const textureUrl = Tools.GetAssetUrl('/particle/textures/default/flare.png');
    system.particleTexture = new Texture(textureUrl, system.getScene());
    system.particleTexture.sourceUUID = 'flare.png';
    system.createConeEmitter(0.1, Math.PI / 4);
    // Particle color
    system.color1 = new Color4(1.0, 1.0, 1.0, 1.0);
    system.color2 = new Color4(1.0, 1.0, 1.0, 1.0);
    system.colorDead = new Color4(1.0, 1.0, 1.0, 0.0);
    // Particle Size
    system.minSize = 0.1;
    system.maxSize = 0.1;
    // Emission speed
    system.minEmitPower = 2;
    system.maxEmitPower = 2;
    // Update speed
    system.updateSpeed = 1 / 60;
    system.emitRate = 30;
    system.isDefaultexture = true;
    return system;
  }
}
