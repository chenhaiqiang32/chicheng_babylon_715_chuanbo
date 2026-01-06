import { Quaternion, Node } from '@babylonjs/core';
import { CC } from '../assets/BaseRes';
import * as ObjectUtils from '@/tools/property';
import { EasingFunc } from '@/timeLine/keyframe/Easing';
interface RuntimeClip {
  object: any;
  clip: CC.Clip;
}
export class Animator {
  constructor(private animation: CC.Animation) {}

  private clips: RuntimeClip[];

  updateClip(getNode: (id: string) => Node) {
    this.clips = [];
    for (let index = 0; index < this.animation.clips.length; index++) {
      const clip = this.animation.clips[index];
      const obj = getNode?.(clip.objectUuid);
      if (obj) {
        this.clips.push({
          object: obj,
          clip,
        });
      }
    }
  }
  execute(time: number) {
    for (let index = 0; index < this.clips.length; index++) {
      const clip = this.clips[index];
      const { percent, start, end } = getPercent(time, clip.clip.key);
      if (start == -1) {
        continue;
      }
      const keys = clip.clip.key;
      const startKey = keys[start];
      const endKey = keys[end];
      const easingIndex = typeof (startKey as any)?.easing === 'number' ? (startKey as any).easing : 0;
      const easing = EasingFunc[easingIndex] || EasingFunc[0];
      const easedPercent = easing ? easing(percent) : percent;
      const value = lerpValue(startKey.value, endKey.value, easedPercent, clip.clip.type);
      switch (clip.clip.type) {
        case 'float':
        case 'boolean':
          ObjectUtils.setObjectValue(clip.object, clip.clip.property, value);
          break;
        case 'v3':
          setV3Value(clip.object, clip.clip.property, value);
          break;
        case 'quaternion':
          setQuaternionValue(clip.object, clip.clip.property, value);
          break;
        case 'color3':
          setColor3Value(clip.object, clip.clip.property, value);
          break;
      }
    }
  }
  private objectInfos: {
    target: any;
    values: {
      property: string;
      value: any;
      type: string;
    }[];
  }[] = [];
  collectInfo() {
    for (let index = 0; index < this.clips.length; index++) {
      const clip = this.clips[index];
      let infos = this.objectInfos.find((x) => x.target == clip.object);
      if (!infos) {
        infos = {
          target: clip.object,
          values: [],
        };
        this.objectInfos.push(infos);
      }
      const v = infos.values.find((x) => x.property == clip.clip.property);
      if (!v) {
        infos.values.push({
          property: clip.clip.property,
          type: clip.clip.type,
          value: getObjectValue(clip.object, clip.clip.property, clip.clip.type),
        });
      }
    }
  }
  addCollectInfo(object: any, property: string, value: any, type: string) {
    let infos = this.objectInfos.find((x) => x.target == object);
    if (!infos) {
      infos = {
        target: object,
        values: [],
      };
      this.objectInfos.push(infos);
    }
    const v = infos.values.find((x) => x.property == property);
    if (!v) {
      infos.values.push({
        property,
        type,
        value,
      });
    }
  }

  restoreDefault() {
    this.objectInfos.forEach((x) => {
      x.values.forEach((v) => {
        setObjectValue(x.target, v.property, v.type, v.value);
      });
    });
    this.objectInfos.length = 0;
    this.clips.length = 0;
    this.animation = null;
  }

  dispose() {
    this.restoreDefault();
  }
}

let q1 = new Quaternion();
let q2 = new Quaternion();
let q3 = new Quaternion();
function lerpValue(start: any, end: any, percent: number, type: string) {
  if (type == 'float') {
    return start + (end - start) * percent;
  } else if (type == 'v3' || type == 'color3') {
    const x = lerp(start[0], end[0], percent);
    const y = lerp(start[1], end[1], percent);
    const z = lerp(start[2], end[2], percent);
    return [x, y, z];
  } else if (type == 'quaternion') {
    q1.fromArray(start);
    q2.fromArray(end);
    Quaternion.SlerpToRef(q1, q2, percent, q3);
    return [q3.x, q3.y, q3.z, q3.w];
  } else if (type == 'boolean') {
    return percent < 1 ? start : end;
  }
}

function lerp(start: number, end: number, percent: number) {
  return start + (end - start) * percent;
}

function getPercent(time: number, keys: { time: number; value: any }[]) {
  let percent = 0;
  let start = 0;
  let end = 1;
  let find = false;
  for (let index = 0; index < keys.length - 1; index++) {
    const cur = keys[index].time;
    const next = keys[index + 1].time;
    if (index == 0) {
      if (time < cur) {
        percent = 0;
        start = -1;
        end = -1;
        find = true;
        break;
      }
    }
    if (cur <= time && time < next) {
      start = index;
      end = index + 1;
      percent = (time - cur) / (next - cur);
      find = true;
      break;
    }
  }
  if (!find) {
    percent = 1;
    start = keys.length - 1;
    end = keys.length - 1;
  }

  return { percent, start, end };
}
function setV3Value(object: any, property: string, value: any) {
  ObjectUtils.setObjectValue(object, property + '.x', value[0]);
  ObjectUtils.setObjectValue(object, property + '.y', value[1]);
  ObjectUtils.setObjectValue(object, property + '.z', value[2]);
  console.log(object);
}

function setQuaternionValue(object: any, property: string, value: any) {
  ObjectUtils.setObjectValue(object, property + '.x', value[0]);
  ObjectUtils.setObjectValue(object, property + '.y', value[1]);
  ObjectUtils.setObjectValue(object, property + '.z', value[2]);
  ObjectUtils.setObjectValue(object, property + '.w', value[3]);
}
function setColor3Value(object: any, property: string, value: any) {
  ObjectUtils.setObjectValue(object, property + '.r', value[0]);
  ObjectUtils.setObjectValue(object, property + '.g', value[1]);
  ObjectUtils.setObjectValue(object, property + '.b', value[2]);
}

function getObjectValue(obj: any, property: string, type: CC.KeyType) {
  switch (type) {
    case 'v3':
    case 'v2':
    case 'color3':
    case 'quaternion': {
      const value = ObjectUtils.getObjectValue(obj, property);
      return value.asArray();
    }
    case 'boolean':
    case 'float': {
      return ObjectUtils.getObjectValue(obj, property);
    }
  }
}

function setObjectValue(obj: any, property: string, type: string, value: any) {
  switch (type) {
    case 'color3': {
      ObjectUtils.setObjectValue(obj, property + '.r', value[0]);
      ObjectUtils.setObjectValue(obj, property + '.g', value[1]);
      ObjectUtils.setObjectValue(obj, property + '.b', value[2]);
      return;
    }
    case 'v2': {
      ObjectUtils.setObjectValue(obj, property + '.x', value[0]);
      ObjectUtils.setObjectValue(obj, property + '.y', value[1]);
      return;
    }
    case 'v3': {
      ObjectUtils.setObjectValue(obj, property + '.x', value[0]);
      ObjectUtils.setObjectValue(obj, property + '.y', value[1]);
      ObjectUtils.setObjectValue(obj, property + '.z', value[2]);
      return;
    }
    case 'quaternion': {
      ObjectUtils.setObjectValue(obj, property + '.x', value[0]);
      ObjectUtils.setObjectValue(obj, property + '.y', value[1]);
      ObjectUtils.setObjectValue(obj, property + '.z', value[2]);
      ObjectUtils.setObjectValue(obj, property + '.w', value[3]);
      return;
    }
    case 'boolean':
    case 'float': {
      return ObjectUtils.setObjectValue(obj, property, value);
    }
  }
}
