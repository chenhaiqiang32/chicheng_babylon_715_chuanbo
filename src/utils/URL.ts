interface Item {
  blob: Blob;
  url: string;
  arrayBuffer?: ArrayBuffer;
}

export namespace URLUtils {
  const urls = new Array<Item>();

  export function getBlobURL(blob: Blob) {
    const item = urls.find((item) => item.blob === blob);
    if (item) {
      return item.url;
    }
    const url = URL.createObjectURL(blob);
    urls.push({ blob, url });
    return url;
  }

  export function getArrayBufferURL(ab: ArrayBuffer) {
    const item = urls.find((item) => item.arrayBuffer === ab);
    if (item) {
      return item.url;
    }
    const blob = new Blob([ab]);
    const url = URL.createObjectURL(blob);
    urls.push({ blob, url, arrayBuffer: ab });
    return url;
  }
  export function releaseURL(url: string) {
    const item = urls.find((item) => item.url === url);
    if (item) {
      urls.splice(urls.indexOf(item), 1);
    }
    URL.revokeObjectURL(item.url);
  }
}
