export namespace Utils {
  export function downloadFile(content: string, fileName: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content]));
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
