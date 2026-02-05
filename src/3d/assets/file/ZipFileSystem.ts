import { readZip, zipFiles } from '@/utils/Zip';
import { IFile } from './IFile';
import { strFromU8, Unzipped } from 'fflate';

const rootPaths = 'https://oss.czy3d.com/czy/temp';
export class ZipFileSystem implements IFile {
  name: string;
  private files: Unzipped;
  async init(arg?: string): Promise<void> {
    const buffer = await (await fetch(`${rootPaths}/${arg}.zip`)).arrayBuffer();
    this.files = await readZip(buffer);
  }
  async getFileArrayBuffer(fileName: string, dir?: string) {
    const file = this.getFile(fileName, dir);
    if (file) {
      return file;
    }
    return null;
  }
  async getFileText(fileName: string, dir?: string) {
    const file = this.getFile(fileName, dir);
    if (file) {
      console.log(file);
      return strFromU8(file);
    }
    return '{}';
  }

  getFile(fileName: string, dir?: string) {
    return this.files[fileName] || this.files[dir + '/' + fileName];
  }
  async saveFile(fileName: string, data: FileSystemWriteChunkType, dir?: string) {}
}
