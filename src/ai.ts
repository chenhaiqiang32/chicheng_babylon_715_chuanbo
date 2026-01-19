import { ArcRotateCamera } from '@babylonjs/core';
import { Editor } from './3d/Editor';
import { TimeController } from './utils/Time';
import { Animator } from './3d/animation/animator';
import { CC } from './3d/assets/BaseRes';

const jianzhen = {
  name: '减震系统',
  uuid: '277a1b9e-ad4c-4e64-8166-ab01a0c76738',
  clips: [
    {
      name: '车壳%isVisible',
      uuid: '257b2791-868c-494d-89bf-1151de00affb',
      objectUuid: 'de2eae96-475e-45b6-a793-b6a729ee2d3f',
      property: 'isVisible',
      type: 'boolean',
      key: [
        {
          time: 0.425,
          value: false,
        },
      ],
    },
    {
      name: '减震%position',
      uuid: '2399420a-e4a1-4ff9-98af-e8305cbe45de',
      objectUuid: '9b6a89d7-f369-4bf0-b40b-76e769bb32af',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 0.425,
          value: [0.0014144610613584518, 0.5240472555160522, 0.10043548047542572],
        },
        {
          time: 0.825,
          value: [0.0014144610613584518, 1.5219882726669312, 0.10043548047542572],
        },
      ],
    },
    {
      name: '减震弹簧顶部_primitive1%position',
      uuid: 'bc297b28-8d85-4881-8873-cb91abd4b9d6',
      objectUuid: '385bc55a-6dad-4292-931b-77aba646f71c',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0, 0, 0],
        },
        {
          time: 2,
          value: [0, 0.6852014064788818, 0],
        },
      ],
    },
    {
      name: '减震_primitive0%position',
      uuid: 'c5605bb3-ce2e-47c6-8126-434647c5f94f',
      objectUuid: 'd0fa52d7-1e7e-4528-9941-cc65947d4688',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0, 0, 0],
        },
        {
          time: 2,
          value: [0, -0.46399199962615967, 0],
        },
      ],
    },
    {
      name: '减震_primitive1%position',
      uuid: 'bb203682-8d1f-4d7f-a11d-e7fe2fde9da3',
      objectUuid: '7f17bfaa-3d74-4ea0-85a8-bc1a6d522d56',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0, 0, 0],
        },
        {
          time: 2,
          value: [0, 0.37868309020996094, 0],
        },
      ],
    },
    {
      name: '减震_primitive3%position',
      uuid: 'fcf309f2-2080-4266-a6ec-0509e05c5fe8',
      objectUuid: '9972708b-4f34-4dc5-82cc-215af8335113',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0, 0, 0],
        },
        {
          time: 2,
          value: [0, 0, 0.34255731105804443],
        },
      ],
    },
    {
      name: '减震橡胶%position',
      uuid: '46180722-91fc-4082-8364-8a4c81ac738d',
      objectUuid: '91217019-02cd-4d4e-9632-82c702a58ae7',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0.015248866751790047, 0.16572046279907227, 0.0065057724714279175],
        },
        {
          time: 2,
          value: [0.015248866751790047, 0.32667338848114014, 0.0065057724714279175],
        },
      ],
    },
    {
      name: '悬挂弹簧%position',
      uuid: 'b53daeea-0274-43e6-92f7-a11ef94a4ef3',
      objectUuid: '537bc908-0662-4d98-86a5-3a4a3d5ca33b',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0.015248861163854599, 0.188673198223114, 0.004654139280319214],
        },
        {
          time: 2,
          value: [0.015248861163854599, 0.0017279386520385742, 0.004654139280319214],
        },
      ],
    },
    {
      name: '相机%camera',
      uuid: 'af1cf22e-5521-4966-9636-b4adf93699e7',
      objectUuid: 'camera',
      property: 'camera',
      type: 'camera',
      key: [
        {
          time: 0.675,
          value: {
            alpha: 5.707671551298869,
            beta: 1.3873654738117684,
            radius: 6.24642412587214,
            targetX: 0.09280009120606242,
            targetY: 1.2975948972599411,
            targetZ: -0.11011066431774476,
          },
          easing: 0,
        },
        {
          time: 2.75,
          value: {
            alpha: 2.5291495729705753,
            beta: 1.5593292254351359,
            radius: 6.24948293195403,
            targetX: 0.09280009120606242,
            targetY: 1.2975948972599411,
            targetZ: -0.11011066431774476,
          },
          easing: 0,
        },
        {
          time: 4.075,
          value: {
            alpha: 3.564680257272389,
            beta: 1.4440736850117688,
            radius: 4.1478430231546515,
            targetX: 0.09280009120606242,
            targetY: 1.2975948972599411,
            targetZ: -0.11011066431774476,
          },
          easing: 0,
        },
        {
          time: 6.275,
          value: {
            alpha: 3.306167170808388,
            beta: 0.17936215818168896,
            radius: 4.106653069826411,
            targetX: 0.09280009120606242,
            targetY: 1.2975948972599411,
            targetZ: -0.11011066431774476,
          },
          easing: 0,
        },
      ],
    },
  ],
  loop: true,
};
const zhuliang: any = {
  name: '聚焦底盘',
  uuid: '07510dea-a064-404d-be26-3ea9aebf0947',
  clips: [
    {
      name: '车壳%isVisible',
      uuid: '34db7fb3-3ae7-4a2b-8769-8e46dbbd0416',
      objectUuid: 'de2eae96-475e-45b6-a793-b6a729ee2d3f',
      property: 'isVisible',
      type: 'boolean',
      key: [
        {
          time: 0,
          value: true,
          easing: 0,
        },
        {
          time: 0.475,
          value: false,
          easing: 0,
        },
      ],
    },
    {
      name: '相机%camera',
      uuid: '8a617fe0-aad9-4b79-9bc2-7c408a6352ab',
      objectUuid: 'camera',
      property: 'camera',
      type: 'camera',
      key: [
        {
          time: 0,
          value: {
            alpha: 2.890665131472048,
            beta: 1.2287982397001367,
            radius: 6.415392399942207,
            targetX: 0.0024068688367462525,
            targetY: 0.5482572193931372,
            targetZ: -0.12316584890842455,
          },
          easing: 0,
        },
        {
          time: 0.7,
          value: {
            alpha: 3.129638808528047,
            beta: 0.9434732187209366,
            radius: 2.7028518853840406,
            targetX: -0.033455871526631695,
            targetY: 0.4949199620654113,
            targetZ: 0.11195628226294618,
          },
          easing: 0,
        },
      ],
    },
    {
      name: '主粱_primitive0%material.albedoColor',
      uuid: 'f9d27f93-c5fe-42e8-a310-ff9ab570362e',
      objectUuid: 'a18ffb55-c1fe-4355-8b87-af62b5a71922',
      property: 'material.albedoColor',
      type: 'color3',
      key: [
        {
          time: 0,
          value: [0.10980392156862745, 0.10980392156862745, 0.10980392156862745],
          easing: 0,
        },
        {
          time: 0.775,
          value: [0.996078431372549, 0.2823529411764706, 0.2823529411764706],
          easing: 0,
        },
        {
          time: 1.175,
          value: [0.32941176470588235, 0.3254901960784314, 0.3254901960784314],
          easing: 0,
        },
        {
          time: 1.625,
          value: [0.996078431372549, 0.2823529411764706, 0.2823529411764706],
        },
        {
          time: 2.125,
          value: [0.32941176470588235, 0.3254901960784314, 0.3254901960784314],
        },
        {
          time: 2.65,
          value: [0.996078431372549, 0.2823529411764706, 0.2823529411764706],
        },
        {
          time: 3.2499999999999987,
          value: [0.32941176470588235, 0.3254901960784314, 0.3254901960784314],
        },
        {
          time: 3.8,
          value: [0.996078431372549, 0.2823529411764706, 0.2823529411764706],
        },
        {
          time: 4.35,
          value: [0.32941176470588235, 0.3254901960784314, 0.3254901960784314],
        },
      ],
    },
  ],
  loop: false,
};

window.addEventListener(
  'click',
  (data) => {
    const camera = Editor.Instance.Scene?.activeCamera as ArcRotateCamera;
    if (!camera) return;
    camera.useAutoRotationBehavior = false;
  },
  {
    once: true,
  },
);

window.addEventListener('message', (data) => {
  if (data.data?.type === 'disassemble') {
    if (!Editor.Instance.Scene.runtimeAnimation) {
      Editor.Instance.Scene.runtimeAnimation = [];
    }
    const ani = Editor.Instance.Scene.runtimeAnimation.find((x) => x.uuid === jianzhen.uuid);
    if (ani) {
      playClip(jianzhen.uuid);
      return;
    }
    Editor.Instance.Scene.runtimeAnimation.push(jianzhen);
    playClip(jianzhen.uuid);
    Editor.Instance.dispatch('animationChange');
  } else if (data.data?.type === 'focus') {
    if (!Editor.Instance.Scene.runtimeAnimation) {
      Editor.Instance.Scene.runtimeAnimation = [];
    }
    const ani = Editor.Instance.Scene.runtimeAnimation.find((x) => x.uuid === zhuliang.uuid);
    if (ani) {
      playClip(ani.uuid);
      return;
    }
    Editor.Instance.Scene.runtimeAnimation.push(zhuliang);
    playClip(zhuliang.uuid);
    Editor.Instance.dispatch('animationChange');
  }
});

let timeController: TimeController;
let animator: Animator;
function playClip(uuid: string) {
  animator?.dispose();
  timeController?.dispose();
  timeController = null;
  const anim = Editor.Instance.Scene?.runtimeAnimation.find((x) => x.uuid === uuid) as CC.Animation;
  animator = new Animator(anim);
  animator.updateClip((s) => Editor.Instance.getNodeById(s));
  animator.collectInfo();
  const times = anim.clips.flatMap((x) => x.key.map((v) => v.time));
  const maxTime = Math.max(...times) + 0.5;
  timeController = new TimeController(
    maxTime,
    (deltaTime) => {
      animator.execute(deltaTime);
    },
    false,
    () => {
      // animator.dispose();
    },
  );
}
