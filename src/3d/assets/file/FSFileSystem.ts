import { IFile } from './IFile';

export class FSFileSystem implements IFile {
  name: string;
  rootPath: string;
  async init(arg?: string): Promise<void> {
    const value = await window.electronAPI.init();
    if (value) {
      this.rootPath = value.dir;
    }
  }
  async getFileArrayBuffer(name: string, dir?: string) {
    const buffer = await window.electronAPI.getFileArrayBuffer(
      name,
      dir ? this.rootPath + '/' + dir : this.rootPath,
    );
    if (buffer.data) {
      return buffer.data;
    }
    return null;
  }
  async getFileText(name: string, dir?: string) {
    const text = await window.electronAPI.getFileText(
      name,
      dir ? this.rootPath + '/' + dir : this.rootPath,
    );
    if (text.data) {
      return text.data;
    }
    return '';
  }
  async saveFile(name: string, data: FileSystemWriteChunkType, dir?: string) {
    const path = await window.electronAPI.saveFile(
      name,
      data,
      dir ? this.rootPath + '/' + dir : this.rootPath,
    );
    console.log('saveFile', path);
  }
}
