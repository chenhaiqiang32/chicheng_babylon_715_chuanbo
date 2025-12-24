import { CubeTexture, Texture, ColorGradingTexture } from '@babylonjs/core';

import { isTexture } from '@/tools/guards/texture';
import { projectConfiguration, joinPaths, getDirname } from '@/tools/configuration';

// 浏览器兼容的 isAbsolute 函数实现
function isAbsolutePath(path: string): boolean {
  // 检查是否为绝对路径（以 / 开头或包含协议如 http://）
  return path.startsWith('/') || path.match(/^[a-zA-Z]+:\/\//) !== null;
}

export function configureImportedTexture<T extends Texture | CubeTexture | ColorGradingTexture>(
  texture: T,
): T {
  if (isAbsolutePath(texture.name)) {
    if (isTexture(texture) && !texture.invertY && !texture._buffer) {
      texture._invertY = true;
      texture.vScale *= -1;
      texture.updateURL(texture.name);
    }

    texture.name = texture.name.replace(joinPaths(getDirname(projectConfiguration.path!), '/'), '');
    texture.url = texture.name;
  }

  return texture;
}
