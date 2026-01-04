export class FSFileSystem {
  name: string;
  rootPath: string;
  constructor(name: string) {
    this.name = name;
  }
  init(arg?: string): Promise<void> {
    return Promise.resolve();
  }
  getFileArrayBuffer(name: string, dir?: string) {
    // const filePath =
    // return new Promise((resolve, reject) => {
    //   this.fs.readFile(filePath, (err, data) => {
    //     if (err) {
    //       reject(err);
    //     } else {
    //       resolve(data);
    //     }
    //   });
    // });
  }
  getFileText(name: string, dir?: string) {}
  saveFile(name: string, data: FileSystemWriteChunkType, dir?: string) {}
}
