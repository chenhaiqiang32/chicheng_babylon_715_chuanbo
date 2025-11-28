export namespace Utils {
  export function downloadFile(content: string, fileName: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content]));
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const input = document.createElement('input');
  export function chooseFile(accept?: string, multiple?: boolean) {
    return new Promise<FileList>((resolve, reject) => {
      input.type = 'file';
      input.accept = accept ?? '';
      input.multiple = multiple ?? false;
      input.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files;
        if (file) {
          resolve(file);
        } else {
          reject(new Error('No file selected'));
        }
      });
      input.click();
    });
  }
}
