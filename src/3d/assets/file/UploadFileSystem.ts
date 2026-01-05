// import { IFile } from './IFile';

// const rootPath = 'http://localhost:3000/upload';
// const rootPaths = 'http://localhost:3000/download';
// export class UploadFileSystem implements IFile {
//   name: string;
//   async init(arg?: string): Promise<void> {
//     this.name = arg || '456';
//   }
//   async getFileArrayBuffer(fileName: string, dir?: string) {
//     const dirPath = dir ? `${rootPaths}/${this.name}/${dir}` : `${rootPaths}/${this.name}`;
//     const response = await fetch(`${dirPath}/${fileName}`);
//     if (response.ok) {
//       const arrayBuffer = await response.arrayBuffer();
//       return new Uint8Array(arrayBuffer);
//     }
//     return null;
//   }
//   async getFileText(fileName: string, dir?: string) {
//     const dirPath = dir ? `${rootPaths}/${this.name}/${dir}` : `${rootPaths}/${this.name}`;
//     const response = await fetch(`${dirPath}/${fileName}`);
//     if (response.ok) {
//       const text = await response.text();
//       return text;
//     }
//     return '';
//   }
//   async saveFile(fileName: string, data: FileSystemWriteChunkType, dir?: string) {
//     const formData = new FormData();
//     formData.append('file', new Blob([data]), fileName);
//     const response = await fetch(`${rootPath}?folder=${this.name}` + dir ? `/${dir}` : '', {
//       method: 'POST',
//       body: formData,
//     });
//   }
// }
