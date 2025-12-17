import { Clock } from '@/utils/Time';
import { UNIT } from './Const';

export class TimeControls {
  public normalLine: HTMLElement;

  private time = 0;
  private scale = 1;
  private isPlaying = false;
  private offsetLeft = 0;
  private clock = new Clock();
  private timeChangedCallback: (time: number) => void;
  public animationMaxTime = 0;
  private playSpeed = 1;

  get speed() {
    return this.playSpeed;
  }
  set speed(value: number) {
    this.playSpeed = value;
  }

  get currentTime() {
    return this.time;
  }
  set currentTime(value: number) {
    if (this.timeChangedCallback && value != this.time) {
      this.timeChangedCallback(value);
    }
    this.time = value;
    this.normalLine.style.left = this.time * UNIT * this.scale - 1 + 'px';
  }

  setTimeChanged(callback: (time: number) => void) {
    this.timeChangedCallback = callback;
  }

  constructor(private dom: HTMLElement) {
    this.normalLine = document.createElement('div');
    this.normalLine.style.position = 'absolute';
    this.normalLine.style.left = this.time * UNIT * this.scale + 'px';
    this.normalLine.style.top = '0px';
    this.normalLine.style.width = '2px';
    this.normalLine.style.height = '100%';
    this.normalLine.style.backgroundColor = '#ff0000';
    this.normalLine.style.cursor = 'ew-resize';
    this.normalLine.style.borderRadius = '999px';
    dom.appendChild(this.normalLine);
    this.normalLine.addEventListener('mousedown', this.onMouseDown);
    this.resize();
  }

  private onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp, {
      once: true,
    });
  };

  private onMouseMove = (e: MouseEvent) => {
    let left = e.clientX - this.offsetLeft + this.dom.scrollLeft;
    if (left < 0) {
      left = 0;
    }
    this.currentTime = left / UNIT / this.scale;
  };

  private onMouseUp = () => {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.body.style.cursor = 'default';
  };
  setScale(value: number) {
    this.scale = value;
    this.normalLine.style.left = this.time * UNIT * this.scale + 'px';
  }
  resize() {
    const rect = this.dom.getBoundingClientRect();
    this.offsetLeft = rect.left;
  }

  pause() {
    this.isPlaying = false;
  }
  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
  }
  play() {
    this.isPlaying = true;
    this.clock.start();
  }

  update() {
    const delta = this.clock.getDelta();
    if (this.isPlaying) {
      if (this.currentTime >= this.animationMaxTime) {
        this.currentTime = 0;
      }
      this.currentTime += delta * this.playSpeed;
    }
  }

  dispose() {
    this.normalLine.remove();
  }
}
