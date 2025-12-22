import { zip, strToU8, AsyncZippable, unzip, strFromU8, unzipSync, Unzipped } from 'fflate';

/**
 * 文件条目类型
 * [文件名（包含路径，如 'folder/file.txt'）, 文件内容]
 */
export type ZipFile = [string, Blob | ArrayBuffer | string | Uint8Array];

/**
 * 将一组文件压缩成 ZIP
 * @param files 要压缩的文件列表
 * @param onProgress 进度回调，值范围 0~1
 * @returns Promise<Uint8Array> 压缩后的 ZIP 数据
 */
export async function zipFiles(
  files: ZipFile[],
  onProgress?: (progress: number) => void,
): Promise<Uint8Array> {
  // 1. 先把所有文件内容统一转换成 Uint8Array
  const zippable: AsyncZippable = {};

  for (let i = 0; i < files.length; i++) {
    const [name, content] = files[i];

    let data: Uint8Array;

    if (typeof content === 'string') {
      // 字符串 → Uint8Array（UTF-8 编码）
      data = strToU8(content);
    } else if (content instanceof Blob) {
      // Blob → ArrayBuffer → Uint8Array
      const arrayBuffer = await content.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
    } else if (content instanceof ArrayBuffer) {
      data = new Uint8Array(content);
    } else if (content instanceof Uint8Array) {
      data = content;
    } else {
      // 兜底（理论上不会走到这里）
      throw new Error(`Unsupported content type for file "${name}"`);
    }

    zippable[name] = data;

    // 报告进度（基于已处理的文件数量）
    if (onProgress) {
      onProgress((i + 1) / files.length);
    }
  }

  // 2. 使用 fflate 的异步 zip（内部会自动使用 Web Worker 多线程加速）
  return new Promise<Uint8Array>((resolve, reject) => {
    zip(
      zippable,
      {
        level: 6,
        mem: 8,
      },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      },
    );
  });
}

export async function readZip(file: ArrayBuffer | Uint8Array | Blob) {
  if (file instanceof ArrayBuffer) {
    file = new Uint8Array(file);
    return unzipSync(file);
  } else if (file instanceof Uint8Array) {
    return unzipSync(file);
  } else if (file instanceof Blob) {
    const arrayBuffer = await file.arrayBuffer();
    file = new Uint8Array(arrayBuffer);
    return unzipSync(file);
  }
}

export async function readZipAsync(file: ArrayBuffer | Uint8Array | Blob) {
  return new Promise<Unzipped>(async (resolve, reject) => {
    if (file instanceof ArrayBuffer) {
      file = new Uint8Array(file);
      return unzip(file, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    } else if (file instanceof Uint8Array) {
      return unzip(file, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    } else if (file instanceof Blob) {
      const arrayBuffer = await file.arrayBuffer();
      file = new Uint8Array(arrayBuffer);
      return unzip(file, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    }
  });
}
