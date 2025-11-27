import { v4 } from 'uuid';

export namespace ID {
  export function generateUUID() {
    return v4();
  }
}
