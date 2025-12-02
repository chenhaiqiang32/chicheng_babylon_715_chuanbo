/**
 * 基于浏览器 File System Access API 的文件系统操作类
 * 支持读写本地文件和文件夹操作
 */
export class FileSystem {
  private static instance: FileSystem;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static get Instance(): FileSystem {
    if (!FileSystem.instance) {
      FileSystem.instance = new FileSystem();
    }
    return FileSystem.instance;
  }

  /**
   * 检查浏览器是否支持 File System Access API
   */
  public isSupported(): boolean {
    return (
      'showOpenFilePicker' in window &&
      'showSaveFilePicker' in window &&
      'showDirectoryPicker' in window
    );
  }

  /**
   * 选择并打开单个文件
   * @param options 文件选择选项
   * @returns 文件句柄
   */
  public async openFile(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle> {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    const [fileHandle] = await (window as any).showOpenFilePicker(options);
    return fileHandle;
  }

  /**
   * 选择并打开多个文件
   * @param options 文件选择选项
   * @returns 文件句柄数组
   */
  public async openFiles(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]> {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    const fileHandles = await (window as any).showOpenFilePicker({
      ...options,
      multiple: true,
    });
    return fileHandles;
  }

  /**
   * 选择文件夹
   * @returns 文件夹句柄
   */
  public async openDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    const directoryHandle = await (window as any).showDirectoryPicker();
    return directoryHandle;
  }

  /**
   * 读取文件内容为字符串
   * @param fileHandle 文件句柄
   * @returns 文件内容字符串
   */
  public async readFileAsText(fileHandle: FileSystemFileHandle): Promise<string> {
    const file = await fileHandle.getFile();
    return await file.text();
  }

  /**
   * 读取文件内容为 Blob
   * @param fileHandle 文件句柄
   * @returns 文件 Blob 对象
   */
  public async readFileAsBlob(fileHandle: FileSystemFileHandle): Promise<Blob> {
    const file = await fileHandle.getFile();
    return file;
  }

  /**
   * 读取文件内容为 ArrayBuffer
   * @param fileHandle 文件句柄
   * @returns 文件 ArrayBuffer
   */
  public async readFileAsArrayBuffer(fileHandle: FileSystemFileHandle): Promise<ArrayBuffer> {
    const file = await fileHandle.getFile();
    return await file.arrayBuffer();
  }

  /**
   * 写入文本文件
   * @param content 文件内容
   * @param options 保存选项
   * @returns 文件句柄
   */
  public async writeTextFile(
    content: string,
    options?: SaveFilePickerOptions,
  ): Promise<FileSystemFileHandle> {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: 'untitled.txt',
      types: [
        {
          description: 'Text files',
          accept: { 'text/plain': ['.txt'] },
        },
      ],
      ...options,
    });

    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    return fileHandle;
  }

  /**
   * 写入二进制文件
   * @param data 二进制数据 (Blob, ArrayBuffer, 或 Uint8Array)
   * @param options 保存选项
   * @returns 文件句柄
   */
  public async writeBinaryFile(
    data: Blob | ArrayBuffer | Uint8Array,
    options?: SaveFilePickerOptions,
  ): Promise<FileSystemFileHandle> {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    const fileHandle = await (window as any).showSaveFilePicker(options);

    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();

    return fileHandle;
  }

  /**
   * 更新已存在的文件
   * @param fileHandle 文件句柄
   * @param content 新内容
   */
  public async updateFile(
    fileHandle: FileSystemFileHandle,
    content: FileSystemWriteChunkType,
  ): Promise<void> {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  /**
   * 递归读取文件夹内所有文件和子文件夹
   * @param directoryHandle 文件夹句柄
   * @returns 文件和文件夹信息数组
   */
  public async readDirectoryRecursive(
    directoryHandle: FileSystemDirectoryHandle,
  ): Promise<FileSystemItem[]> {
    const items: FileSystemItem[] = [];
    // @ts-ignore
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        items.push({
          name,
          kind: 'file',
          handle: handle as FileSystemFileHandle,
          size: file.size,
          lastModified: file.lastModified,
          type: file.type,
        });
      } else if (handle.kind === 'directory') {
        const subItems = await this.readDirectoryRecursive(handle as FileSystemDirectoryHandle);
        items.push({
          name,
          kind: 'directory',
          handle: handle as FileSystemDirectoryHandle,
          children: subItems,
        });
      }
    }

    return items;
  }

  /**
   * 读取文件夹内直接子项（不递归）
   * @param directoryHandle 文件夹句柄
   * @returns 文件和文件夹信息数组
   */
  public async readDirectory(
    directoryHandle: FileSystemDirectoryHandle,
  ): Promise<FileSystemItem[]> {
    const items: FileSystemItem[] = [];

    // @ts-ignore
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        items.push({
          name,
          kind: 'file',
          handle: handle as FileSystemFileHandle,
          size: file.size,
          lastModified: file.lastModified,
          type: file.type,
        });
      } else if (handle.kind === 'directory') {
        items.push({
          name,
          kind: 'directory',
          handle: handle as FileSystemDirectoryHandle,
        });
      }
    }

    return items;
  }

  /**
   * 在指定文件夹中创建新文件
   * @param directoryHandle 文件夹句柄
   * @param fileName 文件名
   * @param content 文件内容
   * @returns 新创建的文件句柄
   */
  public async createFileInDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    fileName: string,
    content: FileSystemWriteChunkType,
  ): Promise<FileSystemFileHandle> {
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    await this.updateFile(fileHandle, content);
    return fileHandle;
  }

  /**
   * 在指定文件夹中创建新文件夹
   * @param directoryHandle 父文件夹句柄
   * @param dirName 文件夹名
   * @returns 新创建的文件夹句柄
   */
  public async createDirectoryInDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    dirName: string,
  ): Promise<FileSystemDirectoryHandle> {
    return await directoryHandle.getDirectoryHandle(dirName, { create: true });
  }

  /**
   * 删除文件夹中的文件或文件夹
   * @param directoryHandle 父文件夹句柄
   * @param name 要删除的文件或文件夹名
   * @param options 删除选项
   */
  public async removeFromDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    name: string,
    options?: { recursive?: boolean },
  ): Promise<void> {
    await directoryHandle.removeEntry(name, options);
  }

  /**
   * 检查文件夹中是否存在指定文件或文件夹
   * @param directoryHandle 文件夹句柄
   * @param name 文件或文件夹名
   * @returns 是否存在
   */
  public async existsInDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    name: string,
  ): Promise<boolean> {
    try {
      await directoryHandle.getFileHandle(name);
      return true;
    } catch {
      try {
        await directoryHandle.getDirectoryHandle(name);
        return true;
      } catch {
        return false;
      }
    }
  }
}

/**
 * 文件系统项目接口
 */
export interface FileSystemItem {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  size?: number;
  lastModified?: number;
  type?: string;
  children?: FileSystemItem[];
}

/**
 * 文件选择器选项类型
 */
export interface OpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: {
    description?: string;
    accept: Record<string, string[]>;
  }[];
}

/**
 * 文件保存选项类型
 */
export interface SaveFilePickerOptions {
  suggestedName?: string;
  excludeAcceptAllOption?: boolean;
  types?: {
    description?: string;
    accept: Record<string, string[]>;
  }[];
}
