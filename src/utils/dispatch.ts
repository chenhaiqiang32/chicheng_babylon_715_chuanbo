export class Dispatch<T extends {}> {
  private listeners: Map<any, Array<(data: any) => void>> = new Map();

  public dispatch<K extends keyof T>(type: K, data?: T[K]) {
    this.listeners.forEach((listeners, key) => {
      if (key === type) {
        listeners.forEach((listener) => listener(data));
      }
    });
  }

  public on<K extends keyof T>(type: K, callback: (data: T[K]) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.push(callback);
    } else {
      this.listeners.set(type, [callback]);
    }
  }
  public off<K extends keyof T>(type: K, callback: (data: T[K]) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public offAll<K extends keyof T>(type: K) {
    this.listeners.delete(type);
  }

  public dispose() {
    this.listeners.clear();
  }
}

interface EventBus {
  onColorChanged: { key: string; object: any };
  onSliderChanged: { key: string; object: any };
  onBooleanChanged: { key: string; object: any };
  onStringChanged: { key: string; object: any };
  onSceneSaveBefore: void;
  addCameraKeyframe: void;

  onPropertyChanged: { object: any; property: string; type: string; newValue: any; oldValue: any };
}

export const _EventBus = new Dispatch<EventBus>();
