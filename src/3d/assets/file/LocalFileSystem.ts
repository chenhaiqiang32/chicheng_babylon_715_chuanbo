import { FileSystem, FileSystemItem } from '@/utils/FileSystem';
import { IFile } from './IFile';
export class LocalFileSystem implements IFile {
  root: FileSystemDirectoryHandle;
  private items: FileSystemItem[] = [];
  private dirs: FileSystemItem[] = [];
  name: string;
  async init() {
    if (this.root) {
      return;
    }
    try {
      this.root = await FileSystem.Instance.openDirectory();
      this.name = this.root.name;
      const children = await FileSystem.Instance.readDirectoryRecursive(this.root);
      children.forEach((item) => getAllFile(item, this.items));
      children.forEach((item) => getAllDir(item, this.dirs));
    } catch (error) {
      throw new Error('打开文件夹失败');
    }
  }
  async saveFile(name: string, data: FileSystemWriteChunkType, dir?: string) {
    const pahts = name.split('/');
    if (pahts.length > 1) {
      this.saveFile(pahts[1], data, pahts[0]);
      return;
    }
    const item = this.items.find((item) => item.name === name);
    if (item) {
      FileSystem.Instance.updateFile(item.handle as FileSystemFileHandle, data);
    } else {
      if (dir) {
        const dirItem = this.dirs.find((item) => item.name === dir);
        if (dirItem) {
          FileSystem.Instance.createFileInDirectory(
            item.handle as FileSystemDirectoryHandle,
            name,
            data,
          );
        } else {
          const result = await FileSystem.Instance.createDirectoryInDirectory(this.root, dir);
          this.dirs.push({
            name,
            kind: 'directory',
            handle: result,
          });
          FileSystem.Instance.createFileInDirectory(result, name, data);
        }
      } else {
        FileSystem.Instance.createFileInDirectory(this.root, name, data);
      }
    }
  }
  getFileArrayBuffer(name: string, dir?: string): Promise<ArrayBuffer> {
    const item = this.items.find((item) => item.name === name);
    if (!item) {
      console.warn(`File ${name} not found`);
      return Promise.resolve(null);
    }
    return FileSystem.Instance.readFileAsArrayBuffer(item.handle as FileSystemFileHandle);
  }
  getFileText(name: string, dir?: string): Promise<string> {
    const item = this.items.find((item) => item.name === name);
    if (!item) {
      console.warn(`File ${name} not found`);
      return Promise.resolve(null);
    }
    return FileSystem.Instance.readFileAsText(item.handle as FileSystemFileHandle);
  }
  clear() {
    this.items = [];
    this.dirs = [];
    this.root = null;
  }
}

function getAllFile(fileSystem: FileSystemItem, file: FileSystemItem[] = []) {
  if (fileSystem.kind == 'directory') {
    fileSystem.children.forEach((item) => getAllFile(item, file));
  } else {
    file.push(fileSystem);
  }
}

function getAllDir(fileSystem: FileSystemItem, file: FileSystemItem[] = []) {
  if (fileSystem.kind == 'directory') {
    file.push(fileSystem);
    fileSystem.children.forEach((item) => getAllDir(item, file));
  }
}
