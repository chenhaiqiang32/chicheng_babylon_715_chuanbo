import { AbstractEngine, Engine, WebGPUEngine } from '@babylonjs/core';

export class App {
  private engine: AbstractEngine;
  private static instance: App;

  static get Instance(): App {
    if (!this.instance) {
      this.instance = new App();
    }
    return this.instance;
  }

  async init(canvas: HTMLCanvasElement, gpu: boolean) {
    if (gpu) {
      this.engine = new WebGPUEngine(canvas, {
        adaptToDeviceRatio: true,
        limitDeviceRatio: 2,
      });
      if (this.engine instanceof WebGPUEngine) {
        await this.engine.initAsync();
      }
    } else {
      this.engine = new Engine(canvas, true, {
        adaptToDeviceRatio: true,
        limitDeviceRatio: 2,
      });
    }
  }
}
