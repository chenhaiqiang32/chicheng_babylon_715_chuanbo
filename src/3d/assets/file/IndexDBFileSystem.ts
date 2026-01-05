import { IFile } from './IFile';
import { IndexedDBClient } from '@/utils/IndexDB';
export class IndexDBFileSystem implements IFile {
  db: IndexedDBClient;
  name: string;

  async init(name: string) {
    this.db = new IndexedDBClient(name);
    this.name = name;
    await this.db.open();
  }
  async saveFile(name: string, data: FileSystemWriteChunkType, dir?: string) {
    console.log('saveFile', name, data, dir);
    await this.db.saveData(dir ? `${dir}/${name}` : name, data);
  }
  getFileArrayBuffer(name: string, dir?: string): Promise<Uint8Array> {
    return this.db.loadData(dir ? `${dir}/${name}` : name);
  }
  getFileText(name: string, dir?: string): Promise<string> {
    return this.db.loadData(dir ? `${dir}/${name}` : name);
  }
  clear() {
    this.db.close();
  }
}
