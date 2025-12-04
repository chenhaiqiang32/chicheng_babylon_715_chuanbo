import gsap from 'gsap';
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

  export function generateName(baseName: string, names: string[]) {
    if (!names.includes(baseName)) {
      return baseName;
    }
    let i = 1;
    while (names.includes(`${baseName} (${i})`)) {
      i++;
    }
    return `${baseName} (${i})`;
  }
  export function animate(event: (n: number) => void, time: number) {
    const v = { v: 0 };
    gsap
      .to(v, {
        duration: time,
        v: 1,
      })
      .eventCallback('onUpdate', () => {
        event?.(v.v);
      });
  }
}
