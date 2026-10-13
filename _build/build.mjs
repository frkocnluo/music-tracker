import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRadarData } from './data.mjs';
import { renderPage } from './layout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_HTML = path.join(ROOT_DIR, 'index.html');

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

export function buildSite() {
  console.log('📦 正在构建 Sonic Radar 静态站点...');

  const t0 = Date.now();
  // 单一数据入口：cache.json 只在这里被读取一次（旧版 build.mjs 与 data.mjs 各读一遍）
  const { entries, cache } = getRadarData();

  if (!entries.length) {
    console.error('❌ 没有可用条目（cache.json 为空或全部信源失败）。为保证线上不出现空白页，本次不覆盖 index.html。');
    process.exitCode = 1;
    return null;
  }

  const htmlContent = renderPage({ entries, cache, sources: cache.sources });

  // 原子写入：避免构建中断留下半截 HTML
  const tmp = OUTPUT_HTML + '.tmp';
  fs.writeFileSync(tmp, htmlContent, 'utf-8');
  fs.renameSync(tmp, OUTPUT_HTML);

  const stats = fs.statSync(OUTPUT_HTML);
  const live = (cache.sources || []).filter((s) => s.ok !== null);
  const ok = live.filter((s) => s.ok === true);
  console.log(
    `✅ 构建成功！${entries.length} 条实体（发行 ${entries.filter((e) => e.itemType === 'release').length} / 专栏 ${entries.filter((e) => e.itemType !== 'release').length}）` +
    ` · 信源 ${ok.length}/${live.length} · 可试听 ${entries.filter((e) => e.embedId || e.audioSrc).length}`
  );
  console.log(`   产物: ${OUTPUT_HTML} (${kb(stats.size)}) · 耗时 ${Date.now() - t0}ms`);
  return entries.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSite();
}
