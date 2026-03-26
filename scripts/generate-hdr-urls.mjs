/**
 * 扫描 public/hdr 目录中的 HDR/EXR 文件（.hdr .exr），
 * 生成 HDR_URLS 数组并写入 src/3d/app/hdrUrls.generated.ts。
 *
 * 在 npm run dev / npm run build 前会自动执行（predev / prebuild）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const hdrDir = path.join(root, 'public', 'hdr');
const outFile = path.join(root, 'src', '3d', 'app', 'hdrUrls.generated.ts');

const HDR_EXT = ['.hdr', '.exr'];

function main() {
  if (!fs.existsSync(hdrDir)) {
    fs.writeFileSync(
      outFile,
      `/** Auto-generated. public/hdr 目录不存在时使用空数组。 */\nexport const HDR_URLS: string[] = [];\n`,
      'utf8',
    );
    console.log('generate-hdr-urls: public/hdr 不存在，已写入空 HDR_URLS');
    return;
  }

  const names = fs.readdirSync(hdrDir);
  const urls = names
    .filter((name) => HDR_EXT.includes(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => `'/hdr/${name}'`);

  const inner = urls.length ? urls.join(',\n  ') + ',' : '';
  const content = `/** Auto-generated from public/hdr. Do not edit. */\nexport const HDR_URLS: string[] = [\n  ${inner}\n];\n`;

  fs.writeFileSync(outFile, content, 'utf8');
  console.log('generate-hdr-urls: 已生成 HDR_URLS，共', urls.length, '个 HDR/EXR');
}

main();
