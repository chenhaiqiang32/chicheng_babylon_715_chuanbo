import { ElMessage, ElMessageBox } from 'element-plus';
import { IndexDBFileSystem } from './IndexDBFileSystem';
import { LocalFileSystem } from './LocalFileSystem';
import { useDialog } from '@/view/dialog';
import ChooseSaveModeDialog from '@/view/dialog/ChooseSaveModeDialog.vue';
import { useIndexDBProject } from '@/store/useIndexDBProject';
import { FSFileSystem } from './FSFileSystem';

export interface IFile {
  name: string;
  // 选择默认文件夹
  init(arg?: string): Promise<void>;
  // 获取 二进制数据
  getFileArrayBuffer(name: string, dir?: string): Promise<Uint8Array>;
  // 获取 文本数据
  getFileText(name: string, dir?: string): Promise<string>;
  // 保存文件
  saveFile(name: string, data: FileSystemWriteChunkType, dir?: string): Promise<void>;
}

export enum FileMode {
  NONE,
  LOCAL,
  INDEXEDDB,
  UPLOAD,
  OSS,
}

export class EditorFileSystem {
  static fileSystem: EditorFileSystem;
  file: IFile;
  name: string;

  private _mode: FileMode;
  get mode() {
    return this._mode;
  }
  static get Instance() {
    if (!EditorFileSystem.fileSystem) {
      EditorFileSystem.fileSystem = new EditorFileSystem();
    }
    return EditorFileSystem.fileSystem;
  }
  async init(mode: FileMode, arg?: string) {
    switch (mode) {
      case FileMode.LOCAL:
        this.file = new FSFileSystem();
        break;
      // case FileMode.UPLOAD:
      //   this.file = new UploadFileSystem();
      //   break;
      case FileMode.INDEXEDDB:
        this.file = new IndexDBFileSystem();
        break;
    }
    this._mode = mode;
    if (this.file) {
      await this.file.init(arg);
      this.name = this.file.name;
    }
  }
  async saveFile(name: string, data: ArrayBuffer | string | Blob, dir?: string) {
    if (this.file) {
      await this.file.saveFile(name, data, dir);
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
        return Promise.reject('未选择项目');
      } else if (result === FileMode.INDEXEDDB) {
        const dbName = await ElMessageBox.prompt('请输入名称', '项目名称名称', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: '',
        });
        if (useIndexDBProject().exit(dbName.value)) {
          return Promise.reject('项目名称已存在');
        }
        try {
          await this.init(FileMode.INDEXEDDB, dbName.value);
        } catch (error) {
          this.file = null;
          return Promise.reject(error);
        }
      } else if (result === FileMode.LOCAL) {
        try {
          await this.init(result);
        } catch (error) {
          this.file = null;
          return Promise.reject('打开文件夹失败');
        }
      }
    }
    return Promise.resolve();
  }
}
