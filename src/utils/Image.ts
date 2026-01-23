interface WebPConversionOptions {
  quality?: number; // 0.0 ~ 1.0，等价于 cwebp 的 -q 75-90 左右
  maxWidth?: number; // 0 = 不缩放
  maxHeight?: number;
}
const canvas = document.createElement('canvas');

export async function toWebP(
  fileOrImage: File | Blob | HTMLImageElement | Uint8Array,
  options: WebPConversionOptions = {},
) {
  const {
    quality = 0.8, // 0.0 ~ 1.0，等价于 cwebp 的 -q 75-90 左右
    maxWidth = 0, // 0 = 不缩放
    maxHeight = 0,
  } = options;

  // 支持 File 或已加载的 Image
  let img: HTMLImageElement;
  if (fileOrImage instanceof File || fileOrImage instanceof Blob) {
    const url = URL.createObjectURL(fileOrImage);
    img = await loadImage(url);
    URL.revokeObjectURL(url);
  } else if (fileOrImage instanceof Uint8Array) {
    const blob = new Blob([new Uint8Array(fileOrImage)]);
    const url = URL.createObjectURL(blob);
    img = await loadImage(url);
    URL.revokeObjectURL(url);
  } else {
    img = fileOrImage;
  }

  let { width, height } = img;

  // 可选：等比缩放
  if (maxWidth > 0 && width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }
  if (maxHeight > 0 && height > maxHeight) {
    width = Math.round(width * (maxHeight / height));
    height = maxHeight;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('WebP conversion failed'));
      },
      'image/webp',
      quality,
    );
  });
}

// 辅助：加载图片
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
