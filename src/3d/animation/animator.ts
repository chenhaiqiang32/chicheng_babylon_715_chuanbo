import { Quaternion } from '@babylonjs/core';
import { CC } from '../assets/BaseRes';
import { Editor } from '../Editor';
interface RuntimeClip {
  object: any;
  clip: CC.Clip;
}
export class Animator {
  constructor(private animation: CC.Animation) {}

  private clips: RuntimeClip[];
  updateClip() {
    this.clips = [];
    for (let index = 0; index < this.animation.clips.length; index++) {
      const clip = this.animation.clips[index];
      const obj = Editor.Instance.getNodeById(clip.objectUuid);
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
      const value = lerpValue(startKey.value, endKey.value, percent, clip.clip.type);
      if (clip.clip.type == 'v3') {
      }
    }
  }
}
let q1 = new Quaternion();
let q2 = new Quaternion();
function lerpValue(start: any, end: any, percent: number, type: string) {
  if (type == 'number') {
    return start + (end - start) * percent;
  } else if (type == 'v3') {
    const x = lerp(start[0], end[0], percent);
    const y = lerp(start[1], end[1], percent);
    const z = lerp(start[2], end[2], percent);
    return [x, y, z];
  } else if (type == 'quaternion') {
    q1.fromArray(start);
    q2.fromArray(end);
    Quaternion.Slerp(q1, q2, percent);
    return [q1.x, q1.y, q1.z, q1.w];
  } else {
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
