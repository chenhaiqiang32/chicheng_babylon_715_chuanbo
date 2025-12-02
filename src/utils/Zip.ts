import JSZip from 'jszip';

export type ZipFile = [string, Blob | ArrayBuffer | string | Uint8Array | string];

export function zipFiles(files: ZipFile[], onProgress?: (progress: number) => void) {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file[0], file[1]);
  });
  return zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      streamFiles: true,
    },
    (metadata) => {
      if (onProgress && metadata.percent !== undefined) {
        onProgress(metadata.percent);
      }
    },
  );
}

export async function readZip(file: File | Blob) {
  const zip = await JSZip.loadAsync(file);
  return zip;
}
