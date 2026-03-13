/**
 * 扫描 public/test 目录中的模型文件（.glb .gltf .fbx），
 * 生成 MODEL_URLS 数组并写入 src/3d/app/modelUrls.generated.ts。
 * 在 npm run dev / npm run build 前会自动执行（predev / prebuild）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const testDir = path.join(root, 'public', 'test');
const outFile = path.join(root, 'src', '3d', 'app', 'modelUrls.generated.ts');

const MODEL_EXT = ['.glb', '.gltf', '.fbx'];

function main() {
  if (!fs.existsSync(testDir)) {
    fs.writeFileSync(
      outFile,
      `/** Auto-generated. public/test 目录不存在时使用空数组。 */\nexport const MODEL_URLS: string[] = [];\n`,
      'utf8'
    );
    console.log('generate-model-urls: public/test 不存在，已写入空 MODEL_URLS');
    return;
  }

  const names = fs.readdirSync(testDir);
  const urls = names
    .filter((name) => MODEL_EXT.includes(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => `'./test/${name}'`);

  const inner = urls.length ? urls.join(',\n  ') + ',' : '';
  const content = `/** Auto-generated from public/test. Do not edit. */\nexport const MODEL_URLS: string[] = [\n  ${inner}\n];\n`;

  fs.writeFileSync(outFile, content, 'utf8');
  console.log('generate-model-urls: 已生成 MODEL_URLS，共', urls.length, '个模型');
}

main();
