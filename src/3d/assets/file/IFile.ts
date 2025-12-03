import { ElMessage, ElMessageBox } from 'element-plus';
import { IndexDBFileSystem } from './IndexDBFileSystem';
import { LocalFileSystem } from './LocalFileSystem';
import { useDialog } from '@/view/dialog';
import ChooseSaveModeDialog from '@/view/dialog/ChooseSaveModeDialog.vue';

export interface IFile {
  name: string;
  init(arg?: string): Promise<void>;
  getFileArrayBuffer(name: string, dir?: string): Promise<ArrayBuffer>;
  getFileText(name: string, dir?: string): Promise<string>;
  saveFile(name: string, data: ArrayBuffer | string | Blob, dir?: string): void;
}

export enum FileMode {
  NONE,
  LOCAL,
  INDEXEDDB,
  OSS,
}

export class EditorFileSystem {
  static fileSystem: EditorFileSystem;
  file: IFile;
  name: string;
  static get Instance() {
    if (!EditorFileSystem.fileSystem) {
      EditorFileSystem.fileSystem = new EditorFileSystem();
    }
    return EditorFileSystem.fileSystem;
  }
  async init(mode: FileMode, arg?: string) {
    switch (mode) {
      case FileMode.LOCAL:
        this.file = new LocalFileSystem();
        break;
      case FileMode.INDEXEDDB:
        this.file = new IndexDBFileSystem();
        break;
    }
    if (this.file) {
      await this.file.init(arg);
      this.name = this.file.name;
    }
  }
  saveFile(name: string, data: ArrayBuffer | string | Blob, dir?: string) {
    if (this.file) {
      this.file.saveFile(name, data, dir);
    }
  }
  async check() {
    if (!this.file) {
      const result = await new Promise<FileMode>((resolve, reject) => {
        useDialog(ChooseSaveModeDialog, {
          onChooseMode: (mode: FileMode) => {
            resolve(mode);
          },
        });
      });
      if (result === FileMode.NONE) {
        ElMessage.error('未选择文件系统');
        return Promise.reject('未选择文件系统');
      } else if (result === FileMode.INDEXEDDB) {
        const dbName = await ElMessageBox.prompt('请输入名称', '项目名称名称', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: '',
        });
        await this.init(FileMode.INDEXEDDB, dbName.value);
      } else if (result === FileMode.LOCAL) {
        await this.init(result);
      }
    }
    return Promise.resolve();
  }
}
