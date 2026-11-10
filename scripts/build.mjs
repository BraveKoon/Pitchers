// 3D 스테이지 번들과 모델 데이터 파일을 만듭니다: npm run build
import { build } from 'esbuild';
import fs from 'node:fs';

const model = process.argv[2] || 'assets/pitcher.glb';
await build({
  entryPoints: ['src/stage.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'Stage',
  outfile: 'stage.bundle.js',
});
const b64 = fs.readFileSync(model).toString('base64');
fs.writeFileSync('model.js', `window.PITCHER_MODEL_B64="${b64}";\n`);
console.log('built stage.bundle.js, model.js from', model);
