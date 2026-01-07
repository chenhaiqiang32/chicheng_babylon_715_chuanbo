export class Clock {
  private startTime = 0;
  private oldTime = 0;
  elapsedTime = 0;
  private running = false;
  private autoStart = true;

  start() {
    this.startTime = performance.now();
    this.oldTime = this.startTime;
    this.elapsedTime = 0;
    this.running = true;
  }

  stop() {
    this.getElapsedTime();
    this.running = false;
    this.autoStart = false;
  }

  getElapsedTime() {
    this.getDelta();
    return this.elapsedTime;
  }

  getDelta() {
    let diff = 0;

    if (this.autoStart && !this.running) {
      this.start();
      return 0;
    }

    if (this.running) {
      const newTime = performance.now();

      diff = (newTime - this.oldTime) / 1000;
      this.oldTime = newTime;

      this.elapsedTime += diff;
    }

    return diff;
  }
}

export namespace Timer {
  export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class TimeController {
  private clock = new Clock();
  private animationFrameId = 0;
  constructor(
    private maxTime: number,
    private onUpdate?: (deltaTime: number) => void,
    private loop = false,
    private onComplete?: () => void,
  ) {
    this.clock.start();
    this.update();
  }

  update = () => {
    this.clock.getDelta();
    this.onUpdate?.(this.clock.elapsedTime);
    if (this.clock.elapsedTime >= this.maxTime) {
      if (this.loop) {
        this.clock.start();
      } else {
        this.dispose();
        this.onComplete?.();
      }
    }
    this.animationFrameId = requestAnimationFrame(this.update);
  };

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
  }
}
