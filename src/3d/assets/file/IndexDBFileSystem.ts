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
    await this.db.saveData(dir ? `${dir}/${name}` : name, data);
  }
  async getFileArrayBuffer(name: string, dir?: string): Promise<Uint8Array> {
    const data = await this.db.loadData(dir ? `${dir}/${name}` : name);
    return data;
  }
  async getFileText(name: string, dir?: string): Promise<string> {
    const data = await this.db.loadData(dir ? `${dir}/${name}` : name);
    return data;
  }
  clear() {
    this.db.close();
  }
}
